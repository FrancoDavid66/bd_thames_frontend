// src/components/gruas/GruasPage.jsx
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiTruck,
  HiClipboardList,
  HiUserGroup,
  HiCog,
  HiLightningBolt,
  HiPlus,
} from "react-icons/hi";

// ✅ Están en la misma carpeta
import DashboardSolicitudes from "../components/gruas/DashboardSolicitudes";
import SolicitudesTable from "../components/gruas/SolicitudesTable";
import AdhesionesTable from "../components/gruas/AdhesionesTable";
import ProveedoresPanel from "../components/gruas/ProveedoresPanel";
import PlanesPanel from "../components/gruas/PlanesPanel";
import CalculadoraKm from "../components/gruas/CalculadoraKm";
import SolicitudCreateModal from "../components/gruas/SolicitudCreateModal";
import AdhesionCreateModal from "../components/gruas/AdhesionCreateModal";
import SolicitarGruaModal from "../components/gruas/SolicitarGruaModal";

const TABS = [
  { key: "overview", label: "Overview", icon: HiLightningBolt },
  { key: "solicitudes", label: "Solicitudes", icon: HiClipboardList },
  { key: "adhesiones", label: "Adhesiones", icon: HiTruck },
  { key: "proveedores", label: "Proveedores", icon: HiUserGroup },
  { key: "planes", label: "Planes", icon: HiCog },
  { key: "calculadora", label: "Calculadora KM", icon: HiPlus },
];

export default function GruasPage() {
  const [tab, setTab] = useState("overview");
  const [showSolicitar, setShowSolicitar] = useState(false);

  // ==== Datos agregados desde Redux (defensivo) ====
  const kpis = useSelector((s) => s?.gruas?.kpis || {});
  const series = useSelector((s) => s?.gruas?.series || {});
  const enCurso = useMemo(() => series?.en_curso || [], [series]);
  const proximas = useMemo(() => kpis?.proximas_activaciones || [], [kpis]);

  const kpiHoy = Number(kpis?.servicios_hoy || 0);
  const kpiEnCurso = Number(kpis?.en_curso || enCurso.length || 0);
  const kpiEnEspera = Number(kpis?.en_espera || 0);
  const kpiSuspendidas = Number(kpis?.suspendidas || 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-900 text-white">
      {/* ⬇️ Full width, como Polizas/Pagos */}
      <div className="mx-auto w-full px-6 pt-6 pb-8">
        {/* Header limpio */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Grúas</h1>
            <p className="text-gray-300 text-sm">Resumen operativo y accesos.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Sidebar más angosto */}
          <aside className="md:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-2 shadow ring-1 ring-white/5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                    tab === key ? "bg-gray-700 ring-1 ring-white/10" : "hover:bg-gray-700/70"
                  }`}
                >
                  <Icon className="text-lg" />
                  <span className={`text-sm ${tab === key ? "font-semibold" : ""}`}>{label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Contenido más ancho */}
          <main className="md:col-span-10 space-y-4">
            {tab === "overview" && (
              <>
                {/* KPIs compactos */}
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

                {/* En curso (top 5) + Próximas activaciones */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">En curso (top 5)</h3>
                      <button
                        onClick={() => setTab("solicitudes")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600"
                      >
                        Ver solicitudes
                      </button>
                    </div>
                    <ul className="divide-y divide-white/5">
                      {(enCurso.slice(0, 5) || []).map((it, idx) => (
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
                      {enCurso.length === 0 && (
                        <li className="py-2 text-sm text-gray-400">Sin servicios en curso.</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-gray-800 rounded-2xl p-4 ring-1 ring-white/5">
                    <h3 className="font-semibold mb-2">Próximas activaciones</h3>
                    <ul className="divide-y divide-white/5">
                      {(proximas.slice(0, 5) || []).map((it, idx) => (
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
                          <span className="text-xs opacity-70">
                            {it?.dias_restantes != null ? `${it.dias_restantes}d` : ""}
                          </span>
                        </li>
                      ))}
                      {(proximas || []).length === 0 && (
                        <li className="py-2 text-sm text-gray-400">Sin activaciones próximas.</li>
                      )}
                    </ul>
                  </div>
                </motion.div>

                {/* Calculadora rápida */}
                <motion.div
                  className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="font-semibold mb-3">Calculadora rápida de KM</h3>
                  <CalculadoraKm compact />
                </motion.div>
              </>
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

            {tab === "adhesiones" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AdhesionesTable />
              </motion.div>
            )}

            {tab === "proveedores" && (
              <motion.div
                className="bg-gray-800 rounded-2xl p-4 shadow ring-1 ring-white/5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ProveedoresPanel />
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

      {/* Modal: Solicitar grúa (se abre desde la pestaña Solicitudes) */}
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
