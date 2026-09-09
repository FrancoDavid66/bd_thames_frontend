// src/components/estadisticas/BajasRetencionPanel.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  HiTrendingDown,
  HiRefresh,
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
  if (n >= 95) return <span className="text-ingreso font-medium">{n}%</span>;
  if (n >= 85) return <span className="text-[#d97706] dark:text-tarjeta-claro font-medium">{n}%</span>;
  return <span className="text-egreso font-medium">{n}%</span>;
}

function MiniBar({ value, max, color = "bg-ingreso" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-linea dark:bg-linea-dark overflow-hidden">
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
    <AnimatedCard index={9} interactive={false}>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-linea dark:border-linea-dark pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-egreso/10 text-egreso">
            <HiTrendingDown className="text-lg" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-titulo dark:text-titulo-dark">Bajas del mes · Tasa de retención</h2>
            <p className="text-[11px] text-suave dark:text-suave-dark">Últimos 12 meses · Retención promedio: <span className="text-titulo dark:text-titulo-dark font-medium">{retPromedioStr}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector oficina */}
          {oficinasOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <HiOfficeBuilding className="text-suave dark:text-suave-dark text-sm shrink-0" />
              <select
                value={oficina}
                onChange={(e) => setOficina(e.target.value)}
                className="h-8 rounded-lg bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark px-2 text-xs text-titulo dark:text-titulo-dark outline-none focus:border-egreso transition-colors dark:[color-scheme:dark]"
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
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark hover:border-oficina transition-colors"
          >
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI cards rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-egreso/5 border border-egreso/20 px-4 py-3">
          <p className="text-[11px] text-egreso mb-1">Bajas período</p>
          <p className="text-2xl font-light text-egreso tabular-nums">{totales.bajas}</p>
        </div>
        <div className="rounded-xl bg-ingreso/5 border border-ingreso/20 px-4 py-3">
          <p className="text-[11px] text-ingreso mb-1">Altas nuevas</p>
          <p className="text-2xl font-light text-ingreso tabular-nums">{totales.altas_nuevas}</p>
        </div>
        <div className="rounded-xl bg-oficina/5 border border-oficina/20 px-4 py-3">
          <p className="text-[11px] text-oficina mb-1">Renovaciones</p>
          <p className="text-2xl font-light text-oficina tabular-nums">{totales.renovaciones}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-egreso/25 bg-egreso/10 px-3 py-2 text-xs text-egreso dark:text-egreso-claro">
          <HiExclamation className="shrink-0" /> {error}
        </div>
      )}

      {/* Tabla mes a mes */}
      {!loading && meses.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-linea dark:border-linea-dark">
          <table className="min-w-full text-xs">
            <thead className="bg-surface dark:bg-surface-dark border-b border-linea dark:border-linea-dark">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-suave dark:text-suave-dark">Período</th>
                <th className="px-3 py-2 text-right font-medium text-ingreso">Altas nuevas</th>
                <th className="px-3 py-2 text-right font-medium text-oficina">Renovaciones</th>
                <th className="px-3 py-2 text-right font-medium text-egreso">Bajas</th>
                <th className="px-3 py-2 text-right font-medium text-[#d97706] dark:text-tarjeta-claro">Saldo neto</th>
                <th className="px-3 py-2 text-right font-medium text-titulo dark:text-titulo-dark">Retención</th>
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
                    className={`border-b border-linea/60 dark:border-linea-dark/60 ${idx % 2 === 0 ? "bg-surface/40 dark:bg-surface-dark/40" : ""} hover:bg-oficina/5`}
                  >
                    <td className="px-3 py-2.5 text-titulo dark:text-titulo-dark font-medium whitespace-nowrap">
                      {fmtPeriodo(m.periodo)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-ingreso tabular-nums">{m.altas_nuevas_mes || 0}</span>
                        <MiniBar value={m.altas_nuevas_mes || 0} max={maxAltas} color="bg-ingreso" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-oficina tabular-nums">
                      {m.renovaciones_mes || 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-egreso tabular-nums">{m.bajas_mes || 0}</span>
                        <MiniBar value={m.bajas_mes || 0} max={maxBajas} color="bg-egreso" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                      <span className={saldo >= 0 ? "text-ingreso" : "text-egreso"}>
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
              <tr className="bg-surface dark:bg-surface-dark border-t border-linea dark:border-linea-dark">
                <td className="px-3 py-2 text-titulo dark:text-titulo-dark font-medium text-xs">TOTAL 12M</td>
                <td className="px-3 py-2 text-right text-ingreso font-semibold tabular-nums">{totales.altas_nuevas}</td>
                <td className="px-3 py-2 text-right text-oficina font-semibold tabular-nums">{totales.renovaciones}</td>
                <td className="px-3 py-2 text-right text-egreso font-semibold tabular-nums">{totales.bajas}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {(() => { const s = totales.altas_nuevas - totales.bajas; return <span className={s >= 0 ? "text-ingreso" : "text-egreso"}>{s >= 0 ? "+" : ""}{s}</span>; })()}
                </td>
                <td className="px-3 py-2 text-right text-titulo dark:text-titulo-dark font-semibold">{retPromedioStr}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {loading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark mt-2">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-egreso/35 via-tarjeta/25 to-transparent"
            initial={{ x: "-40%" }}
            animate={{ x: "140%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      {!loading && meses.length === 0 && !error && (
        <p className="text-xs text-suave dark:text-suave-dark text-center py-6">Sin datos para el período seleccionado.</p>
      )}

      {/* Leyenda retención */}
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-suave dark:text-suave-dark">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ingreso inline-block" /> ≥95% Excelente</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-tarjeta inline-block" /> 85–94% Buena</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-egreso inline-block" /> &lt;85% Atención</span>
        <span className="ml-auto">Retención = (activas inicio - bajas) / activas inicio</span>
      </div>

    </AnimatedCard>
  );
}
