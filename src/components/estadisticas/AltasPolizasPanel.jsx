// src/components/estadisticas/AltasPolizasPanel.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
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

const monthBounds = (anio, mes) => {
  const y = Number(anio);
  const m = Number(mes);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return { desde: "", hasta: "" };
  }
  const base = dayjs(
    `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`
  );
  if (!base.isValid()) return { desde: "", hasta: "" };
  return {
    desde: base.startOf("month").format("YYYY-MM-DD"),
    hasta: base.endOf("month").format("YYYY-MM-DD"),
  };
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
  anio,
  mes,
}) {
  const boundsMes = useMemo(() => monthBounds(anio, mes), [anio, mes]);
  const tieneMes = Boolean(boundsMes.desde && boundsMes.hasta);

  const [rangeMode, setRangeMode] = useState(() => (tieneMes ? "mes" : "custom")); // mes | custom
  const [agrupacion, setAgrupacion] = useState("dia"); // dia | semana | mes
  const [oficina, setOficina] = useState(defaultOficina || "");

  const [desde, setDesde] = useState(() =>
    tieneMes ? boundsMes.desde : defaultDesdeFor("dia")
  );
  const [hasta, setHasta] = useState(() =>
    tieneMes ? boundsMes.hasta : dayjs().format("YYYY-MM-DD")
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  // sync con filtro global (oficina)
  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  // si estás en modo “mes seleccionado”, mantenemos el rango alineado al mes/anio del filtro superior
  useEffect(() => {
    if (rangeMode !== "mes") return;
    if (!tieneMes) return;
    setDesde(boundsMes.desde);
    setHasta(boundsMes.hasta);
  }, [rangeMode, tieneMes, boundsMes.desde, boundsMes.hasta]);

  // rango sugerido por agrupación (solo si NO estamos en modo mes)
  useEffect(() => {
    if (rangeMode === "mes" && tieneMes) return;
    setDesde((prev) => prev || defaultDesdeFor(agrupacion));
  }, [agrupacion, rangeMode, tieneMes]);

  const oficinasOptions = useMemo(() => {
    const base = Array.isArray(oficinas) ? oficinas : [];
    const ids = base.map((o) => String(o?.id ?? "")).filter(Boolean);
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

      // ✅ probamos rutas en orden (compatibilidad)
      const candidates = [
        `${apiBase}estadisticas/solicitudes/serie/?${params.toString()}`,
        `${apiBase}estadisticas/polizas/altas/serie/?${params.toString()}`,
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
          if (e?.status && e.status !== 404) break;
        }
      }

      if (!data) {
        const msg =
          lastErr?.status === 404
            ? "No se encontró el endpoint para altas. Probá /api/estadisticas/solicitudes/serie/."
            : "No se pudieron cargar las altas de póliza. Revisá el endpoint /api/estadisticas/solicitudes/serie/.";
        throw new Error(msg);
      }

      setPayload(data);
    } catch (e) {
      console.error("[AltasPolizasPanel] error:", e);
      setPayload(null);
      setError(e?.message || "No se pudieron cargar las altas de póliza.");
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

    const map = new Map(arr.map((o) => [String(o?.oficina || ""), o]));
    const out = [];
    order.forEach((k) => {
      if (map.has(k)) out.push(map.get(k));
    });

    return out.length ? out : arr;
  }, [payload]);

  const table = useMemo(() => {
    const cols = oficinasSerie.map((o) => String(o?.oficina || ""));
    const colMeta = oficinasSerie.map((o) => {
      const ofi = String(o?.oficina || "");
      return {
        oficina: ofi,
        oficina_nombre:
          o?.oficina_nombre ||
          (typeof getOficinaNombre === "function" ? getOficinaNombre(ofi) : ofi),
      };
    });

    const periodsSet = new Set();
    const seriesByOfi = new Map();

    oficinasSerie.forEach((o) => {
      const ofi = String(o?.oficina || "");
      const serie = Array.isArray(o?.serie) ? o.serie : [];
      const m = new Map();

      serie.forEach((p) => {
        const key = String(p?.periodo || "");
        if (!key) return;
        periodsSet.add(key);
        m.set(key, Number(p?.total || 0));
      });

      seriesByOfi.set(ofi, m);
    });

    const periods = Array.from(periodsSet);
    periods.sort((a, b) => {
      const da = dayjs(a);
      const db = dayjs(b);
      if (da.isValid() && db.isValid()) return da.valueOf() - db.valueOf();
      return String(a).localeCompare(String(b));
    });

    const rows = periods.map((periodo) => {
      const row = { periodo, periodo_label: labelPeriodo(agrupacion, periodo), total: 0 };
      cols.forEach((ofi) => {
        const m = seriesByOfi.get(ofi);
        const v = Number(m?.get(periodo) || 0);
        row[ofi] = v;
        row.total += v;
      });
      return row;
    });

    const totalsRow = { total: 0 };
    cols.forEach((ofi) => {
      const sum = rows.reduce((acc, r) => acc + Number(r[ofi] || 0), 0);
      totalsRow[ofi] = sum;
      totalsRow.total += sum;
    });

    return { colMeta, cols, rows, totalsRow };
  }, [oficinasSerie, agrupacion, getOficinaNombre]);

  const totalGeneral = Number(table?.totalsRow?.total || 0);
  const disabledDates = rangeMode === "mes" && tieneMes;

  return (
    <AnimatedCard
      index={4}
      interactive={false}
      glow="from-emerald-500/35 via-cyan-500/20 to-transparent"
    >
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-[0_0_24px_rgba(15,23,42,0.55)] overflow-hidden">
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/25">
              <HiChartBar className="text-lg" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-slate-50">
                Altas de póliza por oficina
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Cuenta solicitudes con motivo{" "}
                <span className="text-slate-200">ALTA_POLIZA</span> por{" "}
                {agrupacion === "dia"
                  ? "día"
                  : agrupacion === "semana"
                  ? "semana"
                  : "mes"}
                .
                {tieneMes && rangeMode === "mes" ? (
                  <span className="text-slate-500">
                    {" "}
                    (mes seleccionado: {String(mes).padStart(2, "0")}/{anio})
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={fetchSerie}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-200 hover:bg-slate-800/40 cursor-pointer"
          >
            <HiRefresh className={loading ? "animate-spin" : ""} />
            <span className="text-xs sm:text-sm">{loading ? "Cargando..." : "Refrescar"}</span>
          </motion.button>
        </div>

        <div className="px-4 pb-4">
          <div
            className={`grid gap-3 sm:grid-cols-2 ${
              tieneMes ? "lg:grid-cols-5" : "lg:grid-cols-4"
            }`}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 inline-flex items-center gap-2">
                <HiCalendar className="opacity-70" />
                Agrupación
              </label>
              <select
                value={agrupacion}
                onChange={(e) => setAgrupacion(e.target.value)}
                className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
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
                className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
              >
                <option value="">Todas</option>
                {oficinasOptions.map((id) => (
                  <option key={id} value={id}>
                    {typeof getOficinaNombre === "function" ? getOficinaNombre(id) : id}
                  </option>
                ))}
              </select>
            </div>

            {tieneMes ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Rango</label>
                <select
                  value={rangeMode}
                  onChange={(e) => setRangeMode(e.target.value)}
                  className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
                >
                  <option value="mes">Mes seleccionado</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Desde</label>
              <input
                type="date"
                value={clampIsoDate(desde)}
                disabled={disabledDates}
                onChange={(e) => {
                  setRangeMode("custom");
                  setDesde(e.target.value);
                }}
                className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Hasta</label>
              <input
                type="date"
                value={clampIsoDate(hasta)}
                disabled={disabledDates}
                onChange={(e) => {
                  setRangeMode("custom");
                  setHasta(e.target.value);
                }}
                className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-3">
            <div className="text-[0.65rem] uppercase tracking-wide text-slate-400">
              Total altas (rango)
            </div>
            <div className="text-lg sm:text-2xl font-semibold tabular-nums text-slate-50">
              {Number(totalGeneral || 0).toLocaleString("es-AR")}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/50 bg-rose-950/30 px-3 py-2 text-xs sm:text-sm text-rose-100 flex items-center gap-2">
              <HiExclamation />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-900/60 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">
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
                    <th className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {table.rows.length ? (
                    table.rows.map((r) => (
                      <tr key={r.periodo} className="hover:bg-slate-900/30">
                        <td className="px-3 py-2 text-slate-200 whitespace-nowrap">
                          {r.periodo_label}
                        </td>

                        {table.cols.map((ofi) => (
                          <td
                            key={`${r.periodo}-${ofi}`}
                            className="px-3 py-2 text-slate-200 tabular-nums"
                          >
                            {Number(r[ofi] || 0).toLocaleString("es-AR")}
                          </td>
                        ))}

                        <td className="px-3 py-2 text-slate-50 font-semibold tabular-nums">
                          {Number(r.total || 0).toLocaleString("es-AR")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={table.cols.length + 2}
                        className="px-3 py-4 text-slate-400 text-center"
                      >
                        {loading ? "Cargando..." : "Sin datos para el rango seleccionado."}
                      </td>
                    </tr>
                  )}
                </tbody>

                {table.rows.length ? (
                  <tfoot className="bg-slate-900/60 border-t border-slate-800">
                    <tr>
                      <td className="px-3 py-2 text-slate-200 font-semibold">Totales</td>
                      {table.cols.map((ofi) => (
                        <td
                          key={`tot-${ofi}`}
                          className="px-3 py-2 text-slate-200 font-semibold tabular-nums"
                        >
                          {Number(table.totalsRow[ofi] || 0).toLocaleString("es-AR")}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-slate-50 font-semibold tabular-nums">
                        {Number(table.totalsRow.total || 0).toLocaleString("es-AR")}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <div className="px-3 py-2 text-[0.7rem] text-slate-400 border-t border-slate-800">
              Fuente: {payload?.fuente || "live"} · Rango:{" "}
              {payload?.desde || clampIsoDate(desde) || "—"} →{" "}
              {payload?.hasta || clampIsoDate(hasta) || "—"} · motivo=ALTA_POLIZA
            </div>
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
}
