/* src/pages/PolizasPage.jsx — Lista de pólizas (rediseño slate+indig o) */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { HiDownload, HiX } from "react-icons/hi";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../context/AuthContext";
import PolizaTable from "../components/polizas/PolizaTable";
import PolizaFilter from "../components/polizas/PolizaFilter";

import {
  fetchPolizas, fetchPolizasKpis, exportarPolizas,
  selectResumenCuotas, setPage, setPageSize, setSearch, setEstado, setEstadoFinanciero,
  setCliente, setPatente, setOrdering, setModo, setOficina,
  setFechaVencimientoDesde, setFechaVencimientoHasta, setVencidasUltimosDias, setVencidasMasDeDias,
  clearVencimientoFilters,
} from "../store/slices/polizasSlice";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}
// Normaliza para comparar compañías sin distinguir mayúsculas/tildes
const norm = (s) =>
  (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const getCompaniaPoliza = (p) =>
  p?.compania_nombre ?? p?.compania?.nombre ?? (typeof p?.compania === "string" ? p.compania : "");

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
    list = [], listStatus = "idle", listError = null,
    status: legacyStatus, error: legacyError, page = 1, pageSize = 100, total = 0, next = null,
    previous = null, cursorEnabled = false, search = "", estado = "todos", estado_financiero = "todos",
    cliente = "", patente = "", solo_activas = false, oficina = "", ordering = "-id",
    modo = "polizas", fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias,
    vencidas_mas_de_dias, kpis = {},
  } = polizasState;

  const status = legacyStatus || listStatus || "idle";
  const error = legacyError || listError || null;
  const resumenCuotasDesdeSlice = useSelector(selectResumenCuotas);

  const [ready, setReady] = useState(false);
  const didInitRef = useRef(false);
  const [searchDraft, setSearchDraft] = useState(search || "");

  // 🚀 Filtro de aseguradora: 100% del lado del cliente (no se manda al back-end)
  const [companiaLocal, setCompaniaLocal] = useState("");

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");

  useEffect(() => { setSearchDraft(search || ""); }, [search]);

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
      if (qpModo && (qpModo === "polizas" || qpModo === "cuotas")) dispatch(setModo(qpModo));
      if (qpSearch) dispatch(setSearch(String(qpSearch)));
      if (qpDesde) dispatch(setFechaVencimientoDesde(qpDesde));
      if (qpHasta) dispatch(setFechaVencimientoHasta(qpHasta));
      if (qpUltimos) dispatch(setVencidasUltimosDias(qpUltimos));
      if (qpMasDe) dispatch(setVencidasMasDeDias(qpMasDe));
      dispatch(setPage(1));
    });
    if (qpCompania) setCompaniaLocal(String(qpCompania)); // filtro local

    didInitRef.current = true;
    setReady(true);
  }, [dispatch, searchParams]);

  const listQueryKey = useMemo(() => JSON.stringify({
    page, pageSize, search, estado, estado_financiero, cliente, patente,
    solo_activas, oficina, ordering, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta,
    vencidas_ultimos_dias, vencidas_mas_de_dias, cursorEnabled,
  }), [page, pageSize, search, estado, estado_financiero, cliente, patente, solo_activas, oficina, ordering, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias, cursorEnabled]);

  const kpisQueryKey = useMemo(() => JSON.stringify({
    search, cliente, patente, solo_activas, estado, estado_financiero,
    oficina, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias,
  }), [search, cliente, patente, solo_activas, estado, estado_financiero, oficina, modo, fecha_vencimiento_desde, fecha_vencimiento_hasta, vencidas_ultimos_dias, vencidas_mas_de_dias]);

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

  // Filtro visible: por estado de cuotas (modo cuotas) + por compañía (local)
  const listFiltrada = useMemo(() => {
    let arr = list;
    if (modo === "cuotas" && estado && estado !== "todos") {
      arr = arr.filter((p) => estadoPorCuotas(p) === estado);
    }
    if (companiaLocal) {
      const c = norm(companiaLocal);
      arr = arr.filter((p) => {
        const pc = norm(getCompaniaPoliza(p));
        if (!pc) return false;
        return pc === c || pc.includes(c) || c.includes(pc);
      });
    }
    return arr;
  }, [list, modo, estado, companiaLocal]);

  const onSearchChange = useCallback((val) => setSearchDraft(val || ""), []);
  const onSearchSubmit = useCallback(() => {
    const nextVal = (searchDraft || "").trim();
    dispatch(setSearch(nextVal.length >= 2 ? nextVal : ""));
  }, [dispatch, searchDraft]);
  const onClearSearchApplied = useCallback(() => { setSearchDraft(""); dispatch(setSearch("")); }, [dispatch]);

  const onEstadoChange = (val) => dispatch(setEstado(val));
  const onEstadoFinancieroChange = (val) => dispatch(setEstadoFinanciero(val));
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
  const handleVerUltimas = useCallback(() => {
    setSearchDraft(""); dispatch(setSearch("")); dispatch(fetchPolizas({ force: true })); dispatch(fetchPolizasKpis({ force: true }));
  }, [dispatch]);

  const handleConfirmExport = async () => {
    setExportModalOpen(false);
    const toastId = toast.loading(`Generando planilla en ${exportFormat.toUpperCase()}...`);
    try {
      const { fileUrl, formato } = await dispatch(exportarPolizas({ formato: exportFormat })).unwrap();
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", `Auditoria_Polizas_${dayjs().format("YYYYMMDD_HHmm")}.${formato}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
      toast.success("¡Planilla descargada con éxito!", { id: toastId });
    } catch (error) {
      toast.error("Error al generar la planilla. Verificá tu conexión.", { id: toastId });
    }
  };

  const pagingLabel = cursorEnabled ? "cursor" : `página ${page}`;
  const totalLabel = companiaLocal ? `${listFiltrada.length}` : cursorEnabled ? `${listFiltrada.length}` : `${total}`;
  const isWebAdmin = user?.perfil?.rol === "ADMIN";

  return (
    <div className="relative mx-auto max-w-7xl px-3 py-3 text-slate-100 sm:px-4 sm:py-4">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Pólizas</h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            {isWebAdmin ? "Buscá y filtrá sin cargar todo el universo." : `Gestionando cartera de: ${user?.perfil?.oficina_nombre || "Sucursal"}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-500/20 sm:text-sm"
          >
            <HiDownload size={16} /> Exportar planilla
          </button>
          <Link to="/clientes" className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs hover:bg-slate-700 sm:text-sm">Ver clientes</Link>
          <Link to="/solicitudes" className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs hover:bg-slate-700 sm:text-sm">Ver solicitudes</Link>
        </div>
      </div>

      <PolizaFilter
        user={user}
        searchValue={searchDraft}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onClearSearchApplied={onClearSearchApplied}
        searchApplied={search}
        estadoActual={estado}
        onEstadoChange={onEstadoChange}
        estadoFinancieroActual={estado_financiero}
        onEstadoFinancieroChange={onEstadoFinancieroChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        totalFiltradas={listFiltrada.length}
        modoActual={modo}
        onModoChange={onModoChange}
        resumenCuotas={resumenCuotas}
        resumenPolizas={resumenPolizas}
        kpis={kpis}
        fechaVencimientoDesde={fecha_vencimiento_desde}
        fechaVencimientoHasta={fecha_vencimiento_hasta}
        onFechaVencimientoDesdeChange={onFechaVencimientoDesdeChange}
        onFechaVencimientoHastaChange={onFechaVencimientoHastaChange}
        vencidasUltimosDias={vencidas_ultimos_dias}
        vencidasMasDeDias={vencidas_mas_de_dias}
        onVencidasUltimosDiasChange={onVencidasUltimosDiasChange}
        onVencidasMasDeDiasChange={onVencidasMasDeDiasChange}
        onClearVencimientoFilters={onClearVencimiento}
        onVerUltimas={handleVerUltimas}
        status={status}
        oficinaActual={oficina}
        onOficinaChange={(val) => dispatch(setOficina(val === "ALL" ? "" : val))}
        companiaActual={companiaLocal}
        onCompaniaChange={setCompaniaLocal}
      />

      {error && status === "failed" && (
        <div className="mt-2 rounded-xl border border-rose-700/50 bg-rose-950/30 p-3 text-xs text-rose-100">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      <div className="mt-2 text-xs text-slate-400 sm:text-sm">
        Mostrando {listFiltrada.length} de {totalLabel} pólizas ({pagingLabel})
        {companiaLocal ? <span className="ml-1 text-sky-400">· filtrado por “{companiaLocal}”</span> : null}
      </div>

      <div className="mt-2 sm:mt-3">
        <PolizaTable
          polizas={listFiltrada} status={status} page={page} pageSize={pageSize}
          total={companiaLocal ? listFiltrada.length : cursorEnabled ? listFiltrada.length : total} onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange} ordering={ordering} onOrderingChange={onOrderingChange}
          modo={modo} cursorEnabled={cursorEnabled} hasNext={!!next} hasPrev={!!previous}
          onNext={() => onPageChange("next")} onPrev={() => onPageChange("prev")}
        />
      </div>

      {/* Modal de exportación */}
      <AnimatePresence>
        {exportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="flex w-full max-w-sm flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-800 bg-slate-950/40 p-5">
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <HiDownload className="text-indigo-400" /> Planilla de auditoría
                </h3>
                <button onClick={() => setExportModalOpen(false)} className="rounded-full bg-slate-800 p-2 text-slate-500 transition-colors hover:bg-rose-500 hover:text-white">
                  <HiX size={20} />
                </button>
              </div>

              <div className="p-6">
                <label className="mb-3 block text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">Formato de descarga</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setExportFormat("pdf")}
                    className={`flex-1 rounded-xl border-2 py-3 font-black transition-all ${exportFormat === "pdf" ? "border-rose-500 bg-rose-500/10 text-rose-400" : "border-slate-800 bg-slate-800/60 text-slate-500 hover:border-slate-700"}`}
                  >
                    📄 Imprimir PDF
                  </button>
                  <button
                    onClick={() => setExportFormat("xlsx")}
                    className={`flex-1 rounded-xl border-2 py-3 font-black transition-all ${exportFormat === "xlsx" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-slate-800 bg-slate-800/60 text-slate-500 hover:border-slate-700"}`}
                  >
                    📊 Bajar Excel
                  </button>
                </div>
                <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-500">
                  La planilla se generará con las columnas adaptadas para control manual.
                </p>
              </div>

              <div className="rounded-b-3xl border-t border-slate-800 bg-slate-950/40 p-5">
                <button
                  onClick={handleConfirmExport}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3.5 font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-400 active:scale-95"
                >
                  <HiDownload size={18} /> Descargar planilla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}