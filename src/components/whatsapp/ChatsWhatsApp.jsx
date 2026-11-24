// src/components/whatsapp/ChatsWhatsApp.jsx
//
// 💬 CHATS DE WHATSAPP DENTRO DE THAMES (solo admin) — Franco 24/11/2026
//
// A la izquierda los chats (los que esperan respuesta, arriba y en rojo);
// a la derecha la charla con burbujas, audios que se escuchan acá mismo,
// y abajo para escribir o grabar una nota de voz 🎙️.
//
// Regla de WhatsApp: se puede escribir libre hasta 24 h después del último
// mensaje del cliente. Pasado eso, se avisa y se ofrece abrir el chat en el celu.
//
// 📡 EN VIVO: no hace falta F5. Cuando entra un mensaje (o lo contestan desde el
// celu, o pasa a "leído"), el cartero avisa "whatsapp" y la lista y la charla
// abierta se recargan solas (la pantalla de WhatsApp le pide al cartero que
// pregunte cada 3 s). Respaldo: cada 60 s igual (para los "espera X min").
//
//   <ChatsWhatsApp inicial={{ linea: 1, tel: "5491122334455" }} />
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import {
  HiArrowLeft, HiCheck, HiDocumentText, HiExclamation, HiMicrophone, HiPaperAirplane,
  HiPhotograph, HiPlay, HiSearch, HiStop, HiTrash, HiUser,
} from "react-icons/hi";

import { enviarAudio, enviarTexto, pedirConversaciones, pedirHilo, urlMedia } from "../../services/whatsapp";
import useDatosVivos from "../../hooks/useDatosVivos";
import { disponible as vivoDisponible } from "../../services/vivo";

// Respaldo por si el cartero no anda: cada 60 s con el cartero, cada 8 s sin él.
function useRespaldo(fn, activo = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!activo) return undefined;
    let ultima = Date.now();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const cada = vivoDisponible() ? 60000 : 8000;
      if (Date.now() - ultima < cada) return;
      ultima = Date.now();
      fnRef.current();
    }, 4000);
    return () => window.clearInterval(id);
  }, [activo]);
}

