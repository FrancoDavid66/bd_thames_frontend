// src/components/renovaciones/RenovacionesTabs.jsx
//
// Tabs visuales: Pendientes / En seguimiento / Renovadas / No renovaron
// 🎮 Gamificación: underline animado que se desliza entre tabs (layoutId)

import { motion } from "framer-motion";
import { HiClipboardCheck, HiClock, HiCheckCircle, HiXCircle } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

const TABS = [
  {
    id: "pendientes",
    label: "Pendientes",
    icon: HiClipboardCheck,
    desc: "Pólizas que aún no se decidieron",
    tone: "sky",
  },
  {
    id: "en_seguimiento",
    label: "En seguimiento",
    icon: HiClock,
    desc: "Pólizas que estás trabajando (no decididas)",
    tone: "amber",
  },
  {
    id: "renovadas",
    label: "Renovadas",
    icon: HiCheckCircle,
    desc: "Pólizas con una nueva versión emitida",
    tone: "emerald",
  },
  {
    id: "no_renovaron",
    label: "No renovaron",
    icon: HiXCircle,
    desc: "Clientes que no renovaron (manual o por inactividad)",
    tone: "rose",
  },
];

function toneActive(tone) {
  switch (tone) {
    case "sky":
      return "text-sky-50";
    case "amber":
      return "text-amber-50";
    case "emerald":
      return "text-emerald-50";
    case "rose":
      return "text-rose-50";
    default:
      return "text-white";
  }
}

function toneUnderline(tone) {
  switch (tone) {
    case "sky":
      return "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]";
    case "amber":
      return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]";
    case "emerald":
      return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]";
    case "rose":
      return "bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.6)]";
    default:
      return "bg-white";
  }
}

function toneBgActive(tone) {
  switch (tone) {
    case "sky":
      return "bg-sky-500/15";
    case "amber":
      return "bg-amber-500/15";
    case "emerald":
      return "bg-emerald-500/15";
    case "rose":
      return "bg-rose-500/15";
    default:
      return "bg-white/10";
  }
}

export default function RenovacionesTabs({
  activeTab = "pendientes",
  onChange,
  counts = { pendientes: 0, en_seguimiento: 0, renovadas: 0, no_renovaron: 0 },
}) {
  return (
    <div className="relative flex flex-wrap gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5">
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
              "relative inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors",
              active
                ? `${toneActive(t.tone)} ${toneBgActive(t.tone)}`
                : "text-white/55 hover:text-white/85 hover:bg-white/5"
            )}
          >
            <Icon className="text-lg relative z-10" />
            <span className="relative z-10">{t.label}</span>

            <motion.span
              key={`count-${t.id}-${count}`}
              initial={{ scale: 1.5, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cx(
                "relative z-10 rounded-full px-2 py-0.5 text-[11px] font-black min-w-[24px] text-center tabular-nums",
                active ? "bg-black/30" : "bg-black/20"
              )}
            >
              {count}
            </motion.span>

            {/* 🎮 Underline animado que se desliza */}
            {active && (
              <motion.div
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className={cx(
                  "absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full",
                  toneUnderline(t.tone)
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}