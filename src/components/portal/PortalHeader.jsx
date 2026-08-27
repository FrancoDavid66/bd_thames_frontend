// src/components/portal/PortalHeader.jsx
//
// 🃏 EL HEADER: una barra de marca arriba y una TARJETA GRANDE con el total.
//
// ── POR QUÉ UNA TARJETA Y NO UNA FRANJA ────────────────────────────────
// Antes el header era una franja roja a todo el ancho, pegada al borde. Se
// veía plano: todo al mismo nivel, sin nada que sobresaliera.
//
// La tarjeta es un OBJETO. El cliente la reconoce (es la forma de la tarjeta
// de crédito, del carnet, de la SUBE) y sabe que ahí está lo importante.
// Además concentra todo en un solo lugar: total, nombre, estado y el botón.
//
// Lo que la hace verse como tarjeta y no como un rectángulo pintado:
//   · degradado en diagonal, no color plano
//   · sombra DE COLOR (rojo), no negra
//   · un círculo de luz arriba a la derecha
//
// ── EN LAS OTRAS PANTALLAS ─────────────────────────────────────────────
// La tarjeta solo va en la principal. En Pagos, Papeles o dentro de una
// póliza queda la barra de marca y el título: ahí el protagonista es el
// contenido, no el total.

import { useState } from "react";
import { IconAtras, IconOjo, IconFlecha, IconChat, IconSol, IconLuna } from "./Iconos";
import { num } from "./utils";

// 🅣 El logo. Sobre la barra de marca va el de color; sobre la tarjeta roja,
//    el blanco.
import logoColor from "../../assets/logos/horiz-rojo-negro-sm.webp";
import logoBlanco from "../../assets/logos/horiz-blanco-sm.webp";
import isoBlanco from "../../assets/logos/iso-blanco.webp";

