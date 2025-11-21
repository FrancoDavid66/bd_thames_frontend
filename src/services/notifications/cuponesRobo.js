// src/services/notifications/cuponesRobo.js
import emailjs from "@emailjs/browser";
import { fechaHoraAR } from "./email";

// ⚙️ EmailJS (mismo servicio/llave que pagos)
const SERVICE_ID = "service_r9i5qo9";
const TEMPLATE_ID = "template_oj44zis";
const PUBLIC_KEY = "xsntWGn3yCXlG9Exn";

try {
  emailjs.init(PUBLIC_KEY);
} catch {
  /* no-op */
}

// 🔒 Lista blanca de claves del template.
// 👉 Debe coincidir con las variables definidas en EmailJS.
const KEYS = [
  "aviso",
  "fecha_hora",

  // (Ya no los mostrás en el HTML, pero los dejamos por si los querés usar)
  "poliza_id",
  "cupon_id",

  "cupon_periodo",
  "cupon_vencimiento",
  "cupon_estado",
  "cupon_foto_url",

  "cliente_nombre_apellido",
  "cliente_dni",

  // 🆕 Datos del vehículo
  "vehiculo_marca",
  "vehiculo_modelo",
  "vehiculo_anio",
];

export function sendAdminCuponRoboPagado(input = {}) {
  const ahora = fechaHoraAR();

  const params = {
    aviso: (input.aviso || "Cupón de robo marcado como PAGADO").toString(),
    fecha_hora: (input.fecha_hora || ahora).toString(),

    poliza_id: String(input.poliza_id ?? ""),
    cupon_id: String(input.cupon_id ?? ""),

    cupon_periodo: (input.cupon_periodo || "").toString(),
    cupon_vencimiento: (input.cupon_vencimiento || "").toString(),
    cupon_estado: (input.cupon_estado || "PAGADA").toString(),
    cupon_foto_url: (input.cupon_foto_url || "").toString(),

    cliente_nombre_apellido: (input.cliente_nombre_apellido || "").toString(),
    cliente_dni: (input.cliente_dni || "").toString(),

    // 🆕 Vehículo
    vehiculo_marca: (input.vehiculo_marca || "").toString(),
    vehiculo_modelo: (input.vehiculo_modelo || "").toString(),
    vehiculo_anio: (input.vehiculo_anio || "").toString(),
  };

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(
      ([k]) => !KEYS.length || KEYS.includes(k)
    )
  );

  return emailjs.send(SERVICE_ID, TEMPLATE_ID, safeParams, PUBLIC_KEY);
}
