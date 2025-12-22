// src/components/estadisticas/EstadisticasFilters.jsx
import AnimatedCard from "./AnimatedCard";
import { HiOfficeBuilding, HiCalendar, HiChartBar } from "react-icons/hi";

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
}) {
  return (
    <AnimatedCard
      index={1}
      interactive={false}
      glow="from-emerald-500/40 via-cyan-500/25 to-transparent"
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {/* Oficina */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiOfficeBuilding className="text-sky-300" />
            Oficina
          </label>
          <select
            className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={oficina}
            onChange={(e) => setOficina(e.target.value)}
          >
            <option value="">Todas las oficinas</option>
            {oficinasOptions.map((of) => (
              <option key={of} value={of}>
                {String(of)}
              </option>
            ))}
          </select>
        </div>

        {/* Año */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiCalendar className="text-sky-300" />
            Año
          </label>
          <input
            type="number"
            className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={anio}
            onChange={(e) => onAnioChange(e.target.value)}
          />
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
