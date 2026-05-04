// src/components/layout/MobileTopBar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaHome, FaClipboardList, FaUsers, FaFileAlt, FaMoneyCheckAlt,
  FaEllipsisH, FaBullhorn, FaMapMarkedAlt, FaChartBar, FaChartPie,
  FaDatabase, FaSyncAlt, FaTimes, FaBan, FaCashRegister, FaClock,
  FaFileInvoiceDollar, FaCarCrash, FaTruckMoving, FaShieldAlt
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";

const Badge = ({ value = 0 }) => {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white shadow-lg">
      {v}
    </span>
  );
};

export default function MobileTopBar({
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
  cuponVencidas = 0, 
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const MOBILE_NAV_H = 68;
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const isVendedor = user?.perfil?.rol === 'VENDEDOR'; // 🚀 NUEVO

  // 🌟 Pestañas de Abajo (Las más usadas cambian según el rol)
  const primaryTabs = useMemo(() => {
    if (isVendedor) {
      return [
        { to: "/", label: "Inicio", icon: FaHome },
        { to: "/polizas", label: "Asegurados", icon: FaUsers },
        { to: "/comisiones", label: "Comisiones", icon: FaMoneyCheckAlt },
      ];
    }
    return [
      { to: "/", label: "Inicio", icon: FaHome },
      { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList, badge: solTotal },
      { to: "/clientes", label: "Clientes", icon: FaUsers },
      { to: "/polizas", label: "Pólizas", icon: FaFileAlt },
      { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },
    ];
  }, [solTotal, isVendedor]);

  // 🚀 Tramos del Menú "MÁS" organizados por Secciones (El vendedor no tiene menú MÁS)
  const menuSections = useMemo(() => {
    if (isVendedor) return []; // El vendedor no tiene secciones extras.

    return [
      {
        title: "Gestión de Pólizas",
        color: "text-blue-300",
        items: [
          { to: "/vencimientos", label: "Vencimientos", icon: FaClock },
          { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt, badge: cuponVencidas },
          { to: "/polizas/renovaciones", label: "Renovaciones", icon: FaSyncAlt, badge: renovacionesPendientes },
          { to: "/polizas/bajas", label: "Bajas", icon: FaBan, badge: bajasPendientes },
          { to: "/siniestros", label: "Siniestros", icon: FaCarCrash },
        ]
      },
      {
        title: "Finanzas",
        color: "text-emerald-300",
        items: [
          { to: "/recaudacion", label: "Caja Local", icon: FaCashRegister },
          { to: "/balanzes", label: "Balances", icon: FaDatabase },
        ]
      },
      ...(isWebAdmin ? [{
        title: "Gerencia & Admin",
        color: "text-purple-300",
        items: [
          { to: "/gruas", label: "Grúas", icon: FaTruckMoving },
          { to: "/cotizaciones", label: "Cotizador", icon: FaFileInvoiceDollar },
          { to: "/marketing", label: "Campañas", icon: FaBullhorn },
          { to: "/estadisticas", label: "Estadísticas", icon: FaChartPie },
          { to: "/competencia", label: "Competencia", icon: FaChartBar },
          { to: "/geo", label: "Mapa Geo", icon: FaMapMarkedAlt },
          { to: "/admin", label: "Configuración", icon: FaShieldAlt },
        ]
      }] : [])
    ];
  }, [isWebAdmin, isVendedor, cuponVencidas, renovacionesPendientes, bajasPendientes]);

  const isPrimaryActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  const sheetBottom = `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px) + 10px)`;

  return (
    <>
      <AnimatePresence>
        {moreOpen && !isVendedor && (
          <motion.div
            className="lg:hidden fixed inset-0 z-[60] bg-black/60"
            onClick={() => setMoreOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className="absolute left-3 right-3 rounded-2xl border border-blue-700/40 dark:border-gray-800 bg-blue-900/95 dark:bg-gray-900/95 backdrop-blur p-3 shadow-2xl"
              style={{ bottom: sheetBottom }}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 18, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.985 }}
              transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.9 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-extrabold text-white">Menú Completo</div>
                <button
                  className="rounded-xl border border-white/10 px-3 py-2 text-white/90 hover:bg-white/10 cursor-pointer"
                  onClick={() => setMoreOpen(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto custom-scrollbar pb-2">
                {menuSections.map((section, idx) => (
                  <div key={idx} className="mb-3">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${section.color} mb-1.5 px-1`}>
                      {section.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {section.items.map(({ to, label, icon: Icon, badge }) => (
                        <button
                          key={to}
                          onClick={() => { setMoreOpen(false); navigate(to); }}
                          className="cursor-pointer relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-3 text-left text-xs font-semibold text-white hover:bg-white/10 active:scale-[0.99] transition"
                        >
                          <span className={`relative inline-flex items-center justify-center h-7 w-7 rounded-lg ${section.title === 'Finanzas' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10'}`}>
                            <Icon />
                            <Badge value={badge} />
                          </span>
                          <span className="min-w-0 truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-blue-800/95 dark:bg-gray-900/95 border-t border-blue-700 dark:border-gray-800 backdrop-blur"
        style={{ height: `${MOBILE_NAV_H}px`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <ul className="flex h-full">
          {primaryTabs.map(({ to, label, icon: Icon, badge }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={() => `group relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${isPrimaryActive(to) ? "text-yellow-300" : "text-gray-300 hover:text-white"}`}
              >
                <span className="relative inline-flex items-center justify-center h-6 w-6 rounded-md">
                  <Icon />
                  <Badge value={badge} />
                </span>
                <span className="leading-none">{label}</span>
              </NavLink>
            </li>
          ))}
          
          {/* Si es vendedor, no renderizamos el botón Más porque no hay menú extra */}
          {!isVendedor && (
            <li className="flex-1">
              <button
                onClick={() => setMoreOpen(true)}
                className="cursor-pointer group relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-gray-300 hover:text-white"
              >
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md">
                  <FaEllipsisH />
                </span>
                <span className="leading-none">Más</span>
              </button>
            </li>
          )}
        </ul>
      </motion.nav>
    </>
  );
}