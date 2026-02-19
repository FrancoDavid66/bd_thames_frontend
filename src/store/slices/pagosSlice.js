/* src/store/slices/pagosSlice.js — Optimizado: cache historial pagos + búsqueda + cancelación + force real
   + DNI-first: buscar-cliente + cuotas por póliza (Redux)
   + ✅ Patente/texto: cuotas directo por /api/pagos/buscar/?q=... (nuevo thunk fetchCuotasBuscar)
*/
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

/* ===================== CACHE DE BÚSQUEDA PRO (CUOTAS APLANADAS) ===================== */
const BUSCAR_CACHE_TTL_MS = 20 * 1000; // 15–30s recomendado
const BUSCAR_CACHE_MAX = 30;

/* ===================== CACHE POR ID DE PÓLIZA (ENRIQUECIMIENTO CLIENTE) ===================== */
const POLIZA_BY_ID_TTL_MS = 5 * 60 * 1000; // 5 min
const POLIZA_BY_ID_MAX = 250;

/* ===================== DNI-FIRST: CACHE CLIENTE+PÓLIZAS ===================== */
const CLIENTE_DNI_CACHE_TTL_MS = 60 * 1000; // 1 min
const CLIENTE_DNI_CACHE_MAX = 40;

/* ===================== DNI-FIRST: CACHE CUOTAS POR PÓLIZA ===================== */
const CUOTAS_POLIZA_CACHE_TTL_MS = 20 * 1000;
const CUOTAS_POLIZA_CACHE_MAX = 60;

/* ===================== RECIENTES (DNI) ===================== */
const RECIENTES_DNI_MAX = 10;

/* stable stringify (ordenado) para key de params */
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

/* Helpers de strings */
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

/* Detecta si un item ya trae nombre/cliente */
function itemHasClienteName(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : null;

  // 1) poliza.cliente objeto
  const cli = pol?.cliente && typeof pol.cliente === "object" ? pol.cliente : null;
  if (cli && (hasRealNameLike(cli?.nombre) || hasRealNameLike(cli?.apellido))) return true;

  // 2) campos flat en poliza
  if (pol) {
    if (hasRealNameLike(pol?.cliente_nombre)) return true;
    if (hasRealNameLike(pol?.cliente_apellido)) return true;
    if (hasRealNameLike(pol?.cliente_nombre_completo)) return true;
    if (hasRealNameLike(pol?.cliente_nombre_apellido)) return true;
    if (hasRealNameLike(pol?.asegurado) || hasRealNameLike(pol?.asegurado_nombre)) return true;
  }

  // 3) campos flat en cuota
  if (hasRealNameLike(it?.cliente_nombre)) return true;
  if (hasRealNameLike(it?.cliente_apellido)) return true;
  if (hasRealNameLike(it?.cliente_nombre_completo)) return true;
  if (hasRealNameLike(it?.cliente_nombre_apellido)) return true;
  if (hasRealNameLike(it?.asegurado)) return true;

  return false;
}

/* Extrae poliza_id robusto */
function extractPolizaId(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza;

  const id1 =
    pol && typeof pol === "object" ? pol.id ?? pol.pk ?? pol.poliza_id : null;
  const id2 = it?.poliza_id ?? it?.polizaId ?? it?.poliza;

  const id = id1 ?? id2;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ✅ Params para /pagos/buscar/ (backend PRO) */
function buildBuscarParams(p) {
  const pp = p && typeof p === "object" ? p : {};

  const query =
    typeof p === "string" || typeof p === "number"
      ? String(p)
      : String(pp?.query ?? pp?.q ?? pp?.search ?? "");

  const q = String(query || "").trim();

  const page = Number(pp?.page ?? 1) || 1;
  const page_size = Math.max(
    1,
    Math.min(500, Number(pp?.page_size ?? pp?.limit ?? 250) || 250)
  );

  const oficina = pp?.oficina;
  const ordering = pp?.ordering;

  const includePagadas = Boolean(pp?.include_pagadas);
  const ocultar_pagadas = includePagadas ? 0 : 1;

  // ✅ compat: si te pasan solo_pendientes, lo traducimos a ocultar_pagadas
  const solo_pendientes =
    pp?.solo_pendientes === undefined ? undefined : Boolean(pp?.solo_pendientes);

  return compact({
    q,
    search: q, // compat
    oficina,
    ordering,
    page,
    page_size,
    limit: pp?.limit, // compat
    ocultar_pagadas:
      solo_pendientes === undefined ? ocultar_pagadas : solo_pendientes ? 1 : 0,
    solo_pendientes: solo_pendientes ? 1 : solo_pendientes === false ? 0 : undefined, // por si backend lo usa
  });
}

function buildBuscarCacheKey(params) {
  return stableKey(params);
}

/* ===================== CACHE HISTORIAL PAGOS ===================== */
const HISTORIAL_CACHE_TTL_MS = 25 * 1000;
const HISTORIAL_CACHE_MAX = 40;

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

function buildHistorialCacheKey(params) {
  return stableKey(params);
}

/* ===================== HELPERS DESCARGA ===================== */

function filenameFromDisposition(disposition) {
  const s = String(disposition || "");
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(s);
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

/* ===================== CANCELACIÓN GLOBAL (EVITA RESPUESTAS VIEJAS) ===================== */
let historialAbort = null;
let polizasAbort = null;
let buscarAbort = null;
let clienteDniAbort = null;
let cuotasPolizaAbort = null;
// ✅ nuevo: para búsqueda por patente/texto (cuotas directo)
let cuotasBuscarAbort = null;

/* ===================== ENRIQUECIMIENTO CLIENTE EN BUSCAR ===================== */
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
          axios
            .get(API(`polizas/${id}/`), {
              params: compact({ include_cuotas: 0 }),
              signal,
            })
            .then((r) => r.data)
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

    const currentPol =
      it?.poliza && typeof it.poliza === "object" ? it.poliza : { id: pid };

    return {
      ...it,
      poliza: {
        ...polFetched,
        ...currentPol,
        cliente: currentPol?.cliente || polFetched?.cliente,
        cliente_nombre: currentPol?.cliente_nombre || polFetched?.cliente_nombre,
        cliente_apellido: currentPol?.cliente_apellido || polFetched?.cliente_apellido,
        cliente_nombre_completo:
          currentPol?.cliente_nombre_completo || polFetched?.cliente_nombre_completo,
        cliente_nombre_apellido:
          currentPol?.cliente_nombre_apellido || polFetched?.cliente_nombre_apellido,
        asegurado_nombre: currentPol?.asegurado_nombre || polFetched?.asegurado_nombre,
        asegurado: currentPol?.asegurado || polFetched?.asegurado,
      },
    };
  });

  return { items: out, polizasById: fetchedMap };
}

