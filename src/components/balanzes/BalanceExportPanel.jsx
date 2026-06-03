// src/components/balanzes/BalanceExportPanel.jsx
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { HiOutlineDownload, HiOutlineDocumentReport, HiOutlinePrinter } from "react-icons/hi";

/* ===== Helpers ===== */
const toNumber = (v) => {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Formateo con Hora y Minuto exactos (Busca created_at, si no, usa fecha)
const fmtDateTime = (item) => {
  if (item?.created_at) return dayjs(item.created_at).format("DD/MM/YYYY HH:mm");
  if (item?.fecha) return dayjs(item.fecha).format("DD/MM/YYYY");
  return "—";
};

// Plata en formato argentino: $ 1.234,56
const fmtAR = (n) =>
  `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Limpia observaciones que traen CUIT/Op embebidos
const limpiarObs = (obs = "") =>
  String(obs)
    .replace(/CUIT:\s*[^\s|]+\s*\|?\s*/g, "")
    .replace(/Op:\s*[^\s|]+\s*\|?\s*/g, "")
    .trim()
    .replace(/^\||\|$/, "")
    .trim();

// 🚀 Extrae los datos de transferencia + patente de un ingreso.
// La patente viene del backend (campo "patente"); si no, se intenta leer
// del número de póliza embebido en la descripción ("... - Póliza 12345").
const datosTransf = (i = {}) => {
  const obs = i?.observaciones ?? "";
  const cuitMatch = String(obs).match(/CUIT:\s*([^\s|]+)/);
  const opMatch = String(obs).match(/Op:\s*([^\s|]+)/);
  return {
    patente: String(i?.patente || "").trim().toUpperCase() || "—",
    enviadoPor: i?.pagado_por || "—",
    cuit: i?.cuit_remitente || (cuitMatch ? cuitMatch[1] : "") || "—",
    billetera: i?.billetera || "—",
    operacion: i?.nro_operacion || (opMatch ? opMatch[1] : "") || "—",
  };
};

// Escapa texto para el HTML del PDF
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/* Base URL del API (igual criterio que el resto de la app) */
const RAW_BASE = (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const _authHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null" ? { Authorization: `Bearer ${token.trim()}` } : {};
};

/* 🚀 Descarga el Excel generado en el backend (tablas + estilos + gráficos)
   Acepta un mes ("YYYY-MM") o un rango (desde/hasta en "YYYY-MM-DD"). */
async function descargarExcelBackend({ mes, desde, hasta, oficina, fileName }) {
  const params = new URLSearchParams();
  if (desde && hasta) {
    params.set("desde", desde);
    params.set("hasta", hasta);
  } else if (mes) {
    params.set("mes", mes);
  }
  if (oficina && String(oficina).toUpperCase() !== "ALL") params.set("oficina", oficina);

  const url = `${API_BASE}balance-mensual/exportar/?${params.toString()}`;
  const res = await fetch(url, { headers: _authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const blob = await res.blob();
  saveAs(blob, fileName || `Reporte_${mes || (desde && hasta ? `${desde}_a_${hasta}` : dayjs().format("YYYY-MM"))}.xlsx`);
}

/* Trae los movimientos del período desde el backend (para el PDF) */
async function fetchMovimientos({ desde, hasta, oficina }) {
  const qs = () => {
    const p = new URLSearchParams({ fecha__gte: desde, fecha__lte: hasta, page_size: "9999" });
    if (oficina && String(oficina).toUpperCase() !== "ALL") p.set("oficina", oficina);
    return p.toString();
  };
  const [ri, re] = await Promise.all([
    fetch(`${API_BASE}ingresos/?${qs()}`, { headers: _authHeaders() }),
    fetch(`${API_BASE}egresos/?${qs()}`, { headers: _authHeaders() }),
  ]);
  const ji = await ri.json();
  const je = await re.json();
  return {
    ingresos: Array.isArray(ji) ? ji : ji?.results || [],
    egresos: Array.isArray(je) ? je : je?.results || [],
  };
}

/* ==========================================================================
   AGREGADOS COMPARTIDOS (los usan Excel y PDF)
   ========================================================================== */
function calcularAgregados(ingresos = [], egresos = []) {
  const totalIn = ingresos.reduce((a, i) => a + toNumber(i?.monto), 0);
  const totalEg = egresos.reduce((a, e) => a + toNumber(e?.monto), 0);
  const balance = totalIn - totalEg;

  const pagosMap = {};
  ingresos.forEach((i) => {
    const fp = (i.forma_pago || "EFECTIVO").toUpperCase();
    if (!pagosMap[fp]) pagosMap[fp] = { monto: 0, cant: 0 };
    pagosMap[fp].monto += toNumber(i.monto);
    pagosMap[fp].cant += 1;
  });

  const ofiMap = {};
  ingresos.forEach((i) => {
    const ofi = i.oficina_nombre || "Sin Sucursal";
    if (!ofiMap[ofi]) ofiMap[ofi] = { monto: 0, cant: 0 };
    ofiMap[ofi].monto += toNumber(i.monto);
    ofiMap[ofi].cant += 1;
  });

  const catMap = {};
  egresos.forEach((e) => {
    const cat = e.categoria || "Sin categoría";
    if (!catMap[cat]) catMap[cat] = { monto: 0, cant: 0 };
    catMap[cat].monto += toNumber(e.monto);
    catMap[cat].cant += 1;
  });

  const sort = (obj) => Object.entries(obj).sort((a, b) => b[1].monto - a[1].monto);

  return {
    totalIn,
    totalEg,
    balance,
    pagos: sort(pagosMap),
    sucursales: sort(ofiMap),
    categorias: sort(catMap),
  };
}

/* ==========================================================================
   1) EXCEL — profesional, con TABLA filtrable (AutoFilter) y totales claros
   ========================================================================== */
export function exportToExcel({ ingresos = [], egresos = [], polizas = [], fileName }) {
  const wb = XLSX.utils.book_new();

  // Colores
  const COLOR_HEADER_FG = "FFFFFF";
  const COLOR_ROW_ALT = "F1F5F9"; // slate-100
  const COLOR_TITLE_BG = "0F172A"; // slate-950
  const COLOR_TITLE_FG = "7DD3FC"; // sky-300
  const COLOR_TOTAL_BG = "064E3B"; // emerald-900
  const COLOR_TOTAL_FG = "6EE7B7"; // emerald-300
  const COLOR_NEG_BG = "7F1D1D"; // red-900
  const COLOR_NEG_FG = "FCA5A5"; // red-300

  const cellStyle = (opts = {}) => ({
    font: { bold: opts.bold || false, color: { rgb: opts.fg || "334155" }, sz: opts.sz || 11, name: "Calibri" },
    fill: opts.bg ? { patternType: "solid", fgColor: { rgb: opts.bg } } : undefined,
    alignment: { horizontal: opts.align || "left", vertical: "center", wrapText: false },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } },
    },
    numFmt: opts.numFmt || undefined,
  });

  const { totalIn, totalEg, balance, pagos, sucursales, categorias } = calcularAgregados(ingresos, egresos);

  // ────────────────────────────────────────────────────────────────
  // HOJA 1 — RESUMEN GERENCIAL
  // ────────────────────────────────────────────────────────────────
  const aoa = [];
  aoa.push(["REPORTE GERENCIAL DE BALANCE", "", ""]);
  aoa.push([`Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`, "", ""]);
  aoa.push([]);

  aoa.push(["BALANCE GENERAL", "", ""]);
  aoa.push(["Concepto", "Monto", "Cant. Operaciones"]);
  aoa.push(["Total Ingresos", fmtAR(totalIn), ingresos.length]);
  aoa.push(["Total Egresos", fmtAR(totalEg), egresos.length]);
  aoa.push([balance >= 0 ? "Balance Positivo ▲" : "Balance Negativo ▼", fmtAR(balance), ""]);
  aoa.push([]);

  aoa.push(["INGRESOS POR MEDIO DE PAGO", "", ""]);
  aoa.push(["Medio de Pago", "Monto Total", "Cant. Operaciones"]);
  pagos.forEach(([fp, d]) => aoa.push([fp, fmtAR(d.monto), d.cant]));
  aoa.push([]);

  aoa.push(["RENDIMIENTO POR SUCURSAL (RECAUDACIÓN)", "", ""]);
  aoa.push(["Sucursal", "Monto Recaudado", "Cant. Ingresos"]);
  sucursales.forEach(([ofi, d]) => aoa.push([ofi, fmtAR(d.monto), d.cant]));
  aoa.push([]);

  aoa.push(["TOP DE GASTOS POR CATEGORÍA", "", ""]);
  aoa.push(["Categoría", "Monto Gastado", "Cant. Egresos"]);
  categorias.forEach(([cat, d]) => aoa.push([cat, fmtAR(d.monto), d.cant]));

  const wsResumen = XLSX.utils.aoa_to_sheet(aoa);
  wsResumen["!cols"] = [{ wch: 40 }, { wch: 22 }, { wch: 20 }];
  if (wsResumen["A1"]) wsResumen["A1"].s = cellStyle({ bold: true, fg: COLOR_TITLE_FG, bg: COLOR_TITLE_BG, sz: 14 });
  if (wsResumen["A2"]) wsResumen["A2"].s = cellStyle({ fg: "94A3B8", bg: COLOR_TITLE_BG, sz: 10 });
  XLSX.utils.book_append_sheet(wb, wsResumen, "📊 Resumen");

  // ────────────────────────────────────────────────────────────────
  // HOJA 2 — DETALLE INGRESOS (tabla filtrable)
  // ────────────────────────────────────────────────────────────────
  const ingHeaders = ["Sucursal", "Fecha y Hora", "Patente", "Enviado por", "CUIT/CUIL remitente", "Cuenta destino", "N° Operación", "Forma de pago", "Categoría", "Monto", "Cargado por", "Observaciones"];
  const ingRows = ingresos.map((i) => {
    const obs = i?.observaciones ?? "";
    const cuitMatch = obs.match(/CUIT:\s*([^\s|]+)/);
    const opMatch = obs.match(/Op:\s*([^\s|]+)/);
    const cuit = i?.cuit_remitente || (cuitMatch ? cuitMatch[1] : "") || "—";
    const op = i?.nro_operacion || (opMatch ? opMatch[1] : "") || "—";
    const patente = String(i?.patente || "").trim().toUpperCase() || "—";
    return [
      i?.oficina_nombre || "—",
      fmtDateTime(i),
      patente,
      i?.pagado_por || "—",
      cuit,
      i?.billetera || "—",
      op,
      (i?.forma_pago || "efectivo").toUpperCase(),
      i?.categoria || "—",
      toNumber(i?.monto),
      i?.usuario_nombre || "Sistema",
      limpiarObs(obs) || "—",
    ];
  });

  const wsIngresos = XLSX.utils.aoa_to_sheet([ingHeaders, ...ingRows]);
  ingHeaders.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (wsIngresos[ref]) wsIngresos[ref].s = cellStyle({ bold: true, fg: COLOR_HEADER_FG, bg: "1E293B", align: "center" });
  });
  ingRows.forEach((_, ri) => {
    const isBg = ri % 2 === 1;
    ingHeaders.forEach((__, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (wsIngresos[ref]) {
        wsIngresos[ref].s = cellStyle({ bg: isBg ? COLOR_ROW_ALT : "FFFFFF", align: ci === 9 ? "right" : "left" });
        if (ci === 9) wsIngresos[ref].s.numFmt = '"$"#,##0.00';
      }
    });
  });
  const ingTotalRow = ingRows.length + 1;
  XLSX.utils.sheet_add_aoa(wsIngresos, [["", "", "", "", "", "", "", "", "TOTAL", totalIn, "", ""]], { origin: ingTotalRow });
  const totalRefLabel = XLSX.utils.encode_cell({ r: ingTotalRow, c: 8 });
  const totalRefVal = XLSX.utils.encode_cell({ r: ingTotalRow, c: 9 });
  if (wsIngresos[totalRefLabel]) wsIngresos[totalRefLabel].s = cellStyle({ bold: true, fg: COLOR_TOTAL_FG, bg: COLOR_TOTAL_BG, align: "right" });
  if (wsIngresos[totalRefVal]) { wsIngresos[totalRefVal].s = cellStyle({ bold: true, fg: COLOR_TOTAL_FG, bg: COLOR_TOTAL_BG, align: "right" }); wsIngresos[totalRefVal].s.numFmt = '"$"#,##0.00'; }
  wsIngresos["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 38 }, { wch: 26 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 24 }];
  wsIngresos["!rows"] = [{ hpt: 20 }];
  // 🚀 TABLA FILTRABLE: agrega las flechitas de filtro en cada encabezado
  if (ingRows.length > 0) {
    wsIngresos["!autofilter"] = { ref: `A1:${XLSX.utils.encode_cell({ r: ingRows.length, c: ingHeaders.length - 1 })}` };
  }
  XLSX.utils.book_append_sheet(wb, wsIngresos, "💰 Ingresos");

  // ────────────────────────────────────────────────────────────────
  // HOJA 3 — DETALLE EGRESOS (tabla filtrable)
  // ────────────────────────────────────────────────────────────────
  const egHeaders = ["Sucursal", "Fecha y Hora", "Categoría", "Descripción", "Forma de pago", "Monto", "Cargado por"];
  const egRows = egresos.map((e) => [
    e?.oficina_nombre || "—",
    fmtDateTime(e),
    e?.categoria ?? "—",
    e?.descripcion ?? "—",
    (e?.forma_pago || "efectivo").toUpperCase(),
    toNumber(e?.monto),
    e?.usuario_nombre || "Sistema",
  ]);

  const wsEgresos = XLSX.utils.aoa_to_sheet([egHeaders, ...egRows]);
  egHeaders.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (wsEgresos[ref]) wsEgresos[ref].s = cellStyle({ bold: true, fg: COLOR_HEADER_FG, bg: "7F1D1D", align: "center" });
  });
  egRows.forEach((_, ri) => {
    const isBg = ri % 2 === 1;
    egHeaders.forEach((__, ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (wsEgresos[ref]) {
        wsEgresos[ref].s = cellStyle({ bg: isBg ? "FEF2F2" : "FFFFFF", align: ci === 5 ? "right" : "left" });
        if (ci === 5) wsEgresos[ref].s.numFmt = '"$"#,##0.00';
      }
    });
  });
  const egTotalRow = egRows.length + 1;
  XLSX.utils.sheet_add_aoa(wsEgresos, [["", "", "", "", "TOTAL", totalEg, ""]], { origin: egTotalRow });
  const egTotalLabel = XLSX.utils.encode_cell({ r: egTotalRow, c: 4 });
  const egTotalVal = XLSX.utils.encode_cell({ r: egTotalRow, c: 5 });
  if (wsEgresos[egTotalLabel]) wsEgresos[egTotalLabel].s = cellStyle({ bold: true, fg: COLOR_NEG_FG, bg: COLOR_NEG_BG, align: "right" });
  if (wsEgresos[egTotalVal]) { wsEgresos[egTotalVal].s = cellStyle({ bold: true, fg: COLOR_NEG_FG, bg: COLOR_NEG_BG, align: "right" }); wsEgresos[egTotalVal].s.numFmt = '"$"#,##0.00'; }
  wsEgresos["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 42 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  wsEgresos["!rows"] = [{ hpt: 20 }];
  if (egRows.length > 0) {
    wsEgresos["!autofilter"] = { ref: `A1:${XLSX.utils.encode_cell({ r: egRows.length, c: egHeaders.length - 1 })}` };
  }
  XLSX.utils.book_append_sheet(wb, wsEgresos, "💸 Egresos");

  // Guardar
  const name = fileName || `Reporte_Gerencial_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, name.endsWith(".xlsx") ? name : `${name}.xlsx`);
}

