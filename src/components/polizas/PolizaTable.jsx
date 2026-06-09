// src/components/polizas/PolizaTable.jsx
import React, { useMemo, memo } from "react";
import { FaBuilding } from "react-icons/fa";
import { HiChevronRight } from "react-icons/hi";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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

const CUOTAS_STYLES = {
  al_dia:     { label: "AL DÍA",           clase: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10" },
  por_vencer: { label: "POR VENCER",       clase: "border-amber-500/50 text-amber-300 bg-amber-500/10" },
  vence_hoy:  { label: "VENCE HOY",        clase: "border-orange-500/60 text-orange-300 bg-orange-500/10" },
  vencida_7:  { label: "VENCIDA (7 días)", clase: "border-rose-500/50 text-rose-300 bg-rose-500/10" },
  vencida_30: { label: "VENCIDA (30 días)",clase: "border-rose-500/60 text-rose-300 bg-rose-500/10" },
  vencidas:   { label: "VENCIDAS",         clase: "border-rose-500/60 text-rose-300 bg-rose-500/10" },
};

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

  const st = CUOTAS_STYLES[key] || CUOTAS_STYLES.vencidas;
  return { key, label: st.label, clase: st.clase, extra: `${impagas} impagas` };
}

function useCuotasBadge(poliza) {
  return useMemo(() => computeCuotasBadgeFast(poliza), [poliza]);
}

