// src/pages/CuponerasPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  HiRefresh, HiExclamation, HiBadgeCheck,
  HiSearch, HiChevronLeft, HiChevronRight, HiChatAlt2,
  HiCurrencyDollar, HiX, HiPhotograph,
  HiFilter, HiExclamationCircle,
} from "react-icons/hi";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useDispatch } from "react-redux";
import { actualizarEstadoCuponRobo } from "../store/slices/cuponesRoboSlice";
import { uploadToCloudinary } from "../utils/cloudinary";
import toast from "react-hot-toast";

/* ─── http ─────────────────────────────────────────────────── */
const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;
const http = axios.create({ baseURL: BASE, withCredentials: true });
http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  if (token && token !== "undefined" && token !== "null")
    config.headers.Authorization = `Bearer ${token.trim()}`;
  return config;
});

/* ─── helpers ──────────────────────────────────────────────── */
const MONEY = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt     = (n) => `$ ${MONEY.format(Number(n || 0))}`;
const fmtDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");

const fmtPeriodo = (c) => {
  if (!c?.periodo_desde) return "—";
  const d = dayjs(c.periodo_desde);
  const h = dayjs(c.periodo_hasta || c.periodo_desde);
  return d.month() === h.month() && d.year() === h.year()
    ? d.format("MM/YYYY")
    : `${d.format("MM/YYYY")} – ${h.format("MM/YYYY")}`;
};

function getVisual(c) {
  const _est = (c?.estado || "").toUpperCase();
  if (_est === "PAGADA") return "PAGADA";
  if (_est === "REPORTADO") return "REPORTADO";
  const hoy = dayjs().startOf("day");
  if (!c?.fecha_vencimiento) return "AL_DIA";
  const vto  = dayjs(c.fecha_vencimiento);
  if (!vto.isValid()) return "PENDIENTE";
  const diff = vto.diff(hoy, "day");
  if (diff < 0)  return "VENCIDA";
  if (diff <= 7) return "POR_VENCER";
  return "AL_DIA";
}

function getDiasRestantes(c) {
  if (!c?.fecha_vencimiento) return null;
  return dayjs(c.fecha_vencimiento).diff(dayjs().startOf("day"), "day");
}

function digitsOnly(v) { return String(v || "").replace(/\D+/g, ""); }

function normalizePhoneAR(raw) {
  let d = digitsOnly(raw);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0"))  d = d.slice(1);
  d = d.replace(/^(\d{2,4})15/, "$1");
  return `54${d}`;
}

function resolvePhone(c) {
  const e164 = String(c?.asegurado_telefono_e164 || "").trim();
  if (e164.startsWith("+")) { const w = digitsOnly(e164); if (w) return w; }
  for (const v of [c?.asegurado_telefono, c?.cliente_telefono, c?.telefono, c?.whatsapp, c?.celular]) {
    const n = normalizePhoneAR(v); if (n) return n;
  }
  return "";
}

