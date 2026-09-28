// src/components/gestoria/gestoriaUtils.js
//
// 🧰 Ayudas de Gestoría: colores, fechas "hace N días", plata en formato
// argentino, etc. Las usan todas las pantallas del módulo.

export const ABIERTOS = ["RECIBIDO", "ASIGNADO", "EN_REGISTRO", "OBSERVADO", "LISTO"];
export const PASOS = ["RECIBIDO", "ASIGNADO", "EN_REGISTRO", "LISTO", "ENTREGADO"];
export const DIAS_DEMORADO = 7;

// Nombre y color de cada estado (el punto de color del tablero).
export const ESTADOS = {
  RECIBIDO: { n: "Recibido", corto: "Recibido", dot: "#64748b", cli: "Recibimos tus papeles" },
  ASIGNADO: { n: "Asignado al gestor", corto: "Asignado", dot: "#0284c7", cli: "El gestor lo tomó" },
  EN_REGISTRO: { n: "En el registro", corto: "En el registro", dot: "#4f46e5", cli: "En el registro" },
  OBSERVADO: { n: "Observado", corto: "Observado", dot: "#ea580c", cli: "El registro pidió algo más" },
  LISTO: { n: "Listo para entregar", corto: "Listo", dot: "#16a34a", cli: "Listo para retirar" },
  ENTREGADO: { n: "Entregado", corto: "Entregado", dot: "#475569", cli: "Entregado" },
  CANCELADO: { n: "Cancelado", corto: "Cancelado", dot: "#94a3b8", cli: "Cancelado" },
};

// Colores fijos por oficina y por gestor (según su número, así no cambian).
const PALETA_OFICINAS = ["#0284c7", "#059669", "#4f46e5", "#d97706", "#db2777", "#0891b2", "#65a30d", "#7c3aed"];
const PALETA_GESTORES = ["#0f766e", "#7c3aed", "#b45309", "#be185d", "#1d4ed8", "#047857", "#9333ea", "#0e7490", "#a16207"];

export function colorOficina(id) {
  const n = Number(id);
  if (!n) return "#94a3b8";
  return PALETA_OFICINAS[(n - 1) % PALETA_OFICINAS.length];
}

export function colorGestor(id) {
  const n = Number(id);
  if (!n) return "#94a3b8";
  return PALETA_GESTORES[(n - 1) % PALETA_GESTORES.length];
}

export function iniciales(nombre = "") {
  const p = String(nombre).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
}

const NUM = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** 250000 → "$ 250.000" */
export function plata(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v < 0 ? "−" : ""}$\u00a0${NUM.format(Math.abs(v))}`;
}

/** "7.50" → "7,5%" */
export function fmtPct(p) {
  if (p === null || p === undefined || p === "") return "—";
  const v = Number(p);
  if (!Number.isFinite(v)) return "—";
  return `${String(Math.round(v * 100) / 100).replace(".", ",")}%`;
}

/** Comisión estimada con precio y % (redondeada a pesos). */
export function calcComision(precio, pct) {
  const p = Number(precio);
  const c = Number(pct);
  if (!(p > 0) || !(c >= 0)) return null;
  return Math.round((p * c) / 100);
}

const dos = (n) => String(n).padStart(2, "0");

function inicioDia(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Días de calendario entre dos fechas (como el tablero: "hace 3 días"). */
export function diasEntre(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((inicioDia(b) - inicioDia(a)) / 86400000));
}

export function diasDesde(iso) {
  return iso ? diasEntre(iso, new Date()) : 0;
}

export function textoDias(d) {
  if (d === 0) return "hoy";
  if (d === 1) return "hace 1 día";
  return `hace ${d} días`;
}

export function ddmm(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}`;
}

export function hhmm(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function ddmmhhmm(iso) {
  return iso ? `${ddmm(iso)} ${hhmm(iso)}` : "—";
}

const DIAS_SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "2026-10-02" → "jueves 02/10" */
export function fechaCorta(ymd) {
  if (!ymd) return "—";
  const [a, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  const f = new Date(a, m - 1, d);
  return `${DIAS_SEM[f.getDay()]} ${dos(f.getDate())}/${dos(f.getMonth() + 1)}`;
}

/** Hoy + n días en formato "AAAA-MM-DD" (para el input de fecha). */
export function ymdMas(n) {
  const x = new Date();
  x.setDate(x.getDate() + Number(n || 0));
  return `${x.getFullYear()}-${dos(x.getMonth() + 1)}-${dos(x.getDate())}`;
}

/** Para buscar sin importar mayúsculas, tildes, puntos ni guiones. */
export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.\-\s]/g, "");
}

/** Días del trámite en el estado actual (se recalcula en el navegador). */
export function diasEnEstado(t) {
  return diasDesde(t?.estado_desde || t?.creado_en);
}

export function esDemorado(t) {
  return ABIERTOS.includes(t?.estado) && diasEnEstado(t) >= DIAS_DEMORADO;
}

/** "Transferencia" / "Duplicado de cédula" (versión corta para tarjetas). */
export function tipoCorto(t) {
  return `${t?.tipo_corto || t?.tipo || ""}${t?.detalle ? ` ${t.detalle}` : ""}`.trim();
}

export function tamTxt(bytes) {
  const n = Number(bytes);
  if (!n) return "";
  const kb = Math.max(1, Math.round(n / 1024));
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/**
 * Número → formato internacional (el que piden WhatsApp y el celu).
 *   "11 5555-0000"       → "5491155550000"
 *   "011 15 5555-0000"   → "5491155550000"
 *   "+54 9 2284 12-3456" → "5492284123456" (ya venía bien)
 *   "+598 99 123 456"    → "59899123456"   (de otro país, con +: se respeta)
 * Si no queda un número completo devuelve "": mejor no mostrar el botón que
 * abrirle el chat a otra persona (ej: "4555-0000" sin característica).
 */
export function numeroInternacionalAR(numero) {
  const s = String(numero || "").trim();
  const internacional = s.startsWith("+") || s.startsWith("00");
  let d = s.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d) return "";
  if (internacional) {
    if (d.startsWith("54") && !d.startsWith("549") && d.length === 12) d = `549${d.slice(2)}`;
    return d.length >= 11 && d.length <= 15 ? d : "";
  }
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54") && d.length === 12) return `549${d.slice(2)}`;
  d = d.replace(/^0/, "");
  if (d.length === 11 && d.startsWith("9")) d = d.slice(1); // "9 11 5555-0000"
  if (d.length === 12) d = d.replace(/^(\d{2,4})15/, "$1"); // sacar el 15 del celu
  if (d.length !== 10 || d.startsWith("15")) return ""; // "15 5555-0000": falta la característica
  return `549${d}`;
}

/** Link de WhatsApp (wa.me) con un texto armado. */
export function linkWhatsApp(numero, texto = "") {
  const dig = numeroInternacionalAR(numero);
  if (!dig) return "";
  return `https://wa.me/${dig}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/**
 * WhatsApp con el mensaje escrito. Si no hay un número que sirva, abre WhatsApp
 * para elegir el contacto a mano (el mensaje igual va escrito).
 */
export function linkWhatsAppOElegir(numero, texto = "") {
  return linkWhatsApp(numero, texto) || `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/** Link para llamar desde el celu. */
export function linkTel(numero) {
  const dig = numeroInternacionalAR(numero);
  return dig ? `tel:+${dig}` : "";
}

/** Link a Google Maps con la dirección. */
export function linkMapa(direccion) {
  const d = String(direccion || "").trim();
  return d ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}` : "";
}
