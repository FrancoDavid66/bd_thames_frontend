/* src/components/balanzes/HistorialPagosPanel.jsx
   Historial completo de pagos de cuotas por oficina.
   Admin ve todas las oficinas. Empleado solo ve la suya.

   ✅ DESCARGAS:
   - EXCEL → generado en BACKEND con openpyxl. Trae una tabla REAL de Excel
     (objeto Table, con flechitas de filtro/ordenamiento nativas en cada header).
     Estilos profesionales, header congelado, total general.
   - PDF → generado en frontend con jspdf (A4 horizontal, agrupado por compañía,
     subtotales por compañía y total general).
   - Filename refleja los filtros (rango + oficina + medio + búsqueda).
   - Errores visibles por toast.
*/
import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import {
  HiSearch, HiX, HiDownload, HiRefresh, HiChevronLeft, HiChevronRight,
  HiCash, HiCreditCard, HiOfficeBuilding, HiCalendar, HiFilter,
} from "react-icons/hi";
import { fetchHistorialPagos } from "../../store/slices/pagosSlice";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";


const FORMAS = [
  { value: "TODAS",         label: "Todas las formas" },
  { value: "EFECTIVO",      label: "💵 Efectivo" },
  { value: "TRANSFERENCIA", label: "🏦 Transferencia" },
];

const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => d ? dayjs(d).format("DD/MM/YYYY") : "—";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function FormaPagoBadge({ forma }) {
  const f = (forma || "EFECTIVO").toUpperCase();
  if (f === "EFECTIVO")
    return <span className="inline-flex items-center  gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-400">💵 Efectivo</span>;
  if (f === "TRANSFERENCIA")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-900/40 border border-sky-700/50 text-sky-400">🏦 Transf.</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">💳 {f}</span>;
}

function OficinaLabel({ oficina, oficinasMap = {} }) {
  const name = oficinasMap[String(oficina)] || String(oficina || "—");
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-900/30 border border-indigo-700/40 text-indigo-400">
      {name}
    </span>
  );
}

/* ─── Helper: sufijo del filename según filtros ─── */
function buildFilenameSuffix({ desde, hasta, oficinaLabel, formaPago, q }) {
  const safe = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30);

  const partes = [];
  if (oficinaLabel) partes.push(safe(oficinaLabel));
  if (formaPago && formaPago !== "TODAS") partes.push(safe(formaPago));
  if (q) partes.push(`q-${safe(q)}`);

  const rango = `${dayjs(desde).format("YYYY-MM-DD")}_a_${dayjs(hasta).format("YYYY-MM-DD")}`;
  const filtros = partes.length > 0 ? `_${partes.join("_")}` : "";
  return `${rango}${filtros}`;
}

/* ─── Extractores para PDF (mismo formato que el backend usa para Excel) ─── */
function rowApellidoNombre(it) {
  const plano = String(it?.cliente_nombre ?? "").trim();
  if (plano) return plano;
  const cli = it?.cliente || {};
  const ap = String(cli?.apellido ?? "").trim();
  const no = String(cli?.nombre ?? "").trim();
  if (ap || no) return [ap, no].filter(Boolean).join(", ");
  return "—";
}
function rowPatente(it) {
  const p = it?.patente || it?.poliza?.patente || "";
  return String(p).trim().toUpperCase() || "—";
}
function rowCompania(it) {
  const c = it?.compania_nombre || it?.poliza?.compania_nombre || it?.compania || it?.poliza?.compania || "";
  return String(c).trim() || "Sin compañía";
}
function rowFechaPago(it) {
  const ts = it?.pago_registrado_en || it?.pago_ts || null;
  if (ts) {
    const d = dayjs(ts);
    if (d.isValid()) return d.format("DD/MM/YYYY HH:mm");
  }
  const f = it?.fecha_pago || it?.fecha_guardado_pago;
  if (f) {
    const d = dayjs(f);
    if (d.isValid()) return d.format("DD/MM/YYYY");
    return String(f);
  }
  return "—";
}
function rowCuota(it) {
  const lbl = String(it?.cuota_label ?? "").trim();
  if (lbl) return lbl;
  const n = it?.cuota_nro;
  const t = it?.total_cuotas || it?.cantidad_cuotas;
  if (n && t) return `${n}/${t}`;
  if (n) return String(n);
  return "—";
}
function rowOficina(it, oficinasMap = {}) {
  const raw =
    it?.oficina_nombre ||
    oficinasMap[String(it?.oficina_bucket ?? "")] ||
    oficinasMap[String(it?.oficina ?? "")] ||
    it?.oficina_bucket || it?.oficina || "";
  return String(raw).trim() || "—";
}
function rowMedio(it) {
  const f = String(it?.forma_pago ?? "").trim().toUpperCase();
  if (f === "EFECTIVO") return "Efectivo";
  if (f === "TRANSFERENCIA") return "Transferencia";
  return f || "—";
}

