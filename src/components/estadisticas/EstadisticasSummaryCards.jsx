// src/components/estadisticas/EstadisticasSummaryCards.jsx
import React from "react";
import {
  HiDownload,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineTrendingUp,
  HiOutlineExclamation,
  HiOutlineTrendingDown,
} from "react-icons/hi";

/* Cada tarjeta con su color:
   - TOTALES  → oficina (celeste)
   - ACTIVAS  → ingreso (verde)
   - ALTAS    → ingreso (verde)
   - VENCIDAS → tarjeta (ámbar)
   - BAJAS    → egreso  (rojo)   */
const CARD_META = {
  TOTALES: {
    title: "PÓLIZAS\nTOTALES",
    description: "Stock total de pólizas en las oficinas.",
    linkText: "Ver lista →",
    icon: HiOutlineChartBar,
    tone: "oficina",
  },
  ACTIVAS: {
    title: "PÓLIZAS\nACTIVAS",
    description: "Al día con todos los pagos.",
    linkText: "Ver lista →",
    icon: HiOutlineShieldCheck,
    tone: "ingreso",
  },
  ALTAS: {
    title: "ALTAS DEL MES",
    description: "Emitidas en el período.",
    linkText: "Ver lista →",
    icon: HiOutlineTrendingUp,
    tone: "ingreso",
  },
  VENCIDAS: {
    title: "VENCIDAS\n(MORA)",
    description: "Fuera de término o sin cobertura.",
    linkText: "Ver morosos →",
    icon: HiOutlineExclamation,
    tone: "tarjeta",
  },
  BAJAS: {
    title: "BAJAS DEL MES",
    description: "Cancelaciones exactas.",
    linkText: "Ver lista →",
    icon: HiOutlineTrendingDown,
    tone: "egreso",
  },
};

// Clases por tono (borde + ícono + link). Ámbar usa el hex directo (no hay token -fuerte).
const TONE = {
  oficina: { border: "border-oficina/30", accent: "text-oficina" },
  ingreso: { border: "border-ingreso/30", accent: "text-ingreso" },
  tarjeta: { border: "border-tarjeta/35", accent: "text-[#d97706] dark:text-tarjeta-claro" },
  egreso: { border: "border-egreso/30", accent: "text-egreso" },
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
    // 📱 En el celu van de a 2 (antes 1 por fila: ~1.000 px de scroll); la última
    //    (Bajas) ocupa el ancho para no quedar sola y torcida.
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
      {DEFAULT_ORDER.map((type) => {
        const meta     = CARD_META[type];
        const Icon     = meta.icon;
        const tone     = TONE[meta.tone];
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
            className={`group relative w-full min-w-0 text-left rounded-xl bg-card dark:bg-card-dark border ${tone.border} hover:-translate-y-0.5 transition-transform duration-200 px-4 py-4 sm:px-6 sm:py-6 sm:min-h-[204px] last:col-span-2 xl:last:col-span-1 focus:outline-none`}
            title={`Ver lista ${type.toLowerCase()}`}
          >
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <h3 className="text-[12px] sm:text-[13px] font-medium tracking-wide text-suave dark:text-suave-dark whitespace-pre-line leading-5">
                  {meta.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                  className="inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition-colors"
                >
                  {isDownloading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-linea dark:border-linea-dark border-t-oficina animate-spin" />
                  ) : (
                    <HiDownload className="text-lg" />
                  )}
                </span>
                <Icon className={`hidden text-2xl sm:block ${tone.accent}`} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-2 sm:mt-5">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-titulo dark:text-titulo-dark">
                {loading ? "—" : formatNumber(value)}
              </span>

              {type === "BAJAS" && (
                <span className="pb-1 text-sm font-medium text-egreso">
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
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-medium border border-tarjeta/35 bg-tarjeta/10 text-[#d97706] dark:text-tarjeta-claro rounded-md px-2 py-0.5 hover:bg-tarjeta/20 transition-colors cursor-pointer"
                >
                  {formatNumber(enMora)} con cuota vencida →
                </button>
                <span
                  role="button"
                  title="Descargar Excel — en mora"
                  onClick={(e) => { e.stopPropagation(); if (typeof onDownloadExcel === "function") onDownloadExcel("ACTIVAS_EN_MORA"); }}
                  className="inline-flex items-center justify-center h-5 w-5 rounded text-suave dark:text-suave-dark hover:text-[#d97706] dark:hover:text-tarjeta-claro hover:bg-tarjeta/10 transition-colors cursor-pointer"
                >
                  <HiDownload className="text-xs" />
                </span>
              </div>
            )}

            <p className="mt-2 text-[12px] leading-4 sm:mt-4 sm:text-sm sm:leading-5 text-suave dark:text-suave-dark max-w-[190px]">
              {meta.description}
            </p>

            <span className={`mt-1 inline-block text-sm font-medium ${tone.accent}`}>
              {meta.linkText}
            </span>
          </button>
        );
      })}
    </div>
  );
}
