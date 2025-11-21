// src/services/notification/pagos.js
import emailjs from "@emailjs/browser";
import { fechaHoraAR } from "../../services/notifications/email";

// ⚙️ EmailJS
const SERVICE_ID = "service_r9i5qo9";
const TEMPLATE_ID = "template_4skg6yr";
const PUBLIC_KEY  = "xsntWGn3yCXlG9Exn";

try { emailjs.init(PUBLIC_KEY); } catch { /* no-op */ }

// Solo estas claves viajan al template (nada extra)
const KEYS = [
  "aviso",
  "fecha_hora",
  "cliente_nombre_apellido",
  "cliente_dni",
  "poliza_compania",
  "poliza_cobertura",
  "pago_monto",
  "pago_metodo",
  "pago_cuota",
  "pago_destino", // ✅ NUEVO
];

/**
 * Envía email "Pago registrado" al admin.
 * Claves aceptadas: (ver KEYS)
 */
export async function sendAdminPagoRegistrado(input = {}) {
  const params = {
    aviso: input.aviso || "Pago registrado",
    fecha_hora: input.fecha_hora || fechaHoraAR(new Date()),
    cliente_nombre_apellido: (input.cliente_nombre_apellido || "").trim(),
    cliente_dni: (input.cliente_dni || "").trim(),
    poliza_compania: (input.poliza_compania || "").trim(),
    poliza_cobertura: (input.poliza_cobertura || "").trim(),
    pago_monto: (input.pago_monto || "").trim(),
    pago_metodo: (input.pago_metodo || "").trim(),
    pago_cuota: (input.pago_cuota || "").trim(),
    pago_destino: (input.pago_destino || "").trim(), // ✅
  };

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([k]) => KEYS.includes(k))
  );

  // Incluimos PUBLIC_KEY explícito por si no se inicializó
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, safeParams, PUBLIC_KEY);
}
