import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Overlay de celebración “TERMINADO” (dark + dorado, sin degradés).
 * Animación rápida (~0.8s). No muestra nombre ni subtítulo.
 *
 * Props:
 *  - show: boolean
 *  - onClose: () => void
 *  - title?: string (default: "TERMINADO")
 *  - autoCloseMs?: number | null  -> si querés que se cierre solo (p.ej. 1100)
 */
export default function TerminacionCelebration({
  show,
  onClose,
  title = "TERMINADO",
  autoCloseMs = null,
}) {
  // autocierre opcional
  useEffect(() => {
    if (!show || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [show, autoCloseMs, onClose]);

  const sparks = Array.from({ length: 16 });

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-[86vw] max-w-sm rounded-3xl border border-yellow-500/40 bg-[#0b0f19] text-center px-6 py-8 shadow-[0_0_0_1px_rgba(255,255,255,.06)]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }} // rápido
            onClick={(e) => e.stopPropagation()}
          >
            {/* Aro dorado */}
            <div className="mx-auto mb-4 grid place-items-center">
              <div className="relative h-28 w-28 rounded-2xl border-2 border-yellow-500/80 bg-yellow-400/10 shadow-[0_0_32px_rgba(255,200,0,.25)]" />
            </div>

            {/* Título */}
            <motion.h2
              className="text-2xl font-extrabold tracking-wide text-yellow-400"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.18, delay: 0.05 }}
            >
              {title}
            </motion.h2>

            {/* Botón cerrar */}
            {!autoCloseMs && (
              <motion.button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex items-center justify-center rounded-xl border border-yellow-500/30 bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-105 active:brightness-95"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
              >
                Continuar
              </motion.button>
            )}

            {/* Chispas doradas */}
            <div className="pointer-events-none absolute inset-0">
              {sparks.map((_, i) => {
                const angle = (i / sparks.length) * 2 * Math.PI;
                const r = 86;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                const d = 0.5 + (i % 4) * 0.06;
                return (
                  <motion.span
                    key={i}
                    className="absolute h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_16px_rgba(255,200,0,.6)]"
                    style={{ left: "50%", top: "50%" }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0.8 }}
                    animate={{ x, y, scale: 1, opacity: 0 }}
                    transition={{ duration: 0.8 * d, ease: "easeOut" }}
                  />
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
