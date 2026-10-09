// src/components/siniestros/SiniestrosList.jsx
//
// 🚨 Lista de siniestros.
// 🆕 09/10: TABLA (estilo Linear / Stripe) en vez de las tarjetas.
//   - Tocás la fila en cualquier lado → se abre el detalle del siniestro.
//   - Al final de la fila: Editar y Eliminar (este último solo admin).
//     En la compu aparecen al pasar el mouse; en el celu queda el lápiz.
//   - Los títulos de las columnas ordenan (cliente, patente, estado, fecha…).
//   - Raya roja a la izquierda = siniestro reciente (30 días o menos) y abierto.
//   - Celu: renglones compactos (sin tarjetas).
// Va adentro de la tarjeta de SiniestrosPage (que tiene las pestañas y el buscador).
import { useMemo } from "react";
import { HiCamera, HiExclamationCircle, HiPencil, HiTrash } from "react-icons/hi";
import dayjs from "dayjs";

import Badge from "../ui/Badge";
import TablaDuo, { MarcaTabla } from "../ui/TablaDuo";

// Estado → tono del Badge + label corto.
export const ESTADO_CFG = {
  PENDIENTE: { tono: "amarillo", label: "Falta doc.", color: "#d97706" },
  DENUNCIADO: { tono: "azul", label: "Denunciado", color: "#2563eb" },
  INSPECCION: { tono: "violeta", label: "Inspección", color: "#5b52e6" },
  LIQUIDACION: { tono: "azul", label: "Liquidación", color: "#2563eb" },
  CERRADO: { tono: "verde", label: "Cerrado", color: "#16a34a" },
};
const ORDEN_ESTADO = ["PENDIENTE", "DENUNCIADO", "INSPECCION", "LIQUIDACION", "CERRADO"];

const RESP_LABELS = {
  CHOCO: "Asegurado chocó",
  CHOCARON: "Fue chocado",
  ROBO: "Robo / Hurto",
  INCENDIO: "Incendio",
  OTRO: "Otro",
};

