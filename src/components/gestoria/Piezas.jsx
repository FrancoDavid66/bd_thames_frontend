// src/components/gestoria/Piezas.jsx
//
// 🧩 Piezas chicas que se repiten en Gestoría: avatar del gestor (con su foto
// si tiene), los botones de contacto, el punto de color del estado, el chip de
// "hace N días", el candado "Solo admin", el botón para subir archivos, los 5
// pasos del trámite y los cuadritos de números.
import { useRef, useState } from "react";
import {
  HiChatAlt2,
  HiCheck,
  HiClock,
  HiDocumentText,
  HiLocationMarker,
  HiLockClosed,
  HiMail,
  HiPhone,
  HiTrash,
  HiUpload,
} from "react-icons/hi";

import {
  ESTADOS,
  PASOS,
  colorGestor,
  ddmm,
  iniciales,
  linkMapa,
  linkTel,
  linkWhatsApp,
  tamTxt,
} from "./gestoriaUtils";

/**
 * Avatar del gestor: su foto si tiene; si no (o si la foto no carga), sus
 * iniciales en su color. Sin gestor: un "?" gris.
 */
export function Avatar({ id, nombre, size = 26, foto = "", color = "" }) {
  const [falla, setFalla] = useState("");
  const caja = { width: size, height: size };
  if (foto && falla !== foto) {
    return (
      <img
        src={foto}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFalla(foto)}
        className="rounded-full object-cover shrink-0 bg-white ring-1 ring-linea dark:ring-linea-dark"
        style={caja}
      />
    );
  }
  if (!id && !nombre) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-linea dark:bg-linea-dark text-suave dark:text-suave-dark font-bold shrink-0"
        style={{ ...caja, fontSize: Math.round(size * 0.42) }}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold shrink-0"
      style={{ ...caja, fontSize: Math.round(size * 0.38), background: color || (id ? colorGestor(id) : "#94a3b8") }}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}

/**
 * Botones para contactar al gestor: WhatsApp, Llamar, Mail y Cómo llegar.
 * Solo aparecen los que tienen dato. `c` = { telefono, email, direccion }.
 * Ej: <BotonesContacto c={t.gestor_contacto} nombre="Laura" texto="Hola Laura…" />
 */
export function BotonesContacto({ c, nombre = "", texto = "" }) {
  const items = [
    { href: linkWhatsApp(c?.telefono, texto), label: "WhatsApp", icono: HiChatAlt2, afuera: true, cls: "text-duo-verde-sombra dark:text-duo-verde" },
    { href: linkTel(c?.telefono), label: "Llamar", icono: HiPhone },
    { href: c?.email ? `mailto:${c.email}` : "", label: "Mail", icono: HiMail },
    { href: linkMapa(c?.direccion), label: "Cómo llegar", icono: HiLocationMarker, afuera: true },
  ].filter((x) => x.href);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => {
        const Icono = x.icono;
        return (
          <a
            key={x.label}
            href={x.href}
            target={x.afuera ? "_blank" : undefined}
            rel={x.afuera ? "noopener noreferrer" : undefined}
            aria-label={nombre ? `${x.label}: ${nombre}` : x.label}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
          >
            <Icono className={`w-4 h-4 shrink-0 ${x.cls || ""}`} />
            {x.label}
          </a>
        );
      })}
    </div>
  );
}

export function Punto({ color, className = "" }) {
  return <i className={`inline-block w-2 h-2 rounded-full shrink-0 ${className}`} style={{ background: color }} />;
}

export function EstadoPill({ estado, extra = "" }) {
  const e = ESTADOS[estado] || { n: estado, dot: "#94a3b8" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold"
      style={{ borderColor: `${e.dot}55`, color: e.dot, background: `${e.dot}14` }}
    >
      <Punto color={e.dot} />
      {e.n}
      {extra ? <span className="font-medium">· {extra}</span> : null}
    </span>
  );
}

