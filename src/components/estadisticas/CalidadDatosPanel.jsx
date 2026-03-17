// src/components/estadisticas/CalidadDatosPanel.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedCard from "./AnimatedCard";

export default function CalidadDatosPanel({ apiBase, oficina, setOficina, oficinasList, getOficinaNombre }) {
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

  const totalPages = Math.max(1, Math.ceil(Number(count || 0) / Number(pageSize || 25)));

  const oficinasValidas = Array.isArray(oficinasList) ? oficinasList : [];

  useEffect(() => { setPage(1); }, [oficina, pageSize, ordering]);

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
      const url = `${apiBase}clientes/sin-telefono/resumen/${qs.toString() ? `?${qs.toString()}` : ""}`;
      const token = localStorage.getItem('access_token');
      const res = await fetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResumen(data || null);
    } catch (e) {
      setResumen(null);
      setErrorResumen("No se pudo cargar el resumen.");
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
      const token = localStorage.getItem('access_token');
      const res = await fetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setItems(results);
      setCount(Number(data?.count ?? results.length ?? 0) || 0);
    } catch (e) {
      setItems([]);
      setCount(0);
      setErrorList("No se pudo cargar el listado.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchResumen(); }, [oficina]);
  useEffect(() => { fetchListado(); }, [oficina, page, pageSize, ordering]);

  useEffect(() => {
    const id = setTimeout(() => { setPage(1); fetchListado(); }, 350);
    return () => clearTimeout(id);
  }, [search]);

  const pct = Number(resumen?.total || 0) > 0 ? ((Number(resumen?.sin_telefono || 0) / Number(resumen?.total || 1)) * 100).toFixed(2) : "0.00";

  const downloadCsv = () => {
    const rows = items.map((c) => ({
      id: c?.id ?? "", apellido: c?.apellido ?? "", nombre: c?.nombre ?? "",
      dni_cuit_cuil: c?.dni_cuit_cuil ?? "", telefono: c?.telefono ?? "", email: c?.email ?? "", estado: c?.estado ?? "",
    }));

    const header = Object.keys(rows[0] || { id: "", apellido: "", nombre: "", dni_cuit_cuil: "", telefono: "", email: "", estado: "" });
    const csv = [
      header.join(","),
      ...rows.map((r) => header.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))
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
    const table = `<table><thead><tr><th>ID</th><th>Apellido</th><th>Nombre</th><th>DNI/CUIT</th><th>Teléfono</th><th>Email</th><th>Estado</th></tr></thead><tbody>${items.map((c) => `<tr><td>${c?.id ?? ""}</td><td>${c?.apellido ?? ""}</td><td>${c?.nombre ?? ""}</td><td>${c?.dni_cuit_cuil ?? ""}</td><td>${c?.telefono ?? ""}</td><td>${c?.email ?? ""}</td><td>${c?.estado ?? ""}</td></tr>`).join("")}</tbody></table>`;
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
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Calidad de datos — Asegurados sin teléfono</div>
          <div className="text-[11px] text-slate-400">Detecta clientes con teléfono vacío y te permite contactarlos.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* BOTONES DE ACCIÓN RÁPIDA */}
          <button type="button" onClick={() => { fetchResumen(); fetchListado(); }} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10">Refrescar</button>
          <button type="button" onClick={downloadCsv} disabled={!items.length} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">CSV (página)</button>
          <button type="button" onClick={downloadExcel} disabled={!items.length} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Excel (página)</button>
        </div>
      </div>

      <AnimatedCard index={2} glow="from-sky-500/40 via-fuchsia-500/20 to-transparent">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Sin teléfono</div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">{loadingResumen ? "…" : Number(resumen?.sin_telefono || 0).toLocaleString("es-AR")}</div>
            <div className="mt-1 text-[11px] text-slate-400">{oficina ? `Oficina: ${getOficinaNombre(oficina)}` : "Todas las oficinas"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Total (scope)</div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">{loadingResumen ? "…" : Number(resumen?.total || 0).toLocaleString("es-AR")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">% sin teléfono</div>
            <div className="mt-1 text-3xl font-semibold text-slate-50">{loadingResumen ? "…" : `${pct}%`}</div>
          </div>
        </div>
      </AnimatedCard>

      <AnimatedCard index={3} glow="from-emerald-500/35 via-cyan-500/15 to-transparent">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Listado (paginado)</div>
              <div className="text-[11px] text-slate-400">Total encontrados: <span className="font-semibold text-slate-200">{Number(count || 0).toLocaleString("es-AR")}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="h-9 w-[260px] max-w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none" />
              <select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="h-9 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-sm text-slate-100 outline-none">
                <option value="-id">Más nuevos</option><option value="id">Más viejos</option><option value="apellido">Apellido A→Z</option><option value="-apellido">Apellido Z→A</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/30">
            <table className="min-w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400"><tr className="border-b border-white/10"><th className="px-3 py-2 text-left">Asegurado</th><th className="px-3 py-2 text-left">Teléfono</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
              <tbody className="text-slate-200">
                {loadingList ? <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>Cargando…</td></tr> : items.length === 0 ? <tr><td className="px-3 py-3 text-slate-400" colSpan={3}>No hay resultados.</td></tr> : items.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-3 py-2"><div className="font-semibold text-slate-100">{`${c.apellido || ""} ${c.nombre || ""}`.trim() || "—"}</div></td>
                    <td className="px-3 py-2 text-rose-200 font-semibold">{c.telefono ? c.telefono : "— (vacío)"}</td>
                    <td className="px-3 py-2 text-right"><button type="button" onClick={() => goCliente(c.id)} className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10">Abrir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-400">Página <span className="font-semibold text-slate-200">{page}</span> / <span className="font-semibold text-slate-200">{totalPages}</span></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Anterior</button>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60">Siguiente</button>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
}