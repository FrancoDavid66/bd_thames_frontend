// src/components/balanzes/MovimientosPanel.jsx  (diseño Duo)
//
// Tabla ÚNICA de movimientos (Ingresos + Egresos en una sola vista).
// Reemplaza a: HistorialIngresosPanel, HistorialEgresosPanel y (opcional) Transferencias.
//
// - Filtro por tipo: [Ambos] [Ingresos] [Egresos]
// - Filtros: oficina (admin), rango de fechas, forma de pago, búsqueda.
// - Descarga UN Excel general (o PDF) con todo lo filtrado. Si el tipo es "ambos",
//   el backend arma un Excel con 2 hojas (Ingresos y Egresos).
//
// Pega al endpoint del backend: GET  <API>ingresos/movimientos/
//   params: tipo, desde, hasta, oficina, forma_pago, search, page, export
//
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { toast } from "react-hot-toast";
import {
  HiChevronLeft,
  HiChevronRight,
  HiDownload,
  HiSearch,
  HiArrowUp,
  HiArrowDown,
  HiX,
} from "react-icons/hi";
dayjs.locale("es");

// ── Base de API (igual que el resto de la app) ──────────────────────
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const _authHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null"
    ? { Authorization: `Bearer ${token.trim()}` }
    : {};
};

const PAGE_SIZE = 50;

// 🚀 Sin decimales: $ 40.000 en vez de $ 40.000,00
const fmtMoney = (n) =>
  "$ " +
  Number(n || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtFecha = (f) => (f ? dayjs(f).format("DD/MM/YYYY") : "—");

// 🚀 NUEVO: hora local (HH:mm) del momento en que se registró el movimiento.
//    La hora vive en created_at (DateTimeField auto_now_add del backend), NO en
//    "fecha" (que es solo la fecha elegida por el usuario). Si el movimiento es
//    viejo y no tiene created_at, devolvemos "" y la tabla no muestra hora.
const fmtHora = (item) => {
  const ts = item?.created_at;
  if (!ts) return "";
  const d = dayjs(ts);
  return d.isValid() ? d.format("HH:mm") : "";
};

// 🚀 Descripción para mostrar: si el movimiento tiene PATENTE (viene del backend
//    en item.patente para los cobros de cuota), reemplazamos el "Póliza XXXX" de
//    la descripción por la patente. Ej:
//      "Pago cuota 3 - Póliza 12345"  →  "Pago cuota 3 - FDT601"
//    Si no hay patente (egresos, cargas manuales), se muestra la descripción tal cual.
// 🚀 Abrevia SOLO al mostrar: "Pago cuota 1 - ..." → "PC 1 - ...".
//    Es puramente visual: la descripción real guardada en la base NO cambia.
//    El ^ hace que solo reemplace cuando arranca con "Pago cuota" (no toca
//    egresos que casualmente tengan esas palabras en el medio del texto).
// Reemplaza "Pago cuota" (al principio del texto, con o sin espacios previos y
// en cualquier combinación de mayúsculas) por "PC". Es puramente visual.
const abreviarPagoCuota = (txt) => (txt || "").replace(/^\s*pago\s+cuota\b/i, "PC");

const descripcionConPatente = (item) => {
  const desc = item?.descripcion || "—";
  const patente = (item?.patente || "").toString().trim();
  if (!patente) return abreviarPagoCuota(desc);
  // Saca el fragmento "Póliza <numero>" (con o sin acento) y pone la patente.
  const sinPoliza = desc.replace(/P[oó]liza\s+\S+/i, patente);
  // Si la descripción no tenía "Póliza ...", agregamos la patente al final.
  const conPatente = sinPoliza === desc ? `${desc} · ${patente}` : sinPoliza;
  // Por último, abreviamos "Pago cuota" → "PC" (solo visual).
  return abreviarPagoCuota(conPatente);
};

// 🚀 Chip de color para la FORMA de pago (que se note más que texto gris).
const FormaBadge = ({ forma }) => {
  const f = String(forma || "").toUpperCase();
  if (!f) return <span className="text-suave dark:text-suave-dark">—</span>;
  const estilos = {
    EFECTIVO: "bg-ingreso/10 text-ingreso dark:text-ingreso-claro border-ingreso/30",
    TRANSFERENCIA: "bg-transferencia/10 text-transferencia dark:text-transferencia-claro border-transferencia/30",
    TARJETA: "bg-tarjeta/10 text-tarjeta dark:text-tarjeta-claro border-tarjeta/30",
    MERCADOPAGO: "bg-oficina/10 text-oficina dark:text-oficina-claro border-oficina/30",
    OTRO: "bg-suave/10 text-suave dark:text-suave-dark border-linea dark:border-linea-dark",
  };
  const label = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA: "Tarjeta",
    MERCADOPAGO: "Mercado Pago",
    OTRO: "Otro",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border-2 ${
        estilos[f] || "bg-suave/10 text-suave dark:text-suave-dark border-linea dark:border-linea-dark"
      }`}
    >
      {label[f] || f}
    </span>
  );
};

// Detecta si una fila es ingreso mirando el campo _tipo que agrega el backend.
const esIngreso = (item) =>
  String(item?._tipo || "").toUpperCase() === "INGRESO";

// Solo una flecha: verde arriba = ingreso, roja abajo = egreso (ahorra espacio).
const TipoBadge = ({ item }) => {
  const ing = esIngreso(item);
  return (
    <span
      title={ing ? "Ingreso" : "Egreso"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 ${
        ing
          ? "bg-ingreso/10 text-ingreso dark:text-ingreso-claro border-ingreso/30"
          : "bg-egreso/10 text-egreso dark:text-egreso-claro border-egreso/30"
      }`}
    >
      {ing ? (
        <HiArrowUp className="w-4 h-4" strokeWidth={2} />
      ) : (
        <HiArrowDown className="w-4 h-4" strokeWidth={2} />
      )}
    </span>
  );
};

