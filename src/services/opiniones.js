// src/services/opiniones.js
// ============================================================
// ⭐ OPINIONES DE ATENCIÓN Y QUEJAS (backend: opiniones/views.py)
//
//   const r = await pedirRanking({ mes: "2026-11", oficina: 3 });   // «Mejor atención» (todos)
//   const { resultados } = await pedirOpiniones({ mes, oficina });  // con comentarios (admin)
//   await esconderOpinion(12, true);                                // no cuenta (admin)
//   const { resultados, conteo } = await pedirQuejas("NUEVA");      // bandeja (admin)
//   await guardarQueja(5, { estado: "RESUELTA", nota: "Lo llamé" });
//   const { nuevas } = await contarQuejasNuevas();                   // globito del menú (admin)
//   const p = await pedirLink({ telefono: "11 5555-0000", empleado_id: 4 }); // {wa_url, mensaje, url}
//   const { oficinas } = await pedirQrs();                          // link del QR de cada oficina
//   const { resultados } = await pedirEmpleados(oficinaId);         // con su foto
//   await guardarFoto(4, { foto_url, foto_public_id });             // (admin)
// ============================================================
import api from "./api";

const datos = (p) => p.then((r) => r.data);

export const pedirRanking = ({ mes, oficina } = {}) =>
  datos(api.get("/opiniones/resumen/", { params: { ...(mes ? { mes } : {}), ...(oficina ? { oficina } : {}) } }));

export const pedirOpiniones = (params = {}) => datos(api.get("/opiniones/lista/", { params }));
export const esconderOpinion = (id, oculta) => datos(api.patch(`/opiniones/${id}/`, { oculta }));

export const pedirQuejas = (estado) => datos(api.get("/opiniones/quejas/", { params: estado ? { estado } : {} }));
export const guardarQueja = (id, cambios) => datos(api.patch(`/opiniones/quejas/${id}/`, cambios));
export const contarQuejasNuevas = () => datos(api.get("/opiniones/quejas/", { params: { solo_conteo: 1 } }));

export const pedirLink = (cuerpo) => datos(api.post("/opiniones/enlace/", cuerpo));
export const pedirQrs = () => datos(api.get("/opiniones/qr/"));
export const pedirEmpleados = (oficina) =>
  datos(api.get("/opiniones/empleados/", { params: oficina ? { oficina } : {} }));
export const guardarFoto = (id, cambios) => datos(api.patch(`/opiniones/empleados/${id}/`, cambios));

// Lo que se gana el mejor del mes (lo muestran el ranking y la página «Atención»).
export const PREMIO_TXT = "El 1° del mes se lleva un premio";
