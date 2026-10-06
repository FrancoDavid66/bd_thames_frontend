// src/components/legales/abogado/abogadoUtils.js
//
// 🧰 Ayudas de la APP DEL ABOGADO (05/10): los 10 colores de las listas propias,
// cómo se dice cada fecha ("Hoy", "Mañana", "vie 09/10"), qué ícono lleva cada
// tipo de fecha y cómo se ordena lo que viene. Lo general de Legales sigue en
// ../legalesUtils.js y la letra y los tonos, en los de la app de la gestora.
import { diaCorto, diasHasta, esDemorado, fechaLocal, hoyYmd, norm } from "../legalesUtils";

import { TONO_CAJA, foco } from "../../gestoria/gestora/gestoraUtils";

export { LETRA, MONO, foco, fuerte, suave, TONO_CAJA, TONO_TEXTO } from "../../gestoria/gestora/gestoraUtils";

// Clases que se repiten en la app del abogado.
const ROJO_CAJA = "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo dark:text-red-400";
/** Fondo suave + texto del tono (ambar · azul · violeta · verde · rojo · neutro). */
export const cajaDeTono = (tono) => (tono === "rojo" ? ROJO_CAJA : TONO_CAJA[tono] || TONO_CAJA.neutro);
export const inputCls =
  "w-full min-h-[48px] rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3 text-[16px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-duo-violeta disabled:opacity-60";
export const linkCls = `inline-flex min-h-[36px] items-center gap-1 rounded-lg px-1.5 text-[13.5px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco}`;

