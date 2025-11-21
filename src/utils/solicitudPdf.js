// PDF de “Solicitud de Seguro” (12 h). Requiere: npm i jspdf

// ---------- Helpers ----------
// Convierte Blob a dataURL
async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function urlToDataURL(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    return await blobToDataURL(blob);
  } catch {
    return null;
  }
}

function safe(v, fb = "—") {
  if (v === null || v === undefined || v === "") return fb;
  return String(v);
}

// Convierte cualquier dataURL a PNG válido para jsPDF (evita “Incomplete or corrupt PNG file”)
function toPngDataURL(dataURL) {
  return new Promise((resolve) => {
    if (!dataURL) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, img.width);
      canvas.height = Math.max(1, img.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

async function normalizeImageDataURLForJsPDF(dataURL) {
  if (!dataURL) return { dataURL: null, format: null };
  const m = /^data:image\/([a-z0-9.+-]+);/i.exec(dataURL);
  const subtype = (m?.[1] || "").toLowerCase();
  if (subtype === "png") return { dataURL, format: "PNG" };
  if (subtype === "jpeg" || subtype === "jpg") return { dataURL, format: "JPEG" };
  const png = await toPngDataURL(dataURL);
  if (png) return { dataURL: png, format: "PNG" };
  return { dataURL: null, format: null };
}

// ---------- Slug & filename helpers ----------
function slug(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-zA-Z0-9]+/g, "_")  // espacios/símbolos -> _
    .replace(/^_+|_+$/g, "")         // trim _
    .toLowerCase();
}

function splitFullNameLikeEs(fullName = "") {
  // Si viene "Juan Pablo Pérez", intenta -> nombre: "Juan Pablo", apellido: "Pérez"
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) return { nombre: fullName, apellido: "" };
  const apellido = parts[parts.length - 1];
  const nombre = parts.slice(0, -1).join(" ");
  return { nombre, apellido };
}

function buildSolicitudPdfFilename(s) {
  // Tomamos la mejor combinación disponible
  let apellido =
    s?.titular_apellido ||
    s?.cliente_apellido ||
    s?.apellido ||
    s?.cliente?.apellido ||
    "";

  let nombre =
    s?.titular_nombre ||
    s?.cliente_nombre ||
    s?.nombre ||
    s?.cliente?.nombre ||
    "";

  // Si solo hay un campo "cliente_nombre" que parece ser el nombre completo, intentamos separar
  if (!apellido && nombre && !s?.cliente_apellido && !s?.titular_apellido) {
    const split = splitFullNameLikeEs(nombre);
    nombre = split.nombre;
    apellido = split.apellido;
  }

  const compania =
    s?.compania_preferida ||
    s?.compania ||
    s?.compania_nombre ||
    s?.compania_preferida_nombre ||
    "";

  const parts = ["solicitud", apellido, nombre, compania]
    .filter(Boolean)
    .map(slug);

  let base = parts.join("_");
  if (!base || base === "solicitud") {
    base = `solicitud_${slug(s?.vehiculo_patente || s?.id || "seguro")}`;
  }
  return `${base}.pdf`;
}