/** Chip de días: verde (0–3), ámbar (4–6), rojo (7 o más = demorado). */
export function DiasChip({ dias, texto }) {
  const cls =
    dias >= 7
      ? "text-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]"
      : dias >= 4
        ? "text-duo-amarillo-sombra dark:text-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)]"
        : "text-duo-verde-sombra dark:text-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      <HiClock className="w-3 h-3" />
      {texto}
    </span>
  );
}

export function Demorado() {
  return (
    <span className="inline-flex items-center rounded-md bg-duo-rojo px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
      DEMORADO
    </span>
  );
}

export function Candado({ texto = true }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-1.5 py-0.5 text-[11px] font-semibold text-duo-amarillo-sombra dark:text-duo-amarillo"
      title="Esto lo ves solo vos (admin). La oficina no lo ve."
    >
      <HiLockClosed className="w-3 h-3" />
      {texto ? "Solo admin" : null}
    </span>
  );
}

const VARIANTES = {
  blanco:
    "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border border-linea dark:border-linea-dark hover:bg-surface dark:hover:bg-surface-dark",
  violeta: "bg-duo-violeta text-white hover:bg-duo-violeta-sombra",
  azul: "bg-duo-azul text-white hover:bg-duo-azul-sombra",
};

/**
 * Botón que abre el selector de archivos (fotos o PDF). Llama a
 * onElegir(file) y muestra "Subiendo…" mientras la promesa no termina.
 */
