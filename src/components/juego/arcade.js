// src/components/juego/arcade.js
//
// 🕹️ THAMES ARCADE — utilidades del estilo "fichín" de la sección de minijuegos.
//
//   · cargarFuentesArcade() → trae las letras pixel de Google Fonts (una sola vez).
//   · useModoArcade()       → mientras estás en el juego, el fondo de la app se
//                             pone "noche de fichín" (al salir vuelve a la normalidad).
//   · puntaje6(n)           → 12450 → "012450" (los puntajes de los fichines).
//   · useCuentaArriba(n)    → el puntaje final "sube" contando (0 → n).
//   · SPRITES / avatarDe()  → dibujitos pixel (corazón, moneda, escudo...) y el
//                             "bichito" de cada jugador (siempre el mismo para la
//                             misma persona). Se dibujan con <Pixel> (ArcadeUI.jsx).
//
// Los estilos están en arcade.css (todo cuelga de la clase .arcade).

import { useEffect, useState } from "react";

// ── Letras ──────────────────────────────────────────────────────────────
const FUENTES_ID = "thames-arcade-fuentes";
const FUENTES_URL =
  "https://fonts.googleapis.com/css2?family=Monoton&family=Press+Start+2P&family=VT323&display=swap";

export function cargarFuentesArcade() {
  if (typeof document === "undefined") return;
  if (!document.getElementById(FUENTES_ID)) {
    const link = document.createElement("link");
    link.id = FUENTES_ID;
    link.rel = "stylesheet";
    link.href = FUENTES_URL;
    document.head.appendChild(link);
  }
  // El canvas no pide la letra solo: se la pedimos (si no está, usa la común).
  try {
    const pedido = document.fonts?.load('16px "Press Start 2P"');
    if (pedido && typeof pedido.catch === "function") pedido.catch(() => {});
  } catch {
    /* navegador sin FontFace API: queda la letra común */
  }
}

// ── Modo arcade (fondo oscuro en toda la zona de contenido) ────────────
export function useModoArcade() {
  useEffect(() => {
    cargarFuentesArcade();
    const raiz = document.documentElement;
    raiz.classList.add("thames-arcade");
    return () => raiz.classList.remove("thames-arcade");
  }, []);
}

// ── Números de fichín ───────────────────────────────────────────────────
export function puntaje6(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return v > 999999 ? String(v) : String(v).padStart(6, "0");
}

