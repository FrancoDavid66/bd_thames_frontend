/* src/components/juego/DemoArcade.jsx
 *
 * 📺 Pantallita DEMO de la portada: Siniestro Cero se juega solo (lo maneja
 * bot.js), como los fichines esperando ficha. No suena, no suma puntos y no
 * guarda nada.
 *
 *   · Arranca ya "en movimiento" (se saltea la cuenta regresiva).
 *   · Si el piloto pierde (o pasa un minuto), vuelve a empezar.
 *   · Si la pantallita no se ve (scroll) o la compu pide menos movimiento,
 *     se queda quieta.
 */
import { useEffect, useRef } from "react";
import { ANCHO, ALTO, actualizar, crearPartida } from "./motor";
import { dibujarPartida } from "./dibujo";
import { crearPiloto } from "./bot";
import "./arcade.css";

const ADELANTO = 5;      // segundos que se "adelanta" al empezar (sin cuenta y ya con tráfico)
const MAXIMO = 60;       // la demo vuelve a empezar después de un minuto
const ESPERA_FIN = 1.4;  // lo que se ve el GAME OVER antes de volver a empezar

export default function DemoArcade({ className = "" }) {
  const cajaRef = useRef(null);
  const lienzoRef = useRef(null);

  useEffect(() => {
    const lienzo = lienzoRef.current;
    const caja = cajaRef.current;
    const ctx = lienzo ? lienzo.getContext("2d") : null;
    if (!ctx) return undefined;

    let quieta = false;
    try {
      quieta = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      quieta = false;
    }

    let p = null;
    let piloto = null;
    let finHace = 0;
    const paso = (dt) => {
      actualizar(p, dt, piloto(p, dt));
      p.eventos = []; // la demo no suena
    };
    const nueva = () => {
      p = crearPartida();
      piloto = crearPiloto();
      for (let t = 0; t < ADELANTO; t += 1 / 60) paso(1 / 60);
      finHace = 0;
    };
    nueva();

    let escala = 0;
    const ajustar = () => {
      const r = lienzo.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const e = Math.max(1, Math.min(4, Math.round(((r.width || ANCHO) * dpr) / ANCHO)));
      if (e !== escala) {
        escala = e;
        lienzo.width = ANCHO * e;
        lienzo.height = ALTO * e;
      }
    };
    const dibujar = (reloj) => {
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.imageSmoothingEnabled = false;
      dibujarPartida(ctx, p, reloj);
    };
    ajustar();

    let visible = true;
    let mirador = null;
    if (typeof IntersectionObserver !== "undefined" && caja) {
      mirador = new IntersectionObserver((entradas) => {
        visible = entradas.some((e) => e.isIntersecting);
      });
      mirador.observe(caja);
    }
    let medidor = null;
    if (typeof ResizeObserver !== "undefined") {
      medidor = new ResizeObserver(() => {
        ajustar();
        if (quieta) dibujar(0);
      });
      medidor.observe(lienzo);
    }

    if (quieta) {
      dibujar(0);
      return () => {
        if (mirador) mirador.disconnect();
        if (medidor) medidor.disconnect();
      };
    }

    let raf = 0;
    let ultimo = performance.now();
    const cuadro = (ahora) => {
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, Math.max(0, (ahora - ultimo) / 1000));
      ultimo = ahora;
      if (!visible) return;
      if (p.fase === "fin") {
        finHace += dt;
        if (finHace > ESPERA_FIN) nueva();
      } else {
        paso(dt);
        if (p.t > MAXIMO) nueva();
      }
      dibujar(ahora / 1000);
    };
    raf = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(raf);
      if (mirador) mirador.disconnect();
      if (medidor) medidor.disconnect();
    };
  }, []);

  return (
    <div ref={cajaRef} className={`arcade-mini-pantalla ${className}`} aria-hidden="true">
      <canvas ref={lienzoRef} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />
      <div className="arcade-crt" />
      <span className="arcade-mini-pantalla__demo">DEMO</span>
    </div>
  );
}