export function BotonArchivo({
  onElegir,
  children,
  variant = "blanco",
  size = "sm",
  full = false,
  disabled = false,
  accept = "image/*,application/pdf",
  className = "",
}) {
  const ref = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const tam = size === "sm" ? "text-[13px] px-3 py-2" : "text-[14px] px-4 py-2.5";
  const cambio = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f || subiendo) return;
    setSubiendo(true);
    try {
      await onElegir?.(f);
    } finally {
      setSubiendo(false);
    }
  };
  return (
    <label
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold select-none transition-colors cursor-pointer
        ${VARIANTES[variant] || VARIANTES.blanco} ${tam} ${full ? "w-full" : ""}
        ${disabled || subiendo ? "opacity-60 pointer-events-none" : ""} ${className}`}
    >
      <HiUpload className="w-4 h-4 shrink-0" />
      <span>{subiendo ? "Subiendo…" : children}</span>
      <input ref={ref} type="file" accept={accept} className="sr-only" onChange={cambio} disabled={disabled || subiendo} />
    </label>
  );
}

/** Los 5 pasos: Recibido → Asignado → En el registro → Listo → Entregado. */
export function Pasos({ t, vertical = false }) {
  const est = t.estado;
  let idx = PASOS.indexOf(est === "OBSERVADO" ? "EN_REGISTRO" : est);
  if (est === "CANCELADO") idx = -1;
  const fechaDe = {
    RECIBIDO: t.creado_en,
    ASIGNADO: t.asignado_en,
    EN_REGISTRO: t.en_registro_en,
    LISTO: t.listo_en,
    ENTREGADO: t.entregado_en,
  };
  return (
    <ol
      className={`grid gap-2.5 ${vertical ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-5"} rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3`}
      aria-label="En qué paso está"
    >
      {PASOS.map((p, i) => {
        const hecho = est === "ENTREGADO" ? i <= idx : i < idx;
        const actual = i === idx && est !== "ENTREGADO";
        const obs = actual && est === "OBSERVADO";
        let nombre = ESTADOS[p].n;
        if (p === "ASIGNADO" && t.gestor_nombre) nombre = `Asignado a ${t.gestor_nombre.split(" ")[0]}`;
        if (obs) nombre = "Observado";
        let sub = fechaDe[p] ? ddmm(fechaDe[p]) : p === "LISTO" && t.fecha_estimada ? `estimado ${ddmm(`${t.fecha_estimada}T12:00:00`)}` : "";
        if (obs) sub = `desde ${ddmm(t.observado_en)}`;
        else if (actual && fechaDe[p]) {
          sub = `desde ${ddmm(fechaDe[p])}`;
          if (p === "EN_REGISTRO" && t.veces_observado) {
            sub += ` · tuvo ${t.veces_observado} observación${t.veces_observado > 1 ? "es" : ""}`;
          }
        }
        const bola = hecho
          ? "bg-duo-verde text-white"
          : obs
            ? "bg-orange-500 text-white ring-4 ring-orange-500/20"
            : actual
              ? "bg-duo-violeta text-white ring-4 ring-duo-violeta/20"
              : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border border-linea dark:border-linea-dark";
        return (
          <li key={p} className="flex items-center gap-2.5 min-w-0">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${bola}`}>
              {hecho ? <HiCheck className="w-4 h-4" /> : i + 1}
            </span>
            <span className="flex flex-col min-w-0">
              <strong className={`text-[13px] leading-tight ${actual || hecho ? "text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}>
                {nombre}
              </strong>
              <span className="text-[12px] text-suave dark:text-suave-dark truncate">{sub}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Un archivo (link que abre en otra pestaña). */
export function Archivo({ d, etiqueta = null, onBorrar = null }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2 text-[13px]">
      <HiDocumentText className="w-4 h-4 text-suave dark:text-suave-dark shrink-0" />
      <a
        href={d.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 truncate font-medium text-duo-azul hover:underline"
        title={d.nombre}
      >
        {d.nombre || "archivo"}
      </a>
      {etiqueta}
      <span className="text-[11px] text-suave dark:text-suave-dark whitespace-nowrap hidden sm:inline">
        {ddmm(d.fecha)} · {d.autor}
        {d.tamano ? ` · ${tamTxt(d.tamano)}` : ""}
      </span>
      {onBorrar && (
        <button
          type="button"
          onClick={onBorrar}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-suave hover:text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]"
          aria-label={`Borrar ${d.nombre}`}
          title="Borrar (solo admin)"
        >
          <HiTrash className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function Etiqueta({ children, tono = "neutro" }) {
  const cls =
    tono === "azul"
      ? "border-duo-azul/40 text-duo-azul"
      : tono === "violeta"
        ? "border-duo-violeta/40 text-duo-violeta"
        : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark";
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap bg-card dark:bg-card-dark ${cls}`}>
      {children}
    </span>
  );
}

/** Cuadrito de número del tablero. tono: "neutro" | "rojo" | "verde" | "ambar". */
export function Tile({ k, v, n, tono = "neutro", extra = null }) {
  const bordes = {
    neutro: "border-linea dark:border-linea-dark",
    rojo: "border-duo-rojo/40",
    verde: "border-duo-verde/40",
    ambar: "border-duo-amarillo/40",
  };
  const valor = {
    neutro: "text-titulo dark:text-titulo-dark",
    rojo: "text-duo-rojo",
    verde: "text-duo-verde-sombra dark:text-duo-verde",
    ambar: "text-duo-amarillo-sombra dark:text-duo-amarillo",
  };
  return (
    <div className={`flex flex-col gap-1 rounded-xl border bg-card dark:bg-card-dark p-3.5 shadow-sm ${bordes[tono] || bordes.neutro}`}>
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold tracking-wide text-suave dark:text-suave-dark">
        {k}
        {extra}
      </span>
      <span className={`text-2xl font-bold leading-tight ${valor[tono] || valor.neutro}`}>{v}</span>
      {n ? <span className="text-[12px] text-suave dark:text-suave-dark">{n}</span> : null}
    </div>
  );
}

export function Seccion({ titulo, derecha = null, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 shadow-sm flex flex-col gap-3 ${className}`}>
      {(titulo || derecha) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {typeof titulo === "string" ? (
            <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">{titulo}</h2>
          ) : (
            titulo
          )}
          {derecha}
        </div>
      )}
      {children}
    </section>
  );
}

export function Cargando({ alto = "h-24" }) {
  return <div className={`rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark animate-pulse ${alto}`} />;
}
