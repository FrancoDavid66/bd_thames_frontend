// src/components/gestoria/TarjetaTramite.jsx
//
// 🗂️ Tarjeta de un trámite en el tablero: tipo, oficina, patente, cliente,
// quién lo tiene y hace cuánto está así. "Sin precio" solo le llega al admin
// (el servidor no se lo manda a la oficina; con las comisiones apagadas, a
// nadie). "Avisar al cliente": está LISTO y todavía nadie le mandó el WhatsApp
// (se manda a mano desde la ficha; con el aviso apagado no aparece).
// Sin patente (se carga después): dice "Sin patente".
// "Lo cargó el gestor": lo dio de alta el mismo gestor desde su usuario (29/09).
// 🪪 Trámites de la persona (licencia de conducir, con_vehiculo=false): sin renglón de auto.
import { HiChatAlt2, HiDocumentText, HiUserAdd } from "react-icons/hi";

import { Avatar, Demorado, DiasChip, Punto } from "./Piezas";
import { colorOficina, diasEnEstado, esDemorado, textoDias, tipoCorto } from "./gestoriaUtils";

export default function TarjetaTramite({ t, onClick }) {
  const d = diasEnEstado(t);
  const dem = esDemorado(t);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex flex-col gap-1.5 rounded-xl border bg-card dark:bg-card-dark p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-duo-violeta ${
        dem ? "border-duo-rojo/50" : "border-linea dark:border-linea-dark"
      }`}
      aria-label={`Abrir ${t.numero}${t.patente ? `, ${t.patente}` : ""}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-duo-violeta truncate">{tipoCorto(t)}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-suave dark:text-suave-dark whitespace-nowrap">
          <Punto color={colorOficina(t.oficina)} />
          {t.oficina_nombre || "Sin oficina"}
        </span>
      </span>
      {t.con_vehiculo !== false && (
        <span className="flex flex-wrap items-baseline gap-x-2">
          {t.patente ? (
            <strong className="font-mono text-[15px] tracking-wide text-titulo dark:text-titulo-dark">{t.patente}</strong>
          ) : (
            <span className="text-[13px] font-semibold text-suave dark:text-suave-dark">Sin patente</span>
          )}
          <span className="text-[12px] text-suave dark:text-suave-dark truncate">{t.vehiculo}</span>
        </span>
      )}
      <span className="text-[13px] text-titulo dark:text-titulo-dark truncate">{t.persona_nombre || "—"}</span>
      {t.estado === "OBSERVADO" && t.falta && (
        <span className="rounded-md bg-orange-50 dark:bg-orange-500/10 px-2 py-1 text-[12px] font-medium text-orange-700 dark:text-orange-300">
          Falta: {t.falta}
        </span>
      )}
      {t.sin_precio && (
        <span className="self-start rounded-md border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-2 py-0.5 text-[11px] font-bold text-duo-amarillo-sombra dark:text-duo-amarillo">
          Sin precio
        </span>
      )}
      {t.cargado_por_gestor && (
        <span className="self-start inline-flex items-center gap-1 rounded-md border border-duo-violeta/40 bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] px-2 py-0.5 text-[11px] font-bold text-duo-violeta">
          <HiUserAdd className="w-3.5 h-3.5" /> Lo cargó el gestor
        </span>
      )}
      {t.aviso_listo_pendiente && (
        <span className="self-start inline-flex items-center gap-1 rounded-md border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-2 py-0.5 text-[11px] font-bold text-duo-verde-sombra dark:text-duo-verde">
          <HiChatAlt2 className="w-3.5 h-3.5" /> Avisar al cliente
        </span>
      )}
      {t.cliente_subio_papeles && (
        <span className="self-start inline-flex items-center gap-1 rounded-md border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 text-[11px] font-bold text-duo-azul">
          <HiDocumentText className="w-3.5 h-3.5" /> El cliente subió papeles
        </span>
      )}
      <span className="mt-0.5 flex items-center gap-2 border-t border-linea/70 dark:border-linea-dark/70 pt-2">
        <Avatar id={t.gestor} nombre={t.gestor_nombre} foto={t.gestor_foto} />
        <span className="flex-1 min-w-0 truncate text-[12px] text-suave dark:text-suave-dark">{t.gestor_nombre || "Sin gestor"}</span>
        <DiasChip dias={d} texto={textoDias(d)} />
      </span>
      {dem && (
        <span className="self-start">
          <Demorado />
        </span>
      )}
    </button>
  );
}
