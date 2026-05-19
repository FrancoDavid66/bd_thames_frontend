// src/utils/cuotas.js
// 🎯 ÚNICA fuente de verdad para toda la lógica de cuotas en la app.
// Si necesitás cambiar cómo se calcula el estado, cobertura, vencimiento
// o badges de una cuota, este es el archivo. Punto.

import dayjs from "dayjs";

/* ═══════════════════════════════════════════════════════════════════
   1. CONSTANTES Y HELPERS BÁSICOS
   ═══════════════════════════════════════════════════════════════════ */

export const today = () => dayjs().startOf("day");

/**
 * Devuelve una fecha sumando N días HÁBILES (excluye sábados y domingos).
 * Usado para calcular la cobertura cuando una cuota se paga atrasada.
 */
export function sumarDiasHabiles(fecha, dias) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  let added = 0;
  while (added < dias) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return dayjs(d).startOf("day");
}

/**
 * Suma N meses preservando el día. Si el mes destino no tiene ese día,
 * usa el último día disponible (ej: 31 enero + 1 mes = 28/29 febrero).
 * MISMA lógica que el backend renovacion.py._add_months.
 */
export function addMonths(fecha, months) {
  const d = dayjs(fecha);
  if (!d.isValid()) return null;
  return d.add(months, "month");
}

/* ═══════════════════════════════════════════════════════════════════
   2. CÁLCULO DE FECHAS DE CUOTAS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Calcula el vencimiento de la cuota número N de una póliza.
 *
 * REGLA GENERAL (alineada con backend renovacion.py):
 *   - cuota_nro 1 vence en `primer_pago` (mismo día que se asegura)
 *   - cuota_nro N vence en `primer_pago + (N - 1) meses`
 *
 * Ejemplo: se asegura el 19/05/2026 con 3 cuotas →
 *   cuota 1: 19/05/2026
 *   cuota 2: 19/06/2026
 *   cuota 3: 19/07/2026
 *
 * @param {string|Date|dayjs.Dayjs} primerPago - fecha de primera cuota
 * @param {number} cuotaNro - número de cuota (1-indexed)
 * @returns {dayjs.Dayjs|null}
 */
export function calcVencimientoCuota(primerPago, cuotaNro) {
  if (!primerPago || !cuotaNro || cuotaNro < 1) return null;
  return addMonths(primerPago, cuotaNro - 1)?.startOf("day") || null;
}

/**
 * Calcula todas las fechas de cuotas de una póliza.
 * Devuelve array de objetos { cuota_nro, fecha_vencimiento }.
 *
 * @param {string|Date|dayjs.Dayjs} primerPago - fecha de primera cuota
 * @param {number} cantidadCuotas - total de cuotas
 */
export function generarFechasCuotas(primerPago, cantidadCuotas) {
  const n = Math.max(0, Number(cantidadCuotas) || 0);
  const cuotas = [];
  for (let i = 1; i <= n; i++) {
    cuotas.push({
      cuota_nro: i,
      fecha_vencimiento: calcVencimientoCuota(primerPago, i),
    });
  }
  return cuotas;
}

/* ═══════════════════════════════════════════════════════════════════
   3. ESTADO DE UNA CUOTA
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Estados posibles de una cuota.
 * Vocabulario: español snake_case (consistente con el resto del backend).
 */
export const ESTADO_CUOTA = {
  PAGADA: "pagada",
  VENCIDA: "vencida",
  VENCE_HOY: "vence_hoy",
  POR_VENCER: "por_vencer",
  PENDIENTE: "pendiente",
};

/**
 * Devuelve el estado actual de una cuota según su fecha de vencimiento.
 *
 *   - pagada: c.pagado === true
 *   - vencida: fecha_vencimiento < hoy
 *   - vence_hoy: fecha_vencimiento === hoy
 *   - por_vencer: fecha_vencimiento > hoy
 *   - pendiente: no tiene fecha_vencimiento válida
 */
