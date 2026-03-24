// src/store/slices/vencimientosSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const TTL_LIST_MS = 30 * 1000;
const TTL_RESUMEN_MS = 30 * 1000;
const TTL_OFICINAS_MS = 5 * 60 * 1000;

// Si usás proxy en Vite, normalmente el backend está en "/api".
// Si lo definís, puede venir como: "http://localhost:8000", "http://localhost:8000/", "http://localhost:8000/api", etc.
const RAW_BASE = (import.meta.env.VITE_API_URL || "").toString().trim();

const DEFAULT_RESUMEN = {
  vencidas_3: 0,
  vencidas_7: 0,
  vencidas_14: 0,
  vencidas_30: 0,
  vence_hoy: 0,
  por_vencer_3: 0,
};

function normalizeApiRoot(rawBase) {
  // ✅ Si no hay base (proxy / same-origin), usamos "/api" por defecto.
  // Esto evita que los fetch terminen pegando a "/polizas/..." sin el prefijo "/api".
  if (!rawBase) return "/api";

  let base = rawBase;
  if (!/^https?:\/\//i.test(base) && !base.startsWith("/")) {
    // por si alguien pasa "localhost:8000"
    base = `http://${base}`;
  }

  // Asegurar slash final
  base = base.endsWith("/") ? base : `${base}/`;

  // Si ya termina en /api/ => lo dejamos como /api
  if (/\/api\/$/i.test(base)) return base.replace(/\/api\/$/i, "/api");

  // Si termina en /api => ok
  if (/\/api$/i.test(base)) return base.replace(/\/api$/i, "/api");

  // Si no, le agregamos /api
  return `${base.replace(/\/$/, "")}/api`;
}

const API_ROOT = normalizeApiRoot(RAW_BASE);

// --- Query helpers ---
function buildQuery(params = {}) {
  const sp = new URLSearchParams();

  // orden estable para cache-key más predecible
  Object.keys(params)
    .sort()
    .forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      sp.append(k, String(v));
    });

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function joinUrl(root, path) {
  // root: "/api" | "http://x/api"
  // path: "/polizas/vencimientos/" o "/api/polizas/..."
  const r = (root || "").toString().trim();
  const p = (path || "").toString().trim();

  // Si no hay root (no debería pasar ahora), usar path tal cual.
  if (!r) return p;

  // Evitar doble /api si path ya empieza con /api
  if (p.startsWith("/api/")) {
    return `${r}${p.replace(/^\/api/, "")}`;
  }

  // Si viene "/polizas/..." => append a /api
  if (p.startsWith("/")) return `${r}${p}`;

  // fallback
  return `${r}/${p}`;
}

