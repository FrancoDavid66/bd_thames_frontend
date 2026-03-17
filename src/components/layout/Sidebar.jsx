// src/components/layout/Sidebar.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FaHome, FaUsers, FaFileAlt, FaMoneyCheckAlt, FaDatabase,
  FaChartBar, FaMapMarkedAlt, FaClipboardList, FaBullhorn,
  FaChevronDown, FaChevronRight, FaChevronLeft, FaSyncAlt,
  FaClock, FaBan, FaTruckMoving, 
} from "react-icons/fa";

import ThemeToggle from "./ThemeToggle";

export default function Sidebar({
  isOpen,
  onClose,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
  cuponPendientes = 0,
  cuponPorVencer7 = 0,
  cuponVencidas = 0,
  renovacionesPendientes = 0,
  bajasPendientes = 0,
}) {
  const { user } = useAuth(); 
  const location = useLocation();

  // 🚀 FILTRAR RUTAS SEGÚN ROL
  const filteredNavItems = useMemo(() => {
    const allItems = [
      { to: "/", label: "Inicio", icon: FaHome },
      { to: "/solicitudes", label: "Solicitudes", icon: FaClipboardList },
      { to: "/clientes", label: "Clientes", icon: FaUsers },
      { to: "/polizas", label: "Pólizas", icon: FaFileAlt },
      
      // 🚀 ¡CANDADO PUESTO! Solo Admin ve Grúas
      { to: "/gruas", label: "Grúas", icon: FaTruckMoving, adminOnly: true }, 
      
      { to: "/cuponeras", label: "Cuponeras", icon: FaFileAlt },
      { to: "/pagos", label: "Pagos", icon: FaMoneyCheckAlt },
      { to: "/balanzes", label: "Balanzes", icon: FaDatabase }, 
      
      // Solo Admin
      { to: "/marketing", label: "Campañas", icon: FaBullhorn, adminOnly: true },
      { to: "/estadisticas", label: "Estadísticas", icon: FaChartBar, adminOnly: true },
      { to: "/competencia", label: "Competencia", icon: FaChartBar, adminOnly: true },
      
      // 🚀 ¡CANDADO PUESTO! Solo Admin ve Geo
      { to: "/geo", label: "Geo", icon: FaMapMarkedAlt, adminOnly: true },
    ];

    if (user?.perfil?.rol === 'ADMIN') return allItems;
    // Si es oficina, quitamos los adminOnly
    return allItems.filter(item => !item.adminOnly);
  }, [user]);

  const solTotal = (Number(solPendienteAlta) || 0) + (Number(solPendienteEnvio) || 0);

  const polizasActive = useMemo(() => {
    return location.pathname === "/polizas" || location.pathname.startsWith("/polizas/");
  }, [location.pathname]);

  const [polizasOpen, setPolizasOpen] = useState(polizasActive);

  useEffect(() => {
    if (polizasActive) setPolizasOpen(true);
  }, [polizasActive]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-[100dvh] w-[85vw] sm:w-64 bg-blue-900 dark:bg-gray-900 text-white transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-[110%]"
        }`}
      >
        <div className="p-4 border-b border-blue-800 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Thames Seguros</h1>
            <p className="text-[10px] text-yellow-400 font-bold truncate uppercase tracking-widest">
                {user?.perfil?.oficina_nombre || 'Sucursal'}
            </p>
          </div>
          <button onClick={onClose} className="text-white bg-blue-800 dark:bg-gray-800 px-2 py-2 rounded-md">
            <FaChevronLeft />
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-110px)]">
          {filteredNavItems.map((item) => {
            if (item.to === "/polizas") {
              return (
                <div key="polizas-group" className="space-y-1">
                  <div className={`flex items-center gap-2 rounded-lg transition ${polizasActive ? "bg-blue-800 dark:bg-gray-800" : "hover:bg-blue-800/60"}`}>
                    <NavLink to="/polizas" className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2">
                      <item.icon className="text-lg shrink-0" />
                      <span className="font-medium truncate">Pólizas</span>
                    </NavLink>
                    <button onClick={() => setPolizasOpen(!polizasOpen)} className="px-3 py-2 text-white/80">
                      {polizasOpen ? <FaChevronDown /> : <FaChevronRight />}
                    </button>
                  </div>
                  {polizasOpen && (
                    <div className="ml-3 border-l border-white/10 pl-3 space-y-1">
                      <NavLink to="/polizas" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition hover:bg-blue-800/50">
                        <FaFileAlt className="text-base" /> Listado
                      </NavLink>
                      <NavLink to="/polizas/bajas" className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition hover:bg-blue-800/50">
                        <div className="flex items-center gap-3"><FaBan /> Bajas</div>
                        <Badge value={bajasPendientes} />
                      </NavLink>
                      <NavLink to="/polizas/renovaciones" className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition hover:bg-blue-800/50">
                        <div className="flex items-center gap-3"><FaSyncAlt /> Renovaciones</div>
                        <Badge value={renovacionesPendientes} tone="amber" />
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg transition ${isActive ? "bg-blue-800 dark:bg-gray-800" : "hover:bg-blue-800/60"}`
                }
              >
                <item.icon className="text-lg shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
                {item.to === "/solicitudes" && <Badge value={solTotal} />}
                {item.to === "/cuponeras" && <Badge value={cuponVencidas} />}
              </NavLink>
            );
          })}

          <div className="pt-4 mt-2 border-t border-blue-800 dark:border-gray-800">
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
    return <span className={`ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold ${toneCls}`}>{v}</span>;
};