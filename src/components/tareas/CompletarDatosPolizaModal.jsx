/* src/components/tareas/CompletarDatosPolizaModal.jsx */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiDocumentText, HiX, HiCheck } from "react-icons/hi";
import { updatePoliza } from "../../store/slices/polizasSlice";
import { registrarTareaCompletada } from "../../store/slices/tareasSlice";
import api from "../../services/api";

export default function CompletarDatosPolizaModal({ isOpen, item, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [compania, setCompania] = useState("");
  const [numero, setNumero] = useState("");
  const [companias, setCompanias] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setCompania(item.compania || "");
      setNumero(item.numero_poliza || "");
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;
    api.get("companias/")
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCompanias(arr.filter((c) => c.activa).map((c) => c.nombre));
      })
      .catch(() => {});
  }, [isOpen]);

  const opciones = useMemo(
    () => Array.from(new Set([item?.compania, ...companias].filter(Boolean))),
    [companias, item?.compania]
  );

  const guardar = async () => {
    if (!compania.trim()) { toast.error("Elegí la compañía"); return; }
    setSaving(true);
    try {
      const num = numero.trim();
      await dispatch(updatePoliza({
        id: item.poliza_id,
        compania: compania.trim(),
        numero_poliza: num || null,
        sin_numero: !num,
      })).unwrap();
      dispatch(registrarTareaCompletada({ tipo: "datos_poliza", poliza_id: item.poliza_id }));
      toast.success("Datos completados ✅");
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
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <HiDocumentText className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Datos de la póliza</h2>
                  <p className="text-[11px] text-white/40">{item.cliente} · {item.patente}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Compañía</label>
                <select value={compania} onChange={(e) => setCompania(e.target.value)}
                  className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none">
                  <option value="" className="bg-[#0f1324]">— Seleccionar —</option>
                  {opciones.map((o) => <option key={o} value={o} className="bg-[#0f1324]">{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Número de póliza</label>
                <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ej: 123456"
                  className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={onClose} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10 disabled:opacity-50">Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-50 inline-flex items-center gap-2">
                <HiCheck /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}