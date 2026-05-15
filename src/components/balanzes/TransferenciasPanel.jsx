/* src/components/balanzes/TransferenciasPanel.jsx
   Panel de control de transferencias — verificación con comprobante.
   Admin ve todas las oficinas. Empleado solo ve la suya.
*/
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import axios from "axios";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
  HiSearch, HiX, HiRefresh, HiDownload,
  HiCheckCircle, HiClock, HiOfficeBuilding,
  HiCalendar, HiFilter, HiChevronLeft, HiChevronRight,
  HiShieldCheck, HiExclamationCircle,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";

const BASE_URL = import.meta.env.VITE_API_URL;
const getToken  = () => localStorage.getItem("access_token") || "";
const getHeaders= () => ({ Authorization: `Bearer ${getToken()}` });

const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate  = (d) => d ? dayjs(d).format("DD/MM/YYYY") : "—";
const fmtDT    = (d) => d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—";

const OFICINAS = [
  { value: "ALL", label: "Todas las oficinas" },
  { value: "1",   label: "5 Esquinas" },
  { value: "2",   label: "Axion" },
  { value: "3",   label: "Km 39" },
];

function EstadoBadge({ verificada }) {
  if (verificada)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-400">
        <HiShieldCheck className="w-3.5 h-3.5" /> Verificada
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-900/40 border border-amber-700/50 text-amber-400 animate-pulse">
      <HiClock className="w-3.5 h-3.5" /> Pendiente
    </span>
  );
}

