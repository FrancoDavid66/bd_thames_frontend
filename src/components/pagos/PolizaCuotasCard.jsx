/* src/components/pagos/PolizaCuotasCard.jsx — Tarjetas pastel sólidas (app moderna) */
import { useState } from "react";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import {
  HiCash,
  HiBadgeCheck,
  HiClock,
  HiDocumentText,
  HiX,
  HiPencil, // 🚀 Importamos el lápiz
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { registrarPagoYBalance } from "../../utils/pagos/registrarPagoYBalance";
import DescargarFactura from "./DescargarFactura";
import ImprimirFacturaTicket from "./ImprimirFacturaTicket";
import ModalFormaPago from "./ModalFormaPago";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

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

  // NUEVO: botón ticket (pastel violeta)
  ticketBtn:
    "bg-violet-300 hover:bg-violet-400 text-violet-950 border-violet-500",
};

const fmtMoney = (n) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const toYmd = (d) => {
  if (!d) return "";
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

/* ====== Badge de estado (pastel) ====== */
function EstadoBadge({ pagado, fecha_vencimiento }) {
  if (pagado) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${P.paid.chipBg} ${P.paid.chipTxt} ${P.paid.chipBd}`}
      >
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
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${style.chipBg} ${style.chipTxt} ${style.chipBd}`}
    >
      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-white/50 ring-1 ring-black/10">
        <HiClock className="w-4 h-4" />
      </span>
      {label}
    </span>
  );
}

