// src/components/estadisticas/AltasPolizasPanel.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiChartBar,
  HiCalendar,
  HiOfficeBuilding,
  HiRefresh,
  HiExclamation,
  HiDownload,
  HiCheckCircle,
} from "react-icons/hi";

import AnimatedCard from "./AnimatedCard";

dayjs.locale("es");

const ORDER_BUCKETS = ["1", "2", "3", "OTRAS", "SIN_OFICINA"];

const clampIsoDate = (v) => {
  const s = String(v || "").trim();
  if (!s) return "";
  const d = dayjs(s);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const monthRangeFrom = (anio, mes) => {
  const a = String(anio || "").trim();
  const mRaw = String(mes || "").trim();
  if (!a || !mRaw) return { desde: "", hasta: "" };
  const m = mRaw.length === 1 ? `0${mRaw}` : mRaw;
  const start = dayjs(`${a}-${m}-01`).startOf("day");
  const end = start.endOf("month").startOf("day");
  return {
    desde: start.isValid() ? start.format("YYYY-MM-DD") : "",
    hasta: end.isValid() ? end.format("YYYY-MM-DD") : "",
  };
};

const defaultDesdeFor = (agrupacion) => {
  const hoy = dayjs().startOf("day");
  if (agrupacion === "mes") return hoy.subtract(12, "month").format("YYYY-MM-DD");
  if (agrupacion === "semana") return hoy.subtract(12, "week").format("YYYY-MM-DD");
  return hoy.subtract(30, "day").format("YYYY-MM-DD");
};

const labelPeriodo = (agrupacion, periodo) => {
  const p = String(periodo || "").trim();
  if (!p) return "—";

  const d = dayjs(p);
  if (!d.isValid()) return p;

  if (agrupacion === "mes") return d.format("YYYY-MM");
  if (agrupacion === "semana") return `Semana de ${d.format("DD/MM/YYYY")}`;
  if (agrupacion === "hora") return d.format("DD/MM/YYYY HH:00");
  return d.format("DD/MM/YYYY");
};

async function fetchJsonTry(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  return res.json();
}

const safeNamePart = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "");

const csvEscape = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  // si tiene coma, comillas o salto de línea, quote
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const oficinaTone = (oficinaId) => {
  const k = String(oficinaId || "").toUpperCase();
  if (k === "1") return "ring-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (k === "2") return "ring-sky-500/25 bg-sky-500/10 text-sky-200";
  if (k === "3") return "ring-violet-500/25 bg-violet-500/10 text-violet-200";
  if (k === "OTRAS") return "ring-amber-500/25 bg-amber-500/10 text-amber-200";
  if (k === "SIN_OFICINA")
    return "ring-rose-500/25 bg-rose-500/10 text-rose-200";
  return "ring-slate-500/25 bg-slate-500/10 text-slate-200";
};

/**
 * Panel: Emisiones de póliza (fecha_emision) por oficina y por período.
 */
