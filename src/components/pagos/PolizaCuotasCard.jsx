/* src/components/pagos/PolizaCuotasCard.jsx — Tarjetas pastel sólidas (app moderna) */
import { useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { HiCash, HiBadgeCheck, HiClock, HiDocumentText } from "react-icons/hi";

import { registrarPagoYBalance } from "../../utils/pagos/registrarPagoYBalance";
import DescargarFactura from "./DescargarFactura";
import ModalFormaPago from "./ModalFormaPago";

/* ====== Paleta pastel sólida ====== */
const P = {
  // contenedor principal
  card: "rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm",
  headerIcon: "bg-indigo-300 text-indigo-950 ring-2 ring-indigo-400/60",
  title: "text-neutral-900",
  subtitle: "text-neutral-600",
  // estados
  paid: {
    chipBg: "bg-emerald-300",
    chipTxt: "text-emerald-950",
    chipBd: "border-emerald-400",
    rowBg: "bg-emerald-200",
    rowBd: "border-emerald-300",
    rowTxt: "text-emerald-950",
    btn: "bg-emerald-300 hover:bg-emerald-400 text-emerald-950 border-emerald-500",
  },
  pending: {
    chipBg: "bg-amber-300",
    chipTxt: "text-amber-950",
    chipBd: "border-amber-400",
    rowBg: "bg-amber-200",
    rowBd: "border-amber-300",
    rowTxt: "text-amber-950",
    btn: "bg-amber-300 hover:bg-amber-400 text-amber-950 border-amber-500",
  },
  overdue: {
    chipBg: "bg-rose-300",
    chipTxt: "text-rose-950",
    chipBd: "border-rose-400",
    rowBg: "bg-rose-200",
    rowBd: "border-rose-300",
    rowTxt: "text-rose-950",
    btn: "bg-rose-300 hover:bg-rose-400 text-rose-950 border-rose-500",
  },
  link: "bg-sky-300 hover:bg-sky-400 text-sky-950 border-sky-500",
  tip: "bg-fuchsia-300 text-fuchsia-950 border-fuchsia-500",
};

const fmtMoney = (n) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

/* ====== Badge de estado (pastel) ====== */
function EstadoBadge({ pagado, fecha_vencimiento }) {
  if (pagado) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${P.paid.chipBg} ${P.paid.chipTxt} ${P.paid.chipBd}`}>
        <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-white/50 ring-1 ring-black/10">
          <HiBadgeCheck className="w-4 h-4" />
        </span>
        ¡Al día!
      </span>
    );
  }
  const fv = fecha_vencimiento ? dayjs(fecha_vencimiento) : null;
  let label = "Por pagar";
  let style = P.pending;
  if (fv) {
    const hoy = dayjs().startOf("day");
    if (fv.isBefore(hoy)) {
      label = "Vencida";
      style = P.overdue;
    } else if (fv.isSame(hoy)) {
      label = "¡Vence hoy!";
      style = P.pending;
    }
  }
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${style.chipBg} ${style.chipTxt} ${style.chipBd}`}>
      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-white/50 ring-1 ring-black/10">
        <HiClock className="w-4 h-4" />
      </span>
      {label}
    </span>
  );
}

