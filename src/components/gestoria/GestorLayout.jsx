// src/components/gestoria/GestorLayout.jsx
//
// 🧑‍💼 Marco de la app para un usuario GESTOR (alguien de afuera de THAMES).
// Desde el 30/09 es solo el "cascarón" de la APP DE LA GESTORA (gestora/AppGestora.jsx):
// el fondo, la letra (Figtree, más de app) y nada más. Las barras de arriba y de
// abajo (Inicio · Trámites · ➕ · Cobros · Perfil) las pone cada pantalla.
// Sin menú lateral, sin caja ni contadores: el servidor igual le bloquea todo lo
// que no sea Gestoría.
import { useEffect } from "react";

import { LETRA } from "./gestora/gestoraUtils";

// Figtree (textos) e IBM Plex Mono (patentes y números). Si no cargan (sin
// internet), queda la letra del sistema y todo funciona igual.
const FUENTES =
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap";

function useFuentesGestora() {
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

export default function GestorLayout({ children }) {
  useFuentesGestora();
  return (
    <div
      className="min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark antialiased [-webkit-tap-highlight-color:transparent]"
      style={{ fontFamily: LETRA }}
    >
      {children}
    </div>
  );
}
