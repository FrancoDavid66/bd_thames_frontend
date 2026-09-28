// src/utils/comprimirImagen.js
//
// 📷 Achica una foto antes de subirla (máx. 1600 px, JPG 80%).
// Una foto del celu pesa 4–8 MB; achicada queda en ~300 KB y sube en 1–2 s.
// Si algo falla (HEIC, poca memoria, etc.) devuelve la foto original:
// nunca frena la subida.
//
// Uso:  const chica = await comprimirImagen(file);
export function comprimirImagen(file, { max = 1600, calidad = 0.8 } = {}) {
  return new Promise((resolve) => {
    let listo = false;
    const terminar = (resultado) => {
      if (listo) return;
      listo = true;
      resolve(resultado);
    };
    // Red de seguridad: pase lo que pase, en 15 s devolvemos el original.
    const timer = setTimeout(() => terminar(file), 15000);
    const cerrar = (resultado) => {
      clearTimeout(timer);
      terminar(resultado);
    };

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > height && width > max) {
            height = Math.round((height * max) / width);
            width = max;
          } else if (height > max) {
            width = Math.round((width * max) / height);
            height = max;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            return cerrar(file);
          }
          // Fondo blanco: un logo PNG transparente pasado a JPG quedaría con fondo negro.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) return cerrar(file);
              const nombre = String(file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
              cerrar(new File([blob], nombre, { type: "image/jpeg" }));
            },
            "image/jpeg",
            calidad
          );
        } catch {
          URL.revokeObjectURL(url);
          cerrar(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        cerrar(file);
      };
      img.src = url;
    } catch {
      cerrar(file);
    }
  });
}

export default comprimirImagen;
