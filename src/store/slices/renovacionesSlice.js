// src/store/slices/renovacionesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/**
 * ✅ Base URL unificada (MISMA idea que App.jsx)
 * Prioridad:
 *  - VITE_API_BASE
 *  - VITE_API_URL
 *  - window.__API_URL__
 *  - "/api/" (proxy / mismo dominio)
 *
 * ✅ En producción: si está seteado a localhost/127.0.0.1, lo ignoramos y usamos "/api/"
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

  // si viene vacío, usamos proxy
  if (!base) base = "/api/";

  // normalizar slash final
  if (!base.endsWith("/")) base += "/";

  // ✅ Si el env trae solo el ORIGIN (https://dominio.com/), aseguramos /api/
  // (si ya incluye /api/ no hacemos nada)
  if (!base.includes("/api/")) {
    // Evita caso base="/api/" que ya incluye /api/
    if (base !== "/api/") base = `${base}api/`;
  }

  // ✅ Anti-bug prod: si apunta a localhost pero estás en un dominio real => usar "/api/"
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

// ✅ IMPORTANTE: baseURL termina en "/api/" o es "/api/"
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

/** TTL del cache de la bandeja (ms) */
const LIST_CACHE_TTL = 20_000;

/** TTL del cache de oficinas (ms) */
const OFICINAS_CACHE_TTL = 5 * 60_000; // 5 min

/** Normaliza bools query a "1"/"0" */
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
  // soporta:
  // - ["Casa Central", "Sucursal 1"]
  // - [{nombre:"..."}, {oficina:"..."}]
  // - {results:[...]} o {oficinas:[...]}
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
 * Soporta filtros típicos:
 *  - dias
 *  - solo_pendientes
 *  - search
 *  - ordering
 *  - page / page_size
 *  - estado / fase / compania / oficina / cliente / patente / asegurado / sin_numero / solo_activas (opcionales)
 *
 * Importante: ignora "force" (solo se usa para bypass de cache)
 */
export const buildRenovacionesQuery = (params = {}) => {
  const p0 = stripForce(params);
  const p = { ...p0 };

  // defaults razonables
  if (p.dias == null || p.dias === "") p.dias = 30;

  // ✅ defaults paginación (para cache key estable)
  if (p.page == null || p.page === "") p.page = 1;
  if (p.page_size == null || p.page_size === "") p.page_size = 25;

  // bools -> 1/0
  if (p.solo_pendientes != null) p.solo_pendientes = to01(p.solo_pendientes);

  // limpieza strings
  const trimOrUndef = (x) => {
    if (x == null) return undefined;
    const s = String(x).trim();
    return s === "" ? undefined : s;
  };

  const entries = [
    ["dias", trimOrUndef(p.dias)],
    ["solo_pendientes", trimOrUndef(p.solo_pendientes)],
    ["search", trimOrUndef(p.search)],
    ["ordering", trimOrUndef(p.ordering)],
    ["page", trimOrUndef(p.page)],
    ["page_size", trimOrUndef(p.page_size)],

    // (opcionales) si querés filtrar desde backend con get_queryset()
    ["estado", trimOrUndef(p.estado)],
    ["fase", trimOrUndef(p.fase)],
    ["compania", trimOrUndef(p.compania)],
    ["oficina", trimOrUndef(p.oficina)],
    ["cliente", trimOrUndef(p.cliente)],
    ["patente", trimOrUndef(p.patente)],
    ["asegurado", trimOrUndef(p.asegurado)],
    ["sin_numero", p.sin_numero != null ? to01(p.sin_numero) : undefined],
    ["solo_activas", p.solo_activas != null ? to01(p.solo_activas) : undefined],
  ].filter(([, v]) => v !== undefined);

  // orden estable para cache key
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

/**
 * Thunk: traer bandeja de renovaciones
 * ✅ Importante: devolvemos desde cache dentro del thunk.
 * ✅ Si params.force === true => bypass cache y pega a red sí o sí.
 */
export const fetchRenovaciones = createAsyncThunk(
  "renovaciones/fetchRenovaciones",
  async (params = {}, { rejectWithValue, getState }) => {
    const force = !!params?.force;
    const cleanParams = stripForce(params);
    const query = buildRenovacionesQuery(cleanParams);

    try {
      const state = getState().renovaciones;
      const cached = state?.cache?.[query];

      // ✅ si hay cache fresco y NO es force, devolvemos desde cache
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

      // ⚠️ NO usar "/polizas..." porque rompe /api/ en axios baseURL
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

/**
 * Thunk: traer listado de oficinas (para dropdown estable)
 * Endpoint esperado: GET /api/polizas/oficinas/
 */
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

/**
 * POST /api/polizas/{id}/refacturar/
 * payload opcional:
 *  { nuevoNumero, nuevaCompania, nuevoPrecio, nuevaFecha }
 */
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

/**
 * POST /api/polizas/{id}/renovar/
 * payload opcional:
 *  { nuevoNumero, nuevaCompania, nuevoPrecio, nuevaFecha }
 */
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
  // listado
  items: [],
  count: 0,
  next: null,
  previous: null,

  // status de carga del listado
  status: "idle", // idle | loading | succeeded | failed
  error: null,

  // cache por querystring
  cache: {
    // "?dias=30&solo_pendientes=1&page=1&page_size=25": { items, count, next, previous, fetchedAt }
  },
  lastQuery: "",

  // oficinas (dropdown)
  oficinas: [],
  oficinasStatus: "idle", // idle | loading | succeeded | failed
  oficinasError: null,
  oficinasCache: null, // { items: [], fetchedAt }

  // acciones (renovar/refacturar) por póliza
  actionStatusById: {
    // [polizaId]: { status, error, type: "renovar"|"refacturar"|null }
  },
  lastActionResult: null, // { type, id, nuevaPoliza? }
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
      // fuerza recarga en el próximo fetch (sin cambiar filtros)
      if (state.lastQuery && state.cache[state.lastQuery]) {
        state.cache[state.lastQuery].fetchedAt = 0;
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

    // opcional: por si querés resetear oficinas desde UI
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

        // ✅ si hay cache fresco y NO es force, hidratamos de inmediato
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

        // ✅ si vino de cache, no tocamos fetchedAt; si vino de red, guardamos/actualizamos
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

      // ---------- OFICINAS ----------
      .addCase(fetchRenovacionesOficinas.pending, (state) => {
        state.oficinasError = null;

        // si ya tenés cache fresco, no hace falta loading fuerte (evita flicker)
        if (isFresh(state.oficinasCache, OFICINAS_CACHE_TTL)) {
          state.oficinasStatus = "succeeded";
          state.oficinas = state.oficinasCache?.items || [];
          return;
        }

        state.oficinasStatus = "loading";
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

        // ✅ invalidar todo cache (páginas/filtros distintos)
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

        // ✅ invalidar todo cache
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

export const selectRenovacionesOficinas = (state) => state.renovaciones.oficinas;
export const selectRenovacionesOficinasStatus = (state) =>
  state.renovaciones.oficinasStatus;
export const selectRenovacionesOficinasError = (state) =>
  state.renovaciones.oficinasError;
