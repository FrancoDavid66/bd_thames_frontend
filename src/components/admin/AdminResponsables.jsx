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
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
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
      
      {/* HEADER DE LA SECCIÓN */}
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <HiUserGroup className="text-xl" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-white leading-none uppercase tracking-tighter">Responsables de Solicitudes</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personal habilitado para tomar trámites</p>
            </div>
        </div>
        <button 
          onClick={() => openModal()} 
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-900/20"
        >
          <HiPlus /> Nuevo Responsable
        </button>
      </div>

      {/* FILTRO Y LISTA */}
      <div className="space-y-3">
          <div className="relative">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nombre o sucursal..." className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900/40 border border-white/5 text-white text-xs outline-none focus:border-white/20" />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/30 overflow-hidden divide-y divide-white/5">
            {loading ? (
              <div className="p-12 text-center text-sky-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Sincronizando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-white/30 text-[10px] font-black uppercase tracking-widest italic">No hay responsables registrados</div>
            ) : (
              filtered.map((it) => (
                  <motion.div key={it.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.03] transition-colors" variants={itemVariants}>
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
                    
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openModal(it)} 
                          className="p-2.5 text-sky-400 hover:text-sky-300 transition-all hover:bg-sky-500/20 rounded-lg bg-sky-500/10"
                          title="Editar responsable"
                        >
                            <HiPencil className="text-lg" />
                        </button>
                        
                        {isWebAdmin && (
                          <button 
                            onClick={() => handleDelete(it.id, it.nombre)} 
                            className="p-2.5 text-rose-400 hover:text-rose-300 transition-all hover:bg-rose-500/20 rounded-lg bg-rose-500/10"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-white/[0.02]">
                <h3 className="text-white font-black uppercase tracking-tight">
                  {editingId ? "Editar Responsable" : "Nuevo Responsable"}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <HiX size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nombre Completo</label>
                  <input 
                    required 
                    autoFocus
                    value={formData.nombre} 
                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                    className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:ring-2 ring-sky-500/50" 
                    placeholder="Ej: FRANCO..." 
                  />
                </div>

                {isWebAdmin && (
                  <div>
                    <label className="text-[10px] font-black text-sky-400/80 uppercase tracking-widest ml-1 mb-1.5 block">Sucursal Asignada</label>
                    <div className="relative group">
                      <select 
                        value={formData.oficina} 
                        onChange={e => setFormData({...formData, oficina: e.target.value})} 
                        className="w-full bg-black/40 border border-sky-900/30 rounded-xl px-4 py-3 pr-10 text-sm text-sky-400 font-bold outline-none focus:ring-2 ring-sky-500/50 cursor-pointer appearance-none"
                      >
                        {/* 🚀 CORRECCIÓN DE DISEÑO ACÁ: Forzamos el fondo negro de las opciones */}
                        <option value="" className="bg-slate-900 text-slate-400">-- Global / Multioficina --</option>
                        {oficinasReal.map(o => (
                          <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                            {o.nombre}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sky-400/50 group-hover:text-sky-400 transition-colors">
                        ▾
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group w-fit">
                    <input 
                      type="checkbox" 
                      checked={formData.activo} 
                      onChange={e => setFormData({...formData, activo: e.target.checked})} 
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer border-none" 
                    />
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">
                      Usuario Activo (Puede tomar trámites)
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)} 
                    className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-black px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <HiSave className="text-sm" /> {saving ? "Guardando..." : "Guardar Cambios"}
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