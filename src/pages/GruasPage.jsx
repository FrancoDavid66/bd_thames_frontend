// src/pages/GruasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiTruck,
  HiClipboardList,
  HiUserGroup,
  HiCog,
  HiLightningBolt,
  HiPlus,
  HiChevronDown,
  HiChevronUp,
  HiRefresh,
} from "react-icons/hi";

import { fetchKpisSolicitudes, fetchSeriePorMes } from "../store/slices/gruasSlice";

// ✅ hijos reales (según tu estructura)
import SolicitudesTable from "../components/gruas/SolicitudesTable";
import AdhesionesTable from "../components/gruas/AdhesionesTable";
import ProveedoresPanel from "../components/gruas/ProveedoresPanel";
import PlanesPanel from "../components/gruas/PlanesPanel";
import CalculadoraKm from "../components/gruas/CalculadoraKm";
import SolicitarGruaModal from "../components/gruas/SolicitarGruaModal";

// ✅ Modal flota existente
import FlotaModal from "../components/gruas/modal/FlotaModal";
import GruasAPI from "../api/gruas";

// ✅ Adhesiones primero (menú principal)
const TABS = [
  { key: "adhesiones", label: "Adhesiones", icon: HiTruck },
  { key: "solicitudes", label: "Solicitudes", icon: HiClipboardList },
  { key: "proveedores", label: "Proveedores", icon: HiUserGroup },
  // ✅ Flotas ahora es un tab real (no atajo)
  { key: "flotas", label: "Flotas", icon: HiTruck },
  { key: "planes", label: "Planes", icon: HiCog },
  { key: "overview", label: "Overview", icon: HiLightningBolt },
  { key: "calculadora", label: "Calculadora KM", icon: HiPlus },
];

