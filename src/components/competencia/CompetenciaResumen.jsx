// src/components/competencia/CompetenciaResumen.jsx
import { motion } from "framer-motion";
import {
  HiChartBar,
  HiTrendingUp,
  HiCurrencyDollar,
  HiLocationMarker,
} from "react-icons/hi";

const formatMoney = (value) => {
  if (value == null) return "—";
  return `$${Number(value).toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
};

const listFromObject = (obj) =>
  Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

const listPromedios = (obj) =>
  Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

const CompetenciaResumen = ({ stats }) => {
  const {
    totalRegistros,
    totalCompetidores,
    promedioPrecio,
    minPrecio,
    maxPrecio,
    porCobertura,
    porCompania,
    porCiudad,
    promedioPorCobertura,
    promedioPorCompania,
  } = stats || {};

  const topCoberturas = listFromObject(porCobertura);
  const topCompanias = listFromObject(porCompania);
  const topCiudades = listFromObject(porCiudad);

  const topPromedioCobertura = listPromedios(promedioPorCobertura);
  const topPromedioCompania = listPromedios(promedioPorCompania);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          layout
          className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Competidores</span>
            <HiChartBar className="w-4 h-4 text-primary-300" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {totalCompetidores || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Distintos nombres detectados en la tabla.
          </p>
        </motion.div>

        <motion.div
          layout
          className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Registros</span>
            <HiTrendingUp className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {totalRegistros || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Filas cargadas (puede haber varias por competidor).
          </p>
        </motion.div>

        <motion.div
          layout
          className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Precio promedio</span>
            <HiCurrencyDollar className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {formatMoney(promedioPrecio)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Rango: {formatMoney(minPrecio)} – {formatMoney(maxPrecio)}
          </p>
        </motion.div>
      </div>

      {/* Distribuciones básicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Top compañías (por cantidad)
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {topCompanias.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Todavía no cargaste compañías en los registros.
              </p>
            )}
            {topCompanias.map(([compania, count]) => (
              <div
                key={compania}
                className="flex items-center justify-between text-xs text-slate-200"
              >
                <span className="truncate mr-2">{compania}</span>
                <span className="tabular-nums text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              Top coberturas (por cantidad)
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {topCoberturas.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Todavía no cargaste coberturas en los registros.
              </p>
            )}
            {topCoberturas.map(([cobertura, count]) => (
              <div
                key={cobertura}
                className="flex items-center justify-between text-xs text-slate-200"
              >
                <span className="truncate mr-2">{cobertura}</span>
                <span className="tabular-nums text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ciudades + promedios de precio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Ciudades */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
              <HiLocationMarker className="w-4 h-4" />
              Zonas con más registros
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {topCiudades.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Todavía no cargaste ciudades en los registros.
              </p>
            )}
            {topCiudades.map(([ciudad, count]) => (
              <div
                key={ciudad}
                className="flex items-center justify-between text-xs text-slate-200"
              >
                <span className="truncate mr-2">{ciudad}</span>
                <span className="tabular-nums text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Promedios de precio */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Precio promedio por compañía
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {topPromedioCompania.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  No hay precios suficientes para calcular promedios.
                </p>
              )}
              {topPromedioCompania.map(([compania, avg]) => (
                <div
                  key={compania}
                  className="flex items-center justify-between text-xs text-slate-200"
                >
                  <span className="truncate mr-2">{compania}</span>
                  <span className="tabular-nums text-slate-400">
                    {formatMoney(avg)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                Precio promedio por cobertura
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {topPromedioCobertura.length === 0 && (
                <p className="text-[11px] text-slate-500">
                  No hay precios suficientes para calcular promedios.
                </p>
              )}
              {topPromedioCobertura.map(([cobertura, avg]) => (
                <div
                  key={cobertura}
                  className="flex items-center justify-between text-xs text-slate-200"
                >
                  <span className="truncate mr-2">{cobertura}</span>
                  <span className="tabular-nums text-slate-400">
                    {formatMoney(avg)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Usá este panel como radar rápido: qué compañías y coberturas dominan,
        en qué zonas tenés más competencia y cómo están los precios promedio.
      </p>
    </div>
  );
};

export default CompetenciaResumen;
