// src/components/bajas/BajasTable.jsx
import { memo } from "react";
import { 
  HiSortAscending, 
  HiSortDescending, 
  HiPhone, 
  HiChatAlt2, 
  HiExternalLink, 
  HiDuplicate 
} from "react-icons/hi";
import toast from "react-hot-toast";

// --- Helpers ---
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

  const dni = pickFirst(c?.dni_cuit_cuil, c?.dni, p?.cliente_dni_cuit_cuil, p?.clienteDni) || "—";
  const tel = pickFirst(c?.telefono, c?.celular, c?.whatsapp, p?.cliente_telefono);

  return { nombre: nombreCompleto || "Asegurado desconocido", dni, tel };
}

const BajaStatusBadge = memo(({ status }) => {
  const s = String(status || "PENDIENTE_ENVIO");
  const config = {
    PENDIENTE_ENVIO: { label: "PENDIENTE", clase: "border-rose-500/40 text-rose-300 bg-rose-500/10", dot: "bg-rose-500 animate-pulse" },
    ENVIADA: { label: "ENVIADA", clase: "border-amber-500/40 text-amber-300 bg-amber-500/10", dot: "bg-amber-500" },
    REALIZADA: { label: "REALIZADA", clase: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-500" },
  };
  const current = config[s] || { label: s, clase: "border-white/20 text-white/60 bg-white/5", dot: "bg-white/40" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${current.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
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
  onComposeEmail,
  onSetStatus,
}) {
  const rows = Array.isArray(items) ? items : [];
  const sel = selectedIds || new Set();

  const handleCopyPatente = (patente) => {
    if (!patente) return;
    navigator.clipboard.writeText(patente);
    toast.success(`Patente ${patente} copiada`, {
      style: {
        background: '#0f172a',
        color: '#f8fafc',
        border: '1px border rgba(255,255,255,0.1)'
      },
      iconTheme: {
        primary: '#38bdf8',
        secondary: '#0f172a',
      },
    });
  };

  const allVisibleSelected = rows.length > 0 && rows.every((p) => sel.has(String(p.id)));
  const someVisibleSelected = rows.length > 0 && rows.some((p) => sel.has(String(p.id)));

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-5" />;
    return sortConfig.direction === 'asc' ? <HiSortAscending className="text-sky-400" /> : <HiSortDescending className="text-sky-400" />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-md overflow-hidden shadow-2xl">
      <div className="grid grid-cols-12 gap-2 px-6 py-4 bg-white/5 text-[11px] font-bold text-white/50 uppercase tracking-widest border-b border-white/5">
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
            onChange={(e) => onSelectAllVisible?.(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-sky-500 bg-transparent border-white/20 rounded"
          />
        </div>
        <div className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => onSort('_clienteNombre')}>
          Asegurado <SortIcon columnKey="_clienteNombre" />
        </div>
        <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => onSort('compania')}>
          Póliza / Cía <SortIcon columnKey="compania" />
        </div>
        <div className="col-span-3">Gestión de Baja</div>
        <div className="col-span-2">Vencimiento</div>
        <div className="col-span-1 text-center cursor-pointer hover:text-white transition-colors" onClick={() => onSort('_diasMora')}>
          Mora <SortIcon columnKey="_diasMora" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-20 text-center text-slate-500 italic">No se encontraron pólizas para procesar.</div>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((p) => {
            const { nombre, dni, tel } = resolveAsegurado(p);
            const wa = waUrl(tel);
            const call = telUrl(tel);
            const isSelected = sel.has(String(p.id));
            const firstLetter = nombre ? nombre.charAt(0).toUpperCase() : "?";

            return (
              <div key={p.id} className={`grid grid-cols-12 gap-2 px-6 py-5 transition-all items-center ${isSelected ? "bg-sky-500/10" : "hover:bg-white/[0.03]"}`}>
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(p.id)}
                    className="w-4 h-4 cursor-pointer accent-sky-500 bg-transparent border-white/20 rounded"
                  />
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-sky-400 font-black text-sm shrink-0">
                    {firstLetter}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-100 truncate" title={nombre}>{nombre}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">DNI: {dni}</div>
                    <div className="flex gap-3 mt-1.5">
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors"><HiChatAlt2 size={16}/></a>}
                      {call && <a href={call} className="text-sky-400 hover:text-sky-300 transition-colors"><HiPhone size={15}/></a>}
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-mono text-xs font-bold text-white tracking-wider">{p?.numero_poliza || "S/N"}</div>
                  
                  <div className="flex items-center gap-2 mt-1.5 group/pat">
                    <div className="text-[13px] font-black text-sky-300 uppercase bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20 tracking-widest shadow-sm">
                      {p?.patente || "—"}
                    </div>
                    <button
                      onClick={() => handleCopyPatente(p?.patente)}
                      className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-sky-400 hover:bg-sky-400/10 transition-all opacity-0 group-hover/pat:opacity-100"
                      title="Copiar patente"
                    >
                      <HiDuplicate size={16} />
                    </button>
                  </div>

                  <div className="text-[11px] text-amber-200/70 mt-1 truncate">{p?.compania || "—"}</div>
                </div>

                <div className="col-span-3">
                  <BajaStatusBadge status={p?._bajaStatus} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button 
                      onClick={() => onComposeEmail?.([String(p.id)])}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all uppercase"
                    >
                      Excel
                    </button>
                    <button 
                      onClick={() => onSetStatus?.(p.id, "ENVIADA")}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition-all uppercase"
                    >
                      Enviada
                    </button>
                    <button 
                      onClick={() => onSetStatus?.(p.id, "REALIZADA")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase"
                    >
                      Realizada
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-xs font-bold text-rose-400/90">{formatDateStr(p?.proxima_vencimiento_impaga || p?.min_vto_impaga)}</div>
                  <a href={`/polizas/${p.id}`} className="inline-flex items-center gap-1 text-[10px] text-sky-400/70 hover:text-sky-400 mt-2 transition-colors font-bold uppercase tracking-wider">
                    Ver ficha <HiExternalLink />
                  </a>
                </div>

                <div className="col-span-1 text-center">
                  <div className="text-xl font-black text-rose-500">{p?._diasMora ?? "0"}</div>
                  <div className="text-[9px] font-black text-white/30 uppercase tracking-tighter mt-0.5">Días Mora</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}