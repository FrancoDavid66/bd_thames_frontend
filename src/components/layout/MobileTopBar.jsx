// src/components/layout/MobileTopBar.jsx
import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaUsers,
  FaFileAlt,
  FaMoneyCheckAlt,
  FaDatabase, // icono para Balanzes
  FaMapMarkedAlt, // icono para Geo
  FaChartBar, // icono para Competencia
} from "react-icons/fa";

const tabs = [
  { to: "/", label: "Inicio", icon: FaHome },
  { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList },
  { to: "/clientes", label: "Clientes", icon: FaUsers },
  { to: "/geo", label: "Geo", icon: FaMapMarkedAlt },
  { to: "/competencia", label: "Competencia", icon: FaChartBar },
  { to: "/balanzes", label: "Balanzes", icon: FaDatabase },
  { to: "/polizas", label: "Pólizas", icon: FaFileAlt },
  { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },
];

export default function MobileTopBar({
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
}) {
  // Altura visual estimada (icono + label + paddings)
  const MOBILE_NAV_H = 68; // px

  const solTotal = (solPendienteAlta || 0) + (solPendienteEnvio || 0);

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-blue-800/95 dark:bg-gray-900/95 border-t border-blue-700 dark:border-gray-800 backdrop-blur"
      role="navigation"
      aria-label="Tabs principales"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
        minHeight: `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <ul className="flex">
        {tabs.map(({ to, label, icon: Icon }) => {
          const isSolicitudes = label === "Solicitudes";
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `group relative flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "text-yellow-300"
                      : "text-gray-300 hover:text-white"
                  }`
                }
              >
                <span
                  className={`inline-flex items-center justify-center h-6 w-6 rounded-md ${
                    isSolicitudes && solTotal > 0 ? "relative" : ""
                  }`}
                  aria-hidden="true"
                >
                  <Icon />

                  {/* Badge de notificaciones SOLO en Solicitudes */}
                  {isSolicitudes && solTotal > 0 && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white shadow-lg">
                      {solTotal > 9 ? "9+" : solTotal}
                    </span>
                  )}
                </span>
                <span className="leading-none">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
