// src/api/siniestrosPortal.js
//
// 🔑 Lo que ve el cliente en su portal al tocar el siniestro («Gestión de su siniestro»).
//    Backend: siniestros/views.py (acciones `portal`). Verlo: quien ve el siniestro.
//    Cambiarlo: solo el admin (el servidor devuelve 403 a los demás).
//
//    Todas devuelven lo mismo que GET: la barra, el próximo paso, las etapas,
//    la documentación, el cobro con poder y cada paso de la gestión.
import axios from "axios";

const BASE = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const headers = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  return token && token !== "undefined" && token !== "null" ? { Authorization: `Bearer ${token}` } : {};
};

const url = (id, resto = "") => `${BASE}/siniestros/${id}/portal/${resto}`;

/** El mensaje que dijo el servidor (ej: "Tiene que estar entre 0 y 6."). */
export function mensajeError(e) {
  const d = e?.response?.data;
  if (!d) return e?.message || "No se pudo guardar.";
  if (typeof d === "string") return d.slice(0, 200);
  if (d.detail) return d.detail;
  const k = Object.keys(d)[0];
  const v = k ? d[k] : null;
  return Array.isArray(v) ? String(v[0]) : String(v || "No se pudo guardar.");
}

export async function verPortal(id) {
  return (await axios.get(url(id), { headers: headers() })).data;
}

/** {paso, proximo, siguientes, documentacion, cobro_con_poder} (solo lo que cambia). */
export async function guardarPortal(id, cambios) {
  return (await axios.patch(url(id), cambios, { headers: headers() })).data;
}

/** Sumar un paso a mano: {texto, fecha: "2026-10-16", visible}. */
export async function agregarPaso(id, datos) {
  return (await axios.post(url(id, "pasos/"), datos, { headers: headers() })).data;
}

/** Cambiar un paso: {texto, fecha, visible}. */
export async function editarPaso(id, pasoId, cambios) {
  return (await axios.patch(url(id, `pasos/${pasoId}/`), cambios, { headers: headers() })).data;
}

export async function borrarPaso(id, pasoId) {
  return (await axios.delete(url(id, `pasos/${pasoId}/`), { headers: headers() })).data;
}

/** El orden nuevo de los pasos: [5, 3, 4]. */
export async function ordenarPasos(id, ids) {
  return (await axios.post(url(id, "orden/"), { ids }, { headers: headers() })).data;
}
