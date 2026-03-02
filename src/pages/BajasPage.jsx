// src/pages/BajasPage.js
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
} from "react-icons/hi";
import ExcelJS from "exceljs";

import {
  fetchBajas,
  fetchBajasOficinas,
  fetchBajasCounters,
  selectBajas,
  selectBajasCount,
  selectBajasOficinas,
  selectBajasCounters,
  apiGet,
  apiAction,
} from "../store/slices/bajasSlice";

import BajasTable from "../components/bajas/BajasTable";

const STATUS = {
  ENVIAR: "PENDIENTE_ENVIO",
  ENVIADA: "ENVIADA",
  REALIZADA: "REALIZADA",
};

const LS = {
  oficina: "scope.bajas.oficina",
};

// --- Helpers ---
function parseDateRobusta(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-").map(Number);
    return new Date(yy, mm - 1, dd);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

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

function StatusBadge({ status }) {
  const s = String(status || "");
  if (s === "REALIZADA")
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        Realizada
      </span>
    );
  if (s === "ENVIADA")
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
        Enviada
      </span>
    );
  if (s === "PENDIENTE_ENVIO")
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
        Pendiente
      </span>
    );
  if (!s)
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">
        Nuevo
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
      {s}
    </span>
  );
}

export default function BajasPage() {
  const dispatch = useDispatch();

  const items = useSelector(selectBajas);
  const totalItemsCount = useSelector(selectBajasCount);
  const oficinas = useSelector(selectBajasOficinas);
  const globalKpis = useSelector(selectBajasCounters);

  const [oficina, setOficina] = useState(() => localStorage.getItem(LS.oficina) || "");
  const [compania, setCompania] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(STATUS.ENVIAR);
  const [umbralDias, setUmbralDias] = useState(15);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [sortConfig, setSortConfig] = useState({ key: "_diasMora", direction: "desc" });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: "", ids: [] });
  const [includeExcel, setIncludeExcel] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ✅ NUEVO: loading para Excel total
  const [excelAllLoading, setExcelAllLoading] = useState(false);

  const companiasUnicas = useMemo(() => {
    const names = (items || []).map((p) => p.compania).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [items]);

  const loadGlobalTotals = useCallback(() => {
    dispatch(fetchBajasCounters({ dias: umbralDias }));
  }, [dispatch, umbralDias]);

  // ✅ FIX: acepta overrides para no depender del setState en el mismo click
  const loadTableData = useCallback(
    (opts = {}) => {
      const o = opts?.overrides || {};
      const tab = o.activeTab ?? activeTab;
      const cia = o.compania ?? compania;
      const dias = o.umbralDias ?? umbralDias;
      const q = o.search ?? search;
      const ofi = o.oficina ?? oficina;
      const pg = o.page ?? page;
      const ps = o.pageSize ?? pageSize;

      dispatch(
        fetchBajas({
          params: {
            page: String(pg),
            page_size: String(ps),
            oficina: ofi,
            search: q,
            dias,
            include_finalizadas: "0",
            compania: cia || "",
            baja_estado: tab && tab !== "TODAS" ? tab : "",
          },
          force: !!opts.force,
        })
      );

      loadGlobalTotals();
    },
    [dispatch, page, pageSize, oficina, search, umbralDias, compania, activeTab, loadGlobalTotals]
  );

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  useEffect(() => {
    dispatch(fetchBajasOficinas());
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem(LS.oficina, oficina);
  }, [oficina]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadTableData({ force: true, overrides: { page: 1, search } });
    }, 300);
    return () => clearTimeout(t);
  }, [search, loadTableData]);

  const enriched = useMemo(() => {
    const hoy = new Date();
    let data = (items || []).map((p) => {
      const proximaImpaga = parseDateRobusta(p.min_vto_impaga || p.proxima_vencimiento_impaga);
      const diasMora = proximaImpaga ? daysBetween(hoy, proximaImpaga) : 0;
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

        if (typeof valA === "string") {
          return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      });
    }

    return data;
  }, [items, sortConfig]);

  const filtered = enriched.filter(
    (x) =>
      (activeTab === "TODAS" || x._bajaStatus === activeTab) &&
      (compania === "" || x.compania === compania)
  );

  const totalPages = Math.ceil(totalItemsCount / pageSize) || 1;

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
    } catch (e) {
      console.error("Error cargando historial", e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const updateBajaStatus = async (idsArray, nuevoEstado) => {
    try {
      await Promise.all(
        idsArray.map((id) => apiAction(`bajas/operativo/${id}/estado/`, "POST", { estado: nuevoEstado }))
      );
      setSelectedIds(new Set());
      loadTableData({ force: true });
    } catch (e) {
      console.error("Error sincronizando estado:", e);
    }
  };

  // ✅ EXCEL: genera archivo
  const generateAndDownloadExcel = async (rows) => {
    if (!rows || rows.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Bajas por Mora");

    const headers = ["Nombre y Apellido", "Patente", "Número de Póliza", "Compañía"];
    const headerRow = sheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { horizontal: "center" };
    });

    rows.forEach((p) => {
      sheet.addRow([
        p._clienteNombre || `${p?.cliente_apellido || ""} ${p?.cliente_nombre || ""}`.trim() || "Asegurado",
        p.patente || "S/D",
        p.numero_poliza || "S/N",
        p.compania || "S/D",
      ]);
    });

    sheet.columns = [{ width: 35 }, { width: 15 }, { width: 25 }, { width: 25 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bajas_${activeTab}_${new Date().toLocaleDateString()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ NUEVO: traer TODO lo del tab (sin paginar) para que coincida con la TARJETA
  const fetchAllForActiveTab = useCallback(async () => {
    // Igual a counters: solo dias + baja_estado (no oficina/compañía/search)
    const tab = activeTab && activeTab !== "TODAS" ? activeTab : "";
    const baseParams = {
      dias: umbralDias,
      include_finalizadas: "0",
      ...(tab ? { baja_estado: tab } : {}),
      page: "1",
      page_size: "500",
    };

    let pageN = 1;
    let all = [];
    for (;;) {
      const data = await apiGet("bajas/operativo/", { ...baseParams, page: String(pageN) });
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      all = all.concat(results);

      // corte: si DRF paginado trae next
      if (data && typeof data === "object" && "next" in data) {
        if (!data.next) break;
      } else {
        // fallback por tamaño
        if (results.length < Number(baseParams.page_size)) break;
      }

      pageN += 1;
      if (pageN > 2000) break; // guard-rail
    }
    return all;
  }, [activeTab, umbralDias]);

  const handleExcelTotalTab = async () => {
    try {
      setExcelAllLoading(true);
      const allRows = await fetchAllForActiveTab();

      // enriquecemos nombre para el excel (igual que tu enriched)
      const hoy = new Date();
      const rows = allRows.map((p) => {
        const proximaImpaga = parseDateRobusta(p.min_vto_impaga || p.proxima_vencimiento_impaga);
        const diasMora = proximaImpaga ? daysBetween(hoy, proximaImpaga) : 0;
        const { nombre } = getClienteInfo(p);
        return { ...p, _clienteNombre: nombre, _diasMora: diasMora };
      });

      await generateAndDownloadExcel(rows);
    } catch (e) {
      console.error("Error exportando Excel total:", e);
      alert(`Error exportando Excel total: ${e?.message || e}`);
    } finally {
      setExcelAllLoading(false);
    }
  };

  const executeAction = async () => {
    const { type, ids } = confirmModal;
    const safeIds = ids.map((id) => String(id));
    const rowsToExport = enriched.filter((p) => safeIds.includes(String(p.id)));

    if (type === "EXCEL") {
      await generateAndDownloadExcel(rowsToExport);
      setSelectedIds(new Set());
    } else {
      await updateBajaStatus(safeIds, type);
      if (includeExcel) await generateAndDownloadExcel(rowsToExport);
    }
    setConfirmModal({ isOpen: false, type: "", ids: [] });
  };

  const openConfirmModal = (type, ids) => {
    if (!ids || ids.length === 0) return;
    setIncludeExcel(false);
    setConfirmModal({ isOpen: true, type, ids });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: "", ids: [] });
    setIncludeExcel(false);
  };

  const MODAL_CONFIG = {
    EXCEL: {
      title: "Confirmar Descarga",
      desc: "Generar Excel profesional con Nombre, Patente, Póliza y Compañía (solo seleccionadas).",
      btnText: "Sí, Descargar Excel",
      btnColor: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20",
      icon: <HiDownload className="text-xl" />,
      iconBg: "bg-emerald-500/20 text-emerald-400",
    },
    ENVIADA: {
      title: "Marcar como Enviadas",
      desc: "¿Mover estas pólizas a la pestaña de 'Enviadas'?",
      btnText: "Sí, Marcar Enviadas",
      btnColor: "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20",
      icon: <HiPaperAirplane className="text-xl" />,
      iconBg: "bg-amber-500/20 text-amber-400",
    },
    REALIZADA: {
      title: "Marcar como Realizadas",
      desc: "¿Confirmas que la compañía ya procesó definitivamente la baja?",
      btnText: "Sí, Marcar Realizadas",
      btnColor: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20",
      icon: <HiCheckCircle className="text-xl" />,
      iconBg: "bg-blue-500/20 text-blue-400",
    },
  };

  const activeModalConfig = MODAL_CONFIG[confirmModal.type] || MODAL_CONFIG.EXCEL;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Bajas por Mora</h1>
          <p className="text-sm text-slate-400">Total global en la empresa: {globalKpis.total} pólizas detectadas.</p>
        </div>
        <button
          onClick={handleOpenHistory}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition font-semibold"
        >
          <HiClipboardList className="text-xl text-blue-400" /> Ver Historial
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: STATUS.ENVIAR, label: "Pendientes", val: globalKpis.pendiente_envio, col: "text-red-400" },
          { id: STATUS.ENVIADA, label: "Enviadas", val: globalKpis.enviada, col: "text-amber-400" },
          { id: STATUS.REALIZADA, label: "Realizadas", val: globalKpis.realizada, col: "text-emerald-400" },
          { id: "TODAS", label: "Totales", val: globalKpis.total, col: "text-white" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              setPage(1);
              setSelectedIds(new Set());
              loadTableData({ force: true, overrides: { activeTab: t.id, page: 1 } });
            }}
            className={`p-4 rounded-xl border transition ${
              activeTab === t.id ? "bg-white/10 border-white/30" : "bg-white/5 border-transparent opacity-60"
            }`}
          >
            <div className="text-xs uppercase text-slate-400">{t.label}</div>
            <div className={`text-3xl font-bold ${t.col}`}>{t.val}</div>
          </button>
        ))}
      </div>

      {/* ✅ Barra acciones */}
      <div className="bg-slate-900 p-4 rounded-xl border border-white/10 flex flex-wrap gap-3 items-center">
        <div className="text-sm font-semibold text-slate-300 mr-auto">{selectedIds.size} pólizas seleccionadas</div>

        {/* ✅ NUEVO: Excel total para que coincida con la tarjeta */}
        <button
          disabled={excelAllLoading || (activeTab === "TODAS")}
          onClick={handleExcelTotalTab}
          className="px-5 py-2.5 bg-white/10 text-white font-bold rounded-lg hover:bg-white/15 disabled:opacity-30 transition flex items-center gap-2"
          title={activeTab === "TODAS" ? "Elegí una tarjeta (Pendientes/Enviadas/Realizadas) para exportar el total" : "Exporta TODO el total del tab (sin paginación) igual que la tarjeta"}
        >
          <HiDownload className="text-xl" />
          {excelAllLoading ? "Exportando total..." : "Excel (Total de la Tarjeta)"}
        </button>

        {/* Excel seleccionadas (igual que antes) */}
        <button
          disabled={!selectedIds.size}
          onClick={() => openConfirmModal("EXCEL", Array.from(selectedIds))}
          className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-30 transition flex items-center gap-2"
          title="Exporta solo lo seleccionado (normalmente una página)"
        >
          <HiDownload className="text-xl" /> Descargar Excel (Seleccionadas)
        </button>

        <button
          disabled={!selectedIds.size}
          onClick={() => openConfirmModal("ENVIADA", Array.from(selectedIds))}
          className="px-4 py-2 bg-amber-600/20 text-amber-200 rounded-lg disabled:opacity-30 hover:bg-amber-600/30 transition"
        >
          Marcar Enviadas
        </button>
        <button
          disabled={!selectedIds.size}
          onClick={() => openConfirmModal("REALIZADA", Array.from(selectedIds))}
          className="px-4 py-2 bg-blue-600/20 text-blue-200 rounded-lg disabled:opacity-30 hover:bg-blue-600/30 transition"
        >
          Marcar Realizadas
        </button>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-sm underline">
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/50 p-4 rounded-xl border border-white/5">
        <select
          value={oficina}
          onChange={(e) => {
            const v = e.target.value;
            setOficina(v);
            setPage(1);
            loadTableData({ force: true, overrides: { oficina: v, page: 1 } });
          }}
          className="md:col-span-3 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2"
        >
          <option value="">Todas las Oficinas</option>
          {oficinas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>

        <select
          value={compania}
          onChange={(e) => {
            const v = e.target.value;
            setCompania(v);
            setPage(1);
            loadTableData({ force: true, overrides: { compania: v, page: 1 } });
          }}
          className="md:col-span-3 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2"
        >
          <option value="">Todas las Compañías</option>
          {companiasUnicas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por patente, cliente..."
          className="md:col-span-4 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2"
        />

        <input
          type="number"
          value={umbralDias}
          onChange={(e) => {
            const v = Number(e.target.value);
            setUmbralDias(v);
            setPage(1);
            loadTableData({ force: true, overrides: { umbralDias: v, page: 1 } });
          }}
          className="md:col-span-2 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2"
          title="Mora ≥ N días"
        />
      </div>

      <div className="space-y-4">
        <BajasTable
          items={filtered}
          selectedIds={selectedIds}
          sortConfig={sortConfig}
          onSort={(key) =>
            setSortConfig((prev) => ({
              key,
              direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
            }))
          }
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const n = new Set(prev);
              n.has(String(id)) ? n.delete(String(id)) : n.add(String(id));
              return n;
            })
          }
          onSelectAllVisible={(check) => setSelectedIds(check ? new Set(filtered.map((x) => String(x.id))) : new Set())}
          onComposeEmail={(ids) => openConfirmModal("EXCEL", ids)}
          onSetStatus={(id, s) => openConfirmModal(s, [id])}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const ps = Number(e.target.value);
                setPageSize(ps);
                setPage(1);
                loadTableData({ force: true, overrides: { pageSize: ps, page: 1 } });
              }}
              className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-2 py-1"
            >
              {[15, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              disabled={page === 1}
              onClick={() => {
                const np = page - 1;
                setPage(np);
                loadTableData({ force: true, overrides: { page: np } });
              }}
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-20 text-white transition-colors"
            >
              <HiChevronLeft className="text-xl" />
            </button>
            <span className="text-sm text-white font-medium">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                const np = page + 1;
                setPage(np);
                loadTableData({ force: true, overrides: { page: np } });
              }}
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-20 text-white transition-colors"
            >
              <HiChevronRight className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* Historial Modal */}
      <AnimatePresence>
        {historyModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-800">
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <HiClipboardList className="text-xl" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Historial de Movimientos</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Registro automático de cambios de estado</p>
                  </div>
                </div>
                <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-white transition p-1">
                  <HiX className="text-xl" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50">
                {isHistoryLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center text-slate-500 py-10 italic">Aún no hay movimientos registrados en el historial.</div>
                ) : (
                  <div className="space-y-3">
                    {historyData.map((mov) => (
                      <div
                        key={mov.id}
                        className="bg-slate-800/50 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1">
                          <div className="text-xs text-slate-400 mb-1">{formatDateTime(mov.fecha)}</div>
                          <div className="font-semibold text-white text-sm">
                            {mov.cliente_nombre} <span className="text-slate-400 font-normal">| {mov.compania}</span>
                          </div>
                          <div className="text-xs text-blue-400 mt-1">
                            Póliza: {mov.poliza_numero || "S/N"} • Patente: {mov.patente || "S/D"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-900 py-2 px-3 rounded-lg border border-white/5">
                          <StatusBadge status={mov.estado_anterior} />
                          <HiChevronRight className="text-slate-500" />
                          <StatusBadge status={mov.estado_nuevo} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmación Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-start bg-slate-800">
                <div className="flex items-center gap-3 text-white">
                  <div className={`p-2 rounded-lg ${activeModalConfig.iconBg}`}>{activeModalConfig.icon}</div>
                  <div>
                    <h2 className="font-bold text-lg">{activeModalConfig.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">{confirmModal.ids.length} seleccionada/s</p>
                  </div>
                </div>
                <button onClick={closeConfirmModal} className="text-slate-400 hover:text-white transition p-1">
                  <HiX className="text-xl" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-300 leading-relaxed">{activeModalConfig.desc}</p>
                {confirmModal.type !== "EXCEL" && (
                  <label className="mt-4 flex items-center gap-3 cursor-pointer p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
                    <input
                      type="checkbox"
                      checked={includeExcel}
                      onChange={(e) => setIncludeExcel(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                    <span className="text-sm text-white font-medium">También descargar Excel (Nombre, Patente, Póliza, Cía)</span>
                  </label>
                )}
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-white/5 flex justify-end gap-3">
                <button onClick={closeConfirmModal} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition">
                  Cancelar
                </button>
                <button
                  onClick={executeAction}
                  className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition shadow-lg ${
                    includeExcel ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : activeModalConfig.btnColor
                  }`}
                >
                  {includeExcel ? "Marcar y Descargar" : activeModalConfig.btnText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}