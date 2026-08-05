/* src/components/pagos/PagosList.jsx — diseño Duo (claro/oscuro) */
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
  HiExclamationCircle,
  HiUser,
  HiQuestionMarkCircle,
  HiX,
  HiPencil,
  HiChevronDown,
  HiChevronUp,
  HiCalendar,
  HiShieldCheck,
  HiShieldExclamation,
  HiExclamation,
  HiCheck,
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO Y COMPONENTES
import { useAuth } from "../../context/AuthContext";
import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
// 🧾 Comprobante unificado (PDF A4 + ticket térmico) — reemplaza a los 3 viejos.
import { BotonDescargarPDF, BotonImprimirTicket } from "./Comprobante";
// 🧾 Modales de cobro unificados (Forma de pago + Confirmar + Traspaso)
import ModalFormaPago, { ConfirmarPagoModal, RegistrarTraspasoModal } from "./ModalesCobro";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

/* ====== PALETA DUO — por estado de cuota ======
   Cada estado mapea a clases con tokens Duo (claro/oscuro). */
const PALETTE = {
  paid: {
    stripe: "bg-duo-verde",
    cardBg: "bg-card dark:bg-card-dark",
    border: "border-linea dark:border-linea-dark",
    amountText: "text-duo-verde",
    chip: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
  },
  pending: {
    stripe: "bg-duo-azul",
    cardBg: "bg-card dark:bg-card-dark",
    border: "border-linea dark:border-linea-dark",
    amountText: "text-titulo dark:text-titulo-dark",
    chip: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark",
  },
  overdue: {
    stripe: "bg-duo-rojo",
    cardBg: "bg-card dark:bg-card-dark",
    border: "border-duo-rojo/50",
    amountText: "text-duo-rojo",
    chip: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo",
  },
};

// 🎯 Lógica unificada de cuotas (única fuente de verdad para fechas/estados)
import {
  sumarDiasHabiles as utilSumarDiasHabiles,
  getEstadoCuota,
  fechaLimitePago,
  getBadgeClasses,
  getBadgeLabel,
  calcCobertura,
  resumenCuotas,
  fmtFecha,
  ESTADO_CUOTA,
} from "../../utils/cuotas";

const MONEY_FMT = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoney = (n) => MONEY_FMT.format(Number(n || 0));
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

const AUTO_FAST_THRESHOLD = 120;
const FAST_INITIAL = 40;
const FAST_STEP = 60;
const SHOW_FAST_TOGGLE_FROM = 60;

/* ═══════════════════════════════════════════════════════════════════
   🎯 HELPERS — frase humana corta + fecha grande
   ═══════════════════════════════════════════════════════════════════ */

function buildFraseEstado(cuota, todasLasCuotas = []) {
  if (!cuota) return { titulo: "—", subtitulo: "Sin datos", tono: "neutral" };

  const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
  const fechaPagoReal = cuota?.pago_registrado_en || cuota?.fecha_pago;
  const fp = fechaPagoReal ? dayjs(fechaPagoReal).startOf("day") : null;
  const hoy = dayjs().startOf("day");
  const estado = getEstadoCuota(cuota, todasLasCuotas);

  const limite = fechaLimitePago(cuota, todasLasCuotas);
  const limiteTxt = fmtFecha(limite || cuota?.fecha_vencimiento);

  if (estado === ESTADO_CUOTA.PAGADA) {
    const pagoAtrasado = fp && fv && fp.isAfter(fv);

    if (pagoAtrasado) {
      const diasAtraso = fp.diff(fv, "day");
      return {
        titulo: fmtFecha(fechaPagoReal),
        subtitulo: `Pagó ${diasAtraso} día${diasAtraso === 1 ? "" : "s"} tarde`,
        tono: "warning",
        tooltip: `La cuota vencía el ${fmtFecha(cuota?.fecha_vencimiento)}. El cliente pagó el ${fmtFecha(fechaPagoReal)}, ${diasAtraso} día${diasAtraso === 1 ? "" : "s"} después.`,
      };
    }
    const diasDesdePago = fp ? hoy.diff(fp, "day") : null;
    let subtitulo;
    if (diasDesdePago == null) subtitulo = "Pagó a tiempo";
    else if (diasDesdePago === 0) subtitulo = "Pagó hoy";
    else if (diasDesdePago === 1) subtitulo = "Pagó ayer";
    else subtitulo = `Pagó hace ${diasDesdePago} días`;
    return {
      titulo: fmtFecha(fechaPagoReal),
      subtitulo,
      tono: "success",
      tooltip: "El cliente pagó esta cuota en término (antes del vencimiento o el mismo día).",
    };
  }

  if (estado === ESTADO_CUOTA.VENCIDA) {
    const dias = limite ? limite.diff(hoy, "day") : null;
    const abs = dias != null ? Math.abs(dias) : "?";
    return {
      titulo: limiteTxt,
      subtitulo: `Lleva ${abs} día${abs === 1 ? "" : "s"} sin pagar`,
      tono: "danger",
      tooltip: `Esta cuota tendría que haberse pagado el ${limiteTxt}. Ya pasaron ${abs} día${abs === 1 ? "" : "s"} y todavía no se pagó.`,
    };
  }

  if (estado === ESTADO_CUOTA.VENCE_HOY) {
    return {
      titulo: limiteTxt,
      subtitulo: "Tiene que pagar hoy",
      tono: "warning",
      tooltip: "Esta cuota vence hoy. Si el cliente no paga, mañana el auto queda sin cobertura.",
    };
  }

  if (estado === ESTADO_CUOTA.POR_VENCER) {
    const dias = limite ? limite.diff(hoy, "day") : null;
    const subtitulo = dias === 1 ? "Le falta 1 día" : `Le faltan ${dias} días`;
    return {
      titulo: limiteTxt,
      subtitulo,
      tono: dias != null && dias <= 3 ? "warning" : "neutral",
      tooltip: `Hay que pagar esta cuota antes del ${limiteTxt}. Si no se paga, el auto va a quedar sin cobertura desde esa fecha.`,
    };
  }

  return {
    titulo: "Sin fecha",
    subtitulo: "Pendiente",
    tono: "neutral",
    tooltip: "Esta cuota no tiene fecha de vencimiento cargada.",
  };
}