// ── helpers ─────────────────────────────────────────────
function telefonoLindo(t = "") {
  const d = String(t).replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) {
    const r = d.slice(3);
    return r.startsWith("11") ? `+54 9 11 ${r.slice(2, 6)}-${r.slice(6)}` : `+54 9 ${r.slice(0, 3)} ${r.slice(3, 6)}-${r.slice(6)}`;
  }
  return d ? `+${d}` : "";
}
const hora = (iso) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
function cuando(iso) {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return hora(iso);
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return "ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
function diaLindo(iso) {
  const c = cuando(iso);
  if (c === "ayer") return "Ayer";
  if (c.includes(":")) return "Hoy";
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}
function duracion(min) {
  if (min === null || min === undefined) return "";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h`;
  return `${Math.floor(min / 1440)} d`;
}
const letra = (nombre, tel) => ((nombre || "").trim()[0] || String(tel).slice(-2, -1) || "?").toUpperCase();

// ── Audio / foto / documento de un mensaje ─────────────
function Adjunto({ m }) {
  const [url, setUrl] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const tipo = m.tipo;

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      setUrl(await urlMedia(m.id));
    } catch {
      setError("No se pudo abrir (puede haber vencido).");
    } finally {
      setCargando(false);
    }
  };

  if (tipo === "audio") {
    return url ? (
      <audio controls autoPlay src={url} className="h-10 w-60 max-w-full" />
    ) : (
      <button type="button" onClick={cargar} disabled={cargando}
        className="inline-flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5 text-[13px] font-medium">
        <HiPlay className="h-4 w-4" /> {cargando ? "Cargando…" : "Escuchar audio"}
        {error && <span className="text-duo-rojo"> · {error}</span>}
      </button>
    );
  }
  if (tipo === "image" || tipo === "sticker") {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Foto del chat" className="max-h-64 rounded-lg" /></a>
    ) : (
      <button type="button" onClick={cargar} disabled={cargando}
        className="inline-flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5 text-[13px] font-medium">
        <HiPhotograph className="h-4 w-4" /> {cargando ? "Cargando…" : "Ver foto"}
      </button>
    );
  }
  return (
    <button type="button" onClick={async () => { await cargar(); }} disabled={cargando}
      className="inline-flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5 text-[13px] font-medium">
      <HiDocumentText className="h-4 w-4" /> {url ? <a href={url} target="_blank" rel="noreferrer">Abrir archivo</a> : cargando ? "Cargando…" : "Ver archivo"}
    </button>
  );
}

function Tildes({ m }) {
  if (m.direccion !== "SALIENTE") return null;
  if (m.estado === "failed") return <HiExclamation title={m.error || "No se pudo entregar"} className="h-3.5 w-3.5 text-duo-rojo" />;
  if (m.estado === "read") return <span title="Leído" className="flex text-duo-azul"><HiCheck className="h-3.5 w-3.5" /><HiCheck className="-ml-2 h-3.5 w-3.5" /></span>;
  if (m.estado === "delivered") return <span title="Entregado" className="flex"><HiCheck className="h-3.5 w-3.5" /><HiCheck className="-ml-2 h-3.5 w-3.5" /></span>;
  return <HiCheck title="Enviado" className="h-3.5 w-3.5" />;
}

function Burbuja({ m }) {
  const mio = m.direccion === "SALIENTE";
  const quien = !mio ? "" : m.origen === "APP" ? "celu" : m.enviado_por ? `THAMES · ${m.enviado_por}` : "THAMES";
  const conMedia = m.tiene_media && ["audio", "image", "sticker", "video", "document"].includes(m.tipo);
  const textoVisible = conMedia && /^\[(Audio|Imagen|Sticker|Video|Documento)\]/.test(m.texto) ? m.texto.replace(/^\[[^\]]+\]\s*/, "") : m.texto;
  return (
    <div className={`flex ${mio ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14px] shadow-sm sm:max-w-[70%] ${
        mio
          ? "rounded-br-md bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef]"
          : "rounded-bl-md bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border border-linea dark:border-linea-dark"
      } ${m.estado === "failed" ? "ring-1 ring-duo-rojo" : ""}`}>
        {conMedia && <div className="mb-1"><Adjunto m={m} /></div>}
        {textoVisible && <p className="whitespace-pre-wrap break-words">{textoVisible}</p>}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] opacity-70">
          {quien && <span>{quien} ·</span>}
          <span>{hora(m.enviado_en)}</span>
          <Tildes m={m} />
        </div>
        {m.estado === "failed" && m.error && <p className="mt-1 text-[11px] font-medium text-duo-rojo">No llegó: {m.error}</p>}
      </div>
    </div>
  );
}

// ── Grabadora de notas de voz ───────────────────────────
function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const rec = useRef(null);
  const trozos = useRef([]);
  const reloj = useRef(null);
  const stream = useRef(null);

  const limpiar = () => {
    window.clearInterval(reloj.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setGrabando(false);
    setSegundos(0);
  };

  const empezar = async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    stream.current = s;
    const tipo = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
    const r = new MediaRecorder(s, tipo ? { mimeType: tipo } : undefined);
    trozos.current = [];
    r.ondataavailable = (e) => e.data.size && trozos.current.push(e.data);
    r.start(250);
    rec.current = r;
    setGrabando(true);
    setSegundos(0);
    reloj.current = window.setInterval(() => setSegundos((n) => n + 1), 1000);
  };

  const terminar = () =>
    new Promise((resolve) => {
      const r = rec.current;
      if (!r) return resolve(null);
      r.onstop = () => {
        const blob = new Blob(trozos.current, { type: r.mimeType || "audio/webm" });
        limpiar();
        resolve(blob);
      };
      r.stop();
    });

  const cancelar = () => {
    if (rec.current && rec.current.state !== "inactive") {
      rec.current.onstop = null;
      rec.current.stop();
    }
    limpiar();
  };

  useEffect(() => () => cancelar(), []); // eslint-disable-line react-hooks/exhaustive-deps
  return { grabando, segundos, empezar, terminar, cancelar };
}

// ── Pantalla ────────────────────────────────────────────
export default function ChatsWhatsApp({ inicial = null }) {
  const [lista, setLista] = useState({ lineas: [], conversaciones: [] });
  const [filtroLinea, setFiltroLinea] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(inicial); // { linea, tel }
  const [hilo, setHilo] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const fondo = useRef(null);
  const grab = useGrabadora();
  // La charla que está abierta AHORA (si la respuesta de una recarga llega tarde
  // y mientras tanto abriste otro chat, no la mostramos).
  const abiertoRef = useRef(abierto);
  abiertoRef.current = abierto;

  const cargarLista = useCallback(async () => {
    try {
      setLista(await pedirConversaciones(filtroLinea || undefined));
    } catch {
      /* se reintenta solo */
    }
  }, [filtroLinea]);

  const cargarHilo = useCallback(async () => {
    if (!abierto) return;
    try {
      const h = await pedirHilo(abierto.linea, abierto.tel);
      if (abiertoRef.current === abierto) setHilo(h);
    } catch {
      /* se reintenta solo */
    }
  }, [abierto]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    setHilo(null);
    setAviso("");
    cargarHilo();
  }, [cargarHilo]);

  // 📡 Entró / salió / cambió de estado un mensaje → recargamos en silencio.
  useDatosVivos(["whatsapp"], () => Promise.all([cargarLista(), cargarHilo()]), { siempre: true });
  useRespaldo(cargarLista);
  useRespaldo(cargarHilo, !!abierto);

  const cantidad = hilo?.mensajes?.length || 0;
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "end" });
  }, [cantidad, abierto]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista.conversaciones;
    return lista.conversaciones.filter((c) => (c.cliente_nombre || "").toLowerCase().includes(q) || c.cliente_tel.includes(q.replace(/\D/g, "") || "§"));
  }, [lista, busqueda]);

  const agregar = (m) => setHilo((h) => (h ? { ...h, mensajes: [...h.mensajes, m] } : h));
  const errorDe = (e) => e?.response?.data?.detail || "No se pudo mandar. Probá de nuevo.";

  const mandarTexto = async () => {
    const t = texto.trim();
    if (!t || enviando || !abierto) return;
    setEnviando(true);
    setAviso("");
    try {
      agregar(await enviarTexto(abierto.linea, abierto.tel, t));
      setTexto("");
      cargarLista();
    } catch (e) {
      setAviso(errorDe(e));
    } finally {
      setEnviando(false);
    }
  };

  const microfono = async () => {
    setAviso("");
    if (!grab.grabando) {
      try {
        await grab.empezar();
      } catch {
        setAviso("No se pudo usar el micrófono. Fijate que el navegador tenga permiso.");
      }
      return;
    }
    const blob = await grab.terminar();
    if (!blob || blob.size < 1500) {
      setAviso("El audio quedó vacío. Mantené el micrófono un poco más.");
      return;
    }
    setEnviando(true);
    try {
      agregar(await enviarAudio(abierto.linea, abierto.tel, blob));
      cargarLista();
    } catch (e) {
      setAviso(errorDe(e));
    } finally {
      setEnviando(false);
    }
  };

  const ventanaAbierta = hilo?.ventana?.abierta;
  const nombre = hilo?.cliente_nombre || (abierto && telefonoLindo(abierto.tel));

  // Separadores por día
  const conDias = [];
  let diaAnterior = "";
  (hilo?.mensajes || []).forEach((m) => {
    const d = new Date(m.enviado_en).toDateString();
    if (d !== diaAnterior) {
      conDias.push({ separador: diaLindo(m.enviado_en), key: `d-${d}` });
      diaAnterior = d;
    }
    conDias.push(m);
  });

  return (
    <div className="flex h-[calc(100dvh-var(--alto-header,4rem)-16rem)] min-h-[420px] overflow-hidden lg:h-[calc(100dvh-var(--alto-header,4rem)-11rem)] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      {/* Lista de chats */}
      <aside className={`${abierto ? "hidden lg:flex" : "flex"} w-full flex-col border-r border-linea dark:border-linea-dark lg:w-[340px]`}>
        <div className="flex flex-col gap-2 border-b border-linea dark:border-linea-dark p-3">
          <label className="flex items-center gap-2 rounded-lg bg-surface dark:bg-surface-dark px-3">
            <HiSearch className="h-4 w-4 text-suave dark:text-suave-dark" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar nombre o teléfono"
              className="h-9 w-full bg-transparent text-[14px] outline-none placeholder:text-suave" />
          </label>
          {lista.lineas.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {[{ id: "", nombre: "Todas" }, ...lista.lineas].map((l) => (
                <button key={l.id || "todas"} type="button" onClick={() => setFiltroLinea(String(l.id))}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${String(filtroLinea) === String(l.id)
                    ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul" : "text-suave dark:text-suave-dark hover:bg-surface dark:hover:bg-surface-dark"}`}>
                  {l.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && (
            <li className="p-6 text-center text-[13px] text-suave dark:text-suave-dark">Todavía no hay chats. Cuando un cliente escriba, aparece acá.</li>
          )}
          {filtradas.map((c) => {
            const activo = abierto && abierto.linea === c.linea && abierto.tel === c.cliente_tel;
            return (
              <li key={`${c.linea}-${c.cliente_tel}`}>
                <button type="button" onClick={() => setAbierto({ linea: c.linea, tel: c.cliente_tel })}
                  className={`flex w-full items-center gap-3 border-b border-linea/60 dark:border-linea-dark/60 px-3 py-3 text-left transition-colors ${
                    activo ? "bg-duo-azul-soft/60 dark:bg-[var(--color-duo-azul-soft-dark)]" : "hover:bg-surface dark:hover:bg-surface-dark"}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ${
                    c.esperando ? "bg-duo-rojo text-white" : "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark"}`}>
                    {letra(c.cliente_nombre, c.cliente_tel)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold text-titulo dark:text-titulo-dark">{c.cliente_nombre || telefonoLindo(c.cliente_tel)}</span>
                      <span className={`shrink-0 text-[11px] ${c.esperando ? "font-semibold text-duo-rojo" : "text-suave dark:text-suave-dark"}`}>{cuando(c.ultimo_en)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] text-suave dark:text-suave-dark">
                        {c.ultimo_direccion === "SALIENTE" && "Vos: "}{c.ultimo_texto || "…"}
                      </span>
                      {c.esperando && (
                        <span className="shrink-0 rounded-full bg-duo-rojo px-1.5 py-0.5 text-[10px] font-bold text-white">espera {duracion(c.esperando_min)}</span>
                      )}
                    </span>
                    {lista.lineas.length > 1 && <span className="text-[11px] text-suave dark:text-suave-dark">{c.linea_nombre}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Charla */}
      <section className={`${abierto ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col`}>
        {!abierto ? (
          <div className="m-auto flex flex-col items-center gap-2 p-6 text-center text-suave dark:text-suave-dark">
            <FaWhatsapp className="h-10 w-10 text-[#25D366]" />
            <p className="text-[14px]">Elegí un chat de la izquierda para leerlo y responder.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-linea dark:border-linea-dark px-3 py-2.5">
              <button type="button" onClick={() => setAbierto(null)} aria-label="Volver a los chats"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-suave hover:bg-surface dark:hover:bg-surface-dark lg:hidden">
                <HiArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface dark:bg-surface-dark text-[14px] font-semibold">
                {letra(nombre, abierto.tel)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-titulo dark:text-titulo-dark">{nombre}</p>
                <p className="truncate text-[12px] text-suave dark:text-suave-dark">
                  {telefonoLindo(abierto.tel)}{hilo?.linea ? ` · línea ${hilo.linea.nombre}` : ""}
                </p>
              </div>
              {hilo?.cliente_id && (
                <Link to={`/clientes/${hilo.cliente_id}`} className="hidden h-8 items-center gap-1 rounded-lg border border-linea dark:border-linea-dark px-2.5 text-[12px] font-medium sm:inline-flex">
                  <HiUser className="h-3.5 w-3.5" /> Ficha
                </Link>
              )}
            </header>

            <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-4 dark:bg-[#0b141a]">
              {!hilo ? (
                <p className="text-center text-[13px] text-suave">Cargando…</p>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                  {conDias.map((x) =>
                    x.separador ? (
                      <div key={x.key} className="my-2 self-center rounded-md bg-white/80 dark:bg-white/10 px-2.5 py-1 text-[11px] font-medium capitalize text-[#54656f] dark:text-[#8696a0]">
                        {x.separador}
                      </div>
                    ) : (
                      <Burbuja key={x.id} m={x} />
                    )
                  )}
                  <div ref={fondo} />
                </div>
              )}
            </div>

            <footer className="border-t border-linea dark:border-linea-dark p-2.5">
              {aviso && <p className="mb-2 rounded-lg bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[12px] font-medium text-duo-rojo">{aviso}</p>}
              {hilo && !ventanaAbierta ? (
                <div className="flex flex-col gap-2 rounded-lg bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-3 text-[13px] text-titulo dark:text-titulo-dark sm:flex-row sm:items-center">
                  <HiExclamation className="h-5 w-5 shrink-0 text-duo-amarillo" />
                  <span className="flex-1">Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp no deja escribirle libre desde THAMES. Escribile desde el celu.</span>
                  <a href={`https://wa.me/${abierto.tel}`} target="_blank" rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-[13px] font-semibold text-white">
                    <FaWhatsapp className="h-4 w-4" /> Abrir en WhatsApp
                  </a>
                </div>
              ) : grab.grabando ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={grab.cancelar} aria-label="Cancelar audio"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-suave hover:bg-surface dark:hover:bg-surface-dark">
                    <HiTrash className="h-5 w-5" />
                  </button>
                  <div className="flex flex-1 items-center gap-2 rounded-full bg-surface dark:bg-surface-dark px-4 py-2.5 text-[14px]">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-duo-rojo" />
                    Grabando… {Math.floor(grab.segundos / 60)}:{String(grab.segundos % 60).padStart(2, "0")}
                  </div>
                  <button type="button" onClick={microfono} aria-label="Terminar y mandar el audio"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white">
                    <HiStop className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        mandarTexto();
                      }
                    }}
                    rows={1}
                    placeholder={hilo ? "Escribí un mensaje (Enter para mandar)" : "Cargando…"}
                    disabled={!hilo || enviando}
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-4 py-2.5 text-[14px] outline-none focus:border-duo-azul/50"
                  />
                  {texto.trim() ? (
                    <button type="button" onClick={mandarTexto} disabled={enviando} aria-label="Mandar mensaje"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white disabled:opacity-60">
                      <HiPaperAirplane className="h-5 w-5 rotate-90" />
                    </button>
                  ) : (
                    <button type="button" onClick={microfono} disabled={!hilo || enviando} aria-label="Grabar nota de voz" title="Grabar nota de voz"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white disabled:opacity-60">
                      {enviando ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <HiMicrophone className="h-5 w-5" />}
                    </button>
                  )}
                </div>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
