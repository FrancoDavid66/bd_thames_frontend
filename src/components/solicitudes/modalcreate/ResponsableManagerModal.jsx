// src/components/solicitudes/modalcreate/ResponsableManagerModal.jsx
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiSparkles, HiRefresh, HiCog } from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIÓN CORREGIDA: Usamos la API que ya blindamos con el Token JWT
import { solicitudesApi } from "../../../services/solicitudes";
import { useAuth } from "../../../context/AuthContext";
import ResponsablesCrudModal from "./ResponsablesCrudModal";

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

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

/* Select liviano */
function Select({ label, value, onChange, options = [], className = "", selectRef }) {
  const normalized = Array.isArray(options)
    ? options.map((op) => (typeof op === "string" ? { id: op, nombre: op } : op))
    : [];
  return (
    <label className={`text-xs sm:text-sm ${className}`}>
      <span className="block text-white/85 mb-1">{label}</span>
      <div className="relative">
        <select
          ref={selectRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 px-3 py-2 sm:py-3 pr-9 outline-none focus:ring-4 ring-violet-200/30 text-white appearance-none transition"
          style={{ backgroundColor: "#141827" }}
        >
          {/* 🚀 Mensaje dinámico si no hay datos en la oficina */}
          <option value="">{normalized.length ? "— Seleccionar Responsable —" : "No hay personal en esta oficina"}</option>
          {normalized.map((op) => (
            <option key={op.id} value={op.id} className="bg-[#0f1324] text-white uppercase font-bold">
              {op.nombre || op.id}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80">▾</span>
      </div>
    </label>
  );
}

// 🚀 PARCHE: Recibimos "oficinaId" desde el CreateSolicitudModal
export default function ResponsableManagerModal({ open, onCancel, onSelected, oficinaId }) {
  const { user } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [responsableId, setResponsableId] = useState("");

  const [showCrud, setShowCrud] = useState(false);

  const backdropRef = useRef(null);
  const selectRef = useRef(null);

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // 🚀 CARGA BLINDADA Y FILTRADA
  const loadEmpleados = async () => {
    setLoading(true);
    try {
      const emps = await solicitudesApi.empleadosActivos();
      let rawList = Array.isArray(emps) ? emps : (emps?.results || []);

      // 🛡️ FILTRO MÁGICO PARA ADMIN: Si somos admin y nos pasaron una oficina, mostramos solo los empleados de ESA oficina
      if (isWebAdmin && oficinaId) {
        rawList = rawList.filter(emp => String(emp.oficina) === String(oficinaId) || String(emp.oficina_id) === String(oficinaId));
      }

      setEmpleados(rawList);
    } catch (e) {
      console.error("[ResponsableManager] Error:", e);
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
  }, [open, oficinaId]); // 🔄 Recarga si cambia la oficina

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
        <motion.div
          ref={backdropRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[95] grid place-items-center bg-black/70 backdrop-blur p-4 sm:p-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            variants={modalVariants} initial="initial" animate="animate" exit="exit"
            className="relative w-full max-w-md sm:max-w-lg rounded-2xl border border-white/10 bg-[#0f0c28] p-3 sm:p-4 shadow-2xl overflow-hidden"
            role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <h4 className="text-white font-semibold flex items-center gap-2 text-base sm:text-lg">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-rose-200 to-pink-200 text-[#0b0f1e]">
                    <HiSparkles />
                  </span>
                  Asignar responsable
                </h4>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-8">
                   Sucursal: {isWebAdmin ? 'SELECCIONADA (ADMIN)' : (user?.perfil?.oficina_nombre || 'Local')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {isWebAdmin && (
                  <motion.button
                    type="button" onClick={() => setShowCrud(true)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                    title="Administrar responsables" variants={buttonVariants} whileHover="hover" whileTap="tap"
                  >
                    <HiCog />
                  </motion.button>
                )}
                <motion.button
                  onClick={onCancel}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                  variants={buttonVariants} whileHover="hover" whileTap="tap"
                >
                  <HiX />
                </motion.button>
              </div>
            </div>

            <motion.div className="flex items-end gap-2" variants={sectionVariants} initial="initial" animate="animate">
              <Select
                label={loading ? "Personal (sincronizando…)" : "Personal de esta oficina"}
                value={responsableId}
                onChange={setResponsableId}
                options={empleados}
                selectRef={selectRef}
                className="flex-1"
              />
              <motion.button
                type="button" onClick={loadEmpleados}
                className="h-[42px] sm:h-[46px] px-2 sm:px-3 rounded-xl bg-white/10 text-white inline-flex items-center gap-2 hover:bg-white/20 border border-white/10"
                variants={buttonVariants} whileHover="hover" whileTap="tap"
              >
                <HiRefresh className={loading ? "animate-spin" : ""} />
              </motion.button>
            </motion.div>

            <motion.div className="mt-4 flex items-center justify-end gap-2" variants={sectionVariants} initial="initial" animate="animate">
              <button onClick={onCancel} className="px-3 py-2 rounded-xl bg-white/5 text-sm text-white/50 hover:text-white transition-colors uppercase font-bold text-[10px]">Cancelar</button>
              <motion.button
                onClick={() => {
                  if (!responsableId) return toast.error("Elegí un responsable.");
                  onSelected?.({ responsableId });
                }}
                className="px-6 py-2 rounded-2xl bg-sky-500 text-black font-black uppercase text-[11px] tracking-widest shadow-lg shadow-sky-900/20 disabled:opacity-30"
                disabled={!empleados?.length}
                variants={buttonVariants} whileHover="hover" whileTap="tap"
              >
                Asignar ahora
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <ResponsablesCrudModal open={showCrud} onClose={() => setShowCrud(false)} onChanged={loadEmpleados} />
    </>
  );
}