/* ==========================================================================
   2) PDF — abre una vista limpia para imprimir / "Guardar como PDF"
   ========================================================================== */
function buildPrintableHTML({ ingresos = [], egresos = [] }) {
  const { totalIn, totalEg, balance, pagos, sucursales, categorias } = calcularAgregados(ingresos, egresos);
  const generado = dayjs().format("DD/MM/YYYY HH:mm");

  const filaResumenTabla = (rows) =>
    rows.map(([k, d]) => `<tr><td>${esc(k)}</td><td class="num">${fmtAR(d.monto)}</td><td class="num">${d.cant}</td></tr>`).join("");

  const ingDetalle = ingresos
    .map((i) => {
      const d = datosTransf(i);
      return `<tr>
        <td>${esc(i?.oficina_nombre || "—")}</td>
        <td>${esc(fmtDateTime(i))}</td>
        <td>${esc(d.patente)}</td>
        <td>${esc(d.enviadoPor)}</td>
        <td>${esc(d.billetera)}</td>
        <td>${esc(d.operacion)}</td>
        <td>${esc((i?.forma_pago || "efectivo").toUpperCase())}</td>
        <td class="num">${fmtAR(toNumber(i?.monto))}</td>
      </tr>`;
    })
    .join("");

  const egDetalle = egresos
    .map(
      (e) => `<tr>
        <td>${esc(e?.oficina_nombre || "—")}</td>
        <td>${esc(fmtDateTime(e))}</td>
        <td>${esc(e?.categoria || "—")}</td>
        <td>${esc(e?.descripcion || "—")}</td>
        <td>${esc((e?.forma_pago || "efectivo").toUpperCase())}</td>
        <td class="num">${fmtAR(toNumber(e?.monto))}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte Gerencial de Balance</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1e293b; margin: 24px; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: #64748b; font-size: 12px; margin-top: 2px; }
  .cards { display: flex; gap: 12px; margin: 18px 0 8px; }
  .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
  .card .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  .card .val { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .ok { color: #047857; } .bad { color: #b91c1c; } .neutral { color: #0369a1; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #334155; margin: 22px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1e293b; color: #fff; text-align: left; padding: 7px 9px; font-weight: 600; }
  td { padding: 6px 9px; border-bottom: 1px solid #eef2f7; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .total td { font-weight: 800; background: #064e3b !important; color: #fff; }
  .total.neg td { background: #7f1d1d !important; }
  .muted { color: #94a3b8; font-size: 11px; margin-top: 24px; text-align: center; }
  @media print { body { margin: 12mm; } h2 { page-break-after: avoid; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
  <h1>Reporte Gerencial de Balance</h1>
  <div class="sub">Generado el ${esc(generado)}</div>

  <div class="cards">
    <div class="card"><div class="lbl">Total Ingresos</div><div class="val ok">${fmtAR(totalIn)}</div><div class="sub">${ingresos.length} operaciones</div></div>
    <div class="card"><div class="lbl">Total Egresos</div><div class="val bad">${fmtAR(totalEg)}</div><div class="sub">${egresos.length} operaciones</div></div>
    <div class="card"><div class="lbl">Balance Neto</div><div class="val ${balance >= 0 ? "neutral" : "bad"}">${fmtAR(balance)}</div><div class="sub">${balance >= 0 ? "Positivo ▲" : "Negativo ▼"}</div></div>
  </div>

  <h2>Ingresos por medio de pago</h2>
  <table><thead><tr><th>Medio de pago</th><th class="num">Monto total</th><th class="num">Operaciones</th></tr></thead>
  <tbody>${filaResumenTabla(pagos) || `<tr><td colspan="3" class="muted">Sin datos</td></tr>`}</tbody></table>

  <h2>Recaudación por sucursal</h2>
  <table><thead><tr><th>Sucursal</th><th class="num">Monto recaudado</th><th class="num">Ingresos</th></tr></thead>
  <tbody>${filaResumenTabla(sucursales) || `<tr><td colspan="3" class="muted">Sin datos</td></tr>`}</tbody></table>

  <h2>Top de gastos por categoría</h2>
  <table><thead><tr><th>Categoría</th><th class="num">Monto gastado</th><th class="num">Egresos</th></tr></thead>
  <tbody>${filaResumenTabla(categorias) || `<tr><td colspan="3" class="muted">Sin datos</td></tr>`}</tbody></table>

  <h2>Detalle de ingresos</h2>
  <table><thead><tr><th>Sucursal</th><th>Fecha y hora</th><th>Patente</th><th>Enviado por</th><th>Cuenta destino</th><th>N° Operación</th><th>Forma de pago</th><th class="num">Monto</th></tr></thead>
  <tbody>
    ${ingDetalle || `<tr><td colspan="8" class="muted">Sin ingresos</td></tr>`}
    <tr class="total"><td colspan="7" class="num">TOTAL INGRESOS</td><td class="num">${fmtAR(totalIn)}</td></tr>
  </tbody></table>

  <h2>Detalle de egresos</h2>
  <table><thead><tr><th>Sucursal</th><th>Fecha y hora</th><th>Categoría</th><th>Descripción</th><th>Forma de pago</th><th class="num">Monto</th></tr></thead>
  <tbody>
    ${egDetalle || `<tr><td colspan="6" class="muted">Sin egresos</td></tr>`}
    <tr class="total neg"><td colspan="5" class="num">TOTAL EGRESOS</td><td class="num">${fmtAR(totalEg)}</td></tr>
  </tbody></table>

  <p class="muted">Documento generado automáticamente — Sistema de gestión.</p>
</body>
</html>`;
}

export function exportToPDF({ ingresos = [], egresos = [], polizas = [], fileName }) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Para generar el PDF, permití las ventanas emergentes (pop-ups) en este sitio.");
    return;
  }
  const html = buildPrintableHTML({ ingresos, egresos, polizas, fileName });
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Pequeña espera para que renderice antes de abrir el diálogo de impresión
  setTimeout(() => {
    win.print();
  }, 400);
}

