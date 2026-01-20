// src/components/renovaciones/RenovacionesFiltersBar.jsx
import { useState } from "react";
import { HiSearch, HiX } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function RenovacionesFiltersBar({
  loading,

  // draft values
  uiDias,
  setUiDias,
  uiFechaBase,
  setUiFechaBase,
  uiSoloPendientes,
  setUiSoloPendientes,
  uiSearch,
  setUiSearch,
  uiOrdering,
  setUiOrdering,
  uiOficina,
  setUiOficina,

  // options
  oficinasOptions = [],
  oficinasStatus,
  oficinasLoading,
  oficinasEmpty,

  // paging
  pageSize,
  onChangePageSize,

  // actions
  onApply,
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="mt-4">
      {/* Barra principal */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Oficina */}
        <div className="md:col-span-2 grid gap-2">
          <label className="text-xs font-semibold text-white/90">Oficina</label>
          <select
            value={uiOficina}
            onChange={(e) => setUiOficina(e.target.value)}
            disabled={oficinasLoading && oficinasEmpty}
            className={cx(
              "w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30",
              oficinasLoading && oficinasEmpty ? "opacity-70 cursor-not-allowed" : ""
            )}
          >
            <option value="" className="bg-slate-900 text-white">
              Todas
            </option>

            {oficinasLoading && oficinasEmpty ? (
              <option value="__loading__" disabled className="bg-slate-900 text-white/70">
                Cargando...
              </option>
            ) : null}

            {oficinasOptions.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                {o.label}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-white/55">
            {oficinasStatus === "loading" ? "Cargando oficinas..." : "Lista desde backend."}
          </div>
        </div>

        {/* Buscar */}
        <div className="md:col-span-4 grid gap-2">
          <label className="text-xs font-semibold text-white/90">Buscar</label>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
            <HiSearch className="text-white/70" />
            <input
              value={uiSearch}
              onChange={(e) => setUiSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply?.();
              }}
              className="w-full bg-transparent text-white outline-none"
              placeholder="Asegurado, patente, número, compañía..."
            />
            {!!uiSearch && (
              <button
                className="rounded-lg p-1 text-white/80 hover:bg-white/10"
                onClick={() => setUiSearch("")}
                title="Limpiar"
                type="button"
              >
                <HiX />
              </button>
            )}
          </div>
          <div className="text-[11px] text-white/55">Enter o “Aplicar”.</div>
        </div>

        {/* Días */}
        <div className="md:col-span-1 grid gap-2">
          <label className="text-xs font-semibold text-white/90">Días</label>
          <input
            value={uiDias}
            onChange={(e) => setUiDias(Number(e.target.value || 0))}
            type="number"
            min={0}
            className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
          />
        </div>

        {/* Fecha base */}
        <div className="md:col-span-2 grid gap-2">
          <label className="text-xs font-semibold text-white/90">
            Fecha base (opcional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={uiFechaBase}
              onChange={(e) => setUiFechaBase(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
            />
            <button
              type="button"
              className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/15"
              title="Volver a hoy"
              onClick={() => setUiFechaBase("")}
            >
              Hoy
            </button>
          </div>
          <div className="text-[11px] text-white/55">
            Vacío = cuenta desde hoy.
          </div>
        </div>

        {/* Solo pendientes */}
        <div className="md:col-span-1 grid gap-2">
          <label className="text-xs font-semibold text-white/90">Pendientes</label>
          <button
            className={cx(
              "w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold",
              uiSoloPendientes
                ? "border-emerald-400/30 bg-emerald-300/15 text-emerald-50"
                : "border-white/10 bg-white/10 text-white hover:bg-white/15"
            )}
            onClick={() => setUiSoloPendientes((v) => !v)}
            type="button"
          >
            {uiSoloPendientes ? "✅ Sí" : "No"}
          </button>
        </div>

        {/* Botones */}
        <div className="md:col-span-2 flex items-end gap-2">
          <button
            className="w-full rounded-xl bg-sky-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-sky-200 disabled:opacity-70"
            onClick={onApply}
            disabled={loading}
            type="button"
          >
            Aplicar
          </button>

          <button
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white/80 hover:bg-white/15"
            onClick={() => setShowMore((v) => !v)}
            type="button"
            title="Opciones avanzadas"
          >
            {showMore ? "Menos" : "Más"}
          </button>
        </div>
      </div>

      {/* Avanzado */}
      {showMore && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6 grid gap-2">
            <label className="text-xs font-semibold text-white/90">Orden</label>
            <select
              value={uiOrdering}
              onChange={(e) => setUiOrdering(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="vto_referencia" className="bg-slate-900 text-white">
                Vto referencia (asc)
              </option>
              <option value="-vto_referencia" className="bg-slate-900 text-white">
                Vto referencia (desc)
              </option>
              <option value="fecha_vencimiento" className="bg-slate-900 text-white">
                Vto póliza (asc)
              </option>
              <option value="-fecha_vencimiento" className="bg-slate-900 text-white">
                Vto póliza (desc)
              </option>
              <option value="id" className="bg-slate-900 text-white">
                ID (asc)
              </option>
              <option value="-id" className="bg-slate-900 text-white">
                ID (desc)
              </option>
            </select>
          </div>

          <div className="md:col-span-3 grid gap-2">
            <label className="text-xs font-semibold text-white/90">Tamaño página</label>
            <select
              value={pageSize}
              onChange={(e) => onChangePageSize?.(Number(e.target.value || 25))}
              className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-slate-900 text-white">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <div className="text-[11px] text-white/55">
              Tip: dejá “Más” cerrado para que el usuario vea solo lo esencial.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