export function getEstadoCuota(cuota) {
  if (!cuota) return ESTADO_CUOTA.PENDIENTE;
  if (cuota.pagado) return ESTADO_CUOTA.PAGADA;

  const v = cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento) : null;
  if (!v || !v.isValid()) return ESTADO_CUOTA.PENDIENTE;

  const diff = v.startOf("day").diff(today(), "day");
  if (diff < 0) return ESTADO_CUOTA.VENCIDA;
  if (diff === 0) return ESTADO_CUOTA.VENCE_HOY;
  return ESTADO_CUOTA.POR_VENCER;
}

/**
 * Días hasta el vencimiento (negativo si ya venció, 0 si vence hoy).
 */
export function diasHastaVencimiento(cuota) {
  const v = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento) : null;
  if (!v || !v.isValid()) return null;
  return v.startOf("day").diff(today(), "day");
}

/* ═══════════════════════════════════════════════════════════════════
   4. COBERTURA DE UNA CUOTA
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Calcula qué período de tiempo cubre una cuota.
 *
 * Reglas:
 *   - Si NO está pagada: sin cobertura desde su vencimiento.
 *   - Si está pagada en término: cubre desde el vto anterior (+1 día) hasta su vto.
 *     Si es la primera cuota: cubre desde fecha_emision de la póliza hasta su vto.
 *   - Si está pagada con ATRASO: cubre desde (fecha_pago + 2 días hábiles) hasta
 *     el vto siguiente (o fv + 1 mes si es la última).
 *
 * @param {object} cuota - la cuota actual
 * @param {Array} todasLasCuotas - todas las cuotas de la póliza, ordenadas por cuota_nro
 * @param {number} idx - índice de la cuota actual en el array
 * @param {string|Date} polizaFechaEmision - fecha de emisión de la póliza (para idx === 0)
 * @returns {{tipo: 'ok'|'atrasado'|'sin_cobertura', desde: dayjs|null, hasta: dayjs|null}}
 */
export function calcCobertura(cuota, todasLasCuotas = [], idx = 0, polizaFechaEmision = null) {
  const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
  const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
  const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;

  const cuotaAnterior = idx > 0 ? todasLasCuotas[idx - 1] : null;
  const cuotaSiguiente = idx < todasLasCuotas.length - 1 ? todasLasCuotas[idx + 1] : null;
  const fvAnterior = cuotaAnterior?.fecha_vencimiento
    ? dayjs(cuotaAnterior.fecha_vencimiento).startOf("day")
    : null;
  const fvSiguiente = cuotaSiguiente?.fecha_vencimiento
    ? dayjs(cuotaSiguiente.fecha_vencimiento).startOf("day")
    : null;

  const pagoAtrasado = cuota?.pagado && fp && fv ? fp.isAfter(fv) : false;

  // 1. No pagada → sin cobertura
  if (!cuota?.pagado) {
    return { tipo: "sin_cobertura", desde: fv, hasta: null };
  }

  // 2. Pagada con atraso → cobertura desde fp+2 días hábiles hasta vto siguiente
  if (pagoAtrasado) {
    const desde = fp ? sumarDiasHabiles(fechaPago, 2) : null;
    const hasta = fvSiguiente || (fv ? fv.add(1, "month") : null);
    return { tipo: "atrasado", desde, hasta };
  }

  // 3. Pagada en término → cobertura normal
  const desde = idx === 0
    ? (polizaFechaEmision ? dayjs(polizaFechaEmision).startOf("day") : fv)
    : (fvAnterior ? fvAnterior.add(1, "day") : null);
  return { tipo: "ok", desde, hasta: fv };
}

/* ═══════════════════════════════════════════════════════════════════
   5. RESUMEN AGREGADO DE CUOTAS
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Calcula stats agregados de un array de cuotas.
 */
