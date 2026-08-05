// src/components/pagos/AlertasCliente.jsx
// ─────────────────────────────────────────────────────────────
// ARCHIVO UNIFICADO (diseño Duo) — reemplaza a estos 3 archivos:
//   · AlertasClienteBadges.jsx
//   · AlertasClienteBanner.jsx
//   · AlertasClienteModal.jsx
//
// Se usan igual que antes, solo cambia el import:
//   import { AlertasClienteBadges, AlertasClienteBanner, AlertasClienteModal }
//     from "./AlertasCliente";
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiShieldExclamation, HiExclamation, HiCheckCircle,
  HiChevronDown, HiChevronUp,
} from "react-icons/hi";

import useAlertasCliente from "../../hooks/useAlertasCliente";

// Card individual de alerta con expand/collapse (usada por el Modal)
function AlertaCard({ alerta }) {
  const [expanded, setExpanded] = useState(false);

  // color de la alerta → clases Duo (soft claro/oscuro + texto)
  const SKINS = {
    rose:   { box: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-duo-rojo/40",       icon: "bg-card dark:bg-card-dark", title: "text-duo-rojo" },
    amber:  { box: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo/40", icon: "bg-card dark:bg-card-dark", title: "text-duo-amarillo-sombra dark:text-duo-amarillo" },
    purple: { box: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] border-duo-violeta/40",    icon: "bg-card dark:bg-card-dark", title: "text-duo-violeta" },
    sky:    { box: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-duo-azul/40",         icon: "bg-card dark:bg-card-dark", title: "text-duo-azul" },
    orange: { box: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo/40", icon: "bg-card dark:bg-card-dark", title: "text-duo-amarillo-sombra dark:text-duo-amarillo" },
  };
  const skin = SKINS[alerta.color] || SKINS.rose;

  return (
    <div className={`rounded-2xl border-2 ${skin.box} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl ${skin.icon} flex items-center justify-center text-xl shrink-0`}>
          {alerta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-black ${skin.title}`}>{alerta.titulo}</h3>
          <p className="text-xs text-suave dark:text-suave-dark mt-0.5 font-bold">{alerta.subtitulo}</p>
        </div>
        {alerta.detalle?.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-card dark:bg-card-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-[10px] font-black transition-colors"
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
            className="border-t-2 border-linea dark:border-linea-dark"
          >
            <div className="px-4 py-3 space-y-1.5">
              {alerta.detalle.map((d, i) => (
                <div key={i} className="text-xs bg-card dark:bg-card-dark rounded-lg px-3 py-2 border-2 border-linea dark:border-linea-dark">
                  <p className="text-titulo dark:text-titulo-dark font-bold">{d.texto}</p>
                  {d.extra && <p className="text-suave dark:text-suave-dark mt-0.5 font-mono">{d.extra}</p>}
                  {d.estado && (
                    <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark">
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

/** Fila de badges con todas las alertas del cliente (en la tarjeta del cliente). */
export function AlertasClienteBadges({ clienteId, cuotas = [], max = 4 }) {
  const { alertas, loading } = useAlertasCliente({ clienteId, cuotas });

  if (loading || alertas.length === 0) return null;

  const visibles = alertas.slice(0, max);
  const ocultos = alertas.length - visibles.length;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibles.map((a) => (
        <span
          key={a.id}
          title={`${a.titulo} — ${a.subtitulo}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border ${a.badgeColor}`}
        >
          {a.badgeText}
        </span>
      ))}
      {ocultos > 0 && (
        <span
          title={`Y ${ocultos} más`}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark"
        >
          +{ocultos}
        </span>
      )}
    </div>
  );
}

/** Banner inline compacto: recordatorio constante arriba de la lista de cuotas. */
export function AlertasClienteBanner({ clienteId, cuotas = [] }) {
  const { alertas, criticas, loading } = useAlertasCliente({ clienteId, cuotas });
  const [expanded, setExpanded] = useState(false);

  if (loading || alertas.length === 0) return null;

  const hayCriticas = criticas > 0;
  const skin = hayCriticas
    ? { box: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-duo-rojo/50",       icon: "text-duo-rojo",                       title: "text-duo-rojo" }
    : { box: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo/50", icon: "text-duo-amarillo-sombra dark:text-duo-amarillo", title: "text-duo-amarillo-sombra dark:text-duo-amarillo" };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-2xl border-2 ${skin.box} overflow-hidden`}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-card dark:bg-card-dark flex items-center justify-center shrink-0">
          <HiExclamation className={`w-5 h-5 ${skin.icon}`} />
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
                className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${a.badgeColor}`}
              >
                {a.badgeText}
              </span>
            ))}
            {alertas.length > 5 && (
              <span className="text-[9px] font-bold text-suave dark:text-suave-dark">+{alertas.length - 5}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card dark:bg-card-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-xs font-black transition-colors"
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
            className="border-t-2 border-linea dark:border-linea-dark"
          >
            <div className="p-3 space-y-2">
              {alertas.map((a) => (
                <div
                  key={a.id}
                  className="px-3 py-2 rounded-lg bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-xs"
                >
                  <p className="text-titulo dark:text-titulo-dark font-black">{a.icon} {a.titulo}</p>
                  <p className="text-suave dark:text-suave-dark mt-0.5 font-bold">{a.subtitulo}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Modal bloqueante con TODAS las alertas del cliente. El usuario debe confirmar. */
export function AlertasClienteModal({
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
    if (!isOpen) { setYaCargo(false); return; }
    if (!loading) setYaCargo(true);
  }, [isOpen, loading]);

  // Auto-confirmar si no hay alertas
  useEffect(() => {
    if (isOpen && yaCargo && !loading && alertas.length === 0) {
      Promise.resolve().then(() => onConfirm?.());
    }
  }, [isOpen, yaCargo, loading, alertas.length, onConfirm]);

  if (!isOpen) return null;

  if (!yaCargo || loading) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-10 h-10 border-4 border-duo-rojo/25 border-t-duo-rojo rounded-full animate-spin" />
      </div>
    );
  }

  if (alertas.length === 0) return null;

  const hayCriticas = criticas > 0;
  const titulo = hayCriticas ? "⚠️ ATENCIÓN" : "ℹ️ Avisos";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card dark:bg-card-dark rounded-3xl border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden"
        >
          {hayCriticas && <div className="h-1.5 bg-duo-rojo animate-pulse shrink-0" />}

          {/* Header */}
          <div className="px-5 pt-5 pb-3 text-center border-b-2 border-linea dark:border-linea-dark shrink-0">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] mb-2">
              <HiShieldExclamation className="w-7 h-7 text-duo-rojo" />
            </div>
            <h2 className={`text-xl font-black ${hayCriticas ? "text-duo-rojo" : "text-duo-amarillo-sombra dark:text-duo-amarillo"}`}>
              {titulo}
            </h2>
            <p className="text-sm font-black text-titulo dark:text-titulo-dark mt-1">{clienteNombre}</p>
            <p className="text-xs text-suave dark:text-suave-dark mt-1 font-bold">
              {alertas.length} alerta{alertas.length !== 1 ? "s" : ""} detectada{alertas.length !== 1 ? "s" : ""}
              {hayCriticas && <span className="text-duo-rojo"> · {criticas} crítica{criticas !== 1 ? "s" : ""}</span>}
            </p>
          </div>

          {/* Lista de alertas scrolleable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {alertas.map((a) => (
              <AlertaCard key={a.id} alerta={a} />
            ))}
          </div>

          {/* Footer fijo */}
          <div className="p-4 border-t-2 border-linea dark:border-linea-dark shrink-0 space-y-2">
            <button
              type="button"
              onClick={onConfirm}
              className={`w-full h-14 rounded-2xl font-black text-base text-white transition-all inline-flex items-center justify-center gap-2 ${
                hayCriticas
                  ? "bg-duo-rojo shadow-[0_5px_0_var(--color-duo-rojo-sombra)] active:shadow-[0_0_0_var(--color-duo-rojo-sombra)] active:translate-y-0.5"
                  : "bg-duo-amarillo text-duo-texto shadow-[0_5px_0_var(--color-duo-amarillo-sombra)] active:shadow-[0_0_0_var(--color-duo-amarillo-sombra)] active:translate-y-0.5"
              }`}
            >
              <HiCheckCircle className="w-5 h-5" />
              ENTENDIDO, CONTINUAR
            </button>
            {hayCriticas && (
              <p className="text-[11px] text-duo-rojo text-center font-bold">
                Al continuar, confirmás que verificaste cada situación antes de cobrar.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export default = Badges (uso más común en la lista)
export default AlertasClienteBadges;
