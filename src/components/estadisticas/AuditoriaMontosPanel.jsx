// src/components/estadisticas/AuditoriaMontosPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiRefresh,
  HiExclamationCircle,
  HiCurrencyDollar,
  HiTrendingUp,
  HiArrowRight,
  HiShieldExclamation,
} from "react-icons/hi";

const token = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => (token() ? { Authorization: `Bearer ${token()}` } : {});

const fmtMoney = (n) => {
  if (n === null || n === undefined) return "—";
  return "$ " + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
};

// Definición visual de cada tipo de hallazgo
const SECCIONES = [
  {
    key: "pagadas_cero",
    titulo: "Pagadas en $0",
    desc: "Cuotas marcadas como pagadas pero con monto cero",
    icon: HiCurrencyDollar,
    color: "rose",
  },
  {
    key: "fuera_de_rango",
    titulo: "Monto fuera de lo normal",
    desc: "Cuotas con monto muy distinto al resto de su póliza",
    icon: HiTrendingUp,
    color: "amber",
  },
  {
    key: "distinto_precio",
    titulo: "Distinto al precio de la póliza",
    desc: "Cuotas que no coinciden con el precio cargado",
    icon: HiShieldExclamation,
    color: "orange",
  },
];

const COLORS = {
  rose: { text: "text-rose-300", border: "border-rose-500/30", bg: "bg-rose-500/8", chip: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  amber: { text: "text-amber-300", border: "border-amber-500/30", bg: "bg-amber-500/8", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  orange: { text: "text-orange-300", border: "border-orange-500/30", bg: "bg-orange-500/8", chip: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

export default function AuditoriaMontosPanel({ apiBase, oficina, getOficinaNombre }) {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);
      const url = `${apiBase}pagos/auditoria/montos/${qs.toString() ? `?${qs}` : ""}`;
      const res = await fetch(url, { headers: authH() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setData(null);
      setError("No se pudo cargar la auditoría de montos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  const resumen = data?.resumen || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Auditoría de montos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cuotas con montos sospechosos para revisar — no acusa, solo marca lo que se sale de lo normal
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
          title="Actualizar"
        >
          <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {SECCIONES.map((s) => {
          const c = COLORS[s.color];
          const Icon = s.icon;
          return (
            <div key={s.key} className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
              <div className={`text-[11px] flex items-center gap-1.5 ${c.text}`}>
                <Icon className="text-sm" /> {s.titulo}
              </div>
              <div className={`text-2xl font-bold mt-0.5 ${c.text}`}>
                {resumen[s.key] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
          <HiExclamationCircle className="text-base shrink-0" />
          {error}
        </div>
      )}

      {/* Todo limpio */}
      {!loading && !error && resumen.total === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-400">
          ✅ No se detectaron montos anómalos con los criterios actuales.
        </div>
      )}

      {/* Secciones */}
      {SECCIONES.map((s) => {
        const lista = Array.isArray(data?.[s.key]) ? data[s.key] : [];
        if (lista.length === 0) return null;
        const c = COLORS[s.color];
        const Icon = s.icon;

        return (
          <div key={s.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className={`text-base ${c.text}`} />
              <h3 className={`text-sm font-semibold ${c.text}`}>{s.titulo}</h3>
              <span className="text-[11px] text-slate-500">({lista.length})</span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-1">{s.desc}</p>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/60">
              {lista.map((row, idx) => (
                <motion.div
                  key={`${row.cuota_id}-${idx}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(0.2, idx * 0.015) }}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">
                      {row.cliente || "Sin nombre"}
                      <span className="ml-2 text-[10px] font-mono text-slate-500">
                        Cuota #{row.cuota_nro} · {row.patente || row.numero_poliza || `Pól ${row.poliza_id}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span className={`font-mono font-bold ${c.text}`}>{fmtMoney(row.monto)}</span>
                      <span className="text-slate-600">·</span>
                      <span>{row.motivo}</span>
                      {row.oficina_nombre && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-[10px] font-mono border border-slate-700 rounded px-1.5 py-0.5 text-slate-400">
                            {row.oficina_nombre}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/polizas/${row.poliza_id}`)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    title="Ver póliza"
                  >
                    Ver <HiArrowRight className="text-xs" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}