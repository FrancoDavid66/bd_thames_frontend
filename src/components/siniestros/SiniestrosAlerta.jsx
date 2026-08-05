// src/components/siniestros/SiniestrosAlerta.jsx
//
// 🧩 COMPONENTE UNIFICADO — reemplaza a los 3 viejos:
//   - SiniestrosBadge   → <SiniestrosAlerta variant="badge" />
//   - AlertaSiniestrosBanner → <SiniestrosAlerta variant="banner" />
//   - AlertaSiniestrosModal  → <SiniestrosAlerta variant="modal" ... />
//
// Los 3 usaban el mismo hook (useSiniestrosCliente) y mostraban lo mismo con
// distinto formato. Ahora es un solo archivo con diseño Duo (claro/oscuro).
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import {
  HiShieldExclamation, HiExclamation, HiCheckCircle,
  HiChevronDown, HiChevronUp,
} from "react-icons/hi";

import useSiniestrosCliente from "../../hooks/useSiniestrosCliente";
import Badge from "../ui/Badge";
import Boton3D from "../ui/Boton3D";

// Estado del siniestro → tono del Badge Duo.
const ESTADO_TONO = {
  PENDIENTE: "amarillo",
  DENUNCIADO: "azul",
  INSPECCION: "violeta",
  LIQUIDACION: "azul",
  CERRADO: "verde",
};

/* ─── Línea de un siniestro (usada en banner y modal expandidos) ── */
function SiniestroLinea({ s }) {
  const fecha = s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha";
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-titulo dark:text-titulo-dark">#{s.id}</span>
          <span className="text-xs text-suave dark:text-suave-dark">· {fecha}</span>
          <Badge tono={ESTADO_TONO[s.estado] || "neutro"} size="sm">{s.estado_label || s.estado}</Badge>
        </div>
        <p className="text-[11px] text-suave dark:text-suave-dark mt-1 font-bold">
          {s.responsabilidad_label || s.responsabilidad}
          {s.nro_reclamo_cia && <> · Reclamo #{s.nro_reclamo_cia}</>}
        </p>
      </div>
    </div>
  );
}

