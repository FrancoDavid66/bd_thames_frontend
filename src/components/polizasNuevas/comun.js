// src/components/polizasNuevas/comun.js
// ============================================================
// 🧰 Lo que comparten Estadísticas → "Pólizas nuevas", el cartel del Inicio
// y el RANKING de oficinas: colores de cada oficina, siglas, orden del
// ranking (con desempate), nombres de meses, semanas y "lo mejor del mes".
//
// RANKING = crecimiento neto: autos que ENTRARON − autos que SE FUERON
// (vencida sin pagar, cancelada/de baja, terminó y no renovó; vendió el auto
// también cuenta). Ejemplo: Axión entraron 100, se fueron 150 → −50.
// Una renovación o una póliza repetida del mismo auto no suma a "entraron";
// si el auto vuelve antes de 30 días, es como si nunca se hubiera ido.
// Empate → mejor retención → más entraron → la que llegó primero → la que
// más autos tenía el 1º. (Lo calcula el servidor: estadisticas/polizas_nuevas.py.)
// ============================================================
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

// menosEsMejor: si baja es bueno (se fueron) · conSigno: se muestra +38 / −50 (neto).
export const METRICAS = [
  { id: "nuevas", label: "Pólizas nuevas", unidad: "pólizas nuevas", corta: "nuevas" },
  { id: "clientes_nuevos", label: "Clientes nuevos", unidad: "clientes nuevos", corta: "clientes nuevos" },
  { id: "pagaron", label: "Pagaron la 1ª cuota", unidad: "pagaron la 1ª cuota", corta: "pagaron la 1ª" },
  { id: "se_fueron", label: "Se fueron", unidad: "se fueron", corta: "se fueron", menosEsMejor: true },
  { id: "neto", label: "Crecimiento neto", unidad: "neto (entraron − se fueron)", corta: "neto", conSigno: true },
];
export const metricaPorId = (id) => METRICAS.find((m) => m.id === id) || METRICAS[0];

/** 38 → "+38" · −50 → "−50" (con el signo menos de verdad) · 0 → "0". */
export function conSigno(n) {
  const v = Number(n || 0);
  return v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0";
}

/** El número como se muestra según la cuenta (el neto lleva signo). */
export const valorMetrica = (met, v) => (met?.conSigno ? conSigno(v) : String(Number(v || 0)));

/** Retención: 97.5 → "97%" (para abajo: si se fue alguien nunca muestra 100%). Sin cartera → "—". */
export const formatoRetencion = (r) => (r === null || r === undefined ? "—" : `${Math.floor(Number(r))}%`);

// 🚪 Por qué se fueron (el servidor manda también "motivos_texto").
export const MOTIVOS = {
  no_pago: "No pagó",
  no_renovo: "No renovó",
  otra_compania: "Se fue a otra compañía",
  vendio: "Vendió el auto",
  sin_uso: "No usa el auto",
  otro: "Otro motivo",
};
const MOTIVO_CUANTOS = {
  no_pago: ["no pagó", "no pagaron"],
  no_renovo: ["no renovó", "no renovaron"],
  otra_compania: ["se fue a otra compañía", "se fueron a otra compañía"],
  vendio: ["vendió el auto", "vendieron el auto"],
  sin_uso: ["no usa el auto", "no usan el auto"],
  otro: ["otro motivo", "otros motivos"],
};
export const textoMotivo = (clave) => MOTIVOS[clave] || MOTIVOS.otro;

/** {no_pago: 3, vendio: 1} → "3 no pagaron · 1 vendió el auto" (el más común primero). */
export function resumenMotivos(motivos) {
  return Object.entries(motivos || {})
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => {
      const [uno, varios] = MOTIVO_CUANTOS[k] || MOTIVO_CUANTOS.otro;
      return `${n} ${Number(n) === 1 ? uno : varios}`;
    })
    .join(" · ");
}

