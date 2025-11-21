// src/components/polizas/PolizaHistoriaPanel.jsx
// Sección HISTORIAL temporalmente BLOQUEADA.
// - No hace llamadas a API.
// - Muestra un panel con candado y desactiva interacciones.
// - Mantiene estética moderna con la paleta existente.

import { HiLockClosed, HiClipboardList, HiClock } from "react-icons/hi";
import { motion } from "framer-motion";

export default function PolizaHistoriaPanel({ polizaId }) {
  return (
    <section className="relative w-full rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur p-6 shadow-2xl shadow-black/30 overflow-hidden">
      {/* Capa de bloqueo */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,rgba(0,0,0,.55),rgba(0,0,0,.35))] rounded-2xl" />

      {/* Contenido “fantasma” (solo decorativo) */}
      <div className="opacity-25 select-none">
        <div className="h-10 w-40 rounded-xl bg-white/10 mb-4" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-28 rounded-xl bg-white/10" />
          <div className="h-28 rounded-xl bg-white/10" />
          <div className="h-28 rounded-xl bg-white/10" />
          <div className="h-28 rounded-xl bg-white/10" />
        </div>
      </div>

      {/* Mensaje central */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="absolute inset-0 z-20 grid place-items-center p-6 text-center"
      >
        <div className="max-w-md w-full">
          <div className="mx-auto mb-4 grid place-items-center w-16 h-16 rounded-2xl bg-white/10 border border-white/10 shadow-inner">
            <HiLockClosed className="w-8 h-8 text-primary-400" />
          </div>

          <h2 className="text-xl font-semibold text-white">
            Historial bloqueado por ahora
          </h2>

          <p className="mt-2 text-sm text-white/80 leading-relaxed">
            Estamos preparando esta sección para mostrar eventos, cambios y
            adjuntos relevantes de la póliza.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/10 text-white/80 cursor-not-allowed"
              title="Próximamente"
            >
              <HiClipboardList className="w-5 h-5" />
              Ver historial
            </button>
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-400/20 border border-primary-400/30 text-primary-300 cursor-not-allowed"
              title="Próximamente"
            >
              <HiClock className="w-5 h-5" />
              Próximamente
            </button>
          </div>

          <p className="mt-3 text-xs text-white/60">
            Tip: mientras tanto podés revisar <b>Cuotas</b> o <b>Documentos</b>.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
