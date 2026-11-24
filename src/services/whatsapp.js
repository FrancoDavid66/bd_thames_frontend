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
//   const a = await prepararAdjunto(file);  // foto → JPG ≤ 5 MB / PDF ≤ 16 MB (o a.error)
//   await enviarArchivo(1, "5491122334455", a.archivo, "Te mando la póliza", (pct) => …);
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

// 🏢 De qué oficina es cada número: { lineas, oficinas } y cambiar nombre / oficina.
//   await guardarLinea(3, { nombre: "KM39", oficina: 4 });
export const pedirLineas = () => datos(api.get("/whatsapp/lineas/"));
export const guardarLinea = (id, cambios) => datos(api.patch(`/whatsapp/lineas/${id}/`, cambios));

export const pedirHilo = (linea, tel) => datos(api.get(`/whatsapp/conversaciones/${linea}/${tel}/`));

export const enviarTexto = (linea, tel, texto) => datos(api.post("/whatsapp/enviar/", { linea, tel, texto }));

export const enviarAudio = (linea, tel, blob) => {
  const fd = new FormData();
  fd.append("linea", linea);
  fd.append("tel", tel);
  fd.append("audio", blob, "nota-de-voz.webm");
  return datos(api.post("/whatsapp/enviar/", fd, { timeout: 90000 }));
};

// 📎 Foto o PDF (con un texto opcional abajo, como en WhatsApp).
export const enviarArchivo = (linea, tel, archivo, texto = "", onProgreso) => {
  const fd = new FormData();
  fd.append("linea", linea);
  fd.append("tel", tel);
  fd.append("archivo", archivo, archivo.name || "archivo");
  if (texto) fd.append("texto", texto);
  return datos(api.post("/whatsapp/enviar/", fd, {
    timeout: 120000,
    onUploadProgress: (e) => onProgreso && e.total && onProgreso(Math.round((e.loaded / e.total) * 100)),
  }));
};

// ── Preparar lo que se adjunta ──────────────────────────────────────────────
// WhatsApp acepta fotos JPG/PNG de hasta 5 MB y PDF (acá hasta 16 MB).
// Ejemplo: una foto del celu de 8 MB (o .webp) → se pasa a JPG de ~1 MB acá
// mismo, en el navegador, antes de mandarla. Un .docx → "solo fotos o PDF".
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 16 * 1024 * 1024;

export function pesoLindo(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

async function abrirImagen(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* probamos con <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function aJpg(file) {
  const img = await abrirImagen(file);
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const base = (file.name || "foto").replace(/\.[^.]+$/, "") || "foto";
  for (const [lado, calidad] of [[2560, 0.85], [1920, 0.8], [1600, 0.7], [1280, 0.6]]) {
    const k = Math.min(1, lado / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; // las partes transparentes de un PNG quedan blancas
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", calidad));
    if (blob && blob.size <= MAX_FOTO_BYTES) return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  }
  throw new Error("La foto es demasiado grande.");
}

/** Devuelve { archivo, tipo: "image"|"document", nombre } o { error }. */
export async function prepararAdjunto(file) {
  const nombre = file?.name || "archivo";
  const mime = (file?.type || "").toLowerCase();
  if (mime === "application/pdf" || /\.pdf$/i.test(nombre)) {
    if (file.size > MAX_PDF_BYTES) return { error: `«${nombre}» pesa ${pesoLindo(file.size)}: el máximo es 16 MB. Mandalo desde el celu.` };
    return { archivo: file, tipo: "document", nombre };
  }
  const esFoto = mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(nombre);
  if (!esFoto) return { error: `«${nombre}»: solo se pueden mandar fotos o PDF.` };
  if ((mime === "image/jpeg" || mime === "image/png") && file.size <= MAX_FOTO_BYTES) {
    return { archivo: file, tipo: "image", nombre };
  }
  try {
    const jpg = await aJpg(file); // otro formato (webp, heic…) o más de 5 MB → JPG más liviano
    return { archivo: jpg, tipo: "image", nombre: jpg.name };
  } catch {
    return { error: `«${nombre}»: no se pudo leer esa foto. Pasala a JPG y probá de nuevo.` };
  }
}

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
