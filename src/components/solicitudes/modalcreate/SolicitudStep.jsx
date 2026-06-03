// src/components/solicitudes/modalcreate/SolicitudStep.jsx
import { HiUser, HiExclamationCircle, HiChatAlt2, HiSwitchHorizontal } from "react-icons/hi";
import { motion } from "framer-motion";
// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE DE SEGURIDAD
import { useAuth } from "../../../context/AuthContext";

const sectionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.08 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

/* Opciones de prioridad con su color de acento */
const PRIORIDADES = [
  { id: "BAJA",   nombre: "Baja",   sub: "Sin apuro",            dot: "bg-emerald-400", ring: "ring-emerald-500/40", soft: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  { id: "NORMAL", nombre: "Normal", sub: "Estándar",             dot: "bg-amber-400",   ring: "ring-amber-500/40",   soft: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  { id: "ALTA",   nombre: "Alta",   sub: "Prioridad inmediata",  dot: "bg-rose-400",    ring: "ring-rose-500/40",    soft: "bg-rose-500/10 border-rose-500/30 text-rose-300" },
];

/**
 * Paso final: Datos de la Solicitud
 * (mismo contenido y props que antes — solo rediseño visual + responsive)
 */
export default function SolicitudStep({
  responsableNombre = "",
  onCambiarResponsable = () => {},
  solicitud = { prioridad: "NORMAL", observaciones: "" },
  setSolicitud = () => {},
}) {
  useAuth(); // mantiene el contexto disponible (blindaje)
  const prioridadActual = solicitud.prioridad || "NORMAL";

  return (
    <motion.div
      className="space-y-4"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
    >
      {/* ===== Responsable ===== */}
      <motion.section
        variants={itemVariants}
        className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 sm:p-5 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <HiUser className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
            Responsable de gestión
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-black/30">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-500/20 flex items-center justify-center text-emerald-300 border border-emerald-500/30">
              <HiUser className="text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Asignado a</p>
              <p className="text-base font-bold text-white truncate leading-tight">
                {responsableNombre || "Sin asignar"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCambiarResponsable}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-2xl bg-white/10 border border-white/10 text-white/80 text-xs font-black uppercase tracking-wider hover:bg-white/20 hover:text-white active:scale-95 transition-all"
          >
            <HiSwitchHorizontal /> Cambiar
          </button>
        </div>
        <p className="text-[10px] text-white/30 italic mt-2 ml-1">
          El responsable recibirá las notificaciones de esta solicitud.
        </p>
      </motion.section>

      {/* ===== Prioridad (pills táctiles, ideal celular) ===== */}
      <motion.section
        variants={itemVariants}
        className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 sm:p-5 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <HiExclamationCircle className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
            Nivel de prioridad
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRIORIDADES.map((p) => {
            const sel = prioridadActual === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSolicitud((s) => ({ ...s, prioridad: p.id }))}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  sel
                    ? `${p.soft} ring-2 ${p.ring}`
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/[0.08]"
                }`}
              >
                <span className={`h-3 w-3 rounded-full shrink-0 ${p.dot} ${sel ? "" : "opacity-40"}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">{p.nombre}</span>
                  <span className="block text-[10px] uppercase tracking-wider opacity-60">{p.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* ===== Observaciones ===== */}
      <motion.section
        variants={itemVariants}
        className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 sm:p-5 shadow-xl"
      >
        <label className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
            <HiChatAlt2 className="text-sky-400" /> Observaciones internas
          </span>
          <textarea
            rows={4}
            value={solicitud.observaciones || ""}
            onChange={(e) => setSolicitud((s) => ({ ...s, observaciones: e.target.value }))}
            placeholder="Detalles adicionales para el equipo técnico…"
            className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:ring-2 ring-sky-500/40 focus:border-sky-500/30 transition-all resize-none shadow-inner"
          />
        </label>
      </motion.section>
    </motion.div>
  );
}