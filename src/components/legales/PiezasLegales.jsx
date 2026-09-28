// src/components/legales/PiezasLegales.jsx
//
// 🧩 Piezas chicas de Legales (las comunes — avatar, botones de contacto,
// candado, subir archivo… — son las mismas de Gestoría, ver gestoria/Piezas).
//   - EstadoPill:   la etiqueta de color del estado ("En juzgado · desde 15/09").
//   - DiasChip:     "hace N días" en verde / ámbar / rojo (30 días = demorado).
//   - PasosCaso:    los 7 pasos con su fecha (horizontal en la compu).
//   - CajaFecha:    la cajita "VIE 02/10".
//   - Glosario:     el "?" que explica una palabra difícil (audiencia, pericia…).
//   - BotonWa:      botón verde de WhatsApp (abre el chat con el mensaje escrito).
//   - Chip, Aviso:  etiquetas y carteles de color.
import { useState } from "react";
import { HiChatAlt2, HiCheck, HiClock, HiQuestionMarkCircle } from "react-icons/hi";

import { Avatar } from "../gestoria/Piezas";
import { ESTADOS, PASOS, cajaFecha, colorAbogado, ddmm } from "./legalesUtils";

export function AvatarAbogado({ id, nombre, foto, size = 26 }) {
  // "Dr. Martín Sosa" → iniciales "MS" (sin el "Dr.").
  const limpio = String(nombre || "").replace(/^dra?\.?\s+/i, "");
  return <Avatar id={id} nombre={limpio} foto={foto} size={size} color={id ? colorAbogado(id) : ""} />;
}

export function EstadoPill({ estado, desde = "", chico = false }) {
  const e = ESTADOS[estado] || { n: estado, dot: "#94a3b8" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${
        chico ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      }`}
      style={{ borderColor: `${e.dot}55`, color: e.dot, background: `${e.dot}14` }}
    >
      <i className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: e.dot }} />
      {e.n}
      {desde ? <span className="font-medium">· desde {ddmm(desde)}</span> : null}
    </span>
  );
}

/** "hace N días": verde (menos de 15), ámbar (15 a 29), rojo (30 o más = demorado). */
export function DiasChip({ dias, texto }) {
  const cls =
    dias >= 30
      ? "text-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
      : dias >= 15
        ? "text-duo-amarillo-sombra dark:text-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]"
        : "text-duo-verde-sombra dark:text-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      <HiClock className="w-3 h-3" />
      {texto}
    </span>
  );
}

export function Chip({ children, tono = "neutro", className = "" }) {
  const tonos = {
    neutro: "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark",
    azul: "bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
    verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde border-duo-verde/30",
    ambar: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo border-duo-amarillo/40",
    rojo: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo border-duo-rojo/30",
    violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta border-duo-violeta/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${tonos[tono] || tonos.neutro} ${className}`}>
      {children}
    </span>
  );
}

export function Aviso({ children, tono = "azul", className = "" }) {
  const tonos = {
    azul: "border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-900 dark:text-sky-200",
    verde: "border-duo-verde/30 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
    ambar: "border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-amber-900 dark:text-amber-200",
    rojo: "border-duo-rojo/30 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
    violeta: "border-duo-violeta/30 bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
  };
  return <div className={`rounded-xl border px-3.5 py-3 text-[13px] leading-snug ${tonos[tono] || tonos.azul} ${className}`}>{children}</div>;
}

/** La cajita de fecha: "VIE" arriba y "02/10" abajo. */
export function CajaFecha({ ymd, tono = "neutro" }) {
  const { dia, fecha } = cajaFecha(ymd);
  const tonos = {
    neutro: "text-titulo dark:text-titulo-dark",
    ambar: "text-amber-800 dark:text-amber-300",
    rojo: "text-duo-rojo",
    gris: "text-suave dark:text-suave-dark",
  };
  return (
    <span className={`flex flex-col items-center justify-center w-12 shrink-0 leading-tight ${tonos[tono] || tonos.neutro}`}>
      <span className="text-[10px] font-bold tracking-wide">{dia}</span>
      <span className="text-[15px] font-bold">{fecha}</span>
    </span>
  );
}

