// src/components/bajas/BajasTable.jsx
import { HiSortAscending, HiSortDescending } from "react-icons/hi";

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

  const nombreCompleto =
    pickFirst(
      c?.nombre_completo,
      c?.nombreCompleto,
      p?.cliente_nombre_completo,
      p?.clienteNombreCompleto,
      p?.asegurado_nombre_completo,
      p?.aseguradoNombreCompleto
    ) ||
    pickFirst(
      `${pickFirst(c?.apellido, p?.cliente_apellido, p?.clienteApellido, p?.asegurado_apellido, p?.aseguradoApellido)} ${pickFirst(
        c?.nombre,
        p?.cliente_nombre,
        p?.clienteNombre,
        p?.asegurado_nombre,
        p?.aseguradoNombre
      )}`.trim()
    );

  const dni =
    pickFirst(
      c?.dni_cuit_cuil,
      c?.dni,
      p?.cliente_dni_cuit_cuil,
      p?.clienteDniCuitCuil,
      p?.cliente_dni,
      p?.clienteDni,
      p?.asegurado_dni_cuit_cuil,
      p?.aseguradoDniCuitCuil,
      p?.asegurado_dni,
      p?.aseguradoDni
    ) || "—";

  const tel = pickFirst(
    c?.telefono,
    c?.celular,
    c?.whatsapp,
    p?.cliente_telefono,
    p?.clienteTelefono,
    p?.cliente_celular,
    p?.clienteCelular,
    p?.cliente_whatsapp,
    p?.clienteWhatsapp,
    p?.asegurado_telefono,
    p?.aseguradoTelefono,
    p?.asegurado_celular,
    p?.aseguradoCelular,
    p?.asegurado_whatsapp,
    p?.aseguradoWhatsapp
  );

  const nombreFinal = nombreCompleto || "Asegurado desconocido";
  return { nombre: nombreFinal, dni, tel };
}

const STATUS_LABEL = {
  PENDIENTE_ENVIO: "Pendiente (Enviar Baja)",
  ENVIADA: "Baja Enviada",
  REALIZADA: "Baja Realizada",
};

function statusPill(status) {
  const s = String(status || "PENDIENTE_ENVIO");
  if (s === "REALIZADA") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (s === "ENVIADA") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (s === "PENDIENTE_ENVIO") return "bg-red-500/15 text-red-300 border-red-500/30";
  return "bg-white/10 text-white border-white/20";
}

