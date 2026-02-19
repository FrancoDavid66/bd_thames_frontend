// src/components/solicitudes/SolicitudesList.jsx
import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// Definimos variants inline para no agregar archivos externos
const pressable = {
  initial: { scale: 1, opacity: 1 },
  hover: { scale: 1.02, opacity: 0.95 },
  tap: { scale: 0.98 },
};

const listItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  hover: { scale: 1.01, boxShadow: "0 4px 20px rgba(255,255,255,0.1)" },
  tap: { scale: 0.99 },
};

const progressVariants = {
  initial: { width: 0 },
  animate: { width: (pct) => `${pct}%`, transition: { duration: 0.6, ease: "easeOut" } },
};

/* ======================
   Constantes / helpers
====================== */

// 🏢 Oficinas fijas (mismo mapa que en la Page)
const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];

// Map rápido (evita .find por card)
const OFI_BY_ID = new Map(OFICINAS.map((o) => [String(o.id), o.nombre]));
const OFI_BY_NAME = new Map(OFICINAS.map((o) => [String(o.nombre).toLowerCase(), o.nombre]));

function getOficinaNombre(valor) {
  if (valor === null || valor === undefined) return null;
  const raw = String(valor).trim();
  if (!raw) return null;

  const byId = OFI_BY_ID.get(raw);
  if (byId) return byId;

  const rawLower = raw.toLowerCase();
  const byExact = OFI_BY_NAME.get(rawLower);
  if (byExact) return byExact;

  // fallback: si viene “axion” o “(2)”
  for (const o of OFICINAS) {
    const name = o.nombre.toLowerCase();
    if (name.includes(rawLower) || rawLower.includes(o.id) || rawLower.includes(name)) return o.nombre;
  }
  return raw;
}

// Formatter único (más barato que armar strings a mano por render)
const DATE_FMT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return DATE_FMT.format(d);
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

const EstadoBadge = memo(function EstadoBadge({ estado }) {
  const cls = ESTILO_ESTADO[estado] || "bg-white/10 text-white/80";
  const label = ESTADO_LABEL[estado] || estado || "-";
  return (
    <motion.span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs sm:text-[12px] rounded-lg ${cls}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current/80" />
      {label}
    </motion.span>
  );
});

const Chip = memo(function Chip({ children, icon: Icon }) {
  return (
    <motion.span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-[12px] rounded-lg bg-white/10 text-white/80 border border-white/10"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      {Icon ? <Icon className="opacity-80 text-base sm:text-sm" /> : null}
      {children}
    </motion.span>
  );
});

// Render progresivo para listas grandes (evita “congelar”)
function useProgressive(items, enabled) {
  const [limit, setLimit] = useState(enabled ? 24 : Infinity);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setLimit(Infinity);
      return;
    }
    setLimit(24);

    const step = () => {
      setLimit((v) => {
        const next = Math.min(v + 24, items.length);
        return next;
      });
    };

    const tick = () => {
      step();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, items.length]);

  return enabled ? items.slice(0, limit) : items;
}