// 🎨 Un color fijo por oficina (el mismo en Estadísticas, Inicio y Ranking).
//    base = barras · fuerte = rellenos con texto blanco · texto = letras sobre
//    fondo claro · claro = letras sobre fondo oscuro.
const PALETA = [
  { base: "#0ea5e9", fuerte: "#0284c7", texto: "#0369a1", claro: "#7dd3fc" }, // celeste
  { base: "#10b981", fuerte: "#059669", texto: "#047857", claro: "#6ee7b7" }, // verde
  { base: "#6366f1", fuerte: "#4f46e5", texto: "#4338ca", claro: "#a5b4fc" }, // índigo
  { base: "#f59e0b", fuerte: "#d97706", texto: "#b45309", claro: "#fcd34d" }, // ámbar
  { base: "#f43f5e", fuerte: "#e11d48", texto: "#be123c", claro: "#fda4af" }, // rosa
  { base: "#8b5cf6", fuerte: "#7c3aed", texto: "#6d28d9", claro: "#c4b5fd" }, // violeta
  { base: "#14b8a6", fuerte: "#0d9488", texto: "#0f766e", claro: "#5eead4" }, // turquesa
];
const GRIS = { base: "#94a3b8", fuerte: "#64748b", texto: "#475569", claro: "#cbd5e1" };

const tieneId = (o) => o && o.id !== null && o.id !== undefined;

/** Color de una oficina: las activas por id en orden; las dadas de baja, después. */
export function colorOficina(oficinas, id) {
  if (id === null || id === undefined) return GRIS;
  const lista = (oficinas || []).filter(tieneId);
  const orden = [
    ...lista.filter((o) => o.activa !== false).map((o) => o.id).sort((a, b) => a - b),
    ...lista.filter((o) => o.activa === false).map((o) => o.id).sort((a, b) => a - b),
  ];
  const i = orden.indexOf(id);
  return i < 0 ? GRIS : PALETA[i % PALETA.length];
}

/** Variables CSS para letras del color de la oficina (claro/oscuro): usar con
 *  className="text-[color:var(--of-txt)] dark:text-[color:var(--of-claro)]". */
export const varsColor = (c) => ({ "--of-txt": c.texto, "--of-claro": c.claro, "--of-base": c.base });

