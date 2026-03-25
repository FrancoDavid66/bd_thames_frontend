/* src/pages/PolizasPage.jsx — Versión COMPLETA (cursor-aware) con Blindaje de Sucursal */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HiChatAlt2, HiDownload, HiX } from "react-icons/hi";
import dayjs from "dayjs";

import { useAuth } from "../context/AuthContext";
import PolizaTable from "../components/polizas/PolizaTable";
import PolizaFilter from "../components/polizas/PolizaFilter";
import ServicioGruaCard from "../components/polizas/ServicioGruaCard";
import VehiculoDocsPanel from "../components/polizas/VehiculoDocsPanel";
import CuponesRoboPanel from "../components/polizas/CuponesRoboPanel";
import { motion, AnimatePresence } from "framer-motion";

import {
  fetchPolizas, fetchPolizasKpis, enviarMensajesEstadoCuotas, exportarPolizas,
  selectResumenCuotas, setPage, setPageSize, setSearch, setEstado, setEstadoFinanciero,
  setCompania, setCliente, setPatente, setSoloActivas, setOrdering, setModo, setOficina,
  setFechaVencimientoDesde, setFechaVencimientoHasta, setVencidasUltimosDias, setVencidasMasDeDias,
  clearVencimientoFilters, selectEnvioMensajesStatus, selectEnvioMensajesResumen,
  selectEnvioMensajesBuckets, selectEnvioMensajesDiagnostico, selectEnvioMensajesPayload,
  selectEnvioMensajesSeleccionadas, selectEnvioMensajesProcesadas,
} from "../store/slices/polizasSlice";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

const estadoPorCuotas = (poliza) => {
  const key = (poliza?.estado_cuotas || "").toString().trim().toLowerCase();
  if (["al_dia", "por_vencer", "vence_hoy", "vencida_7", "vencida_30", "vencidas"].includes(key)) return key;

  const impagasCount = Number(poliza?.impagas_count ?? poliza?.impagasCount);
  if (Number.isFinite(impagasCount) && impagasCount <= 0) return "al_dia";

  const proxRaw = poliza?.proxima_vencimiento_impaga || poliza?.proximaVencimientoImpaga || null;
  if (proxRaw) {
    const hoy = startOfDay(new Date());
    const prox = startOfDay(new Date(proxRaw));
    if (Number.isNaN(prox.getTime())) return "vencidas";
    const d = diffDays(hoy, prox);
    if (d === 0) return "vence_hoy";
    if (d > 0) {
      if (d <= 7) return "vencida_7";
      if (d <= 30) return "vencida_30";
      return "vencidas";
    }
    return Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
  }

  const cuotas = poliza?.cuotas || [];
  const impagas = cuotas.filter((c) => !c.pagado);
  if (impagas.length === 0) return "al_dia";

  const hoy = startOfDay(new Date());
  const fechas = impagas.map((c) => startOfDay(new Date(c.fecha_vencimiento))).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => a - b);
  if (!fechas.length) return "vencidas";
  const proxima = fechas[0];
  const d = diffDays(hoy, proxima);
  if (d === 0) return "vence_hoy";
  if (d > 0) {
    if (d <= 7) return "vencida_7";
    if (d <= 30) return "vencida_30";
    return "vencidas";
  }
  return Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
};

