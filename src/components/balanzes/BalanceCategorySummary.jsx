import React from "react";

const agruparPorCategoria = (items = []) => {
  const resumen = {};

  items.forEach(({ categoria, monto }) => {
    const key = categoria || "Sin categoría";
    const n = Number(String(monto).replace(",", ".")) || 0;
    if (!resumen[key]) resumen[key] = 0;
    resumen[key] += n;
  });

  return Object.entries(resumen).map(([cat, total]) => ({
    categoria: cat,
    total,
  }));
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-lg">
            <span>🧾</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-50">
              Resumen por categoría
            </h3>
            <p className="text-[11px] text-zinc-500">
              Agrupado por ingresos y egresos del período
            </p>
          </div>
        </div>
      </div>

      {/* Grilla ingresos / egresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* Ingresos */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-emerald-400/10 border border-emerald-500/40 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-xs sm:text-sm uppercase tracking-[0.18em] text-emerald-300">
              Ingresos
            </h4>
            {ingresosPorCategoria.length > 0 && (
              <span className="text-[11px] text-emerald-200/80">
                {ingresosPorCategoria.length} categorías
              </span>
            )}
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm">
            {ingresosPorCategoria.map((item) => (
              <li
                key={item.categoria}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-emerald-500/15 last:border-none"
              >
                <span
                  className="truncate text-zinc-100"
                  title={item.categoria}
                >
                  {item.categoria}
                </span>
                <span className="font-semibold text-emerald-200">
                  ${fmtMoney(item.total)}
                </span>
              </li>
            ))}
            {ingresosPorCategoria.length === 0 && (
              <li className="text-xs sm:text-sm text-emerald-100/70">
                Sin ingresos registrados
              </li>
            )}
          </ul>
        </div>

        {/* Egresos */}
        <div className="bg-gradient-to-br from-rose-500/18 via-rose-500/6 to-amber-500/10 border border-rose-500/40 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-xs sm:text-sm uppercase tracking-[0.18em] text-rose-200">
              Egresos
            </h4>
            {egresosPorCategoria.length > 0 && (
              <span className="text-[11px] text-rose-100/80">
                {egresosPorCategoria.length} categorías
              </span>
            )}
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm">
            {egresosPorCategoria.map((item) => (
              <li
                key={item.categoria}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-rose-500/15 last:border-none"
              >
                <span
                  className="truncate text-zinc-100"
                  title={item.categoria}
                >
                  {item.categoria}
                </span>
                <span className="font-semibold text-rose-100">
                  ${fmtMoney(item.total)}
                </span>
              </li>
            ))}
            {egresosPorCategoria.length === 0 && (
              <li className="text-xs sm:text-sm text-rose-50/70">
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
