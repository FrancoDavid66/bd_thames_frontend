// src/store/slices/renovacionesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/**
 * ✅ Base URL unificada
 */
const resolveApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE &&
      String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL &&
      String(import.meta.env.VITE_API_URL).trim()) ||
    (typeof window !== "undefined" && (window.__API_URL__ || "")) ||
    "/api/";

  let base = String(raw || "").trim();
  if (!base) base = "/api/";
  if (!base.endsWith("/")) base += "/";
  if (!base.includes("/api/")) {
    if (base !== "/api/") base = `${base}api/`;
  }

  try {
    if (typeof window !== "undefined") {
      const host = window.location.hostname || "";
      const baseHasLocalhost = /localhost|127\.0\.0\.1/.test(base);
      const appIsLocalhost = /localhost|127\.0\.0\.1/.test(host);
      if (baseHasLocalhost && !appIsLocalhost) {
        base = "/api/";
      }
    }
  } catch {
    // silencio
  }

  return base;
};

const API_BASE = resolveApiBase();

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

const LIST_CACHE_TTL = 20_000;
const RESUMEN_CACHE_TTL = 20_000;
const OFICINAS_CACHE_TTL = 5 * 60_000;

const to01 = (v) => {
  if (v === true) return "1";
  if (v === false) return "0";
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "t", "yes", "y", "on", "si", "sí"].includes(s)
    ? "1"
    : "0";
};

const isFresh = (cached, ttl = LIST_CACHE_TTL) => {
  if (!cached) return false;
  const age = Date.now() - (cached.fetchedAt || 0);
  return age <= ttl;
};

const stripForce = (params = {}) => {
  if (!params) return {};
  // eslint-disable-next-line no-unused-vars
  const { force, ...rest } = params;
  return rest;
};

const normalizeOficinas = (data) => {
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data?.oficinas)
    ? data.oficinas
    : [];

  const out = [];
  for (const x of arr) {
    if (x == null) continue;
    if (typeof x === "string" || typeof x === "number") {
      const s = String(x).trim();
      if (s) out.push(s);
      continue;
    }
    if (typeof x === "object") {
      const s =
        String(
          x?.nombre ??
            x?.name ??
            x?.oficina ??
            x?.oficina_nombre ??
            x?.label ??
            ""
        ).trim() || "";
      if (s) out.push(s);
    }
  }

  return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b));
};

/**
 * Construye querystring estable y limpio.
 *
 * 🆕 Nuevos params:
 * - tab: pendientes | renovadas | no_renovaron
 * - include_renovadas: 0|1 (cuando tab=renovadas necesitamos verlas todas)
 */
export const buildRenovacionesQuery = (params = {}) => {
  const p0 = stripForce(params);
  const p = { ...p0 };

  if (p.dias == null || p.dias === "") p.dias = 30;
  if (p.page == null || p.page === "") p.page = 1;
  if (p.page_size == null || p.page_size === "") p.page_size = 25;

  if (p.solo_pendientes != null) p.solo_pendientes = to01(p.solo_pendientes);
  if (p.include_renovadas != null) p.include_renovadas = to01(p.include_renovadas);

  const trimOrUndef = (x) => {
    if (x == null) return undefined;
    const s = String(x).trim();
    return s === "" ? undefined : s;
  };

  const entries = [
    ["tab", trimOrUndef(p.tab)],
    ["include_renovadas", trimOrUndef(p.include_renovadas)],
    ["bucket", trimOrUndef(p.bucket)],
    ["dias", trimOrUndef(p.dias)],
    ["solo_pendientes", trimOrUndef(p.solo_pendientes)],
    ["search", trimOrUndef(p.search)],
    ["ordering", trimOrUndef(p.ordering)],
    ["page", trimOrUndef(p.page)],
    ["page_size", trimOrUndef(p.page_size)],

    ["estado", trimOrUndef(p.estado)],
    ["fase", trimOrUndef(p.fase)],
    ["compania", trimOrUndef(p.compania)],
    ["oficina", trimOrUndef(p.oficina)],
    ["cliente", trimOrUndef(p.cliente)],
    ["patente", trimOrUndef(p.patente)],
    ["asegurado", trimOrUndef(p.asegurado)],
    ["sin_numero", p.sin_numero != null ? to01(p.sin_numero) : undefined],
    ["solo_activas", p.solo_activas != null ? to01(p.solo_activas) : undefined],

    ["fecha", trimOrUndef(p.fecha)],
  ].filter(([, v]) => v !== undefined);

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const qs = new URLSearchParams(entries).toString();
  return qs ? `?${qs}` : "";
};

