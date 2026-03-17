// src/pages/BalancesPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus } from "react-icons/fa";
import { HiCog, HiOfficeBuilding } from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
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

// 🚀 BOTÓN DE DESCARGA
import DescargarBalanceDiarioButton from "../components/balanzes/DescargarBalanceDiarioButton";
import BalanceChart from "../components/balanzes/BalanceChart";
import BalanceExportPanel from "../components/balanzes/BalanceExportPanel";
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

/* 🚀 KPI card OPTIMIZADO PARA MÓVILES Y TABLETS */
function KpiCard({ title, value, variant = "blue" }) {
  const variants = {
    green:
      "bg-gradient-to-br from-emerald-600/70 via-emerald-600/40 to-emerald-500/60 border border-emerald-400/40 text-white",
    red: "bg-gradient-to-br from-rose-600/70 via-rose-600/40 to-rose-500/60 border border-rose-400/40 text-white",
    blue: "bg-gradient-to-br from-sky-600/70 via-sky-600/40 to-sky-500/60 border border-sky-400/40 text-white",
    amber: "bg-gradient-to-br from-amber-600/70 via-amber-600/40 to-amber-500/60 border border-amber-400/40 text-white", 
  };
  return (
    <div
      className={`${variants[variant]} px-3 py-3 sm:px-4 sm:py-4 rounded-2xl shadow-sm transition-all duration-300 min-w-0 flex flex-col justify-center`}
    >
      <h3 className="text-[10px] sm:text-xs uppercase tracking-wide opacity-80 truncate" title={title}>
        {title}
      </h3>
      <p 
        className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-extrabold mt-1 truncate" 
        title={`$${fmtMoney(value)}`}
      >
        ${fmtMoney(value)}
      </p>
    </div>
  );
}

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "grafico", label: "Gráfico" },
  { id: "detalle", label: "Detalle" },
];

const BalancesPage = () => {
  const dispatch = useDispatch();

  // 🚀 ESCUDO DE SUCURSAL
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const userOficina = user?.perfil?.oficina?.codigo || user?.perfil?.oficina?.id || user?.perfil?.oficina || "";

  // Estado de la oficina seleccionada
  const [oficinaSeleccionada, setOficinaSeleccionada] = useState("ALL");

  // listas crudas
  const { list: ingresos = [], status: ingresosStatus } = useSelector(
    (s) => s.ingresos || {}
  );
  const { list: egresos = [], status: egresosStatus } = useSelector(
    (s) => s.egresos || {}
  );

  // datos del balance diario
  const balanceState = useSelector((s) => s.balance || {});
  const balanceData = balanceState?.data;
  const balanceStatus = balanceState?.status;

  // fecha seleccionada
  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));

  // tab actual principal
  const [activeTab, setActiveTab] = useState("resumen");

  // sub-tab dentro de Resumen
  const [resumenMovTab, setResumenMovTab] = useState("ingresos");

  // modales
  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false);
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // filtros para el gráfico
  const [chartYear, setChartYear] = useState(() => dayjs().year());
  const [chartMonth, setChartMonth] = useState("all"); 

  // REFRESCO TOTAL
  useEffect(() => {
    const ofi = isWebAdmin ? oficinaSeleccionada : userOficina;
    dispatch(fetchBalanceDiario({ fecha, oficina: ofi }));
    dispatch(fetchIngresos({ oficina: ofi }));
    dispatch(fetchEgresos({ oficina: ofi }));
  }, [dispatch, fecha, oficinaSeleccionada, isWebAdmin, userOficina]);

  const hoy = useMemo(() => dayjs(), []);
  const mesActual = hoy.month();
  const anioActual = hoy.year();

  const ingresosMensuales = useMemo(
    () =>
      ingresos.filter((i) => {
        const f = dayjs(i.fecha);
        // 🚀 FIX DEL FRONTEND: Si no es admin, no filtramos por oficina en la UI porque el backend ya envió solo los suyos.
        const ofiOk = isWebAdmin 
          ? (oficinaSeleccionada === "ALL" || String(i.oficina) === String(oficinaSeleccionada))
          : true;
        return f.month() === mesActual && f.year() === anioActual && ofiOk;
      }),
    [ingresos, mesActual, anioActual, isWebAdmin, oficinaSeleccionada]
  );

  const egresosMensuales = useMemo(
    () =>
      egresos.filter((e) => {
        const f = dayjs(e.fecha);
        // 🚀 FIX DEL FRONTEND
        const ofiOk = isWebAdmin 
          ? (oficinaSeleccionada === "ALL" || String(e.oficina) === String(oficinaSeleccionada))
          : true;
        return f.month() === mesActual && f.year() === anioActual && ofiOk;
      }),
    [egresos, mesActual, anioActual, isWebAdmin, oficinaSeleccionada]
  );

  const totalIngresosMensuales = useMemo(
    () => ingresosMensuales.reduce((acc, i) => acc + toNumber(i.monto), 0),
    [ingresosMensuales]
  );
  const totalEgresosMensuales = useMemo(
    () => egresosMensuales.reduce((acc, e) => acc + toNumber(e.monto), 0),
    [egresosMensuales]
  );

  const ingresosPreview = useMemo(
    () => ingresosMensuales.slice(0, 20),
    [ingresosMensuales]
  );
  const egresosPreview = useMemo(
    () => egresosMensuales.slice(0, 20),
    [egresosMensuales]
  );

  const tIn = toNumber(balanceData?.totales?.ingresos);
  const tEg = toNumber(balanceData?.totales?.egresos);
  const tBal = toNumber(balanceData?.totales?.balance);
  const tCajaChica = toNumber(balanceData?.totales?.saldo_caja_chica);

  const cargando =
    ingresosStatus === "loading" ||
    egresosStatus === "loading" ||
    balanceStatus === "loading";

  const yearsOptions = useMemo(() => {
    const yearsSet = new Set();
    [...ingresos, ...egresos].forEach((item) => {
      if (!item.fecha) return;
      const y = dayjs(item.fecha).year();
      if (Number.isFinite(y)) yearsSet.add(y);
    });
    if (yearsSet.size === 0) {
      yearsSet.add(anioActual);
    }
    return Array.from(yearsSet).sort();
  }, [ingresos, egresos, anioActual]);

  const ingresosChart = useMemo(
    () =>
      ingresosMensuales.filter((i) => {
        if (!i.fecha) return false;
        const d = dayjs(i.fecha);
        if (chartYear && d.year() !== chartYear) return false;
        if (chartMonth !== "all" && d.month() + 1 !== Number(chartMonth))
          return false;
        return true;
      }),
    [ingresosMensuales, chartYear, chartMonth]
  );

  const egresosChart = useMemo(
    () =>
      egresosMensuales.filter((e) => {
        if (!e.fecha) return false;
        const d = dayjs(e.fecha);
        if (chartYear && d.year() !== chartYear) return false;
        if (chartMonth !== "all" && d.month() + 1 !== Number(chartMonth))
          return false;
        return true;
      }),
    [egresosMensuales, chartYear, chartMonth]
  );

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
            Mes actual:{" "}
            <strong className="text-zinc-100">
              {dayjs().format("MMMM YYYY")}
            </strong>
          </p>
          {cargando ? (
            <p className="text-[11px] mt-1 text-sky-400 font-semibold animate-pulse">
              Actualizando caja...
            </p>
          ) : null}
        </div>

        {/* Filtro + acciones, mobile-first */}
        <div className="w-full xl:w-auto flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            
            {/* SELECTOR DE OFICINA (SOLO ADMIN) */}
            {isWebAdmin && (
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2 w-full sm:w-auto min-w-0">
                <HiOfficeBuilding className="text-zinc-400 shrink-0" />
                <select
                  value={oficinaSeleccionada}
                  onChange={(e) => setOficinaSeleccionada(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-zinc-50 border-none focus:ring-0 p-0 cursor-pointer outline-none truncate"
                >
                  <option value="ALL">Todas las cajas</option>
                  <option value="1">Oficina 1 (5 Esquinas)</option>
                  <option value="2">Oficina 2 (Axion)</option>
                  <option value="3">Oficina 3 (Km 39)</option>
                </select>
              </div>
            )}

            {/* Fecha */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2 w-full sm:w-auto min-w-0">
              <span className="text-[11px] sm:text-xs text-zinc-400 shrink-0">
                Fecha
              </span>
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

          {/* 🚀 BOTONES EXCLUSIVOS PARA EL ADMIN */}
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
                aria-label="Abrir configuración"
                className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition"
              >
                <HiCog className="text-xl" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs principales */}
      <div className="mt-2 mb-5 border-b border-zinc-800">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap px-3 sm:px-4 py-2 rounded-t-2xl text-xs sm:text-sm font-semibold
                  transition border
                  ${
                    active
                      ? "bg-zinc-950 border-zinc-700 text-white"
                      : "bg-zinc-900 border-transparent text-zinc-400 hover:bg-zinc-900/80 hover:text-white"
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: Resumen */}
      {activeTab === "resumen" && (
        <section className="space-y-6">
          {/* 🚀 GRILLA RESPONSIVA: 2 columnas en mobile/tablet, 4 columnas en PC */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard title="Ingresos (Día)" value={tIn} variant="green" />
            <KpiCard title="Egresos (Día)" value={tEg} variant="red" />
            <KpiCard title="Neto (Día)" value={tBal} variant="blue" />
            <KpiCard title="Caja Chica (Físico)" value={tCajaChica} variant="amber" />
          </div>

          {/* Acciones rápidas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <section className="space-y-3">
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
                <h3 className="text-xs opacity-90 truncate">Ingresos del mes</h3>
                <p className="text-2xl font-extrabold mt-1 truncate">
                  ${fmtMoney(totalIngresosMensuales)}
                </p>
              </div>
              <div className="bg-rose-600 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Egresos del mes</h3>
                <p className="text-2xl font-extrabold mt-1 truncate">
                  ${fmtMoney(totalEgresosMensuales)}
                </p>
              </div>
              <div className="bg-sky-600/40 border border-sky-400/50 text-white p-3 rounded-2xl shadow-sm min-w-0">
                <h3 className="text-xs opacity-90 truncate">Resultado del mes</h3>
                <p
                  className={`text-2xl font-extrabold mt-1 truncate ${
                    totalIngresosMensuales - totalEgresosMensuales >= 0
                      ? "text-sky-50"
                      : "text-rose-100"
                  }`}
                >
                  ${fmtMoney(totalIngresosMensuales - totalEgresosMensuales)}
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
                fileName={`Balance_${dayjs().format("YYYY-MM")}.xlsx`}
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

      {/* Modales */}
      <IngresoCreateModal
        isOpen={modalIngresoAbierto}
        onClose={() => setModalIngresoAbierto(false)}
      />
      <EgresoCreateModal
        isOpen={modalEgresoAbierto}
        onClose={() => setModalEgresoAbierto(false)}
      />
      <BalanzesSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default BalancesPage;