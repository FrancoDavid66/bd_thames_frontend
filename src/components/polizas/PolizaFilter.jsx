// src/components/polizas/PolizaFilter.jsx
import React, { useMemo, useState, useEffect } from "react";
import { HiSearch } from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";

/** Estados (chips) para modo "cuotas" */
const ESTADOS_CUOTAS = [
  { key: "todos", label: "TODAS" },
  { key: "al_dia", label: "AL DÍA" },
  { key: "por_vencer", label: "POR VENCER" },
  { key: "vence_hoy", label: "VENCE HOY" },
  { key: "vencida_7", label: "VENCIDA (7 días)" },
  { key: "vencida_30", label: "VENCIDA (30 días)" },
  { key: "vencidas", label: "VENCIDAS" },
];

/** Estados (chips) para modo "polizas" */
const ESTADOS_POLIZAS = [
  { key: "todos", label: "TODAS" },
  { key: "activa", label: "ACTIVAS" },
  { key: "vencida", label: "VENCIDAS" },
  { key: "cancelada", label: "CANCELADAS" },
  { key: "finalizada", label: "FINALIZADAS" },
  { key: "en_verificacion", label: "EN VERIFICACIÓN" },
];

/** Estados FINANCIEROS (mora) */
const ESTADOS_FINANCIEROS = [
  { key: "todos", label: "TODAS" },
  { key: "al_dia", label: "AL DÍA" },
  { key: "mora_1_30", label: "1–30" },
  { key: "mora_31_60", label: "31–60" },
  { key: "mora_61_90", label: "61–90" },
  { key: "mora_90_mas", label: "90+" },
];

const DOT_CUOTAS = {
  todos: "bg-slate-400", al_dia: "bg-emerald-500", por_vencer: "bg-amber-400",
  vence_hoy: "bg-orange-500", vencida_7: "bg-rose-400", vencida_30: "bg-rose-500", vencidas: "bg-red-600",
};
const DOT_POLIZAS = {
  todos: "bg-slate-400", activa: "bg-emerald-500", vencida: "bg-red-600",
  cancelada: "bg-slate-500", finalizada: "bg-sky-500", en_verificacion: "bg-orange-400",
};
const DOT_FINANCIERO = {
  todos: "bg-slate-400", al_dia: "bg-emerald-500", mora_1_30: "bg-amber-400",
  mora_31_60: "bg-orange-500", mora_61_90: "bg-rose-500", mora_90_mas: "bg-red-600",
};

const LEGACY_COMPANIAS = [
  "Agrosalta", "ATM", "Equidad", "Federacion Patronal", "La Equidad", "NRE", "Providencia",
];

const chipBase = "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition";
const chipActive = "border-indigo-500/80 bg-indigo-500 text-white shadow-lg shadow-indigo-900/30";
const chipIdle = "border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-700";
const countBadge = (active) =>
  `ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-[10px] ${active ? "border-white/25 bg-white/20 text-white" : "border-white/10 bg-white/10 text-slate-200"}`;

