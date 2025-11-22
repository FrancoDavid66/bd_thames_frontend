// src/components/polizas/PolizaHistoriaPanel.jsx
// Sección HISTORIAL temporalmente BLOQUEADA (solo UI, sin llamadas a API)

import { HiLockClosed, HiClipboardList, HiClock } from "react-icons/hi";
import { motion } from "framer-motion";

export default function PolizaHistoriaPanel({ polizaId }) {
  return (
    <section className="relative w-full rounded-2xl border border-gray-800 bg-gray-900 px-4 py-5 sm:px-6 sm:py-6 overflow-hidden">
      {/* Capa de bloqueo suave */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-black/40" />

      {/* Contenido de fondo: skeleton muy sutil */}
      <div className="opacity-15 select-none">
        <div className="h-6 w-32 rounded-lg bg-white/10 mb-3" />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="h-16 rounded-lg bg-white/10" />
          <div className="h-16 rounded-lg bg-white/10" />
          <div className="h-16 rounded-lg bg-white/10" />
          <div className="h-16 rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Mensaje central */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="absolute inset-0 z-20 grid place-items-center px-4 py-4 text-center"
      >
        <div className="max-w-md w-full">
          <div className="mx-auto mb-3 flex flex-col items-center gap-2">
            <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 shadow-inner">
              <HiLockClosed className="w-7 h-7 text-primary-400" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-800/80 border border-gray-700 px-3 py-0.5 text-[11px] font-semibold text-gray-300">
              HISTORIAL EN CONSTRUCCIÓN
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Historial de póliza todavía no disponible
          </h2>

          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            Estamos armando una línea de tiempo con cambios, movimientos y
            adjuntos importantes de cada póliza.
          </p>

          {polizaId && (
            <p className="mt-1 text-xs text-gray-500">
              Póliza ID: <span className="font-mono text-gray-300">{polizaId}</span>
            </p>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-gray-300 cursor-not-allowed text-sm"
              title="Próximamente"
            >
              <HiClipboardList className="w-5 h-5" />
              Ver historial
            </button>
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-400/15 border border-primary-400/40 text-primary-300 cursor-not-allowed text-sm"
              title="Próximamente"
            >
              <HiClock className="w-5 h-5" />
              Próxima actualización
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Mientras tanto podés revisar{" "}
            <b>Cuotas</b>, <b>Vehículo / papeles</b> y <b>Grúas</b> para la
            info operativa del día a día.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