// ---------- Logos por compañía ----------
function normName(x) {
  return String(x || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Resolución de assets en Vite
const COMPANY_LOGOS = {
  agrosalta: new URL("../assets/logos/agrosalta_logo.jpeg", import.meta.url).href,
  atm: new URL("../assets/logos/atm_logo.png", import.meta.url).href,
  digna: new URL("../assets/logos/digna_logo.png", import.meta.url).href,
  equidad: new URL("../assets/logos/equidad_logo.jpg", import.meta.url).href,
  "federacion patronal": new URL("../assets/logos/federacion_patronal_logo.png", import.meta.url).href,
  nre: new URL("../assets/logos/nre_logo.png", import.meta.url).href,
  providencia: new URL("../assets/logos/providencia_logo.png", import.meta.url).href,
};

async function getCompanyLogoDataURL(s) {
  const raw =
    s?.compania_preferida ||
    s?.compania ||
    s?.compania_nombre ||
    s?.compania_preferida_nombre ||
    "";
  const n = normName(raw);
  if (COMPANY_LOGOS[n]) return await urlToDataURL(COMPANY_LOGOS[n]);
  for (const key of Object.keys(COMPANY_LOGOS)) {
    if (n.includes(key)) return await urlToDataURL(COMPANY_LOGOS[key]);
  }
  return null;
}

// -----------------------------------------

export async function generateSolicitudPDF(s, opts = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true }); // 210x297

  // Paleta
  const INK = [17, 24, 39];       // gray-900
  const MUTED = [107, 114, 128];  // gray-500
  const HEADER = [31, 41, 55];    // gray-800
  const BORDER = [229, 231, 235]; // gray-200

  // Header
  const pageW = 210;
  const headerH = 32;
  doc.setFillColor(...HEADER);
  doc.rect(0, 0, pageW, headerH, "F");

  // Logo compañía (robusto contra PNG corrupto)
  let contentX = 10;
  try {
    const rawLogo = opts.logoDataURL || (await getCompanyLogoDataURL(s));
    const { dataURL: logoDataURL, format: logoFmt } = await normalizeImageDataURLForJsPDF(rawLogo);
    if (logoDataURL && logoFmt) {
      const logoH = 16;
      const logoW = 64;
      doc.addImage(logoDataURL, logoFmt, 10, (headerH - logoH) / 2, logoW, logoH, undefined, "FAST");
      contentX = 10 + logoW + 6;
    }
  } catch {
    /* sin logo si falla */
  }

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text("Solicitud de Seguro", contentX, 14);

  // Meta: emitido + vigencia 12h
  const emitido = new Date();
  const vence = new Date(emitido.getTime() + 12 * 60 * 60 * 1000);
  doc.setFontSize(9);
  doc.text(`Emitido: ${emitido.toLocaleString()}`, contentX, 20);
  doc.text(`Vigencia: 12 horas (hasta ${vence.toLocaleString()})`, contentX, 26);

  // Cuerpo
  const margin = 12;
  let y = headerH + 8;

  // Caja 1: Cliente (SIN responsable)
  const boxW = (pageW - margin * 2 - 4) / 2;
  const box1H = 48; // altura ajustada al quitar "Responsable"
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, boxW, box1H, 3, 3);
  doc.setTextColor(...MUTED); doc.setFontSize(9); doc.text("Cliente", margin + 3, y + 6);
  doc.setTextColor(...INK); doc.setFontSize(11);
  const nombreCliente =
    s?.cliente_nombre ||
    [s?.cliente?.nombre, s?.cliente?.apellido].filter(Boolean).join(" ") ||
    [s?.titular_nombre, s?.titular_apellido].filter(Boolean).join(" ") ||
    [s?.nombre, s?.apellido].filter(Boolean).join(" ");
  doc.text(safe(nombreCliente), margin + 3, y + 14);
  doc.setTextColor(...MUTED); doc.setFontSize(9); doc.text("DNI", margin + 3, y + 22);
  doc.setTextColor(...INK); doc.setFontSize(11); doc.text(safe(s?.cliente_dni), margin + 3, y + 30);
  doc.setTextColor(...MUTED); doc.setFontSize(9); doc.text("Teléfono", margin + 3, y + 38);
  doc.setTextColor(...INK); doc.setFontSize(11); doc.text(safe(s?.telefono), margin + 3, y + 46);

  // Caja 2: Vehículo
  const col2X = margin + boxW + 4;
  doc.setDrawColor(...BORDER);
  doc.roundedRect(col2X, y, boxW, box1H, 3, 3);
  doc.setTextColor(...MUTED); doc.setFontSize(9); doc.text("Vehículo", col2X + 3, y + 6);
  doc.setTextColor(...INK); doc.setFontSize(11);
  doc.text(`${safe(s?.vehiculo_marca)} ${safe(s?.vehiculo_modelo)} ${safe(s?.vehiculo_anio, "")}`.trim(), col2X + 3, y + 14);
  doc.setTextColor(...MUTED); doc.setFontSize(9); doc.text("Patente", col2X + 3, y + 22);
  doc.setTextColor(...INK); doc.setFontSize(11); doc.text(safe(s?.vehiculo_patente), col2X + 3, y + 30);
  doc.setTextColor(...MUTED); doc.setFontSize(9); doc.text("Cobertura solicitada", col2X + 3, y + 38);
  doc.setTextColor(...INK); doc.setFontSize(11); doc.text(safe(s?.cobertura_solicitada), col2X + 3, y + 46);

  y += box1H + 8;

  // Aviso legal
  doc.setTextColor(107, 114, 128); doc.setFontSize(9);
  doc.text(
    "Esta constancia es un resumen informativo de la solicitud. No reemplaza la póliza ni garantiza cobertura hasta su emisión por la compañía.",
    margin,
    y
  );

  // Guardar con nombre limpio: solicitud_apellido_nombre_compañia.pdf
  const filename = opts?.downloadName || buildSolicitudPdfFilename(s);
  doc.save(filename);
}
