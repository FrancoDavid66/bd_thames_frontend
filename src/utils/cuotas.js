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
 * 🎯 Fecha LÍMITE de pago de una cuota = cuándo hay que pagarla para no quedar descubierto.
 *
 * Las cuotas se pagan POR ADELANTADO: cada cuota cubre desde el vto de la cuota
 * ANTERIOR hasta su propio vto. Por eso la fecha en que hay que PAGAR una cuota
 * es el vto de la cuota anterior (fin de cobertura de la anterior), NO su vto propio.
 *
 *   - Cuota #1 (no hay anterior) → su propio vto.
 *   - Cuota #N → vto de la cuota #(N-1).
 *
 * Prioridad de fuentes:
 *   1) cuota.fecha_limite_pago (si el backend algún día la manda ya calculada)
 *   2) vto de la cuota anterior (si se pasa el array de cuotas de la póliza)
 *   3) vto propio de la cuota (fallback si no hay contexto)
 *
 * @param {object} cuota
 * @param {Array} [todasLasCuotas] - cuotas de la póliza (se ordenan por cuota_nro)
 * @returns {dayjs.Dayjs|null}
 */
export function fechaLimitePago(cuota, todasLasCuotas = null) {
  // 1) Si el backend ya la mandó calculada por cuota, la usamos.
  if (cuota?.fecha_limite_pago) {
    const f = dayjs(cuota.fecha_limite_pago).startOf("day");
    if (f.isValid()) return f;
  }

  const propioVto = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;

  // 2) Sin array de cuotas no podemos ver la anterior → usamos el vto propio.
  if (!Array.isArray(todasLasCuotas) || todasLasCuotas.length === 0) return propioVto;

  const ordenadas = [...todasLasCuotas].sort(
    (a, b) => Number(a?.cuota_nro || 0) - Number(b?.cuota_nro || 0)
  );
  let i = ordenadas.findIndex((c) => c?.id != null && c?.id === cuota?.id);
  if (i < 0) i = ordenadas.findIndex((c) => Number(c?.cuota_nro || 0) === Number(cuota?.cuota_nro || 0));

  if (i > 0) {
    const anterior = ordenadas[i - 1];
    const vtoAnterior = anterior?.fecha_vencimiento
      ? dayjs(anterior.fecha_vencimiento).startOf("day")
      : null;
    if (vtoAnterior) return vtoAnterior;
  }
  // Cuota #1 o no se encontró la anterior → vto propio.
  return propioVto;
}

/**
 * Devuelve el estado actual de una cuota según su FECHA LÍMITE DE PAGO
 * (el vto de la cuota anterior; ver fechaLimitePago). NO usa el vto propio,
 * porque eso marcaba la mora ~1 mes tarde.
 *
 * Pasá `todasLasCuotas` (las cuotas de la póliza) para que calcule bien.
 * Sin ese array, cae al vto propio (comportamiento viejo, compatible).
 *
 *   - pagada: c.pagado === true
 *   - vencida: fecha límite de pago < hoy
 *   - vence_hoy: fecha límite de pago === hoy
 *   - por_vencer: fecha límite de pago > hoy
 *   - pendiente: no se pudo determinar una fecha válida
 */
export function getEstadoCuota(cuota, todasLasCuotas = null) {
  if (!cuota) return ESTADO_CUOTA.PENDIENTE;
  if (cuota.pagado) return ESTADO_CUOTA.PAGADA;

  const v = fechaLimitePago(cuota, todasLasCuotas);
  if (!v || !v.isValid()) return ESTADO_CUOTA.PENDIENTE;

  const diff = v.diff(today(), "day");
  if (diff < 0) return ESTADO_CUOTA.VENCIDA;
  if (diff === 0) return ESTADO_CUOTA.VENCE_HOY;
  return ESTADO_CUOTA.POR_VENCER;
}

/**
 * Días hasta la FECHA LÍMITE DE PAGO (negativo si ya se pasó, 0 si es hoy).
 * Pasá `todasLasCuotas` para que use la fecha correcta (vto de la anterior).
 */
export function diasHastaVencimiento(cuota, todasLasCuotas = null) {
  const v = fechaLimitePago(cuota, todasLasCuotas);
  if (!v || !v.isValid()) return null;
  return v.diff(today(), "day");
}