/* ===================== DNI-FIRST HELPERS ===================== */
const onlyDigits = (s) => String(s || "").replace(/\D+/g, "");
const dniCacheKey = (dni) => `dni:${onlyDigits(dni)}`;
function cuotasPolizaCacheKey({ poliza_id, solo_pendientes = 1, page_size = 200 }) {
  return stableKey({
    poliza_id: String(poliza_id || "").trim(),
    solo_pendientes: solo_pendientes ? 1 : 0,
    page_size: Number(page_size || 200),
  });
}

/* ============== THUNKS ============== */

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
        metodo: payload?.metodo ?? payload?.medio_pago,
        monto: payload?.monto ?? payload?.monto_pagado,
        observaciones: payload?.observaciones ?? payload?.notas,

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
      return rejectWithValue(error?.response?.data || "Error al marcar como pagada");
    }
  }
);

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

export const enviarRecordatoriosCuotas = createAsyncThunk(
  "pagos/enviarRecordatoriosCuotas",
  async (payload, { rejectWithValue }) => {
    try {
      // ✅ IMPORTANTE: async:false por defecto para recibir contadores reales
      const asyncFlag =
        payload?.async === undefined || payload?.async === null
          ? false
          : Boolean(payload?.async);

      const body = compact({
        alias: payload?.alias,
        alias_transferencia: payload?.alias_transferencia,
        medio_cobro_id: payload?.medio_cobro_id,
        oficina: payload?.oficina,

        // ✅ nuevo
        async: asyncFlag,
      });

      const { data } = await axios.post(
        API("notificaciones/cuotas/recordatorios/"),
        body,
        { timeout: 60000 }
      );
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al enviar recordatorios");
    }
  }
);

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

export const fetchHistorialPagos = createAsyncThunk(
  "pagos/fetchHistorialPagos",
  async (params, { rejectWithValue, getState }) => {
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

      if (historialAbort) {
        try { historialAbort.abort(); } catch {}
      }
      historialAbort = new AbortController();

      const { data } = await axios.get(API("cuotas/pagos/"), {
        params: built,
        signal: historialAbort.signal,
      });

      if (data && typeof data === "object" && "results" in data) {
        return {
          items: Array.isArray(data.results) ? data.results : [],
          meta: { count: Number(data.count || 0) || 0, next: data.next ?? null, previous: data.previous ?? null },
          _cacheKey: cacheKey,
          _fromCache: false,
          _force: force,
        };
      }

      const items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
      return { items, meta: { count: items.length, next: null, previous: null }, _cacheKey: cacheKey, _fromCache: false, _force: force };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
      if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });
      return rejectWithValue(error?.response?.data || "Error al obtener historial de pagos");
    }
  }
);

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

/** ✅ Búsqueda PRO (rápida): GET /pagos/buscar/ => devuelve CUOTAS APLANADAS (flat)
 *  ✅ enriquece con cliente desde /polizas/{id}/ si falta nombre
 */
