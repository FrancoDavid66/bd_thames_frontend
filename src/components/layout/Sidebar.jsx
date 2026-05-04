// src/components/layout/Sidebar.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaHome, FaUsers, FaFileAlt, FaMoneyCheckAlt, FaDatabase,
  FaChartBar, FaMapMarkedAlt, FaClipboardList, FaBullhorn,
  FaChevronDown, FaChevronRight, FaChevronLeft, FaSyncAlt,
  FaClock, FaBan, FaTruckMoving, FaCashRegister, FaFileInvoiceDollar,
  FaShieldAlt, FaCarCrash
} from "react-icons/fa";

import ThemeToggle from "./ThemeToggle";

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponVencidas = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
}) {
  const { user } = useAuth(); 
  const location = useLocation();
  const isAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const isVendedor = user?.perfil?.rol === 'VENDEDOR'; // 🚀 NUEVO: Detectamos al Vendedor

  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  // 🚀 ESTRUCTURA AGRUPADA DEL MENÚ DINÁMICA
  const menuGroups = useMemo(() => {
    // 🛡️ VISTA RESTRINGIDA PARA EL VENDEDOR
    if (isVendedor) {
      return [
        {
          title: "Mi Panel",
          items: [
            { to: "/", label: "Inicio", icon: FaHome },
            { to: "/polizas", label: "Mis Asegurados", icon: FaUsers },
            { to: "/comisiones", label: "Mis Comisiones", icon: FaMoneyCheckAlt },
          ]
        }
      ];
    }

    // 🛡️ VISTA COMPLETA PARA OFICINAS Y ADMIN
    return [
      {
        title: "Principal",
        items: [
          { to: "/", label: "Inicio", icon: FaHome },
          { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList, badge: solTotal },
          { to: "/clientes", label: "Clientes", icon: FaUsers },
          { to: "/siniestros", label: "Siniestros", icon: FaCarCrash },
          // 🚀 CAMBIO: Pagos sube al menú principal
          { to: "/pagos", label: "Gestión de Pagos", icon: FaMoneyCheckAlt }, 
        ]
      },
      {
        title: "Gestión de Pólizas",
        id: "polizas",
        icon: FaFileAlt,
        items: [
          { to: "/polizas", label: "Listado de Pólizas", icon: FaFileAlt },
          { to: "/vencimientos", label: "Vencimientos", icon: FaClock },
          { to: "/polizas/renovaciones", label: "Renovaciones", icon: FaSyncAlt, badge: renovacionesPendientes, tone: "amber" },
          { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt, badge: cuponVencidas },
          { to: "/polizas/bajas", label: "Bajas", icon: FaBan, badge: bajasPendientes },
        ]
      },
      {
        title: "Finanzas",
        id: "finanzas",
        icon: FaCashRegister, // Actualizado icono para reflejar que es caja interna
        items: [
          // 🚀 CAMBIO: Se eliminó pagos de aquí. Quedan opciones de caja chica.
          { to: "/recaudacion", label: "Caja y Recaudación", icon: FaCashRegister },
          { to: "/balanzes", label: "Balances", icon: FaDatabase },
        ]
      },
      // 🛡️ GRUPO SOLO PARA ADMINS
      ...(isAdmin ? [{
        title: "Gerencia & Admin",
        id: "admin",
        icon: FaShieldAlt,
        items: [
          { to: "/gruas", label: "Servicio de Grúas", icon: FaTruckMoving },
          { to: "/cotizaciones", label: "Cotizador", icon: FaFileInvoiceDollar },
          { to: "/marketing", label: "Campañas", icon: FaBullhorn },
          { to: "/estadisticas", label: "Estadísticas", icon: FaChartBar },
          { to: "/competencia", label: "Competencia", icon: FaChartBar },
          { to: "/geo", label: "Mapa Geo", icon: FaMapMarkedAlt },
          { to: "/admin", label: "Configuración", icon: FaShieldAlt },
        ]
      }] : [])
    ];
  }, [isAdmin, isVendedor, solTotal, renovacionesPendientes, cuponVencidas, bajasPendientes]);

  const [openAccordions, setOpenAccordions] = useState({
    polizas: ['/polizas', '/vencimientos', '/cuponeras'].some(p => location.pathname.startsWith(p)),
    // 🚀 CAMBIO: Pagos ya no dispara la apertura del acordeón de finanzas
    finanzas: ['/recaudacion', '/balanzes'].some(p => location.pathname.startsWith(p)),
    admin: ['/gruas', '/cotizaciones', '/marketing', '/estadisticas', '/competencia', '/geo', '/admin'].some(p => location.pathname.startsWith(p)),
  });

  const toggleAccordion = (id) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-[100dvh] w-[85vw] sm:w-64 bg-blue-900 dark:bg-gray-900 text-white transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-[110%]"}`}
      >
        <div className="p-4 border-b border-blue-800 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Thames Seguros</h1>
            <p className="text-[10px] text-yellow-400 font-bold truncate uppercase tracking-widest">
                {isVendedor ? 'Recomendador' : (user?.perfil?.oficina_nombre || 'Sucursal')}
            </p>
          </div>
          <button onClick={onClose} className="text-white bg-blue-800 dark:bg-gray-800 px-2 py-2 rounded-md cursor-pointer">
            <FaChevronLeft />
          </button>
        </div>

        <nav className="p-3 space-y-4 overflow-y-auto h-[calc(100%-110px)] custom-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!group.id ? (
                <>
                  <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-blue-400/80 dark:text-gray-500 mt-2">
                    {group.title}
                  </div>
                  {group.items.map(item => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition ${isActive ? "bg-blue-800 dark:bg-gray-800 text-emerald-400 font-bold" : "hover:bg-blue-800/60 font-medium"}`}>
                      <item.icon className="text-lg shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <Badge value={item.badge} tone={item.tone} />
                    </NavLink>
                  ))}
                </>
              ) : (
                <div className="mt-2">
                  <button onClick={() => toggleAccordion(group.id)} className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition ${openAccordions[group.id] ? "bg-blue-800/40 dark:bg-gray-800/50" : "hover:bg-blue-800/60"}`}>
                    <div className="flex items-center gap-3 font-bold text-slate-200">
                      <group.icon className="text-lg shrink-0 text-blue-400" />
                      <span className="truncate">{group.title}</span>
                    </div>
                    <span className="text-white/60 text-xs">
                      {openAccordions[group.id] ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                  </button>
                  
                  {openAccordions[group.id] && (
                    <div className="ml-4 border-l border-white/10 pl-2 mt-1 space-y-0.5">
                      {group.items.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.to === "/polizas"} className={({ isActive }) => `flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-blue-800/80 dark:bg-gray-800 text-emerald-400 font-bold" : "hover:bg-blue-800/50 text-slate-300 font-medium"}`}>
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="truncate">{item.label}</span>
                          </div>
                          <Badge value={item.badge} tone={item.tone} />
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="pt-4 mt-4 border-t border-blue-800 dark:border-gray-800 px-3">
            <ThemeToggle />
          </div>
        </nav>
      </aside>
    </>
  );
}

const Badge = ({ value = 0, tone = "red" }) => {
    const v = Number(value) || 0;
    if (v <= 0) return null;
    const toneCls = tone === "amber" ? "bg-amber-500 text-black" : "bg-red-500 text-white";
    return <span className={`shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold ${toneCls}`}>{v}</span>;
};