// src/components/polizas/CuotaInfoCard.jsx
//
// 🎯 COMPONENTE REUTILIZABLE PARA MOSTRAR UNA CUOTA
// ─────────────────────────────────────────────────
// Esta tarjeta es la fuente VISUAL única para mostrar una cuota en TODA la app.
// Toda la lógica de cálculo viene de src/utils/cuotas.js (no se duplica nada).
//
// Diseño "Opción A": frase humana arriba, fecha de referencia abajo.
//
// Estados que muestra:
//   - PAGADA en término    → verde "Pagada hace X días" + cobertura activa
//   - PAGADA con atraso    → naranja "Pagada con atraso" + cobertura reactivada
//   - VENCIDA sin pagar    → rojo "Vencida hace X días" + sin cobertura
//   - VENCE HOY            → naranja "Vence hoy" + cubierta por ahora
//   - POR VENCER           → amarillo "Vence en X días" + cubierta por ahora
//
// Uso típico:
//   <CuotaInfoCard
//     cuota={cuota}
//     todasLasCuotas={poliza.cuotas}
//     idx={i}
//     polizaFechaEmision={poliza.fecha_emision}
//     onMarcarPagada={(c) => ...}
//     variant="full"   // "full" | "compact" | "mini"
//   />

import { useMemo } from "react";
import dayjs from "dayjs";
import {
  HiCalendar,
  HiShieldCheck,
  HiExclamation,
  HiCheck,
  HiClock,
  HiRefresh,
  HiPencil,
} from "react-icons/hi";

import {
  getEstadoCuota,
  calcCobertura,
  diasHastaVencimiento,
  fmtFecha,
  fmtMoney,
  fmtDiasRelativos,
  ESTADO_CUOTA,
} from "../../utils/cuotas";


/* ═══════════════════════════════════════════════════════════════════
   HELPERS INTERNOS DE PRESENTACIÓN
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Construye la "frase humana" para el estado de la cuota.
 * Esta es la clave de la Opción A: el dato grande es una FRASE,
 * la fecha es el dato chico de referencia.
 */
function buildFraseEstado(cuota, estado, todasLasCuotas = []) {
  const dias = diasHastaVencimiento(cuota, todasLasCuotas);
  const fechaPagoReal = cuota?.pago_registrado_en || cuota?.fecha_pago;
  const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
  const fp = fechaPagoReal ? dayjs(fechaPagoReal).startOf("day") : null;

  // ── PAGADA ──
  if (estado === ESTADO_CUOTA.PAGADA) {
    const pagoAtrasado = fp && fv && fp.isAfter(fv);

    if (pagoAtrasado) {
      const diasAtraso = fp.diff(fv, "day");
      return {
        titulo: fmtFecha(fechaPagoReal),
        subtitulo: `Pagada con ${diasAtraso} día${diasAtraso === 1 ? "" : "s"} de atraso`,
        tono: "warning", // naranja
      };
    }

    // Pagada en término
    const diasDesdePago = fp ? dayjs().startOf("day").diff(fp, "day") : null;
    let subtitulo;
    if (diasDesdePago == null) {
      subtitulo = "Pagada en término";
    } else if (diasDesdePago === 0) {
      subtitulo = "Pagada hoy";
    } else if (diasDesdePago === 1) {
      subtitulo = "Pagada ayer";
    } else {
      subtitulo = `Pagada hace ${diasDesdePago} días`;
    }

    return {
      titulo: fmtFecha(fechaPagoReal),
      subtitulo,
      tono: "success", // verde
    };
  }

  // ── VENCIDA ──
  if (estado === ESTADO_CUOTA.VENCIDA) {
    return {
      titulo: fmtFecha(cuota?.fecha_vencimiento),
      subtitulo: `Vencida ${fmtDiasRelativos(dias).toLowerCase()}`,
      tono: "danger", // rojo
    };
  }

  // ── VENCE HOY ──
  if (estado === ESTADO_CUOTA.VENCE_HOY) {
    return {
      titulo: fmtFecha(cuota?.fecha_vencimiento),
      subtitulo: "Vence hoy",
      tono: "warning", // naranja
    };
  }

  // ── POR VENCER ──
  if (estado === ESTADO_CUOTA.POR_VENCER) {
    const subtitulo = dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
    return {
      titulo: fmtFecha(cuota?.fecha_vencimiento),
      subtitulo,
      tono: dias <= 3 ? "warning" : "neutral",
    };
  }

  // ── PENDIENTE (sin fecha válida) ──
  return {
    titulo: "Sin fecha",
    subtitulo: "Pendiente",
    tono: "neutral",
  };
}


/**
 * Construye la "frase humana" para la cobertura.
 */
