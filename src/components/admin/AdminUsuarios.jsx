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
      <div className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4">
        <div>
          <h2 className="text-lg font-black text-[var(--color-titulo)]">Gestión de Usuarios</h2>
          <p className="text-xs font-semibold text-[var(--color-suave)]">Vendedores, administradores y accesos</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-xl bg-[var(--color-ingreso)] px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-ingreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-ingreso-fuerte)]">
          <HiPlus /> Nuevo Usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)]">
        <table className="w-full text-left text-sm text-[var(--color-titulo)]">
          <thead className="border-b-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-xs font-black uppercase tracking-wide text-[var(--color-suave)]">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre Completo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Oficina Asignada</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingUsuarios ? <tr><td colSpan={5} className="p-4 text-center font-semibold text-[var(--color-suave)]">Cargando...</td></tr> : usuarios.map(u => (
              <tr key={u.id} className="border-b-2 border-[var(--color-linea)] last:border-b-0 hover:bg-[var(--color-surface)]">
                <td className="flex items-center gap-2 px-4 py-3 font-black text-[var(--color-titulo)]"><HiUserCircle className="text-lg text-[var(--color-suave)]"/> {u.username}</td>
                <td className="px-4 py-3 font-semibold">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${
                    u.perfil?.rol === 'ADMIN' ? 'bg-[var(--color-tarjeta)]/20 text-[#d97706]' :
                    u.perfil?.rol === 'VENDEDOR' ? 'bg-[var(--color-transferencia)]/20 text-[var(--color-transferencia)]' :
                    'bg-[var(--color-oficina)]/20 text-[var(--color-oficina-fuerte)]'
                  }`}>
                    {u.perfil?.rol}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-[var(--color-titulo)]">{u.perfil?.oficina_nombre || "— Global —"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openModal(u)} className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]"><HiPencil /></button>
                    <button onClick={() => handleDelete(u.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]"><HiTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-[var(--color-linea)] p-4">
              <h3 className="font-black text-[var(--color-titulo)]">{editingId ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--color-suave)] hover:text-[var(--color-titulo)]"><HiX size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Username (Login)</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Contraseña {editingId && <span className="text-[10px] text-[var(--color-egreso)]">(Opcional)</span>}</label>
                  <input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" placeholder={editingId ? "Dejar vacío para no cambiar" : "Contraseña..."} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Nombre</label>
                  <input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Apellido</label>
                  <input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t-2 border-[var(--color-linea)] pt-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#d97706]">Rol del Sistema</label>
                  <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-tarjeta)] dark:[color-scheme:dark]">
                    <option value="OFICINA">Personal de Oficina / Cajero</option>
                    <option value="VENDEDOR">Vendedor Externo</option>
                    <option value="ADMIN">Administrador Global</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-oficina-fuerte)]">Asignar a Oficina</label>
                  <select value={formData.oficina} onChange={e => setFormData({...formData, oficina: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)] dark:[color-scheme:dark]">

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

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border-2 border-[var(--color-linea)] px-4 py-2 text-sm font-black text-[var(--color-suave)] transition hover:text-[var(--color-titulo)]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[var(--color-ingreso)] px-6 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-ingreso-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-ingreso-fuerte)] disabled:opacity-50">
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
