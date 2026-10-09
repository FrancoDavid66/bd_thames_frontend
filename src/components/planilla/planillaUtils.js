// src/components/planilla/planillaUtils.js
//
// 🧰 Ayudas de la PLANILLA DE COLORES (estilo Monday.com) que usan Gestoría,
// Legales y Siniestros: los 3 tonos de "Para hoy", cuál es el más urgente de
// una fila, "hace N días", y recordar la vista elegida mientras dure la sesión.
import { ddmmhhmm, diasDesde, norm, textoDias } from "../gestoria/gestoriaUtils";

export { ddmmhhmm, diasDesde, norm, textoDias };

/** Los grupos de «Para hoy», del más urgente al menos. */
export const TONOS = {
  rojo: { n: "Urgente", ic: "🔴", c: "#dc2626" },
  ambar: { n: "Para hoy", ic: "🟠", c: "#d97706" },
  azul: { n: "Para revisar", ic: "🔵", c: "#2563eb" },
};
export const ORDEN_TONO = ["rojo", "ambar", "azul"];

/** De las tareas de una fila, el tono más urgente (o null si no tiene nada). */
export function peorTono(tareas = []) {
  for (const t of ORDEN_TONO) if (tareas.some((x) => x.tono === t)) return t;
  return null;
}

/** "hoy" · "ayer" · "hace 5 días" */
export function textoHace(d) {
  const n = Number(d) || 0;
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return textoDias(n);
}

/** ¿El texto coincide con lo que se busca? (sin tildes, mayúsculas, puntos ni guiones) */
export function coincide(texto, q) {
  const base = norm(texto);
  return String(q || "")
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => base.includes(norm(w)));
}

/** Guardar/leer algo chiquito de la sesión (la vista elegida, los grupos cerrados). */
export function leerSesion(clave, defecto) {
  try {
    const v = sessionStorage.getItem(`planilla:${clave}`);
    return v ? JSON.parse(v) : defecto;
  } catch {
    return defecto;
  }
}
export function guardarSesion(clave, valor) {
  try {
    sessionStorage.setItem(`planilla:${clave}`, JSON.stringify(valor));
  } catch {
    /* modo privado: no pasa nada */
  }
}

/** Primer nombre prolijo ("Dra. Laura Vidal" → "Laura", "MARCOS ANDRÉS" → "Marcos"). */
export function primerNombre(n = "") {
  const p = String(n || "").replace(/^dra?\.?\s+/i, "").trim().split(/\s+/)[0] || "";
  return p && p === p.toUpperCase() ? p.charAt(0) + p.slice(1).toLowerCase() : p;
}

/** Error del servidor en criollo (todas las secciones devuelven {detail}). */
export function mensajeDe(e, defecto = "No se pudo guardar. Probá de nuevo.") {
  const d = e?.response?.data;
  if (!d) return e?.message && !/status code|network/i.test(e.message) ? e.message : defecto;
  if (typeof d === "string") return d.length < 200 ? d : defecto;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail) && d.detail[0]) return String(d.detail[0]);
  const primero = Object.values(d)[0];
  if (Array.isArray(primero) && primero[0]) return String(primero[0]);
  if (typeof primero === "string") return primero;
  return defecto;
}

/** El nombre para las iniciales del avatar: sin "Dr./Dra." ni lo que va entre paréntesis.
 *  "Dr. Martín Sosa" → "Martín Sosa" (MS, no DM) · "Sofía (5 Esquinas)" → "Sofía" (SO). */
export function nombreAvatar(n = "") {
  return String(n || "").replace(/\([^)]*\)/g, "").replace(/^dra?\.?\s+/i, "").trim() || String(n || "");
}
