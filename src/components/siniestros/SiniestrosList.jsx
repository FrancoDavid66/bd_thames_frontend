// src/components/siniestros/SiniestrosList.jsx
import { memo } from "react";
import { HiEye, HiPencil, HiTrash, HiExclamationCircle } from "react-icons/hi";
import dayjs from "dayjs";

const ESTADO_CFG = {
  PENDIENTE:   { cls: "bg-amber-900/40 text-amber-300 border-amber-700/50",   label: "Falta doc." },
  DENUNCIADO:  { cls: "bg-blue-900/40 text-blue-300 border-blue-700/50",      label: "Denunciado" },
  INSPECCION:  { cls: "bg-purple-900/40 text-purple-300 border-purple-700/50",label: "Inspección" },
  LIQUIDACION: { cls: "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",label: "Liquidación" },
  CERRADO:     { cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50", label: "Cerrado" },
};

const RESP_LABELS = {
  CHOCO:    "Asegurado chocó",
  CHOCARON: "Fue chocado",
  ROBO:     "Robo / Hurto",
  INCENDIO: "Incendio",
  OTRO:     "Otro",
};

const SiniestroCard = memo(({ s, isWebAdmin, onView, onEdit, onDelete }) => {
  const cfg   = ESTADO_CFG[s.estado] || { cls: "bg-slate-800 text-slate-400 border-slate-700", label: s.estado };
  const dias  = s.fecha_siniestro ? dayjs().diff(dayjs(s.fecha_siniestro), "day") : null;
  const esMuyReciente = dias !== null && dias <= 30 && s.estado !== "CERRADO";

  return (
    <div className={`relative bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-colors hover:border-slate-600 ${
      esMuyReciente ? "border-rose-900/60" : "border-slate-800"
    }`}>
      {/* Alerta de siniestro muy reciente */}
      {esMuyReciente && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-rose-950/40 border border-rose-800/50 rounded-xl">
          <HiExclamationCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-xs font-bold text-rose-300">Siniestro reciente — hace {dias} días</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">

          {/* Estado + responsabilidad */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${cfg.cls}`}>
              {s.estado_label || cfg.label}
            </span>
            <span className="text-xs text-slate-500">
              {RESP_LABELS[s.responsabilidad] || s.responsabilidad_label || s.responsabilidad}
            </span>
          </div>

          {/* Cliente */}
          <p className="font-bold text-base text-slate-100 truncate">{s.cliente_label || "Sin cliente"}</p>

          {/* Póliza y reclamo */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {s.nro_reclamo_cia ? (
              <span className="font-mono text-indigo-400">Reclamo #{s.nro_reclamo_cia}</span>
            ) : (
              <span className="text-rose-400/70">Sin N° de Cía</span>
            )}
            {s.poliza_label && (
              <span className="text-slate-500 truncate max-w-[180px]">Póliza: {s.poliza_label}</span>
            )}
          </div>

          {/* Vehículo */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-300">
              {[s.marca_auto, s.modelo_auto, s.ano_auto].filter(Boolean).join(" ")}
            </span>
            {s.patente && (
              <span className="font-mono text-xs text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md uppercase">
                {s.patente}
              </span>
            )}
          </div>
        </div>

        {/* Fecha y acciones */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-mono font-semibold text-slate-300">
              {s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha"}
            </p>
            {dias !== null && (
              <p className={`text-xs mt-0.5 ${dias <= 30 ? "text-rose-400" : dias <= 90 ? "text-amber-400" : "text-slate-500"}`}>
                hace {dias}d
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onView(s)}
              className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
              title="Ver detalle">
              <HiEye className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(s)}
              className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center transition-colors"
              title="Editar">
              <HiPencil className="w-4 h-4" />
            </button>
            {isWebAdmin && (
              <button onClick={() => onDelete(s)}
                className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors"
                title="Eliminar">
                <HiTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function SiniestrosList({ siniestros, isWebAdmin, onView, onEdit, onDelete }) {
  if (!siniestros?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-slate-700">
        <HiExclamationCircle className="w-10 h-10 text-slate-600 mb-3" />
        <p className="text-slate-500 font-medium">No hay siniestros para mostrar</p>
        <p className="text-slate-600 text-sm mt-1">Probá ajustando los filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {siniestros.map(s => (
        <SiniestroCard
          key={s.id} s={s}
          isWebAdmin={isWebAdmin}
          onView={onView} onEdit={onEdit} onDelete={onDelete}
        />
      ))}
    </div>
  );
}