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

  // ====== NUEVOS PROPS para filtros de vencimiento ======
  /** Strings "YYYY-MM-DD" o "" */
  fechaVencimientoDesde = "",
  fechaVencimientoHasta = "",
  /** Setters para rango */
  onFechaVencimientoDesdeChange,
  onFechaVencimientoHastaChange,
  /** Presets: números en string/number o "" */
  vencidasUltimosDias = "",
  vencidasMasDeDias = "",
  /** Setters para presets (excluyentes con el rango) */
  onVencidasUltimosDiasChange,
  onVencidasMasDeDiasChange,
  /** Limpia todos los filtros de vencimiento */
  onClearVencimientoFilters,
}) {
  // Si no nos pasan modo, fijamos 'cuotas' por defecto y no mostramos los toggles
  const [modoLocal, setModoLocal] = useState(modoProp || "cuotas");
  useEffect(() => { if (modoProp) setModoLocal(modoProp); }, [modoProp]);
  const modoActual = modoProp || modoLocal;

  // Estado local del input (debounce suave)
  const [localValue, setLocalValue] = useState(searchValue || "");
  useEffect(() => { setLocalValue(searchValue || ""); }, [searchValue]);

  // Propagar cambios después de 200ms
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
      ? (resumenPolizasDesdeKpis || resumenPolizas || {})
      : (resumenCuotas || {});

  const clearSearch = () => setLocalValue("");

  // Contadores para estado financiero (desde KPIs)
  const kpisCount = useMemo(
    () => ({
      todos:       kpis?.total ?? undefined,
      al_dia:      kpis?.activas_al_dia ?? undefined,
      mora_1_30:   kpis?.activas_mora_1_30 ?? undefined,
      mora_31_60:  kpis?.activas_mora_31_60 ?? undefined,
      mora_61_90:  kpis?.activas_mora_61_90 ?? undefined,
      mora_90_mas: kpis?.activas_mora_90_mas ?? undefined,
    }),
    [kpis]
  );

  // ====== Helpers UI para presets de vencimiento ======
  const isPreset3  = String(vencidasUltimosDias || "") === "3";
  const isPreset7  = String(vencidasUltimosDias || "") === "7";
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

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 md:p-4 text-gray-100">
      {/* Top bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Buscar por nro, patente, cliente, marca, modelo…"
            className="w-72 max-w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 outline-none placeholder:text-gray-400"
          />
          {localValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              Limpiar
            </button>
          )}
          {typeof totalFiltradas === "number" && (
            <span className="ml-1 hidden text-sm text-gray-400 md:inline">
              {totalFiltradas} resultados
            </span>
          )}
        </div>

        {/* Controls right */}
        <div className="flex items-center gap-2">
          {/* Modo */}
          {onModoChange ? (
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
              <button
                type="button"
                onClick={() => onModoChange?.("polizas")}
                className={`px-3 py-2 text-sm transition ${
                  modoActual === "polizas"
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700"
                }`}
                aria-pressed={modoActual === "polizas"}
              >
                Filtrar por Pólizas
              </button>
              <button
                type="button"
                onClick={() => onModoChange?.("cuotas")}
                className={`border-l border-gray-700 px-3 py-2 text-sm transition ${
                  modoActual === "cuotas"
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700"
                }`}
                aria-pressed={modoActual === "cuotas"}
              >
                Filtrar por Cuotas
              </button>
            </div>
          ) : null}

          {/* Page size */}
          {onPageSizeChange ? (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm"
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

      {/* Chips de estado (según modo) */}
      <div className="mt-3 flex flex-wrap gap-2">
        {botones.map(({ key, label }) => {
          const active = estadoActual === key;
          const count = resumen?.[key] ?? undefined;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onEstadoChange?.(key)}
              className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition
                ${
                  active
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
              title={label}
              aria-pressed={active}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  (dotClass[key] || "bg-gray-500")
                }`}
              />
              <span className="whitespace-nowrap">{label}</span>
              {typeof count === "number" ? (
                <span
                  className={`ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-xs
                    ${
                      active
                        ? "border-white/25 bg-white/20 text-white"
                        : "border-white/10 bg-white/10 text-gray-200"
                    }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Chips de ESTADO FINANCIERO (solo en modo "polizas") */}
      {modoActual === "polizas" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ESTADOS_FINANCIEROS.map(({ key, label }) => {
            const active = estadoFinancieroActual === key;
            const count = kpisCount[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onEstadoFinancieroChange?.(key)}
                className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition
                  ${
                    active
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                  }`}
                title={`Financiero: ${label}`}
                aria-pressed={active}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    DOT_FINANCIERO[key] || "bg-gray-500"
                  }`}
                />
                <span className="whitespace-nowrap">{label}</span>
                {typeof count === "number" ? (
                  <span
                    className={`ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1 text-xs
                      ${
                        active
                          ? "border-white/25 bg-white/20 text-white"
                          : "border-white/10 bg-white/10 text-gray-200"
                      }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* ====== NUEVO: Filtros por VENCIMIENTO (solo modo "polizas") ====== */}
      {modoActual === "polizas" && (
        <div className="mt-4 rounded-lg border border-gray-800 bg-gray-850/40 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {/* Rango */}
            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 md:max-w-[540px]">
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-gray-300">Vencimiento desde</span>
                <input
                  type="date"
                  value={fechaVencimientoDesde || ""}
                  onChange={(e) => handleRangeDesde(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 outline-none placeholder:text-gray-400"
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-gray-300">Vencimiento hasta</span>
                <input
                  type="date"
                  value={fechaVencimientoHasta || ""}
                  onChange={(e) => handleRangeHasta(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 outline-none placeholder:text-gray-400"
                />
              </label>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-300">Atajos:</span>
              <button
                type="button"
                onClick={() => applyPresetUltimos(3)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  isPreset3
                    ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
                aria-pressed={isPreset3}
                title="Vencidas en los últimos 3 días"
              >
                3d
              </button>
              <button
                type="button"
                onClick={() => applyPresetUltimos(7)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  isPreset7
                    ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
                aria-pressed={isPreset7}
                title="Vencidas en los últimos 7 días"
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => applyPresetUltimos(30)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  isPreset30
                    ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
                aria-pressed={isPreset30}
                title="Vencidas en los últimos 30 días"
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => applyPresetMasDe(30)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  isPresetMas30
                    ? "border-rose-500 bg-rose-600 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
                aria-pressed={isPresetMas30}
                title="Vencidas hace más de 30 días"
              >
                &gt;30d
              </button>

              <button
                type="button"
                onClick={clearVencimiento}
                className={`ml-1 rounded-md border px-3 py-1.5 text-sm transition ${
                  anyRange || anyPreset
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-400"
                }`}
                disabled={!anyRange && !anyPreset}
                title="Limpiar filtros de vencimiento"
              >
                Limpiar vencimiento
              </button>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Podés usar <strong>rango</strong> o <strong>atajos</strong>. Cuando aplicás uno, el otro se limpia automáticamente.
          </p>
        </div>
      )}

      {/* Hint */}
      <p className="mt-2 text-xs text-gray-400">
        Modo:{" "}
        <strong className="text-gray-200">
          {modoActual === "polizas" ? "Pólizas" : "Cuotas"}
        </strong>
        {modoActual === "cuotas"
          ? " — el estado (AL DÍA, POR VENCER, etc.) se calcula con cuotas impagas y sus vencimientos."
          : " — fila 1: estado general (Activa/Vencida/Cancelada/Finalizada). Fila 2: estado financiero por mora (Al día, 1–30, 31–60, 61–90, 90+)."}
      </p>
    </div>
  );
}
