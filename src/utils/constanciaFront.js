// Constancia 24h — render en <canvas> con estilo “carta” (sin QR ni marcas)

const W = 1240; // A4 @ ~150dpi
const H = 1754;
const M = 100;  // margen externo

function setFont(ctx, { size = 22, weight = 'normal' } = {}) {
  ctx.font = `${weight} ${size}px Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.fillStyle = '#111'; // texto principal
}

function text(ctx, str, x, y, opts = {}) {
  if (opts.color) ctx.fillStyle = opts.color;
  setFont(ctx, opts);
  ctx.fillText(String(str ?? ''), x, y);
}

function measure(ctx, str, opts = {}) {
  setFont(ctx, opts);
  return ctx.measureText(String(str ?? ''));
}

function wrap(ctx, str, x, y, maxWidth, lineHeight, opts = {}) {
  const words = String(str || '').split(/\s+/);
  let line = '';
  let yy = y;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (measure(ctx, test, opts).width > maxWidth && i > 0) {
      text(ctx, line, x, yy, opts);
      line = words[i];
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) text(ctx, line, x, yy, opts);
  return yy;
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return dd;
}

function formatFechaLarga(dateOrIso, ciudad = '') {
  const d = new Date(dateOrIso || Date.now());
  const dia = d.toLocaleDateString('es-AR', { day: '2-digit' });
  const mes = d.toLocaleDateString('es-AR', { month: 'long' });
  const anio = d.getFullYear();
  const capMes = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${ciudad ? ciudad + ', ' : ''}${dia} de ${capMes} de ${anio}`;
}

/**
 * Renderiza la constancia en un canvas.
 * @param {object} s Solicitud
 * @param {object} options { ciudad, logoUrl, firmanteNombre, firmanteCargo, downloadName }
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderConstanciaCanvas(s, options = {}) {
  const {
    ciudad = (import.meta.env.VITE_CONSTANCIA_CIUDAD || ''),
    logoUrl = null,                // URL del logo de la compañía (png/svg). Si no viene, se dibuja un placeholder.
    firmanteNombre = (import.meta.env.VITE_FIRMA_NOMBRE || ''),
    firmanteCargo = (import.meta.env.VITE_FIRMA_CARGO || ''),
  } = options;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // Fondo blanco
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Logo (arriba derecha)
  const logoBoxW = 260;
  const logoBoxH = 120;
  const logoX = W - M - logoBoxW;
  const logoY = M;

  if (logoUrl) {
    try {
      const im = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.crossOrigin = 'anonymous';
        img.src = logoUrl;
      });
      // contener con proporción
      const ratio = Math.min(logoBoxW / im.width, logoBoxH / im.height);
      const w = Math.round(im.width * ratio);
      const h = Math.round(im.height * ratio);
      const ox = logoX + Math.floor((logoBoxW - w) / 2);
      const oy = logoY + Math.floor((logoBoxH - h) / 2);
      ctx.drawImage(im, ox, oy, w, h);
    } catch {
      // placeholder si falla
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(logoX, logoY, logoBoxW, logoBoxH);
      setFont(ctx, { size: 18, weight: 'bold' });
      text(ctx, 'LOGO', logoX + 100, logoY + 65);
    }
  } else {
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(logoX, logoY, logoBoxW, logoBoxH);
    setFont(ctx, { size: 18, weight: 'bold' });
    text(ctx, 'LOGO', logoX + 100, logoY + 65);
  }

  // Título centrado
  const titulo = 'Constancia';
  const met = measure(ctx, titulo, { size: 34, weight: 'bold' });
  const titleX = (W - met.width) / 2;
  const titleY = M + 180;
  text(ctx, titulo, titleX, titleY, { size: 34, weight: 'bold' });

  // Párrafo principal
  const x = M;
  const maxW = W - M * 2;
  const pTop = titleY + 40;

  const nombre = s?.cliente_nombre || '—';
  const cia = s?.compania_preferida ? `nuestra Compañía` : 'nuestra Compañía';
  const ini = formatFechaCorta(s?.inicio);
  const fin = formatFechaCorta(s?.fin);
  const pol = s?.poliza_id ? ` a través de la Póliza N° ${s.poliza_id}` : '';

  const parrafo = `Dejamos constancia que, según nuestros registros, el/la ${nombre} se encuentra asegurado por ${cia}, por el período que inicia el ${ini} y culmina el ${fin}${pol}.`;

  setFont(ctx, { size: 22 });
  const afterP = wrap(ctx, parrafo, x, pTop, maxW, 32, { size: 22 });

  // Lista de unidad asegurada
  const items = [
    ['Marca', (s?.vehiculo_marca || '—').toString().toUpperCase()],
    ['Modelo', (s?.vehiculo_modelo || '—').toString().toUpperCase()],
    ['Placa', (s?.vehiculo_patente || '—').toString().toUpperCase()],
    // Motor no lo tenemos en el modelo; si más adelante lo agregan, se puede mostrar:
    // ['Nro. de motor', s?.vehiculo_motor || '—'],
    ['Nro. de Chasis', (s?.vehiculo_vin || '—').toString().toUpperCase()],
    ['Año', s?.vehiculo_anio || '—'],
  ];

  let y = afterP + 36;
  setFont(ctx, { size: 22 });
  for (const [label, value] of items) {
    // Viñeta
    text(ctx, '•', x, y, { size: 22 });
    // Label
    text(ctx, `${label}:`, x + 20, y, { size: 22 });
    // Valor en negrita (en misma línea, a continuación)
    const lblW = measure(ctx, `${label}: `, { size: 22 }).width;
    text(ctx, value, x + 20 + lblW, y, { size: 22, weight: 'bold' });
    y += 30;
  }

  // Párrafo de cierre
  y += 20;
  const cierre = 'Se extiende el presente documento a solicitud del interesado y para los fines que considere pertinentes.';
  y = wrap(ctx, cierre, x, y, maxW, 32, { size: 22 }) + 40;

  // Lugar y fecha
  const fechaLinea = formatFechaLarga(s?.fin || Date.now(), ciudad);
  text(ctx, fechaLinea, x, y, { size: 22, weight: 'bold' });
  y += 90;

  // Firma (opcional)
  // Línea de firma
  if (firmanteNombre || firmanteCargo) {
    const lineW = 360;
    ctx.strokeStyle = '#bbb';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lineW, y);
    ctx.stroke();

    y += 26;
    if (firmanteNombre) text(ctx, firmanteNombre, x, y, { size: 20, weight: 'bold' });
    y += 24;
    if (firmanteCargo) text(ctx, firmanteCargo, x, y, { size: 18, color: '#444' });
  }

  return c;
}

/** Descarga directa como PNG */
export async function downloadConstanciaPNG(s, options = {}) {
  const { downloadName = `constancia.png`, ...opts } = options;
  const canvas = await renderConstanciaCanvas(s, opts);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
