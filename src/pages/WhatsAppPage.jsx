// src/pages/WhatsAppPage.jsx
//
// 📲 WHATSAPP · PANEL DE CONTROL (solo admin) — Franco 24/11/2026
//
// Cada número conectado a YCloud (Siniestros, y después las oficinas) con:
//   · cuántos mensajes entraron y salieron,
//   · cuánto tardan en contestar (promedio y la más lenta),
//   · los clientes que están ESPERANDO respuesta (en rojo si pasaron el límite),
//   · los mensajes que no se pudieron entregar.
//
// Ejemplo: «Siniestros · respondieron 12 en 8 min promedio · 2 esperando (1 hace 45 min)».
// Se actualiza solo cada minuto mientras la pestaña está abierta.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import {
  HiArrowDown, HiArrowUp, HiCheckCircle, HiClock, HiExclamation, HiExternalLink,
  HiLightningBolt, HiRefresh, HiUser, HiXCircle,
} from "react-icons/hi";

import { pedirResumen } from "../services/whatsapp";

const PERIODOS = [
  { dias: 1, label: "Hoy" },
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
];
const UMBRALES = [
  { min: 15, label: "15 min" },
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hora" },
];

// 12 → «12 min» · 95 → «1 h 35 min» · 3000 → «2 días»
function duracion(min) {
  if (min === null || min === undefined) return "—";
  if (min < 60) return `${min} min`;
  if (min < 24 * 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(min / (24 * 60));
  return `${d} ${d === 1 ? "día" : "días"}`;
}

// 5491139462296 → «+54 9 11 3946-2296»
function telefonoLindo(t = "") {
  const d = String(t).replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) {
    const r = d.slice(3);
    return r.startsWith("11")
      ? `+54 9 11 ${r.slice(2, 6)}-${r.slice(6)}`
      : `+54 9 ${r.slice(0, 3)} ${r.slice(3, 6)}-${r.slice(6)}`;
  }
  return d ? `+${d}` : "";
}

