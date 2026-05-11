// src/components/estadisticas/EfectividadMensajesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiLightningBolt, HiCurrencyDollar, HiCheckCircle,
  HiClock, HiExclamationCircle, HiRefresh,
} from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

const fmtTiempo = (h) => h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;

const KPIS = [
  { key: "total_mensajes_enviados", label: "Avisos enviados",    icon: HiLightningBolt, color: "text-amber-400",   bg: "bg-amber-500/8 border-amber-500/20" },
  { key: "pagos_recuperados",       label: "Cobrados post-aviso", icon: HiCurrencyDollar, color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/20" },
  { key: "tasa_conversion",         label: "Tasa de pago",       icon: HiCheckCircle,   color: "text-sky-400",    bg: "bg-sky-500/8 border-sky-500/20" },
  { key: "tiempo_promedio",         label: "Reacción promedio",  icon: HiClock,         color: "text-violet-400", bg: "bg-violet-500/8 border-violet-500/20" },
];

export default function EfectividadMensajesPanel({ apiBase, oficina, anio, mes, desde, hasta, getOficinaNombre }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const fetch_ = async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (oficina) p.set("oficina", oficina);
      if (desde && hasta) { p.set("desde", desde); p.set("hasta", hasta); }
      else { if (anio) p.set("anio", anio); if (mes) p.set("mes", mes); }
      const r = await fetch(`${apiBase}pagos/reporte-efectividad/?${p}`, { headers: authH() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch { setError("No se pudieron cargar los datos de mensajería."); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, [oficina, anio, mes, desde, hasta]);

  const kpis = data?.kpis || {};
  const historial = useMemo(() => [
    ...(data?.detalle_pagados   || []).map(d => ({ ...d, estado: "pagado" })),
    ...(data?.detalle_pendientes || []).map(d => ({ ...d, estado: "pendiente" })),
  ].sort((a, b) => b.alerta_id - a.alerta_id), [data]);

  const kpiValues = {
    total_mensajes_enviados: kpis.total_mensajes_enviados || 0,
    pagos_recuperados:       kpis.pagos_recuperados || 0,
    tasa_conversion:         kpis.tasa_conversion || "0%",
    tiempo_promedio:         fmtTiempo(kpis.tiempo_promedio_respuesta_horas || 0),
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Cobranzas por WhatsApp</h2>
          <p className="text-xs text-slate-500 mt-0.5">Efectividad de los recordatorios de pago enviados</p>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k, i) => (
          <motion.div
            key={k.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={`rounded-2xl border p-4 ${k.bg}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <k.icon className={`text-sm shrink-0 ${k.color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</span>
            </div>
            <div className={`text-3xl font-light tabular-nums ${loading ? "text-slate-700" : k.color}`}>
              {loading ? "—" : kpiValues[k.key]}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Historial */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <span className="text-xs font-semibold text-slate-200">Historial de avisos</span>
          <span className="ml-2 text-[10px] text-slate-600">{historial.length} registros</span>
        </div>

        {historial.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-600">
            {loading ? "Cargando..." : "No hay avisos enviados en este período."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Asegurado</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Fecha envío</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Estado</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Reacción</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {historial.map((d, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: i * 0.015 }}
                    className="hover:bg-slate-800/25 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{d.cliente}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{d.patente} · {String(d.tipo_mensaje || "").replace("_", " ")}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{d.fecha_mensaje}</td>
                    <td className="px-4 py-3">
                      {d.estado === "pagado"
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium"><HiCheckCircle className="text-xs" /> Pagado</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium"><HiExclamationCircle className="text-xs" /> Pendiente</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {d.estado === "pagado"
                        ? <div className="text-emerald-400 text-[11px]">Tardó {fmtTiempo(d.horas_tardanza)}<div className="text-slate-600 text-[10px]">{d.fecha_pago}</div></div>
                        : <div className="text-slate-500 text-[11px]">{d.dias_sin_pagar}d sin pagar</div>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium tabular-nums ${d.estado === "pagado" ? "text-slate-200" : "text-slate-600"}`}>
                        ${d.estado === "pagado" ? d.monto_recuperado : d.monto_adeudado}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}