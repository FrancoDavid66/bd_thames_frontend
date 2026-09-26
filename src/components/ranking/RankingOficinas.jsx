// src/components/ranking/RankingOficinas.jsx
// ============================================================
// 🏆 RANKING DE OFICINAS — "Juegos THAMES".
//
// Podio con la oficina que más pólizas nuevas hizo en el mes ARRIBA (al
// centro, con corona), la 2ª a la izquierda y la 3ª a la derecha. Abajo:
// las que quedaron fuera del podio, "La carrera", lo de hoy (o lo mejor del
// mes si ya cerró) y los campeones de cada mes.
//
// Estilo propio (estadio de noche), NO el de la app: fondo oscuro siempre,
// letras Anton/Barlow. Se mueve solo (en vivo); si alguien pasa al frente,
// tira papelitos y avisa.
//
// Cuenta: pólizas cargadas en THAMES que no son renovación (mismo número
// que Estadísticas y el Inicio). Empate: gana la que llegó primero.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";

import { useAuth } from "../../context/AuthContext";
import { useNuevasMes, useNuevasSerie } from "../../hooks/usePolizasNuevas";
import {
  colorOficina,
  siglaOficina,
  ordenarPorMetrica,
  mesActual,
  moverMes,
  nombreMes,
  nombreMesSolo,
  mejorDelMes,
  hora,
} from "../polizasNuevas/comun";

// framer-motion con nombre en mayúscula (así ESLint lo ve usado, como en el Recreo).
const MotionDiv = motion.div;

const F_DISPLAY = { fontFamily: '"Anton", Impact, "Arial Narrow Bold", sans-serif', fontWeight: 400 };
const F_COND = { fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif' };
const F_TEXTO = { fontFamily: '"Barlow", system-ui, sans-serif' };

const ORO = "#fbbf24";
const PLATA = "#cbd5e1";
const BRONCE = "#d97706";
const MEDALLA = [ORO, PLATA, BRONCE];
const BRILLO = [
  "0 0 0 10px rgba(251,191,36,0.14), 0 0 90px rgba(251,191,36,0.45)",
  "0 0 0 8px rgba(203,213,225,0.10)",
  "0 0 0 8px rgba(217,119,6,0.14)",
];
const PUESTO_TXT = ["PRIMERO", "SEGUNDO", "TERCERO"];

// Tamaños del podio (celu → compu).
const FORMA = [
  { escudo: "h-24 w-24 sm:h-40 sm:w-40", sigla: "text-4xl sm:text-6xl", puntaje: "text-5xl sm:text-8xl", bloque: "h-40 sm:h-72", num: "text-7xl sm:text-9xl" },
  { escudo: "h-16 w-16 sm:h-28 sm:w-28", sigla: "text-2xl sm:text-4xl", puntaje: "text-4xl sm:text-6xl", bloque: "h-28 sm:h-52", num: "text-6xl sm:text-8xl" },
  { escudo: "h-14 w-14 sm:h-24 sm:w-24", sigla: "text-xl sm:text-4xl", puntaje: "text-3xl sm:text-5xl", bloque: "h-20 sm:h-40", num: "text-5xl sm:text-7xl" },
];

// Papelitos fijos alrededor del podio (en % del escenario).
const PAPELITOS = [
  [30, 8, -20], [33, 22, 35], [27, 34, 60], [35, 44, -40], [31, 55, 15],
  [66, 9, 25], [63, 24, -30], [70, 36, 50], [61, 46, -15], [68, 57, 70],
  [40, 3, 40], [58, 2, -35], [24, 17, 10], [74, 20, -60],
];

// 🌃 Modo estadio (como el Recreo): mientras se ve el podio, toda la zona de
// contenido de la app va de noche y se cargan las letras del ranking (una sola
// vez). Al salir de la pantalla vuelve todo a la normalidad.
const FONDO = "#070b16";
function useModoEstadio() {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!document.getElementById("fuentes-ranking-thames")) {
      const l = document.createElement("link");
      l.id = "fuentes-ranking-thames";
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap";
      document.head.appendChild(l);
    }
    if (!document.getElementById("estilo-ranking-thames")) {
      const s = document.createElement("style");
      s.id = "estilo-ranking-thames";
      s.textContent = `html.thames-estadio main{background-color:${FONDO};color-scheme:dark}`;
      document.head.appendChild(s);
    }
    const raiz = document.documentElement;
    raiz.classList.add("thames-estadio");
    return () => raiz.classList.remove("thames-estadio");
  }, []);
}

