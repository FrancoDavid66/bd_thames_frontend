// src/components/polizas/PolizaFilter.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
// 🚀 IMPORTAMOS LAS APIs PARA LEER LA BASE DE DATOS
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
  todos: "bg-gray-400", al_dia: "bg-emerald-500", por_vencer: "bg-amber-400",
  vence_hoy: "bg-orange-500", vencida_7: "bg-rose-400", vencida_30: "bg-rose-500", vencidas: "bg-red-600",
};

const DOT_POLIZAS = {
  todos: "bg-gray-400", activa: "bg-emerald-500", vencida: "bg-red-600", cancelada: "bg-slate-500", finalizada: "bg-purple-500",
};

const DOT_FINANCIERO = {
  todos: "bg-gray-400", al_dia: "bg-emerald-500", mora_1_30: "bg-amber-400",
  mora_31_60: "bg-orange-500", mora_61_90: "bg-rose-500", mora_90_mas: "bg-red-600",
};

// 🚀 Lista de aseguradoras históricas para no perder datos viejos
const LEGACY_COMPANIAS = [
  "Agrosalta", "ATM", "Equidad", "Federacion Patronal", "La Equidad", "NRE", "Providencia"
];

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

  // 🚀 Filtros Multi-Tenant y Compañía
  oficinaActual = "ALL",
  onOficinaChange,
  companiaActual = "",
  onCompaniaChange,

  onVerUltimas,
  status = "idle",
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  // 🚀 ESTADOS DINÁMICOS PARA SELECTORES
  const [oficinasList, setOficinasList] = useState([]);
  const [companiasList, setCompaniasList] = useState([]);

  const [modoLocal, setModoLocal] = useState(modoProp || "cuotas");
  useEffect(() => { if (modoProp) setModoLocal(modoProp); }, [modoProp]);
  const modoActual = modoProp || modoLocal;

  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => { setLocalValue(searchValue || ""); }, [searchValue]);
  useEffect(() => { onSearchChange?.(localValue); }, [localValue, onSearchChange]);

  // 🚀 CARGA DE DATOS DINÁMICOS AL INICIAR
  useEffect(() => {
    // 1. Cargar Compañías (Dinámicas + Históricas combinadas y sin repetir)
    api.get("companias/").then(res => {
      const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const dinamicas = arr.filter(c => c.activa).map(c => c.nombre);
      const unificadas = Array.from(new Set([...LEGACY_COMPANIAS, ...dinamicas])).sort();
      setCompaniasList(unificadas);
    }).catch(e => console.warn("Error cargando aseguradoras", e));

    // 2. Cargar Oficinas (Solo si es Admin)
    if (isWebAdmin) {
      PolizasAPI.listOficinas().then(res => {
        setOficinasList(Array.isArray(res) ? res : (res.results || []));
      }).catch(e => console.warn("Error cargando sucursales", e));
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

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-3 md:p-4 text-gray-100 space-y-3 shadow-xl">
      {/* Top bar: búsqueda + oficinas + acciones */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2">
          
          {/* 🚀 SELECTOR DE OFICINA (Dinámico, Solo ADMIN) */}
          {isWebAdmin && onOficinaChange && (
            <div className="shrink-0">
              <select
                value={oficinaActual}
                onChange={(e) => onOficinaChange(e.target.value)}
                className="h-9 rounded-xl border border-gray-700 bg-gray-800 px-3 text-xs md:text-sm font-bold text-yellow-400 outline-none focus:border-yellow-500/50 cursor-pointer"
              >
                <option value="ALL" className="bg-gray-900 text-white">Todas las sucursales</option>
                {oficinasList.map((o) => (
                  <option key={o.id} value={o.id} className="bg-gray-900 text-white">{o.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* 🚀 SELECTOR DE COMPAÑÍA (Dinámico + Históricas) */}
          {onCompaniaChange !== undefined && (
            <div className="shrink-0">
              <select
                value={companiaActual}
                onChange={(e) => onCompaniaChange(e.target.value)}
                className="h-9 rounded-xl border border-gray-700 bg-gray-800 px-3 text-xs md:text-sm font-bold text-sky-400 outline-none focus:border-sky-500/50 cursor-pointer"
              >
                <option value="" className="bg-gray-900 text-white">Todas las Aseguradoras</option>
                {companiasList.map((c) => (
                  <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* BUSCADOR DE TEXTO (Para patentes, DNI, nombres) */}
          <input
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSearchSubmit?.(); } }}
            placeholder="Buscar patente, nombre, DNI..."
            className="flex-1 min-w-[180px] rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/40"
          />

          <button type="button" onClick={() => onSearchSubmit?.()} disabled={isLoading} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs md:text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">
            {isLoading ? "Buscando…" : "Buscar"}
          </button>

          {localValue && (
            <button type="button" onClick={clearSearch} disabled={isLoading} className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm hover:bg-gray-700">Limpiar</button>
          )}
          {!!searchApplied && (
            <button type="button" onClick={() => onClearSearchApplied?.()} disabled={isLoading} className="rounded-xl border border-sky-700/60 bg-sky-900/30 px-3 py-2 text-xs md:text-sm hover:bg-sky-900/45">Quitar búsqueda</button>
          )}
          {typeof onVerUltimas === "function" && (
            <button type="button" onClick={() => onVerUltimas?.()} disabled={isLoading} className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm hover:bg-gray-700">Ver últimas</button>
          )}
          {typeof totalFiltradas === "number" && (
            <span className="ml-1 text-xs md:text-sm text-gray-400">{totalFiltradas} resultados</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {onModoChange && (
            <div className="inline-flex overflow-hidden rounded-full border border-gray-700 bg-gray-800 text-xs md:text-sm">
              <button type="button" onClick={() => onModoChange?.("polizas")} className={`px-3 py-1.5 transition ${modoActual === "polizas" ? "bg-emerald-600 text-white" : "text-gray-200 hover:bg-gray-700"}`}>Pólizas</button>
              <button type="button" onClick={() => onModoChange?.("cuotas")} className={`border-l border-gray-700 px-3 py-1.5 transition ${modoActual === "cuotas" ? "bg-emerald-600 text-white" : "text-gray-200 hover:bg-gray-700"}`}>Cuotas</button>
            </div>
          )}
          {onPageSizeChange && (
            <select value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))} disabled={isLoading} className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs md:text-sm outline-none cursor-pointer">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n} className="bg-gray-900 text-white">{n} / pág.</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] md:text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span>Modo: <strong className="text-gray-200 uppercase">{modoActual}</strong></span>
          <span className="opacity-40">|</span>
          <span>Sucursal: <strong className="text-emerald-400 uppercase">{user?.perfil?.oficina_nombre || 'Local'}</strong></span>
        </span>
        {!!searchApplied && <span className="opacity-80">Búsqueda aplicada: <b className="text-gray-200">{searchApplied}</b></span>}
      </div>

      {/* Chips estado */}
      <div className="mt-1 flex flex-wrap gap-2">
        {botones.map(({ key, label }) => {
          const active = estadoActual === key;
          const count = modoActual === "cuotas" && key === "todos" ? (typeof totalFiltradas === "number" ? totalFiltradas : resumen?.todos) : resumen?.[key] ?? undefined;
          return (
            <button key={key} type="button" onClick={() => onEstadoChange?.(key)} disabled={isLoading} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition ${active ? "border-emerald-500/80 bg-emerald-600 text-white shadow-lg shadow-emerald-900/40" : "border-gray-700 bg-gray-800/80 text-gray-100 hover:bg-gray-700"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass[key] || "bg-gray-500"}`} />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === "number" && <span className={`ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-[10px] ${active ? "border-white/25 bg-white/20 text-white" : "border-white/10 bg-white/10 text-gray-200"}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Avanzados solo modo pólizas */}
      {modoActual === "polizas" && (
        <div className="mt-2 rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden">
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-xs md:text-sm hover:bg-gray-800/50 transition-colors">
            <span className="flex items-center gap-2 text-gray-200"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">⚙</span>Filtros avanzados (mora y vencimiento)</span>
            <span className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : "rotate-0"}`}>▶</span>
          </button>

          {showAdvanced && (
            <div className="border-t border-gray-800 px-3 py-3 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <div className="text-[11px] md:text-xs uppercase tracking-wider font-bold text-gray-500">Estado financiero (mora)</div>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_FINANCIEROS.map(({ key, label }) => {
                    const active = estadoFinancieroActual === key;
                    const count = kpisCount[key];
                    return (
                      <button key={key} type="button" onClick={() => onEstadoFinancieroChange?.(key)} disabled={isLoading} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition ${active ? "border-indigo-500/80 bg-indigo-600 text-white" : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${DOT_FINANCIERO[key] || "bg-gray-500"}`} />
                        <span>{label}</span>
                        {typeof count === "number" && <span className={`ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-[10px] ${active ? "border-white/25 bg-white/20 text-white" : "border-white/10 bg-white/10 text-gray-200"}`}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:max-w-[520px]">
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1.5 text-gray-400 font-medium">Vencimiento desde</span>
                      <input type="date" value={fechaVencimientoDesde || ""} onChange={(e) => onFechaVencimientoDesdeChange?.(e.target.value)} disabled={isLoading} className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm text-gray-100 outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer" />
                    </label>
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1.5 text-gray-400 font-medium">Vencimiento hasta</span>
                      <input type="date" value={fechaVencimientoHasta || ""} onChange={(e) => onFechaVencimientoHastaChange?.(e.target.value)} disabled={isLoading} className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm text-gray-100 outline-none focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-tighter">Atajos:</span>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(3)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset3 ? "border-fuchsia-500 bg-fuchsia-600 text-white" : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"}`}>3d</button>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(7)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset7 ? "border-fuchsia-500 bg-fuchsia-600 text-white" : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"}`}>7d</button>
                    <button type="button" onClick={() => onVencidasUltimosDiasChange?.(30)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPreset30 ? "border-fuchsia-500 bg-fuchsia-600 text-white" : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"}`}>30d</button>
                    <button type="button" onClick={() => onVencidasMasDeDiasChange?.(30)} disabled={isLoading} className={`rounded-full border px-3 py-1.5 text-xs transition ${isPresetMas30 ? "border-rose-500 bg-rose-600 text-white" : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"}`}>&gt;30d</button>
                    <button type="button" onClick={clearVencimiento} disabled={(!anyRange && !anyPreset) || isLoading} className={`ml-1 rounded-full border px-3 py-1.5 text-xs transition ${anyRange || anyPreset ? "border-sky-500 bg-sky-600 text-white" : "border-gray-700 bg-gray-800 text-gray-400"}`}>Limpiar</button>
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