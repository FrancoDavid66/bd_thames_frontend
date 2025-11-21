// src/components/solicitudes/modalcreate/ResponsableManagerModal.jsx
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiSparkles, HiRefresh, HiCog } from "react-icons/hi";
import toast from "react-hot-toast";
import { solicitudesApi } from "../../../services/solicitudes";
import ResponsablesCrudModal from "./ResponsablesCrudModal";

/* Select liviano */
function Select({ label, value, onChange, options = [], className = "", selectRef }) {
  const normalized = Array.isArray(options)
    ? options.map((op) => (typeof op === "string" ? { id: op, nombre: op } : op))
    : [];
  return (
    <label className={`text-sm ${className}`}>
      <span className="block text-white/85 mb-1">{label}</span>
      <div className="relative">
        <select
          ref={selectRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 px-3 py-3 pr-9 outline-none focus:ring-4 ring-violet-200/30 text-white appearance-none transition"
          style={{ backgroundColor: "#141827" }}
        >
          <option value="">{normalized.length ? "— Seleccionar —" : "Sin datos"}</option>
          {normalized.map((op) => (
            <option key={op.id} value={op.id} className="bg-[#0f1324] text-white">
              {op.nombre || op.id}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">▾</span>
      </div>
    </label>
  );
}

/**
 * Modal minimalista: seleccionar Responsable.
 * ⚙️ abre CRUD avanzado en un modal aparte (ResponsablesCrudModal)
 */
export default function ResponsableManagerModal({ open, onCancel, onSelected }) {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [responsableId, setResponsableId] = useState("");

  // ⚙️ CRUD modal
  const [showCrud, setShowCrud] = useState(false);

  const backdropRef = useRef(null);
  const selectRef = useRef(null);

  // Bloqueo scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // Cargar empleados activos desde servicio
  const loadEmpleados = async () => {
    setLoading(true);
    try {
      const emps = await solicitudesApi.empleadosActivos();
      setEmpleados(Array.isArray(emps) ? emps : []);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los responsables");
      setEmpleados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setResponsableId("");
    loadEmpleados();
  }, [open]);

  // Foco inicial
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => selectRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onCancel?.();
  };

  return (
    <>
      <AnimatePresence>
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[95] grid place-items-center bg-black/70 backdrop-blur"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            className="w-[92%] max-w-lg rounded-2xl border border-white/10 bg-[#0f0c28] p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-rose-200 to-pink-200 text-[#0b0f1e]">
                  <HiSparkles />
                </span>
                Asignar responsable
              </h4>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowCrud(true)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20"
                  title="Administrar responsables"
                >
                  <HiCog className="text-white" />
                </button>
                <button
                  onClick={onCancel}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20"
                  title="Cerrar"
                >
                  <HiX className="text-white" />
                </button>
              </div>
            </div>

            {/* Selector + refrescar */}
            <div className="flex items-end gap-2">
              <Select
                label={loading ? "Responsable (cargando…)" : "Responsable"}
                value={responsableId}
                onChange={setResponsableId}
                options={empleados}
                selectRef={selectRef}
                className="flex-1"
              />
              <button
                type="button"
                onClick={loadEmpleados}
                className="h-[46px] px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white inline-flex items-center gap-2"
                title="Refrescar"
              >
                <HiRefresh />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onCancel}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!responsableId) return toast.error("Elegí un responsable.");
                  onSelected?.({ responsableId });
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-br from-sky-200 to-cyan-200 text-[#0b0f1e] font-semibold shadow hover:brightness-105 disabled:opacity-50"
                disabled={!empleados?.length}
              >
                Continuar
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* ⚙️ CRUD modal */}
      <ResponsablesCrudModal
        open={showCrud}
        onClose={() => setShowCrud(false)}
        onChanged={() => {
          // Si hubo cambios en el CRUD, refrescamos el select
          loadEmpleados();
        }}
      />
    </>
  );
}
