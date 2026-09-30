// src/components/gestoria/gestora/gestoraUtils.js
//
// 🧰 Ayudas de la APP DE LA GESTORA (30/09): colores de cada estado, la letra,
// qué dice la 3ª línea de cada trámite en la lista, "4 d", la patente con
// espacios, etc. Las usan las pantallas de la carpeta gestora/ (y MisTramites
// y FichaGestora). Lo general de Gestoría sigue en ../gestoriaUtils.js.
import { ABIERTOS, diasEnEstado, diasEntre, esDemorado, norm } from "../gestoriaUtils";

// 🔤 Letras: Figtree para todo y IBM Plex Mono para patentes y números
//    (las carga GestorLayout desde Google Fonts; si no cargan, queda la del sistema).
export const LETRA = 'Figtree, "Segoe UI", system-ui, -apple-system, sans-serif';
export const MONO = {
  fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontVariantNumeric: "tabular-nums",
};

// Clases que se repiten.
export const suave = "text-suave dark:text-suave-dark";
export const fuerte = "text-titulo dark:text-titulo-dark";
export const foco =
  "outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:focus-visible:ring-offset-surface-dark";

// Tonos de texto para avisos cortos (la 3ª línea de la lista, resúmenes, etc.).
export const TONO_TEXTO = {
  ambar: "text-duo-amarillo-sombra dark:text-amber-300",
  azul: "text-duo-azul-sombra dark:text-blue-300",
  violeta: "text-duo-violeta-sombra dark:text-[#a5a0ff]",
  verde: "text-duo-verde-sombra dark:text-green-400",
  rojo: "text-duo-rojo dark:text-red-400",
  suave,
};

