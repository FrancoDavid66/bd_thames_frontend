// src/components/solicitudes/modalcreate/CatalogosCrudModal.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiX, 
  HiPlus, 
  HiTrash, 
  HiSearch, 
  HiCollection,
  HiShieldCheck,
  HiOfficeBuilding
} from "react-icons/hi";
import toast from "react-hot-toast";
import axios from "axios";

// 🚀 IMPORTAMOS AUTH
import { useAuth } from "../../../context/AuthContext";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
};

export default function CatalogosCrudModal({ open, onClose, onChanged }) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [tab, setTab] = useState("companias"); // "companias" o "coberturas"
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [q, setQ] = useState("");

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === "companias" ? "/companias/" : "/coberturas/";
      const res = await axios.get(`${API_BASE}${endpoint}`, { headers: getAuthHeaders() });
      const data = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : [];
      setItems(data);
    } catch (e) {
      toast.error(`Error al cargar ${tab}`);
    } finally {
      setLoading(false);
    }
  }, [tab, getAuthHeaders]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, tab, fetchData]);

  const handleCreate = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return toast.error("El nombre no puede estar vacío");

    setSaving(true);
    try {
      const endpoint = tab === "companias" ? "/companias/" : "/coberturas/";
      await axios.post(`${API_BASE}${endpoint}`, { nombre, activa: true }, { headers: getAuthHeaders() });
      toast.success("Agregado correctamente");
      setNuevoNombre("");
      fetchData();
      onChanged?.(); // Avisamos al padre que algo cambió para recargar el caché
    } catch (e) {
      toast.error(e?.response?.data?.nombre?.[0] || "Error al guardar. Puede que ya exista.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      const endpoint = tab === "companias" ? "/companias/" : "/coberturas/";
      await axios.delete(`${API_BASE}${endpoint}${id}/`, { headers: getAuthHeaders() });
      toast.success("Eliminado correctamente");
      fetchData();
      onChanged?.();
    } catch (e) {
      toast.success("Desactivado (tenía pólizas asociadas)");
      fetchData();
      onChanged?.();
    }
  };

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return items;
    return items.filter(it => String(it.nombre).toLowerCase().includes(search));
  }, [items, q]);

  if (!open || !isWebAdmin) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0f1e] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                 <HiCollection className="text-xl" />
               </div>
               <div>
                  <h4 className="text-white font-black text-lg leading-none uppercase tracking-tighter">Gestor de Catálogos</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Configuración Global</p>
               </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-all"><HiX className="text-2xl" /></button>
          </div>

          {/* TABS */}
          <div className="flex border-b border-white/5 bg-black/20">
            <button 
              onClick={() => setTab("companias")}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${tab === "companias" ? "bg-white/10 text-white border-b-2 border-emerald-400" : "text-white/40 hover:bg-white/5 hover:text-white/70"}`}
            >
              Compañías
            </button>
            <button 
              onClick={() => setTab("coberturas")}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${tab === "coberturas" ? "bg-white/10 text-white border-b-2 border-emerald-400" : "text-white/40 hover:bg-white/5 hover:text-white/70"}`}
            >
              Coberturas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {/* Nuevo Registro */}
            <div className="flex gap-2">
              <input 
                value={nuevoNombre} 
                onChange={(e) => setNuevoNombre(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder={`Agregar nueva ${tab === "companias" ? "compañía" : "cobertura"}...`} 
                className="flex-1 h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-sm outline-none focus:ring-2 ring-emerald-500/50" 
              />
              <button 
                onClick={handleCreate} 
                disabled={saving || !nuevoNombre.trim()} 
                className="h-12 px-6 rounded-xl bg-emerald-500 text-emerald-950 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? "..." : <><HiPlus className="text-lg"/> Agregar</>}
              </button>
            </div>

            {/* Buscador y Lista */}
            <div className="space-y-3">
              <div className="relative">
                <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la lista..." className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-white text-xs outline-none focus:border-white/20" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden divide-y divide-white/5 max-h-[40vh] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-12 text-center text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Cargando datos...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-12 text-center text-white/30 text-[10px] font-black uppercase tracking-widest italic">No hay resultados.</div>
                ) : (
                  filtered.map((it) => (
                    <motion.div key={it.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.03] transition-colors" variants={itemVariants}>
                      <div className="flex items-center gap-4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs bg-white/5 text-white/60`}>
                            {tab === "companias" ? <HiOfficeBuilding /> : <HiShieldCheck />}
                          </div>
                          <p className={`font-bold text-sm uppercase tracking-tight ${!it.activa ? 'text-white/20 line-through' : 'text-white'}`}>
                            {it.nombre}
                          </p>
                      </div>
                      
                      <button 
                        onClick={() => handleDelete(it.id, it.nombre)} 
                        className="p-2 text-white/10 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100"
                        title="Eliminar/Desactivar"
                      >
                          <HiTrash className="text-lg" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}