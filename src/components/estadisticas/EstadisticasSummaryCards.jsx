// src/components/estadisticas/EstadisticasSummaryCards.jsx  (diseño Duo)
import React from "react";
import {
  HiDownload,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineTrendingUp,
  HiOutlineExclamation,
  HiOutlineTrendingDown,
} from "react-icons/hi";

/* Cada tarjeta con su color Duo:
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
  oficina: { border: "border-oficina/35", accent: "text-oficina" },
  ingreso: { border: "border-ingreso/35", accent: "text-ingreso" },
  tarjeta: { border: "border-tarjeta/40", accent: "text-[#d97706] dark:text-tarjeta-claro" },
  egreso: { border: "border-egreso/35", accent: "text-egreso" },
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
            className={`group relative w-full text-left rounded-3xl bg-card dark:bg-card-dark border-2 ${tone.border} hover:-translate-y-1 transition-all duration-200 px-6 py-6 min-h-[204px] focus:outline-none`}
            title={`Ver lista ${type.toLowerCase()}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[13px] font-black tracking-wide text-suave dark:text-suave-dark whitespace-pre-line uppercase leading-5">
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition"
                >
                  {isDownloading ? (
                    <span className="h-4 w-4 rounded-full border-2 border-linea dark:border-linea-dark border-t-oficina animate-spin" />
                  ) : (
                    <HiDownload className="text-lg" />
                  )}
                </span>
                <Icon className={`text-2xl ${tone.accent}`} />
              </div>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-black tracking-tight text-titulo dark:text-titulo-dark">
                {loading ? "—" : formatNumber(value)}
              </span>

              {type === "BAJAS" && (
                <span className="pb-1 text-sm font-black text-egreso">
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
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-black border-2 border-tarjeta/40 bg-tarjeta/10 text-[#d97706] dark:text-tarjeta-claro rounded-lg px-2 py-0.5 hover:bg-tarjeta/20 transition-colors cursor-pointer"
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

            <p className="mt-4 text-sm font-semibold leading-5 text-suave dark:text-suave-dark max-w-[190px]">
              {meta.description}
            </p>

            <span className={`mt-1 inline-block text-sm font-black ${tone.accent}`}>
              {meta.linkText}
            </span>
          </button>
        );
      })}
    </div>
  );
}
