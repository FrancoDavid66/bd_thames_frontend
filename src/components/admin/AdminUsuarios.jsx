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
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] p-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--color-titulo)]">Gestión de usuarios</h2>
          <p className="text-[12px] text-[var(--color-suave)]">Vendedores, administradores y accesos</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-lg bg-[var(--color-ingreso)] px-4 py-2.5 text-[13px] font-medium text-white hover:brightness-110 transition-colors">
          <HiPlus /> Nuevo usuario
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)]">
        <table className="w-full text-left text-sm text-[var(--color-titulo)]">
          <thead className="border-b border-[var(--color-linea)] bg-[var(--color-surface)] text-[12px] text-[var(--color-suave)]">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Nombre completo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Oficina asignada</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingUsuarios ? <tr><td colSpan={5} className="p-4 text-center text-[var(--color-suave)]">Cargando...</td></tr> : usuarios.map(u => (
              <tr key={u.id} className="border-b border-[var(--color-linea)] last:border-b-0 hover:bg-[var(--color-surface)] transition-colors">
                <td className="flex items-center gap-2 px-4 py-3 font-medium text-[var(--color-titulo)]"><HiUserCircle className="text-base text-[var(--color-suave)]"/> {u.username}</td>
                <td className="px-4 py-3">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    u.perfil?.rol === 'ADMIN' ? 'bg-[var(--color-tarjeta)]/20 text-[#d97706]' :
                    u.perfil?.rol === 'VENDEDOR' ? 'bg-[var(--color-transferencia)]/20 text-[var(--color-transferencia)]' :
                    u.perfil?.rol === 'ABOGADO' ? 'bg-[#5b52e6]/15 text-[#5b52e6]' :
                    'bg-[var(--color-oficina)]/20 text-[var(--color-oficina-fuerte)]'
                  }`}>
                    {u.perfil?.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-titulo)]">{u.perfil?.oficina_nombre || "— Global —"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openModal(u)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition-colors hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]"><HiPencil /></button>
                    <button onClick={() => handleDelete(u.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition-colors hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]"><HiTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--color-linea)] bg-[var(--color-card)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-linea)] p-4">
              <h3 className="font-semibold text-[15px] text-[var(--color-titulo)]">{editingId ? "Editar usuario" : "Nuevo usuario"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--color-suave)] hover:text-[var(--color-titulo)]"><HiX size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] text-[var(--color-suave)]">Username (login)</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] text-[var(--color-suave)]">Contraseña {editingId && <span className="text-[11px] text-[var(--color-egreso)]">(opcional)</span>}</label>
                  <input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" placeholder={editingId ? "Dejar vacío para no cambiar" : "Contraseña..."} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] text-[var(--color-suave)]">Nombre</label>
                  <input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] text-[var(--color-suave)]">Apellido</label>
                  <input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-linea)] pt-4">
                <div>
                  <label className="mb-1.5 block text-[12px] text-[#d97706]">Rol del sistema</label>
                  <select value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className="w-full rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-tarjeta)] dark:[color-scheme:dark]">
                    <option value="OFICINA">Personal de oficina / cajero</option>
                    <option value="VENDEDOR">Vendedor externo</option>
                    <option value="ABOGADO">Abogado (módulo Legales)</option>
                    <option value="ADMIN">Administrador global</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] text-[var(--color-oficina-fuerte)]">Asignar a oficina</label>
                  <select value={formData.oficina} onChange={e => setFormData({...formData, oficina: e.target.value})} className="w-full rounded-lg border border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px] text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)] dark:[color-scheme:dark]">

                    {/* 🚀 TEXTO DINÁMICO SEGÚN EL ROL SELECCIONADO */}
                    <option value="">
                      {formData.rol === 'ADMIN' ? '-- Acceso global (todas) --' :
                       formData.rol === 'VENDEDOR' ? '-- Independiente (sin sucursal) --' :
                       formData.rol === 'ABOGADO' ? '-- No aplica (ve sus casos, no por oficina) --' :
                       '-- Seleccionar oficina --'}
                    </option>

                    {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-[var(--color-linea)] px-4 py-2 text-[13px] font-medium text-[var(--color-suave)] transition-colors hover:text-[var(--color-titulo)]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-[var(--color-ingreso)] px-5 py-2.5 text-[13px] font-medium text-white hover:brightness-110 transition-colors disabled:opacity-50">
                  <HiSave /> {saving ? "Guardando..." : "Guardar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