/* ---------------- EstadoPolizaBadge ---------------- */
const EstadoPolizaBadge = memo(function EstadoPolizaBadge({ estado }) {
  const statusStr = (estado || "desconocido").toString().toLowerCase();
  const configs = {
    activa:          { label: "ACTIVA",          clase: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10", dot: "bg-emerald-400" },
    vencida:         { label: "VENCIDA",         clase: "border-rose-500/50 text-rose-300 bg-rose-500/10",          dot: "bg-rose-400 animate-pulse" },
    cancelada:       { label: "CANCELADA",       clase: "border-slate-600 text-slate-400 bg-slate-800",             dot: "bg-slate-500" },
    finalizada:      { label: "FINALIZADA",      clase: "border-sky-500/50 text-sky-300 bg-sky-500/10",             dot: "bg-sky-400" },
    en_verificacion: { label: "EN VERIFICACIÓN", clase: "border-orange-500/50 text-orange-300 bg-orange-500/10",    dot: "bg-orange-400 animate-pulse" },
  };
  const config = configs[statusStr] || {
    label: statusStr.toUpperCase(), clase: "border-slate-600/50 text-slate-300 bg-slate-800/50", dot: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${config.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
});

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
      className={`border-b border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 ${onOrderingChange ? "cursor-pointer select-none hover:text-slate-300" : ""} ${className}`}
      onClick={toggle}
    >
      <div className="flex items-center gap-1">
        {label} {onOrderingChange && <span className="text-[10px]">{isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>}
      </div>
    </th>
  );
});

/* ---------------- Desktop row ---------------- */
const DesktopRow = memo(function DesktopRow({ poliza, zebra, isWebAdmin }) {
  const cuotasEst = useCuotasBadge(poliza);
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();
  const esVerificacion = (poliza?.estado || "").toLowerCase() === "en_verificacion";

  return (
    <tr className={`transition-colors ${zebra} hover:bg-slate-800/40 ${esVerificacion ? "ring-1 ring-inset ring-orange-500/30" : ""}`}>
      <td className="border-b border-slate-800/60 p-3">
        <Link to={`/polizas/${poliza.id}`} target="_blank" rel="noopener noreferrer" className="block text-sm font-bold text-indigo-400 hover:text-indigo-300">
          {poliza.numero_poliza || "-"}
        </Link>
        <div className="text-[10px] font-bold uppercase text-slate-500">{poliza.compania || "S/C"}</div>
      </td>

      <td className="border-b border-slate-800/60 p-3">
        <Link to={`/clientes/${poliza.cliente?.id}`} className="block text-sm font-medium text-slate-200 hover:text-white">
          {clienteNombre || "-"}
        </Link>
        <div className="font-mono text-[10px] text-slate-500">{poliza.cliente?.dni_cuit_cuil}</div>
      </td>

      {isWebAdmin && (
        <td className="border-b border-slate-800/60 p-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <FaBuilding className="text-[10px]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter text-sky-400">
              {poliza?.oficina_nombre || "LOCAL"}
            </span>
          </div>
        </td>
      )}

      <td className="border-b border-slate-800/60 p-3 font-mono text-sm text-slate-300">{poliza.patente || "-"}</td>

      <td className="border-b border-slate-800/60 p-3">
        <div className="text-xs text-slate-200">{poliza.marca}</div>
        <div className="max-w-[120px] truncate text-[10px] text-slate-500">{poliza.modelo}</div>
      </td>

      <td className="border-b border-slate-800/60 p-3">
        <div className={`inline-flex flex-col rounded border px-2 py-0.5 ${cuotasEst.clase}`}>
          <span className="text-[10px] font-black uppercase tracking-tight">{cuotasEst.label}</span>
          <span className="text-[9px] font-bold uppercase opacity-70">{cuotasEst.extra}</span>
        </div>
      </td>

      <td className="border-b border-slate-800/60 p-3 text-center">
        <EstadoPolizaBadge estado={poliza.estado} />
        {esVerificacion && (
          <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-orange-400/80">
            Verificar con compañía
          </div>
        )}
      </td>
    </tr>
  );
});

/* ---------------- Mobile card ---------------- */
const MobileCard = memo(function MobileCard({ poliza, isWebAdmin }) {
  const cuotasEst = useCuotasBadge(poliza);
  const clienteNombre = `${poliza?.cliente?.nombre || ""} ${poliza?.cliente?.apellido || ""}`.trim();

  return (
    <Link
      to={`/polizas/${poliza.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 transition-colors hover:bg-slate-800/50 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-indigo-400">{poliza.numero_poliza || "Sin número"}</div>
          <div className="text-[10px] font-bold uppercase text-slate-500">{poliza.compania || "S/C"}</div>
        </div>
        <EstadoPolizaBadge estado={poliza.estado} />
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="truncate text-sm font-medium text-slate-100">{clienteNombre || "Sin titular"}</div>
        <div className="text-xs text-slate-400">
          {poliza.marca} {poliza.modelo}
          {poliza.patente ? <> · <span className="font-mono uppercase text-slate-300">{poliza.patente}</span></> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={`inline-flex flex-col rounded border px-2 py-0.5 ${cuotasEst.clase}`}>
          <span className="text-[10px] font-black uppercase tracking-tight">{cuotasEst.label}</span>
          <span className="text-[9px] font-bold uppercase opacity-70">{cuotasEst.extra}</span>
        </div>
        <div className="flex items-center gap-2">
          {isWebAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-sky-400">
              <FaBuilding className="text-[10px]" /> {poliza?.oficina_nombre || "LOCAL"}
            </span>
          )}
          <HiChevronRight className="h-4 w-4 text-slate-600" />
        </div>
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
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-100 shadow-2xl backdrop-blur-md">
      {isLoading && <div className="h-1 w-full animate-pulse bg-indigo-500" />}

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
              <th className="border-b border-slate-800 bg-slate-900 p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Estado pago</th>
              <SortHeader label="Estado" field="estado" ordering={ordering} onOrderingChange={onOrderingChange} className="text-center" />
            </tr>
          </thead>
          <tbody>
            {polizas.map((p, i) => (
              <DesktopRow key={p.id} poliza={p} zebra={i % 2 === 0 ? "bg-transparent" : "bg-slate-900/30"} isWebAdmin={isWebAdmin} />
            ))}
          </tbody>
        </table>
        {polizas.length === 0 && !isLoading && (
          <div className="py-12 text-center text-sm text-slate-500">Sin pólizas para los filtros aplicados.</div>
        )}
      </div>

      {/* ===== Mobile: tarjetas (< md) ===== */}
      <div className="space-y-2.5 p-3 md:hidden">
        {polizas.map((p) => (
          <MobileCard key={p.id} poliza={p} isWebAdmin={isWebAdmin} />
        ))}
        {polizas.length === 0 && !isLoading && (
          <div className="py-10 text-center text-sm text-slate-500">Sin pólizas para los filtros aplicados.</div>
        )}
      </div>

      {/* ===== Paginación ===== */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-4 sm:px-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {cursorEnabled ? `Registros: ${polizas.length}` : `Página ${page} de ${totalPages} · Total: ${total}`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => (cursorEnabled ? onPrev?.() : onPageChange?.(page - 1))}
            disabled={(cursorEnabled ? !hasPrev : page <= 1) || isLoading}
            className="h-9 rounded-xl border border-slate-700 bg-slate-800 px-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-700 disabled:opacity-20"
          >
            Anterior
          </button>
          <button
            onClick={() => (cursorEnabled ? onNext?.() : onPageChange?.(page + 1))}
            disabled={(cursorEnabled ? !hasNext : page >= totalPages) || isLoading}
            className="h-9 rounded-xl border border-slate-700 bg-slate-800 px-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-700 disabled:opacity-20"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolizaTable;