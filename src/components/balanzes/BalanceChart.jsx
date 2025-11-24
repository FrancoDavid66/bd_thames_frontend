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
    <div className="bg-zinc-950/95 border border-zinc-800 text-zinc-50 rounded-xl shadow-lg px-3 py-2 text-[11px]">
      <div className="font-semibold mb-1">{label}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-emerald-300">
          Ingresos: ${currencyAR(p.ingresos)}
        </span>
        <span className="text-rose-300">
          Egresos: ${currencyAR(p.egresos)}
        </span>
        <span className="text-sky-300">
          Balance: ${currencyAR(p.balance)}
        </span>
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
    // margen inferior cómodo
    return Math.floor(minVal * 1.1);
  }, [data]);

  return (
    <div
      className={`bg-zinc-950/80 border border-zinc-900 rounded-3xl px-4 py-3 sm:px-5 sm:py-4 shadow-lg shadow-black/25 mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-500/80 via-sky-500/40 to-emerald-400/60 flex items-center justify-center text-lg">
            <span>📊</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-50">
              Ingresos vs egresos{" "}
              <span className="text-[11px] text-zinc-400">
                {range === "12m" ? "por mes" : "por día"}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500">
              Visualizá la evolución en el tiempo
            </p>
          </div>
        </div>

        {/* Selector de rango tipo pill */}
        <div className="flex w-full sm:w-auto">
          <div className="flex flex-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-1 text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => setRange("7d")}
              className={`flex-1 px-2.5 py-1.5 rounded-2xl transition ${
                range === "7d"
                  ? "bg-zinc-100 text-zinc-900 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => setRange("30d")}
              className={`flex-1 px-2.5 py-1.5 rounded-2xl transition ${
                range === "30d"
                  ? "bg-zinc-100 text-zinc-900 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              30 días
            </button>
            <button
              type="button"
              onClick={() => setRange("12m")}
              className={`flex-1 px-2.5 py-1.5 rounded-2xl transition ${
                range === "12m"
                  ? "bg-zinc-100 text-zinc-900 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              12 meses
            </button>
          </div>
        </div>
      </div>

      <div className="h-[220px] sm:h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272f" />
            <XAxis
              dataKey="label"
              stroke="#a1a1aa"
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `$${currencyAR(v)}`}
              domain={[yMin, "auto"]}
              width={72}
              tick={{ fontSize: 10, fill: "#a1a1aa" }}
              stroke="#52525b"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontSize: 10,
                color: "#e5e5e5",
              }}
            />
            {/* Barras */}
            <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" />
            <Bar dataKey="egresos" name="Egresos" fill="#f97373" />
            {/* Línea de balance */}
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
            {/* Línea 0 para referencia */}
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!data?.length && (
        <div className="text-center text-xs sm:text-sm text-zinc-500 mt-2">
          Sin datos para el rango seleccionado.
        </div>
      )}
    </div>
  );
};

export default BalanceChart;
