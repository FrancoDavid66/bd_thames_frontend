// src/components/portal/VisorDocumento.jsx
//
// 📄 Muestra un documento: la imagen de un cupón, la cuponera, la póliza.
//
// ── DOS FORMAS SEGÚN QUÉ SEA ───────────────────────────────────────────
//
// IMÁGENES (el cupón recortado) → MODAL sobre la pantalla.
//   El cliente no pierde de vista dónde estaba: ve el cupón, lo muestra en
//   la caja, cierra y sigue donde iba. A pantalla completa se sentía como
//   haber salido del portal.
//
// PDF (la propuesta entera) → PANTALLA COMPLETA.
//   Un PDF de varias hojas dentro de un modal chico no se lee.
//
// ── 🔄 EL GIRO ─────────────────────────────────────────────────────────
// El cupón es una franja ANCHA. En un celular vertical entra chiquito y el
// código de barras queda apretado. Girado 90° ocupa todo el alto de la
// pantalla: el doble de grande, mucho más fácil de escanear.
//
// Es lo mismo que hacen las apps de aerolíneas con el boarding pass.
//
// ⚠️ El fondo del documento es BLANCO FIJO, aunque el portal esté en oscuro:
//    un código de barras sobre negro no lo lee el escáner del cajero.

import { useEffect, useState } from "react";
import { IconAtras } from "./Iconos";

/** ¿Es una imagen o un PDF? Define cómo se muestra. */
function esImagen(url) {
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(String(url || ""));
}

/** Flechas circulares: el botón de girar. */
function IconGirar({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0115-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 01-15 6.7L3 16" />
    </svg>
  );
}

export default function VisorDocumento({ doc, onCerrar }) {
  const [horizontal, setHorizontal] = useState(false);

  useEffect(() => {
    // Cerrar con Escape. Detalle chico, pero el que usa teclado lo espera.
    const onKey = (e) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", onKey);

    // Trabar el scroll de atrás: si no, al deslizar sobre el modal se mueve
    // la lista de abajo y el cupón se va de la pantalla justo cuando se lo
    // estás mostrando al cajero.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  // Al cambiar de documento vuelve derecho: si no, el siguiente se abriría
  // de costado sin que nadie lo haya pedido.
  useEffect(() => { setHorizontal(false); }, [doc?.url]);

  if (!doc?.url) return null;

  /* ══════════════════ IMAGEN: modal ══════════════════ */
  if (esImagen(doc.url)) {
    return (
      <div
        className="portal-fadein"
        onClick={onCerrar}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,.72)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: horizontal ? 0 : 18,
        }}
      >
        <div
          className="portal-hoja"
          // El click adentro no cierra: solo el de afuera.
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: horizontal ? 0 : 18,
            overflow: "hidden",
            width: "100%",
            height: horizontal ? "100%" : "auto",
            maxWidth: horizontal ? "none" : 460,
            maxHeight: horizontal ? "none" : "88vh",
            display: "flex", flexDirection: "column",
            boxShadow: horizontal ? "none" : "0 24px 60px rgba(0,0,0,.45)",
          }}
        >
          {/* ── Cabecera ── */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "14px 16px", borderBottom: "1px solid #EAE8E9",
              flexShrink: 0, background: "#fff",
            }}
          >
            <span
              style={{
                fontSize: 14.5, fontWeight: 700, color: "#1A1A1C",
                minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {doc.nombre || "Documento"}
            </span>

            <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setHorizontal((v) => !v)}
                aria-label={horizontal ? "Ver derecho" : "Ver de costado"}
                title={horizontal ? "Ver derecho" : "Ver de costado"}
                style={{
                  height: 30, width: 30, border: "none", borderRadius: "50%",
                  background: horizontal ? "#B80000" : "#F3F2F0",
                  color: horizontal ? "#fff" : "#5C5B60",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <IconGirar />
              </button>

              <button
                onClick={onCerrar}
                aria-label="Cerrar"
                style={{
                  height: 30, width: 30, border: "none", borderRadius: "50%",
                  background: "#F3F2F0", color: "#5C5B60", fontSize: 17, lineHeight: 1,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ×
              </button>
            </span>
          </div>

          {/* ── El documento ──
              Girado: el ANCHO de la imagen pasa a ocupar el ALTO de la
              pantalla. Por eso va `width: 92vh` y no un % del ancho. */}
          <div
            style={{
              flex: horizontal ? 1 : "none",
              padding: horizontal ? 0 : 16,
              overflow: horizontal ? "hidden" : "auto",
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <img
              src={doc.url}
              alt={doc.nombre || "Documento"}
              className="portal-girar"
              style={{
                display: "block",
                width: horizontal ? "92vh" : "100%",
                height: "auto",
                maxWidth: horizontal ? "none" : "100%",
                transform: horizontal ? "rotate(90deg)" : "none",
              }}
            />
          </div>

          {/* Derecho: botón de descargar. De costado se saca — ahí la
              pantalla es para el cajero, no para navegar. */}
          {!horizontal ? (
            <div style={{ padding: "12px 16px 16px", flexShrink: 0 }}>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block", textAlign: "center", background: "#B80000",
                  color: "#fff", borderRadius: 11, padding: 13,
                  fontSize: 14.5, fontWeight: 600, textDecoration: "none",
                }}
              >
                Descargar
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  /* ══════════════════ PDF: pantalla completa ══════════════════ */
  return (
    <div
      className="portal-hoja"
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "#fff",
        display: "flex", flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "calc(10px + env(safe-area-inset-top)) 16px 12px",
          borderBottom: "1px solid #E5E5E5", background: "#fff", flexShrink: 0,
        }}
      >
        <button
          onClick={onCerrar}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", fontFamily: "inherit", fontSize: 14.5, fontWeight: 600,
            color: "#B80000", cursor: "pointer", padding: "6px 2px",
          }}
        >
          <IconAtras /> Volver
        </button>

        <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
          {doc.nombre || "Documento"}
        </span>

        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 13.5, fontWeight: 600, color: "#B80000", flexShrink: 0 }}
        >
          Descargar
        </a>
      </div>

      <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
        {doc.url.includes("#page=") ? (
          // Con #page=N va el visor NATIVO: el de Google ignora el ancla y
          // abre siempre en la hoja 1.
          <iframe
            src={doc.url}
            title={doc.nombre || "Documento"}
            style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
          />
        ) : (
          // Para el resto, el visor de Google: abre PDFs que algunos
          // navegadores no muestran embebidos.
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(doc.url)}&embedded=true`}
            title={doc.nombre || "Documento"}
            style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}
          />
        )}
      </div>
    </div>
  );
}
