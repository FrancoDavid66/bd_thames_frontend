// src/components/estadisticas/AltasPolizasPanel.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { motion } from "framer-motion";
import {
  HiChartBar,
  HiCalendar,
  HiOfficeBuilding,
  HiRefresh,
  HiExclamation,
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

export default function AltasPolizasPanel({
  apiBase,
  oficinas = [],
  getOficinaNombre,
  defaultOficina = "",
}) {
  const [agrupacion, setAgrupacion] = useState("dia"); // dia | semana | mes
  const [oficina, setOficina] = useState(defaultOficina || "");
  const [desde, setDesde] = useState(() => defaultDesdeFor("dia"));
  const [hasta, setHasta] = useState(() => dayjs().format("YYYY-MM-DD"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  // sync con filtro global
  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  // rango sugerido por agrupación
  useEffect(() => {
    setDesde((prev) => prev || defaultDesdeFor(agrupacion));
  }, [agrupacion]);

  const oficinasOptions = useMemo(() => {
    const base = Array.isArray(oficinas) ? oficinas : [];
    const ids = base.map((o) => String(o.id));
    const extras = ["OTRAS", "SIN_OFICINA"];
    return Array.from(new Set([...ids, ...extras]));
  }, [oficinas]);

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

      // ✅ CLAVE: queremos “solicitud de alta”
      params.set("motivo", "ALTA_POLIZA");

      // ✅ probamos rutas en orden (por compatibilidad)
      const candidates = [
        // (vieja/ideal si existiera)
        `${apiBase}estadisticas/polizas/altas/serie/?${params.toString()}`,
        // (la que normalmente existe en tu backend)
        `${apiBase}estadisticas/solicitudes/serie/?${params.toString()}`,
        // (fallback extra por si lo publicaste así)
        `${apiBase}estadisticas/altas/serie/?${params.toString()}`,
      ];

      let data = null;
      let lastErr = null;

      for (const url of candidates) {
        try {
          data = await fetchJsonTry(url, { credentials: "include" });
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          // si no es 404, cortamos (puede ser 401/500 real)
          if (e?.status && e.status !== 404) break;
        }
      }

      if (!data) {
        const msg =
          lastErr?.status === 404
            ? "No se encontró el endpoint para altas. Verificá que exista /api/estadisticas/solicitudes/serie/."
            : "No se pudieron cargar las altas. Revisá logs del backend.";
        throw new Error(msg);
      }

      setPayload(data || null);
    } catch (e) {
      console.error("[AltasPolizasPanel] Error:", e);
      setPayload(null);
      setError(
        "No se pudieron cargar las altas de póliza (solicitud de alta). Revisá el endpoint /api/estadisticas/solicitudes/serie/ y que acepte motivo=ALTA_POLIZA."
      );
    } finally {
      setLoading(false);
    }
  }, [apiBase, agrupacion, desde, hasta, oficina]);

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
                Altas de póliza por oficina
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Cuenta solicitudes con motivo <span className="text-slate-200">ALTA_POLIZA</span> por{" "}
                {agrupacion === "dia"
                  ? "día"
                  : agrupacion === "semana"
                  ? "semana"
                  : "mes"}
                .
              </p>
            </div>
          </div>
        </div>

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
      </div>

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
                {typeof getOficinaNombre === "function"
                  ? getOficinaNombre(id)
                  : id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Desde</label>
          <input
            type="date"
            value={clampIsoDate(desde)}
            onChange={(e) => setDesde(e.target.value)}
            className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Hasta</label>
          <input
            type="date"
            value={clampIsoDate(hasta)}
            onChange={(e) => setHasta(e.target.value)}
            className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
          />
        </div>
      </div>

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
          Total altas (rango)
        </div>
        <div className="text-lg sm:text-2xl font-semibold tabular-nums">
          {totalGeneral}
        </div>
      </div>

      {/* tabla */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="px-3 py-2 text-slate-300 font-semibold">
                  Período
                </th>
                {table.colMeta.map((c) => (
                  <th
                    key={c.oficina}
                    className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap"
                  >
                    {c.oficina_nombre}
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
                    {loading
                      ? "Cargando..."
                      : "Sin datos para el rango seleccionado."}
                  </td>
                </tr>
              ) : (
                <>
                  {table.rows.map((r, idx) => (
                    <tr
                      key={`${r.periodo}-${idx}`}
                      className={`border-b border-slate-800/70 ${
                        idx % 2 === 0 ? "bg-slate-950/10" : "bg-slate-950/0"
                      }`}
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
                    </tr>
                  ))}

                  <tr className="bg-slate-900/60">
                    <td className="px-3 py-2 text-slate-50 font-semibold">
                      TOTAL
                    </td>
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
          Fuente: {payload?.fuente || "live"} · Rango:{" "}
          {payload?.desde || clampIsoDate(desde) || "—"} →{" "}
          {payload?.hasta || clampIsoDate(hasta) || "—"} · motivo=ALTA_POLIZA
        </div>
      </div>
    </AnimatedCard>
  );
}
