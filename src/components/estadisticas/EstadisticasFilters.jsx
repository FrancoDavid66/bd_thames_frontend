// src/components/estadisticas/EstadisticasFilters.jsx
import { useEffect, useState } from "react";
import AnimatedCard from "./AnimatedCard";
import { HiOfficeBuilding, HiCalendar, HiChartBar } from "react-icons/hi";

// 🚀 Ordenamiento inteligente
const sortOficinas = (arr, getOficinaNombre) => {
  const order = ["1", "2", "3", "OTRAS", "SIN_OFICINA"];
  const orderIdx = new Map(order.map((v, i) => [v, i]));

  return [...arr].sort((a, b) => {
    const A = String(a ?? "").trim();
    const B = String(b ?? "").trim();

    const ia = orderIdx.has(A) ? orderIdx.get(A) : 999;
    const ib = orderIdx.has(B) ? orderIdx.get(B) : 999;

    if (ia !== 999 || ib !== 999) {
      if (ia !== ib) return ia - ib;
    }

    const nameA = typeof getOficinaNombre === "function" ? getOficinaNombre(A) : A;
    const nameB = typeof getOficinaNombre === "function" ? getOficinaNombre(B) : B;

    const la = String(nameA || "").toLowerCase();
    const lb = String(nameB || "").toLowerCase();
    return la.localeCompare(lb, "es");
  });
};

export default function EstadisticasFilters({
  oficina,
  setOficina,
  oficinasOptions,
  anio,
  onAnioChange,
  mes,
  onMesChange,
  fuenteSnapshot,
  setFuenteSnapshot,
  desde,
  hasta,
  getOficinaNombre, // 🚀 ACÁ RECIBE LA FUNCIÓN
}) {
  const raw = Array.isArray(oficinasOptions) ? oficinasOptions : [];
  const unique = Array.from(new Set(raw.map((x) => String(x ?? "").trim()).filter(Boolean)));
  
  const ordered = sortOficinas(unique, getOficinaNombre);

  const currentYear = new Date().getFullYear();
  const minYear = 2000;
  const maxYear = currentYear + 1;

  const [anioInput, setAnioInput] = useState(String(anio ?? ""));

  useEffect(() => {
    setAnioInput(String(anio ?? ""));
  }, [anio]);

  const commitYear = (rawValue) => {
    const t = String(rawValue ?? "").trim();
    if (!t) {
      setAnioInput(String(anio ?? ""));
      return;
    }
    const onlyDigits = t.replace(/\D+/g, "").slice(0, 4);
    const n = Number(onlyDigits);
    if (!Number.isFinite(n)) {
      setAnioInput(String(anio ?? ""));
      return;
    }
    const clamped = Math.max(minYear, Math.min(maxYear, n));
    setAnioInput(String(clamped));
    onAnioChange(String(clamped));
  };

  const handleYearChange = (e) => {
    const v = e.target.value;
    const onlyDigits = String(v ?? "").replace(/\D+/g, "").slice(0, 4);
    setAnioInput(onlyDigits);
    if (onlyDigits.length === 4) {
      commitYear(onlyDigits);
    }
  };

  return (
    <AnimatedCard index={1} interactive={false} glow="from-emerald-500/40 via-cyan-500/25 to-transparent">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {/* Oficina */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiOfficeBuilding className="text-sky-300" />
            Oficina
          </label>
          <select
            className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={String(oficina ?? "")}
            onChange={(e) => setOficina(String(e.target.value))}
          >
            <option value="">Todas las oficinas</option>

            {ordered.map((of) => {
              // 🚀 ACÁ CONVERTIMOS EL ID AL NOMBRE REAL
              let label = typeof getOficinaNombre === "function" ? getOficinaNombre(of) : of;
              
              // Limpiamos los textos legacy por si acaso
              label = String(label).replace(/\s*\(\d+\)$/, "");
              const isNumeric = !isNaN(of) && String(of).trim() !== "";

              return (
                <option key={of} value={of}>
                  {isNumeric ? `${of} (${label})` : label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiCalendar className="text-sky-300" />
            Año
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="2026"
            className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={anioInput}
            onChange={handleYearChange}
            onBlur={() => commitYear(anioInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <div className="text-[10px] text-slate-400">Rango: {minYear}–{maxYear}</div>
        </div>

        {/* Mes */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiCalendar className="text-sky-300" />
            Mes
          </label>
          <select
            className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={mes}
            onChange={(e) => onMesChange(e.target.value)}
          >
            <option value={1}>Enero</option>
            <option value={2}>Febrero</option>
            <option value={3}>Marzo</option>
            <option value={4}>Abril</option>
            <option value={5}>Mayo</option>
            <option value={6}>Junio</option>
            <option value={7}>Julio</option>
            <option value={8}>Agosto</option>
            <option value={9}>Septiembre</option>
            <option value={10}>Octubre</option>
            <option value={11}>Noviembre</option>
            <option value={12}>Diciembre</option>
          </select>
        </div>

        {/* Modo de cálculo */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiChartBar className="text-sky-300" />
            Modo de cálculo
          </label>
          <select
            className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={fuenteSnapshot}
            onChange={(e) => setFuenteSnapshot(e.target.value)}
          >
            <option value="live">Cálculo en vivo</option>
            <option value="snapshot">Snapshot guardado (si existe)</option>
          </select>

          {desde && hasta && (
            <span className="mt-0.5 text-[10px] text-slate-400">
              Período: {desde} → {hasta}
            </span>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}