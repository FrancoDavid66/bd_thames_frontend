// src/components/layout/Header.jsx
import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import { FaPowerOff } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion"; // 🚀 Importamos animación

export default function Header({ sidebarOpen, toggleSidebar }) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false); // 🚀 Estado para controlar la salida

  const isAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const nombreOficina = isAdmin ? 'Administrador' : (user?.perfil?.oficina_nombre || 'Oficina');
  const avatarLetter = nombreOficina.charAt(0).toUpperCase();

  // 🚀 Función de deslogueo con demora épica
  const handleLogoutSequence = () => {
    setIsLoggingOut(true);
    // Esperamos 2.2 segundos para que termine la animación antes de borrar el usuario
    setTimeout(() => {
      logout();
    }, 2200);
  };

  return (
    <>
      {/* 🚀 PANTALLA ÉPICA DE DESCONEXIÓN */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030712] text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center text-center px-4"
            >
              {/* Icono de Power apagándose */}
              <motion.div
                animate={{ 
                  scale: [1, 0.8, 0], 
                  opacity: [1, 0.5, 0],
                  rotate: [0, -90]
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="h-24 w-24 mb-6 flex items-center justify-center rounded-[2rem] bg-rose-500/10 border border-rose-500/30 shadow-[0_0_50px_-10px_rgba(244,63,94,0.6)]"
              >
                <FaPowerOff className="text-5xl text-rose-500" />
              </motion.div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                Desconectando...
              </h1>
              <p className="mt-4 text-xs sm:text-sm font-medium tracking-widest text-zinc-500 uppercase">
                Cerrando canal seguro de {nombreOficina}
              </p>
              
              {/* Barra de progreso vaciándose */}
              <div className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-white/10 relative">
                <motion.div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-500 to-orange-500"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 HEADER NORMAL */}
      <header
        role="banner"
        className={`
          fixed inset-x-0 z-40
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
          border-b border-slate-200 dark:border-slate-800
          h-20 flex items-center
          transition-all duration-300
          ${sidebarOpen ? "lg:pl-64" : ""}
        `}
        style={{ top: 0, paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="w-full flex items-center justify-between px-4 sm:px-6 h-full">
          
          {/* IZQUIERDA: Botón Menú y Logo Desktop */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            >
              {sidebarOpen ? <HiX className="text-2xl" /> : <HiMenu className="text-2xl" />}
            </button>
            
            <div className="hidden sm:flex items-center">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
                THAMES APP 3.0
              </span>
            </div>
          </div>

          {/* CENTRO: Logo en mobile */}
          <div className="sm:hidden absolute left-1/2 -translate-x-1/2">
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              THAMES
            </span>
          </div>

          {/* DERECHA: Perfil de usuario y Logout */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Píldora del Usuario */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-full pr-1.5 pl-4 py-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="hidden sm:flex flex-col items-end mr-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {nombreOficina}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[120px]">
                  {user?.username}
                </span>
              </div>
              
              {/* Avatar Circulito */}
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-extrabold text-base shadow-inner">
                {avatarLetter}
              </div>
            </div>

            {/* Botón de Logout (AHORA DISPARA LA SECUENCIA) */}
            <button
              onClick={handleLogoutSequence}
              title="Cerrar Sesión"
              className="p-3 rounded-full cursor-pointer text-slate-400 hover:text-white hover:bg-rose-500 transition-colors shadow-sm"
            >
              <FaPowerOff className="text-lg" />
            </button>
          </div>
          
        </div>
      </header>
    </>
  );
}