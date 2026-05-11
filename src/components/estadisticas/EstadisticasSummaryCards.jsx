// src/components/estadisticas/EstadisticasSummaryCards.jsx
import { motion } from "framer-motion";
import {
  HiDownload,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineTrendingUp,
  HiOutlineExclamation,
  HiOutlineTrendingDown,
  HiOutlineRefresh,
} from "react-icons/hi";

// ─── Definición de cards ──────────────────────────────────────────────────────
// "altas_nuevas" y "renovaciones" son cards separadas.
// "altas_total" muestra nuevas + renovaciones como total de emisiones.

const CARDS = [
  {
    key:      "TOTALES",
    label:    "Pólizas totales",
    icon:     HiOutlineChartBar,
    color:    "text-slate-300",
    bar:      "bg-slate-600",
    getValue: (t) => t.total ?? t.polizas_total ?? 0,
    sub:      ()  => "Stock completo de la cartera",
    download: true,
  },
  {
    key:      "ACTIVAS",
    label:    "Activas",
    icon:     HiOutlineShieldCheck,
    color:    "text-emerald-400",
    bar:      "bg-emerald-500",
    getValue: (t) => t.activas ?? t.polizas_activas ?? 0,
    sub:      (t) => {
      const pct = t.total > 0 ? ((t.activas / t.total) * 100).toFixed(0) : 0;
      return `${pct}% del total`;
    },
    download: true,
  },
  {
    key:      "ALTAS",
    label:    "Altas nuevas",
    icon:     HiOutlineTrendingUp,
    color:    "text-sky-400",
    bar:      "bg-sky-500",
    getValue: (t) => t.altas_nuevas ?? t.altas_nuevas_mes ?? 0,
    sub:      ()  => "Pólizas nuevas, sin renovaciones",
    download: true,
  },
  {
    key:      "RENOVACIONES",
    label:    "Renovaciones",
    icon:     HiOutlineRefresh,
    color:    "text-violet-400",
    bar:      "bg-violet-500",
    getValue: (t) => t.renovaciones ?? t.renovaciones_mes ?? 0,
    sub:      (t) => {
      const total_altas = (t.altas_nuevas ?? 0) + (t.renovaciones ?? 0);
      const pct = total_altas > 0 ? ((t.renovaciones / total_altas) * 100).toFixed(0) : 0;
      return `${pct}% de las emisiones del mes`;
    },
    download: false,
  },
  {
    key:      "ALTAS_TOTAL",
    label:    "Emisiones totales",
    icon:     HiOutlineTrendingUp,
    color:    "text-cyan-400",
    bar:      "bg-cyan-500",
    getValue: (t) => (t.altas_nuevas ?? 0) + (t.renovaciones ?? 0),
    sub:      (t) => {
      const n = t.altas_nuevas ?? 0;
      const r = t.renovaciones ?? 0;
      return `${n} nuevas + ${r} renov.`;
    },
    download: false,
  },
  {
    key:      "VENCIDAS",
    label:    "En mora",
    icon:     HiOutlineExclamation,
    color:    "text-amber-400",
    bar:      "bg-amber-500",
    getValue: (t) => t.vencidas ?? t.en_mora ?? 0,
    sub:      (t) => {
      const pct = t.total > 0 ? ((t.vencidas / t.total) * 100).toFixed(1) : 0;
      return `${pct}% con cuotas vencidas`;
    },
    download: true,
  },
  {
    key:      "BAJAS",
    label:    "Bajas del mes",
    icon:     HiOutlineTrendingDown,
    color:    "text-rose-400",
    bar:      "bg-rose-500",
    getValue: (t) => t.bajas ?? t.bajas_mes ?? 0,
    sub:      (t) => {
      const churn = t.total > 0 ? ((t.bajas / t.total) * 100).toFixed(1) : 0;
      return `${churn}% churn del período`;
    },
    download: true,
  },
];

function fmt(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(v) ? v : 0);
}

export default function EstadisticasSummaryCards({
  totales = {},
  onCardClick,
  onDownloadExcel,
  loading = false,
  downloadingType = null,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
      {CARDS.map((c, idx) => {
        const Icon         = c.icon;
        const value        = c.getValue(totales);
        const subText      = c.sub(totales);
        const isDownloading = downloadingType === c.key;
        const isClickable  = c.download; // solo las que tienen download abren el listado

        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04, ease: "easeOut" }}
            className={`group relative rounded-2xl border border-slate-800 bg-slate-900/80 transition-all duration-200 overflow-hidden ${isClickable ? "hover:border-slate-700 hover:bg-slate-900 cursor-pointer" : "cursor-default"}`}
            onClick={() => isClickable && typeof onCardClick === "function" && onCardClick(c.key)}
          >
            {/* Barra top de color */}
            <div className={`h-0.5 w-full ${c.bar} opacity-60`} />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${c.color} opacity-80`}>
                  {c.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {c.download && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        typeof onDownloadExcel === "function" && onDownloadExcel(c.key);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800"
                      title={`Descargar ${c.label}`}
                    >
                      {isDownloading
                        ? <span className="w-3 h-3 rounded-full border border-slate-500 border-t-slate-200 animate-spin block" />
                        : <HiDownload className="text-xs" />
                      }
                    </button>
                  )}
                  <Icon className={`text-base ${c.color} opacity-50`} />
                </div>
              </div>

              {/* Número grande */}
              <div className={`text-3xl font-light tabular-nums tracking-tight ${loading ? "text-slate-700" : c.color}`}>
                {loading ? "—" : fmt(value)}
              </div>

              {/* Sub texto */}
              <p className="mt-1.5 text-[10px] text-slate-600 leading-tight">
                {loading ? "Cargando..." : subText}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}