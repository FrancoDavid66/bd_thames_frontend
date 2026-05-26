// src/components/siniestros/AlertaSiniestrosBanner.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  HiExclamation,
  HiChevronDown,
  HiChevronUp,
  HiExternalLink,
  HiCheckCircle,
} from "react-icons/hi";

import useSiniestrosCliente from "../../hooks/useSiniestrosCliente";

const ESTADO_BADGE = {
  PENDIENTE:   "bg-amber-900/40 text-amber-300 border-amber-700/50",
  DENUNCIADO:  "bg-blue-900/40 text-blue-300 border-blue-700/50",
  INSPECCION:  "bg-purple-900/40 text-purple-300 border-purple-700/50",
  LIQUIDACION: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
  CERRADO:     "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
};

/**
 * Banner de alerta cuando un cliente tiene siniestros.
 *
 * @param {number|string} clienteId    ID del cliente.
 * @param {string} contexto            Texto contextual (ej: "antes de cobrar").
 *                                     Default: "antes de continuar".
 * @param {boolean} compact            Versión compacta (menos padding).
 * @param {boolean} hideOnNoData       Si true y no hay siniestros, no renderiza nada.
 *                                     Default: true.
 */
export default function AlertaSiniestrosBanner({
  clienteId,
  contexto = "antes de continuar",
  compact = false,
  hideOnNoData = true,
}) {
  const { siniestros, abiertos, total, loading } = useSiniestrosCliente(clienteId);
  const [expanded, setExpanded] = useState(false);

  // Mientras carga, mostramos un placeholder mínimo para no saltar el layout.
  if (loading && hideOnNoData) {
    return null;
  }

  // Si no hay datos y debe ocultarse, no renderizamos nada.
  if (!loading && total === 0 && hideOnNoData) {
    return null;
  }

  const hayAbiertos = abiertos.length > 0;

  // Estilo del banner según haya o no abiertos
  const banner = hayAbiertos
    ? {
        bg: "bg-rose-950/40",
        border: "border-rose-700/60",
        iconBg: "bg-rose-900/60",
        iconColor: "text-rose-300",
        title: "text-rose-200",
        ring: "ring-rose-500/20",
      }
    : {
        bg: "bg-amber-950/30",
        border: "border-amber-700/50",
        iconBg: "bg-amber-900/40",
        iconColor: "text-amber-300",
        title: "text-amber-200",
        ring: "ring-amber-500/10",
      };

  const titulo = hayAbiertos
    ? `⚠️ ATENCIÓN — Este asegurado tiene ${abiertos.length} siniestro${abiertos.length !== 1 ? "s" : ""} abierto${abiertos.length !== 1 ? "s" : ""}`
    : `ℹ️ Este asegurado tuvo ${total} siniestro${total !== 1 ? "s" : ""} en el pasado`;

  const subtitulo = hayAbiertos
    ? `Verificar la situación con la compañía ${contexto}.`
    : `Todos los siniestros están cerrados, pero quedan en su historial.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl border ring-1 ${banner.bg} ${banner.border} ${banner.ring} overflow-hidden`}
    >
      <div className={`${compact ? "px-4 py-3" : "px-5 py-4"} flex items-start gap-3`}>
        {/* Icono */}
        <div className={`${compact ? "h-10 w-10" : "h-12 w-12"} rounded-xl ${banner.iconBg} flex items-center justify-center shrink-0`}>
          <HiExclamation className={`${compact ? "w-5 h-5" : "w-6 h-6"} ${banner.iconColor}`} />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <h3 className={`${compact ? "text-sm" : "text-base"} font-black ${banner.title}`}>
            {titulo}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>

          {/* Resumen rápido inline (siempre visible) */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {hayAbiertos && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-700/50">
                {abiertos.length} ABIERTO{abiertos.length !== 1 ? "S" : ""}
              </span>
            )}
            {total - abiertos.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-900/30 text-emerald-300 border border-emerald-700/50 inline-flex items-center gap-1">
                <HiCheckCircle className="w-3 h-3" /> {total - abiertos.length} cerrado{total - abiertos.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Toggle expandir */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs font-bold transition-colors"
        >
          {expanded ? "Ocultar" : "Ver detalle"}
          {expanded ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Detalle expandible */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-700/40"
          >
            <div className="p-4 space-y-2">
              {siniestros.map((s) => (
                <SiniestroLinea key={s.id} s={s} />
              ))}
              <Link
                to={`/clientes/${clienteId}`}
                className="block text-xs text-center text-slate-400 hover:text-slate-200 mt-3 underline"
              >
                Ver perfil completo del asegurado →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SiniestroLinea({ s }) {
  const fecha = s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha";
  const estadoCls = ESTADO_BADGE[s.estado] || "bg-slate-800 text-slate-300 border-slate-700";
  const cerrado = s.estado === "CERRADO";

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${cerrado ? "bg-slate-900/30" : "bg-slate-900/60"} border border-slate-700/40`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-300">#{s.id}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-400">{fecha}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${estadoCls}`}>
            {s.estado_label || s.estado}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {s.responsabilidad_label || s.responsabilidad}
          {s.nro_reclamo_cia && (
            <> · <span className="text-indigo-400 font-mono">Reclamo #{s.nro_reclamo_cia}</span></>
          )}
          {s.poliza_label && <> · <span className="text-slate-500">{s.poliza_label}</span></>}
        </p>
      </div>
    </div>
  );
}