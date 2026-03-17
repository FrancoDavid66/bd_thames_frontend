import React from "react";
import { HiOutlineChartPie } from "react-icons/hi";

const agruparPorCategoria = (items = []) => {
  const resumen = {};

  items.forEach(({ categoria, monto }) => {
    const key = categoria || "Sin categoría";
    const n = Number(String(monto).replace(",", ".")) || 0;
    if (!resumen[key]) resumen[key] = 0;
    resumen[key] += n;
  });

  // 🚀 MEJORA: Convertimos a array y ordenamos de MAYOR a MENOR total
  return Object.entries(resumen)
    .map(([cat, total]) => ({
      categoria: cat,
      total,
    }))
    .sort((a, b) => b.total - a.total);
};

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const BalanceCategorySummary = ({ ingresos = [], egresos = [] }) => {
  const ingresosPorCategoria = agruparPorCategoria(ingresos);
  const egresosPorCategoria = agruparPorCategoria(egresos);

  return (
    <div className="bg-zinc-950/70 dark:bg-zinc-950/80 border border-zinc-900 rounded-3xl px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/20 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-white shadow-inner">
            <HiOutlineChartPie className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-bold text-zinc-50 tracking-tight">
              Resumen por categoría
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Desglose de ingresos y egresos ordenados por impacto
            </p>
          </div>
        </div>
      </div>

      {/* Grilla ingresos / egresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* Ingresos */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-emerald-400/10 border border-emerald-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
            <h4 className="font-bold text-xs sm:text-sm uppercase tracking-[0.15em] text-emerald-400">
              Ingresos
            </h4>
            {ingresosPorCategoria.length > 0 && (
              <span className="text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {ingresosPorCategoria.length} categorías
              </span>
            )}
          </div>
          <ul className="space-y-2 text-xs sm:text-sm">
            {ingresosPorCategoria.map((item) => (
              <li
                key={item.categoria}
                className="flex items-center justify-between gap-2 py-1"
              >
                <span
                  className="truncate text-zinc-200 font-medium"
                  title={item.categoria}
                >
                  {item.categoria}
                </span>
                <span className="font-extrabold text-emerald-300">
                  ${fmtMoney(item.total)}
                </span>
              </li>
            ))}
            {ingresosPorCategoria.length === 0 && (
              <li className="text-xs sm:text-sm text-emerald-100/50 italic py-2">
                Sin ingresos registrados
              </li>
            )}
          </ul>
        </div>

        {/* Egresos */}
        <div className="bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-amber-500/10 border border-rose-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-rose-500/20 pb-2">
            <h4 className="font-bold text-xs sm:text-sm uppercase tracking-[0.15em] text-rose-400">
              Egresos
            </h4>
            {egresosPorCategoria.length > 0 && (
              <span className="text-[10px] font-semibold tracking-wide uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                {egresosPorCategoria.length} categorías
              </span>
            )}
          </div>
          <ul className="space-y-2 text-xs sm:text-sm">
            {egresosPorCategoria.map((item) => (
              <li
                key={item.categoria}
                className="flex items-center justify-between gap-2 py-1"
              >
                <span
                  className="truncate text-zinc-200 font-medium"
                  title={item.categoria}
                >
                  {item.categoria}
                </span>
                <span className="font-extrabold text-rose-300">
                  ${fmtMoney(item.total)}
                </span>
              </li>
            ))}
            {egresosPorCategoria.length === 0 && (
              <li className="text-xs sm:text-sm text-rose-100/50 italic py-2">
                Sin egresos registrados
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BalanceCategorySummary;