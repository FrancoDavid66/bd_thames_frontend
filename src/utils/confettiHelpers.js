// src/utils/confettiHelpers.js
//
// Helpers para las explosiones de confetti.
// Requiere: npm install canvas-confetti

import confetti from "canvas-confetti";

/**
 * Confetti chico desde un elemento del DOM.
 * Se usa al renovar/verificar/descartar una fila — sale de la fila clickeada.
 */
export function confettiFromElement(el, opts = {}) {
  if (!el) return;
  try {
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: opts.particleCount || 50,
      spread: opts.spread || 60,
      startVelocity: 30,
      ticks: 80,
      origin: { x, y },
      colors: opts.colors || ["#34D399", "#10B981", "#6EE7B7", "#FCD34D", "#FBBF24"],
      shapes: ["circle", "square"],
      scalar: 0.8,
      disableForReducedMotion: true,
    });
  } catch (e) {
    // canvas-confetti puede fallar en algunos browsers, silenciamos
    console.warn("confetti error", e);
  }
}

/**
 * 🎉 Confetti EPICO — para hitos grandes (cerrar todas las pendientes del día).
 */
export function confettiCelebration() {
  try {
    const duration = 2500;
    const end = Date.now() + duration;

    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 100,
      zIndex: 9999,
      disableForReducedMotion: true,
    };

    (function frame() {
      const timeLeft = end - Date.now();
      if (timeLeft <= 0) return;

      const particleCount = 50 * (timeLeft / duration);

      // Confetti desde izquierda
      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.3, y: Math.random() - 0.2 },
        colors: ["#34D399", "#FCD34D", "#A78BFA", "#F472B6", "#60A5FA"],
      });
      // Confetti desde derecha
      confetti({
        ...defaults,
        particleCount,
        origin: { x: 0.7 + Math.random() * 0.3, y: Math.random() - 0.2 },
        colors: ["#34D399", "#FCD34D", "#A78BFA", "#F472B6", "#60A5FA"],
      });

      requestAnimationFrame(frame);
    })();
  } catch (e) {
    console.warn("confetti celebration error", e);
  }
}

/**
 * Confetti suave (gris/blanco) — para acciones menos festivas como "verificar".
 */
export function confettiSubtle(el) {
  confettiFromElement(el, {
    particleCount: 25,
    spread: 40,
    colors: ["#FFFFFF", "#E2E8F0", "#94A3B8"],
  });
}

/**
 * Confetti rojo/rosa — para "no renueva" (motivacional pero contenido).
 */
export function confettiDescartar(el) {
  confettiFromElement(el, {
    particleCount: 20,
    spread: 35,
    colors: ["#FB7185", "#F43F5E", "#FDA4AF"],
  });
}