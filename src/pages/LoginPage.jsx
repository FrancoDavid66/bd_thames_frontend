// src/pages/LoginPage.jsx
//
// 🔐 LOGIN 3D (25/11/2026) — el mismo para TODOS los usuarios (admin, oficinas, abogado,
//    escribana, gestora…): la T de la web de Thames en 3D, armándose sola y animada.
//
//   · Compu/celu con 3D: EscenaLogin3D (three.js, se baja solo en esta pantalla).
//   · Sin 3D (compu vieja) o mientras carga: la T plana flotando. El login anda igual.
//   · Entrando → la T gira. Clave mal → la T se sacude (y el aviso de siempre).
//   · Marca MALVINAS (su compu o su dirección web): verde y amarillo, con la moneda de su logo.
//
// Diseño: fondo negro con brillo rojo (como estudiothames.com), la T a la izquierda y la
// tarjeta de vidrio a la derecha. En el celu, la T arriba y la tarjeta abajo.
import { Component, lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineLockClosed, HiOutlineUser } from "react-icons/hi";

import { useAuth } from "../context/AuthContext";
// 🏷️ Logo y nombre de la MARCA: antes de entrar no hay usuario, así que sale de la
//    dirección web o de la última marca que entró en esta compu.
import { useMarca } from "../marca/MarcaContext";
import { TPlana } from "../components/login/tThames";

const EscenaLogin3D = lazy(() => import("../components/login/EscenaLogin3D"));

const FUENTES = "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@600;700&display=swap";

const ESTILOS = {
  thames: { acento: "#C1121F", acentoOscuro: "#9C0E19", brillo: "#FF4F5C", glow: "193,18,31", pie: "Seguros · Legales · Gestoría" },
  malvinas: { acento: "#2F9E4F", acentoOscuro: "#1E6B2E", brillo: "#F2D91B", glow: "47,158,79", pie: "Seguros · Abogados · Legales 24 hs" },
};

function hayWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

function useFuentesLogin() {
  useEffect(() => {
    if (document.getElementById("fuentes-login-thames")) return;
    const l = document.createElement("link");
    l.id = "fuentes-login-thames";
    l.rel = "stylesheet";
    l.href = FUENTES;
    document.head.appendChild(l);
  }, []);
}

// Si el 3D explota (o no baja el archivo), queda la T plana: el login nunca se rompe.
class SinRomper extends Component {
  constructor(props) {
    super(props);
    this.state = { roto: false };
  }
  static getDerivedStateFromError() {
    return { roto: true };
  }
  componentDidCatch(e) {
    console.warn("Login 3D: queda la versión plana.", e);
  }
  render() {
    return this.state.roto ? this.props.plano : this.props.children;
  }
}

