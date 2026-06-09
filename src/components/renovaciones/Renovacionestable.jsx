// src/components/renovaciones/Renovacionestable.jsx
//
// Tabla compacta CON GAMIFICACIÓN:
//   - Animación al entrar (stagger desde arriba)
//   - Pulse verde al renovar / azul al verificar / rojo al descartar
//   - Confetti desde el botón clickeado
//   - Hover suave en filas
//   - Botones con micro-bounce al apretar
//
// Columnas: Patente · Compañía · Asegurado · Vto · Estado · Acciones (4 botones)

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import {
  HiRefresh,
  HiX,
  HiEye,
  HiXCircle,
  HiArrowLeft,
  HiClock,
} from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

const MOTIVO_LABEL = {
  CAMBIO_COMPANIA: "Cambió de compañía",
  VENDIO_AUTO: "Vendió el auto",
  NO_QUIERE: "No quiere seguir",
  NO_CONTESTA: "No contesta",
  NO_PAGO: "No pagó",
  OTRO: "Otro",
};

const MOTIVO_EMOJI = {
  CAMBIO_COMPANIA: "🏢",
  VENDIO_AUTO: "🚗",
  NO_QUIERE: "🙅",
  NO_CONTESTA: "📵",
  NO_PAGO: "💸",
  OTRO: "❓",
};

function formatFechaHora(v) {
  if (!v) return "";
  try {
    return dayjs(v).format("DD/MM/YY HH:mm");
  } catch {
    return "";
  }
}

function getVencimiento(p) {
  return (
    p?.ultima_cuota_vencimiento ||
    p?.vto_referencia ||
    p?.fecha_vencimiento ||
    p?.proxima_vencimiento_impaga ||
    null
  );
}

function formatVto(v) {
  if (!v) return "—";
  try {
    return dayjs(v).format("DD/MM/YY");
  } catch {
    return String(v);
  }
}

// Estado real de la póliza según su vencimiento (lo que importa para renovar)
function getEstadoVencimiento(p) {
  const v = getVencimiento(p);
  if (!v) return null;
  let d;
  try {
    d = dayjs(v).startOf("day").diff(dayjs().startOf("day"), "day");
  } catch {
    return null;
  }
  if (d > 3) return { label: `Vence en ${d} días`, tone: "sky" };
  if (d > 1) return { label: `Vence en ${d} días`, tone: "amber" };
  if (d === 1) return { label: "Vence mañana", tone: "amber" };
  if (d === 0) return { label: "Vence hoy", tone: "amber" };
  const abs = Math.abs(d);
  return { label: abs === 1 ? "Vencida hace 1 día" : `Vencida hace ${abs} días`, tone: "rose" };
}

function vtoToneClass(tone) {
  switch (tone) {
    case "rose":
      return "bg-rose-500/15 border-rose-400/40 text-rose-200";
    case "amber":
      return "bg-amber-500/15 border-amber-400/40 text-amber-200";
    case "sky":
      return "bg-sky-500/15 border-sky-400/40 text-sky-200";
    default:
      return "bg-white/5 border-white/15 text-white/60";
  }
}

function getNombreCompleto(cliente) {
  if (!cliente) return "—";
  const ap = cliente.apellido || "";
  const no = cliente.nombre || "";
  if (ap && no) return `${ap}, ${no}`;
  return ap || no || "—";
}

function getCompania(p) {
  return p?.compania_nombre || p?.compania || "—";
}

// ─────────────────────────────────────────────────────────
// 🎮 Hook: estado clickAnim para disparar animaciones únicas
// ─────────────────────────────────────────────────────────
function useClickPulse() {
  const [pulse, setPulse] = useState(0);
  const trigger = () => setPulse((p) => p + 1);
  return [pulse, trigger];
}