export default function BajasTable({
  items = [],
  selectedIds,
  sortConfig,    // ✅ Recibido de BajasPage
  onSort,        // ✅ Recibido de BajasPage
  onToggleSelect,
  onSelectAllVisible,
  onComposeEmail,
  onSetStatus,
}) {
  const rows = Array.isArray(items) ? items : [];
  const sel = selectedIds || new Set();

  const allVisibleSelected = rows.length > 0 && rows.every((p) => sel.has(String(p.id)));
  const someVisibleSelected = rows.length > 0 && rows.some((p) => sel.has(String(p.id)));

  const handleSelectAll = (checked) => {
    onSelectAllVisible && onSelectAllVisible(checked);
  };

  const sendSingleEmail = (p) => {
    onComposeEmail && onComposeEmail([String(p.id)]);
  };

  // ✅ Mini-componente para mostrar el ícono de orden
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-10" />;
    return sortConfig.direction === 'asc' 
      ? <HiSortAscending className="text-blue-400 text-lg" /> 
      : <HiSortDescending className="text-blue-400 text-lg" />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden shadow-xl">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 text-xs font-bold text-white/70 uppercase tracking-wider">
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => {
              if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-blue-500"
            aria-label="Seleccionar todas las visibles"
          />
        </div>

        {/* ✅ ENCABEZADOS CLICKEABLES CON ICONO DE ORDEN */}
        <div 
          className="col-span-3 flex items-center gap-2 cursor-pointer hover:text-white transition-colors group"
          onClick={() => onSort('_clienteNombre')}
        >
          Asegurado / Contacto <SortIcon columnKey="_clienteNombre" />
        </div>

        <div 
          className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-white transition-colors group"
          onClick={() => onSort('compania')}
        >
          Vehículo / Póliza <SortIcon columnKey="compania" />
        </div>

        <div className="col-span-3">Estado y Acciones</div>
        
        <div className="col-span-2">Últ. Vto Impago</div>

        <div 
          className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:text-white transition-colors group"
          onClick={() => onSort('_diasMora')}
        >
          Mora <SortIcon columnKey="_diasMora" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-white/50 bg-black/10">No hay pólizas que coincidan con los filtros.</div>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map((p) => {
            const { nombre, dni, tel } = resolveAsegurado(p);
            const wa = waUrl(tel);
            const call = telUrl(tel);

            const bajaStatus = p?._bajaStatus || "PENDIENTE_ENVIO";
            const statusText = STATUS_LABEL[bajaStatus] || String(bajaStatus);
            const isSelected = sel.has(String(p.id));

            return (
              <div
                key={p.id}
                className={`grid grid-cols-12 gap-2 px-4 py-4 transition-colors ${
                  isSelected ? "bg-blue-500/10" : "bg-black/10 hover:bg-white/5"
                }`}
              >
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect && onToggleSelect(p.id)}
                    className="w-4 h-4 cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="col-span-3">
                  <div className="font-bold text-sm text-white/90 truncate" title={nombre}>
                    {nombre}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    DNI: <span className="text-white/70">{dni}</span>
                  </div>
                  {tel && (
                    <div className="flex items-center gap-3 mt-1.5">
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                          WhatsApp
                        </a>
                      )}
                      {call && (
                        <a href={call} className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                          Llamar
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="font-semibold text-sm text-white/90">{p?.numero_poliza || "S/N"}</div>
                  <div className="text-xs font-bold text-white/60 mt-0.5 tracking-wide uppercase">
                    {p?.patente || "—"}
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5 truncate" title={p?.compania}>
                    {p?.compania || "—"}
                  </div>
                  <a href={`/polizas/${p.id}`} className="text-[11px] text-blue-400 hover:text-blue-300 underline mt-1.5 inline-block transition-colors">
                    Ver Póliza
                  </a>
                </div>

                <div className="col-span-3">
                  <span className={`inline-flex px-2.5 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusPill(bajaStatus)}`}>
                    {statusText}
                  </span>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        bajaStatus === "PENDIENTE_ENVIO"
                          ? "bg-blue-600 hover:bg-blue-500 text-white"
                          : "bg-white/10 hover:bg-white/20 text-white/70"
                      }`}
                      onClick={() => sendSingleEmail(p)}
                    >
                      Excel (Único)
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        bajaStatus === "ENVIADA"
                          ? "bg-amber-500/30 text-amber-200 ring-1 ring-amber-500/50"
                          : "bg-white/5 hover:bg-white/15 text-white/50"
                      }`}
                      onClick={() => onSetStatus && onSetStatus(p.id, "ENVIADA")}
                    >
                      Marcar Enviada
                    </button>
                    <button
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        bajaStatus === "REALIZADA"
                          ? "bg-emerald-500/30 text-emerald-200 ring-1 ring-emerald-500/50"
                          : "bg-white/5 hover:bg-white/15 text-white/50"
                      }`}
                      onClick={() => onSetStatus && onSetStatus(p.id, "REALIZADA")}
                    >
                      Marcar Realizada
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-semibold text-rose-300">
                    {formatDateStr(p?.proxima_vencimiento_impaga || p?.min_vto_impaga)}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">
                    Fecha del Vto.
                  </div>
                </div>

                <div className="col-span-1 text-center">
                  <div className="text-lg font-extrabold text-rose-400">
                    {p?._diasMora ?? "0"}
                  </div>
                  <div className="text-[10px] text-white/60 font-semibold bg-rose-500/10 rounded-md py-0.5 mt-1 border border-rose-500/20 mx-auto w-12">
                    {p?.impagas_count ?? 0} ct.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}