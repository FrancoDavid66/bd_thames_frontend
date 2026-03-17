// src/components/clientes/ClienteSiniestrosCard.jsx
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { 
  HiFire, 
  HiLocationMarker, 
  HiCurrencyDollar, 
  HiOutlineShieldExclamation,
  HiUserGroup
} from "react-icons/hi";

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
      className="rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header General */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <HiFire className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-widest truncate">
              Registro de Siniestros
            </h2>
            <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              Historial de incidentes declarados
            </p>
          </div>
        </div>
        {!empty && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Total:</span>
            <span className="text-xs font-bold text-white">{list.length}</span>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 sm:p-5">
        {/* Estado vacío */}
        {empty ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01] h-full">
             <HiOutlineShieldExclamation className="text-4xl text-white/10 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Historial Limpio</p>
             <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mt-1 max-w-xs">
               Este cliente no tiene siniestros registrados.
             </p>
          </div>
        ) : (
          <ul className="space-y-4 max-h-[420px] overflow-y-auto scrollbar-hide pr-1">
            {list.map((siniestro) => {
              const monto = fmtMoney(siniestro.monto_pagado);
              const huboHeridos = Boolean(siniestro.hubo_heridos);
              const resolucion = siniestro.resolucion_final?.trim() || "Pendiente";

              const isRechazado = resolucion.toLowerCase().includes("rechaz");
              const isPendiente = resolucion.toLowerCase().includes("pend");

              const resolucionClass = isRechazado
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : isPendiente
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

              return (
                <motion.li
                  key={siniestro.id}
                  className="rounded-2xl border border-white/5 bg-black/40 p-4 flex flex-col gap-4 shadow-inner hover:bg-white/[0.02] transition-colors"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Top row: fecha + resolución */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                        Fecha de Denuncia
                      </span>
                      <span className="text-sm font-bold text-white">
                        {fmtDate(siniestro.fecha_denuncia)}
                      </span>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${resolucionClass}`}>
                      {resolucion}
                    </span>
                  </div>

                  {/* Detalles (Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Lugar */}
                    <div className="flex gap-3 items-start bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <HiLocationMarker className="text-sky-400 text-lg shrink-0 mt-0.5" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Ubicación</span>
                        <span className="text-xs font-bold text-white/90 leading-snug">
                          {siniestro.lugar || "Sin especificar"}
                          {siniestro.localidad && (
                            <span className="text-white/40 font-normal"> · {siniestro.localidad}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Heridos */}
                    <div className="flex gap-3 items-start bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <HiUserGroup className={huboHeridos ? "text-rose-400 text-lg shrink-0 mt-0.5" : "text-white/20 text-lg shrink-0 mt-0.5"} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Lesionados</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${huboHeridos ? "text-rose-400" : "text-emerald-400"}`}>
                          {huboHeridos ? "Hubo heridos" : "Sin heridos"}
                        </span>
                      </div>
                    </div>

                    {/* Monto (Si existe) */}
                    {monto && (
                      <div className="flex gap-3 items-start bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 sm:col-span-2">
                        <HiCurrencyDollar className="text-emerald-400 text-lg shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50 mb-0.5">Indemnización Pagada</span>
                          <span className="text-sm font-mono font-bold text-emerald-400">
                            {monto}
                          </span>
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