// src/pages/CuponerasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiRefresh,
  HiExclamation,
  HiBadgeCheck,
  HiClock,
  HiSearch,
} from "react-icons/hi";
import { Link } from "react-router-dom";
import axios from "axios";

const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const http = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

const badgeByEstado = {
  PENDIENTE: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  AL_DIA: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  PAGADA: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  VENCIDA: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const labelByEstado = {
  PENDIENTE: "Pendiente",
  AL_DIA: "Al día",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

function formatDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatPeriodo(c) {
  if (!c?.periodo_desde || !c?.periodo_hasta) return "—";
  const desde = dayjs(c.periodo_desde);
  const hasta = dayjs(c.periodo_hasta);
  if (!desde.isValid() || !hasta.isValid()) return "—";
  if (desde.month() === hasta.month() && desde.year() === hasta.year()) {
    return desde.format("MM/YYYY");
  }
  return `${desde.format("MM/YYYY")} – ${hasta.format("MM/YYYY")}`;
}

// 👇 Normalizamos el estado visual igual que en el panel de cuponeras
function getVisualEstado(c) {
  const baseEstado = (c?.estado || "").toUpperCase();

  // Pagada siempre es pagada
  if (baseEstado === "PAGADA") return "PAGADA";

  const hoy = dayjs().startOf("day");

  if (!c?.fecha_vencimiento) {
    // Sin vencimiento: lo tratamos como al día
    return "AL_DIA";
  }

  const vto = dayjs(c.fecha_vencimiento);
  if (!vto.isValid()) {
    // Si el vto viene raro, devolvemos el estado original o PENDIENTE
    return baseEstado || "PENDIENTE";
  }

  const diff = vto.diff(hoy, "day");
  if (diff < 0) {
    return "VENCIDA";
  }

  // No pagada + no vencida => AL_DIA
  return "AL_DIA";
}

// 🎨 Tono de fila según vencimiento
function getRowTone(c) {
  const visual = getVisualEstado(c);
  const hoy = dayjs().startOf("day");

  if (!c.fecha_vencimiento) return "";

  const vto = dayjs(c.fecha_vencimiento);
  if (!vto.isValid()) return "";

  const diff = vto.diff(hoy, "day");

  if (visual === "VENCIDA") {
    return "bg-rose-500/5";
  }
  if (visual === "AL_DIA" && diff <= 7 && diff >= 0) {
    return "bg-amber-500/5";
  }
  return "";
}

export default function CuponerasPage() {
  const [cupones, setCupones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // 🔎 texto del buscador (póliza, patente, asegurado, DNI)
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const hoy = dayjs().startOf("day");
    let total = 0;
    let totalPendientes = 0; // 🔁 ahora significa "AL DÍA" (no pagado y no vencido)
    let porVencer7 = 0;
    let vencidas = 0;

    for (const c of cupones || []) {
      total += 1;
      const visual = getVisualEstado(c);

      if (visual === "PAGADA") continue;

      const vto = c.fecha_vencimiento ? dayjs(c.fecha_vencimiento) : null;

      if (visual === "VENCIDA") {
        vencidas += 1;
        continue;
      }

      if (visual === "AL_DIA") {
        totalPendientes += 1;
        if (vto && vto.isValid()) {
          const diff = vto.diff(hoy, "day");
          if (diff <= 7 && diff >= 0) {
            porVencer7 += 1;
          }
        }
      }
    }

    return {
      total,
      totalPendientes, // = cupones vigentes al día
      porVencer7,
      vencidas,
    };
  }, [cupones]);

  const loadCupones = async (term = "") => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      const q = term.trim();
      if (q) {
        // usa DRF SearchFilter con search_fields del ViewSet
        params.search = q;
      }

      const res = await http.get("polizas/cupones-robo/", { params });
      let data = res.data;
      if (Array.isArray(data)) {
        setCupones(data);
      } else if (Array.isArray(data?.results)) {
        setCupones(data.results);
      } else {
        setCupones([]);
      }
      setLastLoadedAt(new Date().toISOString());
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las cuponeras de robo.");
      setCupones([]);
    } finally {
      setLoading(false);
    }
  };

  // Primer load + recarga cuando cambia el search (con debounce)
  useEffect(() => {
    const id = setTimeout(() => {
      loadCupones(search);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Cuponeras de robo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Resumen global de cupones de robo vinculados a pólizas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastLoadedAt && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Actualizado:{" "}
              {dayjs(lastLoadedAt).format("DD/MM/YYYY HH:mm")}
            </span>
          )}
          <button
            onClick={() => loadCupones(search)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800/40 text-white px-4 py-2 text-sm font-medium shadow-sm shadow-sky-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          >
            <HiRefresh
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <motion.div
          layout
          className="rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-sm shadow-slate-900/40 p-4 flex flex-col gap-1"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Total cuponeras
          </span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {stats.total}
            </span>
          </div>
        </motion.div>

        {/* Al día (no pagados y no vencidos) */}
        <motion.div
          layout
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm shadow-emerald-900/40 p-4 flex flex-col gap-1"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-emerald-300">
            Al día (no pagados)
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-semibold text-emerald-200">
              {stats.totalPendientes}
            </span>
            <HiBadgeCheck className="h-6 w-6 text-emerald-300" />
          </div>
        </motion.div>

        {/* Por vencer en 7 días */}
        <motion.div
          layout
          className="rounded-2xl border border-amber-500/25 bg-amber-500/10 shadow-sm shadow-amber-900/40 p-4 flex flex-col gap-1"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-amber-200">
            Por vencer (≤ 7 días)
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-semibold text-amber-100">
              {stats.porVencer7}
            </span>
            <HiClock className="h-6 w-6 text-amber-200" />
          </div>
        </motion.div>

        {/* Vencidas */}
        <motion.div
          layout
          className="rounded-2xl border border-rose-500/25 bg-rose-500/10 shadow-sm shadow-rose-900/40 p-4 flex flex-col gap-1"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-rose-200">
            Vencidas
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-semibold text-rose-100">
              {stats.vencidas}
            </span>
            <HiExclamation className="h-6 w-6 text-rose-200" />
          </div>
        </motion.div>
      </div>

      {/* Buscador */}
      <div className="max-w-lg">
        <div className="relative mt-2">
          <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            className="w-full rounded-full border border-slate-300/40 bg-white/80 px-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700/60"
            placeholder="Buscar por número de póliza, patente o asegurado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Podés escribir parte del número de póliza, la patente, el nombre
          o el DNI del asegurado.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm flex items-center gap-2">
          <HiExclamation className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de cuponeras */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-sm shadow-slate-900/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Listado de cuponeras
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {stats.total} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-800">
              <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Póliza</th>
                <th className="px-4 py-2">Asegurado</th>
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2">Vencimiento</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && cupones.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm"
                  >
                    Cargando cuponeras...
                  </td>
                </tr>
              )}

              {!loading && cupones.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm"
                  >
                    No hay cuponeras registradas.
                  </td>
                </tr>
              )}

              {cupones.map((c) => {
                const visual = getVisualEstado(c);
                const badgeClass =
                  badgeByEstado[visual] ||
                  "bg-slate-500/15 text-slate-200 border border-slate-500/30";
                const label = labelByEstado[visual] || visual || "—";
                const tone = getRowTone(c);

                let Icon = HiClock;
                if (visual === "PAGADA") Icon = HiBadgeCheck;
                if (visual === "VENCIDA") Icon = HiExclamation;

                return (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-100/70 dark:border-slate-800/80 ${
                      tone || ""
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      #{c.id}
                    </td>

                    {/* Póliza: muestra número si viene, y linkea al detalle */}
                    <td className="px-4 py-3 text-xs">
                      {c.poliza ? (
                        <Link
                          to={`/polizas/${c.poliza}`}
                          className="text-sky-300 hover:text-sky-100 underline-offset-2 hover:underline"
                        >
                          {c.poliza_numero || `ID ${c.poliza}`}
                        </Link>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    {/* Asegurado */}
                    <td className="px-4 py-3 text-xs text-slate-200 dark:text-slate-100">
                      {c.asegurado_nombre || "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-100">
                      {formatPeriodo(c)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-100">
                      {formatDate(c.fecha_vencimiento)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="uppercase tracking-[0.18em]">
                          {label}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