const respTxt = (s) => RESP_LABELS[s.responsabilidad] || s.responsabilidad_label || s.responsabilidad || "—";
const vehiculoTxt = (s) => [s.marca_auto, s.modelo_auto, s.ano_auto].filter(Boolean).join(" ");
const diasDesde = (s) => (s.fecha_siniestro ? dayjs().startOf("day").diff(dayjs(s.fecha_siniestro), "day") : null);
const esReciente = (s) => {
  const d = diasDesde(s);
  return d !== null && d <= 30 && s.estado !== "CERRADO";
};
const textoHace = (d) => (d === 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`);
const colorHace = (d) =>
  d <= 30 ? "text-duo-rojo" : d <= 90 ? "text-duo-amarillo-sombra dark:text-duo-amarillo" : "text-suave dark:text-suave-dark";

// En la tabla va el nombre corto (igual que las pestañas); el largo del servidor queda en el "title".
function EstadoBadge({ s }) {
  const cfg = ESTADO_CFG[s.estado] || { tono: "neutro", label: s.estado_label || s.estado };
  return (
    <span title={s.estado_label || cfg.label} className="inline-flex">
      <Badge tono={cfg.tono} className="whitespace-nowrap">
        {cfg.label}
      </Badge>
    </span>
  );
}

export default function SiniestrosList({ siniestros, isWebAdmin, onView, onEdit, onDelete, vacio = null }) {
  const columnas = useMemo(
    () => [
      {
        key: "cliente",
        header: "Cliente",
        sortValue: (s) => s.cliente_label || "",
        render: (s) => (
          <span className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark truncate max-w-[240px]">{s.cliente_label || "Sin cliente"}</span>
            <span className="flex items-center gap-2 text-[12px] text-suave dark:text-suave-dark">
              #{s.id}
              {s.fotos_count ? (
                <span className="inline-flex items-center gap-0.5" title={`${s.fotos_count} foto${s.fotos_count > 1 ? "s" : ""}`}>
                  <HiCamera className="w-3.5 h-3.5" /> {s.fotos_count}
                </span>
              ) : null}
            </span>
          </span>
        ),
      },
      {
        key: "vehiculo",
        header: "Vehículo",
        sortValue: (s) => s.patente || "",
        render: (s) => (
          <span className="flex flex-col min-w-0">
            {s.patente ? (
              <span className="font-mono text-[13px] font-bold uppercase tracking-wide text-titulo dark:text-titulo-dark whitespace-nowrap">{s.patente}</span>
            ) : (
              <span className="text-[13px] font-semibold text-suave dark:text-suave-dark">Sin patente</span>
            )}
            <span className="text-[12px] text-suave dark:text-suave-dark truncate max-w-[200px]">{vehiculoTxt(s) || "—"}</span>
          </span>
        ),
      },
      {
        key: "tipo",
        header: "Qué pasó",
        desde: "lg",
        sortValue: (s) => respTxt(s),
        render: (s) => <span className="whitespace-nowrap">{respTxt(s)}</span>,
      },
      {
        key: "reclamo",
        header: "N° de reclamo",
        sortValue: (s) => s.nro_reclamo_cia || "",
        render: (s) =>
          s.nro_reclamo_cia ? (
            <span className="font-mono text-[13px] font-semibold text-duo-azul dark:text-blue-300 whitespace-nowrap">{s.nro_reclamo_cia}</span>
          ) : (
            <MarcaTabla tono="rojo">Sin N° de Cía</MarcaTabla>
          ),
      },
      {
        key: "poliza",
        header: "Póliza",
        desde: "xl",
        sortValue: (s) => (s.poliza_label && s.poliza_label !== "—" ? s.poliza_label : ""),
        render: (s) => (
          <span className="block truncate max-w-[220px] text-suave dark:text-suave-dark" title={s.poliza_label}>
            {s.poliza_label || "—"}
          </span>
        ),
      },
      {
        key: "estado",
        header: "Estado",
        sortValue: (s) => ORDEN_ESTADO.indexOf(s.estado),
        render: (s) => <EstadoBadge s={s} />,
      },
      {
        key: "fecha",
        header: "Fecha",
        align: "right",
        primeroDesc: true,
        sortValue: (s) => s.fecha_siniestro || "",
        render: (s) => {
          const d = diasDesde(s);
          return (
            <span className="inline-flex flex-col items-end">
              <span className="font-mono text-[13px] font-semibold whitespace-nowrap">
                {s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM/YYYY") : "Sin fecha"}
              </span>
              {d !== null && <span className={`text-[12px] whitespace-nowrap ${colorHace(d)}`}>{textoHace(d)}</span>}
            </span>
          );
        },
      },
    ],
    []
  );

  // ✏️🗑️ Botones al final de la fila (no abren el detalle).
  const acciones = (s, { enCelu }) => (
    <>
      <button
        type="button"
        onClick={() => onEdit(s)}
        className={`inline-flex items-center justify-center rounded-lg text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark hover:text-titulo dark:hover:text-titulo-dark transition focus:opacity-100 ${
          enCelu ? "h-10 w-10" : "h-8 w-8 lg:opacity-0 lg:group-hover:opacity-100"
        }`}
        title="Editar"
        aria-label={`Editar siniestro #${s.id}`}
      >
        <HiPencil className="w-4 h-4" />
      </button>
      {isWebAdmin && !enCelu && (
        <button
          type="button"
          onClick={() => onDelete(s)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-suave dark:text-suave-dark hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)] hover:text-duo-rojo transition focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          title="Eliminar"
          aria-label={`Eliminar siniestro #${s.id}`}
        >
          <HiTrash className="w-4 h-4" />
        </button>
      )}
    </>
  );

  // 📱 Renglón del celu.
  const filaCelu = (s) => {
    const d = diasDesde(s);
    return (
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate text-[14px] text-titulo dark:text-titulo-dark">{s.cliente_label || "Sin cliente"}</strong>
          <span className={`shrink-0 text-[12px] font-medium ${d !== null ? colorHace(d) : "text-suave dark:text-suave-dark"}`}>
            {s.fecha_siniestro ? dayjs(s.fecha_siniestro).format("DD/MM") : "Sin fecha"}
          </span>
        </span>
        <span className="truncate text-[12px] text-suave dark:text-suave-dark">
          {vehiculoTxt(s) || "Vehículo"}
          {s.patente && (
            <>
              {" · "}
              <span className="font-mono font-bold uppercase text-titulo dark:text-titulo-dark">{s.patente}</span>
            </>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <EstadoBadge s={s} />
          {s.nro_reclamo_cia ? (
            <span className="text-[12px] text-suave dark:text-suave-dark">Reclamo {s.nro_reclamo_cia}</span>
          ) : (
            <MarcaTabla tono="rojo">Sin N° de Cía</MarcaTabla>
          )}
        </span>
      </span>
    );
  };

  return (
    <TablaDuo
      bare
      columns={columnas}
      rows={siniestros || []}
      onRowClick={onView}
      rowLabel={(s) => `Ver siniestro #${s.id} de ${s.cliente_label || "sin cliente"}`}
      rowTone={(s) => (esReciente(s) ? "rojo" : null)}
      mobileRow={filaCelu}
      acciones={acciones}
      vacio={
        vacio || (
          <div className="flex flex-col items-center">
            <HiExclamationCircle className="w-10 h-10 text-suave dark:text-suave-dark mb-3" />
            <p className="text-titulo dark:text-titulo-dark font-medium">No hay siniestros para mostrar</p>
            <p className="text-suave dark:text-suave-dark text-sm mt-1">Probá ajustando los filtros o cargá uno nuevo</p>
          </div>
        )
      }
    />
  );
}