function buildFraseCobertura(cobertura, cuota, esCuotaFutura) {
  if (!cobertura) {
    return { titulo: "—", subtitulo: "Sin cobertura", tono: "neutral", tooltip: "" };
  }
  const hoy = dayjs().startOf("day");

  if (cobertura.tipo === "sin_cobertura") {
    if (esCuotaFutura) {
      return {
        titulo: "Quedará sin cobertura",
        subtitulo: `Desde el ${fmtFecha(cobertura.desde)}, si no pagan la anterior`,
        tono: "danger-soft",
        tooltip: `Si no se paga la cuota anterior antes del ${fmtFecha(cobertura.desde)}, el auto va a quedar sin cobertura del seguro desde esa fecha.`,
      };
    }

    const diasSinCob = cobertura.desde ? hoy.diff(cobertura.desde, "day") : null;
    let subtitulo;
    if (diasSinCob == null || diasSinCob < 0) subtitulo = "Desde su vencimiento";
    else if (diasSinCob === 0) subtitulo = "Desde hoy";
    else subtitulo = `El auto lleva ${diasSinCob} día${diasSinCob === 1 ? "" : "s"} sin cobertura`;
    return {
      titulo: `Sin protección desde ${fmtFecha(cobertura.desde)}`,
      subtitulo,
      tono: "danger",
      tooltip: "El cliente no pagó esta cuota. Su auto NO tiene cobertura del seguro. Si tiene un accidente ahora, la compañía no lo cubre.",
    };
  }

  if (cobertura.tipo === "atrasado") {
    return {
      titulo: `${fmtFecha(cobertura.desde)} → ${fmtFecha(cobertura.hasta)}`,
      subtitulo: "Protección reactivada por pago tardío",
      tono: "warning",
      tooltip: `Como el cliente pagó tarde, la cobertura arrancó 2 días hábiles después del pago. En los días entre el vencimiento y el ${fmtFecha(cobertura.desde)}, el auto NO estuvo cubierto.`,
    };
  }

  if (cuota?.pagado) {
    return {
      titulo: `${fmtFecha(cobertura.desde)} → ${fmtFecha(cobertura.hasta)}`,
      subtitulo: "Cubierto durante este mes",
      tono: "success",
      tooltip: "El auto del cliente tuvo cobertura del seguro durante este período. Si tuvo un accidente acá, la compañía lo cubre.",
    };
  }

  return {
    titulo: `Hasta el ${fmtFecha(cobertura.hasta)}`,
    subtitulo: "Cubierto por la cuota anterior",
    tono: "success",
    tooltip: "El cliente está cubierto por la cuota anterior que ya pagó. La protección dura hasta el vencimiento de esta cuota.",
  };
}

/* Estilos por tono semántico → tokens Duo. */
const TONO_STYLES = {
  success: {
    bg: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
    border: "border-duo-verde/40",
    title: "text-titulo dark:text-titulo-dark",
    subtitle: "text-duo-verde-sombra dark:text-duo-verde",
    iconColor: "text-duo-verde",
  },
  warning: {
    bg: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]",
    border: "border-duo-amarillo/40",
    title: "text-titulo dark:text-titulo-dark",
    subtitle: "text-duo-amarillo-sombra dark:text-duo-amarillo",
    iconColor: "text-duo-amarillo-sombra dark:text-duo-amarillo",
  },
  danger: {
    bg: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]",
    border: "border-duo-rojo/40",
    title: "text-titulo dark:text-titulo-dark",
    subtitle: "text-duo-rojo",
    iconColor: "text-duo-rojo",
  },
  "danger-soft": {
    bg: "bg-duo-rojo-soft/60 dark:bg-[var(--color-duo-rojo-soft-dark)]",
    border: "border-duo-rojo/20",
    title: "text-titulo dark:text-titulo-dark",
    subtitle: "text-duo-rojo/80",
    iconColor: "text-duo-rojo/70",
  },
  neutral: {
    bg: "bg-surface dark:bg-surface-dark",
    border: "border-linea dark:border-linea-dark",
    title: "text-titulo dark:text-titulo-dark",
    subtitle: "text-suave dark:text-suave-dark",
    iconColor: "text-suave dark:text-suave-dark",
  },
};

function getLabelSimple(state) {
  if (state === "paid") return "Pagada";
  if (state === "overdue") return "Sin pagar";
  return "Falta pagar";
}

