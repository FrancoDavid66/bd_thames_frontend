/* src/components/pagos/PagosList.jsx — Tema VIVO y brillante (Color-coded)
   ✅ FIX: calcular proximo_vencimiento real para imprimir/descargar
   ✅ FIX: "Cubre del" correcto
   🚀 UPDATE: Paleta de colores viva, tarjetas teñidas por estado y botones llamativos
   📱 UPDATE: Diseño Mobile-First con ACORDEÓN
   🧹 UPDATE: Filtro automático para ocultar cuotas de pólizas canceladas/vencidas
   🎨 UPDATE: Pendientes APAGADAS, Pagadas MUY VIVAS.
   👀 UPDATE: Vencimiento y Período SIEMPRE VISIBLES.
*/
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

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD Y VISIBILIDAD DE OFICINA
import { useAuth } from "../../context/AuthContext";

import { marcarCuotaComoPagada } from "../../store/slices/pagosSlice";
import DescargarFactura from "./DescargarFactura";
import ImprimirFacturaTicket from "./ImprimirFacturaTicket";
import EnviarFacturaWhatsapp from "./EnviarFacturaWhatsapp";
import ModalFormaPago from "./ModalFormaPago";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";

/* ====== PALETA SÚPER VIVA Y ESTILOS POR ESTADO ====== */
const PALETTE = {
  basePanel: "bg-slate-950 border-slate-800 shadow-2xl",
  header: "bg-slate-900 text-slate-100 border-b border-slate-800",
  divider: "divide-slate-800/50",

  paid: { // VERDE MUY VIVO Y BRILLANTE
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
  pending: { // GRIS/APAGADO Y TRANSPARENTE
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
  overdue: { // ROJO INTENSO (ALERTA)
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

/* ====== Formatters cacheados ====== */
const MONEY_FMT = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtMoney = (n) => MONEY_FMT.format(Number(n || 0));
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

/* ====== Performance knobs ====== */
const AUTO_FAST_THRESHOLD = 120;
const FAST_INITIAL = 40;
const FAST_STEP = 60;
const SHOW_FAST_TOGGLE_FROM = 60;

function todayKey() {
  return dayjs().format("YYYY-MM-DD");
}
function msUntilNextDay() {
  const now = dayjs();
  const next = now.add(1, "day").startOf("day").add(2, "second");
  const ms = next.diff(now, "millisecond");
  return Math.max(5_000, Math.min(ms, 24 * 60 * 60 * 1000));
}

function pickCuotaActualizada(resp) {
  const r = resp && typeof resp === "object" ? resp : null;
  if (!r) return null;
  if (r.cuotaActualizada && typeof r.cuotaActualizada === "object")
    return r.cuotaActualizada;
  if (r.data && typeof r.data === "object") return r.data;
  return r;
}

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function isBadClienteLabel(s) {
  const x = safeStr(s).toLowerCase();
  return !x || x === "cliente" || x === "client" || x === "asegurado";
}

function extractRawOficina(item) {
  const it = item && typeof item === "object" ? item : {};
  const pol = it?.poliza && typeof it.poliza === "object" ? it.poliza : {};
  return String(
    pol?.oficina_nombre ?? pol?.oficinaName ?? pol?.oficina_id ?? pol?.oficinaId ?? pol?.oficina ??
    it?.oficina_nombre ?? it?.oficina_id ?? it?.oficinaId ?? it?.oficina ?? ""
  ).trim();
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

  const apellido =
    safeStr(isObjCliente ? c.apellido : "") ||
    safeStr(p.cliente_apellido) ||
    safeStr(cuota?.cliente_apellido);

  const nombre =
    safeStr(isObjCliente ? c.nombre : "") ||
    safeStr(p.cliente_nombre) ||
    safeStr(cuota?.cliente_nombre);

  const nombreCompletoFlat =
    safeStr(p.cliente_nombre_completo) ||
    safeStr(p.cliente_nombre_apellido) ||
    safeStr(cuota?.cliente_nombre_completo) ||
    safeStr(cuota?.cliente_nombre_apellido);

  const asegurado =
    safeStr(p.asegurado_nombre) || safeStr(p.asegurado) || safeStr(cuota?.asegurado);

  const dni =
    safeStr(isObjCliente ? c.dni_cuit_cuil : "") ||
    safeStr(p.cliente_dni) ||
    safeStr(cuota?.cliente_dni) ||
    safeStr(p.dni_cuit_cuil) ||
    safeStr(cuota?.dni_cuit_cuil);

  const id =
    (isObjCliente && (typeof c.id === "number" || typeof c.id === "string")
      ? c.id
      : null) ?? p.cliente_id ?? cuota?.cliente_id ?? null;

  const byObj = [safeStr(isObjCliente ? c.apellido : ""), safeStr(isObjCliente ? c.nombre : "")]
    .filter(Boolean).join(", ").trim();
  const byParts = [apellido, nombre].filter(Boolean).join(", ").trim();
  const byFlatFull = safeStr(nombreCompletoFlat);
  const byAsegurado = safeStr(asegurado);
  const byStringCliente = typeof c === "string" && !isBadClienteLabel(c) ? safeStr(c) : "";

  const nombreCompleto =
    byObj || byParts || byFlatFull || byAsegurado || byStringCliente || "Cliente";

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
  const pid =
    p?.id ??
    p?.poliza_id ??
    cuota?.poliza_id ??
    cuota?.polizaId ??
    null;

  const n = Number(pid);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toYmd(d) {
  const s = String(d || "").trim();
  if (!s) return "";
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function buildPolizaCuotasIndex(list) {
  const base = Array.isArray(list) ? list : [];
  const map = new Map();

  for (const c of base) {
    const pol = c?.poliza || {};
    const pid = getPolizaId(pol, c);
    if (!pid) continue;

    const arr = map.get(pid) || [];
    arr.push(c);
    map.set(pid, arr);
  }

  for (const [pid, arr] of map.entries()) {
    arr.sort((a, b) => {
      const an = Number(a?.cuota_nro);
      const bn = Number(b?.cuota_nro);
      const aHas = Number.isFinite(an);
      const bHas = Number.isFinite(bn);

      if (aHas && bHas && an !== bn) return an - bn;

      const af = toYmd(a?.fecha_vencimiento);
      const bf = toYmd(b?.fecha_vencimiento);
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
  const hasN = Number.isFinite(curN);

  if (hasN) {
    let best = null;
    let bestN = Infinity;
    for (const c of arr) {
      const n = Number(c?.cuota_nro);
      if (!Number.isFinite(n)) continue;
      if (n > curN && n < bestN) {
        bestN = n;
        best = c;
      }
    }
    if (best?.fecha_vencimiento) return toYmd(best.fecha_vencimiento);
  }

  const curF = toYmd(cuota?.fecha_vencimiento);
  if (curF) {
    let best = null;
    let bestF = "";
    for (const c of arr) {
      const f = toYmd(c?.fecha_vencimiento);
      if (!f) continue;
      if (f > curF && (!bestF || f < bestF)) {
        bestF = f;
        best = c;
      }
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

  // 🚀 FILTRO INTELIGENTE: Ocultamos las pólizas muertas para limpiar la lista
  const items = useMemo(() => {
    const base = Array.isArray(cuotas) ? cuotas : [];
    return base.filter((c) => {
      // 1. Filtrar pagadas si está activado el botón
      if (ocultarPagadas && c.pagado) return false;

      // 2. 🧹 LIMPIEZA: Ocultar pólizas canceladas o vencidas
      const estadoPoliza = String(c?.poliza?.estado || "").trim().toLowerCase();
      if (["cancelada", "anulada", "baja", "vencida"].includes(estadoPoliza)) {
        return false; // ¡Desaparecen de la lista!
      }

      return true;
    });
  }, [cuotas, ocultarPagadas]);

  const polizaIndex = useMemo(() => buildPolizaCuotasIndex(items), [items]);

  const [hoyKey, setHoyKey] = useState(todayKey());
  useEffect(() => {
    let t = null;
    const tick = () => {
      setHoyKey(todayKey());
      t = setTimeout(tick, msUntilNextDay());
    };
    t = setTimeout(tick, msUntilNextDay());
    return () => {
      if (t) clearTimeout(t);
    };
  }, []);

  const hoy = useMemo(() => dayjs(hoyKey).startOf("day"), [hoyKey]);

  const [modoRapidoManual, setModoRapidoManual] = useState(null);
  const modoRapidoAuto = !!preferFast || (Array.isArray(items) && items.length >= AUTO_FAST_THRESHOLD);
  const modoRapido = modoRapidoManual ?? modoRapidoAuto;

  const [renderLimit, setRenderLimit] = useState(
    modoRapido ? Math.min(FAST_INITIAL, items.length) : items.length
  );

  useEffect(() => {
    if (!modoRapido) {
      setRenderLimit(items.length);
      return;
    }
    setRenderLimit(Math.min(FAST_INITIAL, items.length));
  }, [items.length, modoRapido]);

  const visibleItems = useMemo(() => {
    if (!modoRapido) return items;
    return items.slice(0, renderLimit);
  }, [items, modoRapido, renderLimit]);

  const showFastControls = items.length >= SHOW_FAST_TOGGLE_FROM;

  const abrirPagar = useCallback((cuota) => setCuotaSeleccionada(cuota), []);
  const cerrarPagar = useCallback(() => setCuotaSeleccionada(null), []);
  const abrirDetalle = useCallback((cuota) => setDetalleAbierto(cuota), []);
  const cerrarDetalle = useCallback(() => setDetalleAbierto(null), []);
  const toggleObs = useCallback((id) => {
    setObsAbiertaId((prev) => (prev === id ? null : id));
  }, []);

  const abrirModalFecha = useCallback((cuota) => {
    setCuotaFechaSeleccionada(cuota);
    setNuevaFecha(toYmd(cuota.fecha_vencimiento) || dayjs().format('YYYY-MM-DD'));
    setAjustarSiguientes(true);
    setModalFechaOpen(true);
  }, []);

  const cerrarModalFecha = useCallback(() => {
    setModalFechaOpen(false);
    setCuotaFechaSeleccionada(null);
  }, []);

  const handleCambiarFecha = useCallback(async () => {
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

      const pid = getPolizaId(cuotaFechaSeleccionada.poliza, cuotaFechaSeleccionada);
      const updatedList = [];
      
      updatedList.push({
        id: cuotaFechaSeleccionada.id,
        fecha_vencimiento: nuevaFecha
      });

      if (ajustarSiguientes) {
        const siguientes = items.filter((c) => {
          const cPid = getPolizaId(c?.poliza, c);
          return cPid === pid && Number(c.cuota_nro) > Number(cuotaFechaSeleccionada.cuota_nro);
        }).sort((a, b) => Number(a.cuota_nro) - Number(b.cuota_nro));

        let currentBaseDate = dayjs(nuevaFecha);
        siguientes.forEach((c) => {
          currentBaseDate = currentBaseDate.add(1, "month");
          updatedList.push({
            id: c.id,
            fecha_vencimiento: currentBaseDate.format("YYYY-MM-DD")
          });
        });
      }

      actualizarCuotas?.(updatedList);

      toast.success(`¡Listo! Se actualizaron ${cambiadas} cuotas automáticamente.`);
      setModalFechaOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.nueva_fecha || error.response?.data?.detail || "Error al cambiar la fecha");
    } finally {
      setIsSubmittingFecha(false);
    }
  }, [cuotaFechaSeleccionada, nuevaFecha, ajustarSiguientes, items, actualizarCuotas]);

  const confirmarPago = useCallback(
    (datos) => {
      if (!cuotaSeleccionada) return;
      const cuota = cuotaSeleccionada;
      const monto = Number(datos.monto ?? cuota.monto);
      const pol = cuota.poliza || {};
      const numeroPoliza = pol.numero_poliza || pol.numero || pol.nro_poliza || pol.n_poliza || "-";

      const oficinaRaw = extractRawOficina(cuota);
      const oficinaLabel = getOficinaName(oficinaRaw);

      setConfirmData({
        datos,
        cuota,
        monto,
        numeroPoliza,
        cuotaNro: cuota.cuota_nro,
        oficinaLabel,
      });

      cerrarPagar();
    },
    [cuotaSeleccionada, cerrarPagar]
  );

  const ejecutarPagoConfirmado = useCallback(async () => {
    if (!confirmData || confirmandoPago) return;
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
      setConfirmandoPago(true);
      const resp = await dispatch(marcarCuotaComoPagada(payload)).unwrap();
      const cuotaActualizada = pickCuotaActualizada(resp);

      if (!cuotaActualizada || typeof cuotaActualizada !== "object") {
        toast.error("Pago registrado, pero no pude actualizar la cuota en pantalla.");
        setConfirmData(null);
        return;
      }

      toast.success("Cuota marcada como pagada");

      const conObs = {
        ...cuotaActualizada,
        poliza: cuotaActualizada.poliza || cuota.poliza,
        cantidad_cuotas: cuotaActualizada.cantidad_cuotas ?? cuota.cantidad_cuotas ?? null,
        observaciones_pago: (datos.observaciones || "").trim(),
        pago_registrado_en: cuotaActualizada.pago_registrado_en || dayjs().toISOString(),
      };

      setConfirmData(null);
      actualizarCuotas?.([conObs]);
      if (conObs.observaciones_pago) setObsAbiertaId(conObs.id);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo registrar el pago");
    } finally {
      setConfirmandoPago(false);
    }
  }, [confirmData, confirmandoPago, dispatch, actualizarCuotas]);

  const handleCancelarConfirm = useCallback(() => {
    if (!confirmData) {
      setConfirmData(null);
      return;
    }
    const { cuota } = confirmData;
    setConfirmData(null);
    if (cuota) setCuotaSeleccionada(cuota);
  }, [confirmData]);

  const datosNoti = useMemo(() => {
    if (!cuotaSeleccionada) return null;
    const pol = cuotaSeleccionada.poliza || {};
    const cliR = resolveCliente(pol, cuotaSeleccionada);
    const compania = (pol.compania_nombre || pol.compania?.nombre || pol.compania || "").toString().trim();
    const cobertura = (pol.cobertura || "").toString().trim();
    const total = cuotaSeleccionada?.cantidad_cuotas ?? (Array.isArray(pol.cuotas) ? pol.cuotas.length : null);
    const cuotaTxt = typeof cuotaSeleccionada.cuota_nro === "number"
        ? total ? `Cuota ${cuotaSeleccionada.cuota_nro}/${total}` : `Cuota ${cuotaSeleccionada.cuota_nro}`
        : "";

    return { nombreAp: cliR?.nombreAp || "", dni: cliR?.dni || "", compania, cobertura, cuotaTxt };
  }, [cuotaSeleccionada]);

  const rowModels = useMemo(() => {
    const base = Array.isArray(visibleItems) ? visibleItems : [];
    const out = new Array(base.length);

    for (let i = 0; i < base.length; i++) {
      const cuota = base[i];
      const pol = cuota?.poliza || {};
      const cliR = resolveCliente(pol, cuota);
      const nombreCompleto = cliR?.nombreCompleto || "Cliente";
      const patente = (pol?.patente || "").toUpperCase();
      const modelo = [pol?.marca, pol?.modelo].filter(Boolean).join(" ");
      const observacion = ((cuota?.observaciones_pago || cuota?.ultima_observacion_pago || "") || "").toString().trim();

      const fv = cuota?.fecha_vencimiento ? dayjs(cuota.fecha_vencimiento).startOf("day") : null;
      const dias = fv ? fv.diff(hoy, "day") : null;
      const state = cuota?.pagado ? "paid" : dias !== null && dias < 0 ? "overdue" : "pending";
      const label = state === "paid" ? "Pagada" : state === "overdue" ? "Vencida" : "Pendiente";

      const cubreDesdeTxt = fv ? fv.subtract(1, "month").format("DD/MM/YYYY") : null;
      const cubreHastaTxt = fv ? fv.format("DD/MM/YYYY") : null;
      const altaTxt = pol?.fecha_emision ? fmtDate(pol.fecha_emision) : null;

      const rawOfi = extractRawOficina(cuota);
      const oficinaLabel = getOficinaName(rawOfi);

      const polId = getPolizaId(pol, cuota);
      const proximoVtoYmd = pickNextVencimientoFromIndex(cuota, polId, polizaIndex);
      const proximoVtoTxt = proximoVtoYmd ? fmtDate(proximoVtoYmd) : null;

      const cuotaPdf = {
        ...cuota,
        proximo_vencimiento: proximoVtoYmd || cuota?.proximo_vencimiento || null,
      };

      out[i] = {
        cuota,
        cuotaPdf,
        pol,
        nombreCompleto,
        patente,
        modelo,
        observacion,
        hasObs: !!observacion,
        isObsOpen: obsAbiertaId === cuota?.id,
        state,
        label,
        dias,
        venceTxt: fmtDate(cuota?.fecha_vencimiento),
        pagaTxt: cuota?.fecha_pago ? fmtDate(cuota?.fecha_pago) : null,
        montoTxt: fmtMoney(cuota?.monto),
        cubreDesdeTxt,
        cubreHastaTxt,
        altaTxt,
        proximoVtoTxt,
        oficinaLabel, 
        isWebAdmin, 
        abrirModalFecha,
      };
    }
    return out;
  }, [visibleItems, hoy, obsAbiertaId, polizaIndex, isWebAdmin, abrirModalFecha]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 sm:p-10 text-center text-sm sm:text-base text-slate-400">
        No hay cuotas para mostrar. Las pólizas canceladas o dadas de baja se ocultan automáticamente.
      </div>
    );
  }

  return (
    <div className={`w-full ${PALETTE.basePanel} rounded-none sm:rounded-3xl border-t border-b sm:border overflow-hidden flex flex-col`}>
      <div className={`px-3 sm:px-6 py-3 sm:py-4 text-[11px] sm:text-sm uppercase tracking-wide ${PALETTE.header}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-200">Resultados</span>
          {showFastControls && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] normal-case text-slate-400">
                {items.length} cuotas
              </span>
              <button
                type="button"
                onClick={() => setModoRapidoManual((v) => !(v ?? modoRapido))}
                className={`h-7 sm:h-8 px-2 sm:px-3 rounded-lg sm:rounded-xl border text-[10px] sm:text-[11px] transition cursor-pointer font-bold ${
                  modoRapido
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                    : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
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
            const motionProps = modoRapido ? {} : {
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.2, ease: "easeOut", delay: Math.min(0.25, idx * 0.012) },
            };

            return (
              <Comp key={m?.cuota?.id} className="relative" {...motionProps}>
                <CuotaRow
                  model={m}
                  abrirDetalle={abrirDetalle}
                  abrirPagar={abrirPagar}
                  onToggleObs={toggleObs}
                  abrirModalFecha={abrirModalFecha}
                />
              </Comp>
            );
          })}
        </ul>

        {modoRapido && renderLimit < items.length && (
          <div className="p-3 sm:p-4 border-t sm:border-t-0 border-slate-800 bg-slate-900">
            <button
              type="button"
              onClick={() => setRenderLimit((n) => Math.min(items.length, n + FAST_STEP))}
              className="w-full h-10 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm"
            >
              Mostrar más ({Math.min(FAST_STEP, items.length - renderLimit)})
            </button>
          </div>
        )}
      </div>

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
                <button
                  onClick={cerrarModalFecha}
                  disabled={isSubmittingFecha}
                  className="h-8 w-8 rounded-lg border flex items-center justify-center text-slate-300 bg-slate-700 hover:bg-slate-600 border-slate-600 cursor-pointer"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  Cuota <span className="font-bold text-emerald-400">#{cuotaFechaSeleccionada.cuota_nro}</span>
                </p>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Nueva fecha</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-600 text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer mt-2 bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                  <input
                    type="checkbox"
                    checked={ajustarSiguientes}
                    onChange={(e) => setAjustarSiguientes(e.target.checked)}
                    className="mt-1 accent-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm text-indigo-200">
                    Ajustar automáticamente los vencimientos de las <strong>cuotas siguientes</strong> (+1 mes a cada una).
                  </span>
                </label>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={cerrarModalFecha}
                    disabled={isSubmittingFecha}
                    className="h-10 px-4 rounded-xl border border-slate-600 bg-slate-700 text-sm text-white hover:bg-slate-600 cursor-pointer font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCambiarFecha}
                    disabled={isSubmittingFecha || !nuevaFecha}
                    className="h-10 px-4 rounded-xl border border-transparent bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-400 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/30"
                  >
                    {isSubmittingFecha ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] flex items-center justify-center px-3"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={confirmandoPago ? undefined : handleCancelarConfirm} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="relative z-[66] w-full max-w-[420px] rounded-2xl border border-slate-700 bg-slate-800 px-5 py-5 sm:px-6 sm:py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-base sm:text-lg font-bold text-white">Confirmar pago</h3>
                <button
                  onClick={handleCancelarConfirm}
                  disabled={confirmandoPago}
                  className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl border flex items-center justify-center text-slate-200 cursor-pointer ${
                    confirmandoPago ? "bg-slate-900/40 border-slate-800 text-slate-500" : "bg-slate-700 hover:bg-slate-600 border-slate-600"
                  }`}
                >
                  <HiX className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline ml-1 text-sm font-medium">Cancelar</span>
                </button>
              </div>

              <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-700/50">
                <p className="text-xs sm:text-sm text-slate-300">
                  Vas a pagar la cuota <span className="font-bold text-emerald-400">#{confirmData.cuotaNro ?? "?"}</span> de la póliza <span className="font-bold text-white">{confirmData.numeroPoliza}</span>.
                </p>

                {isWebAdmin && confirmData.oficinaLabel && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                     🏢 Oficina: {confirmData.oficinaLabel}
                  </div>
                )}

                <div className="mt-2 text-center">
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-slate-400 mb-1 font-bold">Importe a pagar</p>
                  <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-400">
                    $ {fmtMoney(confirmData.monto)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={handleCancelarConfirm}
                  disabled={confirmandoPago}
                  className={`h-11 px-4 rounded-xl border text-sm font-bold cursor-pointer transition-colors ${
                    confirmandoPago ? "bg-slate-900/40 border-slate-800 text-slate-600" : "bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                  }`}
                >
                  Corregir
                </button>
                <button
                  onClick={ejecutarPagoConfirmado}
                  disabled={confirmandoPago}
                  className={`h-11 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all ${
                    confirmandoPago ? "bg-emerald-900/50 text-emerald-200/40 border border-emerald-800" : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 border border-emerald-400"
                  }`}
                >
                  {confirmandoPago ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" /> Confirmando…</>
                  ) : (
                    <><HiCash className="w-5 h-5" /> Confirmar pago</>
                  )}
                </button>
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
                <button
                  onClick={cerrarDetalle}
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 rounded-lg sm:rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <HiX className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline ml-1 text-sm font-medium">Cerrar</span>
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

// 🚀 ACORDEÓN MÓVIL Y COLORES POR ESTADO (FECHAS SIEMPRE VISIBLES)
const CuotaRow = memo(
  function CuotaRow({ model, abrirDetalle, abrirPagar, onToggleObs, abrirModalFecha }) {
    const [expanded, setExpanded] = useState(false);

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

    return (
      <>
        <span className={`absolute left-0 top-0 h-full w-1.5 ${S.stripe} hidden sm:block`} aria-hidden />

        <div className={`mx-0 sm:mx-3 my-0 sm:my-2 sm:rounded-2xl border-b sm:border p-3 sm:p-4 shadow-md ${S.cardBg} ${S.border} relative transition-all duration-300`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${S.stripe} sm:hidden`} aria-hidden />

          <div className="pl-2 sm:pl-0 flex flex-col gap-2">
            
            {/* 1. ENCABEZADO: Cliente, Cuota, Badge y Monto */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`truncate max-w-[200px] sm:max-w-md font-bold text-sm sm:text-base ${state === 'paid' ? 'text-white' : state === 'overdue' ? 'text-rose-50' : 'text-slate-300'}`}>
                    {nombreCompleto}
                  </span>
                  {isWebAdmin && oficinaLabel && (
                    <span className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 bg-emerald-500/20 border-emerald-400/40 text-emerald-300 text-[9px] font-black uppercase tracking-wider shadow-sm">
                      {oficinaLabel}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-medium">
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 shadow-sm">Cuota #{cuota?.cuota_nro ?? "?"}</span>
                  {patente && <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 shadow-sm">{patente}</span>}
                </div>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end">
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${S.amountText}`}>
                  $ {montoTxt}
                </span>
                <span className={`mt-1.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border ${S.chipBg} ${S.chipText} ${S.chipBorder}`}>
                  {label}
                </span>
              </div>
            </div>

            {/* 2. CAJONES DE FECHAS (SIEMPRE VISIBLES) */}
            <div className="mt-2 flex flex-col sm:flex-row gap-2 w-full">
              <div className={`flex-1 flex items-center justify-between sm:justify-start sm:gap-3 rounded-lg px-3 py-2 border shadow-sm ${state === 'overdue' ? 'bg-rose-500/10 border-rose-500/20' : state === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold">Vence:</span>
                <span className={`text-sm font-black ${state === 'overdue' ? 'text-rose-400' : state === 'paid' ? 'text-emerald-300' : 'text-white'}`}>
                  {venceTxt || "—"}
                </span>
                {isWebAdmin && !cuota?.pagado && (
                  <button
                    type="button"
                    onClick={() => abrirModalFecha(cuota)}
                    className="ml-auto sm:ml-2 text-slate-400 hover:text-white transition p-1.5 cursor-pointer bg-slate-900/50 rounded-md hover:bg-slate-800 border border-slate-700/50 shadow-sm"
                    title="Cambiar fecha de vencimiento"
                  >
                    <HiPencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-between sm:justify-start sm:gap-3 rounded-lg px-3 py-2 border bg-sky-500/10 border-sky-500/20 shadow-sm">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-sky-400/80 font-bold">Cubre:</span>
                <span className="text-sm font-semibold text-sky-200">
                  {cubreDesdeTxt} <span className="text-[10px] text-sky-400/80 mx-0.5">al</span> {cubreHastaTxt}
                </span>
              </div>
            </div>

            {/* 3. BOTONES DE ACCIÓN (PAGAR / TICKET) */}
            <div className="flex items-center gap-2 w-full mt-2 pt-2 border-t border-slate-700/50">
                {!cuota?.pagado ? (
                  <button
                    onClick={() => abrirPagar(cuota)}
                    className={`w-full h-11 px-6 rounded-xl ${PALETTE.actionBtn} transition inline-flex items-center justify-center gap-2 font-bold cursor-pointer text-sm tracking-wide`}
                  >
                    <HiCash className="w-5 h-5" />
                    <span>PAGAR CUOTA</span>
                  </button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <div className="flex-1">
                       <ImprimirFacturaTicket
                          cliente={model?.pol?.cliente}
                          poliza={model?.pol}
                          cuota={cuotaPdf || cuota}
                          label="Imprimir Ticket"
                          className={`w-full h-11 px-4 rounded-xl border transition inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer ${PALETTE.ticketBtn}`}
                        />
                    </div>
                    <div className="flex-1">
                      <EnviarFacturaWhatsapp cuota={cuota}>
                        <button className={`w-full h-11 px-4 rounded-xl border ${PALETTE.neutralBtn} transition inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer`}>
                          <HiDeviceMobile className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>WhatsApp</span>
                        </button>
                      </EnviarFacturaWhatsapp>
                    </div>
                  </div>
                )}
            </div>

            {/* 4. BOTÓN ACORDEÓN */}
            <button 
               onClick={() => setExpanded(!expanded)} 
               className="w-full py-2 mt-1 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-white transition bg-slate-800/30 rounded-xl border border-slate-700/30 cursor-pointer shadow-sm"
            >
              {expanded ? <><HiChevronUp className="w-4 h-4"/> Ocultar detalles</> : <><HiChevronDown className="w-4 h-4"/> Ver más detalles</>}
            </button>

            {/* 5. DETALLES EXPANDIBLES (Patente, Alta, Notas) */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 pb-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-6 sm:gap-y-2 text-xs text-slate-300 border-t border-slate-700/50 mt-2">
                    
                    <div className="flex justify-between sm:justify-start sm:gap-2">
                      <span className="text-slate-500 font-medium">Vehículo:</span>
                      <span className="font-semibold text-right text-slate-200">{modelo || "—"}</span>
                    </div>

                    {altaTxt && (
                       <div className="flex justify-between sm:justify-start sm:gap-2">
                         <span className="text-slate-500 font-medium">Alta póliza:</span>
                         <span className="font-semibold text-right text-indigo-300">{altaTxt}</span>
                       </div>
                    )}

                    {!!pagaTxt && (
                       <div className="flex justify-between sm:justify-start sm:gap-2">
                         <span className="text-slate-500 font-medium">Pagada el:</span>
                         <span className="font-semibold text-right text-emerald-400">{pagaTxt}</span>
                       </div>
                    )}

                    {dias !== null && !cuota?.pagado && (
                       <div className="flex justify-between sm:justify-start sm:gap-2">
                         <span className="text-slate-500 font-medium">Estado:</span>
                         <span className="font-semibold text-right text-white">{dias < 0 ? `Atraso: ${Math.abs(dias)} días` : `Faltan: ${dias} días`}</span>
                       </div>
                    )}

                    <div className="col-span-1 sm:col-span-2 flex gap-2 mt-3 pt-3 border-t border-slate-700/30">
                       <button
                        onClick={() => abrirDetalle(cuota)}
                        className={`h-9 px-4 rounded-xl border ${PALETTE.neutralBtn} inline-flex items-center justify-center gap-1.5 text-xs font-bold flex-1 sm:flex-none cursor-pointer`}
                      >
                        <HiQuestionMarkCircle className="w-4 h-4" /> Info completa
                      </button>

                      {hasObs && (
                        <button
                          onClick={() => onToggleObs(cuota?.id)}
                          className={`h-9 px-4 rounded-xl border ${S.btn} inline-flex items-center justify-center gap-1.5 text-xs font-bold flex-1 sm:flex-none cursor-pointer shadow-sm`}
                        >
                          <HiExclamationCircle className="w-4 h-4" /> Nota / Obs
                        </button>
                      )}
                    </div>

                  </div>

                  {hasObs && isObsOpen && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className={`mt-3 rounded-xl border px-3 py-3 ${S.noteBg} ${S.noteText} ${S.border} shadow-inner`}>
                      <div className="flex items-start gap-2">
                        <HiExclamationCircle className="w-5 h-5 mt-0.5 shrink-0 opacity-80" />
                        <div className="text-[11px] sm:text-sm whitespace-pre-wrap break-words">
                          <span className="font-black uppercase tracking-wide opacity-75">Obs: </span>{observacion}
                        </div>
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
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 shadow-sm">
      <span className="text-slate-400 text-[11px] sm:text-sm font-medium">{label}</span>
      <span className="text-white truncate max-w-[65%] text-right font-bold text-[11px] sm:text-sm">
        {value}
      </span>
    </div>
  );
}