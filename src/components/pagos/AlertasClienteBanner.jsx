// src/components/pagos/AlertasClienteBanner.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiExclamation, HiChevronDown, HiChevronUp,
} from "react-icons/hi";

import useAlertasCliente from "../../hooks/useAlertasCliente";

/**
 * Banner inline compacto. Va arriba de la lista de cuotas
 * como recordatorio constante mientras se cobra.
 */
export default function AlertasClienteBanner({ clienteId, cuotas = [] }) {
  const { alertas, criticas, loading } = useAlertasCliente({ clienteId, cuotas });
  const [expanded, setExpanded] = useState(false);

  if (loading || alertas.length === 0) return null;

  const hayCriticas = criticas > 0;
  const skin = hayCriticas
    ? { bg: "bg-rose-950/40",  border: "border-rose-700/60",  iconBg: "bg-rose-900/60",  iconColor: "text-rose-300",  title: "text-rose-200",  ring: "ring-rose-500/20" }
    : { bg: "bg-amber-950/30", border: "border-amber-700/50", iconBg: "bg-amber-900/40", iconColor: "text-amber-300", title: "text-amber-200", ring: "ring-amber-500/10" };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl border ring-1 ${skin.bg} ${skin.border} ${skin.ring} overflow-hidden`}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl ${skin.iconBg} flex items-center justify-center shrink-0`}>
          <HiExclamation className={`w-5 h-5 ${skin.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-black ${skin.title}`}>
            {hayCriticas
              ? `⚠️ ${alertas.length} alerta${alertas.length !== 1 ? "s" : ""} activa${alertas.length !== 1 ? "s" : ""}`
              : `ℹ️ ${alertas.length} aviso${alertas.length !== 1 ? "s" : ""}`}
          </h3>
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {alertas.slice(0, 5).map((a) => (
              <span
                key={a.id}
                className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${a.badgeColor}`}
              >
                {a.badgeText}
              </span>
            ))}
            {alertas.length > 5 && (
              <span className="text-[9px] font-bold text-slate-400">+{alertas.length - 5}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs font-bold transition-colors"
        >
          {expanded ? "Ocultar" : "Ver"}
          {expanded ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-700/40"
          >
            <div className="p-3 space-y-2">
              {alertas.map((a) => (
                <div
                  key={a.id}
                  className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs"
                >
                  <p className="text-slate-200 font-semibold">
                    {a.icon} {a.titulo}
                  </p>
                  <p className="text-slate-500 mt-0.5">{a.subtitulo}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}