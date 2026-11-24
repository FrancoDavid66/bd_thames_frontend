// src/services/whatsapp.js
// ============================================================
// 📲 WHATSAPP OFICIAL (YCloud) — panel y chats (solo admin).
//
//   const r = await pedirResumen({ dias: 1, umbral: 15 });           // panel
//   const { conversaciones } = await pedirConversaciones();           // lista de chats
//   const h = await pedirHilo(1, "5491122334455");                    // la charla completa
//   await enviarTexto(1, "5491122334455", "Hola! ya te ayudo");       // responder
//   await enviarAudio(1, "5491122334455", blobGrabado);               // nota de voz
//   const url = await urlMedia(123);                                  // escuchar un audio
// ============================================================
import api from "./api";

const datos = (p) => p.then((r) => r.data);

export const pedirResumen = ({ dias = 1, umbral = 15 } = {}) =>
  datos(api.get("/whatsapp/resumen/", { params: { dias, umbral } }));

export const pedirConversaciones = (linea) =>
  datos(api.get("/whatsapp/conversaciones/", { params: linea ? { linea } : {} }));

export const pedirHilo = (linea, tel) => datos(api.get(`/whatsapp/conversaciones/${linea}/${tel}/`));

export const enviarTexto = (linea, tel, texto) => datos(api.post("/whatsapp/enviar/", { linea, tel, texto }));

export const enviarAudio = (linea, tel, blob) => {
  const fd = new FormData();
  fd.append("linea", linea);
  fd.append("tel", tel);
  fd.append("audio", blob, "nota-de-voz.webm");
  return datos(api.post("/whatsapp/enviar/", fd, { timeout: 90000 }));
};

// Los audios y fotos piden estar logueado: se bajan como blob y se arma una URL local.
const cacheMedia = new Map();
export async function urlMedia(id) {
  if (cacheMedia.has(id)) return cacheMedia.get(id);
  const r = await api.get(`/whatsapp/mensajes/${id}/media/`, { responseType: "blob" });
  const url = URL.createObjectURL(r.data);
  cacheMedia.set(id, url);
  return url;
}
