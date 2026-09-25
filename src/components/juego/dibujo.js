// src/components/juego/dibujo.js
//
// 🎨 SINIESTRO CERO — el dibujo (estilo 8 bits, como la Family).
//
// Recibe la partida (motor.js) y la pinta en un <canvas>. No decide nada del
// juego: solo mira el estado y dibuja. Todo va en píxeles lógicos (180 x 300);
// el componente ya dejó el canvas escalado al tamaño real de la pantalla.

import {
  ANCHO, ALTO, RUTA_IZQ, RUTA_DER, CARRILES, CARRIL, FIN_DEMORA,
} from "./motor.js";

const PASTO = "#3f9b3a";
const PASTO_OSC = "#37893a";
const TIERRA = "#8b6b3d";
const ASFALTO = "#535963";
const ASFALTO_OSC = "#4b515a";
const LINEA = "#e5e7eb";
const CORDON_ROJO = "#d63a2f";
const CORDON_BLANCO = "#f3f4f6";
const AUTO_JUGADOR = "#dc1f26"; // el rojo de THAMES, un poco más vivo para que se vea

const _oscuros = new Map();
function oscurecer(hex, cuanto = 0.28) {
  const k = hex + cuanto;
  if (_oscuros.has(k)) return _oscuros.get(k);
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - cuanto;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  const out = `rgb(${r},${g},${b})`;
  _oscuros.set(k, out);
  return out;
}

const R = Math.round;

// ── La ruta ──────────────────────────────────────────────────────────────
function dibujarRuta(ctx, p) {
  // Pasto con franjas que corren (sensación de velocidad)
  ctx.fillStyle = PASTO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = PASTO_OSC;
  const offP = p.recorrido % 48;
  for (let y = -48 + offP; y < ALTO; y += 48) {
    ctx.fillRect(0, R(y), RUTA_IZQ - 6, 24);
    ctx.fillRect(RUTA_DER + 6, R(y), ANCHO - RUTA_DER - 6, 24);
  }
  // Banquina de tierra
  ctx.fillStyle = TIERRA;
  ctx.fillRect(RUTA_IZQ - 6, 0, 2, ALTO);
  ctx.fillRect(RUTA_DER + 4, 0, 2, ALTO);

  // Asfalto
  ctx.fillStyle = ASFALTO;
  ctx.fillRect(RUTA_IZQ, 0, RUTA_DER - RUTA_IZQ, ALTO);
  // Manchitas del asfalto (también corren)
  ctx.fillStyle = ASFALTO_OSC;
  const offA = p.recorrido % 90;
  for (let y = -90 + offA; y < ALTO; y += 90) {
    ctx.fillRect(RUTA_IZQ + 9, R(y), 5, 2);
    ctx.fillRect(RUTA_IZQ + 61, R(y + 37), 6, 2);
    ctx.fillRect(RUTA_IZQ + 88, R(y + 61), 4, 2);
    ctx.fillRect(RUTA_IZQ + 36, R(y + 74), 3, 2);
  }

  // Obra: el carril cerrado se pinta a rayas
  if (p.obra && p.obra.estado === "activa") {
    const x = RUTA_IZQ + p.obra.carril * CARRIL;
    ctx.fillStyle = "rgba(249,115,22,0.10)";
    ctx.fillRect(x, 0, CARRIL, ALTO);
  }

  // Cordones rojo y blanco (como el Road Fighter)
  const offC = p.recorrido % 16;
  for (let y = -16 + offC, i = 0; y < ALTO; y += 8, i++) {
    ctx.fillStyle = i % 2 ? CORDON_ROJO : CORDON_BLANCO;
    ctx.fillRect(RUTA_IZQ - 4, R(y), 4, 8);
    ctx.fillRect(RUTA_DER, R(y), 4, 8);
  }

  // Líneas de los carriles (discontinuas)
  ctx.fillStyle = LINEA;
  const offL = p.recorrido % 32;
  for (let c = 1; c < CARRILES; c++) {
    const x = RUTA_IZQ + c * CARRIL - 1;
    for (let y = -32 + offL; y < ALTO; y += 32) ctx.fillRect(x, R(y), 2, 16);
  }
}

// ── Decorado (árboles, arbustos, cartel de obras) ────────────────────────
function dibujarDecorado(ctx, p) {
  for (const d of p.decorado) {
    const x = R(d.x), y = R(d.y);
    if (d.tipo === "arbol") {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath(); ctx.arc(x + 2, y + 3, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#14532d";
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f7a3a";
      ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(x - 3, y - 4, 2, 2);
    } else if (d.tipo === "arbusto") {
      ctx.fillStyle = "#166534";
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#22a04b";
      ctx.fillRect(x - 2, y - 2, 2, 2);
    } else if (d.tipo === "obras") {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x - 1, y + 4, 2, 8);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(x - 12, y - 5, 24, 10);
      ctx.fillStyle = "#111827";
      ctx.font = "bold 6px ui-monospace, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("OBRAS", x, y + 0.5);
    }
  }
}

