// src/components/juego/motor.js
//
// 🚗 SINIESTRO CERO — el "cerebro" del minijuego (acá NO se dibuja nada).
//
// Estilo Road Fighter de la Family: manejás un auto por la ruta y esquivás
// el tráfico. Si chocás es un SINIESTRO. Con 3 siniestros "te dan de baja"
// (se termina la partida).
//
// ── CÓMO SE SUMAN PUNTOS ──────────────────────────────────────────────────
//   · 1 punto por cada metro recorrido (más rápido = más puntos).
//   · ¡CASI!  +100 si pasás rozando un auto sin tocarlo.
//             Si hacés varios seguidos (en menos de 3 s) se multiplica:
//             x2, x3... hasta x5.
//   · $       +250 cada moneda.
//   · 🛡️      COBERTURA TOTAL: 5 segundos sin siniestros. Los autos que
//             tocás salen volando (+50 cada uno).
//
// ── CÓMO SE PONE DIFÍCIL ─────────────────────────────────────────────────
//   · La velocidad sube sola con el tiempo (de ~108 a ~310 km/h).
//   · Cada vez sale más tráfico y más seguido.
//   · Autos AMARILLOS: cuando se acercan, se cruzan a tu carril (avisan con
//     el guiño antes de moverse, como en el Road Fighter).
//   · Camiones: lentos y largos, tapan un carril.
//   · OBRAS: cierran un carril con conos por un tramo.
//
// ⚖️ Siempre quedan al menos 2 carriles libres cuando sale una fila nueva:
//    difícil sí, imposible no.
//
// Todo se mide en "píxeles lógicos" de una pantalla de 180 x 300.
// El dibujo (dibujo.js) después lo agranda al tamaño real.

export const ANCHO = 180;
export const ALTO = 300;
export const RUTA_IZQ = 38;
export const RUTA_DER = 142;
export const CARRILES = 4;
export const CARRIL = (RUTA_DER - RUTA_IZQ) / CARRILES; // 26 px por carril

// ⚠️ Los autos (16) son más anchos que el hueco entre dos carriles (26 - 16 = 10):
//    no hay "zona segura" montado sobre la raya. Hay que manejar.
export const VIDAS = 3;

const VEL_INICIAL = 150;    // px/s  ≈ 108 km/h
const VEL_MAXIMA = 430;     // px/s  ≈ 310 km/h
const SUBE_POR_SEG = 3.2;   // cuánto sube la velocidad objetivo por segundo jugado
const KMH_POR_PX = 0.72;    // px/s → km/h (solo para mostrar)
const METROS_POR_PX = 0.2;  // px   → metros

const PUNTOS_CASI = 100;
const PUNTOS_MONEDA = 250;
const PUNTOS_BANQUINA = 50;
const COMBO_MAX = 5;
const COMBO_SEG = 3;        // segundos para encadenar un ¡CASI! con el siguiente
const MARGEN_CASI = 7;      // px de aire para que cuente como ¡CASI!
const ESCUDO_SEG = 5;
const INVULNERABLE_SEG = 2; // después de un siniestro (el auto titila)
export const FIN_DEMORA = 2; // segundos que se ve el GAME OVER en la ruta antes de la pantalla final
const BANDA_AIRE = 30;      // px: dos autos a menos de esto (en altura) cuentan como "misma fila"

// Colores del tráfico (paleta tipo NES).
const COLORES_AUTO = ["#2f6df6", "#1f9d55", "#8b5cf6", "#e2e8f0", "#0ea5b7"];
const COLORES_CAMION = ["#f97316", "#64748b", "#16a34a"];
const COLOR_CAMBIA = "#facc15"; // amarillo: el que se cruza de carril

export const centroCarril = (i) => RUTA_IZQ + CARRIL * i + CARRIL / 2;
export const carrilDe = (x) =>
  Math.max(0, Math.min(CARRILES - 1, Math.floor((x - RUTA_IZQ) / CARRIL)));
