// src/pages/SolicitudesPage.jsx
import { useEffect, useMemo, useState } from "react";
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

// 🔔 realtime front-only (BroadcastChannel + polling)
import { solicitudesRealtime } from "../services/notifications/solicitudes.js";

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
    s?.titular_nombre || s?.cliente_nombre || s?.nombre || s?.cliente?.nombre || "";
  const compania = s?.compania_preferida || s?.compania || "";
  const parts = ["solicitud", apellido, nombre, compania]
    .filter(Boolean)
    .map(slug);
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

export default function SolicitudesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Tabs: proceso | pendiente_alta | pendiente_envio | terminadas
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (() => {
    const t = searchParams.get("tab");
    return ["proceso", "pendiente_alta", "pendiente_envio", "terminadas"].includes(
      t || ""
    )
      ? t
      : "proceso";
  })();
  const [tab, setTab] = useState(initialTab);

  const [search, setSearch] = useState("");
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const { companias, coberturas } = useCatalogos();

  // Cargar
  const cargar = async (opts = { silent: false }) => {
    const { silent } = opts || {};
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const list = await solicitudesApi.listar({});
      const norm = (Array.isArray(list) ? list : []).map((s) => ({
        ...s,
        tareas: getTareas(s),
      }));
      setItems(norm);
      // 🔔 emitir counters para Sidebar
      const { alta, envio } = computeCounters(norm);
      solicitudesRealtime.emitLocal({
        type: "solicitudes.counters",
        data: { alta, envio },
      });
    } catch (e) {
      toast.error(e.message || "Error al cargar");
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    cargar({ silent: false });
  }, []);

  // ⏱️ polling más frecuente (5s)
  useEffect(() => {
    const t = setInterval(() => {
      cargar({ silent: true });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Sincronizar tab con la URL (?tab=...)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (
      t &&
      t !== tab &&
      ["proceso", "pendiente_alta", "pendiente_envio", "terminadas"].includes(t)
    ) {
      setTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const cambiarTab = (t) => {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  const itemsConTarea = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((s) => ({
      ...s,
      tareas: getTareas(s),
    }));
  }, [items]);

  const counts = useMemo(() => {
    const activos = itemsConTarea.filter((s) => s?.estado !== "TERMINADA");
    const alta = activos.filter((s) => !s.tareas.alta_compania).length;
    const envio = activos.filter((s) => !s.tareas.enviar_poliza).length;
    const terminadas = itemsConTarea.filter((s) => s?.estado === "TERMINADA").length;
    const total = itemsConTarea.length;
    const activas = Math.max(total - terminadas, 0);
    return { activas, terminadas, total, alta, envio };
  }, [itemsConTarea]);

  const filtrados = useMemo(() => {
    let arr = Array.isArray(itemsConTarea) ? [...itemsConTarea] : [];

    if (tab === "pendiente_alta") {
      arr = arr.filter((s) => s?.estado !== "TERMINADA" && !s.tareas.alta_compania);
    } else if (tab === "pendiente_envio") {
      arr = arr.filter((s) => s?.estado !== "TERMINADA" && !s.tareas.enviar_poliza);
    } else if (tab === "terminadas") {
      arr = arr.filter((s) => s?.estado === "TERMINADA");
    } else {
      // proceso
      arr = arr.filter((s) => s?.estado !== "TERMINADA");
    }

    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (s) =>
          String(s?.cliente_nombre || "").toLowerCase().includes(q) ||
          String(s?.cliente_dni || "").toLowerCase().includes(q) ||
          String(s?.vehiculo_patente || "").toLowerCase().includes(q) ||
          String(s?.codigo || "").toLowerCase().includes(q)
      );
    }
    const ts = (s) => new Date(s?.actualizado_en || s?.creado_en || 0).getTime();
    arr.sort((a, b) => ts(b) - ts(a));
    return arr;
  }, [itemsConTarea, tab, search]);

  const kpis = useMemo(() => {
    const { activas, terminadas, total } = counts;
    return { activas, terminadas, total };
  }, [counts]);

  // Resumen (placeholder)
  const comprobante = async (s) => {
    try {
      toast("Función de resumen/PNG pendiente de definir.", { icon: "🧾" });
      // Ej.: const blob = await solicitudesApi.resumenPNG(s.id); downloadBlob(blob, buildSolicitudFilename(s));
    } catch (e) {
      console.error(e);
      toast.error(e.message || "No se pudo generar el resumen");
    }
  };

  const eliminar = async (s) => {
    if (!confirm("Esta acción elimina la solicitud definitivamente. ¿Continuar?")) return;
    try {
      await solicitudesApi.eliminar(s.id);
      setItems((prev) => {
        const next = (prev || []).filter((x) => x.id !== s.id);
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({
          type: "solicitudes.counters",
          data: { alta, envio },
        });
        return next;
      });
      toast.success("Solicitud eliminada");
    } catch (e) {
      toast.error(e.message || "No se pudo eliminar");
    }
  };

  const terminar = async (s) => {
    try {
      const upd = await solicitudesApi.terminar(s.id);
      setItems((prev) => {
        const next = (prev || []).map((x) =>
          x.id === s.id ? { ...upd, tareas: getTareas(upd) } : x
        );
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({
          type: "solicitudes.counters",
          data: { alta, envio },
        });
        return next;
      });
      toast.success("Solicitud movida a Terminadas.");
    } catch (e) {
      toast.error(e.message || "Error al terminar la solicitud");
    }
  };

  // Toggle de tareas con auto-terminado si ambas quedan en true
  const toggleTarea = async (s, key, done) => {
    const prev = getTareas(s);
    const nextTareas = {
      alta_compania: key === "alta_compania" ? done : prev.alta_compania,
      enviar_poliza: key === "enviar_poliza" ? done : prev.enviar_poliza,
    };

    // Optimista + emitir counters
    setItems((prevItems) => {
      const next = (prevItems || []).map((x) =>
        x.id === s.id ? { ...x, tareas: nextTareas } : x
      );
      const { alta, envio } = computeCounters(next);
      solicitudesRealtime.emitLocal({
        type: "solicitudes.counters",
        data: { alta, envio },
      });
      return next;
    });

    try {
      if (solicitudesApi?.marcarTarea) await solicitudesApi.marcarTarea(s.id, key, done);

      if (nextTareas.alta_compania && nextTareas.enviar_poliza && s?.estado !== "TERMINADA") {
        await terminar(s); // terminar() vuelve a emitir counters
      }
    } catch (e) {
      // Revertimos + re-emitimos counters
      setItems((prevItems) => {
        const next = (prevItems || []).map((x) =>
          x.id === s.id ? { ...x, tareas: prev } : x
        );
        const { alta, envio } = computeCounters(next);
        solicitudesRealtime.emitLocal({
          type: "solicitudes.counters",
          data: { alta, envio },
        });
        return next;
      });
      toast.error(e.message || "No se pudo guardar la tarea");
    }
  };

  return (
    <PageTransition>
      <section
        className="
          min-h-[calc(100vh-4rem)]
          bg-[#0b0f19]
          text-white
          flex flex-col
        "
      >
        {/* Contenedor scrollable principal (tipo chat) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header sticky + toolbar */}
          <div
            className="
              sticky top-0 z-20
              border-b border-white/10
              bg-[#0b0f19]/90 backdrop-blur
            "
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
                  <h1 className="text-base sm:text-lg font-semibold text-white">
                    Solicitudes de Seguro
                  </h1>
                </motion.div>

                {/* Acciones rápidas */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cargar({ silent: true })}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-white disabled:opacity-60"
                    title="Actualizar"
                    aria-label="Actualizar"
                    disabled={refreshing}
                  >
                    <HiRefresh className={refreshing ? "animate-spin" : ""} />
                    <span className="hidden md:inline">
                      {refreshing ? "Actualizando…" : "Actualizar"}
                    </span>
                  </button>

                  {/* CTA principal (desktop) */}
                  <motion.button
                    type="button"
                    onClick={() => setCreating(true)}
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

                  {/* Toolbar mobile toggle */}
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

            {/* Toolbar secundaria */}
            <div
              id="toolbar-secundaria"
              className={`${toolbarOpen ? "block" : "hidden"} sm:block pb-3`}
            >
              <div className="px-3 sm:px-4 lg:px-6">
                <div className="flex flex-col lg:flex-row gap-2">
                  {/* Tabs de estado */}
                  <div className="inline-flex rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    {[
                      { id: "proceso", label: "En proceso" },
                      {
                        id: "pendiente_alta",
                        label: `Pendiente alta (${counts.alta})`,
                      },
                      {
                        id: "pendiente_envio",
                        label: `Pendiente envío (${counts.envio})`,
                      },
                      { id: "terminadas", label: "Terminadas" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => cambiarTab(t.id)}
                        className={`px-3 py-2 text-xs sm:text-sm transition-colors ${
                          tab === t.id
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/70 hover:text-white"
                        }`}
                        title={t.label}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Búsqueda */}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por cliente / DNI / patente / código…"
                    className="
                      flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10
                      text-white text-xs sm:text-sm placeholder-white/50
                    "
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contenido scrollable: KPIs + Lista */}
          <div
            className="
              flex-1 overflow-y-auto
              px-3 sm:px-4 lg:px-6
              pt-3
              pb-[calc(env(safe-area-inset-bottom,0px)+120px)]
            "
          >
            {/* KPIs */}
            <MotionList
              as="div"
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-4"
            >
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

            {/* Lista */}
            <SolicitudesList
              key={`sols-${tab}-${search}`}
              items={filtrados}
              loading={loading}
              refreshing={refreshing}
              onComprobante={comprobante}
              onEliminar={eliminar}
              onRefrescar={() => cargar({ silent: true })}
              onTerminar={terminar}
              onToggleTarea={toggleTarea}
            />
          </div>
        </div>

        {/* FAB móvil */}
        {!creating && (
          <motion.button
            type="button"
            onClick={() => setCreating(true)}
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

        {/* Modal crear (nuevo flujo unificado: Vehículo + Documentos) */}
        {creating && (
          <CreateSolicitudModal
            onClose={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              cargar({ silent: true }); // refresco la lista
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
