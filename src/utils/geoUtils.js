// src/utils/geoUtils.js

/**
 * Intenta extraer coordenadas (lat, lng) desde una URL de Google Maps.
 *
 * Soporta formatos típicos:
 * - https://www.google.com/maps/@-34.7611,-58.5861,15z
 * - https://www.google.com/maps?q=-34.7611,-58.5861
 * - https://maps.app.goo.gl/...
 */
export function extraerCoordsDesdeUrl(url) {
  if (!url || typeof url !== "string") return null;

  try {
    // 1) Formato con "@lat,lng,"
    const atMatch = url.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[3]),
      };
    }

    // 2) Formato con "?q=lat,lng" o "&q=lat,lng"
    const qMatch = url.match(/[?&]q=(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[3]),
      };
    }

    // 3) Último recurso: primera pareja "lat,lng" que aparezca en la URL
    const genericMatch = url.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (genericMatch) {
      return {
        lat: parseFloat(genericMatch[1]),
        lng: parseFloat(genericMatch[3]),
      };
    }

    return null;
  } catch (e) {
    console.warn("[geoUtils] No se pudieron extraer coordenadas de la URL:", e);
    return null;
  }
}

/**
 * Devuelve un emoji según el tipo de ubicación.
 */
export function getEmojiForTipo(tipo) {
  switch (tipo) {
    case "cliente":
      return "🧑‍💼";
    case "prospecto":
      return "🕵️‍♂️";
    case "oficina_rival":
      return "🏢";
    case "cartel":
      return "📢";
    case "alquiler_disponible":
      return "📍";
    case "potencial":
      return "✨";
    default:
      return "📍";
  }
}
