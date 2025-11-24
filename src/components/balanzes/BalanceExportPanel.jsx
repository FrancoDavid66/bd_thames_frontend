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
  XLSX.utils.book_append_sheet(
    wb,
    buildResumenSheet(ingresos, egresos),
    "Resumen"
  );

  const name =
    fileName || `Balance_${dayjs().format("YYYY-MM-DD_HHmm")}.xlsx`;

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
    <div
      className={`bg-zinc-950/80 border border-zinc-900 rounded-3xl px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/25 mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Header + descripción */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-lg">
            <span>📤</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-50">
              Exportar balance
            </h3>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              Genera un archivo <span className="font-semibold">.xlsx</span>{" "}
              con ingresos, egresos y un resumen de totales.
            </p>
          </div>
        </div>

        {/* Botón */}
        <div className="flex items-center sm:justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() => exportToExcel({ ingresos, egresos, fileName })}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition ${
              disabled
                ? "bg-sky-500/25 text-sky-100/70 cursor-not-allowed"
                : "bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.99]"
            }`}
            title={
              disabled
                ? "No hay datos para exportar"
                : "Exportar a Excel (.xlsx)"
            }
          >
            <span className="text-base">⬇️</span>
            <span>Exportar a Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceExportPanel;
