// src/components/legales/legalesUtils.js
//
// 🧰 Ayudas de Legales: colores de cada estado, las 5 columnas del tablero,
// "hace N días", el link «Mi caso», etc. Las de fechas, plata y WhatsApp son
// las mismas de Gestoría (se reusan, no se copian).
import { diasDesde, norm } from "../gestoria/gestoriaUtils";

export {
  colorOficina,
  ddmm,
  ddmmhhmm,
  diasDesde,
  fechaCorta,
  fmtPct,
  hhmm,
  iniciales,
  linkMapa,
  linkTel,
  linkWhatsApp,
  linkWhatsAppOElegir,
  norm,
  numeroInternacionalAR,
  plata,
  tamTxt,
  textoDias,
  ymdMas,
} from "../gestoria/gestoriaUtils";

export const DIAS_DEMORADO = 30;
export const ABIERTOS = ["CONSULTA", "ASIGNADO", "EN_TRAMITE", "DEMANDA_PRESENTADA", "EN_JUZGADO", "SENTENCIA", "COBRADO"];
export const PASOS = ABIERTOS;

// Nombre y color de cada estado (el punto de color y la etiqueta de las tarjetas).
export const ESTADOS = {
  CONSULTA: { n: "Consulta", dot: "#64748b" },
  ASIGNADO: { n: "Asignado", dot: "#0284c7" },
  EN_TRAMITE: { n: "En trámite", dot: "#0891b2" },
  DEMANDA_PRESENTADA: { n: "Demanda presentada", dot: "#7c3aed" },
  EN_JUZGADO: { n: "En juzgado", dot: "#4f46e5" },
  SENTENCIA: { n: "Sentencia", dot: "#b45309" },
  COBRADO: { n: "Cobrado", dot: "#16a34a" },
  CERRADO: { n: "Cerrado", dot: "#475569" },
  DESISTIDO: { n: "Desistido", dot: "#94a3b8" },
};

// Las 5 columnas del tablero (varios estados juntos, así entra en la pantalla).
export const FASES = [
  { id: "CONSULTA", n: "Consulta", sub: "Antes de la 1ª charla", estados: ["CONSULTA"], dot: "#64748b" },
  { id: "ABOGADO", n: "Con el abogado", sub: "Asignado · En trámite", estados: ["ASIGNADO", "EN_TRAMITE"], dot: "#0284c7" },
  { id: "JUICIO", n: "En juicio", sub: "Demanda · En juzgado", estados: ["DEMANDA_PRESENTADA", "EN_JUZGADO"], dot: "#4f46e5" },
  { id: "SENTENCIA", n: "Sentencia", sub: "Falta que paguen", estados: ["SENTENCIA"], dot: "#b45309" },
  { id: "COBRADO", n: "Cobrado", sub: "Falta cerrar", estados: ["COBRADO"], dot: "#16a34a" },
];

export function faseDe(estado) {
  return FASES.find((f) => f.estados.includes(estado)) || null;
}

export function nombreEstado(estado) {
  return ESTADOS[estado]?.n || estado || "";
}

// Colores de los abogados (según su número, así no cambian).
const PALETA_ABOGADOS = ["#0f766e", "#7c3aed", "#b45309", "#be185d", "#1d4ed8", "#047857", "#9333ea", "#0e7490", "#a16207"];
export function colorAbogado(id) {
  const n = Number(id);
  if (!n) return "#94a3b8";
  return PALETA_ABOGADOS[(n - 1) % PALETA_ABOGADOS.length];
}

/** Días sin novedades del estudio (se recalcula en el navegador). */
export function diasSinNovedad(e) {
  return diasDesde(e?.ultima_novedad || e?.creado_en);
}

export function esDemorado(e) {
  return ABIERTOS.includes(e?.estado) && diasSinNovedad(e) >= DIAS_DEMORADO;
}

const dos = (n) => String(n).padStart(2, "0");
const DIAS_CORTO = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "2026-10-02" → Date local (sin correrse por la zona horaria). */
export function fechaLocal(ymd) {
  const [a, m, d] = String(ymd || "").slice(0, 10).split("-").map(Number);
  return new Date(a, (m || 1) - 1, d || 1);
}

/** "2026-10-02" → { dia: "VIE", fecha: "02/10" } (la cajita de fecha). */
export function cajaFecha(ymd) {
  const f = fechaLocal(ymd);
  return { dia: DIAS_CORTO[f.getDay()], fecha: `${dos(f.getDate())}/${dos(f.getMonth() + 1)}` };
}

/** "2026-10-02" → "vie 02/10" */
export function diaCorto(ymd) {
  const f = fechaLocal(ymd);
  return `${DIAS_CORTO[f.getDay()].toLowerCase()} ${dos(f.getDate())}/${dos(f.getMonth() + 1)}`;
}

