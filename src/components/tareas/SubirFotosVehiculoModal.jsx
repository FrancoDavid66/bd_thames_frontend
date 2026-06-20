/* src/components/tareas/SubirFotosVehiculoModal.jsx */
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { HiCamera, HiX, HiUpload } from "react-icons/hi";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { PolizasAPI } from "../../api/polizas";
import { registrarTareaCompletada } from "../../store/slices/tareasSlice";

const TIPOS = ["FRENTE", "PATENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "INTERIOR", "EQUIPO_GNC", "OTRA"];

export default function SubirFotosVehiculoModal({ isOpen, item, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [tipo, setTipo] = useState("FRENTE");
  const [subiendo, setSubiendo] = useState(false);
  const [subidas, setSubidas] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => { if (isOpen) { setTipo("FRENTE"); setSubidas([]); } }, [isOpen]);

  const subir = async (file) => {
    if (!file) return;
    if (!(file.type || "").toLowerCase().startsWith("image/")) { toast.error("Solo imágenes"); return; }
    setSubiendo(true);
    try {
      const { secure_url, public_id } = await uploadToCloudinary(file, "rc-admin/polizas/vehiculos");
      await PolizasAPI.crearFotoVehiculo({
        poliza: Number(item.poliza_id), tipo, url: secure_url, public_id, origen: "OFICINA",
      });
      setSubidas((p) => [...p, { url: secure_url, tipo }]);
      toast.success("Foto subida ✅");
    } catch (e) {
      toast.error(e?.message || "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden"
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <HiCamera className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Fotos del vehículo</h2>
                  <p className="text-[11px] text-white/40">{item.cliente} · {item.patente}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Tipo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)}
                    className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none">
                    {TIPOS.map((t) => <option key={t} value={t} className="bg-[#0f1324]">{t}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => fileRef.current?.click()} disabled={subiendo}
                    className="h-12 px-5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center gap-2">
                    {subiendo ? <div className="h-4 w-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      : <><HiUpload /> Subir foto</>}
                  </button>
                </div>
              </div>

              {subidas.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {subidas.map((f, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-white/10 bg-black aspect-[3/2]">
                      <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
            </div>

            <div className="px-6 py-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10">Cerrar</button>
              <button onClick={() => { dispatch(registrarTareaCompletada({ tipo: "fotos_poliza", poliza_id: item.poliza_id })); onSaved?.(); }} disabled={subidas.length === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 disabled:opacity-40">Listo</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}