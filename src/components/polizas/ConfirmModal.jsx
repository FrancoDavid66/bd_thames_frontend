// src/components/comunes/ConfirmModal.jsx
import { motion } from "framer-motion";

const ConfirmModal = ({ isOpen, onClose, onConfirm, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-red-500/70 via-amber-400/20 to-neutral-900/90 p-[1px] shadow-2xl shadow-black/60"
        initial={{ scale: 0.9, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
      >
        <div className="rounded-2xl bg-neutral-950 px-5 py-5 text-neutral-50">
          {/* Header con icono */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 border border-red-500/40">
              <span className="text-lg font-bold">!</span>
            </div>
            <p className="text-sm leading-relaxed text-neutral-100">
              {message}
            </p>
          </div>

          {/* Botones */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-medium text-neutral-100 hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 transition shadow-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmModal;
