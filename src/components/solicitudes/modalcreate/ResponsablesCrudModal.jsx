// src/components/solicitudes/modalcreate/ResponsablesCrudModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiCog,
  HiPlus,
  HiPencil,
  HiTrash,
  HiCheck,
  HiRefresh,
  HiSearch,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { solicitudesApi } from "../../../services/solicitudes";

/**
 * CRUD compacto de Responsables (empleados)
 *
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - onChanged: fn() → notifica cambios para refrescar el modal padre
 */
export default function ResponsablesCrudModal({ open, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Crear
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoActivo, setNuevoActivo] = useState(true);
  const [creating, setCreating] = useState(false);

  // Editar inline
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  // Búsqueda
  const [q, setQ] = useState("");
  const inputNuevoRef = useRef(null);

  // ====== Load (conectado al backend) ======
  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await solicitudesApi.empleadosListar({}); // ya devuelve array
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la lista");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchAll();
    setCreating(false);
    setNuevoNombre("");
    setNuevoActivo(true);
    setEditId(null);
  }, [open]);

  useEffect(() => {
    if (open && creating) {
      const t = setTimeout(() => inputNuevoRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open, creating]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => String(it?.nombre || "").toLowerCase().includes(s));
  }, [items, q]);

  if (!open) return null;

  // ====== Actions (conectadas al service) ======
  const onCreate = async () => {
    const nombre = (nuevoNombre || "").trim();
    if (!nombre) return toast.error("Ingresá un nombre.");
    setSaving(true);
    try {
      await solicitudesApi.crearEmpleado({ nombre, activo: nuevoActivo });
      toast.success("Creado");
      await fetchAll();
      setCreating(false);
      setNuevoNombre("");
      setNuevoActivo(true);
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (it) => {
    setEditId(it.id);
    setEditNombre(it.nombre || "");
    setEditActivo(!!it.activo);
  };

  const onCancelEdit = () => {
    setEditId(null);
    setEditNombre("");
    setEditActivo(true);
  };

  const onSave = async () => {
    if (!editId) return;
    const nombre = (editNombre || "").trim();
    if (!nombre) return toast.error("Ingresá un nombre.");
    setSaving(true);
    try {
      await solicitudesApi.actualizarEmpleado(editId, { nombre, activo: editActivo });
      toast.success("Guardado");
      await fetchAll();
      onCancelEdit();
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (it) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Eliminar responsable "${it.nombre}"?`)) return;
    try {
      await solicitudesApi.eliminarEmpleado(it.id);
      toast.success("Eliminado");
      await fetchAll();
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  // ====== Render ======
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[96] grid place-items-center bg-black/70 backdrop-blur" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          className="w-[94%] max-w-2xl rounded-2xl border border-white/10 bg-[#0f0c28] p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Administrar responsables"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-200 to-cyan-200 text-[#0b0f1e]">
                <HiCog />
              </span>
              Administrar responsables
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="h-8 w-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20"
                title="Refrescar"
              >
                <HiRefresh className="text-white" />
              </button>
              <button
                onClick={onClose}
                className="h-8 w-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20"
                title="Cerrar"
              >
                <HiX className="text-white" />
              </button>
            </div>
          </div>

          {/* Buscar + Crear */}
          <div className="grid gap-3 mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre…"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:ring-2 ring-cyan-200/30"
                />
              </div>
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="px-3 rounded-xl bg-emerald-400/90 hover:bg-emerald-400 text-[#0b0f1e] inline-flex items-center gap-2 font-semibold"
                  title="Nuevo responsable"
                >
                  <HiPlus />
                  <span className="hidden sm:inline">Nuevo</span>
                </button>
              ) : (
                <div className="flex gap-2 flex-1">
                  <input
                    ref={inputNuevoRef}
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre del responsable"
                    className="flex-1 px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:ring-2 ring-emerald-200/30"
                  />
                  <label className="inline-flex items-center gap-2 px-3 rounded-xl bg-white/10 border border-white/10">
                    <input
                      type="checkbox"
                      checked={nuevoActivo}
                      onChange={(e) => setNuevoActivo(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                    />
                    <span className="text-sm text-white/85">Activo</span>
                  </label>
                  <button
                    onClick={onCreate}
                    disabled={saving}
                    className="px-3 rounded-xl bg-gradient-to-br from-emerald-200 to-teal-200 text-[#0b0f1e] font-semibold disabled:opacity-60"
                  >
                    {saving ? "Creando…" : "Crear"}
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setNuevoNombre("");
                      setNuevoActivo(true);
                    }}
                    className="px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-3 py-2 text-xs text-white/60 border-b border-white/10">
              {loading ? "Cargando…" : `Responsables (${filtered.length})`}
            </div>
            <div className="max-h-[56vh] overflow-auto divide-y divide-white/10">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-3 py-4 animate-pulse">
                      <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-24 bg-white/10 rounded" />
                    </div>
                  ))
                : filtered.map((it) => {
                    const isEditing = editId === it.id;
                    return (
                      <div key={it.id} className="px-3 py-2 flex items-center gap-2">
                        {!isEditing ? (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{it.nombre}</div>
                              <div className="text-[11px] text-white/50">ID #{it.id}</div>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] border ${
                                it.activo
                                  ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200"
                                  : "bg-rose-500/15 border-rose-400/30 text-rose-200"
                              }`}
                            >
                              {it.activo ? "Activo" : "Inactivo"}
                            </span>
                            <button
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center text-white"
                              title="Editar"
                              onClick={() => onEdit(it)}
                            >
                              <HiPencil />
                            </button>
                            <button
                              className="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 grid place-items-center text-rose-100"
                              title="Eliminar"
                              onClick={() => onDelete(it)}
                            >
                              <HiTrash />
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:ring-2 ring-violet-200/30"
                            />
                            <label className="inline-flex items-center gap-2 px-2 rounded-lg bg-white/10 border border-white/10">
                              <input
                                type="checkbox"
                                checked={editActivo}
                                onChange={(e) => setEditActivo(e.target.checked)}
                                className="h-4 w-4 rounded border-white/20 bg-transparent"
                              />
                              <span className="text-[12px] text-white/85">Activo</span>
                            </label>
                            <button
                              onClick={onSave}
                              disabled={saving}
                              className="px-3 h-8 rounded-lg bg-gradient-to-br from-emerald-200 to-teal-200 text-[#0b0f1e] font-semibold disabled:opacity-60"
                            >
                              <HiCheck />
                            </button>
                            <button
                              onClick={onCancelEdit}
                              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 grid place-items-center text-white"
                            >
                              <HiX />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
              {!loading && filtered.length === 0 && (
                <div className="px-3 py-6 text-sm text-white/60">Sin resultados.</div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
