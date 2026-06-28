// src/store/slices/polizasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// 🚀 CAMBIO CLAVE: Usamos la instancia central que tiene los interceptores de Token
import api from "../../services/api";

/* ---------------- Constantes de performance ---------------- */

// Cache simple (en memoria Redux) por queryKey
const LIST_CACHE_MAX = 20; // cuántas búsquedas distintas recordamos
const LIST_CACHE_TTL_MS = 60_000; // 1 min (ajustable)
const DETAIL_CACHE_TTL_MS = 120_000; // 2 min
const KPIS_CACHE_TTL_MS = 30_000; // 30s (KPIs cambian menos, pero son costosos)

/* ---------------- Abort / Cancel helpers ---------------- */

// Abort por tipo de request (evita “colas” al tipear rápido)
let listAbortCtrl = null;
let kpisAbortCtrl = null;
const detailAbortById = new Map();

// Vincula señal RTK (signal) con nuestra AbortController
function linkSignals(parentSignal, childCtrl) {
  if (!parentSignal || !childCtrl) return;
  if (parentSignal.aborted) {
    try {
      childCtrl.abort();
    } catch {}
    return;
  }
  const onAbort = () => {
    try {
      childCtrl.abort();
    } catch {}
  };
  parentSignal.addEventListener("abort", onAbort, { once: true });
}

function abortPrev(ctrl) {
  try {
    ctrl?.abort?.();
  } catch {}
}

/* ---------------- Helpers ---------------- */

function _toBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  return /^(1|true|t|yes|y|on|si|sí)$/i.test(String(v ?? "").trim());
}

function buildPolizasParams(
  state,
  { includePaging = true, includeOrdering = true, includeCursor = true } = {}
) {
  const {
    page,
    pageSize,
    search,
    estado,
    estado_financiero,
    compania,
    cliente,
    patente,
    solo_activas,
    ordering,
    modo,
    oficina, // 🚀 Agregado para filtrar por oficina si es Admin
    // Vencimiento
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
  } = state.polizas;

  const isPolizas = (modo ?? "polizas") === "polizas";

  // 🚀 MAGIA ACÁ: Le agregamos allow_all: 1 para que el backend siempre nos devuelva 
  // las últimas pólizas incluso si no hay filtros.
  const params = { allow_all: 1 };

  // paging normal (page/page_size) solo si includePaging
  if (includePaging) {
    params.page = page;
    params.page_size = pageSize;
  } else {
    // igual mandamos page_size cuando es cursor para limitar
    if (pageSize) params.page_size = pageSize;
  }

  if (search) params.search = search;
  if (compania) params.compania = compania;
  if (cliente) params.cliente = cliente;
  if (patente) params.patente = patente;
  if (solo_activas) params.solo_activas = 1;
  if (oficina) params.oficina = oficina; // 🚀 Filtro de oficina enviado al Backend

  if (includeOrdering && ordering) params.ordering = ordering;

  // Filtros “operativos” y de vencimiento solo en modo polizas
  if (isPolizas) {
    if (estado && estado !== "todos") params.estado = estado;
    if (estado_financiero && estado_financiero !== "todos")
      params.estado_financiero = estado_financiero;

    if (fecha_vencimiento_desde)
      params.fecha_vencimiento_desde = fecha_vencimiento_desde;
    if (fecha_vencimiento_hasta)
      params.fecha_vencimiento_hasta = fecha_vencimiento_hasta;

    if (vencidas_ultimos_dias)
      params.vencidas_ultimos_dias = Number(vencidas_ultimos_dias);
    if (vencidas_mas_de_dias)
      params.vencidas_mas_de_dias = Number(vencidas_mas_de_dias);
  }

  return params;
}

function makeQueryKey(endpoint, params) {
  const entries = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && `${v}` !== "")
    .map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : `${v}`])
    .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));

  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `${endpoint}?${qs}`;
}

function nowMs() {
  return Date.now();
}

// ¿hay filtros reales además de search?
function hasAnyFilters(st) {
  const p = st.polizas;
  const isPolizas = (p.modo ?? "polizas") === "polizas";

  return Boolean(
    (p.compania || "").trim() ||
      (p.cliente || "").trim() ||
      (p.patente || "").trim() ||
      _toBool(p.solo_activas) ||
      (p.oficina || "").toString().trim() || // 🚀 Detectar filtro de oficina
      (isPolizas && p.estado && p.estado !== "todos") ||
      (isPolizas && p.estado_financiero && p.estado_financiero !== "todos") ||
      (isPolizas && (p.fecha_vencimiento_desde || "").trim()) ||
      (isPolizas && (p.fecha_vencimiento_hasta || "").trim()) ||
      (isPolizas && (p.vencidas_ultimos_dias || "").toString().trim()) ||
      (isPolizas && (p.vencidas_mas_de_dias || "").toString().trim())
  );
}