// 🎉 Papelitos: si canvas-confetti no está, no rompe.
async function tirarPapelitos(colores) {
  try {
    const mod = await import("canvas-confetti");
    const confetti = mod.default || mod;
    confetti({ particleCount: 130, spread: 85, startVelocity: 42, origin: { y: 0.32 }, colors: colores, disableForReducedMotion: true });
  } catch {
    /* sin papelitos */
  }
}

function Escudo({ oficina, color, clase, claseSigla, borde, brillo }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${clase}`}
      style={{ background: color.fuerte, border: borde ? `6px solid ${borde}` : "none", boxShadow: brillo || "none" }}
    >
      <span className={claseSigla} style={F_DISPLAY}>
        {siglaOficina(oficina.nombre)}
      </span>
    </div>
  );
}

export default function RankingOficinas({ onCambiarVista }) {
  useModoEstadio();
  const reducir = useReducedMotion();
  const { user } = useAuth();
  const esAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser;
  const miOficina = esAdmin ? null : user?.perfil?.oficina?.id ?? user?.perfil?.oficina ?? null;

  const hoyMes = mesActual();
  const mesAnterior = moverMes(hoyMes, -1);
  const [mes, setMes] = useState(hoyMes);
  const resumen = useNuevasMes(mes);
  const serie = useNuevasSerie({ desde: moverMes(hoyMes, -11), hasta: hoyMes });
  const r = resumen.data && !resumen.desactualizado ? resumen.data : null;

  const orden = useMemo(() => ordenarPorMetrica(r?.oficinas, "nuevas"), [r]);
  const valorLider = orden.length ? Number(orden[0].nuevas || 0) : 0;
  const colorDe = (id) => colorOficina(r?.oficinas || serie.data?.oficinas, id);

  // 🎉 Papelitos al abrir el mes, y si alguien pasa al frente (en vivo).
  const liderRef = useRef({ mes: null, id: null });
  const idLider = valorLider > 0 ? orden[0].id : null;
  useEffect(() => {
    if (!r || idLider === null) return;
    const antes = liderRef.current;
    liderRef.current = { mes: r.mes, id: idLider };
    const colores = [ORO, colorDe(idLider).base, "#f8fafc"];
    if (antes.mes !== r.mes) {
      if (!reducir) {
        const t = setTimeout(() => tirarPapelitos(colores), 900);
        return () => clearTimeout(t);
      }
    } else if (antes.id !== null && antes.id !== idLider) {
      toast.success(`¡${orden[0].nombre} pasó al frente!`, { icon: "🏆" });
      if (!reducir) tirarPapelitos(colores);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.mes, idLider, reducir]);

  const enCurso = !!r?.en_curso;
  const diasQueFaltan = r ? dayjs(r.fin_de_mes).diff(dayjs(r.hoy), "day") : 0;
  const reloj = !r
    ? { grande: "", chico: "" }
    : enCurso
      ? diasQueFaltan > 0
        ? { grande: `${diasQueFaltan} ${diasQueFaltan === 1 ? "DÍA" : "DÍAS"}`, chico: `PARA CERRAR ${nombreMesSolo(r.mes).toUpperCase()}` }
        : { grande: "HOY", chico: `CIERRA ${nombreMesSolo(r.mes).toUpperCase()}` }
      : { grande: "FINAL", chico: `${nombreMesSolo(r.mes).toUpperCase()} YA CERRÓ` };

  // Podio: 2º - 1º - 3º (vacíos si hay menos de 3 oficinas).
  const podio = [1, 0, 2].map((i) => ({ i, o: orden[i] || null }));
  const resto = orden.slice(3);
  const tercero = orden[2] ? Number(orden[2].nuevas || 0) : 0;

  const mejor = useMemo(() => (r && !r.en_curso ? mejorDelMes(r) : null), [r]);

  // Campeones: últimos 6 meses (el actual, "en juego") y títulos del año.
  const campeones = useMemo(() => {
    const puntos = serie.data?.puntos || [];
    const ofis = serie.data?.oficinas || [];
    const ultimos = puntos.slice(-6).map((p) => {
      const g = ofis.find((o) => o.id === p.ganadora);
      const v = g ? p.por_oficina?.[String(g.id)]?.nuevas : null;
      return { periodo: p.periodo, enCurso: p.en_curso, ganadora: g || null, valor: v };
    });
    const anio = hoyMes.slice(0, 4);
    const titulos = {};
    for (const p of puntos) {
      if (p.en_curso || !p.periodo.startsWith(anio) || p.ganadora === null) continue;
      titulos[p.ganadora] = (titulos[p.ganadora] || 0) + 1;
    }
    const listaTitulos = Object.entries(titulos)
      .map(([id, n]) => ({ oficina: ofis.find((o) => String(o.id) === id), n }))
      .filter((x) => x.oficina)
      .sort((a, b) => b.n - a.n);
    return { ultimos, titulos: listaTitulos, anio };
  }, [serie.data, hoyMes]);

  const hoyLista = useMemo(
    () =>
      (r?.en_curso ? ordenarPorMetrica(r.oficinas, "nuevas") : [])
        .map((o) => ({ o, n: Number(o.hoy?.nuevas || 0) }))
        .sort((a, b) => b.n - a.n),
    [r]
  );

  const verMes = (m) => {
    if (m && m <= hoyMes) setMes(m);
  };

  const esMia = (o) => miOficina !== null && o && String(o.id) === String(miOficina);

  return (
    <div className="relative overflow-hidden text-slate-200" style={{ ...F_TEXTO, backgroundColor: FONDO }}>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        {/* ── Encabezado ── */}
        <header className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold tracking-[0.34em] text-[#fbbf24] sm:text-[18px]" style={F_COND}>
              JUEGOS THAMES
            </span>
            <h1 className="text-[72px] leading-[0.88] tracking-[0.02em] text-slate-50 sm:text-[112px]" style={F_DISPLAY}>
              RANKING
            </h1>
            <div role="group" aria-label="Qué ranking ver" className="mt-2 flex gap-2">
              <button
                type="button"
                aria-pressed="true"
                className="min-h-[44px] rounded-full border border-slate-50 bg-slate-50 px-5 text-[15px] font-bold tracking-[0.16em] text-[#0b1120]"
                style={F_COND}
              >
                OFICINAS
              </button>
              <button
                type="button"
                aria-pressed="false"
                onClick={() => onCambiarVista?.("equipo")}
                className="min-h-[44px] rounded-full border border-slate-700 px-5 text-[15px] font-bold tracking-[0.16em] text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-200"
                style={F_COND}
              >
                EQUIPO
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <div role="group" aria-label="Mes" className="flex gap-1.5 rounded-2xl border border-slate-800 bg-[#0e1628] p-1.5">
              {[
                { m: hoyMes, estado: "EN JUEGO" },
                { m: mesAnterior, estado: "FINAL" },
              ].map(({ m, estado }) => {
                const activo = mes === m;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => verMes(m)}
                    className={`flex min-h-[56px] flex-1 flex-col items-center justify-center rounded-xl px-5 transition-colors lg:flex-none lg:items-start ${
                      activo ? "bg-[#fbbf24] text-[#111827]" : "text-slate-300 hover:bg-white/5"
                    }`}
                    style={F_COND}
                  >
                    <span className="text-[18px] font-bold tracking-[0.1em]">{nombreMesSolo(m).toUpperCase()}</span>
                    <span className="text-[11px] font-bold tracking-[0.24em] opacity-85">{estado}</span>
                  </button>
                );
              })}
            </div>
            {mes !== hoyMes && mes !== mesAnterior && (
              <button
                type="button"
                onClick={() => setMes(hoyMes)}
                className="self-start text-[13px] font-semibold text-sky-300 underline lg:self-end"
              >
                Viendo {nombreMes(mes)} · volver al mes actual
              </button>
            )}
            {r && (
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 whitespace-nowrap text-[40px] leading-none text-slate-50 sm:text-[48px]" style={F_DISPLAY}>
                  {reloj.grande}
                </span>
                <span className="text-[14px] font-semibold tracking-[0.18em] text-slate-400 sm:text-[16px]" style={F_COND}>
                  {reloj.chico}
                </span>
              </div>
            )}
          </div>
        </header>

        {r && (
          <p className="relative z-10 text-[13px] font-semibold tracking-[0.2em] text-slate-500 sm:text-[16px]" style={F_COND}>
            {enCurso
              ? `PÓLIZAS NUEVAS DEL 1 AL ${dayjs(r.hasta).date()} DE ${nombreMesSolo(r.mes).toUpperCase()} · SIN RENOVACIONES`
              : `PÓLIZAS NUEVAS DE ${nombreMesSolo(r.mes).toUpperCase()} · SIN RENOVACIONES`}
          </p>
        )}

        {resumen.error && !resumen.data && (
          <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-5 py-4 text-[15px] text-rose-200">
            {resumen.error}{" "}
            <button type="button" onClick={() => resumen.recargar()} className="font-semibold underline">
              Reintentar
            </button>
          </div>
        )}

        {!r && !resumen.error && (
          <div className="flex h-[420px] items-center justify-center text-[15px] tracking-[0.2em] text-slate-500" style={F_COND}>
            CARGANDO EL PODIO…
          </div>
        )}

        {r && (
          <>
            {/* ── Podio ── */}
            <section aria-label="Podio" className="relative flex min-h-[380px] items-end justify-center pt-6 sm:min-h-[640px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[-40px] h-[115%] w-[92%] -translate-x-1/2 bg-white/[0.045]"
                style={{ clipPath: "polygon(43% 0, 57% 0, 84% 100%, 16% 100%)" }}
              />
              {valorLider > 0 &&
                PAPELITOS.map(([x, y, rot], k) => (
                  <span
                    key={k}
                    aria-hidden="true"
                    className="pointer-events-none absolute hidden h-3.5 w-2 rounded-[2px] sm:block"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `rotate(${rot}deg)`,
                      background: [ORO, colorDe(orden[0].id).base, "#f8fafc", "#38bdf8", "#34d399"][k % 5],
                      opacity: k % 3 === 0 ? 0.95 : 0.7,
                    }}
                  />
                ))}

              <div className="relative z-10 flex w-full items-end justify-center gap-2 sm:gap-5">
                {podio.map(({ i, o }) => {
                  const forma = FORMA[i];
                  const color = o ? colorDe(o.id) : null;
                  const demora = reducir ? 0 : [0.45, 0.2, 0.05][i];
                  return (
                    <div key={`${r.mes}-${i}`} className="flex w-[32%] max-w-[290px] flex-col items-center gap-2 sm:gap-3">
                      {i === 0 && o && valorLider > 0 && (
                        <MotionDiv
                          initial={reducir ? false : { opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: demora + 0.35 }}
                          className="flex flex-col items-center gap-1 text-[#fbbf24]"
                        >
                          <svg width="54" height="40" viewBox="0 0 27 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 17h21M4 17L2.5 5l6 5 5-8 5 8 6-5L23 17" />
                          </svg>
                          <span className="text-center text-[11px] font-bold tracking-[0.26em] sm:text-[15px]" style={F_COND}>
                            {enCurso ? "VA PRIMERA" : `CAMPEÓN DE ${nombreMesSolo(r.mes).toUpperCase()}`}
                          </span>
                        </MotionDiv>
                      )}
                      {o ? (
                        <>
                          <MotionDiv
                            initial={reducir ? false : { opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: demora + 0.25, type: "spring", stiffness: 160, damping: 14 }}
                          >
                            <Escudo
                              oficina={o}
                              color={color}
                              clase={forma.escudo}
                              claseSigla={forma.sigla}
                              borde={MEDALLA[i]}
                              brillo={BRILLO[i]}
                            />
                          </MotionDiv>
                          <span className="text-center text-[14px] font-bold uppercase tracking-[0.06em] text-slate-50 sm:text-[26px]" style={F_COND}>
                            {o.nombre}
                          </span>
                          {esMia(o) && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] text-slate-200 sm:text-[12px]" style={F_COND}>
                              TU OFICINA
                            </span>
                          )}
                          <div className="flex items-baseline gap-2">
                            <span className={`leading-none ${forma.puntaje}`} style={{ ...F_DISPLAY, color: MEDALLA[i] }}>
                              {o.nuevas}
                            </span>
                            <span className="hidden text-[15px] font-semibold tracking-[0.16em] text-slate-400 sm:inline" style={F_COND}>
                              PÓLIZAS
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-[14px] tracking-[0.2em] text-slate-600" style={F_COND}>
                          —
                        </span>
                      )}
                      <MotionDiv
                        initial={reducir ? false : { scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: demora, type: "spring", stiffness: 120, damping: 17 }}
                        style={{ originY: 1, borderTopColor: MEDALLA[i] }}
                        className={`flex w-full flex-col items-center gap-1 rounded-t-xl border border-b-0 border-t-[6px] border-[#1c2944] bg-[#111a2f] pt-3 sm:pt-4 ${forma.bloque}`}
                      >
                        <span className={`leading-none ${forma.num}`} style={{ ...F_DISPLAY, color: MEDALLA[i] }}>
                          {i + 1}
                        </span>
                        <span className="hidden text-[14px] font-bold tracking-[0.3em] text-slate-500 sm:block" style={F_COND}>
                          {PUESTO_TXT[i]}
                        </span>
                      </MotionDiv>
                    </div>
                  );
                })}
              </div>
              <div aria-hidden="true" className="absolute bottom-[-14px] left-1/2 h-[14px] w-[98%] max-w-[1010px] -translate-x-1/2 rounded-b-xl border-t-2 border-[#22304f] bg-[#0d1528]" />
            </section>

            {valorLider === 0 && (
              <p className="text-center text-[15px] tracking-[0.12em] text-slate-400" style={F_COND}>
                TODAVÍA NO HAY PÓLIZAS NUEVAS ESTE MES · ¡LA PRIMERA ARRANCA LA CARRERA!
              </p>
            )}

            {/* ── Fuera del podio ── */}
            {resto.length > 0 && (
              <section aria-label="Fuera del podio" className="mt-4 flex flex-col gap-3">
                {resto.map((o, k) => {
                  const color = colorDe(o.id);
                  const puesto = k + 4;
                  const falta = tercero - Number(o.nuevas || 0);
                  return (
                    <div key={o.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#0e1628] px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="text-[32px] leading-none text-slate-600 sm:text-[44px]" style={F_DISPLAY}>
                          {puesto}º
                        </span>
                        <Escudo oficina={o} color={color} clase="h-11 w-11 sm:h-14 sm:w-14" claseSigla="text-lg sm:text-2xl" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[18px] font-bold uppercase tracking-[0.06em] text-slate-50 sm:text-[22px]" style={F_COND}>
                            {o.nombre}
                            {esMia(o) ? <span className="ml-2 text-[11px] tracking-[0.2em] text-slate-300">· TU OFICINA</span> : null}
                          </span>
                          <span className="text-[13px] text-slate-400">
                            {enCurso ? `Le faltan ${falta + 1} para el podio` : `Quedó a ${falta} del podio`}
                          </span>
                        </div>
                        <span className="ml-auto text-[32px] leading-none text-slate-100 sm:hidden" style={F_DISPLAY}>
                          {o.nuevas}
                        </span>
                      </div>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#1a2440]">
                        <div className="h-3 rounded-full" style={{ width: `${tercero ? Math.min(100, Math.round((o.nuevas * 100) / tercero)) : 0}%`, background: color.base }} />
                      </div>
                      <span className="hidden text-[44px] leading-none text-slate-100 sm:block" style={F_DISPLAY}>
                        {o.nuevas}
                      </span>
                    </div>
                  );
                })}
              </section>
            )}

            {/* ── Tarjetas de abajo ── */}
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="flex flex-col gap-3.5 rounded-2xl border border-slate-800 bg-[#0e1628] p-5">
                <h2 className="text-[18px] font-bold tracking-[0.24em] text-[#fbbf24]" style={F_COND}>
                  LA CARRERA
                </h2>
                {orden.map((o, k) => {
                  const color = colorDe(o.id);
                  const dif = valorLider - Number(o.nuevas || 0);
                  return (
                    <div key={o.id} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold text-slate-100">{o.nombre}</span>
                        <span className="shrink-0 text-[13px] text-slate-400">
                          <strong className="text-[20px] font-normal text-slate-50" style={F_DISPLAY}>
                            {o.nuevas}
                          </strong>{" "}
                          · {k === 0 && valorLider > 0 ? "lidera" : dif > 0 ? `a ${dif} del primero` : "empatada"}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[#1a2440]">
                        <div className="h-3 rounded-full" style={{ width: `${valorLider ? Math.max(3, Math.round((o.nuevas * 100) / valorLider)) : 0}%`, background: color.base }} />
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#0e1628] p-5">
                {enCurso ? (
                  <>
                    <h2 className="text-[18px] font-bold tracking-[0.24em] text-[#fbbf24]" style={F_COND}>
                      HOY
                    </h2>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[56px] leading-none text-slate-50" style={F_DISPLAY}>
                        {r.totales?.hoy?.nuevas ?? 0}
                      </span>
                      <span className="text-[15px] text-slate-400">{r.totales?.hoy?.nuevas === 1 ? "póliza nueva hoy" : "pólizas nuevas hoy"}</span>
                    </div>
                    {hoyLista.map(({ o, n }) => (
                      <div key={o.id} className="flex items-center gap-2.5 border-t border-[#1a2440] py-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorDe(o.id).base }} />
                        <span className="flex-1 truncate text-[15px] font-semibold text-slate-200">{o.nombre}</span>
                        <span className="text-[15px] text-slate-300">{n || "—"}</span>
                      </div>
                    ))}
                    <span className="text-[13px] text-slate-400">
                      {r.ultima
                        ? `Última: ${r.ultima.oficina}, ${dayjs(r.ultima.creado_en).isSame(dayjs(r.hoy), "day") ? hora(r.ultima.creado_en) : dayjs(r.ultima.creado_en).format("DD/MM HH:mm")}${r.ultima.vehiculo ? ` · ${r.ultima.vehiculo}` : ""}`
                        : "Todavía ninguna este mes."}
                    </span>
                  </>
                ) : (
                  <>
                    <h2 className="text-[18px] font-bold tracking-[0.24em] text-[#fbbf24]" style={F_COND}>
                      LO MEJOR DE {nombreMesSolo(r.mes).toUpperCase()}
                    </h2>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[56px] leading-none text-slate-50" style={F_DISPLAY}>
                        {valorLider}
                      </span>
                      <span className="text-[15px] text-slate-400">{orden[0] && valorLider ? `${orden[0].nombre}, campeón` : "sin pólizas nuevas"}</span>
                    </div>
                    {[
                      { t: "Mejor día", v: mejor?.mejorDia ? `${mejor.mejorDia.fecha} · ${mejor.mejorDia.total}` : "—", c: ORO },
                      { t: "Racha más larga", v: mejor?.racha ? `${mejor.racha.oficina.nombre} · ${mejor.racha.dias} días` : "—", c: mejor?.racha ? colorDe(mejor.racha.oficina.id).base : "#475569" },
                      { t: "Más clientes nuevos", v: mejor?.masClientes ? `${mejor.masClientes.nombre} · ${mejor.masClientes.clientes_nuevos}` : "—", c: mejor?.masClientes ? colorDe(mejor.masClientes.id).base : "#475569" },
                      { t: "Más pagaron la 1ª", v: mejor?.masPagaron ? `${mejor.masPagaron.nombre} · ${mejor.masPagaron.pagaron}` : "—", c: mejor?.masPagaron ? colorDe(mejor.masPagaron.id).base : "#475569" },
                    ].map((x) => (
                      <div key={x.t} className="flex items-center gap-2.5 border-t border-[#1a2440] py-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.c }} />
                        <span className="flex-1 text-[15px] font-semibold text-slate-200">{x.t}</span>
                        <span className="text-right text-[14px] text-slate-300">{x.v}</span>
                      </div>
                    ))}
                  </>
                )}
              </section>

              <section className="flex flex-col gap-3.5 rounded-2xl border border-slate-800 bg-[#0e1628] p-5">
                <h2 className="text-[18px] font-bold tracking-[0.24em] text-[#fbbf24]" style={F_COND}>
                  CAMPEONES DEL MES
                </h2>
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {campeones.ultimos.map((c) => {
                    const activo = c.periodo === mes;
                    const color = c.ganadora ? colorDe(c.ganadora.id) : null;
                    return (
                      <button
                        key={c.periodo}
                        type="button"
                        onClick={() => verMes(c.periodo)}
                        aria-label={`Ver ${nombreMes(c.periodo)}`}
                        className={`flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-2.5 transition-colors ${
                          activo ? "border-2 border-[#fbbf24] bg-[#1f1605]" : "border border-slate-800 bg-[#0b1222] hover:border-slate-600"
                        }`}
                      >
                        <span className="text-[12px] font-bold tracking-[0.12em] text-slate-400 sm:text-[13px]" style={F_COND}>
                          {nombreMesSolo(c.periodo).slice(0, 3).toUpperCase()}
                        </span>
                        {c.enCurso || !c.ganadora ? (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-600 text-[15px] text-slate-400 sm:h-10 sm:w-10" style={F_DISPLAY}>
                            ?
                          </span>
                        ) : (
                          <Escudo oficina={c.ganadora} color={color} clase="h-9 w-9 sm:h-10 sm:w-10" claseSigla="text-[13px] sm:text-[15px]" />
                        )}
                        <span className="text-center text-[11px] font-semibold leading-tight text-slate-300 sm:text-[12px]">
                          {c.enCurso ? "en juego" : c.valor ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[14px] text-slate-300">
                  <strong className="text-[#fbbf24]">Títulos {campeones.anio}:</strong>{" "}
                  {campeones.titulos.length
                    ? campeones.titulos.map((t) => `${t.oficina.nombre} ${t.n}`).join(" · ")
                    : "todavía ninguno"}
                </p>
              </section>
            </div>

            <p className="text-[13px] text-slate-500">
              Cuenta las pólizas nuevas cargadas en THAMES (sin renovaciones). El podio se mueve solo, en vivo. Empate: gana la que llegó
              primero a ese número.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
