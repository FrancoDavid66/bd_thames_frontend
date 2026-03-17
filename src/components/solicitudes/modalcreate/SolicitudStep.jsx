// src/components/solicitudes/modalcreate/SolicitudStep.jsx
import { HiUser, HiExclamationCircle, HiChatAlt2 } from "react-icons/hi";
import { motion } from "framer-motion";
// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE DE SEGURIDAD
import { useAuth } from "../../../context/AuthContext";

// Definimos variants inline para animaciones profesionales
const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

const inputVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

/**
 * Paso 4: Datos de la Solicitud
 * Props:
 * - responsableNombre: string
 * - onCambiarResponsable: () => void
 * - solicitud: { prioridad: "BAJA" | "NORMAL" | "ALTA", observaciones: string }
 * - setSolicitud: (updater) => void
 */
export default function SolicitudStep({
  responsableNombre = "",
  onCambiarResponsable = () => {},
  solicitud = { prioridad: "NORMAL", observaciones: "" },
  setSolicitud = () => {},
}) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  return (
    <motion.fieldset
      className="rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:p-6 shadow-inner"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
    >
      <legend className="px-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">
        Configuración Final de Solicitud
      </legend>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
        
        {/* Bloque Responsable: Blindado visualmente */}
        <motion.div className="space-y-2" variants={inputVariants}>
          <span className="flex items-center gap-1.5 text-white/60 font-bold uppercase text-[10px] tracking-widest ml-1">
            <HiUser className="text-emerald-400" /> Responsable de Gestión
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-black/40 shadow-lg transition-all hover:border-emerald-500/30">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <HiUser className="text-lg" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/40 font-bold uppercase tracking-tighter">Asignado a:</p>
                <p className="text-sm font-bold text-white truncate">
                  {responsableNombre || "Sin asignar"}
                </p>
              </div>
            </div>
            
            <motion.button
              type="button"
              onClick={onCambiarResponsable}
              className="inline-flex items-center justify-center text-xs font-black uppercase tracking-tighter px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all shadow-md active:scale-95"
              title="Cambiar responsable de esta gestión"
              variants={buttonVariants}
            >
              Cambiar
            </motion.button>
          </div>
          <p className="text-[10px] text-white/30 italic ml-1">
            * El responsable recibirá las notificaciones de esta solicitud.
          </p>
        </motion.div>

        {/* Prioridad: Selector con feedback visual */}
        <Select
          label="Nivel de Prioridad"
          icon={<HiExclamationCircle className="text-amber-400" />}
          value={solicitud.prioridad || "NORMAL"}
          onChange={(v) => setSolicitud((s) => ({ ...s, prioridad: v }))}
          options={[
            { id: "BAJA", nombre: "🟢 Baja - Sin apuro" },
            { id: "NORMAL", nombre: "🟡 Normal - Estándar" },
            { id: "ALTA", nombre: "🔴 Alta - Prioridad inmediata" },
          ]}
        />

        {/* Observaciones: Área de texto profesional */}
        <Textarea
          label="Observaciones y Comentarios Internos"
          icon={<HiChatAlt2 className="text-sky-400" />}
          value={solicitud.observaciones || ""}
          onChange={(v) => setSolicitud((s) => ({ ...s, observaciones: v }))}
          placeholder="Detalles adicionales para el equipo técnico..."
          className="sm:col-span-2"
        />
      </div>
    </motion.fieldset>
  );
}

/* ============== UI Bits locales ============== */

function Textarea({ label, value, onChange, className = "", placeholder = "", icon }) {
  return (
    <motion.label
      className={`flex flex-col gap-2 ${className}`}
      variants={inputVariants}
    >
      <span className="flex items-center gap-1.5 text-white/60 font-bold uppercase text-[10px] tracking-widest ml-1">
        {icon} {label}
      </span>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:ring-2 ring-sky-500/40 text-white text-sm placeholder:text-white/20 transition-all resize-none shadow-inner"
      />
    </motion.label>
  );
}

function Select({ label, value, onChange, options = [], className = "", icon }) {
  const normalized = Array.isArray(options)
    ? options.map((op) => (typeof op === "string" ? { id: op, nombre: op } : op))
    : [];
    
  return (
    <motion.label
      className={`flex flex-col gap-2 ${className}`}
      variants={inputVariants}
    >
      <span className="flex items-center gap-1.5 text-white/60 font-bold uppercase text-[10px] tracking-widest ml-1">
        {icon} {label}
      </span>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-9 outline-none focus:ring-2 ring-violet-500/40 text-white text-sm font-bold appearance-none transition-all cursor-pointer shadow-lg"
          style={{ backgroundColor: "#0b0f1e" }}
        >
          <option value="">— Seleccionar —</option>
          {normalized.map((op) => (
            <option key={op.id} value={op.id} className="bg-[#0f1324] text-white">
              {op.nombre || op.id}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">
          ▾
        </span>
      </div>
    </motion.label>
  );
}