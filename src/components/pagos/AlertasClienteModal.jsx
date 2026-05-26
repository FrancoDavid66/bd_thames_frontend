// src/components/pagos/AlertasClienteModal.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCheckCircle, HiShieldExclamation, HiChevronDown, HiChevronUp,
} from "react-icons/hi";

import useAlertasCliente from "../../hooks/useAlertasCliente";

/**
 * Modal bloqueante que muestra TODAS las alertas del cliente.
 * Aparece al abrir el modal de cuotas. El usuario DEBE apretar
 * "Entendido, continuar" para poder cobrar.
 *
 * Props:
 *   isOpen           Boolean
 *   clienteId        Number/String
 *   clienteNombre    String
 *   cuotas           Array (cuotas del cliente para calcular alertas locales)
 *   onConfirm        Function (al apretar Entendido)
 */
export default function AlertasClienteModal({
  isOpen,
  clienteId,
  clienteNombre = "el asegurado",
  cuotas = [],
  onConfirm,
}) {
  const { alertas, criticas, loading } = useAlertasCliente({
    clienteId: isOpen ? clienteId : null,
    cuotas: isOpen ? cuotas : [],
  });

  const [yaCargo, setYaCargo] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setYaCargo(false);
      return;
    }
    if (!loading) setYaCargo(true);
  }, [isOpen, loading]);

  // Auto-confirmar si no hay alertas
  useEffect(() => {
    if (isOpen && yaCargo && !loading && alertas.length === 0) {
      Promise.resolve().then(() => onConfirm?.());
    }
  }, [isOpen, yaCargo, loading, alertas.length, onConfirm]);

  if (!isOpen) return null;

  // Mientras carga la primera vez, spinner
  if (!yaCargo || loading) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Ya cargó. Si no hay alertas, no renderizamos (el useEffect ya auto-confirmó).
  if (alertas.length === 0) return null;

  const hayCriticas = criticas > 0;
  const titulo = hayCriticas ? "⚠️ ATENCIÓN" : "ℹ️ Avisos";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
        >
          {hayCriticas && <div className="h-1.5 bg-rose-500 animate-pulse shrink-0" />}

          {/* Header */}
          <div className="px-5 pt-5 pb-3 text-center border-b border-slate-800 shrink-0">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-rose-900/40 mb-2">
              <HiShieldExclamation className="w-7 h-7 text-rose-300" />
            </div>
            <h2 className={`text-xl font-black ${hayCriticas ? "text-rose-200" : "text-amber-200"}`}>
              {titulo}
            </h2>
            <p className="text-sm font-bold text-slate-100 mt-1">
              {clienteNombre}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {alertas.length} alerta{alertas.length !== 1 ? "s" : ""} detectada{alertas.length !== 1 ? "s" : ""}
              {hayCriticas && <span className="text-rose-400"> · {criticas} crítica{criticas !== 1 ? "s" : ""}</span>}
            </p>
          </div>

          {/* Lista de alertas scrolleable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {alertas.map((a) => (
              <AlertaCard key={a.id} alerta={a} />
            ))}
          </div>

          {/* Footer fijo */}
          <div className="p-4 border-t border-slate-800 shrink-0 space-y-2">
            <motion.button
              type="button"
              onClick={onConfirm}
              whileTap={{ scale: 0.98 }}
              className={`w-full h-14 rounded-2xl font-black text-base text-white shadow-lg transition-colors inline-flex items-center justify-center gap-2 ${
                hayCriticas
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40"
                  : "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40"
              }`}
            >
              <HiCheckCircle className="w-5 h-5" />
              ENTENDIDO, CONTINUAR
            </motion.button>
            {hayCriticas && (
              <p className="text-[11px] text-rose-400/70 text-center italic">
                Al continuar, confirmás que verificaste cada situación antes de cobrar.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// Card individual de alerta con expand/collapse
// ─────────────────────────────────────────────────────────────
function AlertaCard({ alerta }) {
  const [expanded, setExpanded] = useState(false);

  const SKINS = {
    rose:   { bg: "bg-rose-950/40",   border: "border-rose-700/50",   icon: "bg-rose-900/50",   title: "text-rose-200" },
    amber:  { bg: "bg-amber-950/30",  border: "border-amber-700/50",  icon: "bg-amber-900/50",  title: "text-amber-200" },
    purple: { bg: "bg-purple-950/30", border: "border-purple-700/50", icon: "bg-purple-900/50", title: "text-purple-200" },
    sky:    { bg: "bg-sky-950/30",    border: "border-sky-700/50",    icon: "bg-sky-900/50",    title: "text-sky-200" },
    orange: { bg: "bg-orange-950/30", border: "border-orange-700/50", icon: "bg-orange-900/50", title: "text-orange-200" },
  };
  const skin = SKINS[alerta.color] || SKINS.rose;

  return (
    <div className={`rounded-2xl border ${skin.bg} ${skin.border} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${skin.icon} flex items-center justify-center text-xl shrink-0`}>
          {alerta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-black ${skin.title}`}>{alerta.titulo}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{alerta.subtitulo}</p>
        </div>
        {alerta.detalle?.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-[10px] font-bold transition-colors"
          >
            {expanded ? "Ocultar" : "Ver"}
            {expanded ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && alerta.detalle?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-700/40"
          >
            <div className="px-4 py-3 space-y-1.5">
              {alerta.detalle.map((d, i) => (
                <div key={i} className="text-xs bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-700/40">
                  <p className="text-slate-300">{d.texto}</p>
                  {d.extra && <p className="text-slate-500 mt-0.5 font-mono">{d.extra}</p>}
                  {d.estado && (
                    <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {d.estado}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}