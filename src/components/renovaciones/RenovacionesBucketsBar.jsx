// src/components/renovaciones/RenovacionesBucketsBar.jsx
import { HiX } from "react-icons/hi";

const cx = (...a) => a.filter(Boolean).join(" ");

export default function RenovacionesBucketsBar({
  quickButtons = [],
  activeBucket = "",
  onSelectBucket,
  onClearBucket,
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {quickButtons.map((b) => {
        const isDisabled = !!b.disabled;
        const active = !isDisabled && (activeBucket || "") === b.id;

        return (
          <button
            key={b.id || "__all__"}
            type="button"
            title={b.title}
            onClick={() => {
              if (isDisabled) return;
              onSelectBucket?.(b.id);
            }}
            className={cx(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold transition",
              isDisabled
                ? "border-white/10 bg-white/5 text-white/40 cursor-default"
                : active
                ? b.tone === "red"
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-50"
                  : b.tone === "yellow"
                  ? "border-amber-400/40 bg-amber-500/20 text-amber-50"
                  : b.tone === "blue"
                  ? "border-sky-400/40 bg-sky-500/20 text-sky-50"
                  : "border-white/30 bg-white/15 text-white"
                : b.tone === "red"
                ? "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                : b.tone === "yellow"
                ? "border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                : b.tone === "blue"
                ? "border-sky-400/20 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
                : "border-white/10 bg-white/10 text-white/90 hover:bg-white/15"
            )}
          >
            <span>{b.label}</span>
            <span
              className={cx(
                "rounded-full px-2 py-0.5 text-[11px] font-black",
                isDisabled ? "bg-black/10" : "bg-black/20"
              )}
            >
              {Number.isFinite(Number(b.count)) ? Number(b.count) : 0}
            </span>
          </button>
        );
      })}

      {!!activeBucket && (
        <button
          type="button"
          className="ml-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/15"
          onClick={onClearBucket}
          title="Limpiar filtro rápido"
        >
          <HiX className="text-white/70" />
          Limpiar
        </button>
      )}
    </div>
  );
}