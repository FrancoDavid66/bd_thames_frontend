// src/pages/BajasPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiDownload,
  HiChevronRight,
  HiChevronLeft,
  HiX,
  HiPaperAirplane,
  HiClipboardList,
  HiCheckCircle,
  HiFilter,
  HiLightningBolt,
  HiSearch,
  HiCalendar,
} from "react-icons/hi";
import ExcelJS from "exceljs";

// 🎯 Lógica unificada de fechas/vencimientos
import { getDiasVencida } from "../utils/cuotas";

import {
  fetchBajas,
  fetchBajasOficinas,
  fetchBajasCounters,
  fetchBajasGlobalCounters,
  selectBajas,
  selectBajasCount,
  selectBajasOficinas,
  selectBajasCounters,
  selectBajasGlobalCounters,
  apiGet,
  apiAction,
} from "../store/slices/bajasSlice";

import BajasTable from "../components/bajas/BajasTable";
import { useAuth } from "../context/AuthContext";

const STATUS = {
  ENVIAR: "PENDIENTE_ENVIO",
  ENVIADA: "ENVIADA",
  REALIZADA: "REALIZADA",
};

// Grupo que junta ENVIADA + REALIZADA bajo un solo concepto: "Dadas de baja"
const GRUPO_DADAS = "DADAS";

const LS = {
  oficina: "scope.bajas.oficina",
};

// --- Helpers ---
// 🎯 parseDateRobusta y daysBetween migrados a utils/cuotas.js (getDiasVencida)

