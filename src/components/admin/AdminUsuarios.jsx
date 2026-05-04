// src/components/admin/AdminUsuarios.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminUsuarios, fetchAdminOficinas } from "../../store/slices/adminSlice";
import { HiPlus, HiPencil, HiTrash, HiX, HiSave, HiUserCircle } from "react-icons/hi";

const getApiUrl = () => (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "/api").replace(/\/+$/, "");

export default function AdminUsuarios() {
  const dispatch = useDispatch();
  const { usuarios, oficinas, loadingUsuarios } = useSelector((state) => state.admin);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ username: "", first_name: "", last_name: "", email: "", password: "", rol: "OFICINA", oficina: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    dispatch(fetchAdminUsuarios()); 
    if (oficinas.length === 0) dispatch(fetchAdminOficinas());
  }, [dispatch]);

  const openModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({ username: user.username, first_name: user.first_name, last_name: user.last_name, email: user.email, password: "", rol: user.perfil?.rol || "OFICINA", oficina: user.perfil?.oficina || "" });
    } else {
      setEditingId(null);
      setFormData({ username: "", first_name: "", last_name: "", email: "", password: "", rol: "OFICINA", oficina: "" });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const url = editingId ? `${getApiUrl()}/usuarios/users/${editingId}/` : `${getApiUrl()}/usuarios/users/`;
      const method = editingId ? "PUT" : "POST";
      
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Si no cambia clave, no la manda
      if (!payload.oficina) payload.oficina = null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Error al guardar el usuario. ¿Username duplicado?");
      setModalOpen(false);
      dispatch(fetchAdminUsuarios());
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que querés borrar este usuario? Esto es irreversible.")) return;
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      await fetch(`${getApiUrl()}/usuarios/users/${id}/`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      dispatch(fetchAdminUsuarios());
    } catch (error) {
      alert("Error al borrar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-lg font-bold text-white">Gestión de Usuarios</h2>
          <p className="text-xs text-slate-400">Vendedores, administradores y accesos</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
          <HiPlus /> Nuevo Usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-white/10">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre Completo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Oficina Asignada</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingUsuarios ? <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr> : usuarios.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 font-semibold text-white flex items-center gap-2"><HiUserCircle className="text-slate-400 text-lg"/> {u.username}</td>
                <td className="px-4 py-3">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    u.perfil?.rol === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 
                    u.perfil?.rol === 'VENDEDOR' ? 'bg-purple-500/20 text-purple-300' : 
                    'bg-sky-500/20 text-sky-300'
                  }`}>
                    {u.perfil?.rol}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-200">{u.perfil?.oficina_nombre || "— Global —"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openModal(u)} className="p-2 bg-white/5 hover:bg-white/10 text-sky-300 rounded-lg transition"><HiPencil /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-2 bg-white/5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"><HiTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h3 className="text-white font-bold">{editingId ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><HiX size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Username (Login)</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Contraseña {editingId && <span className="text-[10px] text-rose-400">(Opcional)</span>}</label>
                  <input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" placeholder={editingId ? "Dejar vacío para no cambiar" : "Contraseña..."} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nombre</label>
                  <input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Apellido</label>
                  <input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs text-amber-400 mb-1 block font-semibold">Rol del Sistema</label>
                  <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 outline-none">
                    <option value="OFICINA">Personal de Oficina / Cajero</option>
                    <option value="VENDEDOR">Vendedor Externo</option>
                    <option value="ADMIN">Administrador Global</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-sky-400 mb-1 block font-semibold">Asignar a Oficina</label>
                  <select value={formData.oficina} onChange={e => setFormData({...formData, oficina: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none">
                    
                    {/* 🚀 TEXTO DINÁMICO SEGÚN EL ROL SELECCIONADO */}
                    <option value="">
                      {formData.rol === 'ADMIN' ? '-- Acceso Global (Todas) --' : 
                       formData.rol === 'VENDEDOR' ? '-- Independiente (Sin Sucursal) --' : 
                       '-- Seleccionar Oficina --'}
                    </option>
                    
                    {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                  <HiSave /> {saving ? "Guardando..." : "Guardar Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}