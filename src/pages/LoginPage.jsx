// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi';

// 🚀 IMPORTAMOS TU LOGO OFICIAL
import logoThames from '../assets/logos/logo_thames.svg';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

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

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface px-4 dark:bg-surface-dark">

      {/* Tarjeta Duo (sin orbes ni vidrio pesado — carga rápido en celular) */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border-2 border-linea bg-card p-8 shadow-[0_6px_0_var(--color-linea)] dark:border-linea-dark dark:bg-card-dark dark:shadow-[0_6px_0_var(--color-linea-dark)] sm:p-10"
      >
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            {/* Isotipo grande en cuadrado Duo con relieve 3D */}
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-linea bg-surface p-3.5 shadow-[0_6px_0_var(--color-linea)] dark:border-linea-dark dark:bg-surface-dark dark:shadow-[0_6px_0_var(--color-linea-dark)]">
              <img
                src={logoThames}
                alt="Logo Thames Seguros"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <h2 className="mb-2 text-3xl font-black tracking-tight text-titulo dark:text-titulo-dark">
            Thames <span className="text-marca">Seguros</span>
          </h2>
          <p className="text-sm font-bold uppercase tracking-wide text-suave dark:text-suave-dark">
            Portal de Gestión Operativa
          </p>
        </div>

        <div className="space-y-6">
          {/* Input de Usuario */}
          <div>
            <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-wider text-suave dark:text-suave-dark">
              Usuario
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <HiOutlineUser className="text-lg text-suave dark:text-suave-dark" />
              </div>
              <input
                type="text"
                placeholder="Identificador de acceso"
                className="w-full rounded-2xl border-2 border-linea bg-surface py-3.5 pl-11 pr-4 font-semibold text-titulo outline-none transition-all placeholder:text-suave focus:border-oficina dark:border-linea-dark dark:bg-surface-dark dark:text-titulo-dark"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Input de Contraseña */}
          <div>
            <label className="mb-2 ml-1 block text-xs font-black uppercase tracking-wider text-suave dark:text-suave-dark">
              Clave de seguridad
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <HiOutlineLockClosed className="text-lg text-suave dark:text-suave-dark" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-2xl border-2 border-linea bg-surface py-3.5 pl-11 pr-4 font-semibold text-titulo outline-none transition-all placeholder:text-suave focus:border-oficina dark:border-linea-dark dark:bg-surface-dark dark:text-titulo-dark"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Botón de Entrada (3D Duo) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-duo-verde py-4 text-base font-black text-white shadow-[0_5px_0_var(--color-duo-verde-sombra)] transition-all active:translate-y-0.5 active:shadow-[0_0_0_var(--color-duo-verde-sombra)] ${isLoading ? 'cursor-wait opacity-80' : ''}`}
            >
              {isLoading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Autenticando...
                </>
              ) : (
                "INICIAR SESIÓN"
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-suave dark:text-suave-dark">
            Red Protegida • Acceso Restringido
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
