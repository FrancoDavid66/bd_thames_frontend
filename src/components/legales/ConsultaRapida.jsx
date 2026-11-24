// src/components/legales/ConsultaRapida.jsx
//
// ⚡ CONSULTA RÁPIDA — ASISTENTE TIPO CHAT (Franco 23/11/2026) — /legales/consulta
//   El cliente pregunta algo legal en la oficina (ART, escribanía, firmar algo,
//   familia, penal…). Los chicos NO saben nada de derecho, así que no eligen
//   "categorías": THAMES les pregunta como en un chat de WhatsApp, DE A UNA COSA
//   y en palabras de todos los días, y ellos tocan lo que dice el cliente.
//
//     THAMES: ¿Cuál es el DNI del cliente?            → 28765432
//     THAMES: No está en THAMES. ¿Cómo se llama?        → Lucía Fernández
//     THAMES: ¿Qué le pasó o qué necesita?             → «Tiene que firmar un papel…»
//     THAMES: ¿Qué necesita?                           → Un poder
//     THAMES: ¿Es urgente?  · ¿Cuándo lo llamamos?  · ¿Algo más?
//     THAMES: Así queda: … [Guardar]  →  «¡Listo! Ya le aparece a Franco en Para llamar».
//
//   Siempre hay «No sabe» y «↩ Cambiar la última respuesta». Las preguntas y los
//   botones salen del catálogo del servidor (legales/catalogo.py: CONSULTA_RAPIDA,
//   MOTIVOS[].preguntas, HORARIOS_LLAMADO). Al guardar queda en «Para llamar».
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiBriefcase,
  HiCheck,
  HiHome,
  HiPencilAlt,
  HiPlusCircle,
  HiQuestionMarkCircle,
  HiReply,
  HiShieldExclamation,
  HiTruck,
  HiUserGroup,
} from "react-icons/hi";

import { useLegales } from "./legalesContext";
import { buscarClientes, crearCaso, mensajeError } from "../../services/legales";
import MarcoPasos from "./MarcoPasos";
import { diaLargo, hoyYmd, motivoDe, preguntasDe, primerNombre, respuestaTxt } from "./legalesUtils";

const ICONOS = {
  auto: HiTruck,
  salud: HiPlusCircle,
  trabajo: HiBriefcase,
  familia: HiUserGroup,
  escudo: HiShieldExclamation,
  casa: HiHome,
  firma: HiPencilAlt,
  pregunta: HiQuestionMarkCircle,
};
const TIPOS_RAPIDOS_DEFECTO = ["opciones", "si_no", "si_no_ns", "cuando"];
const HORARIOS_DEFECTO = [
  { id: "MANIANA", nombre: "A la mañana" },
  { id: "TARDE", nombre: "A la tarde" },
  { id: "CUALQUIERA", nombre: "Cuando sea" },
];
// Lo que depende del DNI (si se vuelve a buscar, se borra) y del motivo.
const DE_PERSONA = ["elegir", "es_el", "tel_ok", "tel", "nombre", "oficina"];
const NO_SABE = "__NS__";

const inputCls =
  "w-full min-w-0 h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600 [color-scheme:light] dark:[color-scheme:dark]";

