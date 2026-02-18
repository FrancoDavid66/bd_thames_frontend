// src/store/slices/gruasSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import GruasAPI from "../../api/gruas";

/* =========================
   Debug helper (solo DEV)
========================= */
const __DEV__ = (() => {
  try {
    return Boolean(import.meta?.env?.DEV);
  } catch {
    return false;
  }
})();

function dbg(...args) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}
function dbgWarn(...args) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
}
function dbgErr(...args) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.error(...args);
}

/* =========================
   Utils
========================= */
function isInternalKey(k) {
  if (!k) return false;
  if (k === "force") return true;
  if (k === "_ts") return true;
  return String(k).startsWith("_");
}

function sanitizeParams(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (isInternalKey(k)) continue;
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

function stableKey(obj = {}) {
  const clean = sanitizeParams(obj);
  const keys = Object.keys(clean).sort();
  const out = {};
  for (const k of keys) out[k] = clean[k];
  return JSON.stringify(out);
}

function normalizeArrayPayload(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) {
      if (Array.isArray(res[k])) return res[k];
    }
  }
  return [];
}

function normalizePagedPayload(res) {
  let payload = { items: [], count: 0, next: null, previous: null };
  if (Array.isArray(res)) {
    payload.items = res;
    payload.count = res.length;
    return payload;
  }
  if (res && typeof res === "object") {
    payload.items = Array.isArray(res.results)
      ? res.results
      : Array.isArray(res.items)
      ? res.items
      : [];
    payload.count = typeof res.count === "number" ? res.count : payload.items.length;
    payload.next = res.next ?? null;
    payload.previous = res.previous ?? null;
  }
  return payload;
}

/**
 * ✅ Normaliza “póliza adherida” para que SIEMPRE tenga adhesion_id cuando venga
 * con otro nombre (adhesion, adhesionId, adhesion_activa_id, etc).
 */
function toIntOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizePolizaAdherida(p) {
  if (!p || typeof p !== "object") return p;

  const out = { ...p };

  const candidates = [
    out.adhesion_id,
    out.adhesionId,
    out.adhesion,
    out.adhesion_activa_id,
    out.adhesion_activa,
    out.adhesion_activa?.id,
    out.adhesion_obj?.id,
  ];

  // si algún día backend manda array/obj de adhesiones
  if (out.adhesiones_grua && Array.isArray(out.adhesiones_grua)) {
    const act = out.adhesiones_grua.find((a) => String(a?.estado || "").toUpperCase() === "ACTIVA");
    if (act?.id != null) candidates.push(act.id);
  }
  if (out.adhesiones && Array.isArray(out.adhesiones)) {
    const act = out.adhesiones.find((a) => String(a?.estado || "").toUpperCase() === "ACTIVA");
    if (act?.id != null) candidates.push(act.id);
  }

  const found = candidates.map(toIntOrNull).find((x) => x != null);
  if (found != null) out.adhesion_id = found;

  return out;
}

/**
 * ✅ FIX CLAVE:
 * El backend exige adhesion (adhesion o adhesion_id).
 * Si el front manda poliza, lo convertimos automáticamente a adhesion cuando exista adhesion_id.
 */
function normalizeCreateSolicitudPayload(payload = {}) {
  const p = { ...(payload || {}) };

  const adhesionId =
    toIntOrNull(p.adhesion) ??
    toIntOrNull(p.adhesion_id) ??
    (p.polizaSel ? toIntOrNull(p.polizaSel?.adhesion_id) : null);

  if (adhesionId != null) {
    p.adhesion = adhesionId;
  }

  if ("km_estimados" in p) delete p.km_estimados;
  if ("polizaSel" in p) delete p.polizaSel;

  return p;
}

