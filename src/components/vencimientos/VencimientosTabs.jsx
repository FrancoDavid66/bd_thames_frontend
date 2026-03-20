// src/components/vencimientos/VencimientosTabs.jsx
import React from "react";
import { FaCalendarCheck, FaRegClock, FaExclamationCircle } from "react-icons/fa";

export default function VencimientosTabs({ tab, onChangeTab }) {
  const tabs = [
    { id: "por_vencer", label: "Por vencer (1-3)", icon: FaCalendarCheck, color: "emerald" },
    { id: "hoy", label: "Vence hoy", icon: FaRegClock, color: "amber" },
    { id: "vencidas", label: "Vencidas", icon: FaExclamationCircle, color: "red" },
  ];

  // 🚀 Lógica para inyectar el color exacto dependiendo de la pestaña activa
  const getTabStyles = (tId, isActive) => {
    // Estado INACTIVO (igual para todos)
    if (!isActive) {
      return "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50";
    }

    // Estado ACTIVO (color específico)
    const baseActive = "bg-white dark:bg-slate-800 shadow-sm border-solid scale-[1.02]";
    
    if (tId === "por_vencer") return `${baseActive} text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 ring-1 ring-emerald-500/20`;
    if (tId === "hoy") return `${baseActive} text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-500/20`;
    if (tId === "vencidas") return `${baseActive} text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 ring-1 ring-red-500/20`;
    
    return baseActive;
  };

  return (
    <div className="flex mb-4 w-full sm:w-auto">
      {/* 🚀 Contenedor tipo "Píldora gigante" */}
      <div className="flex flex-col sm:flex-row w-full sm:w-auto bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner gap-1">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeTab(t.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border focus:outline-none select-none cursor-pointer ${getTabStyles(t.id, isActive)}`}
            >
              <t.icon className={`text-base transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-70'}`} />
              <span className="tracking-wide">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}