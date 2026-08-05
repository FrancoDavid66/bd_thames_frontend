/* src/pages/RankingPage.jsx
 *
 * Ranking global de puntos (monedero central). Junta los puntos de TODAS
 * las acciones (control diario, ventas, pagos, etc.). Lo ven todos.
 * Premio: bono al de más puntos del mes.
 *
 * Paleta semántica real (surface/card/titulo/marca) con modo claro + oscuro.
 * Look Duo marcado: border-2, botones con relieve 3D.
 * Desempate: mismos puntos → gana el de menos acciones (más eficiente).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { HiStar, HiRefresh } from "react-icons/hi";
import api from "../services/api";
import { UI } from "../components/tareas/tareasUI";
import HistorialRanking from "../components/ranking/HistorialRanking";

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
      // 🆕 por=responsable → el ranking cuenta por el EMPLEADO que hizo la tarea
      //    (no la cuenta que la cargó). Muestra a cada uno con su oficina.
      const q = `rango=${rango}&por=responsable${categoria ? `&categoria=${categoria}` : ""}`;
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
    <div className={`${UI.screen} px-4 py-5`}>
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <h1 className={`flex items-center gap-2 text-2xl font-extrabold ${UI.txtTitulo}`}>
            <HiStar className="text-tarjeta" /> Ranking
          </h1>
          <button onClick={cargar}
            className="rounded-full border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-2 text-suave dark:text-suave-dark transition hover:opacity-70">
            <HiRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className={`mb-4 text-[13px] ${UI.txtSuave}`}>
          Puntos de todo el equipo · el primero del mes gana el bono 💵
        </p>

        {/* Rango (hoy/semana/mes) */}
        <div className="mb-3 flex gap-1.5 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-1.5">
          {[["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setRango(k)}
              className={`flex-1 rounded-xl py-2 text-[13px] font-black transition-all ${
                rango === k
                  ? "bg-marca text-white shadow-[0_3px_0_#8a0000] active:translate-y-0.5 active:shadow-[0_0_0_#8a0000]"
                  : UI.txtSuave
              }`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Categoría */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {CATEGORIAS.map(([k, lbl]) => (
            <button key={k} onClick={() => setCategoria(k)}
              className={`rounded-full border-2 px-3 py-1 text-[12px] font-black transition ${
                categoria === k
                  ? "border-marca bg-marca/10 text-marca"
                  : `border-linea dark:border-linea-dark ${UI.txtSuave}`
              }`}>
              {lbl}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-linea dark:border-linea-dark border-t-marca" />
          </div>
        ) : ranking.length === 0 ? (
          <div className={`rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-6 text-center ${UI.txtSuave}`}>
            Todavía no hay puntos en este período.
          </div>
        ) : (
          <>
            {/* Podio (top 3) */}
            <div className="mb-4 flex items-end gap-2">
              {[1, 0, 2].map((pos) => {
                const r = top3[pos];
                if (!r) return <div key={pos} className="flex-1" />;
                const alturas = ["py-4", "py-6", "py-3"];
                // 1º con marca, 2º y 3º más suaves
                const bgs = [
                  "bg-titulo/5 dark:bg-white/5",
                  "bg-marca/15",
                  "bg-tarjeta/15",
                ];
                return (
                  <motion.div key={pos} className="flex-1 text-center"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pos * 0.05 }}>
                    <div className={`mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full text-base font-black ${
                      pos === 0 ? "bg-marca text-white shadow-[0_3px_0_#8a0000]" : "bg-titulo/10 dark:bg-white/10 " + UI.txtTitulo
                    }`}>
                      {inicial(r.usuario)}
                    </div>
                    <div className={`truncate text-[12px] font-bold ${UI.txtTitulo}`}>{r.usuario}</div>
                    {r.oficina && <div className={`truncate text-[10px] ${UI.txtSuave}`}>{r.oficina}</div>}
                    <div className={`mt-1.5 rounded-t-2xl border-2 border-b-0 border-linea dark:border-linea-dark ${bgs[pos]} ${alturas[pos]}`}>
                      <div className="text-xl">{MEDALLAS[pos]}</div>
                      <div className={`text-lg font-black ${UI.txtTitulo}`}>{r.puntos}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Resto (4º en adelante) */}
            {resto.length > 0 && (
              <div className="overflow-hidden rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
                {resto.map((r, i) => (
                  <div key={r.usuario_id || i}
                    className="flex items-center gap-3 border-t-2 border-linea dark:border-linea-dark px-4 py-3 first:border-t-0">
                    <span className={`w-5 text-[13px] font-bold ${UI.txtSuave}`}>{i + 4}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${UI.txtTitulo}`}>{r.usuario}</div>
                      {r.oficina && <div className={`truncate text-[11px] ${UI.txtSuave}`}>{r.oficina}</div>}
                    </div>
                    <span className={`text-[11px] ${UI.txtSuave}`}>{r.acciones} acc.</span>
                    <span className={`text-[15px] font-black ${r.puntos >= 0 ? "text-ingreso" : "text-marca"}`}>
                      {r.puntos}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Líder */}
            {lider && (
              <div className="mt-3 rounded-2xl border-2 border-ingreso/25 bg-ingreso/[0.07] p-3 text-[13px] font-semibold text-ingreso-fuerte dark:text-ingreso-claro">
                🏆 <strong>{lider.usuario}</strong> va primero — gana el bono 💵
              </div>
            )}
          </>
        )}

        {/* 🆕 Historial de meses cerrados (componente hijo). Respeta la categoría. */}
        <HistorialRanking categoria={categoria} />
      </div>
    </div>
  );
}
