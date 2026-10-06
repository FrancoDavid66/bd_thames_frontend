// src/components/gestoria/metricas/metricasUtils.js
//
// 🧰 Ayudas de la pestaña «Métricas» de Gestoría (30/09): los meses, los números a
// la argentina, el "7 más que agosto" de cada número y los tipos que van a «Otros».
// (Los números los calcula el servidor: gestoria/metricas.py.)

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const dos = (n) => String(n).padStart(2, "0");

/** 2026, 9 → "2026-09" (así va en la dirección: /gestoria/metricas?mes=2026-09). */
export const claveMes = ({ anio, mes }) => `${anio}-${dos(mes)}`;

/** "2026-09" → { anio: 2026, mes: 9 }. Si no sirve, null. */
export function leerMes(texto) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(String(texto || "").trim());
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || anio < 2000 || anio > 2100) return null;
  return { anio, mes };
}

/** { anio: 2026, mes: 1 } y −1 → { anio: 2025, mes: 12 } */
export function moverMes({ anio, mes }, n) {
  const i = anio * 12 + (mes - 1) + n;
  return { anio: Math.floor(i / 12), mes: (i % 12) + 1 };
}

export function mesDeHoy() {
  const h = new Date();
  return { anio: h.getFullYear(), mes: h.getMonth() + 1 };
}

/** Negativo si `a` es antes que `b`, 0 si es el mismo mes. */
export const compararMeses = (a, b) => (a.anio - b.anio) * 12 + (a.mes - b.mes);

export const mayuscula = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

/** { anio: 2026, mes: 9 } → "Septiembre 2026" */
export const nombreMes = ({ anio, mes }) => `${mayuscula(MESES[mes - 1])} ${anio}`;

const UN_DECIMAL = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const ENTERO = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** 9.25 → "9,3" · 9 → "9" · null → "—" */
export function dec(x) {
  if (x === null || x === undefined || x === "") return "—";
  const v = Number(x);
  return Number.isFinite(v) ? UN_DECIMAL.format(v) : "—";
}

/** 1234 → "1.234" */
export function entero(x) {
  if (x === null || x === undefined || x === "") return "—";
  const v = Number(x);
  return Number.isFinite(v) ? ENTERO.format(v) : "—";
}

/** 1 → "1 día" · 9.2 → "9,2 días" · null → "—" */
export function diasTxt(x) {
  if (x === null || x === undefined) return "—";
  return `${dec(x)} ${Number(x) === 1 ? "día" : "días"}`;
}

/** 14 → "14%" · null → "—" */
export const pctTxt = (x) => (x === null || x === undefined ? "—" : `${entero(x)}%`);

/**
 * Cómo le fue contra el mes anterior (la línea chiquita de cada número).
 *   tipo "cantidad": "7 más que agosto" · "días": "1,1 días más rápido que agosto" ·
 *   "puntos": "4 puntos menos que agosto".
 * menosEsMejor: en días y en observados, bajar es bueno (verde).
 * Devuelve { dir: "sube" | "baja" | "igual", tono: "bien" | "mal" | "neutro", texto } o null.
 */
export function diferencia(actual, antes, { mes, tipo = "cantidad", menosEsMejor = false } = {}) {
  if (actual === null || actual === undefined || antes === null || antes === undefined) return null;
  const d = Number(actual) - Number(antes);
  const abs = Math.abs(d);
  if (abs < (tipo === "días" ? 0.05 : 0.5)) return { dir: "igual", tono: "neutro", texto: `Igual que ${mes}` };
  const sube = d > 0;
  const bien = menosEsMejor ? !sube : sube;
  let texto;
  if (tipo === "días") texto = `${diasTxt(abs)} más ${sube ? "lento" : "rápido"} que ${mes}`;
  else if (tipo === "puntos") texto = `${entero(abs)} ${abs === 1 ? "punto" : "puntos"} ${sube ? "más" : "menos"} que ${mes}`;
  else texto = `${entero(abs)} ${sube ? "más" : "menos"} que ${mes}`;
  return { dir: sube ? "sube" : "baja", tono: bien ? "bien" : "mal", texto };
}

/**
 * «¿Qué trámites llegan?»: los 5 que más llegan y el resto junto en «Otros».
 * Ej: 8 tipos → 5 + Otros, con el detalle "cédula verde 3 · baja 2 · duplicado 1".
 */
export function plegarTipos(tipos, max = 5) {
  const lista = Array.isArray(tipos) ? tipos : [];
  if (lista.length <= max + 1) return { filas: lista, otros: "" };
  const resto = lista.slice(max);
  const total = lista.reduce((s, x) => s + x.n, 0);
  const n = resto.reduce((s, x) => s + x.n, 0);
  return {
    filas: [...lista.slice(0, max), { tipo: "_OTROS", nombre: "Otros", corto: "Otros", n, pct: total ? Math.round((n * 100) / total) : 0 }],
    otros: resto.map((x) => `${String(x.corto || x.nombre).toLowerCase()} ${x.n}`).join(" · "),
  };
}

const PASOS_ESCALA = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 250, 300, 400, 500, 1000];

/**
 * Un tope "redondo" para el eje y sus rayitas (3 tramos).
 * Ej: 15,7 días → tope 18, rayitas 0 · 6 · 12 · 18. 64 trámites → 75 (0 · 25 · 50 · 75).
 */
export function escala(max, tramos = 3) {
  const m = Math.max(1, Number(max) || 0);
  const paso = PASOS_ESCALA.find((p) => p * tramos >= m) || Math.ceil(m / tramos);
  return { tope: paso * tramos, marcas: Array.from({ length: tramos + 1 }, (_, i) => i * paso) };
}

/** Ancho en % de una barra (nunca más de 100). */
export const ancho = (v, tope) => `${Math.max(0, Math.min(100, (Number(v) / (Number(tope) || 1)) * 100))}%`;
