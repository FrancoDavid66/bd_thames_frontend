// src/components/estadisticas/EstadisticasSummaryCards.jsx
import { HiChartBar, HiShieldCheck, HiExclamation, HiTrendingDown } from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

export default function EstadisticasSummaryCards({ totales, churnGlobal, churnPromedio, onCardClick }) {
  const churnValue = churnGlobal !== undefined ? churnGlobal : churnPromedio;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      
      {/* 1. Pólizas Totales */}
      <AnimatedCard index={3} glow="from-sky-500/60 via-cyan-500/35 to-transparent">
        <div className="flex flex-col gap-2 cursor-pointer hover:bg-slate-900/50 p-1 rounded-xl transition-colors" onClick={() => onCardClick("TOTALES")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Pólizas totales
            </span>
            <HiChartBar className="h-5 w-5 text-sky-300" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales?.total || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-[11px] sm:text-xs font-medium text-slate-400">
            Stock total de pólizas en las oficinas. <span className="text-sky-400 font-bold block mt-0.5">Ver lista ➔</span>
          </p>
        </div>
      </AnimatedCard>

      {/* 2. Pólizas Activas */}
      <AnimatedCard index={4} glow="from-emerald-500/60 via-sky-500/30 to-transparent">
        <div className="flex flex-col gap-2 cursor-pointer hover:bg-slate-900/50 p-1 rounded-xl transition-colors" onClick={() => onCardClick("ACTIVAS")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Pólizas activas
            </span>
            <HiShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales?.activas || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-[11px] sm:text-xs font-medium text-slate-400">
            Pólizas en estado <strong>activa</strong>. <span className="text-emerald-400 font-bold block mt-0.5">Ver lista ➔</span>
          </p>
        </div>
      </AnimatedCard>

      {/* 3. Altas del Mes */}
      <AnimatedCard index={5} glow="from-emerald-400/60 via-lime-400/30 to-transparent">
        <div className="flex flex-col gap-2 cursor-pointer hover:bg-slate-900/50 p-1 rounded-xl transition-colors" onClick={() => onCardClick("ALTAS")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Altas del mes
            </span>
            <HiChartBar className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales?.nuevas || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-[11px] sm:text-xs font-medium text-slate-400">
            Emitidas en el período. <span className="text-emerald-300 font-bold block mt-0.5">Ver lista ➔</span>
          </p>
        </div>
      </AnimatedCard>

      {/* 4. Pólizas Vencidas */}
      <AnimatedCard index={6} glow="from-orange-500/60 via-amber-500/30 to-transparent">
        <div className="flex flex-col gap-2 cursor-pointer hover:bg-slate-900/50 p-1 rounded-xl transition-colors" onClick={() => onCardClick("VENCIDAS")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Vencidas (Mora)
            </span>
            <HiExclamation className="h-5 w-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales?.vencidas || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-[11px] sm:text-xs font-medium text-slate-400">
            Fuera de término o sin cobertura. <span className="text-orange-400 font-bold block mt-0.5">Ver morosos ➔</span>
          </p>
        </div>
      </AnimatedCard>

      {/* 5. Bajas Exactas y Churn */}
      <AnimatedCard index={7} glow="from-rose-500/60 via-red-500/30 to-transparent">
        <div className="flex flex-col gap-2 cursor-pointer hover:bg-slate-900/50 p-1 rounded-xl transition-colors" onClick={() => onCardClick("BAJAS")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Bajas del Mes
            </span>
            <HiTrendingDown className="h-5 w-5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-50">
              {Number(totales?.bajas || 0).toLocaleString("es-AR")}
            </p>
            <p className="text-sm font-semibold text-rose-400">
              ({Number(churnValue || 0).toFixed(1)}% Churn)
            </p>
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-slate-400">
            Cancelaciones exactas. <span className="text-rose-400 font-bold block mt-0.5">Ver lista ➔</span>
          </p>
        </div>
      </AnimatedCard>

    </div>
  );
}