export const buildRenovacionesResumenQuery = (params = {}) => {
  const p0 = stripForce(params);
  const p = { ...p0 };

  if (p.dias == null || p.dias === "") p.dias = 30;
  if (p.solo_pendientes != null) p.solo_pendientes = to01(p.solo_pendientes);

  const trimOrUndef = (x) => {
    if (x == null) return undefined;
    const s = String(x).trim();
    return s === "" ? undefined : s;
  };

  const entries = [
    ["dias", trimOrUndef(p.dias)],
    ["solo_pendientes", trimOrUndef(p.solo_pendientes)],
    ["search", trimOrUndef(p.search)],

    ["estado", trimOrUndef(p.estado)],
    ["fase", trimOrUndef(p.fase)],
    ["compania", trimOrUndef(p.compania)],
    ["oficina", trimOrUndef(p.oficina)],
    ["cliente", trimOrUndef(p.cliente)],
    ["patente", trimOrUndef(p.patente)],
    ["asegurado", trimOrUndef(p.asegurado)],
    ["sin_numero", p.sin_numero != null ? to01(p.sin_numero) : undefined],
    ["solo_activas", p.solo_activas != null ? to01(p.solo_activas) : undefined],

    ["fecha", trimOrUndef(p.fecha)],
  ].filter(([, v]) => v !== undefined);

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const qs = new URLSearchParams(entries).toString();
  return qs ? `?${qs}` : "";
};

const normalizeRenovacionesResponse = (data) => {
  const items = Array.isArray(data) ? data : data?.results || [];
  const count = Array.isArray(data) ? items.length : Number(data?.count || 0);
  const next = Array.isArray(data) ? null : data?.next || null;
  const previous = Array.isArray(data) ? null : data?.previous || null;
  return { items, count, next, previous };
};

const normalizeResumen = (data) => {
  const safe = data && typeof data === "object" ? data : {};
  const buckets =
    safe?.buckets && typeof safe.buckets === "object" ? safe.buckets : {};
  return {
    hoy: safe?.hoy || null,
    dias_ventana: safe?.dias_ventana ?? null,
    limite: safe?.limite || null,
    solo_pendientes: !!safe?.solo_pendientes,
    pendientes_ventana: Number(safe?.pendientes_ventana || 0),
    buckets: {
      todas: Number(buckets?.todas || 0),
      vence_hoy: Number(buckets?.vence_hoy || 0),
      vence_en_1: Number(buckets?.vence_en_1 || 0),
      vence_en_2: Number(buckets?.vence_en_2 || 0),
      vence_en_3: Number(buckets?.vence_en_3 || 0),
      proximos_3: Number(buckets?.proximos_3 || 0),
      vencida_1: Number(buckets?.vencida_1 || 0),
      vencida_2: Number(buckets?.vencida_2 || 0),
      vencida_3: Number(buckets?.vencida_3 || 0),
      vencidas_3: Number(buckets?.vencidas_3 || 0),
      vencidas: Number(buckets?.vencidas || 0),
      vencidas_4_mas: Number(buckets?.vencidas_4_mas || 0),
    },
  };
};

/**
 * Thunk: marcar póliza como "no renueva" — la deja en la lista en gris/tachada.
 * payload: { polizaId, motivo: "CAMBIO_COMPANIA"|"VENDIO_AUTO"|..., detalle: "..." }
 */
