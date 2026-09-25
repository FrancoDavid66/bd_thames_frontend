/* src/components/juego/SiniestroCero.jsx
 *
 * 🚗 SINIESTRO CERO — la pantalla donde se juega (canvas + controles),
 * con look de fichín: marco de neón, líneas de tubo y marcador pixel.
 *
 * Arma la partida (motor.js), la dibuja (dibujo.js) 60 veces por segundo y
 * lee los controles:
 *   · Compu: flechas ← → (o A / D). P, Espacio o Esc = pausa.
 *   · Celu:  tocá y mantené la mitad IZQUIERDA o DERECHA de la ruta,
 *            o los botones redondos de abajo.
 *
 * Cuando termina la partida llama a onTerminar(resultado) UNA sola vez.
 * Se pausa sola si cambiás de pestaña o de ventana, o si algo tapa la ruta
 * (por ejemplo el aviso de cierre de caja o el menú del celu).
 *
 * Props:
 *   sonido          → true/false (parlante prendido)
 *   recordPersonal  → tu mejor puntaje (si lo pasás, sale "¡NUEVO RÉCORD!")
 *   onTerminar      → (resultado) => void   { puntos, metros, segundos, esquives, monedas, siniestros }
 *   onAbandonar     → () => void            (desde la pausa; no se guarda nada)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ANCHO, ALTO, VIDAS, actualizar, anunciar, crearPartida, kmh, resultado } from "./motor";
import { dibujarPartida } from "./dibujo";
import { crearSonido } from "./sonido";
import { Pixel } from "./ArcadeUI";
import { puntaje6 } from "./arcade";

const SUELTO = { izq: false, der: false };

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
  const [apretado, setApretado] = useState(SUELTO); // para que el botón redondo "se hunda"
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
    setApretado(SUELTO);
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
        anunciar(p, "¡NUEVO RECORD!"); // sin tilde: la letra de fichín no tiene mayúsculas acentuadas
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

  // Botones redondos de abajo (celu)
  const boton = (lado, si) => (e) => {
    e.preventDefault();
    if (pausaRef.current) return;
    botonesRef.current[lado] = si;
    recalcularEntrada();
    setApretado((a) => (a[lado] === si ? a : { ...a, [lado]: si }));
  };
  const botonRedondo = (lado, sprite, texto, extra = "") => (
    <button
      type="button"
      aria-label={texto}
      onPointerDown={boton(lado, true)}
      onPointerUp={boton(lado, false)}
      onPointerCancel={boton(lado, false)}
      onPointerLeave={boton(lado, false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`arcade-boton-redondo${extra}`}
      data-apretado={apretado[lado] ? "true" : "false"}
      data-testid={`juego-boton-${lado}`}
    >
      <Pixel sprite={sprite} tam={4} />
    </button>
  );

  return (
    <div className="flex w-full select-none flex-col items-center">
      <div
        ref={cajaRef}
        className="arcade-pantalla"
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
        <div className="arcade-crt" aria-hidden="true" />

        {/* HUD de fichín: 1UP · récord · vidas · velocidad */}
        <div className="arcade-hud">
          <div className="min-w-0">
            <div className="arcade-hud__label arcade-titilar">1UP</div>
            <div className="arcade-hud__num" data-testid="juego-puntos">{puntaje6(hud.puntos)}</div>
            {recordRef.current > 0 && <div className="arcade-hud__mini">HI {puntaje6(recordRef.current)}</div>}
            {hud.combo > 1 && <div className="arcade-hud__combo">¡CASI! x{hud.combo}</div>}
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex gap-1" role="img" aria-label={`${hud.vidas} vidas`} data-testid="juego-vidas">
              {Array.from({ length: VIDAS }).map((_, i) => (
                <span key={i} className="flex" data-viva={i < hud.vidas ? "1" : "0"}>
                  <Pixel sprite="corazon" tam={2} apagado={i >= hud.vidas} />
                </span>
              ))}
            </div>
            <div className="arcade-hud__num">
              {hud.kmh}
              <span className="arcade-hud__mini ml-1">KM/H</span>
            </div>
            <div className="arcade-hud__mini">{hud.km} KM</div>
            {hud.escudo > 0 && <div className="arcade-hud__escudo">COBERTURA {hud.escudo}</div>}
          </div>
        </div>

        {/* Pausa */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => ponerPausa(!pausaRef.current)}
          className="arcade-boton-pausa"
          aria-label={pausa ? "Seguir" : "Pausa"}
          data-testid="juego-pausa"
        >
          <Pixel sprite={pausa ? "play" : "pausa"} tam={2} />
        </button>

        {pausa && (
          <div className="arcade-pausa" onPointerDown={(e) => e.stopPropagation()}>
            <div className="f-pixel t-amarillo arcade-titilar text-[22px]">PAUSA</div>
            <button type="button" onClick={() => ponerPausa(false)} className="arcade-btn w-48">
              Seguir
            </button>
            {onAbandonar && (
              <button type="button" onClick={onAbandonar} className="arcade-btn arcade-btn--fantasma w-48 text-[8px]">
                Abandonar (no se guarda)
              </button>
            )}
            <div className="f-crt t-suave text-[18px]">P o ESPACIO para seguir</div>
          </div>
        )}
      </div>

      {/* Controles */}
      {tactil ? (
        <div className="arcade-panel-control mt-5 w-full max-w-[420px]">
          {botonRedondo("izq", "flechaIzq", "Izquierda")}
          <div className="f-pixel t-tenue text-center text-[7px] leading-relaxed">
            MANTENER
            <br />
            APRETADO
          </div>
          {botonRedondo("der", "flechaDer", "Derecha", " arcade-boton-redondo--azul")}
        </div>
      ) : (
        <div className="f-crt t-suave mt-5 flex flex-wrap items-center justify-center gap-2 text-[18px]">
          <span className="arcade-tecla"><Pixel sprite="flechaIzq" tam={2} /></span>
          <span className="arcade-tecla"><Pixel sprite="flechaDer" tam={2} /></span>
          <span>mover</span>
          <span className="arcade-tecla ml-3">P</span>
          <span>pausa</span>
        </div>
      )}
    </div>
  );
}
