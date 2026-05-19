// src/components/renovaciones/RenovacionesFiltersBar.jsx
//
// ✅ Filtros 100% frontend (no llaman al backend, todo instantáneo).
// ✅ Buscador con debounce visual para no saturar el filtrado en cada tecla.
// ✅ Feedback de estado claro: "Escribiendo..." / "N resultados" / "Sin resultados".
//
// La oficina y soloPendientes sí causan recarga del backend, pero eso lo
// maneja la page que escucha esos states con un useEffect → load().

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { HiSearch, HiX, HiCheck, HiOfficeBuilding } from "react-icons/hi";

const DEBOUNCE_MS = 250;

export default function RenovacionesFiltersBar({
  loading,
  search,
  setSearch,
  oficina,
  setOficina,
  soloPendientes,
  setSoloPendientes,
  oficinasOptions = [],
  isWebAdmin,
  totalCount = 0,
}) {
  /* ============ BUSCADOR LOCAL CON DEBOUNCE ============
     Mostramos `localSearch` en el input para feedback inmediato.
     Cada 250ms commiteamos a `search` (el padre) que dispara el filtrado.
  ============================================================== */
  const [localSearch, setLocalSearch] = useState(search || "");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);

  // Sincronizar si el padre limpia desde afuera
  useEffect(() => {
    if (search === "" && localSearch !== "") {
      setLocalSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const commitSearch = useCallback((value) => {
    setSearch((value ?? "").trim());
    setIsTyping(false);
  }, [setSearch]);

  const onSearchChange = useCallback((val) => {
    setLocalSearch(val);
    setIsTyping(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitSearch(val), DEBOUNCE_MS);
  }, [commitSearch]);

  const clearSearch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalSearch("");
    commitSearch("");
  }, [commitSearch]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Estado del buscador (para el hint debajo del input)
  const searchState = useMemo(() => {
    const trimmed = (localSearch || "").trim();
    if (isTyping && trimmed) return "typing";
    if (loading && trimmed) return "searching";
    if (trimmed && totalCount === 0) return "no-results";
    if (trimmed && totalCount > 0) return "results";
    return "idle";
  }, [isTyping, loading, localSearch, totalCount]);

  const searchHint = useMemo(() => {
    const trimmed = (localSearch || "").trim();
    switch (searchState) {
      case "typing":
        return { text: "Escribiendo…", color: "text-white/50" };
      case "searching":
        return { text: `Buscando "${trimmed}"…`, color: "text-sky-300" };
      case "results":
        return {
          text: `${totalCount} resultado${totalCount === 1 ? "" : "s"} para "${trimmed}"`,
          color: "text-emerald-300",
        };
      case "no-results":
        return { text: `Sin resultados para "${trimmed}"`, color: "text-amber-300" };
      default:
        return null;
    }
  }, [searchState, localSearch, totalCount]);

  return (
    <div className="mt-5 space-y-3">
      {/* ============ BUSCADOR ============ */}
      <div className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            {isTyping ? (
              <SpinnerIcon className="text-sky-300" />
            ) : (
              <HiSearch className="text-white/50" />
            )}
          </div>

          <input
            type="text"
            value={localSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (timerRef.current) clearTimeout(timerRef.current);
                commitSearch(localSearch);
              }
              if (e.key === "Escape" && localSearch) {
                clearSearch();
              }
            }}
            placeholder="Buscar por asegurado, patente, póliza, compañía…"
            aria-label="Buscar renovaciones"
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-24 py-3 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors"
          />

          {localSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute inset-y-0 right-3 flex items-center gap-1 text-xs text-white/60 hover:text-white"
              title="Limpiar búsqueda (Esc)"
              aria-label="Limpiar búsqueda"
            >
              <span className="hidden md:inline">Limpiar</span>
              <HiX />
            </button>
          )}
        </div>

        {searchHint && (
          <div className={`mt-1.5 ml-1 text-[11px] font-medium ${searchHint.color} flex items-center gap-1.5`}>
            {searchState === "typing" && <SpinnerIcon className="h-3 w-3" />}
            <span>{searchHint.text}</span>
          </div>
        )}
      </div>

      {/* ============ FILTROS SECUNDARIOS ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Oficina (solo admin) */}
        {isWebAdmin && (
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <HiOfficeBuilding className="text-white/50" />
            </div>
            <select
              value={String(oficina || "")}
              onChange={(e) => setOficina(String(e.target.value || ""))}
              disabled={loading}
              aria-label="Filtrar por sucursal"
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-sky-400/50 focus:bg-white/10 transition-colors appearance-none cursor-pointer disabled:opacity-60"
            >
              <option value="" className="bg-slate-900 text-white">
                Todas las sucursales
              </option>
              {(Array.isArray(oficinasOptions) ? oficinasOptions : []).map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-900 text-white">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Solo pendientes */}
        <button
          type="button"
          onClick={() => setSoloPendientes(!soloPendientes)}
          disabled={loading}
          aria-label="Toggle solo pendientes"
          aria-pressed={soloPendientes}
          className={`flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold py-2.5 transition-all disabled:opacity-60 ${
            soloPendientes
              ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/25"
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
          } ${!isWebAdmin ? "sm:col-span-2" : ""}`}
        >
          {soloPendientes ? <HiCheck className="text-lg" /> : <HiX className="text-lg" />}
          {soloPendientes ? "Solo pendientes de pago" : "Todas (incluye pagas)"}
        </button>
      </div>
    </div>
  );
}

/* ============ Spinner SVG inline ============ */
function SpinnerIcon({ className = "" }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}