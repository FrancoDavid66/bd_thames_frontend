// src/pages/SolicitudesPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux"; // 🚀 IMPORTAMOS REDUX
import { 
  HiPlus, 
  HiRefresh, 
  HiShieldCheck, 
  HiBadgeCheck, 
  HiChevronDown,
  HiCollection,
  HiSearch,
  HiLightningBolt
} from "react-icons/hi";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

// 🚀 IMPORTACIONES DE SEGURIDAD Y REDUX
import { useAuth } from "../context/AuthContext";
import { fetchAdminCompanias, fetchAdminCoberturas } from "../store/slices/adminSlice";

import SolicitudesList from "../components/solicitudes/SolicitudesList";
import CreateSolicitudModal from "../components/solicitudes/CreateSolicitudModal";
import SubidaRapidaModal from "../components/solicitudes/SubidaRapidaModal";
import { solicitudesApi } from "../services/solicitudes.js";

import PageTransition from "../ux/motion/PageTransition.jsx";
import { pressable } from "../ux/motion/variants";
import { solicitudesRealtime } from "../services/notifications/solicitudes.js";

/* Helpers */
function getTareas(s) {
  return {
    alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
    enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
  };
}
function computeCounters(list = []) {
  const activos = list.filter((x) => x?.estado !== "TERMINADA");
  const alta = activos.filter((x) => !getTareas(x).alta_compania).length;
  const envio = activos.filter((x) => !getTareas(x).enviar_poliza).length;
  return { alta, envio };
}

function matchOficinaFilter(value, filter, oficinasList) {
  if (!filter || filter === "TODAS") return true;
  if (value === null || value === undefined) return false;
  const raw = typeof value === 'object' ? String(value.id || value.nombre).trim().toLowerCase() : String(value).trim().toLowerCase();
  const f = String(filter).trim().toLowerCase();
  const selected = oficinasList.find((o) => String(o.id) === filter) || oficinasList.find((o) => o.nombre.toLowerCase() === f);
  if (!selected) return raw === f || raw.includes(f);
  return raw === String(selected.id).toLowerCase() || raw === selected.nombre.toLowerCase() || raw.includes(String(selected.id).toLowerCase()) || raw.includes(selected.nombre.toLowerCase());
}

function normalizeList(list) {
  let arr = [];
  if (Array.isArray(list)) arr = list;
  else if (list && Array.isArray(list.results)) arr = list.results;
  else if (list && Array.isArray(list.data)) arr = list.data;
  return arr.map((s) => ({ ...s, tareas: getTareas(s) }));
}

