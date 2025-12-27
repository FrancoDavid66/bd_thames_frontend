// src/components/layout/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaHome,
  FaUsers,
  FaFileAlt,
  FaMoneyCheckAlt,
  FaCarCrash,
  FaCog,
  FaMapMarkedAlt,
  FaBuilding,
  FaBalanceScale,
  FaExclamationTriangle,
  FaTruck,
  FaClipboardList,
  FaTimes,
  FaTicketAlt,
  FaChartBar,
  FaChartPie,
  FaBullhorn, // 🆕 Campañas
} from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";
import logo_thames from "../../assets/logos/logo_thames.svg";

// Bloqueadas por ahora
const DISABLED_PATHS = [
  "/propiedades",
  "/alquileres",
  "/siniestros",
  "/gruas",
];

const navItems = [
  { to: "/", label: "Inicio", icon: <FaHome /> },
  { to: "/solicitudes", label: "Solicitudes", icon: <FaClipboardList /> },
  { to: "/clientes", label: "Clientes", icon: <FaUsers /> },

  // 🆕 Marketing / Campañas
  { to: "/marketing", label: "Campañas", icon: <FaBullhorn /> },

  { to: "/competencia", label: "Competencia", icon: <FaChartBar /> },
  { to: "/polizas", label: "Pólizas", icon: <FaFileAlt /> },
  { to: "/pagos", label: "Pagos", icon: <FaMoneyCheckAlt /> },
  { to: "/estadisticas", label: "Estadísticas", icon: <FaChartPie /> },
  { to: "/cuponeras", label: "Cuponeras", icon: <FaTicketAlt /> },
  { to: "/balanzes", label: "Balanzes", icon: <FaBalanceScale /> },
  { to: "/siniestros", label: "Siniestros", icon: <FaCarCrash /> },
  { to: "/gruas", label: "Grúas", icon: <FaTruck /> },
  { to: "/geo", label: "Geo", icon: <FaMapMarkedAlt /> },
  { to: "/propiedades", label: "Propiedades", icon: <FaBuilding /> },
  { to: "/alquileres", label: "Alquileres", icon: <FaBuilding /> },
];

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponPendientes = 0,
  cuponPorVencer7 = 0,
  cuponVencidas = 0,
}) {
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: "-100%" },
  };

  const solTotal = (solPendienteAlta || 0) + (solPendienteEnvio || 0);
  const cuponAlertTotal = (cuponPorVencer7 || 0) + (cuponVencidas || 0);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1px] lg:hidden z-40"
          aria-hidden="true"
        />
      )}

      <motion.aside
        className="w-72 lg:w-64 h-screen bg-blue-800 dark:bg-gray-900 text-white fixed left-0 top-0 z-50 shadow-lg flex flex-col justify-between"
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        initial={false}
        transition={{ duration: 0.28 }}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        <div className="relative">
          <div className="flex items-center justify-center py-4 border-b border-blue-700 dark:border-gray-800">
            <img src={logo_thames} alt="Thames" className="h-8 w-auto" />
          </div>

          <button
            onClick={onClose}
            className="lg:hidden absolute right-3 top-3 p-2 rounded-full bg-blue-700/70 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label="Cerrar menú"
            title="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isDisabled = DISABLED_PATHS.includes(item.to);

            const showSolBadge = item.to === "/solicitudes" && solTotal > 0;
            const solTitle = showSolBadge
              ? `Pendientes: ${solTotal} (Alta: ${solPendienteAlta} · Envío: ${solPendienteEnvio})`
              : undefined;

            const showCuponBadge = item.to === "/cuponeras" && cuponAlertTotal > 0;
            const cuponTitle = showCuponBadge
              ? `Cuponeras en alerta: ${cuponAlertTotal} (Por vencer ≤7 días: ${cuponPorVencer7} · Vencidas: ${cuponVencidas})`
              : undefined;

            const itemTitle =
              item.to === "/solicitudes"
                ? solTitle
                : item.to === "/cuponeras"
                ? cuponTitle
                : undefined;

            return isDisabled ? (
              <div
                key={item.to}
                className="flex items-center gap-3 px-4 py-2 rounded text-gray-500 opacity-60 cursor-not-allowed select-none bg-blue-900/30"
                aria-disabled="true"
                title="En desarrollo"
              >
                {item.icon}
                <span>{item.label}</span>
                <FaExclamationTriangle className="ml-auto text-yellow-400" />
                <span className="ml-1 text-xs italic text-gray-400">
                  (En desarrollo)
                </span>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                title={itemTitle}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded transition-colors duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold border-l-4 border-yellow-400"
                      : "text-gray-300 hover:bg-blue-500 hover:text-white"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>

                {showSolBadge && (
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    aria-label={`${solTotal} notificaciones en Solicitudes`}
                    className="ml-auto inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-yellow-400 text-gray-900 text-xs font-extrabold ring-1 ring-yellow-200"
                  >
                    {solTotal}
                  </motion.span>
                )}

                {showCuponBadge && (
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    aria-label={`${cuponAlertTotal} cuponeras en alerta`}
                    className="ml-auto inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-rose-400 text-gray-900 text-xs font-extrabold ring-1 ring-rose-200"
                  >
                    {cuponAlertTotal}
                  </motion.span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-700 dark:border-gray-800 space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-300 font-semibold">
            <FaCog />
            <span>Configuración</span>
          </div>
          <div className="pl-2">
            <ThemeToggle small />
          </div>
        </div>
      </motion.aside>
    </>
  );
}
