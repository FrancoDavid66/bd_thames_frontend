// src/store/slices/bajasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const TTL_LIST_MS = 30 * 1000;
const TTL_OFICINAS_MS = 5 * 60 * 1000;

const RAW_BASE = (import.meta.env.VITE_API_URL || "").toString().trim();

function normalizeApiRoot(rawBase) {
  if (!rawBase) return "/api/";
  let base = rawBase;
  if (!/^https?:\/\//i.test(base) && !base.startsWith("/")) base = `http://${base}`;
  base = base.endsWith("/") ? base : `${base}/`;
  if (/\/api\/?$/i.test(base)) return base.replace(/\/api\/?$/i, "/api/");
  return `${base}api/`;
}

const API_ROOT = normalizeApiRoot(RAW_BASE);

function stableKey(obj) {
  try {
    const keys = Object.keys(obj || {}).sort();
    const out = {};
    for (const k of keys) out[k] = obj[k];
    return JSON.stringify(out);
  } catch {
    return String(Date.now());
  }
}

function isFresh(cacheEntry, ttlMs) {
  if (!cacheEntry) return false;
  const ts = Number(cacheEntry.ts) || 0;
  return Date.now() - ts <= ttlMs;
}

function buildQuery(params) {
  const sp = new URLSearchParams();
  const keys = Object.keys(params || {}).sort();
  for (const k of keys) {
    const v = params[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// 🚀 FUNCIÓN DE SEGURIDAD: Atrapa el token desde donde esté guardado
function getAuthHeaders() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
  if (token && token !== "undefined" && token !== "null") {
    return { "Authorization": `Bearer ${token.trim()}` };
  }
  return {};
}

// ✅ Exportada para uso directo en componentes
export async function apiGet(path, params) {
  const url = `${API_ROOT}${path}${buildQuery(params)}`;
  
  const res = await fetch(url, { 
    headers: {
      "Accept": "application/json",
      ...getAuthHeaders()
    },
    credentials: "omit" 
  });
  
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail || j?.error || "";
    } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ✅ Exportada para uso directo en componentes
export async function apiAction(path, method, body) {
  const url = `${API_ROOT}${path}`;
  
  const res = await fetch(url, {
    method,
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...getAuthHeaders()
    },
    body: body ? JSON.stringify(body) : null,
    credentials: "omit", 
  });
  
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail || j?.error || "";
    } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return method === "DELETE" ? null : await res.json();
}

function normalizeOficinasPayload(payload) {
  const raw = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
  const out = [];
  for (const x of raw) {
    if (x == null) continue;
    if (typeof x === "string" || typeof x === "number") {
      const s = String(x).trim();
      if (s) out.push({ id: s, nombre: s });
      continue;
    }
    if (typeof x === "object") {
      const id = x.id ?? x.value ?? x.pk ?? x.oficina_id ?? x.oficina ?? x.nombre ?? x.label;
      const nombre = x.nombre ?? x.label ?? x.name ?? x.oficina ?? x.value ?? x.id;
      const sid = id == null ? "" : String(id).trim();
      const sn = nombre == null ? sid : String(nombre).trim();
      if (sid || sn) out.push({ id: sid || sn, nombre: sn || sid });
    }
  }
  const map = new Map();
  for (const o of out) {
    const key = String(o.id).trim() || String(o.nombre).trim();
    if (key && !map.has(key)) map.set(key, { id: String(o.id), nombre: String(o.nombre) });
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre), "es", { sensitivity: "base" })
  );
}

// ===== Thunks =====

export const fetchBajas = createAsyncThunk(
  "bajas/fetchBajas",
  async ({ params = {}, force = false } = {}, thunkAPI) => {
    const merged = { page: "1", page_size: "25", ...params };
    const key = stableKey({ ...merged, _list: 1 });

    const state = thunkAPI.getState?.();
    const cacheEntry = state?.bajas?.cache?.[key];
    if (!force && isFresh(cacheEntry, TTL_LIST_MS)) {
      return { key, data: cacheEntry.data, fromCache: true };
    }

    const data = await apiGet("bajas/operativo/", merged);
    return { key, data, fromCache: false };
  }
);

// ✅ Contadores de la sucursal o filtro activo
export const fetchBajasCounters = createAsyncThunk(
  "bajas/fetchBajasCounters",
  async (params = {}) => {
    return await apiGet("bajas/operativo/counters/", params);
  }
);

// 🚀 NUEVO: Contadores globales para el Admin (Toda la empresa)
export const fetchBajasGlobalCounters = createAsyncThunk(
  "bajas/fetchBajasGlobalCounters",
  async (params = {}) => {
    return await apiGet("bajas/operativo/counters/", params);
  }
);

export const fetchBajasOficinas = createAsyncThunk(
  "bajas/fetchBajasOficinas",
  async ({ force = false } = {}, thunkAPI) => {
    const key = stableKey({ _oficinas: 1 });

    const state = thunkAPI.getState?.();
    const cacheEntry = state?.bajas?.cache?.[key];
    if (!force && isFresh(cacheEntry, TTL_OFICINAS_MS)) {
      return { key, data: cacheEntry.data, fromCache: true };
    }

    const data = await apiGet("polizas/oficinas/", { flat: "0" });
    return { key, data, fromCache: false };
  }
);