/**
 * Los 7 pasos con la fecha en que llegó a cada uno. `pasos` viene del servidor:
 * [{id, nombre, cliente, fecha, hecho, actual}].
 */
export function PasosCaso({ pasos = [], vertical = false, paraCliente = false }) {
  return (
    <ol
      className={`grid gap-2.5 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 ${
        vertical ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4 xl:grid-cols-7"
      }`}
      aria-label="En qué paso está"
    >
      {pasos.map((p, i) => {
        const bola = p.hecho
          ? "bg-duo-verde text-white"
          : p.actual
            ? "bg-indigo-600 text-white ring-4 ring-indigo-600/20"
            : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark";
        const sub = p.actual && p.fecha ? `desde ${ddmm(p.fecha)}` : p.fecha && p.hecho ? ddmm(p.fecha) : "—";
        return (
          <li key={p.id} className="flex items-center gap-2.5 min-w-0" aria-current={p.actual ? "step" : undefined}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${bola}`}>
              {p.hecho ? <HiCheck className="w-4 h-4" /> : i + 1}
            </span>
            <span className="flex flex-col min-w-0">
              <strong
                className={`text-[13px] leading-tight ${
                  p.actual ? "text-indigo-700 dark:text-indigo-300" : p.hecho ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"
                }`}
              >
                {paraCliente ? p.cliente : p.nombre}
              </strong>
              <span className="text-[12px] text-suave dark:text-suave-dark truncate">{sub}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * El "?" al lado de una palabra difícil. Busca la explicación en el glosario
 * del catálogo (ej: "audiencia"). Si no la encuentra, no se dibuja.
 */
/** La palabra difícil que aparece en el texto (palabra entera: "parte" no es "art"). */
function buscarClave(texto, glosario = {}) {
  const t = ` ${String(texto || "").toLowerCase()} `;
  return Object.keys(glosario || {}).find((k) => {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`[^a-záéíóúüñ]${esc}[^a-záéíóúüñ]`).test(t);
  });
}

export function Glosario({ palabra, glosario = {}, className = "" }) {
  const [abierto, setAbierto] = useState(false);
  const clave = buscarClave(palabra, glosario);
  if (!clave) return null;
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <button
        type="button"
        onClick={() => setAbierto((x) => !x)}
        aria-expanded={abierto}
        aria-label={`¿Qué es ${clave}?`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10"
      >
        <HiQuestionMarkCircle className="w-4 h-4" />
      </button>
      {abierto && (
        <span className="mt-2 block rounded-lg border border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-2.5 text-[12px] leading-snug text-titulo dark:text-titulo-dark">
          <b className="block mb-0.5">¿Qué es {clave === "art" ? "la ART" : `una ${clave}`}?</b>
          {glosario[clave]}
        </span>
      )}
    </span>
  );
}

const WA_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors";

/**
 * Botón de WhatsApp: es un link (así el celu abre WhatsApp al toque, sin que
 * el navegador lo bloquee). `onEnviado` se llama al tocarlo (para anotarlo).
 */
export function BotonWa({ href, onEnviado, children = "WhatsApp", size = "md", full = false, variante = "lleno", className = "" }) {
  const tam = size === "sm" ? "text-[13px] px-3 py-2 min-h-[36px]" : size === "lg" ? "text-[15px] px-5 py-3 min-h-[48px]" : "text-[14px] px-4 py-2.5 min-h-[42px]";
  const estilo =
    variante === "borde"
      ? "inline-flex items-center justify-center gap-2 rounded-lg font-semibold border border-green-700/50 text-green-800 dark:text-green-400 bg-card dark:bg-card-dark hover:bg-green-50 dark:hover:bg-green-500/10"
      : WA_BASE;
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onEnviado?.()}
      className={`${estilo} ${tam} ${full ? "w-full" : ""} ${className}`}
    >
      <HiChatAlt2 className="w-4 h-4 shrink-0" />
      <span>{children}</span>
    </a>
  );
}
