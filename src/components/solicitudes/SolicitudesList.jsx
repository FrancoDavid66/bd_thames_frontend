// src/components/solicitudes/SolicitudesList.jsx
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { HiShieldCheck, HiTrash, HiCheck, HiExternalLink, HiOfficeBuilding } from "react-icons/hi";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

/* Variants */
const pressable = { initial: { scale: 1 }, hover: { scale: 1.03 }, tap: { scale: 0.95 } };
const listItem = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

/* Oficinas */
const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];
const OFI_BY_ID = new Map(OFICINAS.map((o) => [String(o.id), o.nombre]));
const OFI_BY_NAME = new Map(OFICINAS.map((o) => [String(o.nombre).toLowerCase(), o.nombre]));
function getOficinaNombre(valor) {
  if (!valor) return null;
  if (typeof valor === "object") return valor.nombre || valor.id;
  const raw = String(valor).trim();
  if (!raw) return null;
  const byId = OFI_BY_ID.get(raw);
  if (byId) return byId;
  const byExact = OFI_BY_NAME.get(raw.toLowerCase());
  if (byExact) return byExact;
  for (const o of OFICINAS) {
    const name = o.nombre.toLowerCase();
    if (name.includes(raw.toLowerCase()) || raw.toLowerCase().includes(o.id)) return o.nombre;
  }
  return raw;
}

/* Fecha */
const DATE_FMT = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : DATE_FMT.format(d);
}

/* Estado */
const ESTILO_ESTADO = {
  BORRADOR: "bg-white/10 text-white/80",
  EN_REVISION: "bg-amber-500/20 text-amber-200 border border-amber-400/30",
  VIGENTE_24H: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30",
  VENCIDA: "bg-rose-500/20 text-rose-200 border border-rose-400/30",
  CONVERTIDA: "bg-cyan-500/20 text-cyan-200 border border-cyan-400/30",
  CANCELADA: "bg-white/10 text-white/40",
  TERMINADA: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/20",
};
const ESTADO_LABEL = {
  BORRADOR: "Borrador", EN_REVISION: "En revisión", VIGENTE_24H: "Constancia vigente",
  CONVERTIDA: "Convertida", VENCIDA: "Vencida", CANCELADA: "Cancelada", TERMINADA: "Terminada",
};
function EstadoBadge({ estado }) {
  const cls = ESTILO_ESTADO[estado] || "bg-white/10 text-white/80";
  const label = ESTADO_LABEL[estado] || estado || "-";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg font-bold shrink-0 ${cls}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/* Carga progresiva */
function useProgressive(items, enabled) {
  const [limit, setLimit] = useState(enabled ? 24 : Infinity);
  useEffect(() => {
    if (!enabled) return;
    if (limit >= items.length) return;
    const t = setTimeout(() => setLimit((v) => Math.min(v + 24, items.length)), 120);
    return () => clearTimeout(t);
  }, [enabled, items.length, limit]);
  return enabled ? items.slice(0, limit) : items;
}

/* ====== LISTA ====== */
export default function SolicitudesList({
  items = [], loading = false, refreshing = false,
  onEliminar, onTerminar,
}) {
  const highlightId = useMemo(() => {
    const hash = typeof window !== "undefined" ? window.location.hash?.replace(/^#/, "") : "";
    if (!hash) return null;
    return hash.startsWith("sol-") ? hash.replace(/^sol-/, "") : hash;
  }, []);

  const rows = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    return arr.map((s) => ({
      s,
      oficinaLabel: getOficinaNombre(s?.oficina),
      creado: fmtDate(s?.creado_en),
      isHighlighted: highlightId ? String(s?.id ?? "") === String(highlightId) : false,
    }));
  }, [items, highlightId]);

  const visibles = useProgressive(rows, rows.length > 24);

  if (loading && !rows.length) return <SkeletonList />;

  if (!rows.length) {
    return (
      <div className="grid place-items-center text-center py-16">
        <HiShieldCheck className="w-12 h-12 text-white/15 mb-3" />
        <p className="text-white/50 font-bold">No hay solicitudes acá</p>
        <p className="text-white/25 text-xs mt-1">Probá con otro filtro o creá una nueva.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {visibles.map((row) => (
          <motion.div key={row.s.id} variants={listItem} initial="hidden" animate="visible" exit="hidden" layout>
            <SolicitudCard row={row} onEliminar={onEliminar} onTerminar={onTerminar} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ====== TARJETA ====== */
const SolicitudCard = memo(function SolicitudCard({ row, onEliminar, onTerminar }) {
  const { s, oficinaLabel, creado, isHighlighted } = row;
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const idDelCliente =
    s?.cliente_id || s?.clienteId || s?.cliente?.id || s?.poliza?.cliente_id ||
    s?.poliza?.cliente?.id || (typeof s?.cliente !== "object" && s?.cliente ? s.cliente : null);
  const rutaCliente = idDelCliente ? `/clientes/${idDelCliente}` : `/clientes`;
  const idDePoliza = s?.poliza_id || s?.polizaId || s?.poliza?.id || null;

  const terminada = s?.estado === "TERMINADA";
  const puedeEliminar = isWebAdmin && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s?.estado);
  const puedeTerminar = typeof onTerminar === "function" && !terminada;

  const iniciales =
    (s?.cliente_nombre || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const avatarColor = terminada ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300";

  return (
    <div
      id={String(s?.id ?? "")}
      className={`rounded-2xl border p-4 text-white transition-all ${
        isHighlighted ? "border-amber-300 ring-2 ring-amber-300/40" : "bg-white/[0.04] border-white/10 hover:border-white/20"
      }`}
    >
      {/* Fila principal */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${avatarColor}`}>
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          {idDelCliente ? (
            <Link
              to={rutaCliente}
              className="font-bold text-[15px] text-white hover:text-sky-300 transition-colors truncate block"
            >
              {s?.cliente_nombre || "Cliente sin nombre"}
            </Link>
          ) : (
            <span className="font-bold text-[15px] text-white truncate block">
              {s?.cliente_nombre || "Cliente sin nombre"}
            </span>
          )}
          <p className="text-xs text-white/50 truncate">
            {[s?.vehiculo_marca, s?.vehiculo_modelo].filter(Boolean).join(" ") || "Vehículo"}
            {s?.vehiculo_patente && <> · <span className="uppercase font-mono font-bold text-white/80">{s.vehiculo_patente}</span></>}
          </p>
        </div>
        <EstadoBadge estado={s?.estado || "BORRADOR"} />
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/35 truncate flex items-center gap-1.5">
          {isWebAdmin && oficinaLabel && <><HiOfficeBuilding className="shrink-0" /> {oficinaLabel} ·</>} {creado}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {idDePoliza ? (
            <Link to={`/polizas/${idDePoliza}`} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-bold hover:bg-amber-400/20 transition">
              Póliza <HiExternalLink />
            </Link>
          ) : idDelCliente ? (
            <Link to={rutaCliente} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[11px] font-bold hover:bg-white/10 transition">
              Ver <HiExternalLink />
            </Link>
          ) : null}
          {puedeTerminar && (
            <motion.button onClick={() => onTerminar?.(s)} variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 transition" title="Finalizar">
              <HiCheck />
            </motion.button>
          )}
          {isWebAdmin && (
            <motion.button onClick={() => onEliminar?.(s)} disabled={!puedeEliminar} variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/40 transition disabled:opacity-25" title="Eliminar">
              <HiTrash />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
});

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse h-24" />
      ))}
    </div>
  );
}