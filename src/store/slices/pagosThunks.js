/* src/store/slices/pagosThunks.js — Motor de peticiones asíncronas para Pagos */
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/* Helper para armar URLs robustas sin dobles barras */
const BASE_URL = import.meta.env.VITE_API_URL || "/api/";
const API = (path) =>
  `${String(BASE_URL).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;

// ✅ Instancia segura para inyectar el Token JWT
const apiSegura = axios.create({
  withCredentials: true,
});

apiSegura.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

/* Normaliza payloads */
const unwrap = (data) =>
  data && typeof data === "object" && "results" in data ? data.results : data;

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== "")
  );

/* ===================== CONSTANTES DE CACHE ===================== */
const POLIZAS_CACHE_TTL_MS = 2 * 60 * 1000;
const BUSCAR_CACHE_TTL_MS = 20 * 1000;
const POLIZA_BY_ID_TTL_MS = 5 * 60 * 1000;
const CLIENTE_DNI_CACHE_TTL_MS = 60 * 1000;
const CUOTAS_POLIZA_CACHE_TTL_MS = 20 * 1000;
const HISTORIAL_CACHE_TTL_MS = 25 * 1000;

/* ===================== HELPERS DE CACHE Y DNI ===================== */
const keyFromQuery = (q) => String(q || "").trim().toLowerCase();
const keyForSearch = (q, withCuotas) => {
  const base = keyFromQuery(q);
  if (!base) return "";
  return withCuotas ? `${base}|cuotas` : `${base}|lite`;
};

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

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function hasRealNameLike(s) {
  const x = safeStr(s).toLowerCase();
  if (!x) return false;
  if (x === "cliente" || x === "asegurado" || x === "client") return false;
  return true;
}

function itemHasClienteName(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : null;
  const cli = pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null;
  if (cli && (hasRealNameLike(cli?.nombre) || hasRealNameLike(cli?.apellido))) return true;
  if (pol) {
    if (hasRealNameLike(pol?.cliente_nombre)) return true;
    if (hasRealNameLike(pol?.cliente_apellido)) return true;
    if (hasRealNameLike(pol?.cliente_nombre_completo)) return true;
    if (hasRealNameLike(pol?.cliente_nombre_apellido)) return true;
    if (hasRealNameLike(pol?.asegurado) || hasRealNameLike(pol?.asegurado_nombre)) return true;
  }
  if (hasRealNameLike(it?.cliente_nombre)) return true;
  if (hasRealNameLike(it?.cliente_apellido)) return true;
  if (hasRealNameLike(it?.cliente_nombre_completo)) return true;
  if (hasRealNameLike(it?.cliente_nombre_apellido)) return true;
  if (hasRealNameLike(it?.asegurado)) return true;
  return false;
}

function extractPolizaId(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza;
  const id1 = pol && typeof pol === "object" ? pol.id ?? pol.pk ?? pol.poliza_id : null;
  const id2 = it?.poliza_id ?? it?.polizaId ?? it?.poliza;
  const id = id1 ?? id2;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildBuscarParams(p) {
  const pp = p && typeof p === "object" ? p : {};
  const query = typeof p === "string" || typeof p === "number" ? String(p) : String(pp?.query ?? pp?.q ?? pp?.search ?? "");
  const q = String(query || "").trim();
  const page = Number(pp?.page ?? 1) || 1;
  const page_size = Math.max(1, Math.min(500, Number(pp?.page_size ?? pp?.limit ?? 250) || 250));
  const oficina = pp?.oficina;
  const ordering = pp?.ordering;
  const includePagadas = Boolean(pp?.include_pagadas);
  const ocultar_pagadas = includePagadas ? 0 : 1;
  const solo_pendientes = pp?.solo_pendientes === undefined ? undefined : Boolean(pp?.solo_pendientes);

  return compact({
    q,
    search: q,
    oficina,
    ordering,
    page,
    page_size,
    limit: pp?.limit,
    ocultar_pagadas: solo_pendientes === undefined ? ocultar_pagadas : solo_pendientes ? 1 : 0,
    solo_pendientes: solo_pendientes ? 1 : solo_pendientes === false ? 0 : undefined,
  });
}

function buildBuscarCacheKey(params) { return stableKey(params); }

function buildHistorialParams(p) {
  const pp = p && typeof p === "object" ? p : {};
  return compact({
    mes: pp?.mes,
    dia: pp?.dia,
    desde: pp?.desde,
    hasta: pp?.hasta,
    oficina: pp?.oficina,
    search: pp?.q ?? pp?.search,
    page: pp?.page ?? 1,
    page_size: pp?.page_size ?? 25,
    ordering: pp?.ordering ?? "-fecha_pago",
  });
}

function buildHistorialCacheKey(params) { return stableKey(params); }

function filenameFromDisposition(disposition) {
  const s = String(disposition || "");
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(s);
  const raw = (m && (m[1] || m[2] || m[3])) || "";
  if (!raw) return "";
  try { return decodeURIComponent(raw.trim()); } catch { return raw.trim(); }
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

const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");
const dniCacheKey = (dni) => `dni:${onlyDigits(dni)}`;
function cuotasPolizaCacheKey({ poliza_id, solo_pendientes = 1, page_size = 200 }) {
  return stableKey({ poliza_id: String(poliza_id || "").trim(), solo_pendientes: solo_pendientes ? 1 : 0, page_size: Number(page_size || 200) });
}

let historialAbort = null;
let polizasAbort = null;
let buscarAbort = null;
let clienteDniAbort = null;
let cuotasPolizaAbort = null;
let cuotasBuscarAbort = null;

async function enrichBuscarItemsWithPolizaCliente(items, { getState, signal }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return list;

  const polizaIds = new Set();
  for (const it of list) {
    if (itemHasClienteName(it)) continue;
    const pid = extractPolizaId(it);
    if (!pid) continue;
    polizaIds.add(pid);
  }
  if (polizaIds.size === 0) return list;

  const st = getState()?.pagos;
  const byIdCache = st?.polizaByIdCache || {};

  const toFetch = [];
  for (const pid of polizaIds) {
    const hit = byIdCache?.[pid];
    if (hit && isFresh(hit.ts, POLIZA_BY_ID_TTL_MS) && hit.poliza) continue;
    toFetch.push(pid);
  }

  const fetchedMap = new Map();
  for (const pid of polizaIds) {
    const hit = byIdCache?.[pid];
    if (hit && hit.poliza && isFresh(hit.ts, POLIZA_BY_ID_TTL_MS)) {
      fetchedMap.set(pid, hit.poliza);
    }
  }

  if (toFetch.length > 0) {
    const CONCURRENCY = 6;
    for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
      const chunk = toFetch.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((id) =>
          apiSegura.get(API(`polizas/${id}/`), { params: compact({ include_cuotas: 0 }), signal }).then((r) => r.data)
        )
      );
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const data = r.value && typeof r.value === "object" ? r.value : null;
        const pol = data && typeof data === "object" && "data" in data ? data.data : data;
        const pid = Number(pol?.id);
        if (Number.isFinite(pid) && pid > 0) fetchedMap.set(pid, pol);
      }
      if (signal?.aborted) break;
    }
  }

  const out = list.map((it) => {
    if (itemHasClienteName(it)) return it;
    const pid = extractPolizaId(it);
    if (!pid) return it;
    const polFetched = fetchedMap.get(pid);
    if (!polFetched || typeof polFetched !== "object") return it;

    const currentPol = it?.poliza && typeof it.poliza === "object" ? it.poliza : { id: pid };

    return {
      ...it,
      poliza: {
        ...polFetched,
        ...currentPol,
        cliente: currentPol?.cliente || polFetched?.cliente,
        cliente_nombre: currentPol?.cliente_nombre || polFetched?.cliente_nombre,
        cliente_apellido: currentPol?.cliente_apellido || polFetched?.cliente_apellido,
        cliente_nombre_completo: currentPol?.cliente_nombre_completo || polFetched?.cliente_nombre_completo,
        cliente_nombre_apellido: currentPol?.cliente_nombre_apellido || polFetched?.cliente_nombre_apellido,
        asegurado_nombre: currentPol?.asegurado_nombre || polFetched?.asegurado_nombre,
        asegurado: currentPol?.asegurado || polFetched?.asegurado,
      },
    };
  });

  return { items: out, polizasById: fetchedMap };
}


/* ===================== THUNKS EXPORTADOS ===================== */

export const fetchTodasLasCuotas = createAsyncThunk("pagos/fetchTodasLasCuotas", async (_, { rejectWithValue }) => {
  try { const { data } = await apiSegura.get(API("cuotas/")); return unwrap(data); } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al obtener cuotas"); }
});

export const marcarCuotaComoPagada = createAsyncThunk("pagos/marcarCuotaComoPagada", async (payload, { rejectWithValue }) => {
  try {
    const cuotaId = payload?.cuotaId ?? payload?.id;
    if (!cuotaId) return rejectWithValue({ detail: "No se pudo pagar: falta el id de la cuota." });

    const body = compact({
      fecha_pago: payload?.fecha_pago,
      forma_pago: payload?.forma_pago,
      metodo: payload?.metodo ?? payload?.medio_pago,
      monto: payload?.monto ?? payload?.monto_pagado,
      observaciones: payload?.observaciones ?? payload?.notas,
      medio_cobro_id: payload?.medio_cobro_id,
      medio_cobro_valor: payload?.medio_cobro_valor ?? payload?.destino_cuenta ?? payload?.referencia,
      destino_cuenta: payload?.destino_cuenta,
      enviado_por: payload?.enviado_por,
      cuit_remitente: payload?.cuit_remitente,
      nro_operacion: payload?.nro_operacion,
      registrar_en_balance: payload?.registrar_en_balance,
    });

    const { data } = await apiSegura.patch(API(`cuotas/${cuotaId}/pagar/`), body);
    return data;
  } catch (error) { return rejectWithValue(error?.response?.data || "Error al marcar como pagada"); }
});

export const enviarAlertas = createAsyncThunk("pagos/enviarAlertas", async (_, { rejectWithValue }) => {
  try { const { data } = await apiSegura.post(API("notificaciones/cuotas/alertas/")); return data; } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al enviar alertas"); }
});

export const enviarRecordatoriosCuotas = createAsyncThunk("pagos/enviarRecordatoriosCuotas", async (payload, { rejectWithValue }) => {
  try {
    const asyncFlag = payload?.async === undefined || payload?.async === null ? false : Boolean(payload?.async);
    const body = compact({ alias: payload?.alias, alias_transferencia: payload?.alias_transferencia, medio_cobro_id: payload?.medio_cobro_id, oficina: payload?.oficina, async: asyncFlag });
    const { data } = await apiSegura.post(API("notificaciones/cuotas/recordatorios/"), body, { timeout: 60000 });
    if (data && typeof data === "object" && data.ok === false) return rejectWithValue(data);
    return data;
  } catch (error) { return rejectWithValue(error?.response?.data || "Error al enviar recordatorios"); }
});

// 🚀 Dispara envío en paralelo a TODAS las oficinas activas.
// El backend lanza un thread por oficina y devuelve 202 inmediato.
// El progreso se consulta después con fetchHistorialRecordatorios.
export const enviarRecordatoriosTodasOficinas = createAsyncThunk(
  "pagos/enviarRecordatoriosTodasOficinas",
  async (payload, { rejectWithValue }) => {
    try {
      const body = compact({
        alias: payload?.alias,
        alias_transferencia: payload?.alias_transferencia,
        medio_cobro_id: payload?.medio_cobro_id,
      });
      // timeout corto: el endpoint devuelve casi inmediato porque trabaja en background
      const { data } = await apiSegura.post(
        API("notificaciones/cuotas/enviar-todas-oficinas/"),
        body,
        { timeout: 15000 }
      );
      if (data && typeof data === "object" && data.ok === false) return rejectWithValue(data);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al iniciar el envío masivo a todas las oficinas");
    }
  }
);

export const enviarTodasOficinas = createAsyncThunk(
  "pagos/enviarTodasOficinas",
  async (payload, { rejectWithValue }) => {
    try {
      const body = {
        alias:                payload?.alias,
        medio_cobro_id:       payload?.medio_cobro_id || undefined,
        pausa_entre_oficinas: payload?.pausa || 300,
      };
      console.log("[enviarTodasOficinas] 🚀 body:", body);
      const res = await apiSegura.post(API("notificaciones/cuotas/enviar-todas-oficinas/"), body);
      console.log("[enviarTodasOficinas] ✅ response:", res.status, res.data);
      return res.data;
    } catch (err) {
      console.error("[enviarTodasOficinas] ❌ error:", err?.response?.status, err?.response?.data);
      return rejectWithValue(err?.response?.data || err?.message);
    }
  }
);

export const fetchHistorialRecordatorios = createAsyncThunk("pagos/fetchHistorialRecordatorios", async (_, { rejectWithValue }) => {
  try { const { data } = await apiSegura.get(API("notificaciones/cuotas/historial/")); return unwrap(data); } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al obtener historial de recordatorios"); }
});

export const fetchHistorialPagos = createAsyncThunk("pagos/fetchHistorialPagos", async (params, { rejectWithValue, getState }) => {
  try {
    const pp = params && typeof params === "object" ? params : {};
    const force = Boolean(pp?.force);
    const built = buildHistorialParams(pp);
    const cacheKey = buildHistorialCacheKey(built);

    if (!force) {
      const st = getState()?.pagos;
      const hit = st?.historialPagosCache?.[cacheKey];
      if (hit && isFresh(hit.ts, HISTORIAL_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) {
        return { items: hit.items, meta: hit.meta, _cacheKey: cacheKey, _fromCache: true, _force: false };
      }
    }

    if (historialAbort) { try { historialAbort.abort(); } catch {} }
    historialAbort = new AbortController();

    const { data } = await apiSegura.get(API("cuotas/pagos/"), { params: built, signal: historialAbort.signal });
    if (data && typeof data === "object" && "results" in data) {
      return { items: Array.isArray(data.results) ? data.results : [], meta: { count: Number(data.count || 0) || 0, next: data.next ?? null, previous: data.previous ?? null }, _cacheKey: cacheKey, _fromCache: false, _force: force };
    }
    const items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
    return { items, meta: { count: items.length, next: null, previous: null }, _cacheKey: cacheKey, _fromCache: false, _force: force };
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
    if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });
    return rejectWithValue(error?.response?.data || "Error al obtener historial de pagos");
  }
});

export const downloadHistorialPagosCSV = createAsyncThunk("pagos/downloadHistorialPagosCSV", async (params, { rejectWithValue }) => {
  try {
    const p = params && typeof params === "object" ? params : {};
    const res = await apiSegura.get(API("cuotas/pagos/"), {
      params: compact({ mes: p?.mes, dia: p?.dia, desde: p?.desde, hasta: p?.hasta, oficina: p?.oficina, search: p?.q ?? p?.search, ordering: p?.ordering ?? "-fecha_pago", export: "csv" }),
      responseType: "blob",
    });
    const disposition = res?.headers?.["content-disposition"];
    const filename = filenameFromDisposition(disposition) || (p?.dia ? `pagos_${p.dia}.csv` : p?.desde || p?.hasta ? `pagos_${p.desde || "inicio"}_a_${p.hasta || "hoy"}.csv` : p?.mes ? `pagos_${p.mes}.csv` : "historial_pagos.csv");
    triggerDownloadBlob(res.data instanceof Blob ? res.data : new Blob([res.data]), filename);
    return { ok: true, filename };
  } catch (error) { return rejectWithValue(error?.response?.data || "Error al descargar CSV"); }
});

export const downloadHistorialPagosPDF = createAsyncThunk("pagos/downloadHistorialPagosPDF", async (params, { rejectWithValue }) => {
  try {
    const p = params && typeof params === "object" ? params : {};
    const res = await apiSegura.get(API("cuotas/pagos/"), {
      params: compact({ mes: p?.mes, dia: p?.dia, desde: p?.desde, hasta: p?.hasta, oficina: p?.oficina, search: p?.q ?? p?.search, ordering: p?.ordering ?? "-fecha_pago", export: "pdf" }),
      responseType: "blob",
    });
    const disposition = res?.headers?.["content-disposition"];
    const filename = filenameFromDisposition(disposition) || (p?.dia ? `pagos_${p.dia}.pdf` : p?.desde || p?.hasta ? `pagos_${p.desde || "inicio"}_a_${p.hasta || "hoy"}.pdf` : p?.mes ? `pagos_${p.mes}.pdf` : "historial_pagos.pdf");
    triggerDownloadBlob(res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/pdf" }), filename);
    return { ok: true, filename };
  } catch (error) { return rejectWithValue(error?.response?.data || "Error al descargar PDF"); }
});

export const fetchPagosBuscar = createAsyncThunk("pagos/fetchPagosBuscar", async (arg, { rejectWithValue, getState }) => {
  try {
    const pp = arg && typeof arg === "object" ? arg : {};
    const force = Boolean(pp?.force);
    const built = buildBuscarParams(arg);
    const cacheKey = buildBuscarCacheKey(built);
    const queryStr = String(built?.q || "").trim();

    if (!queryStr) return { items: [], meta: { count: 0, next: null, previous: null }, originalQuery: "", cacheKey, fromCache: true, _force: false, _polizaByIdToCache: null };
    if (!force) {
      const hit = getState()?.pagos?.buscarCache?.[cacheKey];
      if (hit && isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) return { items: hit.items, meta: hit.meta, originalQuery: hit.originalQuery || queryStr, cacheKey, fromCache: true, _force: false, _polizaByIdToCache: null };
    }

    if (buscarAbort) { try { buscarAbort.abort(); } catch {} }
    buscarAbort = new AbortController();

    const { data } = await apiSegura.get(API("pagos/buscar/"), { params: built, signal: buscarAbort.signal });
    let items = data && typeof data === "object" && "results" in data ? (Array.isArray(data.results) ? data.results : []) : (Array.isArray(unwrap(data)) ? unwrap(data) : []);
    let meta = data && typeof data === "object" && "results" in data ? { count: Number(data.count || 0) || 0, next: data.next ?? null, previous: data.previous ?? null } : { count: items.length, next: null, previous: null };

    const enriched = await enrichBuscarItemsWithPolizaCliente(items, { getState, signal: buscarAbort.signal });
    let polizaByIdToCache = null;
    if (enriched && typeof enriched === "object" && "items" in enriched) {
      items = Array.isArray(enriched.items) ? enriched.items : items;
      polizaByIdToCache = enriched.polizasById || null;
    }

    return { items, meta, originalQuery: queryStr, cacheKey, fromCache: false, _force: force, _polizaByIdToCache: polizaByIdToCache };
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED" || error?.name === "AbortError") return rejectWithValue({ _aborted: true });
    return rejectWithValue(error?.response?.data || "Error al buscar pagos");
  }
});

export const fetchCuotasBuscar = createAsyncThunk("pagos/fetchCuotasBuscar", async (arg, { rejectWithValue, getState }) => {
  try {
    const pp = arg && typeof arg === "object" ? arg : {};
    const force = Boolean(pp?.force);
    const built = buildBuscarParams(pp);
    const cacheKey = buildBuscarCacheKey(built);
    const queryStr = String(built?.q || "").trim();

    if (!queryStr) return { items: [], meta: { count: 0, next: null, previous: null }, originalQuery: "", cacheKey, fromCache: true, _force: false, _polizaByIdToCache: null };
    if (!force) {
      const hit = getState()?.pagos?.buscarCache?.[cacheKey];
      if (hit && isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) return { items: hit.items, meta: hit.meta, originalQuery: hit.originalQuery || queryStr, cacheKey, fromCache: true, _force: false, _polizaByIdToCache: null };
    }

    if (cuotasBuscarAbort) { try { cuotasBuscarAbort.abort(); } catch {} }
    cuotasBuscarAbort = new AbortController();

    const { data } = await apiSegura.get(API("pagos/buscar/"), { params: built, signal: cuotasBuscarAbort.signal });
    let items = data && typeof data === "object" && "results" in data ? (Array.isArray(data.results) ? data.results : []) : (Array.isArray(unwrap(data)) ? unwrap(data) : []);
    let meta = data && typeof data === "object" && "results" in data ? { count: Number(data.count || 0) || 0, next: data.next ?? null, previous: data.previous ?? null } : { count: items.length, next: null, previous: null };

    const enriched = await enrichBuscarItemsWithPolizaCliente(items, { getState, signal: cuotasBuscarAbort.signal });
    let polizaByIdToCache = null;
    if (enriched && typeof enriched === "object" && "items" in enriched) {
      items = Array.isArray(enriched.items) ? enriched.items : items;
      polizaByIdToCache = enriched.polizasById || null;
    }

    return { items, meta, originalQuery: queryStr, cacheKey, fromCache: false, _force: force, _polizaByIdToCache: polizaByIdToCache };
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED" || error?.name === "AbortError") return rejectWithValue({ _aborted: true });
    return rejectWithValue(error?.response?.data || "Error al buscar cuotas");
  }
});

export const fetchBuscarClientePorDni = createAsyncThunk("pagos/fetchBuscarClientePorDni", async ({ dni, force } = {}, { rejectWithValue, getState }) => {
  try {
    const dniDigits = onlyDigits(dni);
    if (!dniDigits) return rejectWithValue("DNI inválido.");
    const ck = dniCacheKey(dniDigits);

    if (!force) {
      const hit = getState()?.pagos?.buscarClienteCache?.[ck];
      if (hit && isFresh(hit.ts, CLIENTE_DNI_CACHE_TTL_MS) && hit.data) return { ...hit.data, _cacheKey: ck, _fromCache: true };
    }

    if (clienteDniAbort) { try { clienteDniAbort.abort(); } catch {} }
    clienteDniAbort = new AbortController();

    const resp = await apiSegura.get(API("pagos/buscar-cliente/"), { params: { dni: dniDigits }, signal: clienteDniAbort.signal, timeout: 30000 });
    const data = resp?.data || {};
    return { cliente: data?.cliente || null, polizas: Array.isArray(data?.polizas) ? data.polizas : [], _cacheKey: ck, _fromCache: false };
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED" || error?.name === "AbortError") return rejectWithValue({ _aborted: true });
    if (error?.response?.status === 404) return rejectWithValue("No se encontró cliente con ese DNI.");
    return rejectWithValue("Ocurrió un error buscando por DNI.");
  }
});

export const fetchCuotasPorPoliza = createAsyncThunk("pagos/fetchCuotasPorPoliza", async ({ poliza_id, solo_pendientes = 1, page_size = 200, force, dni } = {}, { rejectWithValue, getState }) => {
  try {
    const pid = String(poliza_id || "").trim();
    if (!pid) return rejectWithValue("Falta poliza_id.");
    const builtKey = cuotasPolizaCacheKey({ poliza_id: pid, solo_pendientes, page_size });

    if (!force) {
      const hit = getState()?.pagos?.cuotasPolizaCache?.[builtKey];
      if (hit && isFresh(hit.ts, CUOTAS_POLIZA_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) {
        return { items: hit.items, meta: hit.meta, _cacheKey: builtKey, _fromCache: true, _dni: dni || "" };
      }
    }

    if (cuotasPolizaAbort) { try { cuotasPolizaAbort.abort(); } catch {} }
    cuotasPolizaAbort = new AbortController();

    const resp = await apiSegura.get(API("pagos/buscar/"), { params: compact({ poliza_id: pid, solo_pendientes: solo_pendientes ? 1 : 0, page_size: Math.max(1, Math.min(500, Number(page_size || 200))) }), signal: cuotasPolizaAbort.signal, timeout: 30000 });
    const data = resp?.data || {};
    const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    const meta = { count: typeof data?.count === "number" ? data.count : items.length, next: data?.next ?? null, previous: data?.previous ?? null };

    return { items, meta, _cacheKey: builtKey, _fromCache: false, _dni: dni || "" };
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED" || error?.name === "AbortError") return rejectWithValue({ _aborted: true });
    return rejectWithValue("Ocurrió un error trayendo cuotas.");
  }
});

export const fetchPolizas = createAsyncThunk("pagos/fetchPolizas", async (arg, { rejectWithValue, getState }) => {
  try {
    const query = typeof arg === "string" || typeof arg === "number" ? String(arg) : String(arg?.query || "");
    const withCuotas = Boolean(typeof arg === "object" && arg ? arg.withCuotas : false);
    const limit = Math.max(1, Math.min(100, Number(typeof arg === "object" && arg ? arg.limit : 25) || 25));
    const q = String(query || "").trim();
    const cacheKey = keyForSearch(q, withCuotas);

    if (!cacheKey) return { polizas: [], originalQuery: q, cacheKey, fromCache: true, withCuotas };

    const hit = getState()?.pagos?.polizasCache?.[cacheKey];
    if (hit && typeof hit.ts === "number" && Date.now() - hit.ts < POLIZAS_CACHE_TTL_MS && Array.isArray(hit.polizas)) {
      return { polizas: hit.polizas, originalQuery: hit.originalQuery || q, cacheKey, fromCache: true, withCuotas };
    }

    if (polizasAbort) { try { polizasAbort.abort(); } catch {} }
    polizasAbort = new AbortController();

    const { data } = await apiSegura.get(API("polizas/"), { params: compact({ search: q, page_size: limit, include_cuotas: withCuotas ? 1 : undefined }), signal: polizasAbort.signal });
    const polizasList = Array.isArray(unwrap(data)) ? unwrap(data) : [];

    if (withCuotas) {
      const needsHydrate = polizasList.some((p) => !Array.isArray(p?.cuotas));
      if (!needsHydrate) return { polizas: polizasList, originalQuery: q, cacheKey, fromCache: false, withCuotas };

      const ids = polizasList.map((p) => p?.id).filter((id) => id !== undefined && id !== null);
      const idsToFetch = ids.slice(0, limit);
      const detailed = [];
      for (let i = 0; i < idsToFetch.length; i += 6) {
        const chunk = idsToFetch.slice(i, i + 6);
        const results = await Promise.allSettled(chunk.map((id) => apiSegura.get(API(`polizas/${id}/`), { params: compact({ include_cuotas: 1 }), signal: polizasAbort?.signal }).then((r) => r.data)));
        for (const r of results) { if (r.status === "fulfilled") detailed.push(r.value); }
        if (polizasAbort?.signal?.aborted) break;
      }
      return { polizas: detailed.map((x) => (x && typeof x === "object" && "data" in x ? x.data : x)), originalQuery: q, cacheKey, fromCache: false, withCuotas };
    }
    return { polizas: polizasList, originalQuery: q, cacheKey, fromCache: false, withCuotas };
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED" || error?.name === "AbortError") return rejectWithValue({ _aborted: true });
    return rejectWithValue(error?.response?.data || "Error al buscar pólizas");
  }
});

export const registrarIngreso = createAsyncThunk("pagos/registrarIngreso", async (payload, { rejectWithValue }) => {
  try { const { data } = await apiSegura.post(API("ingresos/"), payload); return data; } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al registrar ingreso"); }
});

export const fetchCuotasAVencer = createAsyncThunk("pagos/fetchCuotasAVencer", async (params, { rejectWithValue }) => {
  try {
    const p = params && typeof params === "object" ? params : {};
    const built = compact({ oficina: p?.oficina, search: p?.search ?? p?.q, desde: p?.desde, hasta: p?.hasta, modo: p?.modo });
    const { data } = await apiSegura.get(API("cuotas/a-vencer/"), { params: built });
    return unwrap(data);
  } catch (error) { return rejectWithValue(error?.response?.data || "Error al obtener cuotas a vencer"); }
});

export const fetchMediosCobro = createAsyncThunk("pagos/fetchMediosCobro", async (params, { rejectWithValue }) => {
  try { const { data } = await apiSegura.get(API("medios-cobro/"), { params: compact(params || {}) }); return unwrap(data); } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al obtener medios de cobro"); }
});

export const crearMedioCobro = createAsyncThunk("pagos/crearMedioCobro", async (payload, { rejectWithValue }) => {
  try { const { data } = await apiSegura.post(API("medios-cobro/"), payload); return data; } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al crear medio de cobro"); }
});

export const actualizarMedioCobro = createAsyncThunk("pagos/actualizarMedioCobro", async ({ id, ...payload }, { rejectWithValue }) => {
  try { const { data } = await apiSegura.patch(API(`medios-cobro/${id}/`), payload); return data; } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al actualizar medio de cobro"); }
});

export const eliminarMedioCobro = createAsyncThunk("pagos/eliminarMedioCobro", async (id, { rejectWithValue }) => {
  try { await apiSegura.delete(API(`medios-cobro/${id}/`)); return id; } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al eliminar medio de cobro"); }
});

export const fetchReporteEfectividad = createAsyncThunk("pagos/fetchReporteEfectividad", async (_, { rejectWithValue }) => {
  try { const { data } = await apiSegura.get(API("pagos/reporte-efectividad/")); return data; } 
  catch (error) { return rejectWithValue(error?.response?.data || "Error al obtener el reporte de efectividad"); }
});