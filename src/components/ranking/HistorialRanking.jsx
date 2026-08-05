/* src/components/ranking/HistorialRanking.jsx
 *
 * Componente HIJO de RankingPage: muestra cómo cerró el ranking cada MES
 * pasado (podio + tabla completa). Cada mes es una tarjeta desplegable.
 * Usa la paleta semántica real (surface/card/titulo/marca) — claro + oscuro.
 * Look Duo marcado: border-2.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronDown, HiClock } from "react-icons/hi";
import api from "../../services/api";
import { UI } from "../tareas/tareasUI";

const MEDALLAS = ["🥇", "🥈", "🥉"];
const inicial = (n) => (n || "?").trim().charAt(0).toUpperCase();

/* Una tarjeta de mes (podio + tabla, desplegable) */
function MesCard({ mes, abierto, onToggle }) {
  const top3 = mes.ranking.slice(0, 3);
  const resto = mes.ranking.slice(3);

  return (
    <div className={`${UI.card} overflow-hidden`}>
      {/* Cabecera del mes (siempre visible) */}
      <button onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-marca/15 text-lg">
          🏆
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[14px] font-black capitalize ${UI.txtTitulo}`}>{mes.mes_nombre}</div>
          <div className={`text-[12px] ${UI.txtSuave}`}>
            Ganó <span className="font-bold text-marca">{mes.ganador || "—"}</span> · {mes.total_puntos} pts en total
          </div>
        </div>
        <HiChevronDown className={`shrink-0 text-lg text-suave dark:text-suave-dark transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {/* Detalle desplegable */}
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4">
              {/* Podio */}
              <div className="mb-3 flex items-end gap-2">
                {[1, 0, 2].map((pos) => {
                  const r = top3[pos];
                  if (!r) return <div key={pos} className="flex-1" />;
                  const alturas = ["py-3", "py-5", "py-2"];
                  const bgs = ["bg-titulo/5 dark:bg-white/5", "bg-marca/15", "bg-tarjeta/15"];
                  return (
                    <div key={pos} className="flex-1 text-center">
                      <div className={`mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                        pos === 0 ? "bg-marca text-white shadow-[0_3px_0_#8a0000]" : "bg-titulo/10 dark:bg-white/10 " + UI.txtTitulo
                      }`}>
                        {inicial(r.usuario)}
                      </div>
                      <div className={`truncate text-[11px] font-bold ${UI.txtTitulo}`}>{r.usuario}</div>
                      {r.oficina && <div className={`truncate text-[9px] ${UI.txtSuave}`}>{r.oficina}</div>}
                      <div className={`mt-1 rounded-t-xl border-2 border-b-0 border-linea dark:border-linea-dark ${bgs[pos]} ${alturas[pos]}`}>
                        <div className="text-base">{MEDALLAS[pos]}</div>
                        <div className={`text-[15px] font-black ${UI.txtTitulo}`}>{r.puntos}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resto (4º en adelante) */}
              {resto.length > 0 && (
                <div className="overflow-hidden rounded-xl border-2 border-linea dark:border-linea-dark">
                  {resto.map((r, i) => (
                    <div key={r.usuario_id || i}
                      className="flex items-center gap-3 border-t-2 border-linea dark:border-linea-dark px-3 py-2 first:border-t-0">
                      <span className={`w-5 text-[12px] font-bold ${UI.txtSuave}`}>{r.puesto}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[13px] font-semibold ${UI.txtTitulo}`}>{r.usuario}</div>
                        {r.oficina && <div className={`truncate text-[10px] ${UI.txtSuave}`}>{r.oficina}</div>}
                      </div>
                      <span className={`text-[10px] ${UI.txtSuave}`}>{r.acciones} acc.</span>
                      <span className={`text-[14px] font-black ${r.puntos >= 0 ? "text-ingreso" : "text-marca"}`}>{r.puntos}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HistorialRanking({ categoria = "" }) {
  const [abierto, setAbierto] = useState(false);   // el panel de historial en sí
  const [meses, setMeses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [mesAbierto, setMesAbierto] = useState(null); // qué mes está desplegado

  // Carga perezosa: solo cuando el usuario abre el historial la 1ª vez
  useEffect(() => {
    if (!abierto || cargado) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // por=responsable → historial contado por el empleado que hizo la tarea.
        const q = `?por=responsable${categoria ? `&categoria=${categoria}` : ""}`;
        const res = await api.get(`ranking/historial/${q}`);
        if (alive) {
          const list = res?.data?.meses || [];
          setMeses(list);
          setMesAbierto(list[0] ? `${list[0].anio}-${list[0].mes}` : null); // el más nuevo abierto
        }
      } catch {
        if (alive) setMeses([]);
      } finally {
        if (alive) { setLoading(false); setCargado(true); }
      }
    })();
    return () => { alive = false; };
  }, [abierto, cargado, categoria]);

  // Si cambia la categoría con el historial abierto, recargar
  useEffect(() => {
    if (cargado) { setCargado(false); }
    // eslint-disable-next-line
  }, [categoria]);

  return (
    <div className="mt-5">
      {/* Botón para abrir/cerrar el historial */}
      <button onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3 text-[14px] font-black ${UI.txtTitulo}`}>
        <HiClock className="text-marca text-lg" />
        Meses anteriores
        <HiChevronDown className={`ml-auto text-suave dark:text-suave-dark transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-3 flex flex-col gap-2.5">
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-linea dark:border-linea-dark border-t-marca" />
                </div>
              ) : meses.length === 0 ? (
                <div className={`rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 text-center text-[13px] ${UI.txtSuave}`}>
                  Todavía no hay meses cerrados con puntos.
                </div>
              ) : (
                meses.map((m) => {
                  const key = `${m.anio}-${m.mes}`;
                  return (
                    <MesCard key={key} mes={m}
                      abierto={mesAbierto === key}
                      onToggle={() => setMesAbierto(mesAbierto === key ? null : key)} />
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