export const marcarNoRenueva = createAsyncThunk(
  "renovaciones/marcarNoRenueva",
  async ({ polizaId, motivo = "", detalle = "" }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`polizas/${polizaId}/descartar-renovacion/`, {
        motivo: motivo || "",
        detalle: detalle || "",
      });
      return { polizaId, data };
    } catch (err) {
      return rejectWithValue({
        polizaId,
        message:
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Error al marcar",
      });
    }
  }
);

/**
 * 🆕 Deshacer "no renueva" (la póliza vuelve a la pestaña de Pendientes).
 */
export const desmarcarNoRenueva = createAsyncThunk(
  "renovaciones/desmarcarNoRenueva",
  async ({ polizaId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`polizas/${polizaId}/revertir-descarte-renovacion/`);
      return { polizaId, data };
    } catch (err) {
      return rejectWithValue({
        polizaId,
        message:
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Error al deshacer",
      });
    }
  }
);

/**
 * 🆕 Verificar renovación — marca la fila como "ya la revisé" (tilde gris).
 */
export const verificarRenovacion = createAsyncThunk(
  "renovaciones/verificarRenovacion",
  async ({ polizaId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`polizas/${polizaId}/verificar-renovacion/`);
      return { polizaId, data };
    } catch (err) {
      return rejectWithValue({
        polizaId,
        message:
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Error al verificar",
      });
    }
  }
);

/**
 * 🆕 Des-verificar (deshacer el tilde).
 */
export const desVerificarRenovacion = createAsyncThunk(
  "renovaciones/desVerificarRenovacion",
  async ({ polizaId }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`polizas/${polizaId}/des-verificar-renovacion/`);
      return { polizaId, data };
    } catch (err) {
      return rejectWithValue({
        polizaId,
        message:
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          err?.message ||
          "Error al deshacer verificación",
      });
    }
  }
);

export const fetchRenovaciones = createAsyncThunk(
  "renovaciones/fetchRenovaciones",
  async (params = {}, { rejectWithValue, getState }) => {
    const force = !!params?.force;
    const cleanParams = stripForce(params);
    const query = buildRenovacionesQuery(cleanParams);

    try {
      const state = getState().renovaciones;
      const cached = state?.cache?.[query];

      if (!force && isFresh(cached, LIST_CACHE_TTL)) {
        return {
          params: cleanParams,
          query,
          fromCache: true,
          normalized: {
            items: cached.items || [],
            count: Number(cached.count || 0),
            next: cached.next || null,
            previous: cached.previous || null,
          },
        };
      }

      const { data } = await api.get(`polizas/renovaciones/${query}`);
      const normalized = normalizeRenovacionesResponse(data);

      return { params: cleanParams, query, fromCache: false, normalized };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al cargar renovaciones";
      return rejectWithValue({ message: msg, raw: err?.response?.data, query });
    }
  }
);

// 🆕 Pólizas que recién finalizaron (≤3 días) y todavía no se renovaron.
// El módulo de Renovaciones normal las esconde; estas se muestran aparte.
export const fetchRenovacionesRecientes = createAsyncThunk(
  "renovaciones/fetchRenovacionesRecientes",
  async (params = {}, { rejectWithValue }) => {
    const query = buildRenovacionesQuery(stripForce(params));
    try {
      const { data } = await api.get(`polizas/renovaciones/recientes/${query}`);
      const normalized = normalizeRenovacionesResponse(data);
      return { normalized };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al cargar recién vencidas";
      return rejectWithValue({ message: msg, raw: err?.response?.data });
    }
  }
);

