import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  HiX,
  HiPlus,
  HiTrash,
  HiPencil,
  HiCheck,
  HiBan,
  HiSearch,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { solicitudesApi } from "../../services/solicitudes";

export default function ResponsablesModal({
  onClose,
  onChanged,
  /* NUEVO: modo selector */
  selectMode = false,
  selectedId: selectedIdProp = null,
  onSelect, // (empleado) => void
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Crear
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoActivo, setNuevoActivo] = useState(true);
  const [creating, setCreating] = useState(false);

  // Edición inline
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState("");

  // Búsqueda / filtro
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(selectMode); // en selector: por defecto solo activos

  // Selección (modo selector)
  const [selectedId, setSelectedId] = useState(selectedIdProp);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await solicitudesApi.empleadosListar();
      const arr = Array.isArray(data) ? data : data?.results || data?.data || [];
      // Orden: activos primero, luego nombre
      arr.sort((a, b) => {
        if (!!b.activo - !!a.activo !== 0) return (!!b.activo - !!a.activo);
        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" });
      });
      setItems(arr);
    } catch (e) {
      toast.error(e?.message || "No se pudieron cargar responsables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    const nombre = (nuevoNombre || "").trim();
    if (!nombre) {
      toast.error("Ingresá un nombre");
      return;
    }
    setCreating(true);
    try {
      await solicitudesApi.crearEmpleado({ nombre, activo: !!nuevoActivo });
      setNuevoNombre("");
      setNuevoActivo(true);
      toast.success("Responsable agregado");
      await cargar();
      onChanged?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo crear");
    } finally {
      setCreating(false);
    }
  };

  const activar = async (emp, activo) => {
    try {
      await solicitudesApi.actualizarEmpleado(emp.id, { activo });
    toast.success(activo ? "Responsable activado" : "Responsable desactivado");
      await cargar();
      onChanged?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo actualizar");
    }
  };

  const iniciarEdicion = (emp) => {
    setEditId(emp.id);
    setEditNombre(emp.nombre || "");
  };

  const guardarEdicion = async () => {
    const nombre = (editNombre || "").trim();
    if (!nombre) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    try {
      await solicitudesApi.actualizarEmpleado(editId, { nombre });
      toast.success("Nombre actualizado");
      setEditId(null);
      setEditNombre("");
      await cargar();
      onChanged?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo guardar");
    }
  };

  const eliminar = async (emp) => {
    if (!confirm(`¿Eliminar a "${emp.nombre}"? Esta acción no se puede deshacer.`))
      return;
    try {
      await solicitudesApi.eliminarEmpleado(emp.id);
      toast.success("Responsable eliminado");
      await cargar();
      onChanged?.();
      // si era el seleccionado, limpiamos
      setSelectedId((prev) => (prev === emp.id ? null : prev));
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  // Filtros/orden + búsqueda
  const filtered = useMemo(() => {
    let list = items;
    if (onlyActive) list = list.filter((i) => !!i.activo);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((i) => String(i.nombre || "").toLowerCase().includes(term));
    }
    return list;
  }, [items, q, onlyActive]);

  const onKeyCreate = (e) => {
    if (e.key === "Enter") crear();
  };
  const onKeySave = (e) => {
    if (e.key === "Enter") guardarEdicion();
  };

  // Confirmar selección (modo selector)
  const confirmarSeleccion = () => {
    if (!selectMode) return;
    const emp = items.find((i) => String(i.id) === String(selectedId)) || null;
    if (!emp) {
      // Permitir "Sin responsable"
      onSelect?.(null);
      onClose?.();
      return;
    }
    onSelect?.(emp);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Contenedor principal (mobile app full-screen) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full h-[100dvh] md:h-auto md:max-w-3xl md:mx-auto md:my-8 md:rounded-2xl md:border md:border-white/10 shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,11,43,0.98) 0%, rgba(10,9,32,0.98) 100%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={selectMode ? "Seleccionar responsable" : "Gestionar responsables"}
      >
        {/* Header sticky */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0f0c28]/90 backdrop-blur"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <h3 className="text-white font-semibold">
            {selectMode ? "Seleccionar responsable" : "Gestionar responsables"}
          </h3>
          <div className="flex items-center gap-2">
            {selectMode && (
              <button
                onClick={() => setSelectedId(null)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white"
                title="Quitar selección (sin responsable)"
              >
                Sin responsable
              </button>
            )}
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <HiX className="text-lg text-white" />
            </button>
          </div>
        </div>

        {/* Área scrollable */}
        <div className="px-4 pb-24 pt-3 overflow-y-auto h-[calc(100dvh-56px)] md:max-h-[78vh] md:pb-5">
          {/* Crear nuevo (oculto en selector si no queremos ruido; lo dejamos visible por ahora) */}
          {!selectMode && (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
                <label className="text-sm">
                  <span className="block text-white/80 mb-1">Nombre</span>
                  <input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    onKeyDown={onKeyCreate}
                    placeholder="Ej: Carolina"
                    className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 ring-primary-400/30"
                  />
                </label>

                <label className="flex items-center gap-2 sm:justify-center">
                  <input
                    id="nuevo-activo"
                    type="checkbox"
                    checked={nuevoActivo}
                    onChange={(e) => setNuevoActivo(e.target.checked)}
                    className="w-4 h-4 accent-current"
                  />
                  <span className="text-white/80 text-sm">Activo</span>
                </label>

                <button
                  onClick={crear}
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-400 text-neutral-900 font-semibold hover:brightness-95 disabled:opacity-60"
                  title="Agregar responsable"
                >
                  <HiPlus /> Agregar
                </button>
              </div>
            </section>
          )}

          {/* Buscador, filtros y total */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="text-white/80 text-sm">
              {loading ? "Cargando…" : `Total: ${items.length}`}
            </div>

            <div className="flex items-center gap-2">
              <label className="relative w-full sm:w-72">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar responsable…"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 ring-primary-400/30"
                />
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              </label>

              <button
                type="button"
                onClick={() => setOnlyActive((v) => !v)}
                className={`px-3 py-2 rounded-xl border text-sm ${
                  onlyActive
                    ? "bg-white text-black border-white"
                    : "bg-white/10 text-white border-white/10 hover:bg-white/15"
                }`}
                title="Mostrar solo activos"
              >
                {onlyActive ? "Solo activos" : "Todos"}
              </button>
            </div>
          </div>

          {/* Lista */}
          <section className="rounded-2xl border border-white/10 bg-white/5">
            {items.length === 0 && !loading ? (
              <div className="p-4 text-white/70 text-sm">
                No hay responsables cargados.
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {(loading ? Array.from({ length: 6 }) : filtered).map((emp, idx) => {
                  if (loading) {
                    return (
                      <li key={idx} className="p-3">
                        <div className="h-6 w-40 bg-white/10 rounded mb-2 animate-pulse" />
                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                      </li>
                    );
                  }
                  const editing = editId === emp.id;
                  const isSelected = String(selectedId) === String(emp.id);

                  return (
                    <li
                      key={emp.id}
                      className={`p-3 flex items-center gap-3 ${
                        selectMode ? "cursor-pointer hover:bg-white/5" : ""
                      }`}
                      onClick={() => {
                        if (!selectMode) return;
                        setSelectedId(emp.id);
                      }}
                    >
                      {/* Selector (modo selector) */}
                      {selectMode && (
                        <input
                          type="radio"
                          name="responsable"
                          className="accent-emerald-400"
                          checked={isSelected}
                          onChange={() => setSelectedId(emp.id)}
                        />
                      )}

                      {/* Nombre (editable) */}
                      <div className="flex-1 min-w-0">
                        {editing ? (
                          <input
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            onKeyDown={onKeySave}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 ring-primary-400/30"
                            autoFocus
                          />
                        ) : (
                          <div className="text-white truncate">
                            {emp.nombre || "—"}
                          </div>
                        )}
                        <div className="text-xs text-white/60">ID {emp.id}</div>
                      </div>

                      {/* Estado */}
                      <span
                        className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${
                          emp.activo
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-white/10 text-white/70 border-white/20"
                        }`}
                        title={emp.activo ? "Activo" : "Inactivo"}
                      >
                        {emp.activo ? "Activo" : "Inactivo"}
                      </span>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        {editing ? (
                          <>
                            <button
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
                              onClick={guardarEdicion}
                              title="Guardar"
                            >
                              <HiCheck /> Guardar
                            </button>
                            <button
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
                              onClick={() => {
                                setEditId(null);
                                setEditNombre("");
                              }}
                              title="Cancelar"
                            >
                              <HiBan /> Cancelar
                            </button>
                          </>
                        ) : (
                          !selectMode && (
                            <button
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
                              onClick={() => iniciarEdicion(emp)}
                              title="Editar nombre"
                            >
                              <HiPencil /> Editar
                            </button>
                          )
                        )}

                        {!selectMode && (
                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm"
                            onClick={() => activar(emp, !emp.activo)}
                            title={emp.activo ? "Desactivar" : "Activar"}
                          >
                            {emp.activo ? "Desactivar" : "Activar"}
                          </button>
                        )}

                        {!selectMode && (
                          <button
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-50 text-sm"
                            onClick={() => eliminar(emp)}
                            title="Eliminar"
                          >
                            <HiTrash /> Eliminar
                          </button>
                        )}

                        {selectMode && (
                          <button
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm ${
                              isSelected
                                ? "bg-white text-black"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(emp.id);
                              confirmarSeleccion();
                            }}
                            title="Elegir este responsable"
                          >
                            Elegir
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Footer (confirmar selección en modo selector) */}
        {selectMode && (
          <div
            className="sticky bottom-0 z-10 flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-[#0f0c28]/90 backdrop-blur"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarSeleccion}
              className="px-4 py-2 rounded-xl bg-primary-400 text-neutral-900 font-semibold hover:brightness-95"
            >
              Confirmar selección
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
