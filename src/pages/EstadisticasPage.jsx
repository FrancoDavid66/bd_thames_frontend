// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiOfficeBuilding,
  HiRefresh,
  HiCalendar,
  HiChartBar,
  HiShieldCheck,
  HiSparkles,
} from "react-icons/hi";

import Card from "../components/comunes/Card";

const getApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE &&
      String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL &&
      String(import.meta.env.VITE_API_URL).trim()) ||
    "/api/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

// 🏢 Mapa de oficinas (id → nombre amigable)
const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];

const getOficinaNombre = (valor) => {
  if (!valor) return "SIN_OFICINA";
  const id = String(valor).trim();
  const match = OFICINAS.find((o) => o.id === id);
  return match ? match.nombre : valor;
};

// Variants para animar entrada de las cards
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: 0.08 + i * 0.06 },
  }),
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

// Wrapper para darle glow y animación card-por-card
const AnimatedCard = ({ children, index = 0, glow, interactive = true }) => {
  const baseGlow =
    glow || "from-sky-500/40 via-emerald-500/20 to-transparent";

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={
        interactive
          ? {
              scale: 1.03,
              y: -3,
            }
          : undefined
      }
      whileTap={interactive ? { scale: 0.97 } : undefined}
      className="relative group"
    >
      <motion.div
        className={`pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${baseGlow} opacity-40 group-hover:opacity-80 -z-10`}
        animate={{
          opacity: [0.25, 0.65, 0.25],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.25,
        }}
      />
      <Card>{children}</Card>
    </motion.div>
  );
};

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
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }
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

  // Totales agregados
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

  // Lista de oficinas para el combo
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
        <AnimatedCard
          index={0}
          interactive={false}
          glow="from-sky-500/60 via-indigo-500/40 to-transparent"
        >
          <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <motion.div
              className="pointer-events-none absolute inset-x-4 -top-1 h-px bg-gradient-to-r from-transparent via-sky-400/80 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            <div>
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-sky-300">
                <HiSparkles className="h-4 w-4 text-emerald-300" />
                Tablero de oficinas · {periodoLabel}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">
                📊 Estadísticas por oficina
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Visualizá el stock por sucursal, las altas y bajas del mes, la
                antigüedad del libro y el churn basado en cuotas vencidas.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <motion.button
                type="button"
                onClick={fetchEstadisticas}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-900/40"
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.96 }}
              >
                <HiRefresh className={loading ? "animate-spin" : ""} />
                {loading ? "Actualizando..." : "Actualizar datos"}
              </motion.button>
              {fuenteRespuesta && (
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-slate-200 ring-1 ring-slate-700/80"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <HiChartBar className="h-3 w-3 text-sky-300" />
                  Fuente:{" "}
                  <span className="uppercase font-semibold text-sky-200">
                    {fuenteRespuesta}
                  </span>
                </motion.span>
              )}
            </div>
          </div>
        </AnimatedCard>

        {/* FILTROS */}
        <AnimatedCard
          index={1}
          interactive={false}
          glow="from-emerald-500/40 via-cyan-500/25 to-transparent"
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* Oficina */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <HiOfficeBuilding className="text-sky-300" />
                Oficina
              </label>
              <select
                className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={oficina}
                onChange={(e) => setOficina(e.target.value)}
              >
                <option value="">Todas las oficinas</option>
                {oficinasOptions.map((of) => (
                  <option key={of} value={of}>
                    {getOficinaNombre(of)}
                  </option>
                ))}
              </select>
            </div>

            {/* Año */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <HiCalendar className="text-sky-300" />
                Año
              </label>
              <input
                type="number"
                className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={anio}
                onChange={(e) => handleAnioChange(e.target.value)}
              />
            </div>

            {/* Mes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <HiCalendar className="text-sky-300" />
                Mes
              </label>
              <select
                className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={mes}
                onChange={(e) => handleMesChange(e.target.value)}
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>

            {/* Modo de cálculo */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <HiChartBar className="text-sky-300" />
                Modo de cálculo
              </label>
              <select
                className="h-9 rounded-lg bg-slate-950 border border-slate-700 text-xs sm:text-sm px-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={fuenteSnapshot}
                onChange={(e) => setFuenteSnapshot(e.target.value)}
              >
                <option value="live">Cálculo en vivo</option>
                <option value="snapshot">Snapshot guardado (si existe)</option>
              </select>
              {desde && hasta && (
                <span className="mt-0.5 text-[10px] text-slate-400">
                  Período: {desde} → {hasta}
                </span>
              )}
            </div>
          </div>
        </AnimatedCard>

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

        {/* TARJETAS RESUMEN */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Pólizas totales */}
          <AnimatedCard
            index={3}
            glow="from-sky-500/60 via-cyan-500/35 to-transparent"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Pólizas totales
                </span>
                <HiChartBar className="h-5 w-5 text-sky-300" />
              </div>
              <p className="text-2xl font-bold text-slate-50">
                {totales.total.toLocaleString("es-AR")}
              </p>
              <p className="text-xs font-medium text-slate-400">
                Stock total de pólizas en las oficinas seleccionadas.
              </p>
            </div>
          </AnimatedCard>

          {/* Pólizas activas */}
          <AnimatedCard
            index={4}
            glow="from-emerald-500/60 via-sky-500/30 to-transparent"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Pólizas activas
                </span>
                <HiShieldCheck className="h-5 w-5 text-emerald-300" />
              </div>
              <p className="text-2xl font-bold text-slate-50">
                {totales.activas.toLocaleString("es-AR")}
              </p>
              <p className="text-xs font-medium text-slate-400">
                Pólizas en estado <strong>activa</strong> al cierre del
                período.
              </p>
            </div>
          </AnimatedCard>

          {/* Altas del mes */}
          <AnimatedCard
            index={5}
            glow="from-emerald-400/60 via-lime-400/30 to-transparent"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Altas del mes
                </span>
                <HiChartBar className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-slate-50">
                {totales.nuevas.toLocaleString("es-AR")}
              </p>
              <p className="text-xs font-medium text-slate-400">
                Pólizas con <strong>fecha_emision</strong> dentro del
                período.
              </p>
            </div>
          </AnimatedCard>

          {/* Churn promedio (cuotas vencidas) */}
          <AnimatedCard
            index={6}
            glow="from-rose-500/60 via-amber-400/30 to-transparent"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Churn promedio
                </span>
                <HiChartBar className="h-5 w-5 text-rose-300" />
              </div>
              <p className="text-2xl font-bold text-slate-50">
                {churnPromedio.toFixed(1)}%
              </p>
              <p className="text-xs font-medium text-slate-400">
                % de pólizas con <strong>cuotas vencidas</strong> sobre el
                stock de pólizas por oficina.
              </p>
            </div>
          </AnimatedCard>
        </div>

        {/* TABLA POR OFICINA */}
        <AnimatedCard
          index={7}
          interactive={false}
          glow="from-indigo-500/50 via-sky-500/25 to-transparent"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-100">
                <HiOfficeBuilding className="text-sky-300" />
                <span>Detalle por oficina</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {oficinasData.length} oficinas encontradas
              </span>
            </div>

            {oficinasData.length === 0 ? (
              <div className="px-1 py-4 text-xs sm:text-sm text-slate-400">
                No hay datos para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-slate-900/80 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-300">
                        Oficina
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-300">
                        Pólizas totales
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-300">
                        Activas
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-emerald-200">
                        Altas mes
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-rose-200">
                        Bajas mes
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-200">
                        Churn %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {oficinasData.map((o, idx) => {
                      const totalOf = Number(o.polizas_total || 0);
                      const mixCob = o.por_cobertura || {};
                      const mixComp = o.por_compania || {};
                      const antig = o.antiguedad || {};
                      const churnPct = Number(o.churn_porcentaje || 0);

                      // Resumen coberturas (solo %)
                      const cobKeys = Object.keys(mixCob);
                      const cobResumen = cobKeys
                        .slice(0, 3)
                        .map((k) =>
                          `${k}: ${formatMixPercent(mixCob[k], totalOf)}`
                        )
                        .join(" · ");

                      // Resumen compañías: número + %
                      const compKeys = Object.keys(mixComp);
                      const compResumen = compKeys
                        .slice(0, 3)
                        .map((k) => {
                          const count = Number(mixComp[k] || 0);
                          const pct = formatMixPercent(count, totalOf);
                          return `${k}: ${count} (${pct})`;
                        })
                        .join(" · ");

                      // Antigüedad del libro
                      const antigResumenParts = [];
                      if (antig["0_1"])
                        antigResumenParts.push(`0–1: ${antig["0_1"]}`);
                      if (antig["1_3"])
                        antigResumenParts.push(`1–3: ${antig["1_3"]}`);
                      if (antig["3_5"])
                        antigResumenParts.push(`3–5: ${antig["3_5"]}`);
                      if (antig["5_plus"])
                        antigResumenParts.push(`5+: ${antig["5_plus"]}`);
                      const antigResumen = antigResumenParts.join(" · ");

                      // Años de vehículo (rango + promedio)
                      const anioVeh = o.anio_vehiculo || {};
                      let anioLabel = "";
                      if (anioVeh.min && anioVeh.max) {
                        const prom =
                          anioVeh.promedio !== undefined &&
                          anioVeh.promedio !== null
                            ? Math.round(Number(anioVeh.promedio))
                            : null;
                        anioLabel = prom
                          ? `${anioVeh.min}–${anioVeh.max} (prom: ${prom})`
                          : `${anioVeh.min}–${anioVeh.max}`;
                      } else if (
                        anioVeh.promedio !== undefined &&
                        anioVeh.promedio !== null
                      ) {
                        const prom = Math.round(Number(anioVeh.promedio));
                        anioLabel = `prom: ${prom}`;
                      }

                      // Color del churn
                      let churnColor = "text-slate-100";
                      if (churnPct >= 5 && churnPct < 10) {
                        churnColor = "text-amber-300";
                      } else if (churnPct >= 10) {
                        churnColor = "text-rose-300";
                      } else if (churnPct > 0 && churnPct < 5) {
                        churnColor = "text-emerald-300";
                      }

                      return (
                        <motion.tr
                          key={`${o.oficina || "SIN"}-${idx}`}
                          className={
                            idx % 2 === 0
                              ? "bg-slate-900/40"
                              : "bg-slate-900/10"
                          }
                          whileHover={{
                            backgroundColor: "rgba(15,23,42,0.95)",
                          }}
                          transition={{ duration: 0.15 }}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-slate-100 align-top">
                            <div className="font-semibold">
                              {getOficinaNombre(o.oficina)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-400 space-y-0.5">
                              {cobResumen && (
                                <div>Coberturas: {cobResumen}</div>
                              )}
                              {compResumen && (
                                <div>Compañías: {compResumen}</div>
                              )}
                              {antigResumen && (
                                <div>Antigüedad (años): {antigResumen}</div>
                              )}
                              {anioLabel && (
                                <div>Años vehículo: {anioLabel}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-100 align-top">
                            {totalOf.toLocaleString("es-AR")}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-200 align-top">
                            {(o.polizas_activas || 0).toLocaleString("es-AR")}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-200 align-top">
                            {(o.nuevas_mes || 0).toLocaleString("es-AR")}
                          </td>
                          <td className="px-3 py-2 text-right text-rose-200 align-top">
                            {(o.bajas_mes || 0).toLocaleString("es-AR")}
                          </td>
                          <td
                            className={`px-3 py-2 text-right align-top font-semibold ${churnColor}`}
                          >
                            {churnPct.toFixed(1)}%
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* FUTURO MÓDULOS */}
        <AnimatedCard
          index={8}
          interactive={false}
          glow="from-amber-500/50 via-rose-500/30 to-transparent"
        >
          <div className="text-[11px] sm:text-xs text-slate-400">
            Próximos módulos a sumar en este tablero:
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Cobranzas y morosidad por oficina (desde Pagos).</li>
              <li>Solicitudes y tasa de conversión por oficina.</li>
              <li>Clientes nuevos, cartera y churn de clientes.</li>
            </ul>
          </div>
        </AnimatedCard>
      </div>
    </motion.div>
  );
}