export const fetchRenovacionesResumen = createAsyncThunk(
  "renovaciones/fetchRenovacionesResumen",
  async (params = {}, { rejectWithValue, getState }) => {
    const force = !!params?.force;
    const cleanParams = stripForce(params);
    const query = buildRenovacionesResumenQuery(cleanParams);

    try {
      const state = getState().renovaciones;
      const cached = state?.resumenCache?.[query];

      if (!force && isFresh(cached, RESUMEN_CACHE_TTL)) {
        return {
          params: cleanParams,
          query,
          fromCache: true,
          resumen: cached.resumen || null,
        };
      }

      const { data } = await api.get(`polizas/renovaciones/resumen/${query}`);
      const resumen = normalizeResumen(data);

      return { params: cleanParams, query, fromCache: false, resumen };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al cargar resumen de renovaciones";
      return rejectWithValue({ message: msg, raw: err?.response?.data, query });
    }
  }
);

export const fetchRenovacionesGlobalResumen = createAsyncThunk(
  "renovaciones/fetchRenovacionesGlobalResumen",
  async (params = {}, { rejectWithValue, getState }) => {
    const force = !!params?.force;
    const cleanParams = stripForce(params);
    const query = buildRenovacionesResumenQuery(cleanParams);

    try {
      const state = getState().renovaciones;
      const cached = state?.globalResumenCache?.[query];

      if (!force && isFresh(cached, RESUMEN_CACHE_TTL)) {
        return {
          params: cleanParams,
          query,
          fromCache: true,
          resumen: cached.resumen || null,
        };
      }

      const { data } = await api.get(`polizas/renovaciones/resumen/${query}`);
      const resumen = normalizeResumen(data);

      return { params: cleanParams, query, fromCache: false, resumen };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al cargar resumen global";
      return rejectWithValue({ message: msg, raw: err?.response?.data, query });
    }
  }
);

export const fetchRenovacionesOficinas = createAsyncThunk(
  "renovaciones/fetchRenovacionesOficinas",
  async (opts = {}, { rejectWithValue, getState }) => {
    const force = !!opts?.force;

    try {
      const state = getState().renovaciones;
      const cached = state?.oficinasCache;

      if (!force && isFresh(cached, OFICINAS_CACHE_TTL)) {
        return {
          fromCache: true,
          oficinas: cached.items || [],
        };
      }

      const { data } = await api.get(`polizas/oficinas/`);
      const oficinas = normalizeOficinas(data);

      return { fromCache: false, oficinas };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al cargar oficinas";
      return rejectWithValue({ message: msg, raw: err?.response?.data });
    }
  }
);

export const refacturarPoliza = createAsyncThunk(
  "renovaciones/refacturarPoliza",
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`polizas/${id}/refacturar/`, payload);
      return { id, data };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al refacturar póliza";
      return rejectWithValue({ id, message: msg, raw: err?.response?.data });
    }
  }
);

export const renovarPoliza = createAsyncThunk(
  "renovaciones/renovarPoliza",
  async ({ id, payload = {} }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`polizas/${id}/renovar/`, payload);
      return { id, data };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al renovar póliza";
      return rejectWithValue({ id, message: msg, raw: err?.response?.data });
    }
  }
);

const initialState = {
  items: [],
  count: 0,
  next: null,
  previous: null,

  status: "idle",
  error: null,

  cache: {},
  lastQuery: "",

  resumen: null,
  resumenStatus: "idle",
  resumenError: null,
  resumenCache: {},
  lastResumenQuery: "",

  globalResumen: null,
  globalResumenStatus: "idle",
  globalResumenError: null,
  globalResumenCache: {},
  lastGlobalResumenQuery: "",

  oficinas: [],
  oficinasStatus: "idle",
  oficinasError: null,
  oficinasCache: null,

  // 🆕 Recién finalizadas (≤3 días) sin renovar
  recientes: [],
  recientesStatus: "idle",
  recientesError: null,

  actionStatusById: {},
  lastActionResult: null,
};

const setActionLoading = (state, id, type) => {
  state.actionStatusById[id] = { status: "loading", error: null, type };
};
const setActionError = (state, id, type, error) => {
  state.actionStatusById[id] = { status: "failed", error, type };
};
const setActionSuccess = (state, id, type) => {
  state.actionStatusById[id] = { status: "succeeded", error: null, type };
};