/** "2026-10-02" → "viernes 02/10" */
export function diaLargo(ymd) {
  const f = fechaLocal(ymd);
  return `${DIAS_LARGO[f.getDay()]} ${dos(f.getDate())}/${dos(f.getMonth() + 1)}`;
}

/** Hoy en "AAAA-MM-DD" (hora de la compu). */
export function hoyYmd() {
  const x = new Date();
  return `${x.getFullYear()}-${dos(x.getMonth() + 1)}-${dos(x.getDate())}`;
}

/** Días desde hoy hasta la fecha (negativo = ya pasó). */
export function diasHasta(ymd) {
  const hoy = fechaLocal(hoyYmd());
  return Math.round((fechaLocal(ymd) - hoy) / 86400000);
}

/** "en 4 días" · "mañana" · "hoy" · "hace 2 días". */
export function textoFalta(dias) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias > 1) return `en ${dias} días`;
  if (dias === -1) return "ayer";
  return `hace ${Math.abs(dias)} días`;
}

/**
 * Link «Mi caso» con la dirección de ESTA app (igual que Gestoría): así sirve
 * también en pruebas o si cambia el dominio.
 */
export function linkCaso(e) {
  const token = String(e?.portal_path || "").split("/mi-caso/")[1] || "";
  if (!token) return e?.portal_link || "";
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
  return `${base}/#/mi-caso/${token}`;
}

/** Cambia en el texto del WhatsApp el link del servidor por el de esta app. */
export function textoConLink(texto, e) {
  const t = String(texto || "");
  if (!e?.portal_link) return t;
  return t.split(e.portal_link).join(linkCaso(e));
}

/** Primer nombre prolijo: "MARCOS ANDRÉS" → "Marcos". */
export function primerNombre(nombre = "") {
  const p = String(nombre).trim().split(/\s+/)[0] || "";
  return p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : "";
}

/** Para buscar: coincide si todas las palabras están (sin tildes ni mayúsculas). */
export function coincide(texto, q) {
  const base = norm(texto);
  return String(q || "")
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => base.includes(norm(w)));
}

/** ¿El abogado lleva este tema? (para sugerirlo). */
export function llevaTema(ab, tema) {
  return Array.isArray(ab?.especialidades) && ab.especialidades.includes(tema);
}

/**
 * El abogado que conviene sugerir para un tema: el que lo lleva y tiene menos
 * casos abiertos; si nadie lo lleva, el que tiene menos casos.
 */
export function abogadoSugerido(abogados = [], tema = "") {
  const activos = abogados.filter((a) => a.activo !== false);
  if (!activos.length) return null;
  const orden = (l) => [...l].sort((a, b) => (a.abiertos || 0) - (b.abiertos || 0) || a.id - b.id);
  const conTema = orden(activos.filter((a) => llevaTema(a, tema)));
  return conTema[0] || orden(activos)[0];
}

/** Especialidades en palabras: ["LABORAL","ACCIDENTE"] → "Laboral · Accidente / ART". */
export function temasTxt(especialidades = [], temas = []) {
  const nombres = Object.fromEntries((temas || []).map((t) => [t.id, t.nombre]));
  return (especialidades || []).map((x) => nombres[x] || x).join(" · ");
}

/** "Dr. Martín Sosa" → "Dr. Sosa" (para textos cortos). */
export function nombreCorto(nombre = "") {
  const p = String(nombre).trim().split(/\s+/);
  if (p.length >= 3 && /^(dr|dra|dr\.|dra\.)$/i.test(p[0])) return `${p[0]} ${p[p.length - 1]}`;
  return nombre;
}

// ── Las preguntas y los papeles de cada motivo (salen del catálogo) ──────
/** ¿Se cumple la condición "si" de una pregunta o papel? Ej: {pregunta: "lastimados", valor: "SI"}. */
export function cumple(cond, respuestas = {}) {
  if (!cond) return true;
  const v = (respuestas || {})[cond.pregunta];
  return Array.isArray(cond.valor) ? cond.valor.includes(v) : v === cond.valor;
}

export function motivoDe(catalogo, id) {
  const lista = catalogo?.motivos || [];
  return lista.find((m) => m.id === id) || null;
}

/** Las preguntas que corresponden según lo que ya contestó. */
export function preguntasDe(motivo, respuestas = {}) {
  return (motivo?.preguntas || []).filter((p) => cumple(p.si, respuestas));
}

