// src/components/estadisticas/EstadisticasHeader.jsx
import { motion } from "framer-motion";
import { HiChartBar, HiRefresh, HiSparkles, HiDownload } from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

export default function EstadisticasHeader({
  periodoLabel,
  fuenteRespuesta,
  loading,
  onRefresh,
  onOpenExport,
}) {
  return (
    <AnimatedCard
      index={0}
      interactive={false}
      glow="from-sky-500/60 via-indigo-500/40 to-transparent"
    >
      <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <motion.div
          className="pointer-events-none absolute inset-x-4 -top-1 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.3, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-sky-300">
            <HiSparkles className="h-4 w-4 text-emerald-300" />
            Tablero de oficinas · {periodoLabel}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">
            📊 Estadísticas por oficina
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Visualizá el stock por sucursal, las altas y bajas del mes, la
            antigüedad del libro y el churn basado en cuotas vencidas.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-700/80"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <HiDownload className="h-4 w-4 text-sky-300" />
              Descargar asegurados
            </motion.button>

            <motion.button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-900/40"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              {loading ? "Actualizando..." : "Actualizar datos"}
            </motion.button>
          </div>

          {fuenteRespuesta && (
            <motion.span
              className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-slate-200 ring-1 ring-slate-700/80"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <HiChartBar className="h-3 w-3 text-sky-300" />
              Fuente:{" "}
              <span className="uppercase font-semibold text-sky-200">
                {fuenteRespuesta}
              </span>
            </motion.span>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}
