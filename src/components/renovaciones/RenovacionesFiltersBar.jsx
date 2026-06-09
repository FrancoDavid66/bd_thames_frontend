// src/components/renovaciones/RenovacionesFiltersBar.jsx
//
// Versión compacta: buscador arriba (full width), sucursal + checkbox en 1 sola fila.
// Sin labels gigantes, sin bloques duplicados.

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
  minimal = false,
}) {
  /* ============ BUSCADOR LOCAL CON DEBOUNCE ============ */
  const [localSearch, setLocalSearch] = useState(search || "");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (search === "" && localSearch !== "") {
      setLocalSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const commitSearch = useCallback(
    (value) => {
      setSearch((value ?? "").trim());
      setIsTyping(false);
    },
    [setSearch]
  );

  const onSearchChange = useCallback(
    (val) => {
      setLocalSearch(val);
      setIsTyping(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commitSearch(val), DEBOUNCE_MS);
    },
    [commitSearch]
  );

  const clearSearch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalSearch("");
    commitSearch("");
  }, [commitSearch]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const searchHint = useMemo(() => {
    const trimmed = (localSearch || "").trim();
    if (!trimmed) return null;
    if (isTyping) return { text: "Escribiendo…", color: "text-white/40" };
    if (loading) return { text: `Buscando "${trimmed}"…`, color: "text-sky-300" };
    if (totalCount === 0) return { text: `Sin resultados para "${trimmed}"`, color: "text-amber-300" };
    return {
      text: `${totalCount} resultado${totalCount === 1 ? "" : "s"} para "${trimmed}"`,
      color: "text-emerald-300",
    };
  }, [isTyping, loading, localSearch, totalCount]);

  return (
    <div className="mt-4 space-y-2.5">
      {/* ============ BUSCADOR ============ */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {isTyping ? <Spinner /> : <HiSearch className="text-white/40" />}
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
            if (e.key === "Escape" && localSearch) clearSearch();
          }}
          placeholder="Buscar por asegurado, patente, póliza, compañía…"
          aria-label="Buscar renovaciones"
          className="w-full bg-white/[0.04] border border-white/10 text-white text-sm rounded-xl pl-10 pr-20 py-2.5 outline-none focus:border-sky-400/40 focus:bg-white/[0.06] transition-colors"
        />

        {localSearch && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute inset-y-0 right-3 flex items-center gap-1 text-xs text-white/50 hover:text-white"
            title="Limpiar (Esc)"
            aria-label="Limpiar búsqueda"
          >
            <HiX />
          </button>
        )}
      </div>

      {searchHint && (
        <div className={`text-[10px] font-medium ml-1 -mt-1 ${searchHint.color} flex items-center gap-1`}>
          {searchHint.text}
        </div>
      )}

      {/* ============ SUCURSAL + SOLO PENDIENTES (1 sola fila) ============ */}
      {/* En modo minimal seguimos mostrando la sucursal SOLO para admin
          (sin ella, un admin no tiene scope y no ve datos). */}
      {(!minimal || isWebAdmin) && (
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Oficina (solo admin) */}
        {isWebAdmin && (
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <HiOfficeBuilding className="text-white/40" />
            </div>
            <select
              value={String(oficina || "")}
              onChange={(e) => setOficina(String(e.target.value || ""))}
              disabled={loading}
              aria-label="Filtrar por sucursal"
              className="w-full bg-white/[0.04] border border-white/10 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none focus:border-sky-400/40 focus:bg-white/[0.06] transition-colors appearance-none cursor-pointer disabled:opacity-50"
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

        {/* Solo pendientes (compacto) — oculto en modo minimal */}
        {!minimal && (
        <button
          type="button"
          onClick={() => setSoloPendientes(!soloPendientes)}
          disabled={loading}
          aria-pressed={soloPendientes}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold py-2 px-4 transition-all disabled:opacity-50 whitespace-nowrap ${
            soloPendientes
              ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25"
              : "bg-white/[0.04] border-white/10 text-white/55 hover:bg-white/10"
          } ${!isWebAdmin ? "w-full" : ""}`}
        >
          {soloPendientes ? <HiCheck /> : <HiX className="opacity-50" />}
          Solo pendientes de pago
        </button>
        )}
      </div>
      )}
    </div>
  );
}

/* ============ Spinner inline ============ */
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-sky-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}