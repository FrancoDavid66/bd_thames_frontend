// src/components/estadisticas/PagosDuplicadosPanel.jsx  (diseño Duo)
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

// 🚀 Sin decimales: $ 40.000
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
          <h2 className="text-base font-black text-titulo dark:text-titulo-dark">Pagos duplicados</h2>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
            Cobros que parecen repetidos — para revisar si fue un error de carga o un cobro doble
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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-egreso/30 bg-egreso/[0.08] p-3.5">
          <div className="text-[11px] font-black text-egreso flex items-center gap-1.5 uppercase tracking-wide">
            <HiDuplicate className="text-sm" /> Misma cuota cobrada 2+ veces
          </div>
          <div className="text-2xl font-black text-egreso mt-0.5">{resumen.misma_cuota ?? 0}</div>
        </div>
        <div className="rounded-2xl border-2 border-tarjeta/30 bg-tarjeta/[0.08] p-3.5">
          <div className="text-[11px] font-black text-[#d97706] dark:text-tarjeta-claro flex items-center gap-1.5 uppercase tracking-wide">
            <HiClock className="text-sm" /> Cobros casi idénticos
          </div>
          <div className="text-2xl font-black text-[#d97706] dark:text-tarjeta-claro mt-0.5">{resumen.casi_identico ?? 0}</div>
        </div>
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
          ✅ No se detectaron pagos duplicados.
        </div>
      )}

      {/* Grupo 1: misma cuota */}
      {mismaCuota.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HiDuplicate className="text-base text-egreso" />
            <h3 className="text-sm font-black text-egreso">Misma cuota cobrada 2+ veces</h3>
            <span className="text-[11px] font-bold text-suave dark:text-suave-dark">({mismaCuota.length})</span>
          </div>
          <p className="text-[11px] font-bold text-suave dark:text-suave-dark -mt-1">La misma cuota figura con más de un pago. Es el caso más grave.</p>

          {mismaCuota.map((g, idx) => {
            const key = `mc-${g.poliza_id}-${g.cuota_nro}-${idx}`;
            const open = !!abiertos[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface dark:bg-surface-dark hover:bg-oficina/5 transition-colors text-left"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {open ? <HiChevronUp className="text-suave dark:text-suave-dark shrink-0" /> : <HiChevronDown className="text-suave dark:text-suave-dark shrink-0" />}
                    <span className="text-sm font-black text-titulo dark:text-titulo-dark">{g.cliente || "Sin nombre"}</span>
                    <span className="text-[11px] font-mono font-bold text-suave dark:text-suave-dark">
                      Cuota #{g.cuota_nro} · {g.patente || `Pól ${g.poliza_id}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-black text-egreso shrink-0">{g.veces} pagos · {fmtMoney(g.monto_total)} total</span>
                </button>
                {open && (
                  <div className="divide-y-2 divide-linea/50 dark:divide-linea-dark/50 border-t-2 border-linea dark:border-linea-dark">
                    {g.pagos.map((p) => (
                      <div key={p.pago_id} className="flex items-center justify-between gap-3 px-4 py-2 text-[11px] font-mono font-bold text-suave dark:text-suave-dark">
                        <span>Pago #{p.pago_id} · {p.metodo}</span>
                        <span>{fmtMoney(p.monto)}</span>
                        <span>{fmtFechaHora(p.registrado_en)}</span>
                      </div>
                    ))}
                    <div className="px-4 py-2 bg-surface dark:bg-surface-dark">
                      <button
                        onClick={() => navigate(`/polizas/${g.poliza_id}`)}
                        className="inline-flex items-center gap-1 text-xs font-black text-oficina hover:text-oficina-fuerte transition-colors"
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
            <HiClock className="text-base text-[#d97706] dark:text-tarjeta-claro" />
            <h3 className="text-sm font-black text-[#d97706] dark:text-tarjeta-claro">Cobros casi idénticos</h3>
            <span className="text-[11px] font-bold text-suave dark:text-suave-dark">({casiIdentico.length})</span>
          </div>
          <p className="text-[11px] font-bold text-suave dark:text-suave-dark -mt-1">Misma póliza y mismo monto, cargados con muy poca diferencia de tiempo (posible doble carga).</p>

          {casiIdentico.map((g, idx) => {
            const key = `ci-${idx}`;
            const open = !!abiertos[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface dark:bg-surface-dark hover:bg-oficina/5 transition-colors text-left"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    {open ? <HiChevronUp className="text-suave dark:text-suave-dark shrink-0" /> : <HiChevronDown className="text-suave dark:text-suave-dark shrink-0" />}
                    <span className="text-sm font-black text-titulo dark:text-titulo-dark">{g.cliente || "Sin nombre"}</span>
                    <span className="text-[11px] font-mono font-bold text-suave dark:text-suave-dark">{g.patente}</span>
                  </div>
                  <span className="text-[11px] font-black text-[#d97706] dark:text-tarjeta-claro shrink-0">
                    {fmtMoney(g.monto)} · {g.segundos_entre}s de diferencia
                  </span>
                </button>
                {open && (
                  <div className="divide-y-2 divide-linea/50 dark:divide-linea-dark/50 border-t-2 border-linea dark:border-linea-dark">
                    {g.pagos.map((p) => (
                      <div key={p.pago_id} className="flex items-center justify-between gap-3 px-4 py-2 text-[11px] font-mono font-bold text-suave dark:text-suave-dark">
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
