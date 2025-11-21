import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";

/* ===== Helpers ===== */
const toNumber = (v) => {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmtDate = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

/** Calcula anchos de columnas en base al contenido */
function autoFitColumns(rows) {
  if (!rows?.length) return [];
  const headers = Object.keys(rows[0] || {});
  const widths = headers.map((h) => Math.max(10, String(h).length + 2));
  rows.forEach((row) => {
    headers.forEach((h, idx) => {
      const len = String(row[h] ?? "").length + 2;
      widths[idx] = Math.min(50, Math.max(widths[idx], len));
    });
  });
  return widths.map((wch) => ({ wch }));
}

function buildIngresosRows(ingresos = []) {
  return ingresos.map((i) => ({
    Descripción: i?.descripcion ?? "—",
    Monto: toNumber(i?.monto),
    Fecha: fmtDate(i?.fecha),
    Categoría: i?.categoria ?? "—",
    "Forma de pago": i?.forma_pago ?? "—",
    "Pagado por": i?.pagado_por ?? "—",
    Observaciones: i?.observaciones ?? "—",
  }));
}

function buildEgresosRows(egresos = []) {
  return egresos.map((e) => ({
    Categoría: e?.categoria ?? "—",
    Descripción: e?.descripcion ?? "—",
    Monto: toNumber(e?.monto),
    Fecha: fmtDate(e?.fecha),
    Observaciones: e?.observaciones ?? "—",
  }));
}

function buildResumenSheet(ingresos = [], egresos = []) {
  const totalIn = ingresos.reduce((acc, it) => acc + toNumber(it?.monto), 0);
  const totalEg = egresos.reduce((acc, it) => acc + toNumber(it?.monto), 0);
  const balance = totalIn - totalEg;

  const rows = [
    { Concepto: "Total ingresos", Monto: totalIn },
    { Concepto: "Total egresos", Monto: totalEg },
    { Concepto: "Balance", Monto: balance },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoFitColumns(rows);
  return ws;
}

function exportToExcel({ ingresos = [], egresos = [], fileName }) {
  const wb = XLSX.utils.book_new();

  // Ingresos
  const ingresosRows = buildIngresosRows(ingresos);
  const wsIngresos = XLSX.utils.json_to_sheet(ingresosRows);
  wsIngresos["!cols"] = autoFitColumns(ingresosRows);
  XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos");

  // Egresos
  const egresosRows = buildEgresosRows(egresos);
  const wsEgresos = XLSX.utils.json_to_sheet(egresosRows);
  wsEgresos["!cols"] = autoFitColumns(egresosRows);
  XLSX.utils.book_append_sheet(wb, wsEgresos, "Egresos");

  // Resumen
  XLSX.utils.book_append_sheet(wb, buildResumenSheet(ingresos, egresos), "Resumen");

  const name =
    fileName ||
    `Balance_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;

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
  fileName, // opcional para personalizar nombre
  className = "",
}) => {
  const disabled = (ingresos?.length ?? 0) + (egresos?.length ?? 0) === 0;

  return (
    <div className={`bg-white dark:bg-zinc-800 p-4 rounded-lg shadow mb-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-zinc-800 dark:text-white">
        📤 Exportar balance
      </h3>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => exportToExcel({ ingresos, egresos, fileName })}
          className={`px-4 py-2 rounded text-white transition ${
            disabled
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          title={disabled ? "No hay datos para exportar" : "Exportar a Excel (.xlsx)"}
        >
          Exportar a Excel (.xlsx)
        </button>

        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Se exportan las filas visibles de Ingresos y Egresos. Incluye hoja “Resumen”.
        </span>
      </div>
    </div>
  );
};

export default BalanceExportPanel;