// Velocidad de respuesta → color
function ritmo(min) {
  if (min === null || min === undefined) return { label: "Sin datos", cls: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark" };
  if (min <= 10) return { label: "Rápido", cls: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde border-duo-verde/30" };
  if (min <= 30) return { label: "Normal", cls: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo border-duo-amarillo/40" };
  return { label: "Lento", cls: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo border-duo-rojo/30" };
}

function haceCuanto(iso) {
  if (!iso) return "nunca";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 1 ? "recién" : `hace ${duracion(min)}`;
}

function Segmentos({ opciones, valor, onChange, clave, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-0.5">
      {opciones.map((o) => {
        const activo = o[clave] === valor;
        return (
          <button
            key={o[clave]}
            type="button"
            onClick={() => onChange(o[clave])}
            aria-pressed={activo}
            className={`h-8 rounded-md px-3 text-[13px] font-medium transition-colors ${
              activo
                ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
                : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Tarjeta({ icono: Icono, titulo, valor, detalle, tono = "azul" }) {
  const tonos = {
    azul: "text-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]",
    verde: "text-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]",
    rojo: "text-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)]",
    violeta: "text-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]",
  };
  return (
    <div className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-suave dark:text-suave-dark">{titulo}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tonos[tono]}`}>
          <Icono className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-titulo dark:text-titulo-dark">{valor}</p>
      {detalle && <p className="mt-0.5 text-[12px] text-suave dark:text-suave-dark">{detalle}</p>}
    </div>
  );
}

function Esperando({ c, umbral }) {
  const nombre = c.cliente_nombre || telefonoLindo(c.cliente_tel);
  return (
    <li className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center ${
      c.atrasado
        ? "border-duo-rojo/40 bg-duo-rojo-soft/60 dark:bg-[var(--color-duo-rojo-soft-dark)]"
        : "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-titulo dark:text-titulo-dark">{nombre}</p>
          {c.cliente_nombre && (
            <span className="text-[12px] text-suave dark:text-suave-dark">{telefonoLindo(c.cliente_tel)}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-suave dark:text-suave-dark">«{c.ultimo_texto || "…"}»</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          title={c.atrasado ? `Pasó el límite de ${umbral} min` : "Esperando respuesta"}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            c.atrasado ? "bg-duo-rojo text-white" : "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo"
          }`}
        >
          <HiClock className="h-3.5 w-3.5" /> hace {duracion(c.minutos)}
        </span>
        {c.cliente_id && (
          <Link
            to={`/clientes/${c.cliente_id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2.5 text-[12px] font-medium text-titulo dark:text-titulo-dark hover:border-duo-azul/50"
          >
            <HiUser className="h-3.5 w-3.5" /> Ficha
          </Link>
        )}
        <a
          href={`https://wa.me/${c.cliente_tel}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#25D366] px-2.5 text-[12px] font-semibold text-white hover:brightness-105"
        >
          <FaWhatsapp className="h-3.5 w-3.5" /> Abrir chat
        </a>
      </div>
    </li>
  );
}

function Linea({ l, umbral }) {
  const r = ritmo(l.promedio_respuesta_min);
  const esperando = l.sin_responder || [];
  return (
    <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linea dark:border-linea-dark px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
            <FaWhatsapp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">{l.nombre}</h2>
            <p className="text-[12px] text-suave dark:text-suave-dark">{telefonoLindo(l.telefono)}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${r.cls}`}>{r.label}</span>
      </header>

      <dl className="grid grid-cols-2 gap-px bg-linea dark:bg-linea-dark sm:grid-cols-5">
        {[
          ["Entraron", l.entrantes, HiArrowDown],
          ["Salieron", l.salientes, HiArrowUp],
          ["Promedio", duracion(l.promedio_respuesta_min), HiLightningBolt],
          ["La más lenta", duracion(l.mas_lenta_min), HiClock],
          ["No llegaron", l.fallidos, HiXCircle],
        ].map(([k, v, I]) => (
          <div key={k} className="bg-card dark:bg-card-dark px-4 py-3 last:col-span-2 sm:last:col-span-1">
            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-suave dark:text-suave-dark">
              <I className="h-3.5 w-3.5" /> {k}
            </dt>
            <dd className={`mt-0.5 text-[17px] font-semibold ${k === "No llegaron" && v > 0 ? "text-duo-rojo" : "text-titulo dark:text-titulo-dark"}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="px-4 py-4">
        <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
          Esperando respuesta
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            l.atrasados > 0 ? "bg-duo-rojo text-white" : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark"
          }`}>
            {esperando.length}
          </span>
        </h3>
        {esperando.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-2.5 text-[13px] font-medium text-duo-verde">
            <HiCheckCircle className="h-4 w-4" /> Nadie esperando: todos tienen respuesta.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {esperando.map((c) => (
              <Esperando key={c.cliente_tel} c={c} umbral={umbral} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function WhatsAppPage() {
  const [dias, setDias] = useState(1);
  const [umbral, setUmbral] = useState(15);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await pedirResumen({ dias, umbral });
      setDatos(r);
      setError("");
      setActualizado(new Date());
    } catch (e) {
      setError(e?.response?.status === 403 ? "Solo el administrador puede ver esta pantalla." : "No se pudo cargar. Probá de nuevo en un rato.");
    } finally {
      setCargando(false);
    }
  }, [dias, umbral]);

  useEffect(() => {
    cargar();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, 60000);
    return () => window.clearInterval(id);
  }, [cargar]);

  const totales = useMemo(() => {
    const lineas = datos?.lineas || [];
    const respondidas = lineas.reduce((a, l) => a + (l.respondidas || 0), 0);
    const ponderado = lineas.reduce((a, l) => a + (l.promedio_respuesta_min || 0) * (l.respondidas || 0), 0);
    return {
      entrantes: lineas.reduce((a, l) => a + l.entrantes, 0),
      respondidas,
      promedio: respondidas ? Math.round(ponderado / respondidas) : null,
      esperando: lineas.reduce((a, l) => a + (l.sin_responder || []).length, 0),
      atrasados: lineas.reduce((a, l) => a + (l.atrasados || 0), 0),
    };
  }, [datos]);

  const config = datos?.config;
  const periodo = PERIODOS.find((p) => p.dias === dias)?.label.toLowerCase();

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Encabezado */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white">
              <FaWhatsapp className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-titulo dark:text-titulo-dark sm:text-2xl">WhatsApp</h1>
              <p className="text-[13px] text-suave dark:text-suave-dark">Quién está esperando respuesta y cuánto tardan en contestar.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmentos etiqueta="Período" opciones={PERIODOS} valor={dias} onChange={setDias} clave="dias" />
            <Segmentos etiqueta="Límite de espera" opciones={UMBRALES} valor={umbral} onChange={setUmbral} clave="min" />
            <button
              type="button"
              onClick={cargar}
              aria-label="Actualizar"
              title="Actualizar"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
            >
              <HiRefresh className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Estado de la conexión con YCloud */}
        {config && (
          !config.ultimo_evento ? (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-4 py-3 text-[13px] text-titulo dark:text-titulo-dark">
              <HiExclamation className="mt-0.5 h-4 w-4 shrink-0 text-duo-amarillo" />
              <span>Todavía no llegó ningún mensaje desde YCloud. Mandá un WhatsApp de prueba a una línea conectada y tocá actualizar.</span>
            </div>
          ) : (
            <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-suave dark:text-suave-dark">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-duo-verde" /> Conectado a YCloud · último mensaje {haceCuanto(config.ultimo_evento)}
              </span>
              {!config.webhook_secret && (
                <span className="text-duo-rojo">⚠️ Falta la firma de seguridad (YCLOUD_WEBHOOK_SECRET en Railway)</span>
              )}
              {actualizado && <span>· actualizado {actualizado.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>}
            </p>
          )
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-4 py-3 text-[13px] font-medium text-duo-rojo">
            {error}
          </div>
        )}

        {!datos && cargando && (
          <div className="grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-card dark:bg-card-dark" />)}
          </div>
        )}

        {datos && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tarjeta
                icono={HiClock}
                titulo="Esperando ahora"
                valor={totales.esperando}
                detalle={totales.atrasados ? `${totales.atrasados} hace más de ${duracion(umbral)}` : "ninguno atrasado"}
                tono={totales.atrasados ? "rojo" : "verde"}
              />
              <Tarjeta icono={HiLightningBolt} titulo="Tiempo de respuesta" valor={duracion(totales.promedio)} detalle={`promedio de ${periodo}`} tono="violeta" />
              <Tarjeta icono={HiArrowDown} titulo="Mensajes de clientes" valor={totales.entrantes} detalle={periodo} tono="azul" />
              <Tarjeta icono={HiCheckCircle} titulo="Conversaciones respondidas" valor={totales.respondidas} detalle={periodo} tono="verde" />
            </div>

            <div className="flex flex-col gap-4">
              {datos.lineas.length === 0 ? (
                <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-6 text-center text-[13px] text-suave dark:text-suave-dark">
                  No hay líneas conectadas todavía.
                </p>
              ) : (
                datos.lineas.map((l) => <Linea key={l.id} l={l} umbral={umbral} />)
              )}
            </div>

            <p className="mt-6 flex items-start gap-1.5 text-[12px] text-suave dark:text-suave-dark">
              <HiExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Cómo se mide: desde el primer mensaje del cliente hasta la primera respuesta (del celu, WhatsApp Web o THAMES).
              Si el cliente manda 3 mensajes seguidos, cuenta desde el primero.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
