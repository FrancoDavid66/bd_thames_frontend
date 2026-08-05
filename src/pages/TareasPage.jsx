/* src/pages/TareasPage.jsx
 *
 * Página de "Tareas del día". Usa la paleta semántica real de la app
 * (surface/card/titulo/suave/linea/marca) con soporte modo CLARO + OSCURO.
 * Look Duo marcado: border-2, botones con relieve 3D.
 * Absorbe en un solo archivo lo que antes eran 4 componentes:
 *   TareasHeader · TareaCard · TareaItem · TareaSeccion
 * y usa el TareaWizard único en lugar de los 5 modales viejos.
 */
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { HiRefresh, HiCheck, HiChevronRight, HiCheckCircle } from "react-icons/hi";

import { fetchTareasDia, marcarPolizaEnviada } from "../store/slices/tareasSlice";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import TareaWizard from "../components/tareas/TareaWizard";
import {
  UI, SECCIONES, SECCION_ENVIAR, TODAS_SECCIONES, mensajeProgreso, itemKey,
} from "../components/tareas/tareasUI";

export default function TareasPage() {
  const dispatch = useDispatch();
  const { data, loading, marcando } = useSelector((s) => s.tareas);
  const { user } = useAuth();
  const isAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [oficinas, setOficinas] = useState([]);
  const [oficinaSel, setOficinaSel] = useState(""); // "" = todas
  const [baseTotal, setBaseTotal] = useState(0);
  const [abierta, setAbierta] = useState(null);     // key de la sección expandida
  const [wizard, setWizard] = useState(null);       // { flujo, item } | null

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

  // Totales y progreso
  const total = useMemo(
    () => TODAS_SECCIONES.reduce((a, s) => a + ((data?.[s.key] || []).length), 0),
    [data]
  );
  useEffect(() => {
    if (data) setBaseTotal((p) => Math.max(p, total));
  }, [data, total]);
  const hechas = Math.max(0, baseTotal - total);
  const pct = baseTotal > 0 ? Math.round((hechas / baseTotal) * 100) : 0;

  const enviar = data?.[SECCION_ENVIAR.key] || [];

  // Acciones
  const onMarcarEnviada = async (polizaId) => {
    const res = await dispatch(marcarPolizaEnviada(polizaId));
    if (marcarPolizaEnviada.fulfilled.match(res)) toast.success("Marcada como enviada ✅");
    else toast.error(res.payload || "No se pudo marcar.");
  };
  const abrirWizard = (sec, item) => setWizard({ flujo: sec.tipo, item });
  const onSaved = () => { setWizard(null); recargar(); };

  const seccionAbierta = SECCIONES.find((s) => s.key === abierta) || null;
  const itemsAbiertos = seccionAbierta ? (data?.[seccionAbierta.key] || []) : [];
  const celebra = !loading && total === 0 && baseTotal > 0;

  /* ── fila de un item (antes TareaItem) ── */
  const Fila = ({ sec, item }) => {
    const pat = (item.patente_real || item.patente || "").trim();
    const patente = pat && pat !== "—" ? pat : "";
    const sub = sec.tipo === "enviar"
      ? [item.vehiculo, item.compania].filter(Boolean).join(" · ")
      : sec.key === "fotos_poliza" ? (item.vehiculo || "") : (item.detalle || "");
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
          {sec.tipo === "enviar" ? (
            <button onClick={() => onMarcarEnviada(item.poliza_id)} disabled={marcando === item.poliza_id}
              aria-label="Marcar como enviada"
              className="w-9 h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-titulo/5 dark:bg-white/5 hover:bg-marca hover:border-marca text-suave dark:text-suave-dark hover:text-white transition-colors inline-flex items-center justify-center disabled:opacity-50">
              <HiCheck className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => abrirWizard(sec, item)}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border-2 border-marca/40 font-bold text-marca hover:bg-marca/10 text-sm transition-colors">
              {sec.accion} <HiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  /* ── cabecera de una lista (título + contador) ── */
  const CabLista = ({ sec, n }) => (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b-2 border-linea dark:border-linea-dark">
      <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-marca/15 text-marca">
        <sec.icon className="w-5 h-5" />
      </span>
      <span className={`text-sm font-black ${UI.txtTitulo}`}>{sec.titulo}</span>
      <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-marca/15 text-marca">{n}</span>
    </div>
  );

  return (
    <div className={`${UI.screen} px-4 py-6 sm:px-6 lg:px-8`}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header (antes TareasHeader) ── */}
        <div className="mb-6">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div>
              <div className={`text-sm ${UI.txtSuave}`}>
                Tareas de hoy{data?.oficina && data.oficina !== "Todas" ? ` · Oficina ${data.oficina}` : ""}
              </div>
              <div className={`text-base font-black mt-0.5 ${UI.txtTitulo}`}>{mensajeProgreso(pct, total)}</div>
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
          <div className="h-2.5 rounded-full bg-titulo/10 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-marca rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {data?.fecha && <div className={`text-[11px] mt-1.5 ${UI.txtSuave}`}>{data.fecha}</div>}
        </div>

        {/* ── Selector de oficina (solo admin) ── */}
        {isAdmin && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mt-2 scrollbar-hide">
            <button onClick={() => setOficinaSel("")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${oficinaSel === "" ? "bg-marca border-marca text-white" : `border-linea dark:border-linea-dark ${UI.txtSuave} hover:bg-titulo/5 dark:hover:bg-white/5`}`}>
              Todas
            </button>
            {oficinas.map((o) => (
              <button key={o.id} onClick={() => setOficinaSel(String(o.id))}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${String(oficinaSel) === String(o.id) ? "bg-marca border-marca text-white" : `border-linea dark:border-linea-dark ${UI.txtSuave} hover:bg-titulo/5 dark:hover:bg-white/5`}`}>
                {o.nombre}
              </button>
            ))}
          </div>
        )}

        {loading && !data && <div className={`text-center py-16 text-sm ${UI.txtSuave}`}>Cargando tareas…</div>}

        {/* ── Estado vacío / celebración ── */}
        {(celebra || (!loading && total === 0)) && (
          <div className="text-center py-16">
            <HiCheckCircle className="w-16 h-16 mx-auto text-ingreso mb-3" />
            <div className={`text-xl font-black ${UI.txtTitulo}`}>{celebra ? "¡Completaste todo! 🎉" : "¡Todo al día!"}</div>
            <div className={`text-sm mt-1 ${UI.txtSuave}`}>{celebra ? "Gran trabajo hoy." : "No hay tareas pendientes por ahora."}</div>
          </div>
        )}

        {data && total > 0 && (
          <>
            {/* ── Enviar póliza: banda directa (1 tap, sin wizard) ── */}
            {enviar.length > 0 && (
              <div className={`${UI.card} overflow-hidden mb-4`}>
                <CabLista sec={SECCION_ENVIAR} n={enviar.length} />
                <div className="divide-y-2 divide-linea dark:divide-linea-dark max-h-[40vh] overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {enviar.map((item) => <Fila key={itemKey(SECCION_ENVIAR, item)} sec={SECCION_ENVIAR} item={item} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ── Tarjetas resumen (antes TareaCard) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {SECCIONES.map((sec) => {
                const count = (data[sec.key] || []).length;
                const vacia = count === 0;
                const activa = abierta === sec.key;
                const Icon = sec.icon;
                return (
                  <button key={sec.key} type="button"
                    onClick={vacia ? undefined : () => setAbierta(activa ? null : sec.key)}
                    disabled={vacia}
                    className={`text-left rounded-2xl border-2 p-4 transition-all ${activa ? "border-marca ring-2 ring-marca/30 bg-marca/5" : `border-linea dark:border-linea-dark bg-card dark:bg-card-dark ${UI.cardHover}`} ${vacia ? "opacity-40 cursor-default" : "cursor-pointer"}`}>
                    <div className="flex items-center justify-between">
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center bg-marca/15 text-marca">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className={`text-2xl font-black ${count > 0 ? UI.txtTitulo : "text-suave/50"}`}>{count}</span>
                    </div>
                    <div className={`mt-3 text-sm font-bold leading-snug ${UI.txtTitulo}`}>{sec.titulo}</div>
                    {!vacia && <div className="mt-1 text-xs font-bold text-marca">{activa ? "Ocultar lista" : "Ver lista"}</div>}
                  </button>
                );
              })}
            </div>

            {/* ── Lista de la sección abierta (antes TareaSeccion) ── */}
            <AnimatePresence mode="wait">
              {seccionAbierta && itemsAbiertos.length > 0 && (
                <motion.div key={seccionAbierta.key}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className={`mt-5 ${UI.card} overflow-hidden`}>
                  <CabLista sec={seccionAbierta} n={itemsAbiertos.length} />
                  <div className="divide-y-2 divide-linea dark:divide-linea-dark max-h-[60vh] overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {itemsAbiertos.map((item) => <Fila key={itemKey(seccionAbierta, item)} sec={seccionAbierta} item={item} />)}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Wizard único (reemplaza los 5 modales) ── */}
      <TareaWizard
        isOpen={!!wizard}
        flujo={wizard?.flujo}
        item={wizard?.item}
        onClose={() => setWizard(null)}
        onSaved={onSaved}
      />
    </div>
  );
}
