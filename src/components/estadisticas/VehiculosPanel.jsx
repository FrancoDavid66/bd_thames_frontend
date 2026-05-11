// src/components/estadisticas/VehiculosPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { HiTruck, HiOfficeBuilding, HiCalendar, HiSearch, HiDownload, HiShieldCheck, HiRefresh, HiChevronLeft, HiChevronRight } from "react-icons/hi";

const tok   = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => tok() ? { Authorization: `Bearer ${tok()}` } : {};
const bool  = (v) => v ? "1" : "0";
const TIPOS = ["", "Auto", "Camioneta", "Camion", "Moto", "Trailer"];

function SmallInput({ label, icon: Icon, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">{Icon && <Icon className="text-xs" />}{label}</label>}
      <input {...props} className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2.5 text-xs text-slate-300 outline-none focus:border-slate-600 placeholder:text-slate-700 transition-colors" />
    </div>
  );
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 flex-1 rounded-full bg-slate-800 overflow-hidden">
      <motion.div className="h-full rounded-full bg-sky-500/60" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
    </div>
  );
}

export default function VehiculosPanel({ apiBase, oficinas, getOficinaNombre, defaultOficina = "", onOpenExport }) {
  const [oficina,   setOficina]   = useState(defaultOficina || "");
  const [tipo,      setTipo]      = useState("");
  const [anio,      setAnio]      = useState("");
  const [anioDesde, setAnioDesde] = useState("");
  const [anioHasta, setAnioHasta] = useState("");
  const [marca,     setMarca]     = useState("");
  const [modelo,    setModelo]    = useState("");
  const [patente,   setPatente]   = useState("");
  const [soloAct,   setSoloAct]   = useState(true);
  const [resumen,   setResumen]   = useState(null);
  const [listData,  setListData]  = useState({ results: [], count: 0, total_pages: 1 });
  const [loadRes,   setLoadRes]   = useState(false);
  const [loadList,  setLoadList]  = useState(false);
  const [page,      setPage]      = useState(1);
  const debRef = useRef(null);

  useEffect(() => { setOficina(defaultOficina || ""); }, [defaultOficina]);

  const filtros = useMemo(() => ({ oficina, tipo, anio, anio_desde: anioDesde, anio_hasta: anioHasta, marca, modelo, patente, solo_activas: soloAct }),
    [oficina, tipo, anio, anioDesde, anioHasta, marca, modelo, patente, soloAct]);

  const buildParams = (f, extra = {}) => {
    const p = new URLSearchParams();
    if (f.oficina)    p.set("oficina",    f.oficina);
    if (f.tipo)       p.set("tipo",       f.tipo);
    if (f.anio)       p.set("anio",       f.anio);
    if (f.anio_desde) p.set("anio_desde", f.anio_desde);
    if (f.anio_hasta) p.set("anio_hasta", f.anio_hasta);
    if (f.marca)      p.set("marca",      f.marca);
    if (f.modelo)     p.set("modelo",     f.modelo);
    if (f.patente)    p.set("patente",    f.patente);
    p.set("solo_activas", bool(f.solo_activas));
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    return p;
  };

  const fetchResumen = async () => {
    setLoadRes(true);
    try { const r = await fetch(`${apiBase}estadisticas/vehiculos/resumen/?${buildParams(filtros)}`, { headers: authH() }); if (r.ok) setResumen(await r.json()); }
    catch {} finally { setLoadRes(false); }
  };

  const fetchList = async () => {
    setLoadList(true);
    try {
      const r = await fetch(`${apiBase}estadisticas/vehiculos/list/?${buildParams(filtros, { page, page_size: 20, orden: "id", dir: "desc" })}`, { headers: authH() });
      if (r.ok) { const d = await r.json(); setListData({ results: Array.isArray(d.results) ? d.results : [], count: d.count || 0, total_pages: d.total_pages || 1 }); }
    } catch {} finally { setLoadList(false); }
  };

  useEffect(() => { setPage(1); }, [JSON.stringify(filtros)]);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => { fetchResumen(); fetchList(); }, 280);
    return () => clearTimeout(debRef.current);
  }, [JSON.stringify(filtros), page]);

  const total   = Number(resumen?.total_polizas || 0);
  const activas = Number(resumen?.total_activas  || 0);
  const topTipos = useMemo(() => Object.entries(resumen?.por_tipo || {}).sort(([,a],[,b]) => b-a).slice(0,6), [resumen]);
  const topAnios = useMemo(() => Object.entries(resumen?.por_anio || {}).sort(([,a],[,b]) => b-a).slice(0,8), [resumen]);
  const maxTipo = topTipos[0]?.[1] || 1;
  const maxAnio = topAnios[0]?.[1] || 1;
  const loading = loadRes || loadList;
  const canPrev = page > 1;
  const canNext = page < Number(listData.total_pages || 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2"><HiTruck className="text-sky-400 text-sm"/>Análisis de vehículos</h2>
          <p className="text-xs text-slate-500 mt-0.5">Filtrá por tipo, año, marca o patente</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchResumen(); fetchList(); }} disabled={loading} className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors">
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => onOpenExport?.(filtros)} className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors text-xs font-medium">
            <HiDownload className="text-xs" /> Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><HiOfficeBuilding className="text-xs"/>Oficina</label>
          <select value={oficina} onChange={e => setOficina(e.target.value)} className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2 text-xs text-slate-300 outline-none focus:border-slate-600 cursor-pointer">
            <option value="">Todas</option>
            {(Array.isArray(oficinas) ? oficinas : []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><HiTruck className="text-xs"/>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="h-8 rounded-lg bg-slate-950 border border-slate-800 px-2 text-xs text-slate-300 outline-none focus:border-slate-600 cursor-pointer">
            {TIPOS.map(t => <option key={t||"all"} value={t}>{t||"Todos"}</option>)}
          </select>
        </div>
        <SmallInput label="Año exacto"  icon={HiCalendar} type="number" value={anio}      onChange={e => setAnio(e.target.value)}      placeholder="2015" />
        <SmallInput label="Año desde"   icon={HiCalendar} type="number" value={anioDesde}  onChange={e => setAnioDesde(e.target.value)}  placeholder="2010" />
        <SmallInput label="Año hasta"   icon={HiCalendar} type="number" value={anioHasta}  onChange={e => setAnioHasta(e.target.value)}  placeholder="2024" />
        <SmallInput label="Marca"       icon={HiSearch}   type="text"   value={marca}      onChange={e => setMarca(e.target.value)}      placeholder="Ford" />
        <SmallInput label="Modelo"      icon={HiSearch}   type="text"   value={modelo}     onChange={e => setModelo(e.target.value)}     placeholder="Ranger" />
        <div className="col-span-2">
          <SmallInput label="Patente"   icon={HiSearch}   type="text"   value={patente}    onChange={e => setPatente(e.target.value)}    placeholder="AA123BB" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 opacity-0 select-none">·</label>
          <label className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer hover:border-slate-700 transition-colors">
            <input type="checkbox" checked={soloAct} onChange={e => setSoloAct(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500" />
            <span className="text-xs text-slate-400 flex items-center gap-1"><HiShieldCheck className="text-emerald-500 text-xs"/>Solo activas</span>
          </label>
        </div>
      </div>

      {/* KPI strip */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-light text-slate-100 tabular-nums">{loadRes ? "—" : total.toLocaleString("es-AR")}</span>
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">pólizas</span>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-light text-emerald-400 tabular-nums">{loadRes ? "—" : activas.toLocaleString("es-AR")}</span>
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">activas</span>
        </div>
        {oficina && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 flex items-center gap-1.5">
            <HiOfficeBuilding className="text-sky-400 text-xs" />
            <span className="text-xs text-slate-300">{getOficinaNombre(oficina)}</span>
          </div>
        )}
      </div>

      {/* Distribuciones */}
      {resumen && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Por tipo</h3>
            {topTipos.length === 0 ? <p className="text-xs text-slate-600">Sin datos</p> : topTipos.map(([k,v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-20 truncate">{k}</span>
                <MiniBar value={Number(v)} max={maxTipo} />
                <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{Number(v).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Por año</h3>
            {topAnios.length === 0 ? <p className="text-xs text-slate-600">Sin datos</p> : topAnios.map(([k,v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-12 tabular-nums">{k}</span>
                <MiniBar value={Number(v)} max={maxAnio} />
                <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{Number(v).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla asegurados */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <span className="text-xs font-semibold text-slate-200">Asegurados</span>
          <span className="text-[10px] text-slate-600">{loadList ? "Cargando..." : `${Number(listData.count).toLocaleString("es-AR")} · pág ${page}/${listData.total_pages}`}</span>
        </div>
        {listData.count === 0 && !loadList ? (
          <div className="py-10 text-center text-xs text-slate-600">Sin resultados con estos filtros.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Asegurado</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Vehículo</th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Año</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Oficina</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {loadList ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-600">Cargando...</td></tr>
                  ) : listData.results.map((r, idx) => (
                    <tr key={`${r.poliza_id}-${idx}`} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{r.asegurado || "—"}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5 font-mono">{r.patente || "—"} · {r.numero_poliza || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300">{[r.marca, r.modelo].filter(Boolean).join(" ") || "—"}</div>
                        <div className="text-[10px] text-slate-600">{r.tipo || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{r.anio ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">{r.oficina_nombre || getOficinaNombre(r.oficina) || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium ${r.estado === "activa" ? "text-emerald-400" : "text-slate-500"}`}>{r.estado || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60 bg-slate-900/40">
              <span className="text-[10px] text-slate-600">{listData.results.length} de {Number(listData.count).toLocaleString("es-AR")}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={!canPrev} className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"><HiChevronLeft className="text-xs"/></button>
                <button onClick={() => setPage(p => p+1)} disabled={!canNext} className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"><HiChevronRight className="text-xs"/></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}