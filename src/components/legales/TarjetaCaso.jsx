// src/components/legales/TarjetaCaso.jsx
//
// 🗂️ Tarjeta de un caso en el tablero: tema, cliente, oficina, lo que pasó en
// una línea, el estado, lo próximo (turno o fecha), quién lo tiene y hace
// cuánto no hay novedades. "Faltan los honorarios" / "Comisión a cobrar" solo
// le llegan al admin (el servidor no se lo manda a la oficina).
// 🆕 05/10: también lo que le puso el abogado desde su app: su estado propio
// ("Prueba"), la instancia y las etiquetas. Un caso PROPIO del abogado (no vino
// de una oficina) dice "Caso del abogado" en vez de la oficina (lo ve solo el admin).
import { HiCalendar, HiClock, HiDocumentText, HiExclamation } from "react-icons/hi";

import { Demorado, Punto } from "../gestoria/Piezas";
import { AvatarAbogado, Chip, DiasChip, EstadoPill } from "./PiezasLegales";
import { Etiqueta } from "./abogado/piezasAbogado";
import {
  colorOficina,
  diaCorto,
  diasHasta,
  diasSinNovedad,
  esDemorado,
  faseDe,
  hhmm,
  hoyYmd,
  textoDias,
} from "./legalesUtils";

function textoTurno(t) {
  if (!t) return "";
  const hoy = t.fecha === hoyYmd();
  return `${t.modalidad === "TELEFONO" ? "Llamada" : "Turno"} ${hoy ? "hoy" : diaCorto(t.fecha)} ${t.hora || hhmm(t.inicio)}`;
}

function textoFecha(f) {
  if (!f) return "";
  if (f.vencida) return `${f.titulo} venció ${diaCorto(f.fecha).split(" ")[1]}`;
  const d = diasHasta(f.fecha);
  const cuando = d === 0 ? "hoy" : d === 1 ? "mañana" : diaCorto(f.fecha);
  return `${f.titulo} ${cuando}${f.hora ? ` ${f.hora}` : ""}${d > 1 && d <= 7 ? ` · en ${d} días` : ""}`;
}

export default function TarjetaCaso({ e, onClick, mostrarOficina = true }) {
  const d = diasSinNovedad(e);
  const dem = esDemorado(e);
  const f = e.proxima_fecha;
  const fechaCerca = f && (f.vencida || diasHasta(f.fecha) <= 7);
  // En columnas de un solo estado (Consulta, Sentencia, Cobrado) la etiqueta sobra.
  const mostrarEstado = (faseDe(e.estado)?.estados || []).length > 1;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex flex-col gap-1.5 rounded-xl border bg-card dark:bg-card-dark p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
        dem ? "border-duo-rojo/50" : "border-linea dark:border-linea-dark"
      }`}
      aria-label={`Abrir ${e.numero}, ${e.persona_nombre}`}
    >
      <span className="flex items-center justify-between gap-2">
        <Chip>{e.tema_nombre}</Chip>
        <span className="text-[11px] text-suave dark:text-suave-dark whitespace-nowrap">{e.numero}</span>
      </span>
      <span className="flex items-baseline justify-between gap-2">
        <strong className="text-[14px] text-titulo dark:text-titulo-dark truncate">{e.persona_nombre || "Sin nombre"}</strong>
        {mostrarOficina && (
          <span className="inline-flex items-center gap-1 text-[11px] text-suave dark:text-suave-dark whitespace-nowrap">
            <Punto color={colorOficina(e.oficina)} />
            {e.propio ? "Caso del abogado" : e.oficina_nombre || "Sin oficina"}
          </span>
        )}
      </span>
      {e.resumen && <span className="text-[12px] leading-snug text-suave dark:text-suave-dark line-clamp-2">{e.resumen}</span>}
      <span className="flex flex-wrap gap-1.5">
        {mostrarEstado && <EstadoPill estado={e.estado} chico />}
        {/* Lo del abogado: su estado propio (si dice algo más que la etapa), la instancia y las etiquetas. */}
        {e.estado_propio && e.estado_propio.nombre !== e.estado_nombre && <Etiqueta o={e.estado_propio} chica punto />}
        {e.instancia && <Etiqueta o={e.instancia} chica />}
        {(e.etiquetas || []).slice(0, 3).map((q) => (
          <Etiqueta key={q.id} o={q} chica />
        ))}
        {e.proximo_turno && (
          <Chip tono="azul">
            <HiCalendar className="w-3 h-3" /> {textoTurno(e.proximo_turno)}
          </Chip>
        )}
        {e.falta_turno && (
          <Chip tono="ambar">
            <HiCalendar className="w-3 h-3" /> Falta darle turno
          </Chip>
        )}
        {f && (fechaCerca || !e.proximo_turno) && (
          <Chip tono={f.vencida ? "rojo" : fechaCerca ? "ambar" : "neutro"}>
            {f.vencida ? <HiExclamation className="w-3 h-3" /> : <HiClock className="w-3 h-3" />} {textoFecha(f)}
          </Chip>
        )}
        {e.cliente_subio_papeles && (
          <Chip tono="azul">
            <HiDocumentText className="w-3 h-3" /> El cliente subió papeles
          </Chip>
        )}
        {e.sin_honorarios && <Chip tono="ambar">Faltan los honorarios</Chip>}
        {e.comision_pendiente && <Chip tono="verde">Comisión a cobrar</Chip>}
      </span>
      <span className="mt-0.5 flex items-center gap-2 border-t border-linea/70 dark:border-linea-dark/70 pt-2">
        <AvatarAbogado id={e.abogado} nombre={e.abogado_nombre} foto={e.abogado_foto} />
        <span className="flex-1 min-w-0 truncate text-[12px] text-suave dark:text-suave-dark">{e.abogado_nombre || "Sin abogado"}</span>
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
