// src/components/renovaciones/RenovacionesBucketsBar.jsx
//
// Filtros rápidos del rediseño: Todas · Atrasadas · Hoy · En 3 días.
// (Se reutiliza este componente. Antes mostraba las burbujas de "Vencimiento".)
//
// Props:
//   - activeBucket: id del filtro activo ("", "vencidas_all", "hoy", "proximos_1_3")
//   - onSelectBucket: (id) => void
//   - counts: { todas, vencidas, hoy, tresdias }
//   - loading: deshabilita los botones mientras carga

import { motion } from "framer-motion";
import { HiViewList, HiExclamationCircle, HiClock, HiCalendar } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

const CHIPS = [
  { id: "",             key: "todas",    label: "Todas",     Icon: HiViewList,         tone: "neutral" },
  { id: "vencidas_all", key: "vencidas", label: "Atrasadas", Icon: HiExclamationCircle, tone: "rose" },
  { id: "hoy",          key: "hoy",      label: "Hoy",       Icon: HiClock,            tone: "amber" },
  { id: "proximos_1_3", key: "tresdias", label: "En 3 días", Icon: HiCalendar,         tone: "sky" },
];

function chipClass(tone, active) {
  if (active) {
    switch (tone) {
      case "rose":  return "border-rose-400/60 bg-rose-500/20 text-rose-100 ring-1 ring-rose-500/30";
      case "amber": return "border-amber-400/60 bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/30";
      case "sky":   return "border-sky-400/60 bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/30";
      default:      return "border-white/40 bg-white/15 text-white ring-1 ring-white/20";
    }
  }
  switch (tone) {
    case "rose":  return "border-rose-400/15 bg-rose-500/[0.06] text-rose-200/75 hover:bg-rose-500/15";
    case "amber": return "border-amber-400/15 bg-amber-500/[0.06] text-amber-200/75 hover:bg-amber-500/15";
    case "sky":   return "border-sky-400/15 bg-sky-500/[0.06] text-sky-200/75 hover:bg-sky-500/15";
    default:      return "border-white/10 bg-white/5 text-white/65 hover:bg-white/10";
  }
}

export default function RenovacionesBucketsBar({
  activeBucket = "",
  onSelectBucket,
  counts = {},
  loading = false,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {CHIPS.map((c) => {
        const isActive = (activeBucket || "") === c.id;
        const count = Number(counts[c.key] || 0);
        return (
          <motion.button
            key={c.key}
            type="button"
            onClick={() => onSelectBucket?.(c.id)}
            disabled={loading}
            aria-pressed={isActive}
            whileTap={{ scale: 0.96 }}
            className={cx(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
              chipClass(c.tone, isActive)
            )}
          >
            <c.Icon className="text-base" />
            <span>{c.label}</span>
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums min-w-[22px] text-center",
                isActive ? "bg-black/30" : "bg-black/20"
              )}
            >
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}