// src/components/polizasNuevas/descargarSeFueron.js
// ============================================================
// 📥 "Clientes que se fueron" → Excel o PDF, para escribirles.
//
// Lo piden los chicos de las oficinas (Franco 10/10/2026): en el Inicio ven
// "se fueron 22" y quieren la lista para mandarles un mensaje.
//
//   descargarSeFueronExcel(lista, meta) → .xlsx con un link "Escribir por
//       WhatsApp" en cada fila (abre el chat con un mensaje ya armado, que se
//       puede cambiar antes de mandar).
//   descargarSeFueronPDF(lista, meta)   → .pdf para imprimir o pasar por
//       WhatsApp; tocando el teléfono también abre el chat.
//
// `lista` = lo que devuelve pedirNuevasDetalle({ mes, tipo: "perdidas" }).
// El empleado recibe SOLO los de su oficina (lo filtra el servidor).
// ExcelJS y jsPDF se cargan recién al tocar el botón (pesan).
// ============================================================
import dayjs from "dayjs";

const AZUL = "FF1E1B4B";
const MOTIVO_CORTO = {
  no_pago: "No pagó",
  no_renovo: "No renovó",
  otra_compania: "Se fue a otra compañía",
  vendio: "Vendió el auto",
  sin_uso: "No usa el auto",
  otro: "Otro motivo",
};

const motivoTxt = (p) => p.motivo_texto || MOTIVO_CORTO[p.motivo] || "Otro motivo";

/** "PEREZ, JUAN CARLOS" → "Juan" (para el saludo). */
function primerNombre(cliente) {
  const partes = String(cliente || "").split(",");
  const nombre = (partes[1] || partes[0] || "").trim().split(/\s+/)[0] || "";
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase() : "";
}

/** "PEREZ, JUAN" → "Juan Perez" (para mostrar). */
function nombreLindo(cliente) {
  const [ape, nom] = String(cliente || "").split(",").map((x) => (x || "").trim());
  const t = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return nom ? `${t(nom)} ${t(ape)}` : t(ape || "");
}

/** El mensaje que queda escrito en WhatsApp (se puede cambiar antes de mandar). */
export function mensajeWhatsapp(p) {
  const hola = primerNombre(p.cliente) ? `Hola ${primerNombre(p.cliente)}!` : "Hola!";
  const auto = [p.vehiculo, p.patente ? `(${p.patente})` : ""].filter(Boolean).join(" ") || "tu vehículo";
  if (p.motivo === "vendio") {
    return `${hola} Te escribimos de Thames Seguros 👋 Vimos que vendiste ${auto}. Si tenés otro vehículo, te lo aseguramos con el mejor precio. ¿Te pasamos una cotización?`;
  }
  if (p.motivo === "no_pago") {
    return `${hola} Te escribimos de Thames Seguros 👋 Tu ${auto} quedó sin seguro porque no se pagó la cuota. Si querés, lo regularizamos y queda asegurado de nuevo. ¿Te ayudamos?`;
  }
  return `${hola} Te escribimos de Thames Seguros 👋 Vimos que tu ${auto} ya no está asegurado con nosotros. ¿Querés que te pasemos una cotización?`;
}

export const linkWhatsapp = (p) =>
  p.whatsapp ? `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(mensajeWhatsapp(p))}` : "";

const ordenar = (items) =>
  [...(items || [])].sort(
    (a, b) =>
      String(a.oficina || "").localeCompare(String(b.oficina || "")) ||
      String(b.fecha || "").localeCompare(String(a.fecha || "")) ||
      String(a.cliente || "").localeCompare(String(b.cliente || ""))
  );

const nombreArchivo = (meta, ext) => {
  const ofi = (meta?.oficina || "Todas").replace(/[^\p{L}\p{N}]+/gu, "_");
  return `Se_fueron_${meta?.mes || dayjs().format("YYYY-MM")}_${ofi}.${ext}`;
};

