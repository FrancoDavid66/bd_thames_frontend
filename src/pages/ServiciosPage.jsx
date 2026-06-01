// src/pages/ServiciosPage.jsx
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

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

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

    // Condiciones para auto-generar:
    // - No lo intentamos ya en este mes
    // - Cargaron las plantillas y los pagos
    // - Faltan pagos: hay menos pagos que servicios activos
    // - Hay servicios activos
    // - No está corriendo otra generación
    const faltanPagos = !yaIntentado &&
      pagosStatus === "succeeded" &&
      serviciosStatus === "succeeded" &&
      serviciosActivos.length > pagos.length &&
      serviciosActivos.length > 0 &&
      !autoGenerating;

    if (faltanPagos) {
      autoGenAttempted.current.add(periodo);
      handleAutoGenerar();
    }
    // eslint-disable-next-line
  }, [pagosStatus, serviciosStatus, pagos.length, servicios.length, periodo]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-10 py-6 transition-colors">
      <div className="max-w-7xl mx-auto">

        {/* ═══════════ HEADER ═══════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Servicios y Gastos Fijos
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pagos recurrentes mensuales
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCrudOpen(true)}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <HiOutlineCog className="w-4 h-4" />
              Servicios
              {servicios.length > 0 && (
                <span className="ml-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md px-1.5 py-0.5 font-semibold">
                  {servicios.filter((s) => s.activo).length}
                </span>
              )}
            </button>
            <button
              onClick={handleGenerarManual}
              disabled={autoGenerating}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition disabled:opacity-50"
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
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
            <button
              onClick={mesAnterior}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={mesActual}
              className="px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[140px] text-center hover:text-sky-500"
            >
              <HiOutlineCalendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {periodoLabel}
            </button>
            <button
              onClick={mesSiguiente}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>
          {!esMesActual && (
            <button onClick={mesActual} className="text-xs text-sky-500 hover:underline">
              Volver al mes actual
            </button>
          )}
        </div>

        {/* ═══════════ CARGANDO / GENERANDO / SIN SERVICIOS ═══════════ */}
        {pagosStatus === "loading" || autoGenerating ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">
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
                className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 flex items-center gap-3"
              >
                <HiCheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    ¡Todo pagado en {periodoLabel}! 🎉
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
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
  const tones = {
    sky: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  };
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-5 h-5 ${tone === "sky" ? "text-sky-500" : "text-emerald-500"}`} />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {titulo}
        </h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tones[tone]}`}>
          {count}
        </span>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
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
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Servicio
            </th>
            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden md:table-cell">
              Categoría
            </th>
            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {pagados ? "Fecha pago" : "Vencimiento"}
            </th>
            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estado
            </th>
            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monto
            </th>
            <th className="text-right px-4 py-2.5 w-20"></th>
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
    estadoColor = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    estadoIcon = <HiOutlineCheck className="w-3 h-3" />;
    iconBg = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400";
    fechaMostrar = dayjs(pago.fecha_pago).format("DD/MM");
  } else if (vencido) {
    estadoBadge = `Vencido (${Math.abs(dias)}d)`;
    estadoColor = "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400";
    estadoIcon = <HiOutlineExclamationCircle className="w-3 h-3" />;
    iconBg = "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  } else if (dias === 0) {
    estadoBadge = "Vence HOY";
    estadoColor = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    estadoIcon = <HiOutlineClock className="w-3 h-3" />;
    iconBg = "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  } else if (urgente) {
    estadoBadge = `En ${dias} día${dias !== 1 ? "s" : ""}`;
    estadoColor = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    estadoIcon = <HiOutlineClock className="w-3 h-3" />;
    iconBg = "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  } else {
    estadoBadge = "Pendiente";
    estadoColor = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    estadoIcon = null;
    iconBg = "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400";
    fechaMostrar = dayjs(pago.fecha_vencimiento).format("DD/MM");
  }

  const monto = pagado ? pago.monto_real : pago.servicio_monto_estimado;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className={`border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition group ${
        pagado
          ? "hover:bg-slate-50 dark:hover:bg-slate-800/40"
          : vencido
            ? "bg-rose-50/70 dark:bg-rose-900/10 hover:bg-rose-100/70 dark:hover:bg-rose-900/20"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      <td className={`px-4 py-3 ${pagado ? "" : vencido ? "border-l-4 border-rose-600" : "border-l-4 border-rose-400"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold truncate text-sm ${pagado ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
              {pago.servicio_nombre}
            </p>
            {pago.servicio_proveedor && (
              <p className="text-xs text-slate-400 truncate">{pago.servicio_proveedor}</p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {pago.servicio_categoria || "—"}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium tabular-nums">
          {fechaMostrar}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${estadoColor}`}>
          {estadoIcon}
          {estadoBadge}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        <span className={`text-sm font-bold tabular-nums ${pagado ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
          ${Number(monto || 0).toLocaleString("es-AR")}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
            pagado
              ? "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              : "bg-sky-500 hover:bg-sky-600 text-white shadow-sm"
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
    sky: "from-sky-500/10 to-sky-500/5 border-sky-200 dark:border-sky-900/50 text-sky-600 dark:text-sky-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400",
    rose: "from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-3"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${tones[tone]} border`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
          {value}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════
// EMPTY STATES
// ════════════════════════════════════════════════════════════
function EmptyNoServicios({ onOpen }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 px-6 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
        <HiOutlineCash className="w-7 h-7 text-sky-500" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
        Sin servicios cargados
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">
        Cargá tus gastos fijos una sola vez y te aviso 3 días antes de cada vencimiento.
      </p>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition"
      >
        <HiOutlinePlus className="w-4 h-4" />
        Agregar primer servicio
      </button>
    </div>
  );
}

function EmptySinPagos({ onGenerar, periodoLabel }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 px-6 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        No hay pagos para {periodoLabel}
      </p>
      <button
        onClick={onGenerar}
        className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition"
      >
        <HiOutlineRefresh className="w-3.5 h-3.5" />
        Generar pagos del mes
      </button>
    </div>
  );
}