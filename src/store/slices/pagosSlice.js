/* src/store/slices/pagosSlice.js — Optimizado: cache historial pagos + búsqueda + cancelación + force real + búsqueda PRO (/pagos/buscar/) */
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

  // ✅ backend entiende ocultar_pagadas / solo_pendientes
  // default: ocultar_pagadas=1 (mostramos pendientes)
  const includePagadas = Boolean(pp?.include_pagadas);
  const ocultar_pagadas = includePagadas ? 0 : 1;

  return compact({
    q,
    search: q, // compat
    oficina,
    ordering,
    page,
    page_size,
    limit: pp?.limit, // compat (backend también lo tolera)
    ocultar_pagadas,
  });
}

function buildBuscarCacheKey(params) {
  return stableKey(params);
}

/* ===================== CACHE HISTORIAL PAGOS ===================== */
const HISTORIAL_CACHE_TTL_MS = 25 * 1000; // 20–30s recomendado
const HISTORIAL_CACHE_MAX = 40;

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

/* ===================== CANCELACIÓN GLOBAL (EVITA RESPUESTAS VIEJAS) ===================== */
/**
 * Si el usuario teclea rápido, abortamos la request anterior para:
 * - historial pagos
 * - búsqueda polizas (legacy)
 * - búsqueda pro (cuotas aplanadas)
 */
let historialAbort = null;
let polizasAbort = null;
let buscarAbort = null;

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

/** ✅ Historial de pagos (GET /cuotas/pagos/) con filtros día/mes/rango + cache TTL + cancel + force */
export const fetchHistorialPagos = createAsyncThunk(
  "pagos/fetchHistorialPagos",
  async (params, { rejectWithValue, getState }) => {
    try {
      const pp = params && typeof params === "object" ? params : {};
      const force = Boolean(pp?.force);

      const built = buildHistorialParams(pp);
      const cacheKey = buildHistorialCacheKey(built);

      // ✅ cache hit (rápido) — pero NO si force
      if (!force) {
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
            _force: false,
          };
        }
      }

      // ✅ cancelar request anterior (si el usuario sigue tipeando)
      if (historialAbort) {
        try {
          historialAbort.abort();
        } catch {}
      }
      historialAbort = new AbortController();

      const { data } = await axios.get(API("cuotas/pagos/"), {
        params: built,
        signal: historialAbort.signal,
      });

      if (data && typeof data === "object" && "results" in data) {
        return {
          items: Array.isArray(data.results) ? data.results : [],
          meta: {
            count: Number(data.count || 0) || 0,
            next: data.next ?? null,
            previous: data.previous ?? null,
          },
          _cacheKey: cacheKey,
          _fromCache: false,
          _force: force,
        };
      }

      const items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
      return {
        items,
        meta: { count: items.length, next: null, previous: null },
        _cacheKey: cacheKey,
        _fromCache: false,
        _force: force,
      };
    } catch (error) {
      // ✅ si fue abort, no lo tratamos como error “real”
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return rejectWithValue({ _aborted: true });
      }
      if (error?.name === "AbortError") {
        return rejectWithValue({ _aborted: true });
      }
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

/** ✅ Búsqueda PRO (rápida): GET /pagos/buscar/ => devuelve CUOTAS APLANADAS (flat) */
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
        };
      }

      // ✅ cache hit (rápido) — pero NO si force
      if (!force) {
        const st = getState()?.pagos;
        const hit = st?.buscarCache?.[cacheKey];
        if (
          hit &&
          isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) &&
          Array.isArray(hit.items) &&
          hit.meta &&
          typeof hit.meta === "object"
        ) {
          return {
            items: hit.items,
            meta: hit.meta,
            originalQuery: hit.originalQuery || queryStr,
            cacheKey,
            fromCache: true,
            _force: false,
          };
        }
      }

      // ✅ cancelar request anterior
      if (buscarAbort) {
        try {
          buscarAbort.abort();
        } catch {}
      }
      buscarAbort = new AbortController();

      const { data } = await axios.get(API("pagos/buscar/"), {
        params: built,
        signal: buscarAbort.signal,
      });

      if (data && typeof data === "object" && "results" in data) {
        return {
          items: Array.isArray(data.results) ? data.results : [],
          meta: {
            count: Number(data.count || 0) || 0,
            next: data.next ?? null,
            previous: data.previous ?? null,
          },
          originalQuery: queryStr,
          cacheKey,
          fromCache: false,
          _force: force,
        };
      }

      const items = Array.isArray(unwrap(data)) ? unwrap(data) : [];
      return {
        items,
        meta: { count: items.length, next: null, previous: null },
        originalQuery: queryStr,
        cacheKey,
        fromCache: false,
        _force: force,
      };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return rejectWithValue({ _aborted: true });
      }
      if (error?.name === "AbortError") {
        return rejectWithValue({ _aborted: true });
      }
      return rejectWithValue(error?.response?.data || "Error al buscar pagos");
    }
  }
);

