// src/components/renovaciones/RenovacionesFiltersBar.jsx
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { HiSearch, HiX } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

function Chip({ active, tone = "neutral", onClick, children, title }) {
  const toneMap = {
    neutral: "border-white/10 bg-white/10 text-white/85 hover:bg-white/15",
    blue: "border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15",
    green: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
    red: "border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    yellow: "border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
  };

  const activeMap = {
    neutral: "border-white/30 bg-white/20 text-white",
    blue: "border-sky-400/45 bg-sky-500/25 text-sky-50",
    green: "border-emerald-400/45 bg-emerald-500/25 text-emerald-50",
    red: "border-rose-400/45 bg-rose-500/25 text-rose-50",
    yellow: "border-amber-400/45 bg-amber-500/25 text-amber-50",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-extrabold transition",
        active ? (activeMap[tone] || activeMap.neutral) : (toneMap[tone] || toneMap.neutral)
      )}
    >
      {children}
    </button>
  );
}

export default function RenovacionesFiltersBar({
  loading,

  // base label (para mostrar "Contando desde HOY")
  baseCalculoLabel, // string "DD/MM/YYYY"

  // draft values
  uiDias,
  setUiDias,

  uiFechaBase,
  setUiFechaBase,

  uiSoloPendientes,
  setUiSoloPendientes,

  uiSearch,
  setUiSearch,

  uiOficina,
  setUiOficina,

  // options
  oficinasOptions = [],
  oficinasStatus,

  // actions
  onApply,
}) {
  const [showMore, setShowMore] = useState(false);

  // Oficinas rápidas (las 3 “fijas”)
  const oficinasQuick = useMemo(
    () => [
      { value: "", label: "Todas" },
      { value: "1", label: "5 esquinas" },
      { value: "2", label: "Axion" },
      { value: "3", label: "39" },
    ],
    []
  );

  // Ventana rápida de días
  const diasQuick = useMemo(() => [7, 15, 30, 60], []);
  const hasCustomDias = !diasQuick.includes(Number(uiDias || 0));

  const showBaseText = useMemo(() => {
    if (uiFechaBase) return `Contando desde: ${dayjs(uiFechaBase).format("DD/MM/YYYY")}`;
    return `Contando desde: ${baseCalculoLabel || dayjs().format("DD/MM/YYYY")} (HOY)`;
  }, [uiFechaBase, baseCalculoLabel]);

  return (
    <div className="mt-4">
      {/* Línea 1: Oficina (rápida) + Pendientes */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-white/70 mr-1">Oficina:</div>

          {oficinasQuick.map((o) => (
            <Chip
              key={o.value || "__all__"}
              active={String(uiOficina || "") === String(o.value)}
              tone="blue"
              title={o.value ? `Filtrar por oficina ${o.label}` : "Todas las oficinas"}
              onClick={() => {
                setUiOficina(String(o.value));
                onApply?.(); // ✅ 1 click y listo
              }}
            >
              {o.label}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-white/70">{showBaseText}</div>

          <button
            type="button"
            className={cx(
              "rounded-full border px-3 py-2 text-sm font-extrabold",
              uiSoloPendientes
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/20"
                : "border-white/10 bg-white/10 text-white/85 hover:bg-white/15"
            )}
            onClick={() => {
              setUiSoloPendientes((v) => !v);
              onApply?.(); // ✅ auto-aplicar
            }}
            title="Mostrar solo pendientes"
          >
            {uiSoloPendientes ? "Pendientes ✅" : "Pendientes ❌"}
          </button>

          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-extrabold text-white/85 hover:bg-white/15"
            onClick={() => setShowMore((v) => !v)}
            title="Opciones avanzadas"
          >
            {showMore ? "Menos" : "Más"}
          </button>
        </div>
      </div>

      {/* Línea 2: Buscar + Días rápidos + Aplicar */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Buscar */}
        <div className="md:col-span-6 grid gap-2">
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
                onClick={() => {
                  setUiSearch("");
                  onApply?.();
                }}
                title="Limpiar"
                type="button"
              >
                <HiX />
              </button>
            )}
          </div>
          <div className="text-[11px] text-white/55">
            Enter o “Aplicar”. (Se cuenta desde HOY salvo que cambies fecha base en “Más”.)
          </div>
        </div>

        {/* Ventana (días) */}
        <div className="md:col-span-4 grid gap-2">
          <label className="text-xs font-semibold text-white/90">Ventana</label>

          <div className="flex flex-wrap items-center gap-2">
            {diasQuick.map((n) => (
              <Chip
                key={n}
                active={Number(uiDias || 0) === n}
                tone="yellow"
                title={`Ver vencimientos hasta +${n} días`}
                onClick={() => {
                  setUiDias(n);
                  onApply?.();
                }}
              >
                {n} días
              </Chip>
            ))}

            <Chip
              active={hasCustomDias}
              tone="yellow"
              title="Ventana personalizada (en Más)"
              onClick={() => setShowMore(true)}
            >
              {hasCustomDias ? `Custom: ${uiDias}` : "Custom"}
            </Chip>
          </div>

          <div className="text-[11px] text-white/55">
            Esto es “hasta +X días” (desde HOY por defecto).
          </div>
        </div>

        {/* Aplicar */}
        <div className="md:col-span-2 flex items-end gap-2">
          <button
            className="w-full rounded-xl bg-sky-300 px-4 py-2 text-sm font-extrabold text-black hover:bg-sky-200 disabled:opacity-70"
            onClick={onApply}
            disabled={loading}
            type="button"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Avanzado */}
      {showMore && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            {/* Fecha base */}
            <div className="md:col-span-4 grid gap-2">
              <label className="text-xs font-semibold text-white/90">Fecha base (opcional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={uiFechaBase}
                  onChange={(e) => setUiFechaBase(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/15"
                  title="Volver a HOY"
                  onClick={() => setUiFechaBase("")}
                >
                  Hoy
                </button>
              </div>
              <div className="text-[11px] text-white/55">
                Vacío = HOY. Si ponés fecha, todo se calcula desde esa fecha.
              </div>
            </div>

            {/* Días custom */}
            <div className="md:col-span-2 grid gap-2">
              <label className="text-xs font-semibold text-white/90">Días (custom)</label>
              <input
                value={uiDias}
                onChange={(e) => setUiDias(Number(e.target.value || 0))}
                type="number"
                min={0}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
              />
              <div className="text-[11px] text-white/55">Ej: 10, 45, 90…</div>
            </div>

            {/* Oficina select (fallback) */}
            <div className="md:col-span-3 grid gap-2">
              <label className="text-xs font-semibold text-white/90">Oficina (lista)</label>
              <select
                value={uiOficina}
                onChange={(e) => setUiOficina(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 text-white px-3 py-2 outline-none focus:border-white/30"
              >
                <option value="" className="bg-slate-900 text-white">
                  Todas
                </option>
                {oficinasOptions.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-white/55">
                {oficinasStatus === "loading" ? "Cargando oficinas..." : "Desde backend."}
              </div>
            </div>

            <div className="md:col-span-3 flex items-end">
              <div className="text-[11px] text-white/55">
                Avanzado: si lo dejás cerrado, el usuario ve lo simple.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
