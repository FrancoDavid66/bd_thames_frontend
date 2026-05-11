import React from "react";
import {
  HiDownload,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineTrendingUp,
  HiOutlineExclamation,
  HiOutlineTrendingDown,
} from "react-icons/hi";

const CARD_META = {
  TOTALES: {
    title: "PÓLIZAS\nTOTALES",
    description: "Stock total de pólizas en las oficinas.",
    linkText: "Ver lista →",
    icon: HiOutlineChartBar,
    iconClass: "text-cyan-400",
    linkClass: "text-cyan-400",
  },
  ACTIVAS: {
    title: "PÓLIZAS\nACTIVAS",
    description: "Al día con todos los pagos.",
    linkText: "Ver lista →",
    icon: HiOutlineShieldCheck,
    iconClass: "text-emerald-400",
    linkClass: "text-emerald-400",
  },
  ALTAS: {
    title: "ALTAS DEL MES",
    description: "Emitidas en el período.",
    linkText: "Ver lista →",
    icon: HiOutlineTrendingUp,
    iconClass: "text-emerald-400",
    linkClass: "text-emerald-400",
  },
  VENCIDAS: {
    title: "VENCIDAS\n(MORA)",
    description: "Fuera de término o sin cobertura.",
    linkText: "Ver morosos →",
    icon: HiOutlineExclamation,
    iconClass: "text-orange-400",
    linkClass: "text-orange-400",
  },
  BAJAS: {
    title: "BAJAS DEL MES",
    description: "Cancelaciones exactas.",
    linkText: "Ver lista →",
    icon: HiOutlineTrendingDown,
    iconClass: "text-rose-400",
    linkClass: "text-rose-400",
  },
};

const DEFAULT_ORDER = ["TOTALES", "ACTIVAS", "ALTAS", "VENCIDAS", "BAJAS"];

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(n) ? n : 0);
}

function getCardValue(type, totales = {}) {
  if (type === "TOTALES")  return Number(totales.total          || totales.polizas_total  || 0);
  if (type === "ACTIVAS") {
    // Si el backend ya devolvió activas_al_dia, lo usamos. Si no, usamos activas (estado="activa").
    if (totales.activas_al_dia != null) return Number(totales.activas_al_dia);
    return Number(totales.activas || totales.polizas_activas || 0);
  }
  if (type === "ALTAS")    return Number(totales.altas   || totales.nuevas    || totales.nuevas_mes || 0);
  if (type === "VENCIDAS") return Number(totales.vencidas || totales.en_mora  || 0);
  if (type === "BAJAS")    return Number(totales.bajas   || totales.bajas_mes || 0);
  return 0;
}

export default function EstadisticasSummaryCards({
  totales = {},
  churnGlobal = 0,
  churnPromedio = 0,
  onCardClick,
  onDownloadExcel,
  loading = false,
  downloadingType = null,
}) {
  const handleOpenList = (type) => {
    if (typeof onCardClick === "function") onCardClick(type);
  };

  const handleDownload = (event, type) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onDownloadExcel === "function") {
      onDownloadExcel(type);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {DEFAULT_ORDER.map((type) => {
        const meta     = CARD_META[type];
        const Icon     = meta.icon;
        const value    = getCardValue(type, totales);
        const isDownloading = downloadingType === type;
        // Badge de mora — solo aparece si el backend ya devuelve el campo
        const enMora = type === "ACTIVAS" && totales.activas_en_mora != null
          ? Number(totales.activas_en_mora)
          : null;

        return (
          <button
            key={type}
            type="button"
            onClick={() => handleOpenList(type)}
            className="group relative w-full text-left rounded-2xl bg-slate-800/95 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 shadow-xl transition-all duration-200 px-7 py-8 min-h-[204px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            title={`Ver lista ${type.toLowerCase()}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[13px] font-black tracking-wide text-slate-300 whitespace-pre-line uppercase leading-5">
                  {meta.title}
                </h3>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  role="button"
                  tabIndex={0}
                  title={`Descargar Excel ${type.toLowerCase()}`}
                  aria-label={`Descargar Excel ${type.toLowerCase()}`}
                  onClick={(event) => handleDownload(event, type)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      handleDownload(event, type);
                    }
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/80 transition disabled:opacity-50"
                >
                  {isDownloading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-slate-500 border-t-white animate-spin" />
                  ) : (
                    <HiDownload className="text-lg" />
                  )}
                </span>
                <Icon className={`text-2xl ${meta.iconClass}`} />
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-black tracking-tight text-white">
                {loading ? "—" : formatNumber(value)}
              </span>

              {type === "BAJAS" && (
                <span className="pb-1 text-sm font-extrabold text-rose-400">
                  ({Number(churnGlobal || churnPromedio || 0).toFixed(1)}% Churn)
                </span>
              )}
            </div>

            {/* Badge mora — clickeable, solo si backend ya devuelve el campo */}
            {enMora !== null && !loading && (
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (typeof onCardClick === "function") onCardClick("ACTIVAS_EN_MORA"); }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono border border-amber-700/60 bg-amber-900/30 text-amber-400 rounded px-2 py-0.5 hover:bg-amber-700/40 transition-colors cursor-pointer"
                >
                  {formatNumber(enMora)} con cuota vencida →
                </button>
                <span
                  role="button"
                  title="Descargar Excel — en mora"
                  onClick={(e) => { e.stopPropagation(); if (typeof onDownloadExcel === "function") onDownloadExcel("ACTIVAS_EN_MORA"); }}
                  className="inline-flex items-center justify-center h-5 w-5 rounded text-slate-500 hover:text-amber-400 hover:bg-amber-900/30 transition-colors cursor-pointer"
                >
                  <HiDownload className="text-xs" />
                </span>
              </div>
            )}

            <p className="mt-4 text-sm leading-5 text-slate-400 max-w-[190px]">
              {meta.description}
            </p>

            <span className={`mt-1 inline-block text-sm font-extrabold ${meta.linkClass}`}>
              {meta.linkText}
            </span>
          </button>
        );
      })}
    </div>
  );
}