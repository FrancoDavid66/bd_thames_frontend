// src/pages/EstadisticasPage.jsx  (diseño Duo)
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiShieldCheck, HiTruck, HiChartBar } from "react-icons/hi";

import EstadisticasHeader from "../components/estadisticas/EstadisticasHeader";
import EstadisticasFilters from "../components/estadisticas/EstadisticasFilters";
import EstadisticasSummaryCards from "../components/estadisticas/EstadisticasSummaryCards";
import OficinasTable from "../components/estadisticas/OficinasTable";
import FutureModulesCard from "../components/estadisticas/FutureModulesCard";
import AnimatedCard from "../components/estadisticas/AnimatedCard";
import AseguradosExportModal from "../components/estadisticas/AseguradosExportModal";
import VehiculosPanel from "../components/estadisticas/VehiculosPanel";
import VehiculosExportModal from "../components/estadisticas/VehiculosExportModal";
import AltasPolizasPanel from "../components/estadisticas/AltasPolizasPanel";
// 🆕 NUEVO PANEL: Renovaciones por Oficina
import RenovacionesPolizasPanel from "../components/estadisticas/RenovacionesPolizasPanel";

import CalidadDatosPanel from "../components/estadisticas/CalidadDatosPanel";
import DuplicadosPolizasPanel from "../components/estadisticas/DuplicadosPolizasPanel";
import ControlFechasPanel from "../components/estadisticas/ControlFechasPanel";
import DuplicadosClientesPanel from "../components/estadisticas/DuplicadosClientesPanel";
import AuditoriaMontosPanel from "../components/estadisticas/AuditoriaMontosPanel";
import PagosDuplicadosPanel from "../components/estadisticas/PagosDuplicadosPanel";
import ContabilidadPanel from "../components/estadisticas/ContabilidadPanel";
import EfectividadMensajesPanel from "../components/estadisticas/EfectividadMensajesPanel";

// 🚀 IMPORTAMOS EL NUEVO MODAL DE LISTADOS
import ListadoClientesModal from "../components/estadisticas/ListadoClientesModal";

const getApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) ||
    "/api/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getFilenameFromDisposition = (contentDisposition, fallback) => {
  const value = String(contentDisposition || "");
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/['"]/g, ""));

  const normalMatch = value.match(/filename="?([^";]+)"?/i);
  if (normalMatch?.[1]) return normalMatch[1].replace(/['"]/g, "");

  return fallback;
};

const formatMixPercent = (value, total) => {
  const v = Number(value || 0);
  const t = Number(total || 0);
  if (!t || !v) return "0%";
  const pct = (v / t) * 100;
  return `${pct.toFixed(0)}%`;
};

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-xl px-3.5 py-2 text-[12px] font-black transition-all border-2",
        active
          ? "bg-oficina text-white border-oficina shadow-[0_3px_0_var(--color-oficina-fuerte)]"
          : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark border-transparent hover:border-linea dark:hover:border-linea-dark",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function DistribucionPanel({ apiBase, oficina }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [soloActivas, setSoloActivas] = useState(true);

  const fetchDistribucion = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (oficina) params.set("oficina", oficina);
      if (soloActivas) params.set("solo_activas", "1");

      const url = `${apiBase}estadisticas/vehiculos/resumen/?${params.toString()}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Error al cargar distribución:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDistribucion(); }, [oficina, soloActivas]);

  const total = data?.total_polizas || 0;

  const RankingCard = ({ title, items = {}, icon: Icon, color = "bg-oficina" }) => (
    <div className="flex flex-col gap-4 rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
      <div className="flex items-center gap-2 border-b-2 border-linea dark:border-linea-dark pb-3">
        <Icon className="text-oficina text-lg" />
        <h3 className="text-xs font-black uppercase tracking-wide text-titulo dark:text-titulo-dark">{title}</h3>
      </div>
      <div className="space-y-4">
        {Object.entries(items || {}).length > 0 ? (
          Object.entries(items).map(([key, value]) => (
            <div key={key} className="group flex flex-col gap-1.5">
              <div className="flex justify-between items-end px-0.5">
                <span className="text-[13px] font-bold text-titulo dark:text-titulo-dark">{key}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-titulo dark:text-titulo-dark">{value.toLocaleString("es-AR")}</span>
                  <span className="text-[10px] font-bold text-suave dark:text-suave-dark">{formatMixPercent(value, total)}</span>
                </div>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: formatMixPercent(value, total) }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${color}`}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-xs font-bold text-suave dark:text-suave-dark italic">Sin datos disponibles.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-oficina text-white shadow-[0_4px_0_var(--color-oficina-fuerte)]">
            <HiChartBar className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-black text-titulo dark:text-titulo-dark tracking-tight">Distribución de Cartera</h2>
            <p className="text-[11px] font-bold text-suave dark:text-suave-dark">Desglose detallado por compañía y tipo de cobertura.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2.5 transition hover:border-oficina">
            <input
              type="checkbox"
              checked={soloActivas}
              onChange={e => setSoloActivas(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-oficina)]"
            />
            <span className="text-xs font-black text-titulo dark:text-titulo-dark">Solo Activas</span>
          </label>
          <button
            onClick={fetchDistribucion}
            disabled={loading}
            className="h-11 rounded-2xl bg-oficina px-5 text-xs font-black text-white border-2 border-oficina transition shadow-[0_5px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RankingCard title="Ranking por Compañía" items={data?.por_compania} icon={HiTruck} color="bg-oficina" />
        <RankingCard title="Distribución por Cobertura" items={data?.por_cobertura} icon={HiShieldCheck} color="bg-ingreso" />
      </div>
    </div>
  );
}