export const kmh = (vel) => Math.round(vel * KMH_POR_PX);

/* Azar con semilla (para las pruebas: la misma semilla = la misma partida). */
export function crearAzar(semilla = 1) {
  let a = semilla >>> 0;
  return function azar() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Partida nueva, lista para arrancar con la cuenta regresiva 3, 2, 1. */
export function crearPartida({ azar = Math.random } = {}) {
  return {
    azar,
    fase: "cuenta",          // "cuenta" → "jugando" → "fin"
    cuenta: 3,               // segundos de cuenta regresiva
    sonoCuenta: false,       // ya sonó el "pip" del 3
    t: 0,                    // segundos jugados (sin cuenta ni pausas)
    vel: 0,                  // velocidad actual (px/s)
    recorrido: 0,            // px avanzados en total
    metros: 0,
    puntos: 0,
    esquives: 0,             // cantidad de ¡CASI!
    monedas: 0,
    combo: 0,
    comboHasta: 0,
    vidas: VIDAS,
    siniestros: 0,
    invulnerableHasta: 0,
    escudoHasta: 0,
    finEn: null,             // cuándo termina (después del último siniestro)
    temblor: 0,              // sacudón de pantalla al chocar
    jugador: { x: centroCarril(2), y: ALTO - 44, w: 16, h: 26, vx: 0, giro: 0 },
    vehiculos: [],
    items: [],               // monedas, escudos y conos
    decorado: [],            // árboles, arbustos y carteles al costado
    particulas: [],
    textos: [],              // cartelitos que suben ("+100 ¡CASI!")
    eventos: [],             // sonidos a disparar en ESTE cuadro
    proximaFila: 70,
    proximaMoneda: 420,
    proximoEscudo: 5200,
    proximaObra: 2300,
    obra: null,              // { carril, estado: "esperando" | "activa", hasta, proximoCono }
    proximoDecorado: 0,
    seq: 1,
  };
}

/* Un cartel grande en el medio de la ruta (ej: "¡NUEVO RÉCORD!"). */
export function anunciar(p, txt, color = "#facc15") {
  p.textos.push(texto(p, txt, ANCHO / 2, ALTO * 0.3, color, true));
}

/* Lo que se manda al servidor cuando termina. */
export function resultado(p) {
  return {
    puntos: Math.max(0, Math.floor(p.puntos)),
    metros: Math.max(0, Math.floor(p.metros)),
    segundos: Math.max(1, Math.round(p.t)),
    esquives: p.esquives,
    monedas: p.monedas,
    siniestros: p.siniestros,
  };
}

// ════════════════════════════════════════════════════════════════════════
//  AVANZAR UN CUADRO
// ════════════════════════════════════════════════════════════════════════
//  entrada = { izq: bool, der: bool }
//  Devuelve nada: modifica la partida. Los sonidos del cuadro quedan en
//  p.eventos (se vacían al empezar el cuadro siguiente).
export function actualizar(p, dt, entrada = {}) {
  p.eventos = [];
  if (p.fase === "fin") return;
  dt = Math.max(0, Math.min(dt, 0.05)); // si el celu se trabó, no "teletransportamos" nada

  if (p.fase === "cuenta") {
    if (!p.sonoCuenta) {
      p.sonoCuenta = true;
      p.eventos.push("cuenta"); // el "pip" del 3
    }
    const antes = Math.ceil(p.cuenta);
    p.cuenta -= dt;
    const ahora = Math.ceil(p.cuenta);
    if (ahora !== antes) p.eventos.push(ahora > 0 ? "cuenta" : "ya");
    if (p.cuenta <= 0) {
      p.fase = "jugando";
      p.vel = VEL_INICIAL * 0.7;
      p.textos.push(texto(p, "¡YA!", ANCHO / 2, ALTO / 2, "#facc15", true));
    }
    return;
  }

  p.t += dt;
  const terminando = p.finEn !== null;

  // ── Velocidad: sube sola con el tiempo ──
  const objetivo = Math.min(VEL_MAXIMA, VEL_INICIAL + SUBE_POR_SEG * p.t);
  if (terminando) p.vel = Math.max(0, p.vel - 380 * dt);
  else p.vel += (objetivo - p.vel) * Math.min(1, 1.3 * dt);

  const avance = p.vel * dt;
  p.recorrido += avance;
  const metrosAntes = p.metros;
  p.metros = p.recorrido * METROS_POR_PX;
  if (!terminando) p.puntos += Math.floor(p.metros) - Math.floor(metrosAntes);

  moverJugador(p, dt, entrada, terminando);

  if (!terminando) {
    generar(p);
  }
  moverVehiculos(p, dt);
  moverItems(p, dt, avance);
  moverDecorado(p, avance);
  if (!terminando) {
    chequearChoques(p);
  }
  moverEfectos(p, dt);

  if (terminando && p.t >= p.finEn) {
    p.fase = "fin";
    p.eventos.push("fin");
  }
}

// ── Jugador ─────────────────────────────────────────────────────────────
function moverJugador(p, dt, entrada, terminando) {
  const j = p.jugador;
  const dir = terminando ? 0 : (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
  const velLateral = 140 + p.vel * 0.14; // más rápido = maniobra un poco más ágil
  j.vx += (dir * velLateral - j.vx) * Math.min(1, 16 * dt);
  j.x += j.vx * dt;
  const min = RUTA_IZQ + j.w / 2 + 2;
  const max = RUTA_DER - j.w / 2 - 2;
  if (j.x < min) { j.x = min; j.vx = 0; }
  if (j.x > max) { j.x = max; j.vx = 0; }
  j.giro = j.vx / velLateral; // para dibujarlo un poquito inclinado
}

// ── Qué sale en la ruta ─────────────────────────────────────────────────
function generar(p) {
  // Obras: primero se "reserva" el carril (no sale más tráfico ahí) y
  // cuando quedó vacío en pantalla, arrancan los conos.
  // Siempre en un carril de los COSTADOS: una obra en el medio partiría la
  // ruta en dos y te podría dejar encerrado.
  if (!p.obra && p.t > 18 && p.recorrido >= p.proximaObra) {
    const carril = p.azar() < 0.5 ? 0 : CARRILES - 1;
    p.obra = { carril, estado: "esperando", hasta: 0, proximoCono: 0 };
  }
  if (p.obra) {
    const o = p.obra;
    if (o.estado === "esperando") {
      const ocupado = p.vehiculos.some((v) => !v.chocado && v.y < ALTO + 30 && ocupaCarril(v, o.carril));
      if (!ocupado) {
        o.estado = "activa";
        o.hasta = p.recorrido + 520 + p.azar() * 260;
        o.proximoCono = p.recorrido;
        p.decorado.push({ tipo: "obras", x: o.carril < 2 ? 14 : ANCHO - 14, y: -18 });
      }
    } else if (p.recorrido >= o.hasta) {
      p.obra = null;
      p.proximaObra = p.recorrido + 2400 + p.azar() * 1800;
    } else {
      while (p.recorrido >= o.proximoCono) {
        p.items.push({ id: p.seq++, tipo: "cono", x: centroCarril(o.carril) + (p.azar() * 6 - 3), y: -8, w: 8, h: 8 });
        o.proximoCono += 30;
      }
    }
  }

  // Tráfico
  while (p.recorrido >= p.proximaFila) {
    generarFila(p);
    const sep = Math.max(46, 122 - p.t * 0.85);
    p.proximaFila += sep * (0.8 + p.azar() * 0.4);
  }

  // Monedas: una tirita de 3 en un carril libre
  if (p.recorrido >= p.proximaMoneda) {
    const libres = carrilesLibres(p, -160, 30);
    if (libres.length) {
      const c = libres[Math.floor(p.azar() * libres.length)];
      for (let k = 0; k < 3; k++) {
        p.items.push({ id: p.seq++, tipo: "moneda", x: centroCarril(c), y: -10 - k * 22, w: 10, h: 10 });
      }
    }
    p.proximaMoneda = p.recorrido + 520 + p.azar() * 520;
  }

  // Escudo (Cobertura total): de vez en cuando
  if (p.t > 12 && p.recorrido >= p.proximoEscudo) {
    const libres = carrilesLibres(p, -120, 30);
    if (libres.length) {
      const c = libres[Math.floor(p.azar() * libres.length)];
      p.items.push({ id: p.seq++, tipo: "escudo", x: centroCarril(c), y: -12, w: 12, h: 12 });
    }
    p.proximoEscudo = p.recorrido + 6500 + p.azar() * 3500;
  }

  // Decorado al costado (árboles y arbustos)
  if (p.recorrido >= p.proximoDecorado) {
    const izq = p.azar() < 0.5;
    const tipo = p.azar() < 0.62 ? "arbol" : "arbusto";
    const x = izq ? 5 + p.azar() * 18 : ANCHO - 5 - p.azar() * 18;
    p.decorado.push({ tipo, x, y: -16 });
    p.proximoDecorado = p.recorrido + 22 + p.azar() * 30;
  }
}

function ocupaCarril(v, carril) {
  if (v.carril === carril) return true;
  return v.destino === carril;
}

/* Carriles sin autos (ni obra) entre las alturas `desde` y `hasta` de la pantalla. */
function carrilesLibres(p, desde, hasta) {
  const libres = [];
  for (let c = 0; c < CARRILES; c++) {
    if (p.obra && p.obra.carril === c) continue;
    const ocupado =
      p.vehiculos.some((v) => !v.chocado && ocupaCarril(v, c) && v.y + v.h / 2 > desde && v.y - v.h / 2 < hasta) ||
      p.items.some((it) => it.tipo !== "cono" && carrilDe(it.x) === c && it.y > desde && it.y < hasta);
    if (!ocupado) libres.push(c);
  }
  return libres;
}

function generarFila(p) {
  const libres = carrilesLibres(p, -140, 34);
  if (libres.length <= 2) {
    // Con 2 libres o menos, no tapamos más: siempre queda por dónde pasar.
    return;
  }
  const doble = Math.min(0.42, 0.04 + p.t * 0.005);
  const cuantos = libres.length >= 4 && p.azar() < doble ? 2 : 1;
  for (let k = 0; k < cuantos; k++) {
    const i = Math.floor(p.azar() * libres.length);
    const carril = libres.splice(i, 1)[0];
    p.vehiculos.push(crearVehiculo(p, carril));
  }
}

function crearVehiculo(p, carril) {
  const r = p.azar();
  const probCamion = 0.1 + Math.min(0.06, p.t * 0.001);
  const probCambia = p.t < 12 ? 0 : Math.min(0.3, 0.04 + (p.t - 12) * 0.004);
  let tipo = "auto";
  if (r < probCamion) tipo = "camion";
  else if (r < probCamion + probCambia) tipo = "cambia";

  const camion = tipo === "camion";
  const w = camion ? 18 : 16;
  const h = camion ? 42 : 26;
  const f = camion ? 0.28 + p.azar() * 0.1 : 0.3 + p.azar() * 0.28;
  let color;
  if (camion) color = COLORES_CAMION[Math.floor(p.azar() * COLORES_CAMION.length)];
  else if (tipo === "cambia") color = COLOR_CAMBIA;
  else color = COLORES_AUTO[Math.floor(p.azar() * COLORES_AUTO.length)];

  return {
    id: p.seq++, tipo, carril, destino: null, aviso: 0, yaDecidio: false,
    x: centroCarril(carril), y: -h / 2 - 6, w, h, f, color,
    pasado: false, chocado: false, giro: 0, vx: 0, vy: 0,
  };
}

// ── Tráfico ─────────────────────────────────────────────────────────────
function moverVehiculos(p, dt) {
  const j = p.jugador;
  const vs = p.vehiculos;

  // ⚖️ REGLA DE JUSTICIA: el tráfico nunca arma una "pared".
  //   1) Nadie se "come" al de adelante en su carril: frena y lo sigue.
  //   2) Un auto no alcanza a otros que ya tapan 2 carriles a su misma
  //      altura: se queda atrás (baja igual de rápido que ellos).
  //   Así, a cualquier altura de la ruta quedan al menos 2 carriles libres
  //   (1 si hay obra). Difícil, pero siempre hay por dónde pasar.
  const ordenados = vs.filter((v) => !v.chocado).sort((a, b) => b.y - a.y); // de abajo hacia arriba
  for (const a of ordenados) {
    const cerca = [];
    for (const b of ordenados) {
      if (b === a || b.y <= a.y) continue;
      const dy = b.y - a.y;
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 2 && dy < (a.h + b.h) / 2 + 8) {
        if (a.f < b.f) a.f = b.f;
      } else if (dy < (a.h + b.h) / 2 + BANDA_AIRE) {
        cerca.push(b);
      }
    }
    if (cerca.length) {
      const tapados = new Set(carrilesDe(a));
      for (const b of cerca) carrilesDe(b).forEach((c) => tapados.add(c));
      if (p.obra && p.obra.estado === "activa") tapados.add(p.obra.carril);
      if (tapados.size >= 3) {
        for (const b of cerca) if (a.f < b.f) a.f = b.f;
      }
    }
  }

  for (const v of vs) {
    if (v.chocado) {
      // Sale despedido girando (choque o Cobertura total)
      v.x += v.vx * dt;
      v.y += v.vy * dt + p.vel * dt;
      v.giro += 9 * dt;
      continue;
    }
    const yAntes = v.y;
    v.y += p.vel * (1 - v.f) * dt;

    // 🟡 El amarillo se cruza a tu carril cuando le falta ~1,5 s para
    //    alcanzarte (una sola vez). Avisa con el guiño y se cruza rápido:
    //    así siempre te queda tiempo de verlo y esquivarlo.
    const falta = (j.y - v.y) / Math.max(1, p.vel * (1 - v.f));
    if (v.tipo === "cambia" && !v.yaDecidio && v.y > 0 && falta < 1.9 && falta > 1.0) {
      v.yaDecidio = true;
      const cj = carrilDe(j.x);
      if (cj !== v.carril) {
        const destino = v.carril + (cj > v.carril ? 1 : -1);
        if (destinoLibre(p, v, destino)) {
          v.destino = destino;
          v.aviso = 0.35; // guiño antes de moverse
        }
      }
    }
    if (v.destino !== null) {
      if (v.aviso > 0) {
        v.aviso -= dt;
      } else {
        const meta = centroCarril(v.destino);
        const paso = 90 * dt;
        if (Math.abs(meta - v.x) <= paso) {
          v.x = meta;
          v.carril = v.destino;
          v.destino = null;
        } else {
          v.x += Math.sign(meta - v.x) * paso;
        }
      }
    }

    // ¿Lo pasaste rozando? → ¡CASI!
    // Mientras están uno al lado del otro se mide el aire más chico que
    // quedó entre los dos. Cuando el auto ya quedó atrás, si ese aire fue
    // poquito (y no hubo toque) suma. Con escudo o titilando no cuenta.
    const alLado = Math.abs(v.y - j.y) < (v.h + j.h) / 2;
    if (alLado) {
      const aire = Math.abs(v.x - j.x) - (v.w + j.w) / 2;
      const valeCasi = p.t >= p.escudoHasta && p.t >= p.invulnerableHasta;
      v.minAire = Math.min(v.minAire ?? Infinity, valeCasi ? aire : Infinity);
    }
    if (!v.pasado && yAntes - v.h / 2 <= j.y + j.h / 2 && v.y - v.h / 2 > j.y + j.h / 2) {
      v.pasado = true;
      const aire = v.minAire ?? Infinity;
      if (p.finEn === null && aire > -2 && aire < MARGEN_CASI) {
        p.combo = p.t < p.comboHasta ? Math.min(COMBO_MAX, p.combo + 1) : 1;
        p.comboHasta = p.t + COMBO_SEG;
        const suma = PUNTOS_CASI * p.combo;
        p.puntos += suma;
        p.esquives += 1;
        p.eventos.push("casi");
        const txt = p.combo > 1 ? `+${suma} ¡CASI! x${p.combo}` : `+${suma} ¡CASI!`;
        p.textos.push(texto(p, txt, (v.x + j.x) / 2, j.y - 20, "#facc15"));
      }
    }
  }
  p.vehiculos = vs.filter((v) => v.y - v.h < ALTO + 20 && v.x > -40 && v.x < ANCHO + 40);
}

function carrilesDe(v) {
  return v.destino !== null && v.destino !== undefined ? [v.carril, v.destino] : [v.carril];
}

/* El amarillo solo se cruza si a su altura no hay nadie más (así no arma
   una pared con otro auto) y el carril de destino está libre. */
function destinoLibre(p, v, destino) {
  if (destino < 0 || destino >= CARRILES) return false;
  if (p.obra && p.obra.carril === destino) return false;
  return !p.vehiculos.some(
    (o) => o !== v && !o.chocado &&
      Math.abs(o.y - v.y) < (o.h + v.h) / 2 + (ocupaCarril(o, destino) ? 26 : BANDA_AIRE)
  );
}

// ── Monedas, escudos, conos y decorado ─────────────────────────────────
function moverItems(p, dt, avance) {
  for (const it of p.items) {
    it.y += avance;
    if (it.tipo !== "cono") it.brillo = (it.brillo || 0) + dt;
  }
  p.items = p.items.filter((it) => !it.tomado && it.y - it.h < ALTO + 10);
}

function moverDecorado(p, avance) {
  for (const d of p.decorado) d.y += avance;
  p.decorado = p.decorado.filter((d) => d.y < ALTO + 30);
}

// ── Choques ─────────────────────────────────────────────────────────────
function seTocan(a, b, margen) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - margen && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - margen;
}

