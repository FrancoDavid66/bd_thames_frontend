// src/utils/confetti.js
// 🎉 Confetti celebratorio estilo Duolingo (al crear cliente, completar ficha, etc.)
//
// Requiere la librería canvas-confetti:
//     npm install canvas-confetti
//
// Se importa de forma DINÁMICA y protegida: si la librería aún no está
// instalada, NO rompe la app (simplemente no muestra confetti).

// Colores de la marca Duo para el confetti
const COLORES = ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#ce82ff"];

export async function lanzarConfetti() {
  try {
    const mod = await import("canvas-confetti");
    const confetti = mod.default || mod;

    // Ráfaga central
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: COLORES,
      scalar: 1.1,
    });

    // Dos chorros laterales para más fiesta
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: COLORES });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: COLORES });
    }, 150);
  } catch (e) {
    // canvas-confetti no instalado todavía → no hacemos nada (la app sigue funcionando)
  }
}