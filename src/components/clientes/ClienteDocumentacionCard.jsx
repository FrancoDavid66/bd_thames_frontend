// src/components/clientes/ClienteDocumentacionCard.jsx
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-icons/hi";

import CardDuo from "../ui/CardDuo";
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

  const subir = useCallback(async (file, setUrl, setPend, field) => {
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
  }, [clientId, dispatch]);

  const quitar = useCallback(async (setUrl, setPend, field) => {
    setUrl(null);
    setPend(null);
    if (clientId) {
      await dispatch(updateCliente({ id: clientId, [field]: null })).unwrap();
    }
  }, [clientId, dispatch]);

  // 🧩 Mini-lado del DNI (COMPACTO): miniatura chica + acciones pequeñas.
  //    El DNI ya NO es obligatorio, así que ocupa poco espacio.
  const MiniLado = ({ title, url, inputRef, uploading, onFile, onRemove }) => (
    <div className="flex items-center gap-3 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark p-2.5">
      {/* Miniatura chica (o placeholder) */}
      {url ? (
        <button
          type="button"
          onClick={() => setPreview(url)}
          className="relative group h-12 w-16 rounded-xl overflow-hidden border-2 border-duo-verde/40 hover:border-duo-azul transition-all shrink-0 bg-black"
          title="Ampliar"
        >
          <img src={url} alt={title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" onError={(e) => (e.currentTarget.style.display = "none")} />
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <HiSearchCircle className="text-xl text-white" />
          </span>
        </button>
      ) : (
        <div className="h-12 w-16 rounded-xl border-2 border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark flex items-center justify-center shrink-0">
          <HiOutlinePhotograph className="text-lg text-suave dark:text-suave-dark opacity-60" />
        </div>
      )}

      {/* Título + estado + acciones */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-titulo dark:text-titulo-dark truncate">{title}</span>
          {url && <HiCheckCircle className="text-duo-verde text-sm shrink-0" title="Cargado" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-duo-azul hover:underline disabled:opacity-50"
          >
            {uploading ? (
              <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <><HiUpload className="text-xs" /> {url ? "Cambiar" : "Subir"}</>
            )}
          </button>
          {url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-duo-rojo hover:underline disabled:opacity-50"
            >
              <HiTrash className="text-xs" /> Quitar
            </button>
          )}
        </div>
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
    <CardDuo
      as={motion.section}
      className="overflow-hidden"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="p-4 sm:p-5">
        {/* Header compacto en una línea */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center text-duo-violeta shrink-0">
            <HiOutlinePhotograph className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-titulo dark:text-titulo-dark leading-tight">
              Documentación (DNI)
            </h2>
            <p className="text-[10px] text-suave dark:text-suave-dark font-bold uppercase tracking-wide">
              Opcional · Frente y dorso
            </p>
          </div>
        </div>

        {/* Los 2 lados, en tira compacta (uno al lado del otro en desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MiniLado
            title="Frente"
            url={urlFrente}
            inputRef={inputFrenteRef}
            uploading={upF}
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

          <MiniLado
            title="Dorso"
            url={urlDorso}
            inputRef={inputDorsoRef}
            uploading={upD}
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

      {/* Lightbox (Pantalla Completa) — se mantiene para ver el DNI en grande */}
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
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-3 rounded-2xl bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-lg"
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
    </CardDuo>
  );
}