// src/services/renovacionesCompania.js
// 🔁 Trimestre nuevo de la compañía (La Equidad), listo para aprobar.
//    La tarea de las 8:30 lo deja preparado; acá se lista y se aprueba o descarta.
import api from "./api";

export const MOTIVOS_DESCARTE = [
  { id: "no_renueva", texto: "No renueva" },
  { id: "anulada", texto: "La compañía la anuló" },
  { id: "a_mano", texto: "La renuevo a mano" },
  { id: "otro", texto: "Otro" },
];

export async function listarPropuestas(oficina) {
  const params = {};
  if (oficina) params.oficina = oficina;
  const { data } = await api.get("polizas/propuestas-renovacion/", { params });
  return data?.results || [];
}

export async function aplicarPropuesta(polizaId) {
  const { data } = await api.post(`polizas/${polizaId}/propuesta-renovacion/aplicar/`);
  return data;
}

export async function descartarPropuesta(polizaId, motivo, detalle = "") {
  const { data } = await api.post(`polizas/${polizaId}/propuesta-renovacion/descartar/`, { motivo, detalle });
  return data;
}

export async function reabrirPropuesta(polizaId) {
  const { data } = await api.post(`polizas/${polizaId}/propuesta-renovacion/reabrir/`);
  return data;
}

// Mensaje legible de un error del servidor (detail, message o el código).
export function textoError(err, porDefecto = "No se pudo hacer. Probá de nuevo.") {
  const d = err?.response?.data;
  return d?.detail || d?.message || d?.error || porDefecto;
}