export default function PolizaCuotasCard({ poliza }) {
  const dispatch = useDispatch();
  
  // 🚀 Obtenemos rol de Admin para el botón de cambio de fecha
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [cuotasLocal, setCuotasLocal] = useState(poliza?.cuotas || []);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // datos para el modal de confirmación visual
  const [confirmData, setConfirmData] = useState(null);

  // 🚀 ESTADOS PARA EL MODAL DE CAMBIO DE FECHA
  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [cuotaFechaSeleccionada, setCuotaFechaSeleccionada] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [ajustarSiguientes, setAjustarSiguientes] = useState(true);
  const [isSubmittingFecha, setIsSubmittingFecha] = useState(false);

  const abrirModal = (cuota) => {
    setCuotaSeleccionada(cuota);
    setModalOpen(true);
  };

  // 🚀 Funciones para Cambiar Fecha
  const abrirModalFecha = (cuota) => {
    setCuotaFechaSeleccionada(cuota);
    setNuevaFecha(toYmd(cuota.fecha_vencimiento) || dayjs().format('YYYY-MM-DD'));
    setAjustarSiguientes(true);
    setModalFechaOpen(true);
  };

  const cerrarModalFecha = () => {
    setModalFechaOpen(false);
    setCuotaFechaSeleccionada(null);
  };

  const handleCambiarFecha = async () => {
    if (!cuotaFechaSeleccionada || !nuevaFecha) return;
    setIsSubmittingFecha(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
      const res = await axios.patch(
        `${BASE_URL.replace(/\/+$/, '')}/cuotas/${cuotaFechaSeleccionada.id}/cambiar-fecha/`,
        {
          nueva_fecha: nuevaFecha,
          ajustar_siguientes: ajustarSiguientes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const cambiadas = res.data?.cuotas_modificadas || 1;
      toast.success(`¡Listo! Se actualizaron ${cambiadas} cuotas.`);
      toast.success("Recargando para ver los cambios...");
      
      // Recargamos la vista para que el detalle de la póliza traiga las fechas actualizadas
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      setModalFechaOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.nueva_fecha || error.response?.data?.detail || "Error al cambiar la fecha");
    } finally {
      setIsSubmittingFecha(false);
    }
  };

  // 1) Desde ModalFormaPago abrimos nuestro modal de confirmación
  const confirmarPago = (datos) => {
    if (!cuotaSeleccionada) return;

    const cuota = cuotaSeleccionada;
    const monto = Number(datos.monto ?? cuota.monto);
    const numeroPoliza =
      poliza?.numero_poliza ||
      poliza?.numero ||
      poliza?.nro_poliza ||
      poliza?.n_poliza ||
      "-";

    setConfirmData({
      datos,
      cuota,
      monto,
      numeroPoliza,
      cuotaNro: cuota.cuota_nro,
    });

    // cerramos el modal de forma de pago para que se vea solo el de confirmación
    setModalOpen(false);
  };

  // 2) Ejecutar el pago después de confirmar
  const ejecutarPagoConfirmado = async () => {
    if (!confirmData) return;

    const { datos, cuota, monto } = confirmData;
    const formaPago = datos.metodo || datos.forma_pago || "efectivo";

    await registrarPagoYBalance({
      dispatch,
      cuota,
      poliza,
      formaPago,
      monto,
      onSuccess: () => {
        setCuotasLocal((prev) =>
          prev.map((c) =>
            c.id === cuota.id
              ? {
                  ...c,
                  pagado: true,
                  forma_pago: formaPago,
                  monto: monto ?? c.monto,
                  fecha_pago: dayjs().toISOString(),
                  pago_registrado_en: dayjs().toISOString(), // ✅ FIX: Agregado para el PDF inmediato
                }
              : c
          )
        );
        setConfirmData(null);
        setModalOpen(false);
      },
    });
  };

  const handleCancelarConfirm = () => {
    if (!confirmData) {
      setConfirmData(null);
      return;
    }
    const { cuota } = confirmData;
    setConfirmData(null);
    // si cancela, reabrimos el modal de forma de pago para corregir
    if (cuota) {
      setCuotaSeleccionada(cuota);
      setModalOpen(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={P.card}
    >
      {/* Encabezado */}
      <div className="flex items-start md:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center rounded-3xl w-12 h-12 shadow ${P.headerIcon}`}
            title="Pagos"
          >
            <HiCash className="w-7 h-7" />
          </span>
          <div className="leading-tight">
            <h3 className={`text-xl font-extrabold ${P.title}`}>
              {poliza?.marca} {poliza?.modelo}{" "}
              <span className="opacity-70">({poliza?.patente})</span>
            </h3>
            {/* ✅ DÍA DE ALTA ACÁ */}
            <p className={`text-sm ${P.subtitle} flex flex-wrap gap-x-2`}>
              <span>
                Póliza: <span className="font-semibold">{poliza?.numero_poliza || "—"}</span>
              </span>
              <span className="opacity-50">•</span>
              <span>
                Alta: <span className="font-semibold text-indigo-600">{poliza?.fecha_emision ? dayjs(poliza.fecha_emision).format("DD/MM/YYYY") : "—"}</span>
              </span>
              <span className="opacity-50">•</span>
              <span>
                Cobertura: <span className="font-semibold">{poliza?.cobertura || "—"}</span>
              </span>
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
          const fv = cuota.fecha_vencimiento
            ? dayjs(cuota.fecha_vencimiento)
            : null;
          const isOverdue = !cuota.pagado && fv && fv.isBefore(hoy);
          const S = cuota.pagado ? P.paid : isOverdue ? P.overdue : P.pending;

          return (
            <motion.li
              key={cuota.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.22,
                delay: i * 0.03,
                ease: "easeOut",
              }}
              className={`rounded-2xl border p-4 shadow-sm ${S.rowBg} ${S.rowBd} ${S.rowTxt}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <EstadoBadge
                      pagado={!!cuota.pagado}
                      fecha_vencimiento={cuota.fecha_vencimiento}
                    />
                    <p className="font-bold">
                      Cuota #{cuota.cuota_nro} •{" "}
                      <span className="text-base">
                        $ {fmtMoney(cuota.monto)}
                      </span>
                    </p>
                  </div>
                  
                  {/* ✅ Lógica de fechas clara: Día de pago y Cobertura mensual */}
                  <div className="grid grid-cols-2 gap-2 mt-1 mb-1 max-w-[280px]">
                    <div className="bg-rose-50/80 rounded-lg p-2 border border-rose-100/50">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-[10px] uppercase tracking-wide text-rose-500 font-extrabold">Día de Pago (Vto)</div>
                        {/* 🚀 BOTÓN DE LÁPIZ PARA CAMBIAR FECHA (SÓLO ADMIN) */}
                        {isWebAdmin && !cuota.pagado && (
                          <button
                            type="button"
                            onClick={() => abrirModalFecha(cuota)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            title="Cambiar fecha de vencimiento"
                          >
                            <HiPencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="font-bold text-neutral-900 text-xs sm:text-sm">
                        {cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY") : "—"}
                      </div>
                    </div>
                    <div className="bg-indigo-50/80 rounded-lg p-2 border border-indigo-100/50">
                      <div className="text-[10px] uppercase tracking-wide text-indigo-500 font-extrabold mb-0.5">Cubre del:</div>
                      <div className="font-medium text-indigo-900 text-[10px] sm:text-xs">
                        {cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).format("DD/MM/YYYY") : "—"} <span className="text-indigo-400 mx-0.5">al</span> {cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).add(1, "month").format("DD/MM/YYYY") : "—"}
                      </div>
                    </div>
                  </div>

                  {cuota.pagado && cuota.fecha_pago && (
                    <p>
                      Pagado el:{" "}
                      {dayjs(cuota.fecha_pago).format("DD/MM/YYYY")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
                    <>
                      {/* A4 (como estaba) */}
                      <DescargarFactura
                        cliente={poliza?.cliente}
                        poliza={poliza}
                        cuota={cuota}
                        label="Factura"
                        tone="friendly"
                      />

                      {/* Ticket térmico */}
                      <ImprimirFacturaTicket
                        cliente={poliza?.cliente}
                        poliza={poliza}
                        cuota={cuota}
                        label="Imprimir factura"
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-extrabold ${P.ticketBtn}`}
                      />
                    </>
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
        <span className={`inline-block px-2 py-1 rounded-full border ${P.tip}`}>
          ✨ tip
        </span>
        Podés registrar pagos parciales desde el modal y dejar una nota.
      </div>

      {/* Modal de forma de pago */}
      {modalOpen && cuotaSeleccionada && (
        <ModalFormaPago
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={confirmarPago}
          defaultMonto={cuotaSeleccionada?.monto}
          title={`Pagar cuota #${cuotaSeleccionada?.cuota_nro}`}
        />
      )}

      {/* 🚀 MODAL PARA CAMBIAR FECHA (MÁQUINA DEL TIEMPO PARA ADMINS) */}
      <AnimatePresence>
        {modalFechaOpen && cuotaFechaSeleccionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-3"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isSubmittingFecha ? undefined : cerrarModalFecha} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[71] w-[min(420px,92vw)] rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Cambiar Vencimiento</h3>
                <button
                  onClick={cerrarModalFecha}
                  disabled={isSubmittingFecha}
                  className="h-8 w-8 rounded-lg border flex items-center justify-center text-neutral-500 bg-neutral-100 hover:bg-neutral-200 border-neutral-300 cursor-pointer"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-neutral-700">
                  Cuota <span className="font-semibold text-neutral-900">#{cuotaFechaSeleccionada.cuota_nro}</span>
                </p>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nueva fecha</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <input
                    type="checkbox"
                    checked={ajustarSiguientes}
                    onChange={(e) => setAjustarSiguientes(e.target.checked)}
                    className="mt-1 accent-indigo-600 w-4 h-4"
                  />
                  <span className="text-sm text-indigo-900">
                    Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).
                  </span>
                </label>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={cerrarModalFecha}
                    disabled={isSubmittingFecha}
                    className="h-10 px-4 rounded-xl border border-neutral-300 bg-neutral-100 text-sm text-neutral-700 hover:bg-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCambiarFecha}
                    disabled={isSubmittingFecha || !nuevaFecha}
                    className="h-10 px-4 rounded-xl border border-transparent bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 flex items-center gap-2"
                  >
                    {isSubmittingFecha ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación visual — número grande, centrado */}
      <AnimatePresence>
        {confirmData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCancelarConfirm}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative z-[61] w-[min(420px,92vw)] rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Confirmar pago
                </h3>
                <button
                  onClick={handleCancelarConfirm}
                  className="h-9 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 inline-flex items-center gap-2 text-sm"
                >
                  <HiX className="w-5 h-5" />
                  <span className="hidden sm:inline">Cancelar</span>
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-neutral-700">
                  Vas a pagar la cuota{" "}
                  <span className="font-semibold">
                    #{confirmData.cuotaNro ?? "?"}
                  </span>{" "}
                  de la póliza{" "}
                  <span className="font-semibold">{confirmData.numeroPoliza}</span>.
                </p>

                <div className="mt-2 mb-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-1">
                    Importe a pagar
                  </p>
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-500">
                    $ {fmtMoney(confirmData.monto)}
                  </p>
                </div>

                <p className="text-xs text-neutral-500">
                  Revisá que el monto sea correcto antes de confirmar. Si hay un
                  error podés volver al formulario y ajustarlo.
                </p>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={handleCancelarConfirm}
                  className="h-10 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 text-sm"
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
    </motion.div>
  );
}

// 🚀 FIX APLICADO AQUÍ: Agregamos abrirModalFecha a las props del componente
const CuotaRow = memo(
  function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs, abrirModalFecha }) {
    const {
      cuota,
      cuotaPdf,
      nombreCompleto,
      patente,
      modelo,
      observacion,
      hasObs,
      isObsOpen,
      state,
      label,
      dias,
      venceTxt,
      pagaTxt,
      montoTxt,
      cubreDesdeTxt,
      cubreHastaTxt,
      altaTxt,
      oficinaLabel, 
      isWebAdmin,   
    } = model || {};

    const S = PALETTE[state || "pending"];
    const Icon = state === "paid" ? HiBadgeCheck : HiClock;

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-1.5 ${S.stripe} hidden sm:block`} aria-hidden />

        <div className={`mx-0 sm:mx-3 my-0 sm:my-3 sm:rounded-2xl border-b sm:border p-3 sm:p-4 shadow-sm ${S.cardBg} ${S.text} ${S.border} relative`}>
          {/* Raya lateral para celular */}
          <span className={`absolute left-0 top-0 h-full w-1 ${S.stripe} sm:hidden`} aria-hidden />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 pl-2 sm:pl-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-neutral-800 text-neutral-200 ring-1 ring-white/5">
                  <HiUser className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                </span>
                <span className="truncate max-w-[40ch] sm:max-w-[60ch] font-semibold text-sm sm:text-base">
                  {nombreCompleto}
                </span>

                {patente && (
                  <span className="inline-flex items-center rounded-md sm:rounded-full border px-2 sm:px-3 h-6 sm:h-8 bg-neutral-800 border-neutral-700 text-neutral-100 text-[10px] sm:text-xs">
                    {patente}
                  </span>
                )}

                {modelo && (
                  <span className="inline-flex items-center rounded-md sm:rounded-full border px-2 sm:px-3 h-6 sm:h-8 bg-neutral-800 border-neutral-700 text-neutral-300 text-[10px] sm:text-xs">
                    {modelo}
                  </span>
                )}

                {/* ✅ BADGE DE ALTA DE LA PÓLIZA */}
                {altaTxt && (
                  <span className="inline-flex items-center rounded-md sm:rounded-full border px-2 sm:px-3 h-6 sm:h-8 bg-neutral-800 border-neutral-700 text-indigo-300 text-[10px] sm:text-xs font-medium">
                    Alta: {altaTxt}
                  </span>
                )}

                {/* 🚀 BADGE DE OFICINA EN LA FILA DE LA CUOTA (SOLO ADMIN) */}
                {isWebAdmin && oficinaLabel && (
                  <span className="inline-flex items-center rounded-md sm:rounded-full border px-2 sm:px-3 h-6 sm:h-8 bg-emerald-500/10 border-emerald-400/30 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    🏢 {oficinaLabel}
                  </span>
                )}
              </div>

              {/* ✅ CAJONCITOS DE LAS FECHAS */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className={`inline-flex items-center gap-1 sm:gap-2 rounded-md sm:rounded-full border px-2 sm:px-3 h-6 sm:h-8 ${S.chipBg} ${S.chipText} ${S.chipBorder} text-[10px] sm:text-xs font-medium`}>
                  <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${S.dot}`} />
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  {label}
                </span>

                <span className="text-neutral-500 hidden sm:inline">•</span>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="bg-rose-500/10 rounded-md px-2 py-1 border border-rose-500/20 flex items-center gap-1 w-fit">
                    <span className="text-[10px] uppercase tracking-wider text-rose-400/80 font-bold">Vence:</span>
                    <span className="text-xs font-bold text-white">{venceTxt || "—"}</span>
                    {/* 🚀 BOTÓN DE LÁPIZ PARA CAMBIAR FECHA (SÓLO ADMIN Y SI NO ESTÁ PAGADA) */}
                    {isWebAdmin && !cuota?.pagado && (
                      <button
                        type="button"
                        onClick={() => abrirModalFecha(cuota)}
                        className="ml-1 text-rose-400 hover:text-rose-200 transition cursor-pointer"
                        title="Cambiar fecha de vencimiento"
                      >
                        <HiPencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="bg-sky-500/10 rounded-md px-2 py-1 border border-sky-500/20 flex items-center gap-1 w-fit">
                    <span className="text-[10px] uppercase tracking-wider text-sky-400/80 font-bold">Cubre del:</span>
                    <span className="text-xs font-medium text-sky-200">{cubreDesdeTxt || "—"}</span>
                    <span className="text-[10px] text-sky-400/80">al</span>
                    <span className="text-xs font-medium text-sky-200">{cubreHastaTxt || "—"}</span>
                  </div>
                </div>

                <div className="text-[11px] sm:text-sm text-neutral-300 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 w-full sm:w-auto">
                  {!!pagaTxt && <span>Pagada: {pagaTxt}</span>}
                  {dias !== null && !cuota?.pagado && (
                    <span>{dias < 0 ? `Atraso: ${Math.abs(dias)} días` : `Faltan: ${dias} días`}</span>
                  )}
                </div>
              </div>

              {hasObs && isObsOpen && (
                <div className={`mt-2.5 rounded-xl border px-2.5 py-2 sm:px-3 sm:py-3 ${PALETTE.overdue.noteBg} ${PALETTE.overdue.noteText} border-rose-400`}>
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <HiExclamationCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0" />
                    <div className="text-[11px] sm:text-sm whitespace-pre-wrap break-words">
                      <span className="font-semibold">Obs: </span>{observacion}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch lg:items-end gap-2.5 sm:gap-3 w-full lg:w-auto mt-1 sm:mt-0">
              <p className="text-xl sm:text-3xl font-extrabold tracking-tight text-neutral-50 text-left lg:text-right w-full">
                $ {montoTxt}
              </p>

              {/* Contenedor FLEX que envuelve (wrap) en celular como una grilla fluida */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full">
                <button
                  onClick={() => abrirDetalle(cuota)}
                  className={`flex-1 min-w-[30%] sm:flex-none h-8 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-[11px] sm:text-sm`}
                >
                  <HiQuestionMarkCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  <span>Info</span>
                </button>

                {hasObs && (
                  <button
                    onClick={() => onToggleObs(cuota?.id)}
                    className={`flex-1 min-w-[30%] sm:flex-none h-8 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl border ${PALETTE.overdue.btn} inline-flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer text-[11px] sm:text-sm`}
                  >
                    <HiExclamationCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    <span>Nota</span>
                  </button>
                )}

                {!cuota?.pagado && (
                  <button
                    onClick={() => abrirPagar(cuota)}
                    className={`flex-[2] min-w-[45%] sm:flex-none h-8 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl ${PALETTE.actionBtn} transition inline-flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-[11px] sm:text-sm font-semibold`}
                  >
                    <HiCash className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    <span>Pagar</span>
                  </button>
                )}

                {cuota?.pagado && (
                  <>
                    <div className="flex-1 min-w-[30%] sm:flex-none">
                      <DescargarFactura
                        cliente={model?.pol?.cliente}
                        poliza={model?.pol}
                        cuota={cuotaPdf || cuota}   // ✅ acá va el próximo vencimiento real
                        tone="neutral"
                        label="Bajar"
                        className="w-full h-8 sm:h-10 text-[11px] sm:text-sm px-1 sm:px-3 rounded-lg sm:rounded-xl"
                      />
                    </div>

                    <div className="flex-1 min-w-[30%] sm:flex-none">
                      <ImprimirFacturaTicket
                        cliente={model?.pol?.cliente}
                        poliza={model?.pol}
                        cuota={cuotaPdf || cuota}   // ✅ acá va el próximo vencimiento real
                        label="Ticket"
                        className={`w-full h-8 sm:h-10 px-1 sm:px-3 rounded-lg sm:rounded-xl border transition inline-flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm ${PALETTE.ticketBtn}`}
                      />
                    </div>
                  </>
                )}

                <div className="flex-[2] min-w-[45%] sm:flex-none">
                  <EnviarFacturaWhatsapp cuota={cuota}>
                    <button className={`w-full h-8 sm:h-10 px-2 sm:px-3 rounded-lg sm:rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-[11px] sm:text-sm`}>
                      <HiDeviceMobile className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      <span>WhatsApp</span>
                    </button>
                  </EnviarFacturaWhatsapp>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
  (prev, next) => {
    const a = prev?.model;
    const b = next?.model;
    if (a === b) return true;
    if (a?.isObsOpen !== b?.isObsOpen) return false;

    const ca = a?.cuota;
    const cb = b?.cuota;
    if (ca?.id !== cb?.id) return false;
    if (ca?.pagado !== cb?.pagado) return false;
    if (ca?.monto !== cb?.monto) return false;
    if (ca?.fecha_vencimiento !== cb?.fecha_vencimiento) return false;
    if (ca?.fecha_pago !== cb?.fecha_pago) return false;
    if (ca?.observaciones_pago !== cb?.observaciones_pago) return false;
    if (ca?.ultima_observacion_pago !== cb?.ultima_observacion_pago) return false;
    if (a?.nombreCompleto !== b?.nombreCompleto) return false;
    if (a?.patente !== b?.patente) return false;
    if (a?.modelo !== b?.modelo) return false;
    return true;
  }
);

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 sm:px-3 sm:py-2">
      <span className="text-neutral-400 text-[11px] sm:text-sm">{label}</span>
      <span className="text-neutral-100 truncate max-w-[65%] text-right font-medium text-[11px] sm:text-sm">
        {value}
      </span>
    </div>
  );
}