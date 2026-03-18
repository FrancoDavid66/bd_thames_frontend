// src/components/polizas/ConfirmModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineExclamation, HiX } from "react-icons/hi";

const modalVariants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }
};

export default function ConfirmModal({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-md bg-[#030712] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#010409]/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-inner">
                <HiOutlineExclamation className="text-xl" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Confirmar Acción</h3>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer group p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
            >
              <HiX className="text-lg group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 bg-black/20">
            <p className="text-sm font-semibold text-white/70 leading-relaxed text-center">
              {message || "¿Estás seguro de que deseas realizar esta acción?"}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 bg-[#010409]/80">
            <button
              onClick={onClose}
              className="cursor-pointer h-10 px-5 text-xs font-black uppercase text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all tracking-widest"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="cursor-pointer h-10 px-6 bg-rose-600 text-white text-xs font-black uppercase rounded-xl hover:bg-rose-500 transition-all tracking-widest shadow-lg shadow-rose-900/30 active:scale-95"
            >
              Eliminar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}