// src/components/admin/AdminResponsables.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
    <div className="space-y-5">

      {/* HEADER DE LA SECCIÓN */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-oficina)] text-2xl text-white shadow-[0_4px_0_var(--color-oficina-fuerte)]">
                <HiUserGroup />
            </div>
            <div>
                <h2 className="text-xl font-black leading-tight tracking-tight text-[var(--color-titulo)]">Responsables de Solicitudes</h2>
                <p className="mt-0.5 text-[11px] font-bold text-[var(--color-suave)]">Personal habilitado para tomar trámites</p>
            </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-oficina)] px-5 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-oficina-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-oficina-fuerte)] sm:w-auto"
        >
          <HiPlus className="text-lg" /> Nuevo Responsable
        </button>
      </div>

      {/* FILTRO Y LISTA */}
      <div className="space-y-4">
          {/* Buscador */}
          <div className="group relative">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--color-suave)] transition-colors group-focus-within:text-[var(--color-oficina)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o sucursal..."
              className="w-full rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] py-3.5 pl-12 pr-4 text-sm font-semibold text-[var(--color-titulo)] outline-none transition-all placeholder:text-[var(--color-suave)] focus:border-[var(--color-oficina)]"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-12 text-center text-sm font-black text-[var(--color-oficina)]">Sincronizando datos...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-12 text-center text-sm font-semibold text-[var(--color-suave)]">No se encontraron responsables registrados</div>
            ) : (
              filtered.map((it) => (
                  <div
                    key={it.id}
                    className="group flex items-center justify-between rounded-2xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] p-4 transition-all hover:border-[var(--color-oficina)]"
                  >
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${it.activo ? 'bg-[var(--color-ingreso)]/15 text-[var(--color-ingreso-fuerte)]' : 'bg-[var(--color-egreso)]/15 text-[var(--color-egreso-fuerte)]'}`}>
                          {it.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <p className={`text-base font-black tracking-tight ${!it.activo ? 'text-[var(--color-suave)] line-through' : 'text-[var(--color-titulo)]'}`}>{it.nombre}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-oficina)]">
                              <HiOfficeBuilding /> {getOficinaNombre(it.oficina)}
                          </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(it)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition-all hover:border-[var(--color-oficina)] hover:text-[var(--color-oficina)]"
                          title="Editar responsable"
                        >
                            <HiPencil className="text-lg" />
                        </button>

                        {isWebAdmin && (
                          <button
                            onClick={() => handleDelete(it.id, it.nombre)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] text-[var(--color-suave)] transition-all hover:border-[var(--color-egreso)] hover:text-[var(--color-egreso)]"
                            title="Eliminar responsable"
                          >
                              <HiTrash className="text-lg" />
                          </button>
                        )}
                    </div>
                  </div>
              ))
            )}
          </div>
      </div>

      {/* MODAL DE CRUD (CREAR / EDITAR) */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border-2 border-[var(--color-linea)] bg-[var(--color-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-[var(--color-linea)] p-5">
              <h3 className="text-lg font-black tracking-tight text-[var(--color-titulo)]">
                {editingId ? "Editar Responsable" : "Nuevo Responsable"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-[var(--color-suave)] transition-colors hover:text-[var(--color-titulo)]">
                <HiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-[var(--color-suave)]">Nombre Completo</label>
                <input
                  required
                  autoFocus
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-titulo)] outline-none transition-all focus:border-[var(--color-oficina)]"
                  placeholder="Ej: Franco Gomez"
                />
              </div>

              {isWebAdmin && (
                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-[var(--color-oficina-fuerte)]">Sucursal Asignada</label>
                  <select
                    value={formData.oficina}
                    onChange={e => setFormData({...formData, oficina: e.target.value})}
                    className="w-full rounded-xl border-2 border-[var(--color-linea)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-titulo)] outline-none transition-all focus:border-[var(--color-oficina)] dark:[color-scheme:dark]"
                  >
                    <option value="">-- Global / Multioficina --</option>
                    {oficinasReal.map(o => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-1">
                <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent p-2 transition-all hover:bg-[var(--color-surface)]">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={e => setFormData({...formData, activo: e.target.checked})}
                    className="h-5 w-5 cursor-pointer accent-[var(--color-ingreso)]"
                  />
                  <span className="text-sm font-bold text-[var(--color-titulo)]">
                    Usuario Activo (Habilitado)
                  </span>
                </label>
              </div>

              <div className="mt-2 flex justify-end gap-3 border-t-2 border-[var(--color-linea)] pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border-2 border-[var(--color-linea)] px-5 py-2.5 text-sm font-black text-[var(--color-suave)] transition-colors hover:text-[var(--color-titulo)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[var(--color-oficina)] px-6 py-2.5 text-sm font-black text-white shadow-[0_4px_0_var(--color-oficina-fuerte)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-oficina-fuerte)] disabled:opacity-50"
                >
                  <HiSave className="text-lg" /> {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