function chequearChoques(p) {
  const j = p.jugador;
  const conEscudo = p.t < p.escudoHasta;
  const protegido = conEscudo || p.t < p.invulnerableHasta;

  for (const it of p.items) {
    if (it.tomado) continue;
    if (it.tipo === "moneda" && seTocan(j, it, -2)) {
      it.tomado = true;
      p.monedas += 1;
      p.puntos += PUNTOS_MONEDA;
      p.eventos.push("moneda");
      p.textos.push(texto(p, `+${PUNTOS_MONEDA}`, it.x, it.y - 8, "#fde047"));
      chispas(p, it.x, it.y, ["#fde047", "#facc15", "#ffffff"], 7);
    } else if (it.tipo === "escudo" && seTocan(j, it, -2)) {
      it.tomado = true;
      p.escudoHasta = p.t + ESCUDO_SEG;
      p.eventos.push("escudo");
      p.textos.push(texto(p, "¡COBERTURA TOTAL!", ANCHO / 2, ALTO * 0.42, "#38bdf8", true));
      chispas(p, it.x, it.y, ["#38bdf8", "#e0f2fe", "#ffffff"], 10);
    } else if (it.tipo === "cono" && seTocan(j, it, 1)) {
      if (conEscudo) {
        it.tomado = true;
        chispas(p, it.x, it.y, ["#fb923c", "#ffffff"], 6);
      } else if (!protegido) {
        it.tomado = true;
        siniestro(p, it.x, it.y);
        return;
      }
    }
  }

  for (const v of p.vehiculos) {
    if (v.chocado) continue;
    if (!seTocan(j, v, 2)) continue;
    if (conEscudo) {
      // 🛡️ Cobertura total: el otro sale volando y vos seguís.
      despedir(p, v);
      p.puntos += PUNTOS_BANQUINA;
      p.eventos.push("banquina");
      p.textos.push(texto(p, `+${PUNTOS_BANQUINA}`, v.x, v.y - 14, "#38bdf8"));
      continue;
    }
    if (protegido) continue;
    despedir(p, v);
    siniestro(p, (v.x + j.x) / 2, (v.y + j.y) / 2);
    return;
  }
}

