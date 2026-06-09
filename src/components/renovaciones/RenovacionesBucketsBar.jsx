// src/components/renovaciones/RenovacionesBucketsBar.jsx
//
// Versión compacta: 1 sola fila con label "VENCIMIENTO:" inline.
// 3 burbujas: Todas / Próximas / Vencidas.

const cx = (...a) => a.filter(Boolean).join(" ");

export default function RenovacionesBucketsBar({
  quickButtons = [],
  activeBucket = "",
  onSelectBucket,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
        Vencimiento:
      </span>

      {quickButtons.map((b) => {
        const active = (activeBucket || "") === (b.id || "");
        const count = Number.isFinite(Number(b.count)) ? Number(b.count) : 0;

        return (
          <button
            key={b.id || "todas"}
            type="button"
            title={b.desc || b.label}
            onClick={() => onSelectBucket?.(b.id || "")}
            aria-pressed={active}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
              active ? toneActive(b.tone) : toneInactive(b.tone)
            )}
          >
            <span>{b.label}</span>
            <span
              className={cx(
                "rounded-full px-1.5 py-0 text-[10px] font-black min-w-[20px] text-center tabular-nums",
                active ? "bg-black/30" : "bg-black/20"
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

function toneActive(tone) {
  switch (tone) {
    case "red":
      return "border-rose-400/60 bg-rose-500/25 text-rose-50 ring-1 ring-rose-500/30";
    case "blue":
      return "border-sky-400/60 bg-sky-500/25 text-sky-50 ring-1 ring-sky-500/30";
    case "yellow":
      return "border-amber-400/60 bg-amber-500/25 text-amber-50 ring-1 ring-amber-500/30";
    default:
      return "border-white/35 bg-white/15 text-white ring-1 ring-white/20";
  }
}

function toneInactive(tone) {
  switch (tone) {
    case "red":
      return "border-rose-400/15 bg-rose-500/8 text-rose-200/70 hover:bg-rose-500/15 hover:border-rose-400/30";
    case "blue":
      return "border-sky-400/15 bg-sky-500/8 text-sky-200/70 hover:bg-sky-500/15 hover:border-sky-400/30";
    case "yellow":
      return "border-amber-400/15 bg-amber-500/8 text-amber-200/70 hover:bg-amber-500/15 hover:border-amber-400/30";
    default:
      return "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:border-white/20";
  }
}