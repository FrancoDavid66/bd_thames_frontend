/* src/store/slices/pagosSlice.js — La Memoria 🧠
   Este archivo maneja exclusivamente el estado (Redux).
   Toda la lógica de peticiones y caché vive ahora en pagosThunks.js
*/
import { createSlice } from "@reduxjs/toolkit";

// Importamos todos los thunks desde nuestro nuevo archivo motor
import {
  fetchTodasLasCuotas,
  marcarCuotaComoPagada,
  enviarAlertas,
  enviarRecordatoriosCuotas,
  enviarTodasOficinas,
  fetchHistorialRecordatorios,
  fetchHistorialPagos,
  downloadHistorialPagosCSV,
  downloadHistorialPagosPDF,
  fetchPagosBuscar,
  fetchCuotasBuscar,
  fetchBuscarClientePorDni,
  fetchCuotasPorPoliza,
  fetchPolizas,
  registrarIngreso,
  fetchCuotasAVencer,
  fetchMediosCobro,
  crearMedioCobro,
  actualizarMedioCobro,
  eliminarMedioCobro,
  fetchReporteEfectividad,
} from "./pagosThunks";

// ===================== CONSTANTES DE CACHE =====================
const POLIZAS_CACHE_MAX = 20;
const BUSCAR_CACHE_MAX = 30;
const POLIZA_BY_ID_MAX = 250;
const CLIENTE_DNI_CACHE_MAX = 40;
const CUOTAS_POLIZA_CACHE_MAX = 60;
const HISTORIAL_CACHE_MAX = 40;
const RECIENTES_DNI_MAX = 10;

// ===================== HELPERS DE ESTADO =====================
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
    meta: meta && typeof meta === "object" ? { count: Number(meta.count || 0) || 0, next: meta.next ?? null, previous: meta.previous ?? null } : { count: Array.isArray(items) ? items.length : 0, next: null, previous: null },
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
    meta: meta && typeof meta === "object" ? { count: Number(meta.count || 0) || 0, next: meta.next ?? null, previous: meta.previous ?? null } : { count: Array.isArray(items) ? items.length : 0, next: null, previous: null },
  };

  const prev = Array.isArray(state.historialPagosCacheOrder) ? state.historialPagosCacheOrder : [];
  const next = [cacheKey, ...prev.filter((x) => x !== cacheKey)].slice(0, HISTORIAL_CACHE_MAX);
  state.historialPagosCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.historialPagosCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.historialPagosCache[key];
  });
}

function savePolizaByIdCache(state, polizasByIdMap) {
  if (!polizasByIdMap) return;
  const now = Date.now();

  // Soporta tanto Map como objeto plano (el payload serializa Map a objeto)
  const entries = polizasByIdMap instanceof Map
    ? Array.from(polizasByIdMap.entries())
    : Object.entries(polizasByIdMap);

  for (const [id, pol] of entries) {
    const pid = Number(id);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    if (!pol || typeof pol !== "object") continue;
    state.polizaByIdCache[pid] = { ts: now, poliza: pol };
    const prev = Array.isArray(state.polizaByIdOrder) ? state.polizaByIdOrder : [];
    state.polizaByIdOrder = [pid, ...prev.filter((x) => x !== pid)].slice(0, POLIZA_BY_ID_MAX);
  }

  const keep = new Set(state.polizaByIdOrder || []);
  Object.keys(state.polizaByIdCache || {}).forEach((k) => {
    const id = Number(k);
    if (!keep.has(id)) delete state.polizaByIdCache[k];
  });
}

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

function saveCuotasPolizaCache(state, cacheKey, items, meta) {
  const ck = String(cacheKey || "").trim();
  if (!ck) return;

  state.cuotasPolizaCache[ck] = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
    meta: meta && typeof meta === "object" ? { count: Number(meta.count || 0) || 0, next: meta.next ?? null, previous: meta.previous ?? null } : { count: Array.isArray(items) ? items.length : 0, next: null, previous: null },
  };

  const prev = Array.isArray(state.cuotasPolizaCacheOrder) ? state.cuotasPolizaCacheOrder : [];
  const next = [ck, ...prev.filter((x) => x !== ck)].slice(0, CUOTAS_POLIZA_CACHE_MAX);
  state.cuotasPolizaCacheOrder = next;

  const keep = new Set(next);
  Object.keys(state.cuotasPolizaCache || {}).forEach((key) => {
    if (!keep.has(key)) delete state.cuotasPolizaCache[key];
  });
}