/* ======================
        LISTA
====================== */
export default function SolicitudesList({
  items = [],
  loading = false,
  refreshing = false,
  onEliminar,
  onRefrescar,
  onToggleTarea,
  onTerminar,
}) {
  // ✅ Hooks SIEMPRE arriba (para evitar "Rendered more hooks...")
  const highlightId = useMemo(() => {
    const hash = typeof window !== "undefined" ? window.location.hash?.replace(/^#/, "") : "";
    if (!hash) return null;
    const id = hash.startsWith("sol-") ? hash.replace(/^sol-/, "") : hash;
    return id || null;
  }, []);

  const prepared = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((s) => {
      const tareas = {
        alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
        enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
      };
      const hechas = (tareas.alta_compania ? 1 : 0) + (tareas.enviar_poliza ? 1 : 0);
      const pct = Math.round((hechas / 2) * 100);
      const oficinaLabel = getOficinaNombre(s?.oficina);
      const creado = fmtDate(s?.creado_en);
      const vence = s?.fin ? fmtDate(s.fin) : null;

      return {
        s,
        tareas,
        hechas,
        pct,
        oficinaLabel,
        creado,
        vence,
        isHighlighted: highlightId ? String(s?.id ?? "") === String(highlightId) : false,
      };
    });
  }, [items, highlightId]);

  const bigList = prepared.length >= 60;

  // ✅ custom hook SIEMPRE llamado (aunque prepared esté vacío)
  const shown = useProgressive(prepared, bigList);

  // ✅ returns DESPUÉS de hooks
  if (loading && !refreshing) return <SkeletonList />;

  if (!items?.length) {
    return (
      <div className="mt-8 grid place-items-center text-center text-white/70">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-8">
          <p className="text-sm md:text-base">No hay solicitudes para mostrar.</p>
          <motion.button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/10 px-4 py-3 md:px-4 md:py-2.5 text-white text-sm md:text-[13px]"
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
    <div className="relative">
      {refreshing ? (
        <div className="absolute -top-2 left-0 right-0 h-0.5 overflow-hidden">
          <motion.div
            className="h-full w-full bg-white/30"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      ) : null}

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        initial="initial"
        animate="animate"
      >
        <AnimatePresence>
          {shown.map((row) => (
            <motion.div
              key={row.s.id}
              className="min-w-0"
              variants={listItem}
              initial="hidden"
              animate="visible"
              exit="hidden"
              layout
            >
              <SolicitudCard row={row} onEliminar={onEliminar} onToggleTarea={onToggleTarea} onTerminar={onTerminar} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {bigList && shown.length < prepared.length ? (
        <div className="mt-5 flex justify-center">
          <motion.button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-white text-sm"
            onClick={() => {
              window.requestAnimationFrame?.(() => {});
            }}
            variants={pressable}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            title="La lista se está cargando progresivamente"
          >
            Mostrando {shown.length}/{prepared.length}…
          </motion.button>
        </div>
      ) : null}
    </div>
  );
}

/* ======================
        TARJETA
====================== */
const SolicitudCard = memo(function SolicitudCard({ row, onEliminar, onToggleTarea, onTerminar }) {
  const { s, tareas, hechas, pct, oficinaLabel, creado, vence, isHighlighted } = row;

  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!isHighlighted) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [isHighlighted]);

  const toggle = useCallback(
    (k, done) => {
      if (typeof onToggleTarea !== "function") return;
      onToggleTarea?.(s, k, !done);
    },
    [onToggleTarea, s]
  );

  const puedeEliminar = s && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s.estado);
  const puedeTerminar =
    typeof onTerminar === "function" && s?.estado !== "TERMINADA" && tareas.alta_compania && tareas.enviar_poliza;

  return (
    <motion.div
      id={String(s?.id ?? "")}
      data-anchor={`sol-${String(s?.id ?? "")}`}
      className={`
        rounded-2xl border bg-white/[0.06]
        p-4 sm:p-5 text-white transition
        ${flash ? "border-amber-300 ring-2 ring-amber-300/50" : "border-white/12 hover:border-white/20"}
      `}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <EstadoBadge estado={s?.estado || "BORRADOR"} />
            <Chip icon={HiCollection}>#{s?.codigo || s?.id}</Chip>
            {s?.poliza_fase ? <Chip icon={HiShieldCheck} className="hidden sm:inline-flex">Póliza: {s.poliza_fase}</Chip> : null}
            {s?.cliente_estado ? (
              <Chip icon={s.cliente_estado === "COMPLETO" ? HiCheckCircle : HiXCircle} className="hidden sm:inline-flex">
                Cliente: {s.cliente_estado}
              </Chip>
            ) : null}
            {oficinaLabel ? <Chip className="hidden sm:inline-flex">Oficina: {oficinaLabel}</Chip> : null}
          </div>

          <div className="mt-2 text-[13px] sm:text-sm text-white/85 truncate">
            {s?.cliente_nombre || "—"} · {s?.vehiculo_marca || ""} {s?.vehiculo_modelo || ""} {s?.vehiculo_anio || ""} ·{" "}
            {s?.vehiculo_patente || ""}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2 text-[12.5px] sm:text-xs text-white/75">
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
            <b>Creado:</b> {creado}
          </span>
        </div>
        {s?.estado === "VIGENTE_24H" ? (
          <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
            <HiClock className="opacity-80" />
            <span className="truncate">
              <b>Vence:</b> {vence || "-"}
            </span>
          </div>
        ) : null}
      </div>

      {/* Checklist de tareas */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/70">Tareas pendientes</span>
          <span className="text-xs text-white/70">
            {hechas}/2 completadas
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-400 rounded-full"
            variants={progressVariants}
            initial="initial"
            animate="animate"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ToggleBtn
            label="Dar de alta en compañía"
            done={tareas.alta_compania}
            onClick={() => toggle("alta_compania", tareas.alta_compania)}
            disabled={typeof onToggleTarea !== "function"}
          />
          <ToggleBtn
            label="Enviar póliza al cliente"
            done={tareas.enviar_poliza}
            onClick={() => toggle("enviar_poliza", tareas.enviar_poliza)}
            disabled={typeof onToggleTarea !== "function"}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {puedeTerminar ? (
          <MotionBtn onClick={() => onTerminar?.(s)} tone="ok" title="Marcar como terminada">
            <HiCheck className="text-lg sm:text-base" /> Marcar terminada
          </MotionBtn>
        ) : (
          <div className="hidden sm:block" />
        )}

        <MotionBtn
          onClick={() => {
            if (!puedeEliminar) return;
            onEliminar?.(s);
          }}
          tone="danger"
          title="Eliminar solicitud"
          disabled={!puedeEliminar}
        >
          <HiTrash className="text-lg sm:text-base" /> Eliminar
        </MotionBtn>
      </div>
    </motion.div>
  );
});

const ToggleBtn = memo(function ToggleBtn({ label, done, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
        done
          ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-100"
          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
      } disabled:opacity-60 disabled:cursor-not-allowed`}
      variants={pressable}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      title={label}
    >
      <span
        className={`inline-grid place-items-center h-5 w-5 rounded-md border ${
          done ? "bg-emerald-500 border-emerald-400 text-black" : "bg-transparent border-white/30 text-white/70"
        }`}
      >
        {done ? <HiCheck /> : null}
      </span>
      <span className="text-[13px]">{label}</span>
    </motion.button>
  );
});

/* Botón — dark sólido, mayor touch target */
function MotionBtn({ children, onClick, title, tone = "neutral", disabled }) {
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
      disabled={disabled}
      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg text-[13px] px-4 py-3 sm:px-3 sm:py-2 h-12 sm:h-10 ${
        palettes[tone]
      } disabled:opacity-50 disabled:cursor-not-allowed`}
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

function SkeletonList() {
  const arr = Array.from({ length: 6 });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {arr.map((_, i) => (
        <motion.div
          key={i}
          className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 sm:p-5 animate-pulse min-h-[232px] sm:min-h-[248px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
        >
          <div className="h-5 w-1/3 bg-white/10 rounded mb-3" />
          <div className="h-4 w-2/3 bg-white/10 rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
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
        </motion.div>
      ))}
    </div>
  );
}