// src/components/estadisticas/BajasRetencionPanel.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiTrendingDown,
  HiRefresh,
  HiShieldCheck,
  HiOfficeBuilding,
  HiExclamation,
} from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmtPeriodo(p) {
  const [y, m] = String(p || "").split("-");
  return `${MESES[Number(m) - 1] || m} ${y}`;
}

function RetenciónBadge({ pct }) {
  const n = Number(pct || 0);
  if (n >= 95) return <span className="text-emerald-400 font-bold">{n}%</span>;
  if (n >= 85) return <span className="text-amber-400 font-bold">{n}%</span>;
  return <span className="text-rose-400 font-bold">{n}%</span>;
}

function MiniBar({ value, max, color = "bg-emerald-500" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export default function BajasRetencionPanel({
  apiBase,
  oficinas = [],
  getOficinaNombre,
  defaultOficina = "",
}) {
  const [oficina, setOficina] = useState(defaultOficina || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Rango: últimos 12 meses
  const { desde, hasta } = useMemo(() => {
    const hoy = new Date();
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1);
    const fmt = (dt) => dt.toISOString().slice(0, 10);
    return { desde: fmt(d), hasta: fmt(hoy) };
  }, []);

  const oficinasOptions = useMemo(() => {
    const base = Array.isArray(oficinas) ? oficinas : [];
    return base.map((o) => String(o.id));
  }, [oficinas]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desde, hasta });
      if (oficina) params.set("oficina", oficina);
      const url = `${apiBase}estadisticas/polizas/bajas-retencion/?${params}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError("No se pudieron cargar los datos de bajas y retención.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, oficina, desde, hasta]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setOficina(defaultOficina || ""); }, [defaultOficina]);

  const meses = data?.meses || [];

  // Totales del período
  const totales = useMemo(() => meses.reduce((acc, m) => ({
    bajas:        acc.bajas + (m.bajas_mes || 0),
    altas_nuevas: acc.altas_nuevas + (m.altas_nuevas_mes || 0),
    renovaciones: acc.renovaciones + (m.renovaciones_mes || 0),
  }), { bajas: 0, altas_nuevas: 0, renovaciones: 0 }), [meses]);

  const maxBajas = useMemo(() => Math.max(...meses.map(m => m.bajas_mes || 0), 1), [meses]);
  const maxAltas = useMemo(() => Math.max(...meses.map(m => m.altas_nuevas_mes || 0), 1), [meses]);

  const retPromedioStr = useMemo(() => {
    if (!meses.length) return "—";
    const avg = meses.reduce((s, m) => s + (m.retencion_pct || 0), 0) / meses.length;
    return `${avg.toFixed(1)}%`;
  }, [meses]);

  return (
    <AnimatedCard index={9} interactive={false} glow="from-rose-500/40 via-amber-500/20 to-transparent">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <HiTrendingDown className="text-lg" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Bajas del mes · Tasa de retención</h2>
            <p className="text-[11px] text-slate-500">Últimos 12 meses · Retención promedio: <span className="text-slate-300 font-semibold">{retPromedioStr}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector oficina */}
          {oficinasOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <HiOfficeBuilding className="text-slate-500 text-sm shrink-0" />
              <select
                value={oficina}
                onChange={(e) => setOficina(e.target.value)}
                className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-rose-500/40"
              >
                <option value="">Todas</option>
                {oficinasOptions.map((id) => (
                  <option key={id} value={id}>
                    {typeof getOficinaNombre === "function" ? getOficinaNombre(id) : id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
          >
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI cards rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-rose-400 font-semibold mb-1">Bajas período</p>
          <p className="text-2xl font-light text-rose-300 tabular-nums">{totales.bajas}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold mb-1">Altas nuevas</p>
          <p className="text-2xl font-light text-emerald-300 tabular-nums">{totales.altas_nuevas}</p>
        </div>
        <div className="rounded-xl bg-sky-500/5 border border-sky-500/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-sky-400 font-semibold mb-1">Renovaciones</p>
          <p className="text-2xl font-light text-sky-300 tabular-nums">{totales.renovaciones}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">
          <HiExclamation className="shrink-0" /> {error}
        </div>
      )}

      {/* Tabla mes a mes */}
      {!loading && meses.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-400">Período</th>
                <th className="px-3 py-2 text-right font-semibold text-emerald-300">Altas nuevas</th>
                <th className="px-3 py-2 text-right font-semibold text-sky-300">Renovaciones</th>
                <th className="px-3 py-2 text-right font-semibold text-rose-300">Bajas</th>
                <th className="px-3 py-2 text-right font-semibold text-amber-300">Saldo neto</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-300">Retención</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m, idx) => {
                const saldo = (m.altas_nuevas_mes || 0) - (m.bajas_mes || 0);
                return (
                  <motion.tr
                    key={m.periodo}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    className={`border-b border-slate-800/60 ${idx % 2 === 0 ? "bg-slate-900/20" : ""} hover:bg-slate-800/30`}
                  >
                    <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                      {fmtPeriodo(m.periodo)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-emerald-300 tabular-nums">{m.altas_nuevas_mes || 0}</span>
                        <MiniBar value={m.altas_nuevas_mes || 0} max={maxAltas} color="bg-emerald-500" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sky-300 tabular-nums">
                      {m.renovaciones_mes || 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-rose-300 tabular-nums">{m.bajas_mes || 0}</span>
                        <MiniBar value={m.bajas_mes || 0} max={maxBajas} color="bg-rose-500" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                      <span className={saldo >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {saldo >= 0 ? "+" : ""}{saldo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <RetenciónBadge pct={m.retencion_pct} />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900/70 border-t border-slate-700">
                <td className="px-3 py-2 text-slate-300 font-semibold text-xs">TOTAL 12M</td>
                <td className="px-3 py-2 text-right text-emerald-300 font-bold tabular-nums">{totales.altas_nuevas}</td>
                <td className="px-3 py-2 text-right text-sky-300 font-bold tabular-nums">{totales.renovaciones}</td>
                <td className="px-3 py-2 text-right text-rose-300 font-bold tabular-nums">{totales.bajas}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">
                  {(() => { const s = totales.altas_nuevas - totales.bajas; return <span className={s >= 0 ? "text-emerald-400" : "text-rose-400"}>{s >= 0 ? "+" : ""}{s}</span>; })()}
                </td>
                <td className="px-3 py-2 text-right text-slate-300 font-bold">{retPromedioStr}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {loading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/60 border border-slate-800 mt-2">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-rose-500/35 via-amber-500/25 to-transparent"
            initial={{ x: "-40%" }}
            animate={{ x: "140%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      {!loading && meses.length === 0 && !error && (
        <p className="text-xs text-slate-500 text-center py-6">Sin datos para el período seleccionado.</p>
      )}

      {/* Leyenda retención */}
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≥95% Excelente</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 85–94% Buena</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> &lt;85% Atención</span>
        <span className="ml-auto">Retención = (activas inicio - bajas) / activas inicio</span>
      </div>

    </AnimatedCard>
  );
}