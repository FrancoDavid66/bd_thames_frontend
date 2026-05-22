// src/components/estadisticas/AltasPolizasPanel.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import dayjs from "dayjs";
import {
  HiChartBar,
  HiRefresh,
  HiCalendar,
  HiDownload,
  HiCheckCircle,
  HiX,
  HiTable,
} from "react-icons/hi";

const ORDER_BUCKETS = ["1", "2", "3", "4", "5", "OTRAS", "SIN_OFICINA"];

const safeNamePart = (s) =>
  String(s || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

const csvEscape = (val) => {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
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

const clampIsoDate = (v) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const defaultDesdeFor = (agr) => {
  switch (agr) {
    case "hora":
      return dayjs().subtract(7, "day").format("YYYY-MM-DD");
    case "dia":
      return dayjs().subtract(30, "day").format("YYYY-MM-DD");
    case "semana":
      return dayjs().subtract(12, "week").format("YYYY-MM-DD");
    case "mes":
      return dayjs().subtract(12, "month").format("YYYY-MM-DD");
    default:
      return dayjs().subtract(30, "day").format("YYYY-MM-DD");
  }
};

const monthRangeFrom = (anio, mes) => {
  try {
    const y = parseInt(anio, 10);
    const m = parseInt(mes, 10);
    if (!y || !m) return {};
    const d = dayjs(`${y}-${String(m).padStart(2, "0")}-01`);
    return {
      desde: d.startOf("month").format("YYYY-MM-DD"),
      hasta: d.endOf("month").startOf("day").format("YYYY-MM-DD"),
    };
  } catch {
    return {};
  }
};

const oficinaTone = (ofi) => {
  const map = {
    "1": "border-blue-500/40 bg-blue-500/10 text-blue-300",
    "2": "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    "3": "border-violet-500/40 bg-violet-500/10 text-violet-300",
    "4": "border-amber-500/40 bg-amber-500/10 text-amber-300",
    "5": "border-pink-500/40 bg-pink-500/10 text-pink-300",
    OTRAS: "border-slate-600 bg-slate-700/40 text-slate-300",
    SIN_OFICINA: "border-slate-700 bg-slate-800/60 text-slate-400",
  };
  return map[String(ofi)] || "border-slate-700 bg-slate-800/60 text-slate-400";
};

const labelPeriodo = (agr, p) => {
  if (!p) return "—";
  if (agr === "mes") return dayjs(p).format("MMM YYYY");
  if (agr === "semana") return `Sem. ${dayjs(p).format("DD/MM")}`;
  if (agr === "hora") return dayjs(p).format("DD/MM HH:mm");
  return dayjs(p).format("DD/MM/YYYY");
};

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");
  return token && token !== "undefined" && token !== "null"
    ? { Authorization: `Bearer ${token.trim()}` }
    : {};
};

/* ============================================================
 *  Modal de descarga Excel (NUEVO)
 * ============================================================ */
function ExportExcelModal({
  open,
  onClose,
  apiBase,
  desdeInicial,
  hastaInicial,
  oficinaInicial,
  oficinasOptions = [],
  getOficinaNombre,
}) {
  const [desde, setDesde] = useState(desdeInicial || "");
  const [hasta, setHasta] = useState(hastaInicial || "");
  const [oficina, setOficina] = useState(oficinaInicial || "");
  const [tipo, setTipo] = useState("todas"); // todas | nuevas | renovaciones
  const [compania, setCompania] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    if (open) {
      setDesde(desdeInicial || "");
      setHasta(hastaInicial || "");
      setOficina(oficinaInicial || "");
      setTipo("todas");
      setCompania("");
      setError("");
      setOkMsg("");
    }
  }, [open, desdeInicial, hastaInicial, oficinaInicial]);

  const handleDescargar = async () => {
    setError("");
    setOkMsg("");

    const d = clampIsoDate(desde);
    const h = clampIsoDate(hasta);

    if (!d || !h) {
      setError("Seleccioná fechas válidas.");
      return;
    }
    if (dayjs(d).isAfter(dayjs(h))) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }

    setLoading(true);
    try {
      const base = String(apiBase || "/api/").trim();
      const url = new URL(
        `${base}estadisticas/polizas/emisiones/export-excel/`,
        window.location.origin
      );
      url.searchParams.set("desde", d);
      url.searchParams.set("hasta", h);
      url.searchParams.set("tipo", tipo);
      if (oficina) url.searchParams.set("oficina", oficina);
      if (compania.trim()) url.searchParams.set("compania", compania.trim());

      const res = await fetch(url.toString(), { headers: getAuthHeaders() });

      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.detail || data?.error || "";
        } catch {
          // ignore
        }
        throw new Error(detail || `Error HTTP ${res.status}`);
      }

      const blob = await res.blob();

      // Filename desde header si está, sino default
      let filename = `Emisiones_${safeNamePart(d)}_${safeNamePart(h)}_${tipo}.xlsx`;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename\*?=(?:UTF-\d+'')?["']?([^;"'\n]+)/);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].replace(/^"|"$/g, ""));
      }

      downloadBlob(blob, filename);
      setOkMsg(`✓ Descargado: ${filename}`);

      // Cerrar después de 1.2s
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1200);
    } catch (e) {
      setError(e?.message || "No se pudo generar el Excel.");
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <div className="text-base font-bold text-slate-100 flex items-center gap-2">
              <HiTable className="text-emerald-400" />
              Exportar Emisiones a Excel
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Descargá las pólizas emitidas con todos sus datos para análisis.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            <HiX />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Fechas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Atajos */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setDesde(dayjs().startOf("month").format("YYYY-MM-DD"));
                setHasta(dayjs().endOf("month").format("YYYY-MM-DD"));
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-600"
            >
              Mes actual
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setDesde(dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"));
                setHasta(dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD"));
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-600"
            >
              Mes anterior
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setDesde(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
                setHasta(dayjs().format("YYYY-MM-DD"));
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-600"
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setDesde(dayjs().startOf("year").format("YYYY-MM-DD"));
                setHasta(dayjs().format("YYYY-MM-DD"));
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded-md border border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-600"
            >
              Año actual
            </button>
          </div>

          {/* Tipo de alta */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "todas", label: "Todas" },
                { id: "nuevas", label: "Solo nuevas" },
                { id: "renovaciones", label: "Solo renovac." },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setTipo(opt.id)}
                  className={`text-[11px] font-semibold py-2 rounded-lg border transition-colors ${
                    tipo === opt.id
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                      : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Oficina */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Oficina (opcional)
            </label>
            <select
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
            >
              <option value="">Todas las oficinas</option>
              {oficinasOptions.map((o) => {
                const val = String(o);
                const label =
                  typeof getOficinaNombre === "function"
                    ? getOficinaNombre(val)
                    : val;
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Compañía */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Compañía (opcional)
            </label>
            <input
              type="text"
              value={compania}
              onChange={(e) => setCompania(e.target.value)}
              disabled={loading}
              placeholder="Ej: RUS, SANCOR, La Caja…"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Mensajes */}
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-300">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <HiCheckCircle /> {okMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <HiRefresh className="animate-spin" /> Generando…
              </>
            ) : (
              <>
                <HiDownload /> Descargar Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 *  Mini chip de oficina (para los chips de %)
 * ============================================================ */
function OficinaChip({ oficina, oficina_nombre, total, pct }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${oficinaTone(oficina)}`}
    >
      <span className="font-semibold">{oficina_nombre}</span>
      <span className="text-slate-500">·</span>
      <span className="font-mono tabular-nums">{total}</span>
      <span className="text-slate-500 text-[10px]">({pct}%)</span>
    </div>
  );
}

/* ============================================================
 *  Panel principal
 * ============================================================ */
export default function AltasPolizasPanel({
  apiBase,
  oficinas = [],
  getOficinaNombre,
  defaultOficina = "",
  anio,
  mes,
}) {
  const [agrupacion, setAgrupacion] = useState("dia");
  const [oficina, setOficina] = useState(defaultOficina || "");
  const [excluirRenovaciones, setExcluirRenovaciones] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOk, setExportOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [resolvedEndpoint, setResolvedEndpoint] = useState("");

  // 🆕 Modal de Excel
  const [excelModalOpen, setExcelModalOpen] = useState(false);

  const hasMesGlobal = useMemo(
    () => Boolean(String(anio || "").trim()) && Boolean(String(mes || "").trim()),
    [anio, mes]
  );
  const [usarMesSeleccionado, setUsarMesSeleccionado] = useState(
    () => Boolean(String(anio || "").trim()) && Boolean(String(mes || "").trim())
  );
  const [desde, setDesde] = useState(() => {
    if (String(anio || "").trim() && String(mes || "").trim())
      return monthRangeFrom(anio, mes).desde || defaultDesdeFor("dia");
    return defaultDesdeFor("dia");
  });
  const [hasta, setHasta] = useState(() => {
    if (String(anio || "").trim() && String(mes || "").trim())
      return monthRangeFrom(anio, mes).hasta || dayjs().format("YYYY-MM-DD");
    return dayjs().format("YYYY-MM-DD");
  });

  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  useEffect(() => {
    if (!hasMesGlobal || !usarMesSeleccionado) return;
    const r = monthRangeFrom(anio, mes);
    if (r.desde) setDesde(r.desde);
    if (r.hasta) setHasta(r.hasta);
  }, [anio, mes, hasMesGlobal, usarMesSeleccionado]);

  useEffect(() => {
    if (usarMesSeleccionado) return;
    setDesde((p) => p || defaultDesdeFor(agrupacion));
    setHasta((p) => p || dayjs().format("YYYY-MM-DD"));
  }, [agrupacion, usarMesSeleccionado]);

  const oficinasOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(Array.isArray(oficinas) ? oficinas : []).map((o) => String(o.id)),
          "OTRAS",
          "SIN_OFICINA",
        ])
      ),
    [oficinas]
  );

  const buildCandidates = useCallback(() => {
    const base = String(apiBase || "/api/").trim();
    return Array.from(
      new Set([
        `${base}estadisticas/polizas/emisiones/serie/`,
        `${base}estadisticas/polizas/emisiones/serie`,
        `${base}estadisticas/polizas/emisiones-serie/`,
        `${base}estadisticas/polizas/emisiones-serie`,
      ])
    );
  }, [apiBase]);

  const fetchSerie = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ agrupacion });
      const d = clampIsoDate(desde),
        h = clampIsoDate(hasta);
      if (d) params.set("desde", d);
      if (h) params.set("hasta", h);
      if (oficina) params.set("oficina", oficina);
      if (excluirRenovaciones) params.set("es_renovacion", "false");

      const candidates = resolvedEndpoint ? [resolvedEndpoint] : buildCandidates();
      let lastErr = null;
      let dataOk = null;
      let endpointOk = null;
      for (const url of candidates) {
        try {
          const res = await fetch(`${url}?${params.toString()}`, {
            headers: getAuthHeaders(),
          });
          if (!res.ok) {
            lastErr = { status: res.status, url };
            continue;
          }
          const json = await res.json();
          dataOk = json;
          endpointOk = url;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (dataOk) {
        setPayload(dataOk);
        if (endpointOk) setResolvedEndpoint(endpointOk);
      } else {
        setPayload(null);
        throw lastErr || new Error("No se pudo cargar la serie.");
      }
    } catch (e) {
      setPayload(null);
      setError(
        Number(e?.status) === 404
          ? `Endpoint no encontrado (404).`
          : "No se pudieron cargar las emisiones."
      );
    } finally {
      setLoading(false);
    }
  }, [
    apiBase,
    agrupacion,
    desde,
    hasta,
    oficina,
    excluirRenovaciones,
    resolvedEndpoint,
    buildCandidates,
  ]);

  useEffect(() => {
    fetchSerie();
  }, [fetchSerie]);

  const oficinasSerie = useMemo(() => {
    const arr = Array.isArray(payload?.oficinas) ? payload.oficinas : [];
    const extra = arr.map((x) => String(x?.oficina || "")).filter((k) => !ORDER_BUCKETS.includes(k));
    const order = [...ORDER_BUCKETS, ...extra];
    const map = new Map(arr.map((o) => [String(o.oficina || ""), o]));
    return order.map((k) => map.get(k)).filter(Boolean);
  }, [payload]);

  const periodos = useMemo(() => (Array.isArray(payload?.periodos) ? payload.periodos : []), [payload]);

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
      seriesByOfi.set(
        String(o.oficina),
        new Map(s.map((it) => [String(it.periodo), Number(it.cantidad || 0)]))
      );
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
  const canExport = table.rows.length > 0 && !loading && !exporting;

  const chips = useMemo(
    () =>
      (table?.colMeta || [])
        .filter((c) => Number(c.total || 0) > 0)
        .map((c) => ({
          ...c,
          pct: totalGeneral > 0 ? Math.round((c.total / totalGeneral) * 100) : 0,
        })),
    [table, totalGeneral]
  );

  const onExportCSV = useCallback(async () => {
    if (!canExport) return;
    try {
      setExporting(true);
      setExportOk(false);
      const agr = payload?.agrupacion || agrupacion;
      const ofiLabel = oficina
        ? typeof getOficinaNombre === "function"
          ? getOficinaNombre(oficina)
          : oficina
        : "todas";
      const lines = [
        csvEscape(
          `agrupacion=${agr} | desde=${footerDesde} | hasta=${footerHasta} | oficina=${ofiLabel}`
        ),
        ["Período", ...table.colMeta.map((c) => c.oficina_nombre), "Total"]
          .map(csvEscape)
          .join(","),
        ...table.rows.map((r) =>
          [
            labelPeriodo(agr, r.periodo),
            ...table.cols.map((o) => String(r[o] || 0)),
            String(r.total || 0),
          ]
            .map(csvEscape)
            .join(",")
        ),
        [
          "TOTAL",
          ...table.cols.map((o) => String(table.totalsRow[o] || 0)),
          String(table.totalsRow.total || 0),
        ]
          .map(csvEscape)
          .join(","),
      ];
      downloadBlob(
        new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
        `emisiones_${safeNamePart(agr)}_${safeNamePart(footerDesde)}_${safeNamePart(footerHasta)}.csv`
      );
      setExportOk(true);
      setTimeout(() => setExportOk(false), 1600);
    } catch {
      setError("No se pudo exportar el CSV.");
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
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <HiChartBar className="text-emerald-400 text-sm" />
            Emisiones por oficina
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pólizas por <span className="text-slate-400">fecha_emision</span> · agrupadas por{" "}
            {footerAgr}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setUsarMesSeleccionado(false);
              setDesde(dayjs().startOf("month").format("YYYY-MM-DD"));
              setHasta(dayjs().endOf("month").startOf("day").format("YYYY-MM-DD"));
            }}
            className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors text-xs"
          >
            <HiCalendar className="text-xs" />
            Mes actual
          </button>

          <button
            type="button"
            onClick={fetchSerie}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-colors"
            title="Refrescar"
          >
            <HiRefresh className={`text-xs ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            disabled={!canExport}
            className={`h-8 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
              canExport
                ? "border-slate-700 bg-slate-800/30 text-slate-300 hover:bg-slate-800/60"
                : "border-slate-800 text-slate-600 cursor-not-allowed"
            }`}
            title="Exportar la tabla de la serie (resumen por oficina)"
          >
            {exporting ? (
              <HiRefresh className="animate-spin text-xs" />
            ) : exportOk ? (
              <HiCheckCircle className="text-xs" />
            ) : (
              <HiDownload className="text-xs" />
            )}
            CSV resumen
          </button>

          {/* 🆕 BOTÓN PRINCIPAL: Excel completo */}
          <button
            type="button"
            onClick={() => setExcelModalOpen(true)}
            className="h-8 flex items-center gap-1.5 px-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors text-xs font-bold"
            title="Descargar Excel detallado con todas las pólizas y sus datos"
          >
            <HiTable className="text-sm" />
            Excel detallado
          </button>
        </div>
      </div>

      {/* Controles secundarios */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-1 py-1">
          {["hora", "dia", "semana", "mes"].map((agr) => (
            <button
              key={agr}
              type="button"
              onClick={() => setAgrupacion(agr)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                agrupacion === agr
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {agr}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={desde}
          onChange={(e) => {
            setDesde(e.target.value);
            setUsarMesSeleccionado(false);
          }}
          className="h-8 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 text-xs text-slate-300 outline-none focus:border-slate-700"
        />
        <span className="text-xs text-slate-600">→</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => {
            setHasta(e.target.value);
            setUsarMesSeleccionado(false);
          }}
          className="h-8 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 text-xs text-slate-300 outline-none focus:border-slate-700"
        />

        <select
          value={oficina}
          onChange={(e) => setOficina(e.target.value)}
          className="h-8 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 text-xs text-slate-300 outline-none focus:border-slate-700"
        >
          <option value="">Todas las oficinas</option>
          {oficinasOptions.map((o) => {
            const val = String(o);
            const label =
              typeof getOficinaNombre === "function" ? getOficinaNombre(val) : val;
            return (
              <option key={val} value={val}>
                {label}
              </option>
            );
          })}
        </select>

        <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excluirRenovaciones}
            onChange={(e) => setExcluirRenovaciones(e.target.checked)}
            className="accent-emerald-500"
          />
          Excluir renovaciones
        </label>
      </div>

      {/* Chips % oficina */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <OficinaChip key={c.oficina} {...c} />
          ))}
        </div>
      )}

      {/* Mensajes */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      {/* Total */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-light tabular-nums text-slate-100">
          {totalGeneral.toLocaleString("es-AR")}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          emisiones en el rango
        </span>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Período
                </th>
                {table.colMeta.map((c) => (
                  <th key={c.oficina} className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border text-[10px] font-medium ${oficinaTone(c.oficina)}`}
                    >
                      {c.oficina_nombre}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {table.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.colMeta.length + 2}
                    className="px-4 py-8 text-center text-slate-600"
                  >
                    {loading ? "Cargando..." : "Sin datos para el rango seleccionado."}
                  </td>
                </tr>
              ) : (
                <>
                  {table.rows.map((r) => (
                    <tr
                      key={r.periodo}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-2 text-slate-400 font-medium">
                        {labelPeriodo(agrupacion, r.periodo)}
                      </td>
                      {table.cols.map((ofi) => (
                        <td
                          key={ofi}
                          className="px-4 py-2 text-right tabular-nums text-slate-300"
                        >
                          {Number(r[ofi] || 0) > 0 ? r[ofi] : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-100">
                        {r.total}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700 bg-slate-900/80">
                    <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      TOTAL
                    </td>
                    {table.cols.map((ofi) => (
                      <td
                        key={ofi}
                        className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-100"
                      >
                        {table.totalsRow[ofi] || 0}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right tabular-nums font-extrabold text-emerald-300">
                      {table.totalsRow.total}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de descarga Excel completo */}
      <ExportExcelModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        apiBase={apiBase}
        desdeInicial={clampIsoDate(desde)}
        hastaInicial={clampIsoDate(hasta)}
        oficinaInicial={oficina}
        oficinasOptions={oficinasOptions}
        getOficinaNombre={getOficinaNombre}
      />
    </div>
  );
}