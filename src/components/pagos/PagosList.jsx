/* src/components/pagos/PagosList.jsx — Dark theme con acentos pasteles sólidos, full-width móvil */
import { useDispatch } from "react-redux";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  HiBadgeCheck,
  HiClock,
  HiCash,
  HiDeviceMobile,
  HiExclamationCircle,
  HiUser,
  HiQuestionMarkCircle,
  HiX,
} from "react-icons/hi";

import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import DescargarFactura from "./DescargarFactura";
import EnviarFacturaWhatsapp from "./EnviarFacturaWhatsapp";
import ModalFormaPago from "./ModalFormaPago";

/* ====== Paleta dark + pasteles sólidos ====== */
const PALETTE = {
  basePanel: "bg-[#0b0e12] border-neutral-900",
  header: "bg-neutral-950 text-neutral-300",
  divider: "divide-neutral-900",

  paid: {
    stripe: "bg-emerald-400",
    cardBg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-emerald-400/40",
    chipBg: "bg-emerald-300",
    chipText: "text-emerald-950",
    chipBorder: "border-emerald-400",
    noteBg: "bg-emerald-300",
    noteText: "text-emerald-950",
    btn: "bg-emerald-300 hover:bg-emerald-400 text-emerald-950 border-emerald-500",
    dot: "bg-emerald-400",
  },
  pending: {
    stripe: "bg-amber-400",
    cardBg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-amber-400/40",
    chipBg: "bg-amber-300",
    chipText: "text-amber-950",
    chipBorder: "border-amber-400",
    noteBg: "bg-amber-300",
    noteText: "text-amber-950",
    btn: "bg-amber-300 hover:bg-amber-400 text-amber-950 border-amber-500",
    dot: "bg-amber-400",
  },
  overdue: {
    stripe: "bg-rose-400",
    cardBg: "bg-neutral-900",
    text: "text-neutral-100",
    border: "border-rose-400/40",
    chipBg: "bg-rose-300",
    chipText: "text-rose-950",
    chipBorder: "border-rose-400",
    noteBg: "bg-rose-300",
    noteText: "text-rose-950",
    btn: "bg-rose-300 hover:bg-rose-400 text-rose-950 border-rose-500",
    dot: "bg-rose-400",
  },

  neutralBtn:
    "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border-neutral-700",
  actionBtn: "bg-indigo-400 hover:bg-indigo-500 text-indigo-950",
};

const fmtMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