function getClienteInfo(p) {
  const nombre =
    (p?.cliente_nombre_completo ||
      `${p?.cliente_apellido || ""} ${p?.cliente_nombre || ""}`).trim() ||
    "Asegurado";
  return { nombre };
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Badge de estado usado en el modal de historial.
function StatusBadge({ status }) {
  const s = String(status || "");
  const map = {
    PENDIENTE_ENVIO: { label: "Pendiente", clase: "border-rose-500/40 text-rose-300 bg-rose-500/10" },
    ENVIADA: { label: "Enviada", clase: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
    REALIZADA: { label: "Realizada", clase: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  };
  const c = map[s] || { label: s || "—", clase: "border-white/20 text-white/60 bg-white/5" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border ${c.clase}`}>
      {c.label}
    </span>
  );
}

export default function BajasPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const items = useSelector(selectBajas);
  const totalItemsCount = useSelector(selectBajasCount);
  const oficinas = useSelector(selectBajasOficinas);
  
  // 🚀 Obtenemos ambas estadísticas
  const sucursalKpis = useSelector(selectBajasCounters) || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };
  const adminGlobalKpis = useSelector(selectBajasGlobalCounters) || { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };

  const [oficina, setOficina] = useState(() => {
    if (!isWebAdmin && user?.perfil?.oficina) {
      return String(user.perfil.oficina.id || user.perfil.oficina);
    }
    return localStorage.getItem(LS.oficina) || "";
  });

  const [compania, setCompania] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(STATUS.ENVIAR);
  const [umbralDias, setUmbralDias] = useState(4);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [sortConfig, setSortConfig] = useState({ key: "_diasMora", direction: "desc" });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: "", ids: [] });
  const [includeExcel, setIncludeExcel] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  // 🚀 Estado para mostrar feedback visual al descargar desde la tarjeta
  const [downloadingTab, setDownloadingTab] = useState(null); 

  const companiasUnicas = useMemo(() => {
    const names = (items || []).map((p) => p.compania).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [items]);

  const loadGlobalTotals = useCallback((opts = {}) => {
    const ofi = opts.oficina !== undefined ? opts.oficina : (!isWebAdmin && user?.perfil?.oficina ? String(user.perfil.oficina.id || user.perfil.oficina) : oficina);
    const cia = opts.compania !== undefined ? opts.compania : compania;
    const d = opts.umbralDias !== undefined ? opts.umbralDias : umbralDias;
    const q = opts.search !== undefined ? opts.search : search;

    // 1. Cargamos las KPIs con filtro (Sucursal seleccionada)
    dispatch(fetchBajasCounters({ dias: d, oficina: ofi, compania: cia, search: q, include_canceladas: "1" }));
    
    // 2. Si es Admin, cargamos las KPIs Maestras (Sin mandar el filtro de oficina)
    if (isWebAdmin) {
      dispatch(fetchBajasGlobalCounters({ dias: d, compania: cia, search: q, include_canceladas: "1" }));
    }
  }, [dispatch, umbralDias, oficina, compania, search, isWebAdmin, user]);

  const loadTableData = useCallback(
    (opts = {}) => {
      const o = opts?.overrides || {};
      const tab = o.activeTab ?? activeTab;
      const cia = o.compania ?? compania;
      const dias = o.umbralDias ?? umbralDias;
      const q = o.search ?? search;
      
      const ofi = !isWebAdmin && user?.perfil?.oficina 
                  ? String(user.perfil.oficina.id || user.perfil.oficina) 
                  : (o.oficina ?? oficina);
      
      const pg = o.page ?? page;
      const ps = o.pageSize ?? pageSize;

      dispatch(
        fetchBajas({
          params: {
            page: "1",
            page_size: "500",
            oficina: ofi,
            search: q,
            dias,
            include_finalizadas: "0",
            include_canceladas: "1",
            compania: cia || "",
            baja_estado: "", // traemos todo; agrupamos Pendientes / Dadas de baja en el front
          },
          force: !!opts.force,
        })
      );
      loadGlobalTotals({ oficina: ofi, compania: cia, umbralDias: dias, search: q });
    },
    // 🚀 LA CURA: Quitamos 'page' de las dependencias. Usamos los valores actuales si no vienen en los overrides.
    // Esto evita que loadTableData se regenere y dispare otros efectos sin querer.
    [dispatch, pageSize, oficina, search, umbralDias, compania, activeTab, loadGlobalTotals, isWebAdmin, user] 
  );

  // 1. Carga inicial
  useEffect(() => { loadTableData(); }, [loadTableData]);
  useEffect(() => { dispatch(fetchBajasOficinas()); }, [dispatch]);
  
  useEffect(() => { 
    if (isWebAdmin) {
      localStorage.setItem(LS.oficina, oficina); 
    }
  }, [oficina, isWebAdmin]);

  // 2. 🚀 BÚSQUEDA BLINDADA: Usamos un ref para saber si el search realmente cambió por el usuario
  // o si es la primera vez que se monta.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadTableData({ force: true, overrides: { page: 1, search } });
    }, 400); // 400ms de debounce
    return () => clearTimeout(t);
  }, [search]); // 🚀 LA CURA 2: Solo depende de search. Si escribis, busca. Si cambiás de página, esto NO se ejecuta.

  const enriched = useMemo(() => {
    let data = (items || []).map((p) => {
      // 🎯 Regla unificada: días vencida = hoy − vencimiento de la última cuota
      const diasMora = getDiasVencida(p);
      const { nombre } = getClienteInfo(p);
      return {
        ...p,
        _clienteNombre: nombre,
        _diasMora: diasMora,
        _requiereBaja: true,
        _bajaStatus: p.baja_estado || STATUS.ENVIAR,
      };
    });

    if (sortConfig.key) {
      data.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === "string") return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      });
    }
    return data;
  }, [items, sortConfig]);

  const esDada = (s) => s === STATUS.ENVIADA || s === STATUS.REALIZADA;

  const filtered = enriched.filter((x) => {
    const enTab =
      activeTab === STATUS.ENVIAR
        ? x._bajaStatus === STATUS.ENVIAR
        : esDada(x._bajaStatus);
    return enTab && (compania === "" || x.compania === compania);
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const itemsPaginados = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Paginación: "Todas" = pageSize gigante → una sola página con todo.
  const verTodas = pageSize >= 100000;
  const desdeRow = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const hastaRow = Math.min(safePage * pageSize, totalFiltered);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleOpenHistory = async () => {
    setHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const data = await apiGet("bajas/historial/");
      if (data) setHistoryData(data.results || data);
    } catch (e) { console.error(e); } finally { setIsHistoryLoading(false); }
  };

  const updateBajaStatus = async (idsArray, nuevoEstado) => {
    try {
      await Promise.all(idsArray.map((id) => apiAction(`bajas/operativo/${id}/estado/`, "POST", { estado: nuevoEstado })));
      setSelectedIds(new Set());
      loadTableData({ force: true });
    } catch (e) { console.error(e); }
  };

  const generateAndDownloadExcel = async (rows) => {
    if (!rows || rows.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bajas por Mora");
    sheet.addRow(["Nombre y Apellido", "Patente", "Número de Póliza", "Compañía"]).eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    });
    rows.forEach(p => sheet.addRow([p._clienteNombre || "Asegurado", p.patente || "S/D", p.numero_poliza || "S/N", p.compania || "S/D"]));
    sheet.columns = [{ width: 35 }, { width: 15 }, { width: 25 }, { width: 25 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    link.setAttribute("download", `Bajas_${activeTab}_${new Date().toLocaleDateString()}.xlsx`);
    link.click();
  };

  // 🚀 NUEVA FUNCIÓN: Descarga el Excel directo desde el Backend
  const handleDownloadExcelFromBackend = async (e, tabId, isGlobal) => {
    e.stopPropagation(); // Evita que se active el click de la tarjeta (setActiveTab)
    if (downloadingTab) return;
    
    setDownloadingTab(tabId);
    try {
      const token = localStorage.getItem("access_token");
      const ofiFiltro = isGlobal ? "ALL" : (!isWebAdmin && user?.perfil?.oficina ? String(user.perfil.oficina.id || user.perfil.oficina) : oficina);
      
      // Mapeamos el nombre de la tarjeta para enviarlo a Django
      let estadoBackend = "UNIVERSO";
      if (tabId === STATUS.ENVIAR) estadoBackend = "PENDIENTES";
      if (tabId === STATUS.ENVIADA) estadoBackend = "ENVIADAS";
      if (tabId === STATUS.REALIZADA) estadoBackend = "REALIZADAS";

      const url = new URL(`${import.meta.env.VITE_API_URL}bajas/operativo/exportar-excel/`);
      url.searchParams.append("estado_tarjeta", estadoBackend);
      url.searchParams.append("dias", umbralDias);
      url.searchParams.append("include_canceladas", "1");
      
      if (ofiFiltro) url.searchParams.append("oficina", ofiFiltro);
      if (compania) url.searchParams.append("compania", compania);
      if (search) url.searchParams.append("search", search);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Error al descargar el Excel");

      const blob = await response.blob();
      
      // Capturamos el nombre de archivo desde el header si es posible
      let filename = `Bajas_${estadoBackend}_${new Date().toLocaleDateString()}.xlsx`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
          filename = disposition.split('filename=')[1].replace(/"/g, '');
      }

      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar el archivo Excel.");
    } finally {
      setDownloadingTab(null);
    }
  };

  const executeAction = async () => {
    const { type, ids } = confirmModal;
    const safeIds = ids.map(id => String(id));
    const rowsToExport = enriched.filter(p => safeIds.includes(String(p.id)));
    if (type === "EXCEL") {
      await generateAndDownloadExcel(rowsToExport);
      setSelectedIds(new Set());
    } else if (type === "DAR_BAJA") {
      // Un solo paso: baja el Excel para la compañía y marca como ENVIADA (guarda la fecha).
      await generateAndDownloadExcel(rowsToExport);
      await updateBajaStatus(safeIds, "ENVIADA");
    } else {
      await updateBajaStatus(safeIds, type);
      if (includeExcel) await generateAndDownloadExcel(rowsToExport);
    }
    closeConfirmModal();
  };

  const openConfirmModal = (type, ids) => { setIncludeExcel(false); setConfirmModal({ isOpen: true, type, ids }); };
  const closeConfirmModal = () => { setConfirmModal({ isOpen: false, type: "", ids: [] }); setIncludeExcel(false); };

  const MODAL_CONFIG = {
    DAR_BAJA: { title: "Dar de baja", desc: "Se descarga el Excel con las pólizas seleccionadas para mandar a la compañía, y quedan registradas como ENVIADAS con la fecha de hoy.", btnText: "Dar de baja y descargar", btnColor: "bg-rose-500 hover:bg-rose-400", icon: <HiPaperAirplane />, iconBg: "bg-rose-500/20 text-rose-400" },
    EXCEL: { title: "Confirmar Descarga", desc: "Generar Excel profesional con las pólizas seleccionadas.", btnText: "Descargar Excel", btnColor: "bg-emerald-500 hover:bg-emerald-400", icon: <HiDownload />, iconBg: "bg-emerald-500/20 text-emerald-400" },
    ENVIADA: { title: "Marcar Enviadas", desc: "¿Mover estas pólizas a la pestaña de 'Enviadas'?", btnText: "Sí, Marcar", btnColor: "bg-amber-500 hover:bg-amber-400", icon: <HiPaperAirplane />, iconBg: "bg-amber-500/20 text-amber-400" },
    REALIZADA: { title: "Marcar Realizadas", desc: "¿Confirmas que la compañía ya procesó definitivamente la baja?", btnText: "Sí, Realizada", btnColor: "bg-sky-500 hover:bg-sky-400", icon: <HiCheckCircle />, iconBg: "bg-sky-500/20 text-sky-400" },
  };

  const activeModalConfig = MODAL_CONFIG[confirmModal.type] || MODAL_CONFIG.EXCEL;

  // Dos tarjetas que funcionan como filtro: Pendientes / Dadas de baja
  const renderKpiRow = (kpisData, title, isGlobal = false) => (
    <div className="mb-6">
      {title && <h3 className="text-[11px] font-bold text-sky-400/80 uppercase tracking-[0.2em] mb-3 ml-1">{title}</h3>}
      <div className="grid grid-cols-2 gap-4">
        {[
          { id: STATUS.ENVIAR, label: "Pendientes", val: kpisData?.pendiente_envio || 0, text: "text-rose-400", activeCls: "bg-rose-500/10 border-rose-500/30" },
          { id: GRUPO_DADAS, label: "Dadas de baja", val: (kpisData?.enviada || 0) + (kpisData?.realizada || 0), text: "text-emerald-400", activeCls: "bg-emerald-500/10 border-emerald-500/30" },
        ].map((t) => {
          const isActive = !isGlobal && activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (!isGlobal) { setActiveTab(t.id); setPage(1); setSelectedIds(new Set()); }
              }}
              className={`p-5 rounded-2xl border text-left transition-all ${
                isActive ? t.activeCls : "bg-slate-900/40 border-white/5 opacity-70 hover:opacity-100"
              } ${isGlobal ? "cursor-default" : ""}`}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">{t.label}</div>
              <div className={`text-3xl font-black ${t.text}`}>{t.val}</div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-2xl border border-rose-500/30">
              <HiLightningBolt className="text-rose-500 text-2xl" />
            </div>
            Bajas por Mora
          </h1>
          <p className="text-slate-400 font-medium mt-1 ml-1">
            Pólizas candidatas a baja por deuda vencida. 
            {!isWebAdmin && <span className="text-sky-400 ml-2 font-bold uppercase tracking-widest text-[10px]">({user?.perfil?.oficina_nombre || "Tu Sucursal"})</span>}
          </p>
        </div>
        <button
          onClick={handleOpenHistory}
          className="group flex items-center gap-2 px-6 py-3 bg-slate-900/50 border border-white/10 text-white rounded-2xl hover:bg-sky-500/10 hover:border-sky-500/30 transition-all font-bold shadow-xl backdrop-blur-md"
        >
          <HiClipboardList className="text-xl text-sky-400 group-hover:scale-110 transition-transform" /> Ver Historial
        </button>
      </div>

      {/* 🚀 DOBLE FILA DE KPIs PARA EL ADMIN, FILA ÚNICA PARA SUCURSAL */}
      {isWebAdmin ? (
        <>
          {renderKpiRow(adminGlobalKpis, "Métricas Globales (Toda la Empresa)", true)}
          {renderKpiRow(sucursalKpis, "Métricas por Sucursal (Según filtro actual)", false)}
        </>
      ) : (
        renderKpiRow(sucursalKpis, null, false)
      )}

      <div className="bg-slate-900/40 backdrop-blur-2xl p-6 rounded-[3rem] border border-white/10 shadow-inner space-y-6">
        
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between border-b border-white/5 pb-6">
          <div className="text-xs font-bold text-sky-300 bg-sky-400/10 px-4 py-2 rounded-full border border-sky-400/20">
            {selectedIds.size} seleccionada{selectedIds.size === 1 ? "" : "s"}
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-center">
            <button
              disabled={!selectedIds.size}
              onClick={() => openConfirmModal("DAR_BAJA", Array.from(selectedIds))}
              className="px-7 py-3 bg-rose-600 text-white text-sm font-black uppercase tracking-wide rounded-2xl border border-rose-400/40 shadow-lg shadow-rose-500/30 hover:bg-rose-500 hover:shadow-rose-500/50 disabled:bg-rose-500/15 disabled:text-rose-300/40 disabled:shadow-none disabled:border-rose-500/20 transition-all flex items-center gap-2"
            >
              <HiPaperAirplane className="text-lg" /> Dar de baja ({selectedIds.size})
            </button>
            <button
              disabled={!selectedIds.size}
              onClick={() => openConfirmModal("EXCEL", Array.from(selectedIds))}
              className="px-5 py-2.5 bg-white/5 text-white/70 text-xs font-bold rounded-2xl border border-white/10 hover:bg-white/10 disabled:opacity-20 transition flex items-center gap-2"
            >
              <HiDownload className="text-lg" /> Solo Excel
            </button>
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 text-slate-500 hover:text-white text-xs font-bold uppercase transition-colors">Limpiar</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {isWebAdmin ? (
            <div className="md:col-span-3 group">
              <div className="relative">
                  <select
                  value={oficina}
                  onChange={(e) => { setOficina(e.target.value); setPage(1); loadTableData({ force: true, overrides: { oficina: e.target.value, page: 1 } }); }}
                  className="w-full bg-slate-950/40 border border-white/10 text-white rounded-[1.25rem] pl-11 pr-4 py-3.5 text-sm focus:border-sky-500/50 outline-none transition-all appearance-none cursor-pointer"
                  >
                      <option value="">Todas las Oficinas</option>
                      {oficinas.map((o) => <option key={o.id} value={o.id} className="bg-slate-900">{o.nombre}</option>)}
                  </select>
                  <HiFilter className="absolute left-4 top-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
              </div>
            </div>
          ) : (
             <div className="md:col-span-3 hidden md:block"></div>
          )}

          <div className="md:col-span-3 group">
            <div className="relative">
                <select
                value={compania}
                onChange={(e) => { setCompania(e.target.value); setPage(1); loadTableData({ force: true, overrides: { compania: e.target.value, page: 1 } }); }}
                className="w-full bg-slate-950/40 border border-white/10 text-white rounded-[1.25rem] pl-11 pr-4 py-3.5 text-sm focus:border-sky-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="">Todas las Compañías</option>
                    {companiasUnicas.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
                <HiFilter className="absolute left-4 top-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            </div>
          </div>

          <div className="md:col-span-4 relative group">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar patente, nombre o póliza..."
              className="w-full bg-slate-950/40 border border-white/10 text-white rounded-[1.25rem] pl-11 pr-4 py-3.5 text-sm focus:border-sky-500/50 focus:bg-slate-950/60 outline-none transition-all placeholder:text-slate-600"
            />
            <HiSearch className="absolute left-4 top-4 text-slate-600 group-focus-within:text-sky-400 transition-colors" />
          </div>

          <div className="md:col-span-2 relative group">
            <input
              type="number"
              value={umbralDias}
              onChange={(e) => { setUmbralDias(Number(e.target.value)); setPage(1); loadTableData({ force: true, overrides: { umbralDias: Number(e.target.value), page: 1 } }); }}
              className="w-full bg-slate-950/40 border border-white/10 text-white rounded-[1.25rem] pl-11 pr-4 py-3.5 text-sm focus:border-rose-500/50 outline-none font-bold transition-all"
            />
            <HiCalendar className="absolute left-4 top-4 text-slate-600 group-focus-within:text-rose-400 transition-colors" />
            <span className="absolute right-4 top-4 text-[9px] font-black text-slate-600 group-focus-within:text-rose-400 uppercase tracking-tighter pointer-events-none">DÍAS</span>
          </div>
        </div>

        <div className="relative min-h-[400px]">
          <BajasTable
            items={itemsPaginados}
            selectedIds={selectedIds}
            sortConfig={sortConfig}
            onSort={handleSort}
            onToggleSelect={(id) => setSelectedIds(prev => { 
                const n = new Set(prev); 
                const sid = String(id);
                n.has(sid) ? n.delete(sid) : n.add(sid); 
                return n; 
            })}
            onSelectAllVisible={(check) => setSelectedIds(check ? new Set(filtered.map(x => String(x.id))) : new Set())}
            onComposeEmail={(ids) => openConfirmModal("EXCEL", ids)}
            onSetStatus={(id, s) => openConfirmModal(s, [id])}
          />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5">
          <div className="flex items-center gap-4 bg-slate-950/30 px-6 py-3 rounded-[2rem] border border-white/5 shadow-lg">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-transparent text-white text-sm font-black outline-none cursor-pointer hover:text-sky-400 transition-colors"
            >
              {[15, 30, 50, 100].map(n => <option key={n} value={n} className="bg-slate-900">{n} filas</option>)}
              <option value={100000} className="bg-slate-900">Todas</option>
            </select>
            <span className="w-px h-5 bg-white/10" />
            <span className="text-[11px] font-bold text-slate-400">
              {totalFiltered === 0
                ? "Sin resultados"
                : <>Mostrando <span className="text-white">{desdeRow}–{hastaRow}</span> de <span className="text-sky-400">{totalFiltered}</span></>}
            </span>
          </div>

          {!verTodas && (
          <div className="flex items-center gap-4 group">
            {/* 🚀 BOTÓN PREVIOUS ARREGLADO */}
            <button
              disabled={safePage === 1}
              onClick={() => setPage(Math.max(1, safePage - 1))}
              className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-sky-500/10 hover:border-sky-500/40 disabled:opacity-20 text-white transition-all shadow-xl cursor-pointer disabled:cursor-not-allowed"
            >
              <HiChevronLeft size={22} />
            </button>
            
            <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest text-center">Pagina</span>
                <div className="text-xl font-black text-white bg-white/5 px-6 py-1 rounded-xl border border-white/10">
                    {safePage} <span className="text-slate-600 mx-1">/</span> {totalPages}
                </div>
            </div>
            
            {/* 🚀 BOTÓN NEXT ARREGLADO */}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              className="p-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-sky-500/10 hover:border-sky-500/40 disabled:opacity-20 text-white transition-all shadow-xl cursor-pointer disabled:cursor-not-allowed"
            >
              <HiChevronRight size={22} />
            </button>
          </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {historyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-sky-500/10 via-transparent to-transparent">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-3xl bg-sky-500/20 text-sky-400 shadow-inner ring-1 ring-sky-500/30">
                    <HiClipboardList className="text-3xl" />
                  </div>
                  <div>
                    <h2 className="font-black text-2xl text-white tracking-tight">Registro Maestro</h2>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Sincronización de Estados de Baja</p>
                  </div>
                </div>
                <button onClick={() => setHistoryModalOpen(false)} className="text-slate-600 hover:text-white transition-colors p-3 hover:bg-white/5 rounded-full"><HiX size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar bg-slate-950/20">
                {isHistoryLoading ? (
                  <div className="flex flex-col justify-center items-center h-60 gap-4">
                    <div className="w-14 h-14 border-[6px] border-sky-500/10 border-t-sky-500 rounded-full animate-spin shadow-lg"></div>
                    <span className="text-[11px] font-black text-sky-500/70 uppercase tracking-[0.3em] animate-pulse">Obteniendo logs...</span>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center text-slate-700 py-32 font-bold uppercase tracking-widest text-sm italic">Sin datos registrados.</div>
                ) : (
                  historyData.map((mov) => (
                    <div key={mov.id} className="bg-slate-800/20 border border-white/5 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-800/40 hover:border-white/10 transition-all shadow-sm group">
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-sky-500" />
                            {formatDateTime(mov.fecha)}
                        </div>
                        <div className="font-black text-slate-100 text-lg group-hover:text-white transition-colors">{mov.cliente_nombre} <span className="text-slate-500 font-medium text-sm ml-2">| {mov.compania}</span></div>
                        <div className="text-xs text-sky-400/80 font-black mt-2 bg-sky-500/5 w-fit px-4 py-1 rounded-xl border border-sky-500/10 uppercase tracking-tighter">
                          Póliza: {mov.poliza_numero || "S/N"} • Patente: {mov.patente || "S/D"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-3xl border border-white/5 shadow-inner">
                        <StatusBadge status={mov.estado_anterior} />
                        <HiChevronRight className="text-slate-700 text-xl" />
                        <StatusBadge status={mov.estado_nuevo} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]"
            >
              <div className="p-8 border-b border-white/5 bg-slate-800/30 flex items-center gap-5">
                <div className={`p-4 rounded-3xl ${activeModalConfig.iconBg} shadow-2xl ring-1 ring-white/5`}>{activeModalConfig.icon}</div>
                <div>
                  <h2 className="font-black text-xl text-white tracking-tight">{activeModalConfig.title}</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mt-1">{confirmModal.ids.length} SELECCIONADAS</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <p className="text-base text-slate-400 leading-relaxed font-semibold">{activeModalConfig.desc}</p>
                {(confirmModal.type === "ENVIADA" || confirmModal.type === "REALIZADA") && (
                  <label className="flex items-center gap-5 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl cursor-pointer hover:bg-emerald-500/10 transition-all group">
                    <input type="checkbox" checked={includeExcel} onChange={(e) => setIncludeExcel(e.target.checked)} className="w-6 h-6 accent-emerald-500 rounded-xl cursor-pointer" />
                    <span className="text-[13px] text-emerald-100 font-black uppercase tracking-tight group-hover:text-emerald-400 transition-colors">Generar reporte Excel simultáneamente</span>
                  </label>
                )}
              </div>
              <div className="p-6 bg-slate-950/60 border-t border-white/5 flex gap-4">
                <button onClick={closeConfirmModal} className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase rounded-2xl transition tracking-widest border border-white/5">Cerrar</button>
                <button onClick={executeAction} className={`flex-[2] px-6 py-4 text-white text-xs font-black uppercase rounded-2xl transition shadow-2xl tracking-[0.15em] ${includeExcel ? "bg-emerald-600 hover:bg-emerald-500" : activeModalConfig.btnColor}`}>
                  {includeExcel ? "PROCESAR Y DESCARGAR" : activeModalConfig.btnText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}