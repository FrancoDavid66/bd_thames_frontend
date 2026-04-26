// src/components/solicitudes/modalcreate/ResponsablesCrudModal.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiX, 
  HiPlus, 
  HiTrash, 
  HiCheck, 
  HiSearch, 
  HiOfficeBuilding,
  HiUserGroup 
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../../context/AuthContext";
import { solicitudesApi } from "../../../api/solicitudes";

const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
};

export default function ResponsablesCrudModal({ open, onClose, onChanged }) {
  const { user } = useAuth(); 
  const [items, setItems] = useState([]);
  const [oficinasReal, setOficinasReal] = useState([]); 
  const [loading, setLoading] = useState(false);

  // 🛡️ Lógica de Permisos Multi-tenant
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficinaId = user?.perfil?.oficina?.id || user?.perfil?.oficina;

  // Estados de Formulario
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoOficina, setNuevoOficina] = useState(""); 
  const [nuevoActivo, setNuevoActivo] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cargamos Empleados 
      const empleados = await solicitudesApi.empleadosListar({}).catch(() => []);
      setItems(Array.isArray(empleados) ? empleados : (empleados?.results || []));

      // 🚀 2. FIX CLAVE: Forzamos la consulta a la fuente real de oficinas
      if (isWebAdmin) {
        try {
          const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
          const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
          
          const res = await fetch(`${API_BASE}/usuarios/oficinas/`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
          });
          
          if (res.ok) {
            const data = await res.json();
            const dataOfis = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
            setOficinasReal(dataOfis);
          }
        } catch (err) {
          console.error("Error al cargar las oficinas reales", err);
        }
      }
    } catch (e) {
      toast.error("Error al sincronizar responsables.");
    } finally {
      setLoading(false);
    }
  }, [isWebAdmin]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const onCreate = async () => {
    const nombre = (nuevoNombre || "").trim();
    if (!nombre) return toast.error("El nombre es obligatorio.");
    
    // 🏢 Determinamos la oficina
    const targetOficina = isWebAdmin ? nuevoOficina : userOficinaId;

    if (!targetOficina) {
        return toast.error(isWebAdmin ? "Seleccioná una sucursal." : "No tienes una oficina asignada.");
    }

    setSaving(true);
    try {
      await solicitudesApi.crearEmpleado({ 
        nombre, 
        activo: nuevoActivo, 
        oficina: targetOficina 
      });
      
      toast.success("Personal registrado correctamente");
      setNuevoNombre("");
      setNuevoOficina("");
      setCreating(false);
      await fetchData();
      onChanged?.();
    } catch (e) { 
      toast.error(e.payload?.detail || "Error al crear el responsable."); 
    } finally { 
      setSaving(false); 
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => 
        String(it?.nombre || "").toLowerCase().includes(s) ||
        getOficinaNombre(it.oficina).toLowerCase().includes(s)
    );
  }, [items, q, oficinasReal]);

  function getOficinaNombre(id) {
    if (!id) return "Sin oficina";
    const found = oficinasReal.find(o => String(o.id) === String(id));
    return found ? found.nombre : "Sucursal";
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div variants={modalVariants} initial="initial" animate="animate" exit="exit" className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0b0f1e] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20"><HiUserGroup className="text-xl" /></div>
               <div>
                  <h4 className="text-white font-black text-lg leading-none uppercase tracking-tighter">Gestión de Personal</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                    {isWebAdmin ? "Control Global" : `Oficina: ${user?.perfil?.oficina_nombre || 'Local'}`}
                  </p>
               </div>
            </div>
            <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-all"><HiX className="text-2xl" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            
            {/* Registro de Personal */}
            <motion.section className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] shadow-inner">
              {!creating ? (
                <button onClick={() => setCreating(true)} className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/40 font-black uppercase text-[10px] tracking-widest hover:border-sky-500/50 hover:text-sky-400 transition-all flex items-center justify-center gap-2">
                  <HiPlus /> Registrar nuevo responsable
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase ml-1">Nombre Completo</label>
                        <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: CARLOS..." className="w-full h-12 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-sm outline-none focus:ring-2 ring-sky-500/50" />
                    </div>
                    
                    {isWebAdmin && (
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-sky-400/50 uppercase ml-1">Sucursal</label>
                            <select value={nuevoOficina} onChange={(e) => setNuevoOficina(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-black/40 border border-sky-500/20 text-sky-400 font-bold text-sm outline-none cursor-pointer">
                                <option value="" className="bg-[#0b0f1e] text-slate-400">— Elegir Oficina —</option>
                                {oficinasReal.map(o => <option key={o.id} value={o.id} className="bg-[#0b0f1e] text-white">{o.nombre}</option>)}
                            </select>
                        </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                     <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={nuevoActivo} onChange={(e) => setNuevoActivo(e.target.checked)} className="w-5 h-5 accent-emerald-500 rounded border-none" />
                        <span className="text-[10px] font-black text-white/30 uppercase group-hover:text-white transition-colors">Activo en Sistema</span>
                     </label>
                     <div className="flex gap-2">
                        <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl text-white/40 font-bold uppercase text-[10px] hover:text-white">Cancelar</button>
                        <button onClick={onCreate} disabled={saving} className="px-8 py-2 rounded-xl bg-sky-500 text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-sky-900/20 active:scale-95 transition-all">
                            {saving ? "Registrando..." : "Confirmar Alta"}
                        </button>
                     </div>
                  </div>
                </div>
              )}
            </motion.section>

            {/* Filtro de Búsqueda */}
            <div className="space-y-3">
                <div className="relative">
                  <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nombre o sucursal..." className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-white text-xs outline-none focus:border-white/20" />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden divide-y divide-white/5">
                  {loading ? (
                    <div className="p-12 text-center text-sky-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando...</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-white/10 text-[10px] font-black uppercase tracking-widest italic">No hay responsables registrados</div>
                  ) : (
                    filtered.map((it) => (
                        <motion.div key={it.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors" variants={itemVariants}>
                          <div className="flex items-center gap-4">
                             <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-xs ${it.activo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {it.nombre.substring(0, 2).toUpperCase()}
                             </div>
                             <div className="flex flex-col">
                                <p className={`font-black text-sm uppercase tracking-tight ${!it.activo ? 'text-white/20 line-through' : 'text-white'}`}>{it.nombre}</p>
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-sky-400/60 uppercase tracking-widest">
                                    <HiOfficeBuilding /> {getOficinaNombre(it.oficina)}
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {isWebAdmin && (
                                <button onClick={() => { if(confirm(`¿Eliminar definitivamente a "${it.nombre}"?`)) solicitudesApi.eliminarEmpleado(it.id).then(() => fetchData()); }} className="p-2 text-white/10 hover:text-rose-500 transition-all hover:bg-rose-500/10 rounded-lg">
                                    <HiTrash className="text-lg" />
                                </button>
                             )}
                          </div>
                        </motion.div>
                    ))
                  )}
                </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/5 bg-black/40 text-center">
             <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Thames Security Multi-tenant System</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}