// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { OFICINAS, getOficinaNombre } from "../components/estadisticas/oficinas";

import EstadisticasHeader from "../components/estadisticas/EstadisticasHeader";
import EstadisticasFilters from "../components/estadisticas/EstadisticasFilters";
import EstadisticasSummaryCards from "../components/estadisticas/EstadisticasSummaryCards";
import OficinasTable from "../components/estadisticas/OficinasTable";
import FutureModulesCard from "../components/estadisticas/FutureModulesCard";
import AnimatedCard from "../components/estadisticas/AnimatedCard";
import AseguradosExportModal from "../components/estadisticas/AseguradosExportModal";

// ✅ panel vehículos + modal export
import VehiculosPanel from "../components/estadisticas/VehiculosPanel";
import VehiculosExportModal from "../components/estadisticas/VehiculosExportModal";

// ✅ altas de póliza por oficina (día/semana/mes)
import AltasPolizasPanel from "../components/estadisticas/AltasPolizasPanel";

const getApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE &&
      String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL &&
      String(import.meta.env.VITE_API_URL).trim()) ||
    "/api/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

// Helpers de formato para mixes
const formatMixPercent = (value, total) => {
  const v = Number(value || 0);
  const t = Number(total || 0);
  if (!t || !v) return "0%";
  const pct = (v / t) * 100;
  return `${pct.toFixed(0)}%`;
};

// Orbes de fondo animados
const ORBS = [
  { top: "12%", left: "10%", size: 140, duration: 18 },
  { top: "70%", left: "15%", size: 160, duration: 22 },
  { top: "30%", left: "85%", size: 120, duration: 20 },
  { top: "65%", left: "80%", size: 180, duration: 26 },
];