function sinMovimiento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/* El número sube contando hasta `valor`. Devuelve { n, listo }. */
export function useCuentaArriba(valor, ms = 1000) {
  const [estado, setEstado] = useState({ n: 0, listo: false });
  useEffect(() => {
    const destino = Math.max(0, Math.floor(Number(valor) || 0));
    if (!destino || sinMovimiento()) {
      setEstado({ n: destino, listo: true });
      return undefined;
    }
    let raf = 0;
    const inicio = performance.now();
    const paso = (ahora) => {
      const k = Math.min(1, (ahora - inicio) / ms);
      const suave = 1 - (1 - k) * (1 - k) * (1 - k);
      setEstado({ n: Math.round(destino * suave), listo: k >= 1 });
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, ms]);
  return estado;
}

// ── Sprites (dibujitos pixel) ──────────────────────────────────────────
//  Cada letra es un color; "." es transparente. "currentColor" toma el color
//  del texto que lo rodea.
const CC = "currentColor";

export const SPRITES = {
  corazon: {
    colores: { R: "#ff3b5c", W: "#ffd1dc" },
    filas: [".RR.RR.", "RWRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."],
  },
  moneda: {
    colores: { O: "#b7791f", Y: "#ffd23f", W: "#fff6c2" },
    filas: ["..OOOO..", ".OYYYYO.", "OYWYYYYO", "OYWYYYYO", "OYWYYYYO", "OYYYYYYO", ".OYYYYO.", "..OOOO.."],
  },
  escudo: {
    colores: { B: "#0b7fa3", C: "#2de2ff", W: "#e6fcff" },
    filas: ["BBBBBBB", "BCCCCCB", "BCWCCCB", "BCWCCCB", "BCCCCCB", ".BCCCB.", "..BCB..", "...B..."],
  },
  rayo: {
    colores: { Y: "#ffd23f", W: "#fff6c2" },
    filas: ["..YYW", ".YYY.", "YYY..", "YYYYY", "..YYY", "..YY.", ".YY..", ".Y..."],
  },
  autoRojo: {
    colores: { H: "#fff7c2", R: "#dc1f26", W: "#bfe3ff", K: "#0f172a", S: "#ffffff" },
    filas: [".HRRH.", "RWWWWR", "KRRRRK", "KRRSRK", ".RRSR.", "KRRSRK", "KRRRRK", "RRRRRR"],
  },
  autoAmarillo: {
    colores: { H: "#fff7c2", Y: "#ffd23f", W: "#bfe3ff", K: "#0f172a", O: "#ff9148" },
    filas: [".HYYH.", "YWWWWY", "KYYYYK", "OYYYYK", ".YYYY.", "OYYYYK", "KYYYYK", "YYYYYY"],
  },
  cono: {
    colores: { O: "#ff7a1a", W: "#ffffff", K: "#5a3a1a" },
    filas: ["...O...", "..OOO..", "..WWW..", ".OOOOO.", ".WWWWW.", "OOOOOOO", "OOOOOOO", "KKKKKKK"],
  },
  explosion: {
    colores: { R: "#ff3b5c", Y: "#ffd23f", W: "#fff6c2" },
    filas: [
      "....R....",
      ".R..Y..R.",
      "..RYYYR..",
      "..YWWWY..",
      "RYYWWWYYR",
      "..YWWWY..",
      "..RYYYR..",
      ".R..Y..R.",
      "....R....",
    ],
  },
  trofeo: {
    colores: { Y: "#ffd23f", W: "#fff6c2", O: "#b7791f" },
    filas: [
      "YYYYYYYYY",
      "Y.YWYYY.Y",
      "Y.YWYYY.Y",
      ".YYWYYYY.",
      "..YYYYY..",
      "...YYY...",
      "....Y....",
      "...OOO...",
      "..OOOOO..",
    ],
  },
  corona: {
    colores: { Y: "#ffd23f", R: "#ff3b5c", B: "#2de2ff" },
    filas: ["Y..Y..Y", "YY.Y.YY", "YYYYYYY", "YRYBYRY", "YYYYYYY"],
  },
  telefono: {
    colores: { G: "#0f380f" },
    filas: [".GGGGGGG.", "GG.....GG", "GG.....GG", "...GGG...", "..GGGGG..", ".GG.G.GG.", ".GGGGGGG.", ".GGGGGGG."],
  },
  parlante: {
    colores: { W: CC },
    filas: ["...W....", "..WW..W.", "WWWW.W.W", "WWWW.W.W", "WWWW.W.W", "..WW..W.", "...W...."],
  },
  parlanteMudo: {
    colores: { W: CC },
    filas: ["...W....", "..WW....", "WWWW.W.W", "WWWW..W.", "WWWW.W.W", "..WW....", "...W...."],
  },
  joystick: {
    colores: { R: "#ff3b5c", W: "#ffd1dc", S: "#a79ad8", B: "#2de2ff", C: "#0b7fa3" },
    filas: ["..RRR..", ".RWRRR.", ".RRRRR.", "..RRR..", "...S...", "...S...", ".BBBBB.", "BCCCCCB", "BBBBBBB"],
  },
  flechaIzq: {
    colores: { W: CC },
    filas: ["...W...", "..WW...", ".WWWWWW", "WWWWWWW", ".WWWWWW", "..WW...", "...W..."],
  },
  flechaDer: {
    colores: { W: CC },
    filas: ["...W...", "...WW..", "WWWWWW.", "WWWWWWW", "WWWWWW.", "...WW..", "...W..."],
  },
  play: {
    colores: { W: CC },
    filas: ["W.....", "WW....", "WWW...", "WWWW..", "WWW...", "WW....", "W....."],
  },
  pausa: {
    colores: { W: CC },
    filas: ["WW..WW", "WW..WW", "WW..WW", "WW..WW", "WW..WW", "WW..WW", "WW..WW"],
  },
  reloj: {
    colores: { W: CC },
    filas: ["..WWW..", ".W...W.", "W..W..W", "W..WW.W", "W.....W", ".W...W.", "..WWW.."],
  },
};

// ── Bichito pixel de cada jugador ──────────────────────────────────────
//  Sale de su clave ("e12" = empleado 12): la misma persona siempre tiene
//  el mismo bichito y el mismo color, en la portada y en el tablero.
const PALETA_AVATAR = ["#2de2ff", "#ff3cac", "#ffd23f", "#5dff8f", "#ff9148", "#b18cff"];

function hashTexto(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function azarDesde(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function avatarDe(semilla) {
  const h = hashTexto(String(semilla ?? "?"));
  const azar = azarDesde(h);
  // Mitad izquierda (4 columnas, la 4ª es el centro) y después se espeja.
  const mitad = [];
  for (let y = 0; y < 7; y++) {
    const fila = [];
    for (let x = 0; x < 4; x++) fila.push(azar() < (y === 0 || y === 6 ? 0.4 : 0.62));
    mitad.push(fila);
  }
  // Frente, ojos (huecos) y cachetes: así siempre parece un bichito.
  mitad[1][2] = true;
  mitad[1][3] = true;
  mitad[2][1] = true;
  mitad[2][2] = false;
  mitad[2][3] = true;
  mitad[3][1] = true;
  mitad[3][2] = true;
  mitad[3][3] = true;
  const filas = mitad.map((f) =>
    [f[0], f[1], f[2], f[3], f[2], f[1], f[0]].map((si) => (si ? "A" : ".")).join("")
  );
  return { colores: { A: PALETA_AVATAR[h % PALETA_AVATAR.length] }, filas };
}
