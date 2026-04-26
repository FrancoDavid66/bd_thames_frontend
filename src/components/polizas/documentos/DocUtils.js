// src/components/polizas/documentos/DocUtils.js
// ✅ Política vigente: Sistema 100% dinámico. Sin bloqueos de tipos.

// Set rápido para validaciones en UI si hace falta
export const REQUIERE_VENCIMIENTO_SET = new Set();

// Desempaqueta respuestas típicas
export function unwrapResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.results && Array.isArray(payload.results.results)) return payload.results.results;
  return [];
}

// Inferencia básica de MIME por nombre de archivo
export function guessMimeByName(name = "") {
  const low = String(name).toLowerCase();
  if (low.endsWith(".pdf")) return "application/pdf";
  if (low.endsWith(".png")) return "image/png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export function isImageMime(m) {
  return typeof m === "string" && m.startsWith("image/");
}

export function toISODate(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ensureHttps(u) {
  if (!u || typeof u !== "string") return u;
  try {
    const url = new URL(u);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return url.toString();
    }
    return u;
  } catch {
    return u;
  }
}

export function isPdfUrl(url = "", mime = "") {
  return (mime || "").includes("pdf") || /\.pdf(\?|$)/i.test(String(url || ""));
}