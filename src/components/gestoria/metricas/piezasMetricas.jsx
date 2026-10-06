// src/components/gestoria/metricas/piezasMetricas.jsx
//
// 🧩 Piezas de «Métricas»: la tarjeta de cada gráfico, el cuadrito de cada número
// (con su "7 más que agosto"), la leyenda, la barrita de "cuánto se cobró" y el
// cartel de "todavía no hay nada". Las usa también Estadísticas → «Gestoría».
import { useId } from "react";
import {
  HiArrowDown,
  HiArrowUp,
  HiCheckCircle,
  HiExclamationTriangle,
  HiMinus,
} from "react-icons/hi2";

import { TONO } from "./colores";

const ICONOS = { sube: HiArrowUp, baja: HiArrowDown, igual: HiMinus, alerta: HiExclamationTriangle, ok: HiCheckCircle };

/** Tarjeta con título, bajada y algo a la derecha (leyenda, candado o un link). */
export function Tarjeta({ titulo, sub = "", derecha = null, children, className = "" }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-4 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] font-bold text-titulo dark:text-titulo-dark">
            {titulo}
          </h2>
          {sub ? <p className="mt-0.5 text-[13px] leading-snug text-suave dark:text-suave-dark">{sub}</p> : null}
        </div>
        {derecha}
      </div>
      {children}
    </section>
  );
}

/** La línea chiquita de abajo de cada número: ícono + texto (nunca solo color). */
export function Linea({ tono = "neutro", icono = null, texto }) {
  const Icono = ICONOS[icono];
  return (
    <span className={`inline-flex items-start gap-1 text-[12.5px] font-semibold leading-snug ${TONO[tono] || TONO.neutro}`}>
      {Icono ? <Icono className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
      <span>{texto}</span>
    </span>
  );
}

/**
 * Un número grande. `linea` = { tono, icono, texto } (ej: "7 más que agosto").
 * Ej: <Kpi titulo="Entregados" valor="41" linea={{ tono: "bien", icono: "sube", texto: "3 más que agosto" }} />
 */
export function Kpi({ titulo, valor, unidad = "", linea = null, extra = null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5 shadow-sm sm:px-4">
      <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-suave dark:text-suave-dark">
        {titulo}
        {extra}
      </span>
      <span className="text-[26px] font-bold leading-tight tabular-nums text-titulo dark:text-titulo-dark sm:text-[28px]">
        {valor}
        {unidad ? <span className="text-[15px] font-semibold text-suave dark:text-suave-dark"> {unidad}</span> : null}
      </span>
      {linea ? <Linea {...linea} /> : null}
    </div>
  );
}

/** Muestra de color de la leyenda: cuadradito (barra) o rayita (lo esperado). */
export function Muestra({ color, label, raya = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-suave dark:text-suave-dark">
      <span
        className={`shrink-0 ${raya ? "h-3.5 w-0.5 rounded-sm" : "h-3 w-3 rounded-[3px]"} ${color}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function Leyenda({ children }) {
  return <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">{children}</div>;
}

/** La barrita de "cuánto se cobró" (ej: 93 % de lo que cobran los gestores). */
export function Medidor({ pct, color, fondo, label }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={`block h-2.5 overflow-hidden rounded-full ${fondo}`}
    >
      <span className={`block h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
    </span>
  );
}

/** "Todavía no hay nada" dentro de una tarjeta. */
export function Vacio({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-linea dark:border-linea-dark px-4 py-6 text-center text-[13px] text-suave dark:text-suave-dark">
      {children}
    </p>
  );
}