/* ===================== INITIAL STATE ===================== */
const initialState = {
  status: "idle",
  error: null,
  cuotas: [],
  cuotasAVencer: [],

  // búsqueda (legacy de polizas)
  searchStatus: "idle",
  searchError: null,
  polizas: [],
  polizasCache: {},
  polizasCacheOrder: [],

  // ✅ búsqueda PRO (cuotas aplanadas)
  buscarItems: [],
  buscarMeta: { count: 0, next: null, previous: null },
  buscarStatus: "idle",
  buscarError: null,
  buscarCache: {},
  buscarCacheOrder: [],

  // ✅ status/error para cuotas directo (patente/texto)
  cuotasBuscarStatus: "idle",
  cuotasBuscarError: null,

  // ✅ cache por ID de póliza para enriquecer cliente (rápido)
  polizaByIdCache: {},
  polizaByIdOrder: [],

  // ✅ DNI-first: cliente + pólizas
  buscarClienteData: null,
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
  mpCuentas: [],
  billeteras: [],

  // notificaciones
  alertasStatus: "idle",
  alertasError: null,
  recordatoriosStatus: "idle",
  recordatoriosError: null,
  recordatoriosLast: null,
  historialRecordatorios: [],
  historialRecordatoriosStatus: "idle",
  historialRecordatoriosError: null,

  // historial pagos (tabla)
  historialPagosItems: [],
  historialPagosMeta: { count: 0, next: null, previous: null },
  historialPagosStatus: "idle",
  historialPagosError: null,
  historialPagosCache: {},
  historialPagosCacheOrder: [],
  historialPagosDownloadStatus: "idle",
  historialPagosDownloadError: null,
  historialPagosDownloadPdfStatus: "idle",
  historialPagosDownloadPdfError: null,

  // 🚀 ESTADO DEL REPORTE DE EFECTIVIDAD
  reporteEfectividad: null,
  reporteEfectividadStatus: "idle",
  reporteEfectividadError: null,
};

