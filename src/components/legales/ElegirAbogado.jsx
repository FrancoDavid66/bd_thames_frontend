// src/components/legales/ElegirAbogado.jsx
//
// 👩‍⚖️ Elegir el abogado del caso. Arranca con el SUGERIDO (el que lleva ese
// tema y tiene menos casos) y con "Cambiar" se ve la lista de los demás.
// Ej: un choque → "Dr. Martín Sosa · Sugerido · Lleva choques, accidentes…".
import { useState } from "react";
import { HiCheck } from "react-icons/hi";

import { AvatarAbogado, Chip } from "./PiezasLegales";
import { abogadoSugerido, llevaTema, temasTxt } from "./legalesUtils";

export default function ElegirAbogado({ abogados = [], temas = [], tema = "", value, onChange, permitirNinguno = false }) {
  const [abierto, setAbierto] = useState(false);
  const activos = abogados.filter((a) => a.activo !== false);
  const sugerido = abogadoSugerido(activos, tema);
  const elegido = activos.find((a) => a.id === value) || null;

  if (!activos.length) {
    return (
      <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 text-[13px] text-suave dark:text-suave-dark">
        Todavía no hay abogados cargados. El admin los agrega en Legales → Abogados. Podés guardar el caso sin abogado.
      </p>
    );
  }

  const tarjeta = (a, conBoton) => (
    <div className="flex items-center gap-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3">
      <AvatarAbogado id={a.id} nombre={a.nombre} foto={a.foto_url} size={48} />
      <span className="flex-1 min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="text-[15px] text-titulo dark:text-titulo-dark">{a.nombre}</strong>
          {sugerido && a.id === sugerido.id && <Chip tono="verde">Sugerido</Chip>}
        </span>
        <span className="block text-[13px] text-suave dark:text-suave-dark">
          {a.especialidades?.length ? `Lleva ${temasTxt(a.especialidades, temas).toLowerCase()}` : "Todos los temas"}
          {typeof a.abiertos === "number" ? ` · ${a.abiertos} caso${a.abiertos === 1 ? "" : "s"}` : ""}
        </span>
      </span>
      {conBoton && (
        <button type="button" onClick={() => setAbierto(true)} className="shrink-0 px-2 py-2 text-[14px] font-semibold text-sky-700 dark:text-sky-400 hover:underline">
          Cambiar
        </button>
      )}
    </div>
  );

  if (!abierto && elegido) return tarjeta(elegido, true);

  const orden = [...activos].sort((a, b) => {
    const ta = llevaTema(a, tema) ? 0 : 1;
    const tb = llevaTema(b, tema) ? 0 : 1;
    return ta - tb || (a.abiertos || 0) - (b.abiertos || 0) || a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Elegí el abogado">
      {orden.map((a) => {
        const on = a.id === value;
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              onChange?.(a.id);
              setAbierto(false);
            }}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              on ? "border-sky-700 bg-sky-50 dark:bg-sky-500/10" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-sky-600"
            }`}
          >
            <AvatarAbogado id={a.id} nombre={a.nombre} foto={a.foto_url} size={40} />
            <span className="flex-1 min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="text-[14px] text-titulo dark:text-titulo-dark">{a.nombre}</strong>
                {sugerido && a.id === sugerido.id && <Chip tono="verde">Sugerido</Chip>}
              </span>
              <span className="block text-[12px] text-suave dark:text-suave-dark">
                {a.especialidades?.length ? temasTxt(a.especialidades, temas) : "Todos los temas"}
                {typeof a.abiertos === "number" ? ` · ${a.abiertos} abierto${a.abiertos === 1 ? "" : "s"}` : ""}
              </span>
            </span>
            {on && <HiCheck className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0" />}
          </button>
        );
      })}
      {permitirNinguno && (
        <button
          type="button"
          onClick={() => {
            onChange?.(null);
            setAbierto(false);
          }}
          className="rounded-xl border border-dashed border-linea dark:border-linea-dark p-3 text-[14px] font-semibold text-suave dark:text-suave-dark"
        >
          Todavía no sé (lo elige el admin después)
        </button>
      )}
    </div>
  );
}