function despedir(p, v) {
  v.chocado = true;
  const lado = v.x < p.jugador.x ? -1 : 1;
  v.vx = lado * (70 + p.azar() * 50);
  v.vy = -(40 + p.azar() * 40);
  chispas(p, v.x, v.y, ["#f97316", "#facc15", "#94a3b8", "#ffffff"], 12);
}

function siniestro(p, x, y) {
  p.vidas -= 1;
  p.siniestros += 1;
  p.combo = 0;
  p.eventos.push("choque");
  p.temblor = 0.35;
  p.vel *= 0.4;
  p.invulnerableHasta = p.t + INVULNERABLE_SEG;
  chispas(p, x, y, ["#ef4444", "#f97316", "#facc15", "#6b7280", "#ffffff"], 22);
  if (p.vidas <= 0) {
    p.vidas = 0;
    p.finEn = p.t + FIN_DEMORA;
    // 🕹️ GAME OVER quieto en el medio de la ruta (la pantalla se oscurece de a poco)
    const quieto = { fijo: true, vida: FIN_DEMORA + 1 };
    p.textos.push(texto(p, "GAME OVER", ANCHO / 2, ALTO * 0.4, "#ef4444", true, { ...quieto, gigante: true }));
    p.textos.push(texto(p, "¡TE DIERON DE BAJA!", ANCHO / 2, ALTO * 0.4 + 24, "#facc15", false, quieto));
  } else {
    p.textos.push(texto(p, "¡SINIESTRO!", ANCHO / 2, ALTO * 0.4, "#f87171", true));
  }
}

