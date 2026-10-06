// src/components/legales/ExpedienteDocumentosPanel.jsx
//
// 📎 Papeles del caso (fotos y PDF):
//   - La lista de lo que se le pidió al cliente, con su estado:
//     ✅ lo tenemos · 🕒 lo trae después (o lo sube desde su link) · ⬜ falta.
//   - Los archivos subidos (quién y cuándo; lo del cliente se marca en azul).
//   - "Subir foto o PDF" (se achica la foto antes de subirla).
//   - Borrar: el admin o el abogado del caso (el servidor manda `puede.borrar`).
// Los comprobantes de la comisión NO están acá: van en «Plata» (solo admin).
import { useState } from "react";
import { HiCheck, HiClock, HiDocumentText, HiPhotograph, HiTrash } from "react-icons/hi";

import { BotonArchivo } from "../gestoria/Piezas";
import { Chip } from "./PiezasLegales";
import { ddmm, esPdf, miniatura, tamTxt } from "./legalesUtils";

const ESTADO_PAPEL = {
  OK: { txt: "Lo tenemos", tono: "verde", Icono: HiCheck },
  DESPUES: { txt: "Lo trae después", tono: "ambar", Icono: HiClock },
  FALTA: { txt: "Falta", tono: "neutro", Icono: null },
};

export default function ExpedienteDocumentosPanel({ e, onSubir, onBorrar, onPapeles, celu = false }) {
  const [verTodos, setVerTodos] = useState(false);
  const papeles = Array.isArray(e.papeles) ? e.papeles : [];
  const docs = (e.documentos || []).filter((d) => d.tipo === "PAPEL");
  const puedeSubir = !!e.puede?.subir;
  const puedeBorrar = !!e.puede?.borrar;
  const puedeMarcar = !!e.puede?.papeles;
  const lista = celu && !verTodos ? docs.slice(0, 4) : docs;

  const cambiarEstado = (key, estado) => {
    const nueva = papeles.map((p) => (p.key === key ? { ...p, estado } : p));
    onPapeles?.(nueva);
  };

  return (
    <div className="flex flex-col gap-3">
      {papeles.length > 0 && (
        <ul className="flex flex-col divide-y divide-linea dark:divide-linea-dark rounded-lg border border-linea dark:border-linea-dark">
          {papeles.map((p) => {
            const est = ESTADO_PAPEL[p.estado] || ESTADO_PAPEL.FALTA;
            const Icono = est.Icono;
            return (
              <li key={p.key || p.nombre} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="flex-1 min-w-[140px] text-[13px] font-medium text-titulo dark:text-titulo-dark">{p.nombre}</span>
                {!(puedeMarcar && p.estado !== "OK") && (
                  <Chip tono={est.tono}>
                    {Icono ? <Icono className="w-3 h-3" /> : null} {est.txt}
                  </Chip>
                )}
                {puedeMarcar && p.estado !== "OK" && (
                  <select
                    value={p.estado}
                    onChange={(ev) => cambiarEstado(p.key, ev.target.value)}
                    className="h-8 rounded-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-1.5 text-[12px] text-titulo dark:text-titulo-dark"
                    aria-label={`Estado de ${p.nombre}`}
                  >
                    <option value="FALTA">Falta</option>
                    <option value="DESPUES">Lo trae después</option>
                    <option value="OK">Ya lo tenemos</option>
                  </select>
                )}
                {puedeSubir && p.estado !== "OK" && (
                  <BotonArchivo onElegir={(f) => onSubir?.(f, p.key)} size="sm">
                    Subir
                  </BotonArchivo>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {docs.length ? (
        <div className={`grid gap-2 ${celu ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
          {lista.map((d) => (
            <ArchivoCaso key={d.id} d={d} papeles={papeles} onBorrar={puedeBorrar ? () => onBorrar?.(d) : null} />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-suave dark:text-suave-dark">Todavía no hay archivos. El cliente también puede subirlos desde su link.</p>
      )}
      {celu && docs.length > lista.length && (
        <button type="button" onClick={() => setVerTodos(true)} className="self-start text-[13px] font-semibold text-sky-700 dark:text-sky-400 underline">
          Ver todos ({docs.length})
        </button>
      )}

      {puedeSubir && (
        <BotonArchivo onElegir={(f) => onSubir?.(f, "")} size="md" full={celu}>
          Subir foto o PDF
        </BotonArchivo>
      )}
    </div>
  );
}

function ArchivoCaso({ d, papeles, onBorrar }) {
  const pdf = esPdf(d);
  const delCliente = d.rol === "CLIENTE";
  const papel = papeles.find((p) => p.key && p.key === d.papel);
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 min-w-0 ${
        delCliente ? "border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10" : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
      }`}
    >
      <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label={`Ver ${d.nombre}`}>
        {pdf ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 dark:bg-red-500/10 text-[10px] font-bold text-red-700 dark:text-red-300">PDF</span>
        ) : (
          <img src={miniatura(d.url, 80)} alt="" loading="lazy" className="h-10 w-10 rounded-md object-cover bg-card dark:bg-card-dark" />
        )}
      </a>
      <span className="flex-1 min-w-0">
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:underline" title={d.nombre}>
          {papel ? papel.nombre : d.nombre || "archivo"}
        </a>
        <span className={`block truncate text-[11px] ${delCliente ? "font-semibold text-sky-800 dark:text-sky-300" : "text-suave dark:text-suave-dark"}`}>
          {delCliente ? "Lo subió el cliente" : d.autor || "—"} · {ddmm(d.fecha)}
          {d.tamano ? ` · ${tamTxt(d.tamano)}` : ""}
        </span>
      </span>
      <span className="hidden sm:inline shrink-0 text-suave dark:text-suave-dark">
        {pdf ? <HiDocumentText className="w-4 h-4" /> : <HiPhotograph className="w-4 h-4" />}
      </span>
      {onBorrar && (
        <button
          type="button"
          onClick={onBorrar}
          className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md text-suave hover:text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]"
          aria-label={`Borrar ${d.nombre}`}
          title="Borrar"
        >
          <HiTrash className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

