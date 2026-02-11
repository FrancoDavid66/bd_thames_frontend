// src/components/gruas/modal/Modal.jsx
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX } from "react-icons/hi";

const SIZE = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-[96vw]",
};

export default function Modal({
  title,
  children,
  footer,
  onClose,
  size = "xl",
  closeOnBackdrop = true,
  className = "",
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-modal="true"
        role="dialog"
        onClick={() => (closeOnBackdrop ? onClose?.() : null)}
      >
        {/* backdrop */}
        <div className="absolute inset-0 bg-black/70" />

        {/* panel */}
        <motion.div
          className={[
            "relative z-[91] w-full",
            SIZE[size] || SIZE.xl,
            "bg-[#0F1318] text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden",
            // alto grande: full en mobile, panel en desktop
            "h-[92vh] sm:h-[88vh]",
            className,
          ].join(" ")}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 18, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* header sticky */}
          <div className="sticky top-0 z-10 bg-[#0F1318]/90 backdrop-blur border-b border-white/10">
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold truncate">
                  {title}
                </div>
              </div>

              <button
                onClick={onClose}
                className="h-10 w-10 grid place-content-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                aria-label="Cerrar"
                type="button"
              >
                <HiX className="text-xl" />
              </button>
            </div>
          </div>

          {/* body (scroll) */}
          <div className="h-[calc(92vh-64px)] sm:h-[calc(88vh-64px)] overflow-auto">
            <div className="px-4 sm:px-5 py-4">{children}</div>
          </div>

          {/* footer sticky */}
          {footer ? (
            <div className="sticky bottom-0 z-10 bg-[#0F1318]/90 backdrop-blur border-t border-white/10">
              <div className="px-4 sm:px-5 py-3">{footer}</div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
