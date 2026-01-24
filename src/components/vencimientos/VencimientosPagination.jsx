// src/components/vencimientos/VencimientosPagination.jsx
import React from "react";

export default function VencimientosPagination({
  page,
  setPage,
  totalPages,
  showingFrom,
  showingTo,
  totalCount,
  nextUrl,
  prevUrl,
}) {
  const canPrev = page > 1 && !!prevUrl;
  const canNext = page < totalPages && !!nextUrl;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
      <div className="text-xs opacity-70">
        Mostrando <span className="font-semibold">{showingFrom}</span>–<span className="font-semibold">{showingTo}</span>{" "}
        de <span className="font-semibold">{totalCount}</span> • Página{" "}
        <span className="font-semibold">{page}</span> / <span className="font-semibold">{totalPages}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`px-3 py-2 rounded border border-white/10 bg-slate-900 hover:bg-slate-800 text-sm ${
            canPrev ? "" : "opacity-50 cursor-not-allowed"
          }`}
          disabled={!canPrev}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          title="Página anterior"
        >
          ⬅ Anterior
        </button>

        <button
          type="button"
          className={`px-3 py-2 rounded border border-white/10 bg-slate-900 hover:bg-slate-800 text-sm ${
            canNext ? "" : "opacity-50 cursor-not-allowed"
          }`}
          disabled={!canNext}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          title="Página siguiente"
        >
          Siguiente ➡
        </button>
      </div>
    </div>
  );
}