export const fetchPagosBuscar = createAsyncThunk(
  "pagos/fetchPagosBuscar",
  async (arg, { rejectWithValue, getState }) => {
    try {
      const pp = arg && typeof arg === "object" ? arg : {};
      const force = Boolean(pp?.force);

      const built = buildBuscarParams(arg);
      const cacheKey = buildBuscarCacheKey(built);

      const queryStr = String(built?.q || "").trim();
      if (!queryStr) {
        return {
          items: [],
          meta: { count: 0, next: null, previous: null },
          originalQuery: "",
          cacheKey,
          fromCache: true,
          _force: false,
          _polizaByIdToCache: null,
        };
      }

      if (!force) {
        const st = getState()?.pagos;
        const hit = st?.buscarCache?.[cacheKey];
        if (hit && isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) {
          return {
            items: hit.items,
            meta: hit.meta,
            originalQuery: hit.originalQuery || queryStr,
            cacheKey,
            fromCache: true,
            _force: false,
            _polizaByIdToCache: null,
          };
        }
      }

      if (buscarAbort) {
        try { buscarAbort.abort(); } catch {}
      }
      buscarAbort = new AbortController();

      const { data } = await axios.get(API("pagos/buscar/"), {
        params: built,
        signal: buscarAbort.signal,
      });

      let items = [];
      let meta = { count: 0, next: null, previous: null };

      if (data && typeof data === "object" && "results" in data) {
        items = Array.isArray(data.results) ? data.results : [];
        meta = { count: Number(data.count || 0) || 0, next: data.next ?? null, previous: data.previous ?? null };
      } else {
        items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
        meta = { count: items.length, next: null, previous: null };
      }

      let polizaByIdToCache = null;
      const enriched = await enrichBuscarItemsWithPolizaCliente(items, {
        getState,
        signal: buscarAbort.signal,
      });

      if (enriched && typeof enriched === "object" && "items" in enriched) {
        items = Array.isArray(enriched.items) ? enriched.items : items;
        polizaByIdToCache = enriched.polizasById || null;
      }

      return {
        items,
        meta,
        originalQuery: queryStr,
        cacheKey,
        fromCache: false,
        _force: force,
        _polizaByIdToCache: polizaByIdToCache,
      };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
      if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });
      return rejectWithValue(error?.response?.data || "Error al buscar pagos");
    }
  }
);

/* ✅ NUEVO: cuotas directo por PATENTE (o texto) -> /pagos/buscar/?q=...&solo_pendientes=1
   (no pisa buscarItems/buscarStatus, solo expone cuotasBuscarStatus/error para el botón)
*/
export const fetchCuotasBuscar = createAsyncThunk(
  "pagos/fetchCuotasBuscar",
  async (arg, { rejectWithValue, getState }) => {
    try {
      const pp = arg && typeof arg === "object" ? arg : {};
      const force = Boolean(pp?.force);

      const built = buildBuscarParams(pp);
      const cacheKey = buildBuscarCacheKey(built);

      const queryStr = String(built?.q || "").trim();
      if (!queryStr) {
        return {
          items: [],
          meta: { count: 0, next: null, previous: null },
          originalQuery: "",
          cacheKey,
          fromCache: true,
          _force: false,
          _polizaByIdToCache: null,
        };
      }

      if (!force) {
        const st = getState()?.pagos;
        const hit = st?.buscarCache?.[cacheKey];
        if (hit && isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) {
          return {
            items: hit.items,
            meta: hit.meta,
            originalQuery: hit.originalQuery || queryStr,
            cacheKey,
            fromCache: true,
            _force: false,
            _polizaByIdToCache: null,
          };
        }
      }

      if (cuotasBuscarAbort) {
        try { cuotasBuscarAbort.abort(); } catch {}
      }
      cuotasBuscarAbort = new AbortController();

      const { data } = await axios.get(API("pagos/buscar/"), {
        params: built,
        signal: cuotasBuscarAbort.signal,
      });

      let items = [];
      let meta = { count: 0, next: null, previous: null };

      if (data && typeof data === "object" && "results" in data) {
        items = Array.isArray(data.results) ? data.results : [];
        meta = { count: Number(data.count || 0) || 0, next: data.next ?? null, previous: data.previous ?? null };
      } else {
        items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
        meta = { count: items.length, next: null, previous: null };
      }

      // opcional: mismo enriquecimiento (queda prolijo en UI)
      let polizaByIdToCache = null;
      const enriched = await enrichBuscarItemsWithPolizaCliente(items, {
        getState,
        signal: cuotasBuscarAbort.signal,
      });

      if (enriched && typeof enriched === "object" && "items" in enriched) {
        items = Array.isArray(enriched.items) ? enriched.items : items;
        polizaByIdToCache = enriched.polizasById || null;
      }

      return {
        items,
        meta,
        originalQuery: queryStr,
        cacheKey,
        fromCache: false,
        _force: force,
        _polizaByIdToCache: polizaByIdToCache,
      };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
      if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });
      return rejectWithValue(error?.response?.data || "Error al buscar cuotas");
    }
  }
);

