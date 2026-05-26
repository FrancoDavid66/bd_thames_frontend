/* src/components/pagos/DescargarBalanceCompaniaButton.jsx
   Botón para descargar el balance mensual de pagos agrupado por compañía.
   Trae TODOS los pagos del período (no solo la página visible) y genera
   un Excel listo para liquidar a la compañía.

   Columnas: Apellido y Nombre | Patente | Cuota N° | Período | Fecha de Pago | Compañía | Monto
*/
import { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { HiDownload } from "react-icons/hi";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/";
const API = (path) =>
  `${String(BASE_URL).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;

const apiSegura = axios.create({ withCredentials: true });
apiSegura.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
});

/* ─── helpers ───────────────────────────────────────────────────── */
const compact = (o) => {
  const out = {};
  for (const k of Object.keys(o || {})) {
    const v = o[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtFechaPago = (it) => {
  // Prioridad: pago_registrado_en (ISO con hora) → fecha_pago → fecha_guardado_pago
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
};

const periodoCuota = (it) => {
  // El "período" de la cuota es el mes/año al que corresponde la cuota.
  // Usamos fecha_vencimiento si existe; si no, derivamos del mes de pago.
  const fv = it?.fecha_vencimiento || it?.poliza?.fecha_vencimiento_cuota || null;
  if (fv) {
    const d = dayjs(fv);
    if (d.isValid()) return d.format("MM/YYYY");
  }
  const fp = it?.fecha_pago;
  if (fp) {
    const d = dayjs(fp);
    if (d.isValid()) return d.format("MM/YYYY");
  }
  return "—";
};

const nombreCompleto = (it) => {
  const cli = it?.cliente || {};
  const ap = String(cli?.apellido ?? "").trim();
  const no = String(cli?.nombre ?? "").trim();
  if (ap || no) return [ap, no].filter(Boolean).join(", ");
  // Fallback: si el backend mandó "cliente_nombre" plano
  const plano = String(it?.cliente_nombre ?? "").trim();
  return plano || "—";
};

const companiaDe = (it) => {
  const c =
    it?.compania_nombre ||
    it?.poliza?.compania_nombre ||
    it?.compania ||
    it?.poliza?.compania ||
    "";
  return String(c).trim() || "Sin compañía";
};

const patenteDe = (it) => {
  const p = it?.poliza?.patente || it?.patente || "";
  return String(p).trim().toUpperCase() || "—";
};

/* ─── Estilos celda Excel ──────────────────────────────────────── */
const styleHeader = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
  fill: { patternType: "solid", fgColor: { rgb: "1E3A8A" } }, // azul
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "1E293B" } },
    bottom: { style: "thin", color: { rgb: "1E293B" } },
    left: { style: "thin", color: { rgb: "1E293B" } },
    right: { style: "thin", color: { rgb: "1E293B" } },
  },
};

const styleTitle = {
  font: { bold: true, color: { rgb: "0F172A" }, sz: 14, name: "Calibri" },
  alignment: { horizontal: "left", vertical: "center" },
};

const styleCompania = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Calibri" },
  fill: { patternType: "solid", fgColor: { rgb: "0F766E" } }, // teal
  alignment: { horizontal: "left", vertical: "center" },
};

const styleSubtotal = {
  font: { bold: true, color: { rgb: "065F46" }, sz: 11, name: "Calibri" },
  fill: { patternType: "solid", fgColor: { rgb: "D1FAE5" } }, // verde claro
  alignment: { horizontal: "right", vertical: "center" },
};

const styleTotal = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Calibri" },
  fill: { patternType: "solid", fgColor: { rgb: "064E3B" } }, // verde fuerte
  alignment: { horizontal: "right", vertical: "center" },
};

const styleRow = (alt) => ({
  font: { color: { rgb: "1E293B" }, sz: 10, name: "Calibri" },
  fill: alt
    ? { patternType: "solid", fgColor: { rgb: "F8FAFC" } }
    : undefined,
  alignment: { vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "E2E8F0" } },
    bottom: { style: "thin", color: { rgb: "E2E8F0" } },
    left: { style: "thin", color: { rgb: "E2E8F0" } },
    right: { style: "thin", color: { rgb: "E2E8F0" } },
  },
});

/* ─── Componente ──────────────────────────────────────────────── */
export default function DescargarBalanceCompaniaButton({
  /* params para construir el filtro al backend */
  modo = "MES", // "MES" | "DIA" | "RANGO"
  mes,
  dia,
  desde,
  hasta,
  oficina,
  q,
  /* etiqueta visible y className opcional */
  label = "Balance por Compañía",
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    setLoading(true);
    const toastId = toast.loading("Generando balance por compañía…");

    try {
      // ── Armar params para traer TODOS los pagos del período ──
      const baseParams = compact({
        oficina: oficina && oficina !== "ALL" ? oficina : undefined,
        search: q || undefined,
        ordering: "-fecha_pago",
        all: 1, // 🚀 ¡importante! pide todos los pagos sin paginar
      });

      if (modo === "DIA") baseParams.dia = dia;
      else if (modo === "RANGO") {
        if (desde) baseParams.desde = desde;
        if (hasta) baseParams.hasta = hasta;
      } else {
        baseParams.mes = mes;
      }

      // ── Pegar al endpoint existente ──
      const res = await apiSegura.get(API("cuotas/pagos/"), {
        params: baseParams,
        timeout: 60_000,
      });

      const payload = res?.data;
      const items = Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload)
        ? payload
        : [];

      if (!items.length) {
        toast.dismiss(toastId);
        toast("No hay pagos registrados en ese período.", { icon: "📭" });
        return;
      }

      // ── Agrupar por compañía ──
      const grupos = new Map();
      for (const it of items) {
        const cia = companiaDe(it);
        if (!grupos.has(cia)) grupos.set(cia, []);
        grupos.get(cia).push(it);
      }

      // ── Etiqueta de período para título y filename ──
      let periodoLabel = "";
      let periodoFile = "";
      if (modo === "DIA") {
        periodoLabel = `Día ${dayjs(dia).format("DD/MM/YYYY")}`;
        periodoFile = dayjs(dia).format("YYYY-MM-DD");
      } else if (modo === "RANGO") {
        periodoLabel = `${desde || "inicio"} a ${hasta || "hoy"}`;
        periodoFile = `${desde || "inicio"}_a_${hasta || "hoy"}`;
      } else {
        const d = dayjs(`${mes}-01`);
        periodoLabel = d.isValid()
          ? d.format("MMMM YYYY").replace(/^./, (c) => c.toUpperCase())
          : mes;
        periodoFile = mes;
      }

      // ── Armar AOA (Array of Arrays) ──
      const aoa = [];
      const HEADERS = [
        "Apellido y Nombre",
        "Patente",
        "Cuota N°",
        "Período cuota",
        "Fecha de pago",
        "Compañía",
        "Monto",
      ];

      // Título
      aoa.push([`BALANCE DE PAGOS POR COMPAÑÍA — ${periodoLabel}`]);
      aoa.push([`Generado: ${dayjs().format("DD/MM/YYYY HH:mm")}`]);
      aoa.push([`Total de pagos: ${items.length}`]);
      aoa.push([]); // fila vacía

      const rowStyles = []; // [{ row, style }]
      let currentRow = aoa.length; // 0-indexed pero se aplica con +1 al guardar

      // Estilo del título
      rowStyles.push({ row: 0, col: 0, style: styleTitle });

      // ── Iterar grupos ordenados alfabéticamente ──
      const companias = Array.from(grupos.keys()).sort((a, b) =>
        a.localeCompare(b, "es")
      );

      let totalGeneral = 0;

      for (const cia of companias) {
        const filas = grupos.get(cia);
        const subtotal = filas.reduce((s, x) => s + toNumber(x.monto), 0);
        totalGeneral += subtotal;

        // Fila de compañía (merge en todas las columnas)
        const ciaRowIdx = aoa.length;
        aoa.push([`📋 ${cia}  (${filas.length} pago${filas.length !== 1 ? "s" : ""})`]);
        rowStyles.push({ row: ciaRowIdx, col: 0, style: styleCompania, merge: [ciaRowIdx, 0, ciaRowIdx, HEADERS.length - 1] });

        // Headers
        const headRowIdx = aoa.length;
        aoa.push(HEADERS);
        HEADERS.forEach((_, c) => {
          rowStyles.push({ row: headRowIdx, col: c, style: styleHeader });
        });

        // Filas de detalle
        filas
          .sort((a, b) => {
            // Por apellido, luego nombre
            const A = nombreCompleto(a).toLowerCase();
            const B = nombreCompleto(b).toLowerCase();
            return A.localeCompare(B, "es");
          })
          .forEach((it, idx) => {
            const r = aoa.length;
            const monto = toNumber(it?.monto);
            aoa.push([
              nombreCompleto(it),
              patenteDe(it),
              it?.cuota_nro ?? "—",
              periodoCuota(it),
              fmtFechaPago(it),
              cia,
              monto,
            ]);
            const alt = idx % 2 === 1;
            for (let c = 0; c < HEADERS.length; c++) {
              const st = { ...styleRow(alt) };
              if (c === 6) {
                st.numFmt = '"$"#,##0.00';
                st.alignment = { ...(st.alignment || {}), horizontal: "right" };
              }
              rowStyles.push({ row: r, col: c, style: st });
            }
          });

        // Fila subtotal
        const subRowIdx = aoa.length;
        aoa.push(["", "", "", "", "", `Subtotal ${cia}:`, subtotal]);
        rowStyles.push({ row: subRowIdx, col: 5, style: styleSubtotal });
        const stSub = { ...styleSubtotal, numFmt: '"$"#,##0.00' };
        rowStyles.push({ row: subRowIdx, col: 6, style: stSub });

        // Fila vacía entre compañías
        aoa.push([]);
      }

      // ── Total general ──
      const totalRowIdx = aoa.length;
      aoa.push(["", "", "", "", "", "TOTAL GENERAL:", totalGeneral]);
      rowStyles.push({ row: totalRowIdx, col: 5, style: styleTotal });
      rowStyles.push({
        row: totalRowIdx,
        col: 6,
        style: { ...styleTotal, numFmt: '"$"#,##0.00' },
      });

      // ── Construir worksheet ──
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Aplicar estilos
      const merges = [];
      for (const { row, col, style, merge } of rowStyles) {
        const ref = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[ref]) ws[ref] = { t: "s", v: "" };
        ws[ref].s = style;
        if (merge) {
          merges.push({
            s: { r: merge[0], c: merge[1] },
            e: { r: merge[2], c: merge[3] },
          });
        }
      }
      // Título: merge en todas las columnas
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } });

      ws["!merges"] = merges;

      // Anchos de columna
      ws["!cols"] = [
        { wch: 32 }, // Apellido y nombre
        { wch: 12 }, // Patente
        { wch: 10 }, // Cuota
        { wch: 14 }, // Período
        { wch: 20 }, // Fecha pago
        { wch: 24 }, // Compañía
        { wch: 16 }, // Monto
      ];

      // Freeze panes en el título
      ws["!freeze"] = { xSplit: 0, ySplit: 4 };

      // ── Workbook ──
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Balance Compañía");

      const filename = `Balance_Companias_${periodoFile}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.dismiss(toastId);
      toast.success(`Excel generado: ${items.length} pagos`, { duration: 3500 });
    } catch (err) {
      console.error("[DescargarBalanceCompaniaButton] Error:", err);
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
      } else {
        toast.error(`No se pudo generar el Excel: ${detail}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      title="Descargar balance del período agrupado por compañía"
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-2xl text-xs sm:text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        loading
          ? "bg-emerald-900/40 border-emerald-700/60 text-emerald-200"
          : "bg-emerald-700 hover:bg-emerald-600 border-emerald-600 text-white"
      } ${className}`}
    >
      <HiDownload className={`w-4 h-4 ${loading ? "animate-bounce" : ""}`} />
      {loading ? "Generando…" : label}
    </button>
  );
}