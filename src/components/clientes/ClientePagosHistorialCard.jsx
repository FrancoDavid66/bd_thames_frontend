// src/components/clientes/ClientePagosHistorialCard.jsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { 
  HiCreditCard, 
  HiCheckCircle, 
  HiClock, 
  HiCurrencyDollar,
  HiCalendar
} from "react-icons/hi";
import { pagarCuota } from "../../store/slices/clientesSlice";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClientePagosHistorialCard({ cuotas = [], onPagoExitoso }) {
  const dispatch = useDispatch();
  const [filtroPoliza, setFiltroPoliza] = useState(null);
  const [fechaPagoById, setFechaPagoById] = useState({});
  const [marcandoId, setMarcandoId] = useState(null);

  const agrupado = useMemo(() => {
    const acc = {};
    (cuotas || []).forEach((c) => {
      const key = `${c?.poliza?.marca || ""} ${c?.poliza?.modelo || ""} (${c?.poliza?.patente || "-"})`;
      acc[key] = acc[key] || [];
      acc[key].push(c);
    });
    return acc;
  }, [cuotas]);

  const keys = Object.keys(agrupado);
  const visible = filtroPoliza ? { [filtroPoliza]: agrupado[filtroPoliza] || [] } : agrupado;

  const marcar = async (cuota) => {
    try {
      setMarcandoId(cuota.id);
      const fecha = fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD");
      await dispatch(pagarCuota({ cuotaId: cuota.id, fecha_pago: fecha })).unwrap();
      toast.success("Pago registrado exitosamente");
      onPagoExitoso && onPagoExitoso();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo registrar el pago");
    } finally {
      setMarcandoId(null);
    }
  };

  return (
    <motion.section
      className="rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden flex flex-col h-full"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header General */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <HiCreditCard className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-widest truncate">
              Historial Financiero
            </h2>
            <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              Gestión de Cuotas y Pagos
            </p>
          </div>
        </div>
        {cuotas?.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Total Cuotas:</span>
            <span className="text-xs font-bold text-white">{cuotas.length}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-5 flex-1">
        
        {/* Filtros por póliza (Scroll horizontal en móvil) */}
        {keys.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            <button
              onClick={() => setFiltroPoliza(null)}
              className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                !filtroPoliza
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-900/40"
                  : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              Todas las Pólizas
            </button>
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setFiltroPoliza(k)}
                className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filtroPoliza === k
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-900/40"
                    : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Contenido / Listado de Cuotas */}
        {keys.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
             <HiCurrencyDollar className="text-4xl text-white/10 mb-2" />
             <p className="text-[10px] font-black uppercase tracking-widest text-white/40">No hay cuotas registradas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {Object.entries(visible).map(([k, list]) => (
              <motion.article
                key={k}
                className="rounded-2xl bg-black/20 border border-white/5 p-4 flex flex-col gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Título de la Agrupación (Póliza) */}
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                  <h3 className="text-xs sm:text-sm font-black text-sky-400 uppercase tracking-wide leading-snug">
                    {k}
                  </h3>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2 py-1 rounded-md">
                    {list.length} Cuota{list.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Lista de Cuotas */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-1">
                  {list.map((cuota) => {
                    const isPaid = Boolean(cuota.pagado);
                    const estadoBadge = isPaid
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20";

                    return (
                      <motion.div
                        key={cuota.id}
                        className="rounded-2xl border border-white/5 bg-black/60 p-4 flex flex-col gap-3 shadow-inner"
                        initial={{ opacity: 0.8, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {/* Cabecera de Cuota */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                             <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black text-white border border-white/10">
                               #{cuota.cuota_nro}
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cuota</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${estadoBadge}`}>
                            {isPaid ? <><HiCheckCircle className="text-sm" /> Pagada</> : <><HiClock className="text-sm" /> Pendiente</>}
                          </span>
                        </div>

                        {/* Datos de Monto y Fechas */}
                        <div className="grid grid-cols-2 gap-3 bg-white/[0.02] rounded-xl p-3 border border-white/5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Monto</span>
                            <span className="text-sm font-mono font-bold text-white">
                              ${Number(cuota.monto || 0).toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black tracking-widest text-white/30">Vencimiento</span>
                            <span className="text-xs font-bold text-white/80">
                              {fmt(cuota.fecha_vencimiento)}
                            </span>
                          </div>
                          
                          {isPaid && (
                            <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-white/5 mt-1">
                              <span className="text-[9px] uppercase font-black tracking-widest text-emerald-400/50">Fecha de Pago Registrada</span>
                              <span className="text-xs font-bold text-emerald-400">
                                {cuota.fecha_pago ? fmt(cuota.fecha_pago) : "-"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Formulario de Pago (Solo si no está pagada) */}
                        {!isPaid && (
                          <div className="pt-2 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                              <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                              <input
                                type="date"
                                value={fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD")}
                                onChange={(e) => setFechaPagoById((s) => ({ ...s, [cuota.id]: e.target.value }))}
                                className="h-11 w-full pl-9 pr-3 rounded-xl bg-black border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all [color-scheme:dark]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => marcar(cuota)}
                              disabled={marcandoId === cuota.id}
                              className="h-11 px-5 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all w-full sm:w-auto"
                            >
                              {marcandoId === cuota.id ? (
                                <><div className="h-3 w-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Procesando</>
                              ) : (
                                "Registrar Pago"
                              )}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}