/* ✅ DNI-FIRST: trae cliente + pólizas */
export const fetchBuscarClientePorDni = createAsyncThunk(
  "pagos/fetchBuscarClientePorDni",
  async ({ dni, force } = {}, { rejectWithValue, getState }) => {
    try {
      const dniDigits = onlyDigits(dni);
      if (!dniDigits) {
        return rejectWithValue("DNI inválido.");
      }

      const ck = dniCacheKey(dniDigits);

      if (!force) {
        const st = getState()?.pagos;
        const hit = st?.buscarClienteCache?.[ck];
        if (hit && isFresh(hit.ts, CLIENTE_DNI_CACHE_TTL_MS) && hit.data) {
          return { ...hit.data, _cacheKey: ck, _fromCache: true };
        }
      }

      if (clienteDniAbort) {
        try { clienteDniAbort.abort(); } catch {}
      }
      clienteDniAbort = new AbortController();

      const resp = await axios.get(API("pagos/buscar-cliente/"), {
        params: { dni: dniDigits },
        signal: clienteDniAbort.signal,
        timeout: 30000,
      });

      const data = resp?.data || {};
      const cliente = data?.cliente || null;
      const polizas = Array.isArray(data?.polizas) ? data.polizas : [];

      return { cliente, polizas, _cacheKey: ck, _fromCache: false };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
      if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });

      if (error?.response?.status === 404) {
        return rejectWithValue("No se encontró cliente con ese DNI.");
      }
      return rejectWithValue("Ocurrió un error buscando por DNI.");
    }
  }
);

/* ✅ DNI-FIRST: trae cuotas pendientes de una póliza */
export const fetchCuotasPorPoliza = createAsyncThunk(
  "pagos/fetchCuotasPorPoliza",
  async ({ poliza_id, solo_pendientes = 1, page_size = 200, force, dni } = {}, { rejectWithValue, getState }) => {
    try {
      const pid = String(poliza_id || "").trim();
      if (!pid) return rejectWithValue("Falta poliza_id.");

      const builtKey = cuotasPolizaCacheKey({ poliza_id: pid, solo_pendientes, page_size });

      if (!force) {
        const st = getState()?.pagos;
        const hit = st?.cuotasPolizaCache?.[builtKey];
        if (hit && isFresh(hit.ts, CUOTAS_POLIZA_CACHE_TTL_MS) && Array.isArray(hit.items) && hit.meta) {
          return { items: hit.items, meta: hit.meta, _cacheKey: builtKey, _fromCache: true, _dni: dni || "" };
        }
      }

      if (cuotasPolizaAbort) {
        try { cuotasPolizaAbort.abort(); } catch {}
      }
      cuotasPolizaAbort = new AbortController();

      const resp = await axios.get(API("pagos/buscar/"), {
        params: compact({
          poliza_id: pid,
          solo_pendientes: solo_pendientes ? 1 : 0,
          page_size: Math.max(1, Math.min(500, Number(page_size || 200))),
        }),
        signal: cuotasPolizaAbort.signal,
        timeout: 30000,
      });

      const data = resp?.data || {};
      const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      const meta = {
        count: typeof data?.count === "number" ? data.count : items.length,
        next: data?.next ?? null,
        previous: data?.previous ?? null,
      };

      return { items, meta, _cacheKey: builtKey, _fromCache: false, _dni: dni || "" };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
      if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });
      return rejectWithValue("Ocurrió un error trayendo cuotas.");
    }
  }
);

export const fetchPolizas = createAsyncThunk(
  "pagos/fetchPolizas",
  async (arg, { rejectWithValue, getState }) => {
    try {
      const query =
        typeof arg === "string" || typeof arg === "number"
          ? String(arg)
          : String(arg?.query || "");

      const withCuotas = Boolean(typeof arg === "object" && arg ? arg.withCuotas : false);

      const limit = Math.max(1, Math.min(100, Number(typeof arg === "object" && arg ? arg.limit : 25) || 25));

      const q = String(query || "").trim();
      const cacheKey = keyForSearch(q, withCuotas);

      if (!cacheKey) {
        return { polizas: [], originalQuery: q, cacheKey, fromCache: true, withCuotas };
      }

      const st = getState()?.pagos;
      const cache = st?.polizasCache || {};
      const hit = cache?.[cacheKey];
      const now = Date.now();

      if (hit && typeof hit.ts === "number" && now - hit.ts < POLIZAS_CACHE_TTL_MS && Array.isArray(hit.polizas)) {
        return { polizas: hit.polizas, originalQuery: hit.originalQuery || q, cacheKey, fromCache: true, withCuotas };
      }

      if (polizasAbort) {
        try { polizasAbort.abort(); } catch {}
      }
      polizasAbort = new AbortController();

      const { data } = await axios.get(API("polizas/"), {
        params: compact({
          search: q,
          page_size: limit,
          include_cuotas: withCuotas ? 1 : undefined,
        }),
        signal: polizasAbort.signal,
      });

      const polizasList = Array.isArray(unwrap(data)) ? unwrap(data) : [];

      if (withCuotas) {
        const needsHydrate = polizasList.some((p) => !Array.isArray(p?.cuotas));
        if (!needsHydrate) {
          return { polizas: polizasList, originalQuery: q, cacheKey, fromCache: false, withCuotas };
        }

        const ids = polizasList.map((p) => p?.id).filter((id) => id !== undefined && id !== null);
        const idsToFetch = ids.slice(0, limit);
        const CONCURRENCY = 6;

        const detailed = [];
        for (let i = 0; i < idsToFetch.length; i += CONCURRENCY) {
          const chunk = idsToFetch.slice(i, i + CONCURRENCY);

          const results = await Promise.allSettled(
            chunk.map((id) =>
              axios
                .get(API(`polizas/${id}/`), {
                  params: compact({ include_cuotas: 1 }),
                  signal: polizasAbort?.signal,
                })
                .then((r) => r.data)
            )
          );

          for (const r of results) {
            if (r.status === "fulfilled") detailed.push(r.value);
          }

          if (polizasAbort?.signal?.aborted) break;
        }

        const detailedPolizas = detailed.map((x) => (x && typeof x === "object" && "data" in x ? x.data : x));

        return { polizas: detailedPolizas, originalQuery: q, cacheKey, fromCache: false, withCuotas };
      }

      return { polizas: polizasList, originalQuery: q, cacheKey, fromCache: false, withCuotas };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return rejectWithValue({ _aborted: true });
      if (error?.name === "AbortError") return rejectWithValue({ _aborted: true });
      return rejectWithValue(error?.response?.data || "Error al buscar pólizas");
    }
  }
);

