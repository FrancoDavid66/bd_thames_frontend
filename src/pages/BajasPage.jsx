// src/pages/BajasPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  HiDownload,
  HiChevronRight,
  HiChevronLeft,
  HiPaperAirplane,
  HiClipboardList,
  HiCheckCircle,
  HiLightningBolt,
  HiSearch,
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
  selectBajasOficinas,
  selectBajasCounters,
  selectBajasGlobalCounters,
  apiGet,
  apiAction,
} from "../store/slices/bajasSlice";

import BajasTable from "../components/bajas/BajasTable";
import { useAuth } from "../context/AuthContext";

// 🦉 Componentes del design system Duo
import PageContainer from "../components/ui/PageContainer";
import CardDuo from "../components/ui/CardDuo";
import Boton3D from "../components/ui/Boton3D";
import Badge from "../components/ui/Badge";
import ModalDuo from "../components/ui/ModalDuo";

const STATUS = {
  ENVIAR: "PENDIENTE_ENVIO",
  ENVIADA: "ENVIADA",
  REALIZADA: "REALIZADA",
};

// Grupo que junta ENVIADA + REALIZADA bajo un solo concepto: "Dadas de baja"
const GRUPO_DADAS = "DADAS";

const LS = { oficina: "scope.bajas.oficina" };

const EMPTY_KPIS = { total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 };

// --- Helpers ---
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
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Estado del historial → tono Badge Duo.
function estadoHistorialTono(status) {
  const s = String(status || "");
  if (s === "ENVIADA") return "amarillo";
  if (s === "REALIZADA") return "verde";
  if (s === "PENDIENTE_ENVIO") return "rojo";
  return "neutro";
}
function estadoHistorialLabel(status) {
  const map = { PENDIENTE_ENVIO: "Pendiente", ENVIADA: "Enviada", REALIZADA: "Realizada" };
  return map[String(status || "")] || status || "—";
}

// Config de cada acción del modal de confirmación.
const MODAL_CONFIG = {
  DAR_BAJA: {
    title: "Dar de baja",
    desc: "Se descarga el Excel con las pólizas seleccionadas para mandar a la compañía, y quedan registradas como ENVIADAS con la fecha de hoy.",
    btnText: "Dar de baja y descargar",
    variant: "rojo", iconTono: "rojo", icon: <HiPaperAirplane />,
  },
  EXCEL: {
    title: "Confirmar descarga",
    desc: "Generar Excel profesional con las pólizas seleccionadas.",
    btnText: "Descargar Excel",
    variant: "verde", iconTono: "verde", icon: <HiDownload />,
  },
  ENVIADA: {
    title: "Marcar enviadas",
    desc: "¿Mover estas pólizas a la pestaña de 'Dadas de baja'?",
    btnText: "Sí, marcar",
    variant: "amarillo", iconTono: "amarillo", icon: <HiPaperAirplane />,
  },
  REALIZADA: {
    title: "Marcar realizadas",
    desc: "¿Confirmás que la compañía ya procesó definitivamente la baja?",
    btnText: "Sí, realizada",
    variant: "azul", iconTono: "azul", icon: <HiCheckCircle />,
  },
};

