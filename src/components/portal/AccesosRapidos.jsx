// src/components/portal/AccesosRapidos.jsx
//
// ⚡ Los 4 círculos debajo del header: Pagar · Comprobante · Papeles · Ayuda.
//
// Van montados sobre el borde del header (margen negativo) para que se vean
// "colgando" de él, como en las apps de banco. Es lo primero que el cliente
// toca cuando ya sabe lo que quiere hacer.

import { IconPagos, IconFoto, IconDoc, IconChat } from "./Iconos";

export default function AccesosRapidos({ onPagar, onComprobante, onPapeles, onAyuda }) {
  const items = [
    { Icono: IconPagos, label: "Pagar",       onClick: onPagar },
    { Icono: IconFoto,  label: "Comprobante", onClick: onComprobante },
    { Icono: IconDoc,   label: "Papeles",     onClick: onPapeles },
    { Icono: IconChat,  label: "Ayuda",       onClick: onAyuda },
  ];

  return (
    <div
      className="portal-fadein"
      style={{
        display: "flex",
        background: "var(--card)",
        padding: "18px 8px 16px",
        // Margen negativo: se monta sobre el borde redondeado del header.
        margin: "-14px 14px 4px",
        borderRadius: 20,
        border: "1px solid var(--div)",
        boxShadow: "0 4px 16px rgba(0,0,0,.07)",
        position: "relative",
        zIndex: 3,
      }}
    >
      {items.map(({ Icono, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className="portal-tap-ic"
          style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            fontFamily: "inherit", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8, padding: 2,
          }}
        >
          <span
            className="portal-ic-caja"
            style={{
              height: 54, width: 54, borderRadius: 18, background: "var(--m-soft)",
              color: "var(--m)", display: "flex", alignItems: "center",
              justifyContent: "center", transition: "transform .12s",
            }}
          >
            <Icono size={23} w={1.9} />
          </span>
          <span
            style={{
              fontSize: 12.5, fontWeight: 600, color: "var(--t1)",
              letterSpacing: "-.01em", textAlign: "center", lineHeight: 1.25,
            }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