/* ═══════════════════════════════════════════════════════════════════
   4. COBERTURA DE UNA CUOTA
   ═══════════════════════════════════════════════════════════════════ */

/**
 * 🎯 Calcula qué período de tiempo cubre una cuota.
 *
 * MODELO DE NEGOCIO (corregido):
 * ──────────────────────────────
 * Las cuotas se pagan POR ADELANTADO.
 * Cuando alguien paga la cuota #1, está pagando la cobertura del mes que viene.
 * Cuando se acerca el vencimiento de la #1, debe pagar la #2 para seguir cubierto.
 *
 * Por eso, cada cuota cubre DESDE el vencimiento anterior HASTA su propio vencimiento.
 * - Cuota #1 → cubre desde fecha_emision hasta fecha_vencimiento de la #1
 * - Cuota #2 → cubre desde vto #1 hasta vto #2
 * - Cuota #N → cubre desde vto #(N-1) hasta vto #N
 *
 * REGLAS:
 * ──────
 *   A) Cuota #1 PAGADA → cubre del alta hasta su vencimiento
 *   B) Cuota #1 IMPAGA → sin cobertura desde el alta (la póliza no arrancó)
 *
 *   C) Cuota #N (N>1) PAGADA en término → cubre del vto anterior a su vto
 *   D) Cuota #N PAGADA con atraso → cubre desde (fecha_pago + 2 días hábiles)
 *      hasta su vencimiento (la cuota se "activa" tarde)
 *
 *   E) Cuota #N (N>1) IMPAGA, pero la anterior está paga →
 *      la cobertura SE ACABÓ en el vencimiento anterior (que es el inicio de
 *      esta cuota impaga)
 *
 *   F) Cuota #N (N>1) IMPAGA y la anterior TAMBIÉN impaga →
 *      sin cobertura desde el vto anterior (que es cuando se cortó por la anterior)
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
  const fvAnterior = cuotaAnterior?.fecha_vencimiento
    ? dayjs(cuotaAnterior.fecha_vencimiento).startOf("day")
    : null;

  const emision = polizaFechaEmision ? dayjs(polizaFechaEmision).startOf("day") : null;
  const pagoAtrasado = cuota?.pagado && fp && fv ? fp.isAfter(fv) : false;

  // Punto de inicio "natural" de esta cuota:
  //   - cuota #1 → fecha de emisión de la póliza
  //   - cuota #N → vencimiento de la cuota anterior
  const inicioPeriodo = idx === 0 ? emision : fvAnterior;

  // ─── CASO 1: Cuota PAGADA ───
  if (cuota?.pagado) {
    // 1a) Pagada con atraso → cobertura activa desde (pago + 2 días hábiles)
    //                          hasta su propio vencimiento
    if (pagoAtrasado) {
      const desde = fp ? sumarDiasHabiles(fechaPago, 2) : null;
      return { tipo: "atrasado", desde, hasta: fv };
    }

    // 1b) Pagada en término → cubre del inicio del período hasta su vencimiento
    return { tipo: "ok", desde: inicioPeriodo || fv, hasta: fv };
  }

  // ─── CASO 2: Cuota IMPAGA ───
  // Acá viene el cambio importante: NO siempre es "sin cobertura".
  // Hay que mirar si la cuota anterior estaba paga.

  // 2a) Cuota #1 impaga → la póliza nunca arrancó, sin cobertura desde la emisión
  if (idx === 0) {
    return { tipo: "sin_cobertura", desde: emision || fv, hasta: null };
  }

  // 2b) Cuota #N (N>1) impaga, pero la ANTERIOR está paga
  //     → la cobertura DURÓ hasta el vencimiento anterior, ahí se cortó
  //     → mostramos "sin cobertura DESDE vto anterior"
  if (cuotaAnterior?.pagado) {
    return { tipo: "sin_cobertura", desde: fvAnterior || fv, hasta: null };
  }

  // 2c) Cuota #N impaga y la anterior también impaga
  //     → sin cobertura desde hace más tiempo (desde el inicio de la anterior, o más)
  //     → para no romper la UI, mostramos desde el inicio de esta cuota
  return { tipo: "sin_cobertura", desde: inicioPeriodo || fv, hasta: null };
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
    (c) => !c?.pagado && getEstadoCuota(c, rows) === ESTADO_CUOTA.VENCIDA
  ).length;
  const venceHoy = rows.filter(
    (c) => !c?.pagado && getEstadoCuota(c, rows) === ESTADO_CUOTA.VENCE_HOY
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
 * 🎯 Devuelve la cuota IMPAGA MÁS ANTIGUA que YA VENCIÓ.
 *
 * Esta es la cuota que define cuánto tiempo lleva en mora la póliza.
 * Ejemplo: si el cliente tiene cuotas 3 y 4 impagas (cuota 3 venció hace
 * 34 días, cuota 4 hace 4 días), la deuda real arranca en la cuota 3.
 *
 * @returns la cuota impaga vencida más antigua, o null si todas están
 *          pagas o las impagas son futuras.
 */
