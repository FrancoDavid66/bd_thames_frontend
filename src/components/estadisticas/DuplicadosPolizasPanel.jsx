// src/components/estadisticas/DuplicadosPolizasPanel.jsx  (diseño Duo)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineClipboardCopy, HiRefresh, HiChevronLeft, HiChevronRight, HiArrowRight, HiExclamationCircle } from "react-icons/hi";
import * as XLSX from "xlsx";

const clamp   = (n, a, b) => Math.max(a, Math.min(b, n));
const safeStr = (v) => String(v ?? "").trim();

const copyText = async (text) => {
  const t = safeStr(text);
  if (!t) return;
  try { await navigator.clipboard.writeText(t); } catch {}
};

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

async function fetchFirstOk(urls) {
  for (const url of urls.filter(Boolean)) {
    try {
      const r = await fetch(url, { headers: authH() });
      if (r.status === 404) continue;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch {}
  }
  throw new Error("No se pudo cargar");
}

const CRITERIOS = [
  { value: "numero_poliza_compania", label: "N° póliza + compañía" },
  { value: "numero_poliza",          label: "N° póliza" },
  { value: "patente_activa",         label: "Patente (activas)" },
  { value: "patente",                label: "Patente (todas)" },
  { value: "cliente_patente_activa", label: "Cliente + patente (activas)" },
  { value: "cliente_patente",        label: "Cliente + patente (todas)" },
];

export default function DuplicadosPolizasPanel({ apiBase, oficina, getOficinaNombre }) {
  const navigate = useNavigate();

  const [por,       setPor]       = useState("numero_poliza_compania");
  const [perGroup,  setPerGroup]  = useState(12);
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);
  const [resumen,   setResumen]   = useState(null);
  const [grupos,    setGrupos]    = useState([]);
  const [resolverItems, setResolverItems] = useState(null); // pólizas del grupo a resolver
  const [resolverActiva, setResolverActiva] = useState(null); // id que queda activa
  const [resolviendo, setResolviendo] = useState(false);
  const [count,     setCount]     = useState(0);
  const [totalPgs,  setTotalPgs]  = useState(1);
  const [loadRes,   setLoadRes]   = useState(false);
  const [loadList,  setLoadList]  = useState(false);
  const [error,     setError]     = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { setPage(1); }, [oficina, por, pageSize]);

  const fetchResumen = async () => {
    setLoadRes(true); setError("");
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);
      const s = `polizas/duplicadas/resumen/${qs.toString() ? `?${qs}` : ""}`;
      setResumen(await fetchFirstOk([`${apiBase}${s}`, `${apiBase}polizas/${s}`]));
    } catch { setError("No se pudo cargar el resumen."); }
    finally   { setLoadRes(false); }
  };

  const fetchListado = async () => {
    setLoadList(true); setError("");
    try {
      const qs = new URLSearchParams({ por, page: String(page), page_size: String(pageSize), per_group: String(clamp(Number(perGroup || 12), 5, 200)) });
      if (oficina) qs.set("oficina", oficina);
      const s = `polizas/duplicadas/?${qs}`;
      const d = await fetchFirstOk([`${apiBase}${s}`, `${apiBase}polizas/${s}`]);
      const raw = Array.isArray(d?.results) ? d.results : [];
      const norm = raw.map(g => {
        const items = Array.isArray(g?.items) ? g.items : Array.isArray(g?.rows) ? g.rows : [];
        let keyStr = typeof g?.key === "string" ? g.key : "";
        if (g?.key && typeof g.key === "object" && !Array.isArray(g.key))
          keyStr = Object.entries(g.key).map(([k,v]) => `${k}: ${v??""}`).join(" · ");
        return { ...g, _keyStr: keyStr, _items: items };
      });
      const cnt = Number(d?.count_groups ?? d?.count ?? 0) || 0;
      setGrupos(norm);
      setCount(cnt);
      setTotalPgs(Math.max(1, Math.ceil(cnt / Math.max(1, Number(pageSize || 10)))));
    } catch { setGrupos([]); setCount(0); setTotalPgs(1); setError("No se pudo cargar el listado."); }
    finally   { setLoadList(false); }
  };

  // 🚀 Descarga TODOS los grupos del criterio elegido (recorre todas las páginas).
  const descargarTodo = async () => {
    if (downloading) return;
    setDownloading(true); setError("");
    try {
      const PAGE = 200;
      let pageN = 1, total = Infinity;
      const filas = [];
      const criterioLabel = CRITERIOS.find(c => c.value === por)?.label || por;
      const ofiName = (v) => { try { return getOficinaNombre ? (getOficinaNombre(v) || "") : (v ?? ""); } catch { return v ?? ""; } };

      while ((pageN - 1) * PAGE < total) {
        const qs = new URLSearchParams({ por, page: String(pageN), page_size: String(PAGE), per_group: "200" });
        if (oficina) qs.set("oficina", oficina);
        const s = `polizas/duplicadas/?${qs}`;
        const d = await fetchFirstOk([`${apiBase}${s}`, `${apiBase}polizas/${s}`]);
        const raw = Array.isArray(d?.results) ? d.results : [];
        total = Number(d?.count_groups ?? d?.count ?? raw.length) || raw.length;

        raw.forEach(g => {
          const items = Array.isArray(g?.items) ? g.items : Array.isArray(g?.rows) ? g.rows : [];
          let keyStr = typeof g?.key === "string" ? g.key : "";
          if (g?.key && typeof g.key === "object" && !Array.isArray(g.key))
            keyStr = Object.entries(g.key).map(([k, v]) => `${k}: ${v ?? ""}`).join(" · ");
          items.forEach(it => {
            filas.push({
              "Criterio": criterioLabel,
              "Clave duplicada": keyStr || "—",
              "ID Póliza": it?.id ?? "",
              "N° Póliza": it?.numero_poliza || "",
              "Compañía": it?.compania || "",
              "Patente": it?.patente || "",
              "Estado": it?.estado || "",
              "Cliente": it?.cliente?.nombre || "",
              "DNI/CUIT": it?.cliente?.dni_cuit_cuil || "",
              "Oficina": ofiName(it?.oficina),
              "Emisión": it?.fecha_emision || "",
              "Vencimiento": it?.fecha_vencimiento || "",
            });
          });
        });

        if (raw.length === 0) break;
        pageN++;
        if (pageN > 200) break; // tope de seguridad
      }

      if (filas.length === 0) { setError("No hay duplicados para descargar con este criterio."); return; }

      const ws = XLSX.utils.json_to_sheet(filas);
      ws["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 10 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Duplicados");
      const hoy = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Duplicados_Polizas_${por}_${hoy}.xlsx`);
    } catch {
      setError("No se pudo generar la descarga.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => { fetchResumen(); }, [oficina]);

  // Abrir modal de "Resolver": elige por defecto la de vencimiento más lejano (la vigente real)
  const abrirResolver = (items) => {
    const activas = (items || []).filter(it => String(it.estado) === "activa");
    const base = activas.length ? activas : (items || []);
    const fecha = (it) => {
      const d = it?.fecha_vencimiento ? new Date(it.fecha_vencimiento) : null;
      return d && !isNaN(d) ? d.getTime() : -Infinity;
    };
    let def = base[0];
    base.forEach(it => { if (fecha(it) > fecha(def) || (fecha(it) === fecha(def) && Number(it.id) > Number(def?.id || 0))) def = it; });
    setResolverItems(items || []);
    setResolverActiva(def?.id ?? null);
  };

  const ejecutarResolver = async () => {
    if (resolviendo || !resolverActiva || !resolverItems) return;
    const vencer = resolverItems.map(it => it.id).filter(id => id !== resolverActiva);
    if (!vencer.length) { setResolverItems(null); return; }
    setResolviendo(true); setError("");
    try {
      const res = await fetch(`${apiBase}polizas/resolver-duplicado/`, {
        method: "POST",
        headers: { ...authH(), "Content-Type": "application/json" },
        body: JSON.stringify({ activa_id: resolverActiva, vencer_ids: vencer }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        throw new Error(msg);
      }
      setResolverItems(null);
      setResolverActiva(null);
      fetchResumen();
      fetchListado();
    } catch (e) {
      setError(`No se pudo resolver: ${e.message || "error"}`);
    } finally {
      setResolviendo(false);
    }
  };
  useEffect(() => { fetchListado(); }, [oficina, por, page, pageSize, perGroup]);

  const resCards = useMemo(() => {
    const r = resumen || {};
    return CRITERIOS.map(c => ({ ...c, v: Number(r[c.value] || 0) }));
  }, [resumen]);

  const totalPagesN = Math.max(1, Number(totalPgs || 1));

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-titulo dark:text-titulo-dark">Duplicados</h2>
          <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">Grupos de pólizas con datos repetidos — ideal para limpiar la base</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Criterio */}
          <select
            value={por}
            onChange={e => setPor(e.target.value)}
            className="h-9 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-xl px-2.5 text-xs font-bold text-titulo dark:text-titulo-dark outline-none focus:border-oficina cursor-pointer dark:[color-scheme:dark]"
          >
            {CRITERIOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button onClick={descargarTodo} disabled={downloading || loadList}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl border-2 border-ingreso bg-ingreso text-white text-xs font-black hover:bg-ingreso-fuerte shadow-[0_4px_0_var(--color-ingreso-fuerte)] active:shadow-[0_0_0_var(--color-ingreso-fuerte)] active:translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all">
            {downloading ? "Descargando…" : "Descargar todo"}
          </button>
          <button onClick={() => { fetchResumen(); fetchListado(); }} disabled={loadRes || loadList}
            className="h-9 w-9 flex items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition-colors">
            <HiRefresh className={`text-sm ${(loadRes || loadList) ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border-2 border-egreso/30 bg-egreso/10 px-4 py-3 text-xs font-bold text-egreso dark:text-egreso-claro">
          <HiExclamationCircle className="shrink-0" /> {error}
        </div>
      )}

      {/* Resumen KPIs — clickables para cambiar criterio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {resCards.map((c, i) => (
          <motion.button
            key={c.value}
            type="button"
            onClick={() => setPor(c.value)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={`rounded-2xl border-2 p-4 text-left transition-all ${
              por === c.value
                ? "border-oficina bg-oficina/[0.08] ring-2 ring-oficina/20"
                : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-oficina/50"
            }`}
          >
            <div className={`text-[10px] font-black uppercase tracking-wider mb-2 ${por === c.value ? "text-oficina" : "text-suave dark:text-suave-dark"}`}>
              {c.label}
            </div>
            <div className={`text-3xl font-black tabular-nums ${loadRes ? "text-suave dark:text-suave-dark" : por === c.value ? "text-oficina" : "text-titulo dark:text-titulo-dark"}`}>
              {loadRes ? "—" : c.v.toLocaleString("es-AR")}
            </div>
            <div className="text-[10px] font-bold text-suave dark:text-suave-dark mt-1">grupos duplicados</div>
          </motion.button>
        ))}
      </div>

      {/* Listado grupos */}
      <div className="rounded-2xl border-2 border-linea dark:border-linea-dark overflow-hidden bg-card dark:bg-card-dark">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
          <div>
            <span className="text-xs font-black text-titulo dark:text-titulo-dark">Grupos — {CRITERIOS.find(c => c.value === por)?.label}</span>
            <span className="ml-2 text-[10px] font-bold text-suave dark:text-suave-dark">{count.toLocaleString("es-AR")} grupos</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={perGroup} onChange={e => setPerGroup(Number(e.target.value) || 12)}
              className="h-8 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-lg px-2 text-[10px] font-bold text-suave dark:text-suave-dark outline-none dark:[color-scheme:dark]">
              {[8,12,25,50].map(v => <option key={v} value={v}>{v} por grupo</option>)}
            </select>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value) || 10)}
              className="h-8 bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-lg px-2 text-[10px] font-bold text-suave dark:text-suave-dark outline-none dark:[color-scheme:dark]">
              {[5,10,25].map(v => <option key={v} value={v}>{v} grupos/pág</option>)}
            </select>
          </div>
        </div>

        {/* Grupos */}
        <div className="divide-y-2 divide-linea/40 dark:divide-linea-dark/40">
          {loadList ? (
            <div className="py-10 text-center text-xs text-suave dark:text-suave-dark font-bold">Cargando...</div>
          ) : grupos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ingreso font-black">¡Sin duplicados!</p>
              <p className="text-xs font-bold text-suave dark:text-suave-dark mt-1">No hay grupos duplicados con este criterio.</p>
            </div>
          ) : grupos.map((g, idx) => {
            const items  = g._items || [];
            const keyStr = g._keyStr;
            return (
              <div key={`${keyStr}-${idx}`} className="p-5">
                {/* Cabecera grupo */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wider mb-0.5">Clave duplicada</div>
                    <div className="text-sm font-black text-egreso">{keyStr || "—"}</div>
                    <div className="text-[10px] font-bold text-suave dark:text-suave-dark mt-0.5">{Number(g?.count || items.length || 0)} pólizas</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {items.filter(it => String(it.estado) === "activa").length > 1 && (
                      <button onClick={() => abrirResolver(items)}
                        className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl border-2 border-tarjeta bg-tarjeta text-white font-black hover:bg-[#d97706] shadow-[0_3px_0_#d97706] active:shadow-[0_0_0_#d97706] active:translate-y-0.5 transition-all text-[10px]">
                        Resolver
                      </button>
                    )}
                    <button onClick={() => copyText(keyStr)}
                      className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina transition-colors text-[10px] font-black">
                      <HiOutlineClipboardCopy className="text-xs" /> Copiar
                    </button>
                  </div>
                </div>

                {/* Mini tabla del grupo */}
                <div className="rounded-xl border-2 border-linea dark:border-linea-dark overflow-hidden">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
                        <th className="px-3 py-2 text-left text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wider">Póliza</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wider">Cliente</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wider">Patente</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wider">Oficina</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black text-suave dark:text-suave-dark uppercase tracking-wider">Estado</th>
                        <th className="px-3 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-linea/40 dark:divide-linea-dark/40">
                      {items.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-suave dark:text-suave-dark text-[10px] font-bold">Sin ítems. Aumentá "por grupo".</td></tr>
                      ) : items.map(it => (
                        <tr key={it.id} className="hover:bg-oficina/5 transition-colors group">
                          <td className="px-3 py-2.5">
                            <button onClick={() => navigate(`/polizas/${it.id}`)} className="font-black text-oficina hover:text-oficina-fuerte transition-colors text-left">
                              #{it.id}{it.numero_poliza ? ` · ${it.numero_poliza}` : ""}
                            </button>
                            {it.compania && <div className="text-[10px] font-bold text-suave dark:text-suave-dark">{it.compania}</div>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-titulo dark:text-titulo-dark">{it?.cliente?.nombre || "—"}</div>
                            {it?.cliente?.dni_cuit_cuil && <div className="text-[10px] font-bold text-suave dark:text-suave-dark">{it.cliente.dni_cuit_cuil}</div>}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-suave dark:text-suave-dark">{it.patente || "—"}</td>
                          <td className="px-3 py-2.5 font-bold text-suave dark:text-suave-dark">{getOficinaNombre ? (getOficinaNombre(it.oficina) || "—") : (it.oficina ?? "—")}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] font-black ${it.estado === "activa" ? "text-ingreso" : "text-suave dark:text-suave-dark"}`}>
                              {it.estado || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button onClick={() => navigate(`/polizas/${it.id}`)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-oficina hover:text-oficina-fuerte text-[10px] font-black">
                              Ver <HiArrowRight className="text-xs" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginación */}
        {totalPagesN > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark">
            <span className="text-[10px] font-bold text-suave dark:text-suave-dark">Página {page} de {totalPagesN}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina disabled:opacity-30 transition-colors">
                <HiChevronLeft className="text-xs" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPagesN, p + 1))} disabled={page >= totalPagesN}
                className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-oficina hover:text-oficina disabled:opacity-30 transition-colors">
                <HiChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Resolver doble cobertura activa ── */}
      {resolverItems && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={() => !resolviendo && setResolverItems(null)}>
          <div className="w-full max-w-lg bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b-2 border-linea dark:border-linea-dark">
              <h3 className="text-base font-black text-titulo dark:text-titulo-dark">Resolver duplicado</h3>
              <p className="text-xs font-bold text-suave dark:text-suave-dark mt-0.5">Elegí la póliza que queda <b className="text-ingreso">activa</b>. Las demás pasan a <b className="text-titulo dark:text-titulo-dark">finalizada</b> (no se borran).</p>
            </div>

            <div className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
              {resolverItems.map(it => {
                const sel = it.id === resolverActiva;
                return (
                  <label key={it.id}
                    className={`flex items-start gap-3 rounded-2xl border-2 p-3 cursor-pointer transition-colors ${sel ? "border-ingreso bg-ingreso/10" : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark hover:border-ingreso/50"}`}>
                    <input type="radio" name="activa" checked={sel} onChange={() => setResolverActiva(it.id)} className="mt-1 accent-[var(--color-ingreso)]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-titulo dark:text-titulo-dark font-black">#{it.id}{it.numero_poliza ? ` · ${it.numero_poliza}` : ""}</div>
                      <div className="text-[11px] font-bold text-suave dark:text-suave-dark">
                        {it.compania ? `${it.compania} · ` : ""}
                        {it.fecha_emision ? `emisión ${it.fecha_emision}` : ""}
                        {it.fecha_vencimiento ? ` · vence ${it.fecha_vencimiento}` : ""}
                      </div>
                      <div className="text-[10px] mt-0.5 font-black">
                        <span className={it.estado === "activa" ? "text-ingreso" : "text-suave dark:text-suave-dark"}>estado actual: {it.estado || "—"}</span>
                        {sel && <span className="ml-2 text-ingreso">→ queda ACTIVA</span>}
                        {!sel && <span className="ml-2 text-egreso">→ pasa a finalizada</span>}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark flex items-center justify-end gap-2">
              <button onClick={() => setResolverItems(null)} disabled={resolviendo}
                className="h-10 px-4 rounded-xl border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-sm font-black hover:border-egreso hover:text-egreso disabled:opacity-50 transition-colors">
                Cancelar
              </button>
              <button onClick={ejecutarResolver} disabled={resolviendo || !resolverActiva}
                className="h-10 px-4 rounded-xl bg-tarjeta text-white text-sm font-black border-2 border-tarjeta shadow-[0_4px_0_#d97706] active:shadow-[0_0_0_#d97706] active:translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all">
                {resolviendo ? "Aplicando…" : "Resolver ahora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