function ayerYmd() {
  const x = new Date();
  x.setDate(x.getDate() - 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
const soloDigitos = (s) => String(s || "").replace(/\D/g, "");

/* ───────────── burbujas ───────────── */
function Bot({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2 max-w-[92%]"
    >
      <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-[13px] font-black text-white" aria-hidden="true">
        T
      </span>
      <div className="rounded-2xl rounded-bl-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-2.5 text-[15px] leading-snug text-titulo dark:text-titulo-dark">
        {children}
      </div>
    </motion.div>
  );
}

function Yo({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-sky-700 px-3.5 py-2.5 text-[15px] font-semibold leading-snug text-white"
    >
      {children}
    </motion.div>
  );
}

function Escribiendo() {
  return (
    <div className="flex items-end gap-2" aria-label="THAMES está escribiendo">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-[13px] font-black text-white">T</span>
      <div className="flex gap-1 rounded-2xl rounded-bl-md border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-suave dark:bg-suave-dark"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Botón de respuesta (grande, para el dedo). */
function Boton({ onClick, children, tono = "normal", className = "" }) {
  const tonos = {
    normal:
      "border-sky-700/40 bg-card dark:bg-card-dark text-sky-800 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10",
    lleno: "border-sky-700 bg-sky-700 text-white hover:bg-sky-800",
    verde: "border-green-700 bg-green-700 text-white hover:bg-green-800",
    rojo: "border-duo-rojo bg-duo-rojo text-white hover:opacity-90",
    suave: "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[48px] rounded-xl border-2 px-3 text-[15px] font-bold transition-colors disabled:opacity-50 ${tonos[tono] || tonos.normal} ${className}`}
    >
      {children}
    </button>
  );
}

/* ───────────── el chat ───────────── */
export default function ConsultaRapida() {
  const { user, esAdmin, catalogo } = useLegales();
  const navigate = useNavigate();
  const [r, setR] = useState({}); // respuestas por paso: { dni: {...}, motivo: "FIRMAS", q_que_necesita: "PODER", … }
  const [pensando, setPensando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [creado, setCreado] = useState(null);
  // borradores de los campos de texto del paso actual
  const [dniTxt, setDniTxt] = useState("");
  const [nombreTxt, setNombreTxt] = useState({ nombre: "", apellido: "" });
  const [telTxt, setTelTxt] = useState("");
  const [notaTxt, setNotaTxt] = useState("");
  const [otroDia, setOtroDia] = useState("");
  const [verOtroDia, setVerOtroDia] = useState(false);
  const fin = useRef(null);
  const actualRef = useRef(null);

  const botones = catalogo?.consulta_rapida || [];
  const tiposRapidos = catalogo?.tipos_rapidos || TIPOS_RAPIDOS_DEFECTO;
  const horarios = catalogo?.horarios_llamado || HORARIOS_DEFECTO;
  const yo = primerNombre(user?.first_name || user?.username || "");

  /* ¿Quién es? */
  const busqueda = r.dni?.resultado || null;
  const encontrados = busqueda?.clientes || [];
  const cliente =
    encontrados.length === 1 ? (r.es_el === "SI" ? encontrados[0] : null) : r.elegir && r.elegir !== NO_SABE ? r.elegir : null;
  const telCliente = cliente?.telefono || "";

  /* ¿Qué le pasó? */
  const motivo = motivoDe(catalogo, r.motivo);
  const boton = botones.find((b) => b.motivo === r.motivo) || null;
  const respuestasMotivo = useMemo(() => {
    const salida = {};
    Object.entries(r).forEach(([k, v]) => {
      if (k.startsWith("q_") && v && v !== NO_SABE) salida[k.slice(2)] = v;
    });
    return salida;
  }, [r]);
  const preguntas = useMemo(
    () => preguntasDe(motivo, respuestasMotivo).filter((p) => tiposRapidos.includes(p.tipo)),
    [motivo, respuestasMotivo, tiposRapidos]
  );

  /* La lista de pasos sale de lo que ya contestó (como un árbol). */
  const pasos = useMemo(() => {
    const s = ["dni"];
    if ("dni" in r) {
      if (encontrados.length > 1) s.push("elegir");
      else if (encontrados.length === 1) s.push("es_el");
    }
    const quienListo = encontrados.length > 1 ? "elegir" in r : encontrados.length === 1 ? "es_el" in r : "dni" in r;
    if (quienListo) {
      if (cliente) {
        if (telCliente) s.push("tel_ok");
        if (!telCliente || r.tel_ok === "NO") s.push("tel");
      } else {
        s.push("nombre", "tel");
      }
      if (esAdmin && !cliente?.oficina) s.push("oficina");
      s.push("motivo");
      if (r.motivo) preguntas.forEach((p) => s.push(`q_${p.key}`));
      s.push("urgente", "horario", "nota", "confirmar");
    }
    return s;
  }, [r, encontrados.length, cliente, telCliente, esAdmin, preguntas]);
  const actual = pasos.find((p) => !(p in r)) || "confirmar";
  const indice = pasos.indexOf(actual);
  const progreso = creado ? 100 : Math.round((indice / Math.max(pasos.length - 1, 1)) * 100);

  const responder = (paso, valor) => {
    setError("");
    setR((prev) => {
      const n = { ...prev, [paso]: valor };
      if (paso === "dni") DE_PERSONA.forEach((k) => delete n[k]);
      if (paso === "motivo") Object.keys(n).forEach((k) => k.startsWith("q_") && delete n[k]);
      return n;
    });
    setVerOtroDia(false);
    setOtroDia("");
    setPensando(true);
  };
  useEffect(() => {
    if (!pensando) return undefined;
    const t = setTimeout(() => setPensando(false), 420);
    return () => clearTimeout(t);
  }, [pensando]);
  // Siempre se ve la última pregunta con sus botones (como en WhatsApp).
  //    Si la pregunta tiene muchos botones (ej. «¿Qué le pasó?»), se ve desde la pregunta.
  const alFinal = () => {
    const bloque = actualRef.current;
    if (bloque && bloque.offsetHeight > window.innerHeight * 0.6) bloque.scrollIntoView({ block: "start", behavior: "smooth" });
    else fin.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  };
  useEffect(() => {
    alFinal();
  }, [actual, pensando, creado, buscando, error]);

  const deshacer = () => {
    if (indice <= 0) return navigate("/legales");
    const anterior = pasos[indice - 1];
    setError("");
    setR((prev) => {
      const n = { ...prev };
      delete n[anterior];
      return n;
    });
    return undefined;
  };

  const buscar = async (sinDni = false) => {
    const q = soloDigitos(dniTxt);
    if (!sinDni && q.length < 6) {
      setError("Escribí el DNI completo (sin puntos), o tocá «No sabe el DNI».");
      return;
    }
    if (sinDni) {
      responder("dni", { texto: "", resultado: { clientes: [], casos: [] } });
      return;
    }
    setBuscando(true);
    setError("");
    try {
      const res = await buscarClientes(q);
      responder("dni", { texto: q, resultado: { clientes: res?.clientes || [], casos: res?.casos || [] } });
    } catch (e) {
      setError(mensajeError(e, "No se pudo buscar. Probá de nuevo."));
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async () => {
    const resp = {};
    preguntas.forEach((p) => {
      const v = r[`q_${p.key}`];
      if (v && v !== NO_SABE) resp[p.key] = v;
    });
    const telefono = r.tel ? String(r.tel).trim() : "";
    const body = cliente
      ? { cliente: cliente.cliente, persona_telefono: telefono }
      : {
          cliente: null,
          persona_nombre: r.nombre?.nombre?.trim() || "",
          persona_apellido: r.nombre?.apellido?.trim() || "",
          persona_dni: r.dni?.texto || "",
          persona_telefono: telefono,
        };
    Object.assign(body, {
      motivo: r.motivo,
      respuestas: resp,
      relato: String(r.nota || "").trim(),
      rapida: { horario: r.horario || "", urgente: r.urgente === "SI" },
    });
    if (esAdmin) body.oficina = r.oficina || cliente?.oficina || null;
    setGuardando(true);
    setError("");
    try {
      setCreado(await crearCaso(body));
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar. Probá de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  const reiniciar = () => {
    setR({});
    setCreado(null);
    setDniTxt("");
    setNombreTxt({ nombre: "", apellido: "" });
    setTelTxt("");
    setNotaTxt("");
    setError("");
  };

  /* ── Texto de cada pregunta del chat (lo que dice THAMES) ── */
  const preguntaDe = (paso) => {
    if (paso === "dni") return <>Primero, pedile el <b>DNI</b> al cliente y escribilo acá (sin puntos).</>;
    if (paso === "elegir") return <>Encontré varias personas con ese dato. ¿Cuál es?</>;
    if (paso === "es_el") {
      const c = encontrados[0];
      return (
        <>
          Encontré a <b>{c.nombre_completo}</b>
          {c.polizas?.length ? <> (cliente de THAMES · {c.polizas[0]})</> : null}. ¿Es él o ella?
        </>
      );
    }
    if (paso === "nombre")
      return r.dni?.texto ? (
        <>No está en THAMES. No pasa nada, lo cargamos igual. <b>¿Cómo se llama?</b></>
      ) : (
        <><b>¿Cómo se llama?</b></>
      );
    if (paso === "tel_ok") return <>¿Su WhatsApp sigue siendo <b>{telCliente}</b>?</>;
    if (paso === "tel") return <><b>¿A qué WhatsApp lo llamamos?</b></>;
    if (paso === "oficina") return <>¿De qué oficina es el cliente?</>;
    if (paso === "motivo")
      return (
        <>
          Ahora preguntale: <b>«¿Qué le pasó o qué necesita?»</b> y tocá lo que más se parezca. No hace falta saber de leyes 😉
        </>
      );
    if (paso.startsWith("q_")) {
      const p = preguntas.find((x) => `q_${x.key}` === paso);
      return p ? (
        <>
          <b>{p.texto}</b>
          {p.ayuda ? <span className="mt-1 block text-[13px] font-normal text-suave dark:text-suave-dark">{p.ayuda}</span> : null}
        </>
      ) : null;
    }
    if (paso === "urgente")
      return (
        <>
          <b>¿Es urgente?</b>
          <span className="mt-1 block text-[13px] text-suave dark:text-suave-dark">
            Por ejemplo: le llegó una carta o una citación, tiene una fecha cerca, o no puede esperar.
          </span>
        </>
      );
    if (paso === "horario") return <><b>¿Cuándo le queda mejor que lo llamemos?</b></>;
    if (paso === "nota") return <>¿Querés agregar algo con tus palabras? Si no, tocá «Nada más».</>;
    if (paso === "confirmar") return <>¡Listo! Así queda la consulta 👇</>;
    return null;
  };

  /* ── Lo que contestó (la burbuja de la derecha) ── */
  const respuestaDe = (paso) => {
    const v = r[paso];
    if (paso === "dni") return v?.texto ? `DNI ${v.texto}` : "No sabe el DNI";
    if (paso === "elegir") return v === NO_SABE ? "No es ninguno" : v?.nombre_completo;
    if (paso === "es_el") return v === "SI" ? "Sí, es" : "No, es otra persona";
    if (paso === "nombre") return `${v?.nombre || ""} ${v?.apellido || ""}`.trim();
    if (paso === "tel_ok") return v === "SI" ? "Sí" : "No, cambió";
    if (paso === "tel") return v;
    if (paso === "oficina") return (catalogo?.oficinas || []).find((o) => o.id === v)?.nombre || "—";
    if (paso === "motivo") return botones.find((b) => b.motivo === v)?.dice || v;
    if (paso.startsWith("q_")) {
      if (v === NO_SABE) return "No sabe";
      const p = preguntas.find((x) => `q_${x.key}` === paso) || (motivo?.preguntas || []).find((x) => `q_${x.key}` === paso);
      return p ? respuestaTxt(p, v) : v;
    }
    if (paso === "urgente") return { SI: "Sí, es urgente", NO: "No", NS: "No sabe" }[v] || v;
    if (paso === "horario") return horarios.find((h) => h.id === v)?.nombre || v;
    if (paso === "nota") return v ? v : "Nada más";
    return "";
  };

  /* ── Los botones / campos para contestar el paso actual ── */
  const controles = () => {
    if (actual === "dni")
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={dniTxt}
              onChange={(e) => setDniTxt(soloDigitos(e.target.value).slice(0, 11))}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="Ej: 33456789"
              aria-label="DNI del cliente"
              className={`${inputCls} text-[20px] font-bold tracking-wide`}
            />
            <Boton tono="lleno" onClick={() => buscar()} className="shrink-0 px-5">
              {buscando ? "…" : "Buscar"}
            </Boton>
          </div>
          <Boton tono="suave" onClick={() => buscar(true)}>
            No sabe el DNI
          </Boton>
        </div>
      );
    if (actual === "elegir")
      return (
        <div className="flex flex-col gap-2">
          {encontrados.map((c) => (
            <Boton key={c.cliente} onClick={() => responder("elegir", c)} className="text-left py-2">
              {c.nombre_completo}
              <span className="block text-[12px] font-normal text-suave dark:text-suave-dark">
                DNI {c.dni || "—"} · {c.oficina_nombre || "sin oficina"}
                {c.polizas?.length ? ` · ${c.polizas[0]}` : ""}
              </span>
            </Boton>
          ))}
          <Boton tono="suave" onClick={() => responder("elegir", NO_SABE)}>
            No es ninguno
          </Boton>
        </div>
      );
    if (actual === "es_el")
      return (
        <div className="grid grid-cols-2 gap-2">
          <Boton tono="lleno" onClick={() => responder("es_el", "SI")}>Sí, es</Boton>
          <Boton onClick={() => responder("es_el", "NO")}>No, es otra persona</Boton>
        </div>
      );
    if (actual === "nombre") {
      const ok = nombreTxt.nombre.trim().length > 0;
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={nombreTxt.nombre}
              onChange={(e) => setNombreTxt((x) => ({ ...x, nombre: e.target.value }))}
              autoFocus
              placeholder="Nombre"
              aria-label="Nombre"
              className={inputCls}
            />
            <input
              value={nombreTxt.apellido}
              onChange={(e) => setNombreTxt((x) => ({ ...x, apellido: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && ok && responder("nombre", { ...nombreTxt })}
              placeholder="Apellido"
              aria-label="Apellido"
              className={inputCls}
            />
          </div>
          <Boton tono="lleno" onClick={() => (ok ? responder("nombre", { ...nombreTxt }) : setError("Escribí al menos el nombre."))}>
            Seguir
          </Boton>
        </div>
      );
    }
    if (actual === "tel_ok")
      return (
        <div className="grid grid-cols-2 gap-2">
          <Boton tono="lleno" onClick={() => responder("tel_ok", "SI")}>Sí</Boton>
          <Boton onClick={() => responder("tel_ok", "NO")}>No, cambió</Boton>
        </div>
      );
    if (actual === "tel") {
      const ok = soloDigitos(telTxt).length >= 8;
      return (
        <div className="flex flex-col gap-2">
          <input
            value={telTxt}
            onChange={(e) => setTelTxt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ok && responder("tel", telTxt.trim())}
            type="tel"
            inputMode="tel"
            autoFocus
            placeholder="Ej: 11 2345-6789"
            aria-label="WhatsApp del cliente"
            className={`${inputCls} text-[18px] font-bold`}
          />
          <Boton tono="lleno" onClick={() => (ok ? responder("tel", telTxt.trim()) : setError("Escribí el WhatsApp con el código de área (ej: 11 2345-6789)."))}>
            Seguir
          </Boton>
        </div>
      );
    }
    if (actual === "oficina")
      return (
        <div className="grid grid-cols-2 gap-2">
          {(catalogo?.oficinas || []).map((o) => (
            <Boton key={o.id} onClick={() => responder("oficina", o.id)}>{o.nombre}</Boton>
          ))}
        </div>
      );
    if (actual === "motivo")
      return (
        <div className="flex flex-col gap-2">
          {botones.map((b) => {
            const Icono = ICONOS[motivoDe(catalogo, b.motivo)?.icono] || HiQuestionMarkCircle;
            return (
              <button
                key={b.motivo}
                type="button"
                onClick={() => responder("motivo", b.motivo)}
                className="flex items-center gap-3 rounded-2xl border-2 border-sky-700/30 bg-card dark:bg-card-dark p-3 text-left transition-colors hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <Icono className="w-5 h-5" />
                </span>
                <span className="min-w-0 text-[15px] font-semibold leading-snug text-titulo dark:text-titulo-dark">{b.dice || b.titulo}</span>
              </button>
            );
          })}
        </div>
      );
    if (actual.startsWith("q_")) {
      const p = preguntas.find((x) => `q_${x.key}` === actual);
      if (!p) return null;
      if (p.tipo === "cuando") {
        const hoy = hoyYmd();
        return (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Boton onClick={() => responder(actual, hoy)}>Hoy</Boton>
              <Boton onClick={() => responder(actual, ayerYmd())}>Ayer</Boton>
              <Boton onClick={() => setVerOtroDia(true)}>Otro día</Boton>
            </div>
            {verOtroDia && (
              <div className="flex gap-2">
                <input type="date" max={hoy} value={otroDia} onChange={(e) => setOtroDia(e.target.value)} className={inputCls} aria-label="Fecha" />
                <Boton tono="lleno" onClick={() => otroDia && responder(actual, otroDia)} className="shrink-0">
                  Listo
                </Boton>
              </div>
            )}
            {verOtroDia && otroDia && <span className="text-[13px] text-suave dark:text-suave-dark">{diaLargo(otroDia)}</span>}
            <Boton tono="suave" onClick={() => responder(actual, NO_SABE)}>No sabe</Boton>
          </div>
        );
      }
      const ops =
        p.tipo === "opciones"
          ? (p.opciones || []).map((o) => [o.id, o.nombre])
          : [["SI", "Sí"], ["NO", "No"]];
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {ops.map(([id, txt]) => (
              <Boton key={id} onClick={() => responder(actual, id)}>{txt}</Boton>
            ))}
          </div>
          <Boton tono="suave" onClick={() => responder(actual, p.tipo === "si_no_ns" ? "NS" : NO_SABE)}>No sabe</Boton>
        </div>
      );
    }
    if (actual === "urgente")
      return (
        <div className="grid grid-cols-3 gap-2">
          <Boton tono="rojo" onClick={() => responder("urgente", "SI")}>Sí, urgente</Boton>
          <Boton onClick={() => responder("urgente", "NO")}>No</Boton>
          <Boton tono="suave" onClick={() => responder("urgente", "NS")}>No sabe</Boton>
        </div>
      );
    if (actual === "horario")
      return (
        <div className="grid grid-cols-3 gap-2">
          {horarios.map((h) => (
            <Boton key={h.id} onClick={() => responder("horario", h.id)}>{h.nombre}</Boton>
          ))}
        </div>
      );
    if (actual === "nota")
      return (
        <div className="flex flex-col gap-2">
          <textarea
            value={notaTxt}
            onChange={(e) => setNotaTxt(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej: quiere hacer un poder para que la hija cobre la jubilación"
            aria-label="Algo más"
            className="w-full min-w-0 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-3 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600"
          />
          <div className="grid grid-cols-2 gap-2">
            <Boton tono="suave" onClick={() => responder("nota", "")}>Nada más</Boton>
            <Boton tono="lleno" onClick={() => responder("nota", notaTxt.trim())}>Agregar</Boton>
          </div>
        </div>
      );
    if (actual === "confirmar") {
      const nombre = cliente ? cliente.nombre_completo : `${r.nombre?.nombre || ""} ${r.nombre?.apellido || ""}`.trim();
      const tel = r.tel || telCliente;
      const filas = [
        ["Cliente", `${nombre}${cliente ? " (de THAMES)" : ""}`],
        ["WhatsApp", tel || "—"],
        ["Consulta", boton?.titulo || motivo?.titulo || "—"],
        ...preguntas
          .filter((p) => r[`q_${p.key}`] && r[`q_${p.key}`] !== NO_SABE && r[`q_${p.key}`] !== "NS")
          .map((p) => [p.texto.replace(/[¿?]/g, ""), respuestaTxt(p, r[`q_${p.key}`])]),
        ["Urgente", { SI: "Sí", NO: "No", NS: "No sabe" }[r.urgente] || "—"],
        ["Llamarlo", horarios.find((h) => h.id === r.horario)?.nombre || "—"],
        ...(r.nota ? [["Nota", r.nota]] : []),
      ];
      return (
        <div className="flex flex-col gap-3">
          <div className="divide-y divide-linea dark:divide-linea-dark rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4">
            {filas.map(([k, v]) => (
              <div key={k} className="flex gap-3 py-2 text-[14px]">
                <span className="w-28 shrink-0 text-suave dark:text-suave-dark">{k}</span>
                <span className="min-w-0 break-words font-semibold text-titulo dark:text-titulo-dark">{v}</span>
              </div>
            ))}
          </div>
          <Boton tono="verde" onClick={guardar} className="min-h-[54px] text-[16px]">
            {guardando ? "Guardando…" : (
              <span className="inline-flex items-center gap-2">
                <HiCheck className="w-5 h-5" /> Guardar consulta
              </span>
            )}
          </Boton>
        </div>
      );
    }
    return null;
  };

  /* ── Casos abiertos de esa persona (para no cargar dos veces lo mismo) ── */
  const casosAbiertos = (cliente?.casos?.length ? cliente.casos : !cliente ? busqueda?.casos : null) || [];
  const respondidos = pasos.slice(0, indice);

  return (
    <MarcoPasos titulo="Consulta rápida" onAtras={creado ? () => navigate("/legales") : deshacer} onCerrar={() => navigate("/legales")}>
      <div className="h-1.5 -mt-2 rounded-full bg-linea dark:bg-linea-dark overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-sky-700 dark:bg-sky-500 transition-all duration-500" style={{ width: `${progreso}%` }} />
      </div>

      <div className="flex flex-col gap-2.5" role="log" aria-live="polite">
        <Bot>
          ¡Hola{yo ? ` ${yo}` : ""}! 👋 Te ayudo a cargar la consulta. <b>No hace falta saber de leyes</b>: preguntale al cliente y
          tocá lo que te diga.
        </Bot>

        {respondidos.map((paso) => (
          <div key={paso} className="flex flex-col gap-2.5">
            <Bot>{preguntaDe(paso)}</Bot>
            <Yo>{respuestaDe(paso)}</Yo>
            {paso === "dni" && casosAbiertos.length > 0 && (
              <Bot>
                ⚠️ Ojo: ya tiene {casosAbiertos.length === 1 ? "un caso abierto" : `${casosAbiertos.length} casos abiertos`} (
                {casosAbiertos.map((k) => `${k.numero} · ${k.titulo}`).join(", ")}). Si es lo mismo, avisale a Franco en vez de cargarlo de nuevo.
              </Bot>
            )}
          </div>
        ))}

        <AnimatePresence mode="wait">
          {creado ? (
            <motion.div key="listo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onAnimationComplete={alFinal} className="flex flex-col gap-2.5">
              <Bot>
                ¡Guardado! 🎉 Ya le aparece a Franco en <b>«Para llamar»</b>.
                <span className="mt-1 block">
                  Decile a {primerNombre(creado.persona_nombre) || "el cliente"} que lo vamos a llamar
                  {r.horario === "MANIANA" ? " a la mañana" : r.horario === "TARDE" ? " a la tarde" : " pronto"}.
                </span>
                <span className="mt-1 block text-[12px] text-suave dark:text-suave-dark">{creado.numero}</span>
              </Bot>
              <div className="flex flex-col gap-2 pl-10">
                <Boton tono="lleno" onClick={reiniciar}>Cargar otra consulta</Boton>
                <div className="grid grid-cols-2 gap-2">
                  <Boton tono="suave" onClick={() => navigate(`/legales/${creado.id}`)}>Ver el caso</Boton>
                  <Boton tono="suave" onClick={() => navigate("/legales")}>Volver</Boton>
                </div>
              </div>
            </motion.div>
          ) : pensando || buscando ? (
            <motion.div key="pensando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Escribiendo />
            </motion.div>
          ) : (
            <motion.div
              key={actual}
              ref={actualRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onAnimationComplete={alFinal}
              className="flex flex-col gap-2.5 scroll-mt-24"
            >
              <Bot>{preguntaDe(actual)}</Bot>
              <div className="pl-10 flex flex-col gap-2">
                {controles()}
                {error && (
                  <p className="text-[14px] font-semibold text-duo-rojo" role="alert">
                    {error}
                  </p>
                )}
                {indice > 0 && (
                  <button
                    type="button"
                    onClick={deshacer}
                    className="self-start inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark"
                  >
                    <HiReply className="w-4 h-4" /> Cambiar la última respuesta
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Lugar de sobra abajo: en el celu la barra de abajo de THAMES no tapa los botones. */}
        <div ref={fin} className="h-24 lg:h-4" />
      </div>
    </MarcoPasos>
  );
}