const PDF_HEADERS = [
  "Apellido y Nombre", "Patente", "Compañía", "Fecha de pago",
  "Cuota", "Oficina", "Medio", "Importe",
];

function rowDataForExport(it, oficinasMap) {
  return [
    rowApellidoNombre(it),
    rowPatente(it),
    rowCompania(it),
    rowFechaPago(it),
    rowCuota(it),
    rowOficina(it, oficinasMap),
    rowMedio(it),
    toNumber(it?.monto),
  ];
}

/* ════════════════════════════════════════════════════════════════
   GENERADOR DE PDF (A4 horizontal, agrupado por compañía)
   ════════════════════════════════════════════════════════════════ */
function generarPDF({ items, oficinasMap, desde, hasta, oficinaLabel, formaPago, q }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 28;
  const marginTop = 28;
  const marginBottom = 36;

  const usable = pageW - 2 * marginX;
  const ratios = [0.22, 0.09, 0.16, 0.13, 0.07, 0.12, 0.10, 0.11];
  const colWidths = ratios.map(r => Math.floor(usable * r));
  const xs = [];
  let cur = marginX;
  for (let i = 0; i < colWidths.length; i++) { xs.push(cur); cur += colWidths[i]; }

  const headerH = 22;
  const rowH = 18;
  const titleH = 56;
  let pageNo = 1;

  const grupos = new Map();
  for (const it of items) {
    const cia = rowCompania(it);
    if (!grupos.has(cia)) grupos.set(cia, []);
    grupos.get(cia).push(it);
  }
  const companias = Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b, "es"));

  const drawTitle = () => {
    doc.setFillColor(30, 58, 138);
    doc.rect(marginX, marginTop, usable, titleH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("HISTORIAL DE PAGOS", marginX + 14, marginTop + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const rango = `Período: ${dayjs(desde).format("DD/MM/YYYY")} a ${dayjs(hasta).format("DD/MM/YYYY")}`;
    doc.text(rango, marginX + 14, marginTop + 38);
    doc.text(
      `Total de pagos: ${items.length}   ·   Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`,
      marginX + 14, marginTop + 50
    );
    doc.setTextColor(15, 23, 42);
  };

  const drawHeader = (y) => {
    doc.setFillColor(30, 58, 138);
    doc.rect(marginX, y, usable, headerH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    PDF_HEADERS.forEach((h, i) => {
      const align = i === 7 ? "right" : "left";
      const tx = align === "right" ? xs[i] + colWidths[i] - 6 : xs[i] + 6;
      doc.text(h, tx, y + 14, { align });
    });
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    return y + headerH;
  };

  const drawRow = (it, y, alt) => {
    if (alt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, usable, rowH, "F");
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(marginX, y + rowH, marginX + usable, y + rowH);
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const cells = rowDataForExport(it, oficinasMap);
    cells.forEach((val, i) => {
      const align = i === 7 ? "right" : "left";
      const tx = align === "right" ? xs[i] + colWidths[i] - 6 : xs[i] + 6;
      let txt = "";
      if (i === 7) {
        txt = "$ " + Number(val || 0).toLocaleString("es-AR", {
          minimumFractionDigits: 2, maximumFractionDigits: 2,
        });
      } else {
        txt = String(val ?? "—");
      }
      const maxW = colWidths[i] - 10;
      if (doc.getTextWidth(txt) > maxW) {
        while (doc.getTextWidth(txt + "…") > maxW && txt.length > 0) txt = txt.slice(0, -1);
        txt = txt + "…";
      }
      doc.text(txt, tx, y + 12, { align });
    });
    return y + rowH;
  };

  const drawCompaniaHeader = (cia, count, y) => {
    doc.setFillColor(15, 118, 110);
    doc.rect(marginX, y, usable, headerH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`▸ ${cia}   (${count} pago${count !== 1 ? "s" : ""})`, marginX + 10, y + 14);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    return y + headerH;
  };

  const drawSubtotal = (cia, subtotal, y) => {
    doc.setFillColor(209, 250, 229);
    doc.rect(marginX, y, usable, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 95, 70);
    doc.setFontSize(9);
    doc.text(`Subtotal ${cia}:`, xs[6] + colWidths[6] - 6, y + 12, { align: "right" });
    const totStr = "$ " + Number(subtotal || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    doc.text(totStr, xs[7] + colWidths[7] - 6, y + 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    return y + rowH;
  };

  const drawTotalGeneral = (total, y) => {
    doc.setFillColor(6, 78, 59);
    doc.rect(marginX, y, usable, rowH + 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("TOTAL GENERAL:", xs[6] + colWidths[6] - 6, y + 13, { align: "right" });
    const totStr = "$ " + Number(total || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    doc.text(totStr, xs[7] + colWidths[7] - 6, y + 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    return y + rowH + 2;
  };

  drawTitle();
  let y = marginTop + titleH + 10;
  let totalGeneral = 0;

  for (const cia of companias) {
    const filas = grupos.get(cia);
    const subtotal = filas.reduce((s, x) => s + toNumber(x.monto), 0);
    totalGeneral += subtotal;

    if (y + headerH * 2 + rowH * 2 > pageH - marginBottom) {
      doc.addPage();
      pageNo++;
      drawTitle();
      y = marginTop + titleH + 10;
    }
    y = drawCompaniaHeader(cia, filas.length, y);
    y = drawHeader(y);

    const filasOrd = filas.slice().sort((a, b) => rowApellidoNombre(a).localeCompare(rowApellidoNombre(b), "es"));
    filasOrd.forEach((it, idx) => {
      if (y + rowH > pageH - marginBottom) {
        doc.addPage();
        pageNo++;
        drawTitle();
        y = marginTop + titleH + 10;
        y = drawCompaniaHeader(cia + " (cont.)", filas.length, y);
        y = drawHeader(y);
      }
      y = drawRow(it, y, idx % 2 === 1);
    });

    if (y + rowH > pageH - marginBottom) {
      doc.addPage();
      pageNo++;
      drawTitle();
      y = marginTop + titleH + 10;
    }
    y = drawSubtotal(cia, subtotal, y);
    y += 6;
  }

  if (y + rowH + 4 > pageH - marginBottom) {
    doc.addPage();
    pageNo++;
    drawTitle();
    y = marginTop + titleH + 10;
  }
  y = drawTotalGeneral(totalGeneral, y);

  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${p} de ${total}`, pageW - marginX, pageH - 14, { align: "right" });
  }

  const suffix = buildFilenameSuffix({ desde, hasta, oficinaLabel, formaPago, q });
  const filename = `Historial_Pagos_${suffix}.pdf`;
  doc.save(filename);
  return { filename, count: items.length };
}


export default function HistorialPagosPanel({ oficinasAdmin = [], oficinaProp }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const userOficina = String(user?.perfil?.oficina?.codigo || user?.perfil?.oficina?.id || "");

  // Filtros
  const hoy   = dayjs().format("YYYY-MM-DD");
  const hace30 = dayjs().subtract(30, "day").format("YYYY-MM-DD");

  const [oficina,    setOficina]    = useState(isWebAdmin ? "ALL" : userOficina);
  const [desde,      setDesde]      = useState(hace30);
  const [hasta,      setHasta]      = useState(hoy);
  const [formaPago,  setFormaPago]  = useState("TODAS");
  const [q,          setQ]          = useState("");
  const [qInput,     setQInput]     = useState("");
  const [page,       setPage]       = useState(1);
  const [exporting,  setExporting]  = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [oficinas,    setOficinas]    = useState([]);

  // 🚀 Sucursal controlada desde la página (selector global de arriba).
  useEffect(() => {
    if (oficinaProp !== undefined && oficinaProp !== null && oficinaProp !== "") {
      setOficina(String(oficinaProp));
    }
  }, [oficinaProp]);

  // Cargar oficinas dinámicamente
  useEffect(() => {
    if (!isWebAdmin) return;
    api.get("usuarios/oficinas/")
      .then(({ data }) => setOficinas(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => setOficinas([]));
  }, [isWebAdmin]);

  const oficinasMap = useMemo(() => {
    const m = {};
    oficinas.forEach(o => { m[String(o.id)] = o.nombre; });
    return m;
  }, [oficinas]);

  const oficinasOpciones = useMemo(() => [
    { value: "ALL", label: "Todas las oficinas" },
    ...oficinas.map(o => ({ value: String(o.id), label: o.nombre })),
  ], [oficinas]);

  const PAGE_SIZE = 50;

  const historialStatus  = useSelector((s) => s.pagos?.historialPagosStatus  || "idle");
  const historialItems   = useSelector((s) => s.pagos?.historialPagosItems   || []);
  const historialCount   = useSelector((s) => s.pagos?.historialPagosMeta?.count || 0);
  const historialNext    = useSelector((s) => s.pagos?.historialPagosMeta?.next    || null);
  const historialPrev    = useSelector((s) => s.pagos?.historialPagosMeta?.previous || null);

  const loading = historialStatus === "loading";
  const totalPages = Math.max(1, Math.ceil(historialCount / PAGE_SIZE));

  const cargar = useCallback((p = 1) => {
    dispatch(fetchHistorialPagos({
      oficina: oficina !== "ALL" ? oficina : undefined,
      desde, hasta,
      forma_pago: formaPago !== "TODAS" ? formaPago : undefined,
      q: q || undefined,
      page: p, page_size: PAGE_SIZE,
      ordering: "-fecha_pago", force: true,
    }));
  }, [dispatch, oficina, desde, hasta, formaPago, q]);

  useEffect(() => { setPage(1); cargar(1); }, [oficina, desde, hasta, formaPago, q]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    setQ(qInput.trim()); setPage(1);
  };

  /* ═══════════════════════════════════════════════════════════════
     HANDLE EXPORT
     ─────────────────────────────────────────────────────────────
     EXCEL → pega al backend con ?export=xlsx → archivo binario con
             tabla nativa de Excel (flechitas de filtro).
     PDF   → trae los pagos con ?all=1 y arma el PDF en el front.
  ═══════════════════════════════════════════════════════════════ */
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    const toastId = toast.loading(
      exportFormat === "pdf" ? "Generando PDF…" : "Generando Excel…"
    );

    // Etiqueta legible de oficina para el filename del front
    const oficinaLabel =
      oficina === "ALL" ? "" : (oficinasMap[String(oficina)] || String(oficina));

    try {
      if (exportFormat === "xlsx" || exportFormat === "excel") {
        // ── EXCEL desde el BACKEND ───────────────────────────────────
        const res = await api.get("cuotas/pagos/", {
          params: {
            oficina: oficina !== "ALL" ? oficina : undefined,
            desde,
            hasta,
            forma_pago: formaPago !== "TODAS" ? formaPago : undefined,
            search: q || undefined,
            ordering: "-fecha_pago",
            export: "xlsx",
          },
          responseType: "blob",
          timeout: 60_000,
        });

        // Si el backend devolvió JSON de error camuflado en blob, lo detectamos
        const ct = String(res.headers?.["content-type"] || "").toLowerCase();
        if (!ct.includes("spreadsheet") && !ct.includes("xlsx") && !ct.includes("octet")) {
          // probablemente sea JSON con error
          const txt = await res.data.text();
          let detail = txt;
          try {
            const j = JSON.parse(txt);
            detail = j.detail || j.error || txt;
          } catch {}
          throw new Error(detail || "El servidor no devolvió un Excel.");
        }

        // Armar nombre del archivo
        const suffix = buildFilenameSuffix({
          desde, hasta, oficinaLabel,
          formaPago: formaPago !== "TODAS" ? formaPago : "",
          q: q || "",
        });
        const filename = `Historial_Pagos_${suffix}.xlsx`;

        // Disparar la descarga
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);

        toast.dismiss(toastId);
        toast.success("Excel generado", { duration: 3500 });
      } else {
        // ── PDF en el FRONTEND ───────────────────────────────────────
        // Traer todos los pagos del rango y armar el PDF acá
        const res = await api.get("cuotas/pagos/", {
          params: {
            oficina: oficina !== "ALL" ? oficina : undefined,
            desde,
            hasta,
            forma_pago: formaPago !== "TODAS" ? formaPago : undefined,
            search: q || undefined,
            ordering: "-fecha_pago",
            all: 1,
          },
          timeout: 60_000,
        });

        const payload = res?.data;
        const items = Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload) ? payload : [];

        if (!items.length) {
          toast.dismiss(toastId);
          toast("No hay pagos en ese período.", { icon: "📭" });
          return;
        }

        const { count } = generarPDF({
          items, oficinasMap, desde, hasta,
          oficinaLabel,
          formaPago: formaPago !== "TODAS" ? formaPago : "",
          q: q || "",
        });
        toast.dismiss(toastId);
        toast.success(`PDF generado: ${count} pagos`, { duration: 3500 });
      }
    } catch (err) {
      console.error("[HistorialPagosPanel] Error al exportar:", err);
      toast.dismiss(toastId);

      const status = err?.response?.status;
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Error desconocido";

      if (status === 401 || status === 403) {
        toast.error("Tu sesión expiró. Volvé a iniciar sesión.");
      } else if (status === 404) {
        toast.error("Endpoint no encontrado. Avisale al admin.");
      } else if (status === 500) {
        toast.error("Error del servidor. Revisá los logs.");
      } else {
        toast.error(`No se pudo descargar: ${detail}`);
      }
    } finally {
      setExporting(false);
    }
  };

  const kpis = useMemo(() => {
    const items = historialItems;
    const total      = items.reduce((s, i) => s + Number(i.monto || 0), 0);
    const efectivo   = items.filter(i => (i.forma_pago || "efectivo").toLowerCase() === "efectivo").reduce((s, i) => s + Number(i.monto || 0), 0);
    const transf     = items.filter(i => (i.forma_pago || "").toLowerCase() === "transferencia").reduce((s, i) => s + Number(i.monto || 0), 0);
    return { total, efectivo, transf, cantidad: items.length };
  }, [historialItems]);

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 space-y-3">

        {/* Fila 1 — búsqueda + export */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <HiSearch className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por asegurado, descripción o patente…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none min-w-0"
            />
            {qInput && (
              <button type="button" onClick={() => { setQInput(""); setQ(""); }}
                className="p-0.5 text-slate-600 hover:text-slate-300 transition-colors">
                <HiX className="w-4 h-4" />
              </button>
            )}
          </form>
          <button onClick={handleSearch}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors">
            Buscar
          </button>
          <button onClick={() => cargar(page)} title="Actualizar"
            className="p-2 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 text-slate-400 transition-colors">
            <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value)}
              className="h-9 px-2 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-slate-300 outline-none">
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button onClick={handleExport} disabled={exporting || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              <HiDownload className={`w-4 h-4 ${exporting ? "animate-bounce" : ""}`} />
              {exporting ? "Descargando…" : exportFormat === "pdf" ? "Descargar PDF" : "Descargar Excel"}
            </button>
          </div>
        </div>

        {/* Fila 2 — filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fechas */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
            <HiCalendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-32" />
            <span className="text-slate-600 text-xs">→</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-32" />
          </div>

          {/* Forma de pago */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
            <HiCreditCard className="w-4 h-4 text-slate-500 shrink-0" />
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none">
              {FORMAS.map(f => <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>)}
            </select>
          </div>

          {/* Oficina (solo admin) */}
          {isWebAdmin && oficinaProp === undefined && (
            <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
              <HiOfficeBuilding className="w-4 h-4 text-slate-500 shrink-0" />
              <select value={oficina} onChange={(e) => setOficina(e.target.value)}
                className="bg-transparent text-sm text-slate-300 outline-none">
                {oficinasOpciones.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
              </select>
            </div>
          )}

          {/* Contador */}
          <div className="ml-auto text-xs text-slate-500">
            {historialCount > 0 ? `${historialCount.toLocaleString("es-AR")} cobros encontrados` : ""}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total período",    value: fmtMoney(kpis.total),    color: "text-emerald-400", icon: HiCash },
          { label: "Efectivo",         value: fmtMoney(kpis.efectivo), color: "text-emerald-300", icon: HiCash },
          { label: "Transferencia",    value: fmtMoney(kpis.transf),   color: "text-sky-400",     icon: HiCreditCard },
          { label: "Cantidad de cobros", value: kpis.cantidad.toLocaleString("es-AR"), color: "text-slate-200", icon: HiFilter },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-slate-900/50 border border-slate-800/60 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
              <Icon className="w-4 h-4 text-slate-600" />
            </div>
            <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabla ── */}
      <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 rounded-full border-2 border-primary-400/40 border-t-primary-400 animate-spin" />
          </div>
        ) : historialItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Sin cobros para los filtros aplicados.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`grid gap-2 px-4 py-3 bg-slate-950/60 border-b border-slate-800/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold ${isWebAdmin ? "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_1.3fr_0.7fr_0.7fr]" : "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_1.3fr_0.7fr]"}`}>
              <div>Fecha</div>
              <div>Asegurado</div>
              <div>Patente</div>
              <div>Modelo</div>
              <div>Forma</div>
              <div>Enviado por / Cuenta</div>
              {isWebAdmin && <div>Oficina</div>}
              <div className="text-right">Monto</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800/40">
              <AnimatePresence>
                {historialItems.map((item, idx) => (
                  <motion.div key={item.id || idx}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`grid gap-2 px-4 py-3 hover:bg-slate-800/30 transition-colors text-sm ${isWebAdmin ? "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_1.3fr_0.7fr_0.7fr]" : "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_1.3fr_0.7fr]"}`}>

                    <div className="flex flex-col justify-center">
                      <span className="text-slate-300 font-medium">{fmtDate(item.fecha_pago || item.fecha)}</span>
                      {item.pago_hm && <span className="text-[10px] text-slate-600">{item.pago_hm} hs</span>}
                    </div>

                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-slate-200 font-medium truncate" title={item.cliente_nombre || "—"}>
                        {item.cliente_nombre || "—"}
                      </span>
                      {item.cliente_dni && <span className="text-[10px] text-slate-500">DNI: {item.cliente_dni}</span>}
                    </div>

                    <div className="flex items-center">
                      {item.patente
                        ? <span className="font-mono text-[11px] font-bold bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg text-slate-200 tracking-widest uppercase">{item.patente}</span>
                        : <span className="text-slate-600">—</span>}
                    </div>

                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-slate-300 truncate text-[12px]">
                        {[item.marca, item.modelo].filter(Boolean).join(" ") || "—"}
                      </span>
                      {item.compania_nombre && (
                        <span className="text-[10px] text-slate-500 truncate">
                          {item.compania_nombre}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center">
                      <FormaPagoBadge forma={item.forma_pago} />
                    </div>

                    <div className="flex flex-col justify-center min-w-0 gap-0.5">
                      {(() => {
                        const obs  = item.observaciones || "";
                        const cuitM = obs.match(/CUIT:\s*([^\s|]+)/);
                        const opM   = obs.match(/Op:\s*([^\s|]+)/);
                        const cuit  = cuitM ? cuitM[1] : "";
                        const op    = opM   ? opM[1]   : "";
                        const cuenta = item.destino_cuenta || item.billetera || "";
                        const hayDatos = item.pagado_por || cuenta || cuit || op;
                        if (!hayDatos) return <span className="text-slate-600 text-sm">—</span>;
                        return (
                          <>
                            {item.pagado_por && (
                              <span className="text-sm font-medium text-slate-200 truncate" title={item.pagado_por}>
                                {item.pagado_por}
                              </span>
                            )}
                            {cuenta && (
                              <span className="text-xs font-bold text-indigo-300 truncate bg-indigo-950/40 border border-indigo-800/40 px-1.5 py-0.5 rounded-md" title={cuenta}>
                                → {cuenta}
                              </span>
                            )}
                            {cuit && <span className="text-[11px] text-slate-400">CUIT: {cuit}</span>}
                            {op && <span className="text-[11px] text-slate-500">Op: {op}</span>}
                          </>
                        );
                      })()}
                    </div>

                    {isWebAdmin && (
                      <div className="flex items-center">
                        <OficinaLabel oficinasMap={oficinasMap} oficina={item.oficina_bucket || item.oficina} />
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      <span className="font-bold tabular-nums text-emerald-400">{fmtMoney(item.monto)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between  px-4 py-3 border-t border-slate-800/60 bg-slate-950/40">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages} · {historialCount.toLocaleString("es-AR")} resultados
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={!historialPrev || loading}
                    onClick={() => { const p = page - 1; setPage(p); cargar(p); }}
                    className="p-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/60 disabled:opacity-30 text-slate-400 transition-colors">
                    <HiChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 font-mono min-w-[60px] text-center">{page} / {totalPages}</span>
                  <button disabled={!historialNext || loading}
                    onClick={() => { const p = page + 1; setPage(p); cargar(p); }}
                    className="p-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/60 disabled:opacity-30 text-slate-400 transition-colors">
                    <HiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}