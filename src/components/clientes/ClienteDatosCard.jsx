// src/components/clientes/ClienteDatosCard.jsx
import { motion } from "framer-motion";

const ClienteDatosCard = ({ cliente }) => {
  if (!cliente) return null;

  const estadoActivo = cliente.estado === true || cliente.estado === "activo";

  const estadoTone = estadoActivo
    ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
    : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30";

  const estadoLabel = estadoActivo ? "Activo" : "Inactivo";

  return (
    <motion.section
      className="rounded-2xl bg-gradient-to-br from-gray-800/80 via-gray-950 to-black p-[1px] shadow-xl shadow-black/50"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="rounded-2xl bg-gray-950/95 text-white px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">
              Datos personales
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Información básica del cliente
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${estadoTone}`}
          >
            {estadoLabel}
          </span>
        </header>

        {/* DNI / alias / ID */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-300 border-b border-gray-900/80 pb-3">
          <div>
            <span className="text-gray-500 mr-1">DNI / CUIT:</span>
            <span className="font-medium">
              {cliente.dni_cuit_cuil || "—"}
            </span>
          </div>
          {cliente.alias && (
            <div className="truncate">
              <span className="text-gray-500 mr-1">Alias:</span>
              <span className="font-medium">{cliente.alias}</span>
            </div>
          )}
          {cliente.id && (
            <div className="ml-auto text-[11px] text-gray-500 font-mono">
              ID #{cliente.id}
            </div>
          )}
        </div>

        {/* Grid de datos */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Teléfono
            </dt>
            <dd className="text-gray-100">
              {cliente.telefono ? (
                <a
                  href={`tel:${cliente.telefono}`}
                  className="text-blue-300 hover:text-blue-200"
                >
                  {cliente.telefono}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Email
            </dt>
            <dd className="text-gray-100 truncate">
              {cliente.email ? (
                <a
                  href={`mailto:${cliente.email}`}
                  className="text-blue-300 hover:text-blue-200"
                >
                  {cliente.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>

          <div className="space-y-0.5 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Dirección
            </dt>
            <dd className="text-gray-100">
              {cliente.direccion || "—"}
              {cliente.localidad && (
                <span className="text-gray-400">
                  {cliente.direccion ? " · " : ""}
                  {cliente.localidad}
                </span>
              )}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Fecha de nacimiento
            </dt>
            <dd className="text-gray-100">
              {cliente.fecha_nacimiento || "—"}
            </dd>
          </div>
        </dl>
      </div>
    </motion.section>
  );
};

export default ClienteDatosCard;