// Fondo suave + texto de cada tono (cuadradito del ícono, pastillas).
export const TONO_CAJA = {
  ambar: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-amber-300",
  azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul-sombra dark:text-blue-300",
  violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta-sombra dark:text-[#a5a0ff]",
  verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-green-400",
  neutro: "bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300",
};

// Cada estado, como lo ve la gestora: nombre, tono y punto de color.
// (El ícono lo pone piezas.jsx según el estado.)
export const ESTADO_APP = {
  OBSERVADO: { txt: "Observado", tono: "ambar", punto: "bg-duo-amarillo" },
  ASIGNADO: { txt: "Para presentar", tono: "azul", punto: "bg-duo-azul" },
  EN_REGISTRO: { txt: "En el registro", tono: "violeta", punto: "bg-duo-violeta" },
  LISTO: { txt: "Listo", tono: "verde", punto: "bg-duo-verde" },
  ENTREGADO: { txt: "Entregado", tono: "neutro", punto: "bg-slate-400" },
  CANCELADO: { txt: "Cancelado", tono: "neutro", punto: "bg-slate-400" },
  RECIBIDO: { txt: "Recibido", tono: "neutro", punto: "bg-slate-400" },
};

/** 🪪 La licencia de conducir no es del auto: no va al registro automotor ni tiene patente. */
export const esDePersona = (t) => t?.con_vehiculo === false;

/** El estado del trámite para la gestora. Ej: {txt: "Para presentar", tono: "azul", ...} */
export function estadoApp(t) {
  const e = ESTADO_APP[t?.estado] || ESTADO_APP.RECIBIDO;
  // La licencia se presenta en la municipalidad, no "en el registro".
  if (t?.estado === "EN_REGISTRO" && esDePersona(t)) return { ...e, txt: "Presentado" };
  return e;
}

/** 0 → "hoy", 4 → "4 d" (para la columna de la derecha de la lista). */
export function diasCorto(d) {
  return d > 0 ? `${d} d` : "hoy";
}

/** "AC512FG" → "AC 512 FG", "ABC123" → "ABC 123" (se lee mejor). Otras quedan igual. */
export function patenteLinda(p) {
  const s = String(p || "").toUpperCase().replace(/\s/g, "");
  let m = s.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  m = s.match(/^([A-Z]{3})(\d{3})$/);
  if (m) return `${m[1]} ${m[2]}`;
  return s;
}

/** Demorado para la gestora (el LISTO que nadie retira ya no depende de ella). */
export function demoradoGestora(t) {
  return t?.estado !== "LISTO" && esDemorado(t);
}

/** Cuántos papeles de la lista faltan. */
export function papelesQueFaltan(t) {
  return Math.max(0, (t?.papeles_total || 0) - (t?.papeles_ok || 0));
}

/**
 * La 3ª línea de cada trámite en la lista (lo más importante de ese momento).
 * Ej: {txt: "Pidió: firma del titular", tono: "ambar"} · {txt: "Papeles completos", tono: "verde"}
 */
export function lineaDeEstado(t) {
  if (!t) return null;
  if (t.estado === "OBSERVADO") {
    return { txt: t.falta ? `Pidió: ${t.falta}` : "El registro lo observó", tono: "ambar" };
  }
  if (t.estado === "ASIGNADO") {
    if (t.cliente_subio_papeles) return { txt: "El cliente mandó fotos", tono: "azul" };
    const n = papelesQueFaltan(t);
    const primero = (t.papeles_faltan || [])[0];
    if (n && primero) return { txt: `Falta: ${primero}${n > 1 ? ` y ${n - 1} más` : ""}`, tono: "ambar" };
    if (n) return { txt: n === 1 ? "Falta 1 papel" : `Faltan ${n} papeles`, tono: "ambar" };
    if (t.papeles_total) return { txt: "Papeles completos", tono: "verde" };
    return null;
  }
  if (t.estado === "EN_REGISTRO") {
    if (t.ve_plata && !t.cobros_n) return { txt: "Sin comprobante de cobro", tono: "ambar" };
    if (t.veces_observado) {
      return { txt: `Tuvo ${t.veces_observado} observación${t.veces_observado > 1 ? "es" : ""}`, tono: "suave" };
    }
    return null;
  }
  if (t.estado === "LISTO") return { txt: "Esperando que lo retiren", tono: "verde" };
  return null;
}

/** Los más viejos (en su estado) primero. */
export function porAntiguedad(a, b) {
  return diasEnEstado(b) - diasEnEstado(a) || (a.id || 0) - (b.id || 0);
}

// Los 3 filtros de «Trámites» (el mismo id que usa "Nuevo trámite": «hacer»).
export const FILTROS = [
  { id: "hacer", label: "Para hacer", estados: ["OBSERVADO", "ASIGNADO"] },
  { id: "registro", label: "En registro", estados: ["EN_REGISTRO"] },
  { id: "listos", label: "Listos", estados: ["LISTO"] },
];

/** ¿El trámite coincide con lo que se busca? (patente, nombre, DNI, número, tipo u oficina) */
export function coincide(t, q) {
  const b = norm(q);
  if (!b) return true;
  return [t.patente, t.persona_nombre, t.persona_dni, t.numero, t.tipo_txt, t.tipo_corto, t.oficina_nombre, t.vehiculo]
    .some((x) => norm(x).includes(b));
}

/**
 * 💵 Plata de un trámite abierto (con las comisiones prendidas).
 * Ej: {precio: 60000, cobrado: 20000, falta: 40000, sinComprobante: false}
 */
export function plataDe(t) {
  const precio = t?.precio_gestoria != null ? Number(t.precio_gestoria) : null;
  const cobrado = Number(t?.cobrado || 0);
  return {
    precio,
    cobrado,
    falta: precio != null ? precio - cobrado : null,
    sinComprobante: !!t?.ve_plata && !t?.cobros_n,
  };
}

/**
 * Abiertos a los que se les puede cargar un cobro. conListos = también los LISTO
 * (ya tienen su comprobante, pero puede faltar el resto de una seña).
 */
export function esCobrable(t, conListos = false) {
  const estados = conListos ? ["ASIGNADO", "EN_REGISTRO", "OBSERVADO", "LISTO"] : ["ASIGNADO", "EN_REGISTRO", "OBSERVADO"];
  return !!t?.ve_plata && estados.includes(t.estado);
}

/** Los que no tienen NINGÚN comprobante de cobro (sin eso no pasan a LISTO). El número del menú «Cobros». */
export function sinComprobanteDe(lista) {
  return (lista || []).filter((t) => esCobrable(t) && !t.cobros_n);
}

/** "Hola, Laura" (el primer nombre); si es una gestoría ("Gestoría Sur"), el nombre entero. */
const GENERICOS = /^(gestor[ií]a|gestor|estudio|escriban[ií]a|agencia|registro)$/i;
export function saludo(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  return GENERICOS.test(partes[0]) ? partes.join(" ") : partes[0];
}

/** Lo próximo para hacer después de terminar uno: primero un observado, después uno para presentar. */
export function loQueSigue(lista, idActual) {
  const abiertos = (lista || []).filter((t) => t.id !== Number(idActual) && ABIERTOS.includes(t.estado));
  const de = (estado) => abiertos.filter((t) => t.estado === estado).sort(porAntiguedad)[0];
  return de("OBSERVADO") || de("ASIGNADO") || null;
}

const DIAS_SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dos = (n) => String(n).padStart(2, "0");

/**
 * Cuándo pasó algo, como se dice: "hoy", "ayer" o "el sábado 27/09".
 * Ej: `Lo presentaste ${cuando(t.en_registro_en)}.` → "Lo presentaste ayer."
 */
export function cuando(iso) {
  if (!iso) return "";
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return "";
  const d = diasEntre(iso, new Date());
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  return `el ${DIAS_SEM[f.getDay()]} ${dos(f.getDate())}/${dos(f.getMonth() + 1)}`;
}

const MILES = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** Solo los dígitos de lo que se escribe ("60.000" → "60000"). Hasta 10 cifras. */
export function soloDigitos(v) {
  return String(v || "").replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10);
}

/** "60000" → "60.000" (para mostrar mientras se escribe). */
export function conPuntos(dig) {
  return dig ? MILES.format(Number(dig)) : "";
}

/**
 * 💵 Lo que se ve en un campo de plata mientras se escribe (a la argentina: punto
 * para los miles, coma para los centavos).
 *   "60000" → "60.000" · "60.000,00" (pegado del banco) → "60.000,00" · "25000,5" → "25.000,5"
 */
export function montoEscrito(raw) {
  const limpio = String(raw || "").replace(/[^\d.,]/g, "");
  const coma = limpio.indexOf(",");
  if (coma < 0) return conPuntos(soloDigitos(limpio));
  const centavos = limpio.slice(coma + 1).replace(/\D/g, "").slice(0, 2);
  return `${conPuntos(soloDigitos(limpio.slice(0, coma))) || "0"},${centavos}`;
}

/** Los pesos de lo escrito, redondeados: "60.000" → 60000 · "60.000,00" → 60000 · "25.000,5" → 25001. */
export function montoDe(texto) {
  const [entero, centavos = ""] = String(texto || "").split(",");
  const n = Number(soloDigitos(entero) || 0) + Number(`0.${centavos.replace(/\D/g, "") || "0"}`);
  return Math.round(n);
}
