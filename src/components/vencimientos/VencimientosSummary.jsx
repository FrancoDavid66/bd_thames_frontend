// src/components/vencimientos/VencimientosSummary.jsx
import React from "react";

function pillCls(tone) {
  if (tone === "red") return "bg-red-500/15 text-red-200 border-red-500/30";
  if (tone === "amber") return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  if (tone === "emerald") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  return "bg-slate-500/15 text-slate-200 border-slate-500/30";
}

function KpiButton({ label, value, active, onClick, tone = "slate" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border p-3 text-left transition ${
        active ? "ring-2 ring-white/30" : "hover:bg-white/5"
      } ${pillCls(tone)}`}
      title={label}
    >
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
    </button>
  );
}

export default function VencimientosSummary({ resumen, tab, useCustomRange, onSelectTab }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
      <KpiButton
        label="Vencidas 30"
        value={resumen?.vencidas_30}
        tone="red"
        active={!useCustomRange && tab === "vencidas"}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Vencidas 14"
        value={resumen?.vencidas_14}
        tone="red"
        active={!useCustomRange && tab === "vencidas"}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Vencidas 7"
        value={resumen?.vencidas_7}
        tone="red"
        active={!useCustomRange && tab === "vencidas"}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Vencidas 3"
        value={resumen?.vencidas_3}
        tone="red"
        active={!useCustomRange && tab === "vencidas"}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Vence hoy"
        value={resumen?.vence_hoy}
        tone="amber"
        active={!useCustomRange && tab === "hoy"}
        onClick={() => onSelectTab("hoy")}
      />
      <KpiButton
        label="Por vencer (3)"
        value={resumen?.por_vencer_3}
        tone="emerald"
        active={!useCustomRange && tab === "por_vencer"}
        onClick={() => onSelectTab("por_vencer")}
      />
    </div>
  );
}
