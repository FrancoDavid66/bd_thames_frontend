// src/components/clientes/ClienteSiniestrosCard.jsx
import { motion } from "framer-motion";
import dayjs from "dayjs";

const fmtDate = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "No registrada");

const fmtMoney = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `$${num}`;
  }
};

const ClienteSiniestrosCard = ({ siniestros }) => {
  const list = Array.isArray(siniestros) ? siniestros : [];

  const empty = !list.length;

  return (
    <motion.section
      className="rounded-2xl bg-gradient-to-br from-neutral-800/80 via-neutral-950 to-black p-[1px] shadow-xl shadow-black/40"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="rounded-2xl bg-neutral-950/95 text-neutral-100 px-4 py-4 sm:px-6 sm:py-5 space-y-4">
        {/* Header */}
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Siniestros</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Historial de siniestros declarados por este cliente.
            </p>
          </div>
          {!empty && (
            <span className="text-[11px] text-neutral-400">
              {list.length} siniestro{list.length !== 1 ? "s" : ""}
            </span>
          )}
        </header>

        {/* Estado vacío */}
        {empty ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-4 py-4 text-sm text-neutral-300">
            No hay siniestros registrados para este cliente.
          </div>
        ) : (
          <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {list.map((siniestro) => {
              const monto = fmtMoney(siniestro.monto_pagado);
              const huboHeridos = Boolean(siniestro.hubo_heridos);
              const resolucion =
                siniestro.resolucion_final?.trim() || "Pendiente";

              const resolucionClass =
                resolucion.toLowerCase().includes("rechaz")
                  ? "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30"
                  : resolucion.toLowerCase().includes("pend")
                  ? "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30";

              return (
                <motion.li
                  key={siniestro.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3.5 sm:px-4 sm:py-4 text-sm flex flex-col gap-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Top row: fecha + resolución */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Fecha de denuncia
                      </div>
                      <div className="font-semibold text-neutral-100">
                        {fmtDate(siniestro.fecha_denuncia)}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${resolucionClass}`}
                    >
                      {resolucion}
                    </span>
                  </div>

                  {/* Detalles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="space-y-0.5">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Lugar
                      </div>
                      <div className="text-neutral-100">
                        {siniestro.lugar || "—"}
                        {siniestro.localidad && (
                          <span className="text-neutral-400">
                            {" "}
                            · {siniestro.localidad}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                        Heridos
                      </div>
                      <div
                        className={
                          huboHeridos
                            ? "text-rose-300 font-semibold"
                            : "text-emerald-300 font-semibold"
                        }
                      >
                        {huboHeridos ? "Sí" : "No"}
                      </div>
                    </div>

                    {monto && (
                      <div className="space-y-0.5 sm:col-span-2">
                        <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                          Monto pagado
                        </div>
                        <div className="text-neutral-100 font-semibold">
                          {monto}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.section>
  );
};

export default ClienteSiniestrosCard;
