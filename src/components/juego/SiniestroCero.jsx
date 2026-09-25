/* src/components/juego/SiniestroCero.jsx
 *
 * 🚗 SINIESTRO CERO — la pantalla donde se juega (canvas + controles).
 *
 * Arma la partida (motor.js), la dibuja (dibujo.js) 60 veces por segundo y
 * lee los controles:
 *   · Compu: flechas ← → (o A / D). P, Espacio o Esc = pausa.
 *   · Celu:  tocá y mantené la mitad IZQUIERDA o DERECHA de la ruta,
 *            o los botones grandes de abajo.
 *
 * Cuando termina la partida llama a onTerminar(resultado) UNA sola vez.
 * Se pausa sola si cambiás de pestaña o de ventana, o si algo tapa la ruta
 * (por ejemplo el aviso de cierre de caja o el menú del celu).
 *
 * Props:
 *   sonido          → true/false (parlante prendido)
 *   recordPersonal  → tu mejor puntaje (si lo pasás, sale "¡NUEVO RÉCORD!")
 *   onTerminar      → (resultado) => void   { puntos, metros, segundos, esquives, monedas, siniestros }
 *   onAbandonar → () => void            (desde la pausa; no se guarda nada)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { HiPause, HiPlay, HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { FaCar } from "react-icons/fa";
import { ANCHO, ALTO, VIDAS, actualizar, anunciar, crearPartida, kmh, resultado } from "./motor";
import { dibujarPartida } from "./dibujo";
import { crearSonido } from "./sonido";

const fmt = (n) => Number(n || 0).toLocaleString("es-AR");

const BOTONES = [
  { lado: "izq", icono: HiChevronLeft, texto: "Izquierda" },
  { lado: "der", icono: HiChevronRight, texto: "Derecha" },
];

// ¿Es un celu/tablet? (dedo como puntero principal, o pantalla táctil chica)
function esTactil() {
  try {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    return (navigator.maxTouchPoints || 0) > 0 && window.innerWidth < 1024;
  } catch {
    return false;
  }
}

export default function SiniestroCero({ sonido = false, recordPersonal = 0, onTerminar, onAbandonar }) {
  const cajaRef = useRef(null);
  const lienzoRef = useRef(null);
  const partidaRef = useRef(null);

  // Controles: teclado + dedos sobre la ruta + botones de abajo
  const entradaRef = useRef({ izq: false, der: false });
  const teclasRef = useRef({ izq: false, der: false });
  const botonesRef = useRef({ izq: false, der: false });
  const dedosRef = useRef(new Map()); // pointerId → "izq" | "der"

  const pausaRef = useRef(false);
  const [pausa, setPausa] = useState(false);
  const [hud, setHud] = useState({ puntos: 0, vidas: VIDAS, kmh: 0, km: "0,0", escudo: 0, combo: 0 });
  const [tactil] = useState(esTactil);

  const sonidoRef = useRef(null);
  const onTerminarRef = useRef(onTerminar);
  onTerminarRef.current = onTerminar;
  const recordRef = useRef(recordPersonal); // se fija al arrancar la partida

  const recalcularEntrada = useCallback(() => {
    let izq = teclasRef.current.izq || botonesRef.current.izq;
    let der = teclasRef.current.der || botonesRef.current.der;
    for (const lado of dedosRef.current.values()) {
      if (lado === "izq") izq = true;
      else der = true;
    }
    entradaRef.current = { izq, der };
  }, []);

  const ponerPausa = useCallback((si) => {
    const p = partidaRef.current;
    if (si && (!p || p.fase === "fin")) return;
    pausaRef.current = si;
    setPausa(si);
    // Al pausar se "sueltan" todos los controles (si no, al volver sigue doblando).
    teclasRef.current = { izq: false, der: false };
    botonesRef.current = { izq: false, der: false };
    dedosRef.current.clear();
    entradaRef.current = { izq: false, der: false };
  }, []);

  // 🔊 Sonido
  useEffect(() => {
    if (!sonidoRef.current) sonidoRef.current = crearSonido();
    sonidoRef.current.activar(sonido);
  }, [sonido]);
  useEffect(() => () => sonidoRef.current?.cerrar(), []);

  // ⌨️ Teclado
  useEffect(() => {
    const lado = (k) => {
      if (k === "ArrowLeft" || k === "a" || k === "A") return "izq";
      if (k === "ArrowRight" || k === "d" || k === "D") return "der";
      return null;
    };
    const abajo = (e) => {
      const l = lado(e.key);
      if (l) {
        e.preventDefault();
        if (!pausaRef.current) {
          teclasRef.current[l] = true;
          recalcularEntrada();
        }
        return;
      }
      if (e.key === "p" || e.key === "P" || e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        if (e.repeat) return; // dejar la tecla apretada no hace titilar la pausa
        ponerPausa(!pausaRef.current);
      }
    };
    const arriba = (e) => {
      const l = lado(e.key);
      if (l) {
        teclasRef.current[l] = false;
        recalcularEntrada();
      }
    };
    window.addEventListener("keydown", abajo);
    window.addEventListener("keyup", arriba);
    return () => {
      window.removeEventListener("keydown", abajo);
      window.removeEventListener("keyup", arriba);
    };
  }, [ponerPausa, recalcularEntrada]);

  // ⏸️ Pausa sola si cambiás de pestaña o de ventana
  useEffect(() => {
    const alOcultar = () => { if (document.hidden) ponerPausa(true); };
    const alSalir = () => ponerPausa(true);
    document.addEventListener("visibilitychange", alOcultar);
    window.addEventListener("blur", alSalir);
    return () => {
      document.removeEventListener("visibilitychange", alOcultar);
      window.removeEventListener("blur", alSalir);
    };
  }, [ponerPausa]);

  // 🎬 El bucle del juego
  useEffect(() => {
    const lienzo = lienzoRef.current;
    const ctx = lienzo.getContext("2d");
    const p = crearPartida();
    partidaRef.current = p;
    let raf = 0;
    let ultimo = performance.now();
    let hudEn = 0;
    let avisado = false;
    let recordAvisado = !(recordRef.current > 0);
    let revisarEn = 0.5;
    let escala = 0;

    // ¿Algo tapa la ruta? (un aviso que aparece encima, el menú del celu...)
    const tapada = () => {
      const caja = cajaRef.current;
      if (!caja) return false;
      const r = caja.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (!r.width || x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
      const arriba = document.elementFromPoint(x, y);
      return !!arriba && !caja.contains(arriba);
    };

    // El canvas se dibuja en alta resolución (nítido en cualquier celu).
    const ajustar = () => {
      const r = lienzo.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const e = Math.max(2, Math.min(6, Math.round(((r.width || ANCHO * 2) * dpr) / ANCHO)));
      if (e !== escala) {
        escala = e;
        lienzo.width = ANCHO * e;
        lienzo.height = ALTO * e;
      }
    };
    ajustar();
    let observador = null;
    if (typeof ResizeObserver !== "undefined") {
      observador = new ResizeObserver(ajustar);
      observador.observe(lienzo);
    }

    const cuadro = (ahora) => {
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, Math.max(0, (ahora - ultimo) / 1000));
      ultimo = ahora;
      if (!pausaRef.current) actualizar(p, dt, entradaRef.current);
      revisarEn -= dt;
      if (revisarEn <= 0) {
        revisarEn = 0.4;
        if (!pausaRef.current && p.fase !== "fin" && tapada()) ponerPausa(true);
      }
      if (!recordAvisado && p.finEn === null && p.puntos > recordRef.current) {
        recordAvisado = true;
        anunciar(p, "¡NUEVO RÉCORD!");
        p.eventos.push("escudo"); // el mismo "tururú" de festejo
      }

      const s = sonidoRef.current;
      if (s) {
        for (const ev of p.eventos) s.evento(ev);
        const andando = !pausaRef.current && p.fase === "jugando" && p.finEn === null;
        s.motor(andando ? p.vel : 0);
      }
      p.eventos = []; // ya sonaron: que no se repitan si queda en pausa

      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.imageSmoothingEnabled = false;
      dibujarPartida(ctx, p, ahora / 1000);

      hudEn -= dt;
      if (hudEn <= 0) {
        hudEn = 0.08;
        setHud({
          puntos: Math.floor(p.puntos),
          vidas: p.vidas,
          kmh: p.fase === "jugando" ? kmh(p.vel) : 0,
          km: (p.metros / 1000).toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          escudo: Math.max(0, Math.ceil(p.escudoHasta - p.t)),
          combo: p.t < p.comboHasta ? p.combo : 0,
        });
      }
      if (p.fase === "fin" && !avisado) {
        avisado = true;
        onTerminarRef.current?.(resultado(p));
      }
    };
    raf = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(raf);
      if (observador) observador.disconnect();
      sonidoRef.current?.motor(0);
    };
  }, [ponerPausa]);

  // 👆 Dedos (o mouse) sobre la ruta: mitad izquierda / mitad derecha
  const ladoDelToque = (e) => {
    const r = cajaRef.current?.getBoundingClientRect();
    if (!r) return "izq";
    return e.clientX - r.left < r.width / 2 ? "izq" : "der";
  };
  const alTocar = (e) => {
    if (pausaRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dedosRef.current.set(e.pointerId, ladoDelToque(e));
    try { cajaRef.current?.setPointerCapture(e.pointerId); } catch { /* nada */ }
    recalcularEntrada();
  };
  const alMover = (e) => {
    if (!dedosRef.current.has(e.pointerId)) return;
    dedosRef.current.set(e.pointerId, ladoDelToque(e));
    recalcularEntrada();
  };
  const alSoltar = (e) => {
    if (!dedosRef.current.delete(e.pointerId)) return;
    recalcularEntrada();
  };

  // Botones grandes de abajo (celu)
  const boton = (lado, apretado) => (e) => {
    e.preventDefault();
    if (pausaRef.current) return;
    botonesRef.current[lado] = apretado;
    recalcularEntrada();
  };

  return (
    <div className="flex w-full flex-col items-center select-none">
      <div
        ref={cajaRef}
        className="relative w-full overflow-hidden rounded-xl border border-black/40 bg-[#3f9b3a] shadow-lg"
        style={{
          aspectRatio: `${ANCHO} / ${ALTO}`,
          // Que entre en la pantalla, pero nunca tan chica que no se pueda jugar
          // (celu acostado: queda de 360 px de alto y se scrollea).
          maxHeight: tactil ? "max(360px, calc(100dvh - 250px))" : "max(360px, calc(100dvh - 190px))",
          maxWidth: tactil ? "max(216px, calc((100dvh - 250px) * 0.6))" : "max(216px, calc((100dvh - 190px) * 0.6))",
          touchAction: "none",
        }}
        onPointerDown={alTocar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onLostPointerCapture={alSoltar}
        onContextMenu={(e) => e.preventDefault()}
        data-testid="juego-ruta"
      >
        <canvas ref={lienzoRef} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />

        {/* HUD: puntos · vidas · velocidad */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-linear-to-b from-black/70 to-transparent px-2.5 pb-4 pt-2 font-mono text-white">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-white/70">Puntos</div>
            <div className="text-[17px] font-black leading-none tabular-nums" data-testid="juego-puntos">{fmt(hud.puntos)}</div>
            {recordRef.current > 0 && (
              <div className="mt-0.5 text-[9px] font-semibold text-white/60">Récord {fmt(recordRef.current)}</div>
            )}
            {hud.combo > 1 && (
              <div className="mt-0.5 text-[10px] font-bold text-yellow-300">¡CASI! x{hud.combo}</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1" aria-label={`${hud.vidas} vidas`} data-testid="juego-vidas">
              {Array.from({ length: VIDAS }).map((_, i) => (
                <FaCar key={i} className={`text-[13px] ${i < hud.vidas ? "text-red-500" : "text-white/25"}`} />
              ))}
            </div>
            {hud.escudo > 0 && (
              <div className="rounded bg-sky-500/90 px-1.5 text-[9px] font-bold uppercase">Cobertura {hud.escudo}s</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[15px] font-black leading-none tabular-nums">{hud.kmh}<span className="ml-0.5 text-[9px] font-semibold text-white/70">km/h</span></div>
            <div className="mt-0.5 text-[10px] font-semibold tabular-nums text-white/80">{hud.km} km</div>
          </div>
        </div>

        {/* Pausa */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => ponerPausa(!pausaRef.current)}
          className="absolute bottom-2 right-2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          aria-label={pausa ? "Seguir" : "Pausa"}
          data-testid="juego-pausa"
        >
          {pausa ? <HiPlay className="text-lg" /> : <HiPause className="text-lg" />}
        </button>

        {pausa && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65 px-6 text-center text-white backdrop-blur-[2px]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="font-mono text-2xl font-black tracking-widest">PAUSA</div>
            <button
              type="button"
              onClick={() => ponerPausa(false)}
              className="w-44 rounded-lg bg-marca py-3 text-[15px] font-semibold text-white hover:brightness-110"
            >
              Seguir
            </button>
            {onAbandonar && (
              <button
                type="button"
                onClick={onAbandonar}
                className="w-44 rounded-lg border border-white/30 py-2.5 text-[13px] font-medium text-white/85 hover:bg-white/10"
              >
                Abandonar (no se guarda)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Botones grandes para el celu */}
      {tactil ? (
        <div className="mt-3 grid w-full max-w-[420px] grid-cols-2 gap-3">
          {BOTONES.map((b) => {
            const Icono = b.icono;
            return (
              <button
                key={b.lado}
                type="button"
                aria-label={b.texto}
                onPointerDown={boton(b.lado, true)}
                onPointerUp={boton(b.lado, false)}
                onPointerCancel={boton(b.lado, false)}
                onPointerLeave={boton(b.lado, false)}
                onContextMenu={(e) => e.preventDefault()}
                className="flex h-14 items-center justify-center rounded-xl border border-linea bg-card text-3xl text-titulo active:bg-surface dark:border-linea-dark dark:bg-card-dark dark:text-titulo-dark dark:active:bg-surface-dark"
                style={{ touchAction: "none" }}
                data-testid={`juego-boton-${b.lado}`}
              >
                <Icono />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-center text-[12px] text-suave dark:text-suave-dark">
          Flechas <kbd className="rounded border border-linea px-1 dark:border-linea-dark">←</kbd>{" "}
          <kbd className="rounded border border-linea px-1 dark:border-linea-dark">→</kbd> para doblar ·{" "}
          <kbd className="rounded border border-linea px-1 dark:border-linea-dark">P</kbd> pausa
        </p>
      )}
    </div>
  );
}
