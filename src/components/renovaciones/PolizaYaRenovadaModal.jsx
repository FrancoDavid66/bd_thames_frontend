// src/components/renovaciones/PolizaYaRenovadaModal.jsx
//
// Modal que aparece cuando se intenta renovar una póliza que ya tiene
// una versión más nueva en el sistema.

import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiExclamationCircle, HiArrowRight } from "react-icons/hi";

export default function PolizaYaRenovadaModal({ open, error, onClose }) {
  if (!open || !error) return null;

  const ctx = error.context || {};
  const nuevaId = ctx.nueva_poliza_id;
  const nuevoNumero = ctx.nueva_numero || "—";
  const nuevaFecha = ctx.nueva_fecha || null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.96 }}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <HiExclamationCircle className="text-3xl text-amber-400 shrink-0" />
              <div>
                <div className="text-lg font-extrabold text-white">No se puede renovar</div>
                <div className="text-xs text-amber-200/80 mt-0.5">{error.message}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/15 transition-colors"
              title="Cerrar"
            >
              <HiX />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-white/85 leading-relaxed">
              {error.detail || "Esta póliza ya tiene una versión renovada en el sistema."}
            </p>

            {/* Detalle de la nueva versión */}
            {nuevaId && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">
                  Versión renovada
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">N° de póliza:</span>
                    <span className="font-bold text-white tabular-nums">{nuevoNumero}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">ID interno:</span>
                    <span className="font-mono text-white tabular-nums">#{nuevaId}</span>
                  </div>
                  {nuevaFecha && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Fecha de emisión:</span>
                      <span className="text-white tabular-nums">{nuevaFecha}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error.action && (
              <div className="text-xs text-amber-200/90 leading-relaxed">
                💡 {error.action}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition-colors"
              >
                Cerrar
              </button>
              {nuevaId && (
                <a
                  href={`/polizas/${nuevaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 text-sm font-extrabold text-white hover:bg-sky-400 transition-colors shadow-md shadow-sky-500/20"
                >
                  Ver póliza nueva <HiArrowRight />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}