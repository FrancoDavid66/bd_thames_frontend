/* src/components/balanzes/HistorialPagosPanel.jsx
   Historial completo de ingresos (cobros de cuotas) por oficina.
   Admin ve todas las oficinas. Empleado solo ve la suya.
*/
import { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import {
  HiSearch, HiX, HiDownload, HiRefresh, HiChevronLeft, HiChevronRight,
  HiCash, HiCreditCard, HiOfficeBuilding, HiCalendar, HiFilter,
} from "react-icons/hi";
import { fetchHistorialPagos, downloadHistorialPagosCSV, downloadHistorialPagosPDF } from "../../store/slices/pagosSlice";
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

export default function HistorialPagosPanel({ oficinasAdmin = [] }) {
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
  const [exportFormat, setExportFormat] = useState("excel"); // "excel" | "pdf"
  const [oficinas,    setOficinas]    = useState([]);

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

  // Redux state
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

  const handleExport = async () => {
    setExporting(true);
    try {
      await dispatch(exportHistorialExcel({ oficina, desde, hasta, forma_pago: formaPago, q })).unwrap();
    } catch {
      // toast ya lo maneja el thunk
    } finally {
      setExporting(false);
    }
  };

  // KPIs del período visible
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
              <HiDownload className="w-4 h-4" />
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
          {isWebAdmin && (
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
            <div className={`grid gap-2 px-4 py-3 bg-slate-950/60 border-b border-slate-800/60 text-[10px] uppercase tracking-wider text-slate-500 font-semibold ${isWebAdmin ? "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_0.9fr_0.7fr_0.7fr]" : "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_0.9fr_0.7fr]"}`}>
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
                    className={`grid gap-2 px-4 py-3 hover:bg-slate-800/30 transition-colors text-sm ${isWebAdmin ? "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_0.9fr_0.7fr_0.7fr]" : "grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr_0.7fr_0.9fr_0.7fr]"}`}>

                    {/* Fecha */}
                    <div className="flex flex-col justify-center">
                      <span className="text-slate-300 font-medium">{fmtDate(item.fecha_pago || item.fecha)}</span>
                      {item.pago_hm && <span className="text-[10px] text-slate-600">{item.pago_hm} hs</span>}
                    </div>

                    {/* Asegurado */}
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="text-slate-200 font-medium truncate" title={item.cliente_nombre || "—"}>
                        {item.cliente_nombre || "—"}
                      </span>
                      {item.cliente_dni && <span className="text-[10px] text-slate-500">DNI: {item.cliente_dni}</span>}
                    </div>

                    {/* Patente */}
                    <div className="flex items-center">
                      {item.patente
                        ? <span className="font-mono text-[11px] font-bold bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg text-slate-200 tracking-widest uppercase">{item.patente}</span>
                        : <span className="text-slate-600">—</span>}
                    </div>

                    {/* Modelo */}
                    <div className="flex items-center min-w-0">
                      <span className="text-slate-300 truncate text-[12px]">
                        {[item.marca, item.modelo].filter(Boolean).join(" ") || "—"}
                      </span>
                    </div>

                    {/* Forma pago */}
                    <div className="flex items-center">
                      <FormaPagoBadge forma={item.forma_pago} />
                    </div>

                    {/* Enviado por / Cuenta destino */}
                    <div className="flex flex-col justify-center min-w-0">
                      {(() => {
                        const obs = item.observaciones || "";
                        const cuitM = obs.match(/CUIT:\s*([^\s|]+)/);
                        const opM   = obs.match(/Op:\s*([^\s|]+)/);
                        const cuit  = cuitM ? cuitM[1] : "";
                        const op    = opM   ? opM[1]   : "";
                        const medio = item.medio || "";
                        return (
                          <>
                            {item.pagado_por && <span className="text-[11px] text-slate-300 truncate">{item.pagado_por}</span>}
                            {medio && <span className="text-[10px] text-indigo-400 truncate">{medio}</span>}
                            {cuit  && <span className="text-[10px] text-slate-500">CUIT: {cuit}</span>}
                            {op    && <span className="text-[10px] text-slate-500">Op: {op}</span>}
                            {!item.pagado_por && !medio && !cuit && <span className="text-slate-600">—</span>}
                          </>
                        );
                      })()}
                    </div>

                    {/* Oficina (admin only) */}
                    {isWebAdmin && (
                      <div className="flex items-center">
                        <OficinaLabel oficinasMap={oficinasMap} oficina={item.oficina_bucket || item.oficina} />
                      </div>
                    )}

                    {/* Monto */}
                    <div className="flex items-center justify-end">
                      <span className="font-bold tabular-nums text-emerald-400">{fmtMoney(item.monto)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Paginación */}
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