// src/pages/WhatsAppPage.jsx
//
// 📲 WHATSAPP · PANEL DE CONTROL (solo admin) — Franco 24/11/2026
//
// Cada número conectado (Siniestros por YCloud; las oficinas directo por Meta) con:
//   · de qué oficina es (✏️ «¿De qué oficina es?» le pone nombre y oficina),
//   · cuántos mensajes entraron y salieron,
//   · cuánto tardan en contestar (promedio y la más lenta),
//   · los clientes que están ESPERANDO respuesta (en rojo si pasaron el límite),
//   · los mensajes que no se pudieron entregar.
//
// Ejemplo: «Siniestros · respondieron 12 en 8 min promedio · 2 esperando (1 hace 45 min)».
//
// 📡 EN VIVO (sin F5): mientras esta pantalla está abierta, el cartero pregunta
// cada 3 s (cada 15 s con la pestaña minimizada). Si entró o salió un mensaje,
// el panel y los chats se recargan solos. 🔔 Suena un "ding" cuando escribe un
// cliente (se apaga con el botón de la campanita). Respaldo: cada minuto.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import {
  HiArrowDown, HiArrowUp, HiBell, HiCheckCircle, HiClock, HiExclamation, HiExternalLink,
  HiChatAlt2, HiChartBar, HiLightningBolt, HiOfficeBuilding, HiPencil, HiRefresh, HiReply, HiUser, HiXCircle,
} from "react-icons/hi";

import ChatsWhatsApp from "../components/whatsapp/ChatsWhatsApp";
import useDatosVivos, { useAcelerarVivo } from "../hooks/useDatosVivos";
import { ding, guardarLinea, pedirLineas, pedirResumen, setSonidoActivo, sonidoActivo } from "../services/whatsapp";

// 🔔 Prender / apagar el ding de "entró un mensaje" (queda guardado en este navegador).
function BotonSonido() {
  const [on, setOn] = useState(sonidoActivo);
  useEffect(() => {
    const f = (e) => setOn(!!e.detail);
    window.addEventListener("whatsapp-sonido", f);
    return () => window.removeEventListener("whatsapp-sonido", f);
  }, []);
  const cambiar = () => {
    setSonidoActivo(!on);
    if (!on) ding(); // así escuchás cómo suena
  };
  return (
    <button
      type="button"
      onClick={cambiar}
      aria-pressed={on}
      aria-label={on ? "Sonido prendido: tocá para apagarlo" : "Sonido apagado: tocá para prenderlo"}
      title={on ? "Suena cuando escribe un cliente (tocá para apagar)" : "Sin sonido (tocá para prender)"}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg border bg-card dark:bg-card-dark transition-colors ${
        on ? "border-[#25D366]/50 text-[#128C4B] dark:text-[#25D366]" : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark"}`}
    >
      <HiBell className="h-4 w-4" />
      {!on && <span aria-hidden className="absolute h-[2px] w-5 rotate-45 rounded bg-current" />}
    </button>
  );
}

// 🗂️ SOLAPAS DE OFICINAS (panel y chats). Se acuerda en este navegador.
//   · «Todas» → se ve todo.
//   · Desde «Todas», tocar una oficina → se ve SOLO esa.
//   · Tocar otra → se suma. Tocar una que está prendida → se oculta.
//   Ej: Todas → toco KM39 (solo KM39) → toco Talita (KM39 + Talita) → toco KM39 (solo Talita).
const CLAVE_SOLAPAS = "thames.whatsapp.solapas";

function leerSolapas() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_SOLAPAS) || "[]");
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x) && x > 0) : [];
  } catch {
    return [];
  }
}

