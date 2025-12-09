// src/components/polizas/PolizaFilter.jsx
import React, { useMemo, useState, useEffect } from "react";

/** Estados (chips) para modo "cuotas" */
const ESTADOS_CUOTAS = [
  { key: "todos",      label: "TODAS" },
  { key: "al_dia",     label: "AL DÍA" },
  { key: "por_vencer", label: "POR VENCER" },
  { key: "vence_hoy",  label: "VENCE HOY" },
  { key: "vencida_7",  label: "VENCIDA (7 días)" },
  { key: "vencida_30", label: "VENCIDA (30 días)" },
  { key: "vencidas",   label: "VENCIDAS" },
];

/** Estados (chips) para modo "polizas" (estado general del registro) */
const ESTADOS_POLIZAS = [
  { key: "todos",      label: "TODAS" },
  { key: "activa",     label: "ACTIVAS" },
  { key: "vencida",    label: "VENCIDAS" },
  { key: "cancelada",  label: "CANCELADAS" },
  { key: "finalizada", label: "FINALIZADAS" },
];

/** Estados FINANCIEROS (mora) para modo "polizas" */
const ESTADOS_FINANCIEROS = [
  { key: "todos",       label: "TODAS" },
  { key: "al_dia",      label: "AL DÍA" },
  { key: "mora_1_30",   label: "1–30" },
  { key: "mora_31_60",  label: "31–60" },
  { key: "mora_61_90",  label: "61–90" },
  { key: "mora_90_mas", label: "90+" },
];

/** Colores del dot por estado (modo cuotas) */
const DOT_CUOTAS = {
  todos:      "bg-gray-400",
  al_dia:     "bg-emerald-500",
  por_vencer: "bg-amber-400",
  vence_hoy:  "bg-orange-500",
  vencida_7:  "bg-rose-400",
  vencida_30: "bg-rose-500",
  vencidas:   "bg-red-600",
};

/** Colores del dot por estado (modo polizas) */
const DOT_POLIZAS = {
  todos:      "bg-gray-400",
  activa:     "bg-emerald-500",
  vencida:    "bg-red-600",
  cancelada:  "bg-slate-500",
  finalizada: "bg-purple-500",
};

/** Colores del dot por estado financiero (mora) */
const DOT_FINANCIERO = {
  todos:       "bg-gray-400",
  al_dia:      "bg-emerald-500",
  mora_1_30:   "bg-amber-400",
  mora_31_60:  "bg-orange-500",
  mora_61_90:  "bg-rose-500",
  mora_90_mas: "bg-red-600",
};

