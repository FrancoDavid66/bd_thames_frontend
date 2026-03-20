// src/components/vencimientos/VencimientosFiltersBar.jsx
import React from "react";

export default function VencimientosFiltersBar({
  search,
  onChangeSearch,
  oficina,
  oficinas,
  oficinasStatus,
  onChangeOficina,
  pageSize,
  onChangePageSize,
  includeFinalizadas,
  onToggleFinalizadas,

  sortMode,
  onChangeSortMode,

  baseDate,
  onChangeBaseDate,

  useCustomRange,
  onToggleCustomRange,
  draftPastDays,
  setDraftPastDays,
  draftFutureDays,
  setDraftFutureDays,
  onApplyCustomRange,

  status,

  // 🚀 NUEVO: Recibimos si el usuario es administrador
  esAdmin = true,
}) {
  return (
    <div className="space-y-3 mb-3">
      {/* Orden + filtros básicos */}
      {/* 🚀 Ajustamos las columnas de Tailwind dinámicamente si no hay selector de oficina */}
      <div className={`grid grid-cols-1 gap-2 ${esAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <input
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
          placeholder="Buscar (cliente, patente, póliza...)"
          value={search}
          onChange={(e) => onChangeSearch(e.target.value)}
        />

        {/* 🚀 SOLO SE MUESTRA SI ES ADMIN */}
        {esAdmin && (
          <select
            className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
            value={oficina}
            disabled={oficinasStatus === "loading" || (Array.isArray(oficinas) && oficinas.length === 0)}
            onChange={(e) => onChangeOficina(e.target.value)}
            title="Filtrar por oficina"
          >
            <option value="">
              {oficinasStatus === "loading" ? "Cargando oficinas…" : oficinas?.length ? "Todas las oficinas" : "Sin oficinas"}
            </option>
            {Array.isArray(oficinas) &&
              oficinas.map((o) => (
                <option key={String(o.id)} value={String(o.id)}>
                  {o.nombre}
                </option>
              ))}
          </select>
        )}

        <select
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
          value={sortMode}
          onChange={(e) => onChangeSortMode(e.target.value)}
          title="Orden"
        >
          <option value="urgente">Urgencia (más urgente arriba)</option>
          <option value="lejos">Urgencia (más lejos arriba)</option>
          <option value="dias_asc">Días (menor→mayor) *solo página*</option>
          <option value="dias_desc">Días (mayor→menor) *solo página*</option>
        </select>

        <select
          className="px-3 py-2 rounded bg-slate-900 border border-slate-700"
          value={pageSize}
          onChange={(e) => onChangePageSize(Number(e.target.value))}
          title="Tamaño de página"
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/pág
            </option>
          ))}
        </select>
      </div>

      {/* Fecha base */}
      <div className="rounded border border-slate-700 bg-slate-950 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-semibold">Fecha base</span>{" "}
            <span className="opacity-70">(simular vencimientos desde una fecha)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={baseDate}
              onChange={(e) => onChangeBaseDate(e.target.value || "")}
              className="px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
              title="Fecha base (YYYY-MM-DD)"
            />

            <button
              type="button"
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              onClick={() => onChangeBaseDate("")}
              title="Volver a hoy real (sin fecha)"
            >
              Hoy
            </button>
          </div>
        </div>

        <div className="text-xs opacity-60 mt-2">
          {baseDate ? <>Usando fecha={baseDate}</> : <>Sin fecha: se usa “hoy” real</>}
        </div>
      </div>

      {/* Rango personalizado */}
      <div className="rounded border border-slate-700 bg-slate-950 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useCustomRange}
              onChange={(e) => onToggleCustomRange(e.target.checked)}
            />
            <div className="text-sm">
              <span className="font-semibold">Rango personalizado</span>{" "}
              <span className="opacity-70">(vencidas + por vencer juntas)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs opacity-70">Vencidas (días):</div>
            <input
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700"
              type="number"
              min="0"
              value={draftPastDays}
              onChange={(e) => setDraftPastDays(e.target.value)}
              disabled={status === "loading"}
            />

            <div className="text-xs opacity-70">Por vencer (días):</div>
            <input
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700"
              type="number"
              min="0"
              value={draftFutureDays}
              onChange={(e) => setDraftFutureDays(e.target.value)}
              disabled={status === "loading"}
            />

            <button
              type="button"
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              onClick={onApplyCustomRange}
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Toggle finalizadas */}
      <div className="flex items-center gap-2">
        <input
          id="includeFinalizadas"
          type="checkbox"
          checked={includeFinalizadas}
          onChange={(e) => onToggleFinalizadas(e.target.checked)}
        />
        <label htmlFor="includeFinalizadas" className="text-sm opacity-80 select-none">
          Incluir finalizadas <span className="opacity-60">(solo para revisar, no cuenta como “requiere baja”)</span>
        </label>
      </div>
    </div>
  );
}