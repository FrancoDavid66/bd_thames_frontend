// src/components/estadisticas/VehiculosPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  HiTruck,
  HiOfficeBuilding,
  HiCalendar,
  HiSearch,
  HiDownload,
  HiShieldCheck,
  HiRefresh,
} from "react-icons/hi";
import AnimatedCard from "./AnimatedCard";

const boolToParam = (v) => (v ? "1" : "0");

const TIPOS = [
  "",
  "Auto",
  "Camioneta",
  "Camion",
  "Moto",
  "Trailer",
];

export default function VehiculosPanel({
  apiBase,
  oficinas,
  getOficinaNombre,
  defaultOficina = "",
  onOpenExport,
}) {
  const [oficina, setOficina] = useState(defaultOficina || "");
  const [tipo, setTipo] = useState("");
  const [anio, setAnio] = useState("");
  const [anioDesde, setAnioDesde] = useState("");
  const [anioHasta, setAnioHasta] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [patente, setPatente] = useState("");
  const [soloActivas, setSoloActivas] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    setOficina(defaultOficina || "");
  }, [defaultOficina]);

  const filtros = useMemo(() => {
    return {
      oficina,
      tipo,
      anio,
      anio_desde: anioDesde,
      anio_hasta: anioHasta,
      marca,
      modelo,
      patente,
      solo_activas: soloActivas,
    };
  }, [oficina, tipo, anio, anioDesde, anioHasta, marca, modelo, patente, soloActivas]);

  const buildParams = (f) => {
    const p = new URLSearchParams();
    if (f.oficina) p.set("oficina", f.oficina);
    if (f.tipo) p.set("tipo", f.tipo);
    if (String(f.anio || "").trim()) p.set("anio", String(f.anio).trim());
    if (String(f.anio_desde || "").trim()) p.set("anio_desde", String(f.anio_desde).trim());
    if (String(f.anio_hasta || "").trim()) p.set("anio_hasta", String(f.anio_hasta).trim());
    if (String(f.marca || "").trim()) p.set("marca", String(f.marca).trim());
    if (String(f.modelo || "").trim()) p.set("modelo", String(f.modelo).trim());
    if (String(f.patente || "").trim()) p.set("patente", String(f.patente).trim());
    p.set("solo_activas", boolToParam(!!f.solo_activas));
    return p;
  };

  const fetchResumen = async () => {
    setLoading(true);
    setError("");
    try {
      const params = buildParams(filtros);
      const url = `${apiBase}estadisticas/vehiculos/resumen/?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        let msg = `Error HTTP ${res.status}`;
        try {
          const d = await res.json();
          msg = d?.detail || d?.error || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setError(String(e?.message || "No se pudo cargar el resumen."));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // debounce al cambiar filtros
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResumen();
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const total = Number(data?.total_polizas || 0);
  const activas = Number(data?.total_activas || 0);
  const porTipo = data?.por_tipo || {};
  const porAnio = data?.por_anio || {};
  const porOficina = data?.por_oficina || {};

  const topTipos = useMemo(() => {
    const entries = Object.entries(porTipo || {});
    entries.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
    return entries.slice(0, 6);
  }, [porTipo]);

  const topAnios = useMemo(() => {
    const entries = Object.entries(porAnio || {});
    entries.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
    return entries.slice(0, 8);
  }, [porAnio]);

  const handleOpenExport = () => {
    onOpenExport?.({
      ...filtros,
      // defaults del modal
      formato: "xlsx",
    });
  };

  const oficinaLabel = useMemo(() => getOficinaNombre(oficina), [oficina, getOficinaNombre]);

  return (
    <AnimatedCard index={9} interactive={false} glow="from-sky-500/40 via-emerald-500/20 to-transparent">
      <div className="flex flex-col gap-4">
        {/* Header del panel */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-300">
              <HiTruck className="h-4 w-4 text-emerald-300" />
              Análisis de vehículos
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Filtrá por oficina, tipo, año y más — y exportá el resultado.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={fetchResumen}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-700/80"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <HiRefresh className={loading ? "animate-spin" : ""} />
              {loading ? "Cargando..." : "Refrescar"}
            </motion.button>

            <motion.button
              type="button"
              onClick={handleOpenExport}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-900/40"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <HiDownload className="h-4 w-4" />
              Exportar vehículos
            </motion.button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Oficina */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiOfficeBuilding className="text-sky-300" />
              Oficina
            </label>
            <select
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={oficina}
              onChange={(e) => setOficina(e.target.value)}
            >
              <option value="">Todas</option>
              {oficinas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500">
              Seleccionada:{" "}
              <span className="text-slate-300 font-medium">
                {oficina ? oficinaLabel : "Todas"}
              </span>
            </div>
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiTruck className="text-emerald-300" />
              Tipo
            </label>
            <select
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {TIPOS.map((t) => (
                <option key={t || "all"} value={t}>
                  {t ? t : "Todos"}
                </option>
              ))}
            </select>
          </div>

          {/* Año exacto */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiCalendar className="text-sky-300" />
              Año exacto
            </label>
            <input
              type="number"
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="Ej: 2005"
            />
          </div>

          {/* Solo activas */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200">&nbsp;</label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/20 px-3 py-3 cursor-pointer h-10">
              <input
                type="checkbox"
                className="h-4 w-4 accent-sky-500"
                checked={soloActivas}
                onChange={(e) => setSoloActivas(e.target.checked)}
              />
              <span className="text-sm text-slate-200 flex items-center gap-1.5">
                <HiShieldCheck className="h-4 w-4 text-emerald-300" />
                Solo activas
              </span>
            </label>
          </div>

          {/* Año desde/hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiCalendar className="text-sky-300" />
              Año desde
            </label>
            <input
              type="number"
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={anioDesde}
              onChange={(e) => setAnioDesde(e.target.value)}
              placeholder="Ej: 2000"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiCalendar className="text-sky-300" />
              Año hasta
            </label>
            <input
              type="number"
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={anioHasta}
              onChange={(e) => setAnioHasta(e.target.value)}
              placeholder="Ej: 2010"
            />
          </div>

          {/* Marca / Modelo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiSearch className="text-sky-300" />
              Marca
            </label>
            <input
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="Ej: Ford"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiSearch className="text-sky-300" />
              Modelo
            </label>
            <input
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ej: Ranger"
            />
          </div>

          {/* Patente */}
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <HiSearch className="text-sky-300" />
              Patente (contiene)
            </label>
            <input
              className="h-10 rounded-xl bg-slate-950 border border-slate-700 text-sm px-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={patente}
              onChange={(e) => setPatente(e.target.value)}
              placeholder="Ej: AA123BB"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Total vehículos (pólizas)
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-50">
              {total.toLocaleString("es-AR")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Con los filtros actuales.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Activas
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-50">
              {activas.toLocaleString("es-AR")}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Estado <strong>activa</strong>.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Oficina / Tipo
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {oficina ? oficinaLabel : "Todas"} · {tipo || "Todos"}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {anio ? `Año: ${anio}` : anioDesde || anioHasta ? `Rango: ${anioDesde || "—"}–${anioHasta || "—"}` : "Sin filtro de año"}
            </div>
          </div>
        </div>

        {/* Distribuciones */}
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/10 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2">
              Top tipos
            </div>
            {topTipos.length === 0 ? (
              <div className="text-xs text-slate-400">Sin datos.</div>
            ) : (
              <div className="space-y-1">
                {topTipos.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{k}</span>
                    <span className="text-slate-100 font-semibold">
                      {Number(v || 0).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Hint: si estás filtrando por oficina, igual te mostramos qué vio el backend */}
            {Object.keys(porOficina || {}).length > 0 && (
              <div className="mt-3 text-[11px] text-slate-500">
                Oficinas en el set:{" "}
                {Object.keys(porOficina)
                  .slice(0, 3)
                  .map((o) => getOficinaNombre(o))
                  .join(" · ")}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/10 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300 mb-2">
              Top años
            </div>
            {topAnios.length === 0 ? (
              <div className="text-xs text-slate-400">Sin datos.</div>
            ) : (
              <div className="space-y-1">
                {topAnios.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{k}</span>
                    <span className="text-slate-100 font-semibold">
                      {Number(v || 0).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
}
