// src/utils/cloudinary.js

// Lee de .env (Vite) y usa tus valores como fallback
const CLOUD_NAME = import.meta?.env?.VITE_CLOUDINARY_CLOUD_NAME || "dvsyvhqym";
const UPLOAD_PRESET = import.meta?.env?.VITE_CLOUDINARY_UPLOAD_PRESET || "PresetForm";

/**
 * Sube un archivo a Cloudinary (unsigned).
 * Usa /auto/upload para aceptar imágenes y PDFs.
 *
 * USO SOPORTADO:
 *   uploadToCloudinary(file, "carpeta/en/cloudinary")
 *   uploadToCloudinary(file, { folder: "carpeta/en/cloudinary" })
 *
 * @param {File|Blob|string} file
 * @param {string|{folder?:string}} folderOrOptions
 * @returns {Promise<{secure_url:string, public_id:string, resource_type?:string, format?:string, original_filename?:string, mime?:string}>}
 */
export async function uploadToCloudinary(file, folderOrOptions = "rc-admin/uploads") {
  // ✅ Soporta llamada con objeto: uploadToCloudinary(file, { folder })
  let folder = "rc-admin/uploads";
  if (typeof folderOrOptions === "string") {
    folder = folderOrOptions;
  } else if (folderOrOptions && typeof folderOrOptions === "object") {
    folder = folderOrOptions.folder || folder;
  }

  // ✅ Mensaje alineado con lo que ves en pantalla
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Falta configurar Cloudinary (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET)."
    );
  }

  // 'auto' para soportar imágenes + PDFs
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET); // Debe ser UNSIGNED
  if (folder) fd.append("folder", folder);

  const res = await fetch(url, { method: "POST", body: fd });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // no-op
  }

  if (!res.ok) {
    const msg = data?.error?.message || `Error subiendo archivo (HTTP ${res.status})`;
    throw new Error(msg);
  }

  // Deducción de MIME útil para guardarlo en tu backend
  let mime = "application/octet-stream";
  if (data.resource_type === "image") {
    mime = `image/${data.format || "jpeg"}`;
  } else if (data.resource_type === "raw" && data.format === "pdf") {
    mime = "application/pdf";
  } else if (typeof data.secure_url === "string") {
    const low = data.secure_url.toLowerCase();
    if (low.endsWith(".pdf")) mime = "application/pdf";
    else if (low.endsWith(".png")) mime = "image/png";
    else if (low.endsWith(".jpg") || low.endsWith(".jpeg")) mime = "image/jpeg";
  }

  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    resource_type: data.resource_type,
    format: data.format,
    original_filename: data.original_filename,
    mime,
  };
}

export { CLOUD_NAME, UPLOAD_PRESET };
