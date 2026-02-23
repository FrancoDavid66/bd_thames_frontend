// src/pages/BajasPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiCog, HiX, HiPlus, HiTrash, HiMail, HiChevronRight } from "react-icons/hi";
import {
  fetchBajas,
  fetchBajasOficinas,
  fetchBajasCorreos,
  createBajaCorreo,
  deleteBajaCorreo,
  selectBajas,
  selectBajasCount,
  selectBajasError,
  selectBajasOficinas,
  selectBajasStatus,
  selectBajasCorreos,
} from "../store/slices/bajasSlice";

import BajasTable from "../components/bajas/BajasTable";

const STATUS = {
  ENVIAR: "ENVIAR_BAJA",
  ENVIADA: "BAJA_ENVIADA",
  REALIZADA: "BAJA_REALIZADA",
};

const LS = {
  oficina: "scope.bajas.oficina",
  statusById: "bajas_status_map", 
};

// --- Helpers ---
function loadStatusMap() {
  try {
    const raw = localStorage.getItem(LS.statusById);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStatusMap(map) {
  try { localStorage.setItem(LS.statusById, JSON.stringify(map || {})); } catch { }
}

function parseDateRobusta(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yy, mm, dd] = s.split("-").map(Number);
    return new Date(yy, mm - 1, dd);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yy] = s.split("/").map(Number);
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

function getProximaVencImpagaRaw(p) {
  return pickFirstNonEmpty(
    p?.proxima_vencimiento_impaga, 
    p?.vencimiento_impaga_mas_proximo, 
    p?.min_vto_impaga
  );
}

function getClienteInfo(p) {
  const nombre = pickFirstNonEmpty(p?.cliente_nombre_completo, `${p?.cliente_apellido} ${p?.cliente_nombre}`).trim() || "Asegurado";
  const dni = pickFirstNonEmpty(p?.cliente_dni, "—");
  return { nombre, dni };
}

export default function BajasPage() {
  const dispatch = useDispatch();

  // Selectores de Redux
  const items = useSelector(selectBajas);
  const count = useSelector(selectBajasCount);
  const status = useSelector(selectBajasStatus);
  const error = useSelector(selectBajasError);
  const oficinas = useSelector(selectBajasOficinas);
  const correosDB = useSelector(selectBajasCorreos);

  // Estados locales
  const [oficina, setOficina] = useState(() => localStorage.getItem(LS.oficina) || "");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(STATUS.ENVIAR);
  const [umbralDias, setUmbralDias] = useState(15);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusById, setStatusById] = useState(() => loadStatusMap());
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false); 
  const [newMail, setNewMail] = useState({ compania: "", email: "" });

  // Acciones de correos via Redux
  const handleAddCorreo = async () => {
    if (!newMail.compania || !newMail.email) return;
    dispatch(createBajaCorreo(newMail));
    setNewMail({ compania: "", email: "" });
  };

  const handleDeleteCorreo = (id) => {
    dispatch(deleteBajaCorreo(id));
  };

  // Carga inicial
  useEffect(() => { 
    dispatch(fetchBajasOficinas({ force: false }));
    dispatch(fetchBajasCorreos()); 
  }, [dispatch]);

  useEffect(() => { saveStatusMap(statusById); }, [statusById]);
  useEffect(() => { localStorage.setItem(LS.oficina, oficina); }, [oficina]);

  const load = useCallback((opts = {}) => {
    dispatch(fetchBajas({ 
      params: { 
        modo: "vencidas", 
        page: String(page), 
        page_size: String(pageSize), 
        oficina, 
        search, 
        include_finalizadas: "0" 
      }, 
      force: !!opts.force 
    }));
  }, [dispatch, page, pageSize, oficina, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load({ force: true }); }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  // Enriquecimiento de datos
  const enriched = useMemo(() => {
    const hoy = new Date();
    return (items || []).map((p) => {
      const proximaImpaga = parseDateRobusta(getProximaVencImpagaRaw(p));
      const diasMora = proximaImpaga ? daysBetween(hoy, proximaImpaga) : null;
      const requiereBaja = (p?.estado || "").toLowerCase() !== "finalizada" && getImpagasCount(p) > 0 && (diasMora ?? 0) >= umbralDias;
      const saved = statusById?.[String(p?.id)];
      return { 
        ...p, 
        _diasMora: diasMora, 
        _requiereBaja: requiereBaja, 
        _bajaStatus: requiereBaja ? (saved?.status || STATUS.ENVIAR) : "IGNORAR" 
      };
    }).sort((a, b) => (b._diasMora ?? -1) - (a._diasMora ?? -1));
  }, [items, umbralDias, statusById]);

  const kpis = useMemo(() => {
    const stats = { totales: 0, pendientes: 0, enviadas: 0, realizadas: 0 };
    enriched.forEach(p => {
      if (p._requiereBaja) {
        stats.totales++;
        if (p._bajaStatus === STATUS.ENVIAR) stats.pendientes++;
        else if (p._bajaStatus === STATUS.ENVIADA) stats.enviadas++;
        else if (p._bajaStatus === STATUS.REALIZADA) stats.realizadas++;
      }
    });
    return stats;
  }, [enriched]);

  const filtered = enriched.filter(x => x._requiereBaja && (activeTab === "TODAS" || x._bajaStatus === activeTab));

  const handleComposeClick = () => {
    if (selectedIds.size === 0) return;
    if (correosDB.length === 0) {
      alert("No tenés correos configurados. Agregá uno en el botón de configuración ⚙️");
      setShowConfigModal(true);
      return;
    }
    setShowPickerModal(true);
  };

  const executeComposeEmail = (emailDestino) => {
    const ids = Array.from(selectedIds);
    const rows = enriched.filter(p => ids.includes(String(p.id)));
    const today = new Date().toLocaleDateString("es-AR");
    const subject = `Solicitud de baja por mora - ${today} (${rows.length} pólizas)`;
    const lines = rows.map(p => {
      const { nombre, dni } = getClienteInfo(p);
      return `- Cía: ${p.compania} | Pol: ${p.numero_poliza} | Pat: ${p.patente} | Asegurado: ${nombre} | DNI: ${dni} | Mora: ${p._diasMora}d`;
    });
    const body = `Hola equipo,\n\nSolicitamos gestionar la baja de las siguientes pólizas por mora:\n\n${lines.join("\n")}\n\nSaludos.`;
    window.location.href = `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowPickerModal(false);
  };

  const bulkSetStatus = (nextStatus) => {
    const newStatusMap = { ...statusById };
    selectedIds.forEach(id => {
      newStatusMap[id] = { status: nextStatus, updatedAt: new Date().toISOString() };
    });
    setStatusById(newStatusMap);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Bajas por Mora</h1>
          <p className="text-sm text-slate-400">Seleccioná los clientes y elegí el correo de destino.</p>
        </div>
        <button onClick={() => setShowConfigModal(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition">
          <HiCog className="text-lg" /> Configurar Correos
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: STATUS.ENVIAR, label: "Pendientes", val: kpis.pendientes, col: "text-red-400" },
          { id: STATUS.ENVIADA, label: "Enviadas", val: kpis.enviadas, col: "text-amber-400" },
          { id: STATUS.REALIZADA, label: "Realizadas", val: kpis.realizadas, col: "text-emerald-400" },
          { id: "TODAS", label: "Totales", val: kpis.totales, col: "text-white" }
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedIds(new Set()); }} className={`p-4 rounded-xl border transition ${activeTab === t.id ? "bg-white/10 border-white/30" : "bg-white/5 border-transparent opacity-60"}`}>
            <div className="text-xs uppercase text-slate-400">{t.label}</div>
            <div className={`text-3xl font-bold ${t.col}`}>{t.val}</div>
          </button>
        ))}
      </div>

      {/* Barra de Acciones */}
      <div className="bg-slate-900 p-4 rounded-xl border border-white/10 flex flex-wrap gap-3 items-center">
        <div className="text-sm font-semibold text-slate-300 mr-auto">
          {selectedIds.size} pólizas seleccionadas
        </div>
        <button disabled={!selectedIds.size} onClick={handleComposeClick} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 disabled:opacity-30 transition flex items-center gap-2">
          <HiMail className="text-xl" /> Redactar Mail
        </button>
        <button disabled={!selectedIds.size} onClick={() => bulkSetStatus(STATUS.ENVIADA)} className="px-4 py-2 bg-amber-600/20 text-amber-200 rounded-lg disabled:opacity-30">Marcar Enviadas</button>
        <button disabled={!selectedIds.size} onClick={() => bulkSetStatus(STATUS.REALIZADA)} className="px-4 py-2 bg-emerald-600/20 text-emerald-200 rounded-lg disabled:opacity-30">Marcar Realizadas</button>
        {selectedIds.size > 0 && <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-sm underline">Limpiar selección</button>}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <select value={oficina} onChange={e => setOficina(e.target.value)} className="md:col-span-3 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2">
          <option value="">Todas las Oficinas</option>
          {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por patente, cliente..." className="md:col-span-7 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2" />
        <input type="number" value={umbralDias} onChange={e => setUmbralDias(Number(e.target.value))} className="md:col-span-2 bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2" title="Mora ≥ N días" />
      </div>

      <BajasTable 
        items={filtered} 
        selectedIds={selectedIds} 
        onToggleSelect={id => setSelectedIds(prev => {
          const n = new Set(prev);
          n.has(String(id)) ? n.delete(String(id)) : n.add(String(id));
          return n;
        })}
        onSelectAllVisible={check => setSelectedIds(check ? new Set(filtered.map(x => String(x.id))) : new Set())}
        onComposeEmail={id => { setSelectedIds(new Set([String(id)])); setShowPickerModal(true); }}
        onSetStatus={(id, s) => setStatusById(prev => ({...prev, [id]: {status: s, updatedAt: new Date().toISOString()}}))}
      />

      {/* MODAL Selector de Correo */}
      <AnimatePresence>
        {showPickerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800">
                <h2 className="font-bold text-white flex items-center gap-2">Enviar a compañía...</h2>
                <button onClick={() => setShowPickerModal(false)} className="text-slate-400 hover:text-white"><HiX /></button>
              </div>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                {correosDB.map(c => (
                  <button
                    key={c.id}
                    onClick={() => executeComposeEmail(c.email)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition group border-b border-white/5 last:border-0"
                  >
                    <div className="text-left">
                      <div className="font-bold text-blue-400 group-hover:text-blue-300">{c.compania}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </div>
                    <HiChevronRight className="text-slate-600 group-hover:text-white" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL Configuración de Correos */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2"><HiMail className="text-xl text-blue-400" /> Administrar Correos</h2>
                <button onClick={() => setShowConfigModal(false)} className="p-1 hover:bg-white/10 rounded-lg text-white"><HiX /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase">Agregar Nueva Compañía</div>
                  <div className="flex gap-2">
                    <input placeholder="Nombre Cía." value={newMail.compania} onChange={e => setNewMail({...newMail, compania: e.target.value})} className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm" />
                    <input placeholder="Correo electrónico" value={newMail.email} onChange={e => setNewMail({...newMail, email: e.target.value})} className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm" />
                    <button onClick={handleAddCorreo} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"><HiPlus /></button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-white">
                  {correosDB.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm italic">No hay correos guardados.</div>
                  ) : (
                    correosDB.map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition">
                        <div>
                          <div className="text-sm font-bold text-white">{c.compania}</div>
                          <div className="text-xs text-slate-500">{c.email}</div>
                        </div>
                        <button onClick={() => handleDeleteCorreo(c.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"><HiTrash /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}