const invalidateAllCache = (state) => {
  const keys = Object.keys(state.cache || {});
  for (const k of keys) {
    if (state.cache[k]) state.cache[k].fetchedAt = 0;
  }

  const rkeys = Object.keys(state.resumenCache || {});
  for (const k of rkeys) {
    if (state.resumenCache[k]) state.resumenCache[k].fetchedAt = 0;
  }

  const gkeys = Object.keys(state.globalResumenCache || {});
  for (const k of gkeys) {
    if (state.globalResumenCache[k]) state.globalResumenCache[k].fetchedAt = 0;
  }
};

const renovacionesSlice = createSlice({
  name: "renovaciones",
  initialState,
  reducers: {
    clearRenovacionesError(state) {
      state.error = null;
    },
    clearRenovacionesCache(state) {
      state.cache = {};
      state.lastQuery = "";
    },
    invalidateRenovaciones(state) {
      if (state.lastQuery && state.cache[state.lastQuery]) {
        state.cache[state.lastQuery].fetchedAt = 0;
      }
    },

    clearRenovacionesResumenError(state) {
      state.resumenError = null;
    },
    clearRenovacionesResumenCache(state) {
      state.resumenCache = {};
      state.lastResumenQuery = "";
      state.resumen = null;
      state.resumenStatus = "idle";
      state.resumenError = null;

      state.globalResumenCache = {};
      state.lastGlobalResumenQuery = "";
      state.globalResumen = null;
      state.globalResumenStatus = "idle";
      state.globalResumenError = null;
    },
    invalidateRenovacionesResumen(state) {
      if (state.lastResumenQuery && state.resumenCache[state.lastResumenQuery]) {
        state.resumenCache[state.lastResumenQuery].fetchedAt = 0;
      }
      if (
        state.lastGlobalResumenQuery &&
        state.globalResumenCache[state.lastGlobalResumenQuery]
      ) {
        state.globalResumenCache[state.lastGlobalResumenQuery].fetchedAt = 0;
      }
    },

    clearLastActionResult(state) {
      state.lastActionResult = null;
    },
    clearActionStatus(state, action) {
      const id = action.payload;
      if (id != null && state.actionStatusById[id]) {
        delete state.actionStatusById[id];
      }
    },

    clearOficinas(state) {
      state.oficinas = [];
      state.oficinasStatus = "idle";
      state.oficinasError = null;
      state.oficinasCache = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------- LISTADO ----------
      .addCase(fetchRenovaciones.pending, (state, action) => {
        state.error = null;

        const force = !!action.meta.arg?.force;
        const query = buildRenovacionesQuery(action.meta.arg || {});
        state.lastQuery = query;

        const cached = state.cache?.[query];

        if (!force && isFresh(cached, LIST_CACHE_TTL)) {
          state.status = "succeeded";
          state.items = cached.items || [];
          state.count = Number(cached.count || 0);
          state.next = cached.next || null;
          state.previous = cached.previous || null;
          return;
        }

        state.status = "loading";
      })
      .addCase(fetchRenovaciones.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;

        const { query, normalized, fromCache } = action.payload || {};
        const q = query || buildRenovacionesQuery(action.payload?.params || {});
        state.lastQuery = q;

        const items = normalized?.items || [];
        const count = Number(normalized?.count || 0);
        const next = normalized?.next || null;
        const previous = normalized?.previous || null;

        state.items = items;
        state.count = count;
        state.next = next;
        state.previous = previous;

        if (!fromCache) {
          state.cache[q] = {
            items,
            count,
            next,
            previous,
            fetchedAt: Date.now(),
          };
        }
      })
      .addCase(fetchRenovaciones.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Error al cargar renovaciones";
      })

      // ---------- RECIÉN FINALIZADAS (≤3 días) ----------
      .addCase(fetchRenovacionesRecientes.pending, (state) => {
        state.recientesStatus = "loading";
        state.recientesError = null;
      })
      .addCase(fetchRenovacionesRecientes.fulfilled, (state, action) => {
        state.recientesStatus = "succeeded";
        state.recientesError = null;
        state.recientes = action.payload?.normalized?.items || [];
      })
      .addCase(fetchRenovacionesRecientes.rejected, (state, action) => {
        state.recientesStatus = "failed";
        state.recientesError = action.payload?.message || "Error al cargar recién vencidas";
        state.recientes = [];
      })

      // ---------- RESUMEN ----------
      .addCase(fetchRenovacionesResumen.pending, (state, action) => {
        state.resumenError = null;

        const force = !!action.meta.arg?.force;
        const query = buildRenovacionesResumenQuery(action.meta.arg || {});
        state.lastResumenQuery = query;

        const cached = state.resumenCache?.[query];

        if (!force && isFresh(cached, RESUMEN_CACHE_TTL)) {
          state.resumenStatus = "succeeded";
          state.resumen = cached.resumen || null;
          return;
        }

        state.resumenStatus = "loading";
      })
      .addCase(fetchRenovacionesResumen.fulfilled, (state, action) => {
        state.resumenStatus = "succeeded";
        state.resumenError = null;

        const { query, resumen, fromCache } = action.payload || {};
        const q =
          query || buildRenovacionesResumenQuery(action.payload?.params || {});
        state.lastResumenQuery = q;

        state.resumen = resumen || null;

        if (!fromCache) {
          state.resumenCache[q] = {
            resumen: resumen || null,
            fetchedAt: Date.now(),
          };
        }
      })
      .addCase(fetchRenovacionesResumen.rejected, (state, action) => {
        state.resumenStatus = "failed";
        state.resumenError =
          action.payload?.message || "Error al cargar resumen de renovaciones";
      })

      // ---------- GLOBAL RESUMEN ----------
      .addCase(fetchRenovacionesGlobalResumen.pending, (state, action) => {
        state.globalResumenError = null;

        const force = !!action.meta.arg?.force;
        const query = buildRenovacionesResumenQuery(action.meta.arg || {});
        state.lastGlobalResumenQuery = query;

        const cached = state.globalResumenCache?.[query];

        if (!force && isFresh(cached, RESUMEN_CACHE_TTL)) {
          state.globalResumenStatus = "succeeded";
          state.globalResumen = cached.resumen || null;
          return;
        }

        state.globalResumenStatus = "loading";
      })
      .addCase(fetchRenovacionesGlobalResumen.fulfilled, (state, action) => {
        state.globalResumenStatus = "succeeded";
        state.globalResumenError = null;

        const { query, resumen, fromCache } = action.payload || {};
        const q =
          query || buildRenovacionesResumenQuery(action.payload?.params || {});
        state.lastGlobalResumenQuery = q;

        state.globalResumen = resumen || null;

        if (!fromCache) {
          state.globalResumenCache[q] = {
            resumen: resumen || null,
            fetchedAt: Date.now(),
          };
        }
      })
      .addCase(fetchRenovacionesGlobalResumen.rejected, (state, action) => {
        state.globalResumenStatus = "failed";
        state.globalResumenError =
          action.payload?.message || "Error al cargar resumen global";
      })

      // ---------- OFICINAS ----------
      .addCase(fetchRenovacionesOficinas.pending, (state) => {
        state.oficinasError = null;

        if (isFresh(state.oficinasCache, OFICINAS_CACHE_TTL)) {
          state.oficinasStatus = "succeeded";
          state.oficinas = state.oficinasCache?.items || [];
          return;
        }

        state.oficinasStatus = "loading";
      })
      .addCase(marcarNoRenueva.pending, (state, action) => {
        const id = action.meta.arg?.polizaId;
        if (id != null) setActionLoading(state, id, "no_renueva");
      })
      .addCase(marcarNoRenueva.fulfilled, (state, action) => {
        const { polizaId, data } = action.payload || {};
        if (polizaId != null) setActionSuccess(state, polizaId, "no_renueva");
        // 🚀 NO la quitamos: queda en la lista en gris/tachada (pestaña "No renovaron")
        // Actualizamos los flags localmente para feedback inmediato
        state.items = (state.items || []).map((p) =>
          p.id === polizaId
            ? {
                ...p,
                renovacion_descartada: true,
                renovacion_descartada_motivo: data?.renovacion_descartada_motivo || p.renovacion_descartada_motivo,
                renovacion_descartada_detalle: data?.renovacion_descartada_detalle || p.renovacion_descartada_detalle,
                renovacion_descartada_en: data?.renovacion_descartada_en || new Date().toISOString(),
              }
            : p
        );
        invalidateAllCache(state);
      })
      .addCase(marcarNoRenueva.rejected, (state, action) => {
        const id = action.payload?.polizaId ?? action.meta.arg?.polizaId;
        const msg = action.payload?.message || "Error al marcar como no renueva";
        if (id != null) setActionError(state, id, "no_renueva", msg);
      })

      .addCase(desmarcarNoRenueva.pending, (state, action) => {
        const id = action.meta.arg?.polizaId;
        if (id != null) setActionLoading(state, id, "desmarcar_no_renueva");
      })
      .addCase(desmarcarNoRenueva.fulfilled, (state, action) => {
        const { polizaId } = action.payload || {};
        if (polizaId != null)
          setActionSuccess(state, polizaId, "desmarcar_no_renueva");
        // Limpiamos los flags localmente
        state.items = (state.items || []).map((p) =>
          p.id === polizaId
            ? {
                ...p,
                renovacion_descartada: false,
                renovacion_descartada_motivo: null,
                renovacion_descartada_detalle: "",
                renovacion_descartada_en: null,
              }
            : p
        );
        invalidateAllCache(state);
      })
      .addCase(desmarcarNoRenueva.rejected, (state, action) => {
        const id = action.payload?.polizaId ?? action.meta.arg?.polizaId;
        const msg = action.payload?.message || "Error al deshacer";
        if (id != null) setActionError(state, id, "desmarcar_no_renueva", msg);
      })

      // ── 🆕 VERIFICAR ──
      .addCase(verificarRenovacion.pending, (state, action) => {
        const id = action.meta.arg?.polizaId;
        if (id != null) setActionLoading(state, id, "verificar");
      })
      .addCase(verificarRenovacion.fulfilled, (state, action) => {
        const { polizaId, data } = action.payload || {};
        if (polizaId != null) setActionSuccess(state, polizaId, "verificar");
        state.items = (state.items || []).map((p) =>
          p.id === polizaId
            ? {
                ...p,
                renovacion_verificada: true,
                renovacion_verificada_en: data?.renovacion_verificada_en || new Date().toISOString(),
              }
            : p
        );
        invalidateAllCache(state);
      })
      .addCase(verificarRenovacion.rejected, (state, action) => {
        const id = action.payload?.polizaId ?? action.meta.arg?.polizaId;
        const msg = action.payload?.message || "Error al verificar";
        if (id != null) setActionError(state, id, "verificar", msg);
      })

      // ── 🆕 DES-VERIFICAR ──
      .addCase(desVerificarRenovacion.pending, (state, action) => {
        const id = action.meta.arg?.polizaId;
        if (id != null) setActionLoading(state, id, "des_verificar");
      })
      .addCase(desVerificarRenovacion.fulfilled, (state, action) => {
        const { polizaId } = action.payload || {};
        if (polizaId != null) setActionSuccess(state, polizaId, "des_verificar");
        state.items = (state.items || []).map((p) =>
          p.id === polizaId
            ? { ...p, renovacion_verificada: false, renovacion_verificada_en: null }
            : p
        );
        invalidateAllCache(state);
      })
      .addCase(desVerificarRenovacion.rejected, (state, action) => {
        const id = action.payload?.polizaId ?? action.meta.arg?.polizaId;
        const msg = action.payload?.message || "Error al deshacer verificación";
        if (id != null) setActionError(state, id, "des_verificar", msg);
      })

      .addCase(fetchRenovacionesOficinas.fulfilled, (state, action) => {
        state.oficinasStatus = "succeeded";
        state.oficinasError = null;

        const oficinas = action.payload?.oficinas || [];
        state.oficinas = oficinas;

        if (!action.payload?.fromCache) {
          state.oficinasCache = {
            items: oficinas,
            fetchedAt: Date.now(),
          };
        }
      })
      .addCase(fetchRenovacionesOficinas.rejected, (state, action) => {
        state.oficinasStatus = "failed";
        state.oficinasError =
          action.payload?.message || "Error al cargar oficinas";
      })

      // ---------- REFACTURAR ----------
      .addCase(refacturarPoliza.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id != null) setActionLoading(state, id, "refacturar");
        state.lastActionResult = null;
      })
      .addCase(refacturarPoliza.fulfilled, (state, action) => {
        const id = action.payload?.id;
        if (id != null) setActionSuccess(state, id, "refacturar");

        state.lastActionResult = {
          type: "refacturar",
          id,
          nuevaPoliza: action.payload?.data || null,
        };

        invalidateAllCache(state);
      })
      .addCase(refacturarPoliza.rejected, (state, action) => {
        const id = action.payload?.id ?? action.meta.arg?.id;
        const msg = action.payload?.message || "Error al refacturar póliza";
        if (id != null) setActionError(state, id, "refacturar", msg);
      })

      // ---------- RENOVAR ----------
      .addCase(renovarPoliza.pending, (state, action) => {
        const id = action.meta.arg?.id;
        if (id != null) setActionLoading(state, id, "renovar");
        state.lastActionResult = null;
      })
      .addCase(renovarPoliza.fulfilled, (state, action) => {
        const id = action.payload?.id;
        if (id != null) setActionSuccess(state, id, "renovar");

        state.lastActionResult = {
          type: "renovar",
          id,
          nuevaPoliza: action.payload?.data || null,
        };

        invalidateAllCache(state);
      })
      .addCase(renovarPoliza.rejected, (state, action) => {
        const id = action.payload?.id ?? action.meta.arg?.id;
        const msg = action.payload?.message || "Error al renovar póliza";
        if (id != null) setActionError(state, id, "renovar", msg);
      });
  },
});

