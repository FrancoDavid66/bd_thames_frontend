// src/components/clientes/ClienteDocumentacionCard.jsx
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { FaExternalLinkAlt, FaSearchPlus } from "react-icons/fa";

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

  // Pendientes de sincronizar cuando aún no había id de cliente
  const [pendFrente, setPendFrente] = useState(null);
  const [pendDorso, setPendDorso] = useState(null);

  const [upF, setUpF] = useState(false);
  const [upD, setUpD] = useState(false);

  const [preview, setPreview] = useState(null);

  // Refrescar URLs si cambia el cliente
  useEffect(() => {
    setUrlFrente(
      cliente?.archivo_dni_frente || cliente?.archivo_dni || null
    );
    setUrlDorso(cliente?.archivo_dni_dorso || null);
  }, [
    cliente?.archivo_dni_frente,
    cliente?.archivo_dni_dorso,
    cliente?.archivo_dni,
  ]);

  // Sincronizar pendientes una vez que el cliente tenga ID
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
    if (!isImageFile(file)) {
      throw new Error("Solo imágenes (JPG, PNG, etc.)");
    }

    const folder = `de-thames/clientes/${clientId || "sin-id"}/documentacion`;
    const { secure_url } = await uploadToCloudinary(file, folder);

    if (!secure_url) {
      throw new Error("No se recibió URL");
    }

    setUrl(secure_url);

    if (clientId) {
      await dispatch(
        updateCliente({ id: clientId, [field]: secure_url })
      ).unwrap();
    } else {
      setPend(secure_url);
    }
  };

  const quitar = async (setUrl, setPend, field) => {
    setUrl(null);
    setPend(null);
    if (clientId) {
      await dispatch(
        updateCliente({ id: clientId, [field]: null })
      ).unwrap();
    }
  };

  const Box = ({
    title,
    url,
    inputRef,
    uploading,
    removing,
    onFile,
    onRemove,
  }) => (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 lg:p-5 shadow-inner flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            url
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
              : "bg-slate-700/60 text-slate-200 ring-1 ring-slate-500/30"
          }`}
        >
          {url ? "Cargado" : "Pendiente"}
        </span>
      </div>

      {/* miniatura */}
      <div className="relative group overflow-hidden rounded-xl border border-white/10 bg-black">
        <div className="w-full h-56 md:h-64">
          {url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img className="w-full h-full object-cover" src={url} />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-white/40">
              Sin imagen
            </div>
          )}
        </div>

        {url && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-black/80 text-white border border-white/10 hover:bg-black/90"
              aria-label="Abrir en nueva pestaña"
            >
              <FaExternalLinkAlt size={14} />
            </a>
            <button
              type="button"
              onClick={() => setPreview(url)}
              className="p-2 rounded-lg bg-black/80 text-white border border-white/10 hover:bg-black/90"
              aria-label="Ver grande"
            >
              <FaSearchPlus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* acciones */}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? "Subiendo..." : url ? "Reemplazar" : "Subir"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={!url || uploading || removing}
          className="h-10 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {removing ? "Quitando..." : "Quitar"}
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
      className="rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-950 to-black p-[1px] shadow-xl shadow-black/50"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-slate-950/95 rounded-2xl p-5 lg:p-6 text-white flex flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg lg:text-xl font-semibold">
              Documentación — DNI / Pasaporte
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Subí el frente y dorso del documento para completar la ficha del
              cliente.
            </p>
          </div>
          {clientId && (
            <div className="text-[11px] text-slate-500 font-mono">
              ID #{clientId}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Box
            title="Frente"
            url={urlFrente}
            inputRef={inputFrenteRef}
            uploading={upF}
            removing={false}
            onFile={async (file) => {
              try {
                setUpF(true);
                await subir(
                  file,
                  setUrlFrente,
                  setPendFrente,
                  "archivo_dni_frente"
                );
                toast.success("Frente actualizado");
              } catch (er) {
                console.error(er);
                toast.error(er?.message || "Error al subir el frente");
              } finally {
                setUpF(false);
              }
            }}
            onRemove={async () => {
              if (!urlFrente) return;
              try {
                setUpF(true);
                await quitar(
                  setUrlFrente,
                  setPendFrente,
                  "archivo_dni_frente"
                );
                toast.success("Frente eliminado");
              } catch (er) {
                console.error(er);
                toast.error("No se pudo eliminar el frente");
              } finally {
                setUpF(false);
              }
            }}
          />

          <Box
            title="Dorso"
            url={urlDorso}
            inputRef={inputDorsoRef}
            uploading={upD}
            removing={false}
            onFile={async (file) => {
              try {
                setUpD(true);
                await subir(
                  file,
                  setUrlDorso,
                  setPendDorso,
                  "archivo_dni_dorso"
                );
                toast.success("Dorso actualizado");
              } catch (er) {
                console.error(er);
                toast.error(er?.message || "Error al subir el dorso");
              } finally {
                setUpD(false);
              }
            }}
            onRemove={async () => {
              if (!urlDorso) return;
              try {
                setUpD(true);
                await quitar(setUrlDorso, setPendDorso, "archivo_dni_dorso");
                toast.success("Dorso eliminado");
              } catch (er) {
                console.error(er);
                toast.error("No se pudo eliminar el dorso");
              } finally {
                setUpD(false);
              }
            }}
          />
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-5xl"
            >
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute -top-2 -right-2 px-3 py-1.5 rounded-md bg-slate-900 text-white border border-white/10 text-xs hover:bg-slate-800"
              >
                Cerrar
              </button>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={preview}
                className="w-full h-[72vh] object-contain rounded-xl border border-white/10 bg-black"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
