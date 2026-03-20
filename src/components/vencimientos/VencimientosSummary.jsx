// src/components/vencimientos/VencimientosSummary.jsx
import React from "react";
import { FaExclamationCircle, FaRegClock, FaCalendarCheck } from "react-icons/fa";

// 🚀 Helper para estilos Light/Dark según el tono (Le sacamos la lógica de active)
function pillCls(tone) {
  const base = "relative overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-sm";

  if (tone === "red") {
    return `${base} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30`;
  }
  if (tone === "amber") {
    return `${base} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-500/30`;
  }
  if (tone === "emerald") {
    return `${base} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-500/30`;
  }
  return `${base} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700`;
}

// 🚀 Helper para el color del texto y los iconos
function textCls(tone) {
  if (tone === "red") return "text-slate-600 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400";
  if (tone === "amber") return "text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400";
  if (tone === "emerald") return "text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400";
  return "text-slate-600 dark:text-slate-300";
}

function KpiButton({ label, value, onClick, tone = "slate", icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border p-3.5 text-left cursor-pointer focus:outline-none ${pillCls(tone)}`}
      title={label}
    >
      <div className={`absolute -right-2 -bottom-2 text-5xl opacity-[0.04] dark:opacity-10 pointer-events-none ${textCls(tone)}`}>
        {Icon && <Icon />}
      </div>

      <div className="flex items-start justify-between">
        <div className={`text-xs font-bold uppercase tracking-wide opacity-80 mb-1 ${textCls(tone)}`}>
          {label}
        </div>
        {Icon && (
          <div className={`text-sm opacity-60 ${textCls(tone)}`}>
            <Icon />
          </div>
        )}
      </div>
      
      <div className={`text-2xl sm:text-3xl font-black tracking-tight ${textCls(tone)}`}>
        {value ?? "—"}
      </div>
    </button>
  );
}

export default function VencimientosSummary({ resumen, onSelectTab }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <KpiButton
        label="Venc. 30 días"
        value={resumen?.vencidas_30}
        tone="red"
        icon={FaExclamationCircle}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Venc. 14 días"
        value={resumen?.vencidas_14}
        tone="red"
        icon={FaExclamationCircle}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Venc. 7 días"
        value={resumen?.vencidas_7}
        tone="red"
        icon={FaExclamationCircle}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Venc. 3 días"
        value={resumen?.vencidas_3}
        tone="red"
        icon={FaExclamationCircle}
        onClick={() => onSelectTab("vencidas")}
      />
      <KpiButton
        label="Vence Hoy"
        value={resumen?.vence_hoy}
        tone="amber"
        icon={FaRegClock}
        onClick={() => onSelectTab("hoy")}
      />
      <KpiButton
        label="Por Vencer (3)"
        value={resumen?.por_vencer_3}
        tone="emerald"
        icon={FaCalendarCheck}
        onClick={() => onSelectTab("por_vencer")}
      />
    </div>
  );
}