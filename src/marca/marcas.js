// src/marca/marcas.js
//
// 🏷️ LAS MARCAS DE LA APP (02/11/2026)
// ─────────────────────────────────────
// Misma app, misma base de datos, distinto "disfraz".
//   · Un usuario de la oficina MALVINAS entra al mismo THAMES de siempre,
//     pero ve el logo, los colores y el nombre de Malvinas: en la app, en los
//     recibos, en la cotización y en el portal de sus clientes.
//   · Todos los demás siguen viendo THAMES, igual que hoy.
//
// ¿CÓMO SABE CUÁL MARCA VA? Por el NOMBRE de la oficina.
//   Si la oficina se llama "Malvinas" (o "Malvinas Centro", lo que sea que
//   tenga la palabra) → marca Malvinas. No hay que configurar nada más.
//     Ej: usuario "juan" de la oficina "Malvinas"        → ve Malvinas.
//     Ej: el admin imprime el recibo de una póliza de
//         la oficina Malvinas                             → sale de Malvinas.
//     Ej: usuario de "5 Esquinas"                         → ve THAMES.
//
// ¿Y ANTES DE ENTRAR (pantalla de login)? Ahí todavía no hay usuario:
//   1) si la dirección web dice "malvinas" (ej. malvinas-seguros.vercel.app) → Malvinas
//   2) si no, la última marca que entró en ESA compu (la recuerda el navegador)
//   3) si no, THAMES.
//
// Para sumar otra marca mañana: se copia el bloque MALVINAS, se cambian
// los datos y se agrega a la lista MARCAS de abajo. Nada más.

import logoThames from "../assets/logos/logo_thames.svg";
import logoMalvinas from "../assets/logos/malvinas_logo.svg";
import { LOGO_MALVINAS_PNG } from "./logoMalvinasPng";

/* ───────────────────────── THAMES (la de siempre) ─────────────────────────
   Todo lo de acá es EXACTAMENTE lo que la app ya mostraba: con THAMES no
   cambia nada, ni un color. */
export const THAMES = {
  id: "thames",
  claves: [],                            // es la de fábrica: no se busca por nombre
  nombre: "Thames Seguros",              // sidebar
  nombreCorto: "THAMES",                 // header ("THAMES APP")
  partesLogin: ["Thames", "Seguros"],    // login: "Thames" + "Seguros" en color
  lema: "Portal de gestión operativa",   // debajo del nombre en el login
  tituloPestana: "THAMES APLICACION",
  estudio: "Estudio Thames",             // "Constancia interna de Estudio Thames"
  estudioMayus: "ESTUDIO THAMES",        // expediente de siniestro en el portal
  pagarnos: "Pagarnos a Thames",         // forma de pago del portal
  telefono: "+54 9 11 2424-8190",        // el del productor en la cotización
  logo: logoThames,                      // SVG cuadrado (header, sidebar, login)
  logoPng: null,                         // el recibo de THAMES no lleva logo (como siempre)
  favicon: logoThames,
  // 🎨 null = los colores de index.css, sin tocar nada.
  colores: null,
  // 🧾 Recibo (PDF A4): los colores de siempre (bordó).
  recibo: {
    primario: "#8B1E3F",
    oscuro: "#5E1329",
    borde: "#E6C9D2",
    fondo: "#FBEFF3",
    caja: "#FFF6F8",
    total: "#FCF7F9",
    linea: "#F1E4E9",
    subtitulo: "Servicios Jurídicos y Seguros",
    pie: "",
  },
  // 📄 Cotización (propuesta para el cliente)
  cotizacion: {
    color: "#e11d48",
    fuerte: "#be123c",
    nombre: ["THAMES", "Seguros"],
    archivo: "ThamesSeguros",
  },
};

/* ───────────────────────── MALVINAS ─────────────────────────
   Sacado del cartel de la oficina: verde a rayas, letras amarillas,
   la balanza y "SEGUROS · ABOGADOS · LEGALES 24 HS". */
const VERDE = "#1E6B2E";
const VERDE_OSCURO = "#134A1F";
const VERDE_VIVO = "#2F9E4F"; // para el modo oscuro (sobre fondo oscuro el verde oscuro no se lee)
const AMARILLO = "#F2D91B";