export default function PolizasPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const polizasState = useSelector((s) => s.polizas || {});

  const {
    list = [], poliza: polizaSeleccionada = null, listStatus = "idle", listError = null,
    status: legacyStatus, error: legacyError, page = 1, pageSize = 100, total = 0, next = null,
    previous = null, cursorEnabled = false, search = "", estado = "todos", estado_financiero = "todos",
    compania = "", cliente = "", patente = "", solo_activas = false, oficina = "", ordering = "-id",
    modo = "polizas", fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias,
    vencidas_mas_de_dias, kpis = {},
  } = polizasState;

  const status = legacyStatus || listStatus || "idle";
  const error = legacyError || listError || null;
  const resumenCuotasDesdeSlice = useSelector(selectResumenCuotas);

  const [ready, setReady] = useState(false);
  const didInitRef = useRef(false);
  const [searchDraft, setSearchDraft] = useState(search || "");

  // 🚀 ESTADOS PARA EL MODAL DE EXPORTACIÓN (Auditoría)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");

  useEffect(() => {
    setSearchDraft(search || "");
  }, [search]);

  useEffect(() => {
    const qpCliente = searchParams.get("cliente") || searchParams.get("cliente_id");
    const qpPatente = searchParams.get("patente");
    const qpCompania = searchParams.get("compania");
    const qpModo = searchParams.get("modo");
    const qpSearch = searchParams.get("search") || "";
    const qpDesde = searchParams.get("desde");
    const qpHasta = searchParams.get("hasta");
    const qpUltimos = searchParams.get("vencidas_ultimos_dias");
    const qpMasDe = searchParams.get("vencidas_mas_de_dias");

    batch(() => {
      if (qpCliente) dispatch(setCliente(String(qpCliente)));
      if (qpPatente) dispatch(setPatente(String(qpPatente)));
      if (qpCompania) dispatch(setCompania(String(qpCompania)));
      if (qpModo && (qpModo === "polizas" || qpModo === "cuotas")) dispatch(setModo(qpModo));
      if (qpSearch) dispatch(setSearch(String(qpSearch)));
      if (qpDesde) dispatch(setFechaVencimientoDesde(qpDesde));
      if (qpHasta) dispatch(setFechaVencimientoHasta(qpHasta));
      if (qpUltimos) dispatch(setVencidasUltimosDias(qpUltimos));
      if (qpMasDe) dispatch(setVencidasMasDeDias(qpMasDe));
      dispatch(setPage(1));
    });

    didInitRef.current = true;
    setReady(true);
  }, [dispatch, searchParams]);

  const listQueryKey = useMemo(() => JSON.stringify({
    page, pageSize, search, estado, estado_financiero, compania, cliente, patente,
    solo_activas, oficina, ordering, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta,
    vencidas_ultimos_dias, vencidas_mas_de_dias, cursorEnabled,
  }), [page, pageSize, search, estado, estado_financiero, compania, cliente, patente, solo_activas, oficina, ordering, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias, cursorEnabled]);

  const kpisQueryKey = useMemo(() => JSON.stringify({
    search, compania, cliente, patente, solo_activas, estado, estado_financiero,
    oficina, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias,
  }), [search, compania, cliente, patente, solo_activas, estado, estado_financiero, oficina, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias]);

  const lastListKeyRef = useRef("");
  const lastKpisKeyRef = useRef("");

  useEffect(() => {
    if (!ready || !didInitRef.current) return;
    if (lastListKeyRef.current === listQueryKey) return;
    lastListKeyRef.current = listQueryKey;
    dispatch(fetchPolizas({ force: true }));
  }, [dispatch, listQueryKey, ready]);

  useEffect(() => {
    if (!ready || !didInitRef.current) return;
    if (lastKpisKeyRef.current === kpisQueryKey) return;
    lastKpisKeyRef.current = kpisQueryKey;
    dispatch(fetchPolizasKpis({ force: true }));
  }, [dispatch, kpisQueryKey, ready]);

  const resumenCuotas = useMemo(() => {
    if (resumenCuotasDesdeSlice && typeof resumenCuotasDesdeSlice === "object") return resumenCuotasDesdeSlice;
    const base = { todos: 0, al_dia: 0, por_vencer: 0, vence_hoy: 0, vencida_7: 0, vencida_30: 0, vencidas: 0 };
    for (const p of list) { base.todos += 1; const k = estadoPorCuotas(p); base[k] = (base[k] || 0) + 1; }
    return base;
  }, [list, resumenCuotasDesdeSlice]);

  const resumenPolizas = useMemo(() => ({
    activas_al_dia: kpis.activas_al_dia ?? 0, activas_mora_1_30: kpis.activas_mora_1_30 ?? 0,
    activas_mora_31_60: kpis.activas_mora_31_60 ?? 0, activas_mora_61_90: kpis.activas_mora_61_90 ?? 0,
    activas_mora_90_mas: kpis.activas_mora_90_mas ?? 0, vencidas: kpis.vencidas ?? 0,
    canceladas: kpis.canceladas ?? 0, finalizadas: kpis.finalizadas ?? 0, total: kpis.total ?? 0,
  }), [kpis]);

  const listFiltrada = useMemo(() => {
    if (modo === "cuotas" && estado && estado !== "todos") return list.filter((p) => estadoPorCuotas(p) === estado);
    return list;
  }, [list, modo, estado]);

  const onSearchChange = useCallback((val) => setSearchDraft(val || ""), []);
  const onSearchSubmit = useCallback(() => {
    const nextVal = (searchDraft || "").trim();
    dispatch(setSearch(nextVal.length >= 2 ? nextVal : ""));
  }, [dispatch, searchDraft]);
  const onClearSearchApplied = useCallback(() => { setSearchDraft(""); dispatch(setSearch("")); }, [dispatch]);

  const onEstadoChange = (val) => dispatch(setEstado(val));
  const onEstadoFinancieroChange = (val) => dispatch(setEstadoFinanciero(val));
  const onCompaniaChange = (val) => dispatch(setCompania(val));
  const onClienteChange = (val) => dispatch(setCliente(val));
  const onPatenteChange = (val) => dispatch(setPatente(val));
  const onSoloActivasChange = (val) => dispatch(setSoloActivas(val));
  const onOrderingChange = (val) => dispatch(setOrdering(val));
  const onModoChange = (val) => dispatch(setModo(val || "polizas"));

  const onPageChange = (newPageOrDir) => {
    if (cursorEnabled) {
      if (newPageOrDir === "next") { if (next) dispatch(fetchPolizas({ cursorUrl: next })); return; }
      if (newPageOrDir === "prev") { if (previous) dispatch(fetchPolizas({ cursorUrl: previous })); return; }
      return;
    }
    dispatch(setPage(newPageOrDir));
  };
  const onPageSizeChange = (size) => dispatch(setPageSize(size));
  const onFechaVencimientoDesdeChange = (val) => dispatch(setFechaVencimientoDesde(val || ""));
  const onFechaVencimientoHastaChange = (val) => dispatch(setFechaVencimientoHasta(val || ""));
  const onVencidasUltimosDiasChange = (val) => dispatch(setVencidasUltimosDias(val || ""));
  const onVencidasMasDeDiasChange = (val) => dispatch(setVencidasMasDeDias(val || ""));
  const onClearVencimiento = () => dispatch(clearVencimientoFilters());
  const handleVerUltimas = useCallback(() => { setSearchDraft(""); dispatch(setSearch("")); dispatch(fetchPolizas({ force: true })); dispatch(fetchPolizasKpis({ force: true })); }, [dispatch]);

  const [showDocs, setShowDocs] = useState(false);
  const [showGrua, setShowGrua] = useState(false);
  const [showCupones, setShowCupones] = useState(false);
  const polizaIdActual = polizaSeleccionada?.id ?? null;

  const envioStatus = useSelector(selectEnvioMensajesStatus);
  const envioResumen = useSelector(selectEnvioMensajesResumen);
  const envioBuckets = useSelector(selectEnvioMensajesBuckets);
  const envioDiag = useSelector(selectEnvioMensajesDiagnostico);
  const envioPayload = useSelector(selectEnvioMensajesPayload);
  const envioSeleccionadas = useSelector(selectEnvioMensajesSeleccionadas);
  const envioProcesadas = useSelector(selectEnvioMensajesProcesadas);
  const [previewOnly, setPreviewOnly] = useState(true);

  const filtrosEnvio = useMemo(() => {
    const f = { search: search || "", compania: compania || "", cliente: cliente || "", patente: patente || "", solo_activas: solo_activas ? 1 : undefined, oficina: oficina || undefined, estado: modo === "polizas" && estado !== "todos" ? estado : undefined, estado_financiero: modo === "polizas" && estado_financiero !== "todos" ? estado_financiero : undefined, fecha_vencimiento_desde: fecha_vencimiento_desde || "", fecha_vencimiento_hasta: fecha_vencimiento_hasta || "", vencidas_ultimos_dias: vencidas_ultimos_dias || "", vencidas_mas_de_dias: vencidas_mas_de_dias || "" };
    if (modo === "cuotas" && estado && estado !== "todos") f.estado_cuotas = estado;
    Object.keys(f).forEach((k) => { const v = f[k]; if (v === undefined) delete f[k]; if (typeof v === "string" && v.trim() === "") delete f[k]; });
    return f;
  }, [search, compania, cliente, patente, solo_activas, oficina, estado, estado_financiero, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias]);

  const hayUniverso = modo === "cuotas" ? listFiltrada.length > 0 : (cursorEnabled ? listFiltrada.length > 0 : total > 0);

  const handleEnviarMensajes = async () => {
    try {
      await dispatch(enviarMensajesEstadoCuotas({ filtros: filtrosEnvio, preview: !!previewOnly })).unwrap();
      toast.success(previewOnly ? "Reporte de mensajes generado (preview)." : "Mensajes enviados correctamente.");
    } catch (err) { toast.error("Error al enviar/generar el reporte de mensajes."); }
  };

  // 🚀 MANEJADOR DE CONFIRMACIÓN DE DESCARGA (Planilla de Auditoría)
  const handleConfirmExport = async () => {
    setExportModalOpen(false);
    const toastId = toast.loading(`Generando Planilla de Auditoría en ${exportFormat.toUpperCase()}...`);
    
    try {
      const { fileUrl, formato } = await dispatch(exportarPolizas({ formato: exportFormat })).unwrap();
      
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", `Auditoria_Polizas_${dayjs().format("YYYYMMDD_HHmm")}.${formato}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      window.URL.revokeObjectURL(fileUrl);
      toast.success(`¡Planilla descargada con éxito!`, { id: toastId });
    } catch (error) {
      toast.error("Error al generar la planilla. Verificá tu conexión.", { id: toastId });
    }
  };

  const pagingLabel = cursorEnabled ? "cursor" : `página ${page}`;
  const totalLabel = cursorEnabled ? `${listFiltrada.length}` : `${total}`;
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  return (
    <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 text-gray-100 relative">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Pólizas</h1>
          <p className="text-xs text-gray-400 sm:text-sm">
             {isWebAdmin ? "Buscá y filtrá sin cargar todo el universo." : `Gestionando cartera de: ${user?.perfil?.oficina_nombre || 'Sucursal'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-900/40 px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-400 hover:bg-emerald-800 hover:text-white transition-colors cursor-pointer shadow-sm"
          >
            <HiDownload size={16} /> Exportar Planilla
          </button>

          <Link to="/clientes" className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-800">Ver clientes</Link>
          <Link to="/solicitudes" className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-800">Ver solicitudes</Link>
        </div>
      </div>

      <PolizaFilter
        user={user} searchValue={searchDraft} onSearchChange={onSearchChange} onSearchSubmit={onSearchSubmit}
        onClearSearchApplied={onClearSearchApplied} searchApplied={search} estadoActual={estado}
        onEstadoChange={onEstadoChange} estadoFinancieroActual={estado_financiero} onEstadoFinancieroChange={onEstadoFinancieroChange}
        pageSize={pageSize} onPageSizeChange={onPageSizeChange} totalFiltradas={cursorEnabled ? listFiltrada.length : total}
        modoActual={modo} onModoChange={onModoChange} resumenCuotas={resumenCuotas} resumenPolizas={resumenPolizas}
        kpis={kpis} fechaVencimientoDesde={fecha_vencimiento_desde} fechaVencimientoHasta={fecha_vencimiento_hasta}
        onFechaVencimientoDesdeChange={onFechaVencimientoDesdeChange} onFechaVencimientoHastaChange={onFechaVencimientoHastaChange}
        vencidasUltimosDias={vencidas_ultimos_dias} vencidasMasDeDias={vencidas_mas_de_dias}
        onVencidasUltimosDiasChange={onVencidasUltimosDiasChange} onVencidasMasDeDiasChange={onVencidasMasDeDiasChange}
        onClearVencimientoFilters={onClearVencimiento} onVerUltimas={handleVerUltimas} status={status}
        oficinaActual={oficina} onOficinaChange={(val) => dispatch(setOficina(val === "ALL" ? "" : val))}
      />

      {error && status === "failed" && (
        <div className="mt-2 rounded-xl border border-rose-700/50 bg-rose-950/30 p-3 text-xs text-rose-100">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      <div className="mt-1 text-xs sm:text-sm text-gray-300">
        Mostrando {listFiltrada.length} de {totalLabel} pólizas ({pagingLabel})
      </div>

      <div className="mt-2 sm:mt-3">
        <PolizaTable
          polizas={listFiltrada} status={status} page={page} pageSize={pageSize}
          total={cursorEnabled ? listFiltrada.length : total} onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange} ordering={ordering} onOrderingChange={onOrderingChange}
          modo={modo} cursorEnabled={cursorEnabled} hasNext={!!next} hasPrev={!!previous}
          onNext={() => onPageChange("next")} onPrev={() => onPageChange("prev")}
        />
      </div>

      {showDocs && polizaIdActual && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Docs & Fotos del vehículo</h2>
            <button type="button" onClick={() => setShowDocs(false)} className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer">Cerrar</button>
          </div>
          <VehiculoDocsPanel polizaId={polizaIdActual} />
        </div>
      )}

      {showGrua && polizaSeleccionada && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Servicio de grúa</h2>
            <button type="button" onClick={() => setShowGrua(false)} className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer">Cerrar</button>
          </div>
          <ServicioGruaCard poliza={polizaSeleccionada} />
        </div>
      )}

      {showCupones && polizaSeleccionada && (
        <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/95 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Cuponeras de robo</h2>
            <button type="button" onClick={() => setShowCupones(false)} className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer">Cerrar</button>
          </div>
          <CuponesRoboPanel poliza={polizaSeleccionada} />
        </div>
      )}

      {isWebAdmin && (
        <div className="mt-8 rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 text-sm text-emerald-50">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200"><HiChatAlt2 /></span>
                <div>
                <div className="text-sm font-semibold">Enviar recordatorio de estado de cuotas</div>
                <div className="text-xs text-emerald-200/80">Usa los filtros de arriba (modo "Cuotas") para definir el universo.</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-emerald-500 bg-transparent text-emerald-500 cursor-pointer" checked={previewOnly} onChange={(e) => setPreviewOnly(e.target.checked)}/>
                <span>Solo preview (no enviar)</span>
                </label>

                <button type="button" onClick={handleEnviarMensajes} disabled={envioStatus === "loading" || !hayUniverso} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-800/70 cursor-pointer">
                {envioStatus === "loading" ? <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <HiChatAlt2 className="h-4 w-4" />}
                {envioStatus === "loading" ? previewOnly ? "Generando reporte..." : "Enviando..." : previewOnly ? "Generar reporte" : "Enviar de verdad"}
                </button>
            </div>
            </div>

            {envioResumen && (
            <div className="mt-2 grid gap-2 text-xs text-emerald-100 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2"><div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Resumen</div><pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(envioResumen, null, 2)}</pre></div>
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2"><div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Buckets</div><pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(envioBuckets, null, 2)}</pre></div>
                {envioDiag && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2"><div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Diagnóstico</div><pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(envioDiag, null, 2)}</pre></div>}
                {envioPayload && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2"><div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Payload enviado</div><pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(envioPayload, null, 2)}</pre></div>}
                {(envioSeleccionadas || envioProcesadas) && <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-2 sm:col-span-2"><div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Conteo</div><div className="mt-1 text-[11px]">Seleccionadas: {envioSeleccionadas} · Procesadas: {envioProcesadas}</div></div>}
            </div>
            )}
        </div>
      )}

      {/* 🚀 MODAL PARA ELEGIR FORMATO (SIN COLUMNAS) */}
      <AnimatePresence>
        {exportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/40 rounded-t-3xl">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <HiDownload className="text-emerald-400" /> Planilla de Auditoría
                </h3>
                <button onClick={() => setExportModalOpen(false)} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-rose-500 rounded-full p-2 transition-colors cursor-pointer">
                  <HiX size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <label className="block text-[11px] text-zinc-400 mb-3 uppercase font-bold tracking-widest text-center">Formato de Descarga</label>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setExportFormat('pdf')} 
                    className={`flex-1 py-3 rounded-xl border-2 font-black transition-all cursor-pointer ${exportFormat === 'pdf' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                  >
                    📄 Imprimir PDF
                  </button>
                  <button 
                    onClick={() => setExportFormat('xlsx')} 
                    className={`flex-1 py-3 rounded-xl border-2 font-black transition-all cursor-pointer ${exportFormat === 'xlsx' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                  >
                    📊 Bajar Excel
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed text-center">
                  La planilla se generará con las columnas adaptadas para control manual.
                </p>
              </div>

              <div className="p-5 border-t border-zinc-800 bg-zinc-900/40 rounded-b-3xl">
                <button 
                  onClick={handleConfirmExport} 
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 cursor-pointer flex justify-center items-center gap-2"
                >
                  <HiDownload size={18}/> Descargar Planilla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}