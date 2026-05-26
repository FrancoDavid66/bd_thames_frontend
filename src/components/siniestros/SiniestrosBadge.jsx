// src/components/siniestros/SiniestrosBadge.jsx
import { HiShieldExclamation } from "react-icons/hi";
import useSiniestrosCliente from "../../hooks/useSiniestrosCliente";

/**
 * Badge pequeño que indica que un cliente tiene siniestros.
 * Pensado para mostrar en la tarjeta del cliente en una lista.
 *
 * @param {number|string} clienteId  ID del cliente.
 * @param {boolean} compact          Versión muy chica (solo icono + número).
 */
export default function SiniestrosBadge({ clienteId, compact = false }) {
  const { siniestros, abiertos, total, loading } = useSiniestrosCliente(clienteId);

  if (loading || total === 0) return null;

  const hayAbiertos = abiertos.length > 0;

  // Estilo según haya abiertos o solo cerrados
  const cls = hayAbiertos
    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";

  const titulo = hayAbiertos
    ? `${abiertos.length} siniestro${abiertos.length !== 1 ? "s" : ""} abierto${abiertos.length !== 1 ? "s" : ""}`
    : `${total} siniestro${total !== 1 ? "s" : ""} en historial (cerrados)`;

  if (compact) {
    return (
      <span
        title={titulo}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider border ${cls}`}
      >
        <HiShieldExclamation className="w-3 h-3" />
        {total}
      </span>
    );
  }

  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${cls} ${hayAbiertos ? "animate-pulse" : ""}`}
    >
      <HiShieldExclamation className="w-3 h-3" />
      {hayAbiertos
        ? `${abiertos.length} SINIESTRO${abiertos.length !== 1 ? "S" : ""}`
        : `${total} HIST.`}
    </span>
  );
}