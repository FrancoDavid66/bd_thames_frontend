/* src/components/tareas/SubirFotosDniModal.jsx */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiIdentification, HiUpload, HiX, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { updateCliente } from "../../store/slices/clientesSlice";
import { registrarTareaCompletada } from "../../store/slices/tareasSlice";

function Lado({ titulo, url, subiendo, onPick }) {
  const ref = useRef(null);
  return (
    <div className="rounded-2xl bg-black/40 border border-white/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{titulo}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
          url ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
          {url ? <><HiCheckCircle /> Cargado</> : <><HiExclamationCircle /> Pendiente</>}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black aspect-[3/2] flex items-center justify-center">
        {url ? <img src={url} alt={titulo} className="w-full h-full object-cover" />
          : <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Sin imagen</span>}
      </div>
      <button type="button" onClick={() => ref.current?.click()} disabled={subiendo}
        className={`h-11 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
          url ? "bg-white/5 text-white border border-white/10 hover:bg-white/10" : "bg-sky-500 text-black hover:bg-sky-400"}`}>
        {subiendo ? <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <><HiUpload className="text-sm" /> {url ? "Cambiar" : "Subir"}</>}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await onPick(f); e.target.value = ""; }} />
    </div>
  );
}

export default function SubirFotosDniModal({ isOpen, item, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [frente, setFrente] = useState(null);
  const [dorso, setDorso] = useState(null);
  const [upF, setUpF] = useState(false);
  const [upD, setUpD] = useState(false);

  useEffect(() => { if (isOpen) { setFrente(null); setDorso(null); } }, [isOpen]);

  const subir = async (file, field, setUrl, setUp) => {
    if (!(file.type || "").toLowerCase().startsWith("image/")) { toast.error("Solo imágenes (JPG, PNG…)"); return; }
    setUp(true);
    try {
      const folder = `de-thames/clientes/${item.cliente_id}/documentacion`;
      const { secure_url } = await uploadToCloudinary(file, folder);
      if (!secure_url) throw new Error("Sin URL");
      await dispatch(updateCliente({ id: item.cliente_id, [field]: secure_url })).unwrap();
      setUrl(secure_url);
      toast.success("Foto subida ✅");
    } catch (e) {
      toast.error(e?.message || "No se pudo subir la foto");
    } finally {
      setUp(false);
    }
  };

  const listo = frente && dorso;

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
                <div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                  <HiIdentification className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Fotos del DNI</h2>
                  <p className="text-[11px] text-white/40">{item.cliente}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white"><HiX className="text-xl" /></button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Lado titulo="DNI - Frente" url={frente} subiendo={upF}
                onPick={(f) => subir(f, "archivo_dni_frente", setFrente, setUpF)} />
              <Lado titulo="DNI - Dorso" url={dorso} subiendo={upD}
                onPick={(f) => subir(f, "archivo_dni_dorso", setDorso, setUpD)} />
            </div>

            <div className="px-6 py-5 border-t border-white/5 flex justify-end gap-3">
              <button onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold text-sm hover:bg-white/10">Cerrar</button>
              <button onClick={() => { dispatch(registrarTareaCompletada({ tipo: "fotos_dni", cliente_id: item.cliente_id })); onSaved?.(); }} disabled={!listo}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 disabled:opacity-40">
                Listo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}