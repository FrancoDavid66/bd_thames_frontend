// src/components/pagos/ReporteEfectividadModal.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiX, 
  HiChartBar, 
  HiClock, 
  HiCurrencyDollar, 
  HiCheckCircle,
  HiLightningBolt,
  HiExclamationCircle
} from "react-icons/hi";
import { fetchReporteEfectividad } from "../../store/slices/pagosThunks"; // Asegúrate de que la ruta sea correcta tras la segmentación

export default function ReporteEfectividadModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("pagados"); // "pagados" | "pendientes"

  const { 
    reporteEfectividad, 
    reporteEfectividadStatus, 
    reporteEfectividadError 
  } = useSelector((state) => state.pagos);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchReporteEfectividad());
      setActiveTab("pagados"); // Resetear pestaña al abrir
    }
  }, [isOpen, dispatch]);

  const loading = reporteEfectividadStatus === "loading";
  const error = reporteEfectividadError;
  const kpis = reporteEfectividad?.kpis || {};
  const pagados = reporteEfectividad?.detalle_pagados || [];
  const pendientes = reporteEfectividad?.detalle_pendientes || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-slate-950 border border-slate-800 rounded-xl w-full max-w-5xl shadow-md flex flex-col overflow-hidden max-h-[90vh]"
          >
            {/* HEADER */}
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400 border border-slate-700">
                  <HiChartBar className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-none">Reporte de Efectividad</h3>
                  <p className="text-xs text-slate-400 mt-1">Análisis de respuesta a los recordatorios de cobranza.</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <HiX size={24} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin mb-3" />
                  <p className="text-slate-400 text-sm font-semibold animate-pulse">Calculando métricas de cobranza...</p>
                </div>
              ) : error ? (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-6 text-center text-rose-400">
                  <p className="font-semibold">Oops, hubo un problema al cargar el reporte.</p>
                  <p className="text-xs mt-2 opacity-80">{typeof error === 'string' ? error : 'Error desconocido'}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* KPIS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <KpiCard 
                      label="Avisos Enviados" 
                      value={kpis.total_mensajes_enviados || 0} 
                      icon={<HiLightningBolt />} 
                      color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
                    />
                    <KpiCard 
                      label="Cobrados post-aviso" 
                      value={kpis.pagos_recuperados || 0} 
                      icon={<HiCurrencyDollar />} 
                      color="text-emerald-400" bg="bg-emerald-950/30" border="border-emerald-900"
                    />
                    <KpiCard 
                      label="Tasa de Pago" 
                      value={kpis.tasa_conversion || "0%"} 
                      icon={<HiCheckCircle />} 
                      color="text-sky-400" bg="bg-sky-500/10" border="border-sky-500/20"
                    />
                    <KpiCard 
                      label="Reacción Promedio" 
                      value={`${kpis.tiempo_promedio_respuesta_horas || 0} hs`} 
                      icon={<HiClock />} 
                      color="text-indigo-400" bg="bg-slate-800" border="border-slate-700"
                    />
                  </div>

                  {/* TABS (Pagados vs Pendientes) */}
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                      <button
                        onClick={() => setActiveTab("pagados")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          activeTab === "pagados" 
                            ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        }`}
                      >
                        <HiCheckCircle className="text-lg" />
                        Pagados ({pagados.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("pendientes")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          activeTab === "pendientes" 
                            ? "bg-rose-950/30 text-rose-400 border border-rose-900" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        }`}
                      >
                        <HiExclamationCircle className="text-lg" />
                        Siguen Pendientes ({pendientes.length})
                      </button>
                    </div>

                    {/* TABLA: PAGADOS */}
                    {activeTab === "pagados" && (
                      pagados.length === 0 ? (
                        <div className="text-center py-10 bg-slate-900/30 border border-slate-800 rounded-lg">
                          <p className="text-slate-500 text-sm">Aún no hay registros de pagos realizados tras recibir un aviso.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
                          <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Asegurado</th>
                                <th className="px-4 py-3">Póliza / Patente</th>
                                <th className="px-4 py-3">Aviso Enviado</th>
                                <th className="px-4 py-3">Fecha de Pago</th>
                                <th className="px-4 py-3">Tiempo de Reacción</th>
                                <th className="px-4 py-3 text-right">Monto Cobrado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {pagados.map((d, i) => (
                                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-slate-200">{d.cliente}</td>
                                  <td className="px-4 py-3">
                                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
                                      {d.patente || "S/P"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-400">{d.fecha_mensaje}</td>
                                  <td className="px-4 py-3 text-xs text-emerald-400 font-medium">{d.fecha_pago}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      d.horas_tardanza <= 24 ? 'bg-emerald-950/40 text-emerald-400' :
                                      d.horas_tardanza <= 72 ? 'bg-amber-950/40 text-amber-400' :
                                      'bg-rose-950/40 text-rose-400'
                                    }`}>
                                      {d.horas_tardanza} hs
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-200 tabular-nums">
                                    ${d.monto_recuperado}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* TABLA: PENDIENTES */}
                    {activeTab === "pendientes" && (
                      pendientes.length === 0 ? (
                        <div className="text-center py-10 bg-slate-900/30 border border-slate-800 rounded-lg">
                          <p className="text-slate-500 text-sm">No hay avisos pendientes de cobro actualmente.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
                          <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
                            <thead className="bg-slate-900 text-xs uppercase font-bold text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="px-4 py-3">Asegurado</th>
                                <th className="px-4 py-3">Póliza / Patente</th>
                                <th className="px-4 py-3">Aviso Enviado</th>
                                <th className="px-4 py-3">Tipo de Aviso</th>
                                <th className="px-4 py-3">Tiempo Transcurrido</th>
                                <th className="px-4 py-3 text-right">Saldo Pendiente</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {pendientes.map((d, i) => (
                                <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-slate-200">{d.cliente}</td>
                                  <td className="px-4 py-3">
                                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
                                      {d.patente || "S/P"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-400">{d.fecha_mensaje}</td>
                                  <td className="px-4 py-3 text-xs text-slate-300 capitalize">{d.tipo_mensaje.replace("_", " ")}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      d.dias_sin_pagar <= 2 ? 'bg-amber-950/40 text-amber-400' :
                                      'bg-rose-950/40 text-rose-400'
                                    }`}>
                                      {d.dias_sin_pagar} días
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-rose-300 tabular-nums">
                                    ${d.monto_adeudado}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KpiCard({ label, value, icon, color, bg, border }) {
  return (
    <div className={`p-4 rounded-lg border ${border} ${bg} flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <div className={`text-lg ${color}`}>{icon}</div>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl sm:text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}