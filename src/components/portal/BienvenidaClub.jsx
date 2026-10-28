// src/components/portal/BienvenidaClub.jsx
//
// 🎁 BIENVENIDA AL CLUB THAMES — sale UNA sola vez, la primera vez que el
//    cliente de la oficina piloto entra al portal. Le cuenta los 2 beneficios
//    y lo lleva a "Mi perfil".
//
//    "Una sola vez" se recuerda en el teléfono (localStorage), por link. Si
//    borra los datos del navegador, la vuelve a ver: no pasa nada.

import { useEffect, useState } from "react";

const money = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;
const clave = (token) => `thames.club.bienvenida.${token}`;

export default function BienvenidaClub({ token, club, perfil, nombre, onCompletar }) {
  const [ver, setVer] = useState(false);

  useEffect(() => {
    if (!club?.activo) return;
    let yaVio = false;
    try { yaVio = localStorage.getItem(clave(token)) === "1"; } catch { /* modo privado */ }
    if (!yaVio) setVer(true);
  }, [club?.activo, token]);

  if (!ver) return null;

  const cerrar = () => {
    try { localStorage.setItem(clave(token), "1"); } catch { /* nada */ }
    setVer(false);
  };

  const pct = perfil?.porcentaje ?? 0;
  const faltan = perfil?.faltan?.length ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida al Club Thames"
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "var(--bg)",
        display: "flex", flexDirection: "column", maxWidth: 412, margin: "0 auto",
        overflowY: "auto",
      }}
    >
      <div style={{ background: "var(--tarj)", color: "#fff", padding: "48px 26px 76px", position: "relative", overflow: "hidden" }}>
        <span style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,.08)", top: -110, right: -90 }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.78)", position: "relative" }}>
          Thames Seguros
        </span>
        <h1 style={{ margin: "18px 0 0", fontSize: 32, lineHeight: 1.05, fontWeight: 800, position: "relative" }}>
          ¡Hola{nombre ? ` ${nombre}` : ""}!<br />Bienvenido al Club Thames
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.4, color: "rgba(255,255,255,.86)", position: "relative" }}>
          Por ser cliente tenés beneficios todos los meses.
        </p>
      </div>

      <div style={{ margin: "-48px 16px 0", background: "var(--card)", borderRadius: 22, boxShadow: "0 10px 30px rgba(0,0,0,.10)", padding: "4px 18px", position: "relative" }}>
        <Beneficio
          color="var(--m)" fondo="var(--m-soft)"
          titulo={`${club.descuento_pct}% off todos los meses`}
          texto="Con tu perfil completo y la cuota al día."
          icono={<><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>}
          borde
        />
        <Beneficio
          color="var(--ok)" fondo="var(--ok-bg)"
          titulo={`Vos ganás ${money(club.premio_amigo)} por cada amigo`}
          texto={`Invitalo con tu código. Y tu amigo arranca con ${money(club.premio_invitado)} de descuento.`}
          icono={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M19 8v6M16 11h6" /></>}
          borde
        />
        <Beneficio
          color="var(--wa)" fondo="var(--wa-bg)"
          titulo="Si te chocan, te queda más plata"
          texto="Reclamamos por vos y de lo que cobres te queda el 80% (sin el Club, el 70%). Además: consulta legal gratis y precio de socio en gestoría y escribanía."
          icono={<><path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></>}
        />
      </div>

      {faltan > 0 ? (
        <div style={{ margin: "16px 16px 0", padding: "14px 16px", borderRadius: 16, background: "var(--card)", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t2)" }}>
            Tu perfil está al {pct}% · te falta{faltan > 1 ? "n" : ""} {faltan} dato{faltan > 1 ? "s" : ""}
          </span>
          <div style={{ height: 8, borderRadius: 99, background: "var(--div)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--m)", borderRadius: 99 }} />
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: "auto", padding: "22px 16px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={() => { cerrar(); onCompletar?.(); }}
          style={{ height: 54, borderRadius: 16, border: "none", background: "var(--m)", color: "#fff", fontSize: 17, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
        >
          {faltan > 0 ? "Completar mi perfil y activar" : "Ver mis beneficios"}
        </button>
        <button
          type="button"
          onClick={cerrar}
          style={{ height: 46, borderRadius: 16, border: "none", background: "transparent", color: "var(--t2)", fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}

function Beneficio({ color, fondo, titulo, texto, icono, borde }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: borde ? "1px solid var(--div)" : "none" }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: fondo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icono}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</span>
        <span style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.3 }}>{texto}</span>
      </div>
    </div>
  );
}
