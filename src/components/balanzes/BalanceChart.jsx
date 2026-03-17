import { useMemo, useState } from "react";
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

  // mapa base con todos los días del rango (cero)
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = Object.fromEntries(payload.map((x) => [x.dataKey, x.value]));
  return (
    <div className="bg-zinc-950/95 border border-zinc-800 text-zinc-50 rounded-xl shadow-2xl px-4 py-3 text-[11px] backdrop-blur-sm">
      <div className="font-bold mb-2 text-zinc-300 uppercase tracking-wide border-b border-zinc-800 pb-1">{label}</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center gap-4">
          <span className="text-emerald-400 font-semibold">Ingresos</span>
          <span className="text-emerald-300 font-bold">${currencyAR(p.ingresos)}</span>
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-rose-400 font-semibold">Egresos</span>
          <span className="text-rose-300 font-bold">${currencyAR(p.egresos)}</span>
        </div>
        <div className="flex justify-between items-center gap-4 pt-1 mt-1 border-t border-zinc-800/50">
          <span className="text-sky-400 font-semibold">Balance</span>
          <span className="text-sky-300 font-extrabold">${currencyAR(p.balance)}</span>
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

  const data = useMemo(() => {
    if (range === "7d") return buildDailySeries(ingresos, egresos, 7);
    if (range === "30d") return buildDailySeries(ingresos, egresos, 30);
    return buildMonthlySeries(ingresos, egresos, 12);
  }, [range, ingresos, egresos]);

  const yMin = useMemo(() => {
    const minVal = Math.min(0, ...data.map((d) => d.balance, 0));
    // margen inferior cómodo para que la línea no toque el borde del gráfico
    return Math.floor(minVal * 1.2);
  }, [data]);

  return (
    <div
      className={`bg-zinc-950/80 border border-zinc-900 rounded-3xl px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/25 mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-white shadow-inner">
            <HiOutlinePresentationChartBar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-bold text-zinc-50 tracking-tight">
              Ingresos vs Egresos{" "}
              <span className="text-[11px] text-zinc-400 font-normal ml-1 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                {range === "12m" ? "Histórico anual" : "Evolución diaria"}
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
              Análisis de flujo de caja y rentabilidad
            </p>
          </div>
        </div>

        {/* Selector de rango tipo pill */}
        <div className="flex w-full sm:w-auto">
          <div className="flex flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-1 text-[11px] sm:text-xs shadow-inner">
            <button
              type="button"
              onClick={() => setRange("7d")}
              className={`flex-1 px-3 py-1.5 rounded-[14px] transition-all font-medium ${
                range === "7d"
                  ? "bg-zinc-100 text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => setRange("30d")}
              className={`flex-1 px-3 py-1.5 rounded-[14px] transition-all font-medium ${
                range === "30d"
                  ? "bg-zinc-100 text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              30 días
            </button>
            <button
              type="button"
              onClick={() => setRange("12m")}
              className={`flex-1 px-3 py-1.5 rounded-[14px] transition-all font-medium ${
                range === "12m"
                  ? "bg-zinc-100 text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              12 meses
            </button>
          </div>
        </div>
      </div>

      <div className="h-[220px] sm:h-[300px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#52525b"
              tick={{ fontSize: 10, fill: "#a1a1aa", fontWeight: 500 }}
              tickMargin={10}
              interval="preserveStartEnd"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${currencyAR(v)}`}
              domain={[yMin, "auto"]}
              width={80}
              tick={{ fontSize: 10, fill: "#71717a", fontWeight: 500 }}
              stroke="#52525b"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{
                fontSize: 11,
                fontWeight: 600,
                color: "#e5e5e5",
              }}
            />
            {/* Barras con bordes redondeados arriba */}
            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            {/* Línea de balance más prominente */}
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance Neto"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            />
            {/* Línea 0 para referencia clara */}
            <ReferenceLine y={0} stroke="#52525b" strokeWidth={1} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!data?.length && (
        <div className="text-center text-xs sm:text-sm text-zinc-500 mt-4 bg-zinc-900/30 py-4 rounded-xl border border-dashed border-zinc-800">
          No hay datos suficientes para generar el gráfico en este período.
        </div>
      )}
    </div>
  );
};

export default BalanceChart;