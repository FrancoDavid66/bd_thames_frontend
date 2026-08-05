// src/components/estadisticas/ContabilidadPanel.jsx  (diseño Duo)
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiCash, HiCreditCard, HiExclamationCircle, HiTrendingUp, HiRefresh } from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
const fmtFull = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b-2 border-linea/50 dark:border-linea-dark/50 last:border-0">
      <span className="text-xs font-bold text-suave dark:text-suave-dark">{label}</span>
      <span className={`text-sm font-mono font-black tabular-nums ${accent}`}>{value}</span>
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
          <h2 className="text-base font-black text-titulo dark:text-titulo-dark">Contabilidad</h2>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
            {oficina ? getOficinaNombre(oficina) : "Todas las sucursales"} · {mes}/{anio}
          </p>
        </div>
        <button onClick={fetch_} disabled={loading}
          className="h-9 w-9 flex items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition-colors">
          <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-egreso/30 bg-egreso/10 px-4 py-3 text-xs font-bold text-egreso dark:text-egreso-claro">
          <HiExclamationCircle className="shrink-0" /> {error}
          <button onClick={fetch_} className="ml-auto underline font-black">Reintentar</button>
        </div>
      )}

      {loading && !data && (
        <div className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-8 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-linea dark:border-linea-dark border-t-oficina animate-spin" />
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-3">

          {/* Recaudación total */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="md:col-span-1 rounded-3xl border-2 border-ingreso/30 bg-ingreso/[0.06] p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-ingreso/15 border-2 border-ingreso/30 flex items-center justify-center">
                <HiCash className="text-ingreso text-sm" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-ingreso">Recaudación del mes</span>
            </div>
            <div className="text-4xl font-black text-ingreso tabular-nums leading-none">
              {fmt(rec.total)}
            </div>
            <div className="space-y-2 pt-2 border-t-2 border-ingreso/15">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-suave dark:text-suave-dark">
                  <HiCash className="text-suave dark:text-suave-dark" /> Efectivo
                </span>
                <span className="text-xs font-mono font-black text-ingreso tabular-nums">{fmt(rec.efectivo)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-suave dark:text-suave-dark">
                  <HiCreditCard className="text-suave dark:text-suave-dark" /> Transferencia
                </span>
                <span className="text-xs font-mono font-black text-oficina tabular-nums">{fmt(rec.transferencia)}</span>
              </div>
            </div>
          </motion.div>

          {/* Proyección del mes */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-oficina/10 border-2 border-oficina/30 flex items-center justify-center">
                <HiTrendingUp className="text-oficina text-sm" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">Proyección del mes</span>
            </div>

            {/* Barra de cobro */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-suave dark:text-suave-dark">
                <span>Cobrado</span>
                <span className="text-titulo dark:text-titulo-dark font-black">{cobradoPct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-oficina"
                  initial={{ width: 0 }}
                  animate={{ width: `${cobradoPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            <div className="space-y-0">
              <StatRow label="Esperado del mes"  value={fmtFull(mes_.esperado)}  accent="text-titulo dark:text-titulo-dark" />
              <StatRow label="Ya cobrado"        value={fmtFull(mes_.cobrado)}   accent="text-ingreso" />
              <StatRow label="Pendiente de cobro" value={fmtFull(mes_.pendiente)} accent="text-[#d97706] dark:text-tarjeta-claro" />
            </div>
          </motion.div>

          {/* Morosidad */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="rounded-3xl border-2 border-egreso/30 bg-egreso/[0.06] p-5 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-egreso/10 border-2 border-egreso/30 flex items-center justify-center">
                <HiExclamationCircle className="text-egreso text-sm" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-egreso">Plata en la calle</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-suave dark:text-suave-dark mb-3">Cuotas vencidas e impagas acumuladas hasta hoy</p>
              <div className="text-3xl font-black text-egreso tabular-nums leading-none">
                {fmt(data.morosidad_historica)}
              </div>
            </div>
            <div className="pt-2 border-t-2 border-egreso/15">
              <p className="text-[10px] font-bold text-suave dark:text-suave-dark leading-relaxed">
                Este monto no se cobra en el período actual. Representa deuda acumulada de períodos anteriores.
              </p>
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