function buildFraseCobertura(cobertura, estado, cuota) {
  // ── SIN COBERTURA: SOLO si la cuota está impaga Y YA VENCIÓ ──
  if (cobertura.tipo === "sin_cobertura") {
    // Si todavía NO venció (por vencer / vence hoy), la cobertura sigue activa
    // hasta su vencimiento. NO está "sin cobertura" todavía.
    if (estado === ESTADO_CUOTA.POR_VENCER || estado === ESTADO_CUOTA.VENCE_HOY) {
      return {
        titulo: `Hasta el ${fmtFecha(cuota?.fecha_vencimiento)}`,
        subtitulo: estado === ESTADO_CUOTA.VENCE_HOY
          ? "Cubierta hasta hoy (vence)"
          : "Cubierta hasta su vencimiento",
        tono: estado === ESTADO_CUOTA.VENCE_HOY ? "warning" : "success",
      };
    }

    // Impaga Y vencida → ahora sí, sin cobertura real
    const diasSinCobertura = cobertura.desde
      ? dayjs().startOf("day").diff(cobertura.desde, "day")
      : null;

    let subtitulo;
    if (diasSinCobertura == null || diasSinCobertura < 0) {
      subtitulo = `Desde el ${fmtFecha(cobertura.desde)}`;
    } else if (diasSinCobertura === 0) {
      subtitulo = `Desde hoy (${fmtFecha(cobertura.desde)})`;
    } else {
      subtitulo = `Desde el ${fmtFecha(cobertura.desde)} · hace ${diasSinCobertura} día${diasSinCobertura === 1 ? "" : "s"}`;
    }

    return {
      titulo: "Sin cobertura",
      subtitulo,
      tono: "danger",
    };
  }

  // ── PAGADA CON ATRASO (cobertura reactivada) ──
  if (cobertura.tipo === "atrasado") {
    return {
      titulo: `${fmtFecha(cobertura.desde)} → ${fmtFecha(cobertura.hasta)}`,
      subtitulo: "Cobertura reactivada (pago tardío)",
      tono: "warning",
    };
  }

  // ── PAGADA EN TÉRMINO (cobertura normal) ──
  // Si la cuota está pagada → ya cubrió ese mes (pasado)
  if (estado === ESTADO_CUOTA.PAGADA) {
    const d = cobertura.desde;
    const h = cobertura.hasta;
    const mismaFecha = d && h && dayjs(d).isSame(dayjs(h), "day");
    return {
      titulo: (!d || mismaFecha) ? `Hasta el ${fmtFecha(h)}` : `${fmtFecha(d)} → ${fmtFecha(h)}`,
      subtitulo: "Cubrió este período",
      tono: "success",
    };
  }

  // ── POR VENCER / VENCE HOY (cuota futura no pagada pero con cobertura activa hasta su vto) ──
  return {
    titulo: `Hasta el ${fmtFecha(cobertura.hasta)}`,
    subtitulo: "Cubierta hasta su vencimiento",
    tono: "success",
  };
}


/**
 * Clases CSS según el tono semántico.
 */
const TONO_STYLES = {
  success: {
    bg: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
    border: "border-duo-verde/30",
    title: "text-duo-verde-sombra dark:text-duo-verde",
    subtitle: "text-duo-verde-sombra/70 dark:text-duo-verde/70",
    iconColor: "text-duo-verde",
  },
  warning: {
    bg: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]",
    border: "border-duo-amarillo/30",
    title: "text-duo-amarillo-sombra dark:text-duo-amarillo",
    subtitle: "text-duo-amarillo-sombra/80 dark:text-duo-amarillo/80",
    iconColor: "text-duo-amarillo-sombra dark:text-duo-amarillo",
  },
  danger: {
    bg: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]",
    border: "border-duo-rojo/30",
    title: "text-duo-rojo",
    subtitle: "text-duo-rojo/80",
    iconColor: "text-duo-rojo",
  },
  neutral: {
    bg: "bg-surface dark:bg-surface-dark",
    border: "border-linea dark:border-linea-dark",
    title: "text-titulo dark:text-titulo-dark",
    subtitle: "text-suave dark:text-suave-dark",
    iconColor: "text-suave dark:text-suave-dark",
  },
};


/**
 * Devuelve el ícono apropiado según contexto.
 */
function getIcon(tipo, tono) {
  if (tipo === "estado") {
    if (tono === "success") return HiCheck;
    if (tono === "danger") return HiExclamation;
    if (tono === "warning") return HiClock;
    return HiCalendar;
  }
  // tipo === "cobertura"
  if (tono === "danger") return HiExclamation;
  return HiShieldCheck;
}


/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTE: BLOQUE DE INFO (frase humana arriba, fecha abajo)
   ═══════════════════════════════════════════════════════════════════ */