export default function PortalHeader({
  cliente,
  titulo,
  subtitulo,
  mostrarSaludo,
  mostrarAtras,
  onAtras,
  resumen,          // { label, monto, sub, tipo }
  importesVisibles,
  onToggleImportes,
  onIrPagos,
  waAyuda,
  tema,             // "claro" | "oscuro"
  onCambiarTema,
}) {
  const oscuro = tema === "oscuro";
  // Cuenta los cambios de tema. Se usa como `key` del ícono para que React lo
  // vuelva a montar y la animación de giro se dispare cada vez.
  const [giros, setGiros] = useState(0);

  return (
    <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 18px 0" }}>
      {/* ── Barra de marca ── */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          {mostrarAtras ? (
            <button
              onClick={onAtras}
              aria-label="Volver"
              style={{
                height: 32, width: 32, flexShrink: 0, border: "none", borderRadius: 10,
                background: "var(--card)", color: "var(--t1)", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                boxShadow: "var(--lista-sombra)", border: "var(--lista-borde)",
              }}
            >
              <IconAtras size={17} />
            </button>
          ) : null}

          {/* El logo de color sobre el fondo de la app. */}
          <img
            src={oscuro ? logoBlanco : logoColor}
            alt="Estudio Thames"
            style={{ height: 20, width: "auto", display: "block", opacity: oscuro ? 0.9 : 1 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* 🌓 El cambio de tema, arriba y siempre visible.
              Estaba al pie, pero con 5 o 6 seguros quedaba enterrado bajo la
              lista y el cliente ni se enteraba de que existía. */}
          {onCambiarTema ? (
            <button
              onClick={() => { setGiros((g) => g + 1); onCambiarTema(); }}
              aria-label={oscuro ? "Ver en claro" : "Ver en oscuro"}
              title={oscuro ? "Ver en claro" : "Ver en oscuro"}
              className="portal-tap-ic"
              style={{
                height: 32, width: 32, borderRadius: 10, border: "none",
                background: "var(--card)", color: "var(--t2)", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                boxShadow: "var(--lista-sombra)", border: "var(--lista-borde)",
                fontFamily: "inherit",
              }}
            >
              {/* El ícono gira 180° y se achica en el medio del giro. */}
              <span key={giros} className="portal-tema-ico" style={{ display: "flex" }}>
                {oscuro ? <IconSol size={16} /> : <IconLuna size={16} />}
              </span>
            </button>
          ) : null}

          {waAyuda ? (
            <a
              href={waAyuda}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribinos por WhatsApp"
              title="Escribinos"
              style={{
                height: 32, width: 32, borderRadius: 10,
                background: "var(--card)", color: "var(--t2)", display: "flex",
                alignItems: "center", justifyContent: "center",
                boxShadow: "var(--lista-sombra)", border: "var(--lista-borde)",
              }}
            >
              <IconChat size={16} />
            </a>
          ) : null}
        </div>
      </div>

      {/* ══ LA TARJETA — solo en la pantalla principal ══ */}
      {resumen ? (
        <div
          className="portal-tarjeta"
          style={{
            background: "var(--tarj)",
            borderRadius: 20,
            padding: 20,
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--tarj-sombra)",
            color: "#fff",
          }}
        >
          {/* Círculo de luz: le da volumen sin dibujar nada. */}
          <span
            style={{
              position: "absolute", width: 190, height: 190, borderRadius: "50%",
              background: "rgba(255,255,255,.08)", top: -75, right: -55,
              pointerEvents: "none",
            }}
          />
          {/* La columna del logo, muy tenue, como marca de agua. */}
          <img
            src={isoBlanco}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute", right: 14, bottom: -28, height: 120, width: "auto",
              opacity: 0.09, pointerEvents: "none", transform: "rotate(-6deg)",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 9, position: "relative" }}>
            <span
              style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: ".13em",
                textTransform: "uppercase", color: "rgba(255,255,255,.68)",
              }}
            >
              {resumen.label}
            </span>
            {/* Ocultar importes: por si lo abre delante de otra persona.
                No va cuando no hay importe que ocultar: un ojo tachado sobre
                la palabra "Consultanos" es un botón que no hace nada. */}
            {resumen.textoGrande ? null : (
            <button
              onClick={onToggleImportes}
              aria-label="Mostrar u ocultar importes"
              className="portal-tap-ic"
              style={{
                height: 22, width: 22, border: "none", borderRadius: "50%",
                background: "rgba(255,255,255,.18)", color: "#fff", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                flexShrink: 0, padding: 0,
              }}
            >
              <IconOjo size={12} tachado={!importesVisibles} />
            </button>
            )}
          </div>

          {/* 💰 El número grande. Cuando la cobertura no publica precio
                 (`textoGrande`), va una palabra en su lugar — y el botón de
                 ocultar importes no aplica: no hay importe que ocultar. */}
          <div
            style={{
              fontSize: resumen.textoGrande ? 24 : 32,
              fontWeight: 500, letterSpacing: "-.032em",
              marginTop: 8, position: "relative", fontVariantNumeric: "tabular-nums",
            }}
          >
            {resumen.textoGrande
              ? resumen.textoGrande
              : importesVisibles ? `$${num(resumen.monto)}` : "$ • • • •"}
          </div>

          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-end",
              gap: 12, marginTop: 24, position: "relative",
            }}
          >
            <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.72)", minWidth: 0 }}>
              {cliente?.nombre_corto || titulo} · {resumen.sub}
            </span>

            {resumen.tipo !== "al_dia" ? (
              <button
                onClick={onIrPagos}
                className="portal-tap-ic"
                style={{
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                  background: "rgba(255,255,255,.95)", border: "none", borderRadius: 10,
                  padding: "9px 15px", fontSize: 12.5, fontWeight: 700,
                  color: "var(--m-deep)", fontFamily: "inherit", cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Pagar <IconFlecha size={14} />
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        /* Sin tarjeta: solo el título de la pantalla. */
        <div style={{ minWidth: 0, paddingBottom: 4 }}>
          {mostrarSaludo ? (
            <div style={{ fontSize: 12.5, color: "var(--t3)", lineHeight: 1.1 }}>Hola,</div>
          ) : null}
          <div
            key={titulo}
            className="portal-fadein"
            style={{
              fontSize: 21, fontWeight: 650, letterSpacing: "-.02em",
              lineHeight: 1.2, marginTop: 2,
            }}
          >
            {titulo}
          </div>
          {subtitulo ? (
            <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 3, letterSpacing: ".02em" }}>
              {subtitulo}
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}