/** "5 Esquinas" → "5E" · "Axión" → "AX" · "Km 39" → "39" · "El Talita" → "TA". */
export function siglaOficina(nombre) {
  const limpio = String(nombre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  let palabras = limpio.split(/\s+/).filter(Boolean);
  if (palabras.length > 1 && /^(el|la|los|las)$/i.test(palabras[0])) palabras = palabras.slice(1);
  if (!palabras.length) return "?";
  if (/^\d+$/.test(palabras[0])) return `${palabras[0]}${palabras[1]?.[0] || ""}`.toUpperCase().slice(0, 3);
  const numero = palabras.find((p) => /^\d+$/.test(p));
  if (numero) return numero.slice(0, 3);
  if (palabras.length >= 2) return `${palabras[0][0]}${palabras[1][0]}`.toUpperCase();
  return palabras[0].slice(0, 2).toUpperCase();
}

/** Oficinas de verdad (sin la fila "Sin oficina"), ordenadas por la métrica.
 *  Empate: gana la que llegó primero a ese número (la última póliza que sumó
 *  en ESA cuenta fue antes). El servidor manda "ultimas" por cuenta.
 *  Con "neto" usa el orden del RANKING (ordenarPorNeto). Con "se_fueron",
 *  primero la que más perdió (para ver dónde está el problema). */
export function ordenarPorMetrica(oficinas, metrica = "nuevas") {
  if (metrica === "neto") return ordenarPorNeto(oficinas);
  const lista = (oficinas || []).filter(tieneId).map(conRetencion);
  if (metrica === "se_fueron") {
    // Primero la que más perdió; empate → la de id más bajo (la hora no aplica).
    return lista.sort((a, b) => b.se_fueron - a.se_fueron || Number(a.id) - Number(b.id));
  }
  const hora = (o) => {
    const u = o.ultimas?.[metrica] ?? o.ultima;
    return u ? Date.parse(u) : Infinity;
  };
  return lista.sort((a, b) => {
    const d = Number(b[metrica] || 0) - Number(a[metrica] || 0);
    if (d) return d;
    const ua = hora(a);
    const ub = hora(b);
    if (ua !== ub) return ua - ub;
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
}

/** Completa lo de retención si el servidor todavía no lo manda (backend viejo):
 *  así la pantalla no se rompe mientras se sube la versión nueva. */
export function conRetencion(o) {
  if (!o) return o;
  const entraron = Number(o.entraron ?? o.nuevas ?? 0);
  const seFueron = Number(o.se_fueron ?? 0);
  return {
    ...o,
    entraron,
    se_fueron: seFueron,
    neto: Number(o.neto ?? entraron - seFueron),
    cartera_inicio: Number(o.cartera_inicio ?? 0),
    retencion: o.retencion ?? null,
    recuperables: Number(o.recuperables ?? 0),
    motivos: o.motivos || {},
  };
}

/** RANKING (igual que el servidor, clave_ranking): más crecimiento neto;
 *  empate → mejor retención → más entraron → la que llegó primero (su último
 *  auto que entró, más temprano) → la que más autos tenía el 1º → id más bajo. */
export function ordenarPorNeto(oficinas) {
  const ret = (o) => (o.retencion === null || o.retencion === undefined ? -1 : Number(o.retencion));
  const hora = (o) => (o.ultima_entro ? Date.parse(o.ultima_entro) : Infinity);
  return (oficinas || [])
    .filter(tieneId)
    .map(conRetencion)
    .sort((a, b) => {
      const d = b.neto - a.neto || ret(b) - ret(a) || b.entraron - a.entraron;
      if (d) return d;
      const ua = hora(a);
      const ub = hora(b);
      if (ua !== ub) return ua - ub;
      return b.cartera_inicio - a.cartera_inicio || Number(a.id) - Number(b.id);
    });
}

/** ¿Compite en el ranking este mes? Oficina de verdad, activa (o cerrada pero
 *  con autos que entraron) y con algo en juego: autos el 1º o movimiento. Igual
 *  que el servidor (así una oficina sin nada no queda 1ª con 0 si las demás bajan). */
export function compite(o) {
  if (!tieneId(o)) return false;
  const x = conRetencion(o);
  return (x.activa !== false || x.entraron > 0) && (x.cartera_inicio > 0 || x.entraron + x.se_fueron > 0);
}

/** ¿Hubo algo (entró o se fue un auto) en alguna de estas oficinas? */
export const hayMovimiento = (oficinas) => (oficinas || []).some((o) => o.entraron + o.se_fueron > 0);

/** Para el podio: primero las que compiten (en orden), después las activas
 *  que no tuvieron nada este mes (marcadas sinMovimiento). */
export function rankingOficinas(oficinas) {
  const lista = (oficinas || []).filter(tieneId);
  const quietas = lista
    .filter((o) => !compite(o) && o.activa !== false)
    .map((o) => ({ ...conRetencion(o), sinMovimiento: true }))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  return [...ordenarPorNeto(lista.filter(compite)), ...quietas];
}

/** ▲ 4 / ▼ 2 / = 0 contra el período anterior.
 *  tono: "sube" = mejoró (verde) · "baja" = empeoró (rojo). Con menosEsMejor
 *  (se fueron) es al revés: que suba es malo. */
export function delta(actual, antes, { menosEsMejor = false } = {}) {
  const d = Number(actual || 0) - Number(antes || 0);
  const mejor = menosEsMejor ? d < 0 : d > 0;
  const peor = menosEsMejor ? d > 0 : d < 0;
  return { d, txt: d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : "= 0", tono: mejor ? "sube" : peor ? "baja" : "igual" };
}

const mayus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Hoy en Argentina ("2026-09-26"), aunque la compu tenga otra zona horaria.
 *  Así el mes que se pide es el mismo que usa el servidor. */
export function hoyArgentina() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return dayjs().format("YYYY-MM-DD");
  }
}
export const mesActual = () => hoyArgentina().slice(0, 7);
export const moverMes = (mes, n) => dayjs(`${mes}-01`).add(n, "month").format("YYYY-MM");
export const nombreMes = (mes) => mayus(dayjs(`${mes}-01`).format("MMMM YYYY")); // "Septiembre 2026"
export const nombreMesSolo = (mes) => mayus(dayjs(`${mes}-01`).format("MMMM")); // "Septiembre"
export const mesCorto = (mes) => mayus(dayjs(`${mes}-01`).format("MMM YY")).replace(".", ""); // "Sep 26"
export const fechaLarga = (iso) => mayus(dayjs(iso).format("dddd DD/MM")); // "Sábado 26/09"
export const hora = (iso) => (iso ? dayjs(iso).format("HH:mm") : "");

/** "vs 1–26 ago" (mes en curso) o "vs agosto" (mes cerrado). */
export function etiquetaComparacion(resumen) {
  if (!resumen?.comparacion) return "";
  const { desde, hasta } = resumen.comparacion;
  if (resumen.en_curso) return `vs ${dayjs(desde).format("D")}–${dayjs(hasta).format("D MMM").replace(".", "")}`;
  return `vs ${dayjs(desde).format("MMMM")}`;
}

/** Semanas de lunes a domingo dentro del mes, con lo de cada oficina. */
export function semanasDelMes(resumen, metrica = "nuevas") {
  if (!resumen?.oficinas?.length) return [];
  const ini = dayjs(resumen.desde);
  const fin = dayjs(resumen.fin_de_mes);
  const semanas = [];
  let actual = null;
  for (let d = ini; !d.isAfter(fin, "day"); d = d.add(1, "day")) {
    const lunes = d.subtract((d.day() + 6) % 7, "day").format("YYYY-MM-DD");
    if (!actual || actual.lunes !== lunes) {
      actual = { lunes, desde: d.format("YYYY-MM-DD"), hasta: d.format("YYYY-MM-DD"), porOficina: {}, total: 0, futuro: true };
      semanas.push(actual);
    }
    actual.hasta = d.format("YYYY-MM-DD");
    const i = d.date() - 1;
    for (const o of resumen.oficinas) {
      const v = o.dias?.[metrica]?.[i];
      if (v === null || v === undefined) continue;
      actual.futuro = false;
      const k = o.id === null ? "sin" : String(o.id);
      actual.porOficina[k] = (actual.porOficina[k] || 0) + v;
      actual.total += v;
    }
  }
  return semanas.map((s) => ({
    ...s,
    etiqueta: `${dayjs(s.desde).format("D")}–${dayjs(s.hasta).format("D")}`,
  }));
}

/** Para un mes cerrado: mejor día, racha más larga, más clientes nuevos, más
 *  pagaron y mejor retención. */
export function mejorDelMes(resumen) {
  const ofis = (resumen?.oficinas || []).filter(tieneId);
  if (!ofis.length) return null;
  const n = ofis[0].dias?.nuevas?.length || 0;
  let mejorDia = null;
  for (let i = 0; i < n; i++) {
    const t = ofis.reduce((s, o) => s + Number(o.dias.nuevas[i] || 0), 0);
    if (t > 0 && (!mejorDia || t > mejorDia.total)) mejorDia = { dia: i + 1, total: t };
  }
  // Racha: días seguidos con al menos 1 póliza nueva (los domingos no cortan).
  let racha = null;
  for (const o of ofis) {
    let run = 0;
    let max = 0;
    for (let i = 0; i < n; i++) {
      const fecha = dayjs(resumen.desde).date(i + 1);
      const v = o.dias.nuevas[i];
      if (fecha.day() === 0 && !v) continue;
      run = v ? run + 1 : 0;
      max = Math.max(max, run);
    }
    if (max > 0 && (!racha || max > racha.dias)) racha = { oficina: o, dias: max };
  }
  const top = (m) => ordenarPorMetrica(ofis, m)[0];
  const masClientes = top("clientes_nuevos");
  const masPagaron = top("pagaron");
  // Mejor retención: entre las que tenían autos el 1º (empate: la que más tenía).
  const mejorRetencion =
    ofis
      .filter((o) => compite(o) && o.retencion !== null && o.retencion !== undefined && o.cartera_inicio > 0)
      .sort((a, b) => b.retencion - a.retencion || b.cartera_inicio - a.cartera_inicio)[0] || null;
  return {
    mejorDia: mejorDia ? { ...mejorDia, fecha: dayjs(resumen.desde).date(mejorDia.dia).format("DD/MM") } : null,
    racha,
    masClientes: masClientes && masClientes.clientes_nuevos > 0 ? masClientes : null,
    masPagaron: masPagaron && masPagaron.pagaron > 0 ? masPagaron : null,
    mejorRetencion,
  };
}

/** ¿Está en modo oscuro? (Recharts necesita colores concretos, no clases). */
export function useIsDark() {
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains("dark")));
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** ¿Pantalla angosta (celu)? */
export function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

/** Guardado chiquito por navegador (vista elegida, etc.). Nunca rompe. */
export const leerPref = (clave, porDefecto) => {
  try {
    return localStorage.getItem(clave) || porDefecto;
  } catch {
    return porDefecto;
  }
};
export const guardarPref = (clave, valor) => {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* noop */
  }
};
