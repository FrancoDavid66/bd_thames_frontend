/* src/pages/RankingPage.jsx
 *
 * Ranking global de puntos (monedero central). Junta los puntos de TODAS
 * las acciones de la oficina (control diario, ventas, pagos, etc.).
 * Lo ven todos. Premio: bono al de más puntos del mes.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiStar, HiRefresh } from "react-icons/hi";
import api from "../services/api";

const MEDALLAS = ["🥇", "🥈", "🥉"];
const inicial = (n) => (n || "?").trim().charAt(0).toUpperCase();

const CATEGORIAS = [
  ["", "Todo"],
  ["control_diario", "Control diario"],
  ["venta", "Ventas"],
  ["renovacion", "Renovaciones"],
  ["pago", "Cobros"],
  ["tarea_dia", "Tareas del día"],
];

export default function RankingPage() {
  const [rango, setRango] = useState("mes");
  const [categoria, setCategoria] = useState("");
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const q = `rango=${rango}${categoria ? `&categoria=${categoria}` : ""}`;
      const res = await api.get(`ranking/?${q}`);
      setRanking(res?.data?.ranking || []);
    } catch {
      toast.error("No se pudo cargar el ranking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [rango, categoria]);

  const top3 = ranking.slice(0, 3);
  const resto = ranking.slice(3);
  const lider = ranking[0];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-5">
      <div className="mx-auto max-w-lg">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <HiStar className="text-amber-400" /> Ranking
          </h1>
          <button onClick={cargar} className="rounded-full border border-white/10 bg-slate-900 p-2 text-slate-400 hover:text-white">
            <HiRefresh className="text-lg" />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-slate-400">
          Puntos de todo el equipo · el primero del mes gana el bono 💵
        </p>

        {/* Rango */}
        <div className="mb-3 flex gap-1.5 rounded-xl border border-white/10 bg-slate-900 p-1">
          {[["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"]].map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setRango(k)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
                rango === k ? "bg-amber-500/20 text-amber-300" : "text-slate-400"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Categoría */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {CATEGORIAS.map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setCategoria(k)}
              className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                categoria === k
                  ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                  : "border-white/10 text-slate-400"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
          </div>
        ) : ranking.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-slate-400">
            Todavía no hay puntos en este período.
          </div>
        ) : (
          <>
            {/* Podio */}
            <div className="mb-4 flex items-end gap-2">
              {[1, 0, 2].map((pos) => {
                const r = top3[pos];
                if (!r) return <div key={pos} className="flex-1" />;
                const alturas = ["py-4", "py-6", "py-3"];
                const bgs = ["bg-slate-700/40", "bg-amber-500/25", "bg-amber-800/30"];
                return (
                  <motion.div
                    key={pos} className="flex-1 text-center"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pos * 0.05 }}
                  >
                    <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-base font-bold text-slate-200">
                      {inicial(r.usuario)}
                    </div>
                    <div className="truncate text-[12px] font-semibold text-slate-100">{r.usuario}</div>
                    <div className={`mt-1.5 rounded-t-xl ${bgs[pos]} ${alturas[pos]}`}>
                      <div className="text-xl">{MEDALLAS[pos]}</div>
                      <div className="text-lg font-bold text-white">{r.puntos}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Resto */}
            {resto.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                {resto.map((r, i) => (
                  <div key={r.usuario_id || i} className="flex items-center gap-3 border-t border-white/5 px-4 py-3 first:border-t-0">
                    <span className="w-5 text-[13px] text-slate-500">{i + 4}</span>
                    <span className="flex-1 truncate text-sm text-slate-100">{r.usuario}</span>
                    <span className="text-[11px] text-slate-500">{r.acciones} acc.</span>
                    <span className={`text-[15px] font-bold ${r.puntos >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {r.puntos}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Líder */}
            {lider && (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 text-[13px] text-emerald-300">
                🏆 <strong>{lider.usuario}</strong> va primero — gana el bono 💵
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}