const initialState = {
  polizasBuscar: {
    q: "",
    items: [],
    status: "idle",
    error: null,
    cache: {},
    ttlMs: 20_000,
  },

  polizasAdheridasBuscar: {
    q: "",
    items: [],
    status: "idle",
    error: null,
    cache: {},
    ttlMs: 20_000,
  },

  planes: {
    params: { q: "", activo: "" },
    items: [],
    status: "idle",
    error: null,
    cache: {},
    ttlMs: 60_000,
  },

  proveedores: {
    params: { q: "", activo: "" },
    items: [],
    count: 0,
    next: null,
    previous: null,
    status: "idle",
    error: null,
    cache: {},
    ttlMs: 60_000,
  },

  adhesiones: {
    params: { q: "", estado: "TODAS", page: 1, page_size: 25 },
    items: [],
    count: 0,
    next: null,
    previous: null,
    status: "idle",
    error: null,
    cache: {},
    ttlMs: 20_000,
  },

  solicitudes: {
    params: { q: "", estado: "TODAS", page: 1, page_size: 25 },
    items: [],
    count: 0,
    next: null,
    previous: null,
    status: "idle",
    error: null,
    cache: {},
    ttlMs: 20_000,
  },

  createAdhesion: { status: "idle", error: null },

  createSolicitud: { status: "idle", error: null },
  asignarProveedorSolicitud: { status: "idle", error: null }, // ✅ nuevo
  updateSolicitud: { status: "idle", error: null },
  deleteSolicitud: { status: "idle", error: null },

  createPlan: { status: "idle", error: null },
  updatePlan: { status: "idle", error: null },
  deletePlan: { status: "idle", error: null },

  createProveedor: { status: "idle", error: null },
  updateProveedor: { status: "idle", error: null },
  deleteProveedor: { status: "idle", error: null },
};

/* =========================
   THUNKS
========================= */

// Buscar pólizas para el modal (adhesiones)
export const buscarPolizas = createAsyncThunk(
  "gruas/buscarPolizas",
  async ({ q, ...extra } = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState().gruas?.polizasBuscar;
      const key = stableKey({ q, ...extra });
      const cached = state?.cache?.[key];

      dbg("[GRUAS][buscarPolizas] start", { q, extra: sanitizeParams(extra), key });

      if (cached && Date.now() - cached.ts < (state?.ttlMs ?? 20_000)) {
        dbg("[GRUAS][buscarPolizas] cache HIT", { key, count: cached.items?.length || 0 });
        return { key, items: cached.items, fromCache: true };
      }

      const res = await GruasAPI.buscarPolizas(q, sanitizeParams(extra));
      const items = normalizeArrayPayload(res);

      dbg("[GRUAS][buscarPolizas] api OK", {
        key,
        rawType: Array.isArray(res) ? "array" : typeof res,
        rawKeys: res && typeof res === "object" ? Object.keys(res) : null,
        count: items?.length || 0,
        first: items?.[0] || null,
      });

      return { key, items, fromCache: false };
    } catch (e) {
      dbgErr("[GRUAS][buscarPolizas] api ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "Error buscando pólizas" });
    }
  }
);

// ✅ Buscar pólizas ADHERIDAS (para Solicitudes)
export const buscarPolizasAdheridas = createAsyncThunk(
  "gruas/buscarPolizasAdheridas",
  async ({ q, ...extra } = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState().gruas?.polizasAdheridasBuscar;
      const key = stableKey({ q, ...extra });
      const cached = state?.cache?.[key];

      dbg("[GRUAS][buscarPolizasAdheridas] start", { q, extra: sanitizeParams(extra), key });

      if (cached && Date.now() - cached.ts < (state?.ttlMs ?? 20_000)) {
        dbg("[GRUAS][buscarPolizasAdheridas] cache HIT", { key, count: cached.items?.length || 0 });
        return { key, items: cached.items, fromCache: true };
      }

      const res = await GruasAPI.buscarPolizasAdheridas(q, sanitizeParams(extra));
      const raw = normalizeArrayPayload(res);
      const items = (raw || []).map(normalizePolizaAdherida);

      const missingAdhesion = (items || []).filter((x) => !x?.adhesion_id);

      dbg("[GRUAS][buscarPolizasAdheridas] api OK", {
        key,
        rawType: Array.isArray(res) ? "array" : typeof res,
        rawKeys: res && typeof res === "object" ? Object.keys(res) : null,
        count: items?.length || 0,
        first: items?.[0] || null,
        missingAdhesionCount: missingAdhesion.length,
      });

      if (missingAdhesion.length && __DEV__) {
        dbgWarn("[GRUAS][buscarPolizasAdheridas] WARNING: items sin adhesion_id", {
          example: missingAdhesion[0],
        });
      }

      return { key, items, fromCache: false };
    } catch (e) {
      dbgErr("[GRUAS][buscarPolizasAdheridas] api ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "Error buscando pólizas adheridas" });
    }
  }
);