export const registrarIngreso = createAsyncThunk(
  "pagos/registrarIngreso",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(API("ingresos/"), payload);
      return data;
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al registrar ingreso");
    }
  }
);

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
        modo: p?.modo,
      });

      const { data } = await axios.get(API("cuotas/a-vencer/"), { params: built });
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al obtener cuotas a vencer");
    }
  }
);

export const fetchMediosCobro = createAsyncThunk(
  "pagos/fetchMediosCobro",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(API("medios-cobro/"));
      return unwrap(data);
    } catch (error) {
      return rejectWithValue(error?.response?.data || "Error al obtener medios de cobro");
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
      return rejectWithValue(error?.response?.data || "Error al crear medio de cobro");
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
      return rejectWithValue(error?.response?.data || "Error al actualizar medio de cobro");
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
      return rejectWithValue(error?.response?.data || "Error al eliminar medio de cobro");
    }
  }
);

/* ===================== SLICE ===================== */

const initialState = {
  status: "idle",
  error: null,

  cuotas: [],
  cuotasAVencer: [],

  // búsqueda (legacy de polizas)
  searchStatus: "idle",
  searchError: null,
  polizas: [],

  // cache búsqueda legacy
  polizasCache: {},
  polizasCacheOrder: [],

  // ✅ búsqueda PRO (cuotas aplanadas)
  buscarItems: [],
  buscarMeta: { count: 0, next: null, previous: null },
  buscarStatus: "idle",
  buscarError: null,
  buscarCache: {},
  buscarCacheOrder: [],

  // ✅ NUEVO: status/error para cuotas directo (patente/texto)
  cuotasBuscarStatus: "idle",
  cuotasBuscarError: null,

  // ✅ cache por ID de póliza para enriquecer cliente (rápido)
  polizaByIdCache: {}, // { [id]: { ts, poliza } }
  polizaByIdOrder: [],

  // ✅ DNI-first: cliente + pólizas
  buscarClienteData: null, // { cliente, polizas }
  buscarClienteStatus: "idle",
  buscarClienteError: null,
  buscarClienteCache: {},
  buscarClienteCacheOrder: [],

  // ✅ DNI-first: cuotas por póliza
  cuotasPolizaItems: [],
  cuotasPolizaMeta: { count: 0, next: null, previous: null },
  cuotasPolizaStatus: "idle",
  cuotasPolizaError: null,
  cuotasPolizaCache: {},
  cuotasPolizaCacheOrder: [],

  // ✅ recientes DNI
  recientesDni: [],

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

  // ✅ NUEVO: último resultado del envío (para mostrar contadores en UI)
  recordatoriosLast: null,

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

function savePolizasCache(state, cacheKey, originalQuery, polizas) {
  const ck = String(cacheKey || "").trim().toLowerCase();
  if (!ck) return;

  state.polizasCache[ck] = {
    ts: Date.now(),
    polizas: Array.isArray(polizas) ? polizas : [],
    originalQuery: String(originalQuery || "").trim(),
  };

  const prev = Array.isArray(state.polizasCacheOrder) ? state.polizasCacheOrder : [];
  const next = [ck, ...prev.filter((x) => x !== ck)].slice(0, POLIZAS_CACHE_MAX);
  state.polizasCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.polizasCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.polizasCache[key];
  });
}

function saveBuscarCache(state, cacheKey, originalQuery, items, meta) {
  const ck = String(cacheKey || "").trim().toLowerCase();
  if (!ck) return;

  state.buscarCache[ck] = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
    meta:
      meta && typeof meta === "object"
        ? { count: Number(meta.count || 0) || 0, next: meta.next ?? null, previous: meta.previous ?? null }
        : { count: Array.isArray(items) ? items.length : 0, next: null, previous: null },
    originalQuery: String(originalQuery || "").trim(),
  };

  const prev = Array.isArray(state.buscarCacheOrder) ? state.buscarCacheOrder : [];
  const next = [ck, ...prev.filter((x) => x !== ck)].slice(0, BUSCAR_CACHE_MAX);
  state.buscarCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.buscarCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.buscarCache[key];
  });
}

