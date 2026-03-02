// src/components/renovaciones/RenovacionesFiltersBar.jsx
import { useMemo } from "react";
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
  onApply, // Lo llamamos para forzar la recarga al cambiar algo
}) {
  
  // Opciones del menú desplegable de "Momento de Vencimiento"
  const timeOptions = useMemo(() => [
    { value: "", label: "Todas las ventanas (30 días)" },
    { value: "hoy", label: `Vencen Hoy (${resumenBuckets?.vence_hoy || 0})` },
    { value: "en_1", label: `Vencen Mañana (${resumenBuckets?.vence_en_1 || 0})` },
    { value: "proximos_3", label: `Próximos 3 días (${resumenBuckets?.proximos_3 || 0})` },
    { value: "vencidas_3", label: `Vencidas recientes 1 a 3 días (${resumenBuckets?.vencidas_3 || 0})` },
    { value: "vencidas", label: `Vencidas antiguas 4+ días (${resumenBuckets?.vencidas_4_mas || 0})` },
  ], [resumenBuckets]);

  // Ejecuta el cambio y recarga automáticamente
  const handleChange = (setter, value) => {
    setter(value);
    setTimeout(() => onApply(), 50);
  };

  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
      
      {/* 1. BUSCADOR (Ocupa más espacio) */}
      <div className="lg:col-span-4 relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <HiSearch className="text-white/50" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onApply()}
          placeholder="Buscar asegurado, patente, póliza..."
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors"
        />
        {search && (
          <button
            onClick={() => handleChange(setSearch, "")}
            className="absolute inset-y-0 right-3 flex items-center text-white/50 hover:text-white"
          >
            <HiX />
          </button>
        )}
      </div>

      {/* 2. FILTRO DE VENCIMIENTOS (Reemplaza la sopa de botones) */}
      <div className="lg:col-span-3">
        <select
          value={bucket}
          onChange={(e) => handleChange(setBucket, e.target.value)}
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors appearance-none cursor-pointer"
        >
          {timeOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. FILTRO DE OFICINAS */}
      <div className="lg:col-span-3">
        <select
          value={oficina}
          onChange={(e) => handleChange(setOficina, e.target.value)}
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors appearance-none cursor-pointer"
        >
          <option value="" className="bg-slate-900 text-white">Todas las oficinas</option>
          {oficinasOptions.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-900 text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4. TOGGLE SOLO PENDIENTES */}
      <div className="lg:col-span-2">
        <button
          onClick={() => handleChange(setSoloPendientes, !soloPendientes)}
          disabled={loading}
          className={`w-full h-full flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all ${
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