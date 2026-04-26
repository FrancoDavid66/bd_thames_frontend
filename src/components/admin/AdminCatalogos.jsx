// src/components/admin/AdminCatalogos.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiPlus, HiTrash, HiPencil, HiCollection, HiShieldCheck, 
  HiX, HiOfficeBuilding, HiPhotograph, HiArrowLeft, HiCog, HiStar, HiDocumentText
} from "react-icons/hi";
import toast from "react-hot-toast";

import { fetchAdminCompanias, fetchAdminCoberturas } from "../../store/slices/adminSlice";

const getApiUrl = () => (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

const parseDjangoError = (errorData) => {
  if (!errorData) return "Error desconocido del servidor.";
  if (typeof errorData === 'string') return errorData;
  const firstKey = Object.keys(errorData)[0];
  if (firstKey && Array.isArray(errorData[firstKey])) return `${firstKey.toUpperCase()}: ${errorData[firstKey][0]}`;
  return "Error al guardar. Revisa los campos.";
};

const parseTextToArray = (text) => {
  if (!text) return [];
  if (Array.isArray(text)) return text;
  return String(text).split('\n').map(item => item.trim()).filter(Boolean);
};

export default function AdminCatalogos() {
  const dispatch = useDispatch();
  const { companias, coberturas, loadingCompanias, loadingCoberturas } = useSelector((state) => state.admin);
  
  const [view, setView] = useState("LIST"); 
  const [selectedCia, setSelectedCia] = useState(null);
  const [q, setQ] = useState("");

  const [ciaModalOpen, setCiaModalOpen] = useState(false);
  const [cobModalOpen, setCobModalOpen] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [ciaForm, setCiaForm] = useState({ nombre: "", comision_default: "0.00", antiguedad_maxima: "25", activa: true, logo_url: "" });
  
  const [cobForm, setCobForm] = useState({ nombre: "", activa: true, beneficios_default: [], fotos_requeridas: [], documentos_requeridos: [] });

  useEffect(() => {
    dispatch(fetchAdminCompanias());
    dispatch(fetchAdminCoberturas());
  }, [dispatch]);

  useEffect(() => {
    if (selectedCia) {
      const updated = companias.find(c => c.id === selectedCia.id);
      if (updated) setSelectedCia(updated);
    }
  }, [companias, selectedCia]);

  // --- CRUD COMPAÑÍAS ---
  const openCiaModal = (cia = null) => {
    setEditingId(cia?.id || null);
    setCiaForm({
      nombre: cia?.nombre || "",
      comision_default: cia?.comision_default || "0.00",
      antiguedad_maxima: cia?.antiguedad_maxima || "25",
      activa: cia?.activa ?? true,
      logo_url: cia?.logo_url || ""
    });
    setCiaModalOpen(true);
  };

  const saveCia = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const url = editingId ? `${getApiUrl()}/cotizaciones/companias/${editingId}/` : `${getApiUrl()}/cotizaciones/companias/`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(ciaForm)
      });
      if (!res.ok) throw new Error(parseDjangoError(await res.json()));
      toast.success("Aseguradora guardada");
      setCiaModalOpen(false);
      dispatch(fetchAdminCompanias());
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  // --- CRUD COBERTURAS ---
  const openCobModal = (cob = null) => {
    setEditingId(cob?.id || null);
    setCobForm({
      nombre: cob?.nombre || "",
      activa: cob?.activa ?? true,
      beneficios_default: Array.isArray(cob?.beneficios_default) ? cob.beneficios_default : parseTextToArray(cob?.beneficios_default),
      fotos_requeridas: Array.isArray(cob?.fotos_requeridas) ? cob.fotos_requeridas : parseTextToArray(cob?.fotos_requeridas),
      documentos_requeridos: Array.isArray(cob?.documentos_requeridos) ? cob.documentos_requeridos : parseTextToArray(cob?.documentos_requeridos)
    });
    setCobModalOpen(true);
  };

  const openOptions = (cob) => {
    setEditingId(cob?.id || null);
    setCobForm({
      nombre: cob?.nombre || "",
      activa: cob?.activa ?? true,
      beneficios_default: Array.isArray(cob?.beneficios_default) ? cob.beneficios_default : parseTextToArray(cob?.beneficios_default),
      fotos_requeridas: Array.isArray(cob?.fotos_requeridas) ? cob.fotos_requeridas : parseTextToArray(cob?.fotos_requeridas),
      documentos_requeridos: Array.isArray(cob?.documentos_requeridos) ? cob.documentos_requeridos : parseTextToArray(cob?.documentos_requeridos)
    });
    setOptionsModalOpen(true);
  };

  const saveCob = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const url = editingId ? `${getApiUrl()}/cotizaciones/coberturas/${editingId}/` : `${getApiUrl()}/cotizaciones/coberturas/`;
      const payload = {
        ...cobForm,
        compania: selectedCia.id,
        beneficios_default: cobForm.beneficios_default,
        fotos_requeridas: cobForm.fotos_requeridas,
        documentos_requeridos: cobForm.documentos_requeridos
      };
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(parseDjangoError(await res.json()));
      toast.success("Cobertura actualizada");
      setCobModalOpen(false);
      setOptionsModalOpen(false);
      dispatch(fetchAdminCoberturas());
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const deleteItem = async (id, tipo) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = tipo === 'cia' ? 'companias' : 'coberturas';
      const res = await fetch(`${getApiUrl()}/cotizaciones/${endpoint}/${id}/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("No se pudo eliminar.");
      toast.success("Eliminado");
      if (tipo === 'cia') { setView("LIST"); dispatch(fetchAdminCompanias()); }
      else dispatch(fetchAdminCoberturas());
    } catch (e) { toast.error(e.message); }
  };

  // 🚀 BLINDAJE DE FILTRO: Soporta si el backend manda 'compania' como ID o como Objeto
  const ciaCoverages = useMemo(() => {
    if (!selectedCia) return [];
    return coberturas.filter(c => {
      const ciaId = typeof c.compania === 'object' ? c.compania?.id : c.compania;
      return Number(ciaId) === Number(selectedCia.id);
    });
  }, [coberturas, selectedCia]);

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {view === "LIST" ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20"><HiCollection /></div>
                <div><h2 className="text-lg font-bold text-white uppercase">Aseguradoras</h2></div>
              </div>
              <button onClick={() => openCiaModal()} className="bg-amber-600 px-4 py-2 rounded-xl text-sm font-bold text-black"><HiPlus className="inline mr-1"/> Nueva Empresa</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {companias.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase())).map(cia => (
                <div key={cia.id} onClick={() => { setSelectedCia(cia); setView("PROFILE"); }} className="bg-slate-900/40 border border-white/10 rounded-3xl p-5 hover:border-amber-500/50 cursor-pointer transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20"><HiOfficeBuilding /></div>
                    <h3 className="text-white font-black uppercase">{cia.nombre}</h3>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 mb-6">
              <button onClick={() => setView("LIST")} className="text-[10px] font-black text-slate-500 uppercase mb-4 flex items-center gap-1"><HiArrowLeft /> Volver</button>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase">{selectedCia?.nombre}</h2>
                  <p className="text-[10px] font-bold text-amber-500 uppercase">Comisión: {selectedCia?.comision_default}% | Antigüedad: {selectedCia?.antiguedad_maxima} años</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openCiaModal(selectedCia)} className="p-3 rounded-xl bg-white/5 text-sky-400 border border-white/10"><HiPencil /></button>
                  <button onClick={() => deleteItem(selectedCia.id, 'cia')} className="p-3 rounded-xl bg-white/5 text-rose-400 border border-white/10"><HiTrash /></button>
                  <button onClick={() => openCobModal()} className="bg-sky-600 px-6 py-3 rounded-2xl font-black uppercase text-xs text-white">Nueva Cobertura</button>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {ciaCoverages.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/20 border border-white/5 rounded-2xl">
                  <p className="text-white/40 text-sm font-medium">Aún no has creado coberturas para esta aseguradora.</p>
                  <p className="text-white/20 text-xs mt-1">Haz clic en "Nueva Cobertura" para empezar.</p>
                </div>
              ) : (
                ciaCoverages.map(cob => (
                  <div key={cob.id} className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${cob.activa ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/20'}`}><HiShieldCheck /></div>
                      <div><p className="text-white font-black uppercase">{cob.nombre}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openOptions(cob)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-[9px] font-black uppercase text-amber-500 border border-amber-500/20 hover:bg-amber-500/10 transition-colors"><HiCog /> Opciones</button>
                      <button onClick={() => openCobModal(cob)} className="p-2 text-sky-400 hover:text-sky-300 transition-colors"><HiPencil /></button>
                      <button onClick={() => deleteItem(cob.id, 'cob')} className="p-2 text-rose-400 hover:text-rose-300 transition-colors"><HiTrash /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALES --- */}
      <Modal open={ciaModalOpen} onClose={() => setCiaModalOpen(false)} title="Datos de Aseguradora">
        <form onSubmit={saveCia} className="space-y-4">
          <Input label="Nombre" value={ciaForm.nombre} onChange={v => setCiaForm({...ciaForm, nombre: v})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Comisión %" type="number" step="0.01" value={ciaForm.comision_default} onChange={v => setCiaForm({...ciaForm, comision_default: v})} />
            <Input label="Antigüedad Máx" type="number" value={ciaForm.antiguedad_maxima} onChange={v => setCiaForm({...ciaForm, antiguedad_maxima: v})} />
          </div>
          <button type="submit" className="w-full bg-amber-500 text-black py-3 rounded-xl font-black uppercase text-xs mt-4">Guardar</button>
        </form>
      </Modal>

      <Modal open={cobModalOpen} onClose={() => setCobModalOpen(false)} title="Datos de Cobertura">
        <form onSubmit={saveCob} className="space-y-4">
          <Input label="Nombre de Cobertura" value={cobForm.nombre} onChange={v => setCobForm({...cobForm, nombre: v})} required />
          <button type="submit" className="w-full bg-sky-600 text-white py-3 rounded-xl font-black uppercase text-xs mt-4">Guardar Nombre</button>
        </form>
      </Modal>

      <Modal open={optionsModalOpen} onClose={() => setOptionsModalOpen(false)} title={`Configuración: ${cobForm.nombre}`} wide>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
             <TagInput 
                label="¿Qué Cubre? (Beneficios)" 
                icon={<HiStar className="text-amber-500" />}
                color="amber"
                placeholder="Ej: Granizo, Enter" 
                tags={cobForm.beneficios_default} 
                onChange={(newTags) => setCobForm({...cobForm, beneficios_default: newTags})} 
                suggestions={["Robo Total", "Incendio Parcial", "Granizo", "Cristales", "Cerraduras", "Grúa 100km"]}
             />
          </div>
          <div>
             <TagInput 
                label="Fotos Obligatorias" 
                icon={<HiPhotograph className="text-sky-400" />}
                color="sky"
                placeholder="Ej: FRENTE, Enter" 
                tags={cobForm.fotos_requeridas} 
                onChange={(newTags) => setCobForm({...cobForm, fotos_requeridas: newTags})} 
                suggestions={["FRENTE", "TRASERA", "LATERAL_IZQ", "LATERAL_DER", "INTERIOR", "EQUIPO_GNC"]}
             />
          </div>
          <div>
             <TagInput 
                label="Papeles Legales" 
                icon={<HiDocumentText className="text-indigo-400" />}
                color="indigo"
                placeholder="Ej: VTV, Enter" 
                tags={cobForm.documentos_requeridos} 
                onChange={(newTags) => setCobForm({...cobForm, documentos_requeridos: newTags})} 
                suggestions={["CEDULA_VERDE_FRENTE", "CEDULA_VERDE_DORSO", "TITULO", "VTV", "OBLEA_GNC"]}
             />
          </div>
        </div>
        <button onClick={saveCob} className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors text-white py-3 rounded-xl font-black uppercase text-xs mt-8">
          Guardar Configuración
        </button>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTES UI ---

function Modal({ open, onClose, title, wide = false, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`bg-slate-900 border border-white/10 rounded-[2.5rem] w-full ${wide ? 'max-w-6xl' : 'max-w-md'} shadow-2xl p-8 relative overflow-y-auto max-h-[90vh]`}>
        <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white"><HiX size={24}/></button>
        <h3 className="text-white font-black uppercase mb-6 text-lg">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Input({ label, onChange, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input 
        {...props} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500/50 transition-all" 
      />
    </div>
  );
}

function TagInput({ label, tags = [], onChange, placeholder, suggestions = [], icon, color = "sky" }) {
  const [input, setInput] = useState("");

  const colorClasses = {
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = input.trim().toUpperCase();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const addSuggestion = (sug) => {
    const newTag = sug.toUpperCase();
    if (!tags.includes(newTag)) onChange([...tags, newTag]);
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon} {label}
      </label>
      
      <div className="bg-black/40 border border-white/10 rounded-2xl p-3 focus-within:border-white/30 transition-colors min-h-[120px] flex flex-col">
        <div className="flex flex-wrap gap-2 mb-2">
          <AnimatePresence>
            {tags.map((tag, idx) => (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                key={idx} 
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${colorClasses[color]}`}
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors"><HiX /></button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Agregar otro..."} 
          className="bg-transparent border-none outline-none text-sm text-white font-medium w-full flex-1"
        />
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2 ml-1">Sugerencias rápidas:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((sug, idx) => {
              const isAdded = tags.includes(sug.toUpperCase());
              if (isAdded) return null; 
              return (
                <button 
                  key={idx} type="button" onClick={() => addSuggestion(sug)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/50 text-[9px] font-bold uppercase hover:bg-white/10 hover:text-white transition-colors"
                >
                  + {sug}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}