// src/components/polizas/PolizaTable.jsx
import React, { useMemo, memo } from "react";
import { FaBuilding } from "react-icons/fa";
import { HiChevronRight } from "react-icons/hi";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Badge from "../ui/Badge";
import Boton3D from "../ui/Boton3D";

/* ---------------- Helpers ---------------- */
function toIntOrNaN(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function diffDays(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}
function normalizeEstadoCuotasKey(raw) {
  return (raw || "").toString().trim().toLowerCase() || "";
}

// Corta un texto a N caracteres y agrega "..." si se pasa.
function recortar(texto, n = 5) {
  const s = String(texto || "").trim();
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}...` : s;
}

// 🔢 Número de póliza para MOSTRAR:
// Los números viejos autogenerados eran tipo "SN-20260802231214-7001" (larguísimo).
// Para esos mostramos solo la parte final (7001). Los números nuevos cortos (1001)
// y los de compañía (123456/2026) se muestran tal cual.
function numeroCorto(numero) {
  const s = String(numero || "").trim();
  if (!s) return "-";
  if (/^SN-/i.test(s)) {
    const partes = s.split("-").filter(Boolean);
    return partes[partes.length - 1] || s; // último tramo, ej: "7001"
  }
  return s;
}

// Estado de cuotas (pago) → { label, tono (duo) }
const CUOTAS_META = {
  al_dia:     { label: "AL DÍA",            tono: "verde" },
  por_vencer: { label: "POR VENCER",        tono: "amarillo" },
  vence_hoy:  { label: "VENCE HOY",         tono: "amarillo" },
  vencida_7:  { label: "VENCIDA (7 días)",  tono: "rojo" },
  vencida_30: { label: "VENCIDA (30 días)", tono: "rojo" },
  vencidas:   { label: "VENCIDAS",          tono: "rojo" },
};

// Estado de la póliza → { label, tono }
const ESTADO_TONO = {
  activa: "verde",
  vencida: "rojo",
  cancelada: "neutro",
  finalizada: "azul",
};

// Estados de póliza que MANDAN por sobre el pago (no importa si debe cuotas).
const ESTADOS_QUE_MANDAN = new Set(["finalizada", "cancelada"]);

function computeCuotasBadgeFast(poliza) {
  const keyFromBackend = normalizeEstadoCuotasKey(poliza?.estado_cuotas);
  const impagasCount = toIntOrNaN(poliza?.impagas_count ?? poliza?.impagasCount);
  const cuotasArr = Array.isArray(poliza?.cuotas) ? poliza.cuotas : null;

  const countImpagas = () => {
    if (!Number.isNaN(impagasCount)) return Math.max(0, impagasCount);
    if (!cuotasArr) return 0;
    return cuotasArr.filter((c) => !c?.pagado).length;
  };

  const impagas = countImpagas();
  let key = keyFromBackend;

  if (!key) {
    const proxRaw = poliza?.proxima_vencimiento_impaga || poliza?.proximaVencimientoImpaga || poliza?.proxima_vencimiento || null;
    if (impagas <= 0) key = "al_dia";
    else if (proxRaw) {
      const hoy = startOfDay(new Date());
      const prox = startOfDay(new Date(proxRaw));
      if (Number.isNaN(prox.getTime())) key = "vencidas";
      else {
        const d = diffDays(hoy, prox);
        if (d === 0) key = "vence_hoy";
        else if (d > 0) {
          if (d <= 7) key = "vencida_7";
          else if (d <= 30) key = "vencida_30";
          else key = "vencidas";
        } else {
          key = Math.abs(d) <= 7 ? "por_vencer" : "al_dia";
        }
      }
    } else {
      key = impagas <= 0 ? "al_dia" : "vencidas";
    }
  }

  const meta = CUOTAS_META[key] || CUOTAS_META.vencidas;
  return { key, label: meta.label, tono: meta.tono, impagas };
}

/**
 * 🎯 COLUMNA ÚNICA "ESTADO" — combina estado de póliza + estado de pago.
 * Regla: si la póliza está finalizada/cancelada/en_verificación, ese estado MANDA
 * (ya no importan los pagos). Si está activa/vencida, MANDA el estado de PAGO
 * (es lo accionable: hay que cobrar). Devuelve badge principal + línea chica debajo.
 */
function computeEstadoUnificado(poliza) {
  const estadoPol = (poliza?.estado || "").toString().toLowerCase();
  const pago = computeCuotasBadgeFast(poliza);

  // 1) Estados administrativos que mandan por sobre el pago
  if (ESTADOS_QUE_MANDAN.has(estadoPol)) {
    return {
      label: estadoPol.replace(/_/g, " ").toUpperCase(),
      tono: ESTADO_TONO[estadoPol] || "neutro",
      // Nota chica: si igual debe cuotas, lo avisamos
      sub: pago.impagas > 0 ? `${pago.impagas} impagas` : null,
    };
  }

  // 2) Activa/vencida → manda el estado de PAGO
  return {
    label: pago.label,
    tono: pago.tono,
    sub: pago.impagas > 0 ? `${pago.impagas} impagas` : "Sin deuda",
  };
}

function useEstadoUnificado(poliza) {
  return useMemo(() => computeEstadoUnificado(poliza), [poliza]);
}

/* ---------------- SortHeader ---------------- */
const SortHeader = memo(function SortHeader({ label, field, ordering, onOrderingChange, className = "" }) {
  const isActive = ordering && (ordering === field || ordering === `-${field}`);
  const dir = ordering?.startsWith("-") ? "desc" : "asc";
  const toggle = () => {
    if (!onOrderingChange) return;
    onOrderingChange(isActive && dir === "asc" ? `-${field}` : field);
  };
  return (
    <th
      className={`border-b-2 border-linea dark:border-linea-dark p-4 text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark ${onOrderingChange ? "cursor-pointer select-none hover:text-titulo dark:hover:text-titulo-dark" : ""} ${className}`}
      onClick={toggle}
    >
      <div className="flex items-center gap-1">
        {label} {onOrderingChange && <span className="text-[10px]">{isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>}
      </div>
    </th>
  );
});

/* ---------------- Celda de estado unificado (badge + sub) ---------------- */
function EstadoCell({ poliza, center = false }) {
  const est = useEstadoUnificado(poliza);
  return (
    <div className={`inline-flex flex-col gap-0.5 ${center ? "items-center" : "items-start"}`}>
      <Badge tono={est.tono} size="sm">{est.label}</Badge>
      {est.sub && (
        <span className="text-[9px] font-extrabold uppercase text-suave dark:text-suave-dark">{est.sub}</span>
      )}
    </div>
  );
}

/* ---------------- Desktop row ---------------- */
const DesktopRow = memo(function DesktopRow({ poliza, isWebAdmin }) {
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <tr className="border-b border-linea dark:border-linea-dark transition-colors hover:bg-surface dark:hover:bg-surface-dark">
      <td className="p-4">
        <Link to={`/polizas/${poliza.id}`} target="_blank" rel="noopener noreferrer" className="block text-sm font-black text-duo-azul hover:underline" title={poliza.numero_poliza || ""}>
          {numeroCorto(poliza.numero_poliza)}
        </Link>
        <div className="text-[10px] font-extrabold uppercase text-suave dark:text-suave-dark" title={poliza.compania || "S/C"}>
          {recortar(poliza.compania, 5) || "S/C"}
        </div>
      </td>

      <td className="p-4">
        <Link to={`/clientes/${poliza.cliente?.id}`} className="inline-block text-sm font-bold text-duo-azul underline underline-offset-2 decoration-duo-azul/40 hover:decoration-duo-azul">
          {clienteNombre || "-"}
        </Link>
      </td>

      {isWebAdmin && (
        <td className="p-4">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight text-duo-azul">
            <FaBuilding className="text-[10px]" />
            {poliza?.oficina_nombre || "LOCAL"}
          </span>
        </td>
      )}

      <td className="p-4 font-mono text-sm font-bold text-titulo dark:text-titulo-dark">{poliza.patente || "-"}</td>

      <td className="p-4">
        <div className="text-xs font-bold text-titulo dark:text-titulo-dark">{poliza.marca}</div>
        <div className="max-w-[120px] truncate text-[10px] text-suave dark:text-suave-dark">{poliza.modelo}</div>
      </td>

      <td className="p-4 text-center">
        <EstadoCell poliza={poliza} center />
      </td>
    </tr>
  );
});

/* ---------------- Mobile card ---------------- */
const MobileCard = memo(function MobileCard({ poliza, isWebAdmin }) {
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <Link
      to={`/polizas/${poliza.id}`}
      className="block rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black text-duo-azul" title={poliza.numero_poliza || ""}>{poliza.numero_poliza ? numeroCorto(poliza.numero_poliza) : "Sin número"}</div>
          <div className="text-[10px] font-extrabold uppercase text-suave dark:text-suave-dark" title={poliza.compania || "S/C"}>
            {recortar(poliza.compania, 5) || "S/C"}
          </div>
        </div>
        <EstadoCell poliza={poliza} />
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="truncate text-sm font-bold text-titulo dark:text-titulo-dark">{clienteNombre || "Sin titular"}</div>
        <div className="text-xs text-suave dark:text-suave-dark">
          {poliza.marca} {poliza.modelo}
          {poliza.patente ? <> · <span className="font-mono uppercase text-titulo dark:text-titulo-dark">{poliza.patente}</span></> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {isWebAdmin && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tight text-duo-azul">
            <FaBuilding className="text-[10px]" /> {poliza?.oficina_nombre || "LOCAL"}
          </span>
        )}
        <HiChevronRight className="h-4 w-4 text-suave dark:text-suave-dark" />
      </div>
    </Link>
  );
});

/* ---------------- PolizaTable ---------------- */
const PolizaTable = ({
  polizas = [], status = "idle", page = 1, pageSize = 10, total = 0,
  ordering, onOrderingChange, onPageChange, onNext, onPrev,
  cursorEnabled = false, hasNext = false, hasPrev = false,
}) => {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const totalPages = useMemo(() => (cursorEnabled ? 1 : Math.ceil(total / pageSize)), [total, pageSize, cursorEnabled]);
  const isLoading = status === "loading";

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-[0_2px_0_var(--color-duo-linea)] dark:shadow-[0_2px_0_var(--color-linea-dark)]">
      {isLoading && <div className="h-1 w-full animate-pulse bg-duo-azul" />}

      {/* ===== Desktop: tabla (md+) ===== */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <SortHeader label="Póliza / Cía" field="numero_poliza" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Cliente" field="cliente__apellido" ordering={ordering} onOrderingChange={onOrderingChange} />
              {isWebAdmin && <SortHeader label="Sucursal" field="oficina__nombre" ordering={ordering} onOrderingChange={onOrderingChange} />}
              <SortHeader label="Patente" field="patente" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Vehículo" field="marca" ordering={ordering} onOrderingChange={onOrderingChange} />
              <SortHeader label="Estado" field="estado" ordering={ordering} onOrderingChange={onOrderingChange} className="text-center" />
            </tr>
          </thead>
          <tbody>
            {polizas.map((p) => (
              <DesktopRow key={p.id} poliza={p} isWebAdmin={isWebAdmin} />
            ))}
          </tbody>
        </table>
        {polizas.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-[15px] font-black text-titulo dark:text-titulo-dark">Sin pólizas para los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* ===== Mobile: tarjetas (< md) ===== */}
      <div className="space-y-3 p-3 md:hidden">
        {polizas.map((p) => (
          <MobileCard key={p.id} poliza={p} isWebAdmin={isWebAdmin} />
        ))}
        {polizas.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm font-black text-titulo dark:text-titulo-dark">Sin pólizas para los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* ===== Paginación ===== */}
      <div className="flex items-center justify-between border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-4 sm:px-6">
        <div className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">
          {cursorEnabled ? `Registros: ${polizas.length}` : `Página ${page} de ${totalPages} · Total: ${total}`}
        </div>
        <div className="flex gap-2">
          <Boton3D
            variant="blanco"
            size="sm"
            onClick={() => (cursorEnabled ? onPrev?.() : onPageChange?.(page - 1))}
            disabled={(cursorEnabled ? !hasPrev : page <= 1) || isLoading}
          >
            Anterior
          </Boton3D>
          <Boton3D
            variant="blanco"
            size="sm"
            onClick={() => (cursorEnabled ? onNext?.() : onPageChange?.(page + 1))}
            disabled={(cursorEnabled ? !hasNext : page >= totalPages) || isLoading}
          >
            Siguiente
          </Boton3D>
        </div>
      </div>
    </div>
  );
};

export default PolizaTable;