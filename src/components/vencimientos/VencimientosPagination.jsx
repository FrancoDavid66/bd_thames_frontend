// src/components/vencimientos/VencimientosPagination.jsx
import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

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

  // Si no hay resultados, no mostramos la paginación para mantener la vista limpia
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 mt-2">
      
      {/* 🚀 TEXTO INFORMATIVO */}
      <div className="text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
        Mostrando <span className="font-semibold text-slate-700 dark:text-slate-200">{showingFrom}</span> a <span className="font-semibold text-slate-700 dark:text-slate-200">{showingTo}</span> de <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> resultados
      </div>

      {/* 🚀 CONTROLES */}
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-2 sm:mr-4">
          Página {page} de {totalPages}
        </div>
        
        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-all select-none ${
            canPrev 
              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 cursor-pointer shadow-sm" 
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }`}
          disabled={!canPrev}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          title="Página anterior"
        >
          <FaChevronLeft className="text-[10px]" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-all select-none ${
            canNext 
              ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 cursor-pointer shadow-sm" 
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }`}
          disabled={!canNext}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          title="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <FaChevronRight className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}