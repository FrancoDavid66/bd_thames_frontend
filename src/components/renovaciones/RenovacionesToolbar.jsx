// src/components/renovaciones/RenovacionesToolbar.jsx
//
// Barra de herramientas de Renovaciones — estilo THAMES (duo-*).
// Junta: buscador (InputDuo) + selector de sucursal (SelectDuo) + las 3 pestañas.
// Como a Renovaciones SOLO entra el admin, el selector de sucursal va siempre visible.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { HiSearch, HiClock, HiClipboardCheck, HiExclamationCircle } from "react-icons/hi";

import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";
import { cx } from "./utils";

const DEBOUNCE_MS = 250;

/* ============ Pestañas (Vencen hoy = protagonista) ============ */
const TABS = [
  { id: "renovar_hoy", label: "Vencen hoy", icon: HiClock, tono: "amarillo" },
  { id: "en_3_dias", label: "En 3 días", icon: HiClipboardCheck, tono: "azul" },
  { id: "vencidas", label: "Vencidas", icon: HiExclamationCircle, tono: "rojo" },
];

// Clases del pill de pestaña, según tono + activa/inactiva.
function tabClasses(tono, active) {
  if (!active) {
    return "bg-card dark:bg-card-dark text-suave dark:text-suave-dark border-2 border-linea dark:border-linea-dark hover:border-duo-azul/40";
  }
  switch (tono) {
    case "amarillo":
      return "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo border-2 border-duo-amarillo";
    case "azul":
      return "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul border-2 border-duo-azul";
    case "rojo":
      return "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo border-2 border-duo-rojo";
    default:
      return "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-2 border-linea dark:border-linea-dark";
  }
}

export default function RenovacionesToolbar({
  loading,
  search,
  setSearch,
  oficina,
  setOficina,
  oficinasOptions = [],
  totalCount = 0,
  activeTab = "renovar_hoy",
  onChangeTab,
  tabCounts = { renovar_hoy: 0, en_3_dias: 0, vencidas: 0 },
}) {
  /* ---- Buscador local con debounce ---- */
  const [localSearch, setLocalSearch] = useState(search || "");
  const timerRef = useRef(null);

  useEffect(() => {
    if (search === "" && localSearch !== "") setLocalSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const commitSearch = useCallback((value) => setSearch((value ?? "").trim()), [setSearch]);

  const onSearchChange = useCallback(
    (val) => {
      setLocalSearch(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commitSearch(val), DEBOUNCE_MS);
    },
    [commitSearch]
  );

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const searchHint = useMemo(() => {
    const trimmed = (localSearch || "").trim();
    if (!trimmed) return null;
    if (loading) return { text: `Buscando "${trimmed}"…`, cls: "text-duo-azul" };
    if (totalCount === 0) return { text: `Sin resultados para "${trimmed}"`, cls: "text-duo-amarillo-sombra dark:text-duo-amarillo" };
    return { text: `${totalCount} resultado${totalCount === 1 ? "" : "s"} para "${trimmed}"`, cls: "text-duo-verde-sombra dark:text-duo-verde" };
  }, [loading, localSearch, totalCount]);

  const oficinaOpts = [
    { value: "", label: "🏢 Todas las sucursales" },
    ...(Array.isArray(oficinasOptions) ? oficinasOptions : []),
  ];

  return (
    <div className="space-y-4">
      {/* ============ PESTAÑAS ============ */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          const count = Number(tabCounts?.[t.id] || 0);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab?.(t.id)}
              aria-pressed={active}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide transition-colors",
                tabClasses(t.tono, active)
              )}
            >
              <Icon className="text-base" />
              <span>{t.label}</span>
              <span className="rounded-full bg-black/10 dark:bg-white/10 px-2 py-0 text-[11px] font-black min-w-[22px] text-center tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============ BUSCADOR + SUCURSAL ============ */}
      <div className="grid gap-3 sm:grid-cols-[1fr_280px]">
        <div>
          <InputDuo
            value={localSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (timerRef.current) clearTimeout(timerRef.current);
                commitSearch(localSearch);
              }
            }}
            placeholder="Buscar por asegurado, patente, póliza, compañía…"
            icon={<HiSearch />}
          />
          {searchHint && (
            <p className={cx("text-[11px] font-extrabold mt-1 ml-1", searchHint.cls)}>{searchHint.text}</p>
          )}
        </div>

        <SelectDuo
          value={String(oficina || "")}
          onChange={(e) => setOficina(String(e.target.value || ""))}
          disabled={loading}
          options={oficinaOpts}
        />
      </div>
    </div>
  );
}