/** Buscar pólizas por texto (legacy) — con cache TTL + cancel */
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

      // ✅ cancelar request anterior (si se sigue tipeando)
      if (polizasAbort) {
        try {
          polizasAbort.abort();
        } catch {}
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
                  params: compact({ include_cuotas: 1 }),
                  signal: polizasAbort?.signal,
                })
                .then((r) => r.data)
            )
          );

          for (const r of results) {
            if (r.status === "fulfilled") detailed.push(r.value);
          }

          // ✅ si se abortó, cortamos loop
          if (polizasAbort?.signal?.aborted) break;
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
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        return rejectWithValue({ _aborted: true });
      }
      if (error?.name === "AbortError") {
        return rejectWithValue({ _aborted: true });
      }
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
        modo: p?.modo,
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

/** ✅ guarda cache con la key REAL (incluye |cuotas / |lite) */
function savePolizasCache(state, cacheKey, originalQuery, polizas) {
  const ck = String(cacheKey || "").trim().toLowerCase();
  if (!ck) return;

  state.polizasCache[ck] = {
    ts: Date.now(),
    polizas: Array.isArray(polizas) ? polizas : [],
    originalQuery: String(originalQuery || "").trim(),
  };

  const prev = Array.isArray(state.polizasCacheOrder)
    ? state.polizasCacheOrder
    : [];
  const next = [ck, ...prev.filter((x) => x !== ck)].slice(0, POLIZAS_CACHE_MAX);
  state.polizasCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.polizasCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.polizasCache[key];
  });
}

/** ✅ cache para búsqueda PRO (cuotas flat) */
function saveBuscarCache(state, cacheKey, originalQuery, items, meta) {
  const ck = String(cacheKey || "").trim().toLowerCase();
  if (!ck) return;

  state.buscarCache[ck] = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
    meta:
      meta && typeof meta === "object"
        ? {
            count: Number(meta.count || 0) || 0,
            next: meta.next ?? null,
            previous: meta.previous ?? null,
          }
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

      state.buscarItems = [];
      state.buscarMeta = { count: 0, next: null, previous: null };
      state.buscarStatus = "idle";
      state.buscarError = null;
    },
    // opcional: para invalidar historial cuando pagás una cuota y querés refrescar
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
      // --- Buscar PRO (cuotas aplanadas) ---
      .addCase(fetchPagosBuscar.pending, (state, action) => {
        state.buscarStatus = "loading";
        state.buscarError = null;

        // también sincronizamos searchStatus para que el botón “Buscando…” del buscador siga funcionando
        state.searchStatus = "loading";
        state.searchError = null;

        const arg = action?.meta?.arg;
        const force = Boolean(arg && typeof arg === "object" && arg.force);

        const built = buildBuscarParams(arg);
        const ck = buildBuscarCacheKey(built);

        // hidratación optimista desde cache (si no es force)
        if (!force && ck) {
          const hit = state.buscarCache?.[ck];
          if (hit && isFresh(hit.ts, BUSCAR_CACHE_TTL_MS) && Array.isArray(hit.items)) {
            state.buscarItems = hit.items;
            state.buscarMeta =
              hit.meta ||
              { count: hit.items.length, next: null, previous: null };
          }
        }
      })
      .addCase(fetchPagosBuscar.fulfilled, (state, action) => {
        state.buscarStatus = "succeeded";
        state.searchStatus = "succeeded";

        const payload = action.payload || {};
        const items = payload.items ?? payload ?? [];
        state.buscarItems = Array.isArray(items) ? items : [];
        state.buscarMeta =
          payload.meta ||
          { count: state.buscarItems.length, next: null, previous: null };

        saveBuscarCache(
          state,
          payload.cacheKey,
          payload.originalQuery,
          state.buscarItems,
          state.buscarMeta
        );
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

        // ✅ cache real
        savePolizasCache(state, payload.cacheKey, payload.originalQuery, state.polizas);
      })
      .addCase(fetchPolizas.rejected, (state, action) => {
        // ✅ si fue abort, no “ensuciamos” con error
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

        const arg = action?.meta?.arg;
        const force = Boolean(arg && typeof arg === "object" && arg.force);

        // ✅ hidratación optimista desde cache fresco (evita “parpadeo”)
        // PERO no si force=true (porque el usuario pidió refresh real)
        if (!force) {
          const built = buildHistorialParams(arg);
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
          }
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
        // ✅ si fue abort, no “limpiamos” la tabla (evita parpadeo)
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
} = pagosSlice.actions;

export default pagosSlice.reducer;
