// src/components/legales/AbogadoLayout.jsx
//
// ⚖️ Marco de la app para un usuario ABOGADO (alguien de afuera de THAMES).
// Desde el 05/10 es solo el "cascarón" de la APP DEL ABOGADO (abogado/AppAbogado.jsx):
// el fondo, la letra (Figtree, más de app) y nada más. Las barras de arriba y de
// abajo (Inicio · Casos · ➕ · Agenda · Plata) las pone cada pantalla; salir y el
// modo oscuro están en su Perfil.
// Sin menú lateral, sin caja ni contadores: el servidor igual le bloquea todo lo
// que no sea Legales.
import { useEffect } from "react";

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

export default function AbogadoLayout({ children }) {
  useFuentes();
  return (
    <div
      className="min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark antialiased [-webkit-tap-highlight-color:transparent]"
      style={{ fontFamily: LETRA }}
    >
      {children}
    </div>
  );
}
