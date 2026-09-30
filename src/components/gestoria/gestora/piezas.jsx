// src/components/gestoria/gestora/piezas.jsx
//
// 🧩 Piezas de la APP DE LA GESTORA (30/09, estilo "Envíos Flex": lista corta y
// un botón grande por paso). Colores de THAMES, en claro y en oscuro.
//   IconoEstado  el cuadradito de color de cada trámite (⚠ observado, ↗ para presentar…)
//   ChipEstado   la pastillita "Para presentar · hace 2 días"
//   Patente      la patente dibujada como una chapa (con la franja azul)
//   FilaTramite  un trámite en la lista: patente · tipo, cliente · oficina y lo importante
//   CampoPlata   el campo de plata a la argentina (60.000 · 60.000,50) que no te mueve el cursor
//   Tarjeta, Seccion, BarraTitulo, Boton, Vacio: lo demás que se repite
import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  HiOutlineArrowUpRight,
  HiOutlineBuildingLibrary,
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
} from "react-icons/hi2";

import { diasEnEstado, textoDias, tipoCorto } from "../gestoriaUtils";
import {
  MONO,
  TONO_CAJA,
  TONO_TEXTO,
  demoradoGestora,
  diasCorto,
  esDePersona,
  estadoApp,
  foco,
  lineaDeEstado,
  montoEscrito,
  patenteLinda,
  suave,
} from "./gestoraUtils";

const ICONOS = {
  OBSERVADO: HiOutlineExclamationTriangle,
  ASIGNADO: HiOutlineArrowUpRight,
  EN_REGISTRO: HiOutlineBuildingLibrary,
  LISTO: HiOutlineCheck,
  ENTREGADO: HiOutlineCheckCircle,
  CANCELADO: HiOutlineXMark,
  RECIBIDO: HiOutlineClock,
};

