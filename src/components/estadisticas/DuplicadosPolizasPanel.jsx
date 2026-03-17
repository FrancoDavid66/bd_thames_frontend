// src/components/estadisticas/DuplicadosPolizasPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedCard from "./AnimatedCard";
import { HiOutlineClipboardCopy } from "react-icons/hi";

// Funciones de utilidad aisladas para este panel
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
    } catch {}
  }
};

async function fetchFirstOkJson(urls, fetchOptions = {}) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  let lastErr = null;
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  const headers = {
    ...fetchOptions.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  for (const url of list) {
    try {
      const res = await fetch(url, { ...fetchOptions, headers });
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

export default function DuplicadosPolizasPanel({ apiBase, oficina, getOficinaNombre }) {
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

  useEffect(() => { setPage(1); }, [oficina, por, pageSize]);

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
      const data = await fetchFirstOkJson([`${apiBase}${suffix}`, `${apiBase}polizas/${suffix}`]);
      setResumen(data || null);
    } catch (e) {
      setResumen(null);
      setError("No se pudo cargar el resumen de duplicados.");
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
      const data = await fetchFirstOkJson([`${apiBase}${suffix}`, `${apiBase}polizas/${suffix}`]);

      const resultsRaw = Array.isArray(data?.results) ? data.results : [];
      const normalized = resultsRaw.map((g) => {
        const items = Array.isArray(g?.items) ? g.items : Array.isArray(g?.rows) ? g.rows : [];
        let keyStr = typeof g?.key === "string" ? g.key : "";
        if (g?.key && typeof g.key === "object" && !Array.isArray(g.key)) {
          keyStr = Object.entries(g.key).map(([k, v]) => `${k}: ${v ?? "—"}`).join(" · ");
        }
        return { ...g, _keyStr: keyStr, _items: items };
      });

      const groupsCount = Number(data?.count_groups ?? data?.count ?? 0) || 0;
      setGrupos(normalized);
      setCount(groupsCount);
      setTotalPages(Math.max(1, Math.ceil(groupsCount / Math.max(1, Number(pageSize || 10)))));
    } catch (e) {
      setGrupos([]);
      setCount(0);
      setTotalPages(1);
      setError("No se pudo cargar el listado de duplicados.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchResumen(); }, [oficina]);
  useEffect(() => { fetchListado(); }, [oficina, por, page, pageSize, perGroup]);

  const resumenCards = useMemo(() => {
    const r = resumen || {};
    return [
      { k: "numero_poliza_compania", label: "N° + Compañía", v: Number(r.numero_poliza_compania || 0) },
      { k: "numero_poliza", label: "N° póliza", v: Number(r.numero_poliza || 0) },
      { k: "patente_activa", label: "Patente (activas)", v: Number(r.patente_activa || 0) },
      { k: "cliente_patente_activa", label: "Cliente+Patente", v: Number(r.cliente_patente_activa || 0) },
    ];
  }, [resumen]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Duplicados — Pólizas</div>
          <div className="text-[11px] text-slate-400">Grupos duplicados por criterio. Ideal para limpiar la base de datos.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Criterio</label>
            <select value={por} onChange={(e) => setPor(e.target.value)} className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40">
              <option value="numero_poliza_compania">N° póliza + compañía</option>
              <option value="numero_poliza">N° póliza</option>
              <option value="patente_activa">Patente (activas)</option>
              <option value="cliente_patente_activa">Cliente + patente (activas)</option>
            </select>
          </div>

          <button type="button" onClick={() => { fetchResumen(); fetchListado(); }} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10">Refrescar</button>
        </div>
      </div>

      <AnimatedCard index={2} interactive={false} glow="from-rose-500/35 via-fuchsia-500/15 to-transparent">
        <div className="grid gap-3 md:grid-cols-4">
          {resumenCards.map((c) => (
            <button key={c.k} type="button" onClick={() => setPor(c.k)} className={["rounded-2xl border p-4 text-left transition", por === c.k ? "border-sky-400/40 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"].join(" ")}>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">{c.label}</div>
              <div className="mt-1 text-3xl font-semibold text-slate-50">{loadingResumen ? "…" : c.v.toLocaleString("es-AR")}</div>
              <div className="mt-1 text-[11px] text-slate-400">{oficina ? `Oficina: ${getOficinaNombre(oficina)}` : "Todas las oficinas"}</div>
            </button>
          ))}
        </div>
        {error && <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">{error}</div>}
      </AnimatedCard>

      {/* Tabla sin zoom effect interactivo */}
      <AnimatedCard index={3} interactive={false} glow="from-emerald-500/30 via-cyan-500/15 to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Grupos Encontrados ({keyToLabel(por)})</div>
              <div className="text-[11px] text-slate-400">Total grupos: <span className="font-semibold text-slate-200">{Number(count || 0).toLocaleString("es-AR")}</span></div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] text-slate-400">Items por grupo</label>
              <select value={perGroup} onChange={(e) => setPerGroup(Number(e.target.value) || 12)} className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40">
                <option value={8}>8</option><option value={12}>12</option><option value={25}>25</option><option value={50}>50</option>
              </select>

              <label className="text-[11px] text-slate-400">Grupos por página</label>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) || 10)} className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none focus:border-sky-400/40">
                <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {loadingList ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Cargando…</div>
            ) : grupos.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">¡Genial! No hay duplicados con estos filtros.</div>
            ) : (
              grupos.map((g, idx) => {
                const items = Array.isArray(g?._items) ? g._items : [];
                const keyStr = safeStr(g?._keyStr);
                return (
                  <div key={`${keyStr || "group"}-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">Clave de duplicidad</div>
                        <div className="mt-1 font-bold text-rose-400">{keyStr || "—"}</div>
                        <div className="mt-1 text-[11px] text-slate-400">Pólizas encontradas: <span className="font-semibold text-slate-200">{Number(g?.count || items.length || 0).toLocaleString("es-AR")}</span></div>
                      </div>
                      <button type="button" onClick={() => copyText(keyStr)} className="h-9 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/30 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-slate-950/50">
                        <HiOutlineClipboardCopy /> Copiar
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
                            <tr><td className="px-3 py-3 text-slate-400" colSpan={5}>Sin items (raro). Probá subir per_group.</td></tr>
                          ) : (
                            items.map((it) => (
                              <tr key={it.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="px-3 py-2">
                                  {/* 🚀 ACÁ ESTÁ EL LINK CLICKABLE NUEVO */}
                                  <button 
                                    type="button"
                                    onClick={() => goPoliza(it.id)}
                                    className="font-semibold text-sky-400 hover:text-sky-300 transition-colors text-left hover:underline"
                                  >
                                    #{it.id} {it.numero_poliza ? `- ${it.numero_poliza}` : ""}
                                  </button>
                                  <div className="text-[11px] text-slate-400">{it.compania ? `Cía: ${it.compania}` : ""}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-slate-100">{it?.cliente?.nombre || "—"}</div>
                                  <div className="text-[11px] text-slate-400">DNI: {it?.cliente?.dni_cuit_cuil || "—"}</div>
                                </td>
                                <td className="px-3 py-2">{it.patente || "—"}</td>
                                <td className="px-3 py-2">{it.estado || "—"}</td>
                                <td className="px-3 py-2 text-right">
                                  <button type="button" onClick={() => goPoliza(it.id)} className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10">Abrir Póliza</button>
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
            <div className="text-[11px] text-slate-400">Página <span className="font-semibold text-slate-200">{page}</span> / <span className="font-semibold text-slate-200">{Math.max(1, Number(totalPages || 1))}</span></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Anterior</button>
              <button type="button" onClick={() => setPage((p) => Math.min(Math.max(1, Number(totalPages || 1)), p + 1))} disabled={page >= Math.max(1, Number(totalPages || 1))} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Siguiente</button>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}