export default function GruasPage() {
  const dispatch = useDispatch();

  // ✅ default: Adhesiones
  const [tab, setTab] = useState("adhesiones");

  // Modal de solicitar grúa (se mantiene)
  const [showSolicitar, setShowSolicitar] = useState(false);

  // Glosario/ayuda
  const [showGlosario, setShowGlosario] = useState(true);

  // ✅ Slice real (según gruasSlice.js que pegaste)
  const kpis = useSelector((s) => s?.gruas?.kpis) || {};
  const kpisMeta = useSelector((s) => s?.gruas?.kpisMeta) || {
    loading: false,
    error: null,
  };

  const seriePorMes = useSelector((s) => s?.gruas?.series?.por_mes) || [];
  const seriesMeta = useSelector((s) => s?.gruas?.seriesMeta) || {
    loading: false,
    error: null,
  };

  // ✅ cargar KPIs/serie al entrar
  useEffect(() => {
    dispatch(fetchKpisSolicitudes({}));
    dispatch(fetchSeriePorMes({}));
  }, [dispatch]);

  // defensivo: algunos backends incluyen listados dentro de kpis
  const enCurso = useMemo(() => {
    return kpis?.en_curso_list || kpis?.en_curso_detalle || kpis?.en_curso || [];
  }, [kpis]);

  const proximas = useMemo(() => {
    return kpis?.proximas_activaciones || [];
  }, [kpis]);

  const kpiHoy = Number(kpis?.servicios_hoy || 0);
  const kpiEnCurso = Number(kpis?.en_curso_count || kpis?.en_curso || enCurso.length || 0);
  const kpiEnEspera = Number(kpis?.en_espera || 0);
  const kpiSuspendidas = Number(kpis?.suspendidas || 0);

  function handleTabClick(key) {
    // ✅ FIX: Flotas ya no es atajo a Proveedores
    setTab(key);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-900 text-white">
      <div className="mx-auto w-full px-6 pt-6 pb-8">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Grúas</h1>
              <p className="text-gray-300 text-sm">
                Gestión del servicio de grúas: adhesiones, proveedores, flotas, planes y solicitudes.
              </p>
            </div>

            {/* CTA principal */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("adhesiones")}
                className="px-5 py-2.5 rounded-2xl bg-white text-gray-900 font-extrabold shadow ring-1 ring-white/20 hover:bg-gray-100 flex items-center gap-2"
                title="Adherir una póliza al servicio de grúa"
              >
                <HiTruck className="text-xl" />
                Adherir póliza
              </button>
            </div>
          </div>

          {/* Glosario */}
          <div className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5">
            <button
              onClick={() => setShowGlosario((v) => !v)}
              className="w-full flex items-center justify-between gap-3"
            >
              <div className="text-left">
                <div className="font-semibold">¿Qué significa “Adherir póliza”?</div>
                <div className="text-xs text-gray-400">
                  Explicación rápida del servicio para que el equipo lo use sin dudas.
                </div>
              </div>
              {showGlosario ? (
                <HiChevronUp className="text-xl opacity-80" />
              ) : (
                <HiChevronDown className="text-xl opacity-80" />
              )}
            </button>

            {showGlosario && (
              <div className="mt-3 text-sm text-gray-200 leading-relaxed">
                <p>
                  <span className="font-semibold">Adherir una póliza</span> significa
                  <span className="font-semibold"> activar el servicio de grúa</span> para ese asegurado.
                  Al adherirla, la póliza queda vinculada a un <span className="font-semibold">plan</span>,
                  con reglas como <span className="font-semibold">carencia</span>,{" "}
                  <span className="font-semibold">cupo de servicios</span> por período y estados como{" "}
                  <span className="font-semibold">activa / en mora / pausada</span>.
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  Tip: entrá en <span className="font-semibold">Adhesiones</span> para adherir rápido.
                </div>
              </div>
            )}
          </div>

          {/* Mini estado de carga (sin ensuciar UI) */}
          {(kpisMeta.loading || seriesMeta.loading) && (
            <div className="text-xs text-gray-400">Cargando datos de grúas…</div>
          )}
          {(kpisMeta.error || seriesMeta.error) && (
            <div className="text-xs text-red-300">{kpisMeta.error || seriesMeta.error}</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Menú lateral interno */}
          <aside className="md:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-2 shadow ring-1 ring-white/5">
              {TABS.map(({ key, label, icon: Icon }) => {
                // ✅ FIX: activo SOLO por igualdad exacta
                const isActive = tab === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleTabClick(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                      isActive ? "bg-gray-700 ring-1 ring-white/10" : "hover:bg-gray-700/70"
                    }`}
                  >
                    <Icon className="text-lg" />
                    <span className={`text-sm ${isActive ? "font-semibold" : ""}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Contenido */}
          <main className="md:col-span-10 space-y-4">
            {/* ✅ Adhesiones primero */}
            {tab === "adhesiones" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AdhesionesTable />
              </motion.div>
            )}

            {tab === "solicitudes" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Solicitudes</h3>
                  <button
                    onClick={() => setShowSolicitar(true)}
                    className="px-4 py-2 rounded-xl bg-primary-400 hover:bg-primary-300 text-slate-900 font-semibold shadow ring-1 ring-primary-200/70"
                    title="Crear una nueva solicitud de grúa"
                  >
                    Solicitar grúa
                  </button>
                </div>
                <SolicitudesTable />
              </motion.div>
            )}

            {/* ✅ Proveedores */}
            {tab === "proveedores" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ProveedoresPanel />
              </motion.div>
            )}

            {/* ✅ NUEVO: Flotas (tabla general) */}
            {tab === "flotas" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <FlotasPanel api={GruasAPI} />
              </motion.div>
            )}

            {tab === "planes" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PlanesPanel />
              </motion.div>
            )}

            {/* Overview sin calculadora rápida */}
            {tab === "overview" && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <div className="text-xs text-gray-400">Servicios hoy</div>
                    <div className="text-3xl font-extrabold">{kpiHoy}</div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <div className="text-xs text-gray-400">En curso</div>
                    <div className="text-3xl font-extrabold">{kpiEnCurso}</div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <div className="text-xs text-gray-400">En espera</div>
                    <div className="text-3xl font-extrabold">{kpiEnEspera}</div>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <div className="text-xs text-gray-400">Suspendidas</div>
                    <div className="text-3xl font-extrabold">{kpiSuspendidas}</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">En curso (top 5)</h3>
                      <button
 associated
                        onClick={() => setTab("solicitudes")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600"
                      >
                        Ver solicitudes
                      </button>
                    </div>

                    <ul className="divide-y divide-white/5">
                      {(Array.isArray(enCurso) ? enCurso.slice(0, 5) : []).map((it, idx) => (
                        <li key={it?.id ?? idx} className="py-2 text-sm flex items-center justify-between">
                          <div className="truncate">
                            <div className="font-medium truncate">
                              {it?.cliente_nombre || it?.titulo || "Cliente"}
                              {it?.patente ? ` • ${it.patente}` : ""}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {it?.estado || "en_curso"}
                              {it?.eta_minutos ? ` • ETA ${it.eta_minutos} min` : ""}
                            </div>
                          </div>
                          <span className="text-xs opacity-70">
                            {it?.actualizado_en ? dayjs(it.actualizado_en).format("HH:mm") : ""}
                          </span>
                        </li>
                      ))}

                      {(!enCurso || (Array.isArray(enCurso) && enCurso.length === 0)) && (
                        <li className="py-2 text-sm text-gray-400">Sin servicios en curso.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <h3 className="font-semibold mb-2">Próximas activaciones</h3>
                    <ul className="divide-y divide-white/5">
                      {(Array.isArray(proximas) ? proximas.slice(0, 5) : []).map((it, idx) => (
                        <li key={it?.id ?? idx} className="py-2 text-sm flex items-center justify-between">
                          <div className="truncate">
                            <div className="font-medium truncate">
                              {it?.cliente_nombre || it?.titulo || "Cliente"}
                              {it?.patente ? ` • ${it.patente}` : ""}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {it?.carencia_fin ? dayjs(it.carencia_fin).format("DD/MM HH:mm") + " hs" : "—"}
                            </div>
                          </div>
                          <span className="text-xs opacity-70">{it?.dias_restantes != null ? `${it.dias_restantes}d` : ""}</span>
                        </li>
                      ))}

                      {(!proximas || (Array.isArray(proximas) && proximas.length === 0)) && (
                        <li className="py-2 text-sm text-gray-400">Sin activaciones próximas.</li>
                      )}
                    </ul>
                  </div>
                </motion.div>

                {Array.isArray(seriePorMes) && seriePorMes.length > 0 && (
                  <div className="text-xs text-gray-400">Serie por mes cargada: {seriePorMes.length} puntos.</div>
                )}
              </>
            )}

            {tab === "calculadora" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CalculadoraKm />
              </motion.div>
            )}
          </main>
        </div>
      </div>

      {showSolicitar && (
        <SolicitarGruaModal
          isOpen
          onClose={() => setShowSolicitar(false)}
          onCreated={() => {
            setShowSolicitar(false);
            setTab("solicitudes");
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   FlotasPanel (tabla general por mes + abrir FlotaModal)
   - No depende de ProveedoresPanel
   - Carga proveedores y trae métricas por proveedor (viajes/vehículos)
========================================================= */
function FlotasPanel({ api }) {
  const [mes, setMes] = useState(() => dayjs().format("YYYY-MM"));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [proveedores, setProveedores] = useState([]);
  const [rows, setRows] = useState([]); // [{proveedor, vehiculos_count, viajes_mes}]
  const [selectedProveedor, setSelectedProveedor] = useState(null);

  const canListProveedores = typeof api?.listProveedores === "function";
  const canGetFlota = typeof api?.getProveedorFlota === "function" || typeof api?.getGruasProveedor === "function";
  const canListVehiculos = typeof api?.listProveedorVehiculos === "function";

  const sumViajes = (items) => {
    const arr = Array.isArray(items) ? items : [];
    // soporta distintos formatos: viajes_mes / servicios_mes / cantidad
    return arr.reduce((acc, r) => {
      const v =
        (typeof r?.viajes_mes === "number" ? r.viajes_mes : null) ??
        (typeof r?.servicios_mes === "number" ? r.servicios_mes : null) ??
        (typeof r?.cantidad === "number" ? r.cantidad : null) ??
        0;
      return acc + Number(v || 0);
    }, 0);
  };

  const normalize = (res) => {
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object") {
      for (const k of ["results", "items", "data", "rows"]) {
        if (Array.isArray(res[k])) return res[k];
      }
    }
    return [];
  };

  async function load() {
    setErr("");

    if (!canListProveedores) {
      setErr("Falta api.listProveedores() para armar la tabla general de flotas.");
      return;
    }

    setLoading(true);
    try {
      const provs = normalize(await api.listProveedores());
      setProveedores(provs);

      // armamos filas (en paralelo, pero controlado)
      const promises = provs.map(async (p) => {
        const proveedorId = p?.id;
        let viajes_mes = 0;
        let vehiculos_count = null;

        // viajes del mes (tolerante: intenta getProveedorFlota y fallback getGruasProveedor)
        if (canGetFlota && proveedorId) {
          try {
            const fn = api.getProveedorFlota || api.getGruasProveedor;
            const data = await fn(proveedorId, { mes });
            viajes_mes = sumViajes(normalize(data));
          } catch {
            viajes_mes = 0;
          }
        }

        // vehículos (si existe endpoint)
        if (canListVehiculos && proveedorId) {
          try {
            const vv = normalize(await api.listProveedorVehiculos(proveedorId, { mes }));
            vehiculos_count = vv.length;
          } catch {
            vehiculos_count = null;
          }
        }

        return { proveedor: p, viajes_mes, vehiculos_count };
      });

      const out = await Promise.all(promises);
      // orden por viajes desc
      out.sort((a, b) => (b.viajes_mes || 0) - (a.viajes_mes || 0));
      setRows(out);
    } catch (e) {
      setErr(e?.message || "No se pudo cargar el panel de flotas.");
      setRows([]);
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">Flotas</h3>
          <p className="text-xs text-gray-300">
            Tabla general por proveedor. Elegí un mes y abrí la flota completa con “Ver flota”.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-white/80">
            Mes
            <input
              type="month"
              className="ml-2 px-3 py-2 bg-gray-900 text-white rounded-xl border border-gray-800"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </label>

          <button
            onClick={load}
            className="px-3 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 border border-white/10 text-sm flex items-center gap-2"
            disabled={loading}
            title="Refrescar tabla"
          >
            <HiRefresh />
            {loading ? "Actualizando…" : "Refrescar"}
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-3 p-3 rounded-xl bg-red-900/30 border border-red-700 text-red-200 text-sm">
          {err}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-white/10 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr className="text-left text-gray-300 uppercase text-xs">
              <th className="px-3 py-2">Proveedor</th>
              <th className="px-3 py-2">Vehículos</th>
              <th className="px-3 py-2">Viajes ({mes})</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  Cargando flotas…
                </td>
              </tr>
            )}

            {!loading && rows.map((r) => (
              <tr key={r?.proveedor?.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-3 py-2">
                  <div className="font-semibold">{r?.proveedor?.nombre || "—"}</div>
                  <div className="text-xs text-gray-400">
                    ID {r?.proveedor?.id ?? "—"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r?.vehiculos_count == null ? (
                    <span className="text-gray-400 text-xs">—</span>
                  ) : (
                    r.vehiculos_count
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{Number(r?.viajes_mes || 0)}</td>
                <td className="px-3 py-2">
                  <button
                    className="px-3 py-2 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100"
                    onClick={() => setSelectedProveedor(r.proveedor)}
                  >
                    Ver flota
                  </button>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && !err && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-gray-400">
                  Sin datos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal flota por proveedor */}
      {selectedProveedor?.id && (
        <FlotaModal
          proveedor={selectedProveedor}
          initialMes={mes}
          onClose={() => setSelectedProveedor(null)}
          api={api}
          variant="social"
        />
      )}
    </div>
  );
}
