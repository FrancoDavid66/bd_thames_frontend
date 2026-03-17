// src/components/solicitudes/SolicitudesList.jsx
import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
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
  HiChevronDown,
  HiExternalLink,
} from "react-icons/hi";
import toast from "react-hot-toast"; // 🚀 AGREGADO PARA AVISAR SI FALTA EL ID

// 🚀 IMPORTAMOS AUTH PARA SEGURIDAD DE ROLES
import { useAuth } from "../../context/AuthContext";

// Variants inline
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
  hover: { scale: 1.01, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  tap: { scale: 0.99 },
};

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

const progressVariants = {
  initial: { width: 0 },
  animate: { width: (pct) => `${pct}%`, transition: { duration: 0.6, ease: "easeOut" } },
};

/* ======================
    Constantes / helpers
====================== */

const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];

const OFI_BY_ID = new Map(OFICINAS.map((o) => [String(o.id), o.nombre]));
const OFI_BY_NAME = new Map(OFICINAS.map((o) => [String(o.nombre).toLowerCase(), o.nombre]));

// 🛡️ PARCHE DE ROBUSTEZ
function getOficinaNombre(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor.nombre || valor.id;

  const raw = String(valor).trim();
  if (!raw) return null;
  const byId = OFI_BY_ID.get(raw);
  if (byId) return byId;
  const rawLower = raw.toLowerCase();
  const byExact = OFI_BY_NAME.get(rawLower);
  if (byExact) return byExact;
  for (const o of OFICINAS) {
    const name = o.nombre.toLowerCase();
    if (name.includes(rawLower) || rawLower.includes(o.id) || rawLower.includes(name)) return o.nombre;
  }
  return raw;
}

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

const getCardColor = (estado) => {
  switch (estado) {
    case "EN_REVISION": return "bg-amber-500/[0.08] border-amber-500/30 hover:border-amber-500/50";
    case "VIGENTE_24H": return "bg-emerald-500/[0.08] border-emerald-500/30 hover:border-emerald-500/50";
    case "CONVERTIDA": return "bg-cyan-500/[0.08] border-cyan-500/30 hover:border-cyan-500/50";
    case "VENCIDA": return "bg-rose-500/[0.08] border-rose-500/30 hover:border-rose-500/50";
    case "TERMINADA": return "bg-emerald-900/[0.2] border-emerald-500/20 hover:border-emerald-500/40 opacity-90";
    case "CANCELADA": return "bg-white/[0.02] border-white/5 hover:border-white/10 opacity-70";
    default: return "bg-white/[0.06] border-white/10 hover:border-white/20";
  }
};

const ESTILO_ESTADO = {
  BORRADOR: "bg-white/10 text-white",
  EN_REVISION: "bg-amber-500/20 text-amber-100 border border-amber-400/30",
  VIGENTE_24H: "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30",
  VENCIDA: "bg-rose-500/20 text-rose-100 border border-rose-400/30",
  CONVERTIDA: "bg-cyan-500/20 text-cyan-100 border border-cyan-400/30",
  CANCELADA: "bg-white/10 text-white/50",
  TERMINADA: "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-[12px] rounded-lg font-medium ${cls}`}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current" />
      {label}
    </motion.span>
  );
});

