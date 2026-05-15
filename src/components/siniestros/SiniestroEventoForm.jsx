// src/components/siniestros/SiniestroEventoForm.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX } from "react-icons/hi";
import dayjs from "dayjs";

export default function SiniestroEventoForm({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    fecha_evento: dayjs().format("YYYY-MM-DD"),
    descripcion_evento: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({ fecha_evento: dayjs().format("YYYY-MM-DD"), descripcion_evento: "" });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}>

          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="font-black text-slate-100">Nueva nota en bitácora</h3>
            <button onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
              <HiX className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha del evento</label>
              <input type="date" required
                value={form.fecha_evento}
                max={dayjs().format("YYYY-MM-DD")}
                onChange={e => setForm(p => ({ ...p, fecha_evento: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500 [color-scheme:dark] transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción *</label>
              <textarea required rows={4}
                value={form.descripcion_evento}
                onChange={e => setForm(p => ({ ...p, descripcion_evento: e.target.value }))}
                placeholder="Describí el movimiento o novedad del siniestro..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none transition-colors" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-900/30 transition-colors">
                Guardar nota
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}