// Heurística: cuándo activar cursor
function shouldUseCursor(st) {
  const q = (st.polizas.search || "").trim();
  if (q.length >= 1) return true; // al buscar, cursor vuela
  if (hasAnyFilters(st)) return true;
  return false;
}

// Detecta si estamos “en modo cursor” según la respuesta
function isCursorResponse(data) {
  return data && typeof data === "object" && "results" in data && !("count" in data);
}

/* -------- Helpers front: estado por CUOTAS (modo "cuotas") -------- */
function estadoPorCuotas(poliza) {
  if (!poliza) return "al_dia";
  if (poliza.estado_cuotas) return poliza.estado_cuotas;

  const impagasCount = Number(poliza.impagas_count ?? poliza.impagasCount ?? NaN);
  if (!Number.isNaN(impagasCount) && impagasCount <= 0) return "al_dia";

  const proximaRaw =
    poliza.proxima_vencimiento_impaga ||
    poliza.proximaVencimientoImpaga ||
    poliza.proxima_vencimiento ||
    null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (proximaRaw) {
    const proxima = new Date(proximaRaw);
    if (Number.isNaN(proxima.getTime())) return "vencidas";

    const diffDays = Math.floor((hoy - proxima) / 86400000);
    if (diffDays === 0) return "vence_hoy";
    if (diffDays > 0) {
      if (diffDays <= 7) return "vencida_7";
      if (diffDays <= 30) return "vencida_30";
      return "vencidas";
    }
    return Math.abs(diffDays) <= 7 ? "por_vencer" : "al_dia";
  }

  const cuotas = poliza?.cuotas || [];
  const impagas = cuotas.filter((c) => !c.pagado);
  if (impagas.length === 0) return "al_dia";

  const fechas = impagas
    .filter((c) => c.fecha_vencimiento)
    .map((c) => new Date(c.fecha_vencimiento))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a - b);

  if (fechas.length === 0) return "vencidas";

  const proxima = fechas[0];
  const diffDays = Math.floor((hoy - proxima) / 86400000);
  if (diffDays === 0) return "vence_hoy";
  if (diffDays > 0) {
    if (diffDays <= 7) return "vencida_7";
    if (diffDays <= 30) return "vencida_30";
    return "vencidas";
  }
  return Math.abs(diffDays) <= 7 ? "por_vencer" : "al_dia";
}

/* ---------------- Thunks ---------------- */

