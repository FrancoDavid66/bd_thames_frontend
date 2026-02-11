/* src/store/slices/pagosSlice.js — Optimizado: cache historial pagos + búsqueda + estados separados */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/* Helper para armar URLs robustas sin dobles barras */
const BASE_URL = import.meta.env.VITE_API_URL || "/api/";
const API = (path) =>
  `${String(BASE_URL).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;

/* Normaliza payloads que pueden venir paginados o no */
const unwrap = (data) =>
  data && typeof data === "object" && "results" in data ? data.results : data;

/* Saca claves con undefined o string vacío, para no pisar en el backend */
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== "")
  );

/* ===================== CACHE DE BÚSQUEDA (PÓLIZAS) ===================== */
const POLIZAS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos
const POLIZAS_CACHE_MAX = 20;
const keyFromQuery = (q) => String(q || "").trim().toLowerCase();
const keyForSearch = (q, withCuotas) => {
  const base = keyFromQuery(q);
  if (!base) return "";
  return withCuotas ? `${base}|cuotas` : `${base}|lite`;
};

/* ===================== CACHE HISTORIAL PAGOS ===================== */
const HISTORIAL_CACHE_TTL_MS = 25 * 1000; // 20–30s recomendado
const HISTORIAL_CACHE_MAX = 40;

// stable stringify (ordenado) para key de params
function stableKey(obj) {
  const o = obj && typeof obj === "object" ? obj : {};
  const keys = Object.keys(o).sort();
  const entries = [];
  for (const k of keys) {
    const v = o[k];
    if (v === undefined || v === "") continue;
    entries.push([k, v]);
  }
  return JSON.stringify(entries);
}

function isFresh(ts, ttlMs) {
  return typeof ts === "number" && Date.now() - ts < ttlMs;
}

function buildHistorialParams(p) {
  const pp = p && typeof p === "object" ? p : {};
  return compact({
    mes: pp?.mes, // YYYY-MM
    dia: pp?.dia, // YYYY-MM-DD
    desde: pp?.desde, // YYYY-MM-DD
    hasta: pp?.hasta, // YYYY-MM-DD
    oficina: pp?.oficina,
    search: pp?.q ?? pp?.search,
    page: pp?.page ?? 1,
    page_size: pp?.page_size ?? 25,
    ordering: pp?.ordering ?? "-fecha_pago",
  });
}

function buildHistorialCacheKey(params) {
  return stableKey(params);
}

/* ===================== HELPERS DESCARGA ===================== */

function filenameFromDisposition(disposition) {
  const s = String(disposition || "");
  // filename="algo.csv" o filename=algo.csv o filename*=UTF-8''algo.csv
  const m =
    /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(s);
  const raw = (m && (m[1] || m[2] || m[3])) || "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

function triggerDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "historial_pagos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ============== THUNKS ============== */

/** Obtener todas las cuotas (admin) */
export const fetchTodasLasCuotas = createAsyncThunk(
  "pagos/fetchTodasLasCuotas",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("cuotas/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al obtener cuotas");
    }
  }
);

/** Marcar cuota como pagada (PATCH /cuotas/{id}/pagar/) */
export const marcarCuotaComoPagada = createAsyncThunk(
  "pagos/marcarCuotaComoPagada",
  async (payload, { rejectWithValue }) => {
    try {
      const cuotaId = payload?.cuotaId ?? payload?.id;

      if (!cuotaId) {
        return rejectWithValue({
          detail:
            "No se pudo pagar: falta el id de la cuota (payload.id / payload.cuotaId).",
        });
      }

      const body = compact({
        fecha_pago: payload?.fecha_pago,
        forma_pago: payload?.forma_pago,
        metodo: payload?.metodo ?? payload?.medio_pago, // legacy
        monto: payload?.monto ?? payload?.monto_pagado, // legacy
        observaciones: payload?.observaciones ?? payload?.notas, // legacy

        medio_cobro_id: payload?.medio_cobro_id,
        medio_cobro_valor:
          payload?.medio_cobro_valor ??
          payload?.destino_cuenta ??
          payload?.referencia,
        destino_cuenta: payload?.destino_cuenta,

        registrar_en_balance: payload?.registrar_en_balance,
      });

      const { data } = await axios.patch(API(`cuotas/${cuotaId}/pagar/`), body);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al marcar como pagada"
      );
    }
  }
);

/** Enviar alertas */
export const enviarAlertas = createAsyncThunk(
  "pagos/enviarAlertas",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("notificaciones/cuotas/alertas/"));
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al enviar alertas");
    }
  }
);

/** Enviar recordatorios */
export const enviarRecordatoriosCuotas = createAsyncThunk(
  "pagos/enviarRecordatoriosCuotas",
  async (payload, { rejectWithValue }) => {
    try {
      const body = compact({
        alias: payload?.alias,
        alias_transferencia: payload?.alias_transferencia, // compat
        medio_cobro_id: payload?.medio_cobro_id,
        oficina: payload?.oficina,
      });

      const { data } = await axios.post(
        API("notificaciones/cuotas/recordatorios/"),
        body
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al enviar recordatorios"
      );
    }
  }
);

/** Historial recordatorios */
export const fetchHistorialRecordatorios = createAsyncThunk(
  "pagos/fetchHistorialRecordatorios",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("notificaciones/cuotas/historial/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener historial de recordatorios"
      );
    }
  }
);

/** ✅ Historial de pagos (GET /cuotas/pagos/) con filtros día/mes/rango + cache TTL */
export const fetchHistorialPagos = createAsyncThunk(
  "pagos/fetchHistorialPagos",
  async (params, { rejectWithValue, getState }) => {
    try {
      const built = buildHistorialParams(params);
      const cacheKey = buildHistorialCacheKey(built);

      // cache hit (rápido)
      const st = getState()?.pagos;
      const hit = st?.historialPagosCache?.[cacheKey];
      if (
        hit &&
        isFresh(hit.ts, HISTORIAL_CACHE_TTL_MS) &&
        Array.isArray(hit.items) &&
        hit.meta &&
        typeof hit.meta === "object"
      ) {
        return {
          items: hit.items,
          meta: hit.meta,
          _cacheKey: cacheKey,
          _fromCache: true,
        };
      }

      const { data } = await axios.get(API("cuotas/pagos/"), { params: built });

      if (data && typeof data === "object" && "results" in data) {
        const out = {
          items: Array.isArray(data.results) ? data.results : [],
          meta: {
            count: Number(data.count || 0) || 0,
            next: data.next ?? null,
            previous: data.previous ?? null,
          },
          _cacheKey: cacheKey,
          _fromCache: false,
        };
        return out;
      }

      const items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
      return {
        items,
        meta: { count: items.length, next: null, previous: null },
        _cacheKey: cacheKey,
        _fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener historial de pagos"
      );
    }
  }
);

/** ✅ Descargar CSV de historial de pagos (GET /cuotas/pagos/?export=csv) */
export const downloadHistorialPagosCSV = createAsyncThunk(
  "pagos/downloadHistorialPagosCSV",
  async (params, { rejectWithValue }) => {
    try {
      const p = params && typeof params === "object" ? params : {};

      const res = await axios.get(API("cuotas/pagos/"), {
        params: compact({
          mes: p?.mes,
          dia: p?.dia,
          desde: p?.desde,
          hasta: p?.hasta,
          oficina: p?.oficina,
          search: p?.q ?? p?.search,
          ordering: p?.ordering ?? "-fecha_pago",
          export: "csv",
        }),
        responseType: "blob",
      });

      const disposition = res?.headers?.["content-disposition"];
      const filename =
        filenameFromDisposition(disposition) ||
        (p?.dia
          ? `pagos_${p.dia}.csv`
          : p?.desde || p?.hasta
          ? `pagos_${p.desde || "inicio"}_a_${p.hasta || "hoy"}.csv`
          : p?.mes
          ? `pagos_${p.mes}.csv`
          : "historial_pagos.csv");

      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      triggerDownloadBlob(blob, filename);

      return { ok: true, filename };
    } catch (error) {
      const msg = error?.response?.data || "Error al descargar CSV";
      return rejectWithValue(msg);
    }
  }
);

/** ✅ Descargar PDF de historial de pagos (GET /cuotas/pagos/?export=pdf) */
export const downloadHistorialPagosPDF = createAsyncThunk(
  "pagos/downloadHistorialPagosPDF",
  async (params, { rejectWithValue }) => {
    try {
      const p = params && typeof params === "object" ? params : {};

      const res = await axios.get(API("cuotas/pagos/"), {
        params: compact({
          mes: p?.mes,
          dia: p?.dia,
          desde: p?.desde,
          hasta: p?.hasta,
          oficina: p?.oficina,
          search: p?.q ?? p?.search,
          ordering: p?.ordering ?? "-fecha_pago",
          export: "pdf",
        }),
        responseType: "blob",
      });

      const disposition = res?.headers?.["content-disposition"];
      const filename =
        filenameFromDisposition(disposition) ||
        (p?.dia
          ? `pagos_${p.dia}.pdf`
          : p?.desde || p?.hasta
          ? `pagos_${p.desde || "inicio"}_a_${p.hasta || "hoy"}.pdf`
          : p?.mes
          ? `pagos_${p.mes}.pdf`
          : "historial_pagos.pdf");

      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: "application/pdf" });

      triggerDownloadBlob(blob, filename);

      return { ok: true, filename };
    } catch (error) {
      const msg = error?.response?.data || "Error al descargar PDF";
      return rejectWithValue(msg);
    }
  }
);

/** Buscar pólizas por texto (nombre, patente, modelo…) — con cache TTL */
export const fetchPolizas = createAsyncThunk(
  "pagos/fetchPolizas",
  async (arg, { rejectWithValue, getState }) => {
    try {
      const query =
        typeof arg === "string" || typeof arg === "number"
          ? String(arg)
          : String(arg?.query || "");

      const withCuotas = Boolean(
        typeof arg === "object" && arg ? arg.withCuotas : false
      );

      const limit = Math.max(
        1,
        Math.min(
          100,
          Number(typeof arg === "object" && arg ? arg.limit : 25) || 25
        )
      );

      const q = String(query || "").trim();
      const cacheKey = keyForSearch(q, withCuotas);
      if (!cacheKey) {
        return {
          polizas: [],
          originalQuery: q,
          cacheKey,
          fromCache: true,
          withCuotas,
        };
      }

      const st = getState()?.pagos;
      const cache = st?.polizasCache || {};
      const hit = cache?.[cacheKey];
      const now = Date.now();

      if (
        hit &&
        typeof hit.ts === "number" &&
        now - hit.ts < POLIZAS_CACHE_TTL_MS &&
        Array.isArray(hit.polizas)
      ) {
        return {
          polizas: hit.polizas,
          originalQuery: hit.originalQuery || q,
          cacheKey,
          fromCache: true,
          withCuotas,
        };
      }

      const { data } = await axios.get(API("polizas/"), {
        params: compact({
          search: q,
          page_size: limit,
          include_cuotas: withCuotas ? 1 : undefined,
        }),
      });

      const polizasList = Array.isArray(unwrap(data)) ? unwrap(data) : [];

      if (withCuotas) {
        const needsHydrate = polizasList.some((p) => !Array.isArray(p?.cuotas));

        if (!needsHydrate) {
          return {
            polizas: polizasList,
            originalQuery: q,
            cacheKey,
            fromCache: false,
            withCuotas,
          };
        }

        const ids = polizasList
          .map((p) => p?.id)
          .filter((id) => id !== undefined && id !== null);

        const idsToFetch = ids.slice(0, limit);
        const CONCURRENCY = 6;

        const detailed = [];
        for (let i = 0; i < idsToFetch.length; i += CONCURRENCY) {
          const chunk = idsToFetch.slice(i, i + CONCURRENCY);

          const results = await Promise.allSettled(
            chunk.map((id) =>
              axios
                .get(API(`polizas/${id}/`), {
                  params: compact({
                    include_cuotas: 1,
                  }),
                })
                .then((r) => r.data)
            )
          );

          for (const r of results) {
            if (r.status === "fulfilled") detailed.push(r.value);
          }
        }

        const detailedPolizas = detailed.map((x) =>
          x && typeof x === "object" && "data" in x ? x.data : x
        );

        return {
          polizas: detailedPolizas,
          originalQuery: q,
          cacheKey,
          fromCache: false,
          withCuotas,
        };
      }

      return {
        polizas: polizasList,
        originalQuery: q,
        cacheKey,
        fromCache: false,
        withCuotas,
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al buscar pólizas");
    }
  }
);

/**
 * Registrar un ingreso en balances (POST /ingresos/)
 * Nota: al pagar una cuota ya NO hace falta (a menos que lo uses por separado)
 */
export const registrarIngreso = createAsyncThunk(
  "pagos/registrarIngreso",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("ingresos/"), payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al registrar ingreso"
      );
    }
  }
);

/** Obtener cuotas a vencer (✅ ahora acepta params opcionales, sin romper llamadas viejas) */
export const fetchCuotasAVencer = createAsyncThunk(
  "pagos/fetchCuotasAVencer",
  async (params, { rejectWithValue }) => {
    try {
      const p = params && typeof params === "object" ? params : {};
      const built = compact({
        oficina: p?.oficina,
        search: p?.search ?? p?.q,
        desde: p?.desde,
        hasta: p?.hasta,
        modo: p?.modo, // por si el backend lo soporta a futuro
      });

      const { data } = await axios.get(API("cuotas/a-vencer/"), {
        params: built,
      });

      return unwrap(data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener cuotas a vencer"
      );
    }
  }
);

/* ---------- CRUD de Medios de Cobro (billeteras / MP) ---------- */

export const fetchMediosCobro = createAsyncThunk(
  "pagos/fetchMediosCobro",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("medios-cobro/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al obtener medios de cobro"
      );
    }
  }
);

export const crearMedioCobro = createAsyncThunk(
  "pagos/crearMedioCobro",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("medios-cobro/"), payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al crear medio de cobro"
      );
    }
  }
);

export const actualizarMedioCobro = createAsyncThunk(
  "pagos/actualizarMedioCobro",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.patch(API(`medios-cobro/${id}/`), payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al actualizar medio de cobro"
      );
    }
  }
);

export const eliminarMedioCobro = createAsyncThunk(
  "pagos/eliminarMedioCobro",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(API(`medios-cobro/${id}/`));
      return id;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Error al eliminar medio de cobro"
      );
    }
  }
);

/* ===================== SLICE ===================== */

const initialState = {
  status: "idle",
  error: null,

  cuotas: [],
  cuotasAVencer: [],

  // búsqueda
  searchStatus: "idle",
  searchError: null,
  polizas: [],

  // cache búsqueda
  polizasCache: {},
  polizasCacheOrder: [],

  // medios de cobro
  mediosCobro: [],
  mediosCobroStatus: "idle",
  mediosCobroError: null,

  // derivados
  mpCuentas: [],
  billeteras: [],

  // notificaciones
  alertasStatus: "idle",
  alertasError: null,
  recordatoriosStatus: "idle",
  recordatoriosError: null,

  historialRecordatorios: [],
  historialRecordatoriosStatus: "idle",
  historialRecordatoriosError: null,

  // historial pagos (tabla)
  historialPagosItems: [],
  historialPagosMeta: { count: 0, next: null, previous: null },
  historialPagosStatus: "idle",
  historialPagosError: null,

  // cache historial pagos
  historialPagosCache: {},
  historialPagosCacheOrder: [],

  // descarga historial pagos
  historialPagosDownloadStatus: "idle",
  historialPagosDownloadError: null,

  // descarga PDF historial pagos
  historialPagosDownloadPdfStatus: "idle",
  historialPagosDownloadPdfError: null,
};

function recomputeMedioNombres(state) {
  const activos = (state.mediosCobro || []).filter((m) => m.activo !== false);
  state.mpCuentas = activos
    .filter((m) => m.proveedor === "mercado_pago")
    .map((m) => m.etiqueta || m.valor)
    .filter(Boolean);
  state.billeteras = activos
    .filter((m) => m.proveedor === "billetera_virtual")
    .map((m) => m.etiqueta || m.valor)
    .filter(Boolean);
}

function savePolizasCache(state, a, b, c) {
  let cacheKey = "";
  let originalQuery = "";
  let polizas = [];

  if (c === undefined) {
    originalQuery = a;
    polizas = b;
    cacheKey = keyFromQuery(originalQuery);
  } else {
    cacheKey = String(a || "").trim().toLowerCase();
    originalQuery = b;
    polizas = c;
  }

  if (!cacheKey) return;

  state.polizasCache[cacheKey] = {
    ts: Date.now(),
    polizas: Array.isArray(polizas) ? polizas : [],
    originalQuery: String(originalQuery || "").trim(),
  };

  const prev = Array.isArray(state.polizasCacheOrder)
    ? state.polizasCacheOrder
    : [];
  const next = [cacheKey, ...prev.filter((x) => x !== cacheKey)].slice(
    0,
    POLIZAS_CACHE_MAX
  );
  state.polizasCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.polizasCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.polizasCache[key];
  });
}

function saveHistorialCache(state, cacheKey, items, meta) {
  if (!cacheKey) return;

  state.historialPagosCache[cacheKey] = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
    meta:
      meta && typeof meta === "object"
        ? {
            count: Number(meta.count || 0) || 0,
            next: meta.next ?? null,
            previous: meta.previous ?? null,
          }
        : {
            count: Array.isArray(items) ? items.length : 0,
            next: null,
            previous: null,
          },
  };

  const prev = Array.isArray(state.historialPagosCacheOrder)
    ? state.historialPagosCacheOrder
    : [];
  const next = [cacheKey, ...prev.filter((x) => x !== cacheKey)].slice(
    0,
    HISTORIAL_CACHE_MAX
  );
  state.historialPagosCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.historialPagosCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.historialPagosCache[key];
  });
}

const pagosSlice = createSlice({
  name: "pagos",
  initialState,
  reducers: {
    setCuotas(state, action) {
      state.cuotas = Array.isArray(action.payload) ? action.payload : [];
    },
    clearSearch(state) {
      state.polizas = [];
      state.searchStatus = "idle";
      state.searchError = null;
    },
    // opcional: para invalidar historial cuando pagás una cuota y querés refrescar
    invalidateHistorialPagosCache(state) {
      state.historialPagosCache = {};
      state.historialPagosCacheOrder = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Buscar pólizas ---
      .addCase(fetchPolizas.pending, (state) => {
        state.searchStatus = "loading";
        state.searchError = null;
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        const payload = action.payload || {};
        const polizas = payload.polizas ?? payload ?? [];
        state.polizas = Array.isArray(polizas) ? polizas : [];
        savePolizasCache(
          state,
          payload.cacheKey || payload.originalQuery,
          payload.originalQuery,
          state.polizas
        );
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        state.searchStatus = "failed";
        state.searchError = action.payload;
      })

      // --- Cuotas a vencer ---
      .addCase(fetchCuotasAVencer.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCuotasAVencer.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.cuotasAVencer = action.payload || [];
      })
      .addCase(fetchCuotasAVencer.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Medios de cobro: listar ---
      .addCase(fetchMediosCobro.pending, (state) => {
        state.mediosCobroStatus = "loading";
        state.mediosCobroError = null;
      })
      .addCase(fetchMediosCobro.fulfilled, (state, action) => {
        state.mediosCobroStatus = "succeeded";
        state.mediosCobro = Array.isArray(action.payload) ? action.payload : [];
        recomputeMedioNombres(state);
      })
      .addCase(fetchMediosCobro.rejected, (state, action) => {
        state.mediosCobroStatus = "failed";
        state.mediosCobroError = action.payload;
      })

      // --- Medios de cobro: crear ---
      .addCase(crearMedioCobro.fulfilled, (state, action) => {
        state.mediosCobro = [action.payload, ...(state.mediosCobro || [])];
        recomputeMedioNombres(state);
      })

      // --- Medios de cobro: actualizar ---
      .addCase(actualizarMedioCobro.fulfilled, (state, action) => {
        const updated = action.payload;
        state.mediosCobro = (state.mediosCobro || []).map((m) =>
          m.id === updated?.id ? updated : m
        );
        recomputeMedioNombres(state);
      })

      // --- Medios de cobro: eliminar ---
      .addCase(eliminarMedioCobro.fulfilled, (state, action) => {
        const id = action.payload;
        state.mediosCobro = (state.mediosCobro || []).filter((m) => m.id !== id);
        recomputeMedioNombres(state);
      })

      // --- Alertas ---
      .addCase(enviarAlertas.pending, (state) => {
        state.alertasStatus = "loading";
        state.alertasError = null;
      })
      .addCase(enviarAlertas.fulfilled, (state) => {
        state.alertasStatus = "succeeded";
      })
      .addCase(enviarAlertas.rejected, (state, action) => {
        state.alertasStatus = "failed";
        state.alertasError = action.payload;
      })

      // --- Recordatorios ---
      .addCase(enviarRecordatoriosCuotas.pending, (state) => {
        state.recordatoriosStatus = "loading";
        state.recordatoriosError = null;
      })
      .addCase(enviarRecordatoriosCuotas.fulfilled, (state) => {
        state.recordatoriosStatus = "succeeded";
      })
      .addCase(enviarRecordatoriosCuotas.rejected, (state, action) => {
        state.recordatoriosStatus = "failed";
        state.recordatoriosError = action.payload;
      })

      // --- Historial recordatorios ---
      .addCase(fetchHistorialRecordatorios.pending, (state) => {
        state.historialRecordatoriosStatus = "loading";
        state.historialRecordatoriosError = null;
      })
      .addCase(fetchHistorialRecordatorios.fulfilled, (state, action) => {
        state.historialRecordatoriosStatus = "succeeded";
        state.historialRecordatorios = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(fetchHistorialRecordatorios.rejected, (state, action) => {
        state.historialRecordatoriosStatus = "failed";
        state.historialRecordatoriosError = action.payload;
      })

      // --- Historial pagos (con hidratación desde cache en pending) ---
      .addCase(fetchHistorialPagos.pending, (state, action) => {
        state.historialPagosStatus = "loading";
        state.historialPagosError = null;

        // hidratación optimista desde cache fresco (evita “parpadeo” y sensación lenta)
        const built = buildHistorialParams(action?.meta?.arg);
        const cacheKey = buildHistorialCacheKey(built);
        const hit = state.historialPagosCache?.[cacheKey];
        if (
          hit &&
          isFresh(hit.ts, HISTORIAL_CACHE_TTL_MS) &&
          Array.isArray(hit.items)
        ) {
          state.historialPagosItems = hit.items;
          state.historialPagosMeta = hit.meta || {
            count: hit.items.length,
            next: null,
            previous: null,
          };
          // mantenemos status loading para permitir refresh “silencioso”
        }
      })
      .addCase(fetchHistorialPagos.fulfilled, (state, action) => {
        state.historialPagosStatus = "succeeded";
        state.historialPagosItems = Array.isArray(action.payload?.items)
          ? action.payload.items
          : [];
        state.historialPagosMeta = action.payload?.meta || {
          count: state.historialPagosItems.length,
          next: null,
          previous: null,
        };

        const cacheKey = action.payload?._cacheKey;
        if (cacheKey) {
          saveHistorialCache(
            state,
            cacheKey,
            state.historialPagosItems,
            state.historialPagosMeta
          );
        }
      })
      .addCase(fetchHistorialPagos.rejected, (state, action) => {
        state.historialPagosStatus = "failed";
        state.historialPagosError = action.payload;
        state.historialPagosItems = [];
        state.historialPagosMeta = { count: 0, next: null, previous: null };
      })

      // --- Descargar CSV historial pagos ---
      .addCase(downloadHistorialPagosCSV.pending, (state) => {
        state.historialPagosDownloadStatus = "loading";
        state.historialPagosDownloadError = null;
      })
      .addCase(downloadHistorialPagosCSV.fulfilled, (state) => {
        state.historialPagosDownloadStatus = "succeeded";
      })
      .addCase(downloadHistorialPagosCSV.rejected, (state, action) => {
        state.historialPagosDownloadStatus = "failed";
        state.historialPagosDownloadError = action.payload;
      })

      // --- Descargar PDF historial pagos ---
      .addCase(downloadHistorialPagosPDF.pending, (state) => {
        state.historialPagosDownloadPdfStatus = "loading";
        state.historialPagosDownloadPdfError = null;
      })
      .addCase(downloadHistorialPagosPDF.fulfilled, (state) => {
        state.historialPagosDownloadPdfStatus = "succeeded";
      })
      .addCase(downloadHistorialPagosPDF.rejected, (state, action) => {
        state.historialPagosDownloadPdfStatus = "failed";
        state.historialPagosDownloadPdfError = action.payload;
      });
  },
});

export const { setCuotas, clearSearch, invalidateHistorialPagosCache } =
  pagosSlice.actions;
export default pagosSlice.reducer;
