/* src/components/tareas/CompletarDatoClienteModal.jsx */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiCalendar, HiX, HiCheck } from "react-icons/hi";
import { updateCliente } from "../../store/slices/clientesSlice";
import { registrarTareaCompletada } from "../../store/slices/tareasSlice";

export default function CompletarDatoClienteModal({ isOpen, item, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [fecha, setFecha] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setFecha(""); }, [isOpen]);

  const guardar = async () => {
    if (!fecha) { toast.error("Cargá la fecha de nacimiento"); return; }
    setSaving(true);
    try {
      await dispatch(updateCliente({ id: item.cliente_id, fecha_nacimiento: fecha })).unwrap();
      dispatch(registrarTareaCompletada({ tipo: "datos_cliente", cliente_id: item.cliente_id }));
      toast.success("Dato completado ✅");
      onSaved?.();
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden"
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <HiCalendar className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Completar dato</h2>
                  <p className="text-[11px] text-white/40">{item.cliente}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
            </div>

            <div className="p-6">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Fecha de nacimiento</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 [color-scheme:dark]" />
            </div>

            <div className="px-6 py-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={onClose} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 disabled:opacity-50">Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-sky-500 text-black font-bold text-sm hover:bg-sky-400 disabled:opacity-50 inline-flex items-center gap-2">
                <HiCheck /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}