// ── Autos ────────────────────────────────────────────────────────────────
function dibujarAuto(ctx, v, color, { jugador = false, guinio = 0 } = {}) {
  const { w, h } = v;
  ctx.save();
  ctx.translate(R(v.x), R(v.y));
  if (v.giro) ctx.rotate(jugador ? v.giro * 0.14 : v.giro);
  const x0 = -w / 2, y0 = -h / 2;

  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x0 + 2, y0 + 3, w, h);
  // ruedas
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x0 - 1, y0 + 4, 3, 6);
  ctx.fillRect(x0 + w - 2, y0 + 4, 3, 6);
  ctx.fillRect(x0 - 1, y0 + h - 10, 3, 6);
  ctx.fillRect(x0 + w - 2, y0 + h - 10, 3, 6);
  // carrocería
  ctx.fillStyle = color;
  ctx.fillRect(x0 + 1, y0, w - 2, h);
  ctx.fillRect(x0, y0 + 2, w, h - 4);
  // techo
  ctx.fillStyle = oscurecer(color, 0.3);
  ctx.fillRect(x0 + 3, y0 + 10, w - 6, 9);
  // parabrisas y luneta
  ctx.fillStyle = "#bfe3ff";
  ctx.fillRect(x0 + 3, y0 + 6, w - 6, 4);
  ctx.fillStyle = "#86bde6";
  ctx.fillRect(x0 + 3, y0 + h - 7, w - 6, 3);
  // faros y luces traseras
  ctx.fillStyle = "#fff7c2";
  ctx.fillRect(x0 + 2, y0, 3, 1);
  ctx.fillRect(x0 + w - 5, y0, 3, 1);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x0 + 1, y0 + h - 1, 3, 1);
  ctx.fillRect(x0 + w - 4, y0 + h - 1, 3, 1);
  if (jugador) {
    // franjas blancas de carrera
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-1, y0 + 1, 2, 5);
    ctx.fillRect(-1, y0 + 11, 2, 7);
    ctx.fillRect(-1, y0 + h - 4, 2, 3);
  }
  if (guinio) {
    // guiño naranja del lado al que se va a cruzar
    ctx.fillStyle = "#fb923c";
    const lx = guinio < 0 ? x0 - 1 : x0 + w - 1;
    ctx.fillRect(lx, y0 + 1, 2, 3);
    ctx.fillRect(lx, y0 + h - 4, 2, 3);
  }
  ctx.restore();
}

function dibujarCamion(ctx, v) {
  const { w, h } = v;
  ctx.save();
  ctx.translate(R(v.x), R(v.y));
  if (v.giro) ctx.rotate(v.giro);
  const x0 = -w / 2, y0 = -h / 2;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(x0 + 2, y0 + 3, w, h);
  ctx.fillStyle = "#0f172a";
  for (const yy of [y0 + 3, y0 + 17, y0 + h - 9]) {
    ctx.fillRect(x0 - 1, yy, 3, 6);
    ctx.fillRect(x0 + w - 2, yy, 3, 6);
  }
  // cabina (adelante = arriba)
  ctx.fillStyle = v.color;
  ctx.fillRect(x0, y0, w, 11);
  ctx.fillStyle = "#bfe3ff";
  ctx.fillRect(x0 + 2, y0 + 2, w - 4, 3);
  ctx.fillStyle = "#fff7c2";
  ctx.fillRect(x0 + 1, y0, 3, 1);
  ctx.fillRect(x0 + w - 4, y0, 3, 1);
  // acoplado
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(x0, y0 + 12, w, h - 12);
  ctx.fillStyle = "#cbd5e1";
  for (let yy = y0 + 15; yy < y0 + h - 2; yy += 5) ctx.fillRect(x0 + 1, yy, w - 2, 1);
  ctx.fillStyle = oscurecer(v.color, 0.1);
  ctx.fillRect(x0, y0 + 12, w, 2);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x0 + 1, y0 + h - 1, 3, 1);
  ctx.fillRect(x0 + w - 4, y0 + h - 1, 3, 1);
  ctx.restore();
}

// ── Monedas, escudos y conos ─────────────────────────────────────────────
function dibujarItems(ctx, p, reloj) {
  for (const it of p.items) {
    if (it.tomado) continue;
    const x = R(it.x), y = R(it.y);
    if (it.tipo === "cono") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x - 3, y - 2, 8, 8);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(x - 1, y - 1, 2, 2);
    } else if (it.tipo === "moneda") {
      // Moneda que gira (se "aplana" como si rotara)
      const giro = Math.abs(Math.cos((it.brillo || 0) * 5 + it.id));
      const rx = Math.max(1.2, 5 * giro);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2, rx, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ca8a04";
      ctx.beginPath(); ctx.ellipse(x, y, rx, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.8, rx - 1.2), 3.8, 0, 0, Math.PI * 2); ctx.fill();
      if (giro > 0.55) {
        ctx.fillStyle = "#854d0e";
        ctx.font = "bold 7px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", x, y + 0.5);
      }
    } else if (it.tipo === "escudo") {
      const pulso = 1 + Math.sin(reloj * 8) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulso, pulso);
      ctx.fillStyle = "rgba(56,189,248,0.25)";
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      escudoForma(ctx, 0, 0, 1);
      ctx.fillStyle = "#0ea5e9";
      ctx.fill();
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(-0.6, 2); ctx.lineTo(2.6, -2.2); ctx.stroke();
      ctx.restore();
    }
  }
}