// --- Correos Dinámicos ---
export const fetchBajasCorreos = createAsyncThunk("bajas/fetchBajasCorreos", async () => {
  return await apiGet("bajas/correos/");
});

export const createBajaCorreo = createAsyncThunk("bajas/createBajaCorreo", async (data) => {
  return await apiAction("bajas/correos/", "POST", data);
});

export const deleteBajaCorreo = createAsyncThunk("bajas/deleteBajaCorreo", async (id) => {
  await apiAction(`bajas/correos/${id}/`, "DELETE");
  return id;
});

const bajasSlice = createSlice({
  name: "bajas",
  initialState: {
    items: [],
    count: 0,
    next: null,
    previous: null,
    status: "idle",
    error: null,

    counters: { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 },
    countersStatus: "idle",

    globalCounters: { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 },
    globalCountersStatus: "idle",

    oficinas: [],
    oficinasStatus: "idle",
    oficinasError: null,

    correos: [],
    correosStatus: "idle",

    cache: {},
  },
  reducers: {
    invalidateBajasCache(state) {
      state.cache = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== LIST =====
      .addCase(fetchBajas.pending, (state, action) => {
        state.status = "loading";
        state.error = null;

        const force = !!action?.meta?.arg?.force;
        if (force) return;

        const params = action?.meta?.arg?.params || {};
        const merged = { page: "1", page_size: "25", ...params };
        const key = stableKey({ ...merged, _list: 1 });
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_LIST_MS)) {
          const data = cache.data;
          const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          state.items = results;
          state.count = data?.count ?? results.length ?? 0;
          state.next = data?.next ?? null;
          state.previous = data?.previous ?? null;
        }
      })
      .addCase(fetchBajas.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { key, data } = action.payload || {};
        if (key) state.cache[key] = { ts: Date.now(), data };
        const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        state.items = results;
        state.count = data?.count ?? results.length ?? 0;
        state.next = data?.next ?? null;
        state.previous = data?.previous ?? null;
      })
      .addCase(fetchBajas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Error al cargar las bajas";
      })

      // ===== COUNTERS =====
      .addCase(fetchBajasCounters.pending, (state) => {
        state.countersStatus = "loading";
      })
      .addCase(fetchBajasCounters.fulfilled, (state, action) => {
        state.countersStatus = "succeeded";
        state.counters = action.payload || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };
      })

      // ===== GLOBAL COUNTERS =====
      .addCase(fetchBajasGlobalCounters.pending, (state) => {
        state.globalCountersStatus = "loading";
      })
      .addCase(fetchBajasGlobalCounters.fulfilled, (state, action) => {
        state.globalCountersStatus = "succeeded";
        state.globalCounters = action.payload || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };
      })

      // ===== OFICINAS =====
      .addCase(fetchBajasOficinas.pending, (state, action) => {
        state.oficinasStatus = "loading";
        const force = !!action?.meta?.arg?.force;
        if (force) return;

        const key = stableKey({ _oficinas: 1 });
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_OFICINAS_MS)) state.oficinas = normalizeOficinasPayload(cache.data);
      })
      .addCase(fetchBajasOficinas.fulfilled, (state, action) => {
        state.oficinasStatus = "succeeded";
        const { key, data } = action.payload || {};
        if (key) state.cache[key] = { ts: Date.now(), data };
        state.oficinas = normalizeOficinasPayload(data);
      })

      // ===== CORREOS =====
      .addCase(fetchBajasCorreos.fulfilled, (state, action) => {
        state.correosStatus = "succeeded";
        state.correos = action.payload || [];
      })
      .addCase(createBajaCorreo.fulfilled, (state, action) => {
        state.correos.push(action.payload);
      })
      .addCase(deleteBajaCorreo.fulfilled, (state, action) => {
        state.correos = state.correos.filter((c) => c.id !== action.payload);
      });
  },
});

export const { invalidateBajasCache } = bajasSlice.actions;
export default bajasSlice.reducer;

// Selectors
export const selectBajas = (s) => s?.bajas?.items || [];
export const selectBajasCount = (s) => Number(s?.bajas?.count) || 0;
export const selectBajasStatus = (s) => s?.bajas?.status || "idle";
export const selectBajasError = (s) => s?.bajas?.error || null;

export const selectBajasCounters = (s) => s?.bajas?.counters || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };
export const selectBajasCountersStatus = (s) => s?.bajas?.countersStatus;

export const selectBajasGlobalCounters = (s) => s?.bajas?.globalCounters || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };

export const selectBajasOficinas = (s) => s?.bajas?.oficinas || [];
export const selectBajasOficinasStatus = (s) => s?.bajas?.oficinasStatus || "idle";

export const selectBajasCorreos = (s) => s?.bajas?.correos || [];
export const selectBajasCorreosStatus = (s) => s?.bajas?.correosStatus || "idle";