export default function PolizaFilter({
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  onClearSearchApplied,
  searchApplied = "",
  estadoActual = "todos",
  onEstadoChange,
  estadoFinancieroActual = "todos",
  onEstadoFinancieroChange,
  pageSize = 10,
  onPageSizeChange,
  totalFiltradas,
  modoActual: modoProp,
  onModoChange,
  resumenCuotas,
  resumenPolizas,
  kpis = {},
  fechaVencimientoDesde = "",
  fechaVencimientoHasta = "",
  onFechaVencimientoDesdeChange,
  onFechaVencimientoHastaChange,
  vencidasUltimosDias = "",
  vencidasMasDeDias = "",
  onVencidasUltimosDiasChange,
  onVencidasMasDeDiasChange,
  onClearVencimientoFilters,
  oficinaActual = "ALL",
  onOficinaChange,
  companiaActual = "",
  onCompaniaChange,
  onVerUltimas,
  status = "idle",
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN";

  const [oficinasList, setOficinasList] = useState([]);
  const [companiasList, setCompaniasList] = useState([]);

  const [modoLocal, setModoLocal] = useState(modoProp || "cuotas");
  useEffect(() => { if (modoProp) setModoLocal(modoProp); }, [modoProp]);
  const modoActual = modoProp || modoLocal;

  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => { setLocalValue(searchValue || ""); }, [searchValue]);
  useEffect(() => { onSearchChange?.(localValue); }, [localValue, onSearchChange]);

  useEffect(() => {
    api.get("companias/").then((res) => {
      const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const dinamicas = arr.filter((c) => c.activa).map((c) => c.nombre);
      const unificadas = Array.from(new Set([...LEGACY_COMPANIAS, ...dinamicas])).sort();
      setCompaniasList(unificadas);
    }).catch((e) => console.warn("Error cargando aseguradoras", e));

    if (isWebAdmin) {
      PolizasAPI.listOficinas().then((res) => {
        setOficinasList(Array.isArray(res) ? res : res.results || []);
      }).catch((e) => console.warn("Error cargando sucursales", e));
    }
  }, [isWebAdmin]);

  const botones = useMemo(() => (modoActual === "polizas" ? ESTADOS_POLIZAS : ESTADOS_CUOTAS), [modoActual]);
  const dotClass = modoActual === "polizas" ? DOT_POLIZAS : DOT_CUOTAS;

  const resumenPolizasDesdeKpis = useMemo(() => {
    if (!kpis) return undefined;
    const activas = (kpis.activas_al_dia ?? 0) + (kpis.activas_mora_1_30 ?? 0) + (kpis.activas_mora_31_60 ?? 0) + (kpis.activas_mora_61_90 ?? 0) + (kpis.activas_mora_90_mas ?? 0);
    return { todos: kpis.total ?? undefined, activa: activas, vencida: kpis.vencidas ?? undefined, cancelada: kpis.canceladas ?? undefined, finalizada: kpis.finalizadas ?? undefined };
  }, [kpis]);

  const resumen = modoActual === "polizas" ? resumenPolizasDesdeKpis || resumenPolizas || {} : resumenCuotas || {};
  const clearSearch = () => setLocalValue("");

  const kpisCount = useMemo(() => ({
    todos: kpis?.total ?? undefined, al_dia: kpis?.activas_al_dia ?? undefined, mora_1_30: kpis?.activas_mora_1_30 ?? undefined,
    mora_31_60: kpis?.activas_mora_31_60 ?? undefined, mora_61_90: kpis?.activas_mora_61_90 ?? undefined, mora_90_mas: kpis?.activas_mora_90_mas ?? undefined,
  }), [kpis]);

  const isPreset3 = String(vencidasUltimosDias || "") === "3";
  const isPreset7 = String(vencidasUltimosDias || "") === "7";
  const isPreset30 = String(vencidasUltimosDias || "") === "30";
  const isPresetMas30 = String(vencidasMasDeDias || "") === "30";
  const anyRange = Boolean(fechaVencimientoDesde || fechaVencimientoHasta);
  const anyPreset = Boolean(vencidasUltimosDias || vencidasMasDeDias);
  const clearVencimiento = () => onClearVencimientoFilters?.();

  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => {
    if (estadoFinancieroActual !== "todos" || anyRange || anyPreset) setShowAdvanced(true);
  }, [estadoFinancieroActual, anyRange, anyPreset]);

  const isLoading = status === "loading";
  const selectCls = "h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs md:text-sm font-bold outline-none focus:border-indigo-500/50 cursor-pointer";

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-slate-100 shadow-xl md:p-4">
      {/* ===== Buscador grande (fila propia) ===== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="relative flex-1">
          <HiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
            placeholder="Buscar póliza por patente, nombre o DNI..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-3.5 pl-12 pr-4 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <button
          type="button"
          onClick={() => onSearchSubmit?.()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-60 sm:text-base"
        >
          <HiSearch className="h-5 w-5" /> {isLoading ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* ===== Fila de selects + acciones ===== */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2">
          {isWebAdmin && onOficinaChange && (
            <select value={oficinaActual} onChange={(e) => onOficinaChange(e.target.value)} className={`${selectCls} text-amber-400`}>
              <option value="ALL" className="bg-slate-900 text-white">Todas las sucursales</option>
              {oficinasList.map((o) => <option key={o.id} value={o.id} className="bg-slate-900 text-white">{o.nombre}</option>)}
            </select>
          )}

          {onCompaniaChange !== undefined && (
            <select value={companiaActual} onChange={(e) => onCompaniaChange(e.target.value)} className={`${selectCls} text-sky-400`}>
              <option value="" className="bg-slate-900 text-white">Todas las aseguradoras</option>
              {companiasList.map((c) => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
            </select>
          )}

          {localValue && (
            <button type="button" onClick={clearSearch} disabled={isLoading} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 md:text-sm">Limpiar</button>
          )}
          {!!searchApplied && (
            <button type="button" onClick={() => onClearSearchApplied?.()} disabled={isLoading} className="rounded-xl border border-sky-700/60 bg-sky-900/30 px-3 py-2 text-xs hover:bg-sky-900/45 md:text-sm">Quitar búsqueda</button>
          )}
          {typeof onVerUltimas === "function" && (
            <button type="button" onClick={() => onVerUltimas?.()} disabled={isLoading} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 md:text-sm">Ver últimas</button>
          )}
          {typeof totalFiltradas === "number" && (
            <span className="ml-1 text-xs text-slate-400 md:text-sm">{totalFiltradas} resultados</span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onModoChange && (
            <div className="inline-flex overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-xs md:text-sm">
              <button type="button" onClick={() => onModoChange?.("polizas")} className={`px-3 py-1.5 transition ${modoActual === "polizas" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-slate-700"}`}>Pólizas</button>
              <button type="button" onClick={() => onModoChange?.("cuotas")} className={`border-l border-slate-700 px-3 py-1.5 transition ${modoActual === "cuotas" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-slate-700"}`}>Cuotas</button>
            </div>
          )}
          {onPageSizeChange && (
            <select value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))} disabled={isLoading} className="cursor-pointer rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs outline-none md:text-sm">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n} className="bg-slate-900 text-white">{n} / pág.</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 md:text-xs">
        <span className="flex items-center gap-2">
          <span>Modo: <strong className="uppercase text-slate-200">{modoActual}</strong></span>
          <span className="opacity-40">|</span>
          <span>Sucursal: <strong className="uppercase text-emerald-400">{user?.perfil?.oficina_nombre || "Local"}</strong></span>
        </span>
        {!!searchApplied && <span className="opacity-80">Búsqueda aplicada: <b className="text-slate-200">{searchApplied}</b></span>}
      </div>

      {/* Chips estado */}
      <div className="mt-1 flex flex-wrap gap-2">
        {botones.map(({ key, label }) => {
          const active = estadoActual === key;
          const count = modoActual === "cuotas" && key === "todos" ? (typeof totalFiltradas === "number" ? totalFiltradas : resumen?.todos) : resumen?.[key] ?? undefined;
          return (
            <button key={key} type="button" onClick={() => onEstadoChange?.(key)} disabled={isLoading} className={`${chipBase} ${active ? chipActive : chipIdle}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass[key] || "bg-slate-500"}`} />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === "number" && <span className={countBadge(active)}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Avanzados solo modo pólizas */}
      {modoActual === "polizas" && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-xs transition-colors hover:bg-slate-800/50 md:text-sm">
            <span className="flex items-center gap-2 text-slate-200"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] text-indigo-300">⚙</span>Filtros avanzados (mora y vencimiento)</span>
            <span className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : "rotate-0"}`}>▶</span>
          </button>

          {showAdvanced && (
            <div className="space-y-4 border-t border-slate-800 px-3 py-3">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 md:text-xs">Estado financiero (mora)</div>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_FINANCIEROS.map(({ key, label }) => {
                    const active = estadoFinancieroActual === key;
                    const count = kpisCount[key];
                    return (
                      <button key={key} type="button" onClick={() => onEstadoFinancieroChange?.(key)} disabled={isLoading} className={`${chipBase} ${active ? chipActive : chipIdle}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${DOT_FINANCIERO[key] || "bg-slate-500"}`} />
                        <span>{label}</span>
                        {typeof count === "number" && <span className={countBadge(active)}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="grid w-full grid-cols-1 gap-3 md:max-w-[520px] md:grid-cols-2">
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1.5 font-medium text-slate-400">Vencimiento desde</span>
                      <input type="date" value={fechaVencimientoDesde || ""} onChange={(e) => onFechaVencimientoDesdeChange?.(e.target.value)} disabled={isLoading} className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 md:text-sm" />
                    </label>
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1.5 font-medium text-slate-400">Vencimiento hasta</span>
                      <input type="date" value={fechaVencimientoHasta || ""} onChange={(e) => onFechaVencimientoHastaChange?.(e.target.value)} disabled={isLoading} className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 outline-none transition-all focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/30 md:text-sm" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="text-[11px] font-bold uppercase tracking-tighter text-slate-500 md:text-xs">Atajos:</span>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(3)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset3 ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"}`}>3d</button>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(7)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset7 ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"}`}>7d</button>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(30)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset30 ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"}`}>30d</button>
                    <button type="button" onClick={() => onVencidasMasDeDiasChange?.(30)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPresetMas30 ? "border-rose-500 bg-rose-600 text-white" : "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"}`}>&gt;30d</button>
                    <button type="button" onClick={clearVencimiento} disabled={(!anyRange && !anyPreset) || isLoading} className={`ml-1 rounded-full border px-3 py-1.5 text-xs transition ${anyRange || anyPreset ? "border-sky-500 bg-sky-600 text-white" : "border-slate-700 bg-slate-800 text-slate-400"}`}>Limpiar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}