function bajar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/** Excel: una fila por auto que se fue, con link para escribirle. */
export async function descargarSeFueronExcel(lista, meta = {}) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default || mod;
  const wb = new ExcelJS.Workbook();
  wb.creator = "THAMES";
  wb.created = new Date();
  const ws = wb.addWorksheet("Se fueron");

  ws.columns = [
    { header: "Se fue el", key: "fecha", width: 11 },
    { header: "Cliente", key: "cliente", width: 30 },
    { header: "Teléfono", key: "telefono", width: 15 },
    { header: "WhatsApp", key: "wa", width: 22 },
    { header: "Patente", key: "patente", width: 11 },
    { header: "Vehículo", key: "vehiculo", width: 24 },
    { header: "Compañía", key: "compania", width: 18 },
    { header: "Motivo", key: "motivo", width: 22 },
    { header: "Si paga, vuelve", key: "vuelve", width: 14 },
    { header: "Oficina", key: "oficina", width: 13 },
    { header: "Nº póliza", key: "numero", width: 24 },
    { header: "Mensaje / qué dijo", key: "notas", width: 34 },
  ];
  const cab = ws.getRow(1);
  cab.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  cab.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];

  ordenar(lista?.polizas).forEach((p) => {
    const fila = ws.addRow({
      fecha: p.fecha ? dayjs(p.fecha).format("DD/MM/YYYY") : "",
      cliente: nombreLindo(p.cliente),
      telefono: p.telefono || "",
      wa: "",
      patente: p.patente || "",
      vehiculo: p.vehiculo || "",
      compania: p.compania || "",
      motivo: motivoTxt(p),
      vuelve: p.recuperable ? "Sí" : "No",
      oficina: p.oficina || "",
      numero: p.numero || "",
      notas: "",
    });
    const link = linkWhatsapp(p);
    const celda = fila.getCell("wa");
    if (link) {
      celda.value = { text: "💬 Escribir por WhatsApp", hyperlink: link };
      celda.font = { color: { argb: "FF15803D" }, underline: true, bold: true };
    } else {
      celda.value = p.telefono ? "Revisar teléfono" : "Sin teléfono";
      celda.font = { color: { argb: "FF9F1239" }, italic: true };
    }
    if (p.recuperable) fila.getCell("vuelve").font = { bold: true, color: { argb: "FF15803D" } };
  });
  ws.autoFilter = { from: "A1", to: "L1" };

  const buf = await wb.xlsx.writeBuffer();
  bajar(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    nombreArchivo(meta, "xlsx")
  );
}

/** PDF apaisado: para imprimir o mandar. Tocando el teléfono se abre WhatsApp. */
export async function descargarSeFueronPDF(lista, meta = {}) {
  const [{ jsPDF }, at] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = at.default || at.autoTable;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const items = ordenar(lista?.polizas);
  const variasOficinas = new Set(items.map((p) => p.oficina)).size > 1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 27, 75);
  doc.text(`Clientes que se fueron · ${meta?.titulo || ""}`.trim(), 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const recup = items.filter((p) => p.recuperable).length;
  doc.text(
    `${meta?.oficina || "Todas las oficinas"} · ${items.length} auto${items.length === 1 ? "" : "s"}` +
      (recup ? ` · ${recup} con la póliza vencida (si pagan, vuelven)` : "") +
      " · Tocá el teléfono para escribir por WhatsApp",
    14,
    22
  );

  const cols = [
    "#", "Cliente", "Teléfono", "Patente", "Vehículo", "Compañía", "Motivo", "Se fue el",
    ...(variasOficinas ? ["Oficina"] : []),
  ];
  const filas = items.map((p, i) => [
    i + 1,
    nombreLindo(p.cliente),
    p.telefono || "—",
    p.patente || "",
    p.vehiculo || "",
    p.compania || "",
    motivoTxt(p) + (p.recuperable ? " (si paga, vuelve)" : ""),
    p.fecha ? dayjs(p.fecha).format("DD/MM/YYYY") : "",
    ...(variasOficinas ? [p.oficina || ""] : []),
  ]);

  autoTable(doc, {
    startY: 27,
    head: [cols],
    body: filas,
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 1.8, overflow: "linebreak" },
    headStyles: { fillColor: [30, 27, 75], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, textColor: [100, 116, 139] },
      1: { cellWidth: 52, fontStyle: "bold" },
      2: { cellWidth: 28, textColor: [21, 128, 61] },
      3: { cellWidth: 20, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
      // 📱 El teléfono es un link a WhatsApp con el mensaje ya escrito.
      if (data.section === "body" && data.column.index === 2) {
        const link = linkWhatsapp(items[data.row.index]);
        if (link) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: link });
      }
    },
    didDrawPage: () => {
      const n = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`THAMES · Clientes que se fueron · página ${n}`, 14, doc.internal.pageSize.getHeight() - 6);
    },
  });

  bajar(doc.output("blob"), nombreArchivo(meta, "pdf"));
}
