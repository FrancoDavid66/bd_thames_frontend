// src/components/layout/Navbar.jsx
import { useState } from "react";
import { HiMenu, HiX, HiLogout, HiUserCircle, HiCurrencyDollar } from "react-icons/hi";
import { Link } from "react-router-dom"; 
import { useAuth } from "../../context/AuthContext"; 

export default function Navbar({
  sidebarOpen,
  toggleSidebar,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
}) {
  const { user, logout } = useAuth(); 
  const isVendedor = user?.perfil?.rol === 'VENDEDOR'; // 🚀 NUEVO

  return (
    <header
      role="banner"
      className={`
        fixed inset-x-0 z-40
        bg-blue-800/95 dark:bg-gray-900/95
        border-b border-blue-700 dark:border-gray-800
        backdrop-blur text-white
        h-14 flex items-center
        overflow-x-hidden
        transition-all duration-300
        ${sidebarOpen ? "lg:pl-64" : ""}
      `}
      style={{ top: 0, paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="w-full min-w-0 flex items-center justify-between gap-3 px-3 sm:px-4 h-14">
        <button
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center h-10 w-10 shrink-0 rounded-md hover:bg-blue-700/60 focus:outline-none cursor-pointer"
        >
          {sidebarOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
        </button>

        <div className="flex-1 min-w-0 text-center select-none">
          <h1 className="text-sm sm:text-base font-semibold tracking-wide truncate">
            THAMES APP 2.0
          </h1>
        </div>

        <div className="relative flex items-center gap-3 shrink-0">
          
          {/* 💸 ACCESO RÁPIDO A CAJA / RECAUDACIÓN (Solo si NO es vendedor) */}
          {!isVendedor && (
            <Link
              to="/recaudacion"
              title="Ir a Caja y Recaudación"
              className="flex items-center justify-center cursor-pointer h-9 px-3 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/30 gap-1.5"
            >
              <HiCurrencyDollar className="text-lg" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest mt-0.5">Caja</span>
            </Link>
          )}

          <div className="hidden sm:flex flex-col items-end mr-1 border-l border-white/10 pl-3">
            <span className="text-[11px] font-bold uppercase tracking-tighter text-yellow-400">
              {user?.perfil?.rol === 'ADMIN' ? 'Administrador' : 
               user?.perfil?.rol === 'VENDEDOR' ? 'Vendedor Externo' : 
               (user?.perfil?.oficina_nombre || 'Oficina')}
            </span>
            <span className="text-[10px] opacity-80 truncate max-w-[100px]">
              {user?.username}
            </span>
          </div>
          
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="flex items-center justify-center cursor-pointer h-9 w-9 rounded-full bg-white/10 hover:bg-red-500/80 transition-colors border border-white/10 ml-1"
          >
            <HiLogout className="text-lg" />
          </button>
        </div>
      </div>
    </header>
  );
}