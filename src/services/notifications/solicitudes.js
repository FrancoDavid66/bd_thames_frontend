// src/services/notifications/solicitudes.js
// Realtime front-only (polling + BroadcastChannel) para counters de Solicitudes.

import { solicitudesApi } from "../../services/solicitudes.js";

let subscribers = new Set();
let pollTimer = null;
let lastJSON = "";
let channel = null;

function ensureChannel() {
  if (channel) return channel;
  try {
    channel = new BroadcastChannel("solicitudes");
    channel.onmessage = (e) => {
      const m = e.data;
      for (const cb of subscribers) {
        try { cb(m); } catch {}
      }
    };
  } catch {
    // Browser sin BroadcastChannel → no hacemos nada
  }
  return channel;
}

function fanout(evt) {
  // listeners locales
  for (const cb of subscribers) {
    try { cb(evt); } catch {}
  }
  // entre pestañas
  const ch = ensureChannel();
  try { ch && ch.postMessage(evt); } catch {}
}

// 🧹 Antes pegaba a solicitudesApi.resumen() (endpoint /resumen/ BORRADO → 404
//    cada 5s). Ahora los contadores se calculan desde la LISTA real de solicitudes.
function _tareas(s) {
  return {
    alta_compania: Boolean(s?.tareas?.alta_compania ?? s?.alta_compania ?? false),
    enviar_poliza: Boolean(s?.tareas?.enviar_poliza ?? s?.enviar_poliza ?? false),
  };
}

async function pollOnce() {
  try {
    const lista = await solicitudesApi.listar(); // array de solicitudes
    const arr = Array.isArray(lista) ? lista : [];
    const activos = arr.filter((s) => s?.estado !== "TERMINADA");

    // Mismos contadores que usa el Header / la página.
    const counters = {
      por_asegurar: activos.filter((s) => !_tareas(s).alta_compania).length,
      vigentes_24h: activos.filter((s) => !_tareas(s).enviar_poliza).length,
      total: arr.length,
      terminadas: arr.filter((s) => s?.estado === "TERMINADA").length,
    };

    const json = JSON.stringify(counters);
    if (json !== lastJSON) {
      lastJSON = json;
      fanout({ type: "solicitudes.counters.backend", data: counters });
    }
  } catch {
    // silencioso
  }
}

function start(intervalMs = 5000) {
  if (pollTimer) return;
  pollOnce();
  pollTimer = setInterval(pollOnce, intervalMs);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export function subscribe(cb) {
  if (typeof cb === "function") {
    subscribers.add(cb);
    start();
    return () => subscribers.delete(cb);
  }
  return () => {};
}

export function emitLocal(evt) {
  fanout(evt);
}

export const solicitudesRealtime = {
  subscribe,
  emitLocal,
  start,
  stop,
  refresh: pollOnce,
};

export default solicitudesRealtime;