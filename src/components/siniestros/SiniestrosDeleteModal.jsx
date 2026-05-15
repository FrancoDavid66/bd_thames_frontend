// src/components/siniestros/SiniestrosDeleteModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { HiExclamation, HiX } from "react-icons/hi";
import dayjs from "dayjs";

export default function SiniestrosDeleteModal({ isOpen, onClose, onConfirm, siniestro }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="bg-slate-900 border border-rose-900/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}>

          <div className="h-1 bg-rose-600 w-full" />

          <div className="p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-rose-900/50 flex items-center justify-center shrink-0">
                <HiExclamation className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-slate-100 text-lg">Eliminar siniestro</h3>
                <p className="text-sm text-slate-400 mt-1">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {siniestro && (
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 mb-5 space-y-1">
                <p className="text-sm font-bold text-slate-200">{siniestro.cliente_label || "Sin cliente"}</p>
                {siniestro.fecha_siniestro && (
                  <p className="text-xs text-slate-500">
                    {dayjs(siniestro.fecha_siniestro).format("DD/MM/YYYY")} · {siniestro.responsabilidad_label || siniestro.responsabilidad}
                  </p>
                )}
                {siniestro.patente && (
                  <p className="text-xs font-mono text-slate-400">{siniestro.patente}</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={onConfirm}
                className="flex-1 h-11 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition-colors">
                Sí, eliminar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}