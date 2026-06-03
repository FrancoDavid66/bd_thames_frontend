// src/pages/BalancesPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus } from "react-icons/fa";
import { HiCog, HiOfficeBuilding } from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios"; // 🚀 IMPORTAMOS AXIOS
dayjs.locale("es");

// 🚀 IMPORTAMOS CONTEXTO PARA SEGURIDAD
import { useAuth } from "../context/AuthContext";

import { fetchIngresos } from "../store/slices/ingresosSlice";
import { fetchEgresos } from "../store/slices/egresosSlice";
import { fetchBalanceDiario } from "../store/slices/balanceSlice";

import IngresoCreateModal from "../components/balanzes/IngresoCreateModal";
import EgresoCreateModal from "../components/balanzes/EgresoCreateModal";
import IngresoTable from "../components/balanzes/IngresoTable";
import EgresoTable from "../components/balanzes/EgresoTable";

import DescargarBalanceDiarioButton from "../components/balanzes/DescargarBalanceDiarioButton";
import BalanceChart from "../components/balanzes/BalanceChart";
import BalanceExportPanel from "../components/balanzes/BalanceExportPanel";
import HistorialPagosPanel from "../components/balanzes/HistorialPagosPanel";
import HistorialIngresosPanel from "../components/balanzes/HistorialIngresosPanel";
import HistorialEgresosPanel from "../components/balanzes/HistorialEgresosPanel";
import TransferenciasPanel from "../components/balanzes/TransferenciasPanel";
import BalanzesSettingsModal from "../components/balanzes/BalanzesSettingsModal";

/* -------------------- Helpers -------------------- */
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* 🚀 KPI card OPTIMIZADO — más legible: etiqueta tenue, número grande y claro */
function KpiCard({ title, value, variant = "blue" }) {
  const variants = {
    green: "from-emerald-500/15 to-emerald-500/[0.04] border-emerald-500/30",
    red: "from-rose-500/15 to-rose-500/[0.04] border-rose-500/30",
    blue: "from-sky-500/15 to-sky-500/[0.04] border-sky-500/30",
    amber: "from-amber-500/15 to-amber-500/[0.04] border-amber-500/30",
  };
  return (
    <div className={`bg-gradient-to-br ${variants[variant]} border px-4 py-3 rounded-2xl shadow-sm min-w-0 flex flex-col justify-center`}>
      <h3 className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-400 truncate" title={title}>
        {title}
      </h3>
      <p className="text-lg sm:text-2xl font-black mt-1 tracking-tight text-zinc-50 truncate">
        ${fmtMoney(value)}
      </p>
    </div>
  );
}

