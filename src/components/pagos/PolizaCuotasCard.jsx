/* src/components/pagos/PolizaCuotasCard.jsx — Tarjetas pastel sólidas (app moderna) */
import { useState, memo } from "react";
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
  HiPencil,
  HiUser,
  HiExclamationCircle,
  HiDeviceMobile,
  HiQuestionMarkCircle
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import { registrarPagoYBalance } from "../../utils/pagos/registrarPagoYBalance";
import DescargarFactura from "./DescargarFactura";
import ImprimirFacturaTicket from "./ImprimirFacturaTicket";
import EnviarFacturaWhatsapp from "./EnviarFacturaWhatsapp";
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
    stripe: "bg-emerald-400",
    text: "text-emerald-950",
    border: "border-emerald-300",
    chipText: "text-emerald-950",
    chipBorder: "border-emerald-400",
    dot: "bg-emerald-600",
    noteBg: "bg-emerald-100",
    noteText: "text-emerald-900",
    cardBg: "bg-emerald-50",
  },
  pending: {
    chipBg: "bg-amber-300",
    chipTxt: "text-amber-950",
    chipBd: "border-amber-400",
    rowBg: "bg-amber-200",
    rowBd: "border-amber-300",
    rowTxt: "text-amber-950",
    btn: "bg-amber-300 hover:bg-amber-400 text-amber-950 border-amber-500",
    stripe: "bg-amber-400",
    text: "text-amber-950",
    border: "border-amber-300",
    chipText: "text-amber-950",
    chipBorder: "border-amber-400",
    dot: "bg-amber-600",
    noteBg: "bg-amber-100",
    noteText: "text-amber-900",
    cardBg: "bg-white",
  },
  overdue: {
    chipBg: "bg-rose-300",
    chipTxt: "text-rose-950",
    chipBd: "border-rose-400",
    rowBg: "bg-rose-200",
    rowBd: "border-rose-300",
    rowTxt: "text-rose-950",
    btn: "bg-rose-300 hover:bg-rose-400 text-rose-950 border-rose-500",
    stripe: "bg-rose-500",
    text: "text-rose-950",
    border: "border-rose-300",
    chipText: "text-rose-950",
    chipBorder: "border-rose-400",
    dot: "bg-rose-600",
    noteBg: "bg-rose-100",
    noteText: "text-rose-900",
    cardBg: "bg-rose-50",
  },
  link: "bg-sky-300 hover:bg-sky-400 text-sky-950 border-sky-500",
  tip: "bg-fuchsia-300 text-fuchsia-950 border-fuchsia-500",
  ticketBtn: "bg-violet-300 hover:bg-violet-400 text-violet-950 border-violet-500",
  neutralBtn: "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300",
  actionBtn: "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500",
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
  
  // 🚀 Obtenemos rol de Admin para el botón de cambio de fecha
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [cuotasLocal, setCuotasLocal] = useState(poliza?.cuotas || []);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [obsAbiertaId, setObsAbiertaId] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);

  // datos para el modal de confirmación visual
  const [confirmData, setConfirmData] = useState(null);

  // 🚀 ESTADOS PARA EL MODAL DE CAMBIO DE FECHA
  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [cuotaFechaSeleccionada, setCuotaFechaSeleccionada] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [ajustarSiguientes, setAjustarSiguientes] = useState(true);
  const [isSubmittingFecha, setIsSubmittingFecha] = useState(false);

  const polizaEstado = String(poliza?.estado || "").toUpperCase();

  const toggleObs = (id) => {
    setObsAbiertaId((prev) => (prev === id ? null : id));
  };

  const abrirPagar = (cuota) => {
    setCuotaSeleccionada(cuota);
    setModalOpen(true);
  };

  const abrirDetalle = (cuota) => {
    setDetalleAbierto(cuota);
  };

  const cerrarDetalle = () => {
    setDetalleAbierto(null);
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
        { nueva_fecha: nuevaFecha, ajustar_siguientes: ajustarSiguientes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const cambiadas = res.data?.cuotas_modificadas || 1;
      toast.success(`¡Listo! Se actualizaron ${cambiadas} cuotas.`);
      toast.success("Recargando para ver los cambios...");
      
      setTimeout(() => window.location.reload(), 1500);
      setModalFechaOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.nueva_fecha || error.response?.data?.detail || "Error al cambiar la fecha");
    } finally {
      setIsSubmittingFecha(false);
    }
  };

  // 1) Confirmar Pago Visual
  const confirmarPago = (datos) => {
    if (!cuotaSeleccionada) return;
    const cuota = cuotaSeleccionada;
    const monto = Number(datos.monto ?? cuota.monto);
    const numeroPoliza = poliza?.numero_poliza || poliza?.numero || "-";

    setConfirmData({
      datos,
      cuota,
      monto,
      numeroPoliza,
      cuotaNro: cuota.cuota_nro,
      polizaEstado, // Para las alertas de Cancelada/Vencida
    });
    setModalOpen(false);
  };

  // 2) Ejecutar el pago después de confirmar
  const ejecutarPagoConfirmado = async () => {
    if (!confirmData) return;

    const { datos, cuota, monto } = confirmData;
    const formaPago = datos.metodo || datos.forma_pago || "efectivo";

    // Lógica de Reactivación Inteligente
    const overdueCount = cuotasLocal.filter(c => !c.pagado && dayjs(c.fecha_vencimiento).isBefore(dayjs().startOf("day"))).length;
    const remainingOverdue = Math.max(0, overdueCount - 1);

    await registrarPagoYBalance({
      dispatch, cuota, poliza, formaPago, monto,
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
                  pago_registrado_en: dayjs().toISOString(),
                }
              : c
          )
        );
        setConfirmData(null);
        setModalOpen(false);

        if (polizaEstado === "CANCELADA" || polizaEstado === "ANULADA") {
          toast.success("Deuda cobrada (Póliza CANCELADA).", { icon: "💀", duration: 5000 });
        } else if (polizaEstado === "VENCIDA") {
          if (remainingOverdue === 0) {
            toast.success("Pago registrado. ¡La póliza vuelve a estar ACTIVA! 🟢", { duration: 6000 });
          } else {
            toast.success(`Pago registrado. Aún debe ${remainingOverdue} cuotas (La póliza sigue VENCIDA). 🔴`, { duration: 6000 });
          }
        } else {
          toast.success("Pago registrado exitosamente");
        }
      },
    });
  };

  const handleCancelarConfirm = () => {
    if (!confirmData) return;
    const { cuota } = confirmData;
    setConfirmData(null);
    if (cuota) {
      setCuotaSeleccionada(cuota);
      setModalOpen(true);
    }
  };

  // Armamos los modelos de fila para pasarle al componente CuotaRow
  const rowModels = cuotasLocal.map(c => {
    const fv = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento).startOf("day") : null;
    const dias = fv ? fv.diff(dayjs().startOf("day"), "day") : null;
    const state = c?.pagado ? "paid" : dias !== null && dias < 0 ? "overdue" : "pending";
    const label = state === "paid" ? "Pagada" : state === "overdue" ? "Vencida" : "Pendiente";
    const observacion = ((c?.observaciones_pago || c?.ultima_observacion_pago || "") || "").toString().trim();

    return {
      cuota: c,
      poliza,
      nombreCompleto: poliza?.cliente ? `${poliza.cliente.apellido}, ${poliza.cliente.nombre}` : "Cliente",
      patente: poliza?.patente,
      modelo: [poliza?.marca, poliza?.modelo].filter(Boolean).join(" "),
      observacion,
      hasObs: !!observacion,
      isObsOpen: obsAbiertaId === c.id,
      state, label, dias, polizaEstado,
      venceTxt: fv ? fv.format("DD/MM/YYYY") : "—",
      pagaTxt: c?.fecha_pago ? dayjs(c.fecha_pago).format("DD/MM/YYYY") : null,
      montoTxt: fmtMoney(c?.monto),
      cubreDesdeTxt: fv ? fv.format("DD/MM/YYYY") : "—",
      cubreHastaTxt: fv ? fv.add(1, "month").format("DD/MM/YYYY") : "—",
      altaTxt: poliza?.fecha_emision ? dayjs(poliza.fecha_emision).format("DD/MM/YYYY") : null,
      isWebAdmin, abrirModalFecha
    }
  });

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
            <p className={`text-sm ${P.subtitle} flex flex-wrap gap-x-2`}>
              <span>Póliza: <span className="font-semibold">{poliza?.numero_poliza || "—"}</span></span>
              <span className="opacity-50">•</span>
              <span>Alta: <span className="font-semibold text-indigo-600">{poliza?.fecha_emision ? dayjs(poliza.fecha_emision).format("DD/MM/YYYY") : "—"}</span></span>
              <span className="opacity-50">•</span>
              <span>Cobertura: <span className="font-semibold">{poliza?.cobertura || "—"}</span></span>
            </p>
            {poliza?.cliente && (
              <p className={`text-sm ${P.subtitle}`}>Asegurado: <span className="font-semibold">{poliza.cliente.nombre} {poliza.cliente.apellido}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Lista de cuotas usando CuotaRow (similar a la app global) */}
      <div className="mt-5 space-y-3">
        {rowModels.map((m, i) => (
          <motion.div
            key={m.cuota.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, delay: i * 0.03, ease: "easeOut" }}
            className="relative"
          >
            <CuotaRow model={m} abrirPagar={abrirPagar} abrirDetalle={abrirDetalle} onToggleObs={toggleObs} />
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-neutral-700">
        <span className={`inline-block px-2 py-1 rounded-full border ${P.tip}`}>✨ tip</span>
        Podés registrar pagos parciales desde el modal y dejar una nota.
      </div>

      {modalOpen && cuotaSeleccionada && (
        <ModalFormaPago
          isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={confirmarPago}
          defaultMonto={cuotaSeleccionada?.monto} title={`Pagar cuota #${cuotaSeleccionada?.cuota_nro}`}
        />
      )}

      {/* 🚀 MODAL PARA CAMBIAR FECHA */}
      <AnimatePresence>
        {modalFechaOpen && cuotaFechaSeleccionada && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center px-3">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={isSubmittingFecha ? undefined : cerrarModalFecha} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 12 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="relative z-[71] w-[min(420px,92vw)] rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Cambiar Vencimiento</h3>
                <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-8 w-8 rounded-lg border flex items-center justify-center text-neutral-500 bg-neutral-100 hover:bg-neutral-200 border-neutral-300 cursor-pointer">
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-neutral-700">Cuota <span className="font-semibold text-neutral-900">#{cuotaFechaSeleccionada.cuota_nro}</span></p>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Nueva fecha</label>
                  <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <input type="checkbox" checked={ajustarSiguientes} onChange={(e) => setAjustarSiguientes(e.target.checked)} className="mt-1 accent-indigo-600 w-4 h-4" />
                  <span className="text-sm text-indigo-900">Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).</span>
                </label>

                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="cursor-pointer h-10 px-4 rounded-xl border border-neutral-300 bg-neutral-100 text-sm text-neutral-700 hover:bg-neutral-200">Cancelar</button>
                  <button onClick={handleCambiarFecha} disabled={isSubmittingFecha || !nuevaFecha} className="cursor-pointer h-10 px-4 rounded-xl border border-transparent bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 flex items-center gap-2">
                    {isSubmittingFecha ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación visual */}
      <AnimatePresence>
        {confirmData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelarConfirm} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="relative z-[61] w-[min(420px,92vw)] rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Confirmar pago</h3>
                <button onClick={handleCancelarConfirm} className="cursor-pointer h-9 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 inline-flex items-center gap-2 text-sm">
                  <HiX className="w-5 h-5" /> <span className="hidden sm:inline">Cancelar</span>
                </button>
              </div>

              {/* 🚀 ADVERTENCIA SI LA PÓLIZA ESTÁ CANCELADA */}
              {(confirmData.polizaEstado === "CANCELADA" || confirmData.polizaEstado === "ANULADA") && (
                <div className="mb-4 p-3 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-sm shadow-sm">
                  ⚠️ <strong className="text-rose-900">PÓLIZA DADA DE BAJA:</strong> Estás a punto de cobrar una cuota de una póliza cancelada. Esto se registrará en el sistema como <b>recupero de deuda</b>.
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-neutral-700">Vas a pagar la cuota <span className="font-semibold">#{confirmData.cuotaNro ?? "?"}</span> de la póliza <span className="font-semibold">{confirmData.numeroPoliza}</span>.</p>
                <div className="mt-2 mb-4 text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-1">Importe a pagar</p>
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-emerald-500">$ {fmtMoney(confirmData.monto)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button onClick={handleCancelarConfirm} className="cursor-pointer h-10 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 text-sm">Volver y corregir</button>
                <button onClick={ejecutarPagoConfirmado} className="cursor-pointer h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30">
                  <HiCash className="w-5 h-5" /> Confirmar pago
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detalleAbierto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center px-3">
            <div onClick={cerrarDetalle} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} className="relative z-[61] w-full max-w-[680px] max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-2xl custom-scrollbar">
              <div className="flex items-start justify-between gap-3 sticky top-0 bg-white pb-3 z-10 border-b border-neutral-200 mb-3">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">Detalle de cuota</h3>
                <button onClick={cerrarDetalle} className="cursor-pointer h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 flex items-center justify-center">
                  <HiX className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline ml-1 text-sm font-medium">Cerrar</span>
                </button>
              </div>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <InfoRow label="Cliente" value={detalleAbierto.poliza?.cliente ? `${detalleAbierto.poliza.cliente.apellido}, ${detalleAbierto.poliza.cliente.nombre}` : "—"} />
                  <InfoRow label="DNI/CUIT" value={detalleAbierto.poliza?.cliente?.dni_cuit_cuil || "—"} />
                  <InfoRow label="Patente" value={(detalleAbierto.poliza?.patente || "").toUpperCase() || "—"} />
                  <InfoRow label="Vehículo" value={[detalleAbierto.poliza?.marca, detalleAbierto.poliza?.modelo].filter(Boolean).join(" ") || "—"} />
                  <InfoRow label="Cobertura" value={detalleAbierto.poliza?.cobertura || "—"} />
                  <InfoRow label="Compañía" value={detalleAbierto.poliza?.compania_nombre || detalleAbierto.poliza?.compania || "—"} />
                  <InfoRow label="Cuota" value={detalleAbierto.cuota_nro || "—"} />
                  <InfoRow label="Monto" value={`$ ${fmtMoney(detalleAbierto.monto)}`} />
                  <InfoRow label="Vencimiento" value={detalleAbierto.fecha_vencimiento ? dayjs(detalleAbierto.fecha_vencimiento).format("DD/MM/YYYY") : "—"} />
                  <InfoRow label="Fecha de pago" value={detalleAbierto.fecha_pago ? dayjs(detalleAbierto.fecha_pago).format("DD/MM/YYYY") : "—"} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 🚀 FILA RESUELTA PARA EL TEMA PASTEL (POLIZA INDIVIDUAL)
const CuotaRow = memo(function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs }) {
  const {
    cuota, poliza, nombreCompleto, patente, modelo, observacion, hasObs, isObsOpen,
    state, label, dias, polizaEstado, venceTxt, pagaTxt, montoTxt, cubreDesdeTxt, cubreHastaTxt,
    isWebAdmin, abrirModalFecha
  } = model;

  const S = P[state];
  const Icon = state === "paid" ? HiBadgeCheck : HiClock;

  const isPolicyVencida = polizaEstado === "VENCIDA";
  const isPolicyCancelada = polizaEstado === "CANCELADA" || polizaEstado === "ANULADA";

  let bgClass = S.rowBg;
  let borderClass = S.rowBd;
  let textClass = S.rowTxt;

  if (isPolicyCancelada && !cuota.pagado) {
    bgClass = "bg-neutral-100 opacity-80 grayscale-[20%]";
    borderClass = "border-neutral-300";
    textClass = "text-neutral-600";
  } else if (isPolicyVencida && !cuota.pagado) {
    bgClass = "bg-orange-50 ring-2 ring-orange-400/50 shadow-orange-500/30";
    borderClass = "border-orange-300";
  }

  return (
    <div className={`mx-0 my-0 sm:rounded-2xl border p-3 sm:p-4 shadow-sm ${bgClass} ${borderClass} ${textClass} relative`}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 pl-2 sm:pl-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/50 text-neutral-600 ring-1 ring-black/5">
              <HiUser className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </span>
            <span className="truncate max-w-[40ch] sm:max-w-[60ch] font-semibold text-sm sm:text-base">
              {nombreCompleto}
            </span>
            {isPolicyCancelada && !cuota.pagado && (
              <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 text-[10px] font-black uppercase border border-rose-300 shadow-sm">💀 Deuda Baja</span>
            )}
            {isPolicyVencida && !cuota.pagado && (
              <span className="px-1.5 py-0.5 rounded bg-orange-200 text-orange-800 text-[10px] font-black uppercase border border-orange-300 shadow-sm animate-pulse">⚠️ Reactivar</span>
            )}
            <span className="text-xs text-neutral-500 bg-white/40 px-2 py-0.5 rounded border border-neutral-300">Cuota #{cuota?.cuota_nro ?? "?"}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={`inline-flex items-center gap-1 sm:gap-2 rounded-md sm:rounded-full border px-2 sm:px-3 h-6 sm:h-8 ${S.chipBg} ${S.chipTxt} ${S.chipBd} text-[10px] sm:text-xs font-medium`}>
              <Icon className="w-3 h-3 sm:w-4 sm:h-4" /> {label}
            </span>

            <span className="text-neutral-300 hidden sm:inline">•</span>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="bg-rose-50/80 rounded-md px-2 py-1 border border-rose-200 flex items-center gap-1 w-fit">
                <span className="text-[10px] uppercase tracking-wider text-rose-500 font-bold">Vence:</span>
                <span className="text-xs font-bold text-neutral-900">{venceTxt || "—"}</span>
                {isWebAdmin && !cuota.pagado && (
                  <button type="button" onClick={() => model.abrirModalFecha(cuota)} className="ml-1 text-rose-500 hover:text-rose-700 transition cursor-pointer">
                    <HiPencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="bg-indigo-50/80 rounded-md px-2 py-1 border border-indigo-200 flex items-center gap-1 w-fit">
                <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold">Cubre:</span>
                <span className="text-xs font-medium text-indigo-900">{cubreDesdeTxt} <span className="text-[10px] text-indigo-400">al</span> {cubreHastaTxt}</span>
              </div>
            </div>
            <div className="text-[11px] sm:text-sm text-neutral-500 flex flex-wrap items-center gap-x-2 w-full sm:w-auto">
              {!!pagaTxt && <span>Pagada: {pagaTxt}</span>}
              {dias !== null && !cuota?.pagado && <span>{dias < 0 ? `Atraso: ${Math.abs(dias)} días` : `Faltan: ${dias} días`}</span>}
            </div>
          </div>

          {hasObs && isObsOpen && (
            <div className="mt-2.5 rounded-xl border px-2.5 py-2 bg-neutral-100 text-neutral-700 border-neutral-300">
              <div className="flex items-start gap-1.5"><HiExclamationCircle className="w-4 h-4 mt-0.5" /> <div className="text-sm"><span className="font-semibold">Obs: </span>{observacion}</div></div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-stretch lg:items-end gap-2.5 sm:gap-3 w-full lg:w-auto mt-1 sm:mt-0">
          <p className={`text-xl sm:text-3xl font-extrabold tracking-tight text-left lg:text-right w-full ${isPolicyVencida && !cuota.pagado ? 'text-orange-500' : ''}`}>
            $ {montoTxt}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full">
            <button onClick={() => abrirDetalle(cuota)} className={`flex-1 sm:flex-none h-8 sm:h-10 px-2 sm:px-3 rounded-lg border ${P.neutralBtn} transition inline-flex items-center justify-center gap-1.5 cursor-pointer text-xs`}>
              <HiQuestionMarkCircle className="w-4 h-4" /> Info
            </button>
            {hasObs && (
              <button onClick={() => onToggleObs(cuota?.id)} className={`flex-1 sm:flex-none h-8 sm:h-10 px-2 sm:px-3 rounded-lg border bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 transition cursor-pointer text-xs`}>
                <HiExclamationCircle className="w-4 h-4" /> Nota
              </button>
            )}
            {!cuota?.pagado && (
              <button onClick={() => abrirPagar(cuota)} className={`flex-[2] sm:flex-none h-8 sm:h-10 px-3 rounded-lg ${isPolicyVencida ? 'bg-orange-500 hover:bg-orange-600 text-white' : P.actionBtn} transition inline-flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold`}>
                <HiCash className="w-4 h-4" /> {isPolicyVencida ? "Reactivar" : "Pagar"}
              </button>
            )}
            {cuota?.pagado && (
              <>
                <DescargarFactura cliente={poliza?.cliente} poliza={poliza} cuota={cuota} tone="neutral" label="Bajar" className="flex-1 h-8 sm:h-10 px-1 rounded-lg text-xs" />
                <ImprimirFacturaTicket cliente={poliza?.cliente} poliza={poliza} cuota={cuota} label="Ticket" className={`flex-1 h-8 sm:h-10 px-1 rounded-lg border transition inline-flex items-center justify-center gap-1.5 text-xs cursor-pointer ${P.ticketBtn}`} />
              </>
            )}
            <div className="flex-[2] sm:flex-none">
              <EnviarFacturaWhatsapp cuota={cuota}>
                <button className={`w-full h-8 sm:h-10 px-2 rounded-lg border ${P.neutralBtn} transition inline-flex items-center justify-center gap-1.5 cursor-pointer text-xs`}>
                  <HiDeviceMobile className="w-4 h-4" /> WPP
                </button>
              </EnviarFacturaWhatsapp>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5">
      <span className="text-neutral-500 text-xs sm:text-sm">{label}</span>
      <span className="text-neutral-900 truncate max-w-[65%] text-right font-medium text-xs sm:text-sm">
        {value}
      </span>
    </div>
  );
}