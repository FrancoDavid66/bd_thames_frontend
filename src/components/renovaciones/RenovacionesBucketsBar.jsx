// src/components/renovaciones/RenovacionesBucketsBar.jsx
//
// ✅ Click instantáneo: solo cambia el state local del padre, no llama al backend.
// ✅ Contadores visibles siempre, calculados desde los items reales en frontend.
// ✅ Tooltip con la descripción del bucket.

import { HiFilter } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function RenovacionesBucketsBar({
  quickButtons = [],
  activeBucket = "todas",
  onSelectBucket,
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <HiFilter className="text-white/40 text-sm" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
          Filtrar por vencimiento
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickButtons.map((b) => {
          const active = (activeBucket || "todas") === b.id;
          const count = Number.isFinite(Number(b.count)) ? Number(b.count) : 0;
          const isEmpty = count === 0;

          return (
            <button
              key={b.id}
              type="button"
              title={b.desc || b.label}
              onClick={() => onSelectBucket?.(b.id)}
              aria-pressed={active}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                active ? toneActive(b.tone) : toneInactive(b.tone),
                isEmpty && !active && "opacity-50"
              )}
            >
              <span>{b.label}</span>
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-black min-w-[22px] text-center tabular-nums",
                  active ? "bg-black/30" : "bg-black/20"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toneActive(tone) {
  switch (tone) {
    case "red":
      return "border-rose-400/70 bg-rose-500/30 text-rose-50 shadow-md shadow-rose-500/20 ring-2 ring-rose-500/30";
    case "yellow":
      return "border-amber-400/70 bg-amber-500/30 text-amber-50 shadow-md shadow-amber-500/20 ring-2 ring-amber-500/30";
    case "blue":
      return "border-sky-400/70 bg-sky-500/30 text-sky-50 shadow-md shadow-sky-500/20 ring-2 ring-sky-500/30";
    case "green":
      return "border-emerald-400/70 bg-emerald-500/30 text-emerald-50 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30";
    default:
      return "border-white/40 bg-white/20 text-white shadow-md ring-2 ring-white/20";
  }
}

function toneInactive(tone) {
  switch (tone) {
    case "red":
      return "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 hover:border-rose-400/40";
    case "yellow":
      return "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:border-amber-400/40";
    case "blue":
      return "border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20 hover:border-sky-400/40";
    case "green":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-400/40";
    default:
      return "border-white/10 bg-white/5 text-white/85 hover:bg-white/15 hover:border-white/25";
  }
}