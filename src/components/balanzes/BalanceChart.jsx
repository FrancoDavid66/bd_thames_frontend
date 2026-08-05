// src/components/balanzes/BalanceChart.jsx  (diseño Duo)
import { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { HiOutlinePresentationChartBar } from "react-icons/hi";

/* ========= Helpers ========= */
const toNumber = (v) => {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function buildDailySeries(ingresos = [], egresos = [], days = 30) {
  const end = dayjs().endOf("day");
  const start = end.subtract(days - 1, "day").startOf("day");

  const base = {};
  for (let d = 0; d < days; d++) {
    const key = start.add(d, "day").format("YYYY-MM-DD");
    base[key] = { key, ingresos: 0, egresos: 0 };
  }

  (ingresos || []).forEach((i) => {
    const f = dayjs(i?.fecha);
    if (f.isValid() && f.isAfter(start) && f.isBefore(end)) {
      const key = f.format("YYYY-MM-DD");
      if (base[key]) base[key].ingresos += toNumber(i?.monto);
    }
  });
  (egresos || []).forEach((e) => {
    const f = dayjs(e?.fecha);
    if (f.isValid() && f.isAfter(start) && f.isBefore(end)) {
      const key = f.format("YYYY-MM-DD");
      if (base[key]) base[key].egresos += toNumber(e?.monto);
    }
  });

  return Object.values(base).map((r) => ({
    ...r,
    label: dayjs(r.key).format("DD/MM"),
    balance: r.ingresos - r.egresos,
  }));
}

function buildMonthlySeries(ingresos = [], egresos = [], months = 12) {
  const end = dayjs().endOf("month");
  const start = end.subtract(months - 1, "month").startOf("month");

  const base = {};
  for (let m = 0; m < months; m++) {
    const key = start.add(m, "month").format("YYYY-MM");
    base[key] = { key, ingresos: 0, egresos: 0 };
  }

  (ingresos || []).forEach((i) => {
    const f = dayjs(i?.fecha);
    if (f.isValid() && f.isAfter(start.subtract(1, 'day'))) {
      const key = f.format("YYYY-MM");
      if (base[key]) base[key].ingresos += toNumber(i?.monto);
    }
  });
  (egresos || []).forEach((e) => {
    const f = dayjs(e?.fecha);
    if (f.isValid() && f.isAfter(start.subtract(1, 'day'))) {
      const key = f.format("YYYY-MM");
      if (base[key]) base[key].egresos += toNumber(e?.monto);
    }
  });

  return Object.values(base).map((r) => ({
    ...r,
    label: dayjs(r.key + "-01").format("MMM YY"),
    balance: r.ingresos - r.egresos,
  }));
}

const currencyAR = (v) =>
  (Number(v) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/* 🎨 Hook: detecta si está activo el modo oscuro (mirando la clase 'dark' del
   <html>). Se usa para pasarle a Recharts colores de eje/grid que combinen con
   el tema (Recharts necesita colores concretos, no clases Tailwind). */
function useIsDark() {
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const obs = new MutationObserver(() =>
      setDark(el.classList.contains("dark"))
    );
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// Tooltip Duo — se adapta a claro/oscuro con tokens.
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = Object.fromEntries(payload.map((x) => [x.dataKey, x.value]));
  return (
    <div className="bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark rounded-2xl shadow-2xl px-4 py-3 text-[11px]">
      <div className="font-black mb-2 text-suave dark:text-suave-dark uppercase tracking-wide border-b-2 border-linea dark:border-linea-dark pb-1">{label}</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center gap-4">
          <span className="text-ingreso font-black">Ingresos</span>
          <span className="text-ingreso dark:text-ingreso-claro font-mono font-black">${currencyAR(p.ingresos)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-egreso font-black">Egresos</span>
          <span className="text-egreso dark:text-egreso-claro font-mono font-black">${currencyAR(p.egresos)}</span>
        </div>
        <div className="flex justify-between items-center gap-4 pt-1 mt-1 border-t-2 border-linea dark:border-linea-dark">
          <span className="text-oficina font-black">Balance</span>
          <span className="text-oficina dark:text-oficina-claro font-mono font-black">${currencyAR(p.balance)}</span>
        </div>
      </div>
    </div>
  );
};

/* ========= Componente ========= */
const BalanceChart = ({
  ingresos = [],
  egresos = [],
  className = "",
  defaultRange = "30d", // '7d' | '30d' | '12m'
}) => {
  const [range, setRange] = useState(defaultRange);
  const isDark = useIsDark();

  // Colores de eje / grilla según tema (Recharts pide colores concretos).
  const axisColor = isDark ? "#94a3b8" : "#64748b";   // --color-suave(-dark)
  const gridColor = isDark ? "#334155" : "#e2e8f0";   // --color-linea(-dark)

  const data = useMemo(() => {
    if (range === "7d") return buildDailySeries(ingresos, egresos, 7);
    if (range === "30d") return buildDailySeries(ingresos, egresos, 30);
    return buildMonthlySeries(ingresos, egresos, 12);
  }, [range, ingresos, egresos]);

  const yMin = useMemo(() => {
    const minVal = Math.min(0, ...data.map((d) => d.balance, 0));
    return Math.floor(minVal * 1.2);
  }, [data]);

  const pillBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setRange(id)}
      className={`flex-1 px-3 py-1.5 rounded-xl transition-all font-black ${
        range === id
          ? "bg-oficina text-white shadow-[0_3px_0_var(--color-oficina-fuerte)]"
          : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-3xl px-4 py-3 sm:px-5 sm:py-4 mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-oficina via-oficina/60 to-ingreso flex items-center justify-center text-white">
            <HiOutlinePresentationChartBar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-black text-titulo dark:text-titulo-dark tracking-tight">
              Ingresos vs Egresos{" "}
              <span className="text-[11px] text-suave dark:text-suave-dark font-bold ml-1 bg-surface dark:bg-surface-dark px-2 py-0.5 rounded-lg border-2 border-linea dark:border-linea-dark">
                {range === "12m" ? "Histórico anual" : "Evolución diaria"}
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs font-bold text-suave dark:text-suave-dark mt-0.5">
              Análisis de flujo de caja y rentabilidad
            </p>
          </div>
        </div>

        {/* Selector de rango tipo pill */}
        <div className="flex w-full sm:w-auto">
          <div className="flex flex-1 bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark rounded-2xl p-1 text-[11px] sm:text-xs">
            {pillBtn("7d", "7 días")}
            {pillBtn("30d", "30 días")}
            {pillBtn("12m", "12 meses")}
          </div>
        </div>
      </div>

      <div className="h-[220px] sm:h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              tick={{ fontSize: 10, fill: axisColor, fontWeight: 700 }}
              tickMargin={10}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${currencyAR(v)}`}
              domain={[yMin, "auto"]}
              width={80}
              tick={{ fontSize: 10, fill: axisColor, fontWeight: 700 }}
              stroke={axisColor}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: gridColor, opacity: 0.4 }} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 700,
                color: axisColor,
              }}
            />
            {/* Barras con bordes redondeados arriba (tus tokens: ingreso / egreso) */}
            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
            <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
            {/* Línea de balance (oficina / celeste) */}
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance Neto"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            />
            <ReferenceLine y={0} stroke={axisColor} strokeWidth={1} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!data?.length && (
        <div className="text-center text-xs sm:text-sm font-bold text-suave dark:text-suave-dark bg-surface dark:bg-surface-dark py-4 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark mt-4">
          No hay datos suficientes para generar el gráfico en este período.
        </div>
      )}
    </div>
  );
};

export default BalanceChart;
