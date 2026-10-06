// src/components/siniestros/SiniestroFotosPanel.jsx
//
// 📱 RESPONSIVE: los botones de cada foto (Ver 🔍 / Borrar 🗑) HOY aparecen solo
//    con hover, que en el celu no existe → en mobile quedan SIEMPRE visibles
//    (con un velo oscuro suave para que se lean sobre la foto); en desktop (sm+)
//    se mantiene el comportamiento hover de siempre. Botones a 44px en mobile.
//
// 🐛 FIX (fotos que se perdían al cargar un siniestro):
//   1) Al elegir VARIAS fotos de la galería quedaba solo la ÚLTIMA: cada foto
//      se sumaba a la lista "vieja" (la de antes de empezar) y pisaba a la
//      anterior. Ahora se suma siempre a la lista AL DÍA (draftRef).
//   2) Las fotos se achican antes de subir (comprimirImagen): una foto del
//      celu de 6 MB pasa a ~300 KB → sube en 1-2 s y no rebota por tamaño.
//   3) El panel le avisa al padre mientras está subiendo (onUploadingChange)
//      para que el wizard no deje "Guardar" con una foto a medio subir.
//   4) Si una foto falla, el cartel dice POR QUÉ.
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiPhotograph, HiCamera, HiX, HiTrash, HiZoomIn } from "react-icons/hi";
import { toast } from "react-hot-toast";

import { uploadToCloudinary } from "../../utils/cloudinary";
import { comprimirImagen } from "../../utils/comprimirImagen";
import { useAuth } from "../../context/AuthContext";
import {
  getFotosBySiniestro,
  addFoto,
  removeFoto,
} from "../../store/slices/siniestrosSlice";

/**
 * Galería de fotos del siniestro.
 * - Modo PERSISTENTE: se pasa siniestroId → usa el slice (fotos guardadas).
 * - Modo BORRADOR: sin siniestroId → guarda en memoria (draftFotos/onDraftChange).
 *   Se usa en el wizard: las fotos se suben al crear el siniestro.
 *
 * @param {number|string} siniestroId  ID del siniestro (persistente).
 * @param {boolean} compact            Layout compacto.
 * @param {Array} draftFotos           Fotos en memoria (modo borrador).
 * @param {Function} onDraftChange     Callback con la lista nueva (borrador).
 * @param {boolean} readOnly           Solo mostrar (no subir/borrar).
 * @param {Function} onUploadingChange Avisa al padre: true = subiendo, false = terminó.
 */

// Lista vacía ÚNICA: si el selector devolviera un [] nuevo cada vez, el panel
// se redibujaría con cada cambio del store (y react-redux avisa en consola).
const SIN_FOTOS = [];

// Saca un motivo legible de un error (Cloudinary, backend o red).
function motivoError(err) {
  if (!err) return "";
  if (typeof err === "string") return err.trim().startsWith("<") ? "" : err;
  if (err.message) return String(err.message);
  if (err.detail) return String(err.detail);
  if (typeof err === "object") {
    const primero = Object.values(err)[0];
    if (Array.isArray(primero)) return String(primero[0] ?? "");
    if (primero) return String(primero);
  }
  return "";
}

