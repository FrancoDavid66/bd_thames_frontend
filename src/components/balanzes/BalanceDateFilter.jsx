import { useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

/**
 * BalanceDateFilter
 *
 * Dos modos:
 * - Modo DÍA: controla una fecha única mediante props { value, onChange }.
 * - Modo RANGO: filtra arrays locales mediante props { ingresos, egresos, onFiltrar }.
 *
 * Si se pasan props de ambos modos, se muestran ambas pestañas; por defecto
 * selecciona el modo acorde a las props recibidas.
 *
 * Paleta y estética alineadas al proyecto (fondos zinc, acción azul).
 */
const BalanceDateFilter = ({
  // MODO DÍA
  value, // 'YYYY-MM-DD'
  onChange,

  // MODO RANGO (fallback para compatibilidad)
  ingresos,
  egresos,
  onFiltrar,

  className = "",
}) => {
  // Detectar automáticamente el modo inicial
  const hasDia = typeof onChange === "function";
  const hasRango = typeof onFiltrar === "function" && Array.isArray(ingresos) && Array.isArray(egresos);

  const defaultTab = hasDia ? "dia" : "rango";
  const [tab, setTab] = useState(defaultTab);

  // Estado local para rango
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const hoy = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const ayer = useMemo(() => dayjs().subtract(1, "day").format("YYYY-MM-DD"), []);

  // --- Acciones modo DÍA ---
  const setHoy = () => onChange && onChange(hoy);
  const setAyer = () => onChange && onChange(ayer);

  // --- Acciones modo RANGO ---
  const filtrarPorFecha = () => {
    if (!hasRango) return;
    if (!fechaInicio || !fechaFin) return;

    const desde = dayjs(fechaInicio).startOf("day");
    const hasta = dayjs(fechaFin).endOf("day");

    const ingresosFiltrados = (ingresos || []).filter((i) => {
      const f = dayjs(i?.fecha);
      return f.isValid() && (f.isAfter(desde) || f.isSame(desde)) && (f.isBefore(hasta) || f.isSame(hasta));
    });

    const egresosFiltrados = (egresos || []).filter((e) => {
      const f = dayjs(e?.fecha);
      return f.isValid() && (f.isAfter(desde) || f.isSame(desde)) && (f.isBefore(hasta) || f.isSame(hasta));
    });

    onFiltrar({ ingresos: ingresosFiltrados, egresos: egresosFiltrados });
  };

  return (
    <div className={`bg-zinc-100 dark:bg-zinc-800 p-3 md:p-4 rounded-xl shadow ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm md:text-base font-semibold">📅 Filtro de fecha</h3>

        {(hasDia && hasRango) && (
          <div className="flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setTab("dia")}
              className={`px-3 py-1 text-sm ${
                tab === "dia"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setTab("rango")}
              className={`px-3 py-1 text-sm ${
                tab === "rango"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
              }`}
            >
              Rango
            </button>
          </div>
        )}
      </div>

      {/* ---- MODO DÍA ---- */}
      {hasDia && tab === "dia" && (
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs md:text-sm mb-1">Fecha</label>
            <input
              type="date"
              value={value || hoy}
              onChange={(e) => onChange && onChange(e.target.value)}
              className="w-full p-2 border rounded bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={setHoy}
              className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setAyer}
              className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
            >
              Ayer
            </button>
          </div>
        </div>
      )}

      {/* ---- MODO RANGO ---- */}
      {hasRango && tab === "rango" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs md:text-sm mb-1">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full p-2 border rounded bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs md:text-sm mb-1">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full p-2 border rounded bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={filtrarPorFecha}
              disabled={!fechaInicio || !fechaFin}
              className={`w-full px-4 py-2 rounded text-white transition ${
                !fechaInicio || !fechaFin
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Aplicar filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDateFilter;