export function resumenCuotas(cuotas = []) {
  const rows = Array.isArray(cuotas) ? cuotas : [];
  const total = rows.length;
  const pagadas = rows.filter((c) => c?.pagado).length;
  const pendientes = rows.filter((c) => !c?.pagado).length;
  const vencidas = rows.filter(
    (c) => !c?.pagado && getEstadoCuota(c) === ESTADO_CUOTA.VENCIDA
  ).length;
  const venceHoy = rows.filter(
    (c) => !c?.pagado && getEstadoCuota(c) === ESTADO_CUOTA.VENCE_HOY
  ).length;
  const montoTotal = rows.reduce((acc, c) => {
    const m = Number(c?.monto || c?.importe || 0);
    return acc + (isFinite(m) ? m : 0);
  }, 0);

  return { total, pagadas, pendientes, vencidas, venceHoy, montoTotal };
}

/**
 * Devuelve la próxima cuota a vencer (no pagada con fecha más cercana en el futuro).
 * Si no hay futuras, devuelve la última vencida no pagada.
 */
export function getProximaCuota(cuotas = []) {
  const rows = Array.isArray(cuotas) ? cuotas : [];
  const hoy = today();
  const pendientesConFecha = rows
    .filter((c) => !c?.pagado && c?.fecha_vencimiento)
    .sort((a, b) =>
      dayjs(a.fecha_vencimiento).valueOf() - dayjs(b.fecha_vencimiento).valueOf()
    );

  return (
    pendientesConFecha.find((c) =>
      dayjs(c.fecha_vencimiento).startOf("day").isAfter(hoy.subtract(1, "day"))
    ) || pendientesConFecha[pendientesConFecha.length - 1] || null
  );
}

/**
 * Devuelve la ÚLTIMA cuota de una póliza (mayor cuota_nro, o mayor fecha_vencimiento
 * como fallback). Independientemente de si está paga o no.
 */
export function getUltimaCuota(cuotas = []) {
  const rows = Array.isArray(cuotas) ? cuotas : [];
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const na = Number(a?.cuota_nro || 0);
    const nb = Number(b?.cuota_nro || 0);
    if (na !== nb) return nb - na;
    const fa = a?.fecha_vencimiento ? dayjs(a.fecha_vencimiento).valueOf() : 0;
    const fb = b?.fecha_vencimiento ? dayjs(b.fecha_vencimiento).valueOf() : 0;
    return fb - fa;
  })[0];
}

/**
 * 🎯 ÚNICA fuente de verdad: días que una póliza lleva vencida.
 *
 * REGLA: días_vencida = hoy − fecha_vencimiento_última_cuota
 *
 *   - Si la última cuota vence en el FUTURO → devuelve 0 (no está vencida)
 *   - Si la última cuota venció HOY → devuelve 0
 *   - Si la última cuota venció HACE N DÍAS → devuelve N (positivo)
 *
 * Acepta:
 *   - una póliza con .cuotas[]  → toma la última cuota
 *   - una póliza con campos planos del backend
 *     (ultima_cuota_vencimiento, max_vto_impaga, etc)
 *   - una fecha directa (string ISO o dayjs)
 *
 * @returns {number} días vencida (0 si no está vencida, N si lleva N días)
 */
export function getDiasVencida(input) {
  const d = getDiasParaVencer(input);
  if (d == null) return 0;
  return d < 0 ? -d : 0;
}

/**
 * 🎯 Hermana de getDiasVencida pero con SIGNO.
 *
 * REGLA: días_para_vencer = vto_última_cuota − hoy  (con signo)
 *
 *   - POSITIVO (+5)  → faltan 5 días para vencer
 *   - CERO (0)       → vence hoy
 *   - NEGATIVO (-3)  → venció hace 3 días
 *   - null           → no se pudo determinar
 *
 * Usado por la sección de Vencimientos donde se muestran las 3 categorías
 * a la vez (por vencer / hoy / vencidas).
 *
 * Acepta los mismos inputs que getDiasVencida.
 *
 * @returns {number|null}
 */