// ─────────────────────────────────────────────────────────
// 🎮 BOTÓN RENOVAR — Power-up con rotación 360 + glow verde expansivo
// ─────────────────────────────────────────────────────────
function RenovarButton({ onClick, disabled }) {
  const [pulse, trigger] = useClickPulse();

  const handleClick = (e) => {
    if (disabled) return;
    trigger();
    onClick?.(e);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title="Renovar póliza"
      whileHover={{ scale: 1.1, rotate: -8 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 15 }}
      className={cx(
        "relative inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors disabled:opacity-50 overflow-visible",
        "border-emerald-400/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 hover:border-emerald-400/60"
      )}
    >
      {/* Glow expansivo al click */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={pulse}
            initial={{ scale: 0.5, opacity: 0.9 }}
            animate={{ scale: 2.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute inset-0 rounded-lg bg-emerald-400 pointer-events-none"
            style={{ zIndex: -1 }}
          />
        )}
      </AnimatePresence>

      {/* Anillo brillante */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={`ring-${pulse}`}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-lg border-2 border-emerald-300 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Ícono con rotación 360 al click */}
      <motion.span
        animate={pulse > 0 ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        key={`icon-${pulse}`}
        className="relative z-10"
      >
        <HiRefresh />
      </motion.span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────
// 🎮 BOTÓN EN SEGUIMIENTO — Radar / Pulso ámbar concéntrico
// ─────────────────────────────────────────────────────────
function SeguimientoButton({ onClick, disabled, activo }) {
  const [pulse, trigger] = useClickPulse();

  const handleClick = (e) => {
    if (disabled) return;
    trigger();
    onClick?.(e);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={activo ? "Quitar de seguimiento" : "Marcar en seguimiento"}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cx(
        "relative inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors disabled:opacity-50 overflow-visible",
        activo
          ? "border-amber-400/60 bg-amber-500/30 text-amber-100 hover:bg-amber-500/40"
          : "border-white/20 bg-white/8 text-white/80 hover:bg-white/15 hover:border-white/35"
      )}
    >
      {/* Ondas concéntricas (radar) — 2 ondas escalonadas */}
      <AnimatePresence>
        {pulse > 0 && (
          <>
            <motion.span
              key={`wave1-${pulse}`}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-amber-400 pointer-events-none"
            />
            <motion.span
              key={`wave2-${pulse}`}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
              className="absolute inset-0 rounded-full border-2 border-amber-300 pointer-events-none"
            />
          </>
        )}
      </AnimatePresence>

      {/* Manecillas del reloj giran al click */}
      <motion.span
        animate={pulse > 0 ? { rotate: [0, 90, 180, 270, 360] } : {}}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        key={`clock-${pulse}`}
        className="relative z-10"
      >
        <HiClock />
      </motion.span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────
// 🎮 BOTÓN NO RENOVAR — Glitch / Shake + grieta
// ─────────────────────────────────────────────────────────
function NoRenovarButton({ onClick, disabled }) {
  const [pulse, trigger] = useClickPulse();

  const handleClick = (e) => {
    if (disabled) return;
    trigger();
    onClick?.(e);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title="Marcar que no va a renovar"
      whileHover={{ scale: 1.08, rotate: [0, -2, 2, -2, 0] }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      animate={
        pulse > 0
          ? { x: [0, -3, 3, -2, 2, -1, 1, 0] }
          : { x: 0 }
      }
      key={`shake-${pulse}`}
      className={cx(
        "relative inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors disabled:opacity-50 overflow-visible",
        "border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400/60"
      )}
    >
      {/* Flash de "crack" rojo */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={`flash-${pulse}`}
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 rounded-lg bg-rose-500 pointer-events-none"
            style={{ zIndex: -1 }}
          />
        )}
      </AnimatePresence>

      {/* Líneas de grieta (3 destellos que aparecen y desaparecen) */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={`crack-${pulse}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.3, times: [0, 0.5, 1] }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-full h-full text-rose-200">
              <path
                d="M12 4 L10 10 L13 12 L9 18 L14 14 L11 12 L15 6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>

      {/* Ícono X con vibración */}
      <motion.span
        animate={pulse > 0 ? { scale: [1, 1.3, 0.9, 1.1, 1] } : {}}
        transition={{ duration: 0.4 }}
        key={`x-${pulse}`}
        className="relative z-10"
      >
        <HiX />
      </motion.span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────
// 🎮 BOTÓN VER DETALLE — Portal azul que se abre
// ─────────────────────────────────────────────────────────
function VerDetalleLink({ href, disabled }) {
  const [pulse, trigger] = useClickPulse();

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    trigger();
    // No prevenir default: el link sigue su curso (target=_blank)
  };

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title="Ver detalle de la póliza (nueva pestaña)"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cx(
        "relative inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors overflow-visible",
        "border-sky-400/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 hover:border-sky-400/60",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {/* Portal: dos anillos azules concéntricos */}
      <AnimatePresence>
        {pulse > 0 && (
          <>
            <motion.span
              key={`portal1-${pulse}`}
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="absolute inset-0 rounded-lg border-2 border-sky-400 pointer-events-none"
            />
            <motion.span
              key={`portal2-${pulse}`}
              initial={{ scale: 0.5, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              className="absolute inset-0 rounded-lg bg-sky-400/30 pointer-events-none"
            />
          </>
        )}
      </AnimatePresence>

      {/* Chispazo central */}
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={`spark-${pulse}`}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute h-2 w-2 rounded-full bg-white pointer-events-none"
            style={{
              boxShadow: "0 0 12px 4px rgba(56, 189, 248, 0.9)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Ojo que se abre */}
      <motion.span
        animate={pulse > 0 ? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 0.4 }}
        key={`eye-${pulse}`}
        className="relative z-10"
      >
        <HiEye />
      </motion.span>
    </motion.a>
  );
}

// ─────────────────────────────────────────────────────────
// 🎮 Una fila con su propia animación de feedback al renovar
// 🎨 Filas con zebra striping + barra lateral de colores
// ─────────────────────────────────────────────────────────
function RenovacionRow({
  p,
  submitting,
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
  onVerificar,
  onDesVerificar,
  index,
}) {
  const rowRef = useRef(null);

  const verificada = !!p?.renovacion_verificada;
  const descartada = !!p?.renovacion_descartada;
  const motivo = p?.renovacion_descartada_motivo;
  const motivoLabel = MOTIVO_LABEL[motivo] || motivo || "";
  const motivoEmoji = MOTIVO_EMOJI[motivo] || "";
  const detalle = p?.renovacion_descartada_detalle || "";
  const descartadaEn = formatFechaHora(p?.renovacion_descartada_en);
  const estadoVto = getEstadoVencimiento(p);

  // 🎉 Wrappers — feedback sutil de luz al renovar (sin papelitos)
  const [renovandoFlash, setRenovandoFlash] = useState(false);

  const handleRenovar = (e) => {
    // 💚 Onda de luz verde que recorre la fila
    setRenovandoFlash(true);
    setTimeout(() => setRenovandoFlash(false), 800);
    onRenovar?.(p);
  };

  const handleVerificar = (e) => {
    onVerificar?.(p);
  };

  const handleDesVerificar = (e) => {
    onDesVerificar?.(p);
  };

  const handleMarcarNoRenueva = (e) => {
    onMarcarNoRenueva?.(p);
  };

  // 🎨 Clases de fondo según estado
  // - descartada → bg rosa notorio + barra rosa lateral + tachado
  // - en seguimiento → bg ámbar notorio + barra ámbar lateral
  // - zebra → alternancia clara/oscura entre filas (par/impar)
  // - hover → bg azul tenue + barra azul lateral (override del zebra)
  const isOdd = index % 2 === 1;

  const rowClass = cx(
    "transition-all group relative",
    // Barra lateral de colores (border-left)
    descartada
      ? "border-l-[3px] border-rose-500"
      : verificada
      ? "border-l-[3px] border-amber-500"
      : "border-l-[3px] border-transparent hover:border-sky-400",
    // Background según estado
    descartada
      ? "bg-rose-500/[0.08] hover:bg-rose-500/[0.12] opacity-75"
      : verificada
      ? "bg-amber-500/[0.07] hover:bg-amber-500/[0.11]"
      : isOdd
      ? "bg-white/[0.01] hover:bg-sky-500/[0.08]"
      : "bg-white/[0.04] hover:bg-sky-500/[0.08]"
  );

  const textClass = descartada ? "line-through text-white/45" : "text-white/95";

  return (
    <motion.tr
      ref={rowRef}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={
        renovandoFlash
          ? {
              opacity: 1,
              y: 0,
              backgroundColor: [
                "rgba(16, 185, 129, 0)",
                "rgba(16, 185, 129, 0.35)",
                "rgba(16, 185, 129, 0.15)",
                "rgba(16, 185, 129, 0)",
              ],
              boxShadow: [
                "inset 0 0 0 rgba(16, 185, 129, 0)",
                "inset 0 0 30px rgba(16, 185, 129, 0.6)",
                "inset 0 0 15px rgba(16, 185, 129, 0.3)",
                "inset 0 0 0 rgba(16, 185, 129, 0)",
              ],
            }
          : { opacity: 1, y: 0 }
      }
      exit={{ opacity: 0, x: 50 }}
      transition={
        renovandoFlash
          ? { duration: 0.8, ease: "easeOut" }
          : { duration: 0.25, delay: Math.min(index * 0.015, 0.3) }
      }
      className={rowClass}
    >
      {/* Patente */}
      <td className={cx("px-3 py-3 font-bold tabular-nums tracking-wider", textClass)}>
        {verificada && !descartada && (
          <motion.span
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="inline-block mr-1.5 align-middle"
          >
            <HiClock className="inline text-amber-400 text-base" title="En seguimiento" />
          </motion.span>
        )}
        {p?.patente || "—"}
      </td>

      {/* Compañía */}
      <td className={cx("px-3 py-3", textClass)}>{getCompania(p)}</td>

      {/* Asegurado */}
      <td className={cx("px-3 py-3", textClass)}>
        <div className="truncate max-w-[260px]" title={getNombreCompleto(p?.cliente)}>
          {getNombreCompleto(p?.cliente)}
        </div>
      </td>

      {/* Vto */}
      <td className={cx("px-3 py-3 text-xs tabular-nums whitespace-nowrap", textClass)}>
        {formatVto(getVencimiento(p))}
      </td>

      {/* Estado */}
      <td className="px-3 py-3">
        {descartada ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col gap-0.5"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-bold px-2 py-0.5 w-fit">
              <HiXCircle /> No renueva
            </span>
            {motivoLabel && (
              <span className="text-[10px] text-rose-300/80" title={detalle}>
                {motivoEmoji ? `${motivoEmoji} ` : ""}{motivoLabel}
                {detalle ? ` · ${detalle.slice(0, 40)}${detalle.length > 40 ? "…" : ""}` : ""}
              </span>
            )}
            {descartadaEn && (
              <span className="inline-flex items-center gap-1 text-[9px] text-rose-300/55">
                <HiClock className="text-[10px]" /> {descartadaEn} hs
              </span>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-1">
            {estadoVto ? (
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full border text-[10px] font-bold px-2 py-0.5 w-fit",
                  vtoToneClass(estadoVto.tone)
                )}
              >
                {estadoVto.label}
              </span>
            ) : (
              <span className="text-[10px] text-white/30">Sin fecha</span>
            )}
            {verificada && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold px-2 py-0.5 w-fit">
                <HiClock /> En seguimiento
              </span>
            )}
          </div>
        )}
      </td>

      {/* Acciones */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {descartada ? (
            <motion.button
              type="button"
              onClick={() => onDesmarcarNoRenueva?.(p)}
              disabled={submitting}
              title="Revertir 'no renueva'"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/85 hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              <HiArrowLeft /> Revertir
            </motion.button>
          ) : (
            <>
              {/* 🔄 Renovar — Power-up */}
              <RenovarButton onClick={handleRenovar} disabled={submitting} />

              {/* ⏱ En seguimiento — Radar */}
              <SeguimientoButton
                onClick={verificada ? handleDesVerificar : handleVerificar}
                disabled={submitting}
                activo={verificada}
              />

              {/* ✗ No renovar — Glitch */}
              <NoRenovarButton onClick={handleMarcarNoRenueva} disabled={submitting} />

              {/* 👁 Ver detalle — Portal */}
              <VerDetalleLink href={`/polizas/${p.id}`} disabled={submitting} />
            </>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ─────────────────────────────────────────────────────────
// 🎮 Componente principal
// ─────────────────────────────────────────────────────────
export default function Renovacionestable({
  items = [],
  loading = false,
  submitting = false,
  tab = "pendientes",
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
  onVerificar,
  onDesVerificar,
}) {
  if (loading && (!items || items.length === 0)) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
        <p className="mt-3 text-sm text-white/60">Cargando renovaciones…</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    const empty = {
      pendientes: { icon: "🎉", text: "¡Lista limpia! No hay pólizas pendientes." },
      renovadas: { icon: "✅", text: "Todavía no se renovó ninguna póliza en este filtro." },
      no_renovaron: { icon: "💤", text: "No hay clientes marcados como 'no renueva'." },
    }[tab] || { icon: "—", text: "Sin resultados." };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="text-4xl mb-2"
        >
          {empty.icon}
        </motion.div>
        <p className="text-sm text-white/60">{empty.text}</p>
      </motion.div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/60 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-b from-sky-500/[0.10] to-sky-500/[0.03] border-b-2 border-sky-400/25">
            <tr>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200/80">
                Patente
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200/80">
                Compañía
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200/80">
                Asegurado
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200/80">
                Vto
              </th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200/80">
                Estado
              </th>
              <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200/80">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            <AnimatePresence initial={false}>
              {items.map((p, idx) => (
                <RenovacionRow
                  key={p.id}
                  p={p}
                  index={idx}
                  submitting={submitting}
                  onRenovar={onRenovar}
                  onMarcarNoRenueva={onMarcarNoRenueva}
                  onDesmarcarNoRenueva={onDesmarcarNoRenueva}
                  onVerificar={onVerificar}
                  onDesVerificar={onDesVerificar}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Footer con conteo */}
      <div className="border-t border-white/10 bg-slate-900/80 px-3 py-2 text-[11px] text-white/55">
        Mostrando <span className="font-bold text-white/85">{items.length}</span>{" "}
        {items.length === 1 ? "póliza" : "pólizas"}
      </div>
    </div>
  );
}