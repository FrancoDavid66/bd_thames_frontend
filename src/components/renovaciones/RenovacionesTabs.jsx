// src/components/renovaciones/RenovacionesTabs.jsx
//
// Tabs limpios para alternar entre Pendientes / Renovadas / No renovaron.
// Sin animaciones llamativas, solo cambio sutil de borde y color.

const cx = (...a) => a.filter(Boolean).join(" ");

export default function RenovacionesTabs({ activeTab, onChange, counts = {} }) {
  const tabs = [
    {
      id: "pendientes",
      label: "Pendientes",
      desc: "Pólizas próximas a vencer o vencidas sin renovar",
      count: counts.pendientes,
    },
    {
      id: "renovadas",
      label: "Renovadas",
      desc: "Pólizas que ya fueron renovadas",
      count: counts.renovadas,
    },
    {
      id: "no_renovaron",
      label: "No renovaron",
      desc: "Vencidas hace 30+ días sin gestionar, o marcadas manualmente",
      count: counts.no_renovaron,
    },
  ];

  return (
    <div className="flex items-stretch gap-1 border-b border-white/10">
      {tabs.map((t) => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            title={t.desc}
            className={cx(
              "relative px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
              active
                ? "text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            <span className="inline-flex items-center gap-2">
              {t.label}
              {Number.isFinite(Number(t.count)) && (
                <span
                  className={cx(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums",
                    active ? "bg-emerald-500/25 text-emerald-200" : "bg-white/10 text-white/60"
                  )}
                >
                  {t.count ?? 0}
                </span>
              )}
            </span>
            {/* Línea inferior activa */}
            {active && (
              <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-400 rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
}