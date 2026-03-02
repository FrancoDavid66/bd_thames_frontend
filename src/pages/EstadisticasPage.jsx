// src/pages/EstadisticasPage.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { HiShieldCheck, HiTruck, HiExclamation, HiChartBar } from "react-icons/hi";

import { OFICINAS, getOficinaNombre } from "../components/estadisticas/oficinas";

import EstadisticasHeader from "../components/estadisticas/EstadisticasHeader";
import EstadisticasFilters from "../components/estadisticas/EstadisticasFilters";
import EstadisticasSummaryCards from "../components/estadisticas/EstadisticasSummaryCards";
import OficinasTable from "../components/estadisticas/OficinasTable";
import FutureModulesCard from "../components/estadisticas/FutureModulesCard";
import AnimatedCard from "../components/estadisticas/AnimatedCard";
import AseguradosExportModal from "../components/estadisticas/AseguradosExportModal";

// ✅ panel vehículos + modal export
import VehiculosPanel from "../components/estadisticas/VehiculosPanel";
import VehiculosExportModal from "../components/estadisticas/VehiculosExportModal";

// ✅ altas de póliza por oficina (día/semana/mes)
import AltasPolizasPanel from "../components/estadisticas/AltasPolizasPanel";

const getApiBase = () => {
  const raw =
    (import.meta?.env?.VITE_API_BASE &&
      String(import.meta.env.VITE_API_BASE).trim()) ||
    (import.meta?.env?.VITE_API_URL &&
      String(import.meta.env.VITE_API_URL).trim()) ||
    "/api/";
  return raw.endsWith("/") ? raw : `${raw}/`;
};

const formatMixPercent = (value, total) => {
  const v = Number(value || 0);
  const t = Number(total || 0);
  if (!t || !v) return "0%";
  const pct = (v / t) * 100;
  return `${pct.toFixed(0)}%`;
};

const ORBS = [
  { top: "12%", left: "10%", size: 140, duration: 18 },
  { top: "70%", left: "15%", size: 160, duration: 22 },
  { top: "30%", left: "85%", size: 120, duration: 20 },
  { top: "65%", left: "80%", size: 180, duration: 26 },
];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const safeStr = (v) => String(v ?? "").trim();

const copyText = async (text) => {
  const t = safeStr(text);
  if (!t) return;
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-1000px";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      /* noop */
    }
  }
};

const normalizePatente = (raw) =>
  safeStr(raw)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-xl px-3 py-2 text-[12px] font-semibold transition",
        active
          ? "bg-white/10 text-slate-50 border border-white/15"
          : "text-slate-300 hover:text-slate-50 hover:bg-white/5 border border-transparent",
      ].join(" ")}
    >
      {children}
      {active && (
        <span className="pointer-events-none absolute inset-x-2 -bottom-1 h-[2px] rounded-full bg-sky-400/80" />
      )}
    </button>
  );
}

