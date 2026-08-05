// src/components/bajas/BajasTable.jsx
import { memo } from "react";
import { Link } from "react-router-dom";
import {
  HiSortAscending,
  HiSortDescending,
  HiExternalLink,
  HiDuplicate,
} from "react-icons/hi";
import toast from "react-hot-toast";

import Badge from "../ui/Badge";

// --- Helpers ---
function pickFirst(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

// 🔢 Número de póliza para MOSTRAR: solo los últimos 4 dígitos.
// Ej: "POL-99123456" → "…3456". Números muy cortos se muestran tal cual.
// El número completo queda en el title (se ve al pasar el mouse).
function numeroCorto(numero) {
  const s = String(numero || "").trim();
  if (!s) return "S/N";
  if (s.length <= 4) return s;
  return `…${s.slice(-4)}`;
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

  // 🔗 id del cliente para armar el link a su ficha (si viene en los datos)
  const clienteId = c?.id ?? p?.cliente_id ?? p?.clienteId ?? null;

  return { nombre: nombreCompleto || "Asegurado desconocido", dni, tel, clienteId };
}

// Estado de baja → tono del Badge Duo. ENVIADA/REALIZADA = "dada de baja" (verde).
const BajaStatusBadge = memo(({ status }) => {
  const s = String(status || "PENDIENTE_ENVIO");
  const config = {
    PENDIENTE_ENVIO: { label: "Pendiente", tono: "amarillo" },
    ENVIADA:         { label: "Dada de baja", tono: "verde" },
    REALIZADA:       { label: "Dada de baja", tono: "verde" },
  };
  const current = config[s] || { label: s, tono: "neutro" };
  return <Badge tono={current.tono} size="sm">{current.label}</Badge>;
});

// Nombre del asegurado: link azul subrayado (igual que la tabla de Pólizas) si
// hay id de cliente; si no, texto plano (para no linkear a /clientes/undefined).
const NombreAsegurado = ({ nombre, clienteId }) => {
  if (clienteId) {
    return (
      <Link
        to={`/clientes/${clienteId}`}
        className="inline-block text-[15px] font-bold text-duo-azul underline underline-offset-2 decoration-duo-azul/40 hover:decoration-duo-azul truncate max-w-full"
        title={nombre}
      >
        {nombre}
      </Link>
    );
  }
  return (
    <span className="block font-black text-[15px] text-titulo dark:text-titulo-dark truncate" title={nombre}>
      {nombre}
    </span>
  );
};

// Encabezado de columna clickeable (ordena). Muestra flechita según el sort activo.
const SortableHead = ({ label, columnKey, sortConfig, onSort, className = "" }) => {
  const active = sortConfig?.key === columnKey;
  return (
    <button
      type="button"
      onClick={() => onSort?.(columnKey)}
      className={`flex items-center gap-1 uppercase tracking-wide hover:text-duo-azul transition-colors ${className}`}
    >
      {label}
      {active ? (
        sortConfig.direction === "asc"
          ? <HiSortAscending className="text-duo-azul" />
          : <HiSortDescending className="text-duo-azul" />
      ) : (
        <span className="w-3 h-3 opacity-0" />
      )}
    </button>
  );
};

function BajasTable({
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

  return (
    <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden">
      {/* Header (solo desktop) */}
      <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-surface dark:bg-surface-dark text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-widest border-b-2 border-linea dark:border-linea-dark">
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
            onChange={(e) => onSelectAllVisible?.(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-duo-azul"
          />
        </div>
        <SortableHead label="Asegurado" columnKey="_clienteNombre" sortConfig={sortConfig} onSort={onSort} className="col-span-4" />
        <SortableHead label="Póliza / Patente" columnKey="numero_poliza" sortConfig={sortConfig} onSort={onSort} className="col-span-3" />
        <SortableHead label="Mora" columnKey="_diasMora" sortConfig={sortConfig} onSort={onSort} className="col-span-2" />
        <div className="col-span-2 text-right">Estado</div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-[15px] font-black text-titulo dark:text-titulo-dark">No se encontraron pólizas para procesar.</p>
        </div>
      ) : (
        <div className="divide-y divide-linea dark:divide-linea-dark">
          {rows.map((p) => {
            const { nombre, clienteId } = resolveAsegurado(p);
            const isSelected = sel.has(String(p.id));
            const estado = p?._bajaStatus || p?.baja_estado || "PENDIENTE_ENVIO";

            return (
              <div
                key={p.id}
                className={`grid grid-cols-2 lg:grid-cols-12 gap-x-3 gap-y-3 px-5 py-4 items-center transition-colors ${
                  isSelected ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]" : "hover:bg-surface dark:hover:bg-surface-dark"
                }`}
              >
                {/* Check */}
                <div className="lg:col-span-1 flex items-center justify-start lg:justify-center order-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(p.id)}
                    className="w-5 h-5 cursor-pointer accent-duo-azul"
                  />
                </div>

                {/* Asegurado (link) + Compañía */}
                <div className="lg:col-span-4 min-w-0 order-3 lg:order-2 col-span-2">
                  <NombreAsegurado nombre={nombre} clienteId={clienteId} />
                  <div className="text-[11px] text-suave dark:text-suave-dark font-bold truncate mt-0.5">{p?.compania || "—"}</div>
                </div>

                {/* Póliza (últimos 4) / Patente */}
                <div className="lg:col-span-3 min-w-0 order-4 lg:order-3">
                  <div className="font-mono text-sm font-black text-titulo dark:text-titulo-dark truncate" title={p?.numero_poliza || ""}>
                    {numeroCorto(p?.numero_poliza)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 group/pat">
                    <span className="text-[12px] font-black text-duo-azul uppercase bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 rounded-lg tracking-wider">
                      {p?.patente || "—"}
                    </span>
                    <button
                      onClick={() => handleCopyPatente(p?.patente)}
                      className="p-1 rounded text-suave hover:text-duo-azul transition-all lg:opacity-0 lg:group-hover/pat:opacity-100"
                      title="Copiar patente"
                    >
                      <HiDuplicate size={14} />
                    </button>
                  </div>
                </div>

                {/* Mora (grande = dato clave) */}
                <div className="lg:col-span-2 order-2 lg:order-4 flex flex-col items-end lg:items-start">
                  <span className="text-2xl font-black text-duo-rojo leading-none">{p?._diasMora ?? 0}</span>
                  <span className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wide mt-0.5">días de mora</span>
                </div>

                {/* Estado + Ver ficha */}
                <div className="lg:col-span-2 flex flex-col items-end gap-2 order-5 col-span-2">
                  <BajaStatusBadge status={estado} />
                  <a
                    href={`/polizas/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-sm font-black text-duo-azul hover:brightness-95 transition-all"
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

export default memo(BajasTable);