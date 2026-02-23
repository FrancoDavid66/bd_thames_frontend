// src/store/slices/bajasSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const TTL_LIST_MS = 30 * 1000;
const TTL_OFICINAS_MS = 5 * 60 * 1000;

// Si usás proxy en Vite (/api) dejalo vacío.
// Si lo definís, puede venir como: "http://localhost:8000", "http://localhost:8000/", "http://localhost:8000/api", etc.
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

async function apiGet(path, params) {
  const url = `${API_ROOT}${path}${buildQuery(params)}`;
  const res = await fetch(url, { credentials: "include" });
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

function normalizeOficinasPayload(payload) {
  const raw = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
    ? payload
    : [];

  const out = [];
  for (const x of raw) {
    if (x == null) continue;

    if (typeof x === "string" || typeof x === "number") {
      const s = String(x).trim();
      if (!s) continue;
      out.push({ id: s, nombre: s });
      continue;
    }

    if (typeof x === "object") {
      const id =
        x.id ?? x.value ?? x.pk ?? x.oficina_id ?? x.oficina ?? x.nombre ?? x.label;
      const nombre = x.nombre ?? x.label ?? x.name ?? x.oficina ?? x.value ?? x.id;
      const sid = id == null ? "" : String(id).trim();
      const sn = nombre == null ? sid : String(nombre).trim();
      if (!sid && !sn) continue;
      out.push({ id: sid || sn, nombre: sn || sid });
    }
  }

  const map = new Map();
  for (const o of out) {
    const key = String(o.id).trim() || String(o.nombre).trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, { id: String(o.id), nombre: String(o.nombre) });
  }

  return Array.from(map.values()).sort((a, b) =>
    String(a.nombre).localeCompare(String(b.nombre), "es", { sensitivity: "base" })
  );
}

// ===== Thunks =====

export const fetchBajas = createAsyncThunk(
  "bajas/fetchBajas",
  async ({ params = {}, force = false } = {}) => {
    // Apuntamos al nuevo endpoint de Bajas
    const merged = {
      page: "1",
      page_size: "25",
      ...params,
    };

    const key = stableKey({ ...merged, _list: 1 });
    if (!force) {
      // cache hit (hidrata en pending si hay cache fresco)
    }
    
    // ✅ CAMBIADO: Ahora consume directo del nuevo endpoint del backend
    const data = await apiGet("bajas/", merged); 
    return { key, data };
  }
);

export const fetchBajasOficinas = createAsyncThunk(
  "bajas/fetchBajasOficinas",
  async ({ force = false } = {}) => {
    const key = stableKey({ _oficinas: 1 });
    if (!force) {
      // cache hit (hidrata en pending)
    }
    const data = await apiGet("polizas/oficinas/", { flat: "0" });
    return { key, data };
  }
);

const bajasSlice = createSlice({
  name: "bajas",
  initialState: {
    items: [],
    count: 0,
    next: null,
    previous: null,

    status: "idle",
    error: null,

    oficinas: [],
    oficinasStatus: "idle",
    oficinasError: null,

    cache: {}, // { [key]: { ts, data } }
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

        const params = action?.meta?.arg?.params || {};
        const merged = {
          page: "1",
          page_size: "25",
          ...params,
        };
        const key = stableKey({ ...merged, _list: 1 });
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_LIST_MS)) {
          const data = cache.data;
          const results = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : [];
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

        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        state.items = results;

        state.count = data?.count ?? results.length ?? 0;
        state.next = data?.next ?? null;
        state.previous = data?.previous ?? null;
      })
      .addCase(fetchBajas.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Error al cargar las bajas";
      })

      // ===== OFICINAS =====
      .addCase(fetchBajasOficinas.pending, (state) => {
        state.oficinasStatus = "loading";
        state.oficinasError = null;

        const key = stableKey({ _oficinas: 1 });
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_OFICINAS_MS)) {
          state.oficinas = normalizeOficinasPayload(cache.data);
        }
      })
      .addCase(fetchBajasOficinas.fulfilled, (state, action) => {
        state.oficinasStatus = "succeeded";
        const { key, data } = action.payload || {};
        if (key) state.cache[key] = { ts: Date.now(), data };
        state.oficinas = normalizeOficinasPayload(data);
      })
      .addCase(fetchBajasOficinas.rejected, (state, action) => {
        state.oficinasStatus = "failed";
        state.oficinasError = action.error?.message || "Error al cargar oficinas";
      });
  },
});

export const { invalidateBajasCache } = bajasSlice.actions;
export default bajasSlice.reducer;

// Selectors
export const selectBajas = (s) => s?.bajas?.items || [];
export const selectBajasCount = (s) => Number(s?.bajas?.count) || 0;
export const selectBajasNext = (s) => s?.bajas?.next ?? null;
export const selectBajasPrevious = (s) => s?.bajas?.previous ?? null;

export const selectBajasStatus = (s) => s?.bajas?.status || "idle";
export const selectBajasError = (s) => s?.bajas?.error || null;

export const selectBajasOficinas = (s) => s?.bajas?.oficinas || [];
export const selectBajasOficinasStatus = (s) => s?.bajas?.oficinasStatus || "idle";
export const selectBajasOficinasError = (s) => s?.bajas?.oficinasError || null;