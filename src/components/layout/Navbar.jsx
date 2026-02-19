// src/components/layout/Navbar.jsx
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import logo_thames from "../../assets/logos/logo_thames.svg";

/**
 * Navbar fijo arriba, con hamburguesa para abrir/cerrar el sidebar en mobile.
 * En desktop agrega padding-left cuando el sidebar está abierto para que no se solape.
 *
 * Props:
 *  - sidebarOpen (bool)
 *  - toggleSidebar (fn)
 *  - solPendienteAlta (number) [por ahora no usado]
 *  - solPendienteEnvio (number) [por ahora no usado]
 */
export default function Navbar({
  sidebarOpen,
  toggleSidebar,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
}) {
  const [openNotif, setOpenNotif] = useState(false); // por si después querés volver a usar notificaciones
  const solTotal = (solPendienteAlta || 0) + (solPendienteEnvio || 0);

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
        ${sidebarOpen ? "lg:pl-64" : ""}
      `}
      /* ✅ Safe-area: NO usamos top: env(...) porque mueve el header y te “come” espacio.
         Mejor: el header queda en top:0 y sumamos paddingTop interno solo para safe-area. */
      style={{ top: 0, paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* ✅ Este wrapper mantiene altura correcta: 56px + safe-area sin romper layout */}
      <div className="w-full min-w-0 flex items-center justify-between gap-3 px-3 sm:px-4 h-14">
        {/* Botón hamburguesa (siempre visible) */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          className="inline-flex items-center justify-center h-10 w-10 shrink-0 rounded-md hover:bg-blue-700/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {sidebarOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
        </button>

        {/* Título o branding */}
        <div className="flex-1 min-w-0 text-center select-none">
          <h1 className="text-sm sm:text-base font-semibold tracking-wide truncate">
            THAMES APP 2.0
          </h1>
        </div>

        {/* Lado derecho vacío (dejado por si en el futuro agregamos usuario, etc.) */}
        <div className="relative flex items-center gap-2 shrink-0">{/* vacío */}</div>
      </div>
    </header>
  );
}
