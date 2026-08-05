// src/components/renovaciones/PolizaYaRenovadaModal.jsx
//
// Aviso (NO bloqueo) que aparece cuando se intenta renovar una póliza que ya
// tiene una versión más nueva. Cartel "¿Seguro?": Cancelar o "Renovar igual".
// Estilo THAMES (ModalDuo + Boton3D).

import { HiExclamationCircle, HiArrowRight, HiRefresh } from "react-icons/hi";
import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";

export default function PolizaYaRenovadaModal({
  open,
  error,
  onClose,
  onConfirmar,
  submitting = false,
}) {
  if (!error) return null;

  const ctx = error.context || {};
  const nuevaId = ctx.nueva_poliza_id;
  const nuevoNumero = ctx.nueva_numero || "—";
  const nuevaFecha = ctx.nueva_fecha || null;

  return (
    <ModalDuo
      isOpen={open}
      onClose={onClose}
      title="Esta póliza ya se renovó"
      subtitle="¿Querés renovarla de nuevo igual?"
      icon={<HiExclamationCircle />}
      iconTono="amarillo"
      size="sm"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose} disabled={submitting}>
            Cancelar
          </Boton3D>
          <Boton3D variant="verde" onClick={onConfirmar} disabled={submitting}>
            <HiRefresh className={submitting ? "animate-spin" : ""} />
            {submitting ? "Renovando…" : "Renovar igual"}
          </Boton3D>
        </>
      }
    >
      <p className="text-sm font-bold text-titulo dark:text-titulo-dark leading-relaxed">
        Ya existe una versión renovada de esta póliza en el sistema. Podés
        renovarla igual si estás seguro (por ejemplo, el cliente pagó antes de
        tiempo), pero revisá que no estés duplicando por error.
      </p>

      {nuevaId && (
        <div className="mt-3 rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
          <div className="text-[10px] uppercase tracking-wider text-suave dark:text-suave-dark font-black mb-1.5">
            Renovación existente
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-suave dark:text-suave-dark font-bold">N° de póliza:</span>
              <span className="font-black text-titulo dark:text-titulo-dark tabular-nums">{nuevoNumero}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-suave dark:text-suave-dark font-bold">ID interno:</span>
              <span className="font-mono font-bold text-titulo dark:text-titulo-dark tabular-nums">#{nuevaId}</span>
            </div>
            {nuevaFecha && (
              <div className="flex items-center justify-between">
                <span className="text-suave dark:text-suave-dark font-bold">Fecha de emisión:</span>
                <span className="font-bold text-titulo dark:text-titulo-dark tabular-nums">{nuevaFecha}</span>
              </div>
            )}
          </div>
          <a
            href={`/polizas/${nuevaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-duo-azul hover:underline"
          >
            Ver la renovación existente <HiArrowRight />
          </a>
        </div>
      )}
    </ModalDuo>
  );
}