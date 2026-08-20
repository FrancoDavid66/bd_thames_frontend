// src/components/portal/TabsPortal.jsx
//
// 📱 El menú de abajo, fijo. Es lo que hace que el portal se sienta una app
//    y no una página larga.
//
// 🔑 Dos detalles del mockup:
//    · La línea indicadora va ARRIBA del tab activo (pegada al borde),
//      no abajo. Es lo que hacen las apps de banco.
//    · El ícono del tab activo va con trazo más grueso (2.1 vs 1.7), no
//      con otro color: se nota sin ensuciar.

import { IconPagos, IconSeguros, IconPapeles } from "./Iconos";

/* 🎯 TRES pestañas, no cuatro.
   "Inicio" y "Seguros" mostraban la misma lista — Inicio le agregaba el
   resumen arriba y nada más. Fusionadas: el resumen queda en el header y
   los seguros abajo.
   Además de sacar una pestaña repetida, entran los 4 seguros sin scrollear
   y cada pestaña queda más ancha (más fácil de tocar). */
const TABS = [
  { id: "seguros", Icono: IconSeguros, label: "Mis seguros" },
  { id: "pagos",   Icono: IconPagos,   label: "Pagos" },
  { id: "papeles", Icono: IconPapeles, label: "Papeles" },
];

export default function TabsPortal({ activa, onChange, vencidos = 0, totalSeguros = 1 }) {
  return (
    <nav
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 412,
        margin: "0 auto", background: "var(--card)",
        borderTop: "1px solid var(--div)", display: "flex", zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -6px 20px rgba(0,0,0,.09)",
      }}
    >
      {TABS.map(({ id, Icono, label }) => {
        const on = activa === id;
        // Con un solo seguro, el plural suena raro.
        const texto = id === "seguros" && totalSeguros === 1 ? "Mi seguro" : label;

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              flex: 1, background: "none", border: "none", padding: "9px 4px",
              cursor: "pointer", fontFamily: "inherit", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 4,
              position: "relative", color: on ? "var(--m)" : "var(--t3)",
            }}
          >
            {/* La línea va ARRIBA, pegada al borde del menú. */}
            {/* Siempre montada, con ancho 0 cuando no está activa: así la
                transición tiene de dónde a dónde ir. Si se montara y
                desmontara, aparecería de golpe. */}
            <span
              style={{
                position: "absolute", top: 0, left: "50%",
                transform: "translateX(-50%)", width: on ? 28 : 0, height: 3,
                borderRadius: "0 0 3px 3px", background: "var(--m)",
                transition: "width .24s cubic-bezier(.3,.8,.3,1)",
              }}
            />

            <span
              style={{
                display: "flex",
                // El ícono activo sube 1px: se nota sin ensuciar.
                transform: on ? "translateY(-1px)" : "none",
                transition: "transform .2s cubic-bezier(.3,.8,.3,1)",
              }}
            >
              <Icono size={22} w={on ? 2.1 : 1.7} />
            </span>

            <span style={{ fontSize: 11.5, fontWeight: on ? 700 : 500, letterSpacing: "-.01em" }}>
              {texto}
            </span>

            {id === "pagos" && vencidos > 0 ? (
              <span
                className="portal-latido"
                style={{
                  position: "absolute", top: 5, right: "calc(50% - 19px)",
                  minWidth: 17, height: 17, padding: "0 4px", borderRadius: 9,
                  background: "var(--al)", color: "#fff", fontSize: 10.5,
                  fontWeight: 700, display: "flex", alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {vencidos}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
