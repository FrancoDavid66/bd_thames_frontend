// src/components/pagos/AlertasClienteBadges.jsx
import useAlertasCliente from "../../hooks/useAlertasCliente";

/**
 * Renderiza una fila de badges con todas las alertas del cliente.
 * Se usa en la tarjeta del cliente en la lista.
 *
 * @param {number|string} clienteId
 * @param {Array} cuotas              Cuotas del cliente (para alertas de atraso/estado póliza)
 * @param {number} max                Máximo de badges a mostrar (default 4)
 */
export default function AlertasClienteBadges({ clienteId, cuotas = [], max = 4 }) {
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
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${a.badgeColor}`}
        >
          {a.badgeText}
        </span>
      ))}
      {ocultos > 0 && (
        <span
          title={`Y ${ocultos} más`}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-700/50 text-slate-300 border border-slate-600/50"
        >
          +{ocultos}
        </span>
      )}
    </div>
  );
}