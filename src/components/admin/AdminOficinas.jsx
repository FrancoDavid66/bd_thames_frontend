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
      <div className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4">
        <div>
          <h2 className="text-lg font-black text-[var(--color-titulo)]">Gestión de Oficinas</h2>
          <p className="text-xs font-semibold text-[var(--color-suave)]">Sucursales y configuraciones de WhatsApp</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 rounded-xl bg-[var(--color-oficina)] px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-oficina-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-oficina-fuerte)]">
          <HiPlus /> Nueva Oficina
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)]">
        <table className="w-full text-left text-sm text-[var(--color-titulo)]">
          <thead className="border-b-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-xs font-black uppercase tracking-wide text-[var(--color-suave)]">
            <tr>
              <th className="px-4 py-3">Oficina</th>
              <th className="px-4 py-3">Responsables de Solicitudes</th>
              <th className="px-4 py-3">Instancia WPP</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingOficinas ? <tr><td colSpan={5} className="p-4 text-center font-semibold text-[var(--color-suave)]">Cargando...</td></tr> : oficinas.map(o => {

              const responsablesOficina = responsables.filter(r => r.oficina === o.id && r.activo);

              return (
                <tr key={o.id} className="border-b-2 border-[var(--color-linea)] last:border-b-0 hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3">
                    <div className="font-black text-[var(--color-titulo)]">{o.nombre}</div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-tighter text-[var(--color-oficina)]">{o.codigo}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {responsablesOficina.length > 0 ? (
                        responsablesOficina.map(r => (
                          <span key={r.id} className="flex items-center gap-1 rounded-lg border-2 border-[var(--color-transferencia)]/30 bg-[var(--color-transferencia)]/10 px-2 py-1 text-[10px] font-black text-[var(--color-transferencia)]">
                            <HiUser /> {r.nombre}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-[var(--color-suave)]">Sin responsables</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-[11px] font-bold text-[var(--color-ingreso)]">
                    {o.ultramsg_instance_id || <span className="italic text-[var(--color-suave)]">No configurado</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${o.activa ? 'bg-[var(--color-ingreso)]/15 text-[var(--color-ingreso-fuerte)]' : 'bg-[var(--color-egreso)]/15 text-[var(--color-egreso-fuerte)]'}`}>
                      {o.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(o)} className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]" title="Editar sucursal"><HiPencil /></button>
                      <button onClick={() => handleDelete(o.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]" title="Eliminar"><HiTrash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-[var(--color-linea)] p-4 text-[var(--color-titulo)]">
              <h3 className="font-black">{editingId ? "Editar Oficina" : "Nueva Oficina"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--color-suave)] hover:text-[var(--color-titulo)]"><HiX size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Código Identificador</label>
                  <input required value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" placeholder="Ej: BARRACAS-01" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Nombre Comercial</label>
                  <input required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-oficina)]" placeholder="Ej: Thames Barracas" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t-2 border-[var(--color-linea)] pt-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-ingreso-fuerte)]">UltraMsg Instance ID</label>
                  <input value={formData.ultramsg_instance_id} onChange={e => setFormData({...formData, ultramsg_instance_id: e.target.value})} className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-ingreso)]" placeholder="instance123" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[var(--color-ingreso-fuerte)]">UltraMsg Token</label>
                  <input value={formData.ultramsg_token} onChange={e => setFormData({...formData, ultramsg_token: e.target.value})} type="password" className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-[var(--color-titulo)] outline-none focus:border-[var(--color-ingreso)]" placeholder="API Token..." />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={formData.activa} onChange={e => setFormData({...formData, activa: e.target.checked})} className="h-5 w-5 cursor-pointer accent-[var(--color-oficina)]" id="check-activa" />
                <label htmlFor="check-activa" className="cursor-pointer select-none text-sm font-semibold text-[var(--color-titulo)]">Oficina habilitada para operar</label>
              </div>

              <div className="flex justify-end gap-3 border-t-2 border-[var(--color-linea)] pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border-2 border-[var(--color-linea)] px-4 py-2 text-sm font-black text-[var(--color-suave)] transition hover:text-[var(--color-titulo)]">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[var(--color-oficina)] px-6 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-oficina-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-oficina-fuerte)] disabled:opacity-50">
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