function VerificarModal({ item, onClose, onVerificada }) {
  const [nota, setNota]       = useState(item?.nota_verificacion || "");
  const [loading, setLoading] = useState(false);

  const confirmar = async () => {
    setLoading(true);
    try {
      const res = await axios.patch(
        `${BASE_URL}ingresos/${item.id}/verificar/`,
        { verificada: true, nota_verificacion: nota },
        { headers: getHeaders() }
      );
      toast.success("✅ Transferencia verificada");
      onVerificada(res.data);
      onClose();
    } catch {
      toast.error("Error al verificar la transferencia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{ scale: 1,   opacity: 1, y: 0 }}
        exit={{    scale: 0.9, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative z-[10000] w-full max-w-lg rounded-2xl border border-emerald-800/60 bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-950/70 border-b border-emerald-800/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-900/60 flex items-center justify-center shrink-0">
            <HiShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-emerald-300">Verificar transferencia</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">
              {item?.pagado_por || "—"} · {fmtMoney(item?.monto)}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors">
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Datos del comprobante */}
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 bg-slate-800/40 rounded-xl p-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Remitente</p>
              <p className="text-sm font-semibold text-slate-200">{item?.pagado_por || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Monto</p>
              <p className="text-sm font-bold text-emerald-400">{fmtMoney(item?.monto)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Cuenta destino</p>
              <p className="text-sm text-slate-300 font-mono">{item?.billetera || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Fecha</p>
              <p className="text-sm text-slate-300">{fmtDate(item?.fecha)}</p>
            </div>
          </div>

          {/* Extraer CUIT y N° op de observaciones */}
          {item?.observaciones && (
            <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-sky-500 mb-2">Datos del comprobante</p>
              <p className="text-xs text-sky-300 font-mono">{item.observaciones}</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">
              Nota de verificación <span className="text-slate-600">(opcional)</span>
            </label>
            <input type="text" value={nota} onChange={e => setNota(e.target.value)}
              placeholder="Ej: Verificado con comprobante MP #123456"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 focus:border-emerald-500 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={confirmar} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {loading
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Verificando…</>
              : <><HiShieldCheck className="w-4 h-4" /> Confirmar verificación</>
            }
          </button>
          <button onClick={onClose}
            className="px-4 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TransferenciasPanel() {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const userOficina = String(user?.perfil?.oficina?.id || user?.perfil?.oficina?.codigo || "");

  const hoy    = dayjs().format("YYYY-MM-DD");
  const hace30 = dayjs().subtract(30, "day").format("YYYY-MM-DD");

  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [count,     setCount]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [nextPage,  setNextPage]  = useState(null);
  const [prevPage,  setPrevPage]  = useState(null);

  // Filtros
  const [oficina,   setOficina]   = useState(isWebAdmin ? "ALL" : userOficina);
  const [desde,     setDesde]     = useState(hace30);
  const [hasta,     setHasta]     = useState(hoy);
  const [estado,    setEstado]    = useState("TODAS"); // TODAS | PENDIENTE | VERIFICADA
  const [qInput,    setQInput]    = useState("");
  const [q,         setQ]         = useState("");

  // Modal de verificación
  const [modalItem, setModalItem] = useState(null);

  const PAGE_SIZE = 50;

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const cargar = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: PAGE_SIZE };
      if (desde)  params.fecha__gte = desde;
      if (hasta)   params.fecha__lte = hasta;
      if (oficina && oficina !== "ALL") params.oficina = oficina;
      if (estado === "PENDIENTE")   params.verificada = "false";
      if (estado === "VERIFICADA")  params.verificada = "true";
      if (q) params.search = q;

      const res = await axios.get(`${BASE_URL}ingresos/transferencias/`, {
        params,
        headers: getHeaders(),
      });

      const data = res.data;
      setItems(Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []));
      setCount(data.count ?? (Array.isArray(data) ? data.length : 0));
      setNextPage(data.next ?? null);
      setPrevPage(data.previous ?? null);
    } catch (err) {
      toast.error("Error al cargar las transferencias");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, oficina, estado, q]);

  useEffect(() => { setPage(1); cargar(1); }, [desde, hasta, oficina, estado, q]);

  // ── Export state (debe declararse ANTES del useEffect que lo usa) ──
  const [exportFilter,   setExportFilter]   = useState("TODAS");
  const [exporting,      setExporting]      = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportDesde,    setExportDesde]    = useState(hace30);
  const [exportHasta,    setExportHasta]    = useState(hoy);

  // Cerrar menú de export al clickear fuera
  useEffect(() => {
    if (!showExportMenu) return;
    const fn = (e) => { if (!e.target.closest('[data-export-menu]')) setShowExportMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [showExportMenu]);

  // ── Export Excel ──────────────────────────────────────────────

  const handleExport = async (filtro) => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      // Traer TODOS los datos con el filtro elegido (sin paginación)
      const params = { page: 1, page_size: 9999 };
      if (exportDesde) params.fecha__gte = exportDesde;
      if (exportHasta) params.fecha__lte = exportHasta;
      if (oficina && oficina !== "ALL") params.oficina = oficina;
      if (filtro === "PENDIENTE")  params.verificada = "false";
      if (filtro === "VERIFICADA") params.verificada = "true";
      if (q) params.search = q;

      const res = await axios.get(`${BASE_URL}ingresos/transferencias/`, {
        params, headers: getHeaders(),
      });
      const data = Array.isArray(res.data.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);

      if (!data.length) { toast("No hay datos para exportar con ese filtro."); setExporting(false); return; }

      // ── Construir Excel con estilos ──────────────────────────
      const wb = XLSX.utils.book_new();

      // Colores
      const H_BG   = filtro === "VERIFICADA" ? "064E3B" : filtro === "PENDIENTE" ? "78350F" : "0F172A";
      const H_FG   = "FFFFFF";
      const ROW_V  = "F0FDF4"; // verde claro — verificada
      const ROW_P  = "FFFBEB"; // ámbar claro — pendiente
      const ROW_ALT= "F8FAFC"; // gris claro alternado

      const cellS = (opts = {}) => ({
        font:      { bold: opts.bold || false, color: { rgb: opts.fg || "1E293B" }, sz: opts.sz || 11, name: "Calibri" },
        fill:      opts.bg ? { patternType: "solid", fgColor: { rgb: opts.bg } } : undefined,
        alignment: { horizontal: opts.align || "left", vertical: "center", wrapText: opts.wrap || false },
        border: {
          top:    { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left:   { style: "thin", color: { rgb: "E2E8F0" } },
          right:  { style: "thin", color: { rgb: "E2E8F0" } },
        },
        numFmt: opts.numFmt || undefined,
      });

      // ── Hoja de resumen ──────────────────────────────────────
      const total    = data.reduce((s, i) => s + Number(i.monto || 0), 0);
      const verif    = data.filter(i => i.verificada).reduce((s, i) => s + Number(i.monto || 0), 0);
      const pend     = data.filter(i => !i.verificada).reduce((s, i) => s + Number(i.monto || 0), 0);
      const fmtAR    = (n) => `$ ${Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
      const hoyStr   = dayjs().format("DD/MM/YYYY HH:mm");

      const resumen = [
        ["REPORTE DE TRANSFERENCIAS", "", ""],
        [`Generado: ${hoyStr}`, "", ""],
        [`Filtro aplicado: ${filtro === "TODAS" ? "Todas" : filtro === "VERIFICADA" ? "Solo verificadas" : "Solo pendientes"}`, "", ""],
        [`Período: ${desde ? dayjs(desde).format("DD/MM/YYYY") : "—"} → ${hasta ? dayjs(hasta).format("DD/MM/YYYY") : "—"}`, "", ""],
        [],
        ["RESUMEN", "", ""],
        ["Total transferencias", fmtAR(total), data.length + " movimientos"],
        ["Total verificadas ✅", fmtAR(verif), data.filter(i => i.verificada).length + " verificadas"],
        ["Total pendientes ⏳", fmtAR(pend),  data.filter(i => !i.verificada).length + " pendientes"],
      ];

      const wsRes = XLSX.utils.aoa_to_sheet(resumen);
      wsRes["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 22 }];
      if (wsRes["A1"]) wsRes["A1"].s = cellS({ bold: true, fg: "7DD3FC", bg: "0F172A", sz: 14 });
      if (wsRes["A6"]) wsRes["A6"].s = cellS({ bold: true, fg: H_FG,    bg: H_BG,   sz: 12 });
      ["A7","A8","A9"].forEach(ref => { if (wsRes[ref]) wsRes[ref].s = cellS({ bold: true }); });
      XLSX.utils.book_append_sheet(wb, wsRes, "📊 Resumen");

      // ── Hoja de detalle ──────────────────────────────────────
      const headers = [
        "Fecha", "Hora", "Remitente", "CUIT/CUIL", "N° Operación",
        "Cuenta destino", "Oficina", "Descripción", "Monto",
        "Estado", "Verificada por", "Fecha verificación", "Nota verificación"
      ];

      const rows = data.map(i => {
        const obs    = i.observaciones || "";
        const cuitM  = obs.match(/CUIT:\s*([^\s|]+)/);
        const opM    = obs.match(/Op:\s*([^\s|]+)/);
        const cuit   = i.cuit_remitente || (cuitM ? cuitM[1] : "");
        const nroOp  = i.nro_operacion  || (opM   ? opM[1]   : "");
        return [
          i.fecha ? dayjs(i.fecha).format("DD/MM/YYYY") : "—",
          i.created_at ? dayjs(i.created_at).format("HH:mm") : "—",
          i.pagado_por  || "—",
          cuit          || "—",
          nroOp         || "—",
          i.billetera   || "—",
          i.oficina_nombre || "—",
          i.descripcion || "—",
          Number(i.monto || 0),
          i.verificada ? "✅ Verificada" : "⏳ Pendiente",
          i.verificada_por_nombre || "—",
          i.verificada_en ? dayjs(i.verificada_en).format("DD/MM/YYYY HH:mm") : "—",
          i.nota_verificacion || "—",
        ];
      });

      const wsDetalle = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Estilo header
      headers.forEach((_, ci) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c: ci });
        if (wsDetalle[ref]) wsDetalle[ref].s = cellS({ bold: true, fg: H_FG, bg: H_BG, align: "center" });
      });

      // Estilo filas con color según estado
      rows.forEach((row, ri) => {
        const isVerif = row[9] === "✅ Verificada";
        const rowBg   = isVerif ? ROW_V : ROW_P;
        headers.forEach((_, ci) => {
          const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
          if (wsDetalle[ref]) {
            wsDetalle[ref].s = cellS({
              bg: rowBg,
              align: ci === 8 ? "right" : "left",
            });
            if (ci === 8) wsDetalle[ref].s.numFmt = '"$"#,##0.00';
          }
        });
      });

      // Total al pie
      const totalRow = rows.length + 1;
      XLSX.utils.sheet_add_aoa(wsDetalle, [
        ["", "", "", "", "", "", "", "TOTAL", total, "", "", "", ""]
      ], { origin: totalRow });
      const tRef = XLSX.utils.encode_cell({ r: totalRow, c: 7 });
      const tVal = XLSX.utils.encode_cell({ r: totalRow, c: 8 });
      if (wsDetalle[tRef]) wsDetalle[tRef].s = cellS({ bold: true, fg: H_FG, bg: H_BG, align: "right" });
      if (wsDetalle[tVal]) { wsDetalle[tVal].s = cellS({ bold: true, fg: H_FG, bg: H_BG, align: "right" }); wsDetalle[tVal].s.numFmt = '"$"#,##0.00'; }

      wsDetalle["!cols"] = [
        { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
        { wch: 24 }, { wch: 16 }, { wch: 36 }, { wch: 16 },
        { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
      ];
      wsDetalle["!rows"] = [{ hpt: 20 }];
      XLSX.utils.book_append_sheet(wb, wsDetalle, "📋 Detalle");

      // ── Descargar ────────────────────────────────────────────
      const label    = filtro === "VERIFICADA" ? "Verificadas" : filtro === "PENDIENTE" ? "Pendientes" : "Todas";
      const dStr     = exportDesde ? dayjs(exportDesde).format("DDMM") : "inicio";
      const hStr     = exportHasta ? dayjs(exportHasta).format("DDMM") : "fin";
      const filename = `Transferencias_${label}_${dStr}-${hStr}_${dayjs().format("YYYYMMDDHHmm")}.xlsx`;
      const wbout   = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
      const blob    = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`✅ Descargado: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el Excel");
    } finally {
      setExporting(false);
    }
  };

  const desmarcar = async (item) => {
    try {
      const res = await axios.patch(
        `${BASE_URL}ingresos/${item.id}/verificar/`,
        { verificada: false },
        { headers: getHeaders() }
      );
      setItems(prev => prev.map(i => i.id === item.id ? res.data : i));
      toast.success("Verificación removida");
    } catch {
      toast.error("Error al desmarcar");
    }
  };

  const onVerificada = (updated) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  // KPIs
  const kpis = useMemo(() => {
    const total    = items.reduce((s, i) => s + Number(i.monto || 0), 0);
    const verif    = items.filter(i => i.verificada).reduce((s, i) => s + Number(i.monto || 0), 0);
    const pend     = items.filter(i => !i.verificada).reduce((s, i) => s + Number(i.monto || 0), 0);
    return { total, verif, pend, cantVerif: items.filter(i => i.verificada).length, cantPend: items.filter(i => !i.verificada).length };
  }, [items]);

  return (
    <div className="space-y-4">

      {/* Modal */}
      <AnimatePresence>
        {modalItem && (
          <VerificarModal
            item={modalItem}
            onClose={() => setModalItem(null)}
            onVerificada={onVerificada}
          />
        )}
      </AnimatePresence>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total transferencias", value: fmtMoney(kpis.total),    color: "text-sky-400",     icon: HiFilter },
          { label: "Verificadas",          value: fmtMoney(kpis.verif),    color: "text-emerald-400", icon: HiShieldCheck },
          { label: "Pendientes",           value: fmtMoney(kpis.pend),     color: "text-amber-400",   icon: HiClock },
          { label: "Sin verificar",        value: kpis.cantPend + " mov.", color: "text-amber-400",   icon: HiExclamationCircle },
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

      {/* ── Filtros ── */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 space-y-3">
        {/* Búsqueda */}
        <div className="flex items-center gap-2">
          <form onSubmit={e => { e.preventDefault(); setQ(qInput.trim()); }}
            className="flex-1 flex items-center gap-2 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <HiSearch className="w-4 h-4 text-slate-500 shrink-0" />
            <input value={qInput} onChange={e => setQInput(e.target.value)}
              placeholder="Buscar por remitente, CUIT o N° operación…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none" />
            {qInput && (
              <button type="button" onClick={() => { setQInput(""); setQ(""); }}
                className="text-slate-600 hover:text-slate-300 transition-colors">
                <HiX className="w-4 h-4" />
              </button>
            )}
          </form>
          <button onClick={() => setQ(qInput.trim())}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold transition-colors">
            Buscar
          </button>
          <button onClick={() => cargar(page)} title="Actualizar"
            className="p-2 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 text-slate-400 transition-colors">
            <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Botón de descarga con menú */}
          <div className="relative" data-export-menu>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              <HiDownload className={`w-4 h-4 ${exporting ? "animate-bounce" : ""}`} />
              {exporting ? "Descargando…" : "Descargar Excel"}
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0,  scale: 1 }}
                  exit={{    opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 z-50 w-72 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="px-4 pt-4 pb-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-slate-300 mb-3">Período a descargar</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Desde</label>
                        <input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Hasta</label>
                        <input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-sky-500 transition-colors" />
                      </div>
                    </div>
                    {/* Atajos rápidos */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        { label: "Hoy",         d: dayjs().format("YYYY-MM-DD"),                      h: dayjs().format("YYYY-MM-DD") },
                        { label: "Esta semana",  d: dayjs().startOf("week").format("YYYY-MM-DD"),      h: dayjs().format("YYYY-MM-DD") },
                        { label: "Este mes",     d: dayjs().startOf("month").format("YYYY-MM-DD"),     h: dayjs().endOf("month").format("YYYY-MM-DD") },
                        { label: "Mes anterior", d: dayjs().subtract(1,"month").startOf("month").format("YYYY-MM-DD"), h: dayjs().subtract(1,"month").endOf("month").format("YYYY-MM-DD") },
                        { label: "Últimos 30d",  d: dayjs().subtract(30,"day").format("YYYY-MM-DD"),  h: dayjs().format("YYYY-MM-DD") },
                        { label: "Últimos 90d",  d: dayjs().subtract(90,"day").format("YYYY-MM-DD"),  h: dayjs().format("YYYY-MM-DD") },
                      ].map(({ label, d, h }) => (
                        <button key={label} type="button"
                          onClick={() => { setExportDesde(d); setExportHasta(h); }}
                          className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">¿Qué incluir?</p>
                    {[
                      { label: "📋 Todas las transferencias",  value: "TODAS",      cls: "hover:bg-sky-900/40 text-slate-200" },
                      { label: "✅ Solo verificadas",          value: "VERIFICADA", cls: "hover:bg-emerald-900/40 text-emerald-300" },
                      { label: "⏳ Solo pendientes",          value: "PENDIENTE",  cls: "hover:bg-amber-900/40 text-amber-300" },
                    ].map(op => (
                      <button key={op.value} type="button"
                        onClick={() => handleExport(op.value)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${op.cls}`}>
                        {op.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filtros secundarios */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fechas */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
            <HiCalendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-32" />
            <span className="text-slate-600 text-xs">→</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-32" />
          </div>

          {/* Estado */}
          <div className="flex items-center gap-1 bg-slate-950/40 border border-slate-700/40 rounded-xl p-1">
            {["TODAS", "PENDIENTE", "VERIFICADA"].map(s => (
              <button key={s} type="button" onClick={() => setEstado(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  estado === s
                    ? s === "VERIFICADA" ? "bg-emerald-700 text-white"
                      : s === "PENDIENTE" ? "bg-amber-700 text-white"
                      : "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}>
                {s === "TODAS" ? "Todas" : s === "PENDIENTE" ? "⏳ Pendientes" : "✅ Verificadas"}
              </button>
            ))}
          </div>

          {/* Oficina (admin) */}
          {isWebAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
              <HiOfficeBuilding className="w-4 h-4 text-slate-500 shrink-0" />
              <select value={oficina} onChange={e => setOficina(e.target.value)}
                className="bg-transparent text-sm text-slate-300 outline-none">
                {OFICINAS.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
              </select>
            </div>
          )}

          <span className="ml-auto text-xs text-slate-500">
            {count > 0 ? `${count} transferencias` : ""}
          </span>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16 bg-slate-900/50 border border-slate-800/60 rounded-2xl">
            <span className="w-8 h-8 rounded-full border-2 border-primary-400/40 border-t-primary-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/50 border border-slate-800/60 rounded-2xl">
            <HiCheckCircle className="w-10 h-10 text-emerald-700/40 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay transferencias para los filtros aplicados.</p>
          </div>
        ) : (
          <>
            {/* Header columnas */}
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
              <div>Remitente</div>
              <div>Comprobante</div>
              <div>Cuenta destino</div>
              <div className="text-right">Monto</div>
              <div className="text-center w-32">Estado</div>
            </div>

            {/* Cards por fila */}
            <AnimatePresence>
              {items.map((item, idx) => {
                const obs    = item.observaciones || "";
                const cuitM  = obs.match(/CUIT:\s*([^\s|]+)/);
                const opM    = obs.match(/Op:\s*([^\s|]+)/);
                const cuit   = item.cuit_remitente || (cuitM ? cuitM[1] : "");
                const nroOp  = item.nro_operacion  || (opM   ? opM[1]   : "");
                const cuenta = item.billetera || "";

                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className={`bg-slate-900/60 border rounded-2xl overflow-hidden hover:bg-slate-800/50 transition-colors ${
                      item.verificada
                        ? "border-emerald-800/30 border-l-4 border-l-emerald-600"
                        : "border-amber-800/30 border-l-4 border-l-amber-600"
                    }`}>

                    {/* Fila principal */}
                    <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-4 px-4 py-3.5 items-center">

                      {/* Remitente */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                            {(item.pagado_por || "?")[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-100 truncate">{item.pagado_por || "—"}</span>
                        </div>
                        <div className="flex items-center gap-3 pl-9">
                          {cuit ? (
                            <span className="text-[11px] font-mono text-slate-400">🪪 {cuit}</span>
                          ) : (
                            <span className="text-[11px] text-slate-600 italic">Sin CUIT</span>
                          )}
                          {isWebAdmin && item.oficina_nombre && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-900/40 border border-indigo-800/40 text-indigo-400">
                              {item.oficina_nombre}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comprobante */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider w-6">Op</span>
                          {nroOp ? (
                            <span className="text-[12px] font-mono font-semibold text-sky-300 bg-sky-950/40 border border-sky-800/30 px-2 py-0.5 rounded-lg">
                              {nroOp}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-600 italic">Sin datos</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          📅 {fmtDate(item.fecha)}
                          {item.created_at && <span className="ml-1.5">⏰ {dayjs(item.created_at).format("HH:mm")} hs</span>}
                        </div>
                      </div>

                      {/* Cuenta destino */}
                      <div>
                        {cuenta ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">🏦</span>
                            <span className="text-[12px] font-mono text-emerald-300 truncate" title={cuenta}>
                              {cuenta}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Sin cuenta</span>
                        )}
                      </div>

                      {/* Monto */}
                      <div className="text-right">
                        <span className="text-base font-bold tabular-nums text-emerald-400">
                          {fmtMoney(item.monto)}
                        </span>
                      </div>

                      {/* Estado + acción */}
                      <div className="flex flex-col items-center gap-2 w-32">
                        <EstadoBadge verificada={item.verificada} />
                        {item.verificada ? (
                          <div className="text-center">
                            <div className="text-[10px] text-slate-500">{item.verificada_por_nombre}</div>
                            <div className="text-[10px] text-slate-600">{fmtDT(item.verificada_en)}</div>
                            <button type="button" onClick={() => desmarcar(item)}
                              className="text-[10px] text-slate-600 hover:text-rose-400 underline transition-colors">
                              Desmarcar
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setModalItem(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition-all shadow-sm hover:shadow-emerald-900/50">
                            <HiShieldCheck className="w-3.5 h-3.5" /> Verificar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Descripción al pie si existe */}
                    {item.descripcion && (
                      <div className="px-4 py-2 border-t border-slate-800/40 bg-slate-950/30">
                        <span className="text-[10px] text-slate-600">{item.descripcion}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages} · {count} resultados
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={!prevPage || loading}
                    onClick={() => { const p = page - 1; setPage(p); cargar(p); }}
                    className="p-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/60 disabled:opacity-30 text-slate-400 transition-colors">
                    <HiChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 font-mono min-w-[60px] text-center">{page} / {totalPages}</span>
                  <button disabled={!nextPage || loading}
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