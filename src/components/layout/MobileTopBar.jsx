// src/components/layout/MobileTopBar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaUsers,
  FaFileAlt,
  FaMoneyCheckAlt,
  FaEllipsisH,
  FaBullhorn,
  FaMapMarkedAlt,
  FaChartBar,
  FaChartPie,
  FaDatabase,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";

const Badge = ({ value = 0 }) => {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white shadow-lg">
      {v > 9 ? "9+" : v}
    </span>
  );
};

export default function MobileTopBar({
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  renovacionesPendientes = 0,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const MOBILE_NAV_H = 68; // px
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const primaryTabs = useMemo(
    () => [
      { to: "/", label: "Inicio", icon: FaHome },
      { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList, badge: solTotal },
      { to: "/clientes", label: "Clientes", icon: FaUsers },
      { to: "/polizas", label: "Pólizas", icon: FaFileAlt, badge: renovacionesPendientes },
      { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },
    ],
    [solTotal, renovacionesPendientes]
  );

  const moreItems = useMemo(
    () => [
      { to: "/polizas/renovaciones", label: "Renovaciones", icon: FaSyncAlt, badge: renovacionesPendientes },
      { to: "/marketing", label: "Campañas", icon: FaBullhorn },
      { to: "/geo", label: "Geo", icon: FaMapMarkedAlt },
      { to: "/competencia", label: "Competencia", icon: FaChartBar },
      { to: "/estadisticas", label: "Estadísticas", icon: FaChartPie },
      { to: "/balanzes", label: "Balanzes", icon: FaDatabase },
    ],
    [renovacionesPendientes]
  );

  const isPrimaryActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <>
      {/* Menú "Más" */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/60"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-[76px] left-3 right-3 rounded-2xl border border-blue-700/40 dark:border-gray-800 bg-blue-900/95 dark:bg-gray-900/95 backdrop-blur p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-extrabold text-white">Más opciones</div>
              <button
                className="rounded-xl border border-white/10 px-3 py-2 text-white/90"
                onClick={() => setMoreOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {moreItems.map(({ to, label, icon: Icon, badge }) => (
                <button
                  key={to}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(to);
                  }}
                  className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm font-semibold text-white hover:bg-white/10"
                >
                  <span className="relative inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white/10">
                    <Icon />
                    <Badge value={badge} />
                  </span>
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
          {primaryTabs.map(({ to, label, icon: Icon, badge }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={() =>
                  `group relative flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                    isPrimaryActive(to) ? "text-yellow-300" : "text-gray-300 hover:text-white"
                  }`
                }
              >
                <span className="relative inline-flex items-center justify-center h-6 w-6 rounded-md">
                  <Icon />
                  <Badge value={badge} />
                </span>
                <span className="leading-none">{label}</span>
              </NavLink>
            </li>
          ))}

          {/* Más */}
          <li className="flex-1">
            <button
              onClick={() => setMoreOpen(true)}
              className="group relative flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-gray-300 hover:text-white"
            >
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md">
                <FaEllipsisH />
              </span>
              <span className="leading-none">Más</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
