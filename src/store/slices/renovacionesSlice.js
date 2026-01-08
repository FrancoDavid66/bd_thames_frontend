// src/store/slices/renovacionesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/**
 * Ajustá esto a tu config real si ya tenés api client (recomendado).
 * Si ya usás un axiosInstance en otro slice (ej: api.js), reemplazá por ese.
 */
const API_BASE = import.meta?.env?.VITE_API_URL || "http://127.0.0.1:8000";
const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

/** TTL del cache de la bandeja (ms) */
const LIST_CACHE_TTL = 20_000;

/** Normaliza bools query a "1"/"0" */
const to01 = (v) => {
  if (v === true) return "1";
  if (v === false) return "0";
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "t", "yes", "y", "on", "si", "sí"].includes(s) ? "1" : "0";
};

/**
 * Construye querystring estable y limpio.
 * Soporta filtros típicos:
 *  - dias
 *  - solo_pendientes
 *  - search
 *  - ordering
 *  - page / page_size
 *  - estado / fase / compania / oficina / cliente / patente / asegurado / sin_numero / solo_activas (si los querés pasar)
 */
export const buildRenovacionesQuery = (params = {}) => {
  const p = { ...params };

  // defaults razonables
  if (p.dias == null || p.dias === "") p.dias = 30;

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

/**
 * Thunk: traer bandeja de renovaciones
 * Devuelve { results, count, next, previous } si hay paginación,
 * o array si no hay paginación (pero tu backend usa pagination_class, así que debería ser paginado).
 */
export const fetchRenovaciones = createAsyncThunk(
  "renovaciones/fetchRenovaciones",
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = buildRenovacionesQuery(params);
      const { data } = await api.get(`/polizas/renovaciones/${query}`);
      return { data, params };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error al cargar renovaciones";
      return rejectWithValue({ message: msg, raw: err?.response?.data });
    }
  },
  {
    condition: (params = {}, { getState }) => {
      const state = getState().renovaciones;
      const query = buildRenovacionesQuery(params);

      const cached = state.cache[query];
      if (!cached) return true;

      const age = Date.now() - (cached.fetchedAt || 0);
      if (age > LIST_CACHE_TTL) return true;

      // ya está fresco
      return false;
    },
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
      const { data } = await api.post(`/polizas/${id}/refacturar/`, payload);
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
      const { data } = await api.post(`/polizas/${id}/renovar/`, payload);
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
    // "?dias=30&solo_pendientes=1&page=1": { items, count, next, previous, fetchedAt }
  },
  lastQuery: "",

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
  },
  extraReducers: (builder) => {
    builder
      // ---------- LISTADO ----------
      .addCase(fetchRenovaciones.pending, (state, action) => {
        state.status = "loading";
        state.error = null;
        const query = buildRenovacionesQuery(action.meta.arg || {});
        state.lastQuery = query;
      })
      .addCase(fetchRenovaciones.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;

        const query = buildRenovacionesQuery(action.payload.params || {});
        state.lastQuery = query;

        const data = action.payload.data;

        // paginado DRF: { count, next, previous, results }
        const items = Array.isArray(data) ? data : data?.results || [];
        const count = Array.isArray(data) ? items.length : Number(data?.count || 0);
        const next = Array.isArray(data) ? null : data?.next || null;
        const previous = Array.isArray(data) ? null : data?.previous || null;

        state.items = items;
        state.count = count;
        state.next = next;
        state.previous = previous;

        state.cache[query] = {
          items,
          count,
          next,
          previous,
          fetchedAt: Date.now(),
        };
      })
      .addCase(fetchRenovaciones.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload?.message || "Error al cargar renovaciones";
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

        // invalidar cache para que al volver a pedir bandeja salga actualizado
        if (state.lastQuery && state.cache[state.lastQuery]) {
          state.cache[state.lastQuery].fetchedAt = 0;
        }
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

        // invalidar cache
        if (state.lastQuery && state.cache[state.lastQuery]) {
          state.cache[state.lastQuery].fetchedAt = 0;
        }
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
} = renovacionesSlice.actions;

export default renovacionesSlice.reducer;

// -------------------- Selectors --------------------
export const selectRenovacionesState = (state) => state.renovaciones;

export const selectRenovacionesItems = (state) => state.renovaciones.items;
export const selectRenovacionesCount = (state) => state.renovaciones.count;
export const selectRenovacionesStatus = (state) => state.renovaciones.status;
export const selectRenovacionesError = (state) => state.renovaciones.error;

export const selectRenovacionesLastActionResult = (state) =>
  state.renovaciones.lastActionResult;

export const selectRenovacionActionStatusById = (state, polizaId) =>
  state.renovaciones.actionStatusById?.[polizaId] || { status: "idle", error: null, type: null };