// ✅ helper: prueba varias URLs (útil cuando el backend está montado como /api/ o /api/polizas/)
async function fetchFirstOkJson(urls, fetchOptions) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  let lastErr = null;

  for (const url of list) {
    try {
      const res = await fetch(url, fetchOptions);

      // Si no existe esta ruta, probamos la siguiente.
      if (res.status === 404) {
        lastErr = new Error(`HTTP 404 (${url})`);
        continue;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("No se pudo cargar");
}

/* =========================
   ✅ NUEVO: PANEL DE DISTRIBUCIÓN
========================= */
function DistribucionPanel({ apiBase, oficina }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [soloActivas, setSoloActivas] = useState(true);

  const fetchDistribucion = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (oficina) params.set("oficina", oficina);
      if (soloActivas) params.set("solo_activas", "1");

      const url = `${apiBase}estadisticas/vehiculos/resumen/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Error al cargar distribución:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribucion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, soloActivas]);

  const total = data?.total_polizas || 0;

  const RankingCard = ({ title, items = {}, icon: Icon, color = "bg-sky-500" }) => (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-xl">
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Icon className="text-sky-400 text-lg" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
      </div>
      <div className="space-y-4">
        {Object.entries(items || {}).length > 0 ? (
          Object.entries(items).map(([key, value]) => (
            <div key={key} className="group flex flex-col gap-1.5">
              <div className="flex justify-between items-end px-0.5">
                <span className="text-[13px] font-medium text-slate-200 group-hover:text-white transition-colors">{key}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-slate-50">{value.toLocaleString("es-AR")}</span>
                  <span className="text-[10px] font-medium text-slate-500">{formatMixPercent(value, total)}</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: formatMixPercent(value, total) }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${color} opacity-70 group-hover:opacity-100 transition-opacity`}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-xs text-slate-500 italic">Sin datos disponibles.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <HiChartBar className="text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Distribución de Cartera</h2>
            <p className="text-[11px] text-slate-400">Desglose detallado por compañía y tipo de cobertura.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 transition hover:bg-white/5">
            <input 
              type="checkbox" 
              checked={soloActivas} 
              onChange={e => setSoloActivas(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-transparent text-sky-500 focus:ring-sky-500/30 accent-sky-500"
            />
            <span className="text-xs font-semibold text-slate-200">Solo Activas</span>
          </label>
          <button 
            onClick={fetchDistribucion}
            disabled={loading}
            className="h-9 rounded-xl bg-sky-500 px-5 text-xs font-bold text-white transition hover:bg-sky-400 shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RankingCard title="Ranking por Compañía" items={data?.por_compania} icon={HiTruck} color="bg-sky-500" />
        <RankingCard title="Distribución por Cobertura" items={data?.por_cobertura} icon={HiShieldCheck} color="bg-emerald-500" />
      </div>
    </div>
  );
}

/* =========================
   ✅ DUPLICADOS (PÓLIZAS)
========================= */
function DuplicadosPolizasPanel({ apiBase, oficina, setOficina }) {
  const navigate = useNavigate();

  const [por, setPor] = useState("numero_poliza_compania");
  const [perGroup, setPerGroup] = useState(12);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [resumen, setResumen] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loadingResumen, setLoadingResumen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [oficina, por, pageSize]);

  const goPoliza = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;
    navigate(`/polizas/${n}`);
  };

  const keyToLabel = (k) => {
    const key = String(k || "");
    if (key === "numero_poliza") return "N° póliza";
    if (key === "numero_poliza_compania") return "N° póliza + compañía";
    if (key === "patente_activa") return "Patente (activas)";
    if (key === "cliente_patente_activa") return "Cliente + patente (activas)";
    return key;
  };

  const fetchResumen = async () => {
    setLoadingResumen(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);
      const suffix = `polizas/duplicadas/resumen/${qs.toString() ? `?${qs.toString()}` : ""}`;

      // Algunos proyectos montan polizas.urls como /api/ o como /api/polizas/.
      // Para que no te explote con 404, probamos ambos.
      const data = await fetchFirstOkJson(
        [`${apiBase}${suffix}`, `${apiBase}polizas/${suffix}`],
        { credentials: "include" }
      );
      setResumen(data || null);
    } catch (e) {
      console.error(e);
      setResumen(null);
      setError(
        "No se pudo cargar el resumen de duplicados (endpoint: /api/polizas/duplicadas/resumen/)."
      );
    } finally {
      setLoadingResumen(false);
    }
  };

  const fetchListado = async () => {
    setLoadingList(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("por", por);
      qs.set("page", String(page));
      qs.set("page_size", String(pageSize));
      qs.set("per_group", String(clamp(Number(perGroup || 12), 5, 200)));
      if (oficina) qs.set("oficina", oficina);

      const suffix = `polizas/duplicadas/?${qs.toString()}`;
      const data = await fetchFirstOkJson(
        [`${apiBase}${suffix}`, `${apiBase}polizas/${suffix}`],
        { credentials: "include" }
      );

      // ✅ NORMALIZACIÓN (backend puede devolver: rows + count_groups + key string)
      const resultsRaw = Array.isArray(data?.results) ? data.results : [];

      const normalized = resultsRaw.map((g) => {
        const items =
          Array.isArray(g?.items) ? g.items : Array.isArray(g?.rows) ? g.rows : [];

        // key puede venir como string o como object
        let keyStr = "";
        if (typeof g?.key === "string") keyStr = g.key;
        else if (g?.key && typeof g.key === "object" && !Array.isArray(g.key)) {
          keyStr = Object.entries(g.key)
            .map(([k, v]) => `${k}: ${v ?? "—"}`)
            .join(" · ");
        } else {
          keyStr = "";
        }

        return {
          ...g,
          _keyStr: keyStr,
          _items: items,
        };
      });

      const groupsCount = Number(data?.count_groups ?? data?.count ?? 0) || 0;

      setGrupos(normalized);
      setCount(groupsCount);

      // backend no manda total_pages -> lo calculamos
      const tp = Math.max(
        1,
        Math.ceil(groupsCount / Math.max(1, Number(pageSize || 10)))
      );
      setTotalPages(tp);
    } catch (e) {
      console.error(e);
      setGrupos([]);
      setCount(0);
      setTotalPages(1);
      setError(
        "No se pudo cargar el listado de duplicados (endpoint: /api/polizas/duplicadas/)."
      );
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchResumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  useEffect(() => {
    fetchListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, por, page, pageSize, perGroup]);

  const resumenCards = useMemo(() => {
    const r = resumen || {};
    return [
      {
        k: "numero_poliza_compania",
        label: "N° + Compañía",
        v: Number(r.numero_poliza_compania || 0),
      },
      { k: "numero_poliza", label: "N° póliza", v: Number(r.numero_poliza || 0) },
      {
        k: "patente_activa",
        label: "Patente (activas)",
        v: Number(r.patente_activa || 0),
      },
      {
        k: "cliente_patente_activa",
        label: "Cliente+Patente",
        v: Number(r.cliente_patente_activa || 0),
      },
    ];
  }, [resumen]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Duplicados — Pólizas
          </div>
          <div className="text-[11px] text-slate-400">
            Grupos duplicados por criterio. Ideal para limpiar carga.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Oficina</label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
            >
              <option value="">Todas</option>
              {OFICINAS.map((o) => (
                <option key={o.id} value={o.id}>
                  {getOficinaNombre(o.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Criterio</label>
            <select
              value={por}
              onChange={(e) => setPor(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
            >
              <option value="numero_poliza_compania">N° póliza + compañía</option>
              <option value="numero_poliza">N° póliza</option>
              <option value="patente_activa">Patente (activas)</option>
              <option value="cliente_patente_activa">Cliente + patente (activas)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchResumen();
              fetchListado();
            }}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Refrescar
          </button>
        </div>
      </div>

      <AnimatedCard index={2} glow="from-rose-500/35 via-fuchsia-500/15 to-transparent">
        <div className="grid gap-3 md:grid-cols-4">
          {resumenCards.map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={() => setPor(c.k)}
              className={[
                "rounded-2xl border p-4 text-left transition",
                por === c.k
                  ? "border-sky-400/40 bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                {c.label}
              </div>
              <div className="mt-1 text-3xl font-semibold text-slate-50">
                {loadingResumen ? "…" : c.v.toLocaleString("es-AR")}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">grupos duplicados</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
            {error}
          </div>
        )}
      </AnimatedCard>

      <AnimatedCard index={3} glow="from-emerald-500/30 via-cyan-500/15 to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Grupos ({keyToLabel(por)})
              </div>
              <div className="text-[11px] text-slate-400">
                Total grupos:{" "}
                <span className="font-semibold text-slate-200">
                  {Number(count || 0).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-slate-400">Items por grupo</label>
              <select
                value={perGroup}
                onChange={(e) => setPerGroup(Number(e.target.value) || 12)}
                className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <label className="text-[11px] text-slate-400">Grupos por página</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {loadingList ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                Cargando…
              </div>
            ) : grupos.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                No hay duplicados con estos filtros.
              </div>
            ) : (
              grupos.map((g, idx) => {
                const items = Array.isArray(g?._items) ? g._items : [];
                const keyStr = safeStr(g?._keyStr);

                return (
                  <div
                    key={`${keyStr || "group"}-${idx}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                          Clave
                        </div>
                        <div className="mt-1 font-semibold text-slate-100">
                          {keyStr || "—"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Items:{" "}
                          <span className="font-semibold text-slate-200">
                            {Number(g?.count || items.length || 0).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyText(keyStr)}
                        className="h-9 rounded-xl border border-white/10 bg-slate-950/30 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-slate-950/50"
                      >
                        Copiar clave
                      </button>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/25">
                      <table className="min-w-full text-sm">
                        <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                          <tr className="border-b border-white/10">
                            <th className="px-3 py-2 text-left">Póliza</th>
                            <th className="px-3 py-2 text-left">Cliente</th>
                            <th className="px-3 py-2 text-left">Patente</th>
                            <th className="px-3 py-2 text-left">Estado</th>
                            <th className="px-3 py-2 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-200">
                          {items.length === 0 ? (
                            <tr>
                              <td className="px-3 py-3 text-slate-400" colSpan={5}>
                                Sin items (raro). Probá subir per_group.
                              </td>
                            </tr>
                          ) : (
                            items.map((it) => (
                              <tr
                                key={it.id}
                                className="border-b border-white/5 hover:bg-white/5"
                              >
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-100">
                                    #{it.id}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {it.numero_poliza || "—"}
                                    {it.compania ? ` · ${it.compania}` : ""}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-100">
                                    {it?.cliente?.nombre || "—"}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    DNI: {it?.cliente?.dni_cuit_cuil || "—"}
                                  </div>
                                </td>
                                <td className="px-3 py-2">{it.patente || "—"}</td>
                                <td className="px-3 py-2">{it.estado || "—"}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => goPoliza(it.id)}
                                    className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10"
                                  >
                                    Abrir
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400">
              Página <span className="font-semibold text-slate-200">{page}</span> /{" "}
              <span className="font-semibold text-slate-200">
                {Math.max(1, Number(totalPages || 1))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(Math.max(1, Number(totalPages || 1)), p + 1))
                }
                disabled={page >= Math.max(1, Number(totalPages || 1))}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}

/* =========================
   ✅ CALIDAD DE DATOS
========================= */
function CalidadDatosPanel({ apiBase, oficina, setOficina }) {
  const navigate = useNavigate();

  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState("");

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [errorList, setErrorList] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-id");

  const totalPages = Math.max(
    1,
    Math.ceil(Number(count || 0) / Number(pageSize || 25))
  );

  useEffect(() => {
    setPage(1);
  }, [oficina, pageSize, ordering]);

  const goCliente = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;
    navigate(`/clientes/${n}`);
  };

  const fetchResumen = async () => {
    setLoadingResumen(true);
    setErrorResumen("");
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiBase}clientes/sin-telefono/resumen/${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResumen(data || null);
    } catch (e) {
      console.error(e);
      setResumen(null);
      setErrorResumen(
        "No se pudo cargar el resumen (endpoint: /api/clientes/sin-telefono/resumen/)."
      );
    } finally {
      setLoadingResumen(false);
    }
  };

  const fetchListado = async () => {
    setLoadingList(true);
    setErrorList("");
    try {
      const qs = new URLSearchParams();
      qs.set("sin_telefono", "1");
      qs.set("page", String(page));
      qs.set("page_size", String(pageSize));
      if (search.trim()) qs.set("search", search.trim());
      if (ordering) qs.set("ordering", ordering);
      if (oficina) qs.set("oficina", oficina);

      const url = `${apiBase}clientes/?${qs.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];
      const c = Number(data?.count ?? results.length ?? 0) || 0;

      setItems(results);
      setCount(c);
    } catch (e) {
      console.error(e);
      setItems([]);
      setCount(0);
      setErrorList(
        "No se pudo cargar el listado (endpoint: /api/clientes/?sin_telefono=1)."
      );
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchResumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  useEffect(() => {
    fetchListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, page, pageSize, ordering]);

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      fetchListado();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const pct =
    Number(resumen?.total || 0) > 0
      ? (
          (Number(resumen?.sin_telefono || 0) / Number(resumen?.total || 1)) *
          100
        ).toFixed(2)
      : "0.00";

  const downloadCsv = () => {
    const rows = items.map((c) => ({
      id: c?.id ?? "",
      apellido: c?.apellido ?? "",
      nombre: c?.nombre ?? "",
      dni_cuit_cuil: c?.dni_cuit_cuil ?? "",
      telefono: c?.telefono ?? "",
      email: c?.email ?? "",
      estado: c?.estado ?? "",
    }));

    const header = Object.keys(
      rows[0] || {
        id: "",
        apellido: "",
        nombre: "",
        dni_cuit_cuil: "",
        telefono: "",
        email: "",
        estado: "",
      }
    );
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_sin_telefono_${oficina ? `ofi_${oficina}_` : ""}p${page}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const table = `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Apellido</th><th>Nombre</th><th>DNI/CUIT</th><th>Teléfono</th><th>Email</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (c) => `
            <tr>
              <td>${c?.id ?? ""}</td>
              <td>${c?.apellido ?? ""}</td>
              <td>${c?.nombre ?? ""}</td>
              <td>${c?.dni_cuit_cuil ?? ""}</td>
              <td>${c?.telefono ?? ""}</td>
              <td>${c?.email ?? ""}</td>
              <td>${c?.estado ?? ""}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([table], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_sin_telefono_${oficina ? `ofi_${oficina}_` : ""}p${page}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      {/* Filtro oficina + acciones */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Calidad de datos — Asegurados sin teléfono
          </div>
          <div className="text-[11px] text-slate-400">
            Detecta clientes con teléfono vacío y te permite descargarlos y contactarlos.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Oficina</label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
            >
              <option value="">Todas</option>
              {OFICINAS.map((o) => (
                <option key={o.id} value={o.id}>
                  {getOficinaNombre(o.id)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchResumen();
              fetchListado();
            }}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Refrescar
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={!items.length}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            CSV (página)
          </button>

          <button
            type="button"
            onClick={downloadExcel}
            disabled={!items.length}
            className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            Excel (página)
          </button>
        </div>
      </div>

      {/* KPI */}
      <AnimatedCard index={2} glow="from-sky-500/40 via-fuchsia-500/20 to-transparent">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Sin teléfono
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">
              {loadingResumen
                ? "…"
                : Number(resumen?.sin_telefono || 0).toLocaleString("es-AR")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {oficina ? `Oficina: ${getOficinaNombre(oficina)}` : "Todas las oficinas"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Total (scope)
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">
              {loadingResumen ? "…" : Number(resumen?.total || 0).toLocaleString("es-AR")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Respeta oficina (y search si lo agregamos luego).
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              % sin teléfono
            </div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">
              {loadingResumen ? "…" : `${pct}%`}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Ideal para controlar calidad de carga.
            </div>
          </div>
        </div>

        {errorResumen && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
            {errorResumen}
          </div>
        )}
      </AnimatedCard>

      {/* Listado */}
      <AnimatedCard index={3} glow="from-emerald-500/35 via-cyan-500/15 to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Listado (paginado)
              </div>
              <div className="text-[11px] text-slate-400">
                Total encontrados:{" "}
                <span className="font-semibold text-slate-200">
                  {Number(count || 0).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar (nombre, apellido, DNI, email)…"
                className="h-9 w-[260px] max-w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              />

              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              >
                <option value="-id">Más nuevos</option>
                <option value="id">Más viejos</option>
                <option value="apellido">Apellido A→Z</option>
                <option value="-apellido">Apellido Z→A</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 25)}
                className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {errorList && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">
              {errorList}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/30">
            <table className="min-w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Asegurado</th>
                  <th className="px-3 py-2 text-left">DNI/CUIT</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {loadingList ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={6}>
                      Cargando…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={6}>
                      No hay resultados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 font-semibold text-slate-100">#{c.id}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-100">
                          {`${c.apellido || ""} ${c.nombre || ""}`.trim() || "—"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Tel:{" "}
                          <span className="font-semibold text-rose-200">
                            {c.telefono ? c.telefono : "— (vacío)"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{c.dni_cuit_cuil || "—"}</td>
                      <td className="px-3 py-2">{c.email || "—"}</td>
                      <td className="px-3 py-2">{c.estado || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => goCliente(c.id)}
                          className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400">
              Página <span className="font-semibold text-slate-200">{page}</span> /{" "}
              <span className="font-semibold text-slate-200">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}

/* =========================
   ✅ GENERAL (Tu página original)
========================= */
function EstadisticasGeneralPanel({ apiBase, oficina, setOficina }) {
  const navigate = useNavigate();

  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [fuenteSnapshot, setFuenteSnapshot] = useState("live"); // "live" | "snapshot"

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [fuenteRespuesta, setFuenteRespuesta] = useState("");
  const [oficinasData, setOficinasData] = useState([]);

  const [showExport, setShowExport] = useState(false);

  const [showVehiculosExport, setShowVehiculosExport] = useState(false);
  const [vehiculosExportDefaults, setVehiculosExportDefaults] = useState(null);

  const [agroKpis, setAgroKpis] = useState(null);
  const [agroLoading, setAgroLoading] = useState(false);
  const [agroError, setAgroError] = useState("");

  const fetchEstadisticas = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("anio", anio);
      params.set("mes", mes);
      if (oficina) params.set("oficina", oficina);
      if (fuenteSnapshot === "snapshot") {
        params.set("usar_snapshot", "1");
      }

      const url = `${apiBase}estadisticas/polizas/por-oficina/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();

      setPeriodo(data.periodo || "");
      setDesde(data.desde || "");
      setHasta(data.hasta || "");
      setFuenteRespuesta(data.fuente || "");
      setOficinasData(Array.isArray(data.oficinas) ? data.oficinas : []);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      setError(
        "No se pudieron cargar las estadísticas. Revisá el endpoint /api/estadisticas/polizas/por-oficina/."
      );
      setOficinasData([]);
      setPeriodo("");
      setDesde("");
      setHasta("");
      setFuenteRespuesta("");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgroKpis = async () => {
    setAgroLoading(true);
    setAgroError("");
    try {
      const params = new URLSearchParams();
      params.set("solo_activas", "1");
      if (oficina) params.set("oficina", oficina);

      const url = `${apiBase}estadisticas/agrosalta/kpis/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      setAgroKpis(data || null);
    } catch (err) {
      console.error("Error al cargar KPIs Agrosalta:", err);
      setAgroKpis(null);
      setAgroError(
        "No se pudieron cargar los KPIs de Agrosalta. Revisá el endpoint /api/estadisticas/agrosalta/kpis/."
      );
    } finally {
      setAgroLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes, oficina, fuenteSnapshot]);

  useEffect(() => {
    fetchAgroKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina]);

  const totales = useMemo(() => {
    return oficinasData.reduce(
      (acc, o) => {
        acc.total += o.polizas_total || 0;
        acc.activas += o.polizas_activas || 0;
        acc.nuevas += o.nuevas_mes || 0;
        acc.bajas += o.bajas_mes || 0;
        const churnPct = Number(o.churn_porcentaje || 0);
        acc.churnSumaPct += churnPct;
        acc.churnOficinasCount += 1;
        return acc;
      },
      {
        total: 0,
        activas: 0,
        nuevas: 0,
        bajas: 0,
        churnSumaPct: 0,
        churnOficinasCount: 0,
      }
    );
  }, [oficinasData]);

  const churnPromedio =
    totales.churnOficinasCount > 0 ? totales.churnSumaPct / totales.churnOficinasCount : 0;

  const oficinasOptions = useMemo(() => {
    const set = new Set();
    oficinasData.forEach((o) => {
      if (o.oficina) set.add(o.oficina);
    });
    return Array.from(set).sort();
  }, [oficinasData]);

  const handleMesChange = (value) => {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) setMes(n);
  };

  const handleAnioChange = (value) => {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 2000 && n <= hoy.getFullYear() + 1) {
      setAnio(n);
    }
  };

  const periodoLabel =
    periodo || `${mes.toString().padStart(2, "0")}/${anio.toString().padStart(4, "0")}`;

  const openVehiculosExport = (defaults) => {
    setVehiculosExportDefaults(defaults || null);
    setShowVehiculosExport(true);
  };

  return (
    <>
      <EstadisticasHeader
        periodoLabel={periodoLabel}
        fuenteRespuesta={fuenteRespuesta}
        loading={loading}
        onRefresh={fetchEstadisticas}
        onOpenExport={() => setShowExport(true)}
      />

      <EstadisticasFilters
        oficina={oficina}
        setOficina={setOficina}
        oficinasOptions={oficinasOptions.length ? oficinasOptions : OFICINAS.map((o) => o.id)}
        anio={anio}
        onAnioChange={handleAnioChange}
        mes={mes}
        onMesChange={handleMesChange}
        fuenteSnapshot={fuenteSnapshot}
        setFuenteSnapshot={setFuenteSnapshot}
        desde={desde}
        hasta={hasta}
      />

      {error && (
        <AnimatedCard index={2} interactive={false} glow="from-rose-500/50 via-red-500/30 to-transparent">
          <div className="rounded-xl border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs sm:text-sm text-rose-100">
            {error}
          </div>
        </AnimatedCard>
      )}

      <EstadisticasSummaryCards totales={totales} churnPromedio={churnPromedio} />

      <OficinasTable
        oficinasData={oficinasData}
        getOficinaNombre={getOficinaNombre}
        formatMixPercent={formatMixPercent}
      />

      <AltasPolizasPanel
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaultOficina={oficina}
      />

      <VehiculosPanel
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaultOficina={oficina}
        onOpenExport={openVehiculosExport}
      />

      <FutureModulesCard />

      <AseguradosExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        apiBase={apiBase}
        oficinas={OFICINAS}
        defaultOficina={oficina}
        getOficinaNombre={getOficinaNombre}
      />

      <VehiculosExportModal
        open={showVehiculosExport}
        onClose={() => setShowVehiculosExport(false)}
        apiBase={apiBase}
        oficinas={OFICINAS}
        getOficinaNombre={getOficinaNombre}
        defaults={vehiculosExportDefaults}
      />
    </>
  );
}

export default function EstadisticasPage() {
  const apiBase = useMemo(() => getApiBase(), []);

  // ✅ Tab persistente
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem("estadisticas.tab") || "general";
    } catch {
      return "general";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("estadisticas.tab", tab);
    } catch {}
  }, [tab]);

  // ✅ Oficina compartida entre tabs
  const [oficina, setOficina] = useState("");

  return (
    <motion.div
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950 px-4 py-6 sm:px-6 lg:px-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        {ORBS.map((orb, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full bg-sky-400/10 blur-2xl shadow-[0_0_60px_rgba(56,189,248,0.35)]"
            style={{
              top: orb.top,
              left: orb.left,
              width: orb.size,
              height: orb.size,
            }}
            animate={{
              y: ["-10px", "15px", "-10px"],
              x: ["0px", idx % 2 === 0 ? "10px" : "-10px", "0px"],
              opacity: [0.55, 0.95, 0.55],
            }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-4">
        {/* ✅ Menú interno */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>
            General
          </TabButton>
          <TabButton active={tab === "calidad"} onClick={() => setTab("calidad")}>
            Calidad de datos
          </TabButton>
          <TabButton active={tab === "duplicados"} onClick={() => setTab("duplicados")}>
            Duplicados
          </TabButton>
          <TabButton active={tab === "asegurados"} onClick={() => setTab("asegurados")}>
            Asegurados
          </TabButton>
          <TabButton active={tab === "contabilidad"} onClick={() => setTab("contabilidad")}>
            Contabilidad
          </TabButton>

          <div className="ml-auto hidden md:block text-[11px] text-slate-400 pr-2">
            Tip: la oficina se comparte entre módulos.
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === "general" && (
            <motion.div
              key="general"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <EstadisticasGeneralPanel apiBase={apiBase} oficina={oficina} setOficina={setOficina} />
            </motion.div>
          )}

          {tab === "calidad" && (
            <motion.div
              key="calidad"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <CalidadDatosPanel apiBase={apiBase} oficina={oficina} setOficina={setOficina} />
            </motion.div>
          )}

          {tab === "duplicados" && (
            <motion.div
              key="duplicados"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <DuplicadosPolizasPanel apiBase={apiBase} oficina={oficina} setOficina={setOficina} />
            </motion.div>
          )}

          {tab === "asegurados" && (
            <motion.div
              key="asegurados"
              className="flex flex-col gap-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* ✅ INTEGRADO: Nuevo panel de distribución */}
              <DistribucionPanel apiBase={apiBase} oficina={oficina} />
            </motion.div>
          )}

          {tab === "contabilidad" && (
            <motion.div
              key="contabilidad"
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-semibold">Contabilidad / Caja</div>
              <div className="mt-2 text-[12px] text-slate-400">
                Próximo paso: ingresos/egresos por oficina, por medio de cobro y comparativos.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}