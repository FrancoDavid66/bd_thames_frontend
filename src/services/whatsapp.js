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
//   const { esperando, ultimo_entrante } = await pedirPendientes();   // globito del menú
//   ding();                                                           // 🔔 sonó un mensaje nuevo
// ============================================================
import api from "./api";

const datos = (p) => p.then((r) => r.data);

export const pedirResumen = ({ dias = 1, umbral = 15 } = {}) =>
  datos(api.get("/whatsapp/resumen/", { params: { dias, umbral } }));

export const pedirConversaciones = (linea) =>
  datos(api.get("/whatsapp/conversaciones/", { params: linea ? { linea } : {} }));

export const pedirPendientes = () => datos(api.get("/whatsapp/pendientes/"));

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

// ── 🔔 Sonido de "entró un mensaje" ────────────────────────────────────────
// Se arma con el parlante del navegador (no hace falta ningún archivo).
// Se puede apagar desde la pantalla de WhatsApp (queda guardado en este navegador).
const CLAVE_SONIDO = "thames.whatsapp.sonido";

export function sonidoActivo() {
  try {
    return localStorage.getItem(CLAVE_SONIDO) !== "0";
  } catch {
    return true;
  }
}

export function setSonidoActivo(si) {
  try {
    localStorage.setItem(CLAVE_SONIDO, si ? "1" : "0");
  } catch {
    /* nada */
  }
  window.dispatchEvent(new CustomEvent("whatsapp-sonido", { detail: !!si }));
}

let ctxAudio = null;

// Los navegadores no dejan sonar nada hasta el primer clic en la página:
// prepararSonido() (lo llama App, solo para el admin) deja el parlante
// "despierto" con el primer clic o tecla, para que el próximo ding suene.
let preparado = false;
export function prepararSonido() {
  if (preparado || typeof window === "undefined") return;
  preparado = true;
  const despertar = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctxAudio = ctxAudio || new AC();
      if (ctxAudio.state === "suspended") ctxAudio.resume().catch(() => {});
    } catch {
      /* nada */
    }
  };
  window.addEventListener("pointerdown", despertar, { once: true, capture: true });
  window.addEventListener("keydown", despertar, { once: true, capture: true });
}

export function ding() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctxAudio = ctxAudio || new AC();
    if (ctxAudio.state === "suspended") ctxAudio.resume().catch(() => {});
    const t = ctxAudio.currentTime;
    // Dos notitas cortas (como el "tiling" de un mensaje).
    [[880, 0], [1320, 0.12]].forEach(([frec, desde]) => {
      const osc = ctxAudio.createOscillator();
      const vol = ctxAudio.createGain();
      osc.type = "sine";
      osc.frequency.value = frec;
      vol.gain.setValueAtTime(0.0001, t + desde);
      vol.gain.exponentialRampToValueAtTime(0.25, t + desde + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + desde + 0.25);
      osc.connect(vol).connect(ctxAudio.destination);
      osc.start(t + desde);
      osc.stop(t + desde + 0.3);
    });
  } catch {
    /* sin sonido no pasa nada */
  }
}
