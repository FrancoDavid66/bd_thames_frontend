// src/pages/BalancesPage.jsx  (diseño Duo)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaPlus } from "react-icons/fa";
import { HiCog, HiOfficeBuilding } from "react-icons/hi";
import dayjs from "dayjs";
import "dayjs/locale/es";
import axios from "axios";
import { toast } from "react-hot-toast";
dayjs.locale("es");

// 🚀 CONTEXTO PARA SEGURIDAD (escudo de sucursal)
import { useAuth } from "../context/AuthContext";

import { fetchIngresos } from "../store/slices/ingresosSlice";
import { fetchEgresos } from "../store/slices/egresosSlice";
import { fetchBalanceDiario } from "../store/slices/balanceSlice";

// 🚀 UN solo modal combinado para cargar ingreso O egreso.
import MovimientoCreateModal from "../components/balanzes/MovimientoCreateModal";
import BalanzesSettingsModal from "../components/balanzes/BalanzesSettingsModal";

// 🚀 Toolbar ÚNICO de filtros (compartido por Resumen y Movimientos).
import BalancesFilters from "../components/balanzes/BalancesFilters";

// 🚀 Tabla de movimientos (SOLO tabla; los datos y filtros los pasa esta página).
import MovimientosPanel from "../components/balanzes/MovimientosPanel";

// 🚀 Gráfico Ingresos vs Egresos (diseño Duo, se adapta a claro/oscuro).
import BalanceChart from "../components/balanzes/BalanceChart";

// ── Base de API (igual que el resto de la app) ──
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;
const _authHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null"
    ? { Authorization: `Bearer ${token.trim()}` }
    : {};
};
const PAGE_SIZE = 50;

/* -------------------- Helpers -------------------- */
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* 🚀 Atajos de tiempo. Cada uno devuelve { desde, hasta, modo }. */
const rangoDeAtajo = (key, fechaDia) => {
  const hoy = dayjs();
  switch (key) {
    case "hoy":
      return { desde: hoy.format("YYYY-MM-DD"), hasta: hoy.format("YYYY-MM-DD"), modo: "dia" };
    case "ayer": {
      const a = hoy.subtract(1, "day");
      return { desde: a.format("YYYY-MM-DD"), hasta: a.format("YYYY-MM-DD"), modo: "dia" };
    }
    case "semana":
      return {
        desde: hoy.startOf("week").add(1, "day").format("YYYY-MM-DD"),
        hasta: hoy.endOf("week").add(1, "day").format("YYYY-MM-DD"),
        modo: "rango",
      };
    case "mes":
      return {
        desde: hoy.startOf("month").format("YYYY-MM-DD"),
        hasta: hoy.endOf("month").format("YYYY-MM-DD"),
        modo: "rango",
      };
    default:
      return { desde: fechaDia, hasta: fechaDia, modo: "dia" };
  }
};

/* 🚀 KPI card — etiqueta tenue, número grande (estilo Duo). */
const KPI_VARIANTS = {
  green: "border-duo-verde/30 bg-duo-verde/[0.06]",
  red: "border-duo-rojo/30 bg-duo-rojo/[0.06]",
  blue: "border-duo-azul/30 bg-duo-azul/[0.06]",
};
const KpiCard = React.memo(function KpiCard({ title, value, variant = "blue" }) {
  return (
    <div className={`border-2 ${KPI_VARIANTS[variant]} px-4 py-5 rounded-2xl min-w-0 flex flex-col gap-1.5 justify-center`}>
      <h3 className="text-[11px] font-black uppercase tracking-[0.08em] text-suave dark:text-suave-dark truncate" title={title}>
        {title}
      </h3>
      <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-titulo dark:text-titulo-dark truncate">
        <span className="text-lg sm:text-xl opacity-60 mr-0.5">$</span>{fmtMoney(value)}
      </p>
    </div>
  );
});

/* 🚀 Bloque de 3 KPIs (Ingreso / Egreso / Neto) por oficina. */
const KpiRowGroup = ({ title, metrics, suffix, highlight }) => (
  <div className={`rounded-3xl border-2 overflow-hidden ${highlight ? "border-duo-azul/40 bg-duo-azul/[0.05]" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"}`}>
    <div className={`flex items-center gap-2 px-4 py-3 border-b-2 ${highlight ? "border-duo-azul/30" : "border-linea dark:border-linea-dark"}`}>
      <span className="text-base shrink-0">{highlight ? "🌍" : "🏢"}</span>
      <h2 className={`text-sm font-black tracking-wide truncate ${highlight ? "text-duo-azul dark:text-duo-azul" : "text-titulo dark:text-titulo-dark"}`}>
        {title}
      </h2>
      <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark shrink-0">
        {suffix}
      </span>
    </div>
    {/* 🚀 SOLO 3 cajas: Ingresos · Egresos · Neto */}
    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard title="Ingresos" value={metrics.tIn} variant="green" />
      <KpiCard title="Egresos" value={metrics.tEg} variant="red" />
      <KpiCard title="Neto" value={metrics.tBal} variant="blue" />
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

  const { list: ingresos = [], status: ingresosStatus } = useSelector((s) => s.ingresos || {});
  const { list: egresos = [], status: egresosStatus } = useSelector((s) => s.egresos || {});

  const balanceState = useSelector((s) => s.balance || {});
  const balanceData = balanceState?.data;
  const balanceStatus = balanceState?.status;

  // 🚀 Lista de oficinas (solo admin) para el filtro
  const [oficinasAdmin, setOficinasAdmin] = useState([]);
  useEffect(() => {
    if (!isWebAdmin) return;
    const token = localStorage.getItem("access_token");
    axios.get(`${API_BASE}usuarios/oficinas/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setOficinasAdmin(data);
      })
      .catch(err => console.error("Error al cargar lista de sucursales:", err));
  }, [isWebAdmin]);

  // ═══════════════ TOOLBAR: atajo + rango ═══════════════
  const [atajo, setAtajo] = useState("hoy"); // "hoy" por default
  const [customDesde, setCustomDesde] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [customHasta, setCustomHasta] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [customDia, setCustomDia] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [advOpen, setAdvOpen] = useState(false);

  // 🚀 Rango efectivo (desde/hasta/modo) según el atajo.
  const { desde, hasta, modo } = useMemo(() => {
    if (atajo === "custom") {
      const esUnDia = customDesde && customDesde === customHasta;
      return { desde: customDesde, hasta: customHasta, modo: esUnDia ? "dia" : "rango" };
    }
    return rangoDeAtajo(atajo, dayjs().format("YYYY-MM-DD"));
  }, [atajo, customDesde, customHasta]);

  const fecha = modo === "dia" ? desde : hasta;

  // Filtros de la TABLA (viven en la página ahora)
  const [tipo, setTipo] = useState("ambos");         // ambos | ingresos | egresos
  const [formaPago, setFormaPago] = useState("TODAS");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exporting, setExporting] = useState(false);

  // Estado de la carga de movimientos (para la tabla)
  const [movItems, setMovItems] = useState([]);
  const [movCount, setMovCount] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movLoading, setMovLoading] = useState(false);
  const [movError, setMovError] = useState(null);
  const movTotalPages = Math.max(1, Math.ceil(movCount / PAGE_SIZE));

  // Modales / vista
  const [modalTipo, setModalTipo] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vista, setVista] = useState("movimientos");

  const ofiParam = isWebAdmin ? oficinaSeleccionada : userOficina;

  // ── REFRESCO A (modo "dia"): KPIs del día con desglose por oficina ──
  useEffect(() => {
    if (modo !== "dia") return;
    dispatch(fetchBalanceDiario({ fecha, oficina: ofiParam }));
  }, [dispatch, fecha, modo, ofiParam]);

  // ── REFRESCO B (modo "rango"): totales del período (para KPIs del resumen) ──
  useEffect(() => {
    if (modo !== "rango") return;
    dispatch(fetchIngresos({ oficina: ofiParam, desde, hasta, page_size: 500 }));
    dispatch(fetchEgresos({  oficina: ofiParam, desde, hasta, page_size: 500 }));
  }, [dispatch, modo, desde, hasta, ofiParam]);

  // ── Cargar la TABLA de movimientos (endpoint unificado) ──
  const cargarMovimientos = useCallback(async (p = 1) => {
    setMovLoading(true);
    setMovError(null);
    try {
      const params = { tipo, page: p, page_size: PAGE_SIZE };
      if (ofiParam && ofiParam !== "ALL") params.oficina = ofiParam;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (formaPago && formaPago !== "TODAS") params.forma_pago = formaPago;
      if (q) params.search = q;

      const res = await axios.get(`${API_BASE}ingresos/movimientos/`, { params, headers: _authHeaders() });
      const data = res?.data;
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setMovItems(results);
      setMovCount(Number(data?.count ?? results.length));
    } catch (err) {
      console.error("[Balances] Error al cargar movimientos:", err);
      toast.error("No se pudieron cargar los movimientos.");
      setMovError("No se pudieron cargar los movimientos.");
      setMovItems([]);
      setMovCount(0);
    } finally {
      setMovLoading(false);
    }
  }, [tipo, ofiParam, desde, hasta, formaPago, q]);

  // Recargar la tabla cuando cambian los filtros (solo si estamos en Movimientos)
  useEffect(() => {
    if (vista !== "movimientos") return;
    setMovPage(1);
    cargarMovimientos(1);
  }, [vista, tipo, ofiParam, desde, hasta, formaPago, q, cargarMovimientos]);

  const onBuscar = (e) => { e?.preventDefault?.(); setQ(qInput.trim()); };
  const onLimpiarBusqueda = () => { setQInput(""); setQ(""); };
  const onPage = (p) => { setMovPage(p); cargarMovimientos(p); };

  // ── Descargar (Excel / PDF) ──
  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading(exportFormat === "pdf" ? "Generando PDF…" : "Generando Excel…");
    try {
      const params = { tipo, export: exportFormat };
      if (ofiParam && ofiParam !== "ALL") params.oficina = ofiParam;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (formaPago && formaPago !== "TODAS") params.forma_pago = formaPago;
      if (q) params.search = q;

      const res = await axios.get(`${API_BASE}ingresos/movimientos/`, {
        params, headers: _authHeaders(), responseType: "blob", timeout: 60_000,
      });

      const ct = String(res.headers?.["content-type"] || "").toLowerCase();
      const esArchivo = ct.includes("spreadsheet") || ct.includes("xlsx") || ct.includes("pdf") || ct.includes("octet");
      if (!esArchivo) {
        const txt = await res.data.text();
        let detail = txt;
        try { const j = JSON.parse(txt); detail = j.detail || j.error || txt; } catch { /* noop */ }
        throw new Error(detail || "El servidor no devolvió un archivo.");
      }

      const ext = exportFormat === "pdf" ? "pdf" : "xlsx";
      const etiqueta = tipo === "ingresos" ? "Ingresos" : tipo === "egresos" ? "Egresos" : "Movimientos";
      const filename = `${etiqueta}_${dayjs().format("YYYY-MM-DD")}.${ext}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      toast.dismiss(toastId);
      toast.success(`${exportFormat === "pdf" ? "PDF" : "Excel"} generado`, { duration: 3500 });
    } catch (err) {
      console.error("[Balances] Error al exportar:", err);
      toast.dismiss(toastId);
      const st = err?.response?.status;
      if (st === 401 || st === 403) toast.error("Tu sesión expiró. Volvé a iniciar sesión.");
      else if (st === 404) toast.error("Endpoint no encontrado. Avisale al admin.");
      else toast.error(err?.message || "Error al generar el archivo.");
    } finally {
      setExporting(false);
    }
  };

  // El backend ya filtra por rango; acá solo aplicamos el filtro de oficina (para KPIs de resumen).
  const ingresosMensuales = useMemo(() =>
    ingresos.filter((i) => {
      if (!isWebAdmin) return true;
      return oficinaSeleccionada === "ALL" || String(i.oficina) === String(oficinaSeleccionada);
    }), [ingresos, isWebAdmin, oficinaSeleccionada]);

  const egresosMensuales = useMemo(() =>
    egresos.filter((e) => {
      if (!isWebAdmin) return true;
      return oficinaSeleccionada === "ALL" || String(e.oficina) === String(oficinaSeleccionada);
    }), [egresos, isWebAdmin, oficinaSeleccionada]);

  // ── Métricas Día/Rango por Oficina (para los KPIs) ──
  const getMetrics = useCallback((ofiCode, timeMode) => {
    if (timeMode === "dia") {
      let source = balanceData;
      if (ofiCode !== "ALL" && ofiCode !== null) {
        source = balanceData?.por_oficina?.find(o => String(o.scope.oficina) === String(ofiCode)) || null;
      } else if (ofiCode === null) {
        source = balanceData?.sin_oficina || null;
      }
      const tIn = toNumber(source?.totales?.ingresos);
      const tEg = toNumber(source?.totales?.egresos);
      const tBal = toNumber(source?.totales?.balance);
      return { tIn, tEg, tBal };
    } else {
      const ingFiltrados = ofiCode === "ALL" ? ingresosMensuales : ofiCode === null ? ingresosMensuales.filter(i => !i.oficina) : ingresosMensuales.filter(i => String(i.oficina) === String(ofiCode));
      const egFiltrados = ofiCode === "ALL" ? egresosMensuales : ofiCode === null ? egresosMensuales.filter(e => !e.oficina) : egresosMensuales.filter(e => String(e.oficina) === String(ofiCode));
      const tIn = ingFiltrados.reduce((acc, i) => acc + toNumber(i.monto), 0);
      const tEg = egFiltrados.reduce((acc, e) => acc + toNumber(e.monto), 0);
      return { tIn, tEg, tBal: tIn - tEg };
    }
  }, [balanceData, ingresosMensuales, egresosMensuales]);

  const metricsPorOficina = useMemo(() => {
    const map = { ALL: getMetrics("ALL", modo), _sin: getMetrics(null, modo) };
    (balanceData?.por_oficina || []).forEach((ofi) => {
      map[ofi.scope.oficina] = getMetrics(ofi.scope.oficina, modo);
    });
    return map;
  }, [getMetrics, modo, balanceData]);

  const cargando = ingresosStatus === "loading" || egresosStatus === "loading" || balanceStatus === "loading" || movLoading;

  const etiquetaAtajo = {
    hoy: "Hoy", ayer: "Ayer", semana: "Esta semana", mes: "Este mes", custom: "Rango elegido",
  }[atajo] || "Hoy";

  const periodoTexto = useMemo(() => {
    if (modo === "dia") return dayjs(fecha).format("DD/MM/YYYY");
    return `${dayjs(desde).format("DD/MM/YYYY")} → ${dayjs(hasta).format("DD/MM/YYYY")}`;
  }, [modo, fecha, desde, hasta]);

  const suffix = modo === "dia" ? "(Día)" : "(Período)";
  const empMetrics = getMetrics("ALL", modo);

  const aplicarCustomDia = () => { setCustomDesde(customDia); setCustomHasta(customDia); setAtajo("custom"); };
  const aplicarCustomRango = () => setAtajo("custom");

  const nombreOficinaSel = oficinaSeleccionada === "ALL"
    ? "Todas"
    : (oficinasAdmin.find((o) => String(o.id) === String(oficinaSeleccionada))?.nombre || oficinaSeleccionada);

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-10 text-titulo dark:text-titulo-dark max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-black tracking-[0.18em] uppercase text-suave dark:text-suave-dark mb-1 flex items-center gap-2 truncate">
            Balance
            {!isWebAdmin && (
              <span className="inline-flex items-center gap-1 bg-duo-verde/10 text-duo-verde dark:text-duo-verde border-2 border-duo-verde/30 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest truncate">
                <HiOfficeBuilding className="shrink-0" /> <span className="truncate">{user?.perfil?.oficina_nombre || `Sucursal ${userOficina}`}</span>
              </span>
            )}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight truncate text-titulo dark:text-titulo-dark">
            Balances
          </h1>
          <p className="text-xs sm:text-sm font-bold text-suave dark:text-suave-dark mt-1 truncate">
            Ingresos y egresos de la caja
          </p>
        </div>

        {/* Botones de carga rápida — 3D Duo */}
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalTipo("INGRESO")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm text-white bg-duo-verde border-2 border-duo-verde shadow-[0_5px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)] active:translate-y-0.5 transition-all"
          >
            <FaPlus /> Nuevo ingreso
          </button>
          <button
            type="button"
            onClick={() => setModalTipo("EGRESO")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm text-white bg-duo-rojo border-2 border-duo-rojo shadow-[0_5px_0_var(--color-duo-rojo-sombra)] active:shadow-[0_0_0_var(--color-duo-rojo-sombra)] active:translate-y-0.5 transition-all"
          >
            <FaPlus /> Nuevo egreso
          </button>
          {isWebAdmin && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Configuración de Categorías"
              className="inline-flex items-center justify-center w-11 h-11 sm:w-auto sm:px-3 shrink-0 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-duo-azul/10 hover:border-duo-azul text-suave dark:text-suave-dark hover:text-duo-azul dark:hover:text-duo-azul transition"
            >
              <HiCog className="text-xl" />
            </button>
          )}
        </div>
      </div>

      {/* ===================== TOOLBAR ÚNICO (compartido) ===================== */}
      <BalancesFilters
        isWebAdmin={isWebAdmin}
        oficinasAdmin={oficinasAdmin}
        atajo={atajo} setAtajo={setAtajo}
        advOpen={advOpen} setAdvOpen={setAdvOpen}
        customDia={customDia} setCustomDia={setCustomDia}
        customDesde={customDesde} setCustomDesde={setCustomDesde}
        customHasta={customHasta} setCustomHasta={setCustomHasta}
        onAplicarDia={aplicarCustomDia}
        onAplicarRango={aplicarCustomRango}
        oficinaSeleccionada={oficinaSeleccionada} setOficinaSeleccionada={setOficinaSeleccionada}
        tipo={tipo} setTipo={setTipo}
        formaPago={formaPago} setFormaPago={setFormaPago}
        qInput={qInput} setQInput={setQInput}
        onBuscar={onBuscar}
        onLimpiarBusqueda={onLimpiarBusqueda}
        exportFormat={exportFormat} setExportFormat={setExportFormat}
        onExport={onExport}
        exporting={exporting}
        etiquetaAtajo={etiquetaAtajo}
        periodoTexto={periodoTexto}
        nombreOficinaSel={nombreOficinaSel}
        cargando={cargando}
        // En Resumen ocultamos tipo/forma/buscar/descargar (no aplican al gráfico/KPIs).
        mostrarFiltrosTabla={vista === "movimientos"}
      />

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

      {/* ===================== RESUMEN (solo 3 KPIs) ===================== */}
      {vista === "resumen" && (
      <section className="space-y-6">
        {isWebAdmin ? (
          <div className="space-y-5">
            {oficinaSeleccionada === "ALL" ? (
              <>
                <KpiRowGroup title="Caja General (Todas las Sucursales)" metrics={metricsPorOficina.ALL} suffix={suffix} highlight />
                {modo === "dia" && balanceData?.por_oficina?.map(ofi => (
                  <KpiRowGroup key={ofi.scope.oficina} title={`Sucursal: ${ofi.scope.oficina_nombre}`} metrics={metricsPorOficina[ofi.scope.oficina]} suffix={suffix} />
                ))}
                {modo === "dia" && balanceData?.sin_oficina && (
                  <KpiRowGroup title="Sin Sucursal Asignada" metrics={metricsPorOficina._sin} suffix={suffix} />
                )}
              </>
            ) : (
              <KpiRowGroup title="Sucursal Seleccionada" metrics={metricsPorOficina.ALL} suffix={suffix} highlight />
            )}
          </div>
        ) : (
          // Vista empleado común — 3 KPIs
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <KpiCard title={`Ingresos ${suffix}`} value={empMetrics.tIn} variant="green" />
            <KpiCard title={`Egresos ${suffix}`} value={empMetrics.tEg} variant="red" />
            <KpiCard title={`Neto ${suffix}`} value={empMetrics.tBal} variant="blue" />
          </div>
        )}

        {/* 🚀 Gráfico Ingresos vs Egresos */}
        <BalanceChart ingresos={ingresosMensuales} egresos={egresosMensuales} />
      </section>
      )}

      {/* ===================== MOVIMIENTOS (solo tabla) ===================== */}
      {vista === "movimientos" && (
      <section className="mt-2">
        <MovimientosPanel
          items={movItems}
          count={movCount}
          loading={movLoading}
          error={movError}
          page={movPage}
          totalPages={movTotalPages}
          onPage={onPage}
          onReintentar={() => cargarMovimientos(movPage)}
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