// src/components/estadisticas/EstadisticasFilters.jsx  (diseño Duo)
import { useEffect, useState } from "react";
import AnimatedCard from "./AnimatedCard";
import { HiOfficeBuilding, HiCalendar, HiChartBar } from "react-icons/hi";

// 🚀 Ordenamiento 100% dinámico y alfabético
const sortOficinas = (arr, getOficinaNombre) => {
  return [...arr].sort((a, b) => {
    const A = String(a ?? "").trim();
    const B = String(b ?? "").trim();

    // Mandamos "OTRAS" y "SIN_OFICINA" al final de la lista siempre
    if (A === "SIN_OFICINA" || A === "OTRAS") return 1;
    if (B === "SIN_OFICINA" || B === "OTRAS") return -1;

    const nameA = typeof getOficinaNombre === "function" ? getOficinaNombre(A) : A;
    const nameB = typeof getOficinaNombre === "function" ? getOficinaNombre(B) : B;

    return nameA.localeCompare(nameB, "es");
  });
};

const fieldCls =
  "h-11 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-sm font-bold px-2.5 text-titulo dark:text-titulo-dark focus:outline-none focus:border-oficina transition-colors dark:[color-scheme:dark]";
const labelCls =
  "text-xs font-black text-titulo dark:text-titulo-dark flex items-center gap-1.5";

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
  getOficinaNombre,
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
    <AnimatedCard index={1} interactive={false}>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {/* Oficina */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            <HiOfficeBuilding className="text-oficina" />
            Oficina
          </label>
          <select
            className={fieldCls}
            value={String(oficina ?? "")}
            onChange={(e) => setOficina(String(e.target.value))}
          >
            <option value="">Todas las oficinas</option>

            {ordered.map((of) => {
              // 🚀 ACÁ CONVERTIMOS EL ID AL NOMBRE REAL DE LA DB
              const label = typeof getOficinaNombre === "function" ? getOficinaNombre(of) : of;

              return (
                <option key={of} value={of}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            <HiCalendar className="text-oficina" />
            Año
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="2026"
            className={fieldCls}
            value={anioInput}
            onChange={handleYearChange}
            onBlur={() => commitYear(anioInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <div className="text-[10px] font-bold text-suave dark:text-suave-dark">Rango: {minYear}–{maxYear}</div>
        </div>

        {/* Mes */}
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            <HiCalendar className="text-oficina" />
            Mes
          </label>
          <select
            className={fieldCls}
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
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            <HiChartBar className="text-oficina" />
            Modo de cálculo
          </label>
          <select
            className={fieldCls}
            value={fuenteSnapshot}
            onChange={(e) => setFuenteSnapshot(e.target.value)}
          >
            <option value="live">Cálculo en vivo</option>
            <option value="snapshot">Snapshot guardado (si existe)</option>
          </select>

          {desde && hasta && (
            <span className="mt-0.5 text-[10px] font-bold text-suave dark:text-suave-dark">
              Período: {desde} → {hasta}
            </span>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}
