// src/store/slices/polizasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/** Base URL robusta:
 * - Usa VITE_API_URL si existe
 * - Si no, cae a '/api/'
 * - Garantiza la barra final
 */
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

// Instancia axios consistente para todo el slice
const http = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

/* ---------------- Constantes de performance ---------------- */

// Cache simple (en memoria Redux) por queryKey
const LIST_CACHE_MAX = 20; // cuántas búsquedas distintas recordamos
const LIST_CACHE_TTL_MS = 60_000; // 1 min (ajustable)
const DETAIL_CACHE_TTL_MS = 120_000; // 2 min

/* ---------------- Helpers ---------------- */

function _toBool(v) {
  if (v === true) return true;
  if (v === false) return false;
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .match(/^(1|true|t|yes|y|on|si|sí)$/);
}

function buildPolizasParams(state, { includePaging = true, includeOrdering = true } = {}) {
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
    // Vencimiento
    fecha_vencimiento_desde,
    fecha_vencimiento_hasta,
    vencidas_ultimos_dias,
    vencidas_mas_de_dias,
  } = state.polizas;

  const isPolizas = (modo ?? "polizas") === "polizas";

  const params = {};
  if (includePaging) {
    params.page = page;
    params.page_size = pageSize;
  }

  if (search) params.search = search;
  if (compania) params.compania = compania;
  if (cliente) params.cliente = cliente;
  if (patente) params.patente = patente;
  if (solo_activas) params.solo_activas = 1;

  if (includeOrdering && ordering) params.ordering = ordering;

  // Filtros “operativos” y de vencimiento solo en modo polizas
  if (isPolizas) {
    if (estado && estado !== "todos") params.estado = estado;
    if (estado_financiero && estado_financiero !== "todos")
      params.estado_financiero = estado_financiero;

    if (fecha_vencimiento_desde) params.fecha_vencimiento_desde = fecha_vencimiento_desde;
    if (fecha_vencimiento_hasta) params.fecha_vencimiento_hasta = fecha_vencimiento_hasta;
    if (vencidas_ultimos_dias) params.vencidas_ultimos_dias = Number(vencidas_ultimos_dias);
    if (vencidas_mas_de_dias) params.vencidas_mas_de_dias = Number(vencidas_mas_de_dias);
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

/* -------- Helpers front: estado por CUOTAS (modo "cuotas") -------- */
// Optimizaciones:
// - si backend manda estado_cuotas, usarlo
// - si manda proxima_vencimiento_impaga, evitar recorrer cuotas
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

  // Fallback (caro): recorre cuotas si no vino nada útil del backend
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

// Resumen compat (si lo usás en algún dashboard)
export const fetchResumenPolizas = createAsyncThunk(
  "polizas/fetchResumen",
  async (_, { rejectWithValue, signal }) => {
    try {
      const res = await http.get("polizas/resumen-estados/", { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener resumen");
    }
  }
);

// KPIs exactos por backend: /polizas/kpis/
export const fetchPolizasKpis = createAsyncThunk(
  "polizas/fetchKpis",
  async (_, { getState, rejectWithValue, signal }) => {
    try {
      const params = buildPolizasParams(getState(), {
        includePaging: false,
        includeOrdering: false,
      });

      const res = await http.get("polizas/kpis/", { params, signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener KPIs");
    }
  }
);

// Listado paginado server-side + cache/dedupe
export const fetchPolizas = createAsyncThunk(
  "polizas/fetchPolizas",
  async ({ force = false } = {}, { getState, rejectWithValue, signal }) => {
    try {
      const state = getState();
      const params = buildPolizasParams(state, { includePaging: true, includeOrdering: true });
      const queryKey = makeQueryKey("polizas/", params);

      // Cache TTL
      const cached = state.polizas.listCache?.[queryKey];
      if (!force && cached && cached.ts && nowMs() - cached.ts < LIST_CACHE_TTL_MS) {
        return { __fromCache: true, queryKey, ...cached };
      }

      const res = await http.get("polizas/", { params, signal });
      return { __fromCache: false, queryKey, data: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener pólizas");
    }
  },
  {
    // Dedupe: si hay un fetch igual corriendo y no es force, no dispares otro
    condition: ({ force = false } = {}, { getState }) => {
      if (force) return true;
      const state = getState();
      const params = buildPolizasParams(state, { includePaging: true, includeOrdering: true });
      const queryKey = makeQueryKey("polizas/", params);
      const inFlightKey = state.polizas.inFlightListKey;
      if (inFlightKey && inFlightKey === queryKey) return false;
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

      const res = await http.get(`polizas/${id}/`, { signal });
      return { __fromCache: false, id, data: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al obtener póliza");
    }
  },
  {
    condition: ({ id, force = false } = {}, { getState }) => {
      if (!id) return false;
      if (force) return true;
      const state = getState();
      const cached = state.polizas.byId?.[id];
      const cachedAt = state.polizas.byIdFetchedAt?.[id];
      if (cached && cachedAt && nowMs() - cachedAt < DETAIL_CACHE_TTL_MS) return false;
      return true;
    },
  }
);

export const createPoliza = createAsyncThunk(
  "polizas/createPoliza",
  async (payload, { rejectWithValue, signal }) => {
    try {
      const res = await http.post("polizas/", payload, { signal });
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
      await http.delete(`polizas/${id}/`, { signal });
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
      const res = await http.patch(`polizas/${payload.id}/`, payload, { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al actualizar póliza");
    }
  }
);

export const renovarPoliza = createAsyncThunk(
  "polizas/renovarPoliza",
  async ({ id, nuevoPrecio, nuevoNumero }, { rejectWithValue, signal }) => {
    try {
      const res = await http.post(
        `polizas/${id}/renovar/`,
        {
          nuevo_precio: nuevoPrecio,
          nuevo_numero: nuevoNumero,
        },
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
      await http.patch(`polizas/${id}/`, { estado }, { signal });
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
      const res = await http.patch(`cuotas/${cuotaId}/pagar/`, data, { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al pagar cuota");
    }
  }
);

// 🔔 ENVÍO MASIVO / REPORTE DIAGNÓSTICO
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
      const res = await http.post("polizas/enviar-mensajes-cuotas/", body, { signal });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error al enviar/diagnosticar mensajes");
    }
  }
);

/* ---------------- Slice ---------------- */

const polizasSlice = createSlice({
  name: "polizas",
  initialState: {
    // Backward compat: mantenemos list como array “actual”
    list: [],
    poliza: null,

    // Normalizado: para merges rápidos y menos renders
    byId: {},
    byIdFetchedAt: {},

    // Cache de listados por queryKey
    listCache: {}, // { [queryKey]: { ids, total, next, previous, ts } }
    listCacheOrder: [], // LRU simple (array de queryKeys)
    lastListKey: null,
    inFlightListKey: null,

    status: "idle",
    error: null,

    // Paginación server-side
    page: 1,
    pageSize: 25,
    total: 0,
    next: null,
    previous: null,

    // Filtros/orden
    search: "",
    estado: "todos",
    estado_financiero: "todos",
    compania: "",
    cliente: "",
    patente: "",
    solo_activas: false,
    ordering: "-id",
    modo: "polizas",

    // Filtros de vencimiento
    fecha_vencimiento_desde: "",
    fecha_vencimiento_hasta: "",
    vencidas_ultimos_dias: "",
    vencidas_mas_de_dias: "",

    // KPIs
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

    kpisStatus: "idle",
    kpisError: null,

    resumenPorEstado: {},

    // 🔔 Envío / diagnóstico
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
    setPage: (state, action) => {
      state.page = Number(action.payload) || 1;
    },
    setPageSize: (state, action) => {
      state.pageSize = Number(action.payload) || 25;
      state.page = 1;
    },
    setSearch: (state, action) => {
      state.search = action.payload || "";
      state.page = 1;
    },
    setEstado: (state, action) => {
      state.estado = action.payload || "todos";
      state.page = 1;
    },
    setEstadoFinanciero: (state, action) => {
      state.estado_financiero = action.payload || "todos";
      state.page = 1;
    },
    setCompania: (state, action) => {
      state.compania = action.payload || "";
      state.page = 1;
    },
    setCliente: (state, action) => {
      state.cliente = action.payload || "";
      state.page = 1;
    },
    setPatente: (state, action) => {
      state.patente = action.payload || "";
      state.page = 1;
    },
    setSoloActivas: (state, action) => {
      state.solo_activas = !!action.payload;
      state.page = 1;
    },
    setOrdering: (state, action) => {
      state.ordering = action.payload || "-id";
      state.page = 1;
    },
    setModo: (state, action) => {
      state.modo = action.payload || "polizas";
      state.page = 1;
    },

    // Filtros de vencimiento
    setFechaVencimientoDesde: (state, action) => {
      state.fecha_vencimiento_desde = action.payload || "";
      state.vencidas_ultimos_dias = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
    setFechaVencimientoHasta: (state, action) => {
      state.fecha_vencimiento_hasta = action.payload || "";
      state.vencidas_ultimos_dias = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
    setVencidasUltimosDias: (state, action) => {
      state.vencidas_ultimos_dias = action.payload || "";
      state.fecha_vencimiento_desde = "";
      state.fecha_vencimiento_hasta = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
    setVencidasMasDeDias: (state, action) => {
      state.vencidas_mas_de_dias = action.payload || "";
      state.fecha_vencimiento_desde = "";
      state.fecha_vencimiento_hasta = "";
      state.vencidas_ultimos_dias = "";
      state.page = 1;
    },
    clearVencimientoFilters: (state) => {
      state.fecha_vencimiento_desde = "";
      state.fecha_vencimiento_hasta = "";
      state.vencidas_ultimos_dias = "";
      state.vencidas_mas_de_dias = "";
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Lista
      .addCase(fetchPolizas.pending, (state) => {
        state.status = "loading";
        state.error = null;

        const params = buildPolizasParams({ polizas: state }, { includePaging: true, includeOrdering: true });
        const key = makeQueryKey("polizas/", params);
        state.inFlightListKey = key;
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        state.status = "succeeded";

        const payload = action.payload || {};
        const queryKey = payload.queryKey || null;
        state.inFlightListKey = null;

        // Caso cache: ya tiene { ids, total, next, previous, ts }
        if (payload.__fromCache && queryKey) {
          state.lastListKey = queryKey;
          const cached = state.listCache?.[queryKey];
          const ids = cached?.ids || payload.ids || [];
          state.total = cached?.total ?? payload.total ?? 0;
          state.next = cached?.next ?? payload.next ?? null;
          state.previous = cached?.previous ?? payload.previous ?? null;
          state.list = ids.map((id) => state.byId[id]).filter(Boolean);
          return;
        }

        // Caso normal: viene res.data
        const data = payload.data || {};
        const results = Array.isArray(data) ? data : data.results || [];

        // Merge byId (sin recrear todo)
        for (const p of results) {
          if (p?.id == null) continue;
          state.byId[p.id] = { ...(state.byId[p.id] || {}), ...p };
          state.byIdFetchedAt[p.id] = nowMs();
        }

        const ids = results.map((p) => p?.id).filter((id) => id != null);

        state.list = ids.map((id) => state.byId[id]).filter(Boolean);

        state.total = Array.isArray(data)
          ? data.length
          : data.count ?? (data.results?.length ?? 0);

        state.next = data.next || null;
        state.previous = data.previous || null;

        if (queryKey) {
          state.lastListKey = queryKey;

          // Guardar cache (LRU)
          state.listCache[queryKey] = {
            ids,
            total: state.total,
            next: state.next,
            previous: state.previous,
            ts: nowMs(),
          };

          // Mantener orden LRU
          state.listCacheOrder = (state.listCacheOrder || []).filter((k) => k !== queryKey);
          state.listCacheOrder.push(queryKey);

          // Purgar si excede
          while (state.listCacheOrder.length > LIST_CACHE_MAX) {
            const oldest = state.listCacheOrder.shift();
            if (oldest) delete state.listCache[oldest];
          }
        }
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.inFlightListKey = null;
      })

      // Detalle
      .addCase(fetchPolizaPorId.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPolizaPorId.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { id, data } = action.payload || {};
        if (id != null && data) {
          state.byId[id] = { ...(state.byId[id] || {}), ...data };
          state.byIdFetchedAt[id] = nowMs();
          state.poliza = state.byId[id];
        } else {
          state.poliza = data || null;
        }
      })
      .addCase(fetchPolizaPorId.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // CRUD
      .addCase(createPoliza.fulfilled, (state, action) => {
        const p = action.payload;
        if (p?.id != null) {
          state.byId[p.id] = { ...(state.byId[p.id] || {}), ...p };
          state.byIdFetchedAt[p.id] = nowMs();
          // Insert “optimista” en list actual
          state.list = [state.byId[p.id], ...(state.list || [])];
          state.total += 1;
        }
      })
      .addCase(deletePoliza.fulfilled, (state, action) => {
        const id = action.payload;
        state.list = (state.list || []).filter((p) => p?.id !== id);
        delete state.byId[id];
        delete state.byIdFetchedAt[id];
        state.total = Math.max(0, state.total - 1);

        // limpiar caches que lo contengan
        for (const key of Object.keys(state.listCache || {})) {
          const c = state.listCache[key];
          if (!c?.ids?.includes(id)) continue;
          c.ids = c.ids.filter((x) => x !== id);
          state.listCache[key] = { ...c };
        }
      })
      .addCase(updatePoliza.fulfilled, (state, action) => {
        const p = action.payload;
        if (!p?.id) return;

        state.byId[p.id] = { ...(state.byId[p.id] || {}), ...p };
        state.byIdFetchedAt[p.id] = nowMs();

        const i = (state.list || []).findIndex((x) => x?.id === p.id);
        if (i !== -1) state.list[i] = state.byId[p.id];

        if (state.poliza?.id === p.id) state.poliza = state.byId[p.id];
      })
      .addCase(renovarPoliza.fulfilled, (state, action) => {
        const { id, response } = action.payload || {};
        if (!id) return;
        const merged = { ...(state.byId[id] || {}), ...(response || {}) };
        state.byId[id] = merged;
        state.byIdFetchedAt[id] = nowMs();

        const i = (state.list || []).findIndex((x) => x?.id === id);
        if (i !== -1) state.list[i] = merged;
        if (state.poliza?.id === id) state.poliza = merged;
      })
      .addCase(togglePolizaEstado.fulfilled, (state, action) => {
        const { id, estado } = action.payload || {};
        if (!id) return;
        if (state.byId[id]) state.byId[id] = { ...state.byId[id], estado };
        const i = (state.list || []).findIndex((p) => p?.id === id);
        if (i !== -1) state.list[i] = { ...(state.list[i] || {}), estado };
        if (state.poliza?.id === id) state.poliza = { ...(state.poliza || {}), estado };
      })

      // Resumen compat
      .addCase(fetchResumenPolizas.fulfilled, (state, action) => {
        state.resumenPorEstado = action.payload || {};
      })

      // Pago de cuota
      .addCase(pagarCuota.fulfilled, (state, action) => {
        const cuota = action.payload;
        const polizaId =
          cuota?.poliza?.id ?? cuota?.poliza_id ?? cuota?.poliza ?? cuota?.polizaId ?? null;

        if (!polizaId) return;

        // Actualizar detail si está abierto
        if (state.poliza?.id === polizaId && Array.isArray(state.poliza.cuotas)) {
          const i = state.poliza.cuotas.findIndex((c) => c.id === cuota.id);
          if (i !== -1) state.poliza.cuotas[i] = cuota;
        }

        // Actualizar byId si tenemos cuotas adentro (solo en detalle)
        const cached = state.byId?.[polizaId];
        if (cached?.cuotas && Array.isArray(cached.cuotas)) {
          const i = cached.cuotas.findIndex((c) => c.id === cuota.id);
          if (i !== -1) cached.cuotas[i] = cuota;
          state.byId[polizaId] = { ...cached };
        }
      })

      // KPIs + Desgloses
      .addCase(fetchPolizasKpis.pending, (state) => {
        state.kpisStatus = "loading";
        state.kpisError = null;
      })
      .addCase(fetchPolizasKpis.fulfilled, (state, action) => {
        state.kpisStatus = "succeeded";
        const p = action.payload || {};
        state.kpis = {
          activas_al_dia: p.activas_al_dia ?? 0,
          activas_mora_1_30: p.activas_mora_1_30 ?? 0,
          activas_mora_31_60: p.activas_mora_31_60 ?? 0,
          activas_mora_61_90: p.activas_mora_61_90 ?? 0,
          activas_mora_90_mas: p.activas_mora_90_mas ?? 0,
          vencidas: p.vencidas ?? 0,
          canceladas: p.canceladas ?? 0,
          finalizadas: p.finalizadas ?? 0,
          total: p.total ?? 0,
        };
        state.kpisPorEstado = p.por_estado || {};
        state.kpisPorCompania = p.por_compania || {};
        state.kpisPorCobertura = p.por_cobertura ?? null;
        state.kpisPorTipo = p.por_tipo ?? null;
        state.kpisTotalGlobal = p.total_global ?? 0;
      })
      .addCase(fetchPolizasKpis.rejected, (state, action) => {
        state.kpisStatus = "failed";
        state.kpisError = action.payload;
      })

      // 🔔 Envío masivo / DIAGNÓSTICO
      .addCase(enviarMensajesEstadoCuotas.pending, (state) => {
        state.envioMensajesStatus = "loading";
        state.envioMensajesError = null;
        state.envioMensajesResumen = null;
        state.envioMensajesPayload = null;
        state.envioMensajesBuckets = null;
        state.envioMensajesDiagnostico = null;
        state.envioMensajesSeleccionadas = 0;
        state.envioMensajesProcesadas = 0;
      })
      .addCase(enviarMensajesEstadoCuotas.fulfilled, (state, action) => {
        state.envioMensajesStatus = "succeeded";
        const r = action.payload || {};
        state.envioMensajesResumen = {
          enviados: Number(r.enviados || 0),
          fallidos: Number(r.fallidos || 0),
        };
        state.envioMensajesPayload = r;
        state.envioMensajesBuckets = r.buckets || null;
        state.envioMensajesDiagnostico = r.diagnostico || null;
        state.envioMensajesSeleccionadas = Number(r.seleccionadas || 0);
        state.envioMensajesProcesadas = Number(r.procesadas || 0);
      })
      .addCase(enviarMensajesEstadoCuotas.rejected, (state, action) => {
        state.envioMensajesStatus = "failed";
        state.envioMensajesError = action.payload;
      });
  },
});

export const {
  setPage,
  setPageSize,
  setSearch,
  setEstado,
  setEstadoFinanciero,
  setCompania,
  setCliente,
  setPatente,
  setSoloActivas,
  setOrdering,
  setModo,
  setFechaVencimientoDesde,
  setFechaVencimientoHasta,
  setVencidasUltimosDias,
  setVencidasMasDeDias,
  clearVencimientoFilters,
} = polizasSlice.actions;

export default polizasSlice.reducer;

/* ---------------- Selectores útiles ---------------- */

// Lista “actual” (backward compat)
export const selectPolizas = (s) => s.polizas.list || [];

// Lista desde cache (si querés usarlo luego en UI)
export const selectPolizasFromCache = (s) => {
  const st = s.polizas;
  const params = buildPolizasParams({ polizas: st }, { includePaging: true, includeOrdering: true });
  const key = makeQueryKey("polizas/", params);
  const cached = st.listCache?.[key];
  if (!cached?.ids) return st.list || [];
  return cached.ids.map((id) => st.byId?.[id]).filter(Boolean);
};

export const selectPolizasFiltradas = (s) => {
  // Importante:
  // - En modo "polizas": el backend ya filtra, no hagas filtro caro en front.
  // - En modo "cuotas": seguimos permitiendo filtro por estado sobre la lista cargada,
  //   pero usando estado_cuotas/impagas_count si viene (barato).
  const { list, search, estado, modo } = s.polizas;
  const q = (search || "").trim().toLowerCase();
  const arr = list || [];

  if (!q && (modo ?? "polizas") !== "cuotas") return arr;

  return arr.filter((p) => {
    if (q) {
      const texto = [
        p?.cliente?.nombre,
        p?.cliente?.apellido,
        p?.cliente?.dni_cuit_cuil,
        p?.patente,
        p?.numero_poliza,
        p?.marca,
        p?.modelo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!texto.includes(q)) return false;
    }

    if (estado === "todos") return true;

    if ((modo ?? "polizas") === "cuotas") {
      return estadoPorCuotas(p) === estado;
    }

    // modo polizas: estado filtra backend
    return true;
  });
};

// KPIs listos para UI
export const selectPolizasKpis = (s) => s.polizas.kpis;
export const selectKpisStatus = (s) => s.polizas.kpisStatus;
export const selectClientesAlDia = (s) => s.polizas.kpis.activas_al_dia ?? 0;

// Desgloses extra
export const selectKpisPorEstado = (s) => s.polizas.kpisPorEstado || {};
export const selectKpisPorCompania = (s) => s.polizas.kpisPorCompania || {};
export const selectKpisPorCobertura = (s) => s.polizas.kpisPorCobertura || null;
export const selectKpisPorTipo = (s) => s.polizas.kpisPorTipo || null;
export const selectKpisTotalGlobal = (s) => s.polizas.kpisTotalGlobal || 0;

// Resumen por cuotas (sobre la lista cargada)
export const selectResumenCuotas = (s) => {
  const list = s.polizas.list || [];
  const base = {
    todos: list.length,
    al_dia: 0,
    por_vencer: 0,
    vence_hoy: 0,
    vencida_7: 0,
    vencida_30: 0,
    vencidas: 0,
    canceladas: 0,
  };
  for (const p of list) {
    const k = estadoPorCuotas(p);
    base[k] = (base[k] || 0) + 1;
  }
  return base;
};

// 🔔 Selectores de diagnóstico/resultado de envío
export const selectEnvioMensajesStatus = (s) => s.polizas.envioMensajesStatus || "idle";
export const selectEnvioMensajesResumen = (s) => s.polizas.envioMensajesResumen || null;
export const selectEnvioMensajesBuckets = (s) => s.polizas.envioMensajesBuckets || null;
export const selectEnvioMensajesDiagnostico = (s) => s.polizas.envioMensajesDiagnostico || null;
export const selectEnvioMensajesPayload = (s) => s.polizas.envioMensajesPayload || null;
export const selectEnvioMensajesSeleccionadas = (s) =>
  s.polizas.envioMensajesSeleccionadas || 0;
export const selectEnvioMensajesProcesadas = (s) => s.polizas.envioMensajesProcesadas || 0;
