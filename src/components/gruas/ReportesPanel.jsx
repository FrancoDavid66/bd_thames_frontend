// src/components/gruas/ReportesPanel.jsx
import { useMemo, useState } from "react";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function ReportesPanel() {
  const [range, setRange] = useState("30");

  const kpis = useMemo(() => {
    // Placeholder: luego traer KPIs reales (solicitudes por mes, costos, tiempos, etc.)
    const base = range === "7" ? 7 : range === "90" ? 90 : 30;
    return {
      solicitudes: base * 2,
      cerradas: Math.max(0, base * 2 - 3),
      promedio_km: 12.4,
      costo_estimado: base * 15000,
    };
  }, [range]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-semibold text-slate-100">Reportes</div>
          <div className="text-xs text-slate-500">KPIs y series (por mes, por proveedor, etc.).</div>
        </div>

        <div className="flex gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className={classNames(
              "px-3 py-2 rounded-xl text-sm",
              "bg-slate-900 border border-slate-800 text-slate-100",
              "focus:outline-none focus:ring-2 focus:ring-slate-700"
            )}
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </select>

          <button
            className="px-3 py-2 rounded-xl text-sm border bg-slate-100 text-slate-900 border-slate-100 hover:opacity-90"
            onClick={() => alert("Luego: exportar CSV/PDF")}
          >
            Exportar
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Solicitudes" value={kpis.solicitudes} />
        <KpiCard title="Cerradas" value={kpis.cerradas} />
        <KpiCard title="Promedio KM" value={kpis.promedio_km} />
        <KpiCard title="Costo estimado" value={`$ ${Number(kpis.costo_estimado).toLocaleString("es-AR")}`} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="text-sm font-semibold text-slate-100">Series (placeholder)</div>
        <div className="mt-1 text-xs text-slate-500">
          Próximo: gráfico por mes + ranking proveedores + tiempos de atención.
        </div>
        <div className="mt-3 text-sm text-slate-300">
          Cuando me pases tu `gruasSlice.js` y `src/api/gruas.js`, lo conectamos.
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