export default function SiniestroFotosPanel({
  siniestroId,
  compact = false,
  draftFotos,
  onDraftChange,
  readOnly = false,
  onUploadingChange,
}) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;

  const isDraft = !siniestroId;
  const key = siniestroId ? String(siniestroId) : null;

  const fotosPersistidas = useSelector(
    (state) => (key ? state.siniestros.fotos?.[key] : null) || SIN_FOTOS
  );
  const loading = useSelector(
    (state) => (key ? state.siniestros.fotosLoading?.[key] : false) || false
  );

  const fotos = isDraft ? (draftFotos || []) : fotosPersistidas;

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const galeriaRef = useRef(null);  // input galería (sin capture)
  const camaraRef = useRef(null);   // input cámara (capture="environment")

  // 🐛 FIX: lista borrador SIEMPRE al día. Mientras suben varias fotos seguidas,
  // la prop `draftFotos` que ve la función es la de cuando arrancó (vieja).
  const draftRef = useRef(draftFotos || []);
  useEffect(() => { draftRef.current = draftFotos || []; }, [draftFotos]);

  // ¿El panel sigue en pantalla? (si cerraron el wizard a mitad de una subida)
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => {
    if (siniestroId) dispatch(getFotosBySiniestro(siniestroId));
  }, [dispatch, siniestroId]);

  const procesarArchivos = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    onUploadingChange?.(true);
    const folder = `de-thames/siniestros/${siniestroId || "borrador"}/fotos`;
    let okCount = 0;
    let failCount = 0;
    let motivo = "";

    for (const file of files) {
      // Borrador + wizard cerrado: no seguimos sumando fotos a un wizard que ya no está.
      if (isDraft && !aliveRef.current) break;
      try {
        // 📷 Achicamos antes de subir (si no se puede, sube la original).
        const chica = await comprimirImagen(file);
        const up = await uploadToCloudinary(chica, { folder });
        if (!up?.secure_url || !up?.public_id) {
          throw new Error("Cloudinary no devolvió la foto");
        }
        if (isDraft) {
          if (!aliveRef.current) break;
          const nuevaFoto = {
            id: `temp-${Date.now()}-${Math.random()}`,
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
            _isDraft: true,
          };
          // 🐛 FIX: sumamos a la lista AL DÍA (antes: a la lista vieja → se pisaban).
          const lista = [...draftRef.current, nuevaFoto];
          draftRef.current = lista;
          onDraftChange?.(lista);
        } else {
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
        if (!motivo) motivo = motivoError(err);
      }
    }

    if (aliveRef.current) setUploading(false);
    onUploadingChange?.(false);
    if (okCount > 0) toast.success(`${okCount} foto${okCount > 1 ? "s" : ""} subida${okCount > 1 ? "s" : ""}`);
    if (failCount > 0) {
      const base = failCount > 1 ? `${failCount} fotos no se pudieron subir` : "1 foto no se pudo subir";
      toast.error(motivo ? `${base}: ${motivo}` : base, { duration: 6000 });
    }
  };

  const onGaleria = (e) => { procesarArchivos(e.target.files); if (galeriaRef.current) galeriaRef.current.value = ""; };
  const onCamara = (e) => { procesarArchivos(e.target.files); if (camaraRef.current) camaraRef.current.value = ""; };

  const handleDelete = async (foto) => {
    if (!window.confirm("¿Eliminar esta foto? No se puede deshacer.")) return;
    if (isDraft) {
      const lista = draftRef.current.filter((f) => f.id !== foto.id);
      draftRef.current = lista;
      onDraftChange?.(lista);
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
    if (isDraft) return true;
    return isAdmin;
  };

  return (
    <div className={compact ? "" : "p-4"}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <HiPhotograph className="w-5 h-5 text-duo-azul" />
        <h3 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Fotos del siniestro</h3>
        {fotos.length > 0 && (
          <span className="text-xs font-medium text-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 rounded-lg">
            {fotos.length}
          </span>
        )}
      </div>

      {/* Botones: Sacar foto (cámara) + Elegir de galería */}
      {!readOnly && (
        <div className="flex gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => camaraRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-azul transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-duo-azul border-t-transparent rounded-full animate-spin" />
            ) : (
              <HiCamera className="text-2xl text-duo-azul" />
            )}
            <span className="text-[11px] font-medium text-titulo dark:text-titulo-dark">Sacar foto</span>
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-violeta transition-colors disabled:opacity-50"
          >
            <HiPhotograph className="text-2xl text-duo-violeta" />
            <span className="text-[11px] font-medium text-titulo dark:text-titulo-dark">Elegir de galería</span>
          </button>
        </div>
      )}

      {/* Inputs ocultos */}
      <input ref={camaraRef} type="file" accept="image/*" capture="environment" onChange={onCamara} className="hidden" />
      <input ref={galeriaRef} type="file" accept="image/*" multiple onChange={onGaleria} className="hidden" />

      {/* Grilla */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin" />
        </div>
      ) : fotos.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-linea dark:border-linea-dark rounded-xl">
          <HiPhotograph className="w-9 h-9 text-suave dark:text-suave-dark mx-auto mb-2" />
          <p className="text-sm text-suave dark:text-suave-dark">
            {readOnly ? "Sin fotos" : "Todavía no agregaste fotos"}
          </p>
        </div>
      ) : (
        <div className={`grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4"}`}>
          {fotos.map((foto) => (
            <motion.div
              key={foto.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group aspect-square rounded-lg overflow-hidden bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark"
            >
              <img src={foto.url} alt={foto.nombre || "Foto"} loading="lazy" className="w-full h-full object-cover" />
              {/* 📱 En mobile: velo suave + botones siempre visibles. En sm+: hover. */}
              <div className="absolute inset-0 bg-black/25 sm:bg-black/0 sm:group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setPreviewUrl(foto.url)}
                  className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg bg-duo-azul text-white flex items-center justify-center shadow-lg"
                  title="Ver en grande"
                  aria-label="Ver en grande"
                >
                  <HiZoomIn className="w-4 h-4" />
                </button>
                {canDelete(foto) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(foto)}
                    className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg bg-duo-rojo text-white flex items-center justify-center shadow-lg"
                    title="Eliminar"
                    aria-label="Eliminar foto"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
              {foto._isDraft && (
                <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-duo-amarillo text-duo-texto">
                  Nueva
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewUrl(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark flex items-center justify-center"
            >
              <HiX className="w-5 h-5" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={previewUrl}
              alt="Vista previa"
              className="max-w-full max-h-full rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
