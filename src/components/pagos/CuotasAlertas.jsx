/* src/components/pagos/CuotasAlertas.jsx — Reemplaza TODO el archivo con esta versión */
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { HiClock, HiExclamation, HiBadgeCheck } from "react-icons/hi";
import { fetchCuotasAVencer } from "../../store/slices/pagosSlice"; // ajustá la ruta si tu estructura difiere

/** Devuelve metadata visual según vencimiento */
function getAlertaMeta(fechaStr) {
  const hoy = dayjs().startOf("day");
  const fv = dayjs(fechaStr);
  if (!fv.isValid()) {
    return {
      label: "Fecha inválida",
      tone: "neutral",
      classes:
        "bg-neutral-400/20 border-neutral-300/30 text-neutral-100",
      icon: HiExclamation,
    };
  }

  if (fv.isBefore(hoy)) {
    return {
      label: `Vencida hace ${hoy.diff(fv, "day")} días`,
      tone: "danger",
      classes:
        "bg-rose-500/10 border-rose-500/30 text-rose-100",
      icon: HiExclamation,
    };
  }
  if (fv.isSame(hoy)) {
    return {
      label: "Vence hoy",
      tone: "warning",
      classes:
        "bg-cyan-500/10 border-cyan-500/30 text-cyan-100",
      icon: HiClock,
    };
  }
  return {
    label: `Vence en ${fv.diff(hoy, "day")} días`,
    tone: "warning",
    classes:
      "bg-amber-500/10 border-amber-500/30 text-amber-100",
    icon: HiClock,
  };
}

export default function CuotasAlertas() {
  const dispatch = useDispatch();
  const { cuotasAVencer, status, error } = useSelector((s) => s.pagos);

  useEffect(() => {
    dispatch(fetchCuotasAVencer());
  }, [dispatch]);

  if (status === "loading") {
    return (
      <div className="mt-6 rounded-2xl border border-neutral-300/20 bg-neutral-400/20 p-4">
        <div className="h-4 w-40 rounded bg-neutral-300/30 animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-16 rounded-xl border border-neutral-300/20 bg-neutral-300/10 animate-pulse" />
          <div className="h-16 rounded-xl border border-neutral-300/20 bg-neutral-300/10 animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100">
        Error cargando alertas: {String(error || "desconocido")}
      </div>
    );
  }

  if (!cuotasAVencer || cuotasAVencer.length === 0) return null;

  return (
    <motion.div
      className="mt-6 rounded-2xl border border-neutral-300/20 bg-neutral-400/20 p-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-400 text-neutral-900">
          <HiClock className="w-5 h-5" />
        </span>
        <h2 className="text-lg font-semibold">Alertas de cuotas por vencer / vencidas</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cuotasAVencer.map((cuota) => {
          const meta = getAlertaMeta(cuota.fecha_vencimiento);
          const Icon = meta.icon || HiClock;

          return (
            <motion.div
              key={cuota.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-4 ${meta.classes}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-neutral-100/10">
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className="font-medium">{meta.label}</p>
                  </div>
                  <p className="opacity-90">
                    <span className="font-semibold">
                      {cuota.poliza?.marca} {cuota.poliza?.modelo}
                    </span>{" "}
                    ({cuota.poliza?.patente})
                  </p>
                  <p>
                    Cuota #{cuota.cuota_nro} • $
                    {new Intl.NumberFormat("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(Number(cuota.monto || 0))}
                  </p>
                  <p>
                    Vencimiento:{" "}
                    {cuota.fecha_vencimiento
                      ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY")
                      : "—"}
                  </p>
                  {cuota.pagado && cuota.fecha_pago && (
                    <p className="flex items-center gap-1">
                      <HiBadgeCheck className="w-4 h-4" />
                      Pagado el: {dayjs(cuota.fecha_pago).format("DD/MM/YYYY")}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
