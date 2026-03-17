// src/components/clientes/ClienteDocumentacionCard.jsx
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { 
  HiOutlinePhotograph, 
  HiUpload, 
  HiTrash, 
  HiX, 
  HiSearchCircle,
  HiCheckCircle,
  HiExclamationCircle
} from "react-icons/hi";

import { uploadToCloudinary } from "../../utils/cloudinary";
import { updateCliente } from "../../store/slices/clientesSlice";

const isImageFile = (file) =>
  !!file && (file.type || "").toLowerCase().startsWith("image/");

export default function ClienteDocumentacionCard({ cliente }) {
  const dispatch = useDispatch();

  const inputFrenteRef = useRef(null);
  const inputDorsoRef = useRef(null);

  const clientId = cliente?.id ?? null;

  const [urlFrente, setUrlFrente] = useState(
    cliente?.archivo_dni_frente || cliente?.archivo_dni || null
  );
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
      if (!Object.keys(patch).length) return;

      try {
        await dispatch(updateCliente({ id: clientId, ...patch })).unwrap();
        setPendFrente(null);
        setPendDorso(null);
      } catch (e) {
        console.error(e);
        toast.error("No se pudo sincronizar la documentación");
      }
    };
    sync();
  }, [clientId, pendFrente, pendDorso, dispatch]);

  const subir = async (file, setUrl, setPend, field) => {
    if (!isImageFile(file)) throw new Error("Solo imágenes (JPG, PNG, etc.)");

    const folder = `de-thames/clientes/${clientId || "sin-id"}/documentacion`;
    const { secure_url } = await uploadToCloudinary(file, folder);

    if (!secure_url) throw new Error("No se recibió URL");

    setUrl(secure_url);

    if (clientId) {
      await dispatch(updateCliente({ id: clientId, [field]: secure_url })).unwrap();
    } else {
      setPend(secure_url);
    }
  };

  const quitar = async (setUrl, setPend, field) => {
    setUrl(null);
    setPend(null);
    if (clientId) {
      await dispatch(updateCliente({ id: clientId, [field]: null })).unwrap();
    }
  };

  // Componente interno para cada "Lado" del DNI optimizado
  const Box = ({ title, url, inputRef, uploading, removing, onFile, onRemove }) => (
    <div className="rounded-2xl bg-black/40 border border-white/5 p-4 flex flex-col gap-4">
      
      {/* Header de la caja */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/60">{title}</div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
            url
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          {url ? <><HiCheckCircle /> Cargado</> : <><HiExclamationCircle /> Pendiente</>}
        </span>
      </div>

      {/* Miniatura / Visor (Adaptable a móvil) */}
      <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black aspect-[3/2] w-full flex items-center justify-center shadow-inner">
        {url ? (
          <>
            <img className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" src={url} alt={title} />
            <button
              type="button"
              onClick={() => setPreview(url)}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white backdrop-blur-sm"
              aria-label="Ver imagen ampliada"
            >
              <HiSearchCircle className="text-4xl text-sky-400 drop-shadow-lg" />
              <span className="text-[10px] font-black uppercase tracking-widest mt-2">Ampliar</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-white/20">
            <HiOutlinePhotograph className="text-4xl mb-2 opacity-50" />
            <span className="text-[9px] font-black uppercase tracking-widest">Sin Imagen</span>
          </div>
        )}
      </div>

      {/* Botones de Acción (Grandes para móvil) */}
      <div className="grid grid-cols-2 gap-3 mt-auto pt-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`h-11 rounded-xl flex cursor-pointer  items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
            url 
              ? "bg-white/5 text-white border border-white/10 hover:bg-white/10" 
              : "bg-sky-500 text-black shadow-lg shadow-sky-900/40 hover:bg-sky-400"
          } disabled:opacity-50`}
        >
          {uploading ? (
             <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
             <><HiUpload className="text-sm " /> {url ? "Cambiar" : "Subir"}</>
          )}
        </button>
        
        <button
          type="button"
          onClick={onRemove}
          disabled={!url || uploading || removing}
          className="h-11 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <HiTrash className="text-sm" /> {removing ? "..." : "Quitar"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          await onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );

  return (
    <motion.section
      className="rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header General */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <HiOutlinePhotograph className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-widest truncate">
              Registro Fotográfico
            </h2>
            <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              DNI Frente y Dorso
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de Cajas */}
      <div className="flex-1 p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
          <Box
            title="DNI - Frente"
            url={urlFrente}
            inputRef={inputFrenteRef}
            uploading={upF}
            removing={false}
            onFile={async (file) => {
              try {
                setUpF(true);
                await subir(file, setUrlFrente, setPendFrente, "archivo_dni_frente");
                toast.success("Frente actualizado correctamente");
              } catch (er) {
                toast.error(er?.message || "Error al subir la imagen");
              } finally { setUpF(false); }
            }}
            onRemove={async () => {
              if (!urlFrente) return;
              try {
                setUpF(true);
                await quitar(setUrlFrente, setPendFrente, "archivo_dni_frente");
                toast.success("Imagen del frente eliminada");
              } catch (er) {
                toast.error("No se pudo eliminar la imagen");
              } finally { setUpF(false); }
            }}
          />

          <Box
            title="DNI - Dorso"
            url={urlDorso}
            inputRef={inputDorsoRef}
            uploading={upD}
            removing={false}
            onFile={async (file) => {
              try {
                setUpD(true);
                await subir(file, setUrlDorso, setPendDorso, "archivo_dni_dorso");
                toast.success("Dorso actualizado correctamente");
              } catch (er) {
                toast.error(er?.message || "Error al subir la imagen");
              } finally { setUpD(false); }
            }}
            onRemove={async () => {
              if (!urlDorso) return;
              try {
                setUpD(true);
                await quitar(setUrlDorso, setPendDorso, "archivo_dni_dorso");
                toast.success("Imagen del dorso eliminada");
              } catch (er) {
                toast.error("No se pudo eliminar la imagen");
              } finally { setUpD(false); }
            }}
          />
        </div>
      </div>

      {/* Lightbox Premium (Pantalla Completa) */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-3 rounded-2xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-lg"
            >
              <HiX className="text-xl" />
            </button>
            
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative w-full max-w-4xl flex items-center justify-center"
            >
              <div className="rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl shadow-black">
                <img
                  src={preview}
                  alt="Ampliación del documento"
                  className="max-w-full max-h-[80vh] object-contain select-none"
                  draggable={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}