// 🚀 Calcula el rango de fechas inicial a partir de la fecha del header y el modo.
//    - modo "mes": todo el mes de esa fecha (ej: 01/07 a 31/07).
//    - modo "dia": solo ese día (ej: 29/07 a 29/07).
//    Si no viene fecha, cae al mes actual (comportamiento anterior).
const rangoInicial = (fechaInicial, modoInicial) => {
  const base = fechaInicial ? dayjs(fechaInicial) : dayjs();
  if (!base.isValid()) {
    return {
      desde: dayjs().startOf("month").format("YYYY-MM-DD"),
      hasta: dayjs().endOf("month").format("YYYY-MM-DD"),
    };
  }
  if (modoInicial === "dia") {
    const d = base.format("YYYY-MM-DD");
    return { desde: d, hasta: d };
  }
  return {
    desde: base.startOf("month").format("YYYY-MM-DD"),
    hasta: base.endOf("month").format("YYYY-MM-DD"),
  };
};

// Estilo Duo compartido para inputs / selects de la barra de filtros.
const fieldCls =
  "bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-xs font-bold rounded-xl px-2.5 py-2 text-titulo dark:text-titulo-dark focus:outline-none focus:border-oficina transition-colors cursor-pointer dark:[color-scheme:dark]";
const labelCls =
  "text-suave dark:text-suave-dark text-[11px] font-black uppercase tracking-wide";

