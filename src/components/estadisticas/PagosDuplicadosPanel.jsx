// src/components/estadisticas/PagosDuplicadosPanel.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiRefresh,
  HiExclamationCircle,
  HiDuplicate,
  HiClock,
  HiArrowRight,
  HiChevronDown,
  HiChevronUp,
} from "react-icons/hi";

const token = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => (token() ? { Authorization: `Bearer ${token()}` } : {});

const fmtMoney = (n) => {
  if (n === null || n === undefined) return "—";
  return "$ " + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
};
const fmtFechaHora = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

export default function PagosDuplicadosPanel({ apiBase, oficina, getOficinaNombre }) {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Grupos abiertos (arrancan TODOS colapsados por el volumen de datos)
  const [abiertos, setAbiertos] = useState({});
  const toggle = (key) => setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);
      const url = `${apiBase}pagos/auditoria/duplicados/${qs.toString() ? `?${qs}` : ""}`;
      const res = await fetch(url, { headers: authH() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch {
      setData(null);
      setError("No se pudo cargar la detección de pagos duplicados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  const resumen = data?.resumen || {};
  const mismaCuota = Array.isArray(data?.misma_cuota) ? data.misma_cuota : [];
  const casiIdentico = Array.isArray(data?.casi_identico) ? data.casi_identico : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Pagos duplicados</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cobros que parecen repetidos — para revisar si fue un error de carga o un cobro doble
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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 p-3">
          <div className="text-[11px] text-rose-300 flex items-center gap-1.5">
            <HiDuplicate className="text-sm" /> Misma cuota cobrada 2+ veces
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-0.5">{resumen.misma_cuota ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3">
          <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
            <HiClock className="text-sm" /> Cobros casi idénticos
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-0.5">{resumen.casi_identico ?? 0}</div>
        </div>
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
          ✅ No se detectaron pagos duplicados.
        </div>
      )}

      {/* Grupo 1: misma cuota */}
      {mismaCuota.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HiDuplicate className="text-base text-rose-300" />
            <h3 className="text-sm font-semibold text-rose-300">Misma cuota cobrada 2+ veces</h3>
            <span className="text-[11px] text-slate-500">({mismaCuota.length})</span>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1">La misma cuota figura con más de un pago. Es el caso más grave.</p>

          {mismaCuota.map((g, idx) => {
            const key = `mc-${g.poliza_id}-${g.cuota_nro}-${idx}`;
            const open = !!abiertos[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800/60 transition-colors text-left"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {open ? <HiChevronUp className="text-slate-500 shrink-0" /> : <HiChevronDown className="text-slate-500 shrink-0" />}
                    <span className="text-sm font-semibold text-slate-100">{g.cliente || "Sin nombre"}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Cuota #{g.cuota_nro} · {g.patente || `Pól ${g.poliza_id}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-rose-300 shrink-0">{g.veces} pagos · {fmtMoney(g.monto_total)} total</span>
                </button>
                {open && (
                  <div className="divide-y divide-slate-800/60 border-t border-slate-800">
                    {g.pagos.map((p) => (
                      <div key={p.pago_id} className="flex items-center justify-between gap-3 px-4 py-2 text-[11px] text-slate-400 font-mono">
                        <span>Pago #{p.pago_id} · {p.metodo}</span>
                        <span>{fmtMoney(p.monto)}</span>
                        <span>{fmtFechaHora(p.registrado_en)}</span>
                      </div>
                    ))}
                    <div className="px-4 py-2 bg-slate-900/40">
                      <button
                        onClick={() => navigate(`/polizas/${g.poliza_id}`)}
                        className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        Ver póliza <HiArrowRight className="text-xs" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Grupo 2: casi idénticos */}
      {casiIdentico.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HiClock className="text-base text-amber-300" />
            <h3 className="text-sm font-semibold text-amber-300">Cobros casi idénticos</h3>
            <span className="text-[11px] text-slate-500">({casiIdentico.length})</span>
          </div>
          <p className="text-[11px] text-slate-500 -mt-1">Misma póliza y mismo monto, cargados con muy poca diferencia de tiempo (posible doble carga).</p>

          {casiIdentico.map((g, idx) => {
            const key = `ci-${idx}`;
            const open = !!abiertos[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800/60 transition-colors text-left"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {open ? <HiChevronUp className="text-slate-500 shrink-0" /> : <HiChevronDown className="text-slate-500 shrink-0" />}
                    <span className="text-sm font-semibold text-slate-100">{g.cliente || "Sin nombre"}</span>
                    <span className="text-[11px] font-mono text-slate-500">{g.patente}</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-300 shrink-0">
                    {fmtMoney(g.monto)} · {g.segundos_entre}s de diferencia
                  </span>
                </button>
                {open && (
                  <div className="divide-y divide-slate-800/60 border-t border-slate-800">
                    {g.pagos.map((p) => (
                      <div key={p.pago_id} className="flex items-center justify-between gap-3 px-4 py-2 text-[11px] text-slate-400 font-mono">
                        <span>Pago #{p.pago_id} · cuota #{p.cuota_nro} · {p.metodo}</span>
                        <span>{fmtFechaHora(p.registrado_en)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}