// src/components/juego/sonido.js
//
// 🔊 SINIESTRO CERO — sonidos de 8 bits hechos con el navegador (sin archivos).
//
// Arranca APAGADO: en la oficina un ruido de golpe molesta. Se prende con el
// botón del parlante y la app se acuerda la elección en ese dispositivo.
//
// Uso:
//   const s = crearSonido();
//   s.activar(true);        // después de un toque del usuario (regla del navegador)
//   s.evento("moneda");     // moneda, casi, choque, escudo, cuenta, ya, fin, banquina
//                           // y los del menú: menu (elegir), start (ficha), error, record
//   s.motor(vel);           // zumbido del motor según la velocidad (0 = apagado)
//   s.cerrar();

export function crearSonido() {
  let ac = null;
  let activo = false;
  let motor = null;
  let ganMotor = null;

  function asegurar() {
    if (typeof window === "undefined") return null;
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ac = new AC();
      } catch {
        return null;
      }
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }

  function beep(freq, dur, { tipo = "square", vol = 0.045, despues = 0, freqFin = null } = {}) {
    const c = asegurar();
    if (!c) return;
    const t0 = c.currentTime + despues;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0);
    if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  function ruido(dur, vol = 0.14) {
    const c = asegurar();
    if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f);
    f.connect(g);
    g.connect(c.destination);
    s.start();
  }

  function pararMotor() {
    if (!motor) return;
    try { motor.stop(); } catch { /* ya estaba parado */ }
    try { motor.disconnect(); } catch { /* nada */ }
    motor = null;
    ganMotor = null;
  }

  return {
    activar(si) {
      activo = !!si;
      if (activo) asegurar();
      else pararMotor();
    },

    evento(nombre) {
      if (!activo) return;
      switch (nombre) {
        case "cuenta": beep(440, 0.12); break;
        case "ya": beep(880, 0.3); break;
        case "moneda": beep(988, 0.06); beep(1319, 0.14, { despues: 0.06 }); break;
        case "casi": beep(660, 0.05, { vol: 0.03 }); beep(990, 0.08, { despues: 0.05, vol: 0.03 }); break;
        case "escudo": [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.1, { despues: i * 0.07, vol: 0.04 })); break;
        case "banquina": beep(260, 0.12, { tipo: "sawtooth", freqFin: 90, vol: 0.05 }); break;
        case "choque": ruido(0.5); beep(170, 0.45, { tipo: "sawtooth", freqFin: 45, vol: 0.06 }); break;
        case "fin":
          // "tu-ru-ru-ruuu" de game over... y enseguida suena el teléfono (es Mariano)
          [392, 330, 262, 196].forEach((f, i) => beep(f, 0.2, { despues: 0.1 + i * 0.17, vol: 0.05 }));
          [1.05, 1.75].forEach((desde) => {
            for (let k = 0; k < 8; k++) beep(k % 2 ? 1047 : 1319, 0.05, { despues: desde + k * 0.05, vol: 0.03 });
          });
          break;
        // ── Menú del fichín ──
        case "menu": beep(880, 0.04, { vol: 0.03 }); beep(1320, 0.05, { despues: 0.04, vol: 0.03 }); break;
        case "start": [523, 784, 1047, 1568].forEach((f, i) => beep(f, 0.08, { despues: i * 0.06, vol: 0.04 })); break;
        case "error": beep(150, 0.2, { tipo: "sawtooth", vol: 0.05 }); break;
        case "record":
          // fanfarria (arranca un toque después, cuando ya terminó el teléfono)
          [659, 784, 988, 1319, 988, 1319].forEach((f, i) => beep(f, 0.1, { despues: 0.9 + i * 0.1, vol: 0.04 }));
          break;
        default: break;
      }
    },

    motor(vel) {
      if (!activo || !vel) {
        if (ganMotor && ac) ganMotor.gain.setTargetAtTime(0, ac.currentTime, 0.05);
        if (!activo) pararMotor();
        return;
      }
      const c = asegurar();
      if (!c) return;
      if (!motor) {
        motor = c.createOscillator();
        motor.type = "sawtooth";
        const filtro = c.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.value = 520;
        ganMotor = c.createGain();
        ganMotor.gain.value = 0;
        motor.connect(filtro);
        filtro.connect(ganMotor);
        ganMotor.connect(c.destination);
        motor.start();
      }
      motor.frequency.setTargetAtTime(55 + vel * 0.3, c.currentTime, 0.08);
      ganMotor.gain.setTargetAtTime(0.035, c.currentTime, 0.1);
    },

    cerrar() {
      pararMotor();
      activo = false;
      // Se cierra un rato después: si no, se cortan los sonidos que quedaron
      // sonando (el game over y el teléfono suenan cuando la partida ya cerró).
      const viejo = ac;
      ac = null;
      if (viejo) setTimeout(() => { try { viejo.close(); } catch { /* nada */ } }, 3500);
    },
  };
}