export default function AltasPolizasPanel({
  apiBase,
  oficinas = [],
  getOficinaNombre,
  defaultOficina = "",
  anio,
  mes,
}) {
  const [agrupacion, setAgrupacion] = useState("dia"); // hora | dia | semana | mes
  const [oficina, setOficina] = useState(defaultOficina || "");

  const hasMesGlobal = useMemo(() => {
    const a = String(anio || "").trim();
    const m = String(mes || "").trim();
    return Boolean(a) && Boolean(m);
  }, [anio, mes]);

  const [usarMesSeleccionado, setUsarMesSeleccionado] = useState(() => {
    return Boolean(String(anio || "").trim()) && Boolean(String(mes || "").trim());
  });

  const [desde, setDesde] = useState(() => {
    if (String(anio || "").trim() && String(mes || "").trim()) {
      return monthRangeFrom(anio, mes).desde || defaultDesdeFor("dia");
    }
    return defaultDesdeFor("dia");
  });

  const [hasta, setHasta] = useState(() => {
    if (String(anio || "").trim() && String(mes || "").trim()) {
      return monthRangeFrom(anio, mes).hasta || dayjs().format("YYYY-MM-DD");
    }
    return dayjs().format("YYYY-MM-DD");
  });

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOk, setExportOk] = useState(false);

  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  // ✅ guarda qué endpoint real responde (para no reprobar cada vez)
  const [resolvedEndpoint, setResolvedEndpoint] = useState("");

  // sync con filtro global (oficina)
  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  // si cambian mes/año globales y estamos en "mes seleccionado", actualizamos rango
  useEffect(() => {
    if (!hasMesGlobal) return;
    if (!usarMesSeleccionado) return;
    const r = monthRangeFrom(anio, mes);
    if (r.desde) setDesde(r.desde);
    if (r.hasta) setHasta(r.hasta);
  }, [anio, mes, hasMesGlobal, usarMesSeleccionado]);

  // cuando cambia agrupación, si el usuario no está en mes seleccionado y no tiene rango, sugerimos uno
  useEffect(() => {
    if (usarMesSeleccionado) return;
    setDesde((prev) => prev || defaultDesdeFor(agrupacion));
    setHasta((prev) => prev || dayjs().format("YYYY-MM-DD"));
  }, [agrupacion, usarMesSeleccionado]);

  const oficinasOptions = useMemo(() => {
    const base = Array.isArray(oficinas) ? oficinas : [];
    const ids = base.map((o) => String(o.id));
    const extras = ["OTRAS", "SIN_OFICINA"];
    return Array.from(new Set([...ids, ...extras]));
  }, [oficinas]);

  const buildCandidates = useCallback(() => {
    const base = String(apiBase || "/api/").trim();
    const cands = [
      `${base}estadisticas/polizas/emisiones/serie/`,
      `${base}estadisticas/polizas/emisiones/serie`,
      `${base}estadisticas/polizas/emisiones-serie/`,
      `${base}estadisticas/polizas/emisiones-serie`,
    ];
    return Array.from(new Set(cands));
  }, [apiBase]);

  const fetchSerie = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("agrupacion", agrupacion);

      const d = clampIsoDate(desde);
      const h = clampIsoDate(hasta);
      if (d) params.set("desde", d);
      if (h) params.set("hasta", h);

      if (oficina) params.set("oficina", oficina);

      const query = params.toString();

      const candidates = resolvedEndpoint ? [resolvedEndpoint] : buildCandidates();

      let lastErr = null;
      for (const baseUrl of candidates) {
        const url = query ? `${baseUrl}?${query}` : baseUrl;
        try {
          const data = await fetchJsonTry(url, { credentials: "include" });
          setPayload(data || null);

          if (!resolvedEndpoint || resolvedEndpoint !== baseUrl) {
            setResolvedEndpoint(baseUrl);
            console.info("[AltasPolizasPanel] Endpoint OK:", baseUrl);
          }

          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          if (Number(e?.status) === 404) continue;
          throw e;
        }
      }

      if (lastErr) {
        const tried = candidates.join(" | ");
        setPayload(null);
        setError(
          `Endpoint de emisiones no encontrado (404). Probé: ${tried}. ` +
            `Esto suele pasar cuando el backend desplegado no está con la última versión o no se reinició.`
        );
      }
    } catch (e) {
      console.error("[AltasPolizasPanel] Error:", e);
      setPayload(null);

      const is404 = Number(e?.status) === 404;
      if (is404) {
        const tried = buildCandidates().join(" | ");
        setError(
          `Endpoint de emisiones no encontrado (404). Probé: ${tried}. ` +
            `Revisá que el backend esté desplegado con el endpoint y que gunicorn/railway haya reiniciado.`
        );
      } else {
        setError(
          "No se pudieron cargar las emisiones por fecha_emision. Revisá logs del backend."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, agrupacion, desde, hasta, oficina, resolvedEndpoint, buildCandidates]);

  useEffect(() => {
    fetchSerie();
  }, [fetchSerie]);

  const oficinasSerie = useMemo(() => {
    const arr = Array.isArray(payload?.oficinas) ? payload.oficinas : [];
    const extra = arr
      .map((x) => String(x?.oficina || ""))
      .filter(Boolean)
      .filter((k) => !ORDER_BUCKETS.includes(k));
    const order = [...ORDER_BUCKETS, ...extra];

    const map = new Map(arr.map((o) => [String(o.oficina || ""), o]));
    return order.map((k) => map.get(k)).filter(Boolean);
  }, [payload]);

  const periodos = useMemo(() => {
    return Array.isArray(payload?.periodos) ? payload.periodos : [];
  }, [payload]);

  const table = useMemo(() => {
    const cols = oficinasSerie.map((o) => String(o.oficina));
    const colMeta = oficinasSerie.map((o) => ({
      oficina: String(o.oficina),
      oficina_nombre:
        o.oficina_nombre ||
        (typeof getOficinaNombre === "function"
          ? getOficinaNombre(String(o.oficina))
          : String(o.oficina)),
      total: Number(o.total || 0),
    }));

    const seriesByOfi = new Map();
    oficinasSerie.forEach((o) => {
      const s = Array.isArray(o.serie) ? o.serie : [];
      const m = new Map(
        s.map((it) => [String(it.periodo), Number(it.cantidad || 0)])
      );
      seriesByOfi.set(String(o.oficina), m);
    });

    const rows = periodos.map((p) => {
      const row = { periodo: String(p) };
      cols.forEach((ofi) => {
        const m = seriesByOfi.get(ofi);
        row[ofi] = m ? Number(m.get(String(p)) || 0) : 0;
      });
      row.total = cols.reduce((acc, ofi) => acc + Number(row[ofi] || 0), 0);
      return row;
    });

    const totalsRow = {
      periodo: "TOTAL",
      total: rows.reduce((acc, r) => acc + Number(r.total || 0), 0),
    };
    cols.forEach((ofi) => {
      totalsRow[ofi] = rows.reduce((acc, r) => acc + Number(r[ofi] || 0), 0);
    });

    return { colMeta, cols, rows, totalsRow };
  }, [oficinasSerie, periodos, getOficinaNombre]);

  const totalGeneral = Number(table?.totalsRow?.total || 0);

  const footerDesde = payload?.desde || clampIsoDate(desde) || "—";
  const footerHasta = payload?.hasta || clampIsoDate(hasta) || "—";
  const footerAgr = payload?.agrupacion || agrupacion;

  const degradadoHoraADia =
    agrupacion === "hora" && payload?.agrupacion && payload.agrupacion !== "hora";

  const canExport = table.rows.length > 0 && !loading && !exporting;

  const onExportCSV = useCallback(async () => {
    if (!canExport) return;

    try {
      setExporting(true);
      setExportOk(false);

      const agr = payload?.agrupacion || agrupacion;
      const ofiLabel =
        oficina
          ? typeof getOficinaNombre === "function"
            ? getOficinaNombre(oficina)
            : oficina
          : "todas";

      const headerCols = [
        "Período",
        ...table.colMeta.map((c) => c.oficina_nombre),
        "Total",
      ];

      // metadata arriba (Excel lo muestra como primera fila)
      const metaLine = [
        `Filtros: agrupacion=${agr}`,
        `desde=${footerDesde}`,
        `hasta=${footerHasta}`,
        `oficina=${ofiLabel}`,
      ].join(" | ");

      const lines = [];
      // BOM para Excel
      lines.push(csvEscape(metaLine));
      lines.push(headerCols.map(csvEscape).join(","));

      table.rows.forEach((r) => {
        const periodoLabel = labelPeriodo(agr, r.periodo);
        const row = [
          periodoLabel,
          ...table.cols.map((ofi) => String(r[ofi] || 0)),
          String(r.total || 0),
        ];
        lines.push(row.map(csvEscape).join(","));
      });

      // Totales
      const totalRow = [
        "TOTAL",
        ...table.cols.map((ofi) => String(table.totalsRow[ofi] || 0)),
        String(table.totalsRow.total || 0),
      ];
      lines.push(totalRow.map(csvEscape).join(","));

      const csv = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

      const filename = [
        "emisiones_por_oficina",
        safeNamePart(agr),
        safeNamePart(footerDesde),
        safeNamePart(footerHasta),
        oficina ? safeNamePart(oficina) : "todas",
      ].join("_");

      downloadBlob(blob, `${filename}.csv`);

      setExportOk(true);
      window.setTimeout(() => setExportOk(false), 1600);
    } catch (e) {
      console.error("[AltasPolizasPanel] Export error:", e);
      setError("No se pudo exportar el CSV. Mirá la consola para más detalle.");
    } finally {
      setExporting(false);
    }
  }, [
    canExport,
    payload,
    agrupacion,
    oficina,
    getOficinaNombre,
    footerDesde,
    footerHasta,
    table,
    loading,
    exporting,
  ]);

  const chips = useMemo(() => {
    const list = Array.isArray(table?.colMeta) ? table.colMeta : [];
    return list
      .filter((c) => Number(c.total || 0) > 0)
      .map((c) => ({
        ...c,
        pct: totalGeneral > 0 ? Math.round((Number(c.total || 0) / totalGeneral) * 100) : 0,
      }));
  }, [table, totalGeneral]);

  return (
    <AnimatedCard
      index={4}
      interactive={false}
      glow="from-emerald-500/35 via-cyan-500/20 to-transparent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25">
              <HiChartBar className="text-lg" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                Emisiones de póliza por oficina
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Cuenta pólizas por{" "}
                <span className="text-slate-200">fecha_emision</span> por{" "}
                {footerAgr === "hora"
                  ? "hora"
                  : footerAgr === "dia"
                  ? "día"
                  : footerAgr === "semana"
                  ? "semana"
                  : "mes"}
                .
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={fetchSerie}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-200 hover:bg-slate-800/70 cursor-pointer"
          >
            <HiRefresh className={`${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Cargando..." : "Refrescar"}</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onExportCSV}
            whileHover={{ scale: canExport ? 1.03 : 1.0 }}
            whileTap={{ scale: canExport ? 0.97 : 1.0 }}
            disabled={!canExport}
            className={[
              "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm border cursor-pointer",
              canExport
                ? "bg-gradient-to-r from-emerald-500/25 via-cyan-500/15 to-slate-900/40 border-emerald-500/25 text-emerald-100 hover:from-emerald-500/30 hover:via-cyan-500/20"
                : "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed",
            ].join(" ")}
          >
            {exporting ? (
              <span className="inline-flex items-center gap-2">
                <HiRefresh className="animate-spin" />
                Exportando…
              </span>
            ) : exportOk ? (
              <span className="inline-flex items-center gap-2">
                <HiCheckCircle />
                Listo
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <HiDownload />
                Descargar CSV
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* chips de resumen por oficina (color + % del total) */}
      <AnimatePresence>
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {chips.map((c) => (
              <motion.div
                key={c.oficina}
                whileHover={{ y: -1 }}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 ring-1",
                  oficinaTone(c.oficina),
                ].join(" ")}
                title={`${c.oficina_nombre}: ${c.total} (${c.pct}%)`}
              >
                <span className="text-xs font-semibold">{c.oficina_nombre}</span>
                <span className="text-xs tabular-nums opacity-90">{c.total}</span>
                <span className="text-[0.7rem] opacity-75">({c.pct}%)</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* filtros */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 inline-flex items-center gap-2">
            <HiCalendar className="opacity-70" />
            Agrupación
          </label>
          <select
            value={agrupacion}
            onChange={(e) => setAgrupacion(e.target.value)}
            className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
          >
            <option value="hora">Hora</option>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 inline-flex items-center gap-2">
            <HiOfficeBuilding className="opacity-70" />
            Oficina
          </label>
          <select
            value={oficina}
            onChange={(e) => setOficina(e.target.value)}
            className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
          >
            <option value="">Todas</option>
            {oficinasOptions.map((id) => (
              <option key={id} value={id}>
                {typeof getOficinaNombre === "function" ? getOficinaNombre(id) : id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">Desde</label>
            {hasMesGlobal && (
              <label className="flex items-center gap-2 text-[0.7rem] text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={usarMesSeleccionado}
                  onChange={(e) => setUsarMesSeleccionado(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Usar mes seleccionado
              </label>
            )}
          </div>
          <input
            type="date"
            value={clampIsoDate(desde)}
            onChange={(e) => {
              setUsarMesSeleccionado(false);
              setDesde(e.target.value);
            }}
            className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Hasta</label>
          <input
            type="date"
            value={clampIsoDate(hasta)}
            onChange={(e) => {
              setUsarMesSeleccionado(false);
              setHasta(e.target.value);
            }}
            className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>
      </div>

      {/* barra de carga */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3"
          >
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/60 border border-slate-800">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-emerald-500/35 via-cyan-500/25 to-transparent"
                initial={{ x: "-40%" }}
                animate={{ x: "140%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* aviso degradación hora->día */}
      {degradadoHoraADia && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-xs sm:text-sm text-amber-100 flex items-center gap-2">
          <HiExclamation />
          <span>
            La agrupación <b>hora</b> no aplica (fecha_emision sin hora). Se mostró por{" "}
            <b>{payload?.agrupacion}</b>.
          </span>
        </div>
      )}

      {/* error */}
      {error && (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs sm:text-sm text-rose-100 flex items-center gap-2">
          <HiExclamation />
          <span>{error}</span>
        </div>
      )}

      {/* total */}
      <div className="mt-4 rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2">
        <div className="text-[0.65rem] uppercase tracking-wide text-slate-400">
          Total emisiones (rango)
        </div>
        <motion.div
          key={totalGeneral}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg sm:text-2xl font-semibold tabular-nums text-slate-50"
        >
          {totalGeneral}
        </motion.div>
      </div>

      {/* tabla */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2 text-slate-300 font-semibold">Período</th>
                {table.colMeta.map((c) => (
                  <th
                    key={c.oficina}
                    className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap"
                  >
                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-2 py-1 ring-1",
                        oficinaTone(c.oficina),
                      ].join(" ")}
                    >
                      {c.oficina_nombre}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-slate-200 font-semibold">Total</th>
              </tr>
            </thead>

            <tbody>
              {table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.colMeta.length + 2}
                    className="px-3 py-4 text-slate-400"
                  >
                    {loading ? "Cargando..." : "Sin datos para el rango seleccionado."}
                  </td>
                </tr>
              ) : (
                <>
                  {table.rows.map((r, idx) => (
                    <motion.tr
                      key={`${r.periodo}-${idx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.01, 0.15) }}
                      className={`border-b border-slate-800/70 ${
                        idx % 2 === 0 ? "bg-slate-950/10" : "bg-slate-950/0"
                      } hover:bg-emerald-500/5`}
                    >
                      <td className="px-3 py-2 text-slate-200 whitespace-nowrap">
                        {labelPeriodo(payload?.agrupacion || agrupacion, r.periodo)}
                      </td>
                      {table.cols.map((ofi) => (
                        <td
                          key={`${r.periodo}-${ofi}`}
                          className="px-3 py-2 text-slate-100 tabular-nums"
                        >
                          {r[ofi] || 0}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-slate-50 tabular-nums font-semibold">
                        {r.total || 0}
                      </td>
                    </motion.tr>
                  ))}

                  <tr className="bg-slate-900/70">
                    <td className="px-3 py-2 text-slate-50 font-semibold">TOTAL</td>
                    {table.cols.map((ofi) => (
                      <td
                        key={`total-${ofi}`}
                        className="px-3 py-2 text-slate-50 tabular-nums font-semibold"
                      >
                        {table.totalsRow[ofi] || 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-slate-50 tabular-nums font-semibold">
                      {table.totalsRow.total || 0}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-2 text-[0.7rem] text-slate-400 border-t border-slate-800">
          Fuente: {payload?.fuente || "live"} · Campo:{" "}
          <span className="text-slate-200">fecha_emision</span> · Agrupación:{" "}
          <span className="text-slate-200">{payload?.agrupacion || agrupacion}</span>{" "}
          · Rango: {footerDesde} → {footerHasta}
          {resolvedEndpoint ? (
            <>
              {" "}
              · Endpoint: <span className="text-slate-200">{resolvedEndpoint}</span>
            </>
          ) : null}
        </div>
      </div>
    </AnimatedCard>
  );
}