export const fetchResumenPolizas = createAsyncThunk(
  "polizas/fetchResumen",
  async (_, { rejectWithValue, signal }) => {
    try {
      const res = await api.get("polizas/resumen-estados/", { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener resumen");
    }
  }
);

export const fetchPolizasKpis = createAsyncThunk(
  "polizas/fetchKpis",
  async ({ force = false, oficina = null } = {}, { getState, rejectWithValue, signal }) => {
    try {
      abortPrev(kpisAbortCtrl);
      kpisAbortCtrl = new AbortController();
      linkSignals(signal, kpisAbortCtrl);

      const params = buildPolizasParams(getState(), {
        includePaging: false,
        includeOrdering: false,
      });

      // 🚀 Override: en el Home, los usuarios NO-admin piden solo SU oficina.
      if (oficina) params.oficina = oficina;

      const queryKey = makeQueryKey("polizas/kpis/", params);

      const state = getState().polizas;
      const cached = state.kpisCache?.[queryKey];
      if (!force && cached?.ts && nowMs() - cached.ts < KPIS_CACHE_TTL_MS) {
        return { __fromCache: true, queryKey, data: cached.data };
      }

      const res = await api.get("polizas/kpis/", {
        params,
        signal: kpisAbortCtrl.signal,
      });
      return { __fromCache: false, queryKey, data: res.data };
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return rejectWithValue({ __canceled: true });
      }
      return rejectWithValue(err.response?.data || "Error al obtener KPIs");
    }
  },
  {
    condition: ({ force = false, oficina = null } = {}, { getState }) => {
      if (force) return true;
      const state = getState().polizas;

      const params = buildPolizasParams({ polizas: state }, {
        includePaging: false,
        includeOrdering: false,
      });
      if (oficina) params.oficina = oficina;
      const queryKey = makeQueryKey("polizas/kpis/", params);
      if (state.inFlightKpisKey && state.inFlightKpisKey === queryKey) return false;

      const cached = state.kpisCache?.[queryKey];
      if (cached?.ts && nowMs() - cached.ts < KPIS_CACHE_TTL_MS) return false;

      return true;
    },
  }
);

export const fetchPolizas = createAsyncThunk(
  "polizas/fetchPolizas",
  async ({ force = false, cursorUrl = null } = {}, { getState, rejectWithValue, signal }) => {
    try {
      abortPrev(listAbortCtrl);
      listAbortCtrl = new AbortController();
      linkSignals(signal, listAbortCtrl);

      const state = getState();
      
      const useCursor = shouldUseCursor(state);
      const params = buildPolizasParams(state, {
        includePaging: !useCursor,
        includeOrdering: true,
        includeCursor: false,
      });

      if (useCursor) params.cursor = 1;

      const queryKey = makeQueryKey("polizas/", params);
      const cached = state.polizas.listCache?.[queryKey];
      if (!force && !cursorUrl && cached?.ts && nowMs() - cached.ts < LIST_CACHE_TTL_MS) {
        return { __fromCache: true, queryKey, ...cached };
      }

      let res;
      if (cursorUrl) {
        res = await api.get(cursorUrl, { signal: listAbortCtrl.signal });
      } else {
        res = await api.get("polizas/", {
          params,
          signal: listAbortCtrl.signal,
        });
      }

      return { __fromCache: false, queryKey, data: res.data };
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return rejectWithValue({ __canceled: true });
      }
      return rejectWithValue(err.response?.data || "Error al obtener pólizas");
    }
  },
  {
    condition: ({ force = false, cursorUrl = null } = {}, { getState }) => {
      if (cursorUrl) return true;
      if (force) return true;

      const state = getState();
      const useCursor = shouldUseCursor(state);
      const params = buildPolizasParams(state, {
        includePaging: !useCursor,
        includeOrdering: true,
        includeCursor: false,
      });
      if (useCursor) params.cursor = 1;

      const queryKey = makeQueryKey("polizas/", params);
      const stateSlice = state.polizas;
      if (stateSlice.inFlightListKey === queryKey) return false;

      const cached = stateSlice.listCache?.[queryKey];
      if (cached?.ts && nowMs() - cached.ts < LIST_CACHE_TTL_MS) return false;

      return true;
    },
  }
);

export const fetchPolizaPorId = createAsyncThunk(
  "polizas/fetchPolizaPorId",
  async ({ id, force = false } = {}, { getState, rejectWithValue, signal }) => {
    try {
      const state = getState();
      const cached = state.polizas.byId?.[id];
      const cachedAt = state.polizas.byIdFetchedAt?.[id];

      if (!force && cached && cachedAt && nowMs() - cachedAt < DETAIL_CACHE_TTL_MS) {
        return { __fromCache: true, id, data: cached };
      }

      const prev = detailAbortById.get(id);
      abortPrev(prev);
      const ctrl = new AbortController();
      detailAbortById.set(id, ctrl);
      linkSignals(signal, ctrl);

      const res = await api.get(`polizas/${id}/`, { signal: ctrl.signal });
      return { __fromCache: false, id, data: res.data };
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return rejectWithValue({ __canceled: true });
      }
      return rejectWithValue(err.response?.data || "Error al obtener póliza");
    }
  }
);

