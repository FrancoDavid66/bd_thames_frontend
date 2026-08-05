/* src/pages/TareasPage.jsx
 *
 * Página de "Tareas del día".
 * Muestra 2 tareas por cada póliza reciente:
 *   1) Verificar alta en la compañía  → tilde cuando la póliza quedó ACTIVA en la compañía
 *   2) Enviar póliza al cliente        → tilde cuando se la enviaste al cliente
 * Cada una se resuelve con 1 tap y desaparece de su lista.
 *
 * Paleta semántica real (surface/card/titulo/suave/linea/marca) con modo
 * CLARO + OSCURO. Look Duo: border-2, botones 3D.
 *
 * Lógica:
 *  - "enviar" usa el thunk Redux marcarPolizaEnviada (ya existente).
 *  - "verificar alta" pega directo a /tareas/marcar-alta/ con api (sin tocar el slice).
 */
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { HiRefresh, HiCheck, HiCheckCircle, HiPaperAirplane, HiShieldCheck } from "react-icons/hi";

import { fetchTareasDia, marcarPolizaEnviada } from "../store/slices/tareasSlice";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { UI } from "../components/tareas/tareasUI";

/* Definición de las 2 secciones del panel. */
const SECCIONES = [
  {
    key: "verificar_alta",
    titulo: "Verificar alta en la compañía",
    icon: HiShieldCheck,
    // marca vía api directo
    marcar: (polizaId) => api.post("/tareas/marcar-alta/", { poliza_id: polizaId }),
    okMsg: "Alta verificada ✅",
  },
  {
    key: "enviar_poliza",
    titulo: "Enviar póliza al cliente",
    icon: HiPaperAirplane,
    // marca vía thunk Redux (ya existente)
    marcar: null, // se maneja aparte con dispatch
    okMsg: "Marcada como enviada ✅",
  },
];

export default function TareasPage() {
  const dispatch = useDispatch();
  const { data, loading, marcando } = useSelector((s) => s.tareas);
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [oficinas, setOficinas] = useState([]);
  const [oficinaSel, setOficinaSel] = useState(""); // "" = todas
  const [baseTotal, setBaseTotal] = useState(0);
  const [marcandoAlta, setMarcandoAlta] = useState(null); // poliza_id en curso (alta)

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

  // Totales y progreso (suma de las 2 listas)
  const total = useMemo(
    () => SECCIONES.reduce((a, s) => a + ((data?.[s.key] || []).length), 0),
    [data]
  );
  useEffect(() => {
    if (data) setBaseTotal((p) => Math.max(p, total));
  }, [data, total]);
  const hechas = Math.max(0, baseTotal - total);
  const pct = baseTotal > 0 ? Math.round((hechas / baseTotal) * 100) : 0;

  const mensaje =
    total === 0 ? "¡Todo listo por hoy! 🎉"
    : pct >= 75 ? "¡Ya casi! Última milla 💪"
    : pct >= 40 ? "¡Buen ritmo, seguí así!"
    : pct > 0   ? "¡Arrancaste, dale que se puede!"
    : "¡A darle al día!";

  // Acción enviar (Redux)
  const onEnviar = async (polizaId) => {
    const res = await dispatch(marcarPolizaEnviada(polizaId));
    if (marcarPolizaEnviada.fulfilled.match(res)) toast.success("Marcada como enviada ✅");
    else toast.error(res.payload || "No se pudo marcar.");
  };

  // Acción verificar alta (api directo)
  const onVerificarAlta = async (polizaId) => {
    setMarcandoAlta(polizaId);
    try {
      await api.post("/tareas/marcar-alta/", { poliza_id: polizaId });
      toast.success("Alta verificada ✅");
      recargar(); // refresca para que salga de la lista
    } catch (e) {
      toast.error(e?.response?.data?.detail || "No se pudo marcar.");
    } finally {
      setMarcandoAlta(null);
    }
  };

  const celebra = !loading && total === 0 && baseTotal > 0;

  /* ── fila de una póliza ── */
  const Fila = ({ sec, item }) => {
    const pat = (item.patente_real || item.patente || "").trim();
    const patente = pat && pat !== "—" ? pat : "";
    const sub = [item.vehiculo, item.compania].filter(Boolean).join(" · ");

    const esEnvio = sec.key === "enviar_poliza";
    const enCurso = esEnvio ? (marcando === item.poliza_id) : (marcandoAlta === item.poliza_id);
    const onClick = () => (esEnvio ? onEnviar(item.poliza_id) : onVerificarAlta(item.poliza_id));

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
          <button onClick={onClick} disabled={enCurso}
            aria-label="Marcar como hecha"
            className="w-9 h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-titulo/5 dark:bg-white/5 hover:bg-marca hover:border-marca text-suave dark:text-suave-dark hover:text-white transition-colors inline-flex items-center justify-center disabled:opacity-50">
            <HiCheck className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  };

  /* ── una sección (cabecera + lista) ── */
  const Seccion = ({ sec }) => {
    const items = data?.[sec.key] || [];
    return (
      <div className={UI.card}>
        {/* Cabecera */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b-2 border-linea dark:border-linea-dark">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-marca/15 text-marca">
            <sec.icon className="w-5 h-5" />
          </span>
          <span className={`text-sm font-black ${UI.txtTitulo}`}>{sec.titulo}</span>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-marca/15 text-marca">{items.length}</span>
        </div>

        {/* Lista */}
        {loading && items.length === 0 ? (
          <div className={`px-4 py-8 text-center text-sm ${UI.txtSuave}`}>Cargando…</div>
        ) : items.length === 0 ? (
          <div className={`px-4 py-8 text-center text-sm ${UI.txtSuave}`}>Nada pendiente acá 👌</div>
        ) : (
          <div className="divide-y-2 divide-linea dark:divide-linea-dark">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <Fila key={`${sec.key}-${item.poliza_id}`} sec={sec} item={item} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
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
                Tareas de hoy{data?.oficina && data.oficina !== "Todas" ? ` · Oficina ${data.oficina}` : ""}
              </div>
              <div className={`text-base font-black mt-0.5 ${UI.txtTitulo}`}>{mensaje}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div>
                  <span className="text-2xl font-black text-marca">{hechas}</span>
                  <span className={`text-sm ${UI.txtSuave}`}> / {hechas + total}</span>
                </div>
                <div className={`text-[11px] ${UI.txtSuave}`}>completadas</div>
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
            <div className={`mt-3 text-lg font-black ${UI.txtTitulo}`}>¡Todo listo por hoy!</div>
            <div className={`mt-1 text-sm ${UI.txtSuave}`}>No quedan tareas pendientes 🎉</div>
          </div>
        ) : (
          <div className="space-y-4">
            {SECCIONES.map((sec) => (
              <Seccion key={sec.key} sec={sec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}