// src/components/juego/bot.js
//
// 🤖 El piloto de la DEMO: maneja solo en la portada, como los fichines que
// juegan solos mientras esperan que alguien ponga una ficha.
//
// Cada ~0,3 s "se imagina" 0,9 s para adelante en cada carril (simula el
// juego en una copia) y se queda con el carril que más lo deja vivo.
// De vez en cuando se equivoca a propósito, así en la demo también se ven
// los siniestros.
//
// No suma puntos a nadie ni guarda nada: es solo para mirar.

import { actualizar, crearAzar, centroCarril, carrilDe, CARRILES } from "./motor.js";

const PASO = 1 / 30;

function copiar(p) {
  const { azar: _azar, ...resto } = p;
  const q = typeof structuredClone === "function" ? structuredClone(resto) : JSON.parse(JSON.stringify(resto));
  q.azar = crearAzar(7);
  return q;
}

// ¿Cuántos segundos aguanta sin chocar si se va a ese carril?
function aguanta(p, carril, segs) {
  const q = copiar(p);
  const vidas = q.vidas;
  const meta = centroCarril(carril);
  let t = 0;
  while (t < segs && q.fase !== "fin") {
    actualizar(q, PASO, { izq: q.jugador.x > meta + 1.5, der: q.jugador.x < meta - 1.5 });
    if (q.vidas < vidas) return t;
    t += PASO;
  }
  return segs + 0.001;
}

function mejorCarril(p, actual, mira) {
  const orden = [actual];
  for (let c = 0; c < CARRILES; c++) if (c !== actual) orden.push(c);
  orden.sort((a, b) => Math.abs(a - actual) - Math.abs(b - actual));
  let mejor = actual;
  let mejorT = -1;
  for (const c of orden) {
    const t = aguanta(p, c, mira);
    if (t > mejorT + 0.02) {
      mejorT = t;
      mejor = c;
    }
  }
  return mejor;
}

/* Devuelve una función manejar(partida, dt) → { izq, der } */
export function crearPiloto({ reaccion = 0.28, mira = 0.9, error = 0.03, azar = Math.random } = {}) {
  let objetivo = null;
  let espera = 0;
  return function manejar(p, dt) {
    if (p.fase !== "jugando" || p.finEn !== null) return { izq: false, der: false };
    if (objetivo === null) objetivo = carrilDe(p.jugador.x);
    espera -= dt;
    if (espera <= 0) {
      objetivo = mejorCarril(p, objetivo, mira);
      if (azar() < error) objetivo = Math.floor(azar() * CARRILES);
      espera = reaccion;
    }
    const meta = centroCarril(objetivo);
    return { izq: p.jugador.x > meta + 1.5, der: p.jugador.x < meta - 1.5 };
  };
}