/* 🚀 FILA DE KPIs (Admin) — reorganizada en 2 bloques con aire para no amontonar */
const KpiRowGroup = ({ title, metrics, suffix, highlight }) => (
  <div className={`rounded-2xl border shadow-sm overflow-hidden ${highlight ? "border-sky-500/40 bg-sky-500/[0.04]" : "border-zinc-800 bg-zinc-950/40"}`}>
    {/* Encabezado de la sucursal: el (Día/Mes) se muestra UNA sola vez acá */}
    <div className={`flex items-center gap-2 px-4 py-3 border-b ${highlight ? "border-sky-500/30" : "border-zinc-800/80"}`}>
      <span className="text-base shrink-0">{highlight ? "🌍" : "🏢"}</span>
      <h2 className={`text-sm font-bold tracking-wide truncate ${highlight ? "text-sky-300" : "text-zinc-200"}`}>
        {title}
      </h2>
      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
        {suffix}
      </span>
    </div>

    <div className="p-4 space-y-4">
      {/* Bloque 1: Ingresos */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-2">Ingresos</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard title="Total" value={metrics.tIn} variant="green" />
          <KpiCard title="Efectivo" value={metrics.tInEfe} variant="green" />
          <KpiCard title="Transferencia" value={metrics.tInTransf} variant="green" />
        </div>
      </div>

      {/* Bloque 2: Egresos y resultado */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Egresos y resultado</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard title="Egresos" value={metrics.tEg} variant="red" />
          <KpiCard title="Neto" value={metrics.tBal} variant="blue" />
          <KpiCard title="Caja Chica" value={metrics.tCajaChica} variant="amber" />
        </div>
      </div>
    </div>
  </div>
);

const TABS = [
  { id: "resumen",   label: "Resumen" },
  { id: "grafico",   label: "Gráfico" },
  { id: "detalle",   label: "Detalle" },
  { id: "historial",         label: "📋 Historial de Pagos" },
  { id: "hist_ingresos",     label: "💰 Historial de Ingresos" },
  { id: "hist_egresos",      label: "💸 Historial de Egresos" },
  { id: "transferencias",    label: "🏦 Transferencias" },
];

const BalancesPage = () => {
  const dispatch = useDispatch();

  // 🚀 ESCUDO DE SUCURSAL
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.codigo || user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  const [oficinaSeleccionada, setOficinaSeleccionada] = useState("ALL");
  const [adminTimeView, setAdminTimeView] = useState("dia"); 

  const { list: ingresos = [], status: ingresosStatus } = useSelector((s) => s.ingresos || {});
  const { list: egresos = [], status: egresosStatus } = useSelector((s) => s.egresos || {});
  
  const balanceState = useSelector((s) => s.balance || {});
  const balanceData = balanceState?.data;
  const balanceStatus = balanceState?.status;

  // 🚀 ESTADO LOCAL PARA GARANTIZAR QUE CARGUEN LAS OFICINAS
  const [oficinasAdmin, setOficinasAdmin] = useState([]);

  useEffect(() => {
    // 🚀 PEDIMOS LA LISTA OFICIAL A LA BASE DE DATOS SI ES ADMIN
    if (isWebAdmin) {
      const token = localStorage.getItem("access_token");
      const baseURL = import.meta.env.VITE_API_URL;
      
      axios.get(`${baseURL}usuarios/oficinas/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        // Axios puede devolver { results: [...] } si hay paginación, o el array directo
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setOficinasAdmin(data);
      })
      .catch(err => console.error("Error al cargar lista de sucursales:", err));
    }
  }, [isWebAdmin]);

  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [activeTab, setActiveTab] = useState("resumen");
  const [resumenMovTab, setResumenMovTab] = useState("ingresos");
  
  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [chartYear, setChartYear] = useState(() => dayjs().year());
  const [chartMonth, setChartMonth] = useState("all"); 

  // REFRESCO TOTAL
  useEffect(() => {
    const ofi = isWebAdmin ? oficinaSeleccionada : userOficina;
    // Primer y último día del mes actual para traer todo el mes
    const desde = dayjs().startOf("month").format("YYYY-MM-DD");
    const hasta  = dayjs().endOf("month").format("YYYY-MM-DD");
    dispatch(fetchBalanceDiario({ fecha, oficina: ofi }));
    dispatch(fetchIngresos({ oficina: ofi, desde, hasta, page_size: 500 }));
    dispatch(fetchEgresos({  oficina: ofi, desde, hasta, page_size: 500 }));
  }, [dispatch, fecha, oficinaSeleccionada, isWebAdmin, userOficina]);

  const hoy = useMemo(() => dayjs(), []);
  const mesActual = hoy.month();
  const anioActual = hoy.year();

  // El backend ya filtra por mes (fecha__gte/lte), solo aplicamos filtro de oficina
  const ingresosMensuales = useMemo(() =>
    ingresos.filter((i) => {
      if (!isWebAdmin) return true;
      return oficinaSeleccionada === "ALL" || String(i.oficina) === String(oficinaSeleccionada);
    }),
    [ingresos, isWebAdmin, oficinaSeleccionada]
  );

  const egresosMensuales = useMemo(() =>
    egresos.filter((e) => {
      if (!isWebAdmin) return true;
      return oficinaSeleccionada === "ALL" || String(e.oficina) === String(oficinaSeleccionada);
    }),
    [egresos, isWebAdmin, oficinaSeleccionada]
  );

  // ==========================================
  // 🚀 FUNCIÓN MÁGICA: Extrae métricas Día/Mes por Oficina
  // ==========================================
  const getMetrics = useCallback((ofiCode, timeView) => {
    if (timeView === "dia") {
      let source = balanceData;
      if (ofiCode !== "ALL" && ofiCode !== null) {
        source = balanceData?.por_oficina?.find(o => String(o.scope.oficina) === String(ofiCode)) || null;
      } else if (ofiCode === null) {
        source = balanceData?.sin_oficina || null;
      }

      const tIn = toNumber(source?.totales?.ingresos);
      const tEg = toNumber(source?.totales?.egresos);
      const tBal = toNumber(source?.totales?.balance);
      const tCajaChica = toNumber(source?.totales?.saldo_caja_chica);
      const inForma = source?.ingresos?.por_forma_pago || [];
      const tInEfe = toNumber(inForma.find(f => f.forma_pago === "EFECTIVO")?.total);
      const tInTransf = toNumber(inForma.find(f => f.forma_pago === "TRANSFERENCIA")?.total);

      return { tIn, tEg, tBal, tCajaChica, tInEfe, tInTransf };
    } else {
      const ingFiltrados = ofiCode === "ALL" ? ingresosMensuales : ofiCode === null ? ingresosMensuales.filter(i => !i.oficina) : ingresosMensuales.filter(i => String(i.oficina) === String(ofiCode));
      const egFiltrados = ofiCode === "ALL" ? egresosMensuales : ofiCode === null ? egresosMensuales.filter(e => !e.oficina) : egresosMensuales.filter(e => String(e.oficina) === String(ofiCode));

      const tIn = ingFiltrados.reduce((acc, i) => acc + toNumber(i.monto), 0);
      const tEg = egFiltrados.reduce((acc, e) => acc + toNumber(e.monto), 0);
      const tBal = tIn - tEg;
      const tInEfe = ingFiltrados.filter(i => (i.forma_pago || '').toUpperCase() === 'EFECTIVO').reduce((acc, i) => acc + toNumber(i.monto), 0);
      const tInTransf = ingFiltrados.filter(i => (i.forma_pago || '').toUpperCase() === 'TRANSFERENCIA').reduce((acc, i) => acc + toNumber(i.monto), 0);
      const tEgEfe = egFiltrados.filter(e => (e.forma_pago || 'EFECTIVO').toUpperCase() === 'EFECTIVO').reduce((acc, e) => acc + toNumber(e.monto), 0);
      const tCajaChica = tInEfe - tEgEfe;

      return { tIn, tEg, tBal, tCajaChica, tInEfe, tInTransf };
    }
  }, [balanceData, ingresosMensuales, egresosMensuales]);

  const suffix = adminTimeView === "dia" ? "(Día)" : "(Mes)";
  const cargando = ingresosStatus === "loading" || egresosStatus === "loading" || balanceStatus === "loading";

  // 🚀 MÉTRICAS PARA EL EMPLEADO (Solo del Día)
  const empMetricsDia = getMetrics("ALL", "dia");

  const yearsOptions = useMemo(() => {
    const yearsSet = new Set();
    [...ingresos, ...egresos].forEach((item) => {
      if (!item.fecha) return;
      const y = dayjs(item.fecha).year();
      if (Number.isFinite(y)) yearsSet.add(y);
    });
    if (yearsSet.size === 0) yearsSet.add(anioActual);
    return Array.from(yearsSet).sort();
  }, [ingresos, egresos, anioActual]);

  const ingresosPreview = useMemo(() => ingresosMensuales.slice(0, 20), [ingresosMensuales]);
  const egresosPreview = useMemo(() => egresosMensuales.slice(0, 20), [egresosMensuales]);

  const ingresosChart = useMemo(() => ingresosMensuales.filter((i) => {
      if (!i.fecha) return false;
      const d = dayjs(i.fecha);
      if (chartYear && d.year() !== chartYear) return false;
      if (chartMonth !== "all" && d.month() + 1 !== Number(chartMonth)) return false;
      return true;
  }), [ingresosMensuales, chartYear, chartMonth]);

  const egresosChart = useMemo(() => egresosMensuales.filter((e) => {
      if (!e.fecha) return false;
      const d = dayjs(e.fecha);
      if (chartYear && d.year() !== chartYear) return false;
      if (chartMonth !== "all" && d.month() + 1 !== Number(chartMonth)) return false;
      return true;
  }), [egresosMensuales, chartYear, chartMonth]);

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-10 text-zinc-50 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header Adaptable */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs tracking-[0.18em] uppercase text-zinc-500 mb-1 flex items-center gap-2 truncate">
            Balance diario
            {!isWebAdmin && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest truncate">
                <HiOfficeBuilding className="shrink-0" /> <span className="truncate">{user?.perfil?.oficina_nombre || `Oficina ${userOficina}`}</span>
              </span>
            )}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight truncate">
            Resumen de balances
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 truncate">
            Visualizando datos del:{" "}
            <strong className="text-zinc-100">
              {dayjs(fecha).format("DD [de] MMMM YYYY")}
            </strong>
          </p>
          {cargando ? (
            <p className="text-[11px] mt-1 text-sky-400 font-semibold animate-pulse">
              Actualizando caja...
            </p>
          ) : null}
        </div>

        {/* Filtro + acciones */}
        <div className="w-full xl:w-auto flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            
            {isWebAdmin && (
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2 w-full sm:w-auto min-w-0">
                <HiOfficeBuilding className="text-zinc-400 shrink-0" />
                <select
                  value={oficinaSeleccionada}
                  onChange={(e) => setOficinaSeleccionada(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-zinc-50 border-none focus:ring-0 p-0 cursor-pointer outline-none truncate"
                >
                  <option value="ALL" className="bg-zinc-900 text-zinc-100">Todas las cajas</option>
                  {/* 🚀 Opciones dinámicas cargadas con Axios directamente */}
                  {oficinasAdmin.map(ofi => (
                    <option key={ofi.id} value={ofi.id} className="bg-zinc-900 text-zinc-100">
                      {ofi.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2 w-full sm:w-auto min-w-0">
              <span className="text-[11px] sm:text-xs text-zinc-400 shrink-0">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-zinc-50 border border-zinc-800 rounded-xl px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
              <button
                type="button"
                onClick={() => setFecha(dayjs().format("YYYY-MM-DD"))}
                className="text-[10px] sm:text-xs font-semibold text-sky-300 hover:text-sky-200 px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition shrink-0"
              >
                Hoy
              </button>
            </div>
          </div>

          {isWebAdmin && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none">
                <DescargarBalanceDiarioButton 
                  fecha={fecha} 
                  oficina={oficinaSeleccionada === "ALL" ? "" : oficinaSeleccionada} 
                />
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Configuración de Categorías"
                className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition"
              >
                <HiCog className="text-xl" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🚀 Acceso rápido: cargar ingreso/egreso (siempre visible) */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <button
          type="button"
          onClick={() => setModalIngresoAbierto(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm"
        >
          <FaPlus /> Nuevo ingreso
        </button>
        <button
          type="button"
          onClick={() => setModalEgresoAbierto(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 transition shadow-sm"
        >
          <FaPlus /> Nuevo egreso
        </button>
      </div>

      {/* Tabs principales */}
      <div className="mt-2 mb-5 border-b border-zinc-800 flex flex-wrap justify-between items-end gap-y-2">
        <div className="flex flex-wrap gap-2 pb-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-t-2xl text-xs sm:text-sm font-semibold transition border ${active ? "bg-zinc-950 border-zinc-700 text-white" : "bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-900/80 hover:text-white"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 🚀 TOGGLE DE DÍA/MES (Solo Admin) */}
        {isWebAdmin && activeTab === "resumen" && (
          <div className="hidden sm:flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 mb-1 shadow-sm">
            <button
              onClick={() => setAdminTimeView("dia")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${adminTimeView === "dia" ? "bg-sky-500/20 text-sky-400" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Diario
            </button>
            <button
              onClick={() => setAdminTimeView("mes")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${adminTimeView === "mes" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              Mensual
            </button>
          </div>
        )}
      </div>

      {/* TAB: Resumen */}
      {activeTab === "resumen" && (
        <section className="space-y-6">
          
          {/* Toggle Día/Mes para mobile (Admin) */}
          {isWebAdmin && (
            <div className="sm:hidden flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setAdminTimeView("dia")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${adminTimeView === "dia" ? "bg-sky-500/20 text-sky-400" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Vista Diaria
              </button>
              <button
                onClick={() => setAdminTimeView("mes")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${adminTimeView === "mes" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Vista Mensual
              </button>
            </div>
          )}

          {/* 🚀 TARJETAS KPI (Diferenciadas por ROL) */}
          {isWebAdmin ? (
            <div className="space-y-5">
              {oficinaSeleccionada === "ALL" ? (
                <>
                  <KpiRowGroup 
                    title="Caja General (Todas las Sucursales)" 
                    metrics={getMetrics("ALL", adminTimeView)} 
                    suffix={suffix} 
                    highlight={true} 
                  />
                  {/* Se mapea balanceData para dibujar las KPI cards dinámicas */}
                  {balanceData?.por_oficina?.map(ofi => (
                    <KpiRowGroup 
                      key={ofi.scope.oficina}
                      title={`Sucursal: ${ofi.scope.oficina_nombre}`} 
                      metrics={getMetrics(ofi.scope.oficina, adminTimeView)} 
                      suffix={suffix} 
                    />
                  ))}
                  {balanceData?.sin_oficina && (
                    <KpiRowGroup 
                      title="Sin Sucursal Asignada" 
                      metrics={getMetrics(null, adminTimeView)} 
                      suffix={suffix} 
                    />
                  )}
                </>
              ) : (
                <KpiRowGroup 
                  title="Sucursal Seleccionada" 
                  metrics={getMetrics("ALL", adminTimeView)} 
                  suffix={suffix} 
                  highlight={true}
                />
              )}
            </div>
          ) : (
            // 🚀 VISTA EMPLEADO COMÚN (Sin Caja Chica)
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard title="Neto Total (Día)" value={empMetricsDia.tBal} variant="blue" />
              <KpiCard title="Ingreso Efectivo (Día)" value={empMetricsDia.tInEfe} variant="green" />
              <KpiCard title="Ingreso Transf. (Día)" value={empMetricsDia.tInTransf} variant="green" />
            </div>
          )}

          {/* Acciones rápidas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setModalIngresoAbierto(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-emerald-600 active:scale-[0.99]"
              >
                <FaPlus size={12} /> Nuevo ingreso
              </button>
              <button
                onClick={() => setModalEgresoAbierto(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-500 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-rose-600 active:scale-[0.99]"
              >
                <FaPlus size={12} /> Nuevo egreso
              </button>
            </div>
          </div>

          {/* Sub-tabs de movimientos */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <h2 className="text-sm md:text-base font-semibold truncate">
                  Movimientos del mes (primeros 20)
                </h2>
                <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-full p-1 text-[11px] sm:text-xs">
                  <button
                    type="button"
                    onClick={() => setResumenMovTab("ingresos")}
                    className={`flex-1 px-3 py-1 rounded-full transition truncate ${
                      resumenMovTab === "ingresos" ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Ingresos
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumenMovTab("egresos")}
                    className={`flex-1 px-3 py-1 rounded-full transition truncate ${
                      resumenMovTab === "egresos" ? "bg-zinc-100 text-zinc-900 font-semibold" : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Egresos
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("detalle")}
                className="text-[11px] sm:text-xs md:text-sm text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline whitespace-nowrap shrink-0"
              >
                Ver detalle
              </button>
            </div>

            <div className="-mx-2 md:mx-0">
              {resumenMovTab === "ingresos" && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3 sm:p-4 overflow-x-auto">
                  <h3 className="text-[11px] sm:text-xs font-semibold mb-2 text-emerald-300 uppercase tracking-wide">
                    Ingresos del mes (primeros 20)
                  </h3>
                  <IngresoTable ingresos={ingresosPreview} />
                </div>
              )}
              {resumenMovTab === "egresos" && (
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-3 sm:p-4 overflow-x-auto">
                  <h3 className="text-[11px] sm:text-xs font-semibold mb-2 text-rose-300 uppercase tracking-wide">
                    Egresos del mes (primeros 20)
                  </h3>
                  <EgresoTable egresos={egresosPreview} />
                </div>
              )}
            </div>
          </section>
        </section>
      )}

      {/* TAB: Gráfico */}
      {activeTab === "grafico" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-zinc-400">Año</span>
              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 text-[11px] sm:text-xs rounded-xl px-2 py-1 text-zinc-50 focus:outline-none focus:ring-1 focus:ring-sky-400"
              >
                {yearsOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs text-zinc-400">Mes</span>
              <select
                value={chartMonth}
                onChange={(e) => setChartMonth(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-[11px] sm:text-xs rounded-xl px-2 py-1 text-zinc-50 focus:outline-none focus:ring-1 focus:ring-sky-400"
              >
                <option value="all">Todos</option>
                {Array.from({ length: 12 }).map((_, idx) => {
                  const m = idx + 1;
                  return (
                    <option key={m} value={m}>
                      {dayjs().month(idx).format("MMMM")}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="-mx-2 sm:mx-0">
            <BalanceChart ingresos={ingresosChart} egresos={egresosChart} className="w-full" />
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400">
            Filtrá por año y mes para analizar cómo se comportan tus ingresos y
            egresos. Para ver el detalle por movimiento, usá la pestaña
            &quot;Detalle&quot;.
          </p>
        </section>
      )}

      {/* TAB: Detalle */}
      {activeTab === "detalle" && (
        <section className="space-y-6">
          {/* Vista simplificada para CELULAR */}
          <div className="md:hidden space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-emerald-600 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Ingresos del Día</h3>
                <p className="text-2xl font-extrabold mt-1 truncate">
                  ${fmtMoney(empMetricsDia.tIn)}
                </p>
              </div>
              <div className="bg-rose-600 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Egresos del Día</h3>
                <p className="text-2xl font-extrabold mt-1 truncate">
                  ${fmtMoney(empMetricsDia.tEg)}
                </p>
              </div>
              <div className="bg-sky-600/40 border border-sky-400/50 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Resultado del Día</h3>
                <p
                  className={`text-2xl font-extrabold mt-1 truncate ${
                    empMetricsDia.tBal >= 0
                      ? "text-sky-50"
                      : "text-rose-100"
                  }`}
                >
                  ${fmtMoney(empMetricsDia.tBal)}
                </p>
              </div>
            </div>

            {/* Listados resumidos */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Movimientos principales (vista móvil)</h3>
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-300">Ingresos (primeros 10)</p>
                <ul className="space-y-1 text-xs">
                  {ingresosMensuales.slice(0, 10).map((i) => (
                    <li key={i.id} className="flex justify-between items-center gap-2 bg-zinc-950 rounded-xl px-2 py-1.5 min-w-0">
                      <span className="truncate flex-1">{i.descripcion || "Ingreso"}</span>
                      <span className="font-semibold shrink-0">${fmtMoney(i.monto)}</span>
                    </li>
                  ))}
                  {ingresosMensuales.length === 0 && (
                    <li className="text-zinc-400 text-xs">No hay ingresos este mes.</li>
                  )}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] text-zinc-300">Egresos (primeros 10)</p>
                <ul className="space-y-1 text-xs">
                  {egresosMensuales.slice(0, 10).map((e) => (
                    <li key={e.id} className="flex justify-between items-center gap-2 bg-zinc-950 rounded-xl px-2 py-1.5 min-w-0">
                      <span className="truncate flex-1">{e.descripcion || "Egreso"}</span>
                      <span className="font-semibold shrink-0">${fmtMoney(e.monto)}</span>
                    </li>
                  ))}
                  {egresosMensuales.length === 0 && (
                    <li className="text-zinc-400 text-xs">No hay egresos este mes.</li>
                  )}
                </ul>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              Para ver el detalle completo con todas las columnas y exportar el
              Excel, usá la versión de escritorio.
            </p>
          </div>

          {/* Vista completa SOLO DESKTOP */}
          <div className="hidden md:block space-y-6">
            <div className="-mx-2 sm:mx-0">
              <BalanceExportPanel
                ingresos={ingresosMensuales}
                egresos={egresosMensuales}
                mes={dayjs(fecha).format("YYYY-MM")}
                oficina={isWebAdmin ? oficinaSeleccionada : userOficina}
                fileName={`Reporte_Mensual_${dayjs(fecha).format("YYYY-MM")}.xlsx`}
                className="w-full"
              />
            </div>

            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Ingresos del mes</h2>
              </div>
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <IngresoTable ingresos={ingresosMensuales} />
              </div>

              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">Egresos del mes</h2>
              </div>
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <EgresoTable egresos={egresosMensuales} />
              </div>
            </section>
          </div>
        </section>
      )}

      {/* ── Tab: Historial de Pagos ── */}
      {activeTab === "historial" && (
        <section className="mt-2">
          <HistorialPagosPanel oficinasAdmin={oficinasAdmin} oficinaProp={isWebAdmin ? oficinaSeleccionada : userOficina} />
        </section>
      )}

      {/* ── Tab: Historial de Ingresos ── */}
      {activeTab === "hist_ingresos" && (
        <section className="mt-2">
          <HistorialIngresosPanel oficinasAdmin={oficinasAdmin} oficinaProp={isWebAdmin ? oficinaSeleccionada : userOficina} />
        </section>
      )}

      {/* ── Tab: Historial de Egresos ── */}
      {activeTab === "hist_egresos" && (
        <section className="mt-2">
          <HistorialEgresosPanel oficinasAdmin={oficinasAdmin} oficinaProp={isWebAdmin ? oficinaSeleccionada : userOficina} />
        </section>
      )}

      {activeTab === "transferencias" && (
        <section className="mt-2">
          <TransferenciasPanel />
        </section>
      )}

      {/* Modales */}
      <IngresoCreateModal isOpen={modalIngresoAbierto} onClose={() => setModalIngresoAbierto(false)} />
      <EgresoCreateModal isOpen={modalEgresoAbierto} onClose={() => setModalEgresoAbierto(false)} />
      <BalanzesSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default BalancesPage;