function saveHistorialCache(state, cacheKey, items, meta) {
  if (!cacheKey) return;

  state.historialPagosCache[cacheKey] = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
    meta:
      meta && typeof meta === "object"
        ? { count: Number(meta.count || 0) || 0, next: meta.next ?? null, previous: meta.previous ?? null }
        : { count: Array.isArray(items) ? items.length : 0, next: null, previous: null },
  };

  const prev = Array.isArray(state.historialPagosCacheOrder) ? state.historialPagosCacheOrder : [];
  const next = [cacheKey, ...prev.filter((x) => x !== cacheKey)].slice(0, HISTORIAL_CACHE_MAX);
  state.historialPagosCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.historialPagosCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.historialPagosCache[key];
  });
}

/* ✅ cache por ID: guardamos pólizas detalle para reusar en búsquedas */
function savePolizaByIdCache(state, polizasByIdMap) {
  if (!polizasByIdMap || typeof polizasByIdMap.forEach !== "function") return;

  const now = Date.now();

  polizasByIdMap.forEach((pol, id) => {
    const pid = Number(id);
    if (!Number.isFinite(pid) || pid <= 0) return;
    if (!pol || typeof pol !== "object") return;

    state.polizaByIdCache[pid] = { ts: now, poliza: pol };

    const prev = Array.isArray(state.polizaByIdOrder) ? state.polizaByIdOrder : [];
    state.polizaByIdOrder = [pid, ...prev.filter((x) => x !== pid)].slice(0, POLIZA_BY_ID_MAX);
  });

  const keep = new Set(state.polizaByIdOrder || []);
  Object.keys(state.polizaByIdCache || {}).forEach((k) => {
    const id = Number(k);
    if (!keep.has(id)) delete state.polizaByIdCache[k];
  });
}

/* ✅ DNI cache */
function saveClienteDniCache(state, cacheKey, data) {
  const ck = String(cacheKey || "").trim();
  if (!ck) return;

  state.buscarClienteCache[ck] = { ts: Date.now(), data: data || null };

  const prev = Array.isArray(state.buscarClienteCacheOrder) ? state.buscarClienteCacheOrder : [];
  const next = [ck, ...prev.filter((x) => x !== ck)].slice(0, CLIENTE_DNI_CACHE_MAX);
  state.buscarClienteCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.buscarClienteCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.buscarClienteCache[key];
  });
}

/* ✅ Cuotas por póliza cache */
function saveCuotasPolizaCache(state, cacheKey, items, meta) {
  const ck = String(cacheKey || "").trim();
  if (!ck) return;

  state.cuotasPolizaCache[ck] = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
    meta: meta && typeof meta === "object"
      ? { count: Number(meta.count || 0) || 0, next: meta.next ?? null, previous: meta.previous ?? null }
      : { count: Array.isArray(items) ? items.length : 0, next: null, previous: null },
  };

  const prev = Array.isArray(state.cuotasPolizaCacheOrder) ? state.cuotasPolizaCacheOrder : [];
  const next = [ck, ...prev.filter((x) => x !== ck)].slice(0, CUOTAS_POLIZA_CACHE_MAX);
  state.cuotasPolizaCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.cuotasPolizaCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.cuotasPolizaCache[key];
  });
}