/* ═══════════════════════════════════════════════════════════════════ */

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

    const cli = resolveCliente(pol, cuota);

    setConfirmData({
      datos,
      cuota,
      monto: Number(datos.monto ?? cuota.monto),
      numeroPoliza: pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-",
      cuotaNro: cuota.cuota_nro,
      polizaEstado: String(pol.estado || "").toUpperCase(),
      polizaCobertura: String(pol.cobertura || ""),
      polizaCompania: String(pol.compania_nombre || pol.compania?.nombre || pol.compania || ""),
      oficinaLabel: getOficinaName(extractRawOficina(cuota)),
      diasAtraso: fv && fv.isBefore(hoyDate) ? hoyDate.diff(fv, "day") : 0,
      clienteNombre: cli?.nombreCompleto || "Asegurado",
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
    setConfirmData(null);
    setClienteTraspaso({ nombre: data.clienteNombre });
    setTraspasoModalOpen(true);
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

  const sumarDiasHabiles = useCallback((fecha, dias) => utilSumarDiasHabiles(fecha, dias), []);

  const rowModels = useMemo(() => {
    return visibleItems.map((cuota, idx) => {
      const pol = cuota?.poliza || {};
      const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
      const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
      const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;

      const cuotasPoliza = Array.isArray(pol?.cuotas) ? pol.cuotas : [cuota];
      const idxEnPoliza = cuotasPoliza.findIndex((c) => c?.id === cuota?.id);
      const idxValido = idxEnPoliza >= 0 ? idxEnPoliza : 0;

      const limite = fechaLimitePago(cuota, cuotasPoliza);
      const dias = limite ? limite.diff(hoy, "day") : null;
      const state = cuota?.pagado ? "paid" : dias !== null && dias < 0 ? "overdue" : "pending";
      const proximoVtoYmd = pickNextVencimientoFromIndex(cuota, getPolizaId(pol, cuota), polizaIndex);

      const cobertura = calcCobertura(cuota, cuotasPoliza, idxValido, pol?.fecha_emision);

      const pagoAtrasado = cuota?.pagado && fp && fv ? fp.isAfter(fv) : false;
      const sinCobertura = cobertura?.tipo === "sin_cobertura";

      const esCuotaFutura = !cuota?.pagado && dias !== null && dias > 0;

      const fraseEstado = buildFraseEstado(cuota, cuotasPoliza);
      const fraseCobertura = buildFraseCobertura(cobertura, cuota, esCuotaFutura);

      const totalCuotasPoliza = cuota?.cantidad_cuotas ?? (cuotasPoliza.length || null);
      const cuotaTextoFull = totalCuotasPoliza
        ? `Cuota ${cuota?.cuota_nro ?? "?"} de ${totalCuotasPoliza}`
        : `Cuota ${cuota?.cuota_nro ?? "?"}`;

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
        label: getLabelSimple(state),
        dias,
        polizaEstado: String(pol?.estado || "").toUpperCase(),
        montoTxt: fmtMoney(cuota?.monto),
        sinCobertura,
        pagoAtrasado,
        cuotaTextoFull,
        fraseEstado,
        fraseCobertura,
        esCuotaFutura,
        altaTxt: pol?.fecha_emision ? fmtDate(pol.fecha_emision) : null,
        oficinaLabel: getOficinaName(extractRawOficina(cuota)),
        isWebAdmin,
        abrirModalFecha,
      };
    });
  }, [visibleItems, hoy, obsAbiertaId, polizaIndex, isWebAdmin, abrirModalFecha, sumarDiasHabiles]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-6 sm:p-10 text-center text-sm sm:text-base font-bold text-suave dark:text-suave-dark">
        No hay cuotas para mostrar en este filtro.
      </div>
    );
  }

  return (
    <div className="w-full bg-surface dark:bg-surface-dark rounded-none sm:rounded-3xl border-t-2 border-b-2 sm:border-2 border-linea dark:border-linea-dark overflow-hidden flex flex-col">
      <div className="px-3 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-sm uppercase tracking-wide bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-b-2 border-linea dark:border-linea-dark">
        <div className="flex items-center justify-between gap-2">
          <span className="font-black">Resultados ({items.length})</span>
          {showFastControls && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] normal-case text-suave dark:text-suave-dark font-bold">{items.length} cuotas</span>
              <button
                type="button"
                onClick={() => setModoRapidoManual((v) => !(v ?? modoRapido))}
                className={`h-7 sm:h-8 px-2 sm:px-3 rounded-xl border-2 text-[10px] sm:text-[11px] transition font-black ${modoRapido ? "border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde" : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:border-duo-azul"}`}
              >
                {modoRapido ? "Rápido: ON ⚡" : "Rápido: OFF"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto overscroll-contain pb-6 custom-scrollbar bg-surface dark:bg-surface-dark">
        <ul role="list" className="divide-y sm:divide-y-0 divide-linea dark:divide-linea-dark">
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
          <div className="p-3 sm:p-4 border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
            <button type="button" onClick={() => setRenderLimit((n) => Math.min(items.length, n + FAST_STEP))} className="w-full h-11 rounded-2xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark hover:border-duo-azul text-titulo dark:text-titulo-dark text-xs sm:text-sm font-black cursor-pointer">
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
        onOpenTraspaso={handleOpenTraspaso}
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
              className="relative z-[71] w-full max-w-sm rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-5 py-5 sm:px-6 sm:py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-black text-titulo dark:text-titulo-dark">Cambiar Vencimiento</h3>
                <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-8 w-8 rounded-xl border-2 flex items-center justify-center text-titulo dark:text-titulo-dark bg-surface dark:bg-surface-dark hover:brightness-95 border-linea dark:border-linea-dark cursor-pointer"><HiX className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold text-titulo dark:text-titulo-dark">Cuota <span className="font-black text-duo-verde">#{cuotaFechaSeleccionada.cuota_nro}</span></p>
                <div>
                  <label className="block text-sm font-black text-suave dark:text-suave-dark mb-1">Nueva fecha</label>
                  <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark font-bold outline-none focus:border-duo-azul dark:[color-scheme:dark]" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3 rounded-xl border-2 border-duo-azul/30">
                  <input type="checkbox" checked={ajustarSiguientes} onChange={(e) => setAjustarSiguientes(e.target.checked)} className="mt-1 accent-duo-azul w-4 h-4" />
                  <span className="text-sm font-bold text-titulo dark:text-titulo-dark">Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).</span>
                </label>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={cerrarModalFecha} disabled={isSubmittingFecha} className="h-11 px-4 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-sm text-titulo dark:text-titulo-dark hover:brightness-95 cursor-pointer font-black">Cancelar</button>
                  <button onClick={handleCambiarFecha} disabled={isSubmittingFecha || !nuevaFecha} className="h-11 px-4 rounded-xl bg-duo-azul text-sm font-black text-white hover:brightness-105 flex items-center gap-2 cursor-pointer shadow-[0_4px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)] active:translate-y-0.5">{isSubmittingFecha ? "Guardando..." : "Guardar cambios"}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DetalleCuotaModal detalleAbierto={detalleAbierto} cerrarDetalle={cerrarDetalle} hoy={hoy} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal de DETALLE de cuota (línea de tiempo de la póliza)
═══════════════════════════════════════════════════════════════════ */
function DetalleCuotaModal({ detalleAbierto, cerrarDetalle, hoy }) {
  return (
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
            className="relative z-[61] w-full max-w-[680px] max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 sm:p-5 shadow-2xl custom-scrollbar"
          >
            <div className="flex items-start justify-between gap-3 sticky top-0 bg-card dark:bg-card-dark pb-3 z-10 border-b-2 border-linea dark:border-linea-dark mb-3">
              <h3 className="text-base sm:text-lg font-black text-titulo dark:text-titulo-dark">Detalle de cuota</h3>
              <button onClick={cerrarDetalle} className="h-8 w-8 sm:w-auto sm:px-3 rounded-xl bg-surface dark:bg-surface-dark hover:brightness-95 border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark flex items-center justify-center cursor-pointer">
                <HiX className="w-4 h-4 sm:w-5 sm:h-5" /><span className="hidden sm:inline ml-1 text-sm font-black">Cerrar</span>
              </button>
            </div>
            {(() => {
              const c = detalleAbierto;
              const pol = c?.poliza || {};
              const cliR = resolveCliente(pol, c);
              const todasCuotas = Array.isArray(pol?.cuotas) ? [...pol.cuotas].sort((a, b) => (a?.cuota_nro || 0) - (b?.cuota_nro || 0)) : [];
              const total = c?.cantidad_cuotas ?? (todasCuotas.length || null);

              const idxActual = todasCuotas.findIndex((x) => x?.id === c?.id);

              const coberturaActual = idxActual >= 0
                ? calcCobertura(c, todasCuotas, idxActual, pol?.fecha_emision)
                : null;

              const cuotaSiguiente = idxActual >= 0 && idxActual < todasCuotas.length - 1
                ? todasCuotas[idxActual + 1]
                : null;

              const resumen = resumenCuotas(todasCuotas);

              const ultimaCuota = todasCuotas[todasCuotas.length - 1] || null;
              const finPoliza = ultimaCuota?.fecha_vencimiento || pol?.fecha_vencimiento || pol?.fecha_vto_poliza || null;

              const estadoActual = getEstadoCuota(c, todasCuotas);

              return (
                <div className="space-y-4 text-xs sm:text-sm">

                  {/* ═══ 1. CLIENTE Y VEHÍCULO ═══ */}
                  <SectionCard title="Cliente y vehículo" icon={<HiUser className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoRow label="Cliente" value={cliR?.nombreCompleto || "—"} />
                      <InfoRow label="DNI/CUIT" value={cliR?.dni || "—"} />
                      <InfoRow label="Patente" value={(pol?.patente || "").toUpperCase() || "—"} />
                      <InfoRow label="Vehículo" value={[pol?.marca, pol?.modelo].filter(Boolean).join(" ") || "—"} />
                      <InfoRow label="Compañía" value={pol?.compania_nombre || pol?.compania?.nombre || pol?.compania || "—"} />
                      <InfoRow label="Cobertura" value={pol?.cobertura || "—"} />
                    </div>
                  </SectionCard>

                  {/* ═══ 2. LÍNEA DE TIEMPO DETALLADA (stepper) ═══ */}
                  <SectionCard title="Línea de tiempo de la póliza" icon={<HiClock className="w-4 h-4" />}>

                    {/* Resumen */}
                    {resumen.total > 0 && (
                      <div className="flex flex-wrap gap-2 text-[11px] mb-3">
                        <span className="px-2 py-1 rounded-full font-black bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde">
                          {resumen.pagadas} pagadas
                        </span>
                        <span className="px-2 py-1 rounded-full font-black bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo">
                          {resumen.pendientes} pendientes
                        </span>
                        {resumen.vencidas > 0 && (
                          <span className="px-2 py-1 rounded-full font-black bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo">
                            {resumen.vencidas} vencidas
                          </span>
                        )}
                        {resumen.venceHoy > 0 && (
                          <span className="px-2 py-1 rounded-full font-black bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo">
                            {resumen.venceHoy} vence hoy
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stepper */}
                    <div className="space-y-0">

                      {/* HITO: Inicio de póliza */}
                      <div className="flex items-center gap-2.5 p-2.5 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-l-[3px] border-duo-verde rounded-r-md">
                        <div className="shrink-0 w-9 h-9 rounded-full bg-duo-verde text-white flex items-center justify-center text-sm font-black">🚀</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-duo-verde-sombra dark:text-duo-verde font-black">Inicio de póliza</div>
                          <div className="text-sm font-black text-titulo dark:text-titulo-dark">{fmtFecha(pol?.fecha_emision)}</div>
                          <div className="text-[10px] text-suave dark:text-suave-dark font-bold">
                            Asegurado · {todasCuotas.length || total || "—"} cuota{todasCuotas.length === 1 ? "" : "s"} mensual{todasCuotas.length === 1 ? "" : "es"}
                          </div>
                        </div>
                      </div>

                      {/* Lista de cuotas con conector */}
                      {todasCuotas.map((cu, i) => {
                        const esActual = cu?.id === c?.id;
                        const estado = getEstadoCuota(cu, todasCuotas);
                        const cob = calcCobertura(cu, todasCuotas, i, pol?.fecha_emision);
                        const cuotaPagada = !!cu?.pagado;
                        const fechaPago = cu?.pago_registrado_en || cu?.fecha_pago;
                        const fv = cu?.fecha_vencimiento ? dayjs(cu.fecha_vencimiento).startOf("day") : null;
                        const fp = fechaPago ? dayjs(fechaPago).startOf("day") : null;
                        const pagoAtrasadoCu = cuotaPagada && fp && fv ? fp.isAfter(fv) : false;
                        const diasFaltan = !cuotaPagada && fv ? fv.diff(hoy, "day") : null;
                        const esUltima = i === todasCuotas.length - 1;

                        // Estilo visual según estado (tokens Duo)
                        let dotBg = "bg-suave";
                        let cardBg = "bg-surface dark:bg-surface-dark";
                        let cardBorder = "border-linea dark:border-linea-dark";
                        let opacity = "";

                        if (esActual) {
                          dotBg = "bg-duo-azul";
                          cardBg = "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]";
                          cardBorder = "border-duo-azul border-2";
                        } else if (cuotaPagada) {
                          dotBg = pagoAtrasadoCu ? "bg-duo-amarillo" : "bg-duo-verde";
                          cardBg = pagoAtrasadoCu ? "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]" : "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]";
                          cardBorder = pagoAtrasadoCu ? "border-duo-amarillo/30" : "border-duo-verde/30";
                        } else if (estado === "vencida") {
                          dotBg = "bg-duo-rojo";
                          cardBg = "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]";
                          cardBorder = "border-duo-rojo/30";
                        } else {
                          opacity = "opacity-75";
                        }

                        const inicioPolizaYmd = pol?.fecha_emision ? dayjs(pol.fecha_emision).format("YYYY-MM-DD") : null;
                        const cuotaVtoYmd = cu?.fecha_vencimiento ? dayjs(cu.fecha_vencimiento).format("YYYY-MM-DD") : null;
                        const pagoYmd = fechaPago ? dayjs(fechaPago).format("YYYY-MM-DD") : null;
                        const esCuotaPrimera = cu?.cuota_nro === 1;
                        const reciboEmitido = (cuotaPagada && pagoYmd && esCuotaPrimera && pagoYmd === inicioPolizaYmd)
                          ? utilSumarDiasHabiles(fechaPago, 1)
                          : null;

                        const inicioCoberturaTardia = pagoAtrasadoCu && cob?.desde ? cob.desde : null;

                        return (
                          <div key={cu.id || i}>
                            {/* Conector vertical */}
                            <div className="ml-[18px] w-[2px] h-3 bg-linea dark:bg-linea-dark"></div>

                            <div className={`flex items-stretch gap-2.5 ${opacity}`}>
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`${esActual ? "w-10 h-10" : "w-9 h-9"} rounded-full ${dotBg} text-white flex items-center justify-center text-sm font-black ${esActual ? "ring-2 ring-duo-azul/40 ring-offset-2 ring-offset-card dark:ring-offset-card-dark" : ""}`}>
                                  {cuotaPagada && !esActual ? "✓" : (cu?.cuota_nro || (i + 1))}
                                </div>
                              </div>

                              <div className={`flex-1 p-2.5 ${cardBg} border-2 ${cardBorder} rounded-lg min-w-0`}>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="min-w-0">
                                    {esActual && (
                                      <div className="text-[9px] uppercase tracking-wide text-duo-azul font-black mb-0.5">📍 Aquí estás</div>
                                    )}
                                    <div className="text-xs font-black text-titulo dark:text-titulo-dark">
                                      Cuota {cu?.cuota_nro || (i + 1)}
                                      {esUltima && <span className="ml-1 text-[10px] text-duo-rojo font-bold">· Última</span>}
                                    </div>
                                  </div>
                                  <span className={getBadgeClasses(estado)}>{getBadgeLabel(estado)}</span>
                                </div>

                                {/* Datos clave: vence + monto */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-titulo dark:text-titulo-dark mb-1 font-bold">
                                  <div>📅 <span className="text-suave dark:text-suave-dark">Vence:</span> <span>{fmtFecha(cu?.fecha_vencimiento)}</span></div>
                                  <div>💵 <span className="text-suave dark:text-suave-dark">Monto:</span> <span>${fmtMoney(cu?.monto)}</span></div>

                                  {cuotaPagada ? (
                                    <div className="col-span-2 text-duo-verde-sombra dark:text-duo-verde">
                                      ✅ <span className="text-suave dark:text-suave-dark">Pagada el:</span> <span className="font-black">{fmtFecha(fechaPago)}</span>
                                    </div>
                                  ) : (
                                    diasFaltan !== null && (
                                      <div className={`col-span-2 ${diasFaltan < 0 ? "text-duo-rojo" : diasFaltan === 0 ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : "text-duo-amarillo-sombra dark:text-duo-amarillo"}`}>
                                        ⏳ {diasFaltan > 0 ? `Faltan ${diasFaltan} día${diasFaltan === 1 ? "" : "s"}` : diasFaltan === 0 ? "Vence hoy" : `Venció hace ${Math.abs(diasFaltan)} día${Math.abs(diasFaltan) === 1 ? "" : "s"}`}
                                      </div>
                                    )
                                  )}
                                </div>

                                {/* AVISO: recibo emitido al día hábil siguiente */}
                                {reciboEmitido && (
                                  <div className="mt-1.5 text-[10px] px-2 py-1 rounded bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border border-duo-azul/20 text-duo-azul font-bold">
                                    📝 <span className="font-black">Recibo emitido:</span> {fmtFecha(reciboEmitido)}
                                    <span className="opacity-70 ml-1">(al día hábil siguiente del aseguramiento)</span>
                                  </div>
                                )}

                                {/* AVISO: pago tardío recupera cobertura a las 48hs hábiles */}
                                {pagoAtrasadoCu && inicioCoberturaTardia && (
                                  <div className="mt-1.5 text-[10px] px-2 py-1 rounded bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border border-duo-amarillo/30 text-duo-amarillo-sombra dark:text-duo-amarillo font-bold">
                                    ⚠️ <span className="font-black">Pago atrasado:</span> recupera cobertura el {fmtFecha(inicioCoberturaTardia)}
                                    <span className="opacity-70 ml-1">(48hs hábiles después del pago)</span>
                                  </div>
                                )}

                                {/* Cobertura */}
                                {cob && cob.tipo === "sin_cobertura" && (
                                  <div className="mt-1.5 pt-1.5 border-t border-dashed border-duo-rojo/20 text-[10px] text-duo-rojo font-bold">
                                    🛡 Sin cobertura desde {fmtFecha(cob.desde)}
                                  </div>
                                )}
                                {cob && cob.tipo === "ok" && cob.desde && cob.hasta && (
                                  <div className="mt-1.5 pt-1.5 border-t border-dashed border-duo-verde/20 text-[10px] text-duo-verde-sombra dark:text-duo-verde font-bold">
                                    🛡 Cubre: {fmtFecha(cob.desde)} → {fmtFecha(cob.hasta)}
                                  </div>
                                )}
                                {cob && cob.tipo === "atrasado" && cob.desde && cob.hasta && (
                                  <div className="mt-1.5 pt-1.5 border-t border-dashed border-duo-amarillo/20 text-[10px] text-duo-amarillo-sombra dark:text-duo-amarillo font-bold">
                                    🛡 Cubre: {fmtFecha(cob.desde)} → {fmtFecha(cob.hasta)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* HITO: Vto final */}
                      <div className="ml-[18px] w-[2px] h-3 bg-duo-rojo/60"></div>
                      <div className="flex items-center gap-2.5 p-2.5 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-l-[3px] border-duo-rojo rounded-r-md">
                        <div className="shrink-0 w-9 h-9 rounded-full bg-duo-rojo text-white flex items-center justify-center text-sm font-black">🏁</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-duo-rojo font-black">Vto final de la póliza</div>
                          <div className="text-sm font-black text-titulo dark:text-titulo-dark">{fmtFecha(finPoliza)}</div>
                          <div className="text-[10px] text-suave dark:text-suave-dark font-bold">Renovar antes de esta fecha</div>
                        </div>
                      </div>

                    </div>
                  </SectionCard>

                  {/* Observación si existe */}
                  {(c?.observaciones_pago || c?.ultima_observacion_pago) && (
                    <div className="rounded-2xl border-2 border-duo-rojo/50 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3 sm:p-4 text-titulo dark:text-titulo-dark">
                      <div className="flex items-start gap-2">
                        <HiExclamationCircle className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 text-duo-rojo" />
                        <div className="whitespace-pre-wrap break-words text-xs sm:text-sm font-bold">
                          <span className="font-black text-duo-rojo">Observación: </span>
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
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tarjeta de una cuota
═══════════════════════════════════════════════════════════════════ */
const CuotaRow = memo(
  function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs, abrirModalFecha }) {
    const [expanded, setExpanded] = useState(false);
    const {
      cuota, cuotaPdf, nombreCompleto, patente, modelo, observacion,
      hasObs, isObsOpen, state, label, dias, polizaEstado,
      montoTxt, sinCobertura, pagoAtrasado, altaTxt, oficinaLabel, isWebAdmin,
      cuotaTextoFull,
      fraseEstado, fraseCobertura, esCuotaFutura,
    } = model || {};
    const S = PALETTE[state || "pending"];

    const isPolicyVencida = polizaEstado === "VENCIDA";
    const isPolicyCancelada = polizaEstado === "CANCELADA" || polizaEstado === "ANULADA";

    let extraClasses = "";
    if (isPolicyCancelada && !cuota.pagado) extraClasses = "opacity-60";
    else if (isPolicyVencida && !cuota.pagado) extraClasses = "border-duo-rojo/50";

    const textoBtnPagar = isPolicyVencida ? "Cobrar y reactivar el seguro" : "Cobrar esta cuota";

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-1.5 ${S.stripe}`} aria-hidden />
        <div className={`mx-0 sm:mx-2 my-0 sm:my-1 sm:rounded-2xl border-2 p-3 sm:p-4 ${S.cardBg} ${S.border} ${extraClasses} relative`}>
          <div className="pl-2 sm:pl-2.5 flex flex-col gap-3">

            {/* ═══ HEADER: cliente + monto + estado ═══ */}
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`truncate max-w-[200px] sm:max-w-md font-black text-sm ${state === "overdue" ? "text-duo-rojo" : "text-titulo dark:text-titulo-dark"}`}>
                    {nombreCompleto}
                  </span>
                  {isWebAdmin && oficinaLabel && (
                    <span className="text-[10px] font-mono font-bold text-suave dark:text-suave-dark border border-linea dark:border-linea-dark rounded px-1.5 py-0.5">
                      {oficinaLabel}
                    </span>
                  )}
                  {isPolicyCancelada && !cuota.pagado && (
                    <span className="text-[10px] font-mono font-bold text-duo-rojo border border-duo-rojo/60 rounded px-1.5 py-0.5">BAJA</span>
                  )}
                  {isPolicyVencida && !cuota.pagado && (
                    <span className="text-[10px] font-mono font-bold text-duo-amarillo-sombra dark:text-duo-amarillo border border-duo-amarillo/60 rounded px-1.5 py-0.5">REACTIVAR</span>
                  )}
                </div>
                <div className="text-[11px] text-suave dark:text-suave-dark mt-0.5 flex items-center gap-1.5 font-mono font-bold">
                  <span>{cuotaTextoFull}</span>
                  {patente && <><span>·</span><span>{patente}</span></>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-lg sm:text-xl font-mono font-black ${isPolicyVencida && !cuota.pagado ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : S.amountText}`}>
                  $ {montoTxt}
                </div>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${S.chip}`}>
                  {label}
                </span>
              </div>
            </div>

            {/* ═══ Fecha de alta de la póliza — centrada y destacada ═══ */}
            {altaTxt && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-xl border-2 border-duo-azul/30 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-2">
                  <HiCalendar className="text-duo-azul text-base shrink-0" />
                  <span className="text-[11px] uppercase tracking-wide text-duo-azul font-black">Póliza dada de alta el</span>
                  <span className="text-base font-black text-titulo dark:text-titulo-dark">{altaTxt}</span>
                </div>
              </div>
            )}

            {/* ═══ Fecha de pago → cobertura → Vence ═══ */}
            {(() => {
              const fechaPago = cuota?.pago_registrado_en || cuota?.fecha_pago;
              const pagada = !!cuota?.pagado;

              const vtoStyles = pagada
                ? TONO_STYLES.success
                : state === "overdue"
                ? TONO_STYLES.danger
                : dias === 0
                ? TONO_STYLES.warning
                : TONO_STYLES.neutral;

              const pagoStyles = pagada ? TONO_STYLES.success : TONO_STYLES.neutral;

              let vtoSubtitulo = null;
              let vtoSubAlerta = false;
              if (pagada) {
                vtoSubtitulo = "Cubierta";
              } else if (state === "overdue") {
                const d = dias != null ? Math.abs(dias) : null;
                vtoSubtitulo = d != null ? `Venció hace ${d} día${d === 1 ? "" : "s"}` : "Vencida";
                vtoSubAlerta = true;
              } else if (dias === 0) {
                vtoSubtitulo = "Vence hoy";
              } else if (dias != null && dias > 0) {
                vtoSubtitulo = dias === 1 ? "Vence mañana" : `Vence en ${dias} días`;
              }

              return (
                <div className="flex items-stretch gap-2">
                  {/* Box: Fecha de pago */}
                  <div className={`flex-1 rounded-lg border-2 ${pagoStyles.bg} ${pagoStyles.border} p-2.5`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <HiCheck className={`${pagoStyles.iconColor} text-sm`} />
                      <div className={`text-[10px] uppercase tracking-wide font-black ${pagoStyles.subtitle}`}>
                        Fecha de pago
                      </div>
                    </div>
                    <div className={`text-base font-black ${pagoStyles.title}`}>
                      {pagada && fechaPago ? fmtFecha(fechaPago) : "Sin pagar"}
                    </div>
                  </div>

                  {/* Flecha central */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-1">
                    <div className="text-[9px] uppercase tracking-wide font-black text-suave dark:text-suave-dark text-center leading-tight mb-0.5">
                      Período de<br />cobertura
                    </div>
                    <div className="text-2xl text-suave dark:text-suave-dark leading-none">→</div>
                  </div>

                  {/* Box: Fin de cobertura / Vence */}
                  <div className={`flex-1 rounded-lg border-2 ${vtoStyles.bg} ${vtoStyles.border} p-2.5`}>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <HiCalendar className={`${vtoStyles.iconColor} text-sm`} />
                        <div className={`text-[10px] uppercase tracking-wide font-black ${vtoStyles.subtitle}`}>
                          Fin de cobertura / Vence
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirModalFecha(cuota)}
                        className="text-suave dark:text-suave-dark hover:text-duo-azul transition-colors shrink-0"
                        title="Cambiar fecha de vencimiento"
                      >
                        <HiPencil className="w-3 h-3" />
                      </button>
                    </div>
                    <div className={`text-base font-black ${vtoStyles.title}`}>
                      {fmtFecha(cuota?.fecha_vencimiento)}
                    </div>
                    {vtoSubtitulo && (
                      <div className={`text-[11px] ${vtoStyles.subtitle} mt-0.5 flex items-center gap-1 font-bold`}>
                        {vtoSubAlerta && <HiExclamation className="text-xs shrink-0" />}
                        {vtoSubtitulo}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ═══ ACCIÓN PRINCIPAL ═══ */}
            <div className="flex items-center gap-2 w-full">
              {!cuota?.pagado ? (
                <button
                  onClick={() => abrirPagar(cuota)}
                  className={`w-full h-11 px-4 rounded-xl transition-all inline-flex items-center justify-center gap-2 font-black text-sm ${
                    isPolicyVencida
                      ? "bg-duo-amarillo text-duo-texto shadow-[0_4px_0_var(--color-duo-amarillo-sombra)] active:shadow-[0_0_0_var(--color-duo-amarillo-sombra)] active:translate-y-0.5"
                      : "bg-duo-verde text-white shadow-[0_4px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5"
                  }`}
                >
                  <HiCash className="w-4 h-4" />
                  {textoBtnPagar}
                </button>
              ) : (
                <div className="flex gap-1.5 w-full">
                  <div className="flex-1">
                    <BotonDescargarPDF cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} label="PDF"
                      className="w-full h-10 px-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-xs font-black transition-colors inline-flex items-center justify-center gap-1.5" />
                  </div>
                  <div className="flex-1">
                    <BotonImprimirTicket cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} label="Ticket"
                      className="w-full h-10 px-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-xs font-black transition-colors inline-flex items-center justify-center gap-1.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Expandible */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] font-bold text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors"
            >
              {expanded ? <><HiChevronUp className="w-3.5 h-3.5" /> Ocultar</> : <><HiChevronDown className="w-3.5 h-3.5" /> Ver detalles</>}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-3 border-t-2 border-linea dark:border-linea-dark grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {modelo && <div className="flex justify-between px-2 py-1.5 rounded bg-surface dark:bg-surface-dark"><span className="text-suave dark:text-suave-dark font-bold">Vehículo</span><span className="text-titulo dark:text-titulo-dark font-mono font-bold">{modelo}</span></div>}
                    {altaTxt && <div className="flex justify-between px-2 py-1.5 rounded bg-surface dark:bg-surface-dark"><span className="text-suave dark:text-suave-dark font-bold">Alta póliza</span><span className="text-titulo dark:text-titulo-dark font-mono font-bold">{altaTxt}</span></div>}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => abrirDetalle(cuota)} className="h-9 px-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-xs font-black transition-colors inline-flex items-center gap-1.5">
                      <HiQuestionMarkCircle className="w-3.5 h-3.5" /> Info completa
                    </button>
                    {hasObs && (
                      <button onClick={() => onToggleObs(cuota?.id)} className="h-9 px-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark text-xs font-black transition-colors inline-flex items-center gap-1.5">
                        <HiExclamationCircle className="w-3.5 h-3.5" /> Nota
                      </button>
                    )}
                  </div>
                  {hasObs && isObsOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 text-xs text-titulo dark:text-titulo-dark">
                      <div className="flex items-start gap-2">
                        <HiExclamationCircle className="w-4 h-4 mt-0.5 shrink-0 text-duo-amarillo-sombra dark:text-duo-amarillo" />
                        <span className="whitespace-pre-wrap font-bold">{observacion}</span>
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
    <div className="flex items-center justify-between gap-2 rounded-md border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2.5 py-1.5">
      <span className="text-suave dark:text-suave-dark text-xs font-bold">{label}</span>
      <span className="text-titulo dark:text-titulo-dark truncate max-w-[60%] text-right text-xs font-mono font-bold">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-card dark:bg-card-dark border-b-2 border-linea dark:border-linea-dark">
        {icon && <span className="text-duo-azul">{icon}</span>}
        <span className="text-[11px] uppercase tracking-wide font-black text-titulo dark:text-titulo-dark">{title}</span>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}
