// src/components/legales/ExpedienteDocumentosPanel.jsx
//
// Galería de fotos/papeles del expediente. Mismo patrón que
// SiniestroFotosPanel.jsx:
//   - Modo PERSISTENTE: se pasa expedienteId → usa el slice (documentos guardados).
//   - Modo BORRADOR: sin expedienteId → guarda en memoria (draftDocumentos/onDraftChange).
//     Se usa en el wizard: se suben a Cloudinary al tocar "Sacar foto/Elegir" pero
//     el registro en el backend recién se crea cuando se confirma el expediente.
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { HiPhotograph, HiCamera, HiX, HiTrash, HiZoomIn } from "react-icons/hi";
import { toast } from "react-hot-toast";

import { uploadToCloudinary } from "../../utils/cloudinary";
import { fetchDocumentos, addDocumento, removeDocumento } from "../../store/slices/legalesSlice";

export default function ExpedienteDocumentosPanel({
  expedienteId,
  compact = false,
  draftDocumentos,
  onDraftChange,
  readOnly = false,
}) {
  const dispatch = useDispatch();

  const isDraft = !expedienteId;
  const key = expedienteId ? String(expedienteId) : null;

  const documentosPersistidos = useSelector(
    (state) => (key ? state.legales.documentos?.[key] : null) || []
  );
  const loading = useSelector(
    (state) => (key ? state.legales.documentosLoading?.[key] : false) || false
  );

  const documentos = isDraft ? (draftDocumentos || []) : documentosPersistidos;

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const galeriaRef = useRef(null);
  const camaraRef = useRef(null);

  useEffect(() => {
    if (expedienteId) dispatch(fetchDocumentos(expedienteId));
  }, [dispatch, expedienteId]);

  const procesarArchivos = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploading(true);
    const folder = `de-thames/legales/${expedienteId || "borrador"}/documentos`;
    let okCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const up = await uploadToCloudinary(file, { folder });
        if (isDraft) {
          const nuevo = {
            id: `temp-${Date.now()}-${Math.random()}`,
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
            _isDraft: true,
          };
          onDraftChange?.([...(draftDocumentos || []), nuevo]);
        } else {
          await dispatch(addDocumento({
            expediente_id: Number(expedienteId),
            url: up.secure_url,
            public_id: up.public_id,
            nombre: file.name || "",
            mime: up.mime || file.type || "image/jpeg",
          })).unwrap();
        }
        okCount++;
      } catch (err) {
        console.error("[ExpedienteDocumentosPanel] Error subiendo", file.name, err);
        failCount++;
      }
    }

    setUploading(false);
    if (okCount > 0) toast.success(`${okCount} archivo${okCount > 1 ? "s" : ""} subido${okCount > 1 ? "s" : ""}`);
    if (failCount > 0) toast.error(`${failCount} archivo${failCount > 1 ? "s" : ""} falló${failCount > 1 ? "ron" : ""}`);
  };

  const onGaleria = (e) => { procesarArchivos(e.target.files); if (galeriaRef.current) galeriaRef.current.value = ""; };
  const onCamara = (e) => { procesarArchivos(e.target.files); if (camaraRef.current) camaraRef.current.value = ""; };

  const handleDelete = async (doc) => {
    if (!window.confirm("¿Eliminar este archivo? No se puede deshacer.")) return;
    if (isDraft) {
      onDraftChange?.((draftDocumentos || []).filter((d) => d.id !== doc.id));
      return;
    }
    try {
      await dispatch(removeDocumento({ id: doc.id, expedienteId })).unwrap();
      toast.success("Archivo eliminado");
    } catch {
      toast.error("Error al eliminar el archivo");
    }
  };

  return (
    <div className={compact ? "" : "p-4"}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <HiPhotograph className="w-4 h-4 text-duo-violeta" />
        <h3 className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">Fotos y papeles</h3>
        {documentos.length > 0 && (
          <span className="text-[11px] font-medium text-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] px-1.5 py-0.5 rounded">
            {documentos.length}
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
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-violeta transition-colors disabled:opacity-50"
          >
            {uploading
              ? <div className="h-4 w-4 border-2 border-duo-violeta/30 border-t-duo-violeta rounded-full animate-spin" />
              : <HiCamera className="w-5 h-5 text-duo-violeta" />}
            <span className="text-[12px] font-medium text-titulo dark:text-titulo-dark">Sacar foto</span>
          </button>
          <button
            type="button"
            onClick={() => galeriaRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-duo-violeta transition-colors disabled:opacity-50"
          >
            {uploading
              ? <div className="h-4 w-4 border-2 border-duo-violeta/30 border-t-duo-violeta rounded-full animate-spin" />
              : <HiPhotograph className="w-5 h-5 text-duo-violeta" />}
            <span className="text-[12px] font-medium text-titulo dark:text-titulo-dark">Elegir de galería</span>
          </button>
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onCamara} />
          <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={onGaleria} />
        </div>
      )}

      {/* Grilla */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-duo-violeta/25 border-t-duo-violeta rounded-full animate-spin" />
        </div>
      ) : documentos.length === 0 ? (
        <div className="p-4 border border-dashed border-linea dark:border-linea-dark rounded-lg text-center">
          <p className="text-[13px] text-suave dark:text-suave-dark">Todavía no hay fotos ni papeles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {documentos.map((doc) => (
            <div key={doc.id} className="group relative aspect-square rounded-lg overflow-hidden border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
              <img src={doc.url} alt={doc.nombre || "documento"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setPreviewUrl(doc.url)}
                  className="h-8 w-8 rounded-lg bg-white/90 flex items-center justify-center text-titulo hover:scale-105 active:scale-95 transition-transform"
                  aria-label="Ver"
                >
                  <HiZoomIn className="w-4 h-4" />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="h-8 w-8 rounded-lg bg-duo-rojo/90 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Borrar"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox simple */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            aria-label="Cerrar"
          >
            <HiX className="w-4 h-4" />
          </button>
          <img
            src={previewUrl}
            alt="Vista previa"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}