// ✅ Planes: listar
export const fetchPlanes = createAsyncThunk(
  "gruas/fetchPlanes",
  async (params = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState().gruas?.planes;
      const merged = { ...(state?.params || {}), ...(params || {}) };
      const key = stableKey(merged);

      if (state?.cache?.[key] && Date.now() - state.cache[key].ts < (state?.ttlMs ?? 60_000)) {
        dbg("[GRUAS][fetchPlanes] cache HIT", { key });
        return { key, payload: state.cache[key].payload, params: merged, fromCache: true };
      }

      dbg("[GRUAS][fetchPlanes] api start", { merged: sanitizeParams(merged), key });

      const res = await GruasAPI.getPlanes(sanitizeParams(merged));
      const payload = normalizePagedPayload(res);

      dbg("[GRUAS][fetchPlanes] api OK", { key, count: payload.items?.length || 0 });

      return { key, payload, params: merged, fromCache: false };
    } catch (e) {
      dbgErr("[GRUAS][fetchPlanes] api ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "Error cargando planes" });
    }
  }
);

// ✅ Planes: crear
export const createPlan = createAsyncThunk(
  "gruas/createPlan",
  async (payload, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][createPlan] payload", payload);
      const res = await GruasAPI.createPlan(payload);
      dbg("[GRUAS][createPlan] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][createPlan] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo crear el plan" });
    }
  }
);

// ✅ Planes: editar
export const updatePlan = createAsyncThunk(
  "gruas/updatePlan",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][updatePlan] start", { id, data });
      const res = await GruasAPI.updatePlan(id, data);
      dbg("[GRUAS][updatePlan] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][updatePlan] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo actualizar el plan" });
    }
  }
);

// ✅ Planes: borrar
export const deletePlan = createAsyncThunk("gruas/deletePlan", async (id, { rejectWithValue }) => {
  try {
    dbg("[GRUAS][deletePlan] start", { id });
    await GruasAPI.deletePlan(id);
    dbg("[GRUAS][deletePlan] OK", { id });
    return { id };
  } catch (e) {
    dbgErr("[GRUAS][deletePlan] ERROR", e);
    return rejectWithValue(e?.data || { detail: e?.message || "No se pudo eliminar el plan" });
  }
});

// ✅ Proveedores: listar
export const fetchProveedores = createAsyncThunk(
  "gruas/fetchProveedores",
  async (params = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState().gruas?.proveedores;
      const merged = { ...(state?.params || {}), ...(params || {}) };
      const key = stableKey(merged);

      if (state?.cache?.[key] && Date.now() - state.cache[key].ts < (state?.ttlMs ?? 60_000)) {
        dbg("[GRUAS][fetchProveedores] cache HIT", { key });
        return { key, payload: state.cache[key].payload, params: merged, fromCache: true };
      }

      dbg("[GRUAS][fetchProveedores] api start", { merged: sanitizeParams(merged), key });

      const res = await GruasAPI.getProveedores(sanitizeParams(merged));
      const payload = normalizePagedPayload(res);

      dbg("[GRUAS][fetchProveedores] api OK", { key, count: payload.items?.length || 0 });

      return { key, payload, params: merged, fromCache: false };
    } catch (e) {
      dbgErr("[GRUAS][fetchProveedores] api ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "Error cargando proveedores" });
    }
  }
);

// ✅ Proveedores: crear
export const createProveedor = createAsyncThunk(
  "gruas/createProveedor",
  async (payload, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][createProveedor] payload", payload);
      const res = await GruasAPI.createProveedor(payload);
      dbg("[GRUAS][createProveedor] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][createProveedor] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo crear el proveedor" });
    }
  }
);

// ✅ Proveedores: editar
export const updateProveedor = createAsyncThunk(
  "gruas/updateProveedor",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][updateProveedor] start", { id, data });
      const res = await GruasAPI.updateProveedor(id, data);
      dbg("[GRUAS][updateProveedor] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][updateProveedor] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo actualizar el proveedor" });
    }
  }
);

