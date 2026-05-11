// src/components/estadisticas/ContabilidadPanel.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiCash, HiCreditCard, HiExclamationCircle, HiTrendingUp, HiRefresh } from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
const fmtFull = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n || 0);

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}

export default function ContabilidadPanel({ apiBase, oficina, anio, mes, getOficinaNombre }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const fetch_ = async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ anio, mes });
      if (oficina) p.set("oficina", oficina);
      const r = await fetch(`${apiBase}estadisticas/contabilidad/resumen/?${p}`, { headers: authH() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch { setError("No se pudieron cargar los datos de caja."); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, [oficina, anio, mes]);

  const rec = data?.recaudacion || {};
  const mes_ = data?.mes_actual || {};
  const cobradoPct = mes_.esperado > 0 ? Math.min(100, (mes_.cobrado / mes_.esperado) * 100) : 0;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Contabilidad</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {oficina ? getOficinaNombre(oficina) : "Todas las sucursales"} · {mes}/{anio}
          </p>
        </div>
        <button onClick={fetch_} disabled={loading}
          className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors">
          <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
          <HiExclamationCircle className="shrink-0" /> {error}
          <button onClick={fetch_} className="ml-auto underline">Reintentar</button>
        </div>
      )}

      {loading && !data && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border border-slate-700 border-t-slate-300 animate-spin" />
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-3">

          {/* Recaudación total */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="md:col-span-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <HiCash className="text-emerald-400 text-sm" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Recaudación del mes</span>
            </div>
            <div className="text-4xl font-light text-emerald-300 tabular-nums leading-none">
              {fmt(rec.total)}
            </div>
            <div className="space-y-2 pt-2 border-t border-emerald-500/10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <HiCash className="text-slate-600" /> Efectivo
                </span>
                <span className="text-xs font-medium text-emerald-400 tabular-nums">{fmt(rec.efectivo)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <HiCreditCard className="text-slate-600" /> Transferencia
                </span>
                <span className="text-xs font-medium text-sky-400 tabular-nums">{fmt(rec.transferencia)}</span>
              </div>
            </div>
          </motion.div>

          {/* Proyección del mes */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <HiTrendingUp className="text-sky-400 text-sm" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Proyección del mes</span>
            </div>

            {/* Barra de cobro */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Cobrado</span>
                <span className="text-slate-300 font-medium">{cobradoPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-sky-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${cobradoPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="space-y-0">
              <StatRow label="Esperado del mes"  value={fmtFull(mes_.esperado)}  accent="text-slate-300" />
              <StatRow label="Ya cobrado"        value={fmtFull(mes_.cobrado)}   accent="text-emerald-400" />
              <StatRow label="Pendiente de cobro" value={fmtFull(mes_.pendiente)} accent="text-amber-400" />
            </div>
          </motion.div>

          {/* Morosidad */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <HiExclamationCircle className="text-rose-400 text-sm" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-700">Plata en la calle</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-3">Cuotas vencidas e impagas acumuladas hasta hoy</p>
              <div className="text-3xl font-light text-rose-400 tabular-nums leading-none">
                {fmt(data.morosidad_historica)}
              </div>
            </div>
            <div className="pt-2 border-t border-rose-500/10">
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Este monto no se cobra en el período actual. Representa deuda acumulada de períodos anteriores.
              </p>
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}