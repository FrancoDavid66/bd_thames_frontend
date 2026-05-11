/* src/components/pagos/PagosList.jsx */
import { useDispatch } from "react-redux";
import { useMemo, useState, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import axios from "axios";
import {
  HiBadgeCheck,
  HiClock,
  HiCash,
  HiDeviceMobile,
  HiExclamationCircle,
  HiUser,
  HiQuestionMarkCircle,
  HiX,
  HiPencil,
  HiChevronDown,
  HiChevronUp,
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO Y COMPONENTES
import { useAuth } from "../../context/AuthContext";
import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import DescargarFactura from "./DescargarFactura";
import ImprimirFacturaTicket from "./ImprimirFacturaTicket";
import EnviarFacturaWhatsapp from "./EnviarFacturaWhatsapp";
import ModalFormaPago from "./ModalFormaPago";
import ConfirmarPagoModal from "./ConfirmarPagoModal";
import RegistrarTraspasoModal from "./RegistrarTraspasoModal"; // <--- 🚀 NUEVO MODAL DE VENTAS

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

/* ====== PALETA SOBRIA — INDUSTRIAL/OPERATIVA ====== */
const PALETTE = {
  basePanel: "bg-slate-950 border-slate-800",
  header: "bg-slate-900 text-slate-200 border-b border-slate-800",
  divider: "divide-slate-800",
  paid: {
    stripe: "bg-emerald-600",
    cardBg: "bg-slate-900 border-slate-800",
    text: "text-slate-200",
    amountText: "text-emerald-400",
    border: "border-slate-800",
    chipBg: "bg-emerald-900/60",
    chipText: "text-emerald-300",
    chipBorder: "border-emerald-800",
    noteBg: "bg-slate-800",
    noteText: "text-slate-300",
    btn: "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600",
  },
  pending: {
    stripe: "bg-slate-700",
    cardBg: "bg-slate-900/60 border-slate-800",
    text: "text-slate-400",
    amountText: "text-slate-300",
    border: "border-slate-800",
    chipBg: "bg-slate-800",
    chipText: "text-slate-400",
    chipBorder: "border-slate-700",
    noteBg: "bg-slate-800",
    noteText: "text-slate-400",
    btn: "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600",
  },
  overdue: {
    stripe: "bg-rose-700",
    cardBg: "bg-slate-900 border-rose-900/60",
    text: "text-slate-200",
    amountText: "text-rose-400",
    border: "border-rose-900/60",
    chipBg: "bg-rose-900/50",
    chipText: "text-rose-300",
    chipBorder: "border-rose-800",
    noteBg: "bg-slate-800",
    noteText: "text-slate-300",
    btn: "bg-rose-800 hover:bg-rose-700 text-rose-100 border-rose-700",
  },
  neutralBtn: "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700",
  actionBtn: "bg-slate-700 hover:bg-slate-600 text-white border-slate-600",
  ticketBtn: "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700",
};

const MONEY_FMT = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoney = (n) => MONEY_FMT.format(Number(n || 0));
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

const AUTO_FAST_THRESHOLD = 120;
const FAST_INITIAL = 40;
const FAST_STEP = 60;
const SHOW_FAST_TOGGLE_FROM = 60;

function todayKey() { return dayjs().format("YYYY-MM-DD"); }
function msUntilNextDay() {
  const now = dayjs();
  const next = now.add(1, "day").startOf("day").add(2, "second");
  return Math.max(5_000, Math.min(next.diff(now, "millisecond"), 24 * 60 * 60 * 1000));
}

function pickCuotaActualizada(resp) {
  const r = resp && typeof resp === "object" ? resp : null;
  if (!r) return null;
  if (r.cuotaActualizada && typeof r.cuotaActualizada === "object") return r.cuotaActualizada;
  if (r.data && typeof r.data === "object") return r.data;
  return r;
}

function safeStr(v) { return v === null || v === undefined ? "" : String(v).trim(); }
function isBadClienteLabel(s) { const x = safeStr(s).toLowerCase(); return !x || x === "cliente" || x === "client" || x === "asegurado"; }

function extractRawOficina(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  return String(pol?.oficina_nombre ?? pol?.oficinaName ?? pol?.oficina_id ?? pol?.oficinaId ?? pol?.oficina ?? it?.oficina_nombre ?? it?.oficina_id ?? it?.oficinaId ?? it?.oficina ?? "").trim();
}

function getOficinaName(raw) {
  const s = String(raw).toUpperCase();
  if (!s) return "";
  if (s === "1" || s.includes("ESQUINA")) return "5 Esquinas";
  if (s === "2" || s.includes("AXION")) return "Axion";
  if (s === "3" || s.includes("39")) return "Km 39";
  return String(raw);
}

function resolveCliente(pol, cuota) {
  const p = pol && typeof pol === "object" ? pol : {};
  const c = p?.cliente;
  const isObjCliente = c && typeof c === "object" && !Array.isArray(c);

  const apellido = safeStr(isObjCliente ? c.apellido : "") || safeStr(p.cliente_apellido) || safeStr(cuota?.cliente_apellido);
  const nombre = safeStr(isObjCliente ? c.nombre : "") || safeStr(p.cliente_nombre) || safeStr(cuota?.cliente_nombre);
  const nombreCompletoFlat = safeStr(p.cliente_nombre_completo) || safeStr(p.cliente_nombre_apellido) || safeStr(cuota?.cliente_nombre_completo) || safeStr(cuota?.cliente_nombre_apellido);
  const asegurado = safeStr(p.asegurado_nombre) || safeStr(p.asegurado) || safeStr(cuota?.asegurado);
  const dni = safeStr(isObjCliente ? c.dni_cuit_cuil : "") || safeStr(p.cliente_dni) || safeStr(cuota?.cliente_dni) || safeStr(p.dni_cuit_cuil) || safeStr(cuota?.dni_cuit_cuil);
  const id = (isObjCliente && (typeof c.id === "number" || typeof c.id === "string") ? c.id : null) ?? p.cliente_id ?? cuota?.cliente_id ?? null;

  const byObj = [safeStr(isObjCliente ? c.apellido : ""), safeStr(isObjCliente ? c.nombre : "")].filter(Boolean).join(", ").trim();
  const byParts = [apellido, nombre].filter(Boolean).join(", ").trim();
  const nombreCompleto = byObj || byParts || nombreCompletoFlat || safeStr(asegurado) || (typeof c === "string" && !isBadClienteLabel(c) ? safeStr(c) : "") || "Cliente";

  const nombreAp = (() => {
    if (nombreCompleto.includes(",")) {
      const [ap, nom] = nombreCompleto.split(",").map((x) => x.trim());
      return [nom, ap].filter(Boolean).join(" ").trim();
    }
    return nombreCompleto;
  })();
  return { nombreCompleto, nombreAp, dni, id };
}

function getPolizaId(pol, cuota) {
  const p = pol && typeof pol === "object" ? pol : {};
  const pid = p?.id ?? p?.poliza_id ?? cuota?.poliza_id ?? cuota?.polizaId ?? null;
  const n = Number(pid);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toYmd(d) { const s = String(d || "").trim(); return s ? (s.length >= 10 ? s.slice(0, 10) : s) : ""; }

function buildPolizaCuotasIndex(list) {
  const map = new Map();
  for (const c of (Array.isArray(list) ? list : [])) {
    const pid = getPolizaId(c?.poliza, c);
    if (!pid) continue;
    const arr = map.get(pid) || [];
    arr.push(c);
    map.set(pid, arr);
  }
  for (const [pid, arr] of map.entries()) {
    arr.sort((a, b) => {
      const an = Number(a?.cuota_nro), bn = Number(b?.cuota_nro);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      const af = toYmd(a?.fecha_vencimiento), bf = toYmd(b?.fecha_vencimiento);
      if (af && bf && af !== bf) return af.localeCompare(bf);
      return Number(a?.id || 0) - Number(b?.id || 0);
    });
  }
  return map;
}

function pickNextVencimientoFromIndex(cuota, polizaId, indexMap) {
  if (!cuota || !polizaId || !indexMap) return null;
  const arr = indexMap.get(polizaId);
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const curN = Number(cuota?.cuota_nro);
  if (Number.isFinite(curN)) {
    let best = null, bestN = Infinity;
    for (const c of arr) {
      const n = Number(c?.cuota_nro);
      if (Number.isFinite(n) && n > curN && n < bestN) { bestN = n; best = c; }
    }
    if (best?.fecha_vencimiento) return toYmd(best.fecha_vencimiento);
  }

  const curF = toYmd(cuota?.fecha_vencimiento);
  if (curF) {
    let best = null, bestF = "";
    for (const c of arr) {
      const f = toYmd(c?.fecha_vencimiento);
      if (f && f > curF && (!bestF || f < bestF)) { bestF = f; best = c; }
    }
    if (best?.fecha_vencimiento) return toYmd(best.fecha_vencimiento);
  }
  return null;
}

export default function PagosList({
  cuotas = [],
  actualizarCuotas,
  ocultarPagadas = false,
  cuentasMercadoPago = [],
  billeterasVirtuales = [],
  mediosCobro = [],
  preferFast = false,
}) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [obsAbiertaId, setObsAbiertaId] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(null);

  const [confirmData, setConfirmData] = useState(null);
  const [confirmandoPago, setConfirmandoPago] = useState(false);

  const [modalFechaOpen, setModalFechaOpen] = useState(false);
  const [cuotaFechaSeleccionada, setCuotaFechaSeleccionada] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [ajustarSiguientes, setAjustarSiguientes] = useState(true);
  const [isSubmittingFecha, setIsSubmittingFecha] = useState(false);

  // 🚀 ESTADOS PARA EL MODAL DE TRASPASO/VENTAS
  const [traspasoModalOpen, setTraspasoModalOpen] = useState(false);
  const [clienteTraspaso, setClienteTraspaso] = useState(null);

  const items = useMemo(() => {
    return (Array.isArray(cuotas) ? cuotas : []).filter((c) => !ocultarPagadas || !c.pagado);
  }, [cuotas, ocultarPagadas]);

  const polizaIndex = useMemo(() => buildPolizaCuotasIndex(items), [items]);

  const [hoyKey, setHoyKey] = useState(todayKey());
  useEffect(() => {
    let t = setTimeout(function tick() {
      setHoyKey(todayKey());
      t = setTimeout(tick, msUntilNextDay());
    }, msUntilNextDay());
    return () => clearTimeout(t);
  }, []);

  const hoy = useMemo(() => dayjs(hoyKey).startOf("day"), [hoyKey]);

  const [modoRapidoManual, setModoRapidoManual] = useState(null);
  const modoRapidoAuto = !!preferFast || items.length >= AUTO_FAST_THRESHOLD;
  const modoRapido = modoRapidoManual ?? modoRapidoAuto;

  const [renderLimit, setRenderLimit] = useState(modoRapido ? Math.min(FAST_INITIAL, items.length) : items.length);
  useEffect(() => setRenderLimit(modoRapido ? Math.min(FAST_INITIAL, items.length) : items.length), [items.length, modoRapido]);

  const visibleItems = useMemo(() => modoRapido ? items.slice(0, renderLimit) : items, [items, modoRapido, renderLimit]);
  const showFastControls = items.length >= SHOW_FAST_TOGGLE_FROM;

  const abrirPagar = useCallback((cuota) => setCuotaSeleccionada(cuota), []);
  const cerrarPagar = useCallback(() => setCuotaSeleccionada(null), []);
  const abrirDetalle = useCallback((cuota) => setDetalleAbierto(cuota), []);
  const cerrarDetalle = useCallback(() => setDetalleAbierto(null), []);
  const toggleObs = useCallback((id) => setObsAbiertaId((prev) => (prev === id ? null : id)), []);

  const abrirModalFecha = useCallback((cuota) => {
    setCuotaFechaSeleccionada(cuota);
    setNuevaFecha(toYmd(cuota.fecha_vencimiento) || dayjs().format('YYYY-MM-DD'));
    setAjustarSiguientes(true);
    setModalFechaOpen(true);
  }, []);
  const cerrarModalFecha = useCallback(() => { setModalFechaOpen(false); setCuotaFechaSeleccionada(null); }, []);

  const handleCambiarFecha = useCallback(async () => {
    if (!cuotaFechaSeleccionada || !nuevaFecha) return;
    setIsSubmittingFecha(true);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
      const res = await axios.patch(
        `${BASE_URL.replace(/\/+$/, '')}/cuotas/${cuotaFechaSeleccionada.id}/cambiar-fecha/`, 
        { nueva_fecha: nuevaFecha, ajustar_siguientes: ajustarSiguientes }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const pid = getPolizaId(cuotaFechaSeleccionada.poliza, cuotaFechaSeleccionada);
      const updatedList = [{ id: cuotaFechaSeleccionada.id, fecha_vencimiento: nuevaFecha }];

      if (ajustarSiguientes) {
        let currentBaseDate = dayjs(nuevaFecha);
        items.filter((c) => getPolizaId(c?.poliza, c) === pid && Number(c.cuota_nro) > Number(cuotaFechaSeleccionada.cuota_nro))
             .sort((a, b) => Number(a.cuota_nro) - Number(b.cuota_nro))
             .forEach((c) => {
                currentBaseDate = currentBaseDate.add(1, "month");
                updatedList.push({ id: c.id, fecha_vencimiento: currentBaseDate.format("YYYY-MM-DD") });
             });
      }

      actualizarCuotas?.(updatedList);
      toast.success(`¡Listo! Se actualizaron ${res.data?.cuotas_modificadas || 1} cuotas.`);
      setModalFechaOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.nueva_fecha || error.response?.data?.detail || "Error al cambiar la fecha");
    } finally {
      setIsSubmittingFecha(false);
    }
  }, [cuotaFechaSeleccionada, nuevaFecha, ajustarSiguientes, items, actualizarCuotas]);

  const confirmarPago = useCallback((datos) => {
    if (!cuotaSeleccionada) return;
    const cuota = cuotaSeleccionada;
    const pol = cuota.poliza || {};
    const fv = cuota.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
    const hoyDate = dayjs().startOf("day");

    // 💡 Extraemos datos del cliente para pasárselos al Traspaso Modal si el usuario lo cliclea
    const cli = resolveCliente(pol, cuota);

    setConfirmData({
      datos,
      cuota,
      monto: Number(datos.monto ?? cuota.monto),
      numeroPoliza: pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-",
      cuotaNro: cuota.cuota_nro,
      polizaEstado: String(pol.estado || "").toUpperCase(),
      polizaCobertura: String(pol.cobertura || ""), 
      polizaCompania: String(pol.compania_nombre || pol.compania?.nombre || pol.compania || ""), // 🚀 Compañía inyectada
      oficinaLabel: getOficinaName(extractRawOficina(cuota)),
      diasAtraso: fv && fv.isBefore(hoyDate) ? hoyDate.diff(fv, "day") : 0,
      clienteNombre: cli?.nombreCompleto || "Asegurado", // 🚀 Nombre para el modal
    });
    cerrarPagar();
  }, [cuotaSeleccionada, cerrarPagar]);

  const ejecutarPagoConfirmado = useCallback(async () => {
    if (!confirmData || confirmandoPago) return;
    const { datos, cuota, monto, polizaEstado } = confirmData;
    const cuotasMismaPoliza = items.filter(c => getPolizaId(c.poliza, c) === getPolizaId(cuota.poliza, cuota));
    const remainingOverdue = Math.max(0, cuotasMismaPoliza.filter(c => !c.pagado && dayjs(c.fecha_vencimiento).isBefore(dayjs().startOf("day"))).length - 1);

    const payload = { id: cuota.id, metodo: datos.metodo, forma_pago: datos.forma_pago, monto, fecha_pago: datos.fecha_pago, observaciones: datos.observaciones };
    if (datos.medio_cobro_id) payload.medio_cobro_id = datos.medio_cobro_id;
    if (datos.destino_tipo) payload.destino_tipo = datos.destino_tipo;
    if (datos.destino_cuenta) payload.destino_cuenta = datos.destino_cuenta;

    try {
      setConfirmandoPago(true);
      const resp = await dispatch(marcarCuotaComoPagada(payload)).unwrap();
      const cuotaActualizada = pickCuotaActualizada(resp);
      if (!cuotaActualizada) return toast.error("Pago registrado, pero no actualizó pantalla.");

      if (polizaEstado === "CANCELADA" || polizaEstado === "ANULADA") {
        toast.success("Deuda cobrada exitosamente (Póliza CANCELADA).", { icon: "💀", duration: 5000 });
      } else if (polizaEstado === "VENCIDA") {
        toast.success(remainingOverdue === 0 ? "Pago registrado. ¡Póliza ACTIVA! 🟢" : `Aún debe ${remainingOverdue} cuotas (Sigue VENCIDA). 🔴`, { duration: 6000 });
      } else toast.success("Cuota marcada como pagada");

      const conObs = {
        ...cuotaActualizada,
        poliza: cuotaActualizada.poliza || cuota.poliza,
        observaciones_pago: (datos.observaciones || "").trim(),
        pago_registrado_en: cuotaActualizada.pago_registrado_en || dayjs().toISOString(),
      };
      setConfirmData(null);
      actualizarCuotas?.([conObs]);
      if (conObs.observaciones_pago) setObsAbiertaId(conObs.id);
    } catch {
      toast.error("No se pudo registrar el pago");
    } finally {
      setConfirmandoPago(false);
    }
  }, [confirmData, confirmandoPago, dispatch, actualizarCuotas, items]);

  const handleCancelarConfirm = useCallback(() => {
    const { cuota } = confirmData || {};
    setConfirmData(null);
    if (cuota) setCuotaSeleccionada(cuota);
  }, [confirmData]);

  // 🚀 FUNCIÓN PARA ABRIR EL MODAL DE VENTAS DESDE CONFIRMAR PAGO
  const handleOpenTraspaso = useCallback((data) => {
    setConfirmData(null); // Cerramos el modal de pago
    setClienteTraspaso({ nombre: data.clienteNombre }); // Guardamos el cliente
    setTraspasoModalOpen(true); // Abrimos el modal de ventas
  }, []);

  const datosNoti = useMemo(() => {
    if (!cuotaSeleccionada) return null;
    const pol = cuotaSeleccionada.poliza || {};
    const cliR = resolveCliente(pol, cuotaSeleccionada);
    const total = cuotaSeleccionada?.cantidad_cuotas ?? (Array.isArray(pol.cuotas) ? pol.cuotas.length : null);
    return {
      nombreAp: cliR?.nombreAp || "", dni: cliR?.dni || "",
      compania: (pol.compania_nombre || pol.compania?.nombre || pol.compania || "").toString().trim(),
      cobertura: (pol.cobertura || "").toString().trim(),
      cuotaTxt: typeof cuotaSeleccionada.cuota_nro === "number" ? (total ? `Cuota ${cuotaSeleccionada.cuota_nro}/${total}` : `Cuota ${cuotaSeleccionada.cuota_nro}`) : "",
    };
  }, [cuotaSeleccionada]);

  // Helpers de cobertura — misma lógica que PolizaCuotasCard y CuotasPanel
  const sumarDiasHabiles = useCallback((fecha, dias) => {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    let added = 0;
    while (added < dias) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return dayjs(d).startOf("day");
  }, []);

  const rowModels = useMemo(() => {
    return visibleItems.map((cuota, idx) => {
      const pol = cuota?.poliza || {};
      const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
      const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
      const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;
      const dias = fv ? fv.diff(hoy, "day") : null;
      const state = cuota?.pagado ? "paid" : dias !== null && dias < 0 ? "overdue" : "pending";
      const proximoVtoYmd = pickNextVencimientoFromIndex(cuota, getPolizaId(pol, cuota), polizaIndex);

      // Cobertura
      const pagoAtrasado = cuota?.pagado && fp && fv ? fp.isAfter(fv) : false;
      const cuotaAnterior  = idx > 0 ? visibleItems[idx - 1] : null;
      const cuotaSiguiente = idx < visibleItems.length - 1 ? visibleItems[idx + 1] : null;
      const fvAnterior  = cuotaAnterior?.fecha_vencimiento  ? dayjs(cuotaAnterior.fecha_vencimiento).startOf("day")  : null;
      const fvSiguiente = cuotaSiguiente?.fecha_vencimiento ? dayjs(cuotaSiguiente.fecha_vencimiento).startOf("day") : null;

      let cubreDesde = null, cubreHasta = null, sinCobertura = false;
      if (!cuota?.pagado) {
        sinCobertura = true;
        cubreDesde = fv;
      } else if (pagoAtrasado) {
        cubreDesde = fp ? sumarDiasHabiles(fechaPago, 2) : null;
        cubreHasta = fvSiguiente || (fv ? fv.add(1, "month") : null);
      } else {
        cubreDesde = idx === 0
          ? (pol?.fecha_emision ? dayjs(pol.fecha_emision).startOf("day") : fv)
          : (fvAnterior ? fvAnterior.add(1, "day") : null);
        cubreHasta = fv;
      }

      const fmt = (d) => (d && d.isValid && d.isValid()) ? d.format("DD/MM/YYYY") : "—";
      const cubreDesdeTxt = sinCobertura ? fmt(cubreDesde) : fmt(cubreDesde);
      const cubreHastaTxt = sinCobertura ? "" : fmt(cubreHasta);

      return {
        cuota,
        cuotaPdf: { ...cuota, proximo_vencimiento: proximoVtoYmd || cuota?.proximo_vencimiento || null },
        pol,
        nombreCompleto: resolveCliente(pol, cuota)?.nombreCompleto || "Cliente",
        patente: (pol?.patente || "").toUpperCase(),
        modelo: [pol?.marca, pol?.modelo].filter(Boolean).join(" "),
        observacion: ((cuota?.observaciones_pago || cuota?.ultima_observacion_pago || "") || "").toString().trim(),
        hasObs: !!(cuota?.observaciones_pago || cuota?.ultima_observacion_pago),
        isObsOpen: obsAbiertaId === cuota?.id,
        state,
        label: state === "paid" ? "Pagada" : state === "overdue" ? "Vencida" : "Pendiente",
        dias,
        polizaEstado: String(pol?.estado || "").toUpperCase(),
        venceTxt: fmtDate(cuota?.fecha_vencimiento),
        pagaTxt: fp ? fmt(fp) : null,
        montoTxt: fmtMoney(cuota?.monto),
        cubreDesdeTxt,
        cubreHastaTxt,
        sinCobertura,
        pagoAtrasado,
        altaTxt: pol?.fecha_emision ? fmtDate(pol.fecha_emision) : null,
        oficinaLabel: getOficinaName(extractRawOficina(cuota)),
        isWebAdmin,
        abrirModalFecha,
      };
    });
  }, [visibleItems, hoy, obsAbiertaId, polizaIndex, isWebAdmin, abrirModalFecha, sumarDiasHabiles]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 sm:p-10 text-center text-sm sm:text-base text-slate-400">
        No hay cuotas para mostrar en este filtro.
      </div>
    );
  }

  return (
    <div className={`w-full ${PALETTE.basePanel} rounded-none sm:rounded-3xl border-t border-b sm:border overflow-hidden flex flex-col`}>
      <div className={`px-3 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-sm uppercase tracking-wide ${PALETTE.header}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-200">Resultados ({items.length})</span>
          {showFastControls && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] normal-case text-slate-400">{items.length} cuotas</span>
              <button
                type="button"
                onClick={() => setModoRapidoManual((v) => !(v ?? modoRapido))}
                className={`h-7 sm:h-8 px-2 sm:px-3 rounded-lg sm:rounded-xl border text-[10px] sm:text-[11px] transition cursor-pointer font-bold ${modoRapido ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300" : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                {modoRapido ? "Rápido: ON ⚡" : "Rápido: OFF"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto overscroll-contain pb-6 custom-scrollbar bg-slate-950">
        <ul role="list" className={`divide-y sm:divide-y-0 ${PALETTE.divider}`}>
          {rowModels.map((m, idx) => {
            const Comp = modoRapido ? "li" : motion.li;
            const motionProps = modoRapido ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, ease: "easeOut", delay: Math.min(0.25, idx * 0.012) } };
            return (
              <Comp key={m?.cuota?.id} className="relative" {...motionProps}>
                <CuotaRow model={m} abrirDetalle={abrirDetalle} abrirPagar={abrirPagar} onToggleObs={toggleObs} abrirModalFecha={abrirModalFecha} />
              </Comp>
            );
          })}
        </ul>
        {modoRapido && renderLimit < items.length && (
          <div className="p-3 sm:p-4 border-t sm:border-t-0 border-slate-800 bg-slate-900">
            <button type="button" onClick={() => setRenderLimit((n) => Math.min(items.length, n + FAST_STEP))} className="w-full h-10 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm">
              Mostrar más ({Math.min(FAST_STEP, items.length - renderLimit)})
            </button>
          </div>
        )}
      </div>

      <ModalFormaPago
        isOpen={!!cuotaSeleccionada} onClose={cerrarPagar} onConfirm={confirmarPago} defaultMonto={cuotaSeleccionada?.monto}
        title={`Confirmar pago — Cuota #${cuotaSeleccionada?.cuota_nro ?? "?"}`}
        cuentasMercadoPago={cuentasMercadoPago} billeterasVirtuales={billeterasVirtuales} mediosCobro={mediosCobro}
        clienteNombreApellido={datosNoti?.nombreAp || ""} clienteDni={datosNoti?.dni || ""} polizaCompania={datosNoti?.compania || ""} polizaCobertura={datosNoti?.cobertura || ""} pagoCuota={datosNoti?.cuotaTxt || ""}
      />

      <ConfirmarPagoModal 
        isOpen={!!confirmData}
        confirmData={confirmData}
        confirmandoPago={confirmandoPago}
        onClose={handleCancelarConfirm}
        onConfirm={ejecutarPagoConfirmado}
        isWebAdmin={isWebAdmin}
        onOpenTraspaso={handleOpenTraspaso} // 🚀 PASAMOS LA FUNCIÓN
      />

      {/* 🚀 MODAL DE TRASPASO/VENTAS */}
      <RegistrarTraspasoModal 
        isOpen={traspasoModalOpen}
        onClose={() => setTraspasoModalOpen(false)}
        clienteData={clienteTraspaso}
      />

      {/* MODAL DE CAMBIAR FECHA */}
      <AnimatePresence>
        {modalFechaOpen && cuotaFechaSeleccionada && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-3"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isSubmittingFecha ? undefined : cerrarModalFecha} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[71] w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 px-5 py-5 sm:px-6 sm:py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Cambiar Vencimiento</h3>
                <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-8 w-8 rounded-lg border flex items-center justify-center text-slate-300 bg-slate-700 hover:bg-slate-600 border-slate-600 cursor-pointer"><HiX className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-slate-300">Cuota <span className="font-bold text-emerald-400">#{cuotaFechaSeleccionada.cuota_nro}</span></p>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Nueva fecha</label>
                  <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-600 text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                  <input type="checkbox" checked={ajustarSiguientes} onChange={(e) => setAjustarSiguientes(e.target.checked)} className="mt-1 accent-indigo-500 w-4 h-4" />
                  <span className="text-sm text-indigo-200">Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).</span>
                </label>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-10 px-4 rounded-xl border border-slate-600 bg-slate-700 text-sm text-white hover:bg-slate-600 cursor-pointer font-medium">Cancelar</button>
                  <button onClick={handleCambiarFecha} disabled={isSubmittingFecha || !nuevaFecha} className="h-10 px-4 rounded-xl border border-transparent bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-400 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/30">{isSubmittingFecha ? "Guardando..." : "Guardar cambios"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detalleAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-3"
          >
            <div onClick={cerrarDetalle} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[61] w-full max-w-[680px] max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 p-4 sm:p-5 shadow-2xl custom-scrollbar"
            >
              <div className="flex items-start justify-between gap-3 sticky top-0 bg-slate-800 pb-3 z-10 border-b border-slate-700 mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white">Detalle de cuota</h3>
                <button onClick={cerrarDetalle} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer">
                  <HiX className="w-4 h-4 sm:w-5 sm:h-5" /><span className="hidden sm:inline ml-1 text-sm font-medium">Cerrar</span>
                </button>
              </div>
              {(() => {
                const c = detalleAbierto;
                const pol = c?.poliza || {};
                const cliR = resolveCliente(pol, c);
                const total = c?.cantidad_cuotas ?? (Array.isArray(pol?.cuotas) ? pol.cuotas.length : null);

                return (
                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoRow label="Cliente" value={cliR?.nombreCompleto || "Cliente"} />
                      <InfoRow label="Cliente ID" value={cliR?.id != null ? `#${cliR.id}` : "—"} />
                      <InfoRow label="DNI/CUIT" value={cliR?.dni || "—"} />
                      <InfoRow label="Patente" value={(pol?.patente || "").toUpperCase() || "—"} />
                      <InfoRow label="Vehículo" value={[pol?.marca, pol?.modelo].filter(Boolean).join(" ") || "—"} />
                      <InfoRow label="Cobertura" value={pol?.cobertura || "—"} />
                      <InfoRow label="Compañía" value={pol?.compania_nombre || pol?.compania?.nombre || pol?.compania || "—"} />
                      <InfoRow label="Fecha de Alta" value={fmtDate(pol?.fecha_emision)} />
                      <InfoRow label="Cuota" value={typeof c?.cuota_nro === "number" ? (total ? `${c.cuota_nro}/${total}` : `${c.cuota_nro}`) : "—"} />
                      <InfoRow label="Monto" value={`$ ${fmtMoney(c?.monto)}`} />
                      <InfoRow label="Vencimiento" value={fmtDate(c?.fecha_vencimiento)} />
                      <InfoRow label="Fecha de pago" value={fmtDate(c?.fecha_pago)} />
                      <InfoRow label="Estado" value={c?.pagado ? "Pagada" : c?.fecha_vencimiento && dayjs(c.fecha_vencimiento).isBefore(dayjs(), "day") ? "Vencida" : "Pendiente"} />
                    </div>
                    {(c?.observaciones_pago || c?.ultima_observacion_pago) && (
                      <div className="rounded-xl border border-rose-500/50 bg-rose-900/40 p-3 sm:p-4 text-rose-100 mt-4 shadow-inner">
                        <div className="flex items-start gap-2">
                          <HiExclamationCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 text-rose-400" />
                          <div className="whitespace-pre-wrap break-words text-xs sm:text-sm">
                            <span className="font-bold text-rose-300">Observación: </span>
                            {(c?.observaciones_pago || c?.ultima_observacion_pago || "").toString().trim()}
                          </div>
                        </div>
                      </div>
                    )}
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

const CuotaRow = memo(
  function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs, abrirModalFecha }) {
    const [expanded, setExpanded] = useState(false);
    const { cuota, cuotaPdf, nombreCompleto, patente, modelo, observacion, hasObs, isObsOpen, state, label, dias, polizaEstado, venceTxt, pagaTxt, montoTxt, cubreDesdeTxt, cubreHastaTxt, sinCobertura, pagoAtrasado, altaTxt, oficinaLabel, isWebAdmin } = model || {};
    const S = PALETTE[state || "pending"];

    const isPolicyVencida = polizaEstado === "VENCIDA";
    const isPolicyCancelada = polizaEstado === "CANCELADA" || polizaEstado === "ANULADA";

    let extraClasses = "";
    if (isPolicyCancelada && !cuota.pagado) extraClasses = "opacity-60";
    else if (isPolicyVencida && !cuota.pagado) extraClasses = "border-rose-900/50";

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-0.5 ${S.stripe}`} aria-hidden />
        <div className={`mx-0 sm:mx-2 my-0 sm:my-1 sm:rounded-lg border p-3 sm:p-4 ${S.cardBg} ${S.border} ${extraClasses} relative`}>
          <div className="pl-2 sm:pl-0 flex flex-col gap-3">
            {/* Header fila */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`truncate max-w-[200px] sm:max-w-md font-medium text-sm ${state === "overdue" ? "text-rose-200" : "text-slate-200"}`}>
                    {nombreCompleto}
                  </span>
                  {isWebAdmin && oficinaLabel && (
                    <span className="text-[10px] font-mono text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">
                      {oficinaLabel}
                    </span>
                  )}
                  {isPolicyCancelada && !cuota.pagado && (
                    <span className="text-[10px] font-mono text-rose-400 border border-rose-800 rounded px-1.5 py-0.5">BAJA</span>
                  )}
                  {isPolicyVencida && !cuota.pagado && (
                    <span className="text-[10px] font-mono text-amber-400 border border-amber-800 rounded px-1.5 py-0.5">REACTIVAR</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 font-mono">
                  <span>#{cuota?.cuota_nro ?? "?"}</span>
                  {patente && <><span>·</span><span>{patente}</span></>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-lg sm:text-xl font-mono font-semibold ${isPolicyVencida && !cuota.pagado ? "text-amber-400" : S.amountText}`}>
                  $ {montoTxt}
                </span>
                <div className={`mt-1 text-[10px] font-mono uppercase tracking-wider ${S.chipText}`}>{label}</div>
              </div>
            </div>

            {/* Fechas */}
            <div className="flex flex-col sm:flex-row gap-1.5">
              <div className="flex-1 flex items-center justify-between rounded-md px-3 py-2 bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Vence</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-medium ${state === "overdue" ? "text-rose-400" : "text-slate-200"}`}>{venceTxt || "—"}</span>
                  {!cuota?.pagado && (
                    <button type="button" onClick={() => abrirModalFecha(cuota)} className="text-slate-600 hover:text-slate-300 transition-colors p-1">
                      <HiPencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-between rounded-md px-3 py-2 bg-slate-800/50 border border-slate-700/50">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                  {sinCobertura ? "Sin cobertura" : "Cubre"}
                </span>
                <span className={`text-xs font-mono ${sinCobertura ? "text-rose-400" : pagoAtrasado ? "text-amber-300" : "text-slate-300"}`}>
                  {sinCobertura ? `desde ${cubreDesdeTxt}` : `${cubreDesdeTxt}${cubreHastaTxt ? ` → ${cubreHastaTxt}` : ""}`}
                </span>
              </div>
            </div>

            {/* Acción principal */}
            <div className="flex items-center gap-2 w-full">
              {!cuota?.pagado ? (
                <button
                  onClick={() => abrirPagar(cuota)}
                  className={`w-full h-10 px-4 rounded-lg border transition-colors inline-flex items-center justify-center gap-2 font-medium text-sm ${
                    isPolicyVencida
                      ? "bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 border-amber-800"
                      : "bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 border-emerald-800"
                  }`}
                >
                  <HiCash className="w-4 h-4" />
                  {isPolicyVencida ? "Pagar y reactivar" : "Registrar pago"}
                </button>
              ) : (
                <div className="flex gap-1.5 w-full">
                  <div className="flex-1">
                    <DescargarFactura cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} label="PDF" tone="neutral"
                      className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5" />
                  </div>
                  <div className="flex-1">
                    <ImprimirFacturaTicket cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} label="Ticket"
                      className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5" />
                  </div>
                  <div className="flex-1">
                    <EnviarFacturaWhatsapp cuota={cuota}>
                      <button className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5">
                        <HiDeviceMobile className="w-4 h-4" /><span className="hidden sm:inline">WhatsApp</span><span className="sm:hidden">WPP</span>
                      </button>
                    </EnviarFacturaWhatsapp>
                  </div>
                </div>
              )}
            </div>

            {/* Expandible */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              {expanded ? <><HiChevronUp className="w-3.5 h-3.5" /> Ocultar</> : <><HiChevronDown className="w-3.5 h-3.5" /> Ver detalles</>}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {modelo && <div className="flex justify-between px-2 py-1.5 rounded bg-slate-800/50"><span className="text-slate-500">Vehículo</span><span className="text-slate-300 font-mono">{modelo}</span></div>}
                    {altaTxt && <div className="flex justify-between px-2 py-1.5 rounded bg-slate-800/50"><span className="text-slate-500">Alta póliza</span><span className="text-slate-300 font-mono">{altaTxt}</span></div>}
                    {!!pagaTxt && <div className="flex justify-between px-2 py-1.5 rounded bg-slate-800/50"><span className="text-slate-500">Pagada el</span><span className="text-emerald-400 font-mono">{pagaTxt}</span></div>}
                    {dias !== null && !cuota?.pagado && <div className="flex justify-between px-2 py-1.5 rounded bg-slate-800/50"><span className="text-slate-500">Estado</span><span className={`font-mono ${dias < 0 ? "text-rose-400" : "text-slate-300"}`}>{dias < 0 ? `Atraso ${Math.abs(dias)}d` : `Faltan ${dias}d`}</span></div>}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => abrirDetalle(cuota)} className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors inline-flex items-center gap-1.5">
                      <HiQuestionMarkCircle className="w-3.5 h-3.5" /> Info
                    </button>
                    {hasObs && (
                      <button onClick={() => onToggleObs(cuota?.id)} className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors inline-flex items-center gap-1.5">
                        <HiExclamationCircle className="w-3.5 h-3.5" /> Nota
                      </button>
                    )}
                  </div>
                  {hasObs && isObsOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <HiExclamationCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                        <span className="whitespace-pre-wrap">{observacion}</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </>
    );
  },
  (prev, next) => {
    const a = prev?.model, b = next?.model;
    if (a === b) return true;
    if (a?.isObsOpen !== b?.isObsOpen) return false;
    const ca = a?.cuota, cb = b?.cuota;
    if (ca?.id !== cb?.id || ca?.pagado !== cb?.pagado || ca?.monto !== cb?.monto || ca?.fecha_vencimiento !== cb?.fecha_vencimiento || ca?.fecha_pago !== cb?.fecha_pago || ca?.observaciones_pago !== cb?.observaciones_pago || ca?.ultima_observacion_pago !== cb?.ultima_observacion_pago || a?.nombreCompleto !== b?.nombreCompleto || a?.patente !== b?.patente || a?.modelo !== b?.modelo) return false;
    return true;
  }
);

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1.5">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-slate-200 truncate max-w-[60%] text-right text-xs font-mono">{value}</span>
    </div>
  );
}