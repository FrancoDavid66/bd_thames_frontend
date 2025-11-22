// src/components/clientes/ClienteDatosPersonalesCard.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClienteDatosPersonalesCard({ cliente }) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState(null);

  if (!cliente) return null;

  const frente = cliente?.archivo_dni_frente || cliente?.archivo_dni || null;
  const dorso = cliente?.archivo_dni_dorso || null;

  const estadoActivo = cliente.estado === true || cliente.estado === "activo";
  const estadoTone = estadoActivo
    ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
    : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30";
  const estadoLabel = estadoActivo ? "Activo" : "Inactivo";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setShow(false);
    if (show) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const open = (u) => {
    setUrl(u);
    setShow(true);
  };

  const faltaBadge = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30";

  return (
    <motion.section
      className="rounded-2xl bg-gradient-to-br from-gray-800/80 via-gray-950 to-black p-[1px] shadow-xl shadow-black/50"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="rounded-2xl bg-gray-950/95 text-neutral-100 px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold">
              Datos personales
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Información básica, contacto y documento del cliente.
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${estadoTone}`}
          >
            {estadoLabel}
          </span>
        </header>

        {/* DNI / alias / ID */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-neutral-300 border-b border-neutral-900/80 pb-3">
          <div>
            <span className="text-neutral-500 mr-1">DNI / CUIT:</span>
            <span className="font-medium">
              {cliente.dni_cuit_cuil || "—"}
            </span>
          </div>
          {cliente.alias && (
            <div className="truncate">
              <span className="text-neutral-500 mr-1">Alias:</span>
              <span className="font-medium">{cliente.alias}</span>
            </div>
          )}
          {cliente.id && (
            <div className="ml-auto text-[11px] text-neutral-500 font-mono">
              ID #{cliente.id}
            </div>
          )}
        </div>

        {/* Grid de datos principales */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">
              Teléfono
            </dt>
            <dd className="text-neutral-100">
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
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">
              Email
            </dt>
            <dd className="text-neutral-100 truncate">
              {cliente.email ? (
                <a
                  href={`mailto:${cliente.email}`}
                  className="text-blue-300 hover:text-blue-200"
                >
                  {cliente.email}
                </a>
              ) : (
                <span className={faltaBadge}>Falta Email</span>
              )}
            </dd>
          </div>

          <div className="space-y-0.5 sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">
              Dirección
            </dt>
            <dd className="text-neutral-100">
              {cliente.direccion || "—"}
              {cliente.localidad && (
                <span className="text-neutral-400">
                  {cliente.direccion ? " · " : ""}
                  {cliente.localidad}
                </span>
              )}
              {!cliente.localidad && (
                <span className="ml-2">
                  <span className={faltaBadge}>Falta Localidad</span>
                </span>
              )}
            </dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-[11px] uppercase tracking-wide text-neutral-500">
              Fecha de nacimiento
            </dt>
            <dd className="text-neutral-100">
              {fmt(cliente.fecha_nacimiento)}
            </dd>
          </div>
        </dl>

        {/* Documento */}
        <div className="pt-2 border-t border-neutral-900/80">
          <div className="text-[11px] uppercase tracking-wide text-primary-400 mb-2">
            Documento (DNI)
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-neutral-400 mb-1">Frente</div>
              {frente ? (
                <button
                  onClick={() => open(frente)}
                  className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  title="Ver frente"
                  type="button"
                >
                  <img
                    src={frente}
                    alt="Frente DNI"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </button>
              ) : (
                <div className="text-xs text-neutral-500">No cargado</div>
              )}
            </div>

            <div>
              <div className="text-xs text-neutral-400 mb-1">Dorso</div>
              {dorso ? (
                <button
                  onClick={() => open(dorso)}
                  className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  title="Ver dorso"
                  type="button"
                >
                  <img
                    src={dorso}
                    alt="Dorso DNI"
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </button>
              ) : (
                <div className="text-xs text-neutral-500">No cargado</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {show && url && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow(false)}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full"
            >
              <button
                type="button"
                onClick={() => setShow(false)}
                className="absolute -top-2 -right-2 z-10 px-3 py-1.5 rounded-md bg-neutral-900 text-neutral-100 border border-neutral-700 hover:bg-neutral-800 text-xs"
              >
                Cerrar
              </button>
              <div className="rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700">
                <img
                  src={url}
                  alt="Documento"
                  className="w-full h-[70vh] object-contain select-none"
                  draggable={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
