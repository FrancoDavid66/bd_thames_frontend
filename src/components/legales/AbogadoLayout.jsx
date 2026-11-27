// src/components/legales/AbogadoLayout.jsx
//
// ⚖️ Marco de la app para un usuario ABOGADO (alguien de afuera de THAMES).
// Desde el 05/10 es solo el "cascarón" de la APP DEL ABOGADO (abogado/AppAbogado.jsx):
// el fondo, la letra (Figtree, más de app) y nada más. Las barras de arriba y de
// abajo (Inicio · Casos · ➕ · Agenda · Plata) las pone cada pantalla; salir y el
// modo oscuro están en su Perfil.
// Sin menú lateral, sin caja ni contadores: el servidor igual le bloquea todo lo
// que no sea Legales y Siniestros.
//
// 🆕 17/11/2026 · RECLAMOS: el abogado también lleva siniestros (Maxi). Si tiene alguno
//   asignado, arriba aparece la tira «⚖️ Legales · 🚗 Reclamos (N)» para pasar de uno a otro,
//   y al entrar va directo a sus reclamos. Un abogado sin siniestros asignados ve Legales
//   como siempre (sin la tira).
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, NavLink, useLocation } from "react-router-dom";
import axios from "axios";

import { useAuth } from "../../context/AuthContext";
import { CargandoPantalla } from "../../utils/lazyConReintento";
import { LETRA } from "../gestoria/gestora/gestoraUtils";

// Figtree (textos) e IBM Plex Mono (números). Si no cargan (sin internet), queda
// la letra del sistema y todo funciona igual. (El mismo link que usa la app de la
// gestora: si ya está en la página, no se vuelve a poner.)
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap";

function useFuentes() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("fuentes-gestora-thames")) return;
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.gstatic.com";
    pre.crossOrigin = "anonymous";
    document.head.appendChild(pre);
    const l = document.createElement("link");
    l.id = "fuentes-gestora-thames";
    l.rel = "stylesheet";
    l.href = FUENTES;
    document.head.appendChild(l);
  }, []);
}

// ⚖️ Cuántos reclamos (siniestros) tiene asignados: null = todavía no se sabe.
const ReclamosCtx = createContext({ total: null, abiertos: null });

function useReclamos() {
  const { user } = useAuth();
  // ✍️ La escribana (y 🚗 27/11 la gestoría) no llevan reclamos de siniestros: ni se pregunta (el servidor diría 403).
  const sinReclamos = ["ESCRIBANO", "GESTOR"].includes(user?.perfil?.rol);
  const [r, setR] = useState(sinReclamos ? { total: 0, abiertos: 0 } : { total: null, abiertos: null });
  useEffect(() => {
    if (sinReclamos) return undefined;
    let vivo = true;
    const base = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      axios.get(`${base}siniestros/`, { params: { page_size: 1 }, headers }),
      axios.get(`${base}siniestros/`, { params: { page_size: 1, abiertos: 1 }, headers }),
    ])
      .then(([t, a]) => vivo && setR({ total: Number(t.data?.count) || 0, abiertos: Number(a.data?.count) || 0 }))
      .catch(() => vivo && setR({ total: 0, abiertos: 0 }));
    return () => {
      vivo = false;
    };
  }, [sinReclamos]);
  return r;
}

/** Al entrar (o una dirección que no existe): a sus reclamos si tiene, si no a Legales. */
export function InicioAbogado() {
  const { total } = useContext(ReclamosCtx);
  // Mientras averigua si tiene reclamos: la ruedita de siempre (antes, medio segundo en blanco).
  if (total === null) return <CargandoPantalla />;
  return <Navigate to={total > 0 ? "/siniestros" : "/legales"} replace />;
}

/** La tira de arriba: ⚖️ Legales · 🚗 Reclamos (N). En Reclamos, también «Salir». */
function TiraModulos({ abiertos }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const enReclamos = pathname.startsWith("/siniestros");
  const clase = ({ isActive }) =>
    `inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition-colors ${
      isActive ? "bg-duo-violeta text-white" : "text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
    }`;
  return (
    <nav
      aria-label="Módulos"
      className="border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-1.5">
        <NavLink to="/legales" className={clase}>
          ⚖️ Legales
        </NavLink>
        <NavLink to="/siniestros" className={clase}>
          🚗 Reclamos
          {abiertos ? (
            <span className="rounded-full bg-duo-rojo px-1.5 text-[11px] font-extrabold leading-5 text-white tabular-nums">{abiertos}</span>
          ) : null}
        </NavLink>
        <span className="flex-1" />
        {enReclamos && (
          <button
            type="button"
            onClick={logout}
            className="min-h-[40px] rounded-full px-3 text-[13px] font-semibold text-suave hover:text-titulo dark:text-suave-dark dark:hover:text-titulo-dark"
          >
            Salir
          </button>
        )}
      </div>
    </nav>
  );
}

export default function AbogadoLayout({ children }) {
  useFuentes();
  const reclamos = useReclamos();
  return (
    <ReclamosCtx.Provider value={reclamos}>
      <div
        className="min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark antialiased [-webkit-tap-highlight-color:transparent]"
        style={{ fontFamily: LETRA }}
      >
        {reclamos.total > 0 && <TiraModulos abiertos={reclamos.abiertos} />}
        {children}
      </div>
    </ReclamosCtx.Provider>
  );
}
