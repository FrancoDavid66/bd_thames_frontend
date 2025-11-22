// src/components/clientes/ClientePagosHistorialCard.jsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { pagarCuota } from "../../store/slices/clientesSlice";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClientePagosHistorialCard({
  cuotas = [],
  onPagoExitoso,
}) {
  const dispatch = useDispatch();
  const [filtroPoliza, setFiltroPoliza] = useState(null);
  const [fechaPagoById, setFechaPagoById] = useState({});
  const [marcandoId, setMarcandoId] = useState(null);

  const agrupado = useMemo(() => {
    const acc = {};
    (cuotas || []).forEach((c) => {
      const key = `${c?.poliza?.marca || ""} ${c?.poliza?.modelo || ""} (${
        c?.poliza?.patente || "-"
      })`;
      acc[key] = acc[key] || [];
      acc[key].push(c);
    });
    return acc;
  }, [cuotas]);

  const keys = Object.keys(agrupado);
  const visible = filtroPoliza
    ? { [filtroPoliza]: agrupado[filtroPoliza] || [] }
    : agrupado;

  const marcar = async (cuota) => {
    try {
      setMarcandoId(cuota.id);
      const fecha =
        fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD");
      await dispatch(
        pagarCuota({ cuotaId: cuota.id, fecha_pago: fecha })
      ).unwrap();
      toast.success("Cuota marcada como pagada");
      onPagoExitoso && onPagoExitoso();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo marcar la cuota");
    } finally {
      setMarcandoId(null);
    }
  };

  return (
    <motion.section
      className="rounded-2xl bg-gradient-to-br from-neutral-800/80 via-neutral-950 to-black p-[1px] shadow-xl shadow-black/40"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="p-4 sm:p-5 lg:p-6 bg-neutral-950/95 text-neutral-100 rounded-2xl space-y-5">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              Historial de pagos
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cuotas agrupadas por póliza, con estado y fecha de pago.
            </p>
          </div>
          {cuotas?.length > 0 && (
            <div className="text-xs text-neutral-400">
              Total cuotas:{" "}
              <span className="font-semibold text-neutral-200">
                {cuotas.length}
              </span>
            </div>
          )}
        </header>

        {/* Filtros por póliza */}
        {keys.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setFiltroPoliza(null)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition ${
                !filtroPoliza
                  ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-400/40"
                  : "bg-neutral-900 text-neutral-200 ring-1 ring-neutral-700/70"
              }`}
            >
              Todas las pólizas
            </button>
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setFiltroPoliza(k)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap transition ${
                  filtroPoliza === k
                    ? "bg-primary-500/15 text-primary-200 ring-1 ring-primary-400/40"
                    : "bg-neutral-900 text-neutral-200 ring-1 ring-neutral-700/70"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        {keys.length === 0 ? (
          <div className="text-sm text-neutral-400">
            Este cliente aún no tiene cuotas asociadas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(visible).map(([k, list]) => (
              <motion.article
                key={k}
                className="rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-sm p-4 sm:p-5 flex flex-col gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-primary-200 leading-snug">
                    {k}
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    {list.length} cuota{list.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {list.map((cuota) => {
                    const isPaid = Boolean(cuota.pagado);
                    const estadoBadge = isPaid
                      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30";

                    return (
                      <motion.div
                        key={cuota.id}
                        className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-3 sm:px-4 sm:py-3.5 text-sm flex flex-col gap-2"
                        initial={{ opacity: 0.9, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {/* Primera fila: cuota + estado */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-neutral-400">
                            Cuota{" "}
                            <span className="font-semibold text-neutral-100">
                              #{cuota.cuota_nro}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${estadoBadge}`}
                          >
                            {isPaid ? "Pagada" : "Pendiente"}
                          </span>
                        </div>

                        {/* Datos principales */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                          <div className="space-y-0.5">
                            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                              Monto
                            </div>
                            <div className="font-semibold text-neutral-100">
                              $
                              {Number(cuota.monto || 0).toLocaleString(
                                "es-AR"
                              )}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                              Vencimiento
                            </div>
                            <div className="text-neutral-100">
                              {fmt(cuota.fecha_vencimiento)}
                            </div>
                          </div>
                          {isPaid && (
                            <div className="space-y-0.5 sm:col-span-2">
                              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                                Fecha de pago
                              </div>
                              <div className="text-neutral-100">
                                {cuota.fecha_pago
                                  ? fmt(cuota.fecha_pago)
                                  : "-"}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Acción marcar pagada */}
                        {!isPaid && (
                          <div className="pt-1 flex flex-col sm:flex-row gap-2 sm:items-center">
                            <div className="flex-1">
                              <label className="text-[11px] uppercase tracking-wide text-neutral-500">
                                Fecha de pago
                              </label>
                              <input
                                type="date"
                                value={
                                  fechaPagoById[cuota.id] ||
                                  dayjs().format("YYYY-MM-DD")
                                }
                                onChange={(e) =>
                                  setFechaPagoById((s) => ({
                                    ...s,
                                    [cuota.id]: e.target.value,
                                  }))
                                }
                                className="mt-0.5 h-9 w-full rounded-lg bg-neutral-900 border border-neutral-700 px-2 text-xs sm:text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => marcar(cuota)}
                              disabled={marcandoId === cuota.id}
                              className="sm:w-auto w-full h-9 mt-1 sm:mt-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {marcandoId === cuota.id
                                ? "Marcando..."
                                : "Marcar pagada"}
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
