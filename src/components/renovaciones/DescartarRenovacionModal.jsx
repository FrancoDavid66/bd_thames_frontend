// src/components/renovaciones/DescartarRenovacionModal.jsx
//
// Modal chico para elegir el motivo cuando se marca "No renovar".
// 5 motivos predefinidos + "Otro" con texto libre.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiExclamation } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

const MOTIVOS = [
  { value: "CAMBIO_COMPANIA", label: "Cambió de compañía", emoji: "🏢" },
  { value: "VENDIO_AUTO",     label: "Vendió el auto",     emoji: "🚗" },
  { value: "NO_QUIERE",       label: "No quiere seguir",   emoji: "🙅" },
  { value: "NO_CONTESTA",     label: "No contesta",        emoji: "📵" },
  { value: "NO_PAGO",         label: "No pagó",            emoji: "💸" },
  { value: "OTRO",            label: "Otro motivo",        emoji: "❓" },
];

export default function DescartarRenovacionModal({
  open,
  item,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const [motivo, setMotivo] = useState("");
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    if (open) {
      setMotivo("");
      setDetalle("");
    }
  }, [open]);

  if (!open) return null;

  const isOtro = motivo === "OTRO";
  const canSubmit = !!motivo && (!isOtro || detalle.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ motivo, detalle: detalle.trim() });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !submitting) onClose?.();
        }}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <div className="text-lg font-extrabold text-white">No renovar</div>
              <div className="mt-1 text-xs text-white/70">
                {item?.patente && (
                  <>
                    <span className="font-semibold text-white">{item.patente}</span>
                    {item?.cliente && (
                      <> · {item.cliente.apellido}, {item.cliente.nombre}</>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/15 transition-colors disabled:opacity-50"
              onClick={onClose}
              disabled={submitting}
              type="button"
              title="Cerrar"
            >
              <HiX />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            <p className="text-xs text-white/70">
              ¿Por qué este cliente no va a renovar?
            </p>

            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS.map((m) => {
                const active = motivo === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMotivo(m.value)}
                    disabled={submitting}
                    className={cx(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold text-left transition-all disabled:opacity-50",
                      active
                        ? "border-rose-400/60 bg-rose-500/20 text-rose-50 ring-2 ring-rose-500/30"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    )}
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Detalle (opcional siempre, obligatorio si motivo=OTRO) */}
            <div className="mt-2">
              <label className="text-[11px] font-bold text-white/70 mb-1 block">
                Detalle {isOtro ? <span className="text-rose-400">*</span> : <span className="text-white/40">(opcional)</span>}
              </label>
              <textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                disabled={submitting}
                rows={2}
                maxLength={300}
                placeholder={
                  isOtro
                    ? "Especificá el motivo…"
                    : "Notas adicionales (ej: 'llamar en 30 días')"
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/30 transition-colors disabled:opacity-50 resize-none"
              />
              <div className="mt-0.5 text-right text-[10px] text-white/40">
                {detalle.length}/300
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
              <HiExclamation className="mt-0.5 shrink-0 text-amber-400" />
              <div className="text-[11px] leading-relaxed text-amber-100/90">
                Esto <strong>no cancela ni da de baja</strong> la póliza. Solo marca que el cliente no va a renovar.
                Podés revertirlo en cualquier momento desde la pestaña "No renovaron".
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-4 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={cx(
                "rounded-xl px-5 py-2 text-sm font-extrabold transition-colors shadow-md",
                canSubmit && !submitting
                  ? "bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/20"
                  : "bg-white/20 text-white/50 shadow-none cursor-not-allowed"
              )}
            >
              {submitting ? "Guardando…" : "Confirmar 'No renueva'"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}