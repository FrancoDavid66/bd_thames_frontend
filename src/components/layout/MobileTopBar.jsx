// src/components/layout/MobileTopBar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FaHome, FaClipboardList, FaUsers, FaFileAlt, FaMoneyCheckAlt,
  FaEllipsisH, FaChartPie,
  FaDatabase, FaSyncAlt, FaTimes, FaBan, FaCashRegister,
  FaFileInvoiceDollar, FaCarCrash, FaShieldAlt,
  FaReceipt,
  FaClipboardCheck,
  FaCamera,
  FaStar,
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";

const Badge = ({ value = 0 }) => {
  const v = Number(value) || 0;
  if (v <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-duo-rojo px-1 text-[10px] font-black text-white">
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
      { to: "/solicitudes", label: "Altas", icon: FaClipboardList },
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
        tone: "azul",
        items: [
          { to: "/tareas", label: "Tareas del día", icon: FaClipboardCheck },
          { to: "/control-diario", label: "Control diario", icon: FaCamera },
          { to: "/ranking", label: "Ranking", icon: FaStar },
          { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt, badge: cuponVencidas },
          { to: "/polizas/renovaciones", label: "Renovaciones", icon: FaSyncAlt, badge: renovacionesPendientes },
          { to: "/polizas/bajas", label: "Bajas", icon: FaBan, badge: bajasPendientes },
          { to: "/siniestros", label: "Siniestros", icon: FaCarCrash },
        ]
      },
      {
        title: "Finanzas",
        tone: "verde",
        items: finanzasItems,
      },
      ...(isWebAdmin ? [{
        title: "Gerencia & Admin",
        tone: "violeta",
        items: [
          { to: "/cotizaciones", label: "Cotizador", icon: FaFileInvoiceDollar },
          { to: "/estadisticas", label: "Estadísticas", icon: FaChartPie },
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

  // Clases del recuadro del ícono según el tono del tramo
  const toneBox = {
    azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
    verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
    violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
  };
  const toneTitle = {
    azul: "text-duo-azul",
    verde: "text-duo-verde-sombra dark:text-duo-verde",
    violeta: "text-duo-violeta",
  };

  return (
    <>
      <AnimatePresence>
        {moreOpen && !isVendedor && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            onClick={() => setMoreOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <motion.div
              className="absolute left-3 right-3 rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3 shadow-2xl"
              style={{ bottom: sheetBottom }}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 14, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-black text-titulo dark:text-titulo-dark">Menú Completo</div>
                <button
                  className="cursor-pointer rounded-xl border-2 border-linea dark:border-linea-dark px-3 py-2 text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
                  onClick={() => setMoreOpen(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto pb-2">
                {menuSections.map((section, idx) => (
                  <div key={idx} className="mb-3">
                    <div className={`mb-1.5 px-1 text-[10px] font-black uppercase tracking-widest ${toneTitle[section.tone]}`}>
                      {section.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {section.items.map(({ to, label, icon: Icon, badge }) => (
                        <button
                          key={to}
                          onClick={() => { setMoreOpen(false); navigate(to); }}
                          className="relative flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2.5 py-3 text-left text-xs font-bold text-titulo dark:text-titulo-dark transition hover:border-oficina active:scale-[0.99]"
                        >
                          <span className={`relative inline-flex h-7 w-7 items-center justify-center rounded-lg ${toneBox[section.tone]}`}>
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

      {/* Barra fija inferior (Duo) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark lg:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: `calc(${MOBILE_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="flex h-full items-center justify-around px-1">
          {primaryTabs.map(({ to, label, icon: Icon, badge }) => {
            const active = isPrimaryActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition ${
                  active ? "text-duo-azul" : "text-suave dark:text-suave-dark"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && <Badge value={badge} />}
                </div>
                <span className="text-[10px] font-black leading-tight">{label}</span>
              </NavLink>
            );
          })}

          {!isVendedor && (
            <button
              onClick={() => setMoreOpen(true)}
              className={`relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition ${
                moreOpen ? "text-duo-azul" : "text-suave dark:text-suave-dark"
              }`}
            >
              <div className="relative">
                <FaEllipsisH className="h-5 w-5" />
                {moreBadgeTotal > 0 && <Badge value={moreBadgeTotal} />}
              </div>
              <span className="text-[10px] font-black leading-tight">Más</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
