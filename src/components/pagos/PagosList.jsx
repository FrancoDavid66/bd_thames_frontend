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

// 🚀 IMPORTAMOS CONTEXTO Y EL NUEVO COMPONENTE
import { useAuth } from "../../context/AuthContext";
import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import DescargarFactura from "./DescargarFactura";
import ImprimirFacturaTicket from "./ImprimirFacturaTicket";
import EnviarFacturaWhatsapp from "./EnviarFacturaWhatsapp";
import ModalFormaPago from "./ModalFormaPago";
import ConfirmarPagoModal from "./ConfirmarPagoModal"; // <--- HIJO NUEVO

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

/* ====== PALETA SÚPER VIVA Y ESTILOS POR ESTADO ====== */
const PALETTE = {
  basePanel: "bg-slate-950 border-slate-800 shadow-2xl",
  header: "bg-slate-900 text-slate-100 border-b border-slate-800",
  divider: "divide-slate-800/50",
  paid: {
    stripe: "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]",
    cardBg: "bg-gradient-to-r from-emerald-900/60 to-slate-900 border-emerald-500/50 shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
    text: "text-white",
    amountText: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]",
    border: "border-emerald-500/50",
    chipBg: "bg-emerald-500 shadow-md shadow-emerald-500/40",
    chipText: "text-white",
    chipBorder: "border-emerald-400",
    noteBg: "bg-emerald-900/60",
    noteText: "text-emerald-100",
    btn: "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400",
  },
  pending: {
    stripe: "bg-slate-700",
    cardBg: "bg-slate-900/40 border-slate-800/60 opacity-70 hover:opacity-100 transition-opacity duration-300",
    text: "text-slate-400",
    amountText: "text-slate-400",
    border: "border-slate-800",
    chipBg: "bg-slate-800",
    chipText: "text-slate-500",
    chipBorder: "border-slate-700",
    noteBg: "bg-slate-800/50",
    noteText: "text-slate-400",
    btn: "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600",
  },
  overdue: {
    stripe: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]",
    cardBg: "bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/40",
    text: "text-white",
    amountText: "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]",
    border: "border-rose-500/40",
    chipBg: "bg-rose-500 shadow-md shadow-rose-500/30",
    chipText: "text-white",
    chipBorder: "border-rose-400",
    noteBg: "bg-rose-900/60",
    noteText: "text-rose-100",
    btn: "bg-rose-500 hover:bg-rose-400 text-white border-rose-400",
  },
  neutralBtn: "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 shadow-sm",
  actionBtn: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/40 border-indigo-500",
  ticketBtn: "bg-violet-600 hover:bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-600/40",
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

    setConfirmData({
      datos,
      cuota,
      monto: Number(datos.monto ?? cuota.monto),
      numeroPoliza: pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-",
      cuotaNro: cuota.cuota_nro,
      polizaEstado: String(pol.estado || "").toUpperCase(),
      polizaCobertura: String(pol.cobertura || ""), // 💡 Extraemos la cobertura para el cross-selling
      oficinaLabel: getOficinaName(extractRawOficina(cuota)),
      diasAtraso: fv && fv.isBefore(hoyDate) ? hoyDate.diff(fv, "day") : 0,
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

  const rowModels = useMemo(() => {
    return visibleItems.map(cuota => {
      const pol = cuota?.poliza || {};
      const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
      const dias = fv ? fv.diff(hoy, "day") : null;
      const state = cuota?.pagado ? "paid" : dias !== null && dias < 0 ? "overdue" : "pending";
      const proximoVtoYmd = pickNextVencimientoFromIndex(cuota, getPolizaId(pol, cuota), polizaIndex);

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
        pagaTxt: cuota?.fecha_pago ? fmtDate(cuota?.fecha_pago) : null,
        montoTxt: fmtMoney(cuota?.monto),
        cubreDesdeTxt: fv ? fv.subtract(1, "month").format("DD/MM/YYYY") : null,
        cubreHastaTxt: fv ? fv.format("DD/MM/YYYY") : null,
        altaTxt: pol?.fecha_emision ? fmtDate(pol.fecha_emision) : null,
        oficinaLabel: getOficinaName(extractRawOficina(cuota)), 
        isWebAdmin, 
        abrirModalFecha,
      };
    });
  }, [visibleItems, hoy, obsAbiertaId, polizaIndex, isWebAdmin, abrirModalFecha]);

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

      {/* 🚀 ACÁ RENDERIZAMOS EL NUEVO COMPONENTE MODAL */}
      <ConfirmarPagoModal 
        isOpen={!!confirmData}
        confirmData={confirmData}
        confirmandoPago={confirmandoPago}
        onClose={handleCancelarConfirm}
        onConfirm={ejecutarPagoConfirmado}
        isWebAdmin={isWebAdmin}
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
    const { cuota, cuotaPdf, nombreCompleto, patente, modelo, observacion, hasObs, isObsOpen, state, label, dias, polizaEstado, venceTxt, pagaTxt, montoTxt, cubreDesdeTxt, cubreHastaTxt, altaTxt, oficinaLabel, isWebAdmin } = model || {};
    const S = PALETTE[state || "pending"];

    const isPolicyVencida = polizaEstado === "VENCIDA";
    const isPolicyCancelada = polizaEstado === "CANCELADA" || polizaEstado === "ANULADA";

    let extraClasses = "";
    if (isPolicyCancelada && !cuota.pagado) extraClasses = "opacity-80 grayscale-[30%] bg-slate-900/80 border-slate-700"; 
    else if (isPolicyVencida && !cuota.pagado) extraClasses = "ring-2 ring-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] bg-gradient-to-r from-orange-950/40 to-slate-900 border-orange-500/40"; 

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-1.5 ${S.stripe} hidden sm:block`} aria-hidden />
        <div className={`mx-0 sm:mx-3 my-0 sm:my-2 sm:rounded-2xl border-b sm:border p-3 sm:p-4 shadow-md ${S.cardBg} ${S.border} ${extraClasses} relative transition-all duration-300`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${S.stripe} sm:hidden`} aria-hidden />
          <div className="pl-2 sm:pl-0 flex flex-col gap-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`truncate max-w-[200px] sm:max-w-md font-bold text-sm sm:text-base ${state === 'paid' ? 'text-white' : state === 'overdue' ? 'text-rose-50' : 'text-slate-300'}`}>{nombreCompleto}</span>
                  {isWebAdmin && oficinaLabel && <span className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 bg-emerald-500/20 border-emerald-400/40 text-emerald-300 text-[9px] font-bold uppercase tracking-wider shadow-sm">{oficinaLabel}</span>}
                  {isPolicyCancelada && !cuota.pagado && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase border border-rose-500/40 shadow-sm">💀 De Baja</span>}
                  {isPolicyVencida && !cuota.pagado && <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold uppercase border border-orange-500/40 shadow-sm animate-pulse">⚠️ Reactivar</span>}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 shadow-sm">Cuota #{cuota?.cuota_nro ?? "?"}</span>
                  {patente && <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 shadow-sm">{patente}</span>}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end">
                <span className={`text-xl sm:text-2xl font-bold tracking-tight ${isPolicyVencida && !cuota.pagado ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : S.amountText}`}>$ {montoTxt}</span>
                <span className={`mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${S.chipBg} ${S.chipText} ${S.chipBorder}`}>{label}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-col sm:flex-row gap-2 w-full">
              <div className={`flex-1 flex items-center justify-between sm:justify-start sm:gap-3 rounded-lg px-3 py-2 border shadow-sm ${state === 'overdue' ? 'bg-rose-500/10 border-rose-500/20' : state === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold">Vence:</span>
                <span className={`text-sm font-bold ${state === 'overdue' ? 'text-rose-400' : state === 'paid' ? 'text-emerald-300' : 'text-white'}`}>{venceTxt || "—"}</span>
                {!cuota?.pagado && <button type="button" onClick={() => abrirModalFecha(cuota)} className="ml-auto sm:ml-2 text-slate-400 hover:text-white transition p-1.5 cursor-pointer bg-slate-900/50 rounded-md hover:bg-slate-800 border border-slate-700/50 shadow-sm"><HiPencil className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="flex-1 flex items-center justify-between sm:justify-start sm:gap-3 rounded-lg px-3 py-2 border bg-sky-500/10 border-sky-500/20 shadow-sm">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-sky-400/80 font-bold">Cubre:</span>
                <span className="text-sm font-bold text-sky-200">{cubreDesdeTxt} <span className="text-[10px] text-sky-400/80 mx-0.5">al</span> {cubreHastaTxt}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full mt-2 pt-2 border-t border-slate-700/50">
                {!cuota?.pagado ? (
                  <button onClick={() => abrirPagar(cuota)} className={`w-full h-11 px-6 rounded-xl transition inline-flex items-center justify-center gap-2 font-bold cursor-pointer text-sm tracking-wide ${isPolicyVencida ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30' : PALETTE.actionBtn}`}><HiCash className="w-5 h-5" /><span>{isPolicyVencida ? "PAGAR Y REACTIVAR" : "PAGAR CUOTA"}</span></button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <div className="flex-1"><DescargarFactura cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} label="Bajar PDF" tone="neutral" className="w-full h-11 px-1 sm:px-4 rounded-xl border transition inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" /></div>
                    <div className="flex-1"><ImprimirFacturaTicket cliente={model?.pol?.cliente} poliza={model?.pol} cuota={cuotaPdf || cuota} label="Ticket" className={`w-full h-11 px-1 sm:px-4 rounded-xl border transition inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer ${PALETTE.ticketBtn}`} /></div>
                    <div className="flex-1"><EnviarFacturaWhatsapp cuota={cuota}><button className={`w-full h-11 px-1 sm:px-4 rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer`}><HiDeviceMobile className="w-4 h-4 sm:w-5 sm:h-5" /><span className="hidden sm:inline">WhatsApp</span><span className="sm:hidden">WPP</span></button></EnviarFacturaWhatsapp></div>
                  </div>
                )}
            </div>
            <button onClick={() => setExpanded(!expanded)} className="w-full py-2 mt-1 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-white transition bg-slate-800/30 rounded-xl border border-slate-700/30 cursor-pointer shadow-sm">
              {expanded ? <><HiChevronUp className="w-4 h-4"/> Ocultar detalles</> : <><HiChevronDown className="w-4 h-4"/> Ver más detalles</>}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-3 pb-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-6 sm:gap-y-2 text-xs text-slate-300 border-t border-slate-700/50 mt-2">
                    <div className="flex justify-between sm:justify-start sm:gap-2"><span className="text-slate-500 font-medium">Vehículo:</span><span className="font-bold text-right text-slate-200">{modelo || "—"}</span></div>
                    {altaTxt && <div className="flex justify-between sm:justify-start sm:gap-2"><span className="text-slate-500 font-medium">Alta póliza:</span><span className="font-bold text-right text-indigo-300">{altaTxt}</span></div>}
                    {!!pagaTxt && <div className="flex justify-between sm:justify-start sm:gap-2"><span className="text-slate-500 font-medium">Pagada el:</span><span className="font-bold text-right text-emerald-400">{pagaTxt}</span></div>}
                    {dias !== null && !cuota?.pagado && <div className="flex justify-between sm:justify-start sm:gap-2"><span className="text-slate-500 font-medium">Estado:</span><span className="font-bold text-right text-white">{dias < 0 ? `Atraso: ${Math.abs(dias)} días` : `Faltan: ${dias} días`}</span></div>}
                    <div className="col-span-1 sm:col-span-2 flex gap-2 mt-3 pt-3 border-t border-slate-700/30">
                       <button onClick={() => abrirDetalle(cuota)} className={`h-9 px-4 rounded-xl border ${PALETTE.neutralBtn} inline-flex items-center justify-center gap-1.5 text-xs font-bold flex-1 sm:flex-none cursor-pointer`}><HiQuestionMarkCircle className="w-4 h-4" /> Info completa</button>
                      {hasObs && <button onClick={() => onToggleObs(cuota?.id)} className={`h-9 px-4 rounded-xl border ${S.btn} inline-flex items-center justify-center gap-1.5 text-xs font-bold flex-1 sm:flex-none cursor-pointer shadow-sm`}><HiExclamationCircle className="w-4 h-4" /> Nota / Obs</button>}
                    </div>
                  </div>
                  {hasObs && isObsOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className={`mt-3 rounded-xl border px-3 py-3 ${S.noteBg} ${S.noteText} ${S.border} shadow-inner`}>
                      <div className="flex items-start gap-2">
                        <HiExclamationCircle className="w-5 h-5 mt-0.5 shrink-0 opacity-80" />
                        <div className="text-[11px] sm:text-sm whitespace-pre-wrap break-words"><span className="font-bold uppercase tracking-wide opacity-75">Obs: </span>{observacion}</div>
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
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 shadow-sm">
      <span className="text-slate-400 text-xs sm:text-sm font-medium">{label}</span>
      <span className="text-white truncate max-w-[65%] text-right font-bold text-xs sm:text-sm">{value}</span>
    </div>
  );
}