// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

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

  // ✅ NUEVO: Duplicados (clientes / pólizas)
  const [dupExpanded, setDupExpanded] = useState(false);

  const [dupLoading, setDupLoading] = useState(false);
  const [dupError, setDupError] = useState("");

  const [dupClientes, setDupClientes] = useState(null);
  const [dupPolizas, setDupPolizas] = useState(null);

  const [dupPolizasSoloActivas, setDupPolizasSoloActivas] = useState(true);
  const [dupMaxGroups, setDupMaxGroups] = useState(120);
  const [dupMaxItems, setDupMaxItems] = useState(12);

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

  const fetchDuplicados = async () => {
    setDupLoading(true);
    setDupError("");
    try {
      const maxG = clamp(Number(dupMaxGroups || 120), 10, 2000);
      const maxI = clamp(Number(dupMaxItems || 12), 5, 200);

      const paramsClientes = new URLSearchParams();
      paramsClientes.set("modos", "dni,telefono,email");
      paramsClientes.set("max_groups", String(maxG));
      paramsClientes.set("max_items", String(maxI));

      const paramsPolizas = new URLSearchParams();
      paramsPolizas.set("solo_activas", dupPolizasSoloActivas ? "1" : "0");
      paramsPolizas.set("max_groups", String(maxG));
      paramsPolizas.set("max_items", String(maxI));

      const urlClientes = `${apiBase}estadisticas/duplicados/clientes/?${paramsClientes.toString()}`;
      const urlPolizas = `${apiBase}estadisticas/duplicados/polizas/?${paramsPolizas.toString()}`;

      const [resC, resP] = await Promise.all([
        fetch(urlClientes, { credentials: "include" }),
        fetch(urlPolizas, { credentials: "include" }),
      ]);

      if (!resC.ok) throw new Error(`Clientes duplicados: HTTP ${resC.status}`);
      if (!resP.ok) throw new Error(`Pólizas duplicadas: HTTP ${resP.status}`);

      const dataC = await resC.json();
      const dataP = await resP.json();

      setDupClientes(dataC || null);
      setDupPolizas(dataP || null);
    } catch (err) {
      console.error("Error al cargar duplicados:", err);
      setDupClientes(null);
      setDupPolizas(null);
      setDupError(
        "No se pudieron cargar los duplicados. Revisá los endpoints /api/estadisticas/duplicados/clientes/ y /api/estadisticas/duplicados/polizas/."
      );
    } finally {
      setDupLoading(false);
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

  // ✅ cargamos duplicados al montar (y si cambias los parámetros locales)
  useEffect(() => {
    fetchDuplicados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dupPolizasSoloActivas]);

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

  const dupClientesGroups = useMemo(() => {
    const grupos = dupClientes?.grupos;
    return Array.isArray(grupos) ? grupos : [];
  }, [dupClientes]);

  const dupPolizasGroups = useMemo(() => {
    const grupos = dupPolizas?.grupos;
    return Array.isArray(grupos) ? grupos : [];
  }, [dupPolizas]);

  const dupClientesCountsByModo = useMemo(() => {
    const acc = { dni: 0, telefono: 0, email: 0 };
    dupClientesGroups.forEach((g) => {
      const m = String(g?.modo || "").toLowerCase();
      if (m in acc) acc[m] += 1;
    });
    return acc;
  }, [dupClientesGroups]);

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
          <AnimatedCard
            index={3}
            glow="from-fuchsia-500/50 via-sky-500/25 to-transparent"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <HiShieldCheck className="h-5 w-5 text-sky-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Autos con robo (Agrosalta)
                  </span>
                </div>

                <div className="text-3xl font-semibold text-slate-50">
                  {agroLoading
                    ? "…"
                    : Number(agroKpis?.autos_con_robo || 0).toLocaleString(
                        "es-AR"
                      )}
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
                      {Number(agroKpis.autos_cobertura_A || 0).toLocaleString(
                        "es-AR"
                      )}
                    </span>
                    {Number(agroKpis.autos_sin_cobertura || 0) > 0 && (
                      <>
                        {" · "}
                        Sin cobertura:{" "}
                        <span className="font-semibold text-amber-200">
                          {Number(agroKpis.autos_sin_cobertura || 0).toLocaleString(
                            "es-AR"
                          )}
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

          <AnimatedCard
            index={4}
            glow="from-emerald-500/45 via-cyan-500/20 to-transparent"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <HiTruck className="h-5 w-5 text-emerald-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Camiones (Agrosalta)
                  </span>
                </div>

                <div className="text-3xl font-semibold text-slate-50">
                  {agroLoading
                    ? "…"
                    : Number(agroKpis?.camiones_total || 0).toLocaleString(
                        "es-AR"
                      )}
                </div>

                <div className="text-xs text-slate-400">
                  Compañía = Agrosalta {oficina ? `(ofi ${oficina})` : ""}
                </div>

                {!agroLoading &&
                  Array.isArray(agroKpis?.camiones_por_compania) &&
                  agroKpis.camiones_por_compania.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      <div className="text-[11px] text-slate-400">
                        Total camiones (todas):{" "}
                        <span className="font-semibold text-slate-200">
                          {Number(
                            agroKpis?.camiones_total_todas_companias || 0
                          ).toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="grid gap-1 rounded-xl border border-white/10 bg-white/5 p-2">
                        {agroKpis.camiones_por_compania.slice(0, 6).map((row, i) => {
                          const name = String(row?.compania || "—");
                          const isAgro = name.toLowerCase().includes("agrosalta");
                          return (
                            <div
                              key={`${name}-${i}`}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span
                                className={
                                  isAgro
                                    ? "font-semibold text-emerald-200"
                                    : "text-slate-200"
                                }
                              >
                                {name}
                              </span>
                              <span
                                className={
                                  isAgro
                                    ? "font-semibold text-emerald-100"
                                    : "text-slate-300"
                                }
                              >
                                {Number(row?.cantidad || 0).toLocaleString("es-AR")}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {agroKpis.camiones_por_compania.length > 6 && (
                        <div className="text-[11px] text-slate-500">
                          +{agroKpis.camiones_por_compania.length - 6} compañías
                          más…
                        </div>
                      )}
                    </div>
                  )}
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

        {/* ✅ NUEVO: DUPLICADOS */}
        <AnimatedCard
          index={6}
          glow="from-rose-500/25 via-fuchsia-500/20 to-transparent"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <HiExclamation className="h-5 w-5 text-rose-200" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    Duplicados (calidad de datos)
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Clientes (por DNI/teléfono/email) y pólizas (por patente). Usá esto
                  para limpiar y evitar inconsistencias.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-400"
                    checked={dupPolizasSoloActivas}
                    onChange={(e) => setDupPolizasSoloActivas(e.target.checked)}
                  />
                  Pólizas: solo activas
                </label>

                <button
                  type="button"
                  onClick={fetchDuplicados}
                  disabled={dupLoading}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {dupLoading ? "Actualizando…" : "Refrescar"}
                </button>

                <button
                  type="button"
                  onClick={() => setDupExpanded((v) => !v)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                >
                  {dupExpanded ? "Ocultar detalle" : "Ver detalle"}
                </button>
              </div>
            </div>

            {dupError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
                <HiExclamation className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{dupError}</span>
              </div>
            )}

            {/* Resumen cards */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Clientes duplicados
                    </div>
                    <div className="text-3xl font-semibold text-slate-50">
                      {dupLoading
                        ? "…"
                        : Number(dupClientes?.total_grupos || 0).toLocaleString(
                            "es-AR"
                          )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Grupos detectados (clave repetida).
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 text-[11px] text-slate-300">
                    <div>
                      DNI:{" "}
                      <span className="font-semibold text-slate-100">
                        {Number(dupClientesCountsByModo.dni || 0).toLocaleString(
                          "es-AR"
                        )}
                      </span>
                    </div>
                    <div>
                      Tel:{" "}
                      <span className="font-semibold text-slate-100">
                        {Number(
                          dupClientesCountsByModo.telefono || 0
                        ).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div>
                      Email:{" "}
                      <span className="font-semibold text-slate-100">
                        {Number(dupClientesCountsByModo.email || 0).toLocaleString(
                          "es-AR"
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Clientes en los grupos devueltos:{" "}
                  <span className="font-semibold text-slate-200">
                    {Number(
                      dupClientes?.total_clientes_en_grupos_devueltos || 0
                    ).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Pólizas duplicadas
                    </div>
                    <div className="text-3xl font-semibold text-slate-50">
                      {dupLoading
                        ? "…"
                        : Number(dupPolizas?.total_grupos || 0).toLocaleString(
                            "es-AR"
                          )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Por patente (normalizada).
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
                    {dupPolizasSoloActivas ? "solo activas" : "incluye inactivas"}
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Pólizas en los grupos devueltos:{" "}
                  <span className="font-semibold text-slate-200">
                    {Number(
                      dupPolizas?.total_polizas_en_grupos_devueltos || 0
                    ).toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {dupExpanded && (
                <motion.div
                  className="mt-1 grid gap-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {/* Clientes (tabla simple) */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Clientes — detalle
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Mostrando hasta {dupMaxGroups} grupos · {dupMaxItems} items
                        por grupo
                      </div>
                    </div>

                    {dupClientesGroups.length === 0 ? (
                      <div className="mt-2 text-sm text-slate-300">
                        {dupLoading
                          ? "Cargando…"
                          : "No se detectaron duplicados (con los modos actuales)."}
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {dupClientesGroups.slice(0, dupMaxGroups).map((g, idx) => (
                          <div
                            key={`${g?.modo || "x"}-${g?.key || "y"}-${idx}`}
                            className="rounded-xl border border-white/10 bg-slate-950/30 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                                  {String(g?.modo || "").toUpperCase()}
                                </span>
                                <span className="text-sm font-semibold text-slate-100">
                                  {String(g?.key || "—")}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-300">
                                <span className="font-semibold text-slate-100">
                                  {Number(g?.count || 0).toLocaleString("es-AR")}
                                </span>{" "}
                                clientes {g?.truncated ? "(truncado)" : ""}
                              </div>
                            </div>

                            <div className="mt-2 grid gap-1">
                              {(Array.isArray(g?.clientes) ? g.clientes : []).map(
                                (c, i) => (
                                  <div
                                    key={`${c?.id || "c"}-${i}`}
                                    className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-100">
                                        #{c?.id} —{" "}
                                        {`${c?.apellido || ""} ${c?.nombre || ""}`.trim() ||
                                          "—"}
                                      </span>
                                      <span className="text-slate-300">
                                        {c?.estado ? `Estado: ${c.estado}` : ""}
                                      </span>
                                    </div>
                                    <div className="text-slate-300">
                                      DNI/CUIT:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {c?.dni_cuit_cuil || "—"}
                                      </span>
                                      {" · "}
                                      Tel:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {c?.telefono || "—"}
                                      </span>
                                      {" · "}
                                      Email:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {c?.email || "—"}
                                      </span>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pólizas (tabla simple) */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Pólizas — detalle (patente)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {dupPolizasSoloActivas
                          ? "Solo activas"
                          : "Incluye activas e inactivas"}
                      </div>
                    </div>

                    {dupPolizasGroups.length === 0 ? (
                      <div className="mt-2 text-sm text-slate-300">
                        {dupLoading
                          ? "Cargando…"
                          : "No se detectaron duplicados de pólizas por patente."}
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {dupPolizasGroups.slice(0, dupMaxGroups).map((g, idx) => (
                          <div
                            key={`${g?.key || "p"}-${idx}`}
                            className="rounded-xl border border-white/10 bg-slate-950/30 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                                  PATENTE
                                </span>
                                <span className="text-sm font-semibold text-slate-100">
                                  {String(g?.key || "—")}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-300">
                                <span className="font-semibold text-slate-100">
                                  {Number(g?.count || 0).toLocaleString("es-AR")}
                                </span>{" "}
                                pólizas {g?.truncated ? "(truncado)" : ""}
                              </div>
                            </div>

                            <div className="mt-2 grid gap-1">
                              {(Array.isArray(g?.polizas) ? g.polizas : []).map(
                                (p, i) => (
                                  <div
                                    key={`${p?.poliza_id || "p"}-${i}`}
                                    className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px]"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-100">
                                        #{p?.poliza_id} — {p?.numero_poliza || "—"}
                                      </span>
                                      <span className="text-slate-300">
                                        {p?.estado ? `Estado: ${p.estado}` : ""}
                                      </span>
                                    </div>

                                    <div className="text-slate-300">
                                      Asegurado:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {p?.asegurado || "—"}
                                      </span>
                                      {" · "}
                                      DNI/CUIT:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {p?.dni_cuit_cuil || "—"}
                                      </span>
                                    </div>

                                    <div className="text-slate-300">
                                      Compañía:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {p?.compania || "—"}
                                      </span>
                                      {" · "}
                                      Oficina:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {p?.oficina || "—"}
                                      </span>
                                      {" · "}
                                      Vehículo:{" "}
                                      <span className="font-semibold text-slate-200">
                                        {`${p?.marca || ""} ${p?.modelo || ""}`.trim() ||
                                          "—"}
                                        {p?.anio ? ` (${p.anio})` : ""}
                                      </span>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatedCard>

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