const pagosSlice = createSlice({
  name: "pagos",
  initialState,
  reducers: {
    setCuotas(state, action) {
      state.cuotas = Array.isArray(action.payload) ? action.payload : [];
    },

    // ✅ para PagosSearch
    clearBuscarCliente(state) {
      state.buscarClienteData = null;
      state.buscarClienteStatus = "idle";
      state.buscarClienteError = null;

      state.cuotasPolizaItems = [];
      state.cuotasPolizaMeta = { count: 0, next: null, previous: null };
      state.cuotasPolizaStatus = "idle";
      state.cuotasPolizaError = null;

      state.cuotasBuscarStatus = "idle";
      state.cuotasBuscarError = null;
    },

    pushRecienteDni(state, action) {
      const dni = String(action.payload || "").trim();
      if (!dni) return;
      const norm = dni.toLowerCase();

      const prev = Array.isArray(state.recientesDni) ? state.recientesDni : [];
      const next = [dni, ...prev.filter((x) => String(x).toLowerCase() !== norm)].slice(0, RECIENTES_DNI_MAX);
      state.recientesDni = next;
    },

    clearSearch(state) {
      state.polizas = [];
      state.searchStatus = "idle";
      state.searchError = null;

      state.buscarItems = [];
      state.buscarMeta = { count: 0, next: null, previous: null };
      state.buscarStatus = "idle";
      state.buscarError = null;

      state.cuotasBuscarStatus = "idle";
      state.cuotasBuscarError = null;

      // DNI-first también se limpia cuando “clearSearch”
      state.buscarClienteData = null;
      state.buscarClienteStatus = "idle";
      state.buscarClienteError = null;

      state.cuotasPolizaItems = [];
      state.cuotasPolizaMeta = { count: 0, next: null, previous: null };
      state.cuotasPolizaStatus = "idle";
      state.cuotasPolizaError = null;
    },

    invalidateHistorialPagosCache(state) {
      state.historialPagosCache = {};
      state.historialPagosCacheOrder = [];
    },
    invalidateBuscarCache(state) {
      state.buscarCache = {};
      state.buscarCacheOrder = [];
    },
  },

  extraReducers: (builder) => {
    builder

      // --- ✅ CUOTAS DIRECTO (patente/texto) ---
      .addCase(fetchCuotasBuscar.pending, (state) => {
        state.cuotasBuscarStatus = "loading";
        state.cuotasBuscarError = null;
      })
      .addCase(fetchCuotasBuscar.fulfilled, (state, action) => {
        state.cuotasBuscarStatus = "succeeded";
        state.cuotasBuscarError = null;

        // reutilizamos cache global de buscar (misma key)
        const p = action.payload || {};
        if (p.cacheKey) {
          saveBuscarCache(state, p.cacheKey, p.originalQuery, p.items || [], p.meta);
        }
        if (p._polizaByIdToCache) {
          savePolizaByIdCache(state, p._polizaByIdToCache);
        }
      })
      .addCase(fetchCuotasBuscar.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) {
          state.cuotasBuscarStatus = "idle";
          state.cuotasBuscarError = null;
          return;
        }
        state.cuotasBuscarStatus = "failed";
        state.cuotasBuscarError = action.payload || "Error buscando cuotas";
      })

      // --- DNI-FIRST: buscar cliente + pólizas ---
      .addCase(fetchBuscarClientePorDni.pending, (state, action) => {
        state.buscarClienteStatus = "loading";
        state.buscarClienteError = null;
        state.buscarClienteData = null;

        const arg = action?.meta?.arg || {};
        const force = Boolean(arg?.force);
        const ck = dniCacheKey(arg?.dni);

        if (!force && ck) {
          const hit = state.buscarClienteCache?.[ck];
          if (hit && isFresh(hit.ts, CLIENTE_DNI_CACHE_TTL_MS) && hit.data) {
            state.buscarClienteData = hit.data;
          }
        }
      })
      .addCase(fetchBuscarClientePorDni.fulfilled, (state, action) => {
        state.buscarClienteStatus = "succeeded";
        const p = action.payload || {};
        state.buscarClienteData = { cliente: p.cliente || null, polizas: Array.isArray(p.polizas) ? p.polizas : [] };

        if (p._cacheKey) {
          saveClienteDniCache(state, p._cacheKey, state.buscarClienteData);
        }
      })
      .addCase(fetchBuscarClientePorDni.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) {
          state.buscarClienteStatus = "idle";
          state.buscarClienteError = null;
          return;
        }
        state.buscarClienteStatus = "failed";
        state.buscarClienteError = action.payload || "Error buscando por DNI";
        state.buscarClienteData = null;
      })

      // --- DNI-FIRST: cuotas por póliza ---
      .addCase(fetchCuotasPorPoliza.pending, (state, action) => {
        state.cuotasPolizaStatus = "loading";
        state.cuotasPolizaError = null;

        const arg = action?.meta?.arg || {};
        const force = Boolean(arg?.force);
        const ck = cuotasPolizaCacheKey(arg);

        if (!force && ck) {
          const hit = state.cuotasPolizaCache?.[ck];
          if (hit && isFresh(hit.ts, CUOTAS_POLIZA_CACHE_TTL_MS) && Array.isArray(hit.items)) {
            state.cuotasPolizaItems = hit.items;
            state.cuotasPolizaMeta = hit.meta || { count: hit.items.length, next: null, previous: null };
          }
        }
      })
      .addCase(fetchCuotasPorPoliza.fulfilled, (state, action) => {
        state.cuotasPolizaStatus = "succeeded";
        const p = action.payload || {};
        state.cuotasPolizaItems = Array.isArray(p.items) ? p.items : [];
        state.cuotasPolizaMeta = p.meta || { count: state.cuotasPolizaItems.length, next: null, previous: null };

        if (p._cacheKey) {
          saveCuotasPolizaCache(state, p._cacheKey, state.cuotasPolizaItems, state.cuotasPolizaMeta);
        }
      })
      .addCase(fetchCuotasPorPoliza.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) {
          state.cuotasPolizaStatus = "idle";
          state.cuotasPolizaError = null;
          return;
        }
        state.cuotasPolizaStatus = "failed";
        state.cuotasPolizaError = action.payload || "Error trayendo cuotas";
        state.cuotasPolizaItems = [];
        state.cuotasPolizaMeta = { count: 0, next: null, previous: null };
      })

      // --- Buscar PRO (cuotas aplanadas) ---
      .addCase(fetchPagosBuscar.pending, (state, action) => {
        state.buscarStatus = "loading";
        state.buscarError = null;

        state.searchStatus = "loading";
        state.searchError = null;

        const arg = action?.meta?.arg;
        const force = Boolean(arg && typeof arg === "object" && arg.force);

        const built = buildBuscarParams(arg);
        const ck = buildBuscarCacheKey(built);

        if (!force && ck) {
          const hit = state.buscarCache?.[ck];
          if (hit && isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) && Array.isArray(hit.items)) {
            state.buscarItems = hit.items;
            state.buscarMeta = hit.meta || { count: hit.items.length, next: null, previous: null };
          }
        }
      })
      .addCase(fetchPagosBuscar.fulfilled, (state, action) => {
        state.buscarStatus = "succeeded";
        state.searchStatus = "succeeded";

        const payload = action.payload || {};
        const items = payload.items ?? payload ?? [];
        state.buscarItems = Array.isArray(items) ? items : [];
        state.buscarMeta = payload.meta || { count: state.buscarItems.length, next: null, previous: null };

        saveBuscarCache(state, payload.cacheKey, payload.originalQuery, state.buscarItems, state.buscarMeta);

        if (payload._polizaByIdToCache) {
          savePolizaByIdCache(state, payload._polizaByIdToCache);
        }
      })
      .addCase(fetchPagosBuscar.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) {
          state.buscarStatus = "idle";
          state.buscarError = null;
          state.searchStatus = "idle";
          state.searchError = null;
          return;
        }
        state.buscarStatus = "failed";
        state.buscarError = action.payload;

        state.searchStatus = "failed";
        state.searchError = action.payload;
      })

      // --- Buscar pólizas (legacy) ---
      .addCase(fetchPolizas.pending, (state) => {
        state.searchStatus = "loading";
        state.searchError = null;
      })
      .addCase(fetchPolizas.fulfilled, (state, action) => {
        state.searchStatus = "succeeded";
        const payload = action.payload || {};
        const polizas = payload.polizas ?? payload ?? [];
        state.polizas = Array.isArray(polizas) ? polizas : [];
        savePolizasCache(state, payload.cacheKey, payload.originalQuery, state.polizas);
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) {
          state.searchStatus = "idle";
          state.searchError = null;
          return;
        }
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
      .addCase(crearMedioCobro.fulfilled, (state, action) => {
        state.mediosCobro = [action.payload, ...(state.mediosCobro || [])];
        recomputeMedioNombres(state);
      })
      .addCase(actualizarMedioCobro.fulfilled, (state, action) => {
        const updated = action.payload;
        state.mediosCobro = (state.mediosCobro || []).map((m) => (m.id === updated?.id ? updated : m));
        recomputeMedioNombres(state);
      })
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
        state.recordatoriosLast = null; // ✅ limpiar
      })
      .addCase(enviarRecordatoriosCuotas.fulfilled, (state, action) => {
        state.recordatoriosStatus = "succeeded";
        state.recordatoriosLast = action.payload || null; // ✅ guardar contadores
      })
      .addCase(enviarRecordatoriosCuotas.rejected, (state, action) => {
        state.recordatoriosStatus = "failed";
        state.recordatoriosError = action.payload;
        state.recordatoriosLast = null;
      })

      // --- Historial recordatorios ---
      .addCase(fetchHistorialRecordatorios.pending, (state) => {
        state.historialRecordatoriosStatus = "loading";
        state.historialRecordatoriosError = null;
      })
      .addCase(fetchHistorialRecordatorios.fulfilled, (state, action) => {
        state.historialRecordatoriosStatus = "succeeded";
        state.historialRecordatorios = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchHistorialRecordatorios.rejected, (state, action) => {
        state.historialRecordatoriosStatus = "failed";
        state.historialRecordatoriosError = action.payload;
      })

      // --- Historial pagos (con hidratación desde cache en pending) ---
      .addCase(fetchHistorialPagos.pending, (state, action) => {
        state.historialPagosStatus = "loading";
        state.historialPagosError = null;

        const arg = action?.meta?.arg;
        const force = Boolean(arg && typeof arg === "object" && arg.force);

        if (!force) {
          const built = buildHistorialParams(arg);
          const cacheKey = buildHistorialCacheKey(built);
          const hit = state.historialPagosCache?.[cacheKey];
          if (hit && isFresh(hit.ts, HISTORIAL_CACHE_TTL_MS) && Array.isArray(hit.items)) {
            state.historialPagosItems = hit.items;
            state.historialPagosMeta = hit.meta || { count: hit.items.length, next: null, previous: null };
          }
        }
      })
      .addCase(fetchHistorialPagos.fulfilled, (state, action) => {
        state.historialPagosStatus = "succeeded";
        state.historialPagosItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.historialPagosMeta = action.payload?.meta || { count: state.historialPagosItems.length, next: null, previous: null };

        const cacheKey = action.payload?._cacheKey;
        if (cacheKey) saveHistorialCache(state, cacheKey, state.historialPagosItems, state.historialPagosMeta);
      })
      .addCase(fetchHistorialPagos.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) {
          state.historialPagosStatus = "idle";
          state.historialPagosError = null;
          return;
        }
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

export const {
  setCuotas,
  clearSearch,
  invalidateHistorialPagosCache,
  invalidateBuscarCache,
  pushRecienteDni,
  clearBuscarCliente,
} = pagosSlice.actions;

export default pagosSlice.reducer;
