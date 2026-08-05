// src/components/polizas/CuponesRoboPanel.jsx
//
// 🆕 SOLO LECTURA. Los cupones se marcan pagados ÚNICAMENTE desde la sección
// "Cuponeras" (/cuponeras). Acá, dentro de la ficha de la póliza, solo se
// muestran para consulta: período, vencimiento, estado y (si existe) el link
// al comprobante. No hay montos, comisiones ni acciones de pago.
import { useMemo } from "react";
import dayjs from "dayjs";
import {
  HiBadgeCheck,
  HiClock,
  HiExclamationCircle,
  HiPhotograph,
  HiInformationCircle,
} from "react-icons/hi";

const shell = "rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark";

const badgeByEstado = {
  AL_DIA:  "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo border border-duo-amarillo/30",
  PAGADA:  "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde border border-duo-verde/30",
  VENCIDA: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo border border-duo-rojo/30",
};

const labelByEstado = {
  AL_DIA: "Al día",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

export default function CuponesRoboPanel({ poliza, cupones: cuponesProp }) {
  const cuotas = poliza?.cuotas || [];
  const cupones = useMemo(() => (Array.isArray(cuponesProp) ? cuponesProp : []), [cuponesProp]);

  return (
    <div className={shell}>
      {/* Header — aviso de solo lectura */}
      <div className="flex items-start gap-2 border-b border-linea dark:border-linea-dark px-4 py-3">
        <HiInformationCircle className="mt-0.5 h-4 w-4 shrink-0 text-duo-azul" />
        <p className="text-[11px] leading-snug text-suave dark:text-suave-dark">
          Cupones de las cuotas de la compañía (solo lectura). Para marcar un pago, andá a la
          sección <span className="font-black text-duo-azul">Cuponeras</span>.
        </p>
      </div>

      <div className="space-y-3 px-4 py-3">
        {cupones.length === 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-3 text-[11px] text-suave dark:text-suave-dark">
            <HiClock className="mt-0.5 h-4 w-4" />
            <span>Todavía no hay cupones de robo para esta póliza. Se generan en base a las cuotas de la compañía.</span>
          </div>
        )}

        {cupones.length > 0 && (
          <div className="space-y-2">
            {cupones
              .slice()
              .sort((a, b) => String(a.periodo_desde || "").localeCompare(String(b.periodo_desde || "")))
              .map((cupon) => {
                const baseEstado = (cupon.estado || "PENDIENTE").toUpperCase();
                const isPagada = baseEstado === "PAGADA";
                const hoy = dayjs();
                const tieneVto = !!cupon.fecha_vencimiento;
                const isVencida = !isPagada && tieneVto && dayjs(cupon.fecha_vencimiento).isBefore(hoy, "day");
                const visualEstado = isPagada ? "PAGADA" : isVencida ? "VENCIDA" : "AL_DIA";
                const badgeClass = badgeByEstado[visualEstado] || "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark border border-linea dark:border-linea-dark";

                const cardTone =
                  visualEstado === "PAGADA"
                    ? "border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
                    : visualEstado === "VENCIDA"
                    ? "border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
                    : "border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]";

                const cuotaAsociada = cuotas.find((c) => dayjs(c.fecha_vencimiento).isSame(dayjs(cupon.fecha_vencimiento), "month"));
                const tituloCupon = cuotaAsociada ? `Cupón de cuota #${cuotaAsociada.cuota_nro}` : "Cupón de robo";

                // Comprobante: soporta el campo nuevo (comprobante_url) y el viejo (foto_url).
                const comprobante = cupon.comprobante_url || cupon.foto_url || "";

                return (
                  <div
                    key={cupon.id}
                    className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${cardTone}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold uppercase tracking-tight text-titulo dark:text-titulo-dark">{tituloCupon}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}>
                        {visualEstado === "PAGADA" && <HiBadgeCheck className="h-3 w-3" />}
                        {visualEstado === "AL_DIA" && <HiClock className="h-3 w-3" />}
                        {visualEstado === "VENCIDA" && <HiExclamationCircle className="h-3 w-3" />}
                        <span>{labelByEstado[visualEstado] || visualEstado}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-titulo dark:text-titulo-dark">
                      {cupon.periodo_desde && (
                        <span className="rounded-full border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2 py-0.5">
                          Período: {dayjs(cupon.periodo_desde).format("MM/YYYY")}
                        </span>
                      )}
                      {cupon.fecha_vencimiento && (
                        <span className="rounded-full border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2 py-0.5 text-[10px]">
                          Vence: {dayjs(cupon.fecha_vencimiento).format("DD/MM/YYYY")}
                        </span>
                      )}
                      {isPagada && cupon.fecha_pago && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-2 py-0.5 text-[10px] font-medium text-duo-verde-sombra dark:text-duo-verde">
                          <HiBadgeCheck className="h-3 w-3" />
                          Pagado el {dayjs(cupon.fecha_pago).format("DD/MM/YYYY")}
                        </span>
                      )}
                    </div>

                    {comprobante && (
                      <a
                        href={comprobante}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1 text-[11px] font-bold text-duo-azul hover:underline"
                      >
                        <HiPhotograph className="h-3.5 w-3.5" /> Ver comprobante
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