export default function SolicitudesPage() {
  const { user } = useAuth(); 
  const dispatch = useDispatch();
  
  // 🚀 LEEMOS LOS CATÁLOGOS DIRECTO DE LA "TORRE DE CONTROL" (REDUX)
  const { companias, coberturas } = useSelector((state) => state.admin);

  const [items, setItems] = useState([]);
  const [oficinasConfig, setOficinasConfig] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subidaRapida, setSubidaRapida] = useState(false); // 🆕 modal lector PDF
  const [datosPdf, setDatosPdf] = useState(null);            // 🆕 datos extraídos

  // searchParams debe declararse ANTES de usarse
  const [searchParams, setSearchParams] = useSearchParams();

  // Leer params de URL para precarga (viene desde banner de baja en Pagos)
  const paramClienteId = searchParams.get("cliente_id") || searchParams.get("cliente") || "";
  const paramPatente   = searchParams.get("patente") || "";
  const paramCompania  = searchParams.get("compania") || "";
  const paramNueva     = searchParams.get("nueva") === "1";

  // Abrir automaticamente si viene ?nueva=1
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (paramNueva && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setCreating(true);
    }
  }, [paramNueva]);
  
  const [hasLoaded, setHasLoaded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const initialTab = (() => {
    const t = searchParams.get("tab");
    return ["proceso", "pendiente_alta", "pendiente_envio", "terminadas"].includes(t || "") ? t : "proceso";
  })();
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const [oficinaFilter, setOficinaFilter] = useState(() => {
    if (!isWebAdmin && user?.perfil?.oficina) {
        const ofiId = user.perfil.oficina.id || user.perfil.oficina;
        return String(ofiId);
    }
    return "TODAS";
  });

  const inFlightRef = useRef(false);
  const latestReqIdRef = useRef(0);
  const abortRef = useRef(null);
  const knownIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // 🚀 AL MONTAR, ASEGURAMOS QUE LOS CATÁLOGOS ESTÉN CARGADOS
  useEffect(() => {
    dispatch(fetchAdminCompanias());
    dispatch(fetchAdminCoberturas());
  }, [dispatch]);

  // Cargar Oficinas desde el Backend
  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
    const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
    
    fetch(`${API_BASE}/usuarios/oficinas/`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    })
    .then(res => {
      if (!res.ok) throw new Error("Ruta de oficinas no encontrada");
      return res.json();
    })
    .then(data => {
      const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setOficinasConfig(arr);
    })
    .catch(err => console.error("Error cargando oficinas:", err));
  }, []);

  const cargar = useCallback(async (opts = { silent: false, force: false }) => {
    const { silent, force } = opts || {};
    if (!force && inFlightRef.current) return;
    try { abortRef.current?.abort?.(); } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    silent ? setRefreshing(true) : setLoading(true);
    const reqId = ++latestReqIdRef.current;
    inFlightRef.current = true;

    try {
      const list = await solicitudesApi.listar({ signal: controller.signal });
      if (reqId !== latestReqIdRef.current) return;
      const norm = normalizeList(list);
      
      const currentIds = norm.map(item => item.id);
      if (isFirstLoadRef.current) {
        knownIdsRef.current = new Set(currentIds);
        isFirstLoadRef.current = false;
      } else {
        const newItems = currentIds.filter(id => !knownIdsRef.current.has(id));
        if (newItems.length > 0) {
          toast.success(`🔔 ¡Tenés ${newItems.length === 1 ? 'una nueva solicitud' : newItems.length + ' nuevas solicitudes'} asignadas!`, {
            duration: 6000, position: 'top-center',
            style: { background: '#059669', color: '#fff', fontWeight: 'bold' },
            iconTheme: { primary: '#fff', secondary: '#059669' }
          });
          knownIdsRef.current = new Set(currentIds);
        }
      }

      setItems(norm);
      setHasLoaded(true);
      const { alta, envio } = computeCounters(norm);
      solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
    } catch (e) {
      if (e?.name === "AbortError") return;
      toast.error(e?.message || "Error al sincronizar");
    } finally {
      if (reqId === latestReqIdRef.current) {
        inFlightRef.current = false;
        silent ? setRefreshing(false) : setLoading(false);
      }
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (!autoRefresh || !hasLoaded) return;
    const t = setInterval(() => { cargar({ silent: true, force: false }); }, 20000);
    return () => clearInterval(t);
  }, [autoRefresh, hasLoaded, cargar]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== tab && ["proceso", "pendiente_alta", "pendiente_envio", "terminadas"].includes(t)) setTab(t);
  }, [searchParams, tab]);

  const cambiarTab = useCallback((t) => {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const counts = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const activos = arr.filter((s) => s?.estado !== "TERMINADA");
    const alta = activos.filter((s) => !s?.tareas?.alta_compania).length;
    const envio = activos.filter((s) => !s?.tareas?.enviar_poliza).length;
    const terminadas = arr.filter((s) => s?.estado === "TERMINADA").length;
    const total = arr.length;
    return { activas: Math.max(total - terminadas, 0), terminadas, total, alta, envio };
  }, [items]);

  const filtrados = useMemo(() => {
    let arr = Array.isArray(items) ? items : [];
    if (tab === "pendiente_alta") arr = arr.filter((s) => s?.estado !== "TERMINADA" && !s?.tareas?.alta_compania);
    else if (tab === "pendiente_envio") arr = arr.filter((s) => s?.estado !== "TERMINADA" && !s?.tareas?.enviar_poliza);
    else if (tab === "terminadas") arr = arr.filter((s) => s?.estado === "TERMINADA");
    else arr = arr.filter((s) => s?.estado !== "TERMINADA");

    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((s) => String(s?.cliente_nombre || "").toLowerCase().includes(q) || String(s?.cliente_dni || "").includes(q) || String(s?.vehiculo_patente || "").toLowerCase().includes(q));

    if (isWebAdmin && oficinaFilter && oficinaFilter !== "TODAS") {
        arr = arr.filter((s) => matchOficinaFilter(s?.oficina, oficinaFilter, oficinasConfig));
    }

    return [...arr].sort((a, b) => new Date(b?.actualizado_en || b?.creado_en) - new Date(a?.actualizado_en || a?.creado_en));
  }, [items, tab, search, oficinaFilter, isWebAdmin, oficinasConfig]);

  const eliminar = useCallback(async (s) => {
    if (!isWebAdmin) return toast.error("Solo administradores");
    if (!confirm("¿Eliminar solicitud definitivamente?")) return;
    try {
      await solicitudesApi.eliminar(s.id);
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== s.id);
        knownIdsRef.current.delete(s.id);
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
        return next;
      });
      toast.success("Eliminada");
    } catch (e) { toast.error("Error al eliminar"); }
  }, [isWebAdmin]);

  const terminar = useCallback(async (s) => {
    try {
      const upd = await solicitudesApi.terminar(s.id);
      const updNorm = { ...upd, tareas: getTareas(upd) };
      setItems((prev) => {
        const next = prev.map((x) => (x.id === s.id ? updNorm : x));
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
        return next;
      });
    } catch (e) { toast.error("Error al terminar"); }
  }, []);


  const openCreate = useCallback(() => {
    setCreating(true);
  }, []);

  return (
    <PageTransition>
      <section className="min-h-0 bg-[#0b0f19] text-white flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur">
            <div className="px-3 sm:px-4 lg:px-6 pt-3">

              {/* Fila 1: título + cargar */}
              <div className="flex items-center justify-between gap-2">
                <motion.div className="flex items-center gap-3 min-w-0" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                  <span className="p-2 rounded-xl bg-white/10 border border-white/10 shrink-0">
                    <HiShieldCheck className="w-5 h-5 text-emerald-400" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-semibold text-white truncate">Solicitudes</h1>
                    <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest truncate">
                      Sucursal: {user?.perfil?.oficina_nombre || "Local"}
                    </p>
                  </div>
                </motion.div>
                <motion.button
                  onClick={() => cargar({ silent: false, force: true })}
                  disabled={loading || refreshing}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[#0b0f1e] font-bold bg-gradient-to-br from-sky-200 to-cyan-200 border border-cyan-200/60 shadow-lg disabled:opacity-60 shrink-0"
                  variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
                >
                  <HiRefresh className={(loading || refreshing) ? "animate-spin" : ""} />
                  <span className="text-xs uppercase tracking-tighter hidden sm:inline">{loading || refreshing ? "..." : "Cargar"}</span>
                </motion.button>
              </div>

              {/* Fila 2: botones de acción grandes */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <motion.button
                  onClick={() => setSubidaRapida(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest bg-sky-500 border border-sky-400 shadow-xl"
                  initial="initial" whileHover="hover" whileTap="tap" variants={pressable}
                >
                  <HiLightningBolt className="text-lg" /> Subida rápida
                </motion.button>
                <motion.button
                  onClick={openCreate}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-black font-black uppercase text-[11px] tracking-widest bg-amber-400 border border-amber-300 shadow-xl"
                  initial="initial" whileHover="hover" whileTap="tap" variants={pressable}
                >
                  <HiPlus className="text-lg" /> Nueva
                </motion.button>
              </div>

              {/* Tabs: solo proceso / terminadas */}
              <div className="pt-3 pb-3">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 flex">
                  {[
                    { id: "proceso", label: `En proceso (${counts.activas})` },
                    { id: "terminadas", label: `Terminadas (${counts.terminadas})` },
                  ].map((t) => (
                    <button
                      key={t.id} onClick={() => cambiarTab(t.id)}
                      className={`flex-1 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                        tab === t.id ? "bg-white/20 text-white shadow-inner" : "bg-white/5 text-white/30 hover:text-white/60"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="pb-4 px-3 sm:px-4 lg:px-6">
              <div className="flex flex-col lg:flex-row gap-2">
                <div className="relative flex-1">
                  <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar cliente, DNI, patente..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm outline-none focus:ring-2 ring-sky-500/30 placeholder-white/20"
                    disabled={!hasLoaded}
                  />
                </div>
                <select
                  value={oficinaFilter} onChange={(e) => setOficinaFilter(e.target.value)}
                  disabled={!hasLoaded || !isWebAdmin}
                  className={`px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-sm text-white outline-none focus:ring-2 ring-sky-500/30 ${!isWebAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {isWebAdmin && <option value="TODAS" className="bg-[#0b0f19]">Todas las oficinas</option>}
                  {oficinasConfig.map((of) => <option key={of.id} value={of.id} className="bg-[#0b0f19]">{of.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Listado */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 lg:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] scrollbar-hide relative">
            {!hasLoaded && !loading ? (
              <div className="mt-12 grid place-items-center text-center">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 shadow-2xl backdrop-blur-md max-w-md">
                  <p className="text-lg font-bold text-white/80">Base de datos desconectada</p>
                  <p className="text-xs text-white/30 uppercase font-black tracking-widest mt-2">Sincronización requerida para ver datos</p>
                  <button onClick={() => cargar({ force: true })} className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-black font-black uppercase text-xs shadow-xl tracking-widest hover:scale-105 transition-all">Sincronizar ahora</button>
                </div>
              </div>
            ) : (
              <SolicitudesList
                items={filtrados} loading={loading} refreshing={refreshing}
                onEliminar={eliminar} onRefrescar={() => cargar({ silent: true })}
                onTerminar={terminar}
              />
            )}

            {/* FAB móvil: subida rápida */}
            <motion.button
              onClick={() => setSubidaRapida(true)}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
              className="md:hidden fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_4px_20px_rgba(14,165,233,0.6)] border border-sky-400"
            >
              <HiLightningBolt className="h-7 w-7" />
            </motion.button>
          </div>
        </div>

        {/* MODALES */}
        {subidaRapida && (
          <SubidaRapidaModal
            onClose={() => setSubidaRapida(false)}
            onContinuar={(datos) => { setDatosPdf(datos); setSubidaRapida(false); setCreating(true); }}
          />
        )}
        {creating && (
          <CreateSolicitudModal
            onClose={() => { setCreating(false); setDatosPdf(null); }}
            onCreated={() => { setCreating(false); setDatosPdf(null); if (hasLoaded) cargar({ silent: true, force: true }); }}
            companias={companias}
            coberturas={coberturas}
            oficinas={oficinasConfig}
            initialDatosPdf={datosPdf}
            initialClienteId={paramClienteId}
            initialPatente={paramPatente}
            initialCompania={paramCompania}
          />
        )}
      </section>
    </PageTransition>
  );
}

function Kpi({ label, value, icon, color = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-gray-900/40 p-4 text-center backdrop-blur-md shadow-lg border-b-2 border-b-white/5">
      <div className={`flex items-center justify-center gap-2 text-3xl font-black tracking-tighter ${color}`}>
        {icon ? icon : null}
        <span>{value}</span>
      </div>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">{label}</div>
    </div>
  );
}