/** El cuadradito de color con el ícono del estado. */
export function IconoEstado({ t, lado = 40 }) {
  const e = estadoApp(t);
  const Icono = ICONOS[t?.estado] || HiOutlineClock;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${TONO_CAJA[e.tono]}`}
      style={{ width: lado, height: lado }}
      aria-hidden="true"
    >
      <Icono className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

/** "● Para presentar · hace 2 días" */
export function ChipEstado({ t, extra = "" }) {
  const e = estadoApp(t);
  return (
    <span className={`inline-flex items-center gap-[7px] self-start rounded-full px-3 py-[5px] text-[13px] font-extrabold ${TONO_CAJA[e.tono]}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${e.punto}`} aria-hidden="true" />
      {e.txt}
      {extra ? ` · ${extra}` : ""}
    </span>
  );
}

/** La patente como una chapa del Mercosur (blanca, con la franja azul arriba). */
export function Patente({ p, grande = false }) {
  return (
    <span className="inline-flex shrink-0 flex-col overflow-hidden rounded-[7px] border-2 border-slate-900 dark:border-slate-400 bg-white">
      <span className="h-1.5 bg-duo-azul-sombra" aria-hidden="true" />
      <span
        className={`whitespace-nowrap px-2.5 pb-[3px] pt-px font-semibold tracking-[1.5px] text-slate-900 ${grande ? "text-[20px] leading-7" : "text-[15px] leading-5"}`}
        style={MONO}
      >
        {patenteLinda(p)}
      </span>
    </span>
  );
}

/**
 * Un trámite en la lista (se toca y abre la ficha).
 * Ej: [⚠]  AE306CD · Transferencia        hoy ›
 *          Marta Sosa · Axion
 *          Pidió: firma del titular
 * desde = de qué pantalla viene ("inicio" | "tramites" | "cobros"): la ficha dice "‹ Inicio".
 * replace = no deja la pantalla de antes en el "atrás" (ej: desde el ¡Listo!).
 */
export function FilaTramite({ t, desde = "inicio", replace = false }) {
  const d = diasEnEstado(t);
  const dem = demoradoGestora(t);
  const persona = esDePersona(t);
  const l3 = lineaDeEstado(t);
  const sub = [t.persona_nombre, t.oficina_nombre].filter(Boolean).join(" · ");
  return (
    <Link
      to={`/gestoria/tramite/${t.id}`}
      state={{ desde }}
      replace={replace}
      className={`flex min-h-[72px] items-center gap-3 px-3.5 py-3 text-titulo dark:text-titulo-dark transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-white/[0.03] dark:active:bg-white/[0.06] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
    >
      <IconoEstado t={t} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[15px] leading-snug">
          {t.patente && !persona ? (
            <>
              <span className="shrink-0 font-semibold tracking-[0.5px]" style={MONO}>
                {t.patente}
              </span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          <span className="truncate font-bold">{tipoCorto(t)}</span>
        </span>
        {sub ? <span className={`truncate text-[13.5px] ${suave}`}>{sub}</span> : null}
        {l3 ? <span className={`truncate text-[13px] font-bold ${TONO_TEXTO[l3.tono] || suave}`}>{l3.txt}</span> : null}
      </span>
      <span className={`flex shrink-0 items-center gap-0.5 text-[13px] ${dem ? "font-bold text-duo-rojo dark:text-red-400" : suave}`}>
        <span aria-hidden="true">{diasCorto(d)}</span>
        <span className="sr-only">
          {estadoApp(t).txt}, {textoDias(d)}
          {dem ? ", demorado" : ""}
        </span>
        <HiOutlineChevronRight className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** Caja blanca con borde (en la lista, cada fila separada por una línea). */
export function Tarjeta({ children, className = "", lista = false }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark ${
        lista ? "divide-y divide-slate-100 dark:divide-slate-700/70" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Título de sección con su numerito: "Para presentar (9)".
 * derecha = algo corto a la derecha ("Los observó el registro"); bajada = una línea abajo del título.
 */
export function Seccion({ titulo, n = null, derecha = null, bajada = "", tono = null, children }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2
          className={`flex items-center gap-2 whitespace-nowrap text-[17px] font-extrabold ${tono ? TONO_TEXTO[tono] : "text-titulo dark:text-titulo-dark"}`}
        >
          {titulo}
          {n != null ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/60 px-[7px] text-[13px] font-extrabold text-slate-600 dark:text-slate-300">
              {n}
            </span>
          ) : null}
        </h2>
        {derecha}
      </div>
      {bajada ? <p className={`-mt-1.5 px-0.5 text-[13.5px] ${suave}`}>{bajada}</p> : null}
      {children}
    </section>
  );
}

/** Barra de arriba con el título de la pantalla (Trámites, Cobros, Perfil). */
export function BarraTitulo({ titulo, derecha = null }) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-2 px-4">
        <h1 className="text-[22px] font-extrabold tracking-[-0.2px] text-titulo dark:text-titulo-dark">{titulo}</h1>
        {derecha}
      </div>
    </header>
  );
}

const TONOS_BOTON = {
  violeta: "bg-duo-violeta hover:bg-duo-violeta-sombra text-white",
  verde: "bg-duo-verde-sombra hover:bg-[#166534] text-white",
  ambar: "bg-duo-amarillo-sombra hover:bg-[#92400e] text-white",
  ambarBorde:
    "border-[1.5px] border-duo-amarillo bg-card dark:bg-card-dark text-duo-amarillo-sombra dark:text-amber-300 hover:bg-duo-amarillo-soft dark:hover:bg-[var(--color-duo-amarillo-soft-dark)]",
  blanco:
    "border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark",
};

/** EL botón grande (a lo ancho, 56 px de alto: se toca fácil con el pulgar). */
export function Boton({ tono = "violeta", icono = null, chico = false, className = "", children, ...props }) {
  const Icono = icono;
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-[14px] px-4 text-center font-extrabold leading-tight transition-colors active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 ${
        chico ? "min-h-[50px] text-[16px]" : "min-h-[56px] text-[17px]"
      } ${TONOS_BOTON[tono] || TONOS_BOTON.violeta} ${foco} ${className}`}
    >
      {Icono ? <Icono className="h-[22px] w-[22px] shrink-0" strokeWidth={2.2} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Cuando no hay nada para mostrar: un ícono, un título y qué hacer. */
export function Vacio({ icono = HiOutlineCheckCircle, tono = "verde", titulo, texto = "", children = null }) {
  const Icono = icono;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-linea dark:border-linea-dark bg-card/60 dark:bg-card-dark/60 px-5 py-8 text-center">
      <span className={`flex h-14 w-14 items-center justify-center rounded-full ${TONO_CAJA[tono] || TONO_CAJA.neutro}`} aria-hidden="true">
        <Icono className="h-7 w-7" strokeWidth={2} />
      </span>
      <strong className="text-[17px] font-extrabold text-titulo dark:text-titulo-dark">{titulo}</strong>
      {texto ? <p className={`max-w-[320px] text-[14.5px] leading-snug ${suave}`}>{texto}</p> : null}
      {children}
    </div>
  );
}

/**
 * 💵 Campo de plata a la argentina: pone los puntos de los miles mientras escribís
 * ("60000" → "60.000"), acepta centavos con coma ("60.000,50", ej: pegado del banco)
 * y no te mueve el cursor si corregís un número del medio.
 * valor = el texto que se ve ("60.000"); onCambiar(texto). Los pesos: montoDe(valor).
 */
export function CampoPlata({ valor, onCambiar, className = "", ...props }) {
  const ref = useRef(null);
  const cursor = useRef(null); // cuántos números quedan a la izquierda del cursor

  useLayoutEffect(() => {
    const el = ref.current;
    const n = cursor.current;
    cursor.current = null;
    if (!el || n == null || document.activeElement !== el) return;
    let pos = 0;
    let vistos = 0;
    while (pos < el.value.length && vistos < n) {
      if (/\d/.test(el.value[pos])) vistos += 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
  }, [valor]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={valor}
      onChange={(e) => {
        const raw = e.target.value;
        const hasta = e.target.selectionStart ?? raw.length;
        cursor.current = raw.slice(0, hasta).replace(/\D/g, "").length;
        onCambiar(montoEscrito(raw));
      }}
      onKeyDown={(e) => {
        // Borrar justo después de un punto borra el número de antes (los puntos los pone solo).
        const el = e.currentTarget;
        const i = el.selectionStart;
        if (e.key === "Backspace" && i && i === el.selectionEnd && el.value[i - 1] === ".") el.setSelectionRange(i - 1, i - 1);
      }}
      className={className}
      {...props}
    />
  );
}
