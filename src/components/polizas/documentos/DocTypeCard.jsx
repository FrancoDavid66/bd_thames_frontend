// src/components/polizas/documentos/DocTypeCard.jsx
// ✅ Card por tipo (subida + lista)
// Política actual: un archivo por vez; SIN vencimiento en la card.
import { useId, useState } from "react";
import { HiUpload } from "react-icons/hi";
import DocItemRow from "./DocItemRow";

export default function DocTypeCard({
  cfg,            // { key, label, accept }
  items = [],     // documentos de este tipo
  onPick,         // (file) => Promise<void> | void
  onUpload,       // () => Promise<void> | void (opcional)
  uploading,      // bool
  onPreview,      // (doc) => void
  onDelete,       // (id) => void
  onSaveVto,      // (id, dateOrNull) => Promise<void> (se pasa a DocItemRow por compatibilidad)
}) {
  const inputId = useId();
  const [file, setFile] = useState(null);

  const doUpload = async () => {
    if (!file) return;
    try {
      await onPick?.(file);
      if (typeof onUpload === "function") {
        await onUpload();
      }
      setFile(null);
    } catch {
      // El contenedor muestra el toast de error si corresponde.
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{cfg.label}</span>
        </div>
        <div className="text-xs opacity-70">
          {items.length} archivo{items.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-2">
        <input
          id={inputId}
          type="file"
          accept={cfg.accept}
          onChange={(e) => setFile(e.target.files?.[0] || null)} // ← un archivo por vez
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={inputId}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 cursor-pointer"
            title={`Elegir archivo para ${cfg.label}`}
          >
            <HiUpload />
            {file ? "Cambiar archivo" : "Elegir archivo (uno por vez)"}
          </label>

          <button
            onClick={doUpload}
            disabled={!file || uploading}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition border
              ${
                !file || uploading
                  ? "opacity-60 cursor-not-allowed border-white/10 bg-white/5"
                  : "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
              }`}
            title={`Subir ${cfg.label}`}
            aria-disabled={!file || uploading}
          >
            <HiUpload />
            {uploading ? "Subiendo…" : `Subir ${cfg.label}`}
          </button>

          {file && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
              <span className="truncate max-w-[220px]">{file.name}</span>
              <button
                onClick={() => setFile(null)}
                className="ml-1 inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5 hover:bg-white/10"
                title="Quitar archivo"
              >
                × Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm opacity-70">No hay archivos cargados para {cfg.label}.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((doc) => (
            <DocItemRow
              key={doc.id}
              doc={doc}
              onPreview={onPreview}
              onDelete={onDelete}
              onSaveVto={onSaveVto}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
