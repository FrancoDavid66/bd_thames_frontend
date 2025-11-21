// src/utils/solicitudes/createSolicitud.js
import { solicitudesApi } from '../../services/solicitudes';
import { uploadToCloudinary } from '../cloudinary';
import { normalizaTelefonoAR, guessMimeByName } from './common';

export function buildSolicitudBody(data) {
  return {
    cliente_nombre: `${(data.nombre || '').trim()} ${(data.apellido || '').trim()}`
      .replace(/\s+/g, ' ')
      .trim(),
    cliente_dni: String(data.cliente_dni || '').trim(),
    telefono: normalizaTelefonoAR(data.telefono) || null,
    vehiculo_patente: String(data.vehiculo_patente || '').trim().toUpperCase(),
    vehiculo_marca: String(data.vehiculo_marca || '').trim(),
    vehiculo_modelo: String(data.vehiculo_modelo || '').trim(),
    vehiculo_anio: data.vehiculo_anio ? Number(data.vehiculo_anio) : null,
    cobertura_solicitada: data.cobertura_solicitada || '',
    compania_preferida: data.compania_preferida || '',
    observaciones: String(data.observaciones || '').trim(),
  };
}

export async function crearSolicitud(body, overrideCreate) {
  return overrideCreate ? overrideCreate(body) : solicitudesApi.crear(body);
}

export async function subirFotosSolicitud(solicitudId, files = []) {
  if (!solicitudId || !files?.length) return { creados: 0, fallidos: 0 };
  const folder = `de-thames/solicitudes/${solicitudId}/fotos`;

  const uploads = await Promise.all(
    Array.from(files).map((file, i) =>
      uploadToCloudinary(file, { folder })
        .then((res) => ({ res, i, file }))
        .catch((error) => ({ error, i, file }))
    )
  );

  const ok = uploads.filter((u) => u.res && !u.error);
  let creados = 0, fallidos = uploads.length - ok.length;

  for (const u of ok) {
    const { res, i, file } = u;
    try {
      await solicitudesApi.crearDoc({
        solicitud: solicitudId,
        tipo: 'OTRO',
        url: res.secure_url,
        public_id: res.public_id,
        nombre: file?.name || `FOTO_${i + 1}`,
        mime: file?.type || guessMimeByName(file?.name),
      });
      creados++;
    } catch {
      fallidos++;
    }
  }
  return { creados, fallidos };
}

export function addFilesToQueue(currentFiles, list, max = 50) {
  const arr = Array.from(list || []);
  if (!arr.length) return { next: currentFiles, allowed: 0 };

  if (max && currentFiles.length + arr.length > max) {
    const allowed = Math.max(0, max - currentFiles.length);
    const next = allowed > 0 ? [...currentFiles, ...arr.slice(0, allowed)] : currentFiles;
    return { next, allowed };
  }
  return { next: [...currentFiles, ...arr], allowed: arr.length };
}
