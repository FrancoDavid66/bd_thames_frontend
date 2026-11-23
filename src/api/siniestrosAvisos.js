// src/api/siniestrosAvisos.js
//
// 📲 Avisos que mandan los CLIENTES desde el link «Tuve un siniestro» (/#/siniestro).
//    Backend: siniestros/views_avisos.py. Los ve la oficina (los suyos y los sin oficina),
//    el admin ve todos. El abogado no.
//
//    listarAvisos("NUEVO")            → [aviso, …]  ("todos" = también los cargados/descartados)
//    verAviso(7)                      → aviso
//    resumenAvisos()                  → {nuevos: 3, link_path: "/#/siniestro?of=2"}
//    cargarAviso(7, 123)              → {siniestro_id, aviso, aviso_whatsapp}
//    cambiarEstadoAviso(7, "DESCARTADO", "Era una prueba")
//    buscarPolizas("AD123CD")         → pólizas de todas las oficinas (para elegir al cargarlo)
import axios from "axios";

const BASE = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

const headers = () => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");
  return token && token !== "undefined" && token !== "null" ? { Authorization: `Bearer ${token}` } : {};
};

const url = (resto = "") => `${BASE}/siniestros-avisos/${resto}`;

/** El mensaje que dijo el servidor (ej: "Elegí la póliza del cliente."). */
export function mensajeError(e) {
  const d = e?.response?.data;
  if (!d) return e?.message || "No se pudo guardar.";
  if (typeof d === "string") return d.slice(0, 200);
  if (d.detail) return String(d.detail);
  const k = Object.keys(d)[0];
  const v = k ? d[k] : null;
  return Array.isArray(v) ? String(v[0]) : String(v || "No se pudo guardar.");
}

export async function listarAvisos(estado = "NUEVO") {
  const { data } = await axios.get(url(), { headers: headers(), params: { estado } });
  return Array.isArray(data) ? data : data?.results || [];
}

export async function verAviso(id) {
  return (await axios.get(url(`${id}/`), { headers: headers() })).data;
}

export async function resumenAvisos() {
  return (await axios.get(url("resumen/"), { headers: headers() })).data;
}

export async function cargarAviso(id, polizaId) {
  return (await axios.post(url(`${id}/cargar/`), { poliza_id: polizaId }, { headers: headers() })).data;
}

export async function cambiarEstadoAviso(id, estado, nota = "") {
  return (await axios.post(url(`${id}/estado/`), { estado, nota }, { headers: headers() })).data;
}

export async function buscarPolizas(q) {
  const { data } = await axios.get(`${BASE}/siniestros/buscar-poliza/`, { headers: headers(), params: { q } });
  return Array.isArray(data) ? data : [];
}

/** El link para mandarle al cliente (el de tu oficina). Ej: https://…vercel.app/#/siniestro?of=2 */
export function linkParaCliente(linkPath) {
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  return `${origen}${linkPath || "/#/siniestro"}`;
}
