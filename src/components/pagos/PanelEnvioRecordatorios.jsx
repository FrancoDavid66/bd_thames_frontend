// src/components/pagos/PanelEnvioRecordatorios.jsx
// Panel de estado visible que muestra si los mensajes se están enviando
// Se monta en PagosPage después de apretar "Enviar"
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiCheckCircle, HiClock, HiRefresh, HiX, HiChatAlt2,
  HiOfficeBuilding,
} from "react-icons/hi";
import dayjs from "dayjs";

const OFICINAS = { "1": "5 Esquinas", "2": "Axion", "3": "Km 39", "4": "Talita" };

// Consulta el historial de envíos de hoy
async function fetchEnviosHoy() {
  const token = localStorage.getItem("access_token") ||
                localStorage.getItem("token") ||
                localStorage.getItem("jwt") || "";
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const res = await fetch("/api/notificaciones/cuotas/historial/", { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.results || data || [];
    const hoy = dayjs().format("YYYY-MM-DD");
    return items.filter(i => i.fecha === hoy);
  } catch {
    return null;
  }
}

export default function PanelEnvioRecordatorios({ visible, onClose, oficinas = [] }) {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await fetchEnviosHoy();
    if (data !== null) {
      setLogs(data);
      setLastFetch(dayjs().format("HH:mm:ss"));
    }
    setLoading(false);
  }, []);

  // Auto-refresh cada 30 segundos mientras está visible
  useEffect(() => {
    if (!visible) return;
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [visible, autoRefresh, fetchData]);

  // Agrupar logs por oficina
  const porOficina = oficinas.length > 0
    ? oficinas.reduce((acc, ofi) => {
        const ofiStr = String(ofi);
        acc[ofiStr] = logs.filter(l => String(l.oficina_id || "") === ofiStr).length;
        return acc;
      }, {})
    : null;

  const total = logs.length;

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <HiChatAlt2 className="w-5 h-5 text-indigo-400" />
              {autoRefresh && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Estado del envío</p>
              <p className="text-xs text-slate-500">
                {lastFetch ? `Actualizado: ${lastFetch}` : "Cargando..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="h-8 w-8 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
              title="Actualizar"
            >
              <HiRefresh className={`w-4 h-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`h-8 px-3 rounded-xl text-xs font-bold transition-colors ${
                autoRefresh
                  ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700/50"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {autoRefresh ? "Auto ✓" : "Auto"}
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
            >
              <HiX className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4">

          {/* Contador principal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center">
                <span className="text-xl font-black text-indigo-300">{total}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">
                  Mensajes enviados hoy
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <HiClock className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-xs text-slate-500">
                    {total === 0
                      ? "Aún no se enviaron mensajes hoy"
                      : `${total} mensaje${total !== 1 ? "s" : ""} confirmado${total !== 1 ? "s" : ""} en la base de datos`}
                  </p>
                </div>
              </div>
            </div>
            {total > 0 && (
              <HiCheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            )}
          </div>

          {/* Por oficina si hay datos */}
          {porOficina && Object.keys(porOficina).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Por oficina</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(porOficina).map(([ofiId, count]) => (
                  <div key={ofiId}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50"
                  >
                    <HiOfficeBuilding className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-300 truncate">
                        {OFICINAS[ofiId] || `Oficina ${ofiId}`}
                      </p>
                    </div>
                    <span className={`text-xs font-black ${count > 0 ? "text-emerald-400" : "text-slate-600"}`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos 5 logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Últimos envíos
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {logs.slice(-5).reverse().map((log, i) => (
                  <div key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 rounded-lg"
                  >
                    <HiCheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-mono flex-1 truncate">
                      {log.numero || "—"}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {log.fecha || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!loading && total === 0 && (
            <div className="text-center py-3">
              <p className="text-sm text-slate-500">
                El envío está corriendo en el servidor.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Los mensajes aparecen acá a medida que se confirman. Actualizá en 30 segundos.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-950/30 border border-amber-800/40 rounded-xl">
            <HiClock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80">
              El panel se actualiza automáticamente cada 30 segundos. El proceso completo tarda ~2 horas.
            </p>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}