// src/components/renovaciones/RenovacionesTabs.jsx
//
// Filtros principales (3): Renovar hoy / En 3 días / Vencidas
// Versión simple: pills con ícono + contador. Sin animaciones.

import { HiClock, HiClipboardCheck, HiExclamationCircle } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

const TABS = [
  {
    id: "renovar_hoy",
    label: "Renovar hoy",
    icon: HiClock,
    desc: "Pólizas que vencen hoy",
    tone: "amber",
  },
  {
    id: "en_3_dias",
    label: "En 3 días",
    icon: HiClipboardCheck,
    desc: "Vencen dentro de los próximos 3 días",
    tone: "sky",
  },
  {
    id: "vencidas",
    label: "Vencidas",
    icon: HiExclamationCircle,
    desc: "Se te pasó renovarlas",
    tone: "rose",
  },
];

function toneActive(tone) {
  switch (tone) {
    case "amber":
      return "border-amber-400/50 bg-amber-500/15 text-amber-100";
    case "sky":
      return "border-sky-400/50 bg-sky-500/15 text-sky-100";
    case "rose":
      return "border-rose-400/50 bg-rose-500/15 text-rose-100";
    default:
      return "border-white/30 bg-white/10 text-white";
  }
}

export default function RenovacionesTabs({
  activeTab = "renovar_hoy",
  onChange,
  counts = { renovar_hoy: 0, en_3_dias: 0, vencidas: 0 },
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        const count = Number(counts?.[t.id] || 0);

        return (
          <button
            key={t.id}
            type="button"
            title={t.desc}
            onClick={() => onChange?.(t.id)}
            aria-pressed={active}
            className={cx(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
              active
                ? toneActive(t.tone)
                : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07] hover:text-white/80"
            )}
          >
            <Icon className="text-base" />
            <span>{t.label}</span>
            <span
              className={cx(
                "rounded-full px-1.5 py-0 text-[11px] font-black min-w-[22px] text-center tabular-nums",
                active ? "bg-black/25" : "bg-black/20"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}