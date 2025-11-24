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
 * Si se pasan props de ambos modos, se muestran ambas pestañas.
 *
 * Paleta y estética alineadas al proyecto (fondos zinc, acción azul, card redondeada).
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
  // ¿Qué modos están disponibles?
  const hasDia = typeof onChange === "function";
  const hasRango =
    typeof onFiltrar === "function" &&
    Array.isArray(ingresos) &&
    Array.isArray(egresos);

  const defaultTab = hasDia ? "dia" : "rango";
  const [tab, setTab] = useState(defaultTab);

  // Estado local para rango
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const hoy = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const ayer = useMemo(
    () => dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    []
  );

  // --- Acciones modo DÍA ---
  const setHoy = () => {
    if (onChange) onChange(hoy);
  };
  const setAyer = () => {
    if (onChange) onChange(ayer);
  };

  // --- Acciones modo RANGO ---
  const filtrarPorFecha = () => {
    if (!hasRango) return;
    if (!fechaInicio || !fechaFin) return;

    const desde = dayjs(fechaInicio).startOf("day");
    const hasta = dayjs(fechaFin).endOf("day");

    const ingresosFiltrados = (ingresos || []).filter((i) => {
      const f = dayjs(i?.fecha);
      return (
        f.isValid() &&
        (f.isAfter(desde) || f.isSame(desde)) &&
        (f.isBefore(hasta) || f.isSame(hasta))
      );
    });

    const egresosFiltrados = (egresos || []).filter((e) => {
      const f = dayjs(e?.fecha);
      return (
        f.isValid() &&
        (f.isAfter(desde) || f.isSame(desde)) &&
        (f.isBefore(hasta) || f.isSame(hasta))
      );
    });

    onFiltrar({ ingresos: ingresosFiltrados, egresos: egresosFiltrados });
  };

  return (
    <div
      className={`bg-zinc-950/80 border border-zinc-900 rounded-3xl px-3 py-3 sm:px-4 sm:py-4 shadow-lg shadow-black/20 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-sm">
            <span>📅</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-50">
              Filtro de fecha
            </h3>
            <p className="text-[10px] text-zinc-500">
              Elegí día o rango para el balance
            </p>
          </div>
        </div>

        {hasDia && hasRango && (
          <div className="flex w-full sm:w-auto">
            <div className="flex flex-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setTab("dia")}
                className={`flex-1 px-2.5 py-1.5 rounded-2xl transition ${
                  tab === "dia"
                    ? "bg-zinc-100 text-zinc-900 font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                Día
              </button>
              <button
                type="button"
                onClick={() => setTab("rango")}
                className={`flex-1 px-2.5 py-1.5 rounded-2xl transition ${
                  tab === "rango"
                    ? "bg-zinc-100 text-zinc-900 font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                Rango
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- MODO DÍA ---- */}
      {hasDia && tab === "dia" && (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
              Fecha
            </label>
            <input
              type="date"
              value={value || hoy}
              onChange={(e) => onChange && onChange(e.target.value)}
              className="w-full px-2.5 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-50 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={setHoy}
              className="px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-[11px] sm:text-xs hover:bg-zinc-800"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setAyer}
              className="px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-[11px] sm:text-xs hover:bg-zinc-800"
            >
              Ayer
            </button>
          </div>
        </div>
      )}

      {/* ---- MODO RANGO ---- */}
      {hasRango && tab === "rango" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
              Desde
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-2.5 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-50 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-[11px] sm:text-xs mb-1 text-zinc-400">
              Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-2.5 py-2 rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-50 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={filtrarPorFecha}
              disabled={!fechaInicio || !fechaFin}
              className={`w-full px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition ${
                !fechaInicio || !fechaFin
                  ? "bg-sky-500/30 text-sky-100/70 cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-600"
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
