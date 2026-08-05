// src/pages/ServiciosPage.jsx  (diseño Duo)
import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  HiOutlineCog,
  HiOutlineRefresh,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineExclamationCircle,
  HiOutlineClock,
  HiOutlineCash,
  HiOutlineCalendar,
  HiOutlineLightningBolt,
  HiOutlineWifi,
  HiOutlineHome,
  HiOutlinePhone,
  HiOutlineFire,
  HiOutlineCloud,
  HiCheckCircle,
} from "react-icons/hi";
import { toast } from "react-toastify";

import {
  fetchPagosMes,
  fetchResumenMes,
  fetchServicios,
  generarPagosMes,
} from "../store/slices/serviciosSlice";

import ServiciosCrudModal from "../components/servicios/ServiciosCrudModal";
import RegistrarPagoModal from "../components/servicios/RegistrarPagoModal";

dayjs.locale("es");

const getIcon = (nombre = "") => {
  const n = nombre.toLowerCase();
  if (n.includes("luz") || n.includes("edenor") || n.includes("edesur")) return HiOutlineLightningBolt;
  if (n.includes("internet") || n.includes("wifi") || n.includes("telecentro")) return HiOutlineWifi;
  if (n.includes("alquiler") || n.includes("renta")) return HiOutlineHome;
  if (n.includes("telefono") || n.includes("celular")) return HiOutlinePhone;
  if (n.includes("gas")) return HiOutlineFire;
  if (n.includes("agua")) return HiOutlineCloud;
  return HiOutlineCash;
};

// 🚀 Sin decimales: $40.000
const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

export default function ServiciosPage() {
  const dispatch = useDispatch();
  const { pagos, pagosStatus, servicios, serviciosStatus } = useSelector((s) => s.servicios);

  const [periodo, setPeriodo] = useState(dayjs().format("YYYY-MM"));
  const [crudOpen, setCrudOpen] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [autoGenerating, setAutoGenerating] = useState(false);

  // 🚀 Memoria de qué meses ya intentamos auto-generar (para no hacerlo en loop)
  const autoGenAttempted = useRef(new Set());

  useEffect(() => {
    dispatch(fetchServicios({ activo: true }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchPagosMes({ periodo }));
    dispatch(fetchResumenMes({ periodo }));
  }, [dispatch, periodo]);

  // 🚀 AUTO-GENERAR para CUALQUIER mes navegado (no solo el actual)
  useEffect(() => {
    const yaIntentado = autoGenAttempted.current.has(periodo);
    const serviciosActivos = servicios.filter(s => s.activo);

    // 🐛 FIX: los pagos cargados tienen que ser DEL período actual. Al cambiar de
    //   mes, `pagos` todavía tiene los del mes anterior por un instante; sin este
    //   chequeo se disparaba una generación espuria comparando contra datos viejos.
    const pagosSonDeEstePeriodo = pagos.length === 0 || pagos[0]?.periodo === periodo;

    // Condiciones para auto-generar:
    // - No lo intentamos ya en este mes
    // - Cargaron las plantillas y los pagos, y los pagos son de ESTE mes
    // - Faltan pagos: hay menos pagos que servicios activos
    // - Hay servicios activos y no está corriendo otra generación
    const faltanPagos = !yaIntentado &&
      pagosStatus === "succeeded" &&
      serviciosStatus === "succeeded" &&
      pagosSonDeEstePeriodo &&
      serviciosActivos.length > pagos.length &&
      serviciosActivos.length > 0 &&
      !autoGenerating;

    if (faltanPagos) {
      autoGenAttempted.current.add(periodo);
      handleAutoGenerar();
    }
    // eslint-disable-next-line
  }, [pagosStatus, serviciosStatus, pagos, servicios, periodo]);

  const handleAutoGenerar = async () => {
    const [anio, mes] = periodo.split("-");
    try {
      setAutoGenerating(true);
      const res = await dispatch(generarPagosMes({ anio: Number(anio), mes: Number(mes) })).unwrap();
      if (res.creados > 0) {
        const periodoLabelLocal = dayjs(periodo + "-01").format("MMMM YYYY");
        toast.info(`✨ ${res.creados} pago${res.creados !== 1 ? "s" : ""} generado${res.creados !== 1 ? "s" : ""} para ${periodoLabelLocal}`);
        dispatch(fetchPagosMes({ periodo }));
        dispatch(fetchResumenMes({ periodo }));
      }
    } catch {} finally {
      setAutoGenerating(false);
    }
  };

  const handleGenerarManual = async () => {
    const [anio, mes] = periodo.split("-");
    try {
      const res = await dispatch(generarPagosMes({ anio: Number(anio), mes: Number(mes) })).unwrap();
      toast.success(res.mensaje || `Generados ${res.creados} pagos`);
      // Reseteamos la memoria de este mes así sigue auto-generando si agregás servicios
      autoGenAttempted.current.delete(periodo);
      dispatch(fetchPagosMes({ periodo }));
      dispatch(fetchResumenMes({ periodo }));
    } catch {
      toast.error("Error al generar pagos");
    }
  };

  const mesAnterior = () => setPeriodo(dayjs(periodo + "-01").subtract(1, "month").format("YYYY-MM"));
  const mesSiguiente = () => setPeriodo(dayjs(periodo + "-01").add(1, "month").format("YYYY-MM"));
  const mesActual = () => setPeriodo(dayjs().format("YYYY-MM"));

  // Separar pagos en POR PAGAR y PAGADOS
  const { porPagar, pagados, stats } = useMemo(() => {
    const hoy = dayjs().startOf("day");
    const porPagar = [];
    const pagados = [];
    let totalAPagar = 0, totalPagado = 0, vencidos = 0, porVencer = 0;

    pagos.forEach((p) => {
      const dias = dayjs(p.fecha_vencimiento).diff(hoy, "day");
      const enriched = { ...p, _dias: dias };
      if (p.estado === "PAGADO") {
        pagados.push(enriched);
        totalPagado += Number(p.monto_real || 0);
      } else {
        porPagar.push(enriched);
        totalAPagar += Number(p.servicio_monto_estimado || 0);
        if (dias < 0) vencidos++;
        else if (dias <= 3) porVencer++;
      }
    });

    porPagar.sort((a, b) => a._dias - b._dias);
    pagados.sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));

    return {
      porPagar,
      pagados,
      stats: { totalAPagar, totalPagado, vencidos, porVencer, total: pagos.length },
    };
  }, [pagos]);

  const periodoLabel = useMemo(
    () => dayjs(periodo + "-01").format("MMMM YYYY").replace(/^\w/, (c) => c.toUpperCase()),
    [periodo]
  );

  const esMesActual = periodo === dayjs().format("YYYY-MM");

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 sm:px-6 lg:px-10 py-6 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* ═══════════ HEADER ═══════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-titulo dark:text-titulo-dark">
              Servicios y Gastos Fijos
            </h1>
            <p className="text-sm font-bold text-suave dark:text-suave-dark mt-0.5">
              Pagos recurrentes mensuales
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCrudOpen(true)}
              className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl text-sm font-black bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark hover:border-oficina text-titulo dark:text-titulo-dark transition-colors"
            >
              <HiOutlineCog className="w-4 h-4" />
              Servicios
              {servicios.length > 0 && (
                <span className="ml-1 text-[10px] bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark rounded-lg px-1.5 py-0.5 font-black">
                  {servicios.filter((s) => s.activo).length}
                </span>
              )}
            </button>
            <button
              onClick={handleGenerarManual}
              disabled={autoGenerating}
              className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl text-sm font-black bg-oficina text-white border-2 border-oficina shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            >
              <HiOutlineRefresh className={`w-4 h-4 ${autoGenerating ? "animate-spin" : ""}`} />
              Generar pagos
            </button>
          </div>
        </div>

        {/* ═══════════ DASHBOARD STATS ═══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total a pagar"
            value={fmt(stats.totalAPagar)}
            sub={`${porPagar.length} pendiente${porPagar.length !== 1 ? "s" : ""}`}
            icon={HiOutlineCash}
            tone="sky"
          />
          <StatCard
            label="Pagado este mes"
            value={fmt(stats.totalPagado)}
            sub={`${pagados.length} ${pagados.length === 1 ? "pago" : "pagos"}`}
            icon={HiOutlineCheck}
            tone="emerald"
          />
          <StatCard
            label="Por vencer"
            value={stats.porVencer}
            sub="próximos 3 días"
            icon={HiOutlineClock}
            tone="amber"
          />
          <StatCard
            label="Vencidos"
            value={stats.vencidos}
            sub="requieren atención"
            icon={HiOutlineExclamationCircle}
            tone="rose"
          />
        </div>

        {/* ═══════════ SELECTOR DE MES ═══════════ */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-1">
            <button
              onClick={mesAnterior}
              className="p-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-suave dark:text-suave-dark transition-colors"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={mesActual}
              className="px-3 py-1 text-sm font-black text-titulo dark:text-titulo-dark min-w-[140px] text-center hover:text-oficina transition-colors"
            >
              <HiOutlineCalendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {periodoLabel}
            </button>
            <button
              onClick={mesSiguiente}
              className="p-2 rounded-xl hover:bg-surface dark:hover:bg-surface-dark text-suave dark:text-suave-dark transition-colors"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
          {!esMesActual && (
            <button onClick={mesActual} className="text-xs font-black text-oficina hover:underline">
              Volver al mes actual
            </button>
          )}
        </div>

        {/* ═══════════ CARGANDO / GENERANDO / SIN SERVICIOS ═══════════ */}
        {pagosStatus === "loading" || autoGenerating ? (
          <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl py-16 text-center">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-oficina/30 border-t-oficina rounded-full animate-spin" />
            <p className="text-sm font-bold text-suave dark:text-suave-dark">
              {autoGenerating ? `Generando pagos de ${periodoLabel}...` : "Cargando..."}
            </p>
          </div>
        ) : servicios.length === 0 ? (
          <EmptyNoServicios onOpen={() => setCrudOpen(true)} />
        ) : porPagar.length === 0 && pagados.length === 0 ? (
          <EmptySinPagos onGenerar={handleGenerarManual} periodoLabel={periodoLabel} />
        ) : (
          <>
            {/* ═══════════ SECCIÓN POR PAGAR ═══════════ */}
            {porPagar.length > 0 && (
              <Seccion
                titulo="Por pagar"
                count={porPagar.length}
                tone="sky"
                icon={HiOutlineClock}
              >
                <Tabla pagos={porPagar} onClick={setPagoSeleccionado} />
              </Seccion>
            )}

            {/* ═══════════ SECCIÓN PAGADOS ═══════════ */}
            {pagados.length > 0 && (
              <Seccion
                titulo="Pagados"
                count={pagados.length}
                tone="emerald"
                icon={HiCheckCircle}
              >
                <Tabla pagos={pagados} onClick={setPagoSeleccionado} pagados />
              </Seccion>
            )}

            {/* Estado: todo pagado */}
            {porPagar.length === 0 && pagados.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-ingreso/10 border-2 border-ingreso/30 rounded-3xl p-4 flex items-center gap-3"
              >
                <HiCheckCircle className="w-6 h-6 text-ingreso shrink-0" />
                <div>
                  <p className="text-sm font-black text-ingreso dark:text-ingreso-claro">
                    ¡Todo pagado en {periodoLabel}! 🎉
                  </p>
                  <p className="text-xs font-bold text-ingreso dark:text-ingreso-claro/80 mt-0.5">
                    No tenés cuentas pendientes
                  </p>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* MODALES */}
      <ServiciosCrudModal isOpen={crudOpen} onClose={() => setCrudOpen(false)} />
      {pagoSeleccionado && (
        <RegistrarPagoModal
          pago={pagoSeleccionado}
          onClose={() => setPagoSeleccionado(null)}
          onSuccess={() => {
            setPagoSeleccionado(null);
            dispatch(fetchPagosMes({ periodo }));
            dispatch(fetchResumenMes({ periodo }));
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SECCIÓN (Por pagar / Pagados)
// ════════════════════════════════════════════════════════════
function Seccion({ titulo, count, tone, icon: Icon, children }) {
  const pin = {
    sky: "text-oficina border-oficina/35 bg-oficina/10",
    emerald: "text-ingreso border-ingreso/35 bg-ingreso/10",
  };
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${tone === "sky" ? "text-oficina" : "text-ingreso"}`} />
        <h2 className="text-sm font-black uppercase tracking-[0.08em] text-titulo dark:text-titulo-dark">
          {titulo}
        </h2>
        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border-2 ${pin[tone]}`}>
          {count}
        </span>
      </div>
      <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TABLA
// ════════════════════════════════════════════════════════════
function Tabla({ pagos, onClick, pagados = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
              Servicio
            </th>
            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark hidden md:table-cell">
              Categoría
            </th>
            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
              {pagados ? "Fecha pago" : "Vencimiento"}
            </th>
            <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
              Estado
            </th>
            <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
              Monto
            </th>
            <th className="text-right px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {pagos.map((pago, i) => (
              <Fila key={pago.id} pago={pago} index={i} onClick={() => onClick(pago)} pagado={pagados} />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FILA
// ════════════════════════════════════════════════════════════
function Fila({ pago, index, onClick, pagado }) {
  const Icon = getIcon(pago.servicio_nombre);
  const dias = pago._dias;
  const vencido = !pagado && dias < 0;
  const urgente = !pagado && dias >= 0 && dias <= 3;

  let estadoBadge, estadoColor, estadoIcon, iconBg, fechaMostrar;

  if (pagado) {
    estadoBadge = "Pagado";
    estadoColor = "text-ingreso border-ingreso/35 bg-ingreso/10";
    estadoIcon = <HiOutlineCheck className="w-3 h-3" />;
    iconBg = "bg-ingreso/10 text-ingreso border-ingreso/30";
    fechaMostrar = dayjs(pago.fecha_pago).format("DD/MM");
  } else if (vencido) {
    estadoBadge = `Vencido (${Math.abs(dias)}d)`;
    estadoColor = "text-egreso border-egreso/35 bg-egreso/10";
    estadoIcon = <HiOutlineExclamationCircle className="w-3 h-3" />;
    iconBg = "bg-egreso/10 text-egreso border-egreso/30";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  } else if (dias === 0) {
    estadoBadge = "Vence HOY";
    estadoColor = "text-tarjeta border-tarjeta/35 bg-tarjeta/10";
    estadoIcon = <HiOutlineClock className="w-3 h-3" />;
    iconBg = "bg-tarjeta/10 text-tarjeta border-tarjeta/30";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  } else if (urgente) {
    estadoBadge = `En ${dias} día${dias !== 1 ? "s" : ""}`;
    estadoColor = "text-tarjeta border-tarjeta/35 bg-tarjeta/10";
    estadoIcon = <HiOutlineClock className="w-3 h-3" />;
    iconBg = "bg-tarjeta/10 text-tarjeta border-tarjeta/30";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  } else {
    estadoBadge = "Pendiente";
    estadoColor = "text-suave dark:text-suave-dark border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark";
    estadoIcon = null;
    iconBg = "bg-oficina/10 text-oficina border-oficina/30";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  }

  const monto = pagado ? pago.monto_real : pago.servicio_monto_estimado;

  // Franja de color al inicio de la fila según estado
  const franja = pagado
    ? "border-l-4 border-ingreso/60"
    : vencido
      ? "border-l-4 border-egreso"
      : "border-l-4 border-egreso-claro";

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className={`border-b-2 border-linea/50 dark:border-linea-dark/50 cursor-pointer transition group ${
        pagado
          ? "hover:bg-surface dark:hover:bg-surface-dark"
          : vencido
            ? "bg-egreso/[0.06] hover:bg-egreso/10"
            : "hover:bg-surface dark:hover:bg-surface-dark"
      }`}
    >
      <td className={`px-4 py-3 ${franja}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`font-black truncate text-sm ${pagado ? "text-suave dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"}`}>
              {pago.servicio_nombre}
            </p>
            {pago.servicio_proveedor && (
              <p className="text-xs font-bold text-suave dark:text-suave-dark truncate">{pago.servicio_proveedor}</p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs font-bold text-suave dark:text-suave-dark">
          {pago.servicio_categoria || "—"}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm font-black text-titulo dark:text-titulo-dark tabular-nums">
          {fechaMostrar}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black border-2 ${estadoColor}`}>
          {estadoIcon}
          {estadoBadge}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        <span className={`text-base font-mono font-black tabular-nums ${pagado ? "text-suave dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"}`}>
          ${Number(monto || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-all border-2 ${
            pagado
              ? "text-suave dark:text-suave-dark border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-oficina hover:text-oficina"
              : "bg-oficina text-white border-oficina shadow-[0_3px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5"
          }`}
        >
          {pagado ? "Ver" : "Pagar"}
        </button>
      </td>
    </motion.tr>
  );
}

// ════════════════════════════════════════════════════════════
// STAT CARD
// ════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, icon: Icon, tone }) {
  const tones = {
    sky: "border-oficina/35",
    emerald: "border-ingreso/35",
    amber: "border-tarjeta/35",
    rose: "border-egreso/35",
  };
  const iconTones = {
    sky: "bg-oficina text-white shadow-[0_4px_0_var(--color-oficina-fuerte)]",
    emerald: "bg-ingreso text-white shadow-[0_4px_0_var(--color-ingreso-fuerte)]",
    amber: "bg-tarjeta text-white shadow-[0_4px_0_#d97706]",
    rose: "bg-egreso text-white shadow-[0_4px_0_var(--color-egreso-fuerte)]",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card dark:bg-card-dark rounded-2xl border-2 ${tones[tone]} p-4 flex items-start gap-3`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconTones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-black text-titulo dark:text-titulo-dark tabular-nums mt-0.5 leading-none">
          {value}
        </p>
        <p className="text-[10px] font-bold text-suave dark:text-suave-dark mt-1">{sub}</p>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════
// EMPTY STATES
// ════════════════════════════════════════════════════════════
function EmptyNoServicios({ onOpen }) {
  return (
    <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl py-16 px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-oficina/10 border-2 border-oficina/30 flex items-center justify-center">
        <HiOutlineCash className="w-7 h-7 text-oficina" />
      </div>
      <h3 className="text-base font-black text-titulo dark:text-titulo-dark mb-1">
        Sin servicios cargados
      </h3>
      <p className="text-sm font-bold text-suave dark:text-suave-dark mb-5 max-w-sm mx-auto">
        Cargá tus gastos fijos una sola vez y te aviso 3 días antes de cada vencimiento.
      </p>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl text-sm font-black bg-oficina text-white border-2 border-oficina shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all"
      >
        <HiOutlinePlus className="w-4 h-4" />
        Agregar primer servicio
      </button>
    </div>
  );
}

function EmptySinPagos({ onGenerar, periodoLabel }) {
  return (
    <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl py-16 px-6 text-center">
      <p className="text-sm font-bold text-suave dark:text-suave-dark mb-4">
        No hay pagos para {periodoLabel}
      </p>
      <button
        onClick={onGenerar}
        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-black bg-oficina text-white border-2 border-oficina shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 transition-all"
      >
        <HiOutlineRefresh className="w-3.5 h-3.5" />
        Generar pagos del mes
      </button>
    </div>
  );
}