export default function EstadisticasPage() {
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [oficina, setOficina] = useState("");
  const [fuenteSnapshot, setFuenteSnapshot] = useState("live"); // "live" | "snapshot"

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [fuenteRespuesta, setFuenteRespuesta] = useState("");
  const [oficinasData, setOficinasData] = useState([]);

  const [showExport, setShowExport] = useState(false);

  // ✅ modal export vehículos
  const [showVehiculosExport, setShowVehiculosExport] = useState(false);
  const [vehiculosExportDefaults, setVehiculosExportDefaults] = useState(null);

  const apiBase = useMemo(() => getApiBase(), []);

  const fetchEstadisticas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("anio", anio);
      params.set("mes", mes);
      if (oficina) params.set("oficina", oficina);
      if (fuenteSnapshot === "snapshot") {
        params.set("usar_snapshot", "1");
      }

      const url = `${apiBase}estadisticas/polizas/por-oficina/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();

      setPeriodo(data.periodo || "");
      setDesde(data.desde || "");
      setHasta(data.hasta || "");
      setFuenteRespuesta(data.fuente || "");
      setOficinasData(Array.isArray(data.oficinas) ? data.oficinas : []);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      setError(
        "No se pudieron cargar las estadísticas. Revisá el endpoint /api/estadisticas/polizas/por-oficina/."
      );
      setOficinasData([]);
      setPeriodo("");
      setDesde("");
      setHasta("");
      setFuenteRespuesta("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes, oficina, fuenteSnapshot]);

  const totales = useMemo(() => {
    return oficinasData.reduce(
      (acc, o) => {
        acc.total += o.polizas_total || 0;
        acc.activas += o.polizas_activas || 0;
        acc.nuevas += o.nuevas_mes || 0;
        acc.bajas += o.bajas_mes || 0;
        const churnPct = Number(o.churn_porcentaje || 0);
        acc.churnSumaPct += churnPct;
        acc.churnOficinasCount += 1;
        return acc;
      },
      {
        total: 0,
        activas: 0,
        nuevas: 0,
        bajas: 0,
        churnSumaPct: 0,
        churnOficinasCount: 0,
      }
    );
  }, [oficinasData]);

  const churnPromedio =
    totales.churnOficinasCount > 0
      ? totales.churnSumaPct / totales.churnOficinasCount
      : 0;

  const oficinasOptions = useMemo(() => {
    const set = new Set();
    oficinasData.forEach((o) => {
      if (o.oficina) set.add(o.oficina);
    });
    return Array.from(set).sort();
  }, [oficinasData]);

  const handleMesChange = (value) => {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) setMes(n);
  };

  const handleAnioChange = (value) => {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 2000 && n <= hoy.getFullYear() + 1) {
      setAnio(n);
    }
  };

  const periodoLabel =
    periodo ||
    `${mes.toString().padStart(2, "0")}/${anio.toString().padStart(4, "0")}`;

  // ✅ abre export vehículos con defaults (los filtros actuales del panel)
  const openVehiculosExport = (defaults) => {
    setVehiculosExportDefaults(defaults || null);
    setShowVehiculosExport(true);
  };

  return (
    <motion.div
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950 px-4 py-6 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* Fondo animado */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 left-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        {ORBS.map((orb, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full bg-sky-400/10 blur-2xl shadow-[0_0_60px_rgba(56,189,248,0.35)]"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
            }}
            animate={{
              y: ["-10px", "15px", "-10px"],
              x: ["0px", idx % 2 === 0 ? "10px" : "-10px", "0px"],
              opacity: [0.55, 0.95, 0.55],
            }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        {/* HEADER */}
        <EstadisticasHeader
          periodoLabel={periodoLabel}
          fuenteRespuesta={fuenteRespuesta}
          loading={loading}
          onRefresh={fetchEstadisticas}
          onOpenExport={() => setShowExport(true)}
        />

        {/* FILTROS */}
        <EstadisticasFilters
          oficina={oficina}
          setOficina={setOficina}
          oficinasOptions={
            oficinasOptions.length ? oficinasOptions : OFICINAS.map((o) => o.id)
          }
          anio={anio}
          onAnioChange={handleAnioChange}
          mes={mes}
          onMesChange={handleMesChange}
          fuenteSnapshot={fuenteSnapshot}
          setFuenteSnapshot={setFuenteSnapshot}
          desde={desde}
          hasta={hasta}
        />

        {/* ERROR */}
        {error && (
          <AnimatedCard
            index={2}
            interactive={false}
            glow="from-rose-500/50 via-red-500/30 to-transparent"
          >
            <div className="rounded-xl border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs sm:text-sm text-rose-100">
              {error}
            </div>
          </AnimatedCard>
        )}

        {/* RESUMEN */}
        <EstadisticasSummaryCards
          totales={totales}
          churnPromedio={churnPromedio}
        />

        {/* TABLA POR OFICINA */}
        <OficinasTable
          oficinasData={oficinasData}
          getOficinaNombre={getOficinaNombre}
          formatMixPercent={formatMixPercent}
        />

        {/* ✅ ALTAS DE PÓLIZA POR OFICINA (día/semana/mes) */}
        <AltasPolizasPanel
          apiBase={apiBase}
          oficinas={OFICINAS}
          getOficinaNombre={getOficinaNombre}
          defaultOficina={oficina}
        />

        {/* ✅ PANEL VEHÍCULOS */}
        <VehiculosPanel
          apiBase={apiBase}
          oficinas={OFICINAS}
          getOficinaNombre={getOficinaNombre}
          defaultOficina={oficina}
          onOpenExport={openVehiculosExport}
        />

        {/* FUTURO */}
        <FutureModulesCard />
      </div>

      <AseguradosExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        apiBase={apiBase}
        oficinas={OFICINAS}
        defaultOficina={oficina}
        getOficinaNombre={getOficinaNombre}
      />

      {/* ✅ EXPORT VEHÍCULOS */}
      <VehiculosExportModal
        open={showVehiculosExport}
        onClose={() => setShowVehiculosExport(false)}
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaults={vehiculosExportDefaults}
      />
    </motion.div>
  );
}
