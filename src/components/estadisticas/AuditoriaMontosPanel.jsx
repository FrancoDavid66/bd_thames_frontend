// src/components/estadisticas/AuditoriaMontosPanel.jsx  (diseño Duo)
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

// Definición visual de cada tipo de hallazgo (colores Duo)
const SECCIONES = [
  {
    key: "pagadas_cero",
    titulo: "Pagadas en $0",
    desc: "Cuotas marcadas como pagadas pero con monto cero",
    icon: HiCurrencyDollar,
    color: "egreso",
  },
  {
    key: "fuera_de_rango",
    titulo: "Monto fuera de lo normal",
    desc: "Cuotas con monto muy distinto al resto de su póliza",
    icon: HiTrendingUp,
    color: "tarjeta",
  },
  {
    key: "distinto_precio",
    titulo: "Distinto al precio de la póliza",
    desc: "Cuotas que no coinciden con el precio cargado",
    icon: HiShieldExclamation,
    color: "tarjeta",
  },
];

// Clases Duo por color de sección
const COLORS = {
  egreso:  { text: "text-egreso",                          border: "border-egreso/30",  bg: "bg-egreso/[0.06]" },
  tarjeta: { text: "text-[#d97706] dark:text-tarjeta-claro", border: "border-tarjeta/30", bg: "bg-tarjeta/[0.06]" },
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
          <h2 className="text-base font-black text-titulo dark:text-titulo-dark">Auditoría de montos</h2>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
            Cuotas con montos sospechosos para revisar — no acusa, solo marca lo que se sale de lo normal
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="h-9 w-9 flex items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition-colors"
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
            <div key={s.key} className={`rounded-2xl border-2 ${c.border} ${c.bg} p-3.5`}>
              <div className={`text-[11px] font-black flex items-center gap-1.5 uppercase tracking-wide ${c.text}`}>
                <Icon className="text-sm" /> {s.titulo}
              </div>
              <div className={`text-2xl font-black mt-0.5 ${c.text}`}>
                {resumen[s.key] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border-2 border-egreso/40 bg-egreso/10 px-3 py-2 text-xs font-bold text-egreso dark:text-egreso-claro flex items-center gap-2">
          <HiExclamationCircle className="text-base shrink-0" />
          {error}
        </div>
      )}

      {/* Todo limpio */}
      {!loading && !error && resumen.total === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-8 text-center text-sm font-bold text-suave dark:text-suave-dark">
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
              <h3 className={`text-sm font-black ${c.text}`}>{s.titulo}</h3>
              <span className="text-[11px] font-bold text-suave dark:text-suave-dark">({lista.length})</span>
            </div>
            <p className="text-[11px] font-bold text-suave dark:text-suave-dark -mt-1">{s.desc}</p>

            <div className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden divide-y-2 divide-linea/50 dark:divide-linea-dark/50">
              {lista.map((row, idx) => (
                <motion.div
                  key={`${row.cuota_id}-${idx}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(0.2, idx * 0.015) }}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-oficina/5 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-black text-titulo dark:text-titulo-dark truncate">
                      {row.cliente || "Sin nombre"}
                      <span className="ml-2 text-[10px] font-mono font-bold text-suave dark:text-suave-dark">
                        Cuota #{row.cuota_nro} · {row.patente || row.numero_poliza || `Pól ${row.poliza_id}`}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-suave dark:text-suave-dark mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span className={`font-mono font-black ${c.text}`}>{fmtMoney(row.monto)}</span>
                      <span className="text-suave/60 dark:text-suave-dark/60">·</span>
                      <span>{row.motivo}</span>
                      {row.oficina_nombre && (
                        <>
                          <span className="text-suave/60 dark:text-suave-dark/60">·</span>
                          <span className="text-[10px] font-mono font-black border-2 border-linea dark:border-linea-dark rounded-md px-1.5 py-0.5 text-suave dark:text-suave-dark">
                            {row.oficina_nombre}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/polizas/${row.poliza_id}`)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-ingreso hover:text-ingreso-fuerte transition-colors"
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