function InfoBlock({ tono, Icon, label, titulo, subtitulo, hint }) {
  const styles = TONO_STYLES[tono] || TONO_STYLES.neutral;
  return (
    <div className={`rounded-lg border ${styles.bg} ${styles.border} p-2.5`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`${styles.iconColor} text-sm`} />
        <div className={`text-[10px] uppercase tracking-wide font-bold ${styles.subtitle}`}>
          {label}
        </div>
      </div>
      <div className={`text-base font-bold ${styles.title}`}>{titulo}</div>
      {subtitulo && (
        <div className={`text-[11px] ${styles.subtitle} mt-0.5`}>{subtitulo}</div>
      )}
      {hint && (
        <div className={`text-[10px] ${styles.subtitle} mt-0.5 italic`}>{hint}</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════════ */

/**
 * @param {object} props
 * @param {object} props.cuota - La cuota a mostrar
 * @param {Array} [props.todasLasCuotas=[]] - Todas las cuotas de la póliza (para calcular cobertura)
 * @param {number} [props.idx=0] - Posición de la cuota actual en el array
 * @param {string|Date} [props.polizaFechaEmision=null] - Fecha de emisión de la póliza
 * @param {function} [props.onMarcarPagada] - Callback al marcar como pagada
 * @param {function} [props.onCambiarFecha] - Callback para abrir el modal de cambio de fecha de vencimiento
 * @param {boolean} [props.busy=false] - Si está procesando una acción
 * @param {"full"|"compact"|"mini"} [props.variant="full"] - Variante visual
 * @param {boolean} [props.showMonto=true] - Mostrar el monto
 * @param {boolean} [props.showAction=true] - Mostrar botón de acción
 */
export default function CuotaInfoCard({
  cuota,
  todasLasCuotas = [],
  idx = 0,
  polizaFechaEmision = null,
  onMarcarPagada,
  onCambiarFecha,
  busy = false,
  variant = "full",
  showMonto = true,
  showAction = true,
}) {
  // Cálculos delegados al utils unificado
  const estado = useMemo(() => getEstadoCuota(cuota, todasLasCuotas), [cuota, todasLasCuotas]);
  const cobertura = useMemo(
    () => calcCobertura(cuota, todasLasCuotas, idx, polizaFechaEmision),
    [cuota, todasLasCuotas, idx, polizaFechaEmision]
  );

  const fraseEstado = useMemo(() => buildFraseEstado(cuota, estado, todasLasCuotas), [cuota, estado, todasLasCuotas]);
  const fraseCobertura = useMemo(() => buildFraseCobertura(cobertura, estado, cuota), [cobertura, estado, cuota]);

  const IconEstado = getIcon("estado", fraseEstado.tono);
  const IconCobertura = getIcon("cobertura", fraseCobertura.tono);

  // ─── Variante MINI: solo frase de estado, sin cobertura, sin acción ───
  if (variant === "mini") {
    const styles = TONO_STYLES[fraseEstado.tono] || TONO_STYLES.neutral;
    return (
      <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${styles.bg} ${styles.border}`}>
        <IconEstado className={`${styles.iconColor} text-sm`} />
        <div className="flex flex-col">
          <div className={`text-xs font-semibold ${styles.title}`}>{fraseEstado.titulo}</div>
          <div className={`text-[10px] ${styles.subtitle}`}>{fraseEstado.subtitulo}</div>
        </div>
      </div>
    );
  }

  // ─── Variante COMPACT: estado + cobertura side by side, sin acción ni monto ───
  if (variant === "compact") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <InfoBlock
          tono={fraseCobertura.tono}
          Icon={IconCobertura}
          label="Cobertura"
          titulo={fraseCobertura.titulo}
          subtitulo={fraseCobertura.subtitulo}
        />
        <InfoBlock
          tono={fraseEstado.tono}
          Icon={IconEstado}
          label="Vencimiento"
          titulo={fraseEstado.titulo}
          subtitulo={fraseEstado.subtitulo}
        />
      </div>
    );
  }

  // ─── Variante FULL (default): tarjeta completa con número, monto, info y acción ───
  return (
    <div className="p-4 sm:p-5 bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        {/* ── Bloque 1: Número de cuota + monto ── */}
        <div className="flex flex-col gap-1 md:w-28 shrink-0">
          <div className="text-xl font-black text-titulo dark:text-titulo-dark">#{cuota?.cuota_nro}</div>
          {showMonto && (
            <div className="text-xs text-suave dark:text-suave-dark">
              <span className="text-titulo dark:text-titulo-dark font-bold">{fmtMoney(cuota?.monto ?? cuota?.importe)}</span>
            </div>
          )}
        </div>

        {/* ── Bloque 2: Fecha de pago → período de cobertura → Vencimiento ── */}
        {(() => {
          const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
          const pagada = !!cuota?.pagado;

          // Tono del box de vencimiento según el estado de la cuota
          // Verde = pagada · Naranja = vence hoy · Rojo = vencida impaga · Gris = pendiente sin vencer
          const vtoStyles = pagada
            ? TONO_STYLES.success
            : estado === ESTADO_CUOTA.VENCIDA
            ? TONO_STYLES.danger
            : estado === ESTADO_CUOTA.VENCE_HOY
            ? TONO_STYLES.warning
            : TONO_STYLES.neutral;

          const pagoStyles = pagada ? TONO_STYLES.success : TONO_STYLES.neutral;

          // Renglón sutil debajo de la fecha de vencimiento
          const diasVto = diasHastaVencimiento(cuota, todasLasCuotas);
          let vtoSubtitulo = null;
          let vtoSubAlerta = false;
          if (pagada) {
            vtoSubtitulo = "Cubierta";
          } else if (estado === ESTADO_CUOTA.VENCIDA) {
            const d = diasVto != null ? Math.abs(diasVto) : null;
            vtoSubtitulo = d != null ? `Venció hace ${d} día${d === 1 ? "" : "s"}` : "Vencida";
            vtoSubAlerta = true;
          } else if (estado === ESTADO_CUOTA.VENCE_HOY) {
            vtoSubtitulo = "Vence hoy";
          } else if (estado === ESTADO_CUOTA.POR_VENCER) {
            vtoSubtitulo = diasVto === 1 ? "Vence mañana" : `Vence en ${diasVto} días`;
          }

          return (
            <div className="flex items-stretch gap-2 flex-1 md:px-4">
              {/* Box: Fecha de pago */}
              <div className={`flex-1 rounded-lg border ${pagoStyles.bg} ${pagoStyles.border} p-2.5`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <HiCheck className={`${pagoStyles.iconColor} text-sm`} />
                  <div className={`text-[10px] uppercase tracking-wide font-bold ${pagoStyles.subtitle}`}>
                    Fecha de pago
                  </div>
                </div>
                <div className={`text-base font-bold ${pagoStyles.title}`}>
                  {pagada && fechaPago ? fmtFecha(fechaPago) : "Sin pagar"}
                </div>
              </div>

              {/* Flecha central: período de cobertura */}
              <div className="flex flex-col items-center justify-center shrink-0 px-1">
                <div className="text-[9px] uppercase tracking-wide font-bold text-suave dark:text-suave-dark text-center leading-tight mb-0.5">
                  Período de<br />cobertura
                </div>
                <div className="text-2xl text-suave dark:text-suave-dark leading-none">→</div>
              </div>

              {/* Box: Vencimiento */}
              <div className={`flex-1 rounded-lg border ${vtoStyles.bg} ${vtoStyles.border} p-2.5`}>
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <HiCalendar className={`${vtoStyles.iconColor} text-sm`} />
                    <div className={`text-[10px] uppercase tracking-wide font-bold ${vtoStyles.subtitle}`}>
                      Fin de cobertura / Vence
                    </div>
                  </div>
                  {onCambiarFecha && (
                    <button
                      type="button"
                      onClick={() => onCambiarFecha(cuota)}
                      className="text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors shrink-0"
                      title="Cambiar fecha de vencimiento"
                    >
                      <HiPencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className={`text-base font-bold ${vtoStyles.title}`}>
                  {fmtFecha(cuota?.fecha_vencimiento)}
                </div>
                {vtoSubtitulo && (
                  <div className={`text-[11px] ${vtoStyles.subtitle} mt-0.5 flex items-center gap-1`}>
                    {vtoSubAlerta && <HiExclamation className="text-xs shrink-0" />}
                    {vtoSubtitulo}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Bloque 3: Acción ── */}
        {showAction && (
          <div className="flex md:justify-end md:w-44 shrink-0">
            {cuota?.pagado ? (
              <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-2 text-xs sm:text-sm text-duo-verde-sombra dark:text-duo-verde font-black uppercase tracking-wide">
                <HiCheck className="h-4 w-4" /> Pagada
              </div>
            ) : onMarcarPagada ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onMarcarPagada(cuota)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-duo-verde hover:brightness-105 text-white px-3 py-2.5 text-xs sm:text-sm shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:top-[4px] relative top-0 disabled:opacity-60 font-black uppercase tracking-wide transition-all"
              >
                {busy ? (
                  <HiRefresh className="h-4 w-4 animate-spin" />
                ) : (
                  <HiCheck className="h-4 w-4" />
                )}
                Marcar Pagada
              </button>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}