function escudoForma(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - 6 * s);
  ctx.lineTo(x + 5 * s, y - 4 * s);
  ctx.lineTo(x + 5 * s, y + 1 * s);
  ctx.quadraticCurveTo(x + 5 * s, y + 5 * s, x, y + 7 * s);
  ctx.quadraticCurveTo(x - 5 * s, y + 5 * s, x - 5 * s, y + 1 * s);
  ctx.lineTo(x - 5 * s, y - 4 * s);
  ctx.closePath();
}

// ── Efectos ─────────────────────────────────────────────────────────────
function dibujarParticulas(ctx, p) {
  for (const q of p.particulas) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.vida / 0.5));
    ctx.fillStyle = q.color;
    const t = q.tam;
    ctx.fillRect(q.x - t / 2, q.y - t / 2, t, t);
  }
  ctx.globalAlpha = 1;
}

function dibujarTextos(ctx, p) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  for (const t of p.textos) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.vida / 0.35));
    ctx.font = t.gigante
      ? "900 25px ui-monospace, Menlo, Consolas, monospace"
      : t.grande
        ? "900 15px ui-monospace, Menlo, Consolas, monospace"
        : "bold 8px ui-monospace, Menlo, Consolas, monospace";
    ctx.lineWidth = t.gigante ? 6 : t.grande ? 4 : 2.5;
    ctx.strokeStyle = "rgba(15,23,42,0.85)";
    ctx.strokeText(t.txt, t.x, t.y);
    if (t.gigante) {
      // sombra amarilla corrida, como los carteles de los fichines
      ctx.fillStyle = "#facc15";
      ctx.fillText(t.txt, t.x + 1.5, t.y + 1.5);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function dibujarCuenta(ctx, p) {
  const n = Math.ceil(p.cuenta);
  if (n <= 0) return;
  const frac = p.cuenta - Math.floor(p.cuenta); // 1 → 0 dentro de cada segundo
  const escala = 0.8 + frac * 0.5;
  ctx.fillStyle = "rgba(15,23,42,0.55)";
  ctx.beginPath(); ctx.arc(ANCHO / 2, ALTO / 2 - 10, 26, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(ANCHO / 2, ALTO / 2 - 9);
  ctx.scale(escala, escala);
  ctx.font = "900 30px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#facc15";
  ctx.fillText(String(n), 0, 0);
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════
//  DIBUJAR TODO
// ════════════════════════════════════════════════════════════════════════
//  reloj = segundos reales (para titilar y hacer latir cosas).
export function dibujarPartida(ctx, p, reloj = 0) {
  ctx.save();
  if (p.temblor > 0) {
    const a = 3.2 * (p.temblor / 0.35);
    ctx.translate((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
  }
  dibujarRuta(ctx, p);
  dibujarDecorado(ctx, p);
  dibujarItems(ctx, p, reloj);

  for (const v of p.vehiculos) {
    if (v.tipo === "camion") {
      dibujarCamion(ctx, v);
    } else {
      const guinio = v.destino !== null && v.destino !== undefined && Math.floor(reloj * 8) % 2 === 0
        ? (v.destino < v.carril ? -1 : 1)
        : 0;
      dibujarAuto(ctx, v, v.color, { guinio });
    }
  }

  // Tu auto (titila si recién tuviste un siniestro)
  const j = p.jugador;
  const titila = p.t < p.invulnerableHasta && p.finEn === null && Math.floor(reloj * 12) % 2 === 1;
  if (!titila) dibujarAuto(ctx, j, AUTO_JUGADOR, { jugador: true });

  // 🛡️ Cobertura total: burbuja celeste alrededor
  if (p.t < p.escudoHasta) {
    const resta = p.escudoHasta - p.t;
    const mostrar = resta > 1.2 || Math.floor(reloj * 10) % 2 === 0;
    if (mostrar) {
      ctx.strokeStyle = "rgba(56,189,248,0.95)";
      ctx.fillStyle = "rgba(56,189,248,0.16)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(R(j.x), R(j.y), j.w / 2 + 6 + Math.sin(reloj * 10), j.h / 2 + 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  dibujarParticulas(ctx, p);

  // GAME OVER: la ruta se va oscureciendo mientras se muestra el cartel
  if (p.finEn !== null) {
    const avance = Math.max(0, Math.min(1, 1 - (p.finEn - p.t) / FIN_DEMORA));
    ctx.fillStyle = `rgba(2,6,23,${(0.62 * avance).toFixed(3)})`;
    ctx.fillRect(-10, -10, ANCHO + 20, ALTO + 20);
  }

  dibujarTextos(ctx, p);
  if (p.fase === "cuenta") dibujarCuenta(ctx, p);
  ctx.restore();
}