export const MALVINAS = {
  id: "malvinas",
  claves: ["malvinas"],                  // oficina o dirección web con esta palabra → esta marca
  nombre: "Malvinas",
  nombreCorto: "MALVINAS",
  partesLogin: ["Malvinas", "Seguros"],
  lema: "Seguros · Abogados · Legales 24 hs",
  tituloPestana: "MALVINAS · Seguros y Abogados",
  estudio: "Malvinas",
  estudioMayus: "MALVINAS · SEGUROS Y ABOGADOS",
  pagarnos: "Pagarnos a Malvinas",
  telefono: "11-6032-2844",              // el del cartel
  logo: logoMalvinas,
  logoPng: LOGO_MALVINAS_PNG,
  favicon: logoMalvinas,
  amarillo: AMARILLO,
  verde: VERDE,
  // 🎨 Los colores de la app que se pisan para esta marca.
  //    --color-marca        → el "rojo THAMES" de la app (barras, detalles)
  //    --color-duo-violeta  → el acento principal (botones, foco)
  //    El azul (info) y el verde de "cobrado" NO se tocan: avisan cosas.
  colores: {
    claro: {
      "--color-marca": VERDE,
      "--color-duo-violeta": VERDE,
      "--color-duo-violeta-sombra": VERDE_OSCURO,
      "--color-duo-violeta-soft": "#E3F1E5",
    },
    oscuro: {
      "--color-marca": VERDE_VIVO,
      "--color-duo-violeta": VERDE_VIVO,
      "--color-duo-violeta-sombra": VERDE,
      "--color-duo-violeta-soft-dark": "#12301A",
    },
  },
  recibo: {
    primario: VERDE,
    oscuro: VERDE_OSCURO,
    borde: "#C9E2CC",
    fondo: "#EEF7EF",
    caja: "#F5FBF5",
    total: "#F3F9F3",
    linea: "#E1EFE2",
    subtitulo: "Seguros · Abogados · Legales 24 hs",
    pie: "MALVINAS · Seguros y Abogados · WhatsApp 11-6032-2844",
    // 🟢 Recibo con diseño PROPIO (no el de THAMES pintado de verde):
    //    src/components/pagos/ReciboMalvinas.jsx. Sin esta línea, el recibo
    //    vuelve a ser el de THAMES con los colores de arriba.
    diseno: "malvinas",
  },
  cotizacion: {
    color: VERDE,
    fuerte: VERDE_OSCURO,
    nombre: ["MALVINAS", "Seguros"],
    archivo: "Malvinas",
  },
};

/* Todas las marcas "especiales". THAMES es la de fábrica (no va en la lista). */
export const MARCAS = [MALVINAS];

/* ───────────────────────── Cómo se elige ───────────────────────── */

// "Malvinas (MALVINAS)", "MALVINAS", "Oficina Malvinas" → "oficina malvinas"
const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * La marca que corresponde a una oficina, mirando sus textos (nombre, código).
 * Devuelve null si ninguno coincide (= THAMES).
 *   marcaDeTextos("Malvinas (OFI-06)") → MALVINAS
 *   marcaDeTextos("5 esquinas (1)")    → null
 */
export function marcaDeTextos(...textos) {
  for (const t of textos) {
    const n = normalizar(t);
    if (!n) continue;
    for (const m of MARCAS) {
      if (m.claves.some((k) => n.includes(k))) return m;
    }
  }
  return null;
}

/** La marca de un usuario logueado (por su oficina). null = THAMES. */
export function marcaDelUsuario(user) {
  const p = user?.perfil || {};
  return marcaDeTextos(p.oficina_nombre, p.oficina_codigo);
}

/** La marca por la dirección web (ej. malvinas-seguros.vercel.app). */
export function marcaDelDominio() {
  try {
    return marcaDeTextos(window.location.hostname);
  } catch {
    return null;
  }
}

/**
 * La marca de una PÓLIZA (o de cualquier cosa que traiga la oficina):
 * se fija en todos los nombres de campo que usa el backend.
 */
export function marcaDePoliza(poliza) {
  const p = poliza && typeof poliza === "object" ? poliza : {};
  const ofi = p.oficina && typeof p.oficina === "object" ? p.oficina : null;
  return marcaDeTextos(
    p.oficina_nombre,
    p.poliza_oficina_nombre,
    p.oficinaName,
    ofi?.nombre,
    ofi?.codigo,
    typeof p.oficina === "string" ? p.oficina : ""
  );
}

/* 💾 La última marca que entró en esta compu (para el login). */
const CLAVE_DISPOSITIVO = "thames.marca.dispositivo";

export function marcaGuardada() {
  try {
    const id = localStorage.getItem(CLAVE_DISPOSITIVO);
    return MARCAS.find((m) => m.id === id) || null;
  } catch {
    return null;
  }
}

export function guardarMarcaDispositivo(marca) {
  try {
    if (marca && marca.id !== THAMES.id) localStorage.setItem(CLAVE_DISPOSITIVO, marca.id);
    else localStorage.removeItem(CLAVE_DISPOSITIVO);
  } catch {
    /* modo privado: no pasa nada */
  }
}

/** Busca una marca por id ("thames" | "malvinas"). */
export function marcaPorId(id) {
  if (!id) return THAMES;
  return MARCAS.find((m) => m.id === id) || THAMES;
}

/**
 * Cómo se nombra el lugar donde el cliente retira/atiende.
 *   THAMES   + "Axion"    → "THAMES Axion"   (como siempre)
 *   MALVINAS + "Malvinas" → "Malvinas"        (no repite "Malvinas Malvinas")
 *   MALVINAS + "Centro"   → "Malvinas Centro"
 */
export function nombreLugar(marca, oficinaNombre) {
  const m = marca || THAMES;
  const ofi = String(oficinaNombre || "").trim();
  if (m.id === THAMES.id) return `THAMES ${ofi}`.trim();
  if (!ofi) return m.nombre;
  return normalizar(ofi).includes(normalizar(m.nombre)) ? ofi : `${m.nombre} ${ofi}`;
}
