// src/components/estadisticas/EstadisticasSummaryCards.jsx
import { HiChartBar, HiShieldCheck } from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

export default function EstadisticasSummaryCards({ totales, churnPromedio }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <AnimatedCard index={3} glow="from-sky-500/60 via-cyan-500/35 to-transparent">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Pólizas totales
            </span>
            <HiChartBar className="h-5 w-5 text-sky-300" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales.total || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-xs font-medium text-slate-400">
            Stock total de pólizas en las oficinas seleccionadas.
          </p>
        </div>
      </AnimatedCard>

      <AnimatedCard index={4} glow="from-emerald-500/60 via-sky-500/30 to-transparent">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Pólizas activas
            </span>
            <HiShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales.activas || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-xs font-medium text-slate-400">
            Pólizas en estado <strong>activa</strong> al cierre del período.
          </p>
        </div>
      </AnimatedCard>

      <AnimatedCard index={5} glow="from-emerald-400/60 via-lime-400/30 to-transparent">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Altas del mes
            </span>
            <HiChartBar className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(totales.nuevas || 0).toLocaleString("es-AR")}
          </p>
          <p className="text-xs font-medium text-slate-400">
            Pólizas con <strong>fecha_emision</strong> dentro del período.
          </p>
        </div>
      </AnimatedCard>

      <AnimatedCard index={6} glow="from-rose-500/60 via-amber-400/30 to-transparent">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Churn promedio
            </span>
            <HiChartBar className="h-5 w-5 text-rose-300" />
          </div>
          <p className="text-2xl font-bold text-slate-50">
            {Number(churnPromedio || 0).toFixed(1)}%
          </p>
          <p className="text-xs font-medium text-slate-400">
            % de pólizas con <strong>cuotas vencidas</strong> sobre el stock por oficina.
          </p>
        </div>
      </AnimatedCard>
    </div>
  );
}
