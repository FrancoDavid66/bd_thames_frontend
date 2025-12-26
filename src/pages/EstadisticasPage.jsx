// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HiShieldCheck, HiTruck, HiExclamation } from "react-icons/hi";

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

// ✅ NUEVO: altas de póliza por oficina (día/semana/mes)
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

  // ✅ KPIs Agrosalta
  const [agroKpis, setAgroKpis] = useState(null);
  const [agroLoading, setAgroLoading] = useState(false);
  const [agroError, setAgroError] = useState("");

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

  const fetchAgroKpis = async () => {
    setAgroLoading(true);
    setAgroError("");
    try {
      const params = new URLSearchParams();
      params.set("solo_activas", "1");
      if (oficina) params.set("oficina", oficina);

      const url = `${apiBase}estadisticas/agrosalta/kpis/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      setAgroKpis(data || null);
    } catch (err) {
      console.error("Error al cargar KPIs Agrosalta:", err);
      setAgroKpis(null);
      setAgroError(
        "No se pudieron cargar los KPIs de Agrosalta. Revisá el endpoint /api/estadisticas/agrosalta/kpis/."
      );
    } finally {
      setAgroLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes, oficina, fuenteSnapshot]);

  useEffect(() => {
    fetchAgroKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

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

        {/* ✅ KPIs AGROSALTA (compañía + regla cobertura) */}
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard index={3} glow="from-fuchsia-500/50 via-sky-500/25 to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <HiShieldCheck className="h-5 w-5 text-sky-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Autos con robo (Agrosalta)
                  </span>
                </div>

                <div className="text-3xl font-semibold text-slate-50">
                  {agroLoading ? "…" : Number(agroKpis?.autos_con_robo || 0).toLocaleString("es-AR")}
                </div>

                <div className="text-xs text-slate-400">
                  Regla: cobertura != “A” {oficina ? `(ofi ${oficina})` : ""}
                </div>

                {!agroLoading && agroKpis && (
                  <div className="mt-1 text-[11px] text-slate-400">
                    Total autos:{" "}
                    <span className="font-semibold text-slate-200">
                      {Number(agroKpis.autos_total || 0).toLocaleString("es-AR")}
                    </span>
                    {" · "}
                    Cobertura A:{" "}
                    <span className="font-semibold text-slate-200">
                      {Number(agroKpis.autos_cobertura_A || 0).toLocaleString("es-AR")}
                    </span>
                    {Number(agroKpis.autos_sin_cobertura || 0) > 0 && (
                      <>
                        {" · "}
                        Sin cobertura:{" "}
                        <span className="font-semibold text-amber-200">
                          {Number(agroKpis.autos_sin_cobertura || 0).toLocaleString("es-AR")}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                solo activas
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard index={4} glow="from-emerald-500/45 via-cyan-500/20 to-transparent">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <HiTruck className="h-5 w-5 text-emerald-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Camiones (Agrosalta)
                  </span>
                </div>

                <div className="text-3xl font-semibold text-slate-50">
                  {agroLoading ? "…" : Number(agroKpis?.camiones_total || 0).toLocaleString("es-AR")}
                </div>

                <div className="text-xs text-slate-400">
                  Compañía = Agrosalta {oficina ? `(ofi ${oficina})` : ""}
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {agroError && (
          <AnimatedCard
            index={5}
            interactive={false}
            glow="from-amber-500/50 via-orange-500/25 to-transparent"
          >
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
              <HiExclamation className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{agroError}</span>
            </div>
          </AnimatedCard>
        )}

        {/* TABLA POR OFICINA */}
        <OficinasTable
          oficinasData={oficinasData}
          getOficinaNombre={getOficinaNombre}
          formatMixPercent={formatMixPercent}
        />

        {/* ✅ NUEVO: ALTAS DE PÓLIZA POR OFICINA (día/semana/mes) */}
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
