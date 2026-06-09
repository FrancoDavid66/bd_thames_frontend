// src/components/renovaciones/Renovacionestable.jsx
//
// Tabla simple de renovaciones (sin animaciones ni efectos).
// Columnas: Patente · Compañía · Asegurado · Vto · Estado · Acciones
//
// Botones HTML normales con onClick directo (sin Framer Motion), para que
// los clicks respondan siempre.

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
// Una fila
// ─────────────────────────────────────────────────────────
function RenovacionRow({
  p,
  submitting,
  onRenovar,
  onMarcarNoRenueva,
  onDesmarcarNoRenueva,
  onVerificar,
  onDesVerificar,
}) {
  const verificada = !!p?.renovacion_verificada;
  const descartada = !!p?.renovacion_descartada;
  const motivo = p?.renovacion_descartada_motivo;
  const motivoLabel = MOTIVO_LABEL[motivo] || motivo || "";
  const detalle = p?.renovacion_descartada_detalle || "";

  const rowClass = cx(
    "border-t border-white/5 transition-colors border-l-[3px]",
    descartada
      ? "border-l-rose-500 bg-rose-500/[0.06] hover:bg-rose-500/[0.10]"
      : verificada
      ? "border-l-amber-500 bg-amber-500/[0.05] hover:bg-amber-500/[0.09]"
      : "border-l-transparent hover:bg-sky-500/[0.06]"
  );

  const textClass = descartada ? "line-through text-white/45" : "text-white/95";

  // Botón cuadrado de ícono reutilizable
  const IconBtn = ({ onClick, title, disabled, className, children }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cx(
        "inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <tr className={rowClass}>
      {/* Patente */}
      <td className={cx("px-3 py-3 font-bold tabular-nums tracking-wider", textClass)}>
        {verificada && !descartada && (
          <HiClock className="inline mr-1.5 align-middle text-amber-400 text-base" title="En seguimiento" />
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
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-bold px-2 py-0.5 w-fit">
              <HiXCircle /> No renueva
            </span>
            {motivoLabel && (
              <span className="text-[10px] text-rose-300/70" title={detalle}>
                {motivoLabel}
                {detalle ? ` · ${detalle.slice(0, 40)}${detalle.length > 40 ? "…" : ""}` : ""}
              </span>
            )}
          </div>
        ) : verificada ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold px-2 py-0.5">
            <HiClock /> En seguimiento
          </span>
        ) : (
          <span className="text-[10px] text-white/30">—</span>
        )}
      </td>

      {/* Acciones */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {descartada ? (
            <button
              type="button"
              onClick={() => onDesmarcarNoRenueva?.(p)}
              disabled={submitting}
              title="Revertir 'no renueva'"
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/85 hover:bg-white/15 transition-colors disabled:opacity-40"
            >
              <HiArrowLeft /> Revertir
            </button>
          ) : (
            <>
              {/* Renovar (principal, con texto) */}
              <button
                type="button"
                onClick={() => onRenovar?.(p)}
                disabled={submitting}
                title="Renovar póliza"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 hover:bg-emerald-500/30 hover:border-emerald-400/60 transition-colors disabled:opacity-40"
              >
                <HiRefresh /> Renovar
              </button>

              {/* Seguimiento (toggle) */}
              <IconBtn
                onClick={() => (verificada ? onDesVerificar?.(p) : onVerificar?.(p))}
                disabled={submitting}
                title={verificada ? "Quitar de seguimiento" : "Marcar en seguimiento"}
                className={
                  verificada
                    ? "border-amber-400/60 bg-amber-500/30 text-amber-100 hover:bg-amber-500/40"
                    : "border-white/20 bg-white/8 text-white/80 hover:bg-white/15 hover:border-white/35"
                }
              >
                <HiClock />
              </IconBtn>

              {/* No renovar */}
              <IconBtn
                onClick={() => onMarcarNoRenueva?.(p)}
                disabled={submitting}
                title="Marcar que no va a renovar"
                className="border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400/60"
              >
                <HiX />
              </IconBtn>

              {/* Ver detalle */}
              <a
                href={`/polizas/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver detalle (nueva pestaña)"
                aria-label="Ver detalle"
                className={cx(
                  "inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors",
                  "border-sky-400/40 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 hover:border-sky-400/60",
                  submitting && "pointer-events-none opacity-40"
                )}
              >
                <HiEye />
              </a>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────
export default function Renovacionestable({
  items = [],
  loading = false,
  submitting = false,
  tab = "renovar_hoy",
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
      renovar_hoy: { icon: "🎉", text: "No hay pólizas que venzan hoy." },
      en_3_dias: { icon: "🎉", text: "Nada vence en los próximos 3 días." },
      vencidas: { icon: "✅", text: "No tenés pólizas sin renovar." },
    }[tab] || { icon: "—", text: "Sin resultados." };

    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <div className="text-4xl mb-2">{empty.icon}</div>
        <p className="text-sm text-white/60">{empty.text}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-slate-900/60 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] border-b border-white/10">
            <tr>
              {["Patente", "Compañía", "Asegurado", "Vto", "Estado"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-white/50"
                >
                  {h}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <RenovacionRow
                key={p.id}
                p={p}
                submitting={submitting}
                onRenovar={onRenovar}
                onMarcarNoRenueva={onMarcarNoRenueva}
                onDesmarcarNoRenueva={onDesmarcarNoRenueva}
                onVerificar={onVerificar}
                onDesVerificar={onDesVerificar}
              />
            ))}
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