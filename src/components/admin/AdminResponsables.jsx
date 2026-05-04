// src/components/admin/AdminResponsables.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiPlus, 
  HiTrash, 
  HiPencil, 
  HiSearch, 
  HiOfficeBuilding,
  HiUserGroup,
  HiX,
  HiSave
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD Y API
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export default function AdminResponsables() {
  const { user } = useAuth(); 
  const [items, setItems] = useState([]);
  const [oficinasReal, setOficinasReal] = useState([]); 
  const [loading, setLoading] = useState(false);

  // 🛡️ Lógica de Permisos Multi-tenant
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficinaId = user?.perfil?.oficina?.id || user?.perfil?.oficina;

  // Estados del CRUD (Modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: "", oficina: "", activo: true });
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Cargamos Empleados usando la API base
      const resEmp = await api.get('/empleados/');
      setItems(Array.isArray(resEmp.data) ? resEmp.data : (resEmp.data?.results || []));

      // 2. Cargamos las oficinas reales para el selector del Admin
      if (isWebAdmin) {
        const resOfi = await api.get('/usuarios/oficinas/');
        setOficinasReal(Array.isArray(resOfi.data) ? resOfi.data : (resOfi.data?.results || []));
      }
    } catch (e) {
      toast.error("Error al sincronizar responsables.");
    } finally {
      setLoading(false);
    }
  }, [isWebAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Abrir Modal para Crear o Editar
  const openModal = (emp = null) => {
    if (emp) {
      setEditingId(emp.id);
      setFormData({ 
        nombre: emp.nombre, 
        oficina: emp.oficina || emp.oficina_id || "", 
        activo: emp.activo 
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: "", oficina: "", activo: true });
    }
    setModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSave = async (e) => {
    e.preventDefault();
    const nombre = formData.nombre.trim();
    if (!nombre) return toast.error("El nombre es obligatorio.");
    
    const targetOficina = isWebAdmin ? formData.oficina : userOficinaId;
    if (!targetOficina) return toast.error(isWebAdmin ? "Seleccioná una sucursal." : "No tienes una oficina asignada.");

    setSaving(true);
    try {
      const payload = { 
        nombre, 
        activo: formData.activo, 
        oficina: targetOficina 
      };

      if (editingId) {
        // Editar existente (PATCH)
        await api.patch(`/empleados/${editingId}/`, payload);
        toast.success("Responsable actualizado");
      } else {
        // Crear nuevo (POST)
        await api.post(`/empleados/`, payload);
        toast.success("Responsable registrado");
      }
      
      setModalOpen(false);
      fetchData();
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Error al guardar el responsable."); 
    } finally { 
      setSaving(false); 
    }
  };

  // Eliminar
  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que querés eliminar definitivamente a "${nombre}"?`)) return;
    try {
      await api.delete(`/empleados/${id}/`);
      toast.success("Responsable eliminado");
      fetchData();
    } catch (e) {
      toast.error("No se puede eliminar porque tiene solicitudes asignadas. Mejor desactivalo.");
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

  return (
    <div className="space-y-6">
      
      {/* HEADER DE LA SECCIÓN (Mejorado visualmente) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-slate-900/80 to-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-sm gap-4">
        <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20 shadow-inner">
                <HiUserGroup className="text-2xl" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white leading-tight tracking-tight">Responsables de Solicitudes</h2>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Personal habilitado para tomar trámites</p>
            </div>
        </div>
        <button 
          onClick={() => openModal()} 
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:shadow-[0_0_25px_rgba(14,165,233,0.4)] hover:-translate-y-0.5"
        >
          <HiPlus className="text-lg" /> Nuevo Responsable
        </button>
      </div>

      {/* FILTRO Y LISTA */}
      <div className="space-y-4">
          {/* Buscador mejorado con estados de foco */}
          <div className="relative group">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors text-lg" />
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Buscar por nombre o sucursal..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/50 border border-slate-700/50 text-white text-sm outline-none focus:bg-slate-800/80 focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-inner placeholder:text-slate-500" 
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-sky-400 text-sm font-bold animate-pulse bg-slate-900/30 rounded-2xl border border-slate-800">Sincronizando datos...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm font-medium bg-slate-900/30 rounded-2xl border border-slate-800">No se encontraron responsables registrados</div>
            ) : (
              filtered.map((it) => (
                  <motion.div 
                    key={it.id} 
                    className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/40 hover:bg-slate-800/80 hover:border-slate-600 flex items-center justify-between group transition-all duration-300 shadow-sm hover:shadow-lg" 
                    variants={itemVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <div className="flex items-center gap-4">
                        {/* Avatar con anillo luminoso */}
                        <div className={`h-11 w-11 rounded-full flex items-center justify-center font-black text-sm shadow-inner ring-2 ring-offset-2 ring-offset-slate-900 transition-colors ${it.activo ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'}`}>
                          {it.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <p className={`font-black text-base tracking-tight ${!it.activo ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{it.nombre}</p>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400/80 uppercase tracking-widest mt-0.5">
                              <HiOfficeBuilding /> {getOficinaNombre(it.oficina)}
                          </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(it)} 
                          className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-xl transition-all"
                          title="Editar responsable"
                        >
                            <HiPencil className="text-lg" />
                        </button>
                        
                        {isWebAdmin && (
                          <button 
                            onClick={() => handleDelete(it.id, it.nombre)} 
                            className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Eliminar responsable"
                          >
                              <HiTrash className="text-lg" />
                          </button>
                        )}
                    </div>
                  </motion.div>
              ))
            )}
          </div>
      </div>

      {/* MODAL DE CRUD (CREAR / EDITAR) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-white/[0.02]">
                <h3 className="text-white font-black text-lg tracking-tight">
                  {editingId ? "Editar Responsable" : "Nuevo Responsable"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <HiX size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block">Nombre Completo</label>
                  <input 
                    required 
                    autoFocus
                    value={formData.nombre} 
                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white font-medium outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all" 
                    placeholder="Ej: Franco Gomez" 
                  />
                </div>

                {isWebAdmin && (
                  <div>
                    <label className="text-xs font-bold text-sky-400 mb-2 block">Sucursal Asignada</label>
                    <div className="relative group">
                      <select 
                        value={formData.oficina} 
                        onChange={e => setFormData({...formData, oficina: e.target.value})} 
                        className="w-full bg-slate-950 border border-sky-900/40 rounded-xl px-4 py-3.5 pr-10 text-sm text-sky-300 font-medium outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer appearance-none transition-all"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">-- Global / Multioficina --</option>
                        {oficinasReal.map(o => (
                          <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                            {o.nombre}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sky-500 transition-colors">
                        ▾
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <label className="flex items-center gap-3 cursor-pointer group w-fit p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                    <input 
                      type="checkbox" 
                      checked={formData.activo} 
                      onChange={e => setFormData({...formData, activo: e.target.checked})} 
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer border-none" 
                    />
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                      Usuario Activo (Habilitado)
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800 mt-2">
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <HiSave className="text-lg" /> {saving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}