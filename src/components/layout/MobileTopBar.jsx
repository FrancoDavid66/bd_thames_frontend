import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaUsers,
  FaFileAlt,
  FaMoneyCheckAlt,
  FaDatabase, // icono para Balanzes
} from "react-icons/fa";

const tabs = [
  { to: "/", label: "Inicio", icon: FaHome },
  { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList },
  { to: "/clientes", label: "Clientes", icon: FaUsers },
  { to: "/balanzes", label: "Balanzes", icon: FaDatabase }, // ← cambiado
  { to: "/polizas", label: "Pólizas", icon: FaFileAlt },
  { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },
];

export default function MobileTopBar() {
  // Altura visual estimada (icono + label + paddings)
  const MOBILE_NAV_H = 68; // px

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
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `group flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? "text-yellow-300" : "text-gray-300 hover:text-white"
                }`
              }
            >
              <span
                className="inline-flex items-center justify-center h-6 w-6 rounded-md"
                aria-hidden="true"
              >
                <Icon />
              </span>
              <span className="leading-none">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
