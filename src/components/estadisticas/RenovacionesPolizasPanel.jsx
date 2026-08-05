// src/components/estadisticas/RenovacionesPolizasPanel.jsx  (diseño Duo)
import { useState, useMemo, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import {
  HiRefresh,
  HiCalendar,
  HiDownload,
  HiX,
  HiTable,
  HiDocumentText,
  HiExclamationCircle,
  HiOfficeBuilding,
} from "react-icons/hi";
import { FaSyncAlt } from "react-icons/fa";

const ORDER_BUCKETS = ["1", "2", "3", "4", "5", "OTRAS", "SIN_OFICINA"];

const safeNamePart = (s) =>
  String(s || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const clampIsoDate = (v) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const defaultDesdeFor = (agr) => {
  switch (agr) {
    case "hora":   return dayjs().subtract(7, "day").format("YYYY-MM-DD");
    case "dia":    return dayjs().subtract(30, "day").format("YYYY-MM-DD");
    case "semana": return dayjs().subtract(12, "week").format("YYYY-MM-DD");
    case "mes":    return dayjs().subtract(12, "month").format("YYYY-MM-DD");
    default:       return dayjs().subtract(30, "day").format("YYYY-MM-DD");
  }
};

const monthRangeFrom = (anio, mes) => {
  try {
    const y = parseInt(anio, 10);
    const m = parseInt(mes, 10);
    if (!y || !m) return {};
    const d = dayjs(`${y}-${String(m).padStart(2, "0")}-01`);
    return {
      desde: d.startOf("month").format("YYYY-MM-DD"),
      hasta: d.endOf("month").startOf("day").format("YYYY-MM-DD"),
    };
  } catch {
    return {};
  }
};

// 🎨 Tono Duo por oficina (chips): unificado a tus tokens.
const oficinaTone = (ofi) => {
  const map = {
    "1": "border-oficina/40 bg-oficina/10 text-oficina",
    "2": "border-ingreso/40 bg-ingreso/10 text-ingreso",
    "3": "border-transferencia/40 bg-transferencia/10 text-transferencia",
    "4": "border-tarjeta/40 bg-tarjeta/10 text-[#d97706] dark:text-tarjeta-claro",
    "5": "border-egreso/40 bg-egreso/10 text-egreso",
    OTRAS: "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark",
    SIN_OFICINA: "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark",
  };
  return map[String(ofi)] || "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark";
};

const labelPeriodo = (agr, p) => {
  if (!p) return "—";
  if (agr === "mes")    return dayjs(p).format("MMM YYYY");
  if (agr === "semana") return `Sem. ${dayjs(p).format("DD/MM")}`;
  if (agr === "hora")   return dayjs(p).format("DD/MM HH:mm");
  return dayjs(p).format("DD/MM/YYYY");
};

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null"
    ? { Authorization: `Bearer ${token.trim()}` }
    : {};
};

const escapeHtml = (x) =>
  String(x ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ============================================================
 *  Mini chip de oficina (para los chips de %)
 * ============================================================ */
function OficinaChip({ oficina, oficina_nombre, total, pct }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[11px] font-black ${oficinaTone(oficina)}`}
    >
      <span>{oficina_nombre}</span>
      <span className="opacity-50">·</span>
      <span className="font-mono tabular-nums">{total}</span>
      <span className="opacity-60 text-[10px]">({pct}%)</span>
    </div>
  );
}

/* ============================================================
 *  Modal de descarga (Excel detallado o PDF resumen)
 * ============================================================ */
function ExportRenovacionesModal({
  open,
  onClose,
  apiBase,
  desdeInicial,
  hastaInicial,
  oficinaInicial,
  oficinasOptions = [],
  getOficinaNombre,
  // Datos de la tabla actual del panel (para generar PDF en frontend)
  tableData,
  agrupacionActual,
}) {
  const [desde, setDesde] = useState(desdeInicial || "");
  const [hasta, setHasta] = useState(hastaInicial || "");
  const [oficina, setOficina] = useState(oficinaInicial || "");
  const [compania, setCompania] = useState("");
  const [formato, setFormato] = useState("xlsx"); // xlsx | pdf
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDesde(desdeInicial || "");
      setHasta(hastaInicial || "");
      setOficina(oficinaInicial || "");
      setCompania("");
      setFormato("xlsx");
      setError("");
    }
  }, [open, desdeInicial, hastaInicial, oficinaInicial]);

  // 📊 EXCEL: usa el endpoint del backend (forzando tipo=renovaciones)
  const handleDescargarExcel = async () => {
    const d = clampIsoDate(desde);
    const h = clampIsoDate(hasta);

    if (!d || !h) {
      setError("Seleccioná fechas válidas.");
      return;
    }
    if (dayjs(d).isAfter(dayjs(h))) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const base = String(apiBase || "/api/").trim();
      const url = new URL(
        `${base}estadisticas/polizas/emisiones/export-excel/`,
        window.location.origin
      );
      url.searchParams.set("desde", d);
      url.searchParams.set("hasta", h);
      // 🔒 FORZAMOS solo renovaciones
      url.searchParams.set("tipo", "renovaciones");
      if (oficina) url.searchParams.set("oficina", oficina);
      if (compania.trim()) url.searchParams.set("compania", compania.trim());

      const res = await fetch(url.toString(), { headers: getAuthHeaders() });

      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.detail || data?.error || "";
        } catch {
          // ignore
        }
        throw new Error(detail || `Error HTTP ${res.status}`);
      }

      const blob = await res.blob();

      // Filename
      let filename = `Renovaciones_${safeNamePart(d)}_${safeNamePart(h)}.xlsx`;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename\*?=(?:UTF-\d+'')?["']?([^"';\n]+)/i);
      if (match?.[1]) {
        try {
          filename = decodeURIComponent(match[1].replace(/['"]/g, ""));
        } catch {
          filename = match[1].replace(/['"]/g, "");
        }
      }

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      onClose?.();
    } catch (e) {
      setError(e?.message || "No se pudo generar el Excel.");
    } finally {
      setLoading(false);
    }
  };

  // 📄 PDF: vista imprimible armada en frontend con la tabla actual del panel
  const handleDescargarPDF = () => {
    if (!tableData || !tableData.rows || tableData.rows.length === 0) {
      setError("No hay datos en la tabla para generar el PDF.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const d = clampIsoDate(desde) || desdeInicial || "—";
      const h = clampIsoDate(hasta) || hastaInicial || "—";
      const ofiLabel = oficina
        ? (typeof getOficinaNombre === "function" ? getOficinaNombre(oficina) : oficina)
        : "Todas las oficinas";

      // Header columnas: Período + cada oficina + Total
      const headers = [
        "Período",
        ...tableData.colMeta.map((c) => c.oficina_nombre),
        "Total",
      ];

      // Filas
      const bodyRows = tableData.rows.map((r) => [
        labelPeriodo(agrupacionActual, r.periodo),
        ...tableData.cols.map((ofi) => Number(r[ofi] || 0).toLocaleString("es-AR")),
        Number(r.total || 0).toLocaleString("es-AR"),
      ]);

      // Fila total
      const totalRow = [
        "TOTAL",
        ...tableData.cols.map((ofi) =>
          Number(tableData.totalsRow[ofi] || 0).toLocaleString("es-AR")
        ),
        Number(tableData.totalsRow.total || 0).toLocaleString("es-AR"),
      ];

      const thead = `<tr>${headers.map((x) => `<th>${escapeHtml(x)}</th>`).join("")}</tr>`;
      const tbody = bodyRows
        .map(
          (r) =>
            `<tr>${r
              .map((c, i) => `<td class="${i === 0 ? "periodo" : "num"}">${escapeHtml(c)}</td>`)
              .join("")}</tr>`
        )
        .join("");
      const tfoot = `<tr class="total">${totalRow
        .map((c, i) => `<td class="${i === 0 ? "periodo" : "num"}"><b>${escapeHtml(c)}</b></td>`)
        .join("")}</tr>`;

      const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Renovaciones por Oficina</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px 0; color: #0c4a6e; }
    .subtitle { font-size: 12px; color: #475569; margin-bottom: 16px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    .meta strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f172a; color: white; text-align: right; padding: 8px 10px; border: 1px solid #1e293b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; }
    th:first-child { text-align: left; }
    td { padding: 6px 10px; border: 1px solid #cbd5e1; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    td.periodo { font-weight: 500; color: #334155; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr.total td { background: #0284c7 !important; color: white; font-weight: bold; border-color: #0c4a6e; }
    .footer { margin-top: 16px; font-size: 10px; color: #94a3b8; text-align: right; }
    @media print {
      body { margin: 14mm; }
      h1 { color: #0c4a6e; }
    }
  </style>
</head>
<body>
  <h1>📋 Renovaciones por Oficina</h1>
  <div class="subtitle">Reporte de pólizas renovadas en el período seleccionado</div>
  <div class="meta">
    <strong>Período:</strong> ${escapeHtml(d)} al ${escapeHtml(h)} &nbsp;·&nbsp;
    <strong>Oficina:</strong> ${escapeHtml(ofiLabel)} &nbsp;·&nbsp;
    <strong>Agrupación:</strong> ${escapeHtml(agrupacionActual || "—")}
    ${compania.trim() ? `&nbsp;·&nbsp; <strong>Compañía:</strong> ${escapeHtml(compania.trim())}` : ""}
  </div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
    <tfoot>${tfoot}</tfoot>
  </table>
  <div class="footer">Generado el ${escapeHtml(dayjs().format("DD/MM/YYYY HH:mm"))}</div>
  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 250); };
  </script>
</body>
</html>`;

      const w = window.open("", "_blank");
      if (!w) {
        throw new Error("No se pudo abrir la ventana de impresión (¿bloqueo de popups?).");
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();

      onClose?.();
    } catch (e) {
      setError(e?.message || "No se pudo generar el PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = () => {
    if (formato === "xlsx") return handleDescargarExcel();
    return handleDescargarPDF();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-3xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-linea dark:border-linea-dark">
          <div>
            <h3 className="text-sm font-black text-titulo dark:text-titulo-dark flex items-center gap-2">
              <HiDownload className="text-oficina" /> Exportar renovaciones
            </h3>
            <p className="text-[10px] font-bold text-suave dark:text-suave-dark mt-0.5">
              Descargá el listado detallado en Excel o un PDF resumen
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-egreso hover:text-egreso transition-colors"
          >
            <HiX className="text-xs" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 space-y-4">
          {/* Formato */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-2">
              Formato
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormato("xlsx")}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-2xl border-2 transition-all ${
                  formato === "xlsx"
                    ? "bg-ingreso/10 border-ingreso text-ingreso"
                    : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-ingreso/50"
                }`}
              >
                <HiTable className="text-xl" />
                <span className="text-xs font-black">Excel detallado</span>
                <span className="text-[10px] font-bold opacity-70">Listado completo de pólizas</span>
              </button>
              <button
                type="button"
                onClick={() => setFormato("pdf")}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-2xl border-2 transition-all ${
                  formato === "pdf"
                    ? "bg-egreso/10 border-egreso text-egreso"
                    : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-egreso/50"
                }`}
              >
                <HiDocumentText className="text-xl" />
                <span className="text-xs font-black">PDF resumen</span>
                <span className="text-[10px] font-bold opacity-70">Tabla por oficina y período</span>
              </button>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1 flex items-center gap-1">
                <HiCalendar className="text-xs" /> Desde
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-9 w-full rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1 flex items-center gap-1">
                <HiCalendar className="text-xs" /> Hasta
              </label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-9 w-full rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Oficina */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1 flex items-center gap-1">
              <HiOfficeBuilding className="text-xs" /> Oficina
            </label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="h-9 w-full rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina cursor-pointer dark:[color-scheme:dark]"
            >
              <option value="">Todas las oficinas</option>
              {oficinasOptions.map((o) => {
                const val = String(o);
                const label =
                  typeof getOficinaNombre === "function" ? getOficinaNombre(val) : val;
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Compañía (solo aplica para Excel) */}
          {formato === "xlsx" && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark mb-1">
                Compañía (opcional)
              </label>
              <input
                type="text"
                value={compania}
                onChange={(e) => setCompania(e.target.value)}
                placeholder="Dejar vacío para todas"
                className="h-9 w-full rounded-xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina placeholder:text-suave dark:placeholder:text-suave-dark"
              />
            </div>
          )}

          {/* Aviso para PDF */}
          {formato === "pdf" && (
            <div className="flex items-start gap-2 rounded-xl border-2 border-oficina/30 bg-oficina/10 px-3 py-2.5 text-[11px] font-bold text-oficina dark:text-oficina-claro">
              <HiDocumentText className="shrink-0 mt-0.5" />
              <div>
                El PDF se genera con la tabla actual del panel. Para cambiar las fechas u oficina,
                ajustá los filtros del panel antes de exportar.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-egreso/30 bg-egreso/10 px-3 py-2.5 text-xs font-bold text-egreso dark:text-egreso-claro">
              <HiExclamationCircle className="shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t-2 border-linea dark:border-linea-dark">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-egreso hover:text-egreso transition-colors text-xs font-black"
          >
            Cancelar
          </button>
          <button
            onClick={handleDescargar}
            disabled={loading}
            className={`h-9 flex items-center gap-1.5 px-4 rounded-xl border-2 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 text-white text-xs font-black transition-all ${
              formato === "xlsx"
                ? "bg-ingreso border-ingreso shadow-[0_4px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5"
                : "bg-egreso border-egreso shadow-[0_4px_0_var(--color-egreso-fuerte)] active:shadow-[0_0_0_var(--color-egreso-fuerte)] active:translate-y-0.5"
            }`}
          >
            {loading ? (
              <>
                <HiRefresh className="animate-spin" /> Generando…
              </>
            ) : (
              <>
                <HiDownload />
                {formato === "xlsx" ? "Descargar Excel" : "Generar PDF"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Panel principal — RENOVACIONES POR OFICINA
 *  Reutiliza el endpoint de emisiones forzando es_renovacion=true
 * ============================================================ */
export default function RenovacionesPolizasPanel({
  apiBase,
  oficinas = [],
  getOficinaNombre,
  defaultOficina = "",
  anio,
  mes,
}) {
  const [agrupacion, setAgrupacion] = useState("mes");
  const [oficina, setOficina] = useState(defaultOficina || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [resolvedEndpoint, setResolvedEndpoint] = useState("");

  // 🆕 Modal de exportación
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const hasMesGlobal = useMemo(
    () => Boolean(String(anio || "").trim()) && Boolean(String(mes || "").trim()),
    [anio, mes]
  );
  const [usarMesSeleccionado, setUsarMesSeleccionado] = useState(
    () => Boolean(String(anio || "").trim()) && Boolean(String(mes || "").trim())
  );
  const [desde, setDesde] = useState(() => {
    if (String(anio || "").trim() && String(mes || "").trim())
      return monthRangeFrom(anio, mes).desde || defaultDesdeFor("dia");
    return defaultDesdeFor("dia");
  });
  const [hasta, setHasta] = useState(() => {
    if (String(anio || "").trim() && String(mes || "").trim())
      return monthRangeFrom(anio, mes).hasta || dayjs().format("YYYY-MM-DD");
    return dayjs().format("YYYY-MM-DD");
  });

  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  useEffect(() => {
    if (!hasMesGlobal || !usarMesSeleccionado) return;
    const r = monthRangeFrom(anio, mes);
    if (r.desde) setDesde(r.desde);
    if (r.hasta) setHasta(r.hasta);
  }, [anio, mes, hasMesGlobal, usarMesSeleccionado]);

  useEffect(() => {
    if (usarMesSeleccionado) return;
    setDesde((p) => p || defaultDesdeFor(agrupacion));
    setHasta((p) => p || dayjs().format("YYYY-MM-DD"));
  }, [agrupacion, usarMesSeleccionado]);

  const oficinasOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(Array.isArray(oficinas) ? oficinas : []).map((o) => String(o.id)),
          "OTRAS",
          "SIN_OFICINA",
        ])
      ),
    [oficinas]
  );

  const buildCandidates = useCallback(() => {
    const base = String(apiBase || "/api/").trim();
    return Array.from(
      new Set([
        `${base}estadisticas/polizas/emisiones/serie/`,
        `${base}estadisticas/polizas/emisiones/serie`,
        `${base}estadisticas/polizas/emisiones-serie/`,
        `${base}estadisticas/polizas/emisiones-serie`,
      ])
    );
  }, [apiBase]);

  const fetchSerie = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ agrupacion });
      const d = clampIsoDate(desde),
        h = clampIsoDate(hasta);
      if (d) params.set("desde", d);
      if (h) params.set("hasta", h);
      if (oficina) params.set("oficina", oficina);
      // 🔒 FORZADO: solo renovaciones (es_renovacion=true)
      params.set("es_renovacion", "true");

      const candidates = resolvedEndpoint ? [resolvedEndpoint] : buildCandidates();
      let lastErr = null;
      let dataOk = null;
      let endpointOk = null;
      for (const url of candidates) {
        try {
          const res = await fetch(`${url}?${params.toString()}`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            lastErr = { status: res.status, url };
            continue;
          }
          const json = await res.json();
          dataOk = json;
          endpointOk = url;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (dataOk) {
        setPayload(dataOk);
        if (endpointOk) setResolvedEndpoint(endpointOk);
      } else {
        setPayload(null);
        throw lastErr || new Error("No se pudo cargar la serie.");
      }
    } catch (e) {
      setPayload(null);
      setError(
        Number(e?.status) === 404
          ? `Endpoint no encontrado (404).`
          : "No se pudieron cargar las renovaciones."
      );
    } finally {
      setLoading(false);
    }
  }, [
    apiBase,
    agrupacion,
    desde,
    hasta,
    oficina,
    resolvedEndpoint,
    buildCandidates,
  ]);

  useEffect(() => {
    fetchSerie();
  }, [fetchSerie]);

  const oficinasSerie = useMemo(() => {
    const arr = Array.isArray(payload?.oficinas) ? payload.oficinas : [];
    const extra = arr.map((x) => String(x?.oficina || "")).filter((k) => !ORDER_BUCKETS.includes(k));
    const order = [...ORDER_BUCKETS, ...extra];
    const map = new Map(arr.map((o) => [String(o.oficina || ""), o]));
    return order.map((k) => map.get(k)).filter(Boolean);
  }, [payload]);

  const periodos = useMemo(() => (Array.isArray(payload?.periodos) ? payload.periodos : []), [payload]);

  const table = useMemo(() => {
    const cols = oficinasSerie.map((o) => String(o.oficina));
    const colMeta = oficinasSerie.map((o) => ({
      oficina: String(o.oficina),
      oficina_nombre:
        o.oficina_nombre ||
        (typeof getOficinaNombre === "function"
          ? getOficinaNombre(String(o.oficina))
          : String(o.oficina)),
      total: Number(o.total || 0),
    }));
    const seriesByOfi = new Map();
    oficinasSerie.forEach((o) => {
      const s = Array.isArray(o.serie) ? o.serie : [];
      seriesByOfi.set(
        String(o.oficina),
        new Map(s.map((it) => [String(it.periodo), Number(it.cantidad || 0)]))
      );
    });
    const rows = periodos.map((p) => {
      const row = { periodo: String(p) };
      cols.forEach((ofi) => {
        const m = seriesByOfi.get(ofi);
        row[ofi] = m ? Number(m.get(String(p)) || 0) : 0;
      });
      row.total = cols.reduce((acc, ofi) => acc + Number(row[ofi] || 0), 0);
      return row;
    });
    const totalsRow = {
      periodo: "TOTAL",
      total: rows.reduce((acc, r) => acc + Number(r.total || 0), 0),
    };
    cols.forEach((ofi) => {
      totalsRow[ofi] = rows.reduce((acc, r) => acc + Number(r[ofi] || 0), 0);
    });
    return { colMeta, cols, rows, totalsRow };
  }, [oficinasSerie, periodos, getOficinaNombre]);

  const totalGeneral = Number(table?.totalsRow?.total || 0);

  const chips = useMemo(
    () =>
      (table?.colMeta || [])
        .filter((c) => Number(c.total || 0) > 0)
        .map((c) => ({
          ...c,
          pct: totalGeneral > 0
            ? Math.round((Number(c.total || 0) * 100) / totalGeneral)
            : 0,
        })),
    [table, totalGeneral]
  );

  return (
    <div className="mt-6 rounded-3xl border-2 border-oficina/30 bg-card dark:bg-card-dark p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-oficina/10 border-2 border-oficina/30 p-2.5">
            <FaSyncAlt className="text-oficina text-sm" />
          </div>
          <div>
            <h3 className="text-sm font-black text-titulo dark:text-titulo-dark uppercase tracking-wide">
              Renovaciones por Oficina
            </h3>
            <p className="text-[11px] font-bold text-suave dark:text-suave-dark">
              Cantidad de pólizas renovadas en el período seleccionado
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchSerie}
            disabled={loading}
            className="h-9 flex items-center gap-1.5 px-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark hover:border-oficina hover:text-oficina transition-colors text-xs font-black"
          >
            <HiRefresh className={loading ? "animate-spin" : ""} />
            {loading ? "Cargando..." : "Actualizar"}
          </button>

          {/* 🆕 BOTÓN: Exportar (Excel o PDF) */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl border-2 border-ingreso bg-ingreso/10 text-ingreso hover:bg-ingreso/20 transition-colors text-xs font-black"
            title="Descargar Excel detallado o PDF resumen"
          >
            <HiDownload className="text-sm" />
            Exportar
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-1 py-1">
          {["dia", "semana", "mes"].map((agr) => (
            <button
              key={agr}
              type="button"
              onClick={() => setAgrupacion(agr)}
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-colors ${
                agrupacion === agr
                  ? "bg-oficina text-white"
                  : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
              }`}
            >
              {agr}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={desde}
          onChange={(e) => {
            setDesde(e.target.value);
            setUsarMesSeleccionado(false);
          }}
          className="h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina dark:[color-scheme:dark]"
        />
        <span className="text-xs text-suave dark:text-suave-dark">→</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => {
            setHasta(e.target.value);
            setUsarMesSeleccionado(false);
          }}
          className="h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina dark:[color-scheme:dark]"
        />

        <select
          value={oficina}
          onChange={(e) => setOficina(e.target.value)}
          className="h-9 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina cursor-pointer dark:[color-scheme:dark]"
        >
          <option value="">Todas las oficinas</option>
          {oficinasOptions.map((o) => {
            const val = String(o);
            const label =
              typeof getOficinaNombre === "function" ? getOficinaNombre(val) : val;
            return (
              <option key={val} value={val}>
                {label}
              </option>
            );
          })}
        </select>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-oficina ml-auto">
          <HiCalendar />
          <span>Solo renovaciones</span>
        </div>
      </div>

      {/* Chips % oficina */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <OficinaChip key={c.oficina} {...c} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border-2 border-egreso/30 bg-egreso/10 px-3 py-2 text-[11px] font-bold text-egreso dark:text-egreso-claro">
          {error}
        </div>
      )}

      {/* Total */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums text-oficina">
          {totalGeneral.toLocaleString("es-AR")}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-suave dark:text-suave-dark">
          renovaciones en el rango
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border-2 border-linea dark:border-linea-dark overflow-hidden bg-card dark:bg-card-dark">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
                  Período
                </th>
                {table.colMeta.map((c) => (
                  <th key={c.oficina} className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border-2 text-[10px] font-black ${oficinaTone(c.oficina)}`}
                    >
                      {c.oficina_nombre}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-suave dark:text-suave-dark">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-linea/50 dark:divide-linea-dark/50">
              {table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.colMeta.length + 2}
                    className="px-4 py-8 text-center text-suave dark:text-suave-dark font-bold"
                  >
                    {loading ? "Cargando..." : "Sin renovaciones para el rango seleccionado."}
                  </td>
                </tr>
              ) : (
                table.rows.map((r) => (
                  <tr key={r.periodo} className="hover:bg-oficina/5 transition-colors">
                    <td className="px-4 py-2 text-titulo dark:text-titulo-dark font-mono font-bold tabular-nums">
                      {labelPeriodo(agrupacion, r.periodo)}
                    </td>
                    {table.cols.map((ofi) => (
                      <td
                        key={ofi}
                        className="px-4 py-2 text-right text-titulo dark:text-titulo-dark font-mono tabular-nums"
                      >
                        {Number(r[ofi] || 0).toLocaleString("es-AR")}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-oficina font-mono font-black tabular-nums">
                      {Number(r.total || 0).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {table.rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark font-black">
                  <td className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-suave dark:text-suave-dark">
                    Total
                  </td>
                  {table.cols.map((ofi) => (
                    <td
                      key={ofi}
                      className="px-4 py-2.5 text-right text-titulo dark:text-titulo-dark font-mono tabular-nums"
                    >
                      {Number(table.totalsRow[ofi] || 0).toLocaleString("es-AR")}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right text-oficina font-mono tabular-nums">
                    {totalGeneral.toLocaleString("es-AR")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 🆕 MODAL DE EXPORTACIÓN */}
      <ExportRenovacionesModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        apiBase={apiBase}
        desdeInicial={desde}
        hastaInicial={hasta}
        oficinaInicial={oficina}
        oficinasOptions={oficinasOptions}
        getOficinaNombre={getOficinaNombre}
        tableData={table}
        agrupacionActual={agrupacion}
      />
    </div>
  );
}
