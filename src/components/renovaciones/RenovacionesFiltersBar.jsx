// src/components/renovaciones/RenovacionesFiltersBar.jsx
import { useMemo, useCallback } from "react";
import { HiSearch, HiX, HiCheck } from "react-icons/hi";

export default function RenovacionesFiltersBar({
  loading,
  search,
  setSearch,
  oficina,
  setOficina,
  soloPendientes,
  setSoloPendientes,
  bucket,
  setBucket,
  oficinasOptions = [],
  resumenBuckets = {},
  onApply, // fuerza recarga
  isWebAdmin, // 🚀 RECIBIMOS LA VARIABLE DE SEGURIDAD
}) {
  // Opciones del menú desplegable de "Momento de Vencimiento"
  const timeOptions = useMemo(
    () => [
      { value: "", label: "Todas las ventanas (30 días)" },
      { value: "hoy", label: `Vencen Hoy (${resumenBuckets?.vence_hoy || 0})` },
      { value: "en_1", label: `Vencen Mañana (${resumenBuckets?.vence_en_1 || 0})` },
      { value: "proximos_3", label: `Próximos 3 días (${resumenBuckets?.proximos_3 || 0})` },
      { value: "vencidas_3", label: `Vencidas recientes 1 a 3 días (${resumenBuckets?.vencidas_3 || 0})` },
      { value: "vencidas", label: `Vencidas antiguas 4+ días (${resumenBuckets?.vencidas_4_mas || 0})` },
    ],
    [resumenBuckets]
  );

  // Aplica cambios y recarga al toque (sin timeouts “mágicos”)
  const handleChange = useCallback(
    (setter, value) => {
      if (typeof setter === "function") setter(value);
      if (typeof onApply === "function") {
        // rAF = garantiza que el state se setee antes de recargar
        requestAnimationFrame(() => onApply());
      }
    },
    [onApply]
  );

  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
      {/* 1. BUSCADOR */}
      <div className="lg:col-span-4 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <HiSearch className="text-white/50" />
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApply?.()}
          placeholder="Buscar asegurado, patente, póliza..."
          aria-label="Buscar renovaciones"
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors disabled:opacity-60"
        />

        {search && (
          <button
            type="button"
            onClick={() => handleChange(setSearch, "")}
            className="absolute inset-y-0 right-3 flex items-center text-white/50 hover:text-white disabled:opacity-60"
            disabled={loading}
            aria-label="Limpiar búsqueda"
            title="Limpiar"
          >
            <HiX />
          </button>
        )}
      </div>

      {/* 2. FILTRO DE VENCIMIENTOS */}
      <div className="lg:col-span-3">
        <select
          value={bucket || ""}
          onChange={(e) => handleChange(setBucket, e.target.value)}
          disabled={loading}
          aria-label="Filtrar por ventana de vencimiento"
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors appearance-none cursor-pointer disabled:opacity-60"
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. FILTRO DE OFICINAS (🚀 OCULTO SI NO ES ADMIN) */}
      {isWebAdmin ? (
        <div className="lg:col-span-3">
          <select
            value={String(oficina || "")}
            onChange={(e) => handleChange(setOficina, String(e.target.value || ""))}
            disabled={loading}
            aria-label="Filtrar por oficina"
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors appearance-none cursor-pointer disabled:opacity-60"
          >
            <option value="" className="bg-slate-900 text-white">
              Todas las oficinas
            </option>
            {(Array.isArray(oficinasOptions) ? oficinasOptions : []).map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="lg:col-span-3 hidden lg:block"></div> /* Placeholder para mantener la grilla */
      )}

      {/* 4. TOGGLE SOLO PENDIENTES */}
      <div className="lg:col-span-2">
        <button
          type="button"
          onClick={() => handleChange(setSoloPendientes, !soloPendientes)}
          disabled={loading}
          aria-label="Toggle solo pendientes"
          className={`w-full h-full flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all disabled:opacity-60 ${
            soloPendientes
              ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/25"
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
          }`}
        >
          {soloPendientes ? <HiCheck className="text-lg" /> : <HiX className="text-lg" />}
          Pendientes
        </button>
      </div>
    </div>
  );
}