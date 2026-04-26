// src/components/admin/AdminOficinas.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminOficinas, fetchAdminResponsables } from "../../store/slices/adminSlice";
import { HiPlus, HiPencil, HiTrash, HiX, HiSave, HiUser } from "react-icons/hi";

const getApiUrl = () => (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

export default function AdminOficinas() {
  const dispatch = useDispatch();
  
  const { oficinas, responsables, loadingOficinas } = useSelector((state) => state.admin);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    codigo: "", 
    nombre: "", 
    direccion: "", 
    activa: true, 
    ultramsg_instance_id: "", 
    ultramsg_token: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    dispatch(fetchAdminOficinas()); 
    if (responsables.length === 0) dispatch(fetchAdminResponsables());
  }, [dispatch]);

  const openModal = (ofi = null) => {
    if (ofi) {
      setEditingId(ofi.id);
      setFormData({ 
        codigo: ofi.codigo || "", 
        nombre: ofi.nombre || "", 
        direccion: ofi.direccion || "", 
        activa: ofi.activa, 
        ultramsg_instance_id: ofi.ultramsg_instance_id || "", 
        ultramsg_token: ofi.ultramsg_token || ""
      });
    } else {
      setEditingId(null);
      setFormData({ codigo: "", nombre: "", direccion: "", activa: true, ultramsg_instance_id: "", ultramsg_token: "" });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const url = editingId ? `${getApiUrl()}/usuarios/oficinas/${editingId}/` : `${getApiUrl()}/usuarios/oficinas/`;
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Error al guardar la oficina");
      setModalOpen(false);
      dispatch(fetchAdminOficinas());
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés borrar esta oficina?")) return;
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      await fetch(`${getApiUrl()}/usuarios/oficinas/${id}/`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      dispatch(fetchAdminOficinas());
    } catch (error) {
      alert("Error al borrar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Gestión de Oficinas</h2>
          <p className="text-xs text-slate-400">Sucursales y configuraciones de WhatsApp</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <HiPlus /> Nueva Oficina
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-white/10">
            <tr>
              <th className="px-4 py-3">Oficina</th>
              <th className="px-4 py-3">Responsables de Solicitudes</th>
              <th className="px-4 py-3">Instancia WPP</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingOficinas ? <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr> : oficinas.map(o => {
              
              const responsablesOficina = responsables.filter(r => r.oficina === o.id && r.activo);

              return (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{o.nombre}</div>
                    <div className="text-[10px] font-mono text-sky-400 uppercase tracking-tighter">{o.codigo}</div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {responsablesOficina.length > 0 ? (
                        responsablesOficina.map(r => (
                          <span key={r.id} className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] rounded-lg font-semibold flex items-center gap-1">
                            <HiUser /> {r.nombre}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-xs">Sin responsables</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-[11px] text-emerald-400">
                    {o.ultramsg_instance_id || <span className="text-slate-600 italic">No configurado</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${o.activa ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {o.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openModal(o)} className="p-2 bg-white/5 hover:bg-white/10 text-sky-300 rounded-lg transition" title="Editar sucursal"><HiPencil /></button>
                    <button onClick={() => handleDelete(o.id)} className="p-2 bg-white/5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition" title="Eliminar"><HiTrash /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 text-white">
              <h3 className="font-bold">{editingId ? "Editar Oficina" : "Nueva Oficina"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><HiX size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Código Identificador</label>
                  <input required value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" placeholder="Ej: BARRACAS-01" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nombre Comercial</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" placeholder="Ej: Thames Barracas" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs text-emerald-400 mb-1 block font-semibold">UltraMsg Instance ID</label>
                  <input value={formData.ultramsg_instance_id} onChange={e => setFormData({...formData, ultramsg_instance_id: e.target.value})} className="w-full bg-slate-950 border border-emerald-900/30 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="instance123" />
                </div>
                <div>
                  <label className="text-xs text-emerald-400 mb-1 block font-semibold">UltraMsg Token</label>
                  <input value={formData.ultramsg_token} onChange={e => setFormData({...formData, ultramsg_token: e.target.value})} type="password" className="w-full bg-slate-950 border border-emerald-900/30 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="API Token..." />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" checked={formData.activa} onChange={e => setFormData({...formData, activa: e.target.checked})} className="w-4 h-4 accent-sky-500 cursor-pointer" id="check-activa" />
                <label htmlFor="check-activa" className="text-sm text-slate-200 cursor-pointer select-none">Oficina habilitada para operar</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-sky-900/20 transition-all active:scale-95 disabled:opacity-50">
                  <HiSave size={18} /> {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}