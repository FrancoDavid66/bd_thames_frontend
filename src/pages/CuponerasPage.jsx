// src/pages/CuponerasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import {
  HiRefresh,
  HiExclamation,
  HiBadgeCheck,
  HiClock,
  HiSearch,
  HiChevronLeft,
  HiChevronRight,
  HiChatAlt2,
} from "react-icons/hi";
import { Link } from "react-router-dom";
import axios from "axios";

const RAW_BASE = (import.meta.env?.VITE_API_URL || "/api/").toString().trim();
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

const http = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

/**
 * ✅ REGLA: estos estados deberían salir de los valores reales del backend (c.estado).
 * Pasame los valores exactos cuando puedas y los dejamos “oficiales” acá.
 */
const badgeByEstado = {
  PENDIENTE: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  AL_DIA: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  PAGADA: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  VENCIDA: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

const labelByEstado = {
  PENDIENTE: "Pendiente",
  AL_DIA: "Al día",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
};

function formatDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatPeriodo(c) {
  if (!c?.periodo_desde || !c?.periodo_hasta) return "—";
  const desde = dayjs(c.periodo_desde);
  const hasta = dayjs(c.periodo_hasta);
  if (!desde.isValid() || !hasta.isValid()) return "—";
  if (desde.month() === hasta.month() && desde.year() === hasta.year()) {
    return desde.format("MM/YYYY");
  }
  return `${desde.format("MM/YYYY")} – ${hasta.format("MM/YYYY")}`;
}

function getVisualEstado(c) {
  const baseEstado = (c?.estado || "").toUpperCase();
  if (baseEstado === "PAGADA") return "PAGADA";

  const hoy = dayjs().startOf("day");
  if (!c?.fecha_vencimiento) return "AL_DIA";

  const vto = dayjs(c.fecha_vencimiento);
  if (!vto.isValid()) return baseEstado || "PENDIENTE";

  const diff = vto.diff(hoy, "day");
  if (diff < 0) return "VENCIDA";
  return "AL_DIA";
}

function getRowTone(c) {
  const visual = getVisualEstado(c);
  const hoy = dayjs().startOf("day");
  if (!c.fecha_vencimiento) return "";
  const vto = dayjs(c.fecha_vencimiento);
  if (!vto.isValid()) return "";
  const diff = vto.diff(hoy, "day");

  if (visual === "VENCIDA") return "bg-rose-500/5";
  if (visual === "AL_DIA" && diff <= 7 && diff >= 0) return "bg-amber-500/5";
  return "";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildPages(current, total) {
  const pages = [];
  if (total <= 1) return [1];

  const push = (x) => pages.push(x);

  push(1);
  const start = clamp(current - 2, 2, Math.max(2, total - 1));
  const end = clamp(current + 2, 2, Math.max(2, total - 1));

  if (start > 2) push("…");
  for (let p = start; p <= end; p++) push(p);
  if (end < total - 1) push("…");
  push(total);

  return pages.filter((v, i) => pages.indexOf(v) === i);
}

/* =========================
   WhatsApp helpers (AR)
========================= */
function digitsOnly(v) {
  return String(v || "").replace(/\D+/g, "");
}

function normalizePhoneAR(raw) {
  let d = digitsOnly(raw);
  if (!d) return "";

  // quita 00
  if (d.startsWith("00")) d = d.slice(2);

  // si ya tiene 54 (lo dejamos en formato wa.me sin +)
  if (d.startsWith("54")) {
    d = d.slice(2);
  }

  // quita 0 inicial (larga distancia)
  if (d.startsWith("0")) d = d.slice(1);

  // quita 15 (celular) heurística
  d = d.replace(/^(\d{2,4})15/, "$1");

  return `54${d}`;
}

function resolvePhoneFromCupon(c) {
  // 1) si backend ya manda e164 “+54...”, lo respetamos
  const e164 = String(c?.asegurado_telefono_e164 || "").trim();
  if (e164.startsWith("+")) {
    const wa = digitsOnly(e164);
    if (wa) return wa; // wa.me va SIN "+"
  }

  // 2) candidatos comunes
  const candidates = [
    c?.asegurado_telefono,
    c?.cliente_telefono,
    c?.telefono,
    c?.whatsapp,
    c?.celular,
    c?.poliza_cliente_telefono,
  ];
  for (const v of candidates) {
    const n = normalizePhoneAR(v);
    if (n) return n;
  }
  return "";
}

/* =========================
   Datos vehículo (robusto)
========================= */
function resolveVehiculoFromCupon(c) {
  // soporta varias convenciones (por si backend cambia)
  const anio =
    c?.poliza_anio ??
    c?.anio ??
    c?.vehiculo_anio ??
    c?.auto_anio ??
    c?.poliza?.anio ??
    "";

  const modelo =
    c?.poliza_modelo ??
    c?.modelo ??
    c?.vehiculo_modelo ??
    c?.auto_modelo ??
    c?.poliza?.modelo ??
    "";

  const patente =
    c?.poliza_patente ??
    c?.patente ??
    c?.vehiculo_patente ??
    c?.auto_patente ??
    c?.poliza?.patente ??
    "";

  const a = String(anio || "").trim();
  const m = String(modelo || "").trim();
  const p = String(patente || "").trim();

  // queremos: año, modelo y patente (en ese orden)
  const parts = [];
  if (a) parts.push(a);
  if (m) parts.push(m);
  if (p) parts.push(p);

  return parts.join(" · ");
}

function buildMensajeCuota(c) {
  const nombre = (c?.asegurado_nombre || "").trim() || "¿Cómo estás?";
  const vehiculoTxt = resolveVehiculoFromCupon(c); // "año · modelo · patente"

  const hoy = dayjs().startOf("day");
  const vto = c?.fecha_vencimiento ? dayjs(c.fecha_vencimiento) : null;
  const vtoOk = vto && vto.isValid();
  const diff = vtoOk ? vto.diff(hoy, "day") : null;

  const vtoStr = vtoOk ? vto.format("DD/MM/YYYY") : "—";
  const extraLine = vehiculoTxt ? `\n${vehiculoTxt}` : "";

  const visual = getVisualEstado(c);

  if (visual === "VENCIDA" || (typeof diff === "number" && diff < 0)) {
    return `Hola ${nombre} 👋\nTu cuota venció el ${vtoStr}.${extraLine}\n¿Te paso medios de pago para dejarla al día hoy?`;
  }

  if (typeof diff === "number" && diff >= 0 && diff <= 7) {
    const diasTxt = diff === 0 ? "hoy" : `en ${diff} día${diff === 1 ? "" : "s"}`;
    return `Hola ${nombre} 👋\nTu cuota vence el ${vtoStr} (${diasTxt}).${extraLine}\n¿Querés que te pase medios de pago para abonarla?`;
  }

  if (vtoOk) {
    return `Hola ${nombre} 👋\nRecordatorio: tu cuota vence el ${vtoStr}.${extraLine}\nCuando quieras te paso los medios de pago.`;
  }

  return `Hola ${nombre} 👋\nTe escribo por tu cuota.${extraLine}\n¿Querés que revisemos el estado y te paso medios de pago?`;
}

function buildWaUrl(phoneWa, message) {
  const text = encodeURIComponent(message || "");
  return `https://wa.me/${phoneWa}?text=${text}`;
}

export default function CuponerasPage() {
  const [cupones, setCupones] = useState([]);
  const [count, setCount] = useState(0);

  const [counters, setCounters] = useState({
    total: 0,
    pendientes: 0,
    por_vencer_7: 0,
    vencidas: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("ALL"); // ALL | PENDIENTE | POR_VENCER_7 | VENCIDA

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const stats = useMemo(() => {
    const total = Number(counters?.total || 0);
    const pendientes = Number(counters?.pendientes || 0);
    const porVencer7 = Number(counters?.por_vencer_7 || 0);
    const vencidas = Number(counters?.vencidas || 0);
    return { total, pendientes, porVencer7, vencidas };
  }, [counters]);

  const totalPages = useMemo(() => {
    const ps = Number(pageSize || 25);
    const c = Number(count || 0);
    return Math.max(1, Math.ceil(c / ps));
  }, [count, pageSize]);

  const pages = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  const loadDashboard = async (term = "", opts = {}) => {
    const { page: p = page, pageSize: ps = pageSize, scope: sc = scope } = opts;

    setLoading(true);
    setError("");
    try {
      const params = {
        solo_ultimo: 1,
        page: p,
        page_size: ps,
      };

      // ✅ scope SOLO para tabla
      if (sc && sc !== "ALL") params.scope = sc;

      const q = term.trim();
      if (q) params.search = q;

      const res = await http.get("polizas/cupones-robo/dashboard/", { params });
      const data = res.data || {};

      // ✅ counters SIEMPRE globales
      setCounters(
        data.counters_global || { total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0 }
      );

      setCount(Number(data.count || 0));
      setCupones(Array.isArray(data.results) ? data.results : []);
      setLastLoadedAt(new Date().toISOString());
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las cuponeras de robo.");
      setCounters({ total: 0, pendientes: 0, por_vencer_7: 0, vencidas: 0 });
      setCount(0);
      setCupones([]);
    } finally {
      setLoading(false);
    }
  };

  // debounce search => page 1 + dashboard
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      loadDashboard(search, { page: 1, pageSize, scope });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // page / pageSize / scope => dashboard
  useEffect(() => {
    loadDashboard(search, { page, pageSize, scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, scope]);

  const refreshAll = () => loadDashboard(search, { page, pageSize, scope });

  const hasAny = (count || 0) > 0;

  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  const onKpiClick = (newScope) => {
    setScope(newScope);
    setPage(1);
  };

  const onWhatsApp = (c) => {
    const phone = resolvePhoneFromCupon(c);
    if (!phone) return;
    const msg = buildMensajeCuota(c); // ✅ ahora dice “cuota” y muestra año/modelo/patente
    const url = buildWaUrl(phone, msg);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Cuponeras de robo
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Tarjetas: totales. Tabla: filtrable + paginada.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastLoadedAt && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Actualizado: {dayjs(lastLoadedAt).format("DD/MM/YYYY HH:mm")}
            </span>
          )}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800/40 text-white px-4 py-2 text-sm font-medium shadow-sm shadow-sky-900/40 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          >
            <HiRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* KPIs (SIEMPRE TOTALES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.button
          type="button"
          layout
          onClick={() => onKpiClick("ALL")}
          className={`text-left rounded-2xl border border-slate-200/50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-sm shadow-slate-900/40 p-4 flex flex-col gap-1 cursor-pointer select-none transition
            ${scope === "ALL" ? "ring-2 ring-sky-400/60 shadow-md" : "hover:-translate-y-0.5 hover:shadow-md"}`}
        >
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            Total (1 por póliza)
          </span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {stats.total}
            </span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          layout
          onClick={() => onKpiClick("PENDIENTE")}
          className={`text-left rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm shadow-emerald-900/40 p-4 flex flex-col gap-1 cursor-pointer select-none transition
            ${scope === "PENDIENTE" ? "ring-2 ring-emerald-400/70 shadow-md" : "hover:-translate-y-0.5 hover:shadow-md"}`}
        >
          <span className="text-xs uppercase tracking-[0.15em] text-emerald-300">
            Pendientes (estado)
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-semibold text-emerald-200">
              {stats.pendientes}
            </span>
            <HiBadgeCheck className="h-6 w-6 text-emerald-300" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          layout
          onClick={() => onKpiClick("POR_VENCER_7")}
          className={`text-left rounded-2xl border border-amber-500/25 bg-amber-500/10 shadow-sm shadow-amber-900/40 p-4 flex flex-col gap-1 cursor-pointer select-none transition
            ${scope === "POR_VENCER_7" ? "ring-2 ring-amber-300/80 shadow-md" : "hover:-translate-y-0.5 hover:shadow-md"}`}
        >
          <span className="text-xs uppercase tracking-[0.15em] text-amber-200">
            Por vencer (≤ 7 días)
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-semibold text-amber-100">
              {stats.porVencer7}
            </span>
            <HiClock className="h-6 w-6 text-amber-200" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          layout
          onClick={() => onKpiClick("VENCIDA")}
          className={`text-left rounded-2xl border border-rose-500/25 bg-rose-500/10 shadow-sm shadow-rose-900/40 p-4 flex flex-col gap-1 cursor-pointer select-none transition
            ${scope === "VENCIDA" ? "ring-2 ring-rose-300/80 shadow-md" : "hover:-translate-y-0.5 hover:shadow-md"}`}
        >
          <span className="text-xs uppercase tracking-[0.15em] text-rose-200">
            Vencidas
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-2xl font-semibold text-rose-100">
              {stats.vencidas}
            </span>
            <HiExclamation className="h-6 w-6 text-rose-200" />
          </div>
        </motion.button>
      </div>

      {/* Buscador */}
      <div className="max-w-lg">
        <div className="relative mt-2">
          <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            className="w-full rounded-full border border-slate-300/40 bg-white/80 px-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700/60"
            placeholder="Buscar por número de póliza, patente o asegurado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-100 px-4 py-3 text-sm flex items-center gap-2">
          <HiExclamation className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 shadow-sm shadow-slate-900/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Listado</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {hasAny ? `${count} resultados` : "0 resultados"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Por página</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value || 25));
                setPage(1);
              }}
              className="rounded-full border border-slate-300/40 bg-white/80 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-700/60"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-800">
              <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Póliza</th>
                <th className="px-4 py-2">Asegurado</th>
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2">Vencimiento</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && cupones.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm"
                  >
                    Cargando...
                  </td>
                </tr>
              )}

              {!loading && cupones.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm"
                  >
                    {hasAny ? "No hay cuponeras en esta página." : "No hay cuponeras registradas."}
                  </td>
                </tr>
              )}

              {cupones.map((c) => {
                const visual = getVisualEstado(c);
                const badgeClass =
                  badgeByEstado[visual] ||
                  "bg-slate-500/15 text-slate-200 border border-slate-500/30";
                const label = labelByEstado[visual] || visual || "—";
                const tone = getRowTone(c);

                let Icon = HiClock;
                if (visual === "PAGADA") Icon = HiBadgeCheck;
                if (visual === "VENCIDA") Icon = HiExclamation;

                const phone = resolvePhoneFromCupon(c);
                const canWa = Boolean(phone);

                return (
                  <tr
                    key={c.id}
                    className={`border-b border-slate-100/70 dark:border-slate-800/80 ${tone || ""}`}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">#{c.id}</td>

                    <td className="px-4 py-3 text-xs">
                      {c.poliza ? (
                        <Link
                          to={`/polizas/${c.poliza}`}
                          className="text-sky-300 hover:text-sky-100 underline-offset-2 hover:underline"
                        >
                          {c.poliza_numero || `ID ${c.poliza}`}
                        </Link>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-200 dark:text-slate-100">
                      {c.asegurado_nombre || "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-100">{formatPeriodo(c)}</td>
                    <td className="px-4 py-3 text-xs text-slate-100">{formatDate(c.fecha_vencimiento)}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${badgeClass}`}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="uppercase tracking-[0.18em]">{label}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onWhatsApp(c)}
                        disabled={!canWa}
                        title={canWa ? `WhatsApp: +${phone}` : "Sin teléfono"}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs border transition
                          ${
                            canWa
                              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                              : "border-slate-400/20 bg-slate-500/5 text-slate-400 cursor-not-allowed opacity-60"
                          }`}
                      >
                        <HiChatAlt2 className="h-4 w-4" />
                        Enviar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t border-slate-200/70 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Página {page} de {totalPages}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs border border-slate-300/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                <HiChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              {pages.map((p, idx) =>
                p === "…" ? (
                  <span key={`e-${idx}`} className="px-2 text-xs text-slate-500 dark:text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`rounded-full px-3 py-1.5 text-xs border ${
                      p === page
                        ? "border-sky-400/60 bg-sky-500/10 text-sky-200"
                        : "border-slate-300/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={!canNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs border border-slate-300/40 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                Siguiente
                <HiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
