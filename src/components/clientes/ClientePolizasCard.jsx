// src/components/clientes/ClientePolizasCard.jsx
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  HiCollection,
  HiPlus,
  HiArrowRight,
  HiShieldCheck,
  HiOutlineDocumentSearch
} from "react-icons/hi";

const ClientePolizasCard = ({ cliente, onCrearPoliza }) => {
  const navigate = useNavigate();

  // 🚀 Ordenamos: la póliza MÁS NUEVA primero. Criterio: fecha de emisión más reciente;
  // si dos comparten fecha, gana la de mayor ID (la que se creó después).
  const polizas = [...(cliente?.polizas || [])].sort((a, b) => {
    const fa = a?.fecha_emision ? new Date(a.fecha_emision).getTime() : 0;
    const fb = b?.fecha_emision ? new Date(b.fecha_emision).getTime() : 0;
    if (fb !== fa) return fb - fa;
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });

  // 🆕 Las pólizas se cargan SOLO desde Solicitudes: ahí el sistema ya detecta si
  //    el cliente existe y ofrece agregarle una nueva póliza. Este botón lleva ahí.
  const handleCrear = () => navigate("/solicitudes");

  const fmt = (v) => (v === 0 || v ? String(v) : "—");
  const upper = (v) => (v ? String(v).toUpperCase() : "—");

  return (
    <motion.section
      className="rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden mt-2"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
    >
      <div className="flex flex-col h-full">
        {/* Header General */}
        <div className="px-5 py-5 border-b border-white/5 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <HiCollection className="text-2xl" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-widest truncate leading-none mb-1">
                Pólizas del Cliente
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider truncate">
                  Seguros Asociados a este perfil
                </span>
                {polizas.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[9px] font-black">
                    {polizas.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCrear}
            className="shrink-0 h-11 px-5 rounded-xl cursor-pointer bg-sky-500 text-black font-black uppercase text-[10px] tracking-widest hover:bg-sky-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 w-full sm:w-auto"
          >
            <HiPlus className="text-sm" /> Asociar Póliza
          </button>
        </div>

        {/* Contenido / Listado */}
        <div className="p-4 sm:p-5 flex-1">
          {polizas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <HiOutlineDocumentSearch className="text-5xl text-white/10 mb-3" />
              <p className="text-xs font-black text-white/60 uppercase tracking-widest">Sin pólizas vigentes</p>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1 max-w-xs">
                Este cliente no tiene ningún seguro registrado en el sistema.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {polizas.map((p, idx) => {
                const titulo = `${fmt(p.compania)} · ${fmt(p.numero_poliza || "S/N")}`;
                const esMasReciente = idx === 0 && polizas.length > 1;
                const estado = p.estado && typeof p.estado === "string" ? p.estado.toLowerCase() : p.estado;

                const estadoClass = estado === "activa"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : estado === "vencida"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-white/5 text-white/40 border border-white/10";

                return (
                  <motion.li
                    key={p.id}
                    className="rounded-2xl border border-white/5 bg-black/40 p-4 flex flex-col gap-4 shadow-inner hover:bg-white/[0.02] transition-colors"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Header de la Póliza */}
                    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                           <HiShieldCheck className="text-sky-400 text-sm" />
                           <p className="text-sm font-bold text-white truncate leading-none">
                             {titulo}
                           </p>
                        </div>
                        {p.producto && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 truncate ml-5">
                            {fmt(p.producto)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {esMasReciente && (
                          <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-sky-500/15 text-sky-300 border border-sky-500/30">
                            Más reciente
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${estadoClass}`}>
                          {fmt(p.estado)}
                        </span>
                      </div>
                    </div>

                    {/* Datos del vehículo (Grid responsiva) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Vehículo</span>
                        <span className="font-bold text-white/80 truncate">{fmt(p.marca)}</span>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Modelo</span>
                        <span className="font-bold text-white/80 truncate">{fmt(p.modelo)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Año</span>
                        <span className="font-bold text-white/80">{fmt(p.anio)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Patente</span>
                        <span className="font-mono font-bold text-sky-400">{upper(p.patente)}</span>
                      </div>

                      <div className="flex flex-col gap-1 col-span-2 sm:col-span-4 pt-1">
                        <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Cobertura</span>
                        <span className="font-medium text-white/70 truncate">{fmt(p.cobertura)}</span>
                      </div>
                    </div>

                    {/* Acción / Footer de la tarjeta */}
                    <div className="pt-3 border-t border-white/5 mt-auto">
                      <Link
                        to={`/polizas/${p.id}`}
                        className="w-full h-10 rounded-xl cursor-pointer bg-white/5 text-white/80 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2"
                      >
                        Ver Detalle de Póliza <HiArrowRight />
                      </Link>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </motion.section>
  );
};

export default ClientePolizasCard;