/* ===================== SLICE REDUCERS ===================== */
const pagosSlice = createSlice({
  name: "pagos",
  initialState,
  reducers: {
    setCuotas(state, action) {
      state.cuotas = Array.isArray(action.payload) ? action.payload : [];
    },
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
        const p = action.payload || {};
        if (p.cacheKey) saveBuscarCache(state, p.cacheKey, p.originalQuery, p.items || [], p.meta);
        if (p._polizaByIdToCache) savePolizaByIdCache(state, p._polizaByIdToCache);
      })
      .addCase(fetchCuotasBuscar.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) return;
        state.cuotasBuscarStatus = "failed";
        state.cuotasBuscarError = action.payload || "Error buscando cuotas";
      })

      // --- DNI-FIRST: buscar cliente + pólizas ---
      .addCase(fetchBuscarClientePorDni.pending, (state, action) => {
        state.buscarClienteStatus = "loading";
        state.buscarClienteError = null;
        state.buscarClienteData = null;
      })
      .addCase(fetchBuscarClientePorDni.fulfilled, (state, action) => {
        state.buscarClienteStatus = "succeeded";
        const p = action.payload || {};
        state.buscarClienteData = { cliente: p.cliente || null, polizas: Array.isArray(p.polizas) ? p.polizas : [] };
        if (p._cacheKey) saveClienteDniCache(state, p._cacheKey, state.buscarClienteData);
      })
      .addCase(fetchBuscarClientePorDni.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) return;
        state.buscarClienteStatus = "failed";
        state.buscarClienteError = action.payload || "Error buscando por DNI";
        state.buscarClienteData = null;
      })

      // --- DNI-FIRST: cuotas por póliza ---
      .addCase(fetchCuotasPorPoliza.pending, (state, action) => {
        state.cuotasPolizaStatus = "loading";
        state.cuotasPolizaError = null;
      })
      .addCase(fetchCuotasPorPoliza.fulfilled, (state, action) => {
        state.cuotasPolizaStatus = "succeeded";
        const p = action.payload || {};
        state.cuotasPolizaItems = Array.isArray(p.items) ? p.items : [];
        state.cuotasPolizaMeta = p.meta || { count: state.cuotasPolizaItems.length, next: null, previous: null };
        if (p._cacheKey) saveCuotasPolizaCache(state, p._cacheKey, state.cuotasPolizaItems, state.cuotasPolizaMeta);
      })
      .addCase(fetchCuotasPorPoliza.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) return;
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
      })
      .addCase(fetchPagosBuscar.fulfilled, (state, action) => {
        state.buscarStatus = "succeeded";
        state.searchStatus = "succeeded";
        const payload = action.payload || {};
        const items = payload.items ?? payload ?? [];
        state.buscarItems = Array.isArray(items) ? items : [];
        state.buscarMeta = payload.meta || { count: state.buscarItems.length, next: null, previous: null };
        saveBuscarCache(state, payload.cacheKey, payload.originalQuery, state.buscarItems, state.buscarMeta);
        if (payload._polizaByIdToCache) savePolizaByIdCache(state, payload._polizaByIdToCache);
      })
      .addCase(fetchPagosBuscar.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) return;
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
        if (action?.payload && action.payload._aborted) return;
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
        state.recordatoriosLast = null;
      })
      .addCase(enviarRecordatoriosCuotas.fulfilled, (state, action) => {
        state.recordatoriosStatus = "succeeded";
        state.recordatoriosLast = action.payload || null;
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

      // --- Historial pagos ---
      .addCase(fetchHistorialPagos.pending, (state, action) => {
        state.historialPagosStatus = "loading";
        state.historialPagosError = null;
      })
      .addCase(fetchHistorialPagos.fulfilled, (state, action) => {
        state.historialPagosStatus = "succeeded";
        state.historialPagosItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.historialPagosMeta = action.payload?.meta || { count: state.historialPagosItems.length, next: null, previous: null };
        const cacheKey = action.payload?._cacheKey;
        if (cacheKey) saveHistorialCache(state, cacheKey, state.historialPagosItems, state.historialPagosMeta);
      })
      .addCase(fetchHistorialPagos.rejected, (state, action) => {
        if (action?.payload && action.payload._aborted) return;
        state.historialPagosStatus = "failed";
        state.historialPagosError = action.payload;
        state.historialPagosItems = [];
        state.historialPagosMeta = { count: 0, next: null, previous: null };
      })

      // --- Descargar CSV/PDF ---
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
      })

      // 🚀 --- REPORTE DE EFECTIVIDAD ---
      .addCase(fetchReporteEfectividad.pending, (state) => {
        state.reporteEfectividadStatus = "loading";
        state.reporteEfectividadError = null;
      })
      .addCase(fetchReporteEfectividad.fulfilled, (state, action) => {
        state.reporteEfectividadStatus = "succeeded";
        state.reporteEfectividad = action.payload;
      })
      .addCase(fetchReporteEfectividad.rejected, (state, action) => {
        state.reporteEfectividadStatus = "failed";
        state.reporteEfectividadError = action.payload;
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

// ✅ RE-EXPORTAMOS TODOS LOS THUNKS PARA QUE LOS COMPONENTES NO SE ROMPAN
export {
  fetchTodasLasCuotas,
  marcarCuotaComoPagada,
  enviarAlertas,
  enviarRecordatoriosCuotas,
  enviarTodasOficinas,
  fetchHistorialRecordatorios,
  fetchHistorialPagos,
  downloadHistorialPagosCSV,
  downloadHistorialPagosPDF,
  fetchPagosBuscar,
  fetchCuotasBuscar,
  fetchBuscarClientePorDni,
  fetchCuotasPorPoliza,
  fetchPolizas,
  registrarIngreso,
  fetchCuotasAVencer,
  fetchMediosCobro,
  crearMedioCobro,
  actualizarMedioCobro,
  eliminarMedioCobro,
  fetchReporteEfectividad,
};