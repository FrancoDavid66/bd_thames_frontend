// src/components/estadisticas/EstadisticasHeader.jsx  (diseño Duo)
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
    <AnimatedCard index={0} interactive={false}>
      <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-oficina">
            <HiSparkles className="h-4 w-4 text-ingreso" />
            Tablero de oficinas · {periodoLabel}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-titulo dark:text-titulo-dark sm:text-3xl">
            📊 Estadísticas por oficina
          </h1>
          <p className="mt-1 text-sm font-bold text-suave dark:text-suave-dark max-w-xl">
            Visualizá el stock por sucursal, las altas y bajas del mes, la
            antigüedad del libro y el churn basado en cuotas vencidas.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-oficina px-3.5 py-2 text-xs font-black text-titulo dark:text-titulo-dark transition-colors"
            >
              <HiDownload className="h-4 w-4 text-oficina" />
              Descargar asegurados
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-oficina border-2 border-oficina px-3.5 py-2 text-xs font-black text-white shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all disabled:opacity-60"
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              {loading ? "Actualizando..." : "Actualizar datos"}
            </button>
          </div>

          {fuenteRespuesta && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2.5 py-0.5 text-[11px] font-black text-suave dark:text-suave-dark">
              <HiChartBar className="h-3 w-3 text-oficina" />
              Fuente:{" "}
              <span className="uppercase font-black text-oficina">
                {fuenteRespuesta}
              </span>
            </span>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
}