export default function BajasPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const items = useSelector(selectBajas);
  const oficinas = useSelector(selectBajasOficinas);

  const sucursalKpis = useSelector(selectBajasCounters) || EMPTY_KPIS;
  const adminGlobalKpis = useSelector(selectBajasGlobalCounters) || EMPTY_KPIS;

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

  const companiasUnicas = useMemo(() => {
    const names = (items || []).map((p) => p.compania).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [items]);

  const loadGlobalTotals = useCallback((opts = {}) => {
    const ofi = opts.oficina !== undefined ? opts.oficina : (!isWebAdmin && user?.perfil?.oficina ? String(user.perfil.oficina.id || user.perfil.oficina) : oficina);
    const cia = opts.compania !== undefined ? opts.compania : compania;
    const d = opts.umbralDias !== undefined ? opts.umbralDias : umbralDias;
    const q = opts.search !== undefined ? opts.search : search;

    dispatch(fetchBajasCounters({ dias: d, oficina: ofi, compania: cia, search: q, include_canceladas: "1" }));
    if (isWebAdmin) {
      dispatch(fetchBajasGlobalCounters({ dias: d, compania: cia, search: q, include_canceladas: "1" }));
    }
  }, [dispatch, umbralDias, oficina, compania, search, isWebAdmin, user]);

  const loadTableData = useCallback(
    (opts = {}) => {
      const o = opts?.overrides || {};
      const cia = o.compania ?? compania;
      const dias = o.umbralDias ?? umbralDias;
      const q = o.search ?? search;

      const ofi = !isWebAdmin && user?.perfil?.oficina
        ? String(user.perfil.oficina.id || user.perfil.oficina)
        : (o.oficina ?? oficina);

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
    [dispatch, oficina, search, umbralDias, compania, loadGlobalTotals, isWebAdmin, user]
  );

  // 1. Carga inicial
  useEffect(() => { loadTableData(); }, [loadTableData]);
  useEffect(() => { dispatch(fetchBajasOficinas()); }, [dispatch]);

  useEffect(() => {
    if (isWebAdmin) localStorage.setItem(LS.oficina, oficina);
  }, [oficina, isWebAdmin]);

  // 2. Búsqueda con debounce (solo depende de search)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadTableData({ force: true, overrides: { page: 1, search } });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const enriched = useMemo(() => {
    let data = (items || []).map((p) => {
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

  const filtered = useMemo(() => enriched.filter((x) => {
    const enTab = activeTab === STATUS.ENVIAR
      ? x._bajaStatus === STATUS.ENVIAR
      : esDada(x._bajaStatus);
    return enTab && (compania === "" || x.compania === compania);
  }), [enriched, activeTab, compania]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const itemsPaginados = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const verTodas = pageSize >= 100000;
  const desdeRow = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const hastaRow = Math.min(safePage * pageSize, totalFiltered);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleOpenHistory = useCallback(async () => {
    setHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const data = await apiGet("bajas/historial/");
      if (data) setHistoryData(data.results || data);
    } catch (e) { console.error(e); } finally { setIsHistoryLoading(false); }
  }, []);

  const updateBajaStatus = useCallback(async (idsArray, nuevoEstado) => {
    try {
      await Promise.all(idsArray.map((id) => apiAction(`bajas/operativo/${id}/estado/`, "POST", { estado: nuevoEstado })));
      setSelectedIds(new Set());
      loadTableData({ force: true });
    } catch (e) { console.error(e); }
  }, [loadTableData]);

  const generateAndDownloadExcel = useCallback(async (rows) => {
    if (!rows || rows.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bajas por Mora");
    sheet.addRow(["Nombre y Apellido", "Patente", "Número de Póliza", "Compañía"]).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF58CC02" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    });
    rows.forEach((p) => sheet.addRow([p._clienteNombre || "Asegurado", p.patente || "S/D", p.numero_poliza || "S/N", p.compania || "S/D"]));
    sheet.columns = [{ width: 35 }, { width: 15 }, { width: 25 }, { width: 25 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    link.setAttribute("download", `Bajas_${activeTab}_${new Date().toLocaleDateString()}.xlsx`);
    link.click();
  }, [activeTab]);

  const executeAction = useCallback(async () => {
    const { type, ids } = confirmModal;
    const safeIds = ids.map((id) => String(id));
    const rowsToExport = enriched.filter((p) => safeIds.includes(String(p.id)));
    if (type === "EXCEL") {
      await generateAndDownloadExcel(rowsToExport);
      setSelectedIds(new Set());
    } else if (type === "DAR_BAJA") {
      await generateAndDownloadExcel(rowsToExport);
      await updateBajaStatus(safeIds, "ENVIADA");
    } else {
      await updateBajaStatus(safeIds, type);
      if (includeExcel) await generateAndDownloadExcel(rowsToExport);
    }
    setConfirmModal({ isOpen: false, type: "", ids: [] });
    setIncludeExcel(false);
  }, [confirmModal, enriched, includeExcel, generateAndDownloadExcel, updateBajaStatus]);

  const openConfirmModal = useCallback((type, ids) => {
    setIncludeExcel(false);
    setConfirmModal({ isOpen: true, type, ids });
  }, []);
  const closeConfirmModal = useCallback(() => {
    setConfirmModal({ isOpen: false, type: "", ids: [] });
    setIncludeExcel(false);
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      const sid = String(id);
      n.has(sid) ? n.delete(sid) : n.add(sid);
      return n;
    });
  }, []);

  const activeModalConfig = MODAL_CONFIG[confirmModal.type] || MODAL_CONFIG.EXCEL;

  // 🎯 KPIs compactos como CHIPS horizontales (Pendientes / Dadas de baja).
  //    Cada chip funciona como filtro: al clickearlo cambia el tab activo.
  const renderKpiChips = (kpisData, isGlobal = false) => {
    const chips = [
      { id: STATUS.ENVIAR, label: "Pendientes", val: kpisData?.pendiente_envio || 0, tono: "rojo" },
      { id: GRUPO_DADAS, label: "Dadas de baja", val: (kpisData?.enviada || 0) + (kpisData?.realizada || 0), tono: "verde" },
    ];
    return (
      <div className="flex gap-3 flex-wrap">
        {chips.map((t) => {
          const isActive = !isGlobal && activeTab === t.id;
          const dotCls = t.tono === "rojo" ? "bg-duo-rojo" : "bg-duo-verde";
          const numCls = t.tono === "rojo" ? "text-duo-rojo" : "text-duo-verde-sombra dark:text-duo-verde";
          const activeCls = isActive
            ? (t.tono === "rojo"
              ? "border-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
              : "border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]")
            : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-suave dark:hover:border-suave-dark";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { if (!isGlobal) { setActiveTab(t.id); setPage(1); setSelectedIds(new Set()); } }}
              className={`flex-1 min-w-[160px] flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${activeCls} ${isGlobal ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotCls}`} />
              <span className={`text-2xl font-black leading-none ${numCls}`}>{t.val}</span>
              <span className="text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark text-left leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const pageSizeOptions = [15, 30, 50, 100];

  // Clases compartidas para los inputs/selects compactos de la barra de filtros.
  const inpCompact = "h-10 rounded-xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark text-[13px] font-bold outline-none focus:border-duo-azul transition-colors";

  return (
    <PageContainer width="lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-titulo dark:text-titulo-dark tracking-tight flex items-center gap-3">
            <span className="h-11 w-11 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] flex items-center justify-center">
              <HiLightningBolt className="text-duo-rojo text-2xl" />
            </span>
            Bajas por Mora
          </h1>
          <p className="text-suave dark:text-suave-dark font-bold mt-1 ml-1 text-sm">
            Pólizas candidatas a baja por deuda vencida.
            {!isWebAdmin && <span className="text-duo-azul ml-2 font-black uppercase tracking-widest text-[10px]">({user?.perfil?.oficina_nombre || "Tu Sucursal"})</span>}
          </p>
        </div>
        <Boton3D variant="blanco" size="sm" onClick={handleOpenHistory}>
          <HiClipboardList className="text-lg" /> Ver Historial
        </Boton3D>
      </div>

      {/* KPIs compactos (chips) */}
      {isWebAdmin ? (
        <div className="space-y-3 mb-5">
          <div>
            <h3 className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-[0.2em] mb-2 ml-1">Global (Toda la Empresa)</h3>
            {renderKpiChips(adminGlobalKpis, true)}
          </div>
          <div>
            <h3 className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-[0.2em] mb-2 ml-1">Sucursal (Según filtro)</h3>
            {renderKpiChips(sucursalKpis, false)}
          </div>
        </div>
      ) : (
        <div className="mb-5">{renderKpiChips(sucursalKpis, false)}</div>
      )}

      {/* Panel principal */}
      <CardDuo className="p-4 sm:p-5 space-y-4">

        {/* Barra de acciones */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Badge tono="azul">
            {selectedIds.size} seleccionada{selectedIds.size === 1 ? "" : "s"}
          </Badge>

          <div className="flex flex-wrap gap-2">
            <Boton3D
              variant="rojo"
              size="sm"
              disabled={!selectedIds.size}
              onClick={() => openConfirmModal("DAR_BAJA", Array.from(selectedIds))}
            >
              <HiPaperAirplane className="text-base" /> Dar de baja ({selectedIds.size})
            </Boton3D>
            <Boton3D
              variant="blanco"
              size="sm"
              disabled={!selectedIds.size}
              onClick={() => openConfirmModal("EXCEL", Array.from(selectedIds))}
            >
              <HiDownload className="text-base" /> Solo Excel
            </Boton3D>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark text-xs font-black uppercase transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Filtros compactos (barra baja) */}
        <div className="flex flex-wrap items-center gap-2.5 p-3 bg-surface dark:bg-surface-dark rounded-2xl border-2 border-linea dark:border-linea-dark">
          {/* Búsqueda (se estira) */}
          <div className="relative flex-1 min-w-[200px]">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar patente, nombre o póliza..."
              className={`${inpCompact} w-full pl-9 pr-3 placeholder:text-suave dark:placeholder:text-suave-dark placeholder:font-normal`}
            />
          </div>

          {isWebAdmin && (
            <select
              value={oficina}
              onChange={(e) => { setOficina(e.target.value); setPage(1); loadTableData({ force: true, overrides: { oficina: e.target.value, page: 1 } }); }}
              className={`${inpCompact} min-w-[150px] px-3 cursor-pointer`}
            >
              <option value="">Todas las Oficinas</option>
              {oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          )}

          <select
            value={compania}
            onChange={(e) => { setCompania(e.target.value); setPage(1); loadTableData({ force: true, overrides: { compania: e.target.value, page: 1 } }); }}
            className={`${inpCompact} min-w-[150px] px-3 cursor-pointer`}
          >
            <option value="">Todas las Compañías</option>
            {companiasUnicas.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={umbralDias}
              onChange={(e) => { setUmbralDias(Number(e.target.value)); setPage(1); loadTableData({ force: true, overrides: { umbralDias: Number(e.target.value), page: 1 } }); }}
              className={`${inpCompact} w-[70px] px-3 text-center`}
            />
            <span className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wide">días</span>
          </div>
        </div>

        {/* Tabla */}
        <div className="relative min-h-[400px]">
          <BajasTable
            items={itemsPaginados}
            selectedIds={selectedIds}
            sortConfig={sortConfig}
            onSort={handleSort}
            onToggleSelect={toggleSelect}
            onSelectAllVisible={(check) => setSelectedIds(check ? new Set(filtered.map((x) => String(x.id))) : new Set())}
          />
        </div>

        {/* Paginación */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-linea dark:border-linea-dark">
          <div className="flex items-center gap-3 bg-surface dark:bg-surface-dark px-4 py-2.5 rounded-2xl border-2 border-linea dark:border-linea-dark">
            <span className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-[0.2em]">Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-transparent text-titulo dark:text-titulo-dark text-sm font-black outline-none cursor-pointer"
            >
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n} filas</option>)}
              <option value={100000}>Todas</option>
            </select>
            <span className="w-px h-5 bg-linea dark:bg-linea-dark" />
            <span className="text-[11px] font-bold text-suave dark:text-suave-dark">
              {totalFiltered === 0
                ? "Sin resultados"
                : <>Mostrando <span className="text-titulo dark:text-titulo-dark">{desdeRow}–{hastaRow}</span> de <span className="text-duo-azul">{totalFiltered}</span></>}
            </span>
          </div>

          {!verTodas && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                className="h-11 w-11 flex items-center justify-center bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl hover:border-duo-azul disabled:opacity-30 text-titulo dark:text-titulo-dark transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <HiChevronLeft size={20} />
              </button>

              <div className="flex flex-col items-center min-w-[80px]">
                <span className="text-[10px] font-black text-suave dark:text-suave-dark uppercase mb-0.5 tracking-widest">Página</span>
                <div className="text-base font-black text-titulo dark:text-titulo-dark">
                  {safePage} <span className="text-suave dark:text-suave-dark mx-1">/</span> {totalPages}
                </div>
              </div>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                className="h-11 w-11 flex items-center justify-center bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl hover:border-duo-azul disabled:opacity-30 text-titulo dark:text-titulo-dark transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <HiChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </CardDuo>

      {/* Modal Historial */}
      <ModalDuo
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Registro Maestro"
        subtitle="Historial de estados de baja"
        icon={<HiClipboardList />}
        iconTono="azul"
        size="lg"
      >
        {isHistoryLoading ? (
          <div className="flex flex-col justify-center items-center h-60 gap-4">
            <div className="w-12 h-12 border-4 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin" />
            <span className="text-[11px] font-black text-duo-azul uppercase tracking-[0.3em]">Obteniendo logs...</span>
          </div>
        ) : historyData.length === 0 ? (
          <div className="text-center text-suave dark:text-suave-dark py-24 font-black uppercase tracking-widest text-sm">Sin datos registrados.</div>
        ) : (
          <div className="space-y-3">
            {historyData.map((mov) => (
              <CardDuo key={mov.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-duo-azul" />
                    {formatDateTime(mov.fecha)}
                  </div>
                  <div className="font-black text-titulo dark:text-titulo-dark text-base">
                    {mov.cliente_nombre} <span className="text-suave dark:text-suave-dark font-bold text-sm ml-2">| {mov.compania}</span>
                  </div>
                  <div className="text-xs text-duo-azul font-black mt-2 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] w-fit px-3 py-1 rounded-lg uppercase tracking-tight">
                    Póliza: {mov.poliza_numero || "S/N"} • Patente: {mov.patente || "S/D"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge tono={estadoHistorialTono(mov.estado_anterior)} size="sm">{estadoHistorialLabel(mov.estado_anterior)}</Badge>
                  <HiChevronRight className="text-suave dark:text-suave-dark text-lg" />
                  <Badge tono={estadoHistorialTono(mov.estado_nuevo)} size="sm">{estadoHistorialLabel(mov.estado_nuevo)}</Badge>
                </div>
              </CardDuo>
            ))}
          </div>
        )}
      </ModalDuo>

      {/* Modal Confirmación */}
      <ModalDuo
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        title={activeModalConfig.title}
        subtitle={`${confirmModal.ids.length} seleccionada${confirmModal.ids.length === 1 ? "" : "s"}`}
        icon={activeModalConfig.icon}
        iconTono={activeModalConfig.iconTono}
        size="sm"
        footer={
          <>
            <Boton3D variant="blanco" size="sm" onClick={closeConfirmModal}>Cerrar</Boton3D>
            <Boton3D variant={includeExcel ? "verde" : activeModalConfig.variant} size="sm" onClick={executeAction}>
              {includeExcel ? "Procesar y descargar" : activeModalConfig.btnText}
            </Boton3D>
          </>
        }
      >
        <p className="text-[15px] text-suave dark:text-suave-dark leading-relaxed font-bold">{activeModalConfig.desc}</p>
        {(confirmModal.type === "ENVIADA" || confirmModal.type === "REALIZADA") && (
          <label className="mt-5 flex items-center gap-4 p-4 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={includeExcel}
              onChange={(e) => setIncludeExcel(e.target.checked)}
              className="w-6 h-6 accent-duo-verde rounded-lg cursor-pointer"
            />
            <span className="text-[13px] text-duo-verde-sombra dark:text-duo-verde font-black uppercase tracking-tight">
              Generar reporte Excel simultáneamente
            </span>
          </label>
        )}
      </ModalDuo>
    </PageContainer>
  );
}