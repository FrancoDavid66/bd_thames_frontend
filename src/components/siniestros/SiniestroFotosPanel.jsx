// src/components/siniestros/SiniestroFotosPanel.jsx
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiPhotograph, HiUpload, HiX, HiTrash, HiZoomIn } from "react-icons/hi";
import { toast } from "react-hot-toast";

import { uploadToCloudinary } from "../../utils/cloudinary";
import { useAuth } from "../../context/AuthContext";
import {
  getFotosBySiniestro,
  addFoto,
  removeFoto,
} from "../../store/slices/siniestrosSlice";

/**
 * Panel de galería de fotos del siniestro.
 *
 * @param {number|string} siniestroId  ID del siniestro (modo "persistente").
 *                                     Si no se pasa, funciona en modo "borrador".
 * @param {boolean} compact            Layout compacto (menos padding, menos texto).
 * @param {Array} draftFotos           Lista de fotos en memoria (modo borrador).
 * @param {Function} onDraftChange     Callback con la lista nueva (modo borrador).
 * @param {boolean} readOnly           Si true, solo muestra (no subir/borrar).
 */
export default function SiniestroFotosPanel({
  siniestroId,
  compact = false,
  draftFotos,
  onDraftChange,
  readOnly = false,
}) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;

  const isDraft = !siniestroId;
  const key = siniestroId ? String(siniestroId) : null;

  // Fotos persistidas (vienen del slice)
  const fotosPersistidas = useSelector(
    (state) => (key ? state.siniestros.fotos?.[key] : null) || []
  );
  const loading = useSelector(
    (state) => (key ? state.siniestros.fotosLoading?.[key] : false) || false
  );

  // Lista actual: persistidas o borrador
  const fotos = isDraft ? (draftFotos || []) : fotosPersistidas;

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Cargar fotos al montar (solo modo persistente)
  useEffect(() => {
    if (siniestroId) {
      dispatch(getFotosBySiniestro(siniestroId));
    }
  }, [dispatch, siniestroId]);

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    const folder = `de-thames/siniestros/${siniestroId || "borrador"}/fotos`;
    let okCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const up = await uploadToCloudinary(file, { folder });

        if (isDraft) {
          // Modo borrador: agregar al state local
          const nuevaFoto = {
            id: `temp-${Date.now()}-${Math.random()}`,
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
            _isDraft: true,
          };
          onDraftChange?.([...(draftFotos || []), nuevaFoto]);
        } else {
          // Modo persistente: enviar al backend
          await dispatch(addFoto({
            siniestro_id: Number(siniestroId),
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
          })).unwrap();
        }
        okCount++;
      } catch (err) {
        console.error("[FotosPanel] Error subiendo", file.name, err);
        failCount++;
      }
    }

    setUploading(false);
    if (okCount > 0) toast.success(`${okCount} foto${okCount > 1 ? "s" : ""} subida${okCount > 1 ? "s" : ""}`);
    if (failCount > 0) toast.error(`${failCount} foto${failCount > 1 ? "s" : ""} falló${failCount > 1 ? "ron" : ""}`);
  };

  const handleDelete = async (foto) => {
    if (!confirm("¿Eliminar esta foto? No se puede deshacer.")) return;

    if (isDraft) {
      onDraftChange?.((draftFotos || []).filter((f) => f.id !== foto.id));
      return;
    }

    try {
      await dispatch(removeFoto({ fotoId: foto.id, siniestroId })).unwrap();
      toast.success("Foto eliminada");
    } catch {
      toast.error("Error al eliminar la foto");
    }
  };

  const canDelete = (foto) => {
    if (readOnly) return false;
    if (isDraft) return true; // En borrador todos pueden borrar antes de guardar
    return isAdmin; // Persistido: solo admin
  };

  return (
    <div className={compact ? "" : "p-4"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HiPhotograph className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-indigo-400`} />
          <h3 className={`${compact ? "text-sm" : "text-base"} font-bold text-slate-200`}>
            Galería de fotos
          </h3>
          {fotos.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
              {fotos.length}
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
          >
            {uploading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Subiendo…
              </>
            ) : (
              <>
                <HiUpload className="w-3.5 h-3.5" /> Agregar
              </>
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />
      </div>

      {/* Grilla */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fotos.length === 0 ? (
        <button
          type="button"
          onClick={() => !readOnly && fileInputRef.current?.click()}
          disabled={readOnly || uploading}
          className={`w-full ${compact ? "py-6" : "py-10"} border-2 border-dashed border-slate-700 rounded-2xl text-center hover:border-indigo-500 hover:bg-indigo-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          <HiPhotograph className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {readOnly ? "Sin fotos" : "Tocá para agregar fotos"}
          </p>
        </button>
      ) : (
        <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"}`}>
          {fotos.map((foto) => (
            <motion.div
              key={foto.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700"
            >
              <img
                src={foto.url}
                alt={foto.nombre || "Foto del siniestro"}
                loading="lazy"
                className="w-full h-full object-cover"
              />

              {/* Overlay con acciones */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setPreviewUrl(foto.url)}
                  className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
                  title="Ver en grande"
                >
                  <HiZoomIn className="w-4 h-4" />
                </button>
                {canDelete(foto) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(foto)}
                    className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
                    title="Eliminar"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Badge "Pendiente" para borrador */}
              {foto._isDraft && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/90 text-black">
                  Pendiente
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox simple */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewUrl(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
            >
              <HiX className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={previewUrl}
              alt="Vista previa"
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}