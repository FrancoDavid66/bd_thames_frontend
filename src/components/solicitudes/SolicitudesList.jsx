// src/components/solicitudes/SolicitudesList.jsx
import { memo, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  HiShieldCheck,
  HiTrash,
  HiCheck,
  HiExternalLink,
  HiOfficeBuilding,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";

import CardDuo from "../ui/CardDuo";
import Badge from "../ui/Badge";

/* ── Oficinas: ahora llegan por prop desde la página (backend). ── */
function buildOficinaResolver(oficinas = []) {
  const byId = new Map(oficinas.map((o) => [String(o.id), o.nombre]));
  const byName = new Map(oficinas.map((o) => [String(o.nombre).toLowerCase(), o.nombre]));
  return function getOficinaNombre(valor) {
    if (!valor) return null;
    if (typeof valor === "object") return valor.nombre || valor.id || null;
    const raw = String(valor).trim();
    if (!raw) return null;
    return byId.get(raw) || byName.get(raw.toLowerCase()) || raw;
  };
}

/* ── Fecha ── */
const DATE_FMT = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : DATE_FMT.format(d);
}

/* ── Estado → tono + label ── */
const ESTADO_TONO = {
  BORRADOR: "neutro",
  EN_REVISION: "amarillo",
  VIGENTE_24H: "verde",
  VENCIDA: "rojo",
  CONVERTIDA: "azul",
  CANCELADA: "neutro",
  TERMINADA: "verde",
};
const ESTADO_LABEL = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  VIGENTE_24H: "Vigente",
  CONVERTIDA: "Convertida",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  TERMINADA: "Terminada",
};

/* ── Carga progresiva ── */
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

/* ═══════════ LISTA ═══════════ */
export default function SolicitudesList({
  items = [],
  loading = false,
  oficinas = [],
  onEliminar,
  onTerminar,
}) {
  const getOficinaNombre = useMemo(() => buildOficinaResolver(oficinas), [oficinas]);

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
  }, [items, highlightId, getOficinaNombre]);

  const visibles = useProgressive(rows, rows.length > 24);

  if (loading && !rows.length) return <SkeletonList />;

  if (!rows.length) {
    return (
      <div className="grid place-items-center text-center py-16">
        <HiShieldCheck className="w-14 h-14 text-suave dark:text-suave-dark mb-3" />
        <p className="text-titulo dark:text-titulo-dark font-black">No hay solicitudes acá</p>
        <p className="text-suave dark:text-suave-dark text-[13px] font-bold mt-1">
          Probá con otro filtro o creá una nueva.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {visibles.map((row) => (
          <motion.div
            key={row.s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            layout
          >
            <SolicitudCard row={row} onEliminar={onEliminar} onTerminar={onTerminar} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ TARJETA ═══════════ */
const SolicitudCard = memo(function SolicitudCard({ row, onEliminar, onTerminar }) {
  const { s, oficinaLabel, creado, isHighlighted } = row;
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const idDelCliente =
    s?.cliente_id ||
    s?.clienteId ||
    s?.cliente?.id ||
    s?.poliza?.cliente_id ||
    s?.poliza?.cliente?.id ||
    (typeof s?.cliente !== "object" && s?.cliente ? s.cliente : null);
  const rutaCliente = idDelCliente ? `/clientes/${idDelCliente}` : `/clientes`;
  const idDePoliza = s?.poliza_id || s?.polizaId || s?.poliza?.id || null;

  const terminada = s?.estado === "TERMINADA";
  const puedeEliminar = isWebAdmin && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s?.estado);
  const puedeTerminar = typeof onTerminar === "function" && !terminada;

  const iniciales =
    (s?.cliente_nombre || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <CardDuo
      id={String(s?.id ?? "")}
      className={`p-4 ${isHighlighted ? "!border-duo-amarillo ring-2 ring-duo-amarillo/40" : ""}`}
    >
      {/* Fila principal */}
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
            terminada
              ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
              : "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
          }`}
        >
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          {idDelCliente ? (
            <Link
              to={rutaCliente}
              className="font-black text-[15px] text-titulo dark:text-titulo-dark hover:text-duo-azul transition-colors truncate block"
            >
              {s?.cliente_nombre || "Cliente sin nombre"}
            </Link>
          ) : (
            <span className="font-black text-[15px] text-titulo dark:text-titulo-dark truncate block">
              {s?.cliente_nombre || "Cliente sin nombre"}
            </span>
          )}
          <p className="text-[12px] font-bold text-suave dark:text-suave-dark truncate">
            {[s?.vehiculo_marca, s?.vehiculo_modelo].filter(Boolean).join(" ") || "Vehículo"}
            {s?.vehiculo_patente && (
              <>
                {" · "}
                <span className="uppercase font-mono font-black text-titulo dark:text-titulo-dark">
                  {s.vehiculo_patente}
                </span>
              </>
            )}
          </p>
        </div>
        <Badge tono={ESTADO_TONO[s?.estado] || "neutro"} size="sm">
          {ESTADO_LABEL[s?.estado] || s?.estado || "-"}
        </Badge>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t-2 border-linea dark:border-linea-dark flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold text-suave dark:text-suave-dark truncate flex items-center gap-1.5">
          {isWebAdmin && oficinaLabel && (
            <>
              <HiOfficeBuilding className="shrink-0" /> {oficinaLabel} ·
            </>
          )}{" "}
          {creado}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {idDePoliza ? (
            <Link
              to={`/polizas/${idDePoliza}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo text-[11px] font-black uppercase tracking-wide hover:brightness-105 transition"
            >
              Póliza <HiExternalLink />
            </Link>
          ) : idDelCliente ? (
            <Link
              to={rutaCliente}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark text-suave dark:text-suave-dark text-[11px] font-black uppercase tracking-wide hover:text-titulo dark:hover:text-titulo-dark transition"
            >
              Ver <HiExternalLink />
            </Link>
          ) : null}
          {puedeTerminar && (
            <button
              onClick={() => onTerminar?.(s)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde hover:brightness-105 active:scale-90 transition"
              title="Finalizar"
            >
              <HiCheck />
            </button>
          )}
          {isWebAdmin && (
            <button
              onClick={() => onEliminar?.(s)}
              disabled={!puedeEliminar}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo hover:brightness-105 active:scale-90 transition disabled:opacity-25"
              title="Eliminar"
            >
              <HiTrash />
            </button>
          )}
        </div>
      </div>
    </CardDuo>
  );
});

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 animate-pulse h-24"
        />
      ))}
    </div>
  );
}