// Los colores que puede tener un estado, una instancia o una etiqueta.
// caja = fondo suave + texto (la etiqueta) · punto = el circulito lleno.
export const COLORES = {
  gris: { nombre: "Gris", caja: "bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200", punto: "bg-slate-400" },
  arena: { nombre: "Arena", caja: "bg-stone-200 dark:bg-stone-600/40 text-stone-700 dark:text-stone-200", punto: "bg-stone-400" },
  naranja: { nombre: "Naranja", caja: "bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300", punto: "bg-orange-500" },
  ambar: { nombre: "Ámbar", caja: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300", punto: "bg-amber-500" },
  verde: { nombre: "Verde", caja: "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300", punto: "bg-green-600" },
  turquesa: { nombre: "Turquesa", caja: "bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300", punto: "bg-teal-500" },
  azul: { nombre: "Azul", caja: "bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300", punto: "bg-sky-500" },
  violeta: { nombre: "Violeta", caja: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta-sombra dark:text-[#a5a0ff]", punto: "bg-duo-violeta" },
  rosa: { nombre: "Rosa", caja: "bg-pink-100 dark:bg-pink-500/20 text-pink-800 dark:text-pink-300", punto: "bg-pink-500" },
  rojo: { nombre: "Rojo", caja: "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300", punto: "bg-red-500" },
};
export const colorDe = (c) => COLORES[c] || COLORES.gris;

// Cada tipo de fecha: su nombre y su tono (los mismos tonos de THAMES).
export const TIPOS_FECHA = {
  PLAZO: { nombre: "Plazo", tono: "ambar" },
  AUDIENCIA: { nombre: "Audiencia", tono: "violeta" },
  PERICIA: { nombre: "Pericia", tono: "azul" },
  REUNION: { nombre: "Reunión", tono: "verde" },
};
export const tipoFecha = (t) => TIPOS_FECHA[t] || { nombre: "", tono: "neutro" };

/** "Hoy" · "Mañana" · "Ayer" · "vie 09/10" */
export function cuando(ymd) {
  const d = diasHasta(ymd);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  return diaCorto(ymd);
}

/** Lo que va a la derecha de cada fecha: "09:30" si es hoy con hora, "Hoy", "Ayer", "vie 09/10". */
export function horaODia(f) {
  if (diasHasta(f.fecha) === 0 && f.hora) return f.hora;
  return cuando(f.fecha);
}

/** "Venció ayer" · "Vence hoy" · "Vence mañana" · "Vence el vie 09/10" (+ la hora si tiene). */
export function venceTxt(f) {
  const d = diasHasta(f.fecha);
  const hora = f.hora ? ` · ${f.hora}` : "";
  if (d < 0) return `Venció ${d === -1 ? "ayer" : `el ${diaCorto(f.fecha)}`}`;
  if (d === 0) return `Hoy${hora}`;
  if (d === 1) return `Mañana${hora}`;
  return `${cap(diaCorto(f.fecha))}${hora}`;
}

export const cap = (t = "") => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

/** Tono de una fecha pendiente: vencida = rojo · hoy o mañana = ámbar · después = neutro. */
export function tonoDeFecha(f) {
  if (f.cumplido) return "neutro";
  const d = diasHasta(f.fecha);
  if (d < 0) return "rojo";
  if (d <= 1) return "ambar";
  return "neutro";
}

/** "GÓMEZ, María c/ PROVINCIA ART s/ Accidente" → "GÓMEZ, María c/ PROVINCIA ART" (para las listas). */
export function caratulaCorta(e) {
  const c = String(e?.caratula || e?.persona_nombre || e?.numero || "").trim();
  return c.split(/\s+s\/\s+/i)[0] || c;
}

/** El estado como lo nombra el abogado: su estado propio o, si no tiene, la etapa. */
export function estadoDe(e) {
  if (e?.estado_propio) return e.estado_propio;
  return { id: null, nombre: e?.estado_nombre || "", color: "gris" };
}

/** Primero lo que vence antes; sin fecha, los que hace más que no se mueven. */
export function porLoQueViene(a, b) {
  const fa = a.proxima_fecha ? `${a.proxima_fecha.fecha}${a.proxima_fecha.hora || "99"}` : "9999";
  const fb = b.proxima_fecha ? `${b.proxima_fecha.fecha}${b.proxima_fecha.hora || "99"}` : "9999";
  if (fa !== fb) return fa.localeCompare(fb);
  return String(a.ultima_novedad || "").localeCompare(String(b.ultima_novedad || ""));
}

/** ¿El caso coincide con lo que se busca? (carátula, cliente, DNI, número, juzgado, expediente o contraparte) */
export function coincideCaso(e, q) {
  const palabras = norm(q).split(/\s+/).filter(Boolean);
  if (!palabras.length) return true;
  const base = norm([e.caratula, e.persona_nombre, e.persona_dni, e.numero, e.juzgado, e.expediente_judicial, e.contraparte, e.tema_nombre].join(" "));
  return palabras.every((w) => base.includes(w));
}

export const esQuieto = (e) => esDemorado(e) && !e.proxima_fecha;

/** Saludo según la hora: "Buen día" · "Buenas tardes" · "Buenas noches". */
export function saludoHora(ahora = new Date()) {
  const h = ahora.getHours();
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const dos = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

/** El mes de una fecha: { desde: "2026-10-01", hasta: "2026-10-31", dias: 31, primerDia: 3 (0 = lunes) }. */
export function mesDe(clave = hoyYmd().slice(0, 7)) {
  const [a, m] = clave.split("-").map(Number);
  const primero = new Date(a, m - 1, 1);
  const dias = new Date(a, m, 0).getDate();
  return { clave, anio: a, mes: m, desde: `${clave}-01`, hasta: `${clave}-${dos(dias)}`, dias, primerDia: (primero.getDay() + 6) % 7 };
}

export function moverMes(clave, n) {
  const [a, m] = clave.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const nombreMes = (clave) => {
  const [a, m] = clave.split("-").map(Number);
  return `${cap(MESES[m - 1])} ${a}`;
};
/** "2026-10-05" → "Lunes 5 de octubre" */
export function diaCompleto(fecha) {
  const f = fechaLocal(fecha);
  return `${cap(DIAS[f.getDay()])} ${f.getDate()} de ${MESES[f.getMonth()]}`;
}
export const esFinde = (fecha) => [0, 6].includes(fechaLocal(fecha).getDay());

/** "Dr. Martín Sosa" → "Martín Sosa" (para el saludo) e iniciales "MS". */
export const sinTitulo = (nombre = "") => String(nombre).replace(/^dra?\.?\s+/i, "").trim();

/** Junta fechas y turnos en una sola lista ordenada (para "Lo que viene" y el día de la agenda). */
export function juntarAgenda(fechas = [], turnos = []) {
  const items = [
    ...fechas.map((f) => ({ clase: "fecha", id: `f${f.id}`, dia: f.fecha, hora: f.hora || "", f })),
    ...turnos.map((t) => ({ clase: "turno", id: `t${t.id}`, dia: t.fecha, hora: t.hora || "", t })),
  ];
  return items.sort((a, b) => `${a.dia}${a.hora || "99"}`.localeCompare(`${b.dia}${b.hora || "99"}`));
}