/** Los papeles que se le piden según lo que contó: [{key, nombre, ayuda}]. */
export function papelesDe(motivo, respuestas = {}) {
  return (motivo?.papeles || []).filter((p) => cumple(p.si, respuestas)).map((p) => ({ key: p.key, nombre: p.nombre, ayuda: p.ayuda || "" }));
}

/** Solo las respuestas de preguntas que siguen a la vista (si cambió algo, las viejas se sacan). */
export function respuestasVisibles(motivo, respuestas = {}) {
  const salida = {};
  preguntasDe(motivo, respuestas).forEach((p) => {
    const v = respuestas[p.key];
    if (v !== undefined && v !== null && String(v).trim() !== "") salida[p.key] = String(v).trim();
  });
  return salida;
}

/** "SI" → "Sí" (para el resumen). */
export function respuestaTxt(p, v) {
  if (v === undefined || v === null || v === "") return "";
  if (p.tipo === "si_no" || p.tipo === "si_no_ns") return { SI: "Sí", NO: "No", NS: "No sabe" }[v] || v;
  if (p.tipo === "opciones") return (p.opciones || []).find((o) => o.id === v)?.nombre || v;
  if (p.tipo === "cuando" || p.tipo === "fecha") return diaCorto(v);
  return v;
}

// Nombre corto de cada motivo (para "Marcos Giménez · Choque").
export const MOTIVO_CORTO = {
  CHOQUE: "Choque",
  TRABAJO_ACCIDENTE: "Accidente de trabajo",
  TRABAJO: "Trabajo",
  FAMILIA: "Familia",
  ROBO: "Robo o estafa",
  CASA: "Casa o terreno",
  OTRO: "Otra cosa",
};

/** Miniatura de una foto de Cloudinary (liviana, para la lista). Los PDF no tienen. */
export function miniatura(url, lado = 96) {
  const u = String(url || "");
  if (!u.includes("/upload/") || /\.pdf($|\?)/i.test(u)) return u;
  return u.replace("/upload/", `/upload/c_fill,w_${lado},h_${lado},q_auto,f_auto/`);
}

export function esPdf(a) {
  return String(a?.mime || "").includes("pdf") || /\.pdf($|\?)/i.test(String(a?.url || a?.nombre || ""));
}

/** Fecha y hora del servidor (ISO) → "AAAA-MM-DD" en la hora de acá. */
export function ymdDeIso(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Texto del turno elegido: "Miércoles 30/09 a las 10:30, acá en 5 Esquinas, con el Dr. Sosa." */
export function textoTurnoElegido(sel, abogadoNombre = "", miOficina = null) {
  if (!sel) return "";
  const dia = diaLargo(sel.fecha);
  const Dia = dia.charAt(0).toUpperCase() + dia.slice(1);
  const ab = conArticulo(nombreCorto(abogadoNombre));
  if (sel.modalidad === "TELEFONO") return `${Dia} a las ${sel.hora}: lo llama por teléfono ${ab || "el abogado"}.`;
  const aca = sel.oficina && miOficina && Number(sel.oficina) === Number(miOficina);
  const lugar = sel.oficina_nombre ? `${aca ? "acá " : ""}en ${sel.oficina_nombre}` : "en la oficina";
  return `${Dia} a las ${sel.hora}, ${lugar}${ab ? `, con ${ab}` : ""}.`;
}

/** "Dr. Martín Sosa" → "el Dr. Martín Sosa" · "Dra. Vidal" → "la Dra. Vidal" · "Estudio X" → "el Estudio X". */
export function conArticulo(nombre = "") {
  const n = String(nombre || "").trim();
  const bajo = n.toLowerCase();
  if (/^dra[.\s]/.test(bajo)) return `la ${n}`;
  if (/^dr[.\s]/.test(bajo) || bajo.startsWith("estudio ")) return `el ${n}`;
  return n;
}

/** Volver a la pantalla anterior. Si esta se abrió directo (un link, F5),
 *  no hay "anterior": va a `aDonde` (así el botón nunca queda muerto). */
export function volverOIr(navigate, aDonde = "/legales") {
  const idx = typeof window !== "undefined" ? window.history.state?.idx : null;
  if (typeof idx === "number" && idx > 0) navigate(-1);
  else navigate(aDonde, { replace: true });
}

/** "Dr. Martín Sosa" → "al Dr. Martín Sosa" · "Dra. Vidal" → "a la Dra. Vidal" · "Juan López" → "a Juan López". */
export function aArticulo(nombre = "") {
  const con = conArticulo(nombre);
  return con.startsWith("el ") ? `al ${con.slice(3)}` : `a ${con}`;
}

/** Primera letra en mayúscula: "el Dr. Sosa" → "El Dr. Sosa". */
export function mayuscula(txt = "") {
  const t = String(txt || "");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
