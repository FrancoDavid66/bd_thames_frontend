// src/components/login/tThames.js
//
// 🅣 LA «T» DE THAMES (la misma de la web nueva y de logo_thames.svg), en piezas.
//    · La usa el login 3D (EscenaLogin3D.jsx): cada pieza se extruye y vuela a su lugar.
//
// Orden de las piezas (importa para la animación de entrada):
//   0 columna izq · 1 columna der · 2 columna centro · 3 viga con aros · 4 bandera izq · 5 bandera der · 6 corona

export const T_VIEWBOX = "0 0 978.6 752.8";

export const T_COLUMNAS = [
  "M338.8 752.8L413.5 710.2L414 263.9L338.8 263.9Z",
  "M639.9 752.8L564.6 710.2L564.6 263.9L639.9 263.9Z",
  "M451.7 266.5H527V710.2H451.7Z",
];

// La viga lleva transform="translate(-10.7 -123.6)" (así viene en el logo original).
export const T_VIGA =
  "M989.3,425.5a150.6,150.6,0,0,1-296.5,37.3,154,154,0,0,1-4.1-24.6V412.7a149.1,149.1,0,0,1,4.3-25.2H839.3v75.3h-66a75.3,75.3,0,1,0,65.4-112.6H161.3a75.3,75.3,0,1,0,65.4,112.6h-66V387.5H307a151.4,151.4,0,0,1,4.3,25.4v25.2a155.3,155.3,0,0,1-4.1,24.7A150.6,150.6,0,1,1,161.3,274.9H838.7A150.6,150.6,0,0,1,989.3,425.5Z";
export const T_VIGA_TRANSFORM = "translate(-10.7 -123.6)";

export const T_ARRIBA = [
  "M225.5 113.3L375.5 113.3L375.7 38L225.5 75.3Z",
  "M753.1 113.3L603.1 113.3L602.9 38L753.1 75.3Z",
  "M414 113.3L564.1 113.3L564.1 38L488.8 0L414 38Z",
];

/** El SVG completo, en el orden de las piezas (para el SVGLoader de three.js). */
export function tSvgCompleto() {
  const p = (d, extra = "") => `<path d="${d}"${extra}/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${T_VIEWBOX}">` +
    T_COLUMNAS.map((d) => p(d)).join("") +
    p(T_VIGA, ` transform="${T_VIGA_TRANSFORM}"`) +
    T_ARRIBA.map((d) => p(d)).join("") +
    "</svg>"
  );
}
