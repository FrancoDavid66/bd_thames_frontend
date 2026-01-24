// src/components/vencimientos/VencimientosTabs.jsx
import React from "react";

export default function VencimientosTabs({ tab, onChangeTab }) {
  const tabs = [
    { id: "por_vencer", label: "Por vencer (1-3)" },
    { id: "hoy", label: "Vence hoy" },
    { id: "vencidas", label: "Vencidas" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChangeTab(t.id)}
          className={`px-3 py-2 rounded border text-sm transition ${
            tab === t.id ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
