// src/components/solicitudes/ResponsablesModal.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiTrash,
  HiPencil,
  HiCheck,
  HiBan,
  HiSearch,
  HiUserGroup,
  HiShieldCheck,
  HiOfficeBuilding,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const itemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

export default function ResponsablesModal({
  onClose,
  onChanged,
  selectMode = false,
  selectedId: selectedIdProp = null,
  onSelect,
}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🏢 Gestión de Oficinas (Solo Admin)
  const [oficinas, setOficinas] = useState([]);
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaOficinaId, setNuevaOficinaId] = useState("");
  const [nuevoActivo, setNuevoActivo] = useState(true);
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(selectMode);
  const [selectedId, setSelectedId] = useState(selectedIdProp);

  const cargarOficinas = useCallback(async () => {
    if (!isWebAdmin) return;
    try {
      const res = await api.get('/usuarios/oficinas/');
      setOficinas(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (e) { console.error("Error al cargar oficinas"); }
  }, [isWebAdmin]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 RUTA CORREGIDA: Apuntamos al endpoint blindado en solicitudes/views.py
      const res = await api.get('/empleados/'); 
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      
      arr.sort((a, b) => {
        if (!!b.activo - !!a.activo !== 0) return (!!b.activo - !!a.activo);
        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" });
      });
      setItems(arr);
    } catch (e) {
      toast.error("Error al cargar responsables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    if (isWebAdmin) cargarOficinas();
  }, [cargar, cargarOficinas, isWebAdmin]);

  const crear = async () => {
    const nombre = (nuevoNombre || "").trim();
    if (!nombre) return toast.error("Ingresá un nombre");
    if (isWebAdmin && !nuevaOficinaId) return toast.error("Seleccioná una sucursal");

    setCreating(true);
    try {
      const payload = { 
        nombre, 
        activo: !!nuevoActivo,
        oficina: isWebAdmin ? nuevaOficinaId : (user?.perfil?.oficina?.id || user?.perfil?.oficina)
      };

      // 🚀 RUTA CORREGIDA
      await api.post('/empleados/', payload);
      setNuevoNombre("");
      if (isWebAdmin) setNuevaOficinaId("");
      
      toast.success("Responsable agregado");
      await cargar();
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "No se pudo crear");
    } finally {
      setCreating(false);
    }
  };

  const activar = async (emp, activo) => {
    try {
      // 🚀 RUTA CORREGIDA
      await api.patch(`/empleados/${emp.id}/`, { activo });
      toast.success(activo ? "Activado" : "Desactivado");
      await cargar();
      onChanged?.();
    } catch (e) { toast.error("Error al actualizar"); }
  };

  const guardarEdicion = async () => {
    const nombre = (editNombre || "").trim();
    if (!nombre) return toast.error("Nombre requerido");
    try {
      // 🚀 RUTA CORREGIDA
      await api.patch(`/empleados/${editId}/`, { nombre });
      toast.success("Nombre actualizado");
      setEditId(null);
      await cargar();
      onChanged?.();
    } catch (e) { toast.error("Error al guardar"); }
  };

  const eliminar = async (emp) => {
    if (!confirm(`¿Eliminar a "${emp.nombre}"?`)) return;
    try {
      // 🚀 RUTA CORREGIDA
      await api.delete(`/empleados/${emp.id}/`);
      toast.success("Eliminado");
      await cargar();
      onChanged?.();
      if (String(selectedId) === String(emp.id)) setSelectedId(null);
    } catch (e) { toast.error("No se puede eliminar (tiene historial)"); }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (onlyActive) list = list.filter((i) => !!i.activo);
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((i) => String(i.nombre || "").toLowerCase().includes(term));
    return list;
  }, [items, q, onlyActive]);

  const confirmarSeleccion = () => {
    if (!selectMode) return;
    const emp = items.find((i) => String(i.id) === String(selectedId)) || null;
    onSelect?.(emp);
    onClose?.();
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          variants={modalVariants} initial="initial" animate="animate" exit="exit"
          className="relative w-full max-w-3xl h-[85vh] sm:h-auto mx-auto rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col bg-[#0b0f1e]"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0c28]/90 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/20">
                <HiUserGroup className="text-xl" />
              </div>
              <div>
                 <h3 className="text-white font-black text-lg uppercase tracking-tighter">
                   {selectMode ? "Seleccionar Responsable" : "Gestión de Equipo"}
                 </h3>
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    {isWebAdmin ? "Control Global" : `Sucursal: ${user?.perfil?.oficina_nombre || 'Local'}`}
                 </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {!selectMode && (
              <motion.section className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] shadow-inner" variants={sectionVariants} initial="initial" animate="animate">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className={isWebAdmin ? "sm:col-span-5" : "sm:col-span-8"}>
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1 mb-1 block">Nombre</label>
                    <input
                      value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="FRANCO..." className="w-full h-11 px-4 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-sm outline-none focus:ring-2 ring-sky-500/50"
                    />
                  </div>

                  {isWebAdmin && (
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-black text-sky-400/50 uppercase tracking-widest ml-1 mb-1 block">Asignar Sucursal</label>
                      <select 
                        value={nuevaOficinaId}
                        onChange={(e) => setNuevaOficinaId(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-black/40 border border-sky-500/20 text-sky-400 font-bold text-sm outline-none focus:ring-2 ring-sky-500/50 cursor-pointer"
                      >
                        <option value="">— Elegir —</option>
                        {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-3 flex items-center gap-3">
                    <button onClick={crear} disabled={creating} className="w-full h-11 rounded-xl bg-sky-500 text-black font-black uppercase text-xs hover:scale-105 transition-all">
                      {creating ? "..." : "Agregar"}
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Búsqueda */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80 group">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-sky-400" />
                <input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none"
                />
              </div>
              <button onClick={() => setOnlyActive(!onlyActive)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${onlyActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/40'}`}>
                {onlyActive ? "Activos" : "Todos"}
              </button>
            </div>

            {/* Lista */}
            <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden divide-y divide-white/5">
              {loading ? (
                <div className="p-10 text-center text-sky-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">Sin registros en esta oficina</div>
              ) : (
                filtered.map((emp) => {
                  const editing = editId === emp.id;
                  const isSelected = String(selectedId) === String(emp.id);

                  return (
                    <motion.div key={emp.id} className={`p-4 flex items-center gap-4 ${isSelected ? 'bg-sky-500/10' : ''}`} variants={itemVariants}>
                      <div className="flex-1 min-w-0">
                        {editing ? (
                          <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full bg-white/10 border border-sky-500/30 rounded-lg px-3 py-1 text-white font-bold outline-none" autoFocus />
                        ) : (
                          <div className="flex flex-col">
                             <p className={`font-black text-sm uppercase truncate ${!emp.activo ? 'text-white/20 line-through' : 'text-white'}`}>{emp.nombre}</p>
                             {isWebAdmin && <div className="flex items-center gap-1 text-[9px] font-black text-sky-400 uppercase mt-0.5 opacity-60"><HiOfficeBuilding /> {emp.oficina_nombre || "S/A"}</div>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {editing ? (
                          <><button onClick={guardarEdicion} className="p-2 text-emerald-400"><HiCheck /></button><button onClick={() => setEditId(null)} className="p-2 text-rose-400"><HiBan /></button></>
                        ) : (
                          <><button onClick={() => { setEditId(emp.id); setEditNombre(emp.nombre); }} className="p-2 text-white/10 hover:text-white"><HiPencil /></button><button onClick={() => activar(emp, !emp.activo)} className={`p-2 ${emp.activo ? 'text-emerald-500/20' : 'text-amber-500/20'}`}>{emp.activo ? <HiShieldCheck /> : <HiBan />}</button><button onClick={() => eliminar(emp)} className="p-2 text-rose-500/20 hover:text-rose-500"><HiTrash /></button></>
                        )}
                        {selectMode && !editing && (
                          <button onClick={() => { setSelectedId(emp.id); onSelect?.(emp); onClose(); }} className={`ml-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase ${isSelected ? 'bg-sky-500 text-black' : 'bg-white/5 text-white/40'}`}>Elegir</button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}