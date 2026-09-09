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

      {/* Tarjeta — borde fino, sin relieve 3D */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-linea bg-card p-8 dark:border-linea-dark dark:bg-card-dark sm:p-10"
      >
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-linea bg-surface p-3 dark:border-linea-dark dark:bg-surface-dark">
              <img
                src={logoThames}
                alt="Logo Thames Seguros"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <h2 className="mb-2 text-2xl font-semibold text-titulo dark:text-titulo-dark">
            Thames <span className="text-marca">Seguros</span>
          </h2>
          <p className="text-[13px] text-suave dark:text-suave-dark">
            Portal de gestión operativa
          </p>
        </div>

        <div className="space-y-5">
          {/* Input de Usuario */}
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium text-suave dark:text-suave-dark">
              Usuario
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <HiOutlineUser className="text-base text-suave dark:text-suave-dark" />
              </div>
              <input
                type="text"
                placeholder="Identificador de acceso"
                className="w-full rounded-lg border border-linea bg-surface py-2.5 pl-10 pr-4 text-[14px] text-titulo outline-none transition-colors placeholder:text-suave focus:border-duo-violeta dark:border-linea-dark dark:bg-surface-dark dark:text-titulo-dark"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Input de Contraseña */}
          <div>
            <label className="mb-1.5 ml-0.5 block text-[13px] font-medium text-suave dark:text-suave-dark">
              Clave de seguridad
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <HiOutlineLockClosed className="text-base text-suave dark:text-suave-dark" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-linea bg-surface py-2.5 pl-10 pr-4 text-[14px] text-titulo outline-none transition-colors placeholder:text-suave focus:border-duo-violeta dark:border-linea-dark dark:bg-surface-dark dark:text-titulo-dark"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Botón de Entrada — plano */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg bg-duo-violeta py-3 text-[14px] font-medium text-white transition-colors hover:brightness-110 ${isLoading ? 'cursor-wait opacity-80' : ''}`}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Autenticando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-suave dark:text-suave-dark">
            Red protegida · Acceso restringido
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
