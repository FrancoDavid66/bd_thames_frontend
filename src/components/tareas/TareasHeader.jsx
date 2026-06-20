/* src/components/tareas/TareasHeader.jsx */
import { HiRefresh } from "react-icons/hi";

function mensaje(pct, total) {
  if (total === 0) return "¡Todo listo por hoy!";
  if (pct >= 60) return "¡Casi! Ya falta poco 💪";
  if (pct >= 30) return "¡Buen comienzo, seguí así!";
  return "¡A darle al día!";
}

export default function TareasHeader({ total, hechas, pct, oficina, fecha, loading, onRefresh }) {
  return (
    <div className="mb-6">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <div className="text-sm text-slate-400">
            Tareas de hoy{oficina && oficina !== "Todas" ? ` · Oficina ${oficina}` : ""}
          </div>
          <div className="text-base font-medium text-slate-100 mt-0.5">{mensaje(pct, total)}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div>
              <span className="text-2xl font-semibold text-emerald-400">{hechas}</span>
              <span className="text-sm text-slate-500"> / {hechas + total}</span>
            </div>
            <div className="text-[11px] text-slate-500">completadas</div>
          </div>
          <button onClick={onRefresh}
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            aria-label="Actualizar">
            <HiRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {fecha && <div className="text-[11px] text-slate-600 mt-1.5">{fecha}</div>}
    </div>
  );
}