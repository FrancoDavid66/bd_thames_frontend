// src/components/estadisticas/ControlFechasPanel.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiArrowRight,
  HiExclamationCircle,
  HiCalendar,
} from "react-icons/hi";
import * as XLSX from "xlsx";

const safeStr = (v) => String(v ?? "").trim();

const token = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token") || "";
const authH = () => (token() ? { Authorization: `Bearer ${token()}` } : {});

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

// Muestra una fecha ISO (YYYY-MM-DD) como DD/MM/YYYY
const fmtFecha = (iso) => {
  const s = safeStr(iso);
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
};

export default function ControlFechasPanel({ apiBase, oficina, getOficinaNombre }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const ofiName = (v) => {
    try {
      return getOficinaNombre ? getOficinaNombre(v) || "—" : v ?? "—";
    } catch {
      return v ?? "—";
    }
  };

  useEffect(() => {
    setPage(1);
  }, [oficina]);

  const fetchListado = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (oficina) qs.set("oficina", oficina);
      const s = `polizas/control-fechas/emision-vto1/?${qs}`;
      const d = await fetchFirstOk([`${apiBase}${s}`, `${apiBase}polizas/${s}`]);
      const results = Array.isArray(d?.results) ? d.results : [];
      setRows(results);
      setCount(Number(d?.count || 0));
      setTotalPages(Math.max(1, Number(d?.total_pages || 1)));
    } catch {
      setRows([]);
      setCount(0);
      setTotalPages(1);
      setError("No se pudo cargar el listado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oficina, page]);

  // Descarga TODAS las filas (recorre todas las páginas) a Excel
  const descargarTodo = async () => {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const PAGE = 200;
      let pageN = 1;
      let total = Infinity;
      const filas = [];

      while ((pageN - 1) * PAGE < total) {
        const qs = new URLSearchParams({ page: String(pageN), page_size: String(PAGE) });
        if (oficina) qs.set("oficina", oficina);
        const s = `polizas/control-fechas/emision-vto1/?${qs}`;
        const d = await fetchFirstOk([`${apiBase}${s}`, `${apiBase}polizas/${s}`]);
        const results = Array.isArray(d?.results) ? d.results : [];
        total = Number(d?.count ?? results.length) || results.length;

        results.forEach((it) => {
          filas.push({
            "ID Póliza": it?.id ?? "",
            "N° Póliza": it?.numero_poliza || "",
            Cliente: it?.cliente || "",
            "DNI/CUIT": it?.cliente_dni || "",
            Patente: it?.patente || "",
            Compañía: it?.compania || "",
            Oficina: it?.oficina_nombre || ofiName(it?.oficina),
            Estado: it?.estado || "",
            "Fecha emisión": fmtFecha(it?.fecha_emision),
            "Vto. 1ª cuota": fmtFecha(it?.vto_primera_cuota),
          });
        });

        if (results.length === 0) break;
        pageN++;
        if (pageN > 200) break; // tope de seguridad
      }

      if (filas.length === 0) {
        setError("No hay pólizas para descargar.");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(filas);
      ws["!cols"] = [
        { wch: 10 }, { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 12 },
        { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Emision igual Vto1");
      const hoy = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Control_Fechas_Emision_Vto1_${hoy}.xlsx`);
    } catch {
      setError("No se pudo generar la descarga.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Control de Fechas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pólizas cuya fecha de emisión es igual al vencimiento de su 1ª cuota
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={descargarTodo}
            disabled={downloading || loading}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg border border-emerald-600 bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {downloading ? "Descargando…" : "Descargar todo"}
          </button>
          <button
            onClick={fetchListado}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
          >
            <HiRefresh className={`text-sm ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
          <HiExclamationCircle className="shrink-0" /> {error}
        </div>
      )}

      {/* KPI */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-rose-400 mb-2">
          <HiCalendar className="text-sm" /> Emisión = Vto. 1ª cuota
        </div>
        <div className="text-4xl font-light tabular-nums text-rose-300">
          {loading ? "—" : count.toLocaleString("es-AR")}
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          pólizas con este problema (cobertura de 0 días en la 1ª cuota)
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <span className="text-xs font-semibold text-slate-200">Pólizas detectadas</span>
          <span className="text-[10px] text-slate-600">{count.toLocaleString("es-AR")} en total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Póliza</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Patente</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Compañía</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Oficina</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Emisión</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Vto. 1ª cuota</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-slate-600 text-[11px]">Cargando...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <p className="text-sm text-emerald-400 font-medium">¡Sin problemas!</p>
                    <p className="text-[11px] text-slate-600 mt-1">No hay pólizas con la emisión igual al vencimiento de su 1ª cuota.</p>
                  </td>
                </tr>
              ) : (
                rows.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-3 py-2.5">
                      <a
                        href={`/polizas/${it.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sky-400 hover:text-sky-300 transition-colors"
                      >
                        #{it.id}{it.numero_poliza ? ` · ${it.numero_poliza}` : ""}
                      </a>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-200">{it.cliente || "—"}</div>
                      {it.cliente_dni && <div className="text-[10px] text-slate-600">{it.cliente_dni}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{it.patente || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400">{it.compania || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-400">{it.oficina_nombre || ofiName(it.oficina)}</td>
                    <td className="px-3 py-2.5 text-rose-300 font-medium tabular-nums">{fmtFecha(it.fecha_emision)}</td>
                    <td className="px-3 py-2.5 text-rose-300 font-medium tabular-nums">{fmtFecha(it.vto_primera_cuota)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-medium ${it.estado === "activa" ? "text-emerald-400" : "text-slate-500"}`}>
                        {it.estado || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <a
                        href={`/polizas/${it.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-[10px] font-medium"
                      >
                        Ver <HiArrowRight className="text-xs" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60 bg-slate-900/40">
            <span className="text-[10px] text-slate-600">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <HiChevronLeft className="text-xs" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <HiChevronRight className="text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}