/* ===== Componente ===== */
const BalanceExportPanel = ({
  ingresos = [],
  egresos = [],
  polizas = [], // se recibe opcionalmente (fallback del PDF)
  fileName,
  mes,          // "YYYY-MM" del mes que viene de la página (valor inicial)
  oficina,      // sucursal seleccionada (ALL / id / nombre)
  className = "",
}) => {
  const mesInicial = mes || dayjs().format("YYYY-MM");

  const [modo, setModo] = useState("mes"); // "mes" | "periodo"
  const [mesSel, setMesSel] = useState(mesInicial);
  const [desdeSel, setDesdeSel] = useState(dayjs(`${mesInicial}-01`).format("YYYY-MM-DD"));
  const [hastaSel, setHastaSel] = useState(dayjs(`${mesInicial}-01`).endOf("month").format("YYYY-MM-DD"));

  const [bajando, setBajando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Rango efectivo según el modo elegido
  const rango = useMemo(() => {
    if (modo === "periodo" && desdeSel && hastaSel) {
      return { desde: desdeSel, hasta: hastaSel, etiqueta: `${desdeSel}_a_${hastaSel}` };
    }
    const m = mesSel || dayjs().format("YYYY-MM");
    return {
      mes: m,
      desde: `${m}-01`,
      hasta: dayjs(`${m}-01`).endOf("month").format("YYYY-MM-DD"),
      etiqueta: m,
    };
  }, [modo, mesSel, desdeSel, hastaSel]);

  const periodoInvalido = modo === "periodo" && (!desdeSel || !hastaSel || dayjs(hastaSel).isBefore(dayjs(desdeSel)));

  const onExcel = async () => {
    if (periodoInvalido) return;
    try {
      setBajando(true);
      await descargarExcelBackend({
        mes: modo === "mes" ? rango.mes : undefined,
        desde: modo === "periodo" ? rango.desde : undefined,
        hasta: modo === "periodo" ? rango.hasta : undefined,
        oficina,
        fileName: `Reporte_${rango.etiqueta}.xlsx`,
      });
    } catch (err) {
      console.error("Error al descargar Excel:", err);
      alert("No se pudo generar el Excel. Reintentá en unos segundos.");
    } finally {
      setBajando(false);
    }
  };

  const onPDF = async () => {
    if (periodoInvalido) return;
    // Abrimos la ventana en el mismo click (evita que el navegador la bloquee)
    const win = window.open("", "_blank");
    if (!win) {
      alert("Para generar el PDF, permití las ventanas emergentes (pop-ups) en este sitio.");
      return;
    }
    win.document.write("<p style='font-family:sans-serif;padding:24px;color:#334155'>Generando reporte…</p>");

    setGenerandoPdf(true);
    let data = { ingresos, egresos }; // fallback: datos en pantalla
    try {
      data = await fetchMovimientos({ desde: rango.desde, hasta: rango.hasta, oficina });
    } catch (e) {
      console.warn("PDF: no se pudo traer el período, uso lo que hay en pantalla.", e);
    } finally {
      setGenerandoPdf(false);
    }

    const html = buildPrintableHTML({ ingresos: data.ingresos, egresos: data.egresos });
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const ocupado = bajando || generandoPdf;

  // Datos para los selectores de Mes / Año (modo "Por mes")
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const anioActual = dayjs().year();
  const aniosOpts = useMemo(() => {
    const base = [];
    for (let y = anioActual + 1; y >= anioActual - 4; y--) base.push(y);
    const yenSel = Number((mesSel || "").split("-")[0]);
    if (yenSel && !base.includes(yenSel)) {
      base.push(yenSel);
      base.sort((a, b) => b - a);
    }
    return base;
  }, [mesSel, anioActual]);
  const [anioSel, mesNumSel] = (mesSel || dayjs().format("YYYY-MM")).split("-");
  const setMesParte = (mm) => setMesSel(`${anioSel}-${mm}`);
  const setAnioParte = (yyyy) => setMesSel(`${yyyy}-${mesNumSel}`);

  return (
    <div
      className={`bg-zinc-950/80 border border-zinc-900 rounded-3xl px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/25 mb-6 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Título */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-white shadow-inner">
            <HiOutlineDocumentReport className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-zinc-50 tracking-tight truncate">
              Exportar Reporte Gerencial
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 max-w-md">
              Elegí un <span className="font-semibold text-zinc-200">mes</span> o un{" "}
              <span className="font-semibold text-zinc-200">período</span>, y descargalo en Excel (con gráficos) o PDF.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-2 lg:justify-end">
          <button
            type="button"
            disabled={ocupado || periodoInvalido}
            onClick={onExcel}
            className={`inline-flex items-center justify-center gap-2 flex-1 lg:flex-none px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
              ocupado || periodoInvalido
                ? "bg-emerald-500/10 text-emerald-100/40 cursor-not-allowed border border-emerald-500/10"
                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 border border-emerald-400 active:scale-[0.98]"
            }`}
            title={periodoInvalido ? "Revisá las fechas del período" : "Descargar Excel (.xlsx)"}
          >
            <HiOutlineDownload className="text-lg" />
            <span>{bajando ? "Generando..." : "Excel"}</span>
          </button>

          <button
            type="button"
            disabled={ocupado || periodoInvalido}
            onClick={onPDF}
            className={`inline-flex items-center justify-center gap-2 flex-1 lg:flex-none px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
              ocupado || periodoInvalido
                ? "bg-sky-500/10 text-sky-100/40 cursor-not-allowed border border-sky-500/10"
                : "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20 border border-sky-400 active:scale-[0.98]"
            }`}
            title={periodoInvalido ? "Revisá las fechas del período" : "Generar PDF para imprimir"}
          >
            <HiOutlinePrinter className="text-lg" />
            <span>{generandoPdf ? "Generando..." : "PDF / Imprimir"}</span>
          </button>
        </div>
      </div>

      {/* ── Selector de mes / período ── */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Toggle modo */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
          <button
            type="button"
            onClick={() => setModo("mes")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${modo === "mes" ? "bg-sky-500/20 text-sky-300" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Por mes
          </button>
          <button
            type="button"
            onClick={() => setModo("periodo")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${modo === "periodo" ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            Por período
          </button>
        </div>

        {/* Inputs según modo */}
        {modo === "mes" ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 shrink-0">Mes</span>
            <select
              value={mesNumSel}
              onChange={(e) => setMesParte(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs sm:text-sm text-zinc-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {MESES.map((nombre, idx) => {
                const mm = String(idx + 1).padStart(2, "0");
                return (
                  <option key={mm} value={mm} className="bg-zinc-900 text-zinc-100">
                    {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
                  </option>
                );
              })}
            </select>
            <select
              value={anioSel}
              onChange={(e) => setAnioParte(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs sm:text-sm text-zinc-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {aniosOpts.map((y) => (
                <option key={y} value={String(y)} className="bg-zinc-900 text-zinc-100">
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 shrink-0">Desde</span>
              <input
                type="date"
                value={desdeSel}
                onChange={(e) => setDesdeSel(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs sm:text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 shrink-0">Hasta</span>
              <input
                type="date"
                value={hastaSel}
                onChange={(e) => setHastaSel(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs sm:text-sm text-zinc-50 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            {periodoInvalido && (
              <span className="text-[11px] text-rose-400 font-semibold">La fecha "Hasta" no puede ser anterior a "Desde".</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceExportPanel;