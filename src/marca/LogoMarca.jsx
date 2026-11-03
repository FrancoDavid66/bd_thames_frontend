// src/marca/LogoMarca.jsx
//
// 🏷️ El logo "armado" de una marca que no es THAMES: el isotipo (la balanza
//    de Malvinas) + el nombre en letras. THAMES tiene sus logos en imagen
//    (los .webp de siempre) y NO usa esto.
//
//   <LogoHorizontalMarca marca={m} alto={20} oscuro={false} />  → [▣ MALVINAS]
//   <LogoVerticalMarca   marca={m} alto={64} oscuro={false} />  → ▣ / MALVINAS / lema
//
// Va con estilos en línea (no Tailwind) porque lo usa el portal del cliente,
// que tiene su propio CSS.

import balanzaBlanca from "../assets/logos/malvinas_balanza_blanca.svg";

/** La marca de agua blanca para la tarjeta del portal (Malvinas: la balanza). */
export const MARCA_DE_AGUA = {
  malvinas: balanzaBlanca,
};

const colorNombre = (marca, oscuro) => (oscuro ? "#FFFFFF" : marca.verde || "#111111");

export function LogoHorizontalMarca({ marca, alto = 20, oscuro = false, style }) {
  if (!marca) return null;
  const lado = Math.round(alto * 1.25);
  return (
    <span
      role="img"
      aria-label={marca.nombre}
      style={{ display: "inline-flex", alignItems: "center", gap: Math.round(alto * 0.4), ...style }}
    >
      <img src={marca.logo} alt="" style={{ width: lado, height: lado, display: "block", borderRadius: Math.round(lado * 0.22) }} />
      <span
        style={{
          fontSize: Math.round(alto * 0.85), fontWeight: 800, letterSpacing: ".08em",
          color: colorNombre(marca, oscuro), lineHeight: 1,
        }}
      >
        {marca.nombreCorto}
      </span>
    </span>
  );
}

export function LogoVerticalMarca({ marca, alto = 64, oscuro = false, conLema = true, style }) {
  if (!marca) return null;
  const lado = Math.round(alto * 0.62);
  return (
    <span
      role="img"
      aria-label={marca.nombre}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, ...style }}
    >
      <img src={marca.logo} alt="" style={{ width: lado, height: lado, display: "block", borderRadius: Math.round(lado * 0.22) }} />
      <span
        style={{
          fontSize: Math.max(14, Math.round(alto * 0.26)), fontWeight: 800, letterSpacing: ".12em",
          color: colorNombre(marca, oscuro), lineHeight: 1,
        }}
      >
        {marca.nombreCorto}
      </span>
      {conLema && marca.lema ? (
        <span style={{ fontSize: 11, color: oscuro ? "rgba(255,255,255,.6)" : "#6B7280", lineHeight: 1.2 }}>
          {marca.lema}
        </span>
      ) : null}
    </span>
  );
}
