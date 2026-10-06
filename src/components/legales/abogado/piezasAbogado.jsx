// src/components/legales/abogado/piezasAbogado.jsx
//
// 🧩 Piezas de la APP DEL ABOGADO (05/10, estilo "billetera": un inicio con todo
// a mano y cada caso con su camino). Colores de THAMES, en claro y en oscuro.
//   Etiqueta     la pastilla de color de un estado, una instancia o una etiqueta
//   IconoRedondo el circulito con ícono de cada renglón (como los movimientos de una cuenta)
//   FilaAgenda   una fecha o un turno en "Lo que viene" y en la agenda
//   Pastillas    varias opciones para tocar (una sola o varias)
//   Campo, Interruptor, CartelError, BarraVolver, FilaDato: lo demás que se repite
// Lo general (Boton, Tarjeta, Seccion, BarraTitulo, Vacio, CampoPlata) es lo mismo
// de la app de la gestora: se reusa, no se copia.
import {
  HiOutlineArrowLeft,
  HiOutlineBuildingLibrary,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from "react-icons/hi2";

import { TONO_TEXTO, cajaDeTono, caratulaCorta, colorDe, foco, horaODia, suave, tipoFecha, tonoDeFecha } from "./abogadoUtils";

export { Boton, BarraTitulo, CampoPlata, Seccion, Tarjeta, Vacio } from "../../gestoria/gestora/piezas";

/** La pastilla de color: <Etiqueta o={{nombre: "Prueba", color: "turquesa"}} punto /> */
export function Etiqueta({ o, punto = false, chica = false, className = "" }) {
  if (!o?.nombre) return null;
  const c = colorDe(o.color);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md font-bold ${chica ? "px-1.5 py-px text-[11.5px]" : "px-2 py-0.5 text-[13px]"} ${c.caja} ${className}`}
    >
      {punto ? <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${c.punto}`} aria-hidden="true" /> : null}
      <span className="truncate">{o.nombre}</span>
    </span>
  );
}

