import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FaExternalLinkAlt, FaSearchPlus } from "react-icons/fa";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { updateCliente } from "../../store/slices/clientesSlice";

const isImageFile = (file) => !!file && (file.type || "").toLowerCase().startsWith("image/");

export default function ClienteDocumentacionCard({ cliente }) {
  const dispatch = useDispatch();
  const inputFrenteRef = useRef(null);
  const inputDorsoRef = useRef(null);

  const clientId = cliente?.id ?? null;

  const [urlFrente, setUrlFrente] = useState(cliente?.archivo_dni_frente || cliente?.archivo_dni || null);
  const [urlDorso, setUrlDorso] = useState(cliente?.archivo_dni_dorso || null);

  const [pendFrente, setPendFrente] = useState(null);
  const [pendDorso, setPendDorso] = useState(null);

  const [upF, setUpF] = useState(false);
  const [upD, setUpD] = useState(false);

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setUrlFrente(cliente?.archivo_dni_frente || cliente?.archivo_dni || null);
    setUrlDorso(cliente?.archivo_dni_dorso || null);
  }, [cliente?.archivo_dni_frente, cliente?.archivo_dni_dorso, cliente?.archivo_dni]);

  useEffect(() => {
    const sync = async () => {
      if (!clientId) return;
      const patch = {};
      if (pendFrente) patch.archivo_dni_frente = pendFrente;
      if (pendDorso) patch.archivo_dni_dorso = pendDorso;
      if (Object.keys(patch).length) {
        try {
          await dispatch(updateCliente({ id: clientId, ...patch })).unwrap();
          setPendFrente(null); setPendDorso(null);
        } catch (e) {
          console.error(e);
          toast.error("No se pudo sincronizar la documentación");
        }
      }
    };
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const subir = async (file, setUrl, setPend, field) => {
    if (!isImageFile(file)) throw new Error("Solo imágenes (JPG, PNG, etc.)");
    const folder = `de-thames/clientes/${clientId || "sin-id"}/documentacion`;
    const { secure_url } = await uploadToCloudinary(file, folder);
    if (!secure_url) throw new Error("No se recibió URL");
    setUrl(secure_url);
    if (clientId) await dispatch(updateCliente({ id: clientId, [field]: secure_url })).unwrap();
    else setPend(secure_url);
  };

  const quitar = async (setUrl, setPend, field) => {
    setUrl(null); setPend(null);
    if (clientId) await dispatch(updateCliente({ id: clientId, [field]: null })).unwrap();
  };

  const Box = ({ title, url, inputRef, uploading, onPick, onRemove }) => (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 lg:p-5 shadow-inner">
      <div className="text-base font-semibold mb-3">{title}</div>

      {/* miniatura */}
      <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black">
        <div className="w-full h-56 md:h-64">
          {url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img className="w-full h-full object-cover" src={url} />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-white/50">Sin imagen</div>
          )}
        </div>

        {url && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-black/70 text-white border border-white/10 hover:bg-black/80" aria-label="Abrir pestaña">
              <FaExternalLinkAlt size={14} />
            </a>
            <button onClick={() => setPreview(url)} className="p-2 rounded-lg bg-black/70 text-white border border-white/10 hover:bg-black/80" aria-label="Ver grande">
              <FaSearchPlus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* acciones */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onPick} disabled={uploading} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold disabled:opacity-60">
          {url ? 'Reemplazar' : 'Subir'}
        </button>
        <button onClick={onRemove} disabled={!url || uploading} className="h-10 rounded-xl bg-red-600 hover:bg-red-500 font-semibold disabled:opacity-60">
          Quitar
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => onPick(e)} className="hidden" />
    </div>
  );

  return (
    <motion.div
      className="bg-slate-800/90 p-6 rounded-2xl border border-white/10 shadow-md"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold mb-4">Documentación — DNI / Pasaporte</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Box
          title="Frente"
          url={urlFrente}
          inputRef={inputFrenteRef}
          uploading={upF}
          onPick={(e) => {
            const file = e?.target?.files?.[0];
            if (!file) return inputFrenteRef.current?.click();
            (async () => { try { setUpF(true); await subir(file, setUrlFrente, setPendFrente, 'archivo_dni_frente'); toast.success('Frente actualizado'); } catch (er) { toast.error(er?.message || 'Error'); } finally { setUpF(false); e.target.value = ''; } })();
          }}
          onRemove={() => (async () => { try { setUpF(true); await quitar(setUrlFrente, setPendFrente, 'archivo_dni_frente'); toast.success('Frente eliminado'); } catch { toast.error('No se pudo eliminar'); } finally { setUpF(false); } })()}
        />

        <Box
          title="Dorso"
          url={urlDorso}
          inputRef={inputDorsoRef}
          uploading={upD}
          onPick={(e) => {
            const file = e?.target?.files?.[0];
            if (!file) return inputDorsoRef.current?.click();
            (async () => { try { setUpD(true); await subir(file, setUrlDorso, setPendDorso, 'archivo_dni_dorso'); toast.success('Dorso actualizado'); } catch (er) { toast.error(er?.message || 'Error'); } finally { setUpD(false); e.target.value = ''; } })();
          }}
          onRemove={() => (async () => { try { setUpD(true); await quitar(setUrlDorso, setPendDorso, 'archivo_dni_dorso'); toast.success('Dorso eliminado'); } catch { toast.error('No se pudo eliminar'); } finally { setUpD(false); } })()}
        />
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 grid place-items-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-5xl"
            >
              <button onClick={() => setPreview(null)} className="absolute -top-2 -right-2 px-3 py-1.5 rounded-md bg-slate-800 border border-white/10">Cerrar</button>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={preview} className="w-full h-[72vh] object-contain rounded-xl border border-white/10 bg-black" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