const Chip = memo(function Chip({ children, icon: Icon, className = "" }) {
  return (
    <motion.span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-[12px] rounded-lg bg-black/20 text-white/80 border border-white/10 ${className}`}
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
    >
      {Icon ? <Icon className="opacity-80 text-base sm:text-sm" /> : null}
      {children}
    </motion.span>
  );
});

function useProgressive(items, enabled) {
  const [limit, setLimit] = useState(enabled ? 24 : Infinity);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!enabled) { setLimit(Infinity); return; }
    setLimit(24);
    const step = () => { setLimit((v) => Math.min(v + 24, items.length)); };
    const tick = () => { step(); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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
  onToggleTarea,
  onTerminar,
}) {
  const highlightId = useMemo(() => {
    const hash = typeof window !== "undefined" ? window.location.hash?.replace(/^#/, "") : "";
    if (!hash) return null;
    return hash.startsWith("sol-") ? hash.replace(/^sol-/, "") : hash;
  }, []);

  const prepared = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((s) => {
      const tareas = {
        alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
        enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
      };
      const hechas = (tareas.alta_compania ? 1 : 0) + (tareas.enviar_poliza ? 1 : 0);
      return {
        s, tareas, hechas, pct: Math.round((hechas / 2) * 100),
        oficinaLabel: getOficinaNombre(s?.oficina),
        creado: fmtDate(s?.creado_en),
        vence: s?.fin ? fmtDate(s.fin) : null,
        isHighlighted: highlightId ? String(s?.id ?? "") === String(highlightId) : false,
      };
    });
  }, [items, highlightId]);

  const bigList = prepared.length >= 60;
  const shown = useProgressive(prepared, bigList);

  if (loading && !refreshing) return <SkeletonList />;

  if (!items?.length) {
    return (
      <div className="mt-8 grid place-items-center text-center text-white/70">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-8">
          <p className="text-sm md:text-base">No hay solicitudes para mostrar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6" initial="initial" animate="animate">
        <AnimatePresence>
          {shown.map((row) => (
            <motion.div key={row.s.id} className="min-w-0" variants={listItem} initial="hidden" animate="visible" exit="hidden" layout>
              <SolicitudCard row={row} onEliminar={onEliminar} onToggleTarea={onToggleTarea} onTerminar={onTerminar} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {bigList && shown.length < prepared.length && (
        <div className="mt-5 flex justify-center">
          <button className="text-white/40 text-xs hover:text-white transition-colors">Cargando más solicitudes automáticamente...</button>
        </div>
      )}
    </div>
  );
}

/* ======================
        TARJETA
====================== */
const SolicitudCard = memo(function SolicitudCard({ row, onEliminar, onToggleTarea, onTerminar }) {
  const { user } = useAuth(); 
  const { s, tareas, hechas, pct, oficinaLabel, creado, vence, isHighlighted } = row;
  const [flash, setFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // 🛡️ Lógica de Seguridad
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  useEffect(() => {
    if (!isHighlighted) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [isHighlighted]);

  const toggle = useCallback((k, done) => {
    if (typeof onToggleTarea !== "function") return;
    onToggleTarea?.(s, k, !done);
  }, [onToggleTarea, s]);

  const puedeEliminar = isWebAdmin && s && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s.estado);
  const puedeTerminar = typeof onTerminar === "function" && s?.estado !== "TERMINADA" && tareas.alta_compania && tareas.enviar_poliza;

  // 🚀 BUSCAMOS EL ID DEL CLIENTE
  const idDelCliente = 
    s?.cliente_id || 
    s?.clienteId || 
    s?.cliente?.id || 
    s?.poliza?.cliente_id || 
    s?.poliza?.cliente?.id || 
    (typeof s?.cliente !== 'object' && s?.cliente ? s.cliente : null);
  
  // 🚀 SIEMPRE ARMAMOS LA RUTA AL PERFIL USANDO EL ID
  const rutaCliente = idDelCliente ? `/clientes/${idDelCliente}` : `/clientes`;

  // 🚀 BUSCAMOS EL ID DE LA PÓLIZA
  const idDePoliza = s?.poliza_id || s?.polizaId || s?.poliza?.id || null;

  return (
    <motion.div
      id={String(s?.id ?? "")}
      className={`rounded-2xl border flex flex-col p-4 sm:p-5 text-white transition-all duration-300 ${flash ? "border-amber-300 ring-2 ring-amber-300/50" : getCardColor(s?.estado)}`}
      variants={cardVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <EstadoBadge estado={s?.estado || "BORRADOR"} />
            <Chip icon={HiCollection}>#{s?.codigo || s?.id}</Chip>
            {/* 🏢 Muestra la oficina solo si es administrador para control global */}
            {isWebAdmin && oficinaLabel && (
              <Chip className="hidden sm:inline-flex bg-emerald-500/10 border-emerald-500/20 text-emerald-300 uppercase font-black text-[9px]">
                {oficinaLabel}
              </Chip>
            )}
          </div>

          {/* 🚀 ENLACE CLIENTE CON EL ID  */}
          <Link 
            to={rutaCliente} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => {
              e.stopPropagation();
              // Si le das clic y el backend no mandó el ID, te avisamos por qué no abre el perfil exacto.
              if (!idDelCliente) toast.error("El servidor no envió el ID de este cliente");
            }} 
            className="text-lg font-bold text-cyan-400 hover:text-cyan-300 hover:underline underline-offset-4 transition-all flex items-center gap-1.5 w-fit group"
          >
            {s?.cliente_nombre || "Cliente sin nombre"}
            <HiExternalLink className="opacity-70 group-hover:opacity-100 transition-opacity text-sm" />
          </Link>

          <div className="mt-2 text-sm text-white/80 flex flex-wrap items-center gap-3">
            <span className="truncate">{s?.vehiculo_marca} {s?.vehiculo_modelo} {s?.vehiculo_anio} · <span className="uppercase font-mono font-bold text-white">{s?.vehiculo_patente}</span></span>
            
            {/* 🚀 ENLACE PÓLIZA GIGANTE */}
            {idDePoliza && (
              <>
                <span className="hidden sm:inline-block text-white/30">•</span>
                <Link 
                  to={`/polizas/${idDePoliza}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="text-amber-400 hover:text-amber-300 hover:underline underline-offset-4 transition-all font-black flex items-center gap-2 group bg-amber-400/10 px-4 py-1.5 rounded-xl border border-amber-400/30 text-sm sm:text-base shadow-sm"
                >
                  Póliza #{idDePoliza} <HiExternalLink className="text-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                </Link>
              </>
            )}
          </div>
        </div>

        <motion.button onClick={() => setExpanded(!expanded)} className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white text-xs font-semibold hover:bg-black/40 transition" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <span className="hidden sm:inline">{expanded ? "Menos" : "Más"}</span>
          <HiChevronDown className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </motion.button>
      </div>

      {/* --- TAREAS --- */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Workflow de Solicitud</span>
          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">{hechas}/2 OK</span>
        </div>
        <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden mb-3">
          <motion.div className="h-full bg-emerald-500" variants={progressVariants} initial="initial" animate="animate" custom={pct} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ToggleBtn label="Alta en compañía" done={tareas.alta_compania} onClick={() => toggle("alta_compania", tareas.alta_compania)} />
          <ToggleBtn label="Envío de póliza" done={tareas.enviar_poliza} onClick={() => toggle("enviar_poliza", tareas.enviar_poliza)} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div variants={expandVariants} initial="collapsed" animate="expanded" exit="collapsed" className="overflow-hidden">
            <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-[13px] text-white/80">
              <div className="flex flex-col"><span className="text-white/40 text-[10px] font-black uppercase">Motivo</span><span>{s?.motivo || "—"}</span></div>
              <div className="flex flex-col"><span className="text-white/40 text-[10px] font-black uppercase">Cobertura</span><span>{s?.cobertura_solicitada || "—"}</span></div>
              <div className="flex flex-col"><span className="text-white/40 text-[10px] font-black uppercase">Fecha</span><span>{creado}</span></div>
              {s?.estado === "VIGENTE_24H" && <div className="flex flex-col col-span-2 text-amber-400"><span className="text-amber-400/40 text-[10px] font-black uppercase">Vence</span><span>{vence}</span></div>}

              <div className="col-span-2 mt-2 flex gap-2">
                {puedeTerminar && <MotionBtn onClick={() => onTerminar?.(s)} tone="ok"><HiCheck /> Finalizar Gestión</MotionBtn>}
                {isWebAdmin && (
                  <MotionBtn onClick={() => onEliminar?.(s)} tone="danger" disabled={!puedeEliminar}><HiTrash /> Eliminar</MotionBtn>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const ToggleBtn = memo(function ToggleBtn({ label, done, onClick, disabled }) {
  return (
    <motion.button
      type="button" onClick={onClick} disabled={disabled} variants={pressable}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${done ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"}`}
    >
      <span className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${done ? "bg-emerald-500 border-emerald-400 text-black" : "bg-black/40 border-white/20 text-transparent"}`}>
        {done && <HiCheck className="text-xs font-black" />}
      </span>
      <span className="text-xs font-bold uppercase tracking-tighter">{label}</span>
    </motion.button>
  );
});

function MotionBtn({ children, onClick, tone = "neutral", disabled }) {
  const palettes = {
    ok: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/40",
    danger: "bg-rose-600/20 text-rose-400 border-rose-500/30 hover:bg-rose-600/40",
    neutral: "bg-white/10 text-white border-white/10 hover:bg-white/20",
  };
  return (
    <motion.button
      onClick={onClick} disabled={disabled} variants={pressable}
      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-3 border transition-colors ${palettes[tone]} disabled:opacity-30`}
    >
      {children}
    </motion.button>
  );
}

function SkeletonList() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse h-60" />
      ))}
    </div>
  );
}