export function getCuotaImpagaMasAntigua(cuotas = []) {
  const rows = Array.isArray(cuotas) ? cuotas : [];
  const hoy = today();
  const impagasVencidas = rows
    .filter((c) => !c?.pagado)
    .map((c) => ({ c, lim: fechaLimitePago(c, rows) }))
    .filter(({ lim }) => lim && lim.diff(hoy, "day") < 0)
    .sort((a, b) => a.lim.valueOf() - b.lim.valueOf());

  return impagasVencidas[0]?.c || null;
}

/**
 * 🎯 ÚNICA fuente de verdad: días que una póliza lleva vencida.
 *
 * REGLA: días_vencida = hoy − fecha_vencimiento_cuota_impaga_más_antigua
 *
 *   - Si NO tiene cuotas impagas vencidas → devuelve 0
 *   - Si la cuota impaga más antigua venció HACE N DÍAS → devuelve N
 *
 * Ejemplo: cliente con cuota 3 impaga (venció 15/04, hace 34 días)
 *          y cuota 4 impaga (venció 15/05, hace 4 días) → devuelve 34.
 *
 * Acepta:
 *   - una póliza con .cuotas[]  → toma la cuota impaga más antigua vencida
 *   - una póliza con campos planos del backend
 *     (proxima_vencimiento_impaga, min_vto_impaga, etc → mismo concepto)
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
 * REGLA: días_para_vencer = vto_cuota_impaga_más_antigua − hoy  (con signo)
 *
 *   - POSITIVO (+5)  → faltan 5 días para que venza la primera impaga
 *                       (sólo aplica si NO hay impagas vencidas; toma la
 *                        próxima a vencer en ese caso)
 *   - CERO (0)       → vence hoy
 *   - NEGATIVO (-3)  → la cuota impaga más antigua venció hace 3 días
 *   - null           → no se pudo determinar
 *
 * Acepta los mismos inputs que getDiasVencida.
 *
 * @returns {number|null}
 */
export function getDiasParaVencer(input) {
  if (!input) return null;

  // Resolver fecha de referencia
  let fechaRef = null;

  // Caso 1: viene una fecha directamente
  if (typeof input === "string" || input instanceof Date || dayjs.isDayjs(input)) {
    fechaRef = input;
  }
  // Caso 2: viene una póliza con cuotas[] cargadas
  else if (Array.isArray(input?.cuotas) && input.cuotas.length > 0) {
    // a) Primero buscamos la impaga MÁS ANTIGUA cuya fecha LÍMITE de pago ya pasó.
    const masAntiguaVencida = getCuotaImpagaMasAntigua(input.cuotas);
    if (masAntiguaVencida) {
      const lim = fechaLimitePago(masAntiguaVencida, input.cuotas);
      fechaRef = lim || masAntiguaVencida.fecha_vencimiento;
    } else {
      // b) Si no hay impagas vencidas, tomamos la próxima a vencer (por fecha límite de pago).
      const proxima = getProximaCuota(input.cuotas);
      const lim = proxima ? fechaLimitePago(proxima, input.cuotas) : null;
      fechaRef = lim || proxima?.fecha_vencimiento || null;
    }
  }
  // Caso 3: viene una póliza con campos planos del backend
  if (!fechaRef && typeof input === "object") {
    fechaRef =
      input?.proxima_vencimiento_impaga ||   // ← cuota IMPAGA más antigua (backend la nombra así)
      input?.min_vto_impaga ||                // ← idem (campo de kpis.py)
      input?.ultima_vencimiento_impaga ||
      input?.ultima_cuota_vencimiento ||
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