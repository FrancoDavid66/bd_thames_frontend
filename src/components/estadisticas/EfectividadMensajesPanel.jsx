// src/components/estadisticas/EfectividadMensajesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { 
  HiChartBar, 
  HiClock, 
  HiCurrencyDollar, 
  HiCheckCircle,
  HiLightningBolt,
  HiExclamationCircle,
  HiPaperAirplane
} from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

const formatTiempo = (horas) => {
  if (horas < 24) return `${horas} hs`;
  const dias = Math.floor(horas / 24);
  return `${dias} día${dias > 1 ? 's' : ''}`;
};

export default function EfectividadMensajesPanel({ apiBase, oficina, anio, mes, desde, hasta, getOficinaNombre }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEfectividad = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (oficina) params.set("oficina", oficina);
      
      // Si hay un rango de fechas custom, lo usamos. Si no, usamos año y mes.
      if (desde && hasta) {
        params.set("desde", desde);
        params.set("hasta", hasta);
      } else {
        if (anio) params.set("anio", anio);
        if (mes) params.set("mes", mes);
      }

      const url = `${apiBase}pagos/reporte-efectividad/?${params.toString()}`;
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      const res = await fetch(url, { 
        headers: token ? { 'Authorization': `Bearer ${token}` } : {} 
      });
      
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Error al cargar efectividad:", e);
      setError("No se pudieron cargar los datos de mensajería.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEfectividad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, anio, mes, desde, hasta]);

  const kpis = data?.kpis || {};
  const pagados = data?.detalle_pagados || [];
  const pendientes = data?.detalle_pendientes || [];

  const historialUnificado = useMemo(() => {
    const combinados = [
      ...pagados.map(d => ({ ...d, estado: "pagado" })),
      ...pendientes.map(d => ({ ...d, estado: "pendiente" }))
    ];
    return combinados.sort((a, b) => b.alerta_id - a.alerta_id);
  }, [pagados, pendientes]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <HiChartBar className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Cobranzas por WhatsApp</h2>
            <p className="text-[11px] text-slate-400">Medición de la efectividad de los recordatorios de pago enviados en este período.</p>
          </div>
        </div>
        
        <button 
          onClick={fetchEfectividad}
          disabled={loading}
          className="h-9 rounded-xl bg-sky-500 px-5 text-xs font-bold text-white transition hover:bg-sky-400 shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50"
        >
          {loading ? "Calculando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}

      {/* KPIS */}
      <AnimatedCard index={1} interactive={false} glow="from-sky-500/30 via-indigo-500/15 to-transparent">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
          <KpiCard 
            label="Avisos Enviados" 
            value={kpis.total_mensajes_enviados || 0} 
            icon={<HiLightningBolt />} 
            color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
          />
          <KpiCard 
            label="Cobrados Post-Aviso" 
            value={kpis.pagos_recuperados || 0} 
            icon={<HiCurrencyDollar />} 
            color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20"
          />
          <KpiCard 
            label="Tasa de Pago" 
            value={kpis.tasa_conversion || "0%"} 
            icon={<HiCheckCircle />} 
            color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20"
          />
          <KpiCard 
            label="Reacción Promedio" 
            value={formatTiempo(kpis.tiempo_promedio_respuesta_horas || 0)} 
            icon={<HiClock />} 
            color="text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20"
          />
        </div>
      </AnimatedCard>

      {/* TABLA */}
      <AnimatedCard index={2} interactive={false} glow="from-emerald-500/20 via-sky-500/10 to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <HiPaperAirplane className="text-slate-400" /> Historial de Avisos
          </div>

          {historialUnificado.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
              No hay avisos enviados en este período.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/25">
              <table className="min-w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                  <tr className="border-b border-white/10 bg-slate-900/50">
                    <th className="px-4 py-3 text-left">Asegurado (Aviso)</th>
                    <th className="px-4 py-3 text-left">Fecha de Envío</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Tiempo / Reacción</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200 divide-y divide-white/5">
                  {historialUnificado.map((d, i) => (
                    <motion.tr 
                      key={i} 
                      className="hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{d.cliente}</div>
                        <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {d.patente} • Aviso: {d.tipo_mensaje.replace("_", " ")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{d.fecha_mensaje}</td>
                      <td className="px-4 py-3">
                        {d.estado === "pagado" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            <HiCheckCircle size={12} /> Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            <HiExclamationCircle size={12} /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {d.estado === "pagado" ? (
                          <div>
                            <div className="text-emerald-400 font-medium text-xs">Tardó {formatTiempo(d.horas_tardanza)}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{d.fecha_pago}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-rose-400 font-medium text-xs">Atraso: {d.dias_sin_pagar} días</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Ignorado</div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-bold tabular-nums ${d.estado === "pagado" ? "text-slate-100" : "text-slate-500"}`}>
                          ${d.estado === "pagado" ? d.monto_recuperado : d.monto_adeudado}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}

function KpiCard({ label, value, icon, color, bg, border }) {
  return (
    <div className={`p-4 rounded-2xl border ${border} ${bg} flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <div className={`text-lg ${color}`}>{icon}</div>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl sm:text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}