export default function MovimientosPanel({ oficinasAdmin = [], oficinaProp = "ALL", fechaInicial = "", modoInicial = "mes" }) {
  // ── Filtros ────────────────────────────────────────────────────────
  const [tipo, setTipo] = useState("ambos"); // ambos | ingresos | egresos
  const [oficina, setOficina] = useState(String(oficinaProp || "ALL"));
  // 🚀 Al montar (= al entrar a la pestaña Movimientos), la tabla arranca con
  //    la fecha/período que el usuario tiene elegido en el header.
  const [desde, setDesde] = useState(() => rangoInicial(fechaInicial, modoInicial).desde);
  const [hasta, setHasta] = useState(() => rangoInicial(fechaInicial, modoInicial).hasta);
  const [formaPago, setFormaPago] = useState("TODAS");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  // ── Datos / estado ─────────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState("xlsx"); // xlsx | pdf
  const [exporting, setExporting] = useState(false);

  const isAdmin = Array.isArray(oficinasAdmin) && oficinasAdmin.length > 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    if (oficinaProp !== undefined && oficinaProp !== null && oficinaProp !== "") {
      setOficina(String(oficinaProp));
    }
  }, [oficinaProp]);

  const oficinasOpciones = useMemo(
    () => [
      { value: "ALL", label: "Todas las sucursales" },
      ...oficinasAdmin.map((o) => ({ value: String(o.id), label: o.nombre })),
    ],
    [oficinasAdmin]
  );

  // ── Cargar movimientos ─────────────────────────────────────────────
  const cargar = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = { tipo, page: p, page_size: PAGE_SIZE };
        if (oficina && oficina !== "ALL") params.oficina = oficina;
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        if (formaPago && formaPago !== "TODAS") params.forma_pago = formaPago;
        if (q) params.search = q;

        const res = await axios.get(`${API_BASE}ingresos/movimientos/`, {
          params,
          headers: _authHeaders(),
        });

        const data = res?.data;
        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        setItems(results);
        setCount(Number(data?.count ?? results.length));
      } catch (err) {
        console.error("[MovimientosPanel] Error al cargar:", err);
        toast.error("No se pudieron cargar los movimientos.");
        setError("No se pudieron cargar los movimientos.");
        setItems([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    },
    [tipo, oficina, desde, hasta, formaPago, q]
  );

  // Recargar cuando cambian los filtros (vuelve a página 1)
  useEffect(() => {
    setPage(1);
    cargar(1);
  }, [tipo, oficina, desde, hasta, formaPago, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e?.preventDefault?.();
    setQ(qInput.trim());
  };

  // ── Limpiar filtros ────────────────────────────────────────────────
  // Resetea cada filtro a su valor inicial (incluye el período con el que
  // arrancó la tabla, según la fecha del header).
  const limpiarFiltros = () => {
    const r = rangoInicial(fechaInicial, modoInicial);
    setTipo("ambos");
    setOficina(String(oficinaProp || "ALL"));
    setDesde(r.desde);
    setHasta(r.hasta);
    setFormaPago("TODAS");
    setQInput("");
    setQ("");
  };

  // ── Descargar (Excel general o PDF) ────────────────────────────────
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading(
      exportFormat === "pdf" ? "Generando PDF…" : "Generando Excel…"
    );
    try {
      const params = { tipo, export: exportFormat };
      if (oficina && oficina !== "ALL") params.oficina = oficina;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;
      if (formaPago && formaPago !== "TODAS") params.forma_pago = formaPago;
      if (q) params.search = q;

      const res = await axios.get(`${API_BASE}ingresos/movimientos/`, {
        params,
        headers: _authHeaders(),
        responseType: "blob",
        timeout: 60_000,
      });

      // Si el backend mandó JSON de error camuflado en blob, lo detectamos.
      const ct = String(res.headers?.["content-type"] || "").toLowerCase();
      const esArchivo =
        ct.includes("spreadsheet") ||
        ct.includes("xlsx") ||
        ct.includes("pdf") ||
        ct.includes("octet");
      if (!esArchivo) {
        const txt = await res.data.text();
        let detail = txt;
        try {
          const j = JSON.parse(txt);
          detail = j.detail || j.error || txt;
        } catch {
          /* noop */
        }
        throw new Error(detail || "El servidor no devolvió un archivo.");
      }

      const ext = exportFormat === "pdf" ? "pdf" : "xlsx";
      const etiqueta =
        tipo === "ingresos" ? "Ingresos" : tipo === "egresos" ? "Egresos" : "Movimientos";
      const filename = `${etiqueta}_${dayjs().format("YYYY-MM-DD")}.${ext}`;

      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);

      toast.dismiss(toastId);
      toast.success(`${exportFormat === "pdf" ? "PDF" : "Excel"} generado`, {
        duration: 3500,
      });
    } catch (err) {
      console.error("[MovimientosPanel] Error al exportar:", err);
      toast.dismiss(toastId);
      const st = err?.response?.status;
      if (st === 401 || st === 403) toast.error("Tu sesión expiró. Volvé a iniciar sesión.");
      else if (st === 404) toast.error("Endpoint no encontrado. Avisale al admin.");
      else toast.error(err?.message || "Error al generar el archivo.");
    } finally {
      setExporting(false);
    }
  };

  // ── Botones de tipo (pill Duo) ─────────────────────────────────────
  const TipoBtn = ({ id, label }) => (
    <button
      type="button"
      onClick={() => setTipo(id)}
      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 ${
        tipo === id
          ? "bg-oficina text-white border-oficina shadow-[0_3px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5"
          : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark hover:text-titulo dark:hover:text-titulo-dark"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-end gap-2 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-3">
        {/* Tipo */}
        <div className="flex gap-1.5">
          <TipoBtn id="ambos" label="Ambos" />
          <TipoBtn id="ingresos" label="Ingresos" />
          <TipoBtn id="egresos" label="Egresos" />
        </div>

        {/* Oficina (solo admin) */}
        {isAdmin && (
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Sucursal</label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className={fieldCls}
            >
              {oficinasOpciones.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fechas — labels visibles "Desde" / "Hasta" */}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={fieldCls}
            title="Desde"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={fieldCls}
            title="Hasta"
          />
        </div>

        {/* Forma de pago */}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Forma de pago</label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className={fieldCls}
          >
            <option value="TODAS">Todas las formas</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="MERCADOPAGO">Mercado Pago</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        {/* Búsqueda */}
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Buscar</label>
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <input
              type="text"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar…"
              className="bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark text-xs font-bold rounded-xl px-2.5 py-2 text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark focus:outline-none focus:border-oficina transition-colors w-32"
            />
            {qInput && (
              <button
                type="button"
                onClick={() => {
                  setQInput("");
                  setQ("");
                }}
                className="p-2 rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark hover:border-egreso hover:text-egreso transition-colors"
                title="Limpiar búsqueda"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="p-2 rounded-xl border-2 border-linea dark:border-linea-dark hover:bg-oficina/10 hover:border-oficina text-suave dark:text-suave-dark hover:text-oficina transition-colors"
              title="Buscar"
            >
              <HiSearch className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Limpiar filtros */}
        <div className="flex flex-col gap-1">
          <label className={`${labelCls} invisible`}>Acciones</label>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="px-3 py-2 rounded-xl text-xs font-black transition-colors border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:bg-egreso/10 hover:border-egreso hover:text-egreso"
          >
            Limpiar filtros
          </button>
        </div>

        {/* Descarga */}
        <div className="flex items-center gap-1.5 ml-auto self-end">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className={fieldCls}
          >
            <option value="xlsx">Excel</option>
            <option value="pdf">PDF</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-oficina text-white text-xs font-black transition-all border-2 border-oficina shadow-[0_4px_0_var(--color-oficina-fuerte)] active:shadow-[0_0_0_var(--color-oficina-fuerte)] active:translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
          >
            <HiDownload className="w-4 h-4" />
            Descargar
          </button>
        </div>
      </div>

      {/* Contador de resultados — SIEMPRE visible */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-suave dark:text-suave-dark">
          {loading
            ? "Cargando…"
            : `${count} ${count === 1 ? "movimiento" : "movimientos"}`}
        </span>
      </div>

      {/* Tabla */}
      <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-suave dark:text-suave-dark border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                <th className="text-center px-2 py-2.5 font-black uppercase tracking-wide w-10">Tipo</th>
                <th className="text-left px-3 py-2.5 font-black uppercase tracking-wide">Fecha</th>
                <th className="text-left px-3 py-2.5 font-black uppercase tracking-wide">Descripción</th>
                <th className="text-left px-3 py-2.5 font-black uppercase tracking-wide">Categoría</th>
                <th className="text-center px-3 py-2.5 font-black uppercase tracking-wide text-titulo dark:text-titulo-dark">Forma</th>
                <th className="text-center px-3 py-2.5 font-black uppercase tracking-wide text-titulo dark:text-titulo-dark">Oficina</th>
                <th className="text-right px-3 py-2.5 font-black uppercase tracking-wide">Monto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 font-bold text-suave dark:text-suave-dark">
                    Cargando…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-egreso font-bold">{error}</span>
                      <button
                        type="button"
                        onClick={() => cargar(page)}
                        className="border-2 border-linea dark:border-linea-dark hover:bg-oficina/10 hover:border-oficina text-suave dark:text-suave-dark hover:text-oficina rounded-xl px-3 py-1.5 font-black transition-colors"
                      >
                        Reintentar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 font-bold text-suave dark:text-suave-dark">
                    No hay movimientos con estos filtros.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const ing = esIngreso(item);
                  const hora = fmtHora(item);
                  return (
                    <tr
                      key={`${item._tipo}-${item.id}`}
                      className="border-b-2 border-linea/50 dark:border-linea-dark/50 hover:bg-oficina/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-2 py-2 text-center">
                        <TipoBadge item={item} />
                      </td>
                      {/* 🚀 FECHA + HORA en la misma columna: fecha arriba, hora chiquita abajo */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-bold text-suave dark:text-suave-dark leading-tight">
                          {fmtFecha(item.fecha)}
                        </div>
                        {hora && (
                          <div className="text-[10px] font-black text-suave/70 dark:text-suave-dark/70 tabular-nums leading-tight">
                            {hora} hs
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-bold text-titulo dark:text-titulo-dark">{descripcionConPatente(item)}</td>
                      <td className="px-3 py-2 font-bold text-suave dark:text-suave-dark">{item.categoria || "—"}</td>
                      {/* 🚀 FORMA resaltada con chip de color */}
                      <td className="px-3 py-2 text-center">
                        <FormaBadge forma={item.forma_pago} />
                      </td>
                      {/* 🚀 OFICINA resaltada con chip */}
                      <td className="px-3 py-2 text-center">
                        {item.oficina_nombre ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-oficina/30 bg-oficina/10 text-oficina dark:text-oficina-claro text-[11px] font-black whitespace-nowrap">
                            {item.oficina_nombre}
                          </span>
                        ) : (
                          <span className="text-suave dark:text-suave-dark">—</span>
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-black whitespace-nowrap text-base sm:text-lg tracking-tight ${
                          ing
                            ? "text-ingreso dark:text-ingreso-claro"
                            : "text-egreso dark:text-egreso-claro"
                        }`}
                      >
                        {ing ? "+" : "−"} {fmtMoney(item.monto)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-surface dark:bg-surface-dark border-t-2 border-linea dark:border-linea-dark">
            <span className="text-xs font-bold text-suave dark:text-suave-dark">
              Página {page} de {totalPages} · {count} resultados
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  cargar(p);
                }}
                className="p-1.5 rounded-xl border-2 border-linea dark:border-linea-dark hover:bg-oficina/10 hover:border-oficina disabled:opacity-30 text-suave dark:text-suave-dark transition-colors"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-black text-titulo dark:text-titulo-dark min-w-[60px] text-center">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  cargar(p);
                }}
                className="p-1.5 rounded-xl border-2 border-linea dark:border-linea-dark hover:bg-oficina/10 hover:border-oficina disabled:opacity-30 text-suave dark:text-suave-dark transition-colors"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}