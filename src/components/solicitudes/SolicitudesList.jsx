// src/components/solicitudes/SolicitudesList.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  HiDocumentText,
  HiShieldCheck,
  HiClock,
  HiCollection,
  HiCheckCircle,
  HiXCircle,
  HiTrash,
  HiAdjustments,
  HiCheck,
} from "react-icons/hi";

/* UX / motion */
import { MotionList, MotionListItem } from "../../ux/motion/MotionList";
import { pressable, listItem } from "../../ux/motion/variants";
// (Se elimina SwipeCard para evitar acciones de swipe)

/** Formatea fecha ISO a dd/mm/yyyy hh:mm */
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/* ESTADOS — colores oscuros, alto contraste */
const ESTILO_ESTADO = {
  BORRADOR: "bg-white/10 text-white",
  EN_REVISION: "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30",
  VIGENTE_24H: "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30",
  VENCIDA: "bg-rose-500/20 text-rose-100 border border-rose-400/30",
  CONVERTIDA: "bg-cyan-500/20 text-cyan-100 border border-cyan-400/30",
  CANCELADA: "bg-white/10 text-white/70",
  TERMINADA: "bg-white/10 text-white/70",
};

const ESTADO_LABEL = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  VIGENTE_24H: "Constancia 12 h vigente",
  CONVERTIDA: "Convertida a póliza",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  TERMINADA: "Terminada",
};