function Solapas({ lineas, visibles, onTocar, onTodas }) {
  if (lineas.length < 2) return null;
  const todas = visibles.length === 0;
  const contador = (n, rojo) => (
    <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
      rojo ? "bg-duo-rojo text-white" : n ? "bg-duo-amarillo text-white" : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark"}`}>
      {n}
    </span>
  );
  const base = "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition-colors";
  const prendida = "border-[#25D366] bg-[#25D366]/10 text-titulo dark:text-titulo-dark";
  const apagada = "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark";
  const totalEsperando = lineas.reduce((a, l) => a + (l.sin_responder || []).length, 0);
  const totalAtrasados = lineas.reduce((a, l) => a + (l.atrasados || 0), 0);
  return (
    <div className="mb-4">
      <div role="tablist" aria-label="Oficinas" className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" role="tab" aria-selected={todas} onClick={onTodas} className={`${base} ${todas ? prendida : apagada}`}>
          Todas {contador(totalEsperando, totalAtrasados > 0)}
        </button>
        {lineas.map((l) => {
          const on = todas || visibles.includes(l.id);
          const esperando = (l.sin_responder || []).length;
          return (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={!todas && on}
              onClick={() => onTocar(l.id)}
              title={`${telefonoLindo(l.telefono)}${l.oficina ? ` · ${l.oficina}` : ""} · ${esperando} esperando`}
              className={`${base} ${!todas && on ? prendida : apagada}`}
            >
              {!todas && on && <span className="h-2 w-2 rounded-full bg-[#25D366]" />}
              {l.nombre?.startsWith("+") ? telefonoLindo(l.telefono) : l.nombre}
              {contador(esperando, (l.atrasados || 0) > 0)}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[11px] text-suave dark:text-suave-dark">
        {todas
          ? "Tocá una oficina para ver solo esa."
          : "Tocá otra oficina para sumarla, o tocá una prendida para ocultarla."}
      </p>
    </div>
  );
}

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

function Esperando({ c, umbral, onResponder }) {
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
        <button
          type="button"
          onClick={() => onResponder(c)}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#25D366] px-2.5 text-[12px] font-semibold text-white hover:brightness-105"
        >
          <HiReply className="h-3.5 w-3.5" /> Responder
        </button>
      </div>
    </li>
  );
}

// ✏️ Ponerle nombre a la línea y decir de qué oficina es.
//    Ej: «+5491135858428» → nombre «KM39», oficina «KM39».
function EditarLinea({ l, onCerrar, onGuardado }) {
  const [nombre, setNombre] = useState(l.nombre?.startsWith("+") ? "" : l.nombre || "");
  const [oficina, setOficina] = useState("");
  const [oficinas, setOficinas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    pedirLineas()
      .then((r) => {
        if (!vivo) return;
        setOficinas(r.oficinas || []);
        const actual = (r.lineas || []).find((x) => x.id === l.id);
        if (actual?.oficina) setOficina(String(actual.oficina.id));
      })
      .catch(() => vivo && setError("No se pudieron traer las oficinas."));
    return () => { vivo = false; };
  }, [l.id]);

  const elegirOficina = (id) => {
    setOficina(id);
    // Si todavía no tiene nombre, le ponemos el de la oficina (se puede cambiar).
    const o = oficinas.find((x) => String(x.id) === id);
    if (o && !nombre.trim()) setNombre(o.nombre);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return setError("Poné un nombre (ej: KM39).");
    setGuardando(true);
    setError("");
    try {
      await guardarLinea(l.id, { nombre: nombre.trim(), oficina: oficina ? Number(oficina) : null });
      onGuardado();
      onCerrar();
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const campo = "h-9 w-full rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 text-[13px] text-titulo dark:text-titulo-dark focus:border-duo-azul focus:outline-none";
  return (
    <form onSubmit={guardar} className="flex flex-col gap-3 border-b border-linea dark:border-linea-dark bg-surface/60 dark:bg-surface-dark/60 px-4 py-3 sm:flex-row sm:items-end">
      <label className="flex-1 text-[12px] font-medium text-suave dark:text-suave-dark">
        Nombre en el panel
        <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} placeholder="Ej: KM39" className={`mt-1 ${campo}`} />
      </label>
      <label className="flex-1 text-[12px] font-medium text-suave dark:text-suave-dark">
        Oficina
        <select value={oficina} onChange={(e) => elegirOficina(e.target.value)} className={`mt-1 ${campo}`}>
          <option value="">— Sin oficina —</option>
          {oficinas.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCerrar} className="h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[13px] font-medium text-titulo dark:text-titulo-dark">
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className="h-9 rounded-lg bg-duo-azul px-4 text-[13px] font-semibold text-white disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p className="text-[12px] font-medium text-duo-rojo sm:basis-full">{error}</p>}
    </form>
  );
}

function Linea({ l, umbral, onResponder, onCambio }) {
  const r = ritmo(l.promedio_respuesta_min);
  const esperando = l.sin_responder || [];
  const [editando, setEditando] = useState(false);
  const sinNombre = !l.nombre || l.nombre.startsWith("+");
  return (
    <section className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-linea dark:border-linea-dark px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
            <FaWhatsapp className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">
                {sinNombre ? "Número sin nombre" : l.nombre}
              </h2>
              {l.oficina && (
                <span className="inline-flex items-center gap-1 rounded-full bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-2 py-0.5 text-[11px] font-semibold text-duo-azul">
                  <HiOfficeBuilding className="h-3 w-3" /> {l.oficina}
                </span>
              )}
              {l.id > 0 && (
                <button
                  type="button"
                  onClick={() => setEditando((v) => !v)}
                  aria-label="Cambiar nombre u oficina"
                  title="Cambiar nombre u oficina"
                  className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium ${
                    sinNombre ? "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-[var(--color-duo-amarillo-sombra)] dark:text-duo-amarillo"
                      : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"}`}
                >
                  <HiPencil className="h-3.5 w-3.5" /> {sinNombre ? "¿De qué oficina es?" : ""}
                </button>
              )}
            </div>
            <p className="text-[13px] font-medium text-suave dark:text-suave-dark">{telefonoLindo(l.telefono)}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${r.cls}`}>{r.label}</span>
      </header>

      {editando && <EditarLinea l={l} onCerrar={() => setEditando(false)} onGuardado={onCambio} />}

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
              <Esperando key={c.cliente_tel} c={c} umbral={umbral} onResponder={(x) => onResponder(l.id, x.cliente_tel)} />
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
  // 💬 «Panel» (números) o «Chats» (leer y responder). «Responder» en el panel abre ese chat.
  const [vista, setVista] = useState("panel");
  const [chatInicial, setChatInicial] = useState(null);
  const responder = (linea, tel) => {
    setChatInicial({ linea, tel });
    setVista("chats");
  };
  // 🗂️ Oficinas elegidas en las solapas ([] = todas).
  const [solapas, setSolapas] = useState(leerSolapas);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_SOLAPAS, JSON.stringify(solapas));
    } catch {
      /* sin localStorage: igual funciona, solo no se acuerda */
    }
  }, [solapas]);

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
    // Respaldo cada minuto: los "espera X min" cambian solos con el reloj.
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, 60000);
    return () => window.clearInterval(id);
  }, [cargar]);

  // 📡 En vivo: con esta pantalla abierta el cartero pregunta cada 3 s (15 s
  //    minimizada) y, si se movió algo de WhatsApp, el panel se recarga solo
  //    (como mucho 1 vez cada 5 s; los chats se recargan por su cuenta).
  useAcelerarVivo(3000, 15000);
  //    También en «Chats», así los numeritos de las solapas están al día.
  useDatosVivos(["whatsapp"], cargar, { siempre: true, cadaMs: 5000 });

  // Líneas para las solapas (sin la fila «Sin línea»), en orden alfabético fijo.
  const lineasSolapas = useMemo(
    () => (datos?.lineas || []).filter((l) => l.id > 0).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [datos],
  );
  // Si una línea elegida ya no existe, no cuenta (si no queda ninguna → «Todas»).
  const visibles = useMemo(
    () => (lineasSolapas.length ? solapas.filter((id) => lineasSolapas.some((l) => l.id === id)) : solapas),
    [solapas, lineasSolapas],
  );
  const tocarSolapa = (id) => setSolapas(() => {
    if (visibles.length === 0) return [id];                         // desde «Todas»: solo esa
    if (visibles.includes(id)) return visibles.filter((x) => x !== id); // ocultarla (si era la última → Todas)
    return [...visibles, id];                                       // sumarla
  });
  const lineasPanel = useMemo(
    () => (visibles.length ? (datos?.lineas || []).filter((l) => visibles.includes(l.id)) : datos?.lineas || []),
    [datos, visibles],
  );

  const totales = useMemo(() => {
    const lineas = lineasPanel;
    const respondidas = lineas.reduce((a, l) => a + (l.respondidas || 0), 0);
    const ponderado = lineas.reduce((a, l) => a + (l.promedio_respuesta_min || 0) * (l.respondidas || 0), 0);
    return {
      entrantes: lineas.reduce((a, l) => a + l.entrantes, 0),
      respondidas,
      promedio: respondidas ? Math.round(ponderado / respondidas) : null,
      esperando: lineas.reduce((a, l) => a + (l.sin_responder || []).length, 0),
      atrasados: lineas.reduce((a, l) => a + (l.atrasados || 0), 0),
    };
  }, [lineasPanel]);

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
            <BotonSonido />
            <div role="tablist" aria-label="Vista" className="inline-flex rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-0.5">
              {[["panel", "Panel", HiChartBar], ["chats", "Chats", HiChatAlt2]].map(([id, label, I]) => (
                <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => { setVista(id); if (id === "chats") setChatInicial(null); }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors ${
                    vista === id ? "bg-[#25D366] text-white" : "text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"}`}>
                  <I className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            {vista === "panel" && (<>
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
            </>)}
          </div>
        </div>

        {/* 🗂️ Solapas: qué oficinas ver (vale para el panel y para los chats) */}
        <Solapas lineas={lineasSolapas} visibles={visibles} onTocar={tocarSolapa} onTodas={() => setSolapas([])} />

        {vista === "chats" ? (
          <ChatsWhatsApp
            key={chatInicial ? `${chatInicial.linea}-${chatInicial.tel}` : "lista"}
            inicial={chatInicial}
            soloLineas={visibles.length ? visibles : null}
          />
        ) : (<>
        {/* Estado de la conexión con YCloud */}
        {config && (
          !config.ultimo_evento ? (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-duo-amarillo/40 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-4 py-3 text-[13px] text-titulo dark:text-titulo-dark">
              <HiExclamation className="mt-0.5 h-4 w-4 shrink-0 text-duo-amarillo" />
              <span>Todavía no llegó ningún mensaje. Mandá un WhatsApp de prueba a una línea conectada y tocá actualizar.</span>
            </div>
          ) : (
            <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-suave dark:text-suave-dark">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-duo-verde" /> Conectado · último mensaje {haceCuanto(config.ultimo_evento)}
              </span>
              {!config.webhook_secret && (
                <span className="text-duo-rojo">⚠️ Falta la firma de seguridad de YCloud (YCLOUD_WEBHOOK_SECRET en Railway)</span>
              )}
              {config.meta_token === false && (
                <span className="text-duo-rojo">⚠️ Falta META_WA_TOKEN en Railway (no se puede responder por Meta)</span>
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
              {lineasPanel.length === 0 ? (
                <p className="rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-6 text-center text-[13px] text-suave dark:text-suave-dark">
                  {datos.lineas.length ? "No hay oficinas elegidas: tocá «Todas»." : "No hay líneas conectadas todavía."}
                </p>
              ) : (
                lineasPanel.map((l) => <Linea key={l.id} l={l} umbral={umbral} onResponder={responder} onCambio={cargar} />)
              )}
            </div>

            <p className="mt-6 flex items-start gap-1.5 text-[12px] text-suave dark:text-suave-dark">
              <HiExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Cómo se mide: desde el primer mensaje del cliente hasta la primera respuesta (del celu, WhatsApp Web o THAMES).
              Si el cliente manda 3 mensajes seguidos, cuenta desde el primero.
            </p>
          </>
        )}
        </>)}
      </div>
    </div>
  );
}