export const createPoliza = createAsyncThunk(
  "polizas/createPoliza",
  async (payload, { rejectWithValue, signal }) => {
    try {
      const res = await api.post("polizas/", payload, { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al crear póliza");
    }
  }
);

export const deletePoliza = createAsyncThunk(
  "polizas/deletePoliza",
  async (id, { rejectWithValue, signal }) => {
    try {
      await api.delete(`polizas/${id}/`, { signal });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al eliminar póliza");
    }
  }
);

export const updatePoliza = createAsyncThunk(
  "polizas/updatePoliza",
  async (payload, { rejectWithValue, signal }) => {
    try {
      const res = await api.patch(`polizas/${payload.id}/`, payload, { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al actualizar póliza");
    }
  }
);

export const renovarPoliza = createAsyncThunk(
  "polizas/renovarPoliza",
  async ({ id, nuevoPrecio, nuevoNumero, nuevaFecha, mantenerDiaVencimiento }, { rejectWithValue, signal }) => {
    try {
      const body = { nuevo_precio: nuevoPrecio, nuevo_numero: nuevoNumero };
      // Solo se mandan si vienen (los usa la renovación rápida de Pagos).
      // El módulo de Renovaciones llama sin estos y funciona igual que antes.
      if (nuevaFecha) body.nueva_fecha = nuevaFecha;                 // alta = fecha elegida (hoy)
      if (mantenerDiaVencimiento) body.mantener_dia_vencimiento = true; // cuotas en el día histórico
      const res = await api.post(
        `polizas/${id}/renovar/`,
        body,
        { signal }
      );
      return { id, response: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al renovar póliza");
    }
  }
);

export const togglePolizaEstado = createAsyncThunk(
  "polizas/togglePolizaEstado",
  async ({ id, estado }, { rejectWithValue, signal }) => {
    try {
      await api.patch(`polizas/${id}/`, { estado }, { signal });
      return { id, estado };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al cambiar estado");
    }
  }
);

export const pagarCuota = createAsyncThunk(
  "polizas/pagarCuota",
  async ({ cuotaId, data }, { rejectWithValue, signal }) => {
    try {
      const res = await api.patch(`cuotas/${cuotaId}/pagar/`, data, { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al pagar cuota");
    }
  }
);

export const enviarMensajesEstadoCuotas = createAsyncThunk(
  "polizas/enviarMensajesEstadoCuotas",
  async ({ filtros, preview = true }, { rejectWithValue, signal }) => {
    try {
      const { page, page_size, ...clean } = filtros || {};
      const body = {
        filtros: clean,
        incluir_diagnostico: true,
        solo_reporte: !!preview,
      };
      const res = await api.post("polizas/enviar-mensajes-cuotas/", body, { signal });
      return res.data;
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
        return rejectWithValue({ __canceled: true });
      }
      return rejectWithValue(err.response?.data || "Error al enviar/diagnosticar mensajes");
    }
  }
);

// 🚀 NUEVA ACCIÓN PARA DESCARGAR LA PLANILLA DE AUDITORÍA (Serializable)
export const exportarPolizas = createAsyncThunk(
  "polizas/exportar",
  async ({ formato } = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const params = buildPolizasParams(state, {
        includePaging: false, 
        includeOrdering: true,
        includeCursor: false,
      });

      params.formato = formato || "pdf";

      const res = await api.get("polizas/asegurados-export/", {
        params,
        responseType: "blob",
      });

      const fileUrl = window.URL.createObjectURL(new Blob([res.data]));
      
      // Devolvemos la URL y el formato para guardarlo con la extensión correcta
      return { fileUrl, formato: params.formato }; 
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al exportar pólizas");
    }
  }
);

/* ---------------- Slice ---------------- */

const polizasSlice = createSlice({
  name: "polizas",
  initialState: {
    list: [],
    poliza: null,
    byId: {},
    byIdFetchedAt: {},
    listCache: {},
    listCacheOrder: [],
    lastListKey: null,
    inFlightListKey: null,
    kpisCache: {},
    inFlightKpisKey: null,
    listStatus: "idle",
    listError: null,
    detailStatus: "idle",
    detailError: null,
    kpisStatus: "idle",
    kpisError: null,
    page: 1,
    pageSize: 25,
    total: 0,
    next: null,
    previous: null,
    cursorEnabled: false,
    search: "",
    estado: "todos",
    estado_financiero: "todos",
    compania: "",
    cliente: "",
    patente: "",
    solo_activas: false,
    oficina: "", // 🚀 Estado para el filtro multi-tenant del Admin
    ordering: "-id",
    modo: "polizas",
    fecha_vencimiento_desde: "",
    fecha_vencimiento_hasta: "",
    vencidas_ultimos_dias: "",
    vencidas_mas_de_dias: "",
    kpis: {
      activas_al_dia: 0,
      activas_mora_1_30: 0,
      activas_mora_31_60: 0,
      activas_mora_61_90: 0,
      activas_mora_90_mas: 0,
      vencidas: 0,
      canceladas: 0,
      finalizadas: 0,
      total: 0,
    },
    kpisPorEstado: {},
    kpisPorCompania: {},
    kpisPorCobertura: null,
    kpisPorTipo: null,
    kpisTotalGlobal: 0,
    resumenPorEstado: {},
    envioMensajesStatus: "idle",
    envioMensajesError: null,
    envioMensajesResumen: null,
    envioMensajesPayload: null,
    envioMensajesBuckets: null,
    envioMensajesDiagnostico: null,
    envioMensajesSeleccionadas: 0,
    envioMensajesProcesadas: 0,
  },
  reducers: {
    setPage: (state, action) => { state.page = Number(action.payload) || 1; },
    setPageSize: (state, action) => { state.pageSize = Number(action.payload) || 25; state.page = 1; },
    setSearch: (state, action) => { state.search = action.payload || ""; state.page = 1; },
    setEstado: (state, action) => { state.estado = action.payload || "todos"; state.page = 1; },
    setEstadoFinanciero: (state, action) => { state.estado_financiero = action.payload || "todos"; state.page = 1; },
    setCompania: (state, action) => { state.compania = action.payload || ""; state.page = 1; },
    setCliente: (state, action) => { state.cliente = action.payload || ""; state.page = 1; },
    setPatente: (state, action) => { state.patente = action.payload || ""; state.page = 1; },
    setSoloActivas: (state, action) => { state.solo_activas = !!action.payload; state.page = 1; },
    setOficina: (state, action) => { state.oficina = action.payload || ""; state.page = 1; }, // 🚀 Reducer para cambiar oficina
    setOrdering: (state, action) => { state.ordering = action.payload || "-id"; state.page = 1; },
    setModo: (state, action) => { state.modo = action.payload || "polizas"; state.page = 1; },
    setFechaVencimientoDesde: (state, action) => { state.fecha_vencimiento_desde = action.payload || ""; state.vencidas_ultimos_dias = ""; state.vencidas_mas_de_dias = ""; state.page = 1; },
    setFechaVencimientoHasta: (state, action) => { state.fecha_vencimiento_hasta = action.payload || ""; state.vencidas_ultimos_dias = ""; state.vencidas_mas_de_dias = ""; state.page = 1; },
    setVencidasUltimosDias: (state, action) => { state.vencidas_ultimos_dias = action.payload || ""; state.fecha_vencimiento_desde = ""; state.fecha_vencimiento_hasta = ""; state.vencidas_mas_de_dias = ""; state.page = 1; },
    setVencidasMasDeDias: (state, action) => { state.vencidas_mas_de_dias = action.payload || ""; state.fecha_vencimiento_desde = ""; state.fecha_vencimiento_hasta = ""; state.vencidas_ultimos_dias = ""; state.page = 1; },
    clearVencimientoFilters: (state) => { state.fecha_vencimiento_desde = ""; state.fecha_vencimiento_hasta = ""; state.vencidas_ultimos_dias = ""; state.vencidas_mas_de_dias = ""; state.page = 1; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPolizas.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
        const stWrap = { polizas: state };
        const useCursor = shouldUseCursor(stWrap);
        const params = buildPolizasParams({ polizas: state }, { includePaging: !useCursor, includeOrdering: true });
        if (useCursor) params.cursor = 1;
        const key = makeQueryKey("polizas/", params);
        state.inFlightListKey = key;
        const cached = state.listCache?.[key];
        if (cached?.ids?.length) {
          state.total = cached.total ?? state.total;
          state.next = cached.next ?? state.next;
          state.previous = cached.previous ?? state.previous;
          state.list = cached.ids.map((id) => state.byId[id]).filter(Boolean);
        }
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        const payload = action.payload || {};
        const queryKey = payload.queryKey || null;
        state.inFlightListKey = null;
        if (payload?.data?.__empty) {
          state.listStatus = "succeeded";
          state.cursorEnabled = false;
          state.list = []; state.total = 0; state.next = null; state.previous = null;
          return;
        }
        if (payload.__fromCache && queryKey) {
          state.listStatus = "succeeded";
          state.lastListKey = queryKey;
          const cached = state.listCache?.[queryKey];
          const ids = cached?.ids || payload.ids || [];
          state.total = cached?.total ?? payload.total ?? 0;
          state.next = cached?.next ?? payload.next ?? null;
          state.previous = cached?.previous ?? payload.previous ?? null;
          state.list = ids.map((id) => state.byId[id]).filter(Boolean);
          return;
        }
        state.listStatus = "succeeded";
        const data = payload.data || {};
        const results = Array.isArray(data) ? data : data.results || [];
        state.cursorEnabled = isCursorResponse(data);
        for (const p of results) {
          if (p?.id == null) continue;
          state.byId[p.id] = { ...(state.byId[p.id] || {}), ...p };
          state.byIdFetchedAt[p.id] = nowMs();
        }
        const ids = results.map((p) => p?.id).filter((id) => id != null);
        state.list = ids.map((id) => state.byId[id]).filter(Boolean);
        state.total = Array.isArray(data) ? data.length : (data.count ?? (data.results?.length ?? 0));
        state.next = data.next || null;
        state.previous = data.previous || null;
        if (queryKey) {
          state.lastListKey = queryKey;
          state.listCache[queryKey] = { ids, total: state.total, next: state.next, previous: state.previous, ts: nowMs() };
          state.listCacheOrder = (state.listCacheOrder || []).filter((k) => k !== queryKey);
          state.listCacheOrder.push(queryKey);
          while (state.listCacheOrder.length > LIST_CACHE_MAX) {
            const oldest = state.listCacheOrder.shift();
            if (oldest) delete state.listCache[oldest];
          }
        }
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        if (action.payload?.__canceled) {
          state.listStatus = "idle";
          state.inFlightListKey = null;
          return;
        }
        state.listStatus = "failed";
        state.listError = action.payload;
        state.inFlightListKey = null;
      })
      .addCase(fetchPolizaPorId.pending, (state) => { state.detailStatus = "loading"; state.detailError = null; })
      .addCase(fetchPolizaPorId.fulfilled, (state, action) => {
        state.detailStatus = "succeeded";
        const { id, data } = action.payload || {};
        if (id != null && data) {
          state.byId[id] = { ...(state.byId[id] || {}), ...data };
          state.byIdFetchedAt[id] = nowMs();
          state.poliza = state.byId[id];
        } else { state.poliza = data || null; }
      })
      .addCase(fetchPolizaPorId.rejected, (state, action) => {
        if (action.payload?.__canceled) { state.detailStatus = "idle"; return; }
        state.detailStatus = "failed"; state.detailError = action.payload;
      })
      .addCase(createPoliza.fulfilled, (state, action) => {
        const p = action.payload;
        if (p?.id != null) {
          state.byId[p.id] = { ...(state.byId[p.id] || {}), ...p };
          state.byIdFetchedAt[p.id] = nowMs();
          state.list = [state.byId[p.id], ...(state.list || [])];
          state.total += 1;
        }
      })
      .addCase(deletePoliza.fulfilled, (state, action) => {
        const id = action.payload;
        state.list = (state.list || []).filter((p) => p?.id !== id);
        delete state.byId[id]; delete state.byIdFetchedAt[id];
        state.total = Math.max(0, state.total - 1);
        for (const key of Object.keys(state.listCache || {})) {
          const c = state.listCache[key];
          if (!c?.ids?.includes(id)) continue;
          c.ids = c.ids.filter((x) => x !== id);
          state.listCache[key] = { ...c };
        }
      })
      .addCase(updatePoliza.fulfilled, (state, action) => {
        const p = action.payload; if (!p?.id) return;
        state.byId[p.id] = { ...(state.byId[p.id] || {}), ...p };
        state.byIdFetchedAt[p.id] = nowMs();
        const i = (state.list || []).findIndex((x) => x?.id === p.id);
        if (i !== -1) state.list[i] = state.byId[p.id];
        if (state.poliza?.id === p.id) state.poliza = state.byId[p.id];
      })
      .addCase(renovarPoliza.fulfilled, (state, action) => {
        const { id, response } = action.payload || {}; if (!id) return;
        const merged = { ...(state.byId[id] || {}), ...(response || {}) };
        state.byId[id] = merged; state.byIdFetchedAt[id] = nowMs();
        const i = (state.list || []).findIndex((x) => x?.id === id);
        if (i !== -1) state.list[i] = merged;
        if (state.poliza?.id === id) state.poliza = merged;
      })
      .addCase(togglePolizaEstado.fulfilled, (state, action) => {
        const { id, estado } = action.payload || {}; if (!id) return;
        if (state.byId[id]) state.byId[id] = { ...state.byId[id], estado };
        const i = (state.list || []).findIndex((p) => p?.id === id);
        if (i !== -1) state.list[i] = { ...(state.list[i] || {}), estado };
        if (state.poliza?.id === id) state.poliza = { ...(state.poliza || {}), estado };
      })
      .addCase(fetchResumenPolizas.fulfilled, (state, action) => { state.resumenPorEstado = action.payload || {}; })
      .addCase(pagarCuota.fulfilled, (state, action) => {
        const cuota = action.payload;
        const polizaId = cuota?.poliza?.id ?? cuota?.poliza_id ?? cuota?.poliza ?? cuota?.polizaId ?? null;
        if (!polizaId) return;
        if (state.poliza?.id === polizaId && Array.isArray(state.poliza.cuotas)) {
          const i = state.poliza.cuotas.findIndex((c) => c.id === cuota.id);
          if (i !== -1) state.poliza.cuotas[i] = cuota;
        }
        const cached = state.byId?.[polizaId];
        if (cached?.cuotas && Array.isArray(cached.cuotas)) {
          const i = cached.cuotas.findIndex((c) => c.id === cuota.id);
          if (i !== -1) cached.cuotas[i] = cuota;
          state.byId[polizaId] = { ...cached };
        }
      })
      .addCase(fetchPolizasKpis.pending, (state) => {
        state.kpisStatus = "loading"; state.kpisError = null;
        const params = buildPolizasParams({ polizas: state }, { includePaging: false, includeOrdering: false });
        const key = makeQueryKey("polizas/kpis/", params); state.inFlightKpisKey = key;
        const cached = state.kpisCache?.[key];
        if (cached?.data) {
          const p = cached.data || {};
          state.kpis = {
            activas_al_dia: p.activas_al_dia ?? 0, activas_mora_1_30: p.activas_mora_1_30 ?? 0,
            activas_mora_31_60: p.activas_mora_31_60 ?? 0, activas_mora_61_90: p.activas_mora_61_90 ?? 0,
            activas_mora_90_mas: p.activas_mora_90_mas ?? 0, vencidas: p.vencidas ?? 0,
            canceladas: p.canceladas ?? 0, finalizadas: p.finalizadas ?? 0, total: p.total ?? 0,
          };
          state.kpisPorEstado = p.por_estado || {}; state.kpisPorCompania = p.por_compania || {};
          state.kpisPorCobertura = p.por_cobertura ?? null; state.kpisPorTipo = p.por_tipo ?? null;
          state.kpisTotalGlobal = p.total_global ?? 0;
        }
      })
      .addCase(fetchPolizasKpis.fulfilled, (state, action) => {
        state.kpisStatus = "succeeded"; state.inFlightKpisKey = null;
        const payload = action.payload || {}; const queryKey = payload.queryKey;
        const p = payload.data || {}; if (queryKey) state.kpisCache[queryKey] = { data: p, ts: nowMs() };
        state.kpis = {
          activas_al_dia: p.activas_al_dia ?? 0, activas_mora_1_30: p.activas_mora_1_30 ?? 0,
          activas_mora_31_60: p.activas_mora_31_60 ?? 0, activas_mora_61_90: p.activas_mora_61_90 ?? 0,
          activas_mora_90_mas: p.activas_mora_90_mas ?? 0, vencidas: p.vencidas ?? 0,
          canceladas: p.canceladas ?? 0, finalizadas: p.finalizadas ?? 0, total: p.total ?? 0,
        };
        state.kpisPorEstado = p.por_estado || {}; state.kpisPorCompania = p.por_compania || {};
        state.kpisPorCobertura = p.por_cobertura ?? null; state.kpisPorTipo = p.por_tipo ?? null;
        state.kpisTotalGlobal = p.total_global ?? 0;
      })
      .addCase(fetchPolizasKpis.rejected, (state, action) => {
        if (action.payload?.__canceled) { state.kpisStatus = "idle"; state.inFlightKpisKey = null; return; }
        state.kpisStatus = "failed"; state.kpisError = action.payload; state.inFlightKpisKey = null;
      })
      .addCase(enviarMensajesEstadoCuotas.pending, (state) => {
        state.envioMensajesStatus = "loading"; state.envioMensajesError = null;
        state.envioMensajesResumen = null; state.envioMensajesPayload = null;
        state.envioMensajesBuckets = null; state.envioMensajesDiagnostico = null;
        state.envioMensajesSeleccionadas = 0; state.envioMensajesProcesadas = 0;
      })
      .addCase(enviarMensajesEstadoCuotas.fulfilled, (state, action) => {
        state.envioMensajesStatus = "succeeded";
        const r = action.payload || {};
        state.envioMensajesResumen = { enviados: Number(r.enviados || 0), fallidos: Number(r.fallidos || 0) };
        state.envioMensajesPayload = r; state.envioMensajesBuckets = r.buckets || null;
        state.envioMensajesDiagnostico = r.diagnostico || null;
        state.envioMensajesSeleccionadas = Number(r.seleccionadas || 0);
        state.envioMensajesProcesadas = Number(r.procesadas || 0);
      })
      .addCase(enviarMensajesEstadoCuotas.rejected, (state, action) => {
        if (action.payload?.__canceled) { state.envioMensajesStatus = "idle"; return; }
        state.envioMensajesStatus = "failed"; state.envioMensajesError = action.payload;
      });
  },
});

export const {
  setPage, setPageSize, setSearch, setEstado, setEstadoFinanciero, setCompania, setCliente, setPatente,
  setSoloActivas, setOficina, setOrdering, setModo, setFechaVencimientoDesde, setFechaVencimientoHasta,
  setVencidasUltimosDias, setVencidasMasDeDias, clearVencimientoFilters,
} = polizasSlice.actions;

export default polizasSlice.reducer;

/* ---------------- Selectores útiles ---------------- */

export const selectPolizas = (s) => s.polizas.list || [];
export const selectPolizasListStatus = (s) => s.polizas.listStatus || "idle";
export const selectPolizasListError = (s) => s.polizas.listError || null;
export const selectPolizaDetailStatus = (s) => s.polizas.detailStatus || "idle";
export const selectPolizaDetailError = (s) => s.polizas.detailError || null;

export const selectPolizasFromCache = (s) => {
  const st = s.polizas; const wrap = { polizas: st }; const useCursor = shouldUseCursor(wrap);
  const params = buildPolizasParams({ polizas: st }, { includePaging: !useCursor, includeOrdering: true });
  if (useCursor) params.cursor = 1;
  const key = makeQueryKey("polizas/", params); const cached = st.listCache?.[key];
  if (!cached?.ids) return st.list || [];
  return cached.ids.map((id) => st.byId?.[id]).filter(Boolean);
};

export const selectPolizasFiltradas = (s) => {
  const { list, search, estado, modo } = s.polizas; const q = (search || "").trim().toLowerCase();
  const arr = list || []; if (!q && (modo ?? "polizas") !== "cuotas") return arr;
  return arr.filter((p) => {
    if (q) {
      const texto = [p?.cliente?.nombre, p?.cliente?.apellido, p?.cliente?.dni_cuit_cuil, p?.patente, p?.numero_poliza, p?.marca, p?.modelo]
        .filter(Boolean).join(" ").toLowerCase();
      if (!texto.includes(q)) return false;
    }
    if (estado === "todos") return true;
    if ((modo ?? "polizas") === "cuotas") { return estadoPorCuotas(p) === estado; }
    return true;
  });
};

export const selectPolizasKpis = (s) => s.polizas.kpis;
export const selectKpisStatus = (s) => s.polizas.kpisStatus;
export const selectClientesAlDia = (s) => s.polizas.kpis.activas_al_dia ?? 0;
export const selectKpisPorEstado = (s) => s.polizas.kpisPorEstado || {};
export const selectKpisPorCompania = (s) => s.polizas.kpisPorCompania || {};
export const selectKpisPorCobertura = (s) => s.polizas.kpisPorCobertura || null;
export const selectKpisPorTipo = (s) => s.polizas.kpisPorTipo || null;
export const selectKpisTotalGlobal = (s) => s.polizas.kpisTotalGlobal || 0;

export const selectResumenCuotas = (s) => {
  const list = s.polizas.list || [];
  const base = { todos: list.length, al_dia: 0, por_vencer: 0, vence_hoy: 0, vencida_7: 0, vencida_30: 0, vencidas: 0, canceladas: 0 };
  for (const p of list) { const k = estadoPorCuotas(p); base[k] = (base[k] || 0) + 1; }
  return base;
};

export const selectEnvioMensajesStatus = (s) => s.polizas.envioMensajesStatus || "idle";
export const selectEnvioMensajesResumen = (s) => s.polizas.envioMensajesResumen || null;
export const selectEnvioMensajesBuckets = (s) => s.polizas.envioMensajesBuckets || null;
export const selectEnvioMensajesDiagnostico = (s) => s.polizas.envioMensajesDiagnostico || null;
export const selectEnvioMensajesPayload = (s) => s.polizas.envioMensajesPayload || null;
export const selectEnvioMensajesSeleccionadas = (s) => s.polizas.envioMensajesSeleccionadas || 0;
export const selectEnvioMensajesProcesadas = (s) => s.polizas.envioMensajesProcesadas || 0;