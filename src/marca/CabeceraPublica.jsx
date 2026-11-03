// src/marca/CabeceraPublica.jsx
//
// 🏷️ La barra de arriba de las páginas que ve el CLIENTE sin login
//    («Mi caso» de Legales y «Mi trámite» de Gestoría).
//
//   THAMES   → la de siempre: fondo oscuro, "THAMES SEGUROS".
//   MALVINAS → fondo verde, la balanza y "MALVINAS" en amarillo.
//
//   <CabeceraPublica marca={marca} derecha="Tu caso" />

import { THAMES } from "./marcas";

export default function CabeceraPublica({ marca, derecha = "" }) {
  const m = marca || THAMES;

  if (m.id === THAMES.id) {
    return (
      <header className="flex items-center justify-between bg-slate-900 px-4 py-4 text-white">
        <b className="tracking-[0.08em]">
          THAMES <span className="text-red-300">SEGUROS</span>
        </b>
        <span className="text-[13px] text-slate-300">{derecha}</span>
      </header>
    );
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 text-white"
      style={{ background: m.recibo.primario }}
    >
      <span className="flex items-center gap-2.5">
        <img src={m.logo} alt="" className="h-9 w-9 rounded-lg" />
        <b className="tracking-[0.1em]" style={{ color: m.amarillo || "#FFFFFF" }}>
          {m.nombreCorto}
        </b>
      </span>
      <span className="text-[13px] text-white/80">{derecha}</span>
    </header>
  );
}
