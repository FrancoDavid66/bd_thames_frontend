import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { pagarCuota } from "../../store/slices/clientesSlice";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClientePagosHistorialCard({ cuotas = [], onPagoExitoso }) {
  const dispatch = useDispatch();
  const [filtroPoliza, setFiltroPoliza] = useState(null);
  const [fechaPagoById, setFechaPagoById] = useState({});

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
      const fecha = fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD");
      await dispatch(pagarCuota({ cuotaId: cuota.id, fecha_pago: fecha })).unwrap();
      toast.success("Cuota marcada como pagada");
      onPagoExitoso && onPagoExitoso();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo marcar la cuota");
    }
  };

  return (
    <motion.div
      className="p-4 bg-neutral-900 text-neutral-100 rounded-xl border border-neutral-800 shadow-sm space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold">Historial de pagos</h2>

      {keys.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroPoliza(null)}
            className={`px-3 py-1.5 rounded-md text-sm ${!filtroPoliza ? "bg-primary-400/20 text-primary-300 ring-1 ring-primary-400/30" : "bg-neutral-800 text-neutral-200 ring-1 ring-neutral-700"}`}
          >
            Todas
          </button>
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => setFiltroPoliza(k)}
              className={`px-3 py-1.5 rounded-md text-sm ${filtroPoliza === k ? "bg-primary-400/20 text-primary-300 ring-1 ring-primary-400/30" : "bg-neutral-800 text-neutral-200 ring-1 ring-neutral-700"}`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(visible).map(([k, list]) => (
          <motion.div
            key={k}
            className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 shadow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-lg font-semibold text-primary-300 mb-3">{k}</h3>

            <div className="space-y-2">
              {list.map((cuota) => {
                const isPaid = Boolean(cuota.pagado);
                return (
                  <motion.div key={cuota.id} className="bg-neutral-900 p-3 rounded-lg border border-neutral-700">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-yellow-300">Cuota #</span>{" "}
                        <span className="font-semibold">{cuota.cuota_nro}</span>
                      </div>
                      <div>
                        <span className="text-green-300">Monto:</span>{" "}
                        <span className="font-semibold">
                          ${Number(cuota.monto || 0).toLocaleString("es-AR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-orange-300">Vence:</span>{" "}
                        <span className="font-semibold">{fmt(cuota.fecha_vencimiento)}</span>
                      </div>
                      <div>
                        <span className="text-cyan-300">Estado:</span>{" "}
                        {isPaid ? (
                          <span className="text-green-400 font-bold">
                            Pagada {cuota.fecha_pago ? `(${fmt(cuota.fecha_pago)})` : ""}
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold">Pendiente</span>
                        )}
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="date"
                          value={fechaPagoById[cuota.id] || dayjs().format("YYYY-MM-DD")}
                          onChange={(e) =>
                            setFechaPagoById((s) => ({ ...s, [cuota.id]: e.target.value }))
                          }
                          className="px-2 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm"
                        />
                        <button
                          onClick={() => marcar(cuota)}
                          className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white text-sm"
                        >
                          Marcar pagada
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