/** El circulito con ícono (tono: ambar · violeta · azul · verde · rojo · neutro). */
export function IconoRedondo({ icono, tono = "neutro", lado = 38 }) {
  const Icono = icono;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${cajaDeTono(tono)}`} style={{ width: lado, height: lado }} aria-hidden="true">
      <Icono className="h-[19px] w-[19px]" strokeWidth={2} />
    </span>
  );
}

const ICONO_FECHA = { PLAZO: HiOutlineClock, AUDIENCIA: HiOutlineBuildingLibrary, PERICIA: HiOutlineUsers, REUNION: HiOutlineUserGroup };

/**
 * Una fecha o un turno, como un movimiento de cuenta:
 *   (🕒)  Contestar el traslado            Hoy ›
 *         GÓMEZ, María c/ PROVINCIA ART
 * item = { clase: "fecha", f } o { clase: "turno", t } (ver juntarAgenda).
 */
export function FilaAgenda({ item, onTocar, conCaso = true }) {
  const esTurno = item.clase === "turno";
  const f = item.f;
  const t = item.t;
  const tono = esTurno ? "azul" : f.cumplido ? "neutro" : f.vencida ? "rojo" : tonoDeFecha(f) === "ambar" ? "ambar" : tipoFecha(f.tipo).tono;
  const Icono = esTurno ? HiOutlineUserGroup : f.cumplido ? HiOutlineCheck : f.vencida ? HiOutlineExclamationTriangle : ICONO_FECHA[f.tipo] || HiOutlineCalendarDays;
  const titulo = esTurno ? `Turno: ${t.persona || "cliente"}` : f.titulo;
  const sub = esTurno
    ? [t.modalidad === "TELEFONO" ? "Por teléfono" : t.oficina_nombre ? `En ${t.oficina_nombre}` : "En la oficina", t.estado === "LLEGO" ? "ya llegó" : ""].filter(Boolean).join(" · ")
    : [conCaso ? caratulaCorta(f) : "", f.plazo || tipoFecha(f.tipo).nombre, conCaso ? "" : f.detalle].filter(Boolean).join(" · ");
  const derecha = esTurno ? horaODia({ fecha: t.fecha, hora: t.hora }) : horaODia(f);
  const tonoDerecha = !esTurno && !f.cumplido && (f.vencida ? "rojo" : tonoDeFecha(f) === "ambar" ? "ambar" : "");
  return (
    <button
      type="button"
      onClick={onTocar}
      className={`flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-white/[0.03] dark:active:bg-white/[0.06] ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}
    >
      <IconoRedondo icono={Icono} tono={tono} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-[15px] font-bold ${!esTurno && f.cumplido ? `line-through ${suave}` : "text-titulo dark:text-titulo-dark"}`}>{titulo}</span>
        {sub ? <span className={`truncate text-[13px] ${suave}`}>{sub}</span> : null}
      </span>
      {!esTurno && f.visible_cliente ? <HiOutlineEye className={`h-4 w-4 shrink-0 ${suave}`} aria-label="Lo ve el cliente" /> : null}
      <span className={`shrink-0 text-[13px] font-bold tabular-nums ${tonoDerecha ? TONO_TEXTO[tonoDerecha] : suave}`}>{derecha}</span>
      <HiOutlineChevronRight className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}

/**
 * Opciones para tocar. una = se elige una sola (valor = id o "") · varias = lista de ids.
 * <Pastillas opciones={[{id: "PLAZO", nombre: "Plazo"}]} valor={tipo} onCambiar={setTipo} conNinguna />
 */
export function Pastillas({ opciones = [], valor, onCambiar, varias = false, etiqueta = "", conColor = false }) {
  const elegidas = varias ? valor || [] : [valor];
  const tocar = (id) => {
    if (varias) onCambiar(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);
    else onCambiar(valor === id ? "" : id);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={etiqueta || undefined}>
      {opciones.map((o) => {
        const on = elegidas.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => tocar(o.id)}
            className={`inline-flex min-h-[42px] max-w-full items-center gap-1.5 rounded-full px-3.5 text-left text-[14.5px] leading-tight transition-colors ${
              on
                ? "border-[1.5px] border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff]"
                : "border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark font-semibold text-titulo dark:text-titulo-dark"
            } ${foco}`}
          >
            {conColor ? <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorDe(o.color).punto}`} aria-hidden="true" /> : null}
            {on && !conColor ? <HiOutlineCheck className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" /> : null}
            <span className="break-words">{o.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Un campo con su título arriba (y una ayudita abajo). */
export function Campo({ label, ayuda = "", opcional = false, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[14px] font-extrabold text-titulo dark:text-titulo-dark">
        {label} {opcional ? <span className={`font-semibold ${suave}`}>(opcional)</span> : null}
      </label>
      {children}
      {ayuda ? <span className={`text-[13px] ${suave}`}>{ayuda}</span> : null}
    </div>
  );
}

/** El tilde grande: "Que lo vea el cliente". */
export function Tilde({ checked, onChange, children, id, disabled = false }) {
  return (
    <label htmlFor={id} className={`flex min-h-[44px] items-center gap-2.5 text-[15px] font-semibold text-titulo dark:text-titulo-dark ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-[22px] w-[22px] shrink-0 accent-duo-violeta" />
      <span>{children}</span>
    </label>
  );
}

export function CartelError({ texto }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[14px] font-semibold text-duo-rojo dark:text-red-300">
      {texto}
    </p>
  );
}

/** La barra de arriba de una pantalla "de adentro": ‹ volver · título · algo a la derecha. */
export function BarraVolver({ titulo, sub = "", onVolver, volverA = "Volver", derecha = null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-linea dark:border-linea-dark bg-card dark:bg-card-dark" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex min-h-[58px] w-full max-w-2xl items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={onVolver}
          aria-label={volverA}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark ${foco}`}
        >
          <HiOutlineArrowLeft className="h-[22px] w-[22px]" strokeWidth={2.2} aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="line-clamp-2 break-words text-[16.5px] font-extrabold leading-tight text-titulo dark:text-titulo-dark">{titulo}</h1>
          {sub ? <span className={`truncate text-[12.5px] ${suave}`}>{sub}</span> : null}
        </div>
        {derecha}
      </div>
    </header>
  );
}

/** Un renglón "Juzgado ·········· Civil y Comercial N° 7" de la tarjeta de datos. */
export function FilaDato({ label, children, vacio = "Sin cargar" }) {
  const hay = children !== null && children !== undefined && children !== "" && children !== false;
  return (
    <div className="flex items-baseline gap-3 py-[7px]">
      <span className={`w-[104px] shrink-0 text-[13.5px] ${suave}`}>{label}</span>
      <span className={`min-w-0 flex-1 break-words text-[15px] ${hay ? "font-semibold text-titulo dark:text-titulo-dark" : suave}`}>{hay ? children : vacio}</span>
    </div>
  );
}

/** El título de una tarjeta con un link a la derecha ("En qué anda ······ Editar estados"). */
export function CabeceraTarjeta({ titulo, n = null, children = null }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
      <h2 className="flex items-center gap-2 text-[15.5px] font-extrabold text-titulo dark:text-titulo-dark">
        {titulo}
        {n ? <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/60 px-1.5 text-[12.5px] font-extrabold text-slate-600 dark:text-slate-300">{n}</span> : null}
      </h2>
      {children}
    </div>
  );
}
