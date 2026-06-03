/* src/components/balanzes/HistorialIngresosPanel.jsx
   Historial completo de INGRESOS de caja por oficina.
   Admin ve todas las oficinas. Empleado solo ve la suya.

   ✅ DESCARGAS:
   - EXCEL → generado en BACKEND con openpyxl. Tabla REAL de Excel
     (objeto Table, con flechitas de filtro/ordenamiento nativas en cada header).
   - PDF → generado en BACKEND con reportlab (header verde, total general).
   - Filename refleja los filtros (rango + oficina + medio + búsqueda).
   - Errores visibles por toast.
*/
import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  HiSearch, HiX, HiDownload, HiRefresh, HiChevronLeft, HiChevronRight,
  HiCash, HiCreditCard, HiOfficeBuilding, HiCalendar, HiFilter,
} from "react-icons/hi";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";


const FORMAS = [
  { value: "TODAS",         label: "Todas las formas" },
  { value: "EFECTIVO",      label: "💵 Efectivo" },
  { value: "TRANSFERENCIA", label: "🏦 Transferencia" },
  { value: "TARJETA",       label: "💳 Tarjeta" },
  { value: "MERCADOPAGO",   label: "📱 Mercado Pago" },
  { value: "OTRO",          label: "🔹 Otro" },
];

const fmtMoney = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => d ? dayjs(d).format("DD/MM/YYYY") : "—";

function FormaPagoBadge({ forma }) {
  const f = (forma || "EFECTIVO").toUpperCase();
  if (f === "EFECTIVO")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-400">💵 Efectivo</span>;
  if (f === "TRANSFERENCIA")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-900/40 border border-sky-700/50 text-sky-400">🏦 Transf.</span>;
  if (f === "TARJETA")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-900/40 border border-violet-700/50 text-violet-400">💳 Tarjeta</span>;
  if (f === "MERCADOPAGO")
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/40 border border-cyan-700/50 text-cyan-400">📱 MP</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">{f}</span>;
}

function OficinaLabel({ oficinaNombre }) {
  if (!oficinaNombre) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-900/30 border border-indigo-700/40 text-indigo-400">
      {oficinaNombre}
    </span>
  );
}

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