// ✅ Proveedores: borrar
export const deleteProveedor = createAsyncThunk(
  "gruas/deleteProveedor",
  async (id, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][deleteProveedor] start", { id });
      await GruasAPI.deleteProveedor(id);
      dbg("[GRUAS][deleteProveedor] OK", { id });
      return { id };
    } catch (e) {
      dbgErr("[GRUAS][deleteProveedor] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo eliminar el proveedor" });
    }
  }
);

// Listado de adhesiones
export const fetchAdhesiones = createAsyncThunk(
  "gruas/fetchAdhesiones",
  async (params = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState().gruas?.adhesiones;
      const merged = { ...(state?.params || {}), ...(params || {}) };
      const key = stableKey(merged);

      if (state?.cache?.[key] && Date.now() - state.cache[key].ts < (state?.ttlMs ?? 20_000)) {
        dbg("[GRUAS][fetchAdhesiones] cache HIT", { key });
        return { key, payload: state.cache[key].payload, params: merged, fromCache: true };
      }

      dbg("[GRUAS][fetchAdhesiones] api start", { merged: sanitizeParams(merged), key });

      const res = await GruasAPI.getAdhesiones(sanitizeParams(merged));
      const payload = normalizePagedPayload(res);

      dbg("[GRUAS][fetchAdhesiones] api OK", {
        key,
        count: payload.items?.length || 0,
        first: payload.items?.[0] || null,
      });

      return { key, payload, params: merged, fromCache: false };
    } catch (e) {
      dbgErr("[GRUAS][fetchAdhesiones] api ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "Error cargando adhesiones" });
    }
  }
);

// Crear adhesión
export const createAdhesion = createAsyncThunk(
  "gruas/createAdhesion",
  async (payload, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][createAdhesion] payload", payload);
      const res = await GruasAPI.createAdhesion(payload);
      dbg("[GRUAS][createAdhesion] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][createAdhesion] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo crear la adhesión" });
    }
  }
);

// ✅ Solicitudes: listar (agrega force para saltar cache)
export const fetchSolicitudes = createAsyncThunk(
  "gruas/fetchSolicitudes",
  async (params = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState().gruas?.solicitudes;
      const merged = { ...(state?.params || {}), ...(params || {}) };
      const force = merged?.force === true;

      const key = stableKey(merged);
      const cached = state?.cache?.[key];

      if (!force && cached && Date.now() - cached.ts < (state?.ttlMs ?? 20_000)) {
        dbg("[GRUAS][fetchSolicitudes] cache HIT", { key });
        return { key, payload: cached.payload, params: merged, fromCache: true };
      }

      dbg("[GRUAS][fetchSolicitudes] api start", { merged: sanitizeParams(merged), key, force });

      const res = await GruasAPI.getSolicitudes(sanitizeParams(merged));
      const payload = normalizePagedPayload(res);

      dbg("[GRUAS][fetchSolicitudes] api OK", { key, count: payload.items?.length || 0 });

      return { key, payload, params: merged, fromCache: false };
    } catch (e) {
      dbgErr("[GRUAS][fetchSolicitudes] api ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "Error cargando solicitudes" });
    }
  }
);

// ✅ Solicitudes: crear (FIX: mapear adhesion automáticamente + logs)
export const createSolicitud = createAsyncThunk(
  "gruas/createSolicitud",
  async (payload, { rejectWithValue }) => {
    try {
      const normalized = normalizeCreateSolicitudPayload(payload);

      dbg("[GRUAS][createSolicitud] payload", payload);
      dbg("[GRUAS][createSolicitud] normalized", normalized);

      if (!normalized?.adhesion) {
        dbgWarn("[GRUAS][createSolicitud] WARNING: falta adhesion en payload normalizado", normalized);
      }

      const res = await GruasAPI.createSolicitud(normalized);
      dbg("[GRUAS][createSolicitud] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][createSolicitud] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo crear la solicitud" });
    }
  }
);

// ✅ Solicitudes: asignar proveedor (usa action si existe; fallback PATCH)
export const asignarProveedorSolicitud = createAsyncThunk(
  "gruas/asignarProveedorSolicitud",
  async ({ id, proveedorId }, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][asignarProveedorSolicitud] start", { id, proveedorId });
      const res = await GruasAPI.asignarProveedorSolicitud(id, proveedorId);
      dbg("[GRUAS][asignarProveedorSolicitud] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][asignarProveedorSolicitud] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo asignar el proveedor" });
    }
  }
);

