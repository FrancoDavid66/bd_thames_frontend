// src/components/polizas/documentos/DocItemRow.jsx
// ✅ fila de documento con acciones y edición de vencimiento (lavada de cara)
import dayjs from "dayjs";
import { useState } from "react";
import {
  HiDocumentText,
  HiDownload,
  HiTrash,
  HiCalendar,
  HiCheck,
  HiX,
  HiEye,
} from "react-icons/hi";
import { guessMimeByName, isImageMime, toISODate } from "./DocUtils";

export default function DocItemRow({ doc, onPreview, onDelete, onSaveVto }) {
  const mime = doc?.mime || guessMimeByName(doc?.nombre || doc?.url);
  const isImg = isImageMime(mime);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(toISODate(doc?.vencimiento) || "");

  const save = async () => {
    await onSaveVto(doc.id, value || null);
    setEditing(false);
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-md overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
          {isImg ? (
            <img
              src={doc.url}
              alt="miniatura"
              className="h-10 w-10 object-cover"
              loading="lazy"
            />
          ) : (
            <HiDocumentText className="opacity-70" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {doc?.nombre || doc?.url?.split("/").pop()}
          </div>
          {editing ? (
            <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
              <input
                type="date"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-md px-2 py-1"
              />
              <button
                onClick={save}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 hover:bg-emerald-500/20"
                title="Guardar vencimiento"
              >
                <HiCheck /> Guardar
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setValue(toISODate(doc.vencimiento) || "");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 hover:bg-white/10"
                title="Cancelar"
              >
                <HiX /> Cancelar
              </button>
            </div>
          ) : (
            <div className="text-xs opacity-80 flex items-center gap-2 mt-1">
              <span className="text-sky-300">{mime}</span>
              <span>·</span>
              {doc?.vencimiento ? (
                <span>vence {dayjs(doc.vencimiento).format("DD/MM/YYYY")}</span>
              ) : (
                <span className="text-yellow-300">sin vencimiento</span>
              )}
              <button
                onClick={() => setEditing(true)}
                className="ml-1 inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 hover:bg-white/10 text-sky-300 hover:text-sky-200 cursor-pointer"
                title="Editar vencimiento"
              >
                <HiCalendar className="opacity-90" />
                Editar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onPreview(doc)}
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20"
          title="Ver mejor"
        >
          <HiEye />
        </button>
        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5 text-sm hover:bg-white/20"
          title="Ver/descargar"
        >
          <HiDownload />
        </a>
        <button
          onClick={() => onDelete(doc.id)}
          className="inline-flex items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-sm hover:bg-rose-500/20"
          title="Eliminar"
        >
          <HiTrash />
        </button>
      </div>
    </li>
  );
}
