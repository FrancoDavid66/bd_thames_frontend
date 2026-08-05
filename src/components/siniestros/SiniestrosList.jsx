// src/components/siniestros/SiniestrosList.jsx
import { memo } from "react";
import { HiEye, HiPencil, HiTrash, HiExclamationCircle } from "react-icons/hi";
import dayjs from "dayjs";
import Badge from "../ui/Badge";

// Estado → tono del Badge Duo + label corto.
const ESTADO_CFG = {
  PENDIENTE:   { tono: "amarillo", label: "Falta doc." },
  DENUNCIADO:  { tono: "azul",     label: "Denunciado" },
  INSPECCION:  { tono: "violeta",  label: "Inspección" },
  LIQUIDACION: { tono: "azul",     label: "Liquidación" },
  CERRADO:     { tono: "verde",    label: "Cerrado" },
};

const RESP_LABELS = {
  CHOCO: "Asegurado chocó",
  CHOCARON: "Fue chocado",
  ROBO: "Robo / Hurto",
  INCENDIO: "Incendio",
  OTRO: "Otro",
};

const SiniestroCard = memo(({ s, isWebAdmin, onView, onEdit, onDelete }) => {
  const cfg = ESTADO_CFG[s.estado] || { tono: "neutro", label: s.estado };
  const dias = s.fecha_siniestro ? dayjs().diff(dayjs(s.fecha_siniestro), "day") : null;
  const esReciente = dias !== null && dias <= 30 && s.estado !== "CERRADO";

  return (
    <div className={`rounded-2xl border-2 bg-card dark:bg-card-dark p-4 sm:p-5 transition-colors hover:border-duo-azul ${
      esReciente ? "border-duo-rojo/50" : "border-linea dark:border-linea-dark"
    }`}>
      {esReciente && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] rounded-xl">
          <HiExclamationCircle className="w-4 h-4 text-duo-rojo shrink-0" />
          <p className="text-xs font-black text-duo-rojo">Siniestro reciente — hace {dias} días</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tono={cfg.tono} size="sm">{s.estado_label || cfg.label}</Badge>
            <span className="text-xs text-suave dark:text-suave-dark font-bold">
              {RESP_LABELS[s.responsabilidad] || s.responsabilidad_label || s.responsabilidad}
            </span>
          </div>

          <p className="font-black text-base text-titulo dark:text-titulo-dark truncate">{s.cliente_label || "Sin cliente"}</p>

          <div className="flex items-center gap-3 flex-wrap text-xs font-bold">
            {s.nro_reclamo_cia ? (
              <span className="font-mono text-duo-azul">Reclamo #{s.nro_reclamo_cia}</span>
            ) : (
              <span className="text-duo-rojo">Sin N° de Cía</span>
            )}
            {s.poliza_label && (
              <span className="text-suave dark:text-suave-dark truncate max-w-[180px]">Póliza: {s.poliza_label}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-titulo dark:text-titulo-dark font-bold">
              {[s.marca_auto, s.modelo_auto, s.ano_auto].filter(Boolean).join(" ")}
            </span>
            {s.patente && (
              <span className="font-mono text-xs text-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 rounded-lg uppercase">
                {s.patente}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-mono font-black text-titulo dark:text-titulo-dark">
              {s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha"}
            </p>
            {dias !== null && (
              <p className={`text-xs mt-0.5 font-bold ${dias <= 30 ? "text-duo-rojo" : dias <= 90 ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : "text-suave dark:text-suave-dark"}`}>
                hace {dias}d
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onView(s)}
              className="h-9 w-9 rounded-lg bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul hover:brightness-95 flex items-center justify-center transition-all"
              title="Ver detalle">
              <HiEye className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(s)}
              className="h-9 w-9 rounded-lg bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo hover:brightness-95 flex items-center justify-center transition-all"
              title="Editar">
              <HiPencil className="w-4 h-4" />
            </button>
            {isWebAdmin && (
              <button onClick={() => onDelete(s)}
                className="h-9 w-9 rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo hover:brightness-95 flex items-center justify-center transition-all"
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
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark">
        <div className="text-5xl mb-3">🚨</div>
        <p className="text-titulo dark:text-titulo-dark font-black">No hay siniestros para mostrar</p>
        <p className="text-suave dark:text-suave-dark text-sm mt-1 font-bold">Probá ajustando los filtros o cargá uno nuevo</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {siniestros.map((s) => (
        <SiniestroCard
          key={s.id} s={s}
          isWebAdmin={isWebAdmin}
          onView={onView} onEdit={onEdit} onDelete={onDelete}
        />
      ))}
    </div>
  );
}
