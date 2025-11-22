// src/components/clientes/ClientePolizasCard.jsx
import { useNavigate } from "react-router-dom";

const ClientePolizasCard = ({ cliente, onCrearPoliza }) => {
  const navigate = useNavigate();

  const polizas = cliente?.polizas || [];
  const handleCrear = () => onCrearPoliza?.();
  const goDetalle = (id) => navigate(`/polizas/${id}`);

  const fmt = (v) => (v === 0 || v ? String(v) : "—");
  const upper = (v) => (v ? String(v).toUpperCase() : "—");

  return (
    <section className="rounded-2xl bg-gradient-to-br from-neutral-800/80 via-neutral-950 to-black p-[1px] shadow-xl shadow-black/40">
      <div className="rounded-2xl bg-neutral-950/95 border border-neutral-900/80 px-4 py-4 sm:px-6 sm:py-5 text-neutral-100 space-y-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              Pólizas del cliente
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Listado de pólizas asociadas al cliente y acceso rápido al detalle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {polizas.length > 0 && (
              <span className="text-[11px] text-neutral-400">
                {polizas.length} póliza
                {polizas.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              onClick={handleCrear}
              className="px-3 sm:px-4 h-9 rounded-full bg-primary-400 text-black text-xs sm:text-sm font-semibold hover:bg-primary-300 transition shadow-sm"
            >
              Asociar póliza
            </button>
          </div>
        </header>

        {/* Contenido */}
        {polizas.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-4 text-sm text-neutral-300">
            Este cliente todavía no tiene pólizas asociadas.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {polizas.map((p) => {
              const titulo = `${fmt(p.compania)} · ${fmt(
                p.numero_poliza || "Sin número"
              )}`;

              const estado =
                p.estado && typeof p.estado === "string"
                  ? p.estado.toLowerCase()
                  : p.estado;

              const estadoClass =
                estado === "activa"
                  ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                  : estado === "vencida"
                  ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
                  : estado === "finalizada"
                  ? "bg-neutral-700/40 text-neutral-200 ring-1 ring-neutral-500/40"
                  : "bg-neutral-700/40 text-neutral-200 ring-1 ring-neutral-500/40";

              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3.5 sm:px-4 sm:py-4 flex flex-col gap-3 shadow-sm"
                >
                  {/* Header póliza */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-neutral-50 truncate">
                        {titulo}
                      </p>
                      {p.producto && (
                        <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                          {fmt(p.producto)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoClass}`}
                      title="Estado de la póliza"
                    >
                      {fmt(p.estado)}
                    </span>
                  </div>

                  {/* Datos del vehículo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-neutral-200">
                    <div className="space-y-0.5">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Vehículo
                      </div>
                      <div>{fmt(p.marca)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Modelo
                      </div>
                      <div>{fmt(p.modelo)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Año
                      </div>
                      <div>{fmt(p.anio)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Patente
                      </div>
                      <div className="font-medium">{upper(p.patente)}</div>
                    </div>
                    <div className="space-y-0.5 sm:col-span-2">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Cobertura
                      </div>
                      <div>{fmt(p.cobertura)}</div>
                    </div>
                  </div>

                  {/* Acción */}
                  <div className="flex flex-col sm:flex-row sm:justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => goDetalle(p.id)}
                      className="w-full sm:w-auto mt-1 sm:mt-0 px-3 sm:px-4 h-9 rounded-lg bg-neutral-100 text-neutral-900 text-xs sm:text-sm font-semibold hover:bg-white transition"
                      aria-label={`Ver detalle de póliza ${
                        p.numero_poliza || p.id
                      }`}
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
    </section>
  );
};

export default ClientePolizasCard;
