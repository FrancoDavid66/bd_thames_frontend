// src/components/layout/Sidebar.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaHome,
  FaUsers,
  FaFileAlt,
  FaMoneyCheckAlt,
  FaDatabase,
  FaChartBar,
  FaMapMarkedAlt,
  FaClipboardList,
  FaBullhorn,
  FaChevronDown,
  FaChevronRight,
  FaChevronLeft,
  FaSyncAlt,
  FaClock, // ✅🆕 Vencimientos
} from "react-icons/fa";

import ThemeToggle from "./ThemeToggle";

const navItems = [
  // Core
  { to: "/", label: "Inicio", icon: FaHome },

  // Operación
  { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList },
  { to: "/clientes", label: "Clientes", icon: FaUsers },

  // Grupo
  { to: "/polizas", label: "Pólizas", icon: FaFileAlt },

  // Cobranza / gestión
  { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt },
  { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },

  // Comunicación
  { to: "/marketing", label: "Campañas", icon: FaBullhorn },

  // Análisis / admin
  { to: "/estadisticas", label: "Estadísticas", icon: FaChartBar },
  { to: "/balanzes", label: "Balanzes", icon: FaDatabase },

  // Extras
  { to: "/competencia", label: "Competencia", icon: FaChartBar },
  { to: "/geo", label: "Geo", icon: FaMapMarkedAlt },
];

const Badge = ({ value = 0, tone = "red" }) => {
  const v = Number(value) || 0;
  if (v <= 0) return null;

  const toneCls =
    tone === "amber"
      ? "bg-amber-500 text-black"
      : tone === "sky"
      ? "bg-sky-500 text-black"
      : "bg-red-500 text-white";

  return (
    <span
      className={`ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-extrabold shadow ${toneCls}`}
      title={`${v}`}
    >
      {v > 99 ? "99+" : v}
    </span>
  );
};

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,

  cuponPendientes = 0,
  cuponPorVencer7 = 0,
  cuponVencidas = 0,

  renovacionesPendientes = 0,
}) {
  const location = useLocation();

  const solTotal =
    (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const polizasActive = useMemo(() => {
    return (
      location.pathname === "/polizas" ||
      location.pathname.startsWith("/polizas/")
    );
  }, [location.pathname]);

  const [polizasOpen, setPolizasOpen] = useState(polizasActive);

  useEffect(() => {
    if (polizasActive) setPolizasOpen(true);
  }, [polizasActive]);

  const sidebarClass = isOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      {/* Overlay móvil */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-blue-900 dark:bg-gray-900 text-white z-50 transform transition-transform duration-300 ${sidebarClass}`}
      >
        <div className="p-4 border-b border-blue-800 dark:border-gray-800 flex items-center justify-between">
          <h1 className="text-lg font-bold">Thames Seguros</h1>

          {/* Botón cerrar (visible también en desktop) */}
          <button
            onClick={onClose}
            className="text-white bg-blue-800 dark:bg-gray-800 hover:bg-blue-700 dark:hover:bg-gray-700 px-2 py-2 rounded-md inline-flex items-center justify-center"
            title="Cerrar sidebar"
            aria-label="Cerrar sidebar"
          >
            <FaChevronLeft />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-80px)]">
          {navItems.map((item) => {
            // Grupo desplegable de Pólizas
            if (item.to === "/polizas") {
              return (
                <div key="polizas-group" className="space-y-1">
                  <div
                    className={`flex items-center gap-2 rounded-lg transition ${
                      polizasActive
                        ? "bg-blue-800 dark:bg-gray-800"
                        : "hover:bg-blue-800/60 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <NavLink
                      to="/polizas"
                      className="flex-1 flex items-center gap-3 px-4 py-2"
                    >
                      <item.icon className="text-lg" />
                      <span className="font-medium">Pólizas</span>
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => setPolizasOpen((v) => !v)}
                      className="px-3 py-2 text-white/80 hover:text-white"
                      title={polizasOpen ? "Cerrar" : "Abrir"}
                      aria-label={polizasOpen ? "Cerrar Pólizas" : "Abrir Pólizas"}
                    >
                      {polizasOpen ? <FaChevronDown /> : <FaChevronRight />}
                    </button>
                  </div>

                  {polizasOpen && (
                    <div className="ml-3 border-l border-white/10 pl-3 space-y-1">
                      <NavLink
                        to="/polizas"
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                            isActive
                              ? "bg-blue-800/70 dark:bg-gray-800/70"
                              : "text-white/90 hover:bg-blue-800/50 dark:hover:bg-gray-800/50"
                          }`
                        }
                      >
                        <FaFileAlt className="text-base" />
                        <span>Listado</span>
                      </NavLink>

                      {/* ✅🆕 Vencimientos */}
                      <NavLink
                        to="/polizas/vencimientos"
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                            isActive
                              ? "bg-blue-800/70 dark:bg-gray-800/70"
                              : "text-white/90 hover:bg-blue-800/50 dark:hover:bg-gray-800/50"
                          }`
                        }
                      >
                        <FaClock className="text-base" />
                        <span>Vencimientos</span>
                      </NavLink>

                      <NavLink
                        to="/polizas/renovaciones"
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                            isActive
                              ? "bg-blue-800/70 dark:bg-gray-800/70"
                              : "text-white/90 hover:bg-blue-800/50 dark:hover:bg-gray-800/50"
                          }`
                        }
                      >
                        <FaSyncAlt className="text-base" />
                        <span>Renovaciones</span>
                        <Badge value={renovacionesPendientes} tone="amber" />
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            }

            // Items normales
            const isCuponeras = item.to === "/cuponeras";
            const isSolicitudes = item.to === "/solicitudes";

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                    isActive
                      ? "bg-blue-800 dark:bg-gray-800"
                      : "hover:bg-blue-800/60 dark:hover:bg-gray-800/60"
                  }`
                }
              >
                <item.icon className="text-lg" />
                <span className="font-medium">{item.label}</span>

                {isSolicitudes && <Badge value={solTotal} tone="red" />}

                {isCuponeras && (
                  <Badge
                    value={
                      (Number(cuponPendientes) || 0) +
                      (Number(cuponPorVencer7) || 0) +
                      (Number(cuponVencidas) || 0)
                    }
                    tone="sky"
                  />
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 border-t border-blue-800 dark:border-gray-800">
            <ThemeToggle />
          </div>
        </nav>
      </aside>
    </>
  );
}
