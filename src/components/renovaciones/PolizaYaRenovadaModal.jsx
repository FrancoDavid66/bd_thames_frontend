// src/components/renovaciones/PolizaYaRenovadaModal.jsx
//
// Aviso que aparece cuando se intenta renovar una póliza que YA tiene
// renovación (una hija, o un alta nueva del mismo auto).
// Estilo THAMES (ModalDuo + Boton3D).
//
// 🐛 13/10/2026: antes tenía un botón "Renovar igual" que nunca funcionó: el
//    servidor siempre lo bloquea (crearía dos pólizas para el mismo auto) y el
//    cartel volvía a aparecer una y otra vez. Ahora lleva directo a la
//    renovación que ya existe, que es lo que hay que revisar.

import { HiExclamationCircle, HiArrowRight } from "react-icons/hi";
import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";

export default function PolizaYaRenovadaModal({ open, error, onClose }) {
  if (!error) return null;

  const ctx = error.context || {};
  const nuevaId = ctx.nueva_poliza_id;
  const nuevoNumero = ctx.nueva_numero || "—";
  // "2026-10-13" → "13/10/2026"
  const nuevaFecha = ctx.nueva_fecha ? String(ctx.nueva_fecha).slice(0, 10).split("-").reverse().join("/") : null;

  const verRenovacion = () => {
    if (!nuevaId) return;
    // La app usa rutas con "#" (HashRouter).
    window.open(`#/polizas/${nuevaId}`, "_blank", "noopener,noreferrer");
    onClose?.();
  };

  return (
    <ModalDuo
      isOpen={open}
      onClose={onClose}
      title="Esta póliza ya se renovó"
      subtitle="No hace falta renovarla otra vez"
      icon={<HiExclamationCircle />}
      iconTono="amarillo"
      size="sm"
      footer={
        <>
          <Boton3D variant="blanco" onClick={onClose}>
            Cerrar
          </Boton3D>
          {nuevaId && (
            <Boton3D variant="verde" onClick={verRenovacion}>
              Ver la renovación <HiArrowRight />
            </Boton3D>
          )}
        </>
      }
    >
      <p className="text-sm text-titulo dark:text-titulo-dark leading-relaxed">
        Este auto ya tiene una póliza más nueva en el sistema. Renovar de nuevo
        dejaría al cliente con <strong>dos pólizas para el mismo auto</strong>.
        Si hay que corregir algo (fechas, precio, compañía), hacelo en la
        renovación que ya existe.
      </p>

      {nuevaId && (
        <div className="mt-3 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3">
          <div className="text-[11px] text-suave dark:text-suave-dark mb-1.5">
            Renovación existente
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-suave dark:text-suave-dark">N° de póliza:</span>
              <span className="font-medium text-titulo dark:text-titulo-dark tabular-nums">{nuevoNumero}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-suave dark:text-suave-dark">ID interno:</span>
              <span className="font-mono text-titulo dark:text-titulo-dark tabular-nums">#{nuevaId}</span>
            </div>
            {nuevaFecha && (
              <div className="flex items-center justify-between">
                <span className="text-suave dark:text-suave-dark">Fecha de emisión:</span>
                <span className="text-titulo dark:text-titulo-dark tabular-nums">{nuevaFecha}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalDuo>
  );
}
