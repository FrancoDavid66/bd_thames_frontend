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
  return ingresos.map((i) => ({
    Sucursal: i?.oficina_nombre || "—",
    "Fecha y Hora": fmtDateTime(i), // 🚀 HORA EXACTA
    Descripción: i?.descripcion ?? "—",
    Monto: toNumber(i?.monto),
    Categoría: i?.categoria ?? "—",
    "Forma de pago": i?.forma_pago ?? "—",
    "Pagado por": i?.pagado_por ?? "—",
    "Cargado por": i?.usuario_nombre || "Sistema",
    Observaciones: i?.observaciones ?? "—",
  }));
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

// 🚀 FUNCIÓN EXPORTABLE
export function exportToExcel({ ingresos = [], egresos = [], polizas = [], fileName }) {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Resumen Dashboard
  XLSX.utils.book_append_sheet(
    wb,
    buildResumenSheet(ingresos, egresos, polizas),
    "Dashboard Resumen"
  );

  // 2. Hoja Ingresos
  const ingresosRows = buildIngresosRows(ingresos);
  const wsIngresos = XLSX.utils.json_to_sheet(ingresosRows);
  wsIngresos["!cols"] = autoFitColumns(ingresosRows);
  XLSX.utils.book_append_sheet(wb, wsIngresos, "Detalle Ingresos");

  // 3. Hoja Egresos
  const egresosRows = buildEgresosRows(egresos);
  const wsEgresos = XLSX.utils.json_to_sheet(egresosRows);
  wsEgresos["!cols"] = autoFitColumns(egresosRows);
  XLSX.utils.book_append_sheet(wb, wsEgresos, "Detalle Egresos");

  const name = fileName || `Cierre_Caja_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
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