function EstadisticasGeneralPanel({ apiBase, oficina, oficinasList, getOficinaNombre, anio, mes, fuenteSnapshot, setDesde, setHasta }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [fuenteRespuesta, setFuenteRespuesta] = useState("");
  const [oficinasData, setOficinasData] = useState([]);

  const [showExport, setShowExport] = useState(false);
  const [showVehiculosExport, setShowVehiculosExport] = useState(false);

  // 🚀 ESTADOS PARA EL MODAL DE LISTADOS
  const [showListado, setShowListado] = useState(false);
  const [tipoListado, setTipoListado] = useState(null);

  const oficinasValidas = Array.isArray(oficinasList) ? oficinasList : [];

  const fetchEstadisticas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("anio", anio);
      params.set("mes", mes);
      if (oficina) params.set("oficina", oficina);
      if (fuenteSnapshot === "snapshot") params.set("usar_snapshot", "1");

      const url = `${apiBase}estadisticas/polizas/por-oficina/?${params.toString()}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();

      setPeriodo(data.periodo || "");
      if(data.desde) setDesde(data.desde);
      if(data.hasta) setHasta(data.hasta);
      setFuenteRespuesta(data.fuente || "");
      setOficinasData(Array.isArray(data.oficinas) ? data.oficinas : []);
    } catch (err) {
      setError("No se pudieron cargar las estadísticas.");
      setOficinasData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstadisticas(); }, [anio, mes, oficina, fuenteSnapshot]);

  const totales = useMemo(() => {
    return oficinasData.reduce((acc, o) => {
        acc.total    += Number(o.polizas_total   || 0);
        acc.activas  += Number(o.polizas_activas || 0);
        // 🔧 FIX: usamos "altas_nuevas_mes" que el backend filtra es_renovacion=False.
        // Fallback a "nuevas_mes" por compatibilidad con snapshots viejos.
        acc.nuevas   += Number(
          o.altas_nuevas_mes != null ? o.altas_nuevas_mes : (o.nuevas_mes || 0)
        );
        acc.bajas    += Number(o.bajas_mes       || 0);
        acc.vencidas += Number(o.en_mora || o.vencidas_mes || o.polizas_vencidas || 0);
        // Nuevos campos — solo si el backend ya los devuelve
        if (o.activas_al_dia  != null) acc.activas_al_dia  = (acc.activas_al_dia  || 0) + Number(o.activas_al_dia);
        if (o.activas_en_mora != null) acc.activas_en_mora = (acc.activas_en_mora || 0) + Number(o.activas_en_mora);
        return acc;
      }, { total: 0, activas: 0, nuevas: 0, bajas: 0, vencidas: 0 }
    );
  }, [oficinasData]);

  // FÓRMULA DE CHURN CORREGIDA: Solo Bajas Reales / Totales * 100
  const churnGlobal = totales.total > 0 ? (totales.bajas / totales.total) * 100 : 0;

  const periodoLabel = periodo || `${String(mes).padStart(2, "0")}/${String(anio).padStart(4, "0")}`;

  // 🚀 MANEJADOR DE CLICS EN LAS TARJETAS DE RESUMEN
  const handleCardClick = (tipo) => {
    setTipoListado(tipo);
    setShowListado(true);
  };

  // 🚀 Descarga Excel completo desde las tarjetas.
  // La tabla/modal puede seguir paginada; este endpoint exporta TODO el queryset filtrado.
  const handleDownloadExcel = async (tipo) => {
    const tipoSeguro = String(tipo || "TOTALES").trim().toUpperCase();

    try {
      const params = new URLSearchParams();
      params.set("formato", "xlsx");
      params.set("tipo_listado", tipoSeguro); // TOTALES, ACTIVAS, ALTAS, VENCIDAS, BAJAS
      params.set("anio", anio); // período del reporte
      params.set("mes", mes); // período del reporte
      params.set("export_all", "1"); // defensivo: la descarga NO debe paginar
      if (oficina) params.set("oficina", oficina);

      const url = `${apiBase}estadisticas/vehiculos/export/?${params.toString()}`;
      const response = await fetch(url, { headers: getAuthHeaders() });

      if (!response.ok) {
        const msg = await response.text().catch(() => "");
        throw new Error(msg || `Error HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const oficinaLabel = oficina ? `Oficina_${oficina}` : "Todas_las_oficinas";
      const fallbackName = `Listado_${tipoSeguro}_${oficinaLabel}_${String(mes).padStart(2, "0")}_${anio}.xlsx`;
      const fileName = getFilenameFromDisposition(response.headers.get("content-disposition"), fallbackName);

      link.href = downloadUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Error en la descarga:", err);
      alert("No se pudo descargar el Excel completo. Intente nuevamente.");
    }
  };

  return (
    <>
      <EstadisticasHeader periodoLabel={periodoLabel} fuenteRespuesta={fuenteRespuesta} loading={loading} onRefresh={fetchEstadisticas} onOpenExport={() => setShowExport(true)} />

      {error && <AnimatedCard index={2}><div className="rounded-2xl border-2 border-egreso/40 bg-egreso/10 px-3 py-2 text-xs font-bold text-egreso dark:text-egreso-claro">{error}</div></AnimatedCard>}

      {/* 🚀 PASAMOS EL HANDLER A LAS TARJETAS */}
      <EstadisticasSummaryCards
        totales={totales}
        churnGlobal={churnGlobal}
        onCardClick={handleCardClick}
        onDownloadExcel={handleDownloadExcel}
      />

      <OficinasTable oficinasData={oficinasData} getOficinaNombre={getOficinaNombre} formatMixPercent={formatMixPercent} />
      <AltasPolizasPanel apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} defaultOficina={oficina} />

      {/* 🆕 NUEVO PANEL: Renovaciones por Oficina (solo es_renovacion=true) */}
      <RenovacionesPolizasPanel
        apiBase={apiBase}
        oficinas={oficinasValidas}
        getOficinaNombre={getOficinaNombre}
        defaultOficina={oficina}
        anio={anio}
        mes={mes}
      />

      <VehiculosPanel apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} defaultOficina={oficina} onOpenExport={() => setShowVehiculosExport(true)} />
      <FutureModulesCard />

      <AseguradosExportModal open={showExport} onClose={() => setShowExport(false)} apiBase={apiBase} oficinas={oficinasValidas} defaultOficina={oficina} getOficinaNombre={getOficinaNombre} />
      <VehiculosExportModal open={showVehiculosExport} onClose={() => setShowVehiculosExport(false)} apiBase={apiBase} oficinas={oficinasValidas} getOficinaNombre={getOficinaNombre} />

      {/* 🚀 INYECTAMOS EL NUEVO MODAL ACÁ */}
      <ListadoClientesModal
        isOpen={showListado}
        onClose={() => setShowListado(false)}
        tipo={tipoListado}
        apiBase={apiBase}
        getOficinaNombre={getOficinaNombre}
        filtros={{ oficina, anio, mes }}
      />
    </>
  );
}

export default function EstadisticasPage() {
  const apiBase = useMemo(() => getApiBase(), []);

  const [tab, setTab] = useState(() => localStorage.getItem("estadisticas.tab") || "general");
  const [dupSub, setDupSub] = useState(() => localStorage.getItem("estadisticas.dupSub") || "clientes");
  useEffect(() => { localStorage.setItem("estadisticas.tab", tab); }, [tab]);

  const hoy = useMemo(() => new Date(), []);
  const [oficina, setOficina] = useState("");
  const [oficinasList, setOficinasList] = useState([]);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [fuenteSnapshot, setFuenteSnapshot] = useState("live");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const fetchOficinasDb = async () => {
      try {
        const res = await fetch(`${apiBase}usuarios/oficinas/`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          setOficinasList(arr);
        }
      } catch (e) {
        console.error("No se pudieron cargar las oficinas dinámicas", e);
      }
    };
    fetchOficinasDb();
  }, [apiBase]);

  const getOficinaNombre = useCallback((id) => {
    if (!id) return "Sin oficina";
    const strId = String(id).trim();
    if (strId === "SIN_OFICINA") return "Sin oficina";
    if (strId === "OTRAS") return "Otras / Sin mapear";

    const arr = Array.isArray(oficinasList) ? oficinasList : [];
    const match = arr.find(o => String(o.id) === strId || String(o.codigo) === strId);

    if (match) return match.nombre;
    return `Oficina ${strId}`;
  }, [oficinasList]);

  return (
    <motion.div className="relative min-h-[calc(100vh-4rem)] bg-surface dark:bg-surface-dark px-4 py-6 sm:px-6 lg:px-10 transition-colors" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-4">

        <EstadisticasFilters
          oficina={oficina}
          setOficina={setOficina}
          oficinasOptions={oficinasList.map(o => String(o.id))}
          anio={anio}
          onAnioChange={setAnio}
          mes={mes}
          onMesChange={setMes}
          fuenteSnapshot={fuenteSnapshot}
          setFuenteSnapshot={setFuenteSnapshot}
          desde={desde}
          hasta={hasta}
          getOficinaNombre={getOficinaNombre}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-2">
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>General</TabButton>
          <TabButton active={tab === "calidad"} onClick={() => setTab("calidad")}>Calidad de datos</TabButton>
          <TabButton active={tab === "duplicados"} onClick={() => setTab("duplicados")}>Duplicados</TabButton>
          <TabButton active={tab === "fechas"} onClick={() => setTab("fechas")}>Control de Fechas</TabButton>
          <TabButton active={tab === "asegurados"} onClick={() => setTab("asegurados")}>Asegurados</TabButton>
          <TabButton active={tab === "contabilidad"} onClick={() => setTab("contabilidad")}>Contabilidad</TabButton>
          <TabButton active={tab === "cobranzas"} onClick={() => setTab("cobranzas")}>Cobranzas</TabButton>
          <TabButton active={tab === "auditoria"} onClick={() => setTab("auditoria")}>Auditoría</TabButton>
        </div>

        <AnimatePresence mode="wait">
          {tab === "general" && (
            <motion.div key="general" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
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
            </motion.div>
          )}

          {tab === "calidad" && (
            <motion.div key="calidad" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <CalidadDatosPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} anio={anio} mes={mes} />
            </motion.div>
          )}

          {tab === "duplicados" && (
            <motion.div key="duplicados" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              {/* Sub-solapas: Clientes / Pólizas */}
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-2">
                <TabButton active={dupSub === "clientes"} onClick={() => { setDupSub("clientes"); localStorage.setItem("estadisticas.dupSub", "clientes"); }}>
                  Clientes duplicados
                </TabButton>
                <TabButton active={dupSub === "polizas"} onClick={() => { setDupSub("polizas"); localStorage.setItem("estadisticas.dupSub", "polizas"); }}>
                  Pólizas duplicadas
                </TabButton>
              </div>

              {dupSub === "clientes"
                ? <DuplicadosClientesPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} />
                : <DuplicadosPolizasPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} />
              }
            </motion.div>
          )}

          {tab === "fechas" && (
            <motion.div key="fechas" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <ControlFechasPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} />
            </motion.div>
          )}

          {tab === "asegurados" && (
            <motion.div key="asegurados" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <DistribucionPanel apiBase={apiBase} oficina={oficina} />
            </motion.div>
          )}

          {tab === "contabilidad" && (
            <motion.div key="contabilidad" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <ContabilidadPanel
                apiBase={apiBase}
                oficina={oficina}
                anio={anio}
                mes={mes}
                getOficinaNombre={getOficinaNombre}
              />
            </motion.div>
          )}

          {tab === "cobranzas" && (
            <motion.div key="cobranzas" className="flex  flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <EfectividadMensajesPanel
                apiBase={apiBase}
                oficina={oficina}
                anio={anio}
                mes={mes}
                desde={desde}
                hasta={hasta}
                getOficinaNombre={getOficinaNombre}
              />
            </motion.div>
          )}

          {tab === "auditoria" && (
            <motion.div key="auditoria" className="flex flex-col gap-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
              <AuditoriaMontosPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} />
              <PagosDuplicadosPanel apiBase={apiBase} oficina={oficina} getOficinaNombre={getOficinaNombre} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
