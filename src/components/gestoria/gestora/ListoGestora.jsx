// src/components/gestoria/gestora/ListoGestora.jsx
//
// ✅ "¡Listo!" (app de la gestora, 30/09): la pantalla que sale al pasar un trámite
// a LISTO. Le dice qué pasa ahora (la oficina se lo entrega al cliente), le muestra
// «Lo que sigue» (el próximo observado o para presentar) y «Volver al inicio».
import { useEffect, useRef } from "react";
import { HiOutlineCheck, HiOutlineIdentification } from "react-icons/hi2";

import { FilaTramite, Boton, Patente } from "./piezas";
import { esDePersona, suave } from "./gestoraUtils";

/** Qué pasa ahora, según cómo esté el aviso al cliente (Railway: GESTORIA_*). */
function queSigue(t, catalogo) {
  const oficina = t?.oficina_nombre ? `THAMES ${t.oficina_nombre}` : "la oficina de THAMES";
  if (catalogo && !catalogo.aviso_cliente) return { antes: "Ya le aparece a ", fuerte: oficina, despues: " para entregarlo." };
  if (catalogo?.whatsapp_auto) return { antes: "Al cliente le llega un WhatsApp y lo retira en ", fuerte: oficina, despues: "." };
  return { antes: "Le avisamos a ", fuerte: oficina, despues: " para que se lo entregue al cliente." };
}

export default function ListoGestora({ t, catalogo, siguiente = null, desde = "inicio", onInicio }) {
  const titulo = useRef(null);
  useEffect(() => {
    titulo.current?.focus();
  }, []);
  const txt = queSigue(t, catalogo);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-listo"
      className="fixed inset-0 z-[120] flex flex-col bg-surface dark:bg-surface-dark"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3.5 overflow-y-auto px-5 py-6 text-center">
        <span
          className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-green-400"
          aria-hidden="true"
        >
          <HiOutlineCheck className="h-14 w-14" strokeWidth={2.6} />
        </span>
        <h1
          id="titulo-listo"
          ref={titulo}
          tabIndex={-1}
          className="text-[36px] font-extrabold leading-tight tracking-[-0.5px] text-titulo dark:text-titulo-dark outline-none"
        >
          ¡Listo!
        </h1>
        <span className="flex flex-wrap items-center justify-center gap-2.5">
          {esDePersona(t) ? (
            <span className="inline-flex items-center gap-1.5 text-[17px] font-extrabold text-titulo dark:text-titulo-dark">
              <HiOutlineIdentification className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              {t.persona_nombre}
            </span>
          ) : t.patente ? (
            <Patente p={t.patente} grande />
          ) : null}
          <span className="text-[16px] font-bold text-slate-600 dark:text-slate-300">{t.tipo_corto || t.tipo_txt}</span>
        </span>
        <p className="max-w-[320px] text-[16.5px] leading-[1.45] text-slate-600 dark:text-slate-300">
          {txt.antes}
          <strong className="text-titulo dark:text-titulo-dark">{txt.fuerte}</strong>
          {txt.despues}
        </p>

        {siguiente ? (
          <div className="mt-3 w-full self-stretch overflow-hidden rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-left">
            <span className={`block px-3.5 pt-3.5 text-[12px] font-extrabold uppercase tracking-[0.6px] ${suave}`}>Lo que sigue</span>
            <FilaTramite t={siguiente} desde={desde} replace />
          </div>
        ) : null}
      </div>
      <footer
        className="border-t border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full max-w-2xl px-4 pb-[18px] pt-3">
          <Boton tono="blanco" chico onClick={onInicio}>
            Volver al inicio
          </Boton>
        </div>
      </footer>
    </div>
  );
}
