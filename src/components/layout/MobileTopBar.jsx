// src/components/layout/MobileTopBar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaHome, FaClipboardList, FaUsers, FaFileAlt, FaMoneyCheckAlt,
  FaEllipsisH, FaBullhorn, FaMapMarkedAlt, FaChartBar, FaChartPie,
  FaDatabase, FaSyncAlt, FaTimes, FaBan, FaCashRegister, FaClock,
  FaFileInvoiceDollar, FaCarCrash, FaTruckMoving, FaShieldAlt,
  FaReceipt, // 🚀 NUEVO ÍCONO PARA SERVICIOS FIJOS
  FaClipboardCheck, // 🆕 ÍCONO PARA TAREAS DEL DÍA
  FaCamera, // 🆕 ÍCONO PARA CONTROL DIARIO
  FaStar,   // 🆕 ÍCONO PARA RANKING
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
  // 🚀 NUEVO
  serviciosAlertas = 0,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const MOBILE_NAV_H = 68;
  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const isVendedor = user?.perfil?.rol === 'VENDEDOR';

  // 🌟 Pestañas de Abajo
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

  // 🚀 Tramos del Menú "MÁS"
  const menuSections = useMemo(() => {
    if (isVendedor) return [];

    // 🚀 Items de Finanzas (con servicios fijos solo para admin)
    const finanzasItems = [
      { to: "/recaudacion", label: "Caja Local", icon: FaCashRegister },
      { to: "/balanzes", label: "Balances", icon: FaDatabase },
    ];

    if (isWebAdmin) {
      finanzasItems.push({
        to: "/servicios",
        label: "Servicios Fijos",
        icon: FaReceipt,
        badge: serviciosAlertas,
      });
    }

    return [
      {
        title: "Gestión de Pólizas",
        color: "text-blue-300",
        items: [
          { to: "/tareas", label: "Tareas del día", icon: FaClipboardCheck },
          { to: "/control-diario", label: "Control diario", icon: FaCamera },
          { to: "/ranking", label: "Ranking", icon: FaStar },
          { to: "/vencimientos", label: "Vencimientos", icon: FaClock },
          { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt, badge: cuponVencidas },
          { to: "/polizas/renovaciones", label: "Renovaciones", icon: FaSyncAlt, badge: renovacionesPendientes },
          { to: "/polizas/bajas", label: "Bajas", icon: FaBan, badge: bajasPendientes },
          { to: "/polizas/verificacion", label: "Verificación", icon: FaShieldAlt },
          { to: "/siniestros", label: "Siniestros", icon: FaCarCrash },
        ]
      },
      {
        title: "Finanzas",
        color: "text-emerald-300",
        items: finanzasItems,
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
  }, [isWebAdmin, isVendedor, cuponVencidas, renovacionesPendientes, bajasPendientes, serviciosAlertas]);

  const isPrimaryActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  const sheetBottom = `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px) + 10px)`;

  // 🚀 Calculamos el total de alertas para el botón "Más"
  const moreBadgeTotal = useMemo(() => {
    return menuSections.reduce((acc, section) => {
      return acc + section.items.reduce((sum, item) => sum + (Number(item.badge) || 0), 0);
    }, 0);
  }, [menuSections]);

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
                          <span className={`relative inline-flex items-center justify-center h-7 w-7 rounded-lg ${
                            section.title === 'Finanzas' ? 'bg-emerald-500/15 text-emerald-300' :
                            section.title === 'Gerencia & Admin' ? 'bg-purple-500/15 text-purple-300' :
                            'bg-blue-500/15 text-blue-300'
                          }`}>
                            <Icon className="h-3.5 w-3.5" />
                            {badge > 0 && <Badge value={badge} />}
                          </span>
                          <span className="truncate">{label}</span>
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

      {/* Barra fija inferior */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-slate-200 dark:border-gray-800 shadow-lg"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="flex items-center justify-around h-full px-1">
          {primaryTabs.map(({ to, label, icon: Icon, badge }) => {
            const active = isPrimaryActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={`relative flex flex-col items-center justify-center flex-1 h-full transition gap-0.5 ${
                  active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && <Badge value={badge} />}
                </div>
                <span className="text-[10px] font-semibold leading-tight">{label}</span>
              </NavLink>
            );
          })}

          {!isVendedor && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition gap-0.5 ${
                moreOpen ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <div className="relative">
                <FaEllipsisH className="h-5 w-5" />
                {moreBadgeTotal > 0 && <Badge value={moreBadgeTotal} />}
              </div>
              <span className="text-[10px] font-semibold leading-tight">Más</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}