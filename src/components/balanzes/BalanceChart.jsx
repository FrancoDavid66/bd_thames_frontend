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
    if (f.isValid()) {
      const key = f.format("YYYY-MM-DD");
      if (base[key]) base[key].ingresos += toNumber(i?.monto);
    }
  });
  (egresos || []).forEach((e) => {
    const f = dayjs(e?.fecha);
    if (f.isValid()) {
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
    if (f.isValid()) {
      const key = f.format("YYYY-MM");
      if (base[key]) base[key].ingresos += toNumber(i?.monto);
    }
  });
  (egresos || []).forEach((e) => {
    const f = dayjs(e?.fecha);
    if (f.isValid()) {
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
    <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-md shadow px-3 py-2 text-xs">
      <div className="font-semibold mb-1">{label}</div>
      <div>Ingresos: ${currencyAR(p.ingresos)}</div>
      <div>Egresos: ${currencyAR(p.egresos)}</div>
      <div>Balance: ${currencyAR(p.balance)}</div>
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
    // margen inferior cómodo
    return Math.floor(minVal * 1.1);
  }, [data]);

  return (
    <div className={`bg-white dark:bg-zinc-800 p-4 rounded-lg shadow mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">
          📊 Ingresos vs Egresos {range === "12m" ? "por mes" : "por día"}
        </h3>
        <div className="flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={`px-3 py-1 text-sm ${
              range === "7d"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
            }`}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setRange("30d")}
            className={`px-3 py-1 text-sm ${
              range === "30d"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
            }`}
          >
            30 días
          </button>
          <button
            type="button"
            onClick={() => setRange("12m")}
            className={`px-3 py-1 text-sm ${
              range === "12m"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
            }`}
          >
            12 meses
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#a1a1aa" />
          <YAxis
            tickFormatter={(v) => `$${currencyAR(v)}`}
            domain={[yMin, "auto"]}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {/* Barras (mismos colores que el resto) */}
          <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" />
          <Bar dataKey="egresos" name="Egresos" fill="#dc2626" />
          {/* Línea de balance */}
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
          {/* Línea 0 para referencia */}
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>

      {!data?.length && (
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Sin datos para el rango seleccionado.
        </div>
      )}
    </div>
  );
};

export default BalanceChart;
