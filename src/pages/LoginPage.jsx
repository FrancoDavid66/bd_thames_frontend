// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi';

// 🚀 IMPORTAMOS TU LOGO OFICIAL
import logoThames from '../assets/logos/logo_thames.svg';

/**
 * 🪶 Hook liviano que detecta si conviene "aliviar" los efectos visuales.
 * Devuelve true cuando:
 *   - la pantalla es chica (celular / tablet), o
 *   - el usuario activó "reducir movimiento" en su sistema.
 * En esos casos apagamos animaciones infinitas y el vidrio esmerilado pesado,
 * que son lo que traba la GPU en celulares.
 */
const useLightMode = () => {
  const [light, setLight] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqMobile = window.matchMedia('(max-width: 1023.5px)');
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => setLight(mqMobile.matches || mqReduce.matches);
    update();

    mqMobile.addEventListener('change', update);
    mqReduce.addEventListener('change', update);
    return () => {
      mqMobile.removeEventListener('change', update);
      mqReduce.removeEventListener('change', update);
    };
  }, []);

  return light;
};

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // 🪶 Si es celular o "reducir movimiento", activamos modo liviano
  const light = useLightMode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 🛡️ Bloque try/catch súper robusto por si el AuthContext explota
    try {
      const res = await login(username, password);
      if (!res || !res.success) {
        toast.error(res?.message || "Acceso denegado. Verificá tus datos.");
      }
    } catch (error) {
      console.error("Error capturado en el login:", error);
      toast.error("Error de conexión. Revisa tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  // Variantes de animación para que los elementos entren escalonados.
  // (Esto corre UNA sola vez al entrar, no traba.)
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.15,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  // 🪶 Animaciones de los orbes: solo en PC. En móvil quedan quietos.
  const orbeAzul = light ? {} : { x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] };
  const orbeVerde = light ? {} : { x: [0, -40, 0], y: [0, -40, 0], scale: [1, 1.2, 1] };
  const orbeTransAzul = light ? {} : { duration: 10, repeat: Infinity, ease: "easeInOut" };
  const orbeTransVerde = light ? {} : { duration: 12, repeat: Infinity, ease: "easeInOut" };

  // 🪶 Flote del logo: solo en PC
  const logoFloat = light ? {} : { y: [-5, 5, -5] };
  const logoFloatTrans = light ? {} : { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } };

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#030712] text-zinc-100">

      {/* 🚀 FONDO ÉPICO Y FUTURISTA */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Orbe Azul */}
        <motion.div
          className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]"
          animate={orbeAzul}
          transition={orbeTransAzul}
        />
        {/* Orbe Esmeralda */}
        <motion.div
          className="absolute -bottom-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px]"
          animate={orbeVerde}
          transition={orbeTransVerde}
        />
        {/* Textura sutil de ruido (se carga una vez, no anima) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* 🚀 CONTENEDOR DEL FORMULARIO (Glassmorphism) */}
      <motion.form
        onSubmit={handleSubmit}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`relative z-10 w-full max-w-md p-8 sm:p-10 shadow-2xl rounded-3xl border border-white/[0.08] ${
          light
            ? 'bg-zinc-900/85'                       // móvil: fondo sólido, sin vidrio pesado
            : 'bg-white/[0.03] backdrop-blur-2xl'     // PC: vidrio esmerilado
        }`}
      >
        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="flex justify-center mb-6">
            {/* 🚀 LOGO ANIMADO + EASTER EGG (Rickroll) */}
            <motion.a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-20 w-20 items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 shadow-lg shadow-blue-500/20 cursor-pointer z-50 ${
                light ? '' : 'backdrop-blur-md'
              }`}
              animate={logoFloat}
              transition={logoFloatTrans}
              whileHover={{ scale: 1.1, rotate: 5, transition: { type: "spring", stiffness: 300 } }}
            >
              <img
                src={logoThames}
                alt="Logo Thames Seguros"
                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] pointer-events-none"
              />
            </motion.a>
          </div>

          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 mb-2 tracking-tight">
            Thames Seguros
          </h2>
          <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">
            Portal de Gestión Operativa
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Input de Usuario */}
          <motion.div variants={itemVariants} className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 ml-1">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <HiOutlineUser className="text-zinc-500 text-lg" />
              </div>
              <input
                type="text"
                placeholder="Identificador de acceso"
                className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </motion.div>

          {/* Input de Contraseña */}
          <motion.div variants={itemVariants} className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 ml-1">
              Clave de seguridad
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <HiOutlineLockClosed className="text-zinc-500 text-lg" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </motion.div>

          {/* Botón de Entrada */}
          <motion.div variants={itemVariants} className="pt-2">
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full relative group cursor-pointer overflow-hidden bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold py-4 rounded-2xl shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition-all ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 group-hover:translate-x-full -translate-x-full transition-transform duration-500 ease-out skew-x-12"></div>
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Autenticando...
                  </>
                ) : (
                  "INICIAR CONEXIÓN"
                )}
              </span>
            </motion.button>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="mt-8 text-center">
          <p className="text-[11px] font-medium tracking-widest text-zinc-500 uppercase">
            Red Protegida • Acceso Restringido
          </p>
        </motion.div>
      </motion.form>
    </div>
  );
};

export default LoginPage;