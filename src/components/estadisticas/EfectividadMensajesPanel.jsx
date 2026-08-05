// src/components/estadisticas/EfectividadMensajesPanel.jsx  (diseño Duo)
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiLightningBolt, HiCurrencyDollar, HiCheckCircle,
  HiClock, HiExclamationCircle, HiRefresh,
} from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

const fmtTiempo = (h) => h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;

/* KPIs con color Duo (amber→tarjeta, emerald→ingreso, sky→oficina, violet→transferencia) */
const KPIS = [
  { key: "total_mensajes_enviados", label: "Avisos enviados",    icon: HiLightningBolt,  color: "text-[#d97706] dark:text-tarjeta-claro", bg: "bg-tarjeta/8 border-tarjeta/25" },
  { key: "pagos_recuperados",       label: "Cobrados post-aviso", icon: HiCurrencyDollar, color: "text-ingreso",                           bg: "bg-ingreso/8 border-ingreso/25" },
  { key: "tasa_conversion",         label: "Tasa de pago",       icon: HiCheckCircle,    color: "text-oficina",                           bg: "bg-oficina/8 border-oficina/25" },
  { key: "tiempo_promedio",         label: "Reacción promedio",  icon: HiClock,          color: "text-transferencia",                     bg: "bg-transferencia/8 border-transferencia/25" },
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
          <h2 className="text-base font-black text-titulo dark:text-titulo-dark">Cobranzas por WhatsApp</h2>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">Efectividad de los recordatorios de pago enviados</p>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map((k, i) => (
          <motion.div
            key={k.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={`rounded-2xl border-2 p-4 ${k.bg}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <k.icon className={`text-sm shrink-0 ${k.color}`} />
              <span className="text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">{k.label}</span>
            </div>
            <div className={`text-3xl font-black tabular-nums ${loading ? "text-suave dark:text-suave-dark" : k.color}`}>
              {loading ? "—" : kpiValues[k.key]}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Historial */}
      <div className="rounded-2xl border-2 border-linea dark:border-linea-dark overflow-hidden bg-card dark:bg-card-dark">
        <div className="px-5 py-3.5 border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
          <span className="text-xs font-black text-titulo dark:text-titulo-dark">Historial de avisos</span>
          <span className="ml-2 text-[10px] font-bold text-suave dark:text-suave-dark">{historial.length} registros</span>
        </div>

        {historial.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-suave dark:text-suave-dark">
            {loading ? "Cargando..." : "No hay avisos enviados en este período."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b-2 border-linea dark:border-linea-dark">
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Asegurado</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Fecha envío</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Estado</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Reacción</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-linea/40 dark:divide-linea-dark/40">
                {historial.map((d, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: i * 0.015 }}
                    className="hover:bg-oficina/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-black text-titulo dark:text-titulo-dark">{d.cliente}</div>
                      <div className="text-[10px] font-bold text-suave dark:text-suave-dark mt-0.5">{d.patente} · {String(d.tipo_mensaje || "").replace("_", " ")}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-suave dark:text-suave-dark">{d.fecha_mensaje}</td>
                    <td className="px-4 py-3">
                      {d.estado === "pagado"
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-2 bg-ingreso/10 border-ingreso/30 text-ingreso text-[10px] font-black"><HiCheckCircle className="text-xs" /> Pagado</span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border-2 bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark text-[10px] font-black"><HiExclamationCircle className="text-xs" /> Pendiente</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {d.estado === "pagado"
                        ? <div className="text-ingreso text-[11px] font-bold">Tardó {fmtTiempo(d.horas_tardanza)}<div className="text-suave dark:text-suave-dark text-[10px]">{d.fecha_pago}</div></div>
                        : <div className="text-suave dark:text-suave-dark text-[11px] font-bold">{d.dias_sin_pagar}d sin pagar</div>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-black tabular-nums ${d.estado === "pagado" ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}>
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