/** La T plana (o el logo de Malvinas) flotando: sin 3D o mientras carga. */
function Plano({ marca, estilo }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="login-flota w-[46%] max-w-[300px] min-w-[150px]">
        {marca.id === "malvinas" ? (
          <img src={marca.logo} alt="" className="w-full drop-shadow-[0_20px_40px_rgba(0,0,0,.6)]" />
        ) : (
          <TPlana color={estilo.acento} className="w-full drop-shadow-[0_24px_40px_rgba(193,18,31,.45)]" />
        )}
      </div>
    </div>
  );
}

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errores, setErrores] = useState(0);
  const [con3D, setCon3D] = useState(() => hayWebGL());
  const { login } = useAuth();
  const marca = useMarca();
  const modo = marca.id === "malvinas" ? "malvinas" : "thames";
  const estilo = ESTILOS[modo];
  useFuentesLogin();

  // En la compu, el cursor arranca en «Usuario». En el celu no (abriría el teclado tapando la T).
  const enfocar = useMemo(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // 🛡️ Bloque try/catch súper robusto por si el AuthContext explota
    try {
      const res = await login(username, password);
      if (!res || !res.success) {
        setErrores((n) => n + 1);
        toast.error(res?.message || "Acceso denegado. Verificá tus datos.");
      }
    } catch (error) {
      console.error("Error capturado en el login:", error);
      setErrores((n) => n + 1);
      toast.error("Error de conexión. Revisa tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  const plano = <Plano marca={marca} estilo={estilo} />;
  const campo =
    "w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--login-brillo)] focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--login-acento)]/40";

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#0B090A] text-white"
      style={{ "--login-acento": estilo.acento, "--login-brillo": estilo.brillo }}
    >
      <style>{`
        @keyframes loginFlota { 0%,100% { transform: translateY(0) rotate(-1.5deg) } 50% { transform: translateY(-14px) rotate(1.5deg) } }
        .login-flota { animation: loginFlota 5s ease-in-out infinite }
        @keyframes loginEntra { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
        .login-entra { animation: loginEntra .7s cubic-bezier(.2,.8,.2,1) both }
        @media (prefers-reduced-motion: reduce) { .login-flota, .login-entra { animation: none } }
      `}</style>

      {/* Brillos del fondo (como la web) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(55% 45% at 30% 42%, rgba(${estilo.glow},.30), transparent 70%),
                       radial-gradient(35% 35% at 92% 96%, rgba(${estilo.glow},.14), transparent 70%),
                       radial-gradient(30% 30% at 4% 4%, rgba(255,255,255,.05), transparent 70%)`,
        }}
      />
      {/* Líneas finitas de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 35% 45%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 35% 45%, black 20%, transparent 70%)",
        }}
      />

      <div className="relative z-10 grid min-h-[100dvh] grid-rows-[auto_1fr] lg:grid-cols-[1.15fr_1fr] lg:grid-rows-1">
        {/* ── La T 3D ── */}
        <section aria-hidden="true" className="relative h-[40dvh] min-h-[250px] lg:h-auto">
          {con3D ? (
            <SinRomper plano={plano}>
              <Suspense fallback={plano}>
                <EscenaLogin3D
                  modo={modo}
                  logoUrl={marca.logoPng || marca.logo}
                  ocupado={isLoading}
                  errores={errores}
                  onFalla={() => setCon3D(false)}
                />
              </Suspense>
            </SinRomper>
          ) : (
            plano
          )}
          <p
            className="pointer-events-none absolute inset-x-0 bottom-8 hidden text-center text-[15px] uppercase tracking-[0.35em] text-white/45 lg:block"
            style={{ fontFamily: "'Barlow Condensed', system-ui, sans-serif", fontWeight: 700 }}
          >
            {estilo.pie}
          </p>
        </section>

        {/* ── La tarjeta ── */}
        <main className="flex items-start justify-center px-5 pb-10 lg:items-center lg:px-12 lg:pb-0">
          <form
            onSubmit={handleSubmit}
            className="login-entra -mt-4 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,.85)] backdrop-blur-xl sm:p-9 lg:mt-0"
          >
            <p
              className="mb-2 text-[13px] uppercase tracking-[0.28em]"
              style={{ color: estilo.brillo, fontFamily: "'Barlow Condensed', system-ui, sans-serif", fontWeight: 700 }}
            >
              {marca.lema}
            </p>
            <h1
              className="mb-1 text-[44px] uppercase leading-[0.95] sm:text-[52px]"
              style={{ fontFamily: "Anton, 'Barlow Condensed', Impact, sans-serif", letterSpacing: "0.01em" }}
            >
              {marca.partesLogin[0]} <span style={{ color: estilo.acento }}>{marca.partesLogin[1]}</span>
            </h1>
            <p className="mb-8 text-[14px] text-white/55">Ingresá con tu usuario para continuar.</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="login-usuario" className="mb-1.5 ml-0.5 block text-[13px] font-medium text-white/70">
                  Usuario
                </label>
                <div className="relative">
                  <HiOutlineUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40" />
                  <input
                    id="login-usuario"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus={enfocar}
                    placeholder="Tu usuario"
                    className={campo}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-clave" className="mb-1.5 ml-0.5 block text-[13px] font-medium text-white/70">
                  Clave
                </label>
                <div className="relative">
                  <HiOutlineLockClosed className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-white/40" />
                  <input
                    id="login-clave"
                    type={verClave ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${campo} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVerClave((v) => !v)}
                    aria-label={verClave ? "Ocultar la clave" : "Mostrar la clave"}
                    className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/45 transition-colors hover:text-white"
                  >
                    {verClave ? <HiOutlineEyeOff className="text-[19px]" /> : <HiOutlineEye className="text-[19px]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-[15px] font-semibold text-white transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 ${
                  isLoading ? "cursor-wait opacity-85" : ""
                }`}
                style={{
                  background: `linear-gradient(180deg, ${estilo.acento}, ${estilo.acentoOscuro})`,
                  boxShadow: `0 12px 30px -10px rgba(${estilo.glow},.7)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100"
                />
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Entrando…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </button>
            </div>

            <p className="mt-8 text-center text-[11px] text-white/35">Red protegida · Acceso restringido</p>
          </form>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
