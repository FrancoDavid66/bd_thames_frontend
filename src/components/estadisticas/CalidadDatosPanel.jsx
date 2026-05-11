// src/components/estadisticas/CalidadDatosPanel.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  HiUserGroup, HiShieldExclamation, HiExclamationCircle,
  HiRefresh, HiSearch, HiChevronLeft, HiChevronRight,
  HiDownload, HiArrowRight,
} from "react-icons/hi";

const token = () => localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => token() ? { Authorization: `Bearer ${token()}` } : {};

const KPI_DEFS = [
  { key: "sin_telefono_clientes", label: "Clientes sin teléfono", icon: HiUserGroup,          color: "text-rose-400",   bg: "bg-rose-500/8 border-rose-500/20",   source: "clientes" },
  { key: "sin_patente",           label: "Sin patente",           icon: HiShieldExclamation,  color: "text-orange-400", bg: "bg-orange-500/8 border-orange-500/20", source: "polizas"  },
  { key: "sin_vehiculo",          label: "Sin vehículo",          icon: HiExclamationCircle,  color: "text-amber-400",  bg: "bg-amber-500/8 border-amber-500/20",  source: "polizas"  },
  { key: "sin_compania",          label: "Sin compañía",          icon: HiExclamationCircle,  color: "text-slate-400",  bg: "bg-slate-700/30 border-slate-700",     source: "polizas"  },
];

export default function CalidadDatosPanel({ apiBase, oficina, getOficinaNombre, anio, mes }) {
  const navigate = useNavigate();

  const [kpis,          setKpis]          = useState({});
  const [loadingKpis,   setLoadingKpis]   = useState(false);
  const [items,         setItems]         = useState([]);
  const [count,         setCount]         = useState(0);
  const [loadingList,   setLoadingList]   = useState(false);
  const [page,          setPage]          = useState(1);
  const [pageSize]                        = useState(20);
  const [search,        setSearch]        = useState("");

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const fetchKpis = async () => {
    setLoadingKpis(true);
    try {
      const qs = new URLSearchParams();
      if (oficina) qs.set("oficina", oficina);
      // Clientes
      const r1 = await fetch(`${apiBase}clientes/calidad/resumen/?${qs}`, { headers: authH() });
      const d1 = r1.ok ? await r1.json() : {};
      // Pólizas
      const p = new URLSearchParams({ anio, mes });
      if (oficina) p.set("oficina", oficina);
      const r2 = await fetch(`${apiBase}estadisticas/polizas/por-oficina/?${p}`, { headers: authH() });
      const d2 = r2.ok ? await r2.json() : {};
      const totPol = (d2.oficinas || []).reduce((acc, o) => {
        const c = o.calidad_datos || {};
        acc.sin_patente  += c.sin_patente  || 0;
        acc.sin_vehiculo += c.sin_vehiculo || 0;
        acc.sin_compania += c.sin_compania || 0;
        return acc;
      }, { sin_patente: 0, sin_vehiculo: 0, sin_compania: 0 });

      setKpis({ sin_telefono_clientes: d1.sin_telefono || 0, ...totPol });
    } catch {}
    finally { setLoadingKpis(false); }
  };

  const fetchList = async () => {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams({ sin_telefono: "1", page: String(page), page_size: String(pageSize) });
      if (search.trim()) qs.set("search", search.trim());
      if (oficina) qs.set("oficina", oficina);
      const r = await fetch(`${apiBase}clientes/?${qs}`, { headers: authH() });
      const d = r.ok ? await r.json() : {};
      setItems(Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : []);
      setCount(Number(d?.count || 0));
    } catch {}
    finally { setLoadingList(false); }
  };

  useEffect(() => { fetchKpis(); }, [oficina, anio, mes]);
  useEffect(() => { setPage(1); }, [oficina, search]);
  useEffect(() => { fetchList(); }, [oficina, page, search]);

  const downloadCsv = () => {
    const h = ["ID","Apellido","Nombre","DNI","Teléfono","Email"];
    const rows = items.map(c => [c.id, c.apellido, c.nombre, c.dni_cuit_cuil, c.telefono, c.email].map(v => `"${String(v??"")}"`));
    const csv = [h.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `calidad_sin_telefono_p${page}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Auditoría de calidad</h2>
          <p className="text-xs text-slate-500 mt-0.5">Perfiles incompletos que dificultan la gestión y el contacto</p>
        </div>
        <button
          onClick={() => { fetchKpis(); fetchList(); }}
          disabled={loadingKpis}
          className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
        >
          <HiRefresh className={`text-sm ${loadingKpis ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI_DEFS.map((k, i) => (
          <motion.div
            key={k.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={`rounded-2xl border p-4 ${k.bg}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <k.icon className={`text-sm shrink-0 ${k.color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</span>
            </div>
            <div className={`text-3xl font-light tabular-nums ${loadingKpis ? "text-slate-700" : k.color}`}>
              {loadingKpis ? "—" : Number(kpis[k.key] || 0).toLocaleString("es-AR")}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Listado clientes sin teléfono */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        {/* Header tabla */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div>
            <span className="text-xs font-semibold text-slate-200">Clientes sin teléfono</span>
            <span className="ml-2 text-[10px] text-slate-600">{count.toLocaleString("es-AR")} encontrados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 h-8 bg-slate-950 border border-slate-800 rounded-lg px-2.5">
              <HiSearch className="text-slate-600 text-xs shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-xs text-slate-300 outline-none w-32 placeholder:text-slate-700"
              />
            </div>
            <button
              onClick={downloadCsv}
              disabled={!items.length}
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors disabled:opacity-30 text-xs"
            >
              <HiDownload className="text-xs" /> CSV
            </button>
          </div>
        </div>

        {/* Tabla */}
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60">
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Asegurado</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">DNI / CUIT</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Teléfono</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {loadingList ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-600">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                {search ? "Sin resultados para esa búsqueda." : "¡Todo en orden! No hay clientes sin teléfono."}
              </td></tr>
            ) : items.map(c => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-800/25 transition-colors group"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-200">{`${c.apellido || ""} ${c.nombre || ""}`.trim() || "—"}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 tabular-nums">{c.dni_cuit_cuil || "—"}</td>
                <td className="px-4 py-3">
                  {c.telefono
                    ? <span className="text-slate-400">{c.telefono}</span>
                    : <span className="text-rose-400/70 font-medium">Sin teléfono</span>
                  }
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/clientes/${c.id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[10px] font-medium"
                  >
                    Ver perfil <HiArrowRight className="text-xs" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60 bg-slate-900/40">
            <span className="text-[10px] text-slate-600">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                <HiChevronLeft className="text-xs" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                <HiChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}