// ── Efectos (partículas, cartelitos, sacudón) ──────────────────────────
function chispas(p, x, y, colores, n) {
  for (let i = 0; i < n; i++) {
    const ang = p.azar() * Math.PI * 2;
    const rap = 30 + p.azar() * 110;
    p.particulas.push({
      x, y,
      vx: Math.cos(ang) * rap,
      vy: Math.sin(ang) * rap,
      vida: 0.45 + p.azar() * 0.55,
      max: 1,
      color: colores[Math.floor(p.azar() * colores.length)],
      tam: 1.5 + p.azar() * 2.5,
    });
  }
}

function texto(p, txt, x, y, color, grande = false, extra = {}) {
  return { id: p.seq++, txt, x, y, color, grande, vida: grande ? 1.3 : 0.9, ...extra };
}

function moverEfectos(p, dt) {
  for (const q of p.particulas) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 1 - Math.min(1, 3 * dt);
    q.vy *= 1 - Math.min(1, 3 * dt);
    q.vida -= dt;
  }
  p.particulas = p.particulas.filter((q) => q.vida > 0);
  for (const t of p.textos) {
    if (!t.fijo) t.y -= (t.grande ? 10 : 24) * dt;
    t.vida -= dt;
  }
  p.textos = p.textos.filter((t) => t.vida > 0);
  if (p.temblor > 0) p.temblor = Math.max(0, p.temblor - dt);
}