function EstadoBadge({ estado }) {
  const cls = ESTILO_ESTADO[estado] || "bg-white/10 text-white/80";
  const label = ESTADO_LABEL[estado] || estado || "-";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[12px] md:text-[11px] rounded-lg ${cls}`}>
      <span className="inline-block h-2 w-2 rounded-full bg-current/80" />
      {label}
    </span>
  );
}

function Chip({ children, icon: Icon }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] md:text-[11px] rounded-lg bg-white/10 text-white/80 border border-white/10">
      {Icon ? <Icon className="opacity-80 text-base md:text-sm" /> : null}
      {children}
    </span>
  );
}

/* ===== LISTA ===== */
export default function SolicitudesList({
  items = [],
  loading = false,
  refreshing = false,
  onEliminar,
  onRefrescar,
  onToggleTarea, // Si viene, los toggles ejecutan callback; si no, quedan “inertes”
  onTerminar,    // NUEVO: callback para terminar solicitud
  enableSwipe = false, // 🔒 deshabilitado por requerimiento
}) {
  const prefersReducedMotion = useReducedMotion();

  const content = useMemo(() => {
    if (loading && !refreshing) return <SkeletonList />;
    if (!items?.length) {
      return (
        <div className="mt-8 grid place-items-center text-center text-white/70">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-8">
            <p className="text-sm md:text-base">No hay solicitudes para mostrar.</p>
            <motion.button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 px-4 py-3 md:px-4 md:py-2.5 text-white text-sm md:text=[13px]"
              onClick={() => onRefrescar?.()}
              variants={pressable}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              Recargar
            </motion.button>
          </div>
        </div>
      );
    }

    return (
      <MotionList
        as="div"
        className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-5"
      >
        {items.map((s) => {
          return (
            <MotionListItem as="div" key={s.id} className="min-w-0" variants={listItem}>
              <SolicitudCard
                s={s}
                onEliminar={onEliminar}
                onToggleTarea={onToggleTarea}
                onTerminar={onTerminar}
              />
            </MotionListItem>
          );
        })}
      </MotionList>
    );
  }, [
    items,
    loading,
    refreshing,
    onEliminar,
    onRefrescar,
    onToggleTarea,
    onTerminar,
    enableSwipe,
    prefersReducedMotion,
  ]);

  return (
    <div className="relative">
      {refreshing ? (
        <div className="absolute -top-2 left-0 right-0 h-0.5 overflow-hidden">
          <div className="h-full w-full bg-white/30 animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>
      ) : null}
      {content}
    </div>
  );
}

/* ===== TARJETA ===== */
function SolicitudCard({
  s,
  onEliminar,
  onToggleTarea,
  onTerminar,
}) {
  const [highlight, setHighlight] = useState(false);
  const anchorId = String(s?.id ?? "");
  const vence = s?.fin ? fmtDate(s.fin) : null;

  // Normalizamos tareas (visuales; si no viene callback quedan sin acción)
  const tareas = {
    alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
    enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
  };
  const total = 2;
  const hechas = (tareas.alta_compania ? 1 : 0) + (tareas.enviar_poliza ? 1 : 0);
  const pct = Math.round((hechas / total) * 100);

  // Resalta si la URL trae #id
  useEffect(() => {
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) return;
    const match = hash === anchorId || hash === `sol-${anchorId}`;
    if (match) {
      setHighlight(true);
      const t = setTimeout(() => setHighlight(false), 1800);
      return () => clearTimeout(t);
    }
  }, [anchorId]);

  const Toggle = ({ k, label, done }) => (
    <motion.button
      type="button"
      onClick={() => onToggleTarea?.(s, k, !done)}
      className={`group w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
        done
          ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-100"
          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
      }`}
      variants={pressable}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      title={label}
      aria-disabled={!onToggleTarea}
    >
      <span
        className={`inline-grid place-items-center h-5 w-5 rounded-md border ${
          done
            ? "bg-emerald-500 border-emerald-400 text-black"
            : "bg-transparent border-white/30 text-white/70"
        }`}
      >
        {done ? <HiCheck /> : null}
      </span>
      <span className="text-[13px]">{label}</span>
    </motion.button>
  );

  const puedeEliminar = s && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s.estado);
  const puedeTerminar = typeof onTerminar === "function" && s?.estado !== "TERMINADA" && tareas.alta_compania && tareas.enviar_poliza;

  return (
    <div
      id={anchorId}
      data-anchor={`sol-${anchorId}`}
      className={`
        rounded-2xl border bg-white/[0.06]
        p-4 sm:p-5 text-white transition
        min-h-[232px] md:min-h-[248px]
        ${highlight ? "border-amber-300 ring-2 ring-amber-300/50" : "border-white/12 hover:border-white/20"}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <EstadoBadge estado={s?.estado || "BORRADOR"} />
            <Chip icon={HiCollection}>#{s?.codigo || s?.id}</Chip>
            {s?.poliza_fase ? <Chip icon={HiShieldCheck}>Póliza: {s.poliza_fase}</Chip> : null}
            {s?.cliente_estado ? (
              <Chip icon={s.cliente_estado === "COMPLETO" ? HiCheckCircle : HiXCircle}>
                Cliente: {s.cliente_estado}
              </Chip>
            ) : null}
          </div>

          <div className="mt-2 text-[13px] md:text-sm text-white/85 truncate">
            {s?.cliente_nombre || "—"} · {s?.vehiculo_marca || ""} {s?.vehiculo_modelo || ""}{" "}
            {s?.vehiculo_anio || ""} · {s?.vehiculo_patente || ""}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:gap-2 text-[12.5px] md:text-xs text-white/75">
        <div className="flex items-center gap-2 min-w-0">
          <HiAdjustments className="opacity-80" />
          <span className="truncate">
            <b>Motivo:</b> {s?.motivo || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <HiDocumentText className="opacity-80" />
          <span className="truncate">
            <b>Cobertura:</b> {s?.cobertura_solicitada || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <HiShieldCheck className="opacity-80" />
          <span className="truncate">
            <b>Compañía:</b> {s?.compania_preferida || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <HiClock className="opacity-80" />
          <span className="truncate">
            <b>Creado:</b> {fmtDate(s?.creado_en)}
          </span>
        </div>
        {s?.estado === "VIGENTE_24H" ? (
          <div className="flex items-center gap-2 col-span-2">
            <HiClock className="opacity-80" />
            <span className="truncate">
              <b>Vence:</b> {vence}
            </span>
          </div>
        ) : null}
      </div>

      {/* Checklist de tareas pendientes */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/70">Tareas pendientes</span>
          <span className="text-xs text-white/70">{hechas}/{total} completadas</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Toggle k="alta_compania" label="Dar de alta en compañía" done={tareas.alta_compania} />
          <Toggle k="enviar_poliza" label="Enviar póliza al cliente" done={tareas.enviar_poliza} />
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {puedeTerminar ? (
          <MotionBtn onClick={() => onTerminar?.(s)} tone="ok" title="Marcar como terminada">
            <HiCheck className="text-lg md:text-base" /> Marcar terminada
          </MotionBtn>
        ) : (
          <div className="hidden sm:block" />
        )}
        <MotionBtn onClick={() => onEliminar?.(s)} tone="danger" title="Eliminar solicitud">
          <HiTrash className="text-lg md:text-base" /> Eliminar
        </MotionBtn>
      </div>
    </div>
  );
}

/* Botón — dark sólido, mayor touch target (≥44px) */
function MotionBtn({ children, onClick, title, tone = "neutral" }) {
  const palettes = {
    ok: "bg-emerald-600/20 text-emerald-100 border border-emerald-500/30 hover:bg-emerald-600/30",
    danger: "bg-rose-600/20 text-rose-100 border border-rose-500/30 hover:bg-rose-600/30",
    neutral:
      "bg-white/10 text-white border border-white/10 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-[13px] md:text-[13px] px-4 py-3 md:px-3 md:py-2 h-12 md:h-10 ${palettes[tone]}`}
      title={title}
      variants={pressable}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.button>
  );
}

/* Skeletons — dark y más grandes en mobile */
function SkeletonList() {
  const arr = Array.from({ length: 6 });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-5">
      {arr.map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 sm:p-5 animate-pulse min-h-[232px] md:min-h-[248px]"
        >
          <div className="h-5 w-1/3 bg-white/10 rounded mb-3" />
          <div className="h-4 w-2/3 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3 md:gap-2">
            <div className="h-4 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded" />
            <div className="h-4 bg-white/10 rounded" />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="h-9 bg-white/10 rounded-lg" />
            <div className="h-9 bg-white/10 rounded-lg" />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="h-12 bg-white/10 rounded-lg" />
            <div className="h-12 bg-white/10 rounded-lg" />
            <div className="h-12 bg-white/10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
