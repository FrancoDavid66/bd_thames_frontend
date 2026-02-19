import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// Definimos variants inline para animaciones profesionales
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

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
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Contenedor principal (mobile app full-screen) */}
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full max-w-md sm:max-w-3xl h-[90vh] sm:h-auto mx-auto rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
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
            <h3 className="text-white font-semibold text-base sm:text-lg">
              {selectMode ? "Seleccionar responsable" : "Gestionar responsables"}
            </h3>
            <div className="flex items-center gap-2">
              {selectMode && (
                <motion.button
                  onClick={() => setSelectedId(null)}
                  className="px-3 py-2 rounded-xl bg-white/10 text-sm text-white transition-colors hover:bg-white/20"
                  title="Quitar selección (sin responsable)"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Sin responsable
                </motion.button>
              )}
              <motion.button
                onClick={onClose}
                className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Cerrar"
                title="Cerrar"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <HiX className="text-lg" />
              </motion.button>
            </div>
          </div>

          {/* Área scrollable */}
          <div className="px-4 pb-24 pt-3 overflow-y-auto h-[calc(90vh-56px)] sm:max-h-[70vh] sm:pb-5">
            {/* Crear nuevo (oculto en selector si no queremos ruido; lo dejamos visible por ahora) */}
            {!selectMode && (
              <motion.section
                className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 mb-4"
                variants={sectionVariants}
                initial="initial"
                animate="animate"
              >
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

                  <motion.button
                    onClick={crear}
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-400 text-neutral-900 font-semibold hover:brightness-95 disabled:opacity-60"
                    title="Agregar responsable"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <HiPlus /> Agregar
                  </motion.button>
                </div>
              </motion.section>
            )}

            {/* Buscador, filtros y total */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
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

                <motion.button
                  type="button"
                  onClick={() => setOnlyActive((v) => !v)}
                  className={`px-3 py-2 rounded-xl border text-sm ${
                    onlyActive
                      ? "bg-white text-black border-white"
                      : "bg-white/10 text-white border-white/10 hover:bg-white/15"
                  }`}
                  title="Mostrar solo activos"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {onlyActive ? "Solo activos" : "Todos"}
                </motion.button>
              </div>
            </motion.div>

            {/* Lista */}
            <motion.section
              className="rounded-2xl border border-white/10 bg-white/5"
              variants={sectionVariants}
              initial="initial"
              animate="animate"
            >
              {items.length === 0 && !loading ? (
                <div className="p-4 text-white/70 text-sm">
                  No hay responsables cargados.
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  <AnimatePresence>
                    {(loading ? Array.from({ length: 6 }) : filtered).map((emp, idx) => {
                      if (loading) {
                        return (
                          <motion.li
                            key={idx}
                            className="p-3"
                            variants={itemVariants}
                            initial="initial"
                            animate="animate"
                          >
                            <div className="h-6 w-40 bg-white/10 rounded mb-2 animate-pulse" />
                            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                          </motion.li>
                        );
                      }
                      const editing = editId === emp.id;
                      const isSelected = String(selectedId) === String(emp.id);

                      return (
                        <motion.li
                          key={emp.id}
                          className={`p-3 flex items-center gap-3 ${
                            selectMode ? "cursor-pointer hover:bg-white/5" : ""
                          }`}
                          onClick={() => {
                            if (!selectMode) return;
                            setSelectedId(emp.id);
                          }}
                          variants={itemVariants}
                          initial="initial"
                          animate="animate"
                          whileHover="hover"
                          whileTap="tap"
                          exit={{ opacity: 0, x: 20 }}
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
                              <div className="text-white truncate text-sm sm:text-base">
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
                                <motion.button
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-sm text-white transition-colors hover:bg-white/20"
                                  onClick={guardarEdicion}
                                  title="Guardar"
                                  variants={buttonVariants}
                                  whileHover="hover"
                                  whileTap="tap"
                                >
                                  <HiCheck /> Guardar
                                </motion.button>
                                <motion.button
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-sm text-white transition-colors hover:bg-white/20"
                                  onClick={() => {
                                    setEditId(null);
                                    setEditNombre("");
                                  }}
                                  title="Cancelar"
                                  variants={buttonVariants}
                                  whileHover="hover"
                                  whileTap="tap"
                                >
                                  <HiBan /> Cancelar
                                </motion.button>
                              </>
                            ) : (
                              !selectMode && (
                                <motion.button
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-sm text-white transition-colors hover:bg-white/20"
                                  onClick={() => iniciarEdicion(emp)}
                                  title="Editar nombre"
                                  variants={buttonVariants}
                                  whileHover="hover"
                                  whileTap="tap"
                                >
                                  <HiPencil /> Editar
                                </motion.button>
                              )
                            )}

                            {!selectMode && (
                              <motion.button
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-sm text-white transition-colors hover:bg-white/20"
                                onClick={() => activar(emp, !emp.activo)}
                                title={emp.activo ? "Desactivar" : "Activar"}
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                {emp.activo ? "Desactivar" : "Activar"}
                              </motion.button>
                            )}

                            {!selectMode && (
                              <motion.button
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-50 text-sm transition-colors hover:bg-red-500/30"
                                onClick={() => eliminar(emp)}
                                title="Eliminar"
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <HiTrash /> Eliminar
                              </motion.button>
                            )}

                            {selectMode && (
                              <motion.button
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
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                              >
                                Elegir
                              </motion.button>
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </motion.section>
          </div>

          {/* Footer (confirmar selección en modo selector) */}
          {selectMode && (
            <div
              className="sticky bottom-0 z-10 flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-[#0f0c28]/90 backdrop-blur"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <motion.button
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-white/10 text-sm text-white transition-colors hover:bg-white/20"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Cancelar
              </motion.button>
              <motion.button
                onClick={confirmarSeleccion}
                className="px-4 py-2 rounded-xl bg-primary-400 text-neutral-900 font-semibold hover:brightness-95"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Confirmar selección
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}