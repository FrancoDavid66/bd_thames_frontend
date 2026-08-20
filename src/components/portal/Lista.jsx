// src/components/portal/Lista.jsx
//
// 📋 La lista agrupada: bloque continuo, filas separadas por una línea fina.
//
// Es lo que usan los bancos y iOS en Ajustes. Se eligió esto en vez de
// tarjetas sueltas flotando porque con 4 seguros la pantalla quedaba llena
// de cajas con aire entre medio y se veía amateur.
//
// 🔑 Detalle del mockup: el separador NO es un borde. La lista usa
//    `gap: 1px` con el fondo del color de la línea, así los 1px se ven
//    parejos sin importar cuántas filas haya y sin bordes dobles.

import { IconChevron } from "./Iconos";

/** Título de sección, con contador opcional a la derecha. */
export function Seccion({ children, extra }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        padding: "26px 20px 12px",
      }}
    >
      <span
        style={{
          fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
          textTransform: "uppercase", color: "var(--t3)",
        }}
      >
        {children}
      </span>
      {extra ? (
        <span style={{ fontSize: 12.5, color: "var(--t3)" }}>{extra}</span>
      ) : null}
    </div>
  );
}

/** El bloque que envuelve las filas. */
export function Lista({ children }) {
  return (
    <div
      style={{
        // 🃏 Un bloque redondeado que flota, no una franja de borde a borde.
        //    Con la sombra y el margen lateral se despega del fondo; eso es
        //    lo que le faltaba al diseño anterior para no verse plano.
        background: "var(--card)",
        borderRadius: 16,
        margin: "0 15px",
        overflow: "hidden",
        boxShadow: "var(--lista-sombra)",
        border: "var(--lista-borde)",
      }}
    >
      {children}
    </div>
  );
}

const TONOS = {
  marca:  { bg: "var(--m-soft)",  fg: "var(--m)" },
  ok:     { bg: "var(--ok-bg)",   fg: "var(--ok)" },
  alerta: { bg: "var(--al-bg)",   fg: "var(--al)" },
  aviso:  { bg: "var(--wa-bg)",   fg: "var(--wa)" },
};

/** Una fila de la lista. */
export function Fila({
  icono, tono = "marca", titulo, sub, derecha, onClick, href, primera = false, i = 0,
}) {
  const t = TONOS[tono] || TONOS.marca;

  const contenido = (
    <>
      {icono ? (
        <span
          style={{
            height: 41, width: 41, borderRadius: 12, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
            // Fondo neutro: el color se reserva para el estado (el monto y
            // el "vencido"). Si el ícono también fuera de color, competirían.
            background: "var(--bg)", color: "var(--t2)",
          }}
        >
          {icono}
        </span>
      ) : null}

      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block", fontSize: 15.5, fontWeight: 600,
            letterSpacing: "-.015em", lineHeight: 1.3,
          }}
        >
          {titulo}
        </span>
        {sub ? (
          <span
            style={{
              display: "block", fontSize: 13, color: "var(--t2)", marginTop: 2,
            }}
          >
            {sub}
          </span>
        ) : null}
      </span>

      {derecha}
      {(onClick || href) ? (
        <span style={{ color: "var(--t3)", flexShrink: 0 }}><IconChevron /></span>
      ) : null}
    </>
  );

  const estilo = {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 16px",
    background: "var(--card)", border: "none",
    borderTop: primera ? "none" : "1px solid var(--div)",
    fontFamily: "inherit", color: "var(--t1)", textAlign: "left", width: "100%",
    textDecoration: "none",
    cursor: (onClick || href) ? "pointer" : "default",
  };

  // `portal-tap` le da el hundido al tocar (ver portal.css). Solo va si la
  // fila hace algo: una fila de puro dato no debería reaccionar.
  // `--i` es el índice de la fila: cada una entra 40ms después de la
  // anterior (ver .portal-stagger en portal.css).
  const clase = [(onClick || href) ? "portal-tap" : "", "portal-stagger"]
    .filter(Boolean).join(" ");

  const conIndice = { ...estilo, "--i": i };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={conIndice} className={clase}>
        {contenido}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={conIndice} className={clase} disabled={!onClick}>
      {contenido}
    </button>
  );
}

/** Chip de estado: pill con fondo tenue. */
export function Chip({ tono = "ok", children, punto = false }) {
  const t = TONOS[tono] || TONOS.ok;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 6,
        fontSize: 11.5, fontWeight: 600, padding: "3px 8px", flexShrink: 0,
        letterSpacing: ".01em", background: t.bg, color: t.fg,
      }}
    >
      {punto ? (
        <span
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "currentColor", flexShrink: 0,
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

/** Bloque para cuando no hay nada que mostrar (con salida, no un vacío mudo). */
export function Vacio({ titulo, sub, boton }) {
  return (
    <div
      style={{
        padding: "18px 20px", background: "var(--card)",
        borderTop: "1px solid var(--div)", borderBottom: "1px solid var(--div)",
      }}
    >
      <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-.015em" }}>{titulo}</div>
      <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 3 }}>{sub}</div>
      {boton}
    </div>
  );
}