export default function PolizaFilter({
  /** Texto de búsqueda y setter */
  searchValue = "",
  onSearchChange,

  /** Estado operativo seleccionado y setter (modo "polizas") o estado cuotas (modo "cuotas") */
  estadoActual = "todos",
  onEstadoChange,

  /** Estado financiero seleccionado (solo modo "polizas") y setter */
  estadoFinancieroActual = "todos",
  onEstadoFinancieroChange,

  /** Page size y setter (opcional) */
  pageSize = 10,
  onPageSizeChange,

  /** Totales (opcional, para UI) */
  totalFiltradas,

  /** Modo y setter (opcionales). Si no se pasan, asumimos 'cuotas' y ocultamos el toggle. */
  modoActual: modoProp,
  onModoChange,

  /** Resúmenes por estado (opcionales) para chips en modo "cuotas" y "polizas" (fallback) */
  resumenCuotas,
  resumenPolizas,

  /** KPIs backend (globales) — usamos esto para los contadores de los chips en modo "polizas" */
  kpis = {},

  // ====== PROPS filtros de vencimiento ======
  fechaVencimientoDesde = "",
  fechaVencimientoHasta = "",
  onFechaVencimientoDesdeChange,
  onFechaVencimientoHastaChange,
  vencidasUltimosDias = "",
  vencidasMasDeDias = "",
  onVencidasUltimosDiasChange,
  onVencidasMasDeDiasChange,
  onClearVencimientoFilters,
}) {
  // Si no nos pasan modo, fijamos 'cuotas' por defecto y no mostramos los toggles
  const [modoLocal, setModoLocal] = useState(modoProp || "cuotas");
  useEffect(() => {
    if (modoProp) setModoLocal(modoProp);
  }, [modoProp]);
  const modoActual = modoProp || modoLocal;

  // Estado local del input (debounce suave)
  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => {
    setLocalValue(searchValue || "");
  }, [searchValue]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (onSearchChange) onSearchChange(localValue);
    }, 200);
    return () => clearTimeout(t);
  }, [localValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const botones = useMemo(
    () => (modoActual === "polizas" ? ESTADOS_POLIZAS : ESTADOS_CUOTAS),
    [modoActual]
  );
  const dotClass = modoActual === "polizas" ? DOT_POLIZAS : DOT_CUOTAS;

  // === RESÚMENES / KPIs ===
  const resumenPolizasDesdeKpis = useMemo(() => {
    if (!kpis) return undefined;
    const activas =
      (kpis.activas_al_dia ?? 0) +
      (kpis.activas_mora_1_30 ?? 0) +
      (kpis.activas_mora_31_60 ?? 0) +
      (kpis.activas_mora_61_90 ?? 0) +
      (kpis.activas_mora_90_mas ?? 0);
    return {
      todos: kpis.total ?? undefined,
      activa: activas,
      vencida: kpis.vencidas ?? undefined,
      cancelada: kpis.canceladas ?? undefined,
      finalizada: kpis.finalizadas ?? undefined,
    };
  }, [kpis]);

  const resumen =
    modoActual === "polizas"
      ? resumenPolizasDesdeKpis || resumenPolizas || {}
      : resumenCuotas || {};

  const clearSearch = () => setLocalValue("");

  // Contadores para estado financiero (desde KPIs)
  const kpisCount = useMemo(
    () => ({
      todos: kpis?.total ?? undefined,
      al_dia: kpis?.activas_al_dia ?? undefined,
      mora_1_30: kpis?.activas_mora_1_30 ?? undefined,
      mora_31_60: kpis?.activas_mora_31_60 ?? undefined,
      mora_61_90: kpis?.activas_mora_61_90 ?? undefined,
      mora_90_mas: kpis?.activas_mora_90_mas ?? undefined,
    }),
    [kpis]
  );

  // ====== Helpers UI para presets de vencimiento ======
  const isPreset3 = String(vencidasUltimosDias || "") === "3";
  const isPreset7 = String(vencidasUltimosDias || "") === "7";
  const isPreset30 = String(vencidasUltimosDias || "") === "30";
  const isPresetMas30 = String(vencidasMasDeDias || "") === "30";

  const anyRange = Boolean(fechaVencimientoDesde || fechaVencimientoHasta);
  const anyPreset = Boolean(vencidasUltimosDias || vencidasMasDeDias);

  const handleRangeDesde = (val) => {
    onFechaVencimientoDesdeChange?.(val);
  };
  const handleRangeHasta = (val) => {
    onFechaVencimientoHastaChange?.(val);
  };

  const applyPresetUltimos = (n) => {
    onVencidasUltimosDiasChange?.(n);
  };
  const applyPresetMasDe = (n) => {
    onVencidasMasDeDiasChange?.(n);
  };

  const clearVencimiento = () => {
    onClearVencimientoFilters?.();
  };

  // Mostrar u ocultar "filtros avanzados"
  const [showAdvanced, setShowAdvanced] = useState(false);
  useEffect(() => {
    if (
      estadoFinancieroActual !== "todos" ||
      anyRange ||
      anyPreset
    ) {
      setShowAdvanced(true);
    }
  }, [
    estadoFinancieroActual,
    anyRange,
    anyPreset,
    fechaVencimientoDesde,
    fechaVencimientoHasta,
    vencidasUltimosDias,
    vencidasMasDeDias,
  ]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-3 md:p-4 text-gray-100 space-y-3">
      {/* Top bar: búsqueda + modo + tamaño página */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="flex w-full flex-wrap items-center gap-2">
          <input
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Buscar por nro, patente, cliente, marca, modelo…"
            className="flex-1 min-w-[180px] rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/40"
          />
          {localValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm hover:bg-gray-700"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              Limpiar
            </button>
          )}
          {typeof totalFiltradas === "number" && (
            <span className="ml-1 text-xs md:text-sm text-gray-400">
              {totalFiltradas} resultados
            </span>
          )}
        </div>

        {/* Controls right */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* Modo */}
          {onModoChange ? (
            <div className="inline-flex overflow-hidden rounded-full border border-gray-700 bg-gray-800 text-xs md:text-sm">
              <button
                type="button"
                onClick={() => onModoChange?.("polizas")}
                className={`px-3 py-1.5 transition ${
                  modoActual === "polizas"
                    ? "bg-emerald-600 text-white"
                    : "text-gray-200 hover:bg-gray-700"
                }`}
                aria-pressed={modoActual === "polizas"}
              >
                Pólizas
              </button>
              <button
                type="button"
                onClick={() => onModoChange?.("cuotas")}
                className={`border-l border-gray-700 px-3 py-1.5 transition ${
                  modoActual === "cuotas"
                    ? "bg-emerald-600 text-white"
                    : "text-gray-200 hover:bg-gray-700"
                }`}
                aria-pressed={modoActual === "cuotas"}
              >
                Cuotas
              </button>
            </div>
          ) : null}

          {/* Page size */}
          {onPageSizeChange ? (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs md:text-sm"
              aria-label="Tamaño de página"
              title="Tamaño de página"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / pág.
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {/* Línea de resumen / modo */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] md:text-xs text-gray-400">
        <span>
          Modo:{" "}
          <strong className="text-gray-200">
            {modoActual === "polizas" ? "Pólizas (estado + mora)" : "Cuotas"}
          </strong>
        </span>
        {modoActual === "polizas" && (
          <span className="opacity-80">
            Filtro principal arriba · filtros de mora y vencimiento en
            "Avanzados".
          </span>
        )}
      </div>

      {/* Chips de estado (PRINCIPALES) */}
      <div className="mt-1 flex flex-wrap gap-2">
        {botones.map(({ key, label }) => {
          const active = estadoActual === key;
          const count =
            modoActual === "cuotas" && key === "todos"
              ? typeof totalFiltradas === "number"
                ? totalFiltradas
                : resumen?.todos
              : resumen?.[key] ?? undefined;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onEstadoChange?.(key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition
                ${
                  active
                    ? "border-emerald-500/80 bg-emerald-600 text-white"
                    : "border-gray-700 bg-gray-800/80 text-gray-100 hover:bg-gray-700"
                }`}
              title={label}
              aria-pressed={active}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  dotClass[key] || "bg-gray-500"
                }`}
              />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === "number" && (
                <span
                  className={`ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-[10px]
                    ${
                      active
                        ? "border-white/25 bg-white/20 text-white"
                        : "border-white/10 bg-white/10 text-gray-200"
                    }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ====== FILTROS AVANZADOS (mora + vencimiento) SOLO modo pólizas ====== */}
      {modoActual === "polizas" && (
        <div className="mt-2 rounded-2xl border border-gray-800 bg-gray-900/80">
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs md:text-sm"
          >
            <span className="flex items-center gap-2 text-gray-200">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-xs">
                ⚙
              </span>
              Filtros avanzados (mora y vencimiento)
            </span>
            <span className="flex items-center gap-2 text-[11px] text-gray-400">
              {(estadoFinancieroActual !== "todos" || anyRange || anyPreset) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                  ● activos
                </span>
              )}
              <span
                className={`transition-transform ${
                  showAdvanced ? "rotate-90" : "rotate-0"
                }`}
              >
                ▶
              </span>
            </span>
          </button>

          {showAdvanced && (
            <div className="border-t border-gray-800 px-3 py-3 space-y-3">
              {/* Chips de ESTADO FINANCIERO (mora) */}
              <div className="space-y-1">
                <div className="text-[11px] md:text-xs text-gray-400">
                  Estado financiero (mora)
                </div>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_FINANCIEROS.map(({ key, label }) => {
                    const active = estadoFinancieroActual === key;
                    const count = kpisCount[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onEstadoFinancieroChange?.(key)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:text-sm transition
                          ${
                            active
                              ? "border-indigo-500/80 bg-indigo-600 text-white"
                              : "border-gray-700 bg-gray-800/80 text-gray-100 hover:bg-gray-700"
                          }`}
                        title={`Financiero: ${label}`}
                        aria-pressed={active}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            DOT_FINANCIERO[key] || "bg-gray-500"
                          }`}
                        />
                        <span>{label}</span>
                        {typeof count === "number" && (
                          <span
                            className={`ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-[10px]
                              ${
                                active
                                  ? "border-white/25 bg-white/20 text-white"
                                  : "border-white/10 bg-white/10 text-gray-200"
                              }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rango + presets de vencimiento */}
              <div className="space-y-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  {/* Rango fechas */}
                  <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:max-w-[520px]">
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1 text-gray-300">Vencimiento desde</span>
                      <input
                        type="date"
                        value={fechaVencimientoDesde || ""}
                        onChange={(e) => handleRangeDesde(e.target.value)}
                        className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm text-gray-100 outline-none placeholder:text-gray-400 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </label>
                    <label className="flex flex-col text-xs md:text-sm">
                      <span className="mb-1 text-gray-300">Vencimiento hasta</span>
                      <input
                        type="date"
                        value={fechaVencimientoHasta || ""}
                        onChange={(e) => handleRangeHasta(e.target.value)}
                        className="rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs md:text-sm text-gray-100 outline-none placeholder:text-gray-400 focus:border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </label>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="text-[11px] md:text-xs text-gray-300">
                      Atajos:
                    </span>
                    <button
                      type="button"
                      onClick={() => applyPresetUltimos(3)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        isPreset3
                          ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                      }`}
                      aria-pressed={isPreset3}
                    >
                      3d
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetUltimos(7)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        isPreset7
                          ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                      }`}
                      aria-pressed={isPreset7}
                    >
                      7d
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetUltimos(30)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        isPreset30
                          ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                      }`}
                      aria-pressed={isPreset30}
                    >
                      30d
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetMasDe(30)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        isPresetMas30
                          ? "border-rose-500 bg-rose-600 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                      }`}
                      aria-pressed={isPresetMas30}
                    >
                      &gt;30d
                    </button>

                    <button
                      type="button"
                      onClick={clearVencimiento}
                      className={`ml-1 rounded-full border px-3 py-1.5 text-xs transition ${
                        anyRange || anyPreset
                          ? "border-sky-500 bg-sky-600 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-400"
                      }`}
                      disabled={!anyRange && !anyPreset}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400">
                  Podés usar <strong>rango</strong> o <strong>atajos</strong>.  
                  Cuando aplicás uno, el otro se limpia automáticamente.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
