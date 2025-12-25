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
  // hora/día: último mes aprox
  if (agrupacion === "mes") return hoy.subtract(12, "month").format("YYYY-MM-DD");
  if (agrupacion === "semana") return hoy.subtract(12, "week").format("YYYY-MM-DD");
  return hoy.subtract(30, "day").format("YYYY-MM-DD");
};

const labelPeriodo = (agrupacion, periodo) => {
  const p = String(periodo || "").trim();
  if (!p) return "—";

  // Soportar "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD HH:mm:ss"
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

/**
 * Panel de EMISIONES (fecha_emision) por oficina y por período.
 *
 * Props opcionales para sincronizar con filtros globales:
 * - anio: number|string (ej "2025")
 * - mes: number|string (1..12 o "01".."12")
 */
export default function AltasPolizasPanel({
  apiBase,
  oficinas = [],
  getOficinaNombre,
  defaultOficina = "",

  // 🔁 filtros globales opcionales (para "Mes seleccionado")
  anio,
  mes,
}) {
  const [agrupacion, setAgrupacion] = useState("dia"); // hora | dia | semana | mes
  const [oficina, setOficina] = useState(defaultOficina || "");

  // Si vienen mes/año globales, por defecto usamos "Mes seleccionado"
  const hasMesGlobal = useMemo(() => {
    const a = String(anio || "").trim();
    const m = String(mes || "").trim();
    return Boolean(a) && Boolean(m);
  }, [anio, mes]);

  const [usarMesSeleccionado, setUsarMesSeleccionado] = useState(() => {
    return Boolean(String(anio || "").trim()) && Boolean(String(mes || "").trim());
  });

  const [desdeManual, setDesdeManual] = useState(() => defaultDesdeFor("dia"));
  const [hastaManual, setHastaManual] = useState(() => dayjs().format("YYYY-MM-DD"));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  // sync con filtro global de oficina
  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  // si aparece/desaparece mes global, ajustamos el default
  useEffect(() => {
    if (hasMesGlobal) setUsarMesSeleccionado(true);
  }, [hasMesGlobal]);

  // rango sugerido por agrupación solo si estamos en modo manual
  useEffect(() => {
    if (!usarMesSeleccionado) {
      setDesdeManual((prev) => prev || defaultDesdeFor(agrupacion));
      setHastaManual((prev) => prev || dayjs().format("YYYY-MM-DD"));
    }
  }, [agrupacion, usarMesSeleccionado]);

  const computedRange = useMemo(() => {
    // Mes seleccionado (calendario): desde = 1er día, hasta = último día
    if (usarMesSeleccionado && hasMesGlobal) {
      const a = String(anio).trim();
      const mRaw = String(mes).trim();
      const m = mRaw.length === 1 ? `0${mRaw}` : mRaw; // "1" -> "01"

      const start = dayjs(`${a}-${m}-01`).startOf("day");
      const end = start.endOf("month").startOf("day"); // mantenemos formato date (YYYY-MM-DD)
      return {
        desde: start.isValid() ? start.format("YYYY-MM-DD") : "",
        hasta: end.isValid() ? end.format("YYYY-MM-DD") : "",
        mode: "mes",
      };
    }

    return {
      desde: clampIsoDate(desdeManual),
      hasta: clampIsoDate(hastaManual),
      mode: "manual",
    };
  }, [usarMesSeleccionado, hasMesGlobal, anio, mes, desdeManual, hastaManual]);

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

      if (computedRange.desde) params.set("desde", computedRange.desde);
      if (computedRange.hasta) params.set("hasta", computedRange.hasta);

      if (oficina) params.set("oficina", oficina);

      // ✅ CLAVE: queremos EMISIONES por fecha_emision
      // (si tu backend soporta elegir campo, genial; si no, igual queda documentado)
      params.set("date_field", "fecha_emision");

      // ✅ probamos rutas en orden (compatibilidad)
      const candidates = [
        // recomendado (nuevo): serie de emisiones por oficina usando fecha_emision
        `${apiBase}estadisticas/polizas/emisiones/serie/?${params.toString()}`,
        // alternativo genérico si ya existe en tu proyecto
        `${apiBase}estadisticas/polizas/serie/?${params.toString()}`,
        // fallback (si por-oficina termina devolviendo series en tu implementación)
        `${apiBase}estadisticas/polizas/por-oficina/?${params.toString()}`,
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
            ? "No se encontró el endpoint de emisiones. Ideal: /api/estadisticas/polizas/emisiones/serie/."
            : "No se pudieron cargar las emisiones. Revisá logs del backend.";
        throw new Error(msg);
      }

      setPayload(data || null);
    } catch (e) {
      console.error("[AltasPolizasPanel] Error:", e);
      setPayload(null);
      setError(
        "No se pudieron cargar las emisiones por fecha_emision. Verificá que exista un endpoint de serie (ideal: /api/estadisticas/polizas/emisiones/serie/) y que aplique filtros oficina+desde+hasta."
      );
    } finally {
      setLoading(false);
    }
  }, [apiBase, agrupacion, computedRange.desde, computedRange.hasta, oficina]);

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

  const footerDesde = payload?.desde || computedRange.desde || "—";
  const footerHasta = payload?.hasta || computedRange.hasta || "—";

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
                Cuenta pólizas emitidas por <span className="text-slate-200">fecha_emision</span> por{" "}
                {agrupacion === "hora"
                  ? "hora"
                  : agrupacion === "dia"
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
                {typeof getOficinaNombre === "function"
                  ? getOficinaNombre(id)
                  : id}
              </option>
            ))}
          </select>
        </div>

        {/* Mes seleccionado (si hay mes/año global) */}
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label className="text-xs text-slate-400">Rango</label>
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-950/40 border border-slate-800 p-3">
            {hasMesGlobal ? (
              <>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={usarMesSeleccionado}
                    onChange={(e) => setUsarMesSeleccionado(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                  />
                  Usar mes seleccionado (filtros superiores)
                </label>

                {usarMesSeleccionado ? (
                  <div className="text-xs text-slate-400">
                    Mes:{" "}
                    <span className="text-slate-200 font-medium">
                      {String(anio)}-{String(mes).padStart(2, "0")}
                    </span>{" "}
                    · Rango:{" "}
                    <span className="text-slate-200 font-medium">
                      {computedRange.desde} → {computedRange.hasta}
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-xs text-slate-400">
                No hay mes/año global en props. Usando rango manual.
              </div>
            )}

            {/* rango manual */}
            {!usarMesSeleccionado && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[0.7rem] text-slate-400">Desde</span>
                  <input
                    type="date"
                    value={clampIsoDate(desdeManual)}
                    onChange={(e) => setDesdeManual(e.target.value)}
                    className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[0.7rem] text-slate-400">Hasta</span>
                  <input
                    type="date"
                    value={clampIsoDate(hastaManual)}
                    onChange={(e) => setHastaManual(e.target.value)}
                    className="h-11 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>
              </div>
            )}
          </div>
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
          Total emisiones (rango)
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
          Fuente: {payload?.fuente || "live"} · Campo:{" "}
          <span className="text-slate-200">fecha_emision</span> · Rango:{" "}
          {footerDesde} → {footerHasta}
          {payload?.date_field ? (
            <>
              {" "}
              · date_field backend:{" "}
              <span className="text-slate-200">{payload.date_field}</span>
            </>
          ) : null}
        </div>
      </div>
    </AnimatedCard>
  );
}