// ✅ Solicitudes: editar
export const updateSolicitud = createAsyncThunk(
  "gruas/updateSolicitud",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][updateSolicitud] start", { id, data });
      const res = await GruasAPI.updateSolicitud(id, data);
      dbg("[GRUAS][updateSolicitud] OK", res);
      return res;
    } catch (e) {
      dbgErr("[GRUAS][updateSolicitud] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo actualizar la solicitud" });
    }
  }
);

// ✅ Solicitudes: borrar
export const deleteSolicitud = createAsyncThunk(
  "gruas/deleteSolicitud",
  async (id, { rejectWithValue }) => {
    try {
      dbg("[GRUAS][deleteSolicitud] start", { id });
      await GruasAPI.deleteSolicitud(id);
      dbg("[GRUAS][deleteSolicitud] OK", { id });
      return { id };
    } catch (e) {
      dbgErr("[GRUAS][deleteSolicitud] ERROR", e);
      return rejectWithValue(e?.data || { detail: e?.message || "No se pudo eliminar la solicitud" });
    }
  }
);

/* =========================
   SLICE
========================= */

const gruasSlice = createSlice({
  name: "gruas",
  initialState,
  reducers: {
    clearPolizasBuscar(state) {
      state.polizasBuscar.q = "";
      state.polizasBuscar.items = [];
      state.polizasBuscar.status = "idle";
      state.polizasBuscar.error = null;
    },
    clearPolizasAdheridasBuscar(state) {
      state.polizasAdheridasBuscar.q = "";
      state.polizasAdheridasBuscar.items = [];
      state.polizasAdheridasBuscar.status = "idle";
      state.polizasAdheridasBuscar.error = null;
    },
    invalidateAdhesionesCache(state) {
      state.adhesiones.cache = {};
    },
    invalidatePlanesCache(state) {
      state.planes.cache = {};
    },
    invalidateProveedoresCache(state) {
      state.proveedores.cache = {};
    },
    invalidateSolicitudesCache(state) {
      state.solicitudes.cache = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // buscarPolizas
      .addCase(buscarPolizas.pending, (state, action) => {
        state.polizasBuscar.status = "loading";
        state.polizasBuscar.error = null;
        state.polizasBuscar.q = action.meta.arg?.q || "";
      })
      .addCase(buscarPolizas.fulfilled, (state, action) => {
        state.polizasBuscar.status = "success";
        state.polizasBuscar.items = action.payload.items || [];
        const key = action.payload.key;
        state.polizasBuscar.cache[key] = {
          ts: Date.now(),
          items: state.polizasBuscar.items,
        };
      })
      .addCase(buscarPolizas.rejected, (state, action) => {
        state.polizasBuscar.status = "error";
        state.polizasBuscar.error = action.payload?.detail || action.error?.message || "Error";
      })

      // buscarPolizasAdheridas
      .addCase(buscarPolizasAdheridas.pending, (state, action) => {
        state.polizasAdheridasBuscar.status = "loading";
        state.polizasAdheridasBuscar.error = null;
        state.polizasAdheridasBuscar.q = action.meta.arg?.q || "";
      })
      .addCase(buscarPolizasAdheridas.fulfilled, (state, action) => {
        state.polizasAdheridasBuscar.status = "success";
        state.polizasAdheridasBuscar.items = action.payload.items || [];
        const key = action.payload.key;
        state.polizasAdheridasBuscar.cache[key] = {
          ts: Date.now(),
          items: state.polizasAdheridasBuscar.items,
        };
      })
      .addCase(buscarPolizasAdheridas.rejected, (state, action) => {
        state.polizasAdheridasBuscar.status = "error";
        state.polizasAdheridasBuscar.error = action.payload?.detail || action.error?.message || "Error";
      })

      // fetchPlanes
      .addCase(fetchPlanes.pending, (state, action) => {
        state.planes.status = "loading";
        state.planes.error = null;
        state.planes.params = {
          ...(state.planes.params || {}),
          ...(action.meta.arg || {}),
        };
      })
      .addCase(fetchPlanes.fulfilled, (state, action) => {
        state.planes.status = "success";
        state.planes.items = action.payload.payload.items || [];
        const key = action.payload.key;
        state.planes.cache[key] = {
          ts: Date.now(),
          payload: action.payload.payload,
        };
      })
      .addCase(fetchPlanes.rejected, (state, action) => {
        state.planes.status = "error";
        state.planes.error = action.payload?.detail || action.error?.message || "Error";
      })

      // createPlan
      .addCase(createPlan.pending, (state) => {
        state.createPlan.status = "loading";
        state.createPlan.error = null;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.createPlan.status = "success";
        state.createPlan.error = null;
        state.planes.cache = {};
        if (action.payload) {
          state.planes.items = [action.payload, ...(state.planes.items || [])];
        }
      })
      .addCase(createPlan.rejected, (state, action) => {
        state.createPlan.status = "error";
        state.createPlan.error = action.payload?.detail || action.error?.message || "Error";
      })

      // updatePlan
      .addCase(updatePlan.pending, (state) => {
        state.updatePlan.status = "loading";
        state.updatePlan.error = null;
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        state.updatePlan.status = "success";
        state.updatePlan.error = null;
        state.planes.cache = {};
        const upd = action.payload;
        if (upd?.id != null) {
          state.planes.items = (state.planes.items || []).map((p) => (p.id === upd.id ? upd : p));
        }
      })
      .addCase(updatePlan.rejected, (state, action) => {
        state.updatePlan.status = "error";
        state.updatePlan.error = action.payload?.detail || action.error?.message || "Error";
      })

      // deletePlan
      .addCase(deletePlan.pending, (state) => {
        state.deletePlan.status = "loading";
        state.deletePlan.error = null;
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.deletePlan.status = "success";
        state.deletePlan.error = null;
        state.planes.cache = {};
        const id = action.payload?.id;
        if (id != null) {
          state.planes.items = (state.planes.items || []).filter((p) => p.id !== id);
        }
      })
      .addCase(deletePlan.rejected, (state, action) => {
        state.deletePlan.status = "error";
        state.deletePlan.error = action.payload?.detail || action.error?.message || "Error";
      })

      // fetchProveedores
      .addCase(fetchProveedores.pending, (state, action) => {
        state.proveedores.status = "loading";
        state.proveedores.error = null;
        state.proveedores.params = {
          ...(state.proveedores.params || {}),
          ...(action.meta.arg || {}),
        };
      })
      .addCase(fetchProveedores.fulfilled, (state, action) => {
        state.proveedores.status = "success";
        state.proveedores.items = action.payload.payload.items || [];
        state.proveedores.count = action.payload.payload.count || 0;
        state.proveedores.next = action.payload.payload.next ?? null;
        state.proveedores.previous = action.payload.payload.previous ?? null;
        const key = action.payload.key;
        state.proveedores.cache[key] = {
          ts: Date.now(),
          payload: action.payload.payload,
        };
      })
      .addCase(fetchProveedores.rejected, (state, action) => {
        state.proveedores.status = "error";
        state.proveedores.error = action.payload?.detail || action.error?.message || "Error";
      })

      // createProveedor
      .addCase(createProveedor.pending, (state) => {
        state.createProveedor.status = "loading";
        state.createProveedor.error = null;
      })
      .addCase(createProveedor.fulfilled, (state, action) => {
        state.createProveedor.status = "success";
        state.createProveedor.error = null;
        state.proveedores.cache = {};
        if (action.payload) {
          state.proveedores.items = [action.payload, ...(state.proveedores.items || [])];
          state.proveedores.count = (state.proveedores.count || 0) + 1;
        }
      })
      .addCase(createProveedor.rejected, (state, action) => {
        state.createProveedor.status = "error";
        state.createProveedor.error = action.payload?.detail || action.error?.message || "Error";
      })

      // updateProveedor
      .addCase(updateProveedor.pending, (state) => {
        state.updateProveedor.status = "loading";
        state.updateProveedor.error = null;
      })
      .addCase(updateProveedor.fulfilled, (state, action) => {
        state.updateProveedor.status = "success";
        state.updateProveedor.error = null;
        state.proveedores.cache = {};
        const upd = action.payload;
        if (upd?.id != null) {
          state.proveedores.items = (state.proveedores.items || []).map((p) => (p.id === upd.id ? upd : p));
        }
      })
      .addCase(updateProveedor.rejected, (state, action) => {
        state.updateProveedor.status = "error";
        state.updateProveedor.error = action.payload?.detail || action.error?.message || "Error";
      })

      // deleteProveedor
      .addCase(deleteProveedor.pending, (state) => {
        state.deleteProveedor.status = "loading";
        state.deleteProveedor.error = null;
      })
      .addCase(deleteProveedor.fulfilled, (state, action) => {
        state.deleteProveedor.status = "success";
        state.deleteProveedor.error = null;
        state.proveedores.cache = {};
        const id = action.payload?.id;
        if (id != null) {
          state.proveedores.items = (state.proveedores.items || []).filter((p) => p.id !== id);
          state.proveedores.count = Math.max(0, (state.proveedores.count || 0) - 1);
        }
      })
      .addCase(deleteProveedor.rejected, (state, action) => {
        state.deleteProveedor.status = "error";
        state.deleteProveedor.error = action.payload?.detail || action.error?.message || "Error";
      })

      // fetchAdhesiones
      .addCase(fetchAdhesiones.pending, (state, action) => {
        state.adhesiones.status = "loading";
        state.adhesiones.error = null;
        state.adhesiones.params = {
          ...(state.adhesiones.params || {}),
          ...(action.meta.arg || {}),
        };
      })
      .addCase(fetchAdhesiones.fulfilled, (state, action) => {
        state.adhesiones.status = "success";
        state.adhesiones.items = action.payload.payload.items || [];
        state.adhesiones.count = action.payload.payload.count || 0;
        state.adhesiones.next = action.payload.payload.next ?? null;
        state.adhesiones.previous = action.payload.payload.previous ?? null;
        const key = action.payload.key;
        state.adhesiones.cache[key] = {
          ts: Date.now(),
          payload: action.payload.payload,
        };
      })
      .addCase(fetchAdhesiones.rejected, (state, action) => {
        state.adhesiones.status = "error";
        state.adhesiones.error = action.payload?.detail || action.error?.message || "Error";
      })

      // createAdhesion
      .addCase(createAdhesion.pending, (state) => {
        state.createAdhesion.status = "loading";
        state.createAdhesion.error = null;
      })
      .addCase(createAdhesion.fulfilled, (state) => {
        state.createAdhesion.status = "success";
        state.createAdhesion.error = null;
        state.adhesiones.cache = {};
      })
      .addCase(createAdhesion.rejected, (state, action) => {
        state.createAdhesion.status = "error";
        state.createAdhesion.error = action.payload?.detail || action.error?.message || "Error";
      })

      // fetchSolicitudes
      .addCase(fetchSolicitudes.pending, (state, action) => {
        state.solicitudes.status = "loading";
        state.solicitudes.error = null;
        state.solicitudes.params = {
          ...(state.solicitudes.params || {}),
          ...(action.meta.arg || {}),
        };
      })
      .addCase(fetchSolicitudes.fulfilled, (state, action) => {
        state.solicitudes.status = "success";
        state.solicitudes.items = action.payload.payload.items || [];
        state.solicitudes.count = action.payload.payload.count || 0;
        state.solicitudes.next = action.payload.payload.next ?? null;
        state.solicitudes.previous = action.payload.payload.previous ?? null;
        const key = action.payload.key;
        state.solicitudes.cache[key] = {
          ts: Date.now(),
          payload: action.payload.payload,
        };
      })
      .addCase(fetchSolicitudes.rejected, (state, action) => {
        state.solicitudes.status = "error";
        state.solicitudes.error = action.payload?.detail || action.error?.message || "Error";
      })

      // createSolicitud
      .addCase(createSolicitud.pending, (state) => {
        state.createSolicitud.status = "loading";
        state.createSolicitud.error = null;
      })
      .addCase(createSolicitud.fulfilled, (state, action) => {
        state.createSolicitud.status = "success";
        state.createSolicitud.error = null;
        state.solicitudes.cache = {};
        if (action.payload) {
          state.solicitudes.items = [action.payload, ...(state.solicitudes.items || [])];
          state.solicitudes.count = (state.solicitudes.count || 0) + 1;
        }
      })
      .addCase(createSolicitud.rejected, (state, action) => {
        state.createSolicitud.status = "error";
        state.createSolicitud.error = action.payload?.detail || action.error?.message || "Error";
      })

      // ✅ asignarProveedorSolicitud
      .addCase(asignarProveedorSolicitud.pending, (state) => {
        state.asignarProveedorSolicitud.status = "loading";
        state.asignarProveedorSolicitud.error = null;
      })
      .addCase(asignarProveedorSolicitud.fulfilled, (state, action) => {
        state.asignarProveedorSolicitud.status = "success";
        state.asignarProveedorSolicitud.error = null;

        state.solicitudes.cache = {};
        const upd = action.payload;
        if (upd?.id != null) {
          state.solicitudes.items = (state.solicitudes.items || []).map((x) => (x.id === upd.id ? upd : x));
        }
      })
      .addCase(asignarProveedorSolicitud.rejected, (state, action) => {
        state.asignarProveedorSolicitud.status = "error";
        state.asignarProveedorSolicitud.error = action.payload?.detail || action.error?.message || "Error";
      })

      // updateSolicitud
      .addCase(updateSolicitud.pending, (state) => {
        state.updateSolicitud.status = "loading";
        state.updateSolicitud.error = null;
      })
      .addCase(updateSolicitud.fulfilled, (state, action) => {
        state.updateSolicitud.status = "success";
        state.updateSolicitud.error = null;
        state.solicitudes.cache = {};
        const upd = action.payload;
        if (upd?.id != null) {
          state.solicitudes.items = (state.solicitudes.items || []).map((x) => (x.id === upd.id ? upd : x));
        }
      })
      .addCase(updateSolicitud.rejected, (state, action) => {
        state.updateSolicitud.status = "error";
        state.updateSolicitud.error = action.payload?.detail || action.error?.message || "Error";
      })

      // deleteSolicitud
      .addCase(deleteSolicitud.pending, (state) => {
        state.deleteSolicitud.status = "loading";
        state.deleteSolicitud.error = null;
      })
      .addCase(deleteSolicitud.fulfilled, (state, action) => {
        state.deleteSolicitud.status = "success";
        state.deleteSolicitud.error = null;
        state.solicitudes.cache = {};
        const id = action.payload?.id;
        if (id != null) {
          state.solicitudes.items = (state.solicitudes.items || []).filter((x) => x.id !== id);
          state.solicitudes.count = Math.max(0, (state.solicitudes.count || 0) - 1);
        }
      })
      .addCase(deleteSolicitud.rejected, (state, action) => {
        state.deleteSolicitud.status = "error";
        state.deleteSolicitud.error = action.payload?.detail || action.error?.message || "Error";
      });
  },
});

export const {
  clearPolizasBuscar,
  clearPolizasAdheridasBuscar,
  invalidateAdhesionesCache,
  invalidatePlanesCache,
  invalidateProveedoresCache,
  invalidateSolicitudesCache,
} = gruasSlice.actions;

export default gruasSlice.reducer;

/* =========================
   SELECTORS
========================= */
export const selectPolizasBuscar = (s) => s.gruas?.polizasBuscar?.items || [];
export const selectPolizasBuscarStatus = (s) => s.gruas?.polizasBuscar?.status || "idle";

export const selectPolizasAdheridasBuscar = (s) => s.gruas?.polizasAdheridasBuscar?.items || [];
export const selectPolizasAdheridasBuscarStatus = (s) =>
  s.gruas?.polizasAdheridasBuscar?.status || "idle";

export const selectAdhesiones = (s) => s.gruas?.adhesiones?.items || [];
export const selectAdhesionesStatus = (s) => s.gruas?.adhesiones?.status || "idle";

export const selectPlanes = (s) => s.gruas?.planes?.items || [];
export const selectPlanesStatus = (s) => s.gruas?.planes?.status || "idle";

export const selectProveedores = (s) => s.gruas?.proveedores?.items || [];
export const selectProveedoresStatus = (s) => s.gruas?.proveedores?.status || "idle";

export const selectSolicitudes = (s) => s.gruas?.solicitudes?.items || [];
export const selectSolicitudesStatus = (s) => s.gruas?.solicitudes?.status || "idle";

/* =========================
   COMPAT
========================= */
export const fetchPlanesGrua = fetchPlanes;
export const selectPlanesGrua = selectPlanes;
export const selectPlanesGruaStatus = selectPlanesStatus;
