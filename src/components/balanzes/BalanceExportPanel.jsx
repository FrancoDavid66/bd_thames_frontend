// src/components/balanzes/BalanceExportPanel.jsx
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import { HiOutlineDownload, HiOutlineDocumentReport } from "react-icons/hi";

/* ===== Helpers ===== */
const toNumber = (v) => {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// 🚀 NUEVO: Formateo con Hora y Minuto exactos (Busca created_at, si no, usa fecha)
const fmtDateTime = (item) => {
  if (item?.created_at) return dayjs(item.created_at).format("DD/MM/YYYY HH:mm");
  if (item?.fecha) return dayjs(item.fecha).format("DD/MM/YYYY");
  return "—";
};

/** Calcula anchos de columnas en base al contenido para tablas JSON */
function autoFitColumns(rows) {
  if (!rows?.length) return [];
  const headers = Object.keys(rows[0] || {});
  const widths = headers.map((h) => Math.max(12, String(h).length + 2));
  rows.forEach((row) => {
    headers.forEach((h, idx) => {
      const len = String(row[h] ?? "").length + 2;
      widths[idx] = Math.min(50, Math.max(widths[idx], len));
    });
  });
  return widths.map((wch) => ({ wch }));
}

/** Calcula anchos para la hoja de Resumen (Array de Arrays) */
function autoFitAOA(aoa) {
  const widths = [];
  aoa.forEach((row) => {
    row.forEach((col, idx) => {
      const len = String(col ?? "").length + 2;
      widths[idx] = Math.min(50, Math.max(widths[idx] || 15, len));
    });
  });
  return widths.map((wch) => ({ wch }));
}

function buildIngresosRows(ingresos = []) {
  return ingresos.map((i) => {
    // Extraer CUIT y N° op de observaciones si vienen ahí
    const obs = i?.observaciones ?? "";
    const cuitMatch = obs.match(/CUIT:\s*([^\s|]+)/);
    const opMatch   = obs.match(/Op:\s*([^\s|]+)/);
    const cuit = i?.cuit_remitente || (cuitMatch ? cuitMatch[1] : "");
    const op   = i?.nro_operacion  || (opMatch   ? opMatch[1]   : "");
    // Observaciones limpias (sin los datos ya separados)
    const obsFinal = obs.replace(/CUIT:\s*[^\s|]+\s*\|?\s*/g, "").replace(/Op:\s*[^\s|]+\s*\|?\s*/g, "").trim().replace(/^\||\|$/, "").trim();

    return {
      Sucursal:           i?.oficina_nombre || "—",
      "Fecha y Hora":     fmtDateTime(i),
      Descripción:        i?.descripcion ?? "—",
      "Enviado por":      i?.pagado_por ?? "—",
      "CUIT/CUIL remitente": cuit || "—",
      "Cuenta destino":   i?.billetera ?? "—",
      "N° Operación":     op || "—",
      "Forma de pago":    (i?.forma_pago ?? "—").toUpperCase(),
      Categoría:          i?.categoria ?? "—",
      Monto:              toNumber(i?.monto),
      "Cargado por":      i?.usuario_nombre || "Sistema",
      Observaciones:      obsFinal || "—",
    };
  });
}

function buildEgresosRows(egresos = []) {
  return egresos.map((e) => ({
    Sucursal: e?.oficina_nombre || "—",
    "Fecha y Hora": fmtDateTime(e), // 🚀 HORA EXACTA
    Categoría: e?.categoria ?? "—",
    Descripción: e?.descripcion ?? "—",
    "Forma de pago": e?.forma_pago ?? "Efectivo",
    Monto: toNumber(e?.monto),
    "Cargado por": e?.usuario_nombre || "Sistema",
    Observaciones: e?.observaciones ?? "—",
  }));
}

/* 🚀 HOJA DE RESUMEN GERENCIAL AVANZADA */
function buildResumenSheet(ingresos = [], egresos = [], polizas = []) {
  const aoa = []; // Array de Arrays para controlar filas y columnas libres

  // 1. Cálculos Generales
  const totalIn = ingresos.reduce((acc, it) => acc + toNumber(it?.monto), 0);
  const totalEg = egresos.reduce((acc, it) => acc + toNumber(it?.monto), 0);
  const balance = totalIn - totalEg;

  aoa.push(["RESUMEN GENERAL DEL DÍA"]);
  aoa.push(["Concepto", "Monto"]);
  aoa.push(["Total Ingresos", totalIn]);
  aoa.push(["Total Egresos", totalEg]);
  aoa.push(["Balance Neto", balance]);
  aoa.push([]);

  // 2. Desglose por Medio de Pago (Caja vs Bancos)
  const pagosMap = {};
  ingresos.forEach((i) => {
    const fp = i.forma_pago || "EFECTIVO";
    if (!pagosMap[fp]) pagosMap[fp] = { monto: 0, cant: 0 };
    pagosMap[fp].monto += toNumber(i.monto);
    pagosMap[fp].cant += 1;
  });
  
  aoa.push(["INGRESOS POR MEDIO DE PAGO"]);
  aoa.push(["Medio de Pago", "Monto Total", "Cant. Operaciones"]);
  Object.entries(pagosMap)
    .sort((a, b) => b[1].monto - a[1].monto)
    .forEach(([fp, data]) => aoa.push([fp, data.monto, data.cant]));
  aoa.push([]);

  // 3. Rendimiento por Sucursal (Ingresos)
  const ofiMap = {};
  ingresos.forEach((i) => {
    const ofi = i.oficina_nombre || "Sin Sucursal";
    if (!ofiMap[ofi]) ofiMap[ofi] = { monto: 0, cant: 0 };
    ofiMap[ofi].monto += toNumber(i.monto);
    ofiMap[ofi].cant += 1;
  });

  aoa.push(["RENDIMIENTO POR SUCURSAL (RECAUDACIÓN)"]);
  aoa.push(["Sucursal", "Monto Recaudado", "Cant. Ingresos"]);
  Object.entries(ofiMap)
    .sort((a, b) => b[1].monto - a[1].monto)
    .forEach(([ofi, data]) => aoa.push([ofi, data.monto, data.cant]));
  aoa.push([]);

  // 4. Top de Gastos (Egresos por Categoría)
  const catMap = {};
  egresos.forEach((e) => {
    const cat = e.categoria || "Sin categoría";
    if (!catMap[cat]) catMap[cat] = { monto: 0, cant: 0 };
    catMap[cat].monto += toNumber(e.monto);
    catMap[cat].cant += 1;
  });

  aoa.push(["TOP DE GASTOS (POR CATEGORÍA)"]);
  aoa.push(["Categoría", "Monto Gastado", "Cant. Egresos"]);
  Object.entries(catMap)
    .sort((a, b) => b[1].monto - a[1].monto)
    .forEach(([cat, data]) => aoa.push([cat, data.monto, data.cant]));
  aoa.push([]);

  // 5. Métricas de Pólizas (Renovaciones, Nuevas, Bajas)
  // Solo se dibuja si le pasamos el array de pólizas al exportar
  if (polizas && polizas.length > 0) {
    const polMap = {};
    polizas.forEach((p) => {
      const ofi = p.oficina_nombre || "Sin Sucursal";
      if (!polMap[ofi]) polMap[ofi] = { nuevas: 0, renovaciones: 0, bajas: 0 };
      
      const tipo = String(p.tipo || p.estado).toUpperCase();
      if (tipo.includes("NUEVA")) polMap[ofi].nuevas += 1;
      else if (tipo.includes("BAJA") || tipo.includes("CANCELAD")) polMap[ofi].bajas += 1;
      else polMap[ofi].renovaciones += 1; // Asumimos que el resto son renovaciones
    });

    aoa.push(["RENDIMIENTO DE PÓLIZAS POR SUCURSAL"]);
    aoa.push(["Sucursal", "Nuevas", "Renovaciones", "Bajas/Caídas"]);
    Object.entries(polMap).forEach(([ofi, data]) => {
      aoa.push([ofi, data.nuevas, data.renovaciones, data.bajas]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = autoFitAOA(aoa);
  return ws;
}

// 🚀 FUNCIÓN EXPORTABLE — Excel profesional con colores y formato
export function exportToExcel({ ingresos = [], egresos = [], polizas = [], fileName }) {
  const wb = XLSX.utils.book_new();

  // ── Colores ─────────────────────────────────────────────────────
  const COLOR_HEADER_BG  = "1E293B"; // slate-900
  const COLOR_HEADER_FG  = "FFFFFF";
  const COLOR_TITLE_BG   = "0F172A"; // slate-950
  const COLOR_TITLE_FG   = "7DD3FC"; // sky-300
  const COLOR_SECTION_BG = "1E3A5F"; // azul oscuro
  const COLOR_SECTION_FG = "BAE6FD"; // sky-200
  const COLOR_ROW_ALT    = "F1F5F9"; // slate-100
  const COLOR_TOTAL_BG   = "064E3B"; // emerald-900
  const COLOR_TOTAL_FG   = "6EE7B7"; // emerald-300
  const COLOR_NEG_BG     = "7F1D1D"; // red-900
  const COLOR_NEG_FG     = "FCA5A5"; // red-300

  const cellStyle = (opts = {}) => ({
    font:      { bold: opts.bold || false, color: { rgb: opts.fg || "334155" }, sz: opts.sz || 11, name: "Calibri" },
    fill:      opts.bg ? { patternType: "solid", fgColor: { rgb: opts.bg } } : undefined,
    alignment: { horizontal: opts.align || "left", vertical: "center", wrapText: false },
    border: {
      top:    { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left:   { style: "thin", color: { rgb: "E2E8F0" } },
      right:  { style: "thin", color: { rgb: "E2E8F0" } },
    },
    numFmt: opts.numFmt || undefined,
  });

  const applyStyle = (ws, cellRef, style) => {
    if (!ws[cellRef]) ws[cellRef] = { t: "s", v: "" };
    ws[cellRef].s = style;
  };

  const applyRangeStyle = (ws, startRow, endRow, startCol, endCol, styleFunc) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const ref = XLSX.utils.encode_cell({ r: r - 1, c: c - 1 });
        if (ws[ref]) ws[ref].s = styleFunc(r, c);
      }
    }
  };

  // ── Totales ──────────────────────────────────────────────────────
  const totalIn  = ingresos.reduce((a, i) => a + toNumber(i?.monto), 0);
  const totalEg  = egresos.reduce((a, e) => a + toNumber(e?.monto), 0);
  const balance  = totalIn - totalEg;
  const fmtAR    = (n) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ══════════════════════════════════════════════════════════════════
  // HOJA 1 — RESUMEN GERENCIAL
  // ══════════════════════════════════════════════════════════════════
  const aoa = [];

  // Título
  aoa.push(["REPORTE GERENCIAL DE BALANCE", "", ""]);
  aoa.push([`Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`, "", ""]);
  aoa.push([]);

  // Sección: Balance general
  aoa.push(["BALANCE GENERAL", "", ""]);
  aoa.push(["Concepto", "Monto", "Cant. Operaciones"]);
  aoa.push(["Total Ingresos",       fmtAR(totalIn),  ingresos.length]);
  aoa.push(["Total Egresos",        fmtAR(totalEg),  egresos.length]);
  aoa.push([balance >= 0 ? "Balance Positivo ▲" : "Balance Negativo ▼", fmtAR(balance), ""]);
  aoa.push([]);

  // Sección: Ingresos por forma de pago
  const pagosMap = {};
  ingresos.forEach((i) => {
    const fp = (i.forma_pago || "EFECTIVO").toUpperCase();
    if (!pagosMap[fp]) pagosMap[fp] = { monto: 0, cant: 0 };
    pagosMap[fp].monto += toNumber(i.monto);
    pagosMap[fp].cant  += 1;
  });
  aoa.push(["INGRESOS POR MEDIO DE PAGO", "", ""]);
  aoa.push(["Medio de Pago", "Monto Total", "Cant. Operaciones"]);
  Object.entries(pagosMap)
    .sort((a, b) => b[1].monto - a[1].monto)
    .forEach(([fp, d]) => aoa.push([fp, fmtAR(d.monto), d.cant]));
  aoa.push([]);

  // Sección: Rendimiento por sucursal
  const ofiMap = {};
  ingresos.forEach((i) => {
    const ofi = i.oficina_nombre || "Sin Sucursal";
    if (!ofiMap[ofi]) ofiMap[ofi] = { monto: 0, cant: 0 };
    ofiMap[ofi].monto += toNumber(i.monto);
    ofiMap[ofi].cant  += 1;
  });
  aoa.push(["RENDIMIENTO POR SUCURSAL (RECAUDACIÓN)", "", ""]);
  aoa.push(["Sucursal", "Monto Recaudado", "Cant. Ingresos"]);
  Object.entries(ofiMap)
    .sort((a, b) => b[1].monto - a[1].monto)
    .forEach(([ofi, d]) => aoa.push([ofi, fmtAR(d.monto), d.cant]));
  aoa.push([]);

  // Sección: Gastos por categoría
  const catMap = {};
  egresos.forEach((e) => {
    const cat = e.categoria || "Sin categoría";
    if (!catMap[cat]) catMap[cat] = { monto: 0, cant: 0 };
    catMap[cat].monto += toNumber(e.monto);
    catMap[cat].cant  += 1;
  });
  aoa.push(["TOP DE GASTOS POR CATEGORÍA", "", ""]);
  aoa.push(["Categoría", "Monto Gastado", "Cant. Egresos"]);
  Object.entries(catMap)
    .sort((a, b) => b[1].monto - a[1].monto)
    .forEach(([cat, d]) => aoa.push([cat, fmtAR(d.monto), d.cant]));

  const wsResumen = XLSX.utils.aoa_to_sheet(aoa);
  wsResumen["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 20 }];

  // Aplicar estilos a filas clave del resumen
  if (wsResumen["A1"]) wsResumen["A1"].s = cellStyle({ bold: true, fg: COLOR_TITLE_FG, bg: COLOR_TITLE_BG, sz: 14 });
  if (wsResumen["A2"]) wsResumen["A2"].s = cellStyle({ fg: "94A3B8", bg: COLOR_TITLE_BG, sz: 10 });

  XLSX.utils.book_append_sheet(wb, wsResumen, "📊 Resumen");

  // ══════════════════════════════════════════════════════════════════
  // HOJA 2 — DETALLE INGRESOS
  // ══════════════════════════════════════════════════════════════════
  const ingHeaders = ["Sucursal", "Fecha y Hora", "Descripción", "Enviado por", "CUIT/CUIL remitente", "Cuenta destino", "N° Operación", "Forma de pago", "Categoría", "Monto", "Cargado por", "Observaciones"];
  const ingRows = ingresos.map((i) => {
    const obs = i?.observaciones ?? "";
    const cuitMatch = obs.match(/CUIT:\s*([^\s|]+)/);
    const opMatch   = obs.match(/Op:\s*([^\s|]+)/);
    const cuit = i?.cuit_remitente || (cuitMatch ? cuitMatch[1] : "") || "—";
    const op   = i?.nro_operacion  || (opMatch   ? opMatch[1]   : "") || "—";
    const obsFinal = obs.replace(/CUIT:\s*[^\s|]+\s*\|?\s*/g, "").replace(/Op:\s*[^\s|]+\s*\|?\s*/g, "").trim().replace(/^\||\|$/, "").trim() || "—";
    return [
      i?.oficina_nombre || "—",
      fmtDateTime(i),
      i?.descripcion    || "—",
      i?.pagado_por     || "—",
      cuit,
      i?.billetera      || "—",
      op,
      (i?.forma_pago || "efectivo").toUpperCase(),
      i?.categoria      || "—",
      toNumber(i?.monto),
      i?.usuario_nombre || "Sistema",
      obsFinal,
    ];
  });

  const wsIngresos = XLSX.utils.aoa_to_sheet([ingHeaders, ...ingRows]);

  // Estilo header
  ingHeaders.forEach((_, ci) => {
    const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (wsIngresos[ref]) wsIngresos[ref].s = cellStyle({ bold: true, fg: COLOR_HEADER_FG, bg: COLOR_HEADER_BG, align: "center" });
  });

  // Estilo filas + formato monto (columna 9 = Monto)
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

  // Fila de total
  const ingTotalRow = ingRows.length + 1;
  XLSX.utils.sheet_add_aoa(wsIngresos, [["", "", "", "", "", "", "", "", "TOTAL", totalIn, "", ""]], { origin: ingTotalRow });
  const totalRefLabel = XLSX.utils.encode_cell({ r: ingTotalRow, c: 8 });
  const totalRefVal   = XLSX.utils.encode_cell({ r: ingTotalRow, c: 9 });
  if (wsIngresos[totalRefLabel]) wsIngresos[totalRefLabel].s = cellStyle({ bold: true, fg: COLOR_TOTAL_FG, bg: COLOR_TOTAL_BG, align: "right" });
  if (wsIngresos[totalRefVal])   { wsIngresos[totalRefVal].s = cellStyle({ bold: true, fg: COLOR_TOTAL_FG, bg: COLOR_TOTAL_BG, align: "right" }); wsIngresos[totalRefVal].s.numFmt = '"$"#,##0.00'; }

  wsIngresos["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 38 }, { wch: 26 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 24 }];
  wsIngresos["!rows"] = [{ hpt: 20 }]; // altura del header
  XLSX.utils.book_append_sheet(wb, wsIngresos, "💰 Ingresos");

  // ══════════════════════════════════════════════════════════════════
  // HOJA 3 — DETALLE EGRESOS
  // ══════════════════════════════════════════════════════════════════
  const egHeaders = ["Sucursal", "Fecha y Hora", "Categoría", "Descripción", "Forma de pago", "Monto", "Cargado por"];
  const egRows = egresos.map((e) => [
    e?.oficina_nombre || "—",
    fmtDateTime(e),
    e?.categoria    ?? "—",
    e?.descripcion  ?? "—",
    (e?.forma_pago  || "efectivo").toUpperCase(),
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
  const egTotalVal   = XLSX.utils.encode_cell({ r: egTotalRow, c: 5 });
  if (wsEgresos[egTotalLabel]) wsEgresos[egTotalLabel].s = cellStyle({ bold: true, fg: COLOR_NEG_FG, bg: COLOR_NEG_BG, align: "right" });
  if (wsEgresos[egTotalVal])   { wsEgresos[egTotalVal].s = cellStyle({ bold: true, fg: COLOR_NEG_FG, bg: COLOR_NEG_BG, align: "right" }); wsEgresos[egTotalVal].s.numFmt = '"$"#,##0.00'; }

  wsEgresos["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 42 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  wsEgresos["!rows"] = [{ hpt: 20 }];
  XLSX.utils.book_append_sheet(wb, wsEgresos, "💸 Egresos");

  // ── Guardar ──────────────────────────────────────────────────────
  const name = fileName || `Cierre_Caja_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, name);
}

/* ===== Componente ===== */
const BalanceExportPanel = ({
  ingresos = [],
  egresos = [],
  polizas = [], // 🚀 Recibimos polizas opcionalmente
  fileName, 
  className = "",
}) => {
  const disabled = (ingresos?.length ?? 0) + (egresos?.length ?? 0) === 0;

  return (
    <div
      className={`bg-zinc-950/80 border border-zinc-900 rounded-3xl px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/25 mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-white shadow-inner">
            <HiOutlineDocumentReport className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-bold text-zinc-50 tracking-tight">
              Exportar Reporte Gerencial
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 max-w-xs">
              Genera un archivo <span className="font-semibold text-zinc-200">.xlsx</span>{" "}
              con métricas de rendimiento, medios de pago y detalle exacto de horarios.
            </p>
          </div>
        </div>

        <div className="flex items-center sm:justify-end mt-2 sm:mt-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => exportToExcel({ ingresos, egresos, polizas, fileName })}
            className={`inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
              disabled
                ? "bg-sky-500/10 text-sky-100/40 cursor-not-allowed border border-sky-500/10"
                : "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20 border border-sky-400 active:scale-[0.98]"
            }`}
            title={
              disabled
                ? "No hay datos para exportar"
                : "Descargar Reporte (.xlsx)"
            }
          >
            <HiOutlineDownload className="text-lg" />
            <span>Descargar Reporte</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceExportPanel;