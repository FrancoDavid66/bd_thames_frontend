// src/pages/BalancesPage.jsx  (diseño Duo)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus } from "react-icons/fa";
import { HiCog, HiOfficeBuilding } from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
dayjs.locale("es");

// 🚀 CONTEXTO PARA SEGURIDAD (escudo de sucursal)
import { useAuth } from "../context/AuthContext";

import { fetchIngresos } from "../store/slices/ingresosSlice";
import { fetchEgresos } from "../store/slices/egresosSlice";
import { fetchBalanceDiario } from "../store/slices/balanceSlice";

// 🚀 UN solo modal combinado para cargar ingreso O egreso (reemplaza a
//    IngresoCreateModal + EgresoCreateModal).
import MovimientoCreateModal from "../components/balanzes/MovimientoCreateModal";
import BalanzesSettingsModal from "../components/balanzes/BalanzesSettingsModal";

// 🚀 UNA sola tabla de movimientos (ingresos + egresos) con filtro de
//    oficina + fechas + descarga (Excel/PDF) integrada.
import MovimientosPanel from "../components/balanzes/MovimientosPanel";

// 🚀 Gráfico Ingresos vs Egresos (diseño Duo, se adapta a claro/oscuro).
import BalanceChart from "../components/balanzes/BalanceChart";

/* -------------------- Helpers -------------------- */
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
// 🚀 Sin decimales: $40.000 en vez de $40.000,00
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/* 🚀 KPI card — etiqueta tenue, número grande (estilo Duo, cajas mejoradas) */
const KPI_VARIANTS = {
  green: "border-ingreso/30 bg-ingreso/[0.06]",
  red: "border-egreso/30 bg-egreso/[0.06]",
  blue: "border-oficina/30 bg-oficina/[0.06]",
  amber: "border-tarjeta/30 bg-tarjeta/[0.06]",
};
const KpiCard = React.memo(function KpiCard({ title, value, variant = "blue" }) {
  return (
    <div className={`border-2 ${KPI_VARIANTS[variant]} px-4 py-4 rounded-2xl min-w-0 flex flex-col gap-1.5 justify-center`}>
      <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-suave dark:text-suave-dark truncate" title={title}>
        {title}
      </h3>
      <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-titulo dark:text-titulo-dark truncate">
        <span className="text-lg sm:text-xl opacity-60 mr-0.5">$</span>{fmtMoney(value)}
      </p>
    </div>
  );
});

/* 🚀 FILA DE KPIs (Admin) — 2 bloques: Ingresos / Egresos y resultado */
const KpiRowGroup = ({ title, metrics, suffix, highlight }) => (
  <div className={`rounded-3xl border-2 overflow-hidden ${highlight ? "border-oficina/40 bg-oficina/[0.05]" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"}`}>
    <div className={`flex items-center gap-2 px-4 py-3 border-b-2 ${highlight ? "border-oficina/30" : "border-linea dark:border-linea-dark"}`}>
      <span className="text-base shrink-0">{highlight ? "🌍" : "🏢"}</span>
      <h2 className={`text-sm font-black tracking-wide truncate ${highlight ? "text-oficina dark:text-oficina-claro" : "text-titulo dark:text-titulo-dark"}`}>
        {title}
      </h2>
      <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark shrink-0">
        {suffix}
      </span>
    </div>

    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-ingreso dark:text-ingreso-claro mb-2">Ingresos</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard title="Total" value={metrics.tIn} variant="green" />
          <KpiCard title="Efectivo" value={metrics.tInEfe} variant="green" />
          <KpiCard title="Transferencia" value={metrics.tInTransf} variant="green" />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-2">Egresos y resultado</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard title="Egresos" value={metrics.tEg} variant="red" />
          <KpiCard title="Neto" value={metrics.tBal} variant="blue" />
          <KpiCard title="Caja Chica" value={metrics.tCajaChica} variant="amber" />
        </div>
      </div>
    </div>
  </div>
);

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

  // 🚀 Lista de oficinas (solo admin) para el filtro
  const [oficinasAdmin, setOficinasAdmin] = useState([]);

  useEffect(() => {
    if (isWebAdmin) {
      const token = localStorage.getItem("access_token");
      const baseURL = import.meta.env.VITE_API_URL;
      axios.get(`${baseURL}usuarios/oficinas/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setOficinasAdmin(data);
      })
      .catch(err => console.error("Error al cargar lista de sucursales:", err));
    }
  }, [isWebAdmin]);

  const [fecha, setFecha] = useState(() => dayjs().format("YYYY-MM-DD"));
  // 🚀 Un solo estado: "INGRESO" | "EGRESO" | null (cuál modal está abierto).
  const [modalTipo, setModalTipo] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 🚀 Vista activa: "resumen" (KPIs) o "movimientos" (la tabla). Abre en Movimientos.
  const [vista, setVista] = useState("movimientos");

  // REFRESCO A (siempre): KPIs del día
  useEffect(() => {
    const ofi = isWebAdmin ? oficinaSeleccionada : userOficina;
    dispatch(fetchBalanceDiario({ fecha, oficina: ofi }));
  }, [dispatch, fecha, oficinaSeleccionada, isWebAdmin, userOficina]);

  // REFRESCO B (solo Vista Mensual del admin): totales del mes (1000 registros)
  useEffect(() => {
    if (!isWebAdmin || adminTimeView !== "mes") return;
    const ofi = isWebAdmin ? oficinaSeleccionada : userOficina;
    const desde = dayjs(fecha).startOf("month").format("YYYY-MM-DD");
    const hasta  = dayjs(fecha).endOf("month").format("YYYY-MM-DD");
    dispatch(fetchIngresos({ oficina: ofi, desde, hasta, page_size: 500 }));
    dispatch(fetchEgresos({  oficina: ofi, desde, hasta, page_size: 500 }));
  }, [dispatch, isWebAdmin, adminTimeView, oficinaSeleccionada, fecha, userOficina]);

  // El backend ya filtra por mes; acá solo aplicamos el filtro de oficina
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
  // 🚀 Métricas Día/Mes por Oficina (para los KPIs)
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

  // 🚀 Memo de métricas por oficina (evita recalcular getMetrics en cada render)
  const metricsPorOficina = useMemo(() => {
    const map = {
      ALL: getMetrics("ALL", adminTimeView),
      _sin: getMetrics(null, adminTimeView),
    };
    (balanceData?.por_oficina || []).forEach((ofi) => {
      map[ofi.scope.oficina] = getMetrics(ofi.scope.oficina, adminTimeView);
    });
    return map;
  }, [getMetrics, adminTimeView, balanceData]);

  const suffix = adminTimeView === "dia" ? "(Día)" : "(Mes)";
  const cargando = ingresosStatus === "loading" || egresosStatus === "loading" || balanceStatus === "loading";

  // 🚀 Etiqueta legible de la fecha/periodo activo (solo texto visible, no cambia la lógica)
  const fechaLabelDia = dayjs(fecha).format("DD/MM/YYYY");
  const fechaLabelMes = dayjs(fecha).format("MMMM YYYY");
  const periodoActivo = adminTimeView === "mes" ? fechaLabelMes : fechaLabelDia;

  // 🚀 Métricas del empleado común (solo del día)
  const empMetricsDia = getMetrics("ALL", "dia");

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-10 text-titulo dark:text-titulo-dark max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-black tracking-[0.18em] uppercase text-suave dark:text-suave-dark mb-1 flex items-center gap-2 truncate">
            Balance
            {!isWebAdmin && (
              <span className="inline-flex items-center gap-1 bg-ingreso/10 text-ingreso dark:text-ingreso-claro border-2 border-ingreso/30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest truncate">
                <HiOfficeBuilding className="shrink-0" /> <span className="truncate">{user?.perfil?.oficina_nombre || `Sucursal ${userOficina}`}</span>
              </span>
            )}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight truncate text-titulo dark:text-titulo-dark">
            Resumen de balances
          </h1>
          <p className="text-xs sm:text-sm font-bold text-suave dark:text-suave-dark mt-1 truncate">
            Caja del día:{" "}
            <strong className="text-titulo dark:text-titulo-dark font-black">
              {dayjs(fecha).format("DD [de] MMMM YYYY")}
            </strong>
          </p>
          {cargando ? (
            <p className="text-[11px] mt-1 text-oficina dark:text-oficina-claro font-black animate-pulse">
              Actualizando caja...
            </p>
          ) : null}
        </div>

        {/* Filtro de oficina + fecha del resumen + acciones */}
        <div className="w-full xl:w-auto flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            {isWebAdmin && (
              <div className="flex items-center gap-2 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl px-3 py-2 w-full sm:w-auto min-w-0 focus-within:border-oficina transition-colors">
                <HiOfficeBuilding className="text-suave dark:text-suave-dark shrink-0" />
                <select
                  value={oficinaSeleccionada}
                  onChange={(e) => setOficinaSeleccionada(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-bold text-titulo dark:text-titulo-dark border-none focus:ring-0 p-0 cursor-pointer outline-none truncate dark:[color-scheme:dark]"
                >
                  <option value="ALL">Todas las sucursales</option>
                  {oficinasAdmin.map(ofi => (
                    <option key={ofi.id} value={ofi.id}>
                      {ofi.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl px-3 py-2 w-full sm:w-auto min-w-0 focus-within:border-oficina transition-colors">
              <span className="text-[11px] sm:text-xs font-black text-suave dark:text-suave-dark shrink-0">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="flex-1 min-w-0 bg-surface dark:bg-surface-dark text-xs sm:text-sm font-bold text-titulo dark:text-titulo-dark border-2 border-linea dark:border-linea-dark rounded-xl px-2 py-1 focus:outline-none focus:border-oficina dark:[color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => setFecha(dayjs().format("YYYY-MM-DD"))}
                className="text-[10px] sm:text-xs font-black text-oficina dark:text-oficina-claro hover:text-oficina-fuerte px-2 py-1 rounded-xl border-2 border-oficina/30 bg-oficina/10 hover:bg-oficina/20 transition shrink-0"
              >
                Hoy
              </button>
            </div>

            {isWebAdmin && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Configuración de Categorías"
                className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-oficina/10 hover:border-oficina text-suave dark:text-suave-dark hover:text-oficina dark:hover:text-oficina-claro transition"
              >
                <HiCog className="text-xl" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Botones de carga rápida (siempre visibles) — 3D Duo */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <button
          type="button"
          onClick={() => setModalTipo("INGRESO")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm text-white bg-ingreso border-2 border-ingreso shadow-[0_5px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5 transition-all"
        >
          <FaPlus /> Nuevo ingreso
        </button>
        <button
          type="button"
          onClick={() => setModalTipo("EGRESO")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm text-white bg-egreso border-2 border-egreso shadow-[0_5px_0_var(--color-egreso-fuerte)] active:shadow-[0_0_0_var(--color-egreso-fuerte)] active:translate-y-0.5 transition-all"
        >
          <FaPlus /> Nuevo egreso
        </button>
      </div>

      {/* ===================== SELECTOR DE VISTA ===================== */}
      <div className="mb-5 border-b-2 border-linea dark:border-linea-dark flex flex-wrap gap-2 pb-1">
        {[
          { id: "movimientos", label: "💰 Movimientos" },
          { id: "resumen", label: "📊 Resumen" },
        ].map((tab) => {
          const active = vista === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setVista(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-t-2xl text-xs sm:text-sm font-black transition border-2 border-b-0 ${active ? "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark" : "bg-transparent border-transparent text-suave dark:text-suave-dark hover:bg-card dark:hover:bg-card-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================== RESUMEN (KPIs) ===================== */}
      {vista === "resumen" && (
      <section className="space-y-6">
        {/* Encabezado del resumen + periodo activo visible junto a los KPIs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Toggle Día/Mes (Solo Admin) */}
          {isWebAdmin ? (
            <div className="min-w-0">
              <div className="flex bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-1 w-full sm:w-auto sm:inline-flex">
                <button
                  onClick={() => setAdminTimeView("dia")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black rounded-xl transition-all ${adminTimeView === "dia" ? "bg-oficina text-white shadow-[0_3px_0_var(--color-oficina-fuerte)]" : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
                >
                  Vista Diaria
                </button>
                <button
                  onClick={() => setAdminTimeView("mes")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black rounded-xl transition-all ${adminTimeView === "mes" ? "bg-ingreso text-white shadow-[0_3px_0_var(--color-ingreso-fuerte)]" : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
                >
                  Vista Mensual
                </button>
              </div>
              {/* Aclaración de qué muestra cada vista */}
              <p className="text-[11px] font-bold text-suave dark:text-suave-dark mt-1.5">
                {adminTimeView === "dia"
                  ? "Vista Diaria: totales de la fecha seleccionada."
                  : "Vista Mensual: acumulado del mes de la fecha seleccionada."}
              </p>
            </div>
          ) : (
            <span />
          )}

          {/* Fecha / periodo que se está mostrando */}
          <p className="text-xs font-bold text-suave dark:text-suave-dark shrink-0">
            Mostrando:{" "}
            <strong className="text-titulo dark:text-titulo-dark font-black">
              {periodoActivo}
            </strong>{" "}
            <span className="uppercase tracking-wider text-[10px] font-black">
              {suffix}
            </span>
          </p>
        </div>

        {/* Tarjetas KPI (según ROL) */}
        {isWebAdmin ? (
          <div className="space-y-5">
            {oficinaSeleccionada === "ALL" ? (
              <>
                <KpiRowGroup
                  title="Caja General (Todas las Sucursales)"
                  metrics={metricsPorOficina.ALL}
                  suffix={suffix}
                  highlight={true}
                />
                {balanceData?.por_oficina?.map(ofi => (
                  <KpiRowGroup
                    key={ofi.scope.oficina}
                    title={`Sucursal: ${ofi.scope.oficina_nombre}`}
                    metrics={metricsPorOficina[ofi.scope.oficina]}
                    suffix={suffix}
                  />
                ))}
                {balanceData?.sin_oficina && (
                  <KpiRowGroup
                    title="Sin Sucursal Asignada"
                    metrics={metricsPorOficina._sin}
                    suffix={suffix}
                  />
                )}
              </>
            ) : (
              <KpiRowGroup
                title="Sucursal Seleccionada"
                metrics={metricsPorOficina.ALL}
                suffix={suffix}
                highlight={true}
              />
            )}
          </div>
        ) : (
          // Vista empleado común (sin Caja Chica)
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <KpiCard title="Neto Total (Día)" value={empMetricsDia.tBal} variant="blue" />
            <KpiCard title="Ingreso Efectivo (Día)" value={empMetricsDia.tInEfe} variant="green" />
            <KpiCard title="Ingreso Transf. (Día)" value={empMetricsDia.tInTransf} variant="green" />
          </div>
        )}

        {/* 🚀 Gráfico Ingresos vs Egresos (nuevo UI Duo) */}
        <BalanceChart ingresos={ingresosMensuales} egresos={egresosMensuales} />
      </section>
      )}

      {/* ============ MOVIMIENTOS (tabla única + filtro fechas + descarga) ============ */}
      {vista === "movimientos" && (
      <section className="mt-2">
        <MovimientosPanel
          oficinasAdmin={oficinasAdmin}
          oficinaProp={isWebAdmin ? oficinaSeleccionada : userOficina}
          fechaInicial={fecha}
          modoInicial={isWebAdmin ? adminTimeView : "dia"}
        />
      </section>
      )}

      {/* Modales */}
      <MovimientoCreateModal
        isOpen={modalTipo !== null}
        tipoInicial={modalTipo || "INGRESO"}
        onClose={() => setModalTipo(null)}
      />
      <BalanzesSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default BalancesPage;