export default function PagosList({
  cuotas = [],
  actualizarCuotas,
  ocultarPagadas = false,
  cuentasMercadoPago = [],
  billeterasVirtuales = [],
  mediosCobro = [],
}) {
  const dispatch = useDispatch();
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [obsAbiertaId, setObsAbiertaId] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);

  // datos para el modal de confirmación visual
  const [confirmData, setConfirmData] = useState(null);

  const items = useMemo(() => {
    const base = Array.isArray(cuotas) ? cuotas : [];
    return ocultarPagadas ? base.filter((c) => !c.pagado) : base;
  }, [cuotas, ocultarPagadas]);

  const abrirPagar = (cuota) => setCuotaSeleccionada(cuota);
  const cerrarPagar = () => setCuotaSeleccionada(null);
  const abrirDetalle = (cuota) => setDetalleAbierto(cuota);
  const cerrarDetalle = () => setDetalleAbierto(null);

  // Paso 1: desde ModalFormaPago armamos datos y abrimos el modal de confirmación
  const confirmarPago = (datos) => {
    if (!cuotaSeleccionada) return;

    const cuota = cuotaSeleccionada;
    const monto = Number(datos.monto ?? cuota.monto);
    const pol = cuota.poliza || {};
    const numeroPoliza =
      pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-";

    setConfirmData({
      datos,
      cuota,
      monto,
      numeroPoliza,
      cuotaNro: cuota.cuota_nro,
    });

    // cerramos el modal de forma de pago para que se vea solo el de confirmación
    cerrarPagar();
  };

  // Paso 2: ejecutar el pago realmente después de confirmar
  const ejecutarPagoConfirmado = async () => {
    if (!confirmData) return;

    const { datos, cuota, monto } = confirmData;

    const payload = {
      id: cuota.id,
      metodo: datos.metodo,
      forma_pago: datos.forma_pago,
      monto,
      fecha_pago: datos.fecha_pago,
      observaciones: datos.observaciones,
    };
    if (datos.medio_cobro_id) payload.medio_cobro_id = datos.medio_cobro_id;
    if (datos.destino_tipo) payload.destino_tipo = datos.destino_tipo;
    if (datos.destino_cuenta) payload.destino_cuenta = datos.destino_cuenta;

    try {
      const cuotaActualizada = await dispatch(
        marcarCuotaComoPagada(payload)
      ).unwrap();
      toast.success("Cuota marcada como pagada");
      const conObs = {
        ...cuotaActualizada,
        observaciones_pago: (datos.observaciones || "").trim(),
      };
      setConfirmData(null);
      actualizarCuotas?.([conObs]);
      if (conObs.observaciones_pago) setObsAbiertaId(conObs.id);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo registrar el pago");
    }
  };

  const handleCancelarConfirm = () => {
    if (!confirmData) {
      setConfirmData(null);
      return;
    }
    const { cuota } = confirmData;
    setConfirmData(null);
    // reabrimos el modal de forma de pago para corregir el monto
    if (cuota) {
      setCuotaSeleccionada(cuota);
    }
  };

  const datosNoti = useMemo(() => {
    if (!cuotaSeleccionada) return null;
    const pol = cuotaSeleccionada.poliza || {};
    const cli = pol.cliente || {};
    const nombreAp = [cli.nombre, cli.apellido].filter(Boolean).join(" ").trim();
    const dni = (cli.dni_cuit_cuil || "").toString().trim();
    const compania = (
      pol.compania_nombre ||
      pol.compania?.nombre ||
      pol.compania ||
      ""
    )
      .toString()
      .trim();
    const cobertura = (pol.cobertura || "").toString().trim();
    const total = Array.isArray(pol.cuotas) ? pol.cuotas.length : null;
    const cuotaTxt =
      typeof cuotaSeleccionada.cuota_nro === "number"
        ? total
          ? `Cuota ${cuotaSeleccionada.cuota_nro}/${total}`
          : `Cuota ${cuotaSeleccionada.cuota_nro}`
        : "";
    return { nombreAp, dni, compania, cobertura, cuotaTxt };
  }, [cuotaSeleccionada]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center text-neutral-400">
        No hay cuotas para mostrar.
      </div>
    );
  }

  return (
    <div
      className={`
        w-full
        ${PALETTE.basePanel}
        rounded-none sm:rounded-3xl
        border-t border-b sm:border
        overflow-hidden
      `}
    >
      {/* Encabezado */}
      <div
        className={`px-4 sm:px-6 py-3 sm:py-4 text-sm uppercase tracking-wide border-b border-neutral-900 ${PALETTE.header}`}
      >
        Resultados
      </div>

      {/* Lista tipo cards oscuras — scroll solo en desktop */}
      <div className="max-h-none md:max-h-[60vh] overflow-y-visible md:overflow-y-auto">
        <ul role="list" className={`divide-y ${PALETTE.divider}`}>
          {items.map((cuota, idx) => {
            const venc = cuota.fecha_vencimiento
              ? dayjs(cuota.fecha_vencimiento)
              : null;
            const dias = venc ? venc.diff(dayjs(), "day") : null;

            const state = cuota.pagado
              ? "paid"
              : dias !== null && dias < 0
              ? "overdue"
              : "pending";
            const S = PALETTE[state];
            const label =
              state === "paid"
                ? "Pagada"
                : state === "overdue"
                ? "Vencida"
                : "Pendiente";
            const Icon = state === "paid" ? HiBadgeCheck : HiClock;

            const pol = cuota?.poliza || {};
            const cliente = pol?.cliente || {};
            const nombreCompleto =
              [cliente.apellido, cliente.nombre].filter(Boolean).join(", ") ||
              "Cliente";
            const patente = (pol?.patente || "").toUpperCase();
            const modelo = [pol?.marca, pol?.modelo].filter(Boolean).join(" ");
            const observacion = (
              (cuota.observaciones_pago ||
                cuota.ultima_observacion_pago ||
                "") || ""
            )
              .toString()
              .trim();
            const obsActiva = obsAbiertaId === cuota.id;

            return (
              <motion.li
                key={cuota.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                  delay: idx * 0.015,
                }}
                className="relative"
              >
                {/* Línea de estado */}
                <span
                  className={`absolute left-0 top-0 h-full w-1.5 ${S.stripe}`}
                  aria-hidden
                />

                {/* Tarjeta oscura con borde acentuado */}
                <div
                  className={`mx-0 sm:mx-3 my-2 sm:my-3 rounded-none sm:rounded-2xl border p-4 shadow-sm ${S.cardBg} ${S.text} ${S.border}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                    {/* Izquierda */}
                    <div className="min-w-0">
                      {/* Encabezado fila */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-800 text-neutral-200 ring-1 ring-white/5">
                          <HiUser className="w-5 h-5" />
                        </span>
                        <span className="truncate max-w-[60ch] font-semibold">
                          {nombreCompleto}
                        </span>

                        {patente && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-3 h-8 bg-neutral-800 border-neutral-700 text-neutral-100">
                            {patente}
                          </span>
                        )}

                        {modelo && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-3 h-8 bg-neutral-800 border-neutral-700 text-neutral-300">
                            {modelo}
                          </span>
                        )}
                      </div>

                      {/* Estado + fechas */}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 h-8 ${S.chipBg} ${S.chipText} ${S.chipBorder}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${S.dot}`} />
                          <Icon className="w-4 h-4" />
                          {label}
                        </span>

                        <span className="text-neutral-500">•</span>

                        <div className="text-sm text-neutral-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Vence: {fmtDate(cuota.fecha_vencimiento)}</span>
                          {cuota.fecha_pago && (
                            <span>Pagada: {fmtDate(cuota.fecha_pago)}</span>
                          )}
                          {dias !== null && !cuota.pagado && (
                            <span>
                              {dias < 0
                                ? `Atraso: ${Math.abs(dias)} días`
                                : `Faltan: ${dias} días`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Observaciones (pastel sólido sobre dark) */}
                      {observacion && obsActiva && (
                        <div
                          className={`mt-3 rounded-2xl border px-3 py-3 ${PALETTE.overdue.noteBg} ${PALETTE.overdue.noteText} border-rose-400`}
                        >
                          <div className="flex items-start gap-2">
                            <HiExclamationCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <div className="text-sm whitespace-pre-wrap break-words">
                              <span className="font-semibold">
                                Observaciones:{" "}
                              </span>
                              {observacion}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Derecha: monto + acciones */}
                    <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
                      <p className="text-3xl font-extrabold tracking-tight text-neutral-50 text-right w-full">
                        $ {fmtMoney(cuota.monto)}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 md:gap-3 w-full">
                        <button
                          onClick={() => abrirDetalle(cuota)}
                          className={`h-10 px-3 rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-2 w-full sm:w-auto`}
                          title="Ver más información"
                          aria-label="Ver más información"
                        >
                          <HiQuestionMarkCircle className="w-5 h-5" />
                          <span className="hidden sm:inline">Más info</span>
                        </button>

                        {observacion && (
                          <button
                            onClick={() =>
                              setObsAbiertaId(obsActiva ? null : cuota.id)
                            }
                            className={`h-10 px-3 rounded-xl border ${PALETTE.overdue.btn} inline-flex items-center justify-center gap-2 transition w-full sm:w-auto`}
                            title={
                              obsActiva
                                ? "Ocultar observación"
                                : "Ver observación"
                            }
                          >
                            <HiExclamationCircle className="w-5 h-5" />
                            <span className="hidden sm:inline">
                              {obsActiva ? "Ocultar nota" : "Ver nota"}
                            </span>
                          </button>
                        )}

                        {!cuota.pagado && (
                          <button
                            onClick={() => abrirPagar(cuota)}
                            className={`h-10 px-4 rounded-xl ${PALETTE.actionBtn} transition inline-flex items-center justify-center gap-2 w-full sm:w-auto`}
                            title="Registrar pago"
                          >
                            <HiCash className="w-5 h-5" />
                            <span className="hidden sm:inline">Pagar</span>
                          </button>
                        )}

                        {cuota.pagado && (
                          <DescargarFactura
                            cliente={pol?.cliente}
                            poliza={pol}
                            cuota={cuota}
                            tone="neutral"
                            label="Factura"
                            className="mt-0 w-full sm:w-auto"
                          />
                        )}

                        <EnviarFacturaWhatsapp cuota={cuota}>
                          <button
                            className={`h-10 px-3 rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-2 w-full sm:w-auto`}
                            title="Enviar por WhatsApp"
                          >
                            <HiDeviceMobile className="w-5 h-5" />
                            <span className="hidden sm:inline">Enviar</span>
                          </button>
                        </EnviarFacturaWhatsapp>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Modal de pago (oscuro) */}
      <ModalFormaPago
        isOpen={!!cuotaSeleccionada}
        onClose={cerrarPagar}
        onConfirm={confirmarPago}
        defaultMonto={cuotaSeleccionada?.monto}
        title={`Confirmar pago — Cuota #${cuotaSeleccionada?.cuota_nro ?? "?"}`}
        cuentasMercadoPago={cuentasMercadoPago}
        billeterasVirtuales={billeterasVirtuales}
        mediosCobro={mediosCobro}
        clienteNombreApellido={datosNoti?.nombreAp || ""}
        clienteDni={datosNoti?.dni || ""}
        polizaCompania={datosNoti?.compania || ""}
        polizaCobertura={datosNoti?.cobertura || ""}
        pagoCuota={datosNoti?.cuotaTxt || ""}
      />

      {/* Modal de confirmación de pago (oscuro, monto grande) */}
      <AnimatePresence>
        {confirmData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleCancelarConfirm}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[66] w-[min(420px,92vw)] rounded-2xl border border-neutral-800 bg-neutral-950 px-6 py-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-neutral-50">
                  Confirmar pago
                </h3>
                <button
                  onClick={handleCancelarConfirm}
                  className="h-9 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 inline-flex items-center gap-2 text-sm"
                >
                  <HiX className="w-5 h-5" />
                  <span className="hidden sm:inline">Cancelar</span>
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-neutral-300">
                  Vas a pagar la cuota{" "}
                  <span className="font-semibold">
                    #{confirmData.cuotaNro ?? "?"}
                  </span>{" "}
                  de la póliza{" "}
                  <span className="font-semibold">
                    {confirmData.numeroPoliza}
                  </span>
                  .
                </p>

                <div className="mt-2 mb-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-400 mb-1">
                    Importe a pagar
                  </p>
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-400">
                    $ {fmtMoney(confirmData.monto)}
                  </p>
                </div>

                <p className="text-xs text-neutral-400">
                  Revisá que el monto sea correcto antes de confirmar. Si hay
                  un error podés volver al formulario y ajustarlo.
                </p>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={handleCancelarConfirm}
                  className="h-10 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-sm"
                >
                  Volver y corregir
                </button>
                <button
                  onClick={ejecutarPagoConfirmado}
                  className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
                >
                  <HiCash className="w-5 h-5" />
                  Confirmar pago
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal “Más info” (oscuro) */}
      <AnimatePresence>
        {detalleAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div
              onClick={cerrarDetalle}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[61] w-[min(680px,92vw)] rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-detalle-title"
            >
              <div className="flex items-start justify-between gap-4">
                <h3
                  id="modal-detalle-title"
                  className="text-lg font-semibold text-neutral-50"
                >
                  Detalle de cuota
                </h3>
                <button
                  onClick={cerrarDetalle}
                  className="h-9 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 inline-flex items-center gap-2"
                  aria-label="Cerrar"
                >
                  <HiX className="w-5 h-5" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              </div>

              {(() => {
                const c = detalleAbierto;
                const pol = c?.poliza || {};
                const cli = pol?.cliente || {};
                const nombreCompleto =
                  [cli.apellido, cli.nombre].filter(Boolean).join(", ") ||
                  "Cliente";
                const clienteId = cli?.id;
                const dni = (cli?.dni_cuit_cuil || "").toString().trim();
                const patente = (pol?.patente || "").toUpperCase();
                const modelo = [pol?.marca, pol?.modelo].filter(Boolean).join(
                  " "
                );
                const cobertura = (pol?.cobertura || "").toString().trim();
                const compania = (
                  pol?.compania_nombre ||
                  pol?.compania?.nombre ||
                  pol?.compania ||
                  ""
                )
                  .toString()
                  .trim();
                const total = Array.isArray(pol?.cuotas)
                  ? pol.cuotas.length
                  : null;

                return (
                  <div className="mt-4 space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoRow label="Cliente" value={nombreCompleto} />
                      <InfoRow
                        label="Cliente ID"
                        value={
                          typeof clienteId === "number" ? `#${clienteId}` : "—"
                        }
                      />
                      <InfoRow label="DNI/CUIT" value={dni || "—"} />
                      <InfoRow label="Patente" value={patente || "—"} />
                      <InfoRow label="Vehículo" value={modelo || "—"} />
                      <InfoRow label="Cobertura" value={cobertura || "—"} />
                      <InfoRow label="Compañía" value={compania || "—"} />
                      <InfoRow
                        label="Cuota"
                        value={
                          typeof c?.cuota_nro === "number"
                            ? total
                              ? `${c.cuota_nro}/${total}`
                              : `${c.cuota_nro}`
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Monto"
                        value={`$ ${fmtMoney(c?.monto)}`}
                      />
                      <InfoRow
                        label="Vencimiento"
                        value={fmtDate(c?.fecha_vencimiento)}
                      />
                      <InfoRow
                        label="Fecha de pago"
                        value={fmtDate(c?.fecha_pago)}
                      />
                      <InfoRow
                        label="Estado"
                        value={
                          c?.pagado
                            ? "Pagada"
                            : c?.fecha_vencimiento &&
                              dayjs(c.fecha_vencimiento).isBefore(
                                dayjs(),
                                "day"
                              )
                            ? "Vencida"
                            : "Pendiente"
                        }
                      />
                    </div>

                    {(c?.observaciones_pago ||
                      c?.ultima_observacion_pago) && (
                      <div className="rounded-2xl border border-rose-400 bg-rose-300 p-3 text-rose-950">
                        <div className="flex items-start gap-2">
                          <HiExclamationCircle className="w-5 h-5 mt-0.5 shrink-0" />
                          <div className="whitespace-pre-wrap break-words">
                            <span className="font-semibold">
                              Observaciones:{" "}
                            </span>
                            {(c?.observaciones_pago ||
                              c?.ultima_observacion_pago ||
                              ""
                            )
                              .toString()
                              .trim()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={cerrarDetalle}
                        className="h-10 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200"
                      >
                        Entendido
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Subcomponente: fila label/valor para el modal (dark) */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
      <span className="text-neutral-400">{label}</span>
      <span className="text-neutral-100 truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}