export default function SiniestrosAlerta({
  clienteId,
  variant = "banner",       // "badge" | "banner" | "modal"
  compact = false,
  contexto = "antes de continuar",
  hideOnNoData = true,
  // props solo para variant="modal":
  isOpen = false,
  clienteNombre = "el asegurado",
  onConfirm,
}) {
  const activo = variant === "modal" ? (isOpen ? clienteId : null) : clienteId;
  const { siniestros, abiertos, total, loading } = useSiniestrosCliente(activo);

  // ── MODAL: lógica de auto-confirmar cuando no hay siniestros ──
  const [yaCargo, setYaCargo] = useState(false);
  useEffect(() => {
    if (variant !== "modal") return;
    if (!isOpen) { setYaCargo(false); return; }
    if (!loading) setYaCargo(true);
  }, [variant, isOpen, loading]);

  useEffect(() => {
    if (variant !== "modal") return;
    if (isOpen && !clienteId) Promise.resolve().then(() => onConfirm?.());
  }, [variant, isOpen, clienteId, onConfirm]);

  useEffect(() => {
    if (variant !== "modal") return;
    if (isOpen && yaCargo && !loading && total === 0 && clienteId) {
      Promise.resolve().then(() => onConfirm?.());
    }
  }, [variant, isOpen, yaCargo, loading, total, clienteId, onConfirm]);

  const [expanded, setExpanded] = useState(false);
  const hayAbiertos = abiertos.length > 0;
  const cerrados = total - abiertos.length;

  // ══════════════════════ BADGE ══════════════════════
  if (variant === "badge") {
    if (loading || total === 0) return null;
    const tono = hayAbiertos ? "rojo" : "amarillo";
    const titulo = hayAbiertos
      ? `${abiertos.length} siniestro${abiertos.length !== 1 ? "s" : ""} abierto${abiertos.length !== 1 ? "s" : ""}`
      : `${total} siniestro${total !== 1 ? "s" : ""} en historial (cerrados)`;
    return (
      <span title={titulo} className={hayAbiertos ? "animate-pulse" : ""}>
        <Badge tono={tono} size="sm">
          <HiShieldExclamation className="w-3 h-3" />
          {compact ? total : (hayAbiertos ? `${abiertos.length} siniestro${abiertos.length !== 1 ? "s" : ""}` : `${total} hist.`)}
        </Badge>
      </span>
    );
  }

  // El banner y el modal comparten el "cuerpo del banner"
  const bannerBody = (() => {
    if (variant === "banner" && loading && hideOnNoData) return null;
    if (variant === "banner" && !loading && total === 0 && hideOnNoData) return null;

    const tono = hayAbiertos ? "rojo" : "amarillo";
    const soft = hayAbiertos
      ? "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-duo-rojo/40"
      : "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo/40";
    const iconColor = hayAbiertos ? "text-duo-rojo" : "text-duo-amarillo-sombra dark:text-duo-amarillo";

    const titulo = hayAbiertos
      ? `Este asegurado tiene ${abiertos.length} siniestro${abiertos.length !== 1 ? "s" : ""} abierto${abiertos.length !== 1 ? "s" : ""}`
      : `Este asegurado tuvo ${total} siniestro${total !== 1 ? "s" : ""} en el pasado`;
    const subtitulo = hayAbiertos
      ? `Verificá la situación con la compañía ${contexto}.`
      : "Todos los siniestros están cerrados, pero quedan en su historial.";

    return (
      <div className={`rounded-2xl border-2 overflow-hidden ${soft}`}>
        <div className={`${compact ? "px-4 py-3" : "px-5 py-4"} flex items-start gap-3`}>
          <div className={`${compact ? "h-10 w-10" : "h-12 w-12"} rounded-xl bg-card dark:bg-card-dark flex items-center justify-center shrink-0`}>
            <HiExclamation className={`${compact ? "w-5 h-5" : "w-6 h-6"} ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`${compact ? "text-sm" : "text-base"} font-black text-titulo dark:text-titulo-dark`}>{titulo}</h3>
            <p className="text-xs text-suave dark:text-suave-dark mt-0.5 font-bold">{subtitulo}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {hayAbiertos && <Badge tono="rojo" size="sm">{abiertos.length} abierto{abiertos.length !== 1 ? "s" : ""}</Badge>}
              {cerrados > 0 && <Badge tono="verde" size="sm"><HiCheckCircle className="w-3 h-3" /> {cerrados} cerrado{cerrados !== 1 ? "s" : ""}</Badge>}
            </div>
          </div>
          {siniestros.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark text-xs font-black transition-colors hover:brightness-95"
            >
              {expanded ? "Ocultar" : "Ver"}
              {expanded ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
            </button>
          )}
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
              <div className="p-4 space-y-2">
                {siniestros.map((s) => <SiniestroLinea key={s.id} s={s} />)}
                {clienteId && (
                  <Link
                    to={`/clientes/${clienteId}`}
                    className="block text-xs text-center text-duo-azul hover:underline mt-2 font-black"
                  >
                    Ver perfil completo del asegurado →
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  })();

  // ══════════════════════ BANNER ══════════════════════
  if (variant === "banner") {
    return bannerBody;
  }

  // ══════════════════════ MODAL ══════════════════════
  if (!isOpen) return null;

  if (!yaCargo || loading) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-12 h-12 border-4 border-duo-rojo/25 border-t-duo-rojo rounded-full animate-spin" />
      </div>
    );
  }
  if (total === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="w-full max-w-xl bg-card dark:bg-card-dark rounded-3xl border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden"
        >
          {hayAbiertos && <div className="h-1.5 bg-duo-rojo animate-pulse" />}
          <div className="p-5 space-y-4">
            <div className="text-center pb-3 border-b-2 border-linea dark:border-linea-dark">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] mb-2">
                <HiShieldExclamation className="w-7 h-7 text-duo-rojo" />
              </div>
              <p className="text-base font-black text-titulo dark:text-titulo-dark">{clienteNombre}</p>
            </div>

            {bannerBody}

            <Boton3D variant={hayAbiertos ? "rojo" : "amarillo"} full onClick={onConfirm}>
              <HiCheckCircle className="w-5 h-5" /> Entendido, continuar
            </Boton3D>

            {hayAbiertos && (
              <p className="text-[11px] text-duo-rojo text-center font-bold">
                Al continuar, confirmás que verificaste la situación con la compañía.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
