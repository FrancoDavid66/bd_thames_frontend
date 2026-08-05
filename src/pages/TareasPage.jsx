/* src/pages/TareasPage.jsx
 *
 * Página de "Tareas del día" — VERSIÓN SIMPLIFICADA.
 * Ahora SOLO muestra "Enviar póliza al cliente" (se resuelve con 1 tap).
 * Se quitaron de la vista: subir póliza, datos póliza, datos cliente,
 * fotos DNI y fotos vehículo (y con eso ya no se usa el TareaWizard aquí).
 *
 * Paleta semántica real (surface/card/titulo/suave/linea/marca) con modo
 * CLARO + OSCURO. Look Duo: border-2, botones 3D.
 *
 * Lógica intacta: Redux fetchTareasDia / marcarPolizaEnviada, selector de
 * oficina (admin), header con progreso y pantalla de celebración.
 */
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { HiRefresh, HiCheck, HiCheckCircle, HiPaperAirplane } from "react-icons/hi";

import { fetchTareasDia, marcarPolizaEnviada } from "../store/slices/tareasSlice";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { UI, SECCION_ENVIAR } from "../components/tareas/tareasUI";

export default function TareasPage() {
  const dispatch = useDispatch();
  const { data, loading, marcando } = useSelector((s) => s.tareas);
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [oficinas, setOficinas] = useState([]);
  const [oficinaSel, setOficinaSel] = useState(""); // "" = todas
  const [baseTotal, setBaseTotal] = useState(0);

  // Recargar al cambiar de oficina
  useEffect(() => {
    dispatch(fetchTareasDia(oficinaSel ? { oficina: oficinaSel } : {}));
  }, [dispatch, oficinaSel]);

  // Cargar oficinas (solo admin)
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/usuarios/oficinas/");
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (alive) setOficinas(arr);
      } catch { if (alive) setOficinas([]); }
    })();
    return () => { alive = false; };
  }, [isAdmin]);

  const recargar = () => dispatch(fetchTareasDia(oficinaSel ? { oficina: oficinaSel } : {}));

  // Solo cuenta la lista de "enviar póliza"
  const enviar = data?.[SECCION_ENVIAR.key] || [];
  const total = enviar.length;

  // Progreso: guardamos el máximo del día como base para calcular % hechas
  useEffect(() => {
    if (data) setBaseTotal((p) => Math.max(p, total));
  }, [data, total]);
  const hechas = Math.max(0, baseTotal - total);
  const pct = baseTotal > 0 ? Math.round((hechas / baseTotal) * 100) : 0;

  const mensaje =
    total === 0 ? "¡Todo enviado por hoy! 🎉"
    : pct >= 75 ? "¡Ya casi! Última milla 💪"
    : pct >= 40 ? "¡Buen ritmo, seguí así!"
    : pct > 0   ? "¡Arrancaste, dale que se puede!"
    : "¡A enviar las pólizas!";

  // Acción: marcar como enviada (1 tap)
  const onMarcarEnviada = async (polizaId) => {
    const res = await dispatch(marcarPolizaEnviada(polizaId));
    if (marcarPolizaEnviada.fulfilled.match(res)) toast.success("Marcada como enviada ✅");
    else toast.error(res.payload || "No se pudo marcar.");
  };

  const celebra = !loading && total === 0 && baseTotal > 0;

  /* ── fila de una póliza a enviar ── */
  const Fila = ({ item }) => {
    const pat = (item.patente_real || item.patente || "").trim();
    const patente = pat && pat !== "—" ? pat : "";
    const sub = [item.vehiculo, item.compania].filter(Boolean).join(" · ");
    return (
      <motion.div layout exit={{ opacity: 0, x: 12 }} className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate ${UI.txtTitulo}`}>{item.cliente}</span>
            {patente && (
              <span className="shrink-0 rounded-md bg-titulo/5 dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-mono font-bold tracking-wide text-titulo dark:text-titulo-dark">{patente}</span>
            )}
          </div>
          {sub && <div className={`text-xs truncate ${UI.txtSuave}`}>{sub}</div>}
        </div>
        <div className="ml-auto shrink-0">
          <button onClick={() => onMarcarEnviada(item.poliza_id)} disabled={marcando === item.poliza_id}
            aria-label="Marcar como enviada"
            className="w-9 h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-titulo/5 dark:bg-white/5 hover:bg-marca hover:border-marca text-suave dark:text-suave-dark hover:text-white transition-colors inline-flex items-center justify-center disabled:opacity-50">
            <HiCheck className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`${UI.screen} px-4 py-6 sm:px-6 lg:px-8`}>
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div>
              <div className={`text-sm ${UI.txtSuave}`}>
                Enviar póliza{data?.oficina && data.oficina !== "Todas" ? ` · Oficina ${data.oficina}` : ""}
              </div>
              <div className={`text-base font-black mt-0.5 ${UI.txtTitulo}`}>{mensaje}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div>
                  <span className="text-2xl font-black text-marca">{hechas}</span>
                  <span className={`text-sm ${UI.txtSuave}`}> / {hechas + total}</span>
                </div>
                <div className={`text-[11px] ${UI.txtSuave}`}>enviadas</div>
              </div>
              <button onClick={recargar} aria-label="Actualizar"
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-titulo/5 dark:bg-white/5 hover:bg-titulo/10 dark:hover:bg-white/10 text-suave dark:text-suave-dark transition-colors">
                <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="h-2 w-full rounded-full bg-titulo/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-marca transition-all" style={{ width: `${pct}%` }} />
          </div>

          {/* Selector de oficina (solo admin) */}
          {isAdmin && oficinas.length > 0 && (
            <div className="mt-3">
              <select
                value={oficinaSel}
                onChange={(e) => setOficinaSel(e.target.value)}
                className={UI.input}
              >
                <option value="">Todas las oficinas</option>
                {oficinas.map((o) => (
                  <option key={o.id} value={o.id}>{o.nombre || o.oficina_nombre || `Oficina ${o.id}`}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Contenido ── */}
        {celebra ? (
          <div className={`${UI.card} px-6 py-12 text-center`}>
            <HiCheckCircle className="w-14 h-14 mx-auto text-marca" />
            <div className={`mt-3 text-lg font-black ${UI.txtTitulo}`}>¡Todo enviado por hoy!</div>
            <div className={`mt-1 text-sm ${UI.txtSuave}`}>No quedan pólizas pendientes de enviar 🎉</div>
          </div>
        ) : (
          <div className={UI.card}>
            {/* Cabecera de la lista */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b-2 border-linea dark:border-linea-dark">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-marca/15 text-marca">
                <HiPaperAirplane className="w-5 h-5" />
              </span>
              <span className={`text-sm font-black ${UI.txtTitulo}`}>{SECCION_ENVIAR.titulo}</span>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-marca/15 text-marca">{total}</span>
            </div>

            {/* Lista */}
            {loading && total === 0 ? (
              <div className={`px-4 py-10 text-center text-sm ${UI.txtSuave}`}>Cargando…</div>
            ) : total === 0 ? (
              <div className={`px-4 py-10 text-center text-sm ${UI.txtSuave}`}>No hay pólizas para enviar.</div>
            ) : (
              <div className="divide-y-2 divide-linea dark:divide-linea-dark">
                <AnimatePresence initial={false}>
                  {enviar.map((item) => (
                    <Fila key={`${SECCION_ENVIAR.key}-${item.poliza_id}`} item={item} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}