async function apiGet(path, params = {}) {
  const url = `${joinUrl(API_ROOT, path)}${buildQuery(params)}`;
  
  // 🚀 OBTENEMOS EL TOKEN Y ARMAMOS LOS HEADERS
  const token = localStorage.getItem("access_token");
  const headers = { 
    "Content-Type": "application/json" 
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers: headers, // 🚀 INYECTAMOS LOS HEADERS ACÁ
    credentials: "include",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET ${url} failed (${res.status}): ${txt}`);
  }

  return res.json();
}

function stableKey(obj = {}) {
  // key estable: ordena claves
  const out = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => (out[k] = obj[k]));
  return JSON.stringify(out);
}

function isFresh(entry, ttlMs) {
  return !!(entry && entry.ts && entry.data !== undefined && Date.now() - entry.ts < ttlMs);
}

// ✅ Normalizar oficinas robusto: [{id,nombre}] | ["1","2"] | ["Oficina A"] | {results:...}
function normalizeOficinasPayload(data) {
  const arr = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];

  const out = [];
  for (const x of arr) {
    if (!x && x !== 0) continue;

    if (typeof x === "string" || typeof x === "number") {
      const s = String(x).trim();
      if (!s) continue;
      out.push({ id: s, nombre: s });
      continue;
    }

    if (typeof x === "object") {
      const id = x?.id ?? x?.value ?? x?.pk ?? "";
      const nombre = x?.nombre ?? x?.name ?? x?.label ?? x?.toString?.() ?? "";
      const idStr = String(id ?? "").trim();
      const nomStr = String(nombre ?? "").trim();

      if (idStr || nomStr) {
        out.push({ id: idStr || nomStr, nombre: nomStr || idStr });
      }
    }
  }

  // dedup + sort
  const map = new Map();
  for (const o of out) {
    const key = String(o.id ?? o.nombre ?? "").trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, o);
  }

  return Array.from(map.values()).sort((a, b) =>
    String(a.nombre || a.id).localeCompare(String(b.nombre || b.id), "es", {
      sensitivity: "base",
    })
  );
}

// --- Thunks ---
export const fetchVencimientos = createAsyncThunk(
  "vencimientos/fetchVencimientos",
  async ({ params = {}, force = false } = {}, { getState }) => {
    // params ya incluye include_finalizadas si el front lo manda (y entra en la cache key)
    const key = stableKey(params);
    const cache = getState().vencimientos?.cache?.[key];

    if (!force && isFresh(cache, TTL_LIST_MS)) {
      return { key, data: cache.data, cached: true };
    }

    const data = await apiGet("/polizas/vencimientos/", params);
    return { key, data, cached: false };
  }
);

export const fetchVencimientosResumen = createAsyncThunk(
  "vencimientos/fetchVencimientosResumen",
  async ({ params = {}, force = false } = {}, { getState }) => {
    const key = stableKey({ ...params, _resumen: 1 });
    const cache = getState().vencimientos?.cache?.[key];

    if (!force && isFresh(cache, TTL_RESUMEN_MS)) {
      return { key, data: cache.data, cached: true };
    }

    const data = await apiGet("/polizas/vencimientos/resumen/", params);
    return { key, data, cached: false };
  }
);

// ✅ Oficinas para el select
export const fetchVencimientosOficinas = createAsyncThunk(
  "vencimientos/fetchVencimientosOficinas",
  async ({ force = false } = {}, { getState }) => {
    const key = stableKey({ _oficinas: 1 });
    const cache = getState().vencimientos?.cache?.[key];

    if (!force && isFresh(cache, TTL_OFICINAS_MS)) {
      return { key, data: cache.data, cached: true };
    }

    const data = await apiGet("/polizas/oficinas/", {}); // sin flat para traer {id,nombre}
    return { key, data, cached: false };
  }
);

const vencimientosSlice = createSlice({
  name: "vencimientos",
  initialState: {
    items: [],
    count: 0,
    next: null,
    previous: null,

    resumen: { ...DEFAULT_RESUMEN },

    // ✅ oficinas para select
    oficinas: [],
    oficinasStatus: "idle",
    oficinasError: null,

    status: "idle",
    resumenStatus: "idle",

    error: null,
    resumenError: null,

    cache: {},
  },
  reducers: {
    invalidateVencimientosCache(state) {
      state.cache = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== LISTADO =====
      .addCase(fetchVencimientos.pending, (state, action) => {
        state.status = "loading";
        state.error = null;

        // ✅ UX: si hay cache fresco, hidratar mientras “carga”
        const params = action?.meta?.arg?.params || {};
        const key = stableKey(params);
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_LIST_MS)) {
          const data = cache.data || {};
          const results = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : [];
          state.items = results;
          state.count = data?.count ?? (Array.isArray(results) ? results.length : 0);
          state.next = data?.next ?? null;
          state.previous = data?.previous ?? null;
        }
      })
      .addCase(fetchVencimientos.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { key, data } = action.payload || {};
        if (key) state.cache[key] = { ts: Date.now(), data };

        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        state.items = results;

        state.count = data?.count ?? (Array.isArray(results) ? results.length : 0);
        state.next = data?.next ?? null;
        state.previous = data?.previous ?? null;
      })
      .addCase(fetchVencimientos.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Error";
      })

      // ===== RESUMEN =====
      .addCase(fetchVencimientosResumen.pending, (state, action) => {
        state.resumenStatus = "loading";
        state.resumenError = null;

        // ✅ UX: hidratar resumen desde cache fresco
        const params = action?.meta?.arg?.params || {};
        const key = stableKey({ ...params, _resumen: 1 });
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_RESUMEN_MS)) {
          state.resumen = { ...DEFAULT_RESUMEN, ...(cache.data || {}) };
        }
      })
      .addCase(fetchVencimientosResumen.fulfilled, (state, action) => {
        state.resumenStatus = "succeeded";
        const { key, data } = action.payload || {};
        if (key) state.cache[key] = { ts: Date.now(), data };
        state.resumen = { ...DEFAULT_RESUMEN, ...(data || {}) };
      })
      .addCase(fetchVencimientosResumen.rejected, (state, action) => {
        state.resumenStatus = "failed";
        state.resumenError = action.error?.message || "Error";
      })

      // ===== OFICINAS =====
      .addCase(fetchVencimientosOficinas.pending, (state) => {
        state.oficinasStatus = "loading";
        state.oficinasError = null;

        // ✅ UX: hidratar desde cache si hay
        const key = stableKey({ _oficinas: 1 });
        const cache = state.cache?.[key];
        if (isFresh(cache, TTL_OFICINAS_MS)) {
          state.oficinas = normalizeOficinasPayload(cache.data);
        }
      })
      .addCase(fetchVencimientosOficinas.fulfilled, (state, action) => {
        state.oficinasStatus = "succeeded";
        const { key, data } = action.payload || {};
        if (key) state.cache[key] = { ts: Date.now(), data };
        state.oficinas = normalizeOficinasPayload(data);
      })
      .addCase(fetchVencimientosOficinas.rejected, (state, action) => {
        state.oficinasStatus = "failed";
        state.oficinasError = action.error?.message || "Error";
      });
  },
});

export const { invalidateVencimientosCache } = vencimientosSlice.actions;
export default vencimientosSlice.reducer;

// ✅ Selectors seguros
export const selectVencimientos = (s) => s?.vencimientos?.items || [];
export const selectVencimientosResumen = (s) =>
  s?.vencimientos?.resumen || { ...DEFAULT_RESUMEN };
export const selectVencimientosStatus = (s) => s?.vencimientos?.status || "idle";
export const selectVencimientosResumenStatus = (s) =>
  s?.vencimientos?.resumenStatus || "idle";
export const selectVencimientosError = (s) => s?.vencimientos?.error || null;
export const selectVencimientosResumenError = (s) =>
  s?.vencimientos?.resumenError || null;

// ✅ oficinas selectors
export const selectVencimientosOficinas = (s) => s?.vencimientos?.oficinas || [];
export const selectVencimientosOficinasStatus = (s) =>
  s?.vencimientos?.oficinasStatus || "idle";
export const selectVencimientosOficinasError = (s) =>
  s?.vencimientos?.oficinasError || null;