// src/utils/email.js
import emailjs from "@emailjs/browser";

/** ⚙️ EmailJS (sin .env) */
const SERVICE_ID = "service_r9i5qo9";
const TEMPLATE_ID = "template_ad1iyjx";
const PUBLIC_KEY  = "xsntWGn3yCXlG9Exn"; // tu Public Key

try { emailjs.init(PUBLIC_KEY); } catch { /* no-op */ }

/* ===== Helpers ===== */
export function fechaHoraAR(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    }).format(date).replace(",", "");
  } catch {
    const d = new Date(date), p = (x)=>String(x).padStart(2,"0");
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
}

/** 🔒 Lista blanca de variables del template */
const ALLOWED_TEMPLATE_KEYS = [
  "aviso",
  "fecha_hora",
  "cliente_nombre_apellido",
  "cliente_dni",
  "auto_marca",
  "auto_modelo",
  "auto_anio",
  "poliza_cobertura",
  "poliza_compania",
];

/**
 * Envía mail al admin **solo** con las claves del template.
 * Acepta payload “mínimo” o “legacy”, pero siempre mapea a las 9 claves permitidas.
 * Si llegan extras, se IGNORAN y se advierte por consola.
 */
export async function sendAdminNuevaSolicitud(input = {}) {
  // Soporte de ambos formatos (mínimo y legacy) → mapeamos a claves del template
  const cliente_nombre_apellido =
    (input.cliente_nombre_apellido ??
      `${(input.nombre || "").trim()} ${(input.apellido || "").trim()}`.trim()
    ).trim();

  const templateParams = {
    aviso: (input.aviso ?? "Nueva solicitud creada"),
    fecha_hora: String(input.fecha_hora || fechaHoraAR(input.fecha ?? new Date())),
    cliente_nombre_apellido,
    cliente_dni: (input.cliente_dni ?? input.dni ?? "").toString().trim(),
    auto_marca: (input.auto_marca ?? input.marca ?? "").toString().trim(),
    auto_modelo: (input.auto_modelo ?? input.modelo ?? "").toString().trim(),
    auto_anio: (input.auto_anio ?? input.anio ?? "").toString().trim(),
    poliza_cobertura: (input.poliza_cobertura ?? input.cobertura ?? "").toString().trim(),
    poliza_compania: (input.poliza_compania ?? input.compania ?? "").toString().trim(),
  };

  // ✅ Verificación: SOLO se envían estas claves
  const keysToSend = Object.keys(templateParams);
  const onlyAllowed = keysToSend.every(k => ALLOWED_TEMPLATE_KEYS.includes(k));
  if (!onlyAllowed || keysToSend.length !== ALLOWED_TEMPLATE_KEYS.length) {
    console.warn("[Email] Verificación de claves: mismatch", {
      keysToSend,
      expected: ALLOWED_TEMPLATE_KEYS,
    });
  }

  // ⚠️ Si llegaron extras en input, avisamos (pero se ignoran)
  const extraKeys = Object.keys(input).filter(k =>
    !ALLOWED_TEMPLATE_KEYS.includes(k) &&
    !["nombre","apellido","dni","marca","modelo","anio","compania","cobertura","fecha","fecha_hora"].includes(k)
  );
  if (extraKeys.length) {
    console.warn("[Email] Se recibieron claves EXTRA (ignoradas):", extraKeys);
  }

  // 🚀 Envío SOLO con las 9 variables del template
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
}