export default function PolizaCuotasCard({ poliza }) {
  const dispatch = useDispatch();
  const [cuotasLocal, setCuotasLocal] = useState(poliza?.cuotas || []);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const abrirModal = (cuota) => {
    setCuotaSeleccionada(cuota);
    setModalOpen(true);
  };

  const confirmarPago = async (datos) => {
    if (!cuotaSeleccionada) return;

    const formaPago = datos.metodo || datos.forma_pago || "efectivo";
    const monto = Number(datos.monto ?? cuotaSeleccionada.monto);

    await registrarPagoYBalance({
      dispatch,
      cuota: cuotaSeleccionada,
      poliza,
      formaPago,
      monto,
      onSuccess: () => {
        setCuotasLocal((prev) =>
          prev.map((c) =>
            c.id === cuotaSeleccionada.id
              ? {
                  ...c,
                  pagado: true,
                  forma_pago: formaPago,
                  monto: monto ?? c.monto,
                  fecha_pago: dayjs().toISOString(),
                }
              : c
          )
        );
        setModalOpen(false);
      },
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={P.card}>
      {/* Encabezado */}
      <div className="flex items-start md:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center rounded-3xl w-12 h-12 shadow ${P.headerIcon}`} title="Pagos">
            <HiCash className="w-7 h-7" />
          </span>
          <div className="leading-tight">
            <h3 className={`text-xl font-extrabold ${P.title}`}>
              {poliza?.marca} {poliza?.modelo} <span className="opacity-70">({poliza?.patente})</span>
            </h3>
            <p className={`text-sm ${P.subtitle}`}>
              Póliza: <span className="font-semibold">{poliza?.numero_poliza || "—"}</span>{" "}
              • Cobertura: <span className="font-semibold">{poliza?.cobertura || "—"}</span>
            </p>
            {poliza?.cliente && (
              <p className={`text-sm ${P.subtitle}`}>
                Asegurado:{" "}
                <span className="font-semibold">
                  {poliza.cliente.nombre} {poliza.cliente.apellido}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lista de cuotas */}
      <ul className="mt-5 space-y-3">
        {cuotasLocal.map((cuota, i) => {
          const hoy = dayjs().startOf("day");
          const fv = cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento) : null;
          const isOverdue = !cuota.pagado && fv && fv.isBefore(hoy);
          const S = cuota.pagado ? P.paid : isOverdue ? P.overdue : P.pending;

          return (
            <motion.li
              key={cuota.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, delay: i * 0.03, ease: "easeOut" }}
              className={`rounded-2xl border p-4 shadow-sm ${S.rowBg} ${S.rowBd} ${S.rowTxt}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <EstadoBadge pagado={!!cuota.pagado} fecha_vencimiento={cuota.fecha_vencimiento} />
                    <p className="font-bold">
                      Cuota #{cuota.cuota_nro} • <span className="text-base">$ {fmtMoney(cuota.monto)}</span>
                    </p>
                  </div>
                  <p>
                    Vencimiento:{" "}
                    {cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY") : "—"}
                  </p>
                  {cuota.pagado && cuota.fecha_pago && <p>Pagado el: {dayjs(cuota.fecha_pago).format("DD/MM/YYYY")}</p>}
                </div>

                <div className="flex items-center gap-2">
                  {!cuota.pagado && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => abrirModal(cuota)}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-extrabold ${S.btn}`}
                    >
                      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-white/50 ring-1 ring-black/10">
                        <HiBadgeCheck className="w-4 h-4" />
                      </span>
                      Pagar
                    </motion.button>
                  )}

                  {cuota.pagado && (
                    <DescargarFactura
                      cliente={poliza?.cliente}
                      poliza={poliza}
                      cuota={cuota}
                      label="Factura"
                      tone="friendly"
                    />
                  )}

                  <a
                    href={`/polizas/${poliza?.id || ""}`}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold ${P.link}`}
                    title="Ver póliza"
                  >
                    <HiDocumentText className="w-5 h-5" />
                    Ver póliza
                  </a>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>

      {/* Nota inferior */}
      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-700">
        <span className={`inline-block px-2 py-1 rounded-full border ${P.tip}`}>✨ tip</span>
        Podés registrar pagos parciales desde el modal y dejar una nota.
      </div>

      {modalOpen && cuotaSeleccionada && (
        <ModalFormaPago
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={confirmarPago}
          defaultMonto={cuotaSeleccionada?.monto}
          title={`Pagar cuota #${cuotaSeleccionada?.cuota_nro}`}
        />
      )}
    </motion.div>
  );
}
