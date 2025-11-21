import { useNavigate } from 'react-router-dom';

const ClientePolizasCard = ({ cliente, onCrearPoliza }) => {
  const navigate = useNavigate();

  const polizas = cliente?.polizas || [];
  const handleCrear = () => onCrearPoliza?.();
  const goDetalle = (id) => navigate(`/polizas/${id}`);

  const fmt = (v) => (v === 0 || v ? String(v) : '—');
  const upper = (v) => (v ? String(v).toUpperCase() : '—');

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pólizas del cliente</h2>
        {/* ÚNICO botón → abre el modal del padre */}
        <button
          type="button"
          onClick={handleCrear}
          className="px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition"
        >
          Asociar poliza
        </button>
      </div>

      {polizas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-white/70">Este cliente todavía no tiene pólizas.</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {polizas.map((p) => {
            const titulo = `${fmt(p.compania)} · ${fmt(p.numero_poliza || 'Sin número')}`;
            return (
              <li key={p.id} className="bg-black/20 border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{titulo}</p>

                    {/* Vehículo (marca), modelo y año separados */}
                    <p className="text-white/80 text-sm">
                      <span className="text-white/60">Vehículo: </span>
                      {fmt(p.marca)}
                    </p>
                    <p className="text-white/80 text-sm">
                      <span className="text-white/60">Modelo: </span>
                      {fmt(p.modelo)}
                    </p>
                    <p className="text-white/80 text-sm">
                      <span className="text-white/60">Año: </span>
                      {fmt(p.anio)}
                    </p>

                    <p className="text-white/80 text-sm">
                      <span className="text-white/60">Patente: </span>
                      {upper(p.patente)}
                    </p>
                    <p className="text-white/80 text-sm">
                      <span className="text-white/60">Cobertura: </span>
                      {fmt(p.cobertura)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium
                    ${p.estado === 'activa' ? 'bg-green-500/20 text-green-300' :
                       p.estado === 'vencida' ? 'bg-red-500/20 text-red-300' :
                       p.estado === 'finalizada' ? 'bg-white/10 text-white/70' :
                       'bg-white/10 text-white/70'}`}
                    title="Estado de la póliza"
                  >
                    {fmt(p.estado)}
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => goDetalle(p.id)}
                    className="px-3 py-2 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition"
                    aria-label={`Ver detalle de póliza ${p.numero_poliza || p.id}`}
                  >
                    Ver detalle
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ClientePolizasCard;
