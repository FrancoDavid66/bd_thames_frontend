// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiShieldCheck, HiTruck, HiChartBar,
  HiOfficeBuilding, HiCalendar, HiRefresh, HiDownload,
  HiExclamationCircle, HiCheckCircle, HiCollection,
  HiDocumentReport, HiCash, HiAnnotation,
} from "react-icons/hi";

import EstadisticasSummaryCards  from "../components/estadisticas/EstadisticasSummaryCards";
import OficinasTable              from "../components/estadisticas/OficinasTable";
import AseguradosExportModal      from "../components/estadisticas/AseguradosExportModal";
import VehiculosPanel             from "../components/estadisticas/VehiculosPanel";
import VehiculosExportModal       from "../components/estadisticas/VehiculosExportModal";
import AltasPolizasPanel          from "../components/estadisticas/AltasPolizasPanel";
import BajasRetencionPanel        from "../components/estadisticas/BajasRetencionPanel";
import CalidadDatosPanel          from "../components/estadisticas/CalidadDatosPanel";
import DuplicadosPolizasPanel     from "../components/estadisticas/DuplicadosPolizasPanel";
import ContabilidadPanel          from "../components/estadisticas/ContabilidadPanel";
import EfectividadMensajesPanel   from "../components/estadisticas/EfectividadMensajesPanel";
import ListadoClientesModal       from "../components/estadisticas/ListadoClientesModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL  && String(import.meta.env.VITE_API_URL).trim())  ||
    "/api/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getFilenameFromDisposition = (cd, fallback) => {
  const s = String(cd || "");
  const m1 = s.match(/filename\*=UTF-8''([^;]+)/i);
  if (m1?.[1]) return decodeURIComponent(m1[1].replace(/['"]/g, ""));
  const m2 = s.match(/filename="?([^";]+)"?/i);
  if (m2?.[1]) return m2[1].replace(/['"]/g, "");
  return fallback;
};

const formatMixPercent = (value, total) => {
  const v = Number(value || 0), t = Number(total || 0);
  if (!t || !v) return "0%";
  return `${((v / t) * 100).toFixed(0)}%`;
};

const MESES_LABEL = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// ─── Tabs config ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "general",      label: "General",     icon: HiChartBar,       desc: "KPIs, oficinas y movimientos del período" },
  { key: "calidad",      label: "Calidad",      icon: HiCheckCircle,    desc: "Datos incompletos o problemáticos" },
  { key: "duplicados",   label: "Duplicados",   icon: HiCollection,     desc: "Pólizas y clientes duplicados" },
  { key: "asegurados",   label: "Cartera",      icon: HiShieldCheck,    desc: "Distribución por compañía y cobertura" },
  { key: "contabilidad", label: "Contabilidad", icon: HiCash,           desc: "Recaudación y morosidad" },
  { key: "cobranzas",    label: "Cobranzas",    icon: HiAnnotation,     desc: "Efectividad de mensajes enviados" },
];

// ─── Distribución de cartera ─────────────────────────────────────────────────

function DistribucionPanel({ apiBase, oficina }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [soloActivas, setSoloActivas] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (oficina) p.set("oficina", oficina);
      if (soloActivas) p.set("solo_activas", "1");
      const res = await fetch(`${apiBase}estadisticas/vehiculos/resumen/?${p}`, { headers: getAuthHeaders() });
      setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, [apiBase, oficina, soloActivas]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const total = data?.total_polizas || 0;

  const RankingCard = ({ title, items = {}, icon: Icon, accent }) => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="text-sm" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
        {loading && <span className="ml-auto w-3 h-3 rounded-full border border-slate-600 border-t-slate-300 animate-spin" />}
      </div>
      <div className="space-y-3">
        {Object.entries(items || {}).length > 0 ? (
          Object.entries(items).sort(([,a],[,b]) => b - a).slice(0, 8).map(([key, value]) => (
            <div key={key} className="group space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors truncate max-w-[60%]">{key}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-slate-100 tabular-nums">{Number(value).toLocaleString("es-AR")}</span>
                  <span className="text-[10px] text-slate-500">{formatMixPercent(value, total)}</span>
                </div>
              </div>
              <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: formatMixPercent(value, total) }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full bg-sky-500/60 group-hover:bg-sky-400/80 transition-colors"
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-600 py-8 text-center">Sin datos</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Distribución de cartera</h2>
          <p className="text-xs text-slate-500 mt-0.5">Desglose por compañía y tipo de cobertura</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 hover:border-slate-700 transition-colors">
            <input type="checkbox" checked={soloActivas} onChange={e => setSoloActivas(e.target.checked)} className="w-3.5 h-3.5 accent-sky-500" />
            <span className="text-xs text-slate-300">Solo activas</span>
          </label>
          <button onClick={fetch_} disabled={loading} className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors">
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RankingCard title="Por compañía"  items={data?.por_compania}  icon={HiTruck}      accent="bg-sky-500/15 text-sky-400" />
        <RankingCard title="Por cobertura" items={data?.por_cobertura} icon={HiShieldCheck} accent="bg-emerald-500/15 text-emerald-400" />
      </div>
    </div>
  );
}

// ─── Panel general ────────────────────────────────────────────────────────────

function EstadisticasGeneralPanel({ apiBase, oficina, oficinasList, getOficinaNombre, anio, mes, fuenteSnapshot, setDesde, setHasta }) {
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [fuenteResp,    setFuenteResp]    = useState("");
  const [oficinasData,  setOficinasData]  = useState([]);
  const [showExport,    setShowExport]    = useState(false);
  const [showVehExport, setShowVehExport] = useState(false);
  const [vehDefaults,   setVehDefaults]   = useState(null);
  const [showListado,   setShowListado]   = useState(false);
  const [tipoListado,   setTipoListado]   = useState(null);

  const oficinasValidas = Array.isArray(oficinasList) ? oficinasList : [];

  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ anio, mes });
      if (oficina) p.set("oficina", oficina);
      if (fuenteSnapshot === "snapshot") p.set("usar_snapshot", "1");
      const res  = await fetch(`${apiBase}estadisticas/polizas/por-oficina/?${p}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.desde) setDesde(data.desde);
      if (data.hasta) setHasta(data.hasta);
      setFuenteResp(data.fuente || "");
      setOficinasData(Array.isArray(data.oficinas) ? data.oficinas : []);
    } catch {
      setError("No se pudieron cargar las estadísticas.");
      setOficinasData([]);
    } finally {
      setLoading(false);
    }
  }, [anio, mes, oficina, fuenteSnapshot, apiBase]);

  useEffect(() => { fetchEstadisticas(); }, [fetchEstadisticas]);

  const totales = useMemo(() => oficinasData.reduce((acc, o) => ({
    total:        acc.total        + (o.polizas_total   || 0),
    activas:      acc.activas      + (o.polizas_activas || 0),
    altas_nuevas: acc.altas_nuevas + (o.altas_nuevas_mes ?? (o.nuevas_mes || 0)),
    renovaciones: acc.renovaciones + (o.renovaciones_mes || 0),
    nuevas_mes:   acc.nuevas_mes   + (o.nuevas_mes      || 0),
    bajas:        acc.bajas        + (o.bajas_mes       || 0),
    vencidas:     acc.vencidas     + (o.en_mora || o.vencidas_mes || 0),
  }), { total: 0, activas: 0, altas_nuevas: 0, renovaciones: 0, nuevas_mes: 0, bajas: 0, vencidas: 0 }), [oficinasData]);

  const churnGlobal = totales.total > 0 ? (totales.bajas / totales.total) * 100 : 0;

  const handleDownloadExcel = async (tipo) => {
    try {
      const p = new URLSearchParams({ formato: "xlsx", tipo_listado: tipo, anio, mes, export_all: "1" });
      if (oficina) p.set("oficina", oficina);
      const res = await fetch(`${apiBase}estadisticas/vehiculos/export/?${p}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.setAttribute("download", getFilenameFromDisposition(res.headers.get("content-disposition"), `Listado_${tipo}_${mes}_${anio}.xlsx`));
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert("No se pudo descargar el Excel."); }
  };

  return (
    <div className="space-y-6">

      {/* Estado + badge fuente */}
      <div className="flex items-center gap-2 flex-wrap">
        {fuenteResp && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border ${fuenteResp === "snapshot" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {fuenteResp === "snapshot" ? "Snapshot guardado" : "Cálculo en vivo"}
          </span>
        )}
        <button
          onClick={fetchEstadisticas}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors disabled:opacity-40"
        >
          <HiRefresh className={`text-xs ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
        <button
          onClick={() => setShowExport(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors ml-auto"
        >
          <HiDownload className="text-xs" />
          Descargar asegurados
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
          <HiExclamationCircle className="shrink-0 text-base" /> {error}
          <button onClick={fetchEstadisticas} className="ml-auto underline hover:no-underline">Reintentar</button>
        </div>
      )}

      {/* KPIs */}
      <EstadisticasSummaryCards
        totales={totales}
        churnGlobal={churnGlobal}
        onCardClick={(tipo) => { setTipoListado(tipo); setShowListado(true); }}
        onDownloadExcel={handleDownloadExcel}
        loading={loading}
      />

      {/* Tabla oficinas */}
      <OficinasTable oficinasData={oficinasData} getOficinaNombre={getOficinaNombre} formatMixPercent={formatMixPercent} />

      {/* Altas */}
      <AltasPolizasPanel apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} defaultOficina={oficina} anio={anio} mes={mes} />

      {/* Bajas + Retención */}
      <BajasRetencionPanel apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} defaultOficina={oficina} />

      {/* Vehículos */}
      <VehiculosPanel apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} defaultOficina={oficina} onOpenExport={(f) => { setVehDefaults(f); setShowVehExport(true); }} />

      {/* Modals */}
      <AseguradosExportModal open={showExport}    onClose={() => setShowExport(false)}    apiBase={apiBase} oficinas={oficinasValidas} defaultOficina={oficina} getOficinaNombre={getOficinaNombre} />
      <VehiculosExportModal  open={showVehExport} onClose={() => setShowVehExport(false)} apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} defaults={vehDefaults} />
      <ListadoClientesModal  isOpen={showListado} onClose={() => setShowListado(false)}   tipo={tipoListado} apiBase={apiBase} getOficinaNombre={getOficinaNombre} filtros={{ oficina, anio, mes }} />
    </div>
  );
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function EstadisticasPage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const hoy     = useMemo(() => new Date(), []);

  const [tab,            setTab]            = useState(() => localStorage.getItem("estadisticas.tab") || "general");
  const [oficina,        setOficina]        = useState("");
  const [oficinasList,   setOficinasList]   = useState([]);
  const [anio,           setAnio]           = useState(hoy.getFullYear());
  const [mes,            setMes]            = useState(hoy.getMonth() + 1);
  const [fuenteSnapshot, setFuenteSnapshot] = useState("live");
  const [desde,          setDesde]          = useState("");
  const [hasta,          setHasta]          = useState("");
  const [anioInput,      setAnioInput]      = useState(String(hoy.getFullYear()));

  useEffect(() => { localStorage.setItem("estadisticas.tab", tab); }, [tab]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}usuarios/oficinas/`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOficinasList(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
        }
      } catch {}
    })();
  }, [apiBase]);

  const getOficinaNombre = useCallback((id) => {
    if (!id) return "Sin oficina";
    const s = String(id).trim();
    if (s === "SIN_OFICINA") return "Sin oficina";
    if (s === "OTRAS")       return "Otras / Sin mapear";
    const match = (Array.isArray(oficinasList) ? oficinasList : []).find(o => String(o.id) === s || String(o.codigo) === s);
    return match ? match.nombre : `Oficina ${s}`;
  }, [oficinasList]);

  const periodoLabel = `${MESES_LABEL[mes - 1]} ${anio}`;
  const tabActual    = TABS.find(t => t.key === tab) || TABS[0];

  const commitYear = (v) => {
    const digits = String(v).replace(/\D/g, "").slice(0, 4);
    const n = Number(digits);
    if (Number.isFinite(n) && n >= 2000) { setAnio(n); setAnioInput(String(n)); }
    else setAnioInput(String(anio));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">

      {/* ── Barra superior sticky ── */}
      <div className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Fila 1: título + filtros */}
          <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-800/60">

            {/* Título */}
            <div className="flex items-center gap-2.5 mr-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <HiDocumentReport className="text-sky-400 text-sm" />
              </div>
              <span className="text-sm font-semibold text-slate-200 hidden sm:block">Estadísticas</span>
              <span className="text-slate-700 hidden sm:block">/</span>
              <span className="text-xs font-medium text-sky-400">{periodoLabel}</span>
            </div>

            {/* Separador */}
            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Oficina */}
            <div className="flex items-center gap-1.5 h-8 bg-slate-900 border border-slate-800 rounded-lg px-2.5 focus-within:border-slate-700 transition-colors">
              <HiOfficeBuilding className="text-slate-600 text-xs shrink-0" />
              <select
                value={String(oficina ?? "")}
                onChange={e => setOficina(e.target.value)}
                className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
              >
                <option value="">Todas las oficinas</option>
                {[...new Set((Array.isArray(oficinasList) ? oficinasList : []).map(o => String(o.id)))].map(id => (
                  <option key={id} value={id}>{getOficinaNombre(id)}</option>
                ))}
              </select>
            </div>

            {/* Mes */}
            <div className="flex items-center gap-1.5 h-8 bg-slate-900 border border-slate-800 rounded-lg px-2.5 focus-within:border-slate-700 transition-colors">
              <HiCalendar className="text-slate-600 text-xs shrink-0" />
              <select
                value={mes}
                onChange={e => setMes(Number(e.target.value))}
                className="bg-transparent text-xs text-slate-300 outline-none cursor-pointer"
              >
                {MESES_LABEL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>

            {/* Año */}
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={anioInput}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setAnioInput(v);
                if (v.length === 4) commitYear(v);
              }}
              onBlur={() => commitYear(anioInput)}
              onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
              className="h-8 w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-300 outline-none text-center tabular-nums focus:border-sky-500/50 transition-colors"
            />

            {/* Modo cálculo */}
            <div className="flex items-center h-8 bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
              {[["live","En vivo"],["snapshot","Snapshot"]].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setFuenteSnapshot(v)}
                  className={`px-2.5 h-full rounded-md text-[11px] font-medium transition-all ${fuenteSnapshot === v ? "bg-slate-700 text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fila 2: tabs */}
          <div className="flex overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === t.key ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <t.icon className="text-sm shrink-0" />
                {t.label}
                {tab === t.key && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute bottom-0 inset-x-0 h-[2px] bg-sky-400 rounded-t-full"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Descripción del tab */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`desc-${tab}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-slate-500 mb-5 flex items-center gap-1.5"
          >
            <tabActual.icon className="text-slate-600 shrink-0" />
            {tabActual.desc}
          </motion.p>
        </AnimatePresence>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {tab === "general" && (
              <EstadisticasGeneralPanel
                apiBase={apiBase}
                oficina={oficina}
                oficinasList={oficinasList}
                getOficinaNombre={getOficinaNombre}
                anio={anio}
                mes={mes}
                fuenteSnapshot={fuenteSnapshot}
                setDesde={setDesde}
                setHasta={setHasta}
              />
            )}
            {tab === "calidad" && (
              <CalidadDatosPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} anio={anio} mes={mes} />
            )}
            {tab === "duplicados" && (
              <DuplicadosPolizasPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} />
            )}
            {tab === "asegurados" && (
              <DistribucionPanel apiBase={apiBase} oficina={oficina} />
            )}
            {tab === "contabilidad" && (
              <ContabilidadPanel apiBase={apiBase} oficina={oficina} anio={anio} mes={mes} getOficinaNombre={getOficinaNombre} />
            )}
            {tab === "cobranzas" && (
              <EfectividadMensajesPanel apiBase={apiBase} oficina={oficina} anio={anio} mes={mes} desde={desde} hasta={hasta} getOficinaNombre={getOficinaNombre} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}