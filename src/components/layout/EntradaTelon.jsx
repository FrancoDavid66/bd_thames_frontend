// src/components/layout/EntradaTelon.jsx
//
// 🎭 ENTRADA «TELÓN» (Franco 17/11/2026 · eligió el modelo «Telón + lista de carga»)
//
//   Sale UNA vez, justo después de iniciar sesión (no al recargar ni en otra pestaña):
//     1. Pantalla completa del color de la marca, con el logo en blanco, «THAMES» y el
//        saludo según la hora: «Buenas tardes, Maximiliano».
//     2. Una lista que se va tildando CON DATOS DE VERDAD: cada ✓ sale cuando ese pedido
//        al servidor terminó (y no antes de su turno, para que se lea). Si algo tarda más
//        de 4 s, se tilda igual: la entrada nunca traba la app.
//          · Abogado:        Tus reclamos · Agenda del día · Novedades
//          · Gestora:        Tus trámites · Novedades
//          · Admin / oficina: Siniestros · Tareas del día · Novedades
//     3. El telón SUBE (con el borde curvo) y deja ver la app, que ya se cargó atrás.
//   Malvinas: telón verde con su logo. Con «reducir movimiento» del celu: sin subida, se desvanece.
//   Celu, tablet o compu: todo centrado y con tamaños que se acomodan a la pantalla.
//
// props: user, marca (useMarca), onTerminado() → la app la saca de pantalla.
import { useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/axiosConfig";

const ROJO_THAMES = "#c1121f";
const TOPE_MS = 4000; // un pedido que tarda más que esto se tilda igual
const TURNO_MS = [520, 900, 1280]; // cada ✓ no sale antes de su turno (se lee la lista)
const ESPERA_ANTES_DE_SUBIR_MS = 380;
const SUBIDA_MS = 900;

/** Lo que se va tildando, según quién entra. Cada uno es un pedido chiquito (sin datos pesados). */
function itemsPara(rol) {
  const novedades = { id: "nov", txt: "Novedades", url: "notificaciones/novedades/" };
  if (rol === "ABOGADO")
    return [
      { id: "rec", txt: "Tus reclamos", url: "siniestros/?page_size=1&abiertos=1" },
      { id: "age", txt: "Agenda del día", url: "legales/agenda/" },
      novedades,
    ];
  if (rol === "ESCRIBANO") // ✍️ la escribana: sus consultas y casos (sin reclamos)
    return [
      { id: "cas", txt: "Tus consultas y casos", url: "legales/resumen/" },
      { id: "age", txt: "Agenda del día", url: "legales/agenda/" },
      novedades,
    ];
  if (rol === "GESTOR")
    return [{ id: "tra", txt: "Tus trámites", url: "gestoria/resumen/" }, novedades];
  return [
    { id: "sin", txt: "Siniestros", url: "siniestros/?page_size=1&abiertos=1" },
    { id: "tar", txt: "Tareas del día", url: "tareas-fijas/dia/" },
    novedades,
  ];
}

/** «Buenos días» (5 a 12) · «Buenas tardes» (12 a 20) · «Buenas noches». */
function saludoDeLaHora(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** "MAXIMILIANO andrés" → "Maximiliano" · sin nombre: el usuario ("maxi1234"). */
function primerNombre(user) {
  const n = String(user?.first_name || "").trim().split(/\s+/)[0] || "";
  if (n) return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  return String(user?.username || "").trim();
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** El logo de THAMES en blanco (las mismas piezas del SVG original). */
function LogoThames({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 979 753" fill="currentColor" aria-hidden="true">
      <polygon points="225.5 113.3 375.5 113.3 375.7 38 225.5 75.3 225.5 113.3" />
      <polygon points="753.1 113.3 603.1 113.3 602.9 38 753.1 75.3 753.1 113.3" />
      <polygon points="414 113.3 564.1 113.3 564.1 38 488.8 0 414 38" />
      <path
        transform="translate(-10.7 -123.6)"
        d="M989.3,425.5a150.6,150.6,0,0,1-296.5,37.3,154,154,0,0,1-4.1-24.6V412.7a149.1,149.1,0,0,1,4.3-25.2H839.3v75.3h-66a75.3,75.3,0,1,0,65.4-112.6H161.3a75.3,75.3,0,1,0,65.4,112.6h-66V387.5H307a151.4,151.4,0,0,1,4.3,25.4v25.2a155.3,155.3,0,0,1-4.1,24.7A150.6,150.6,0,1,1,161.3,274.9H838.7A150.6,150.6,0,0,1,989.3,425.5Z"
      />
      <polygon points="338.8 752.8 413.5 710.2 414 263.9 338.8 263.9 338.8 752.8" />
      <rect x="451.7" y="266.5" width="75.3" height="443.7" />
      <polygon points="639.9 752.8 564.6 710.2 564.6 263.9 639.9 263.9 639.9 752.8" />
    </svg>
  );
}

// Animaciones propias (entran con la pantalla; la subida es una transición de CSS).
const CSS = `
@keyframes et-aparece{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes et-logo{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}
@keyframes et-gira{to{transform:rotate(360deg)}}
@keyframes et-ok{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:none}}
.et-telon{transition:transform ${SUBIDA_MS}ms cubic-bezier(.76,0,.24,1),border-radius ${SUBIDA_MS}ms cubic-bezier(.76,0,.24,1),opacity 260ms ease}
.et-telon.et-sube{transform:translateY(-104%);border-radius:0 0 50% 50% / 0 0 clamp(70px,12vw,150px) clamp(70px,12vw,150px)}
.et-logo{animation:et-logo .55s cubic-bezier(.2,.8,.2,1) both}
.et-aparece{animation:et-aparece .5s cubic-bezier(.2,.8,.2,1) both}
.et-gira{animation:et-gira .8s linear infinite}
.et-ok{animation:et-ok .38s cubic-bezier(.3,1.4,.5,1) both}
@media (prefers-reduced-motion: reduce){
  .et-telon{transition:opacity 260ms ease}
  .et-telon.et-sube{transform:none;border-radius:0;opacity:0}
  .et-logo,.et-aparece,.et-ok{animation:none}
}
`;

export default function EntradaTelon({ user, marca, onTerminado }) {
  const rol = user?.perfil?.rol || "";
  const items = useMemo(() => itemsPara(rol), [rol]);
  const [listos, setListos] = useState({}); // { rec: true, … }
  const [sube, setSube] = useState(false);
  const terminado = useRef(false);

  const esThames = !marca || marca.id === "thames";
  const color = esThames ? ROJO_THAMES : marca.verde || "var(--color-marca)";
  const saludo = useMemo(() => saludoDeLaHora(), []);
  const nombre = primerNombre(user);

  const terminar = () => {
    if (terminado.current) return;
    terminado.current = true;
    onTerminado?.();
  };

  // ✓ con datos de verdad: cada pedido termina (o vence el tope) y espera su turno.
  useEffect(() => {
    let vivo = true;
    const inicio = Date.now();
    const pasos = items.map(async (it, i) => {
      await Promise.race([api.get(it.url).catch(() => null), espera(TOPE_MS)]);
      const falta = (TURNO_MS[i] ?? TURNO_MS[TURNO_MS.length - 1] + 380 * (i - TURNO_MS.length + 1)) - (Date.now() - inicio);
      if (falta > 0) await espera(falta);
      if (vivo) setListos((l) => ({ ...l, [it.id]: true }));
    });
    Promise.all(pasos)
      .then(() => espera(ESPERA_ANTES_DE_SUBIR_MS))
      .then(() => vivo && setSube(true));
    return () => {
      vivo = false;
    };
  }, [items]);

  // Al terminar de subir (o por las dudas, si el navegador no avisa), se saca de pantalla.
  useEffect(() => {
    if (!sube) return undefined;
    const t = setTimeout(terminar, SUBIDA_MS + 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sube]);

  return (
    <div
      className={`et-telon fixed inset-0 z-[120] flex flex-col items-center justify-center px-6 text-white ${sube ? "et-sube pointer-events-none" : ""}`}
      style={{ background: color, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      role="status"
      aria-live="polite"
      aria-label={`${saludo}, ${nombre}. Cargando`}
      onTransitionEnd={(e) => {
        if (sube && e.target === e.currentTarget && (e.propertyName === "transform" || e.propertyName === "opacity")) terminar();
      }}
    >
      <style>{CSS}</style>

      {/* Logo + nombre de la marca */}
      <div className="et-logo flex flex-col items-center gap-3">
        {esThames ? (
          <LogoThames className="h-auto w-[clamp(64px,9vw,92px)]" />
        ) : (
          <span className="flex h-[clamp(72px,10vw,100px)] w-[clamp(72px,10vw,100px)] items-center justify-center rounded-full bg-white p-3 shadow-lg">
            <img src={marca.logo} alt="" className="h-full w-full object-contain" />
          </span>
        )}
        <p className="m-0 pl-[.34em] text-[clamp(14px,1.6vw,18px)] font-extrabold tracking-[.34em]">{marca?.nombreCorto || "THAMES"}</p>
      </div>

      {/* Saludo */}
      <p className="et-aparece m-0 mt-5 text-center text-[clamp(17px,2vw,20px)] font-medium text-white/90" style={{ animationDelay: "150ms" }}>
        {saludo}
        {nombre ? (
          <>
            , <b className="font-bold text-white">{nombre}</b>
          </>
        ) : null}
      </p>

      {/* Lo que se va cargando */}
      <ul className="m-0 mt-7 flex w-[min(240px,80vw)] list-none flex-col gap-3.5 p-0">
        {items.map((it, i) => (
          <li key={it.id} className="et-aparece flex items-center gap-3.5 text-[clamp(15px,1.7vw,17px)] font-semibold" style={{ animationDelay: `${300 + i * 160}ms` }}>
            <span className="relative h-5 w-5 shrink-0" aria-hidden="true">
              {listos[it.id] ? (
                <svg className="et-ok absolute inset-0 h-5 w-5" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="10" fill="#fff" />
                  <path d="M5.6 10.4l3 3 5.8-6.4" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="et-gira absolute inset-0 rounded-full border-2 border-white/30 border-t-white" />
              )}
            </span>
            <span>{it.txt}</span>
            <span className="sr-only">{listos[it.id] ? "listo" : "cargando"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
