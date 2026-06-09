// src/components/bajas/BajasTable.jsx
import { memo } from "react";
import {
  HiSortAscending,
  HiSortDescending,
  HiExternalLink,
  HiDuplicate,
} from "react-icons/hi";
import toast from "react-hot-toast";

// --- Helpers ---
function formatDateStr(dateStr) {
  if (!dateStr) return "—";
  if (String(dateStr).includes("/")) return dateStr;
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

// Fecha de la baja (ISO datetime → DD/MM/YY HH:mm)
function formatFechaBaja(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDigits(s) { return String(s || "").replace(/[^\d]/g, ""); }

function waUrl(phoneRaw) {
  const d = toDigits(phoneRaw);
  if (!d) return "";
  let n = d;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  if (!n.startsWith("54")) n = `54${n}`;
  return `https://wa.me/${n}`;
}

function telUrl(phoneRaw) {
  const d = toDigits(phoneRaw);
  if (!d) return "";
  return `tel:${d}`;
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
  const nombreCompleto = pickFirst(
    c?.nombre_completo,
    c?.nombreCompleto,
    p?.cliente_nombre_completo,
    p?.clienteNombreCompleto,
    p?.asegurado_nombre_completo,
    p?.aseguradoNombreCompleto
  ) || pickFirst(`${pickFirst(c?.apellido, p?.cliente_apellido, p?.clienteApellido)} ${pickFirst(c?.nombre, p?.cliente_nombre, p?.clienteNombre)}`.trim());

  const dni = pickFirst(c?.dni_cuit_cuil, c?.dni, p?.cliente_dni_cuit_cuil, p?.cliente_dni, p?.clienteDni) || "—";
  const tel = pickFirst(c?.telefono, c?.celular, c?.whatsapp, p?.cliente_telefono);

  return { nombre: nombreCompleto || "Asegurado desconocido", dni, tel };
}

const BajaStatusBadge = memo(({ status }) => {
  const s = String(status || "PENDIENTE_ENVIO");
  const config = {
    PENDIENTE_ENVIO: { label: "Pendiente", clase: "border-rose-500/40 text-rose-300 bg-rose-500/10" },
    ENVIADA: { label: "Dada de baja", clase: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
    REALIZADA: { label: "Dada de baja", clase: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  };
  const current = config[s] || { label: s, clase: "border-white/20 text-white/60 bg-white/5" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${current.clase}`}>
      {current.label}
    </span>
  );
});

export default function BajasTable({
  items = [],
  selectedIds,
  sortConfig,
  onSort,
  onToggleSelect,
  onSelectAllVisible,
}) {
  const rows = Array.isArray(items) ? items : [];
  const sel = selectedIds || new Set();

  const handleCopyPatente = (patente) => {
    if (!patente) return;
    navigator.clipboard.writeText(patente);
    toast.success(`Patente ${patente} copiada`);
  };

  const allVisibleSelected = rows.length > 0 && rows.every((p) => sel.has(String(p.id)));
  const someVisibleSelected = rows.length > 0 && rows.some((p) => sel.has(String(p.id)));

  const SortIcon = ({ columnKey }) => {
    if (sortConfig?.key !== columnKey) return <span className="w-3 h-3 opacity-0" />;
    return sortConfig.direction === "asc"
      ? <HiSortAscending className="text-sky-400" />
      : <HiSortDescending className="text-sky-400" />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 text-[10px] font-bold text-white/50 uppercase tracking-widest border-b border-white/10">
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
            onChange={(e) => onSelectAllVisible?.(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-sky-500"
          />
        </div>
        <div className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => onSort?.("_clienteNombre")}>
          Asegurado <SortIcon columnKey="_clienteNombre" />
        </div>
        <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => onSort?.("compania")}>
          Póliza / Cía <SortIcon columnKey="compania" />
        </div>
        <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-white transition-colors" onClick={() => onSort?.("max_vto_impaga")}>
          Vto / Mora <SortIcon columnKey="_diasMora" />
        </div>
        <div className="col-span-2">Estado / Baja</div>
        <div className="col-span-2 text-right">Acciones</div>
      </div>

      {rows.length === 0 ? (
        <div className="p-16 text-center text-slate-500 italic">No se encontraron pólizas para procesar.</div>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((p) => {
            const { nombre } = resolveAsegurado(p);
            const oficina = p?.oficina_nombre || p?.oficina || "—";
            const isSelected = sel.has(String(p.id));
            const firstLetter = nombre ? nombre.charAt(0).toUpperCase() : "?";

            const estado = p?._bajaStatus || p?.baja_estado || "PENDIENTE_ENVIO";
            const fechaBaja = formatFechaBaja(p?.baja_realizada_en) || formatFechaBaja(p?.baja_enviada_en);
            const labelFecha = "Baja";

            return (
              <div key={p.id} className={`grid grid-cols-12 gap-2 px-4 py-4 items-center transition-colors ${isSelected ? "bg-sky-500/10" : "hover:bg-white/[0.03]"}`}>
                {/* Check */}
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(p.id)}
                    className="w-4 h-4 cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Asegurado */}
                <div className="col-span-3 flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sky-400 font-bold text-sm shrink-0">
                    {firstLetter}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-100 truncate" title={nombre}>{nombre}</div>
                    <div className="text-[11px] text-slate-400 truncate" title={oficina}>Oficina: <span className="text-slate-300 font-semibold">{oficina}</span></div>
                  </div>
                </div>

                {/* Póliza / Cía */}
                <div className="col-span-2 min-w-0">
                  <div className="font-mono text-xs font-bold text-white truncate">{p?.numero_poliza || "S/N"}</div>
                  <div className="flex items-center gap-1.5 mt-1 group/pat">
                    <span className="text-[12px] font-bold text-sky-300 uppercase bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 tracking-wider">
                      {p?.patente || "—"}
                    </span>
                    <button
                      onClick={() => handleCopyPatente(p?.patente)}
                      className="p-1 rounded text-white/30 hover:text-sky-400 transition-all opacity-0 group-hover/pat:opacity-100"
                      title="Copiar patente"
                    >
                      <HiDuplicate size={14} />
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-200/70 mt-1 truncate">{p?.compania || "—"}</div>
                </div>

                {/* Vto / Mora */}
                <div className="col-span-2">
                  <div className="text-xs font-bold text-rose-400/90">
                    {formatDateStr(p?.max_vto_impaga || p?.proxima_vencimiento_impaga || p?.min_vto_impaga)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    <span className="font-bold text-rose-300">{p?._diasMora ?? 0}</span> días de mora
                  </div>
                  {p?.cuotas_impagas > 0 && (
                    <div className="text-[10px] text-slate-500">
                      {p.cuotas_impagas} cuota{p.cuotas_impagas !== 1 ? "s" : ""} sin pagar
                    </div>
                  )}
                </div>

                {/* Estado / Baja */}
                <div className="col-span-2">
                  <BajaStatusBadge status={estado} />
                  {fechaBaja && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      {labelFecha}: <span className="font-bold text-slate-300">{fechaBaja}</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="col-span-2 flex justify-end">
                  <a
                    href={`/polizas/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sm font-bold text-sky-300 hover:bg-sky-500/25 hover:text-sky-200 transition-colors"
                  >
                    Ver ficha <HiExternalLink />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}