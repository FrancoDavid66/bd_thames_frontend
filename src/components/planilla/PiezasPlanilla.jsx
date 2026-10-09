// src/components/planilla/PiezasPlanilla.jsx
//
// 🧩 Piezas chicas de la PLANILLA DE COLORES: el botón de color del estado,
// la persona (avatar + nombre), la patente y las marquitas ("Sin precio").
import { HiChevronDown } from "react-icons/hi2";

import { Avatar } from "../gestoria/Piezas";
import { nombreAvatar, primerNombre } from "./planillaUtils";

const GRIS = "#64748b";

/** Avatar + primer nombre (columna «Gestor» / «Abogado»). */
export function Persona({ id, nombre, foto, vacio = "Sin asignar" }) {
  if (!nombre) return <span className="text-[13px] italic text-suave dark:text-suave-dark">{vacio}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2" title={nombre}>
      <Avatar id={id} nombre={nombreAvatar(nombre)} foto={foto} size={24} />
      <span className="truncate text-[13px] text-titulo dark:text-titulo-dark">{primerNombre(nombre)}</span>
    </span>
  );
}

/** Patente con letra de máquina (AE512KD). */
export function PatenteChica({ p, vacio = "—" }) {
  if (!p) return <span className="text-[13px] text-suave dark:text-suave-dark">{vacio}</span>;
  return (
    <span className="whitespace-nowrap rounded-md border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-1.5 py-0.5 font-mono text-[12.5px] font-bold tracking-wide text-titulo dark:text-titulo-dark">
      {p}
    </span>
  );
}

const TONO_MARCA = {
  rojo: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  ambar: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  azul: "bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  verde: "bg-green-50 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  violeta: "bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  neutro: "bg-surface text-suave dark:bg-surface-dark dark:text-suave-dark",
};

/** Marquita de color ("Sin precio", "Cliente subió papeles"). */
export function Marca({ tono = "neutro", children }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-px text-[11px] font-bold ${TONO_MARCA[tono] || TONO_MARCA.neutro}`}>{children}</span>;
}

/** Texto y color del estado de una fila (lo que se pinta en la celda). */
export function estadoVisible(a, it) {
  const e = a.estados?.[a.estadoDe(it)];
  return {
    color: (a.colorEstado && a.colorEstado(it)) || e?.c || GRIS,
    txt: (a.etiquetaEstado && a.etiquetaEstado(it)) || e?.n || "—",
  };
}

/** El color del estado: toda la celda pintada (como Monday). Se toca y sale el menú. */
export function BotonEstado({ a, it, onMenu, grande = false, celu = false, activo = false }) {
  const puede = a.abierto ? a.abierto(it) : true;
  const { color, txt } = estadoVisible(a, it);
  const forma = grande
    ? "min-h-[48px] w-full rounded-xl px-4 py-2.5 text-[15.5px]"
    : celu
      ? "min-h-[54px] w-full rounded-lg px-2 py-1.5 text-[12.5px] leading-tight"
      : "h-full min-h-[46px] w-full px-2 py-1.5 text-[13px] leading-tight";
  return (
    <button
      type="button"
      disabled={!puede}
      aria-haspopup={puede ? "menu" : undefined}
      aria-expanded={puede ? activo : undefined}
      aria-label={puede ? `Estado: ${txt}. Tocá para cambiarlo` : `Estado: ${txt}`}
      onClick={(e) => puede && onMenu(it, e.currentTarget)}
      className={`flex items-center justify-center gap-1.5 text-center font-bold text-white transition-[filter] disabled:cursor-default ${puede ? "hover:brightness-110" : "opacity-90"} ${activo ? "brightness-110" : ""} ${forma}`}
      style={{ background: color }}
    >
      <span className="line-clamp-2 break-words">{txt}</span>
      {puede && <HiChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-80 transition-transform ${activo ? "rotate-180" : ""}`} aria-hidden="true" />}
    </button>
  );
}

/** Botón chico de acción del panel (WhatsApp, link del cliente…). */
export function BotonPanel({ href, onClick, icono = null, children, tono = "neutro", disabled = false, afuera = true }) {
  const cls = `inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-bold transition-colors disabled:opacity-50 ${
    tono === "verde"
      ? "border-green-600/40 bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-300"
      : tono === "acc"
        ? "border-[var(--acc)] bg-[var(--acc)] text-white hover:brightness-110"
        : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
  }`;
  if (href) {
    return (
      <a href={href} target={afuera ? "_blank" : undefined} rel={afuera ? "noopener noreferrer" : undefined} onClick={onClick} className={cls}>
        {icono}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {icono}
      {children}
    </button>
  );
}
