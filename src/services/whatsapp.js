// src/services/whatsapp.js
// ============================================================
// 📲 WHATSAPP OFICIAL (YCloud) — panel de control (solo admin).
//
//   const r = await pedirResumen({ dias: 1, umbral: 15 });
//   r.lineas[0] → { nombre: "Siniestros", entrantes, salientes, promedio_respuesta_min,
//                   sin_responder: [{ cliente_tel, cliente_nombre, minutos, atrasado, ... }] }
// ============================================================
import api from "./api";

export const pedirResumen = ({ dias = 1, umbral = 15 } = {}) =>
  api.get("/whatsapp/resumen/", { params: { dias, umbral } }).then((r) => r.data);
