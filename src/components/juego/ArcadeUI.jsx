/* src/components/juego/ArcadeUI.jsx
 *
 * 🕹️ Piezas visuales de THAMES ARCADE (la sección de minijuegos):
 *   · <Pixel sprite="moneda" tam={2} />   → dibujito pixel (ver SPRITES en arcade.js)
 *   · <AvatarPixel semilla="e12" />        → el bichito pixel de cada jugador
 *   · <FondoArcade />                      → la noche de fichín: cielo, estrellas,
 *                                            grilla de neón que corre y líneas de tubo
 */
import { useMemo } from "react";
import { SPRITES, avatarDe } from "./arcade";
import "./arcade.css";

const APAGADO = "#3a2a73";

export function Pixel({ sprite, tam = 2, apagado = false, titulo, className = "" }) {
  const s = typeof sprite === "string" ? SPRITES[sprite] : sprite;
  const cuadros = useMemo(() => {
    if (!s) return [];
    const lista = [];
    s.filas.forEach((fila, y) => {
      let x = 0;
      while (x < fila.length) {
        const c = fila[x];
        if (c === ".") {
          x += 1;
          continue;
        }
        let fin = x + 1;
        while (fin < fila.length && fila[fin] === c) fin += 1;
        lista.push({ x, y, ancho: fin - x, color: apagado ? APAGADO : s.colores[c] || "currentColor" });
        x = fin;
      }
    });
    return lista;
  }, [s, apagado]);

  if (!s) return null;
  const ancho = s.filas[0].length;
  const alto = s.filas.length;
  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      width={ancho * tam}
      height={alto * tam}
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      role={titulo ? "img" : undefined}
      aria-label={titulo || undefined}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {cuadros.map((q) => (
        <rect key={`${q.x}-${q.y}`} x={q.x} y={q.y} width={q.ancho} height={1} fill={q.color} />
      ))}
    </svg>
  );
}

export function AvatarPixel({ semilla, tam = 3, className = "" }) {
  const sprite = useMemo(() => avatarDe(semilla), [semilla]);
  return <Pixel sprite={sprite} tam={tam} className={className} />;
}

export function FondoArcade() {
  return (
    <div className="arcade-fondo" aria-hidden="true">
      <div className="arcade-fondo__cielo" />
      <div className="arcade-fondo__estrellas" />
      <div className="arcade-fondo__piso">
        <div className="arcade-fondo__grilla" />
      </div>
      <div className="arcade-fondo__horizonte" />
      <div className="arcade-fondo__lineas" />
    </div>
  );
}