function buildWaUrl(phone, c) {
  const nombre  = (c?.asegurado_nombre || "").trim() || "¿Cómo estás?";
  const vto     = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento) : null;
  const dias    = vto ? vto.diff(dayjs().startOf("day"), "day") : null;
  const vtoStr  = vto ? vto.format("DD/MM/YYYY") : "—";
  const vehiculo = [c?.poliza_modelo, c?.poliza_patente].filter(Boolean).join(" · ");
  const extra    = vehiculo ? `\n${vehiculo}` : "";
  let msg;
  if (dias !== null && dias < 0)
    msg = `Hola ${nombre} 👋\nTu cuota venció el ${vtoStr}.${extra}\n¿Te paso medios de pago para dejarla al día hoy?`;
  else if (dias !== null && dias <= 7)
    msg = `Hola ${nombre} 👋\nTu cuota vence el ${vtoStr}.${extra}\n¿Querés que te pase los medios de pago?`;
  else
    msg = `Hola ${nombre} 👋\nRecordatorio: tu cuota vence el ${vtoStr}.${extra}\nCuando quieras te paso los medios de pago.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function buildPages(current, total) {
  if (total <= 1) return [1];
  const pages = [1];
  const start = clamp(current - 2, 2, Math.max(2, total - 1));
  const end   = clamp(current + 2, 2, Math.max(2, total - 1));
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages.filter((v, i) => pages.indexOf(v) === i);
}

/* ─── badge config ─────────────────────────────────────────── */
const BADGE = {
  PAGADA:     { cls: "bg-emerald-950/50 text-emerald-400 border-emerald-800", label: "Pagada"     },
  REPORTADO:  { cls: "bg-sky-950/50 text-sky-400 border-sky-800",             label: "Reportado"  },
  AL_DIA:     { cls: "bg-slate-800 text-slate-400 border-slate-700",          label: "Al día"     },
  POR_VENCER: { cls: "bg-amber-950/50 text-amber-400 border-amber-800",       label: "Por vencer" },
  PENDIENTE:  { cls: "bg-slate-800 text-slate-400 border-slate-700",          label: "Pendiente"  },
  VENCIDA:    { cls: "bg-rose-950/50 text-rose-400 border-rose-800",          label: "Vencida"    },
};

/* ─── UrgencyCard ──────────────────────────────────────────── */
function UrgencyCard({ cupon, onPagar }) {
  const visual        = getVisual(cupon);
  const dias          = getDiasRestantes(cupon);
  const phone         = resolvePhone(cupon);
  const isVencida     = visual === "VENCIDA";
  const oficinaNombre = cupon?.poliza_oficina_nombre || null;

  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-3 ${
      isVencida
        ? "border-rose-900/60 bg-rose-950/20"
        : "border-amber-900/40 bg-amber-950/10"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-100 truncate">
              {cupon.asegurado_nombre || "Sin nombre"}
            </p>
            {/* Badge de oficina: solo visible cuando el backend lo incluye (rol admin) */}
            {oficinaNombre && (
              <span className="text-[10px] font-mono border border-slate-700 text-slate-500 rounded px-1.5 py-0.5 shrink-0">
                {oficinaNombre}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {cupon.poliza_patente || "—"} · {cupon.poliza_compania || "—"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {dias !== null && (
            <span className={`text-xs font-mono font-semibold ${
              isVencida ? "text-rose-400" : "text-amber-400"
            }`}>
              {isVencida ? `${Math.abs(dias)}d vencida` : `vence en ${dias}d`}
            </span>
          )}
          <p className="text-[10px] text-slate-600 mt-0.5">
            {fmtDate(cupon.fecha_vencimiento)}
          </p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPagar(cupon)}
          className={`flex-1 h-9 rounded-lg border text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
            isVencida
              ? "bg-rose-900/40 hover:bg-rose-800/50 border-rose-800 text-rose-300"
              : "bg-amber-900/30 hover:bg-amber-800/40 border-amber-800 text-amber-300"
          }`}
        >
          <HiCurrencyDollar className="w-4 h-4" />
          Registrar pago
        </button>
        {phone && (
          <a
            href={buildWaUrl(phone, cupon)}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors inline-flex items-center gap-1.5"
          >
            <HiChatAlt2 className="w-4 h-4" />
            WPP
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── PagoModal (confirmar pago — el cliente paga directo) ─── */
function PagoModal({ cupon, onClose, onConfirm, procesando }) {
  const monto = cupon?.monto ? Number(cupon.monto) : 0;
  const fmtM = (v) =>
    "$" + Number(v || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const reportado = (cupon?.estado || "").toUpperCase() === "REPORTADO";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Confirmar pago</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono flex items-center gap-1.5 flex-wrap">
              {cupon?.asegurado_nombre} · {cupon?.poliza_patente}
              {cupon?.poliza_oficina_nombre && (
                <span className="border border-slate-700 rounded px-1.5 text-slate-600">
                  {cupon.poliza_oficina_nombre}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={procesando}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {reportado && (
            <div className="rounded-lg border border-sky-800 bg-sky-950/30 px-4 py-2.5 text-xs text-sky-300">
              El cliente avisó que ya pagó este cupón.
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 flex justify-between items-center">
            <span className="text-slate-500 text-sm">Importe del cupón</span>
            <span className="font-mono font-semibold text-slate-100 text-lg">{fmtM(monto)}</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Confirmá solo cuando hayas verificado el pago con la compañía. Tu comisión se registra
            automáticamente como ingreso.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={procesando}
              className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm()}
              disabled={procesando}
              className="h-9 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {procesando ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
                  Guardando...
                </>
              ) : (
                <>Confirmar pago</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CuponerasPage ────────────────────────────────────────── */
export default function CuponerasPage() {
  const dispatch = useDispatch();

  const [cupones, setCupones]   = useState([]);
  const [count, setCount]       = useState(0);
  const [counters, setCounters] = useState({ total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0, reportados: 0 });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const [search, setSearch]     = useState("");
  const [compania, setCompania] = useState("");
  const [companiasOpciones, setCompaniasOpciones] = useState([]);
  const [scope, setScope]       = useState("ALL");
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [pagoModal, setPagoModal]           = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);

  // 🆕 Tarjetas colapsables (toggle por póliza)
  const [abiertas, setAbiertas] = useState({});
  const toggleCard = (id) => setAbiertas((p) => ({ ...p, [id]: !p[id] }));

  /* cargar opciones de compañías */
  useEffect(() => {
    http.get("polizas/companias/").then((res) => {
      if (Array.isArray(res.data)) {
        const mapped = res.data
          .map((d) => (typeof d === "string" ? d : d?.nombre || d?.id || ""))
          .filter(Boolean);
        setCompaniasOpciones([...new Set(mapped)]);
      }
    }).catch(() => {});
  }, []);

  /* cargar dashboard */
  const loadDashboard = async (term = "", cmp = "", opts = {}) => {
    const { page: p = page, pageSize: ps = pageSize, scope: sc = scope } = opts;
    setLoading(true);
    setError("");
    try {
      // 🆕 Vista por tarjetas: traemos TODOS los cupones (no solo el último)
      // y agrupamos por póliza en el front. El scope se filtra del lado del cliente.
      const params = { solo_ultimo: 0, page: 1, page_size: 500 };
      if (term.trim())         params.search   = term.trim();
      if (cmp.trim())          params.compania = cmp.trim();
      const res  = await http.get("polizas/cupones-robo/dashboard/", { params });
      const data = res.data || {};
      setCounters(data.counters_global || { total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0 });
      setCount(Number(data.count || 0));
      setCupones(Array.isArray(data.results) ? data.results : []);
      setLastLoadedAt(new Date().toISOString());
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "No se pudieron cargar las cuponeras.";
      setError(msg);
      toast.error(msg);
      setCupones([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  /* debounce search / compania */
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      loadDashboard(search, compania, { page: 1, pageSize, scope });
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, compania]);

  /* page / pageSize (el scope ya NO recarga: filtra local) */
  useEffect(() => {
    loadDashboard(search, compania, { page, pageSize, scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const refreshAll = () => loadDashboard(search, compania, { page, pageSize, scope });

  /* urgentes — derivados del listado actual */
  const urgentes = useMemo(() => {
    return cupones
      .filter((c) => { const v = getVisual(c); return v === "VENCIDA" || v === "POR_VENCER"; })
      .sort((a, b) => (getDiasRestantes(a) ?? 999) - (getDiasRestantes(b) ?? 999));
  }, [cupones]);

  const vencidasCount  = useMemo(() => cupones.filter((c) => getVisual(c) === "VENCIDA").length,    [cupones]);
  const porVencerCount = useMemo(() => cupones.filter((c) => getVisual(c) === "POR_VENCER").length, [cupones]);

  /* 🆕 Agrupar cupones por póliza para mostrarlos en tarjetas */
  const polizasAgrupadas = useMemo(() => {
    const map = new Map();
    for (const c of cupones) {
      const key = c.poliza ?? `s/p-${c.id}`;
      if (!map.has(key)) {
        map.set(key, {
          polizaId:  c.poliza,
          numero:    c.poliza_numero,
          patente:   c.poliza_patente || "—",
          asegurado: c.asegurado_nombre || "—",
          compania:  c.poliza_compania || "",
          oficina:   c.poliza_oficina_nombre || "",
          vehiculo:  c.poliza_modelo || "Vehículo",
          cupones:   [],
        });
      }
      map.get(key).cupones.push(c);
    }
    let grupos = Array.from(map.values());
    grupos.forEach((g) =>
      g.cupones.sort((a, b) =>
        String(a.fecha_vencimiento || "").localeCompare(String(b.fecha_vencimiento || ""))
      )
    );
    const SCOPE_VISUAL = { PENDIENTE: "PENDIENTE", VENCIDA: "VENCIDA", POR_VENCER_7: "POR_VENCER", REPORTADO: "REPORTADO" };
    if (scope && scope !== "ALL") {
      const v = SCOPE_VISUAL[scope];
      grupos = grupos.filter((g) => g.cupones.some((c) => getVisual(c) === v));
    }
    return grupos;
  }, [cupones, scope]);

  /* paginación */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / (pageSize || 25))), [count, pageSize]);
  const pages      = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  /* confirmar pago — el cliente paga directo; solo marcamos PAGADA.
     El backend calcula y registra nuestra comisión como ingreso. */
  const handleConfirmPago = async () => {
    if (!pagoModal) return;
    setProcesandoPago(true);
    try {
      await dispatch(
        actualizarEstadoCuponRobo({
          id:       pagoModal.id,
          polizaId: pagoModal.poliza,
          estado:   "PAGADA",
        })
      ).unwrap();
      toast.success("Pago confirmado.");
      setPagoModal(null);
      refreshAll();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo confirmar el pago. Intentá de nuevo.");
    } finally {
      setProcesandoPago(false);
    }
  };

  /* chips de filtros activos */
  const activeFilters = [
    scope !== "ALL" && {
      label: { PENDIENTE: "Pendientes", POR_VENCER_7: "Por vencer", VENCIDA: "Vencidas" }[scope] || scope,
      onRemove: () => { setScope("ALL"); setPage(1); },
    },
    search.trim()   && { label: `"${search}"`,  onRemove: () => setSearch("") },
    compania.trim() && { label: compania,        onRemove: () => setCompania("") },
  ].filter(Boolean);

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 tracking-tight">
            Cuponeras de robo
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestión de cupones por vencer y vencidos
            {lastLoadedAt && (
              <span className="ml-2 text-slate-600">
                · {dayjs(lastLoadedAt).format("HH:mm")}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
        >
          <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Total global",    value: counters.total,        sc: "ALL",           color: "text-slate-200" },
          { label: "Reportados",      value: counters.reportados,   sc: "REPORTADO",     color: "text-sky-400"   },
          { label: "Pendientes",      value: counters.pendientes,   sc: "PENDIENTE",     color: "text-slate-200" },
          { label: "Por vencer (7d)", value: counters.por_vencer_7, sc: "POR_VENCER_7",  color: "text-amber-400" },
          { label: "Vencidas",        value: counters.vencidas,     sc: "VENCIDA",       color: "text-rose-400"  },
        ].map(({ label, value, sc, color }) => (
          <button
            key={sc}
            type="button"
            onClick={() => { setScope(sc); setPage(1); }}
            className={`text-left rounded-lg border p-3 transition-colors ${
              scope === sc
                ? "border-slate-600 bg-slate-800"
                : "border-slate-800 bg-slate-900 hover:bg-slate-800/60"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`text-2xl font-mono font-semibold mt-1 ${color}`}>{value}</p>
          </button>
        ))}
      </div>

      {/* ── Zona urgencias ──────────────────────────────────── */}
      {/* ── Tabla ───────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3 border-b border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Póliza, patente, asegurado..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <select
            value={compania}
            onChange={(e) => setCompania(e.target.value)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-300 px-3 focus:outline-none focus:border-slate-500 transition-colors"
          >
            <option value="">Todas las compañías</option>
            {companiasOpciones.map((c, i) => (
              <option key={`${c}-${i}`} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-slate-600">Por página</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-9 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 px-2 focus:outline-none"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Chips de filtros activos */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-slate-800">
            <HiFilter className="w-3.5 h-3.5 text-slate-500" />
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 h-6 px-2 rounded border border-slate-700 bg-slate-800 text-xs text-slate-300">
                {f.label}
                <button onClick={f.onRemove} className="text-slate-500 hover:text-slate-200 transition-colors">
                  <HiX className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <span className="text-xs text-slate-500">{count} resultado{count !== 1 ? "s" : ""}</span>
          {loading && (
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-slate-500 border-t-transparent animate-spin" />
              Cargando...
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-rose-900/50 bg-rose-950/20 text-rose-400 text-sm">
            <HiExclamation className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* 🆕 Tarjetas por póliza (colapsables) */}
        {!loading && polizasAgrupadas.length === 0 && (
          <div className="px-4 py-10 text-center text-slate-600 text-sm">
            {error ? "Error al cargar datos." : "No hay cupones para los filtros aplicados."}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {polizasAgrupadas.map((grupo) => {
            const total      = grupo.cupones.length;
            const pagados    = grupo.cupones.filter((c) => getVisual(c) === "PAGADA").length;
            const pct        = total > 0 ? Math.round((pagados / total) * 100) : 0;
            const phone      = resolvePhone(grupo.cupones[0]);
            const abierta    = !!abiertas[grupo.polizaId];
            const reportados = grupo.cupones.filter((c) => getVisual(c) === "REPORTADO").length;
            const vencidos   = grupo.cupones.filter((c) => getVisual(c) === "VENCIDA").length;
            return (
              <div key={grupo.polizaId} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden self-start">
                {/* Header — toggle */}
                <button
                  type="button"
                  onClick={() => toggleCard(grupo.polizaId)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{grupo.asegurado}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">{grupo.vehiculo} · {grupo.patente}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{grupo.compania || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {grupo.oficina && (
                        <span className="text-[10px] font-mono border border-slate-700 text-slate-500 rounded px-1.5 py-0.5">
                          {grupo.oficina}
                        </span>
                      )}
                      <HiChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${abierta ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">{pagados} de {total} pagados</span>
                  </div>

                  {(reportados > 0 || vencidos > 0) && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {reportados > 0 && (
                        <span className="text-[10px] font-medium border border-sky-800 bg-sky-950/30 text-sky-400 rounded px-1.5 py-0.5">
                          {reportados} reportado{reportados > 1 ? "s" : ""}
                        </span>
                      )}
                      {vencidos > 0 && (
                        <span className="text-[10px] font-medium border border-rose-800 bg-rose-950/30 text-rose-400 rounded px-1.5 py-0.5">
                          {vencidos} vencido{vencidos > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Cupones — colapsable */}
                <AnimatePresence initial={false}>
                  {abierta && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-slate-800"
                    >
                      <div className="p-3 space-y-2">
                        {grupo.cupones.map((c) => {
                          const visual      = getVisual(c);
                          const badge       = BADGE[visual] || BADGE.PENDIENTE;
                          const isPagada    = visual === "PAGADA";
                          const esReportado = visual === "REPORTADO";
                          return (
                            <div key={c.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                              esReportado            ? "border-sky-800 bg-sky-950/20"  :
                              visual === "VENCIDA"   ? "border-rose-900/60 bg-rose-950/10" :
                              "border-slate-800"
                            }`}>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-300">Vence {fmtDate(c.fecha_vencimiento)}</p>
                                <p className="text-sm font-mono font-semibold text-slate-100">{fmt(Number(c.monto || 0))}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] border font-medium ${badge.cls}`}>
                                  {badge.label}
                                </span>
                                {!isPagada && (
                                  <button
                                    onClick={() => setPagoModal(c)}
                                    className="h-7 px-2.5 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                                  >
                                    {esReportado ? "Confirmar" : "Pagar"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        <div className="flex gap-2 pt-1">
                          {grupo.polizaId && (
                            <Link
                              to={`/polizas/${grupo.polizaId}`}
                              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                            >
                              Ver ficha
                            </Link>
                          )}
                          {phone && (
                            <a
                              href={buildWaUrl(phone, grupo.cupones[0])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                            >
                              <HiChatAlt2 className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal de pago ──────────────────────────────────── */}
      {pagoModal && (
        <PagoModal
          cupon={pagoModal}
          onClose={() => !procesandoPago && setPagoModal(null)}
          onConfirm={handleConfirmPago}
          procesando={procesandoPago}
        />
      )}
    </div>
  );
}