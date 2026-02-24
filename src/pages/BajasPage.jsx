// src/pages/BajasPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiDownload, HiChevronRight, HiChevronLeft, HiX, 
  HiExclamation, HiCheckCircle, HiPaperAirplane, HiClipboardList 
} from "react-icons/hi";
import ExcelJS from "exceljs";

import {
  fetchBajas,
  fetchBajasOficinas,
  selectBajas,
  selectBajasCount,
  selectBajasOficinas,
  apiGet,    // ✅ Importamos la utilidad oficial corregida para producción
  apiAction  // ✅ Importamos la utilidad oficial corregida para producción
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
  if (!a || !b) return null;
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function pickFirstNonEmpty(...vals) {
  return vals.find(v => v !== undefined && v !== null && String(v).trim() !== "") || "";
}

function getImpagasCount(p) {
  const cand = [p?.impagas_count, p?.impagas, p?.cuotas_impagas];
  for (const v of cand) {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function getClienteInfo(p) {
  const nombre = (p?.cliente_nombre_completo || `${p?.cliente_apellido || ''} ${p?.cliente_nombre || ''}`).trim() || "Asegurado";
  const dni = p?.cliente_dni || "—";
  const tel = pickFirstNonEmpty(p?.cliente_telefono, p?.cliente_celular, p?.cliente_whatsapp, "—");
  return { nombre, dni, tel };
}

function formatDateStr(dateStr) {
  if (!dateStr) return "—";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("es-AR", { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
}

function StatusBadge({ status }) {
  const s = String(status || "");
  if (s === "REALIZADA") return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Realizada</span>;
  if (s === "ENVIADA") return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">Enviada</span>;
  if (s === "PENDIENTE_ENVIO") return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">Pendiente</span>;
  if (!s) return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">Nuevo</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">{s}</span>;
}

export default function BajasPage() {
  const dispatch = useDispatch();

  const items = useSelector(selectBajas);
  const totalItemsCount = useSelector(selectBajasCount);
  const oficinas = useSelector(selectBajasOficinas);

  const [oficina, setOficina] = useState(() => localStorage.getItem(LS.oficina) || "");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(STATUS.ENVIAR);
  const [umbralDias, setUmbralDias] = useState(15);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [globalKpis, setGlobalKpis] = useState({ total: 0, pendiente_envio: 0, enviada: 0, realizada: 0 });

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: "", ids: [] });
  const [includeExcel, setIncludeExcel] = useState(false);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // ✅ USAMOS apiGet PARA LOS CONTADORES (Soluciona el error 404)
  const fetchGlobalCounters = useCallback(async () => {
    try {
      const data = await apiGet("bajas/operativo/counters/", { dias: umbralDias, oficina, search });
      if (data) setGlobalKpis(data);
    } catch (e) { console.error("Error cargando contadores:", e); }
  }, [umbralDias, oficina, search]);

  const load = useCallback((opts = {}) => {
    dispatch(fetchBajas({ 
      params: { 
        page: String(page), 
        page_size: String(pageSize), 
        oficina, 
        search, 
        dias: umbralDias,
        include_finalizadas: "0" 
      }, 
      force: !!opts.force 
    }));
    fetchGlobalCounters();
  }, [dispatch, page, pageSize, oficina, search, umbralDias, fetchGlobalCounters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { dispatch(fetchBajasOficinas()); }, [dispatch]);
  useEffect(() => { localStorage.setItem(LS.oficina, oficina); }, [oficina]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load({ force: true }); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ✅ USAMOS apiGet PARA EL HISTORIAL (Soluciona el error 404)
  const handleOpenHistory = async () => {
    setHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const data = await apiGet("bajas/historial/");
      if (data) {
        setHistoryData(data.results || data); 
      }
    } catch (e) {
      console.error("Error cargando historial", e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const enriched = useMemo(() => {
    const hoy = new Date();
    return (items || []).map((p) => {
      const proximaImpaga = parseDateRobusta(p.min_vto_impaga || p.proxima_vencimiento_impaga);
      const diasMora = proximaImpaga ? daysBetween(hoy, proximaImpaga) : null;
      return { 
        ...p, 
        _diasMora: diasMora, 
        _requiereBaja: true, 
        _bajaStatus: p.baja_estado || STATUS.ENVIAR
      };
    }).sort((a, b) => (b._diasMora ?? -1) - (a._diasMora ?? -1));
  }, [items]);

  const filtered = enriched.filter(x => x._requiereBaja && (activeTab === "TODAS" || x._bajaStatus === activeTab));
  const totalPages = Math.ceil(totalItemsCount / pageSize) || 1;

  // ✅ USAMOS apiAction PARA ACTUALIZAR EL ESTADO (Soluciona el error 404)
  const updateBajaStatus = async (idsArray, nuevoEstado) => {
    try {
      await Promise.all(idsArray.map(id => 
        apiAction(`bajas/operativo/${id}/estado/`, "POST", { estado: nuevoEstado })
      ));
      setSelectedIds(new Set());
      load({ force: true });
    } catch (e) { console.error("Error sincronizando estado:", e); }
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

  const generateAndDownloadExcel = async (rows, idsToDownload) => {
    if (!rows || rows.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bajas por Mora', { views: [{ showGridLines: false }] });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'REPORTE DE SOLICITUDES DE BAJA POR MORA';
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; 
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('A2:I2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Documento generado el: ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}`;
    dateCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
    dateCell.alignment = { horizontal: 'right' };

    sheet.addRow([]);

    const headers = ["Asegurado", "DNI", "Teléfono", "Compañía", "Nro Póliza", "Patente", "Vencimiento Impago", "Días Mora", "Cuotas Adeudadas"];
    const headerRow = sheet.addRow(headers);
    
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; 
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Calibri', size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'medium' }, left: { style: 'thin' }, bottom: { style: 'medium' }, right: { style: 'thin' } };
    });

    rows.forEach((p, index) => {
      const { nombre, dni, tel } = getClienteInfo(p);
      const row = sheet.addRow([
        nombre, dni, tel, p.compania || 'S/D', p.numero_poliza || 'S/N', p.patente || 'S/D',
        formatDateStr(p.min_vto_impaga || p.proxima_vencimiento_impaga),
        Number(p._diasMora || 0), Number(getImpagasCount(p))
      ]);

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 11 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if ([2, 3, 6, 7, 8, 9].includes(colNumber)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else cell.alignment = { vertical: 'middle' };
        
        if (index % 2 !== 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    });

    sheet.autoFilter = 'A4:I4'; 
    sheet.columns = [
      { width: 35 }, { width: 15 }, { width: 18 }, { width: 25 }, { width: 25 }, 
      { width: 12 }, { width: 20 }, { width: 12 }, { width: 18 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
    const suffix = idsToDownload.length === 1 ? `_Poliza_${rows[0].numero_poliza || rows[0].patente}` : `_Masivo`;
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bajas_Mora_${today}${suffix}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeAction = async () => {
    const { type, ids } = confirmModal;
    const safeIds = ids.map(id => String(id));
    const rowsToExport = enriched.filter(p => safeIds.includes(String(p.id)));

    if (type === "EXCEL") {
      await generateAndDownloadExcel(rowsToExport, safeIds);
      setSelectedIds(new Set()); 
    } else {
      await updateBajaStatus(safeIds, type);
      if (includeExcel) {
        await generateAndDownloadExcel(rowsToExport, safeIds);
      }
    }
    closeConfirmModal();
  };

  const MODAL_CONFIG = {
    EXCEL: {
      title: "Confirmar Descarga",
      desc: "Vas a generar un archivo Excel profesional (.xlsx) con los datos de las pólizas seleccionadas.",
      warning: "", 
      btnText: "Sí, Descargar Excel",
      btnColor: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20",
      icon: <HiDownload className="text-xl" />,
      iconBg: "bg-emerald-500/20 text-emerald-400"
    },
    ENVIADA: {
      title: "Marcar como Enviadas",
      desc: "¿Estás seguro que deseas mover estas pólizas a la pestaña de 'Enviadas'?",
      warning: "Esto indica que ya gestionaste la solicitud de baja ante la aseguradora.",
      btnText: "Sí, Marcar Enviadas",
      btnColor: "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20",
      icon: <HiPaperAirplane className="text-xl" />,
      iconBg: "bg-amber-500/20 text-amber-400"
    },
    REALIZADA: {
      title: "Marcar como Realizadas",
      desc: "¿Confirmas que la compañía ya procesó definitivamente la baja de estas pólizas?",
      warning: "Al marcarlas como realizadas, el proceso se dará por finalizado en el sistema.",
      btnText: "Sí, Marcar Realizadas",
      btnColor: "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20",
      icon: <HiCheckCircle className="text-xl" />,
      iconBg: "bg-blue-500/20 text-blue-400"
    }
  };

  const activeModalConfig = MODAL_CONFIG[confirmModal.type] || MODAL_CONFIG.EXCEL;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Bajas por Mora</h1>
          <p className="text-sm text-slate-400">Total detectado: {globalKpis.total} pólizas.</p>
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
          { id: "TODAS", label: "Totales", val: globalKpis.total, col: "text-white" }
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setPage(1); setSelectedIds(new Set()); }} className={`p-4 rounded-xl border transition ${activeTab === t.id ? "bg-white/10 border-white/30" : "bg-white/5 border-transparent opacity-60"}`}>
            <div className="text-xs uppercase text-slate-400">{t.label}</div>
            <div className={`text-3xl font-bold ${t.col}`}>{t.val}</div>
          </button>
        ))}
      </div>

      <div className="bg-slate-900 p-4 rounded-xl border border-white/10 flex flex-wrap gap-3 items-center">
        <div className="text-sm font-semibold text-slate-300 mr-auto">
          {selectedIds.size} pólizas seleccionadas
        </div>
        
        <button 
          disabled={!selectedIds.size} 
          onClick={() => openConfirmModal("EXCEL", Array.from(selectedIds))} 
          className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 disabled:opacity-30 transition flex items-center gap-2"
        >
          <HiDownload className="text-xl" /> Descargar Excel
        </button>

        <button disabled={!selectedIds.size} onClick={() => openConfirmModal("ENVIADA", Array.from(selectedIds))} className="px-4 py-2 bg-amber-600/20 text-amber-200 rounded-lg disabled:opacity-30 hover:bg-amber-600/30 transition">Marcar Enviadas</button>
        <button disabled={!selectedIds.size} onClick={() => openConfirmModal("REALIZADA", Array.from(selectedIds))} className="px-4 py-2 bg-blue-600/20 text-blue-200 rounded-lg disabled:opacity-30 hover:bg-blue-600/30 transition">Marcar Realizadas</button>
        {selectedIds.size > 0 && <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-sm underline">Limpiar</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/50 p-4 rounded-xl border border-white/5">
        <select value={oficina} onChange={e => { setOficina(e.target.value); setPage(1); }} className="md:col-span-3 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2">
          <option value="">Todas las Oficinas</option>
          {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por patente, cliente..." className="md:col-span-7 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2" />
        <input type="number" value={umbralDias} onChange={e => { setUmbralDias(Number(e.target.value)); setPage(1); }} className="md:col-span-2 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2" title="Mora ≥ N días" />
      </div>

      <div className="space-y-4">
        <BajasTable 
          items={filtered} 
          selectedIds={selectedIds} 
          onToggleSelect={id => setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(String(id)) ? n.delete(String(id)) : n.add(String(id));
            return n;
          })}
          onSelectAllVisible={check => setSelectedIds(check ? new Set(filtered.map(x => String(x.id))) : new Set())}
          onComposeEmail={ids => openConfirmModal("EXCEL", ids)}
          onSetStatus={(id, s) => openConfirmModal(s, [id])}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Filas:</span>
            <select 
              value={pageSize} 
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-2 py-1 outline-none focus:border-blue-500"
            >
              {[15, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-20 text-white transition-colors">
              <HiChevronLeft className="text-xl" />
            </button>
            <span className="text-sm text-white font-medium">Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-20 text-white transition-colors">
              <HiChevronRight className="text-xl" />
            </button>
          </div>
        </div>
      </div>

      {/* --- MODAL DE HISTORIAL --- */}
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
                  <div className="text-center text-slate-500 py-10 italic">
                    Aún no hay movimientos registrados en el historial.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.map((mov) => (
                      <div key={mov.id} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs text-slate-400 mb-1">{formatDateTime(mov.fecha)}</div>
                          <div className="font-semibold text-white text-sm">
                            {mov.cliente_nombre} <span className="text-slate-400 font-normal">| {mov.compania}</span>
                          </div>
                          <div className="text-xs text-blue-400 mt-1">
                            Póliza: {mov.poliza_numero || 'S/N'} • Patente: {mov.patente || 'S/D'}
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

      {/* --- MODAL UNIVERSAL DE CONFIRMACIÓN --- */}
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
                  <div className={`p-2 rounded-lg ${activeModalConfig.iconBg}`}>
                    {activeModalConfig.icon}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{activeModalConfig.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {confirmModal.ids.length} {confirmModal.ids.length === 1 ? "póliza seleccionada" : "pólizas seleccionadas"}
                    </p>
                  </div>
                </div>
                <button onClick={closeConfirmModal} className="text-slate-400 hover:text-white transition p-1">
                  <HiX className="text-xl" />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {activeModalConfig.desc}
                </p>
                
                {activeModalConfig.warning && (
                  <div className="mt-4 flex items-start gap-2 bg-white/5 border border-white/10 p-3 rounded-xl">
                    <HiExclamation className="text-amber-400 text-xl flex-shrink-0" />
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeModalConfig.warning}
                    </p>
                  </div>
                )}

                {confirmModal.type !== "EXCEL" && (
                  <label className="mt-4 flex items-center gap-3 cursor-pointer p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition">
                    <input 
                      type="checkbox" 
                      checked={includeExcel} 
                      onChange={e => setIncludeExcel(e.target.checked)} 
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" 
                    />
                    <span className="text-sm text-white font-medium">También descargar archivo Excel con estos datos</span>
                  </label>
                )}
              </div>

              <div className="p-4 bg-slate-950/50 border-t border-white/5 flex justify-end gap-3">
                <button 
                  onClick={closeConfirmModal} 
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition"
                >
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