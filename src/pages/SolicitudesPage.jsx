// src/pages/SolicitudesPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  HiPlus, 
  HiRefresh, 
  HiShieldCheck, 
  HiBadgeCheck, 
  HiUserGroup, 
  HiChevronDown,
  HiCollection
} from "react-icons/hi";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../context/AuthContext";

import SolicitudesList from "../components/solicitudes/SolicitudesList";
import CreateSolicitudModal from "../components/solicitudes/CreateSolicitudModal";
import ResponsablesCrudModal from "../components/solicitudes/modalcreate/ResponsablesCrudModal";
import CatalogosCrudModal from "../components/solicitudes/modalcreate/CatalogosCrudModal"; 

import { solicitudesApi } from "../services/solicitudes.js";
import { useCatalogos } from "../hooks/solicitudes/useCatalogos";

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
  if (Array.isArray(list)) {
    arr = list;
  } else if (list && Array.isArray(list.results)) {
    arr = list.results;
  } else if (list && Array.isArray(list.data)) {
    arr = list.data;
  }
  return arr.map((s) => ({ ...s, tareas: getTareas(s) }));
}

export default function SolicitudesPage() {
  const { user } = useAuth(); 
  const [items, setItems] = useState([]);
  
  // 🚀 ESTADO DINÁMICO DE OFICINAS
  const [oficinasConfig, setOficinasConfig] = useState([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [showEquipo, setShowEquipo] = useState(false);
  const [showCatalogos, setShowCatalogos] = useState(false);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const { companias, coberturas, ensureLoaded: ensureCatalogosLoaded } = useCatalogos({ auto: false });

  const inFlightRef = useRef(false);
  const latestReqIdRef = useRef(0);
  const abortRef = useRef(null);

  const knownIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  // 🚀 CARGAR OFICINAS DESDE EL BACKEND (Ajustado a la ruta real de tu Django)
  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('jwt');
    const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
    
    // 👇 Ruta corregida para que apunte a /usuarios/oficinas/
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

  const toggleTarea = useCallback(async (s, key, done) => {
    const prevT = getTareas(s);
    const nextTareas = { ...prevT, [key]: done };
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, tareas: nextTareas } : x)));
    try {
      await solicitudesApi.marcarTarea(s.id, key, done);
      if (nextTareas.alta_compania && nextTareas.enviar_poliza && s?.estado !== "TERMINADA") await terminar(s);
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, tareas: prevT } : x)));
      toast.error("Error al guardar tarea");
    }
  }, [terminar]);

  const openCreate = useCallback(async () => {
    try { await ensureCatalogosLoaded?.(); } catch {}
    setCreating(true);
  }, [ensureCatalogosLoaded]);

  return (
    <PageTransition>
      <section className="min-h-0 bg-[#0b0f19] text-white flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur">
            <div className="px-3 sm:px-4 lg:px-6">
              <div className="flex items-center justify-between py-3">
                <motion.div className="flex items-center gap-3 min-w-0" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                  <span className="p-2 rounded-xl bg-white/10 border border-white/10 shrink-0">
                    <HiShieldCheck className="w-5 h-5 text-emerald-400" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-semibold text-white truncate">Solicitudes</h1>
                    <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest">
                       Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
                    </p>
                  </div>
                </motion.div>

                <div className="flex items-center gap-2 shrink-0">
                  {isWebAdmin && (
                    <>
                      <motion.button
                        onClick={() => setShowCatalogos(true)}
                        className="hidden md:inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all font-bold text-[11px] uppercase tracking-widest"
                        variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
                      >
                        <HiCollection className="text-lg" /> Catálogos
                      </motion.button>
                      
                      <motion.button
                        onClick={() => setShowEquipo(true)}
                        className="hidden md:inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all font-bold text-[11px] uppercase tracking-widest"
                        variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
                      >
                        <HiUserGroup className="text-lg" /> Gestión Equipo
                      </motion.button>
                    </>
                  )}

                  <motion.button
                    onClick={() => cargar({ silent: false, force: true })}
                    disabled={loading || refreshing}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl text-[#0b0f1e] font-bold bg-gradient-to-br from-sky-200 to-cyan-200 border border-cyan-200/60 shadow-lg disabled:opacity-60"
                    variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
                  >
                    <HiRefresh className={(loading || refreshing) ? "animate-spin" : ""} />
                    <span className="text-xs uppercase tracking-tighter hidden sm:inline">{loading || refreshing ? "Sincronizando..." : "Cargar"}</span>
                  </motion.button>

                  <motion.button
                    onClick={openCreate}
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-black font-black uppercase text-[11px] tracking-widest bg-amber-400 border border-amber-300 shadow-xl"
                    initial="initial" whileHover="hover" whileTap="tap" variants={pressable}
                  >
                    <HiPlus className="text-lg" /> Nueva solicitud
                  </motion.button>

                  <button className="sm:hidden p-2 rounded-xl bg-white/10" onClick={() => setToolbarOpen(!toolbarOpen)}><HiChevronDown /></button>
                </div>
              </div>

              {/* Tabs */}
              <div className="pb-3">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 flex overflow-x-auto no-scrollbar">
                   {[
                      { id: "proceso", label: "En proceso" },
                      { id: "pendiente_alta", label: `Alta (${counts.alta})` },
                      { id: "pendiente_envio", label: `Envío (${counts.envio})` },
                      { id: "terminadas", label: "Terminadas" },
                    ].map((t) => (
                      <button
                        key={t.id} onClick={() => cambiarTab(t.id)}
                        className={`shrink-0 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
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
            <div className={`${toolbarOpen ? "block" : "hidden"} sm:block pb-4 px-3 sm:px-4 lg:px-6`}>
              <div className="flex flex-col lg:flex-row gap-2">
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente, DNI, patente..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm outline-none focus:ring-2 ring-emerald-500/30 placeholder-white/20"
                  disabled={!hasLoaded}
                />
                <select
                  value={oficinaFilter} onChange={(e) => setOficinaFilter(e.target.value)}
                  disabled={!hasLoaded || !isWebAdmin}
                  className={`px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-sm text-white outline-none focus:ring-2 ring-emerald-500/30 ${!isWebAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isWebAdmin && <option value="TODAS" className="bg-[#0b0f19]">Todas las oficinas</option>}
                  {oficinasConfig.map((of) => <option key={of.id} value={of.id} className="bg-[#0b0f19]">{of.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Listado */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 lg:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+120px)] scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
               <Kpi label="Activas" value={counts.activas} color="text-sky-400" />
               <Kpi label="Terminadas" value={counts.terminadas} color="text-emerald-400" icon={<HiBadgeCheck />} />
               <Kpi label="Total Onboarding" value={counts.total} color="text-white/60" />
            </div>

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
                onTerminar={terminar} onToggleTarea={toggleTarea}
              />
            )}
          </div>
        </div>

        {/* FAB para Mobile */}
        {!creating && (
          <motion.button
            onClick={openCreate}
            className="lg:hidden fixed right-6 z-[80] w-14 h-14 rounded-2xl flex items-center justify-center text-black bg-amber-400 border border-amber-300 shadow-2xl shadow-amber-900/40"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)" }}
            variants={pressable} initial="initial" whileHover="hover" whileTap="tap"
          >
            <HiPlus className="w-8 h-8" />
          </motion.button>
        )}

        {/* MODALES */}
        {creating && (
          <CreateSolicitudModal
            onClose={() => setCreating(false)}
            onCreated={() => { setCreating(false); if (hasLoaded) cargar({ silent: true, force: true }); }}
            companias={companias} coberturas={coberturas}
            oficinas={oficinasConfig}
          />
        )}

        {isWebAdmin && showEquipo && (
          <ResponsablesCrudModal open={showEquipo} onClose={() => setShowEquipo(false)} onChanged={() => cargar({ silent: true })} />
        )}

        {isWebAdmin && showCatalogos && (
          <CatalogosCrudModal open={showCatalogos} onClose={() => setShowCatalogos(false)} onChanged={() => ensureCatalogosLoaded({ force: true })} />
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