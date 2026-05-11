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
  if ((c?.estado || "").toUpperCase() === "PAGADA") return "PAGADA";
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

/* ─── PagoModal ────────────────────────────────────────────── */
function PagoModal({ cupon, onClose, onConfirm, procesando }) {
  const fileInputRef = useRef(null);
  const [step, setStep]               = useState(1);
  const [montoPago, setMontoPago]     = useState(
    cupon?.monto ? String(cupon.monto).replace(".", ",") : ""
  );
  const [montoCompania, setMontoCompania] = useState("");
  const [foto, setFoto]               = useState(null);

  const parseMonto = (v) => {
    const s = String(v || "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmtInput = (v) => {
    const s     = String(v || "").replace(/[^0-9,]/g, "");
    const parts = s.split(",");
    const int   = parts[0] ? new Intl.NumberFormat("es-AR").format(Number(parts[0])) : "";
    return int + (parts.length > 1 ? "," + parts[1].slice(0, 2) : "");
  };

  const cobrado  = parseMonto(montoPago);
  const costo    = parseMonto(montoCompania);
  const ganancia = cobrado - costo;
  const canNext  = cobrado > 0 && !!foto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Registrar pago</h3>
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

        {step === 1 ? (
          <div className="p-5 space-y-4">
            {/* Monto cobrado al cliente */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                Monto cobrado al cliente
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 focus-within:border-slate-500 transition-colors">
                <span className="text-slate-600 text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={montoPago}
                  onChange={(e) => setMontoPago(fmtInput(e.target.value))}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-sm font-mono text-slate-100 outline-none"
                  disabled={procesando}
                />
              </div>
            </div>

            {/* Costo compañía */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                Costo de la compañía
                <span className="ml-1 normal-case text-slate-600">(para calcular comisión)</span>
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 focus-within:border-slate-500 transition-colors">
                <span className="text-slate-600 text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={montoCompania}
                  onChange={(e) => setMontoCompania(fmtInput(e.target.value))}
                  placeholder="0,00"
                  className="flex-1 bg-transparent text-sm font-mono text-slate-100 outline-none"
                  disabled={procesando}
                />
              </div>
              {cobrado > 0 && costo > 0 && (
                <p className={`mt-1.5 text-xs font-mono ${ganancia >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  Ganancia: {fmt(ganancia)}
                </p>
              )}
            </div>

            {/* Foto comprobante */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                Comprobante
                <span className="ml-2 text-rose-400">obligatorio</span>
              </label>
              <div
                onClick={() => !procesando && fileInputRef.current?.click()}
                className={`h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  foto
                    ? "border-emerald-800 bg-emerald-950/30"
                    : "border-slate-700 bg-slate-950 hover:bg-slate-800/50"
                }`}
              >
                <HiPhotograph className={`w-5 h-5 ${foto ? "text-emerald-400" : "text-slate-600"}`} />
                <span className="text-xs text-slate-500 text-center px-2 truncate max-w-full">
                  {foto ? foto.name : "Hacer clic para seleccionar foto"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFoto(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={procesando}
                className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canNext || procesando}
                className="h-9 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Pantalla de confirmación */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 divide-y divide-slate-800">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-500">Cobrado al cliente</span>
                <span className="font-mono font-medium text-emerald-400">{fmt(cobrado)}</span>
              </div>
              {costo > 0 && (
                <>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-500">Costo compañía</span>
                    <span className="font-mono text-slate-300">{fmt(costo)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-400 font-medium">Ganancia</span>
                    <span className={`font-mono font-semibold ${ganancia >= 0 ? "text-sky-400" : "text-rose-400"}`}>
                      {fmt(ganancia)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-slate-500">Foto adjunta</span>
                <span className="text-slate-400 truncate max-w-[160px]">{foto?.name}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setStep(1)}
                disabled={procesando}
                className="h-9 px-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
              >
                Corregir
              </button>
              <button
                onClick={() => onConfirm({ cobrado, costo, foto })}
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
        )}
      </div>
    </div>
  );
}

/* ─── CuponerasPage ────────────────────────────────────────── */
export default function CuponerasPage() {
  const dispatch = useDispatch();

  const [cupones, setCupones]   = useState([]);
  const [count, setCount]       = useState(0);
  const [counters, setCounters] = useState({ total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0 });
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
      const params = { solo_ultimo: 1, page: p, page_size: ps };
      if (sc && sc !== "ALL") params.scope = sc;
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

  /* page / pageSize / scope */
  useEffect(() => {
    loadDashboard(search, compania, { page, pageSize, scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, scope]);

  const refreshAll = () => loadDashboard(search, compania, { page, pageSize, scope });

  /* urgentes — derivados del listado actual */
  const urgentes = useMemo(() => {
    return cupones
      .filter((c) => { const v = getVisual(c); return v === "VENCIDA" || v === "POR_VENCER"; })
      .sort((a, b) => (getDiasRestantes(a) ?? 999) - (getDiasRestantes(b) ?? 999));
  }, [cupones]);

  const vencidasCount  = useMemo(() => cupones.filter((c) => getVisual(c) === "VENCIDA").length,    [cupones]);
  const porVencerCount = useMemo(() => cupones.filter((c) => getVisual(c) === "POR_VENCER").length, [cupones]);

  /* paginación */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / (pageSize || 25))), [count, pageSize]);
  const pages      = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  /* confirmar pago */
  const handleConfirmPago = async ({ cobrado, costo, foto }) => {
    if (!pagoModal) return;
    setProcesandoPago(true);
    try {
      const { secure_url, public_id } = await uploadToCloudinary(foto, "rc-admin/cupones-robo");
      await dispatch(
        actualizarEstadoCuponRobo({
          id:           pagoModal.id,
          polizaId:     pagoModal.poliza,
          estado:       "PAGADA",
          monto:        cobrado,
          costo_compania: costo,
          foto_url:     secure_url,
          foto_public_id: public_id,
        })
      ).unwrap();
      toast.success("Pago registrado correctamente.");
      setPagoModal(null);
      refreshAll();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo registrar el pago. Intentá de nuevo.");
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total global",    value: counters.total,        sc: "ALL",           color: "text-slate-200" },
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
      {urgentes.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <HiExclamationCircle className="w-4 h-4 text-rose-400" />
              <span className="text-sm font-medium text-slate-200">Requieren atención</span>
              <div className="flex items-center gap-1.5 ml-1">
                {vencidasCount > 0 && (
                  <span className="text-[10px] font-mono border border-rose-800 bg-rose-950/40 text-rose-400 rounded px-1.5 py-0.5">
                    {vencidasCount} vencidas
                  </span>
                )}
                {porVencerCount > 0 && (
                  <span className="text-[10px] font-mono border border-amber-800 bg-amber-950/30 text-amber-400 rounded px-1.5 py-0.5">
                    {porVencerCount} esta semana
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-slate-600">{urgentes.length} total</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentes.map((c) => (
              <UrgencyCard key={c.id} cupon={c} onPagar={setPagoModal} />
            ))}
          </div>
        </div>
      )}

      {urgentes.length === 0 && !loading && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
          <HiBadgeCheck className="w-4 h-4 text-emerald-500" />
          Todo al día — no hay cupones vencidos ni por vencer esta semana.
        </div>
      )}

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

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                {["Póliza", "Compañía", "Oficina", "Patente", "Asegurado", "Período", "Vencimiento", "Estado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {!loading && cupones.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-600 text-sm">
                    {error ? "Error al cargar datos." : "No hay resultados para los filtros aplicados."}
                  </td>
                </tr>
              )}

              {cupones.map((c) => {
                const visual   = getVisual(c);
                const badge    = BADGE[visual] || BADGE.PENDIENTE;
                const dias     = getDiasRestantes(c);
                const phone    = resolvePhone(c);
                const isPagada = visual === "PAGADA";

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      visual === "VENCIDA"    ? "bg-rose-950/10"  :
                      visual === "POR_VENCER" ? "bg-amber-950/5"  : ""
                    }`}
                  >
                    {/* Póliza */}
                    <td className="px-4 py-3">
                      {c.poliza ? (
                        <Link
                          to={`/polizas/${c.poliza}`}
                          className="text-sky-400 hover:text-sky-300 text-xs font-mono hover:underline underline-offset-2"
                        >
                          {c.poliza_numero || `#${c.poliza}`}
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Compañía */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.poliza_compania || "—"}
                    </td>

                    {/* Oficina — solo visible cuando el backend lo incluye (admin) */}
                    <td className="px-4 py-3">
                      {c.poliza_oficina_nombre ? (
                        <span className="text-[10px] font-mono border border-slate-700 text-slate-500 rounded px-1.5 py-0.5">
                          {c.poliza_oficina_nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-700">—</span>
                      )}
                    </td>

                    {/* Patente */}
                    <td className="px-4 py-3 text-xs font-mono font-medium text-slate-200">
                      {c.poliza_patente || "—"}
                    </td>

                    {/* Asegurado */}
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {c.asegurado_nombre || "—"}
                    </td>

                    {/* Período */}
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">
                      {fmtPeriodo(c)}
                    </td>

                    {/* Vencimiento + días */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono ${
                        visual === "VENCIDA"    ? "text-rose-400"  :
                        visual === "POR_VENCER" ? "text-amber-400" : "text-slate-400"
                      }`}>
                        {fmtDate(c.fecha_vencimiento)}
                        {dias !== null && !isPagada && (
                          <span className="ml-1 text-[10px] opacity-60">
                            ({dias < 0 ? `${Math.abs(dias)}d` : `en ${dias}d`})
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] border font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!isPagada && (
                          <button
                            onClick={() => setPagoModal(c)}
                            className="h-7 px-2.5 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <HiCurrencyDollar className="w-3.5 h-3.5" />
                            Pagar
                          </button>
                        )}
                        {phone ? (
                          <a
                            href={buildWaUrl(phone, c)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 px-2.5 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <HiChatAlt2 className="w-3.5 h-3.5" />
                            WPP
                          </a>
                        ) : (
                          <span className="h-7 px-2.5 rounded-md border border-slate-800 text-slate-700 text-xs inline-flex items-center gap-1 cursor-not-allowed">
                            <HiChatAlt2 className="w-3.5 h-3.5" />
                            Sin tel.
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-600">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 w-7 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center justify-center"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>

              {pages.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="w-7 text-center text-slate-600 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded-md border text-xs transition-colors ${
                      p === page
                        ? "border-slate-500 bg-slate-700 text-slate-100"
                        : "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors inline-flex items-center justify-center"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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