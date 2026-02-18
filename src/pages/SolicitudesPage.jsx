// src/pages/SolicitudesPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiPlus, HiRefresh, HiShieldCheck, HiBadgeCheck } from "react-icons/hi";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

import SolicitudesList from "../components/solicitudes/SolicitudesList";
import CreateSolicitudModal from "../components/solicitudes/CreateSolicitudModal";
import { solicitudesApi } from "../services/solicitudes.js";
import { useCatalogos } from "../hooks/solicitudes/useCatalogos";

import PageTransition from "../ux/motion/PageTransition.jsx";
import { MotionList, MotionListItem } from "../ux/motion/MotionList.jsx";
import { pressable } from "../ux/motion/variants";

// 🔔 realtime front-only (BroadcastChannel)
import { solicitudesRealtime } from "../services/notifications/solicitudes.js";

// 🏢 Oficinas fijas
const OFICINAS = [
  { id: "1", nombre: "5 esquinas (1)" },
  { id: "2", nombre: "axion (2)" },
  { id: "3", nombre: "kilometro 39 (3)" },
];

/* Helpers (para un futuro “Resumen” PNG) */
function slug(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
function buildSolicitudFilename(s) {
  const apellido =
    s?.titular_apellido ||
    s?.cliente_apellido ||
    s?.apellido ||
    s?.cliente?.apellido ||
    "";
  const nombre =
    s?.titular_nombre ||
    s?.cliente_nombre ||
    s?.nombre ||
    s?.cliente?.nombre ||
    "";
  const compania = s?.compania_preferida || s?.compania || "";
  const parts = ["solicitud", apellido, nombre, compania].filter(Boolean).map(slug);
  const base = parts.join("_") || `solicitud_${slug(s?.id || "")}`;
  return `${base}.png`;
}

function getTareas(s) {
  return {
    alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
    enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
  };
}

// ➕ calculador de contadores para emitir a Sidebar (alta/envío)
function computeCounters(list = []) {
  const activos = list.filter((x) => x?.estado !== "TERMINADA");
  const alta = activos.filter((x) => !getTareas(x).alta_compania).length;
  const envio = activos.filter((x) => !getTareas(x).enviar_poliza).length;
  return { alta, envio };
}

// 🔍 helper robusto para matchear la oficina
function matchOficinaFilter(value, filter) {
  if (!filter || filter === "TODAS") return true;
  if (value === null || value === undefined) return false;

  const raw = String(value).trim().toLowerCase();
  const f = String(filter).trim().toLowerCase();

  const selected =
    OFICINAS.find((o) => o.id === filter) ||
    OFICINAS.find((o) => o.nombre.toLowerCase() === f);

  if (!selected) return raw === f || raw.includes(f);

  const id = selected.id.toLowerCase();
  const name = selected.nombre.toLowerCase();
  return raw === id || raw === name || raw.includes(id) || raw.includes(name);
}

// Normaliza una lista “una sola vez”
function normalizeList(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((s) => ({ ...s, tareas: getTareas(s) }));
}

export default function SolicitudesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // ✅ NO auto-cargar al entrar
  const [hasLoaded, setHasLoaded] = useState(false);

  // ✅ Auto-refresh opcional (OFF por defecto)
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Tabs: proceso | pendiente_alta | pendiente_envio | terminadas
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = searchParams.get("tab");
    return ["proceso", "pendiente_alta", "pendiente_envio", "terminadas"].includes(t || "")
      ? t
      : "proceso";
  })();
  const [tab, setTab] = useState(initialTab);

  const [search, setSearch] = useState("");
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // 🔎 filtro por oficina (por ID: "1", "2", "3" o "TODAS")
  const [oficinaFilter, setOficinaFilter] = useState("TODAS");

  // ✅ catálogos lazy (solo cuando abren “Nueva solicitud”)
  const { companias, coberturas, ensureLoaded: ensureCatalogosLoaded } = useCatalogos({ auto: false });

  // Evita requests solapados + aborta el anterior
  const inFlightRef = useRef(false);
  const latestReqIdRef = useRef(0);
  const abortRef = useRef(null);

  // Cargar (stable)
  const cargar = useCallback(async (opts = { silent: false, force: false }) => {
    const { silent, force } = opts || {};

    // Si no forzás y hay uno en vuelo, no spameamos
    if (!force && inFlightRef.current) return;

    // Abort request anterior
    try {
      abortRef.current?.abort?.();
    } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    silent ? setRefreshing(true) : setLoading(true);

    const reqId = ++latestReqIdRef.current;
    inFlightRef.current = true;

    try {
      const list = await solicitudesApi.listar({ signal: controller.signal });

      // si llegó una respuesta vieja, la ignoramos
      if (reqId !== latestReqIdRef.current) return;

      const norm = normalizeList(list);
      setItems(norm);
      setHasLoaded(true);

      const { alta, envio } = computeCounters(norm);
      solicitudesRealtime.emitLocal({
        type: "solicitudes.counters",
        data: { alta, envio },
      });
    } catch (e) {
      // Abort no es error visible
      if (e?.name === "AbortError") return;
      toast.error(e?.message || "Error al cargar");
    } finally {
      if (reqId === latestReqIdRef.current) {
        inFlightRef.current = false;
        silent ? setRefreshing(false) : setLoading(false);
      }
    }
  }, []);

  // ✅ Auto-refresh SOLO si el usuario lo activa y YA cargó al menos una vez
  useEffect(() => {
    if (!autoRefresh || !hasLoaded) return;
    const t = setInterval(() => {
      cargar({ silent: true, force: false });
    }, 20000); // 20s
    return () => clearInterval(t);
  }, [autoRefresh, hasLoaded, cargar]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      try {
        abortRef.current?.abort?.();
      } catch {}
    };
  }, []);

  // Sincronizar tab con la URL (?tab=...)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== tab && ["proceso", "pendiente_alta", "pendiente_envio", "terminadas"].includes(t)) {
      setTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const cambiarTab = useCallback(
    (t) => {
      setTab(t);
      const next = new URLSearchParams(searchParams);
      next.set("tab", t);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const counts = useMemo(() => {
    const arr = Array.isArray(items) ? items : [];
    const activos = arr.filter((s) => s?.estado !== "TERMINADA");
    const alta = activos.filter((s) => !s?.tareas?.alta_compania).length;
    const envio = activos.filter((s) => !s?.tareas?.enviar_poliza).length;
    const terminadas = arr.filter((s) => s?.estado === "TERMINADA").length;
    const total = arr.length;
    const activas = Math.max(total - terminadas, 0);
    return { activas, terminadas, total, alta, envio };
  }, [items]);

  const filtrados = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    let arr = base;

    if (tab === "pendiente_alta") {
      arr = arr.filter((s) => s?.estado !== "TERMINADA" && !s?.tareas?.alta_compania);
    } else if (tab === "pendiente_envio") {
      arr = arr.filter((s) => s?.estado !== "TERMINADA" && !s?.tareas?.enviar_poliza);
    } else if (tab === "terminadas") {
      arr = arr.filter((s) => s?.estado === "TERMINADA");
    } else {
      arr = arr.filter((s) => s?.estado !== "TERMINADA");
    }

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((s) => {
        const cn = String(s?.cliente_nombre || "").toLowerCase();
        const cd = String(s?.cliente_dni || "").toLowerCase();
        const pat = String(s?.vehiculo_patente || "").toLowerCase();
        const cod = String(s?.codigo || "").toLowerCase();
        return cn.includes(q) || cd.includes(q) || pat.includes(q) || cod.includes(q);
      });
    }

    if (oficinaFilter && oficinaFilter !== "TODAS") {
      arr = arr.filter((s) => matchOficinaFilter(s?.oficina, oficinaFilter));
    }

    // sort optimizado
    const decorated = arr.map((s) => {
      const ts = new Date(s?.actualizado_en || s?.creado_en || 0).getTime();
      return [ts, s];
    });
    decorated.sort((a, b) => b[0] - a[0]);
    return decorated.map((x) => x[1]);
  }, [items, tab, search, oficinaFilter]);

  const kpis = useMemo(() => {
    const { activas, terminadas, total } = counts;
    return { activas, terminadas, total };
  }, [counts]);

  // Resumen (placeholder)
  const comprobante = useCallback(async (s) => {
    try {
      toast("Función de resumen/PNG pendiente de definir.", { icon: "🧾" });
      void buildSolicitudFilename(s);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "No se pudo generar el resumen");
    }
  }, []);

  const eliminar = useCallback(async (s) => {
    if (!confirm("Esta acción elimina la solicitud definitivamente. ¿Continuar?")) return;
    try {
      await solicitudesApi.eliminar(s.id);
      setItems((prev) => {
        const next = (prev || []).filter((x) => x.id !== s.id);
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
        return next;
      });
      toast.success("Solicitud eliminada");
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  }, []);

  const terminar = useCallback(async (s) => {
    try {
      const upd = await solicitudesApi.terminar(s.id);
      const updNorm = { ...upd, tareas: getTareas(upd) };

      setItems((prev) => {
        const next = (prev || []).map((x) => (x.id === s.id ? updNorm : x));
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
        return next;
      });

      toast.success("Solicitud movida a Terminadas.");
    } catch (e) {
      toast.error(e?.message || "Error al terminar la solicitud");
    }
  }, []);

  // Toggle de tareas con auto-terminado si ambas quedan en true
  const toggleTarea = useCallback(
    async (s, key, done) => {
      const prevT = getTareas(s);
      const nextTareas = {
        alta_compania: key === "alta_compania" ? done : prevT.alta_compania,
        enviar_poliza: key === "enviar_poliza" ? done : prevT.enviar_poliza,
      };

      // Optimista + counters
      setItems((prevItems) => {
        const next = (prevItems || []).map((x) => (x.id === s.id ? { ...x, tareas: nextTareas } : x));
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
        return next;
      });

      try {
        if (solicitudesApi?.marcarTarea) await solicitudesApi.marcarTarea(s.id, key, done);

        if (nextTareas.alta_compania && nextTareas.enviar_poliza && s?.estado !== "TERMINADA") {
          await terminar(s);
        }
      } catch (e) {
        // revert + counters
        setItems((prevItems) => {
          const next = (prevItems || []).map((x) => (x.id === s.id ? { ...x, tareas: prevT } : x));
          const { alta, envio } = computeCounters(next);
          solicitudesRealtime.emitLocal({ type: "solicitudes.counters", data: { alta, envio } });
          return next;
        });
        toast.error(e?.message || "No se pudo guardar la tarea");
      }
    },
    [terminar]
  );

  const showEmptyLoadState = !hasLoaded && !loading && !refreshing;

  // ✅ abrir modal: cargar catálogos SOLO ahí
  const openCreate = useCallback(async () => {
    try {
      await ensureCatalogosLoaded?.();
    } catch {
      // si falla el fetch, igual abrimos con fallbacks del hook
    }
    setCreating(true);
  }, [ensureCatalogosLoaded]);

  return (
    <PageTransition>
      <section className="min-h-[calc(100vh-4rem)] bg-[#0b0f19] text-white flex flex-col">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0f19]/90 backdrop-blur"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="px-3 sm:px-4 lg:px-6">
              <div className="flex items-center justify-between py-2">
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <span className="p-2 rounded-xl bg-white/10 border border-white/10">
                    <HiShieldCheck className="w-5 h-5 text-white" />
                  </span>
                  <h1 className="text-base sm:text-lg font-semibold text-white">Solicitudes de Seguro</h1>
                </motion.div>

                <div className="flex items-center gap-2">
                  {/* ✅ BOTÓN NUEVO: Cargar solicitudes (más grande, otro color, otro lugar) */}
                  <motion.button
                    type="button"
                    onClick={() => cargar({ silent: false, force: true })}
                    disabled={loading || refreshing}
                    title="Cargar solicitudes"
                    className="
                      inline-flex items-center gap-2
                      px-4 py-2.5 rounded-2xl
                      text-[#0b0f1e] font-semibold
                      bg-gradient-to-br from-sky-200 to-cyan-200
                      border border-cyan-200/60
                      shadow-lg hover:brightness-105 active:brightness-95
                      disabled:opacity-60
                      focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/40
                    "
                    variants={pressable}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <HiRefresh className={(loading || refreshing) ? "animate-spin" : ""} />
                    <span className="text-sm md:text-[13px]">
                      {loading || refreshing ? "Cargando…" : "Cargar solicitudes"}
                    </span>
                  </motion.button>

                  {/* Auto-refresh toggle (desktop) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasLoaded) {
                        toast("Primero cargá solicitudes.", { icon: "ℹ️" });
                        return;
                      }
                      setAutoRefresh((v) => !v);
                      toast(!autoRefresh ? "Auto-actualizar: ON" : "Auto-actualizar: OFF", { icon: "⏱️" });
                    }}
                    className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-white/90"
                    title="Auto-actualizar"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${autoRefresh ? "bg-emerald-400" : "bg-white/30"}`} />
                    <span className="text-sm">{autoRefresh ? "Auto ON" : "Auto OFF"}</span>
                  </button>

                  <motion.button
                    type="button"
                    onClick={openCreate}
                    title="Crear nueva solicitud"
                    className="
                      hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl
                      text-black font-semibold
                      bg-amber-400 border border-amber-300
                      hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40
                    "
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    variants={pressable}
                  >
                    <HiPlus className="text-xl" /> Nueva solicitud
                  </motion.button>

                  <button
                    className="sm:hidden inline-flex items-center px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs"
                    onClick={() => setToolbarOpen((v) => !v)}
                    aria-expanded={toolbarOpen}
                    aria-controls="toolbar-secundaria"
                    title="Mostrar/Ocultar filtros"
                  >
                    {toolbarOpen ? "Ocultar" : "Filtros"}
                  </button>
                </div>
              </div>
            </div>

            <div id="toolbar-secundaria" className={`${toolbarOpen ? "block" : "hidden"} sm:block pb-3`}>
              <div className="px-3 sm:px-4 lg:px-6">
                <div className="flex flex-col lg:flex-row gap-2">
                  <div className="inline-flex rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    {[
                      { id: "proceso", label: "En proceso" },
                      { id: "pendiente_alta", label: `Pendiente alta (${counts.alta})` },
                      { id: "pendiente_envio", label: `Pendiente envío (${counts.envio})` },
                      { id: "terminadas", label: "Terminadas" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => cambiarTab(t.id)}
                        className={`px-3 py-2 text-xs sm:text-sm transition-colors ${
                          tab === t.id ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:text-white"
                        }`}
                        title={t.label}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-1 gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por cliente / DNI / patente / código…"
                      className="
                        flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10
                        text-white text-xs sm:text-sm placeholder-white/50
                      "
                      disabled={!hasLoaded}
                      title={!hasLoaded ? "Primero cargá solicitudes" : undefined}
                    />

                    <select
                      value={oficinaFilter}
                      onChange={(e) => setOficinaFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs sm:text-sm"
                      title={!hasLoaded ? "Primero cargá solicitudes" : "Filtrar por oficina"}
                      disabled={!hasLoaded}
                    >
                      <option value="TODAS" className="bg-[#0b0f19] text-white">
                        Todas las oficinas
                      </option>
                      {OFICINAS.map((of) => (
                        <option key={of.id} value={of.id} className="bg-[#0b0f19] text-white">
                          {of.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Auto-refresh toggle (mobile in toolbar) */}
                  <div className="md:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasLoaded) {
                          toast("Primero cargá solicitudes.", { icon: "ℹ️" });
                          return;
                        }
                        setAutoRefresh((v) => !v);
                        toast(!autoRefresh ? "Auto-actualizar: ON" : "Auto-actualizar: OFF", { icon: "⏱️" });
                      }}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-white/90"
                      title="Auto-actualizar"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${autoRefresh ? "bg-emerald-400" : "bg-white/30"}`} />
                      <span className="text-sm">{autoRefresh ? "Auto-actualizar ON" : "Auto-actualizar OFF"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="
              flex-1 overflow-y-auto
              px-3 sm:px-4 lg:px-6
              pt-3
              pb-[calc(env(safe-area-inset-bottom,0px)+120px)]
            "
          >
            <MotionList as="div" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
              <MotionListItem as="div" className="xl:col-span-2">
                <Kpi label="Activas" value={kpis.activas} />
              </MotionListItem>
              <MotionListItem as="div" className="xl:col-span-2">
                <Kpi label="Terminadas" value={kpis.terminadas} icon={<HiBadgeCheck />} />
              </MotionListItem>
              <MotionListItem as="div" className="xl:col-span-2">
                <Kpi label="Total" value={kpis.total} />
              </MotionListItem>
            </MotionList>

            {showEmptyLoadState ? (
              <div className="mt-8 grid place-items-center text-center text-white/70">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-8 max-w-xl w-full">
                  <p className="text-sm md:text-base">Todavía no cargaste solicitudes.</p>
                  <p className="mt-1 text-xs md:text-sm text-white/60">
                    Para optimizar velocidad, esta sección carga bajo demanda.
                  </p>
                  <motion.button
                    type="button"
                    className="
                      mt-4 inline-flex items-center gap-2
                      rounded-2xl px-4 py-3
                      text-[#0b0f1e] font-semibold
                      bg-gradient-to-br from-sky-200 to-cyan-200
                      border border-cyan-200/60
                      shadow-lg hover:brightness-105 active:brightness-95
                      focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/40
                    "
                    onClick={() => cargar({ silent: false, force: true })}
                    variants={pressable}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <HiRefresh /> Cargar solicitudes
                  </motion.button>
                </div>
              </div>
            ) : (
              <SolicitudesList
                items={filtrados}
                loading={loading}
                refreshing={refreshing}
                onComprobante={comprobante}
                onEliminar={eliminar}
                onRefrescar={() => cargar({ silent: true })}
                onTerminar={terminar}
                onToggleTarea={toggleTarea}
              />
            )}
          </div>
        </div>

        {!creating && (
          <motion.button
            type="button"
            onClick={openCreate}
            aria-label="Nueva solicitud"
            className="
              lg:hidden fixed right-5 z-[80]
              w-14 h-14 rounded-2xl
              flex items-center justify-center
              text-black bg-amber-400 border border-amber-300
              hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40
            "
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            variants={pressable}
            title="Nueva solicitud"
          >
            <HiPlus className="w-7 h-7" />
          </motion.button>
        )}

        {creating && (
          <CreateSolicitudModal
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              // si el usuario nunca cargó, no disparamos requests solo por crear
              if (hasLoaded) cargar({ silent: true, force: true });
            }}
            companias={companias}
            coberturas={coberturas}
          />
        )}
      </section>
    </PageTransition>
  );
}

function Kpi({ label, value, icon }) {
  return (
    <motion.div
      className="rounded-2xl border border-white/10 overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="p-[1px]">
        <div className="rounded-2xl p-4 text-center bg-white/[0.06]">
          <div className="mx-auto mb-2 h-1.5 w-24 rounded-full bg-white/20" />
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
            {icon ? <span className="text-white/80">{icon}</span> : null}
            <span>{value}</span>
          </div>
          <div className="text-xs text-white/70">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}