export function getDiasParaVencer(input) {
  if (!input) return null;

  // Resolver fecha de referencia (vto última cuota)
  let fechaRef = null;

  // Caso 1: viene una fecha directamente
  if (typeof input === "string" || input instanceof Date || dayjs.isDayjs(input)) {
    fechaRef = input;
  }
  // Caso 2: viene una póliza con cuotas[]
  else if (Array.isArray(input?.cuotas) && input.cuotas.length > 0) {
    const ultima = getUltimaCuota(input.cuotas);
    fechaRef = ultima?.fecha_vencimiento || null;
  }
  // Caso 3: viene una póliza con campos planos del backend
  if (!fechaRef && typeof input === "object") {
    fechaRef =
      input?.ultima_cuota_vencimiento ||
      input?.max_vto_impaga ||
      input?.ultima_vencimiento_impaga ||
      input?.vto_referencia ||
      input?.fecha_vto_poliza ||
      input?.fecha_vencimiento ||
      null;
  }

  if (!fechaRef) return null;

  const v = dayjs(fechaRef).startOf("day");
  if (!v.isValid()) return null;

  // vto - hoy: positivo si en el futuro, negativo si pasó
  return v.diff(today(), "day");
}

/* ═══════════════════════════════════════════════════════════════════
   6. ESTILOS VISUALES (BADGES, TONOS, COLORES)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Clases Tailwind para el badge de estado de una cuota.
 */
const BADGE_CLASSES = {
  pagada: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  vencida: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  vence_hoy: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
  por_vencer: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30",
  pendiente: "bg-gray-500/15 text-gray-300 ring-1 ring-gray-500/30",
};

const BADGE_LABELS = {
  pagada: "Pagada",
  vencida: "Vencida",
  vence_hoy: "Vence hoy",
  por_vencer: "Por vencer",
  pendiente: "Pendiente",
};

/**
 * Devuelve las clases CSS completas para renderizar un badge.
 * Uso: <span className={getBadgeClasses(estado)}>{getBadgeLabel(estado)}</span>
 */
export function getBadgeClasses(estado) {
  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold";
  const variant = BADGE_CLASSES[estado] || BADGE_CLASSES.pendiente;
  return `${base} ${variant}`;
}

export function getBadgeLabel(estado) {
  return BADGE_LABELS[estado] || BADGE_LABELS.pendiente;
}

/**
 * Tono de urgencia según los días faltantes para vencer.
 * Usado en Renovaciones para colorear cards y chips.
 *
 *   < 0  → red    (vencida)
 *   0    → yellow (vence hoy)
 *   1-3  → yellow (urgente)
 *   4-7  → blue   (próximo)
 *   > 7  → neutral
 */
export function getTonoUrgencia(dias) {
  if (dias == null || Number.isNaN(Number(dias))) return "neutral";
  const n = Number(dias);
  if (n < 0) return "red";
  if (n === 0) return "yellow";
  if (n <= 3) return "yellow";
  if (n <= 7) return "blue";
  return "neutral";
}

/* ═══════════════════════════════════════════════════════════════════
   7. FORMATEO
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Formatea una fecha como DD/MM/YYYY.
 * Acepta dayjs, Date, string o null.
 */
export function fmtFecha(d) {
  if (!d) return "—";
  const x = dayjs.isDayjs ? (dayjs.isDayjs(d) ? d : dayjs(d)) : dayjs(d);
  return x && x.isValid && x.isValid() ? x.format("DD/MM/YYYY") : "—";
}

/**
 * Formatea un número como moneda ARS sin decimales.
 */
export function fmtMoney(n) {
  if (n == null || n === "") return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return String(n);
  }
}

/**
 * Devuelve un texto humanizado para una cantidad de días.
 *   -5 → "Hace 5 días"
 *    0 → "Hoy"
 *    1 → "Mañana"
 *    5 → "En 5 días"
 *  null → "—"
 */
export function fmtDiasRelativos(dias) {
  if (dias == null) return "—";
  const n = Number(dias);
  if (n < 0) return `Hace ${Math.abs(n)} día${Math.abs(n) === 1 ? "" : "s"}`;
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  return `En ${n} días`;
}