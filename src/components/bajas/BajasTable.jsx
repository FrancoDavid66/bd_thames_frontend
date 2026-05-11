// src/components/bajas/BajasTable.jsx
import { memo } from "react";
import {
  HiSortAscending,
  HiSortDescending,
  HiChatAlt2,
  HiExternalLink,
  HiDuplicate,
  HiChevronDown,
  HiCheckCircle,
  HiPaperAirplane,
} from "react-icons/hi";
import toast from "react-hot-toast";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateStr(dateStr) {
  if (!dateStr) return "—";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function toDigits(s) { return String(s || "").replace(/[^\d]/g, ""); }

function waUrl(phoneRaw) {
  const d = toDigits(phoneRaw);
  if (!d) return "";
  let n = d;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0"))  n = n.slice(1);
  if (!n.startsWith("54")) n = `54${n}`;
  return `https://wa.me/${n}`;
}

function telUrl(phoneRaw) {
  const d = toDigits(phoneRaw);
  return d ? `tel:${d}` : "";
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function getClienteObject(p) {
  const c = p?.cliente;
  return c && typeof c === "object" ? c : null;
}

export function resolveAsegurado(p) {
  const c = getClienteObject(p);
  const nombreCompleto =
    pickFirst(
      c?.nombre_completo, c?.nombreCompleto,
      p?.cliente_nombre_completo, p?.clienteNombreCompleto,
      p?.asegurado_nombre_completo, p?.aseguradoNombreCompleto,
    ) ||
    pickFirst(
      `${pickFirst(c?.apellido, p?.cliente_apellido, p?.clienteApellido)} ${pickFirst(c?.nombre, p?.cliente_nombre, p?.clienteNombre)}`.trim()
    );
  const dni = pickFirst(c?.dni_cuit_cuil, c?.dni, p?.cliente_dni_cuit_cuil, p?.clienteDni) || "—";
  const tel = pickFirst(c?.telefono, c?.celular, c?.whatsapp, p?.cliente_telefono);
  return { nombre: nombreCompleto || "Asegurado desconocido", dni, tel };
}

// ─── Mora badge ───────────────────────────────────────────────────────────────
// El dato más urgente recibe el mayor peso visual

function MoraBadge({ dias }) {
  const d = Number(dias) || 0;
  if (d > 30) return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-rose-500/10 border border-rose-500/20">
      <span className="text-xl font-semibold tabular-nums text-rose-400 leading-none">{d}</span>
      <span className="text-[9px] text-rose-500/50 uppercase tracking-widest mt-0.5">días</span>
    </div>
  );
  if (d > 10) return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <span className="text-xl font-semibold tabular-nums text-amber-400 leading-none">{d}</span>
      <span className="text-[9px] text-amber-500/50 uppercase tracking-widest mt-0.5">días</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
      <span className="text-xl font-semibold tabular-nums text-zinc-400 leading-none">{d}</span>
      <span className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">días</span>
    </div>
  );
}

// ─── Estado pill ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  PENDIENTE_ENVIO: { label: "Pendiente", dot: "bg-amber-400",   text: "text-amber-300",   border: "border-amber-500/20",   bg: "bg-amber-500/8"   },
  ENVIADA:         { label: "Enviada",   dot: "bg-blue-400",    text: "text-blue-300",    border: "border-blue-500/20",    bg: "bg-blue-500/8"    },
  REALIZADA:       { label: "Realizada", dot: "bg-emerald-400", text: "text-emerald-300", border: "border-emerald-500/20", bg: "bg-emerald-500/8" },
};

const BajaStatusBadge = memo(({ status }) => {
  const cfg = STATUS_CFG[status] || {
    label: status || "—", dot: "bg-zinc-500",
    text: "text-zinc-400", border: "border-zinc-700/30", bg: "bg-zinc-700/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
});

// ─── Botón de acción contextual ───────────────────────────────────────────────

function ActionBtn({ onClick, icon, label, title }) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ─── Cabecera sorteable ───────────────────────────────────────────────────────

function Th({ label, sortKey, sortConfig, onSort, align = "left", width }) {
  const active = sortConfig?.key === sortKey;
  return (
    <th
      style={width ? { width } : undefined}
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`px-4 py-3.5 text-${align} ${sortKey ? "cursor-pointer select-none group" : ""}`}
    >
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${active ? "text-zinc-300" : "text-zinc-600 group-hover:text-zinc-400"}`}>
        {label}
        {sortKey && (
          active
            ? (sortConfig.direction === "asc"
                ? <HiSortAscending className="text-sm" />
                : <HiSortDescending className="text-sm" />)
            : <HiChevronDown className="text-sm text-zinc-700 group-hover:text-zinc-500 transition-colors" />
        )}
      </span>
    </th>
  );
}

// ─── Tabla ───────────────────────────────────────────────────────────────────

export default function BajasTable({
  items = [],
  selectedIds,
  sortConfig,
  onSort,
  onToggleSelect,
  onSelectAllVisible,
  onSetStatus,
}) {
  const rows = Array.isArray(items) ? items : [];
  const sel  = selectedIds || new Set();

  const allVisibleSelected  = rows.length > 0 && rows.every((p) => sel.has(String(p.id)));
  const someVisibleSelected = rows.length > 0 && rows.some((p) => sel.has(String(p.id)));

  const handleCopyPatente = (patente) => {
    if (!patente) return;
    navigator.clipboard.writeText(patente);
    toast.success(`Patente ${patente} copiada`, {
      style:     { background: "#18181b", color: "#f4f4f5", border: "1px solid #3f3f46" },
      iconTheme: { primary: "#a1a1aa", secondary: "#18181b" },
    });
  };

  const moraPromedio = rows.length
    ? Math.round(rows.reduce((acc, r) => acc + (r._diasMora || 0), 0) / rows.length)
    : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">

        {/* ── Cabecera ── */}
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/80">
            <th className="w-10 px-4 py-3.5">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                onChange={(e) => onSelectAllVisible?.(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer accent-zinc-400 rounded"
              />
            </th>
            <Th label="Asegurado"        sortKey="_clienteNombre" sortConfig={sortConfig} onSort={onSort} width="25%" />
            <Th label="Póliza · vehículo" sortKey="compania"      sortConfig={sortConfig} onSort={onSort} width="20%" />
            <Th label="Vencimiento"       sortKey="min_vto_impaga" sortConfig={sortConfig} onSort={onSort} width="16%" />
            <Th label="Estado · gestión" sortConfig={sortConfig}  onSort={onSort}         width="24%" />
            <Th label="Mora"              sortKey="_diasMora"      sortConfig={sortConfig} onSort={onSort} align="center" width="10%" />
          </tr>
        </thead>

        {/* ── Cuerpo ── */}
        <tbody className="divide-y divide-zinc-800/40">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-20 text-center">
                <p className="text-sm text-zinc-600">Sin pólizas para mostrar</p>
                <p className="text-xs text-zinc-700 mt-1">Ajustá los filtros o el umbral de días</p>
              </td>
            </tr>
          ) : (
            rows.map((p) => {
              const { nombre, dni, tel } = resolveAsegurado(p);
              const wa         = waUrl(tel);
              const isSelected = sel.has(String(p.id));
              const status     = p?._bajaStatus || "PENDIENTE_ENVIO";
              const mora       = p?._diasMora || 0;

              // Línea de urgencia a la izquierda — rápida de scanear
              const urgency =
                mora > 30 ? "border-l-2 border-l-rose-500/70" :
                mora > 10 ? "border-l-2 border-l-amber-500/40" :
                            "border-l-2 border-l-transparent";

              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${urgency} ${isSelected ? "bg-zinc-800/40" : "hover:bg-zinc-800/15"}`}
                >

                  {/* Checkbox */}
                  <td className="px-4 py-4 align-top pt-[18px]">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(p.id)}
                      className="w-3.5 h-3.5 cursor-pointer accent-zinc-400 rounded"
                    />
                  </td>

                  {/* ── Asegurado ── */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-sm font-medium text-zinc-500 shrink-0 mt-0.5">
                        {nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 leading-snug truncate" title={nombre}>
                          {nombre}
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5 tabular-nums">DNI {dni}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {wa && (
                            <a href={wa} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-emerald-400 transition-colors"
                            >
                              <HiChatAlt2 size={13} /> WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ── Póliza / vehículo ── */}
                  <td className="px-4 py-4 align-top">
                    {/* Patente — el dato de búsqueda principal */}
                    <div className="flex items-center gap-1.5 group/pat">
                      <span className="text-sm font-mono font-semibold text-zinc-100 bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 rounded-md uppercase tracking-widest">
                        {p?.patente || "—"}
                      </span>
                      {p?.patente && (
                        <button
                          onClick={() => handleCopyPatente(p.patente)}
                          className="opacity-0 group-hover/pat:opacity-100 p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/60 transition-all"
                          title="Copiar patente"
                        >
                          <HiDuplicate size={12} />
                        </button>
                      )}
                    </div>

                    {/* N° póliza */}
                    <p className="text-xs font-mono text-zinc-500 mt-1.5">
                      {p?.numero_poliza || "S/N"}
                    </p>

                    {/* Compañía */}
                    <p className="text-[11px] text-zinc-600 mt-1 truncate" title={p?.compania}>
                      {p?.compania || "—"}
                    </p>

                    {/* Sucursal si existe */}
                    {p?.oficina && (
                      <p className="text-[10px] text-zinc-700 mt-0.5 uppercase tracking-wide">
                        {typeof p.oficina === "object" ? p.oficina.nombre : p.oficina}
                      </p>
                    )}
                  </td>

                  {/* ── Vencimiento ── */}
                  <td className="px-4 py-4 align-top">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                      1ª cuota vencida
                    </p>
                    <p className={`text-sm font-medium tabular-nums ${mora > 15 ? "text-rose-400" : "text-zinc-300"}`}>
                      {formatDateStr(p?.proxima_vencimiento_impaga || p?.min_vto_impaga)}
                    </p>
                    {(p?.impagas_count || 0) > 1 && (
                      <p className="text-[11px] text-zinc-600 mt-1">
                        +{p.impagas_count - 1} cuota{p.impagas_count - 1 > 1 ? "s" : ""} sin pagar
                      </p>
                    )}
                    <a
                      href={`/polizas/${p.id}`}
                      className="inline-flex items-center gap-1 mt-3 text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors uppercase tracking-wider"
                    >
                      Ver ficha <HiExternalLink size={10} />
                    </a>
                  </td>

                  {/* ── Estado + acciones ──
                      Solo muestra la acción relevante al estado actual.
                      Evita sobrecargar con botones que no aplican.        ── */}
                  <td className="px-4 py-4 align-top">
                    <BajaStatusBadge status={status} />

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {status === "PENDIENTE_ENVIO" && (
                        <ActionBtn
                          onClick={() => onSetStatus?.(p.id, "ENVIADA")}
                          icon={<HiPaperAirplane size={11} />}
                          label="Marcar enviada"
                          title="El email a la compañía ya fue enviado"
                        />
                      )}
                      {status === "ENVIADA" && (
                        <ActionBtn
                          onClick={() => onSetStatus?.(p.id, "REALIZADA")}
                          icon={<HiCheckCircle size={11} />}
                          label="Confirmar baja"
                          title="La compañía procesó la baja"
                        />
                      )}
                    </div>

                    {/* Fecha de resolución si está realizada */}
                    {status === "REALIZADA" && p?.baja_realizada_en && (
                      <p className="text-[10px] text-zinc-700 mt-2">
                        Confirmada el {formatDateStr(p.baja_realizada_en?.slice(0, 10))}
                      </p>
                    )}
                  </td>

                  {/* ── Mora — columna más importante, al final para que
                      el borde izquierdo y este número trabajen juntos   ── */}
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-center">
                      <MoraBadge dias={mora} />
                    </div>
                  </td>

                </tr>
              );
            })
          )}
        </tbody>

        {/* ── Footer con resumen rápido ── */}
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-zinc-800/60 bg-zinc-900/60">
              <td colSpan={2} className="px-4 py-3">
                <span className="text-[11px] text-zinc-700">
                  {rows.length} póliza{rows.length !== 1 ? "s" : ""} en esta página
                </span>
              </td>
              <td colSpan={2} className="px-4 py-3">
                <div className="flex items-center gap-4">
                  {["PENDIENTE_ENVIO", "ENVIADA", "REALIZADA"].map((s) => {
                    const count = rows.filter((r) => (r._bajaStatus || "PENDIENTE_ENVIO") === s).length;
                    if (!count) return null;
                    const cfg = STATUS_CFG[s];
                    return (
                      <span key={s} className={`text-[10px] font-medium ${cfg.text}`}>
                        {count} {cfg.label.toLowerCase()}
                      </span>
                    );
                  })}
                </div>
              </td>
              <td colSpan={2} className="px-4 py-3 text-center">
                <span className="text-[11px] text-zinc-700">
                  Mora promedio: <span className="text-zinc-500 font-medium">{moraPromedio}d</span>
                </span>
              </td>
            </tr>
          </tfoot>
        )}

      </table>
    </div>
  );
}
