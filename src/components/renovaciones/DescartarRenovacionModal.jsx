// src/components/renovaciones/DescartarRenovacionModal.jsx
//
// Modal para elegir el motivo cuando se marca "No renovar".
// 5 motivos predefinidos + "Otro" con texto libre. Estilo THAMES (ModalDuo).

import { useEffect, useState } from "react";
import { HiXCircle, HiExclamation } from "react-icons/hi";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { cx } from "./utils";

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

  const isOtro = motivo === "OTRO";
  const canSubmit = !!motivo && (!isOtro || detalle.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ motivo, detalle: detalle.trim() });
  };

  const subtitle = item?.patente
    ? `${item.patente}${item?.cliente ? ` · ${item.cliente.apellido}, ${item.cliente.nombre}` : ""}`
    : null;

  return (
    <ModalDuo
      isOpen={open}
      onClose={onClose}
      title="No renovar"
      subtitle={subtitle}
      icon={<HiXCircle />}
      iconTono="rojo"
      size="sm"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose} disabled={submitting}>
            Cancelar
          </Boton3D>
          <Boton3D variant="rojo" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Guardando…" : "Confirmar 'No renueva'"}
          </Boton3D>
        </>
      }
    >
      <p className="text-sm font-bold text-titulo dark:text-titulo-dark mb-3">
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
                "flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-xs font-black text-left transition-all disabled:opacity-50",
                active
                  ? "border-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo"
                  : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:border-duo-rojo/40"
              )}
            >
              <span className="text-base">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Detalle */}
      <div className="mt-3">
        <label className="text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark mb-1 block">
          Detalle {isOtro ? <span className="text-duo-rojo">*</span> : <span className="text-suave/60 dark:text-suave-dark/60">(opcional)</span>}
        </label>
        <textarea
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          disabled={submitting}
          rows={2}
          maxLength={300}
          placeholder={isOtro ? "Especificá el motivo…" : "Notas adicionales (ej: 'llamar en 30 días')"}
          className="w-full rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul transition-colors disabled:opacity-50 resize-none"
        />
        <div className="mt-0.5 text-right text-[10px] font-bold text-suave dark:text-suave-dark">
          {detalle.length}/300
        </div>
      </div>

      {/* Aviso */}
      <div className="mt-3 flex items-start gap-2 rounded-2xl border-2 border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-2.5">
        <HiExclamation className="mt-0.5 shrink-0 text-duo-amarillo-sombra dark:text-duo-amarillo" />
        <div className="text-[11px] font-bold leading-relaxed text-duo-amarillo-sombra dark:text-duo-amarillo">
          Esto <strong>no cancela ni da de baja</strong> la póliza. Solo marca que el cliente no va a renovar.
          Podés revertirlo en cualquier momento.
        </div>
      </div>
    </ModalDuo>
  );
}