export default function HistorialIngresosPanel({ oficinasAdmin = [], oficinaProp }) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";
  const userOficina = String(user?.perfil?.oficina?.codigo || user?.perfil?.oficina?.id || "");

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

  // Estado de la lista
  const [items, setItems]   = useState([]);
  const [count, setCount]   = useState(0);
  const [next,  setNext]    = useState(null);
  const [prev,  setPrev]    = useState(null);
  const [loading, setLoading] = useState(false);

  // 🚀 Sucursal controlada desde la página (selector global de arriba).
  // Si el padre manda 'oficinaProp', este panel la obedece y oculta su propio selector.
  useEffect(() => {
    if (oficinaProp !== undefined && oficinaProp !== null && oficinaProp !== "") {
      setOficina(String(oficinaProp));
    }
  }, [oficinaProp]);

  // Oficinas (solo admin)
  useEffect(() => {
    if (!isWebAdmin) return;
    if (oficinasAdmin && oficinasAdmin.length > 0) {
      setOficinas(oficinasAdmin);
      return;
    }
    api.get("usuarios/oficinas/")
      .then(({ data }) => setOficinas(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => setOficinas([]));
  }, [isWebAdmin, oficinasAdmin]);

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
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const cargar = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get("ingresos/historial/", {
        params: {
          oficina: oficina !== "ALL" ? oficina : undefined,
          desde, hasta,
          forma_pago: formaPago !== "TODAS" ? formaPago : undefined,
          search: q || undefined,
          page: p,
          page_size: PAGE_SIZE,
        },
        timeout: 30_000,
      });
      const data = res?.data || {};
      const lista = Array.isArray(data.results) ? data.results
                  : Array.isArray(data) ? data : [];
      setItems(lista);
      setCount(typeof data.count === "number" ? data.count : lista.length);
      setNext(data.next || null);
      setPrev(data.previous || null);
    } catch (err) {
      console.error("[HistorialIngresosPanel] Error al cargar:", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("Tu sesión expiró. Volvé a iniciar sesión.");
      } else {
        toast.error("No se pudieron cargar los ingresos.");
      }
      setItems([]); setCount(0); setNext(null); setPrev(null);
    } finally {
      setLoading(false);
    }
  }, [oficina, desde, hasta, formaPago, q]);

  useEffect(() => { setPage(1); cargar(1); }, [oficina, desde, hasta, formaPago, q]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    setQ(qInput.trim()); setPage(1);
  };

  // ── Accesos rápidos de fecha (Hoy / Mes-Año) ──────────────────────
  const MESES_NOMBRES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const _anioBaseRapido = dayjs().year();
  const ANIOS_RAPIDOS = Array.from({ length: 6 }, (_, k) => _anioBaseRapido + 1 - k);
  const _fechaRef  = dayjs(desde).isValid() ? dayjs(desde) : dayjs();
  const mesActivo  = _fechaRef.month();
  const anioActivo = _fechaRef.year();
  const esHoyRapido = desde === hasta && desde === dayjs().format("YYYY-MM-DD");

  const aplicarHoy = () => {
    const h = dayjs().format("YYYY-MM-DD");
    setDesde(h); setHasta(h); setPage(1);
  };
  const aplicarMesAnio = (year, monthIdx) => {
    const base = dayjs().year(year).month(monthIdx);
    setDesde(base.startOf("month").format("YYYY-MM-DD"));
    setHasta(base.endOf("month").format("YYYY-MM-DD"));
    setPage(1);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    const fmtOut = exportFormat === "pdf" ? "pdf" : "xlsx";
    const toastId = toast.loading(
      fmtOut === "pdf" ? "Generando PDF…" : "Generando Excel…"
    );

    const oficinaLabel =
      oficina === "ALL" ? "" : (oficinasMap[String(oficina)] || String(oficina));

    try {
      const res = await api.get("ingresos/historial/", {
        params: {
          oficina: oficina !== "ALL" ? oficina : undefined,
          desde, hasta,
          forma_pago: formaPago !== "TODAS" ? formaPago : undefined,
          search: q || undefined,
          export: fmtOut,
        },
        responseType: "blob",
        timeout: 60_000,
      });

      const ct = String(res.headers?.["content-type"] || "").toLowerCase();
      const esArchivo =
        ct.includes("spreadsheet") || ct.includes("xlsx") ||
        ct.includes("pdf") || ct.includes("octet");
      if (!esArchivo) {
        const txt = await res.data.text();
        let detail = txt;
        try {
          const j = JSON.parse(txt);
          detail = j.detail || j.error || txt;
        } catch {}
        throw new Error(detail || "El servidor no devolvió un archivo.");
      }

      const suffix = buildFilenameSuffix({
        desde, hasta, oficinaLabel,
        formaPago: formaPago !== "TODAS" ? formaPago : "",
        q: q || "",
      });
      const ext = fmtOut === "pdf" ? "pdf" : "xlsx";
      const filename = `Historial_Ingresos_${suffix}.${ext}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      toast.dismiss(toastId);
      toast.success(`${fmtOut === "pdf" ? "PDF" : "Excel"} generado`, { duration: 3500 });
    } catch (err) {
      console.error("[HistorialIngresosPanel] Error al exportar:", err);
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
    const total      = items.reduce((s, i) => s + Number(i.monto || 0), 0);
    const efectivo   = items
      .filter(i => (i.forma_pago || "").toUpperCase() === "EFECTIVO")
      .reduce((s, i) => s + Number(i.monto || 0), 0);
    const transf     = items
      .filter(i => (i.forma_pago || "").toUpperCase() === "TRANSFERENCIA")
      .reduce((s, i) => s + Number(i.monto || 0), 0);
    return { total, efectivo, transf, cantidad: items.length };
  }, [items]);

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 space-y-3">

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <HiSearch className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por descripción, pagador, categoría, cuenta…"
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
        {/* ── Accesos rápidos: Hoy / Mes-Año ── */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={aplicarHoy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              esHoyRapido
                ? "bg-sky-600 border-sky-500 text-white"
                : "bg-slate-950/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <HiCalendar className="w-4 h-4" /> Hoy
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 shrink-0">Mes</span>
            <select
              value={mesActivo}
              onChange={(e) => aplicarMesAnio(anioActivo, Number(e.target.value))}
              className="bg-transparent text-sm text-slate-300 outline-none"
            >
              {MESES_NOMBRES.map((nombre, idx) => (
                <option key={idx} value={idx} className="bg-slate-900">{nombre}</option>
              ))}
            </select>
            <select
              value={anioActivo}
              onChange={(e) => aplicarMesAnio(Number(e.target.value), mesActivo)}
              className="bg-transparent text-sm text-slate-300 outline-none"
            >
              {ANIOS_RAPIDOS.map((y) => (
                <option key={y} value={y} className="bg-slate-900">{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
            <HiCalendar className="w-4 h-4 text-slate-500 shrink-0" />
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-32" />
            <span className="text-slate-600 text-xs">→</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-32" />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
            <HiCreditCard className="w-4 h-4 text-slate-500 shrink-0" />
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none">
              {FORMAS.map(f => <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>)}
            </select>
          </div>

          {isWebAdmin && oficinaProp === undefined && (
            <div className="flex items-center gap-1.5 bg-slate-950/40 border border-slate-700/40 rounded-xl px-3 py-2">
              <HiOfficeBuilding className="w-4 h-4 text-slate-500 shrink-0" />
              <select value={oficina} onChange={(e) => setOficina(e.target.value)}
                className="bg-transparent text-sm text-slate-300 outline-none">
                {oficinasOpciones.map(o => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
              </select>
            </div>
          )}

          <div className="ml-auto text-xs text-slate-500">
            {count > 0 ? `${count.toLocaleString("es-AR")} ingresos encontrados` : ""}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total período",      value: fmtMoney(kpis.total),    color: "text-emerald-400", icon: HiCash },
          { label: "Efectivo",           value: fmtMoney(kpis.efectivo), color: "text-emerald-300", icon: HiCash },
          { label: "Transferencia",      value: fmtMoney(kpis.transf),   color: "text-sky-400",     icon: HiCreditCard },
          { label: "Cantidad",           value: kpis.cantidad.toLocaleString("es-AR"), color: "text-slate-200", icon: HiFilter },
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
            <span className="w-8 h-8 rounded-full border-2 border-emerald-400/40 border-t-emerald-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Sin ingresos para los filtros aplicados.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={`grid gap-2 px-4 py-3 bg-slate-950/60 border-b border-slate-800/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold ${isWebAdmin ? "grid-cols-[0.8fr_1.6fr_1fr_0.8fr_1.2fr_1fr_0.8fr_0.8fr]" : "grid-cols-[0.8fr_1.6fr_1fr_0.8fr_1.2fr_1fr_0.8fr]"}`}>
              <div>Fecha</div>
              <div>Descripción</div>
              <div>Categoría</div>
              <div>Forma</div>
              <div>Pagado por / Cuenta</div>
              <div>Cta. destino</div>
              {isWebAdmin && <div>Oficina</div>}
              <div className="text-right">Monto</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800/40">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div key={item.id || idx}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`grid gap-2 px-4 py-3 hover:bg-slate-800/30 transition-colors text-sm ${isWebAdmin ? "grid-cols-[0.8fr_1.6fr_1fr_0.8fr_1.2fr_1fr_0.8fr_0.8fr]" : "grid-cols-[0.8fr_1.6fr_1fr_0.8fr_1.2fr_1fr_0.8fr]"}`}>

                    <div className="flex flex-col justify-center">
                      <span className="text-slate-300 font-medium">{fmtDate(item.fecha)}</span>
                    </div>

                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-slate-200 font-medium truncate" title={item.descripcion || "—"}>
                        {item.descripcion || "—"}
                      </span>
                    </div>

                    <div className="flex items-center min-w-0">
                      <span className="text-slate-400 text-[12px] truncate" title={item.categoria || "—"}>
                        {item.categoria || "—"}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <FormaPagoBadge forma={item.forma_pago} />
                    </div>

                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-slate-300 truncate text-[12px]" title={item.pagado_por || "—"}>
                        {item.pagado_por || "—"}
                      </span>
                      {item.cuit_remitente && (
                        <span className="text-[10px] text-slate-500">CUIT: {item.cuit_remitente}</span>
                      )}
                    </div>

                    <div className="flex items-center min-w-0">
                      {item.billetera ? (
                        <span className="text-xs font-bold text-indigo-300 truncate bg-indigo-950/40 border border-indigo-800/40 px-1.5 py-0.5 rounded-md" title={item.billetera}>
                          → {item.billetera}
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </div>

                    {isWebAdmin && (
                      <div className="flex items-center">
                        <OficinaLabel oficinaNombre={item.oficina_nombre} />
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/60 bg-slate-950/40">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages} · {count.toLocaleString("es-AR")} resultados
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={!prev || loading}
                    onClick={() => { const p = page - 1; setPage(p); cargar(p); }}
                    className="p-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800/60 disabled:opacity-30 text-slate-400 transition-colors">
                    <HiChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400 font-mono min-w-[60px] text-center">{page} / {totalPages}</span>
                  <button disabled={!next || loading}
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