export const {
  clearRenovacionesError,
  clearRenovacionesCache,
  invalidateRenovaciones,

  clearRenovacionesResumenError,
  clearRenovacionesResumenCache,
  invalidateRenovacionesResumen,

  clearLastActionResult,
  clearActionStatus,
  clearOficinas,
} = renovacionesSlice.actions;

export default renovacionesSlice.reducer;

// -------------------- Selectors --------------------
export const selectRenovacionesState = (state) => state.renovaciones;

export const selectRenovacionesItems = (state) => state.renovaciones.items;
export const selectRenovacionesCount = (state) => state.renovaciones.count;
export const selectRenovacionesNext = (state) => state.renovaciones.next;
export const selectRenovacionesPrevious = (state) => state.renovaciones.previous;

export const selectRenovacionesStatus = (state) => state.renovaciones.status;
export const selectRenovacionesError = (state) => state.renovaciones.error;

export const selectRenovacionesResumen = (state) => state.renovaciones.resumen;
export const selectRenovacionesResumenStatus = (state) =>
  state.renovaciones.resumenStatus;
export const selectRenovacionesResumenError = (state) =>
  state.renovaciones.resumenError;

export const selectRenovacionesGlobalResumen = (state) =>
  state.renovaciones.globalResumen;

export const selectRenovacionesOficinas = (state) => state.renovaciones.oficinas;
export const selectRenovacionesOficinasStatus = (state) =>
  state.renovaciones.oficinasStatus;
export const selectRenovacionesOficinasError = (state) =>
  state.renovaciones.oficinasError;