// src/components/legales/ConsultaRapida.jsx
//
// ⚡ CONSULTA RÁPIDA (Franco 23/11/2026) — /legales/consulta
//   El cliente pregunta algo legal en la oficina (ART, escribanía, firmar algo,
//   familia, penal…). Los chicos NO saben de derecho: lo cargan en 30 segundos
//   con botones y listo. Franco lo ve en «Para llamar» (arriba de Legales) y lo contacta.
//
//   1. ¿Quién es?      → DNI (si es cliente de THAMES, los datos salen solos)
//   2. ¿Qué pregunta?  → botones grandes (salen del catálogo: consulta_rapida)
//   3. Unas preguntas  → solo de botones + «¿Cuándo lo llamamos?» + «¿Es urgente?»
//   → «¡Listo! Franco lo va a llamar».
//
//   Sin papeles ni turno (para eso está «Cargar una denuncia»). Después el caso
//   sigue igual que cualquier otro: Franco le asigna abogado, turno, etc.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiArrowRight,
  HiBriefcase,
  HiCheckCircle,
  HiHome,
  HiPencilAlt,
  HiPlusCircle,
  HiQuestionMarkCircle,
  HiShieldExclamation,
  HiTruck,
  HiUserGroup,
} from "react-icons/hi";

import { useLegales } from "./legalesContext";
import { crearCaso, mensajeError } from "../../services/legales";
import MarcoPasos, { BotonGrande } from "./MarcoPasos";
import BuscarPersona from "./BuscarPersona";
import { PERSONA_VACIA, nombrePersona, personaLista, telefonoPersona } from "./persona";
import { diaLargo, hoyYmd, motivoDe, preguntasDe, primerNombre, respuestasVisibles } from "./legalesUtils";

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
const ETIQUETAS = ["Quién es", "Qué pregunta", "Preguntas"];
const VACIO = { paso: 1, persona: PERSONA_VACIA, oficina: null, motivo: "", respuestas: {}, horario: "", urgente: null, nota: "" };

const inputCls =
  "w-full min-w-0 h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600 [color-scheme:light] dark:[color-scheme:dark]";

function ayerYmd() {
  const x = new Date();
  x.setDate(x.getDate() - 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function Titulo({ t, s }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-[24px] font-bold leading-tight text-titulo dark:text-titulo-dark">{t}</h2>
      {s && <p className="text-[15px] leading-snug text-suave dark:text-suave-dark">{s}</p>}
    </div>
  );
}

function Opcion({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[48px] rounded-xl border px-2 text-[15px] font-bold transition-colors ${
        on
          ? "bg-sky-700 border-sky-700 text-white"
          : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-sky-600"
      }`}
    >
      {children}
    </button>
  );
}

function Pregunta({ texto, ayuda, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 min-w-0">
      <span className="text-[15px] font-bold text-titulo dark:text-titulo-dark">{texto}</span>
      {children}
      {ayuda && <span className="text-[13px] text-suave dark:text-suave-dark">{ayuda}</span>}
    </div>
  );
}

export default function ConsultaRapida() {
  const { esAdmin, catalogo } = useLegales();
  const navigate = useNavigate();
  const [d, setD] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [creado, setCreado] = useState(null);
  const [otroDia, setOtroDia] = useState({});
  const arriba = useRef(null);

  useEffect(() => {
    arriba.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [d.paso, creado]);

  const set = (cambios) => setD((x) => ({ ...x, ...cambios }));
  const botones = catalogo?.consulta_rapida || [];
  const tiposRapidos = catalogo?.tipos_rapidos || TIPOS_RAPIDOS_DEFECTO;
  const horarios = catalogo?.horarios_llamado || HORARIOS_DEFECTO;
  const motivo = motivoDe(catalogo, d.motivo);
  const boton = botones.find((b) => b.motivo === d.motivo) || null;
  // Solo las preguntas de botones (nada para escribir).
  const preguntas = useMemo(
    () => preguntasDe(motivo, d.respuestas).filter((p) => tiposRapidos.includes(p.tipo)),
    [motivo, d.respuestas, tiposRapidos]
  );
  const nombre = nombrePersona(d.persona);
  const faltaOficina = esAdmin && !(d.oficina || d.persona.cliente?.oficina);

  const irA = (paso) => {
    setError("");
    set({ paso });
  };
  const salir = () => navigate("/legales");
  const atras = () => (d.paso === 1 ? salir() : irA(d.paso - 1));

  const guardar = async () => {
    const p = d.persona;
    const c = p.cliente;
    const soloRapidas = Object.fromEntries(
      Object.entries(respuestasVisibles(motivo, d.respuestas)).filter(([k]) => preguntas.some((q) => q.key === k))
    );
    const body = {
      cliente: c ? c.cliente : null,
      persona_nombre: c ? "" : p.nombre.trim(),
      persona_apellido: c ? "" : p.apellido.trim(),
      persona_dni: c ? "" : String(p.dni || "").trim(),
      persona_telefono: c && p.telOk !== false ? "" : telefonoPersona(p),
      motivo: d.motivo,
      respuestas: soloRapidas,
      relato: d.nota.trim(),
      rapida: { horario: d.horario || "", urgente: d.urgente === true },
    };
    if (esAdmin) body.oficina = d.oficina || c?.oficina || null;
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

  /* ✅ Listo */
  if (creado) {
    return (
      <div ref={arriba} className="scroll-mt-24 mx-auto w-full max-w-lg flex flex-col gap-5 pt-4">
        <div className="flex flex-col items-center text-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]">
            <HiCheckCircle className="w-10 h-10 text-duo-verde" />
          </span>
          <h2 className="text-[26px] font-bold leading-tight text-titulo dark:text-titulo-dark">¡Listo!</h2>
          <p className="text-[16px] text-suave dark:text-suave-dark">
            Ya le aparece a Franco en <b className="text-titulo dark:text-titulo-dark">«Para llamar»</b>. Decile a{" "}
            {primerNombre(creado.persona_nombre) || "el cliente"} que lo van a contactar
            {d.horario === "MANIANA" ? " a la mañana" : d.horario === "TARDE" ? " a la tarde" : ""}.
          </p>
          <p className="text-[13px] text-suave dark:text-suave-dark">
            {creado.numero} · {boton?.titulo || creado.motivo_titulo}
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <BotonGrande
            onClick={() => {
              setCreado(null);
              setD(VACIO);
              setOtroDia({});
            }}
          >
            Cargar otra consulta
          </BotonGrande>
          <BotonGrande tono="blanco" onClick={() => navigate(`/legales/${creado.id}`)}>
            Ver el caso
          </BotonGrande>
          <BotonGrande tono="blanco" onClick={salir}>
            Volver a Legales
          </BotonGrande>
        </div>
      </div>
    );
  }

  const pie = (listo, texto = "Siguiente", accion = () => irA(d.paso + 1)) => (
    <>
      {d.paso > 1 && (
        <BotonGrande tono="blanco" onClick={atras} className="px-4">
          Atrás
        </BotonGrande>
      )}
      <BotonGrande onClick={accion} disabled={!listo || guardando} className="flex-1" tono={d.paso === 3 ? "verde" : "azul"}>
        {texto} {d.paso < 3 && <HiArrowRight className="w-5 h-5" />}
      </BotonGrande>
    </>
  );

  let contenido = null;
  let piePagina = null;

  if (d.paso === 1) {
    contenido = (
      <>
        <Titulo t="¿Quién es el cliente?" s="Pedile el DNI. Si ya es cliente de THAMES, los datos salen solos." />
        <BuscarPersona valor={d.persona} onChange={(persona) => set({ persona })} onVerCaso={(id) => navigate(`/legales/${id}`)} />
        {esAdmin && d.persona.buscado && (
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
            ¿De qué oficina es?
            <select
              value={d.oficina || d.persona.cliente?.oficina || ""}
              onChange={(e) => set({ oficina: e.target.value ? Number(e.target.value) : null })}
              className={inputCls}
            >
              <option value="">Elegí la oficina…</option>
              {(catalogo?.oficinas || []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
      </>
    );
    piePagina = pie(personaLista(d.persona) && !faltaOficina);
  } else if (d.paso === 2) {
    contenido = (
      <>
        <Titulo t="¿Qué pregunta?" s="Tocá lo que más se parezca. Si no sabés, «Otra cosa»." />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {botones.map((b) => {
            const m = motivoDe(catalogo, b.motivo);
            const Icono = ICONOS[m?.icono] || HiQuestionMarkCircle;
            const on = d.motivo === b.motivo;
            return (
              <button
                key={b.motivo}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  set({ motivo: b.motivo, respuestas: d.motivo === b.motivo ? d.respuestas : {}, paso: 3 });
                  setOtroDia({});
                }}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${
                  on
                    ? "border-sky-700 bg-sky-50 dark:bg-sky-500/10"
                    : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-sky-600"
                }`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <Icono className="w-6 h-6" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-[16px] leading-tight text-titulo dark:text-titulo-dark">{b.titulo}</strong>
                  <span className="block text-[13px] leading-snug text-suave dark:text-suave-dark">{b.ejemplo}</span>
                </span>
              </button>
            );
          })}
        </div>
      </>
    );
    piePagina = pie(!!d.motivo);
  } else {
    const setResp = (key, v) => set({ respuestas: { ...d.respuestas, [key]: v } });
    contenido = (
      <>
        <Titulo
          t={boton ? `${boton.titulo}: unas preguntas` : "Unas preguntas"}
          s="Tocá la respuesta. Si no sabe, dejala sin tocar."
        />
        <div className="flex flex-col gap-3">
          {preguntas.map((p) => {
            const v = d.respuestas[p.key] || "";
            let control = null;
            if (p.tipo === "cuando") {
              const hoy = hoyYmd();
              const ayer = ayerYmd();
              const esOtro = otroDia[p.key] || (v && v !== hoy && v !== ayer);
              control = (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Opcion on={v === hoy && !otroDia[p.key]} onClick={() => { setOtroDia((x) => ({ ...x, [p.key]: false })); setResp(p.key, v === hoy ? "" : hoy); }}>Hoy</Opcion>
                    <Opcion on={v === ayer && !otroDia[p.key]} onClick={() => { setOtroDia((x) => ({ ...x, [p.key]: false })); setResp(p.key, v === ayer ? "" : ayer); }}>Ayer</Opcion>
                    <Opcion on={!!esOtro} onClick={() => { setOtroDia((x) => ({ ...x, [p.key]: true })); if (v === hoy || v === ayer) setResp(p.key, ""); }}>Otro día</Opcion>
                  </div>
                  {esOtro && <input type="date" max={hoy} value={v} onChange={(e) => setResp(p.key, e.target.value)} className={inputCls} aria-label="Fecha" />}
                  {esOtro && v && <span className="text-[13px] text-suave dark:text-suave-dark">{diaLargo(v)}</span>}
                </div>
              );
            } else if (p.tipo === "si_no" || p.tipo === "si_no_ns") {
              const ops = [["SI", "Sí"], ["NO", "No"], ...(p.tipo === "si_no_ns" ? [["NS", "No sabe"]] : [])];
              control = (
                <div className={`grid gap-2 ${ops.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {ops.map(([id, txt]) => (
                    <Opcion key={id} on={v === id} onClick={() => setResp(p.key, v === id ? "" : id)}>
                      {txt}
                    </Opcion>
                  ))}
                </div>
              );
            } else {
              control = (
                <div className="grid grid-cols-2 gap-2">
                  {(p.opciones || []).map((o) => (
                    <Opcion key={o.id} on={v === o.id} onClick={() => setResp(p.key, v === o.id ? "" : o.id)}>
                      {o.nombre}
                    </Opcion>
                  ))}
                </div>
              );
            }
            return (
              <Pregunta key={p.key} texto={p.texto} ayuda={p.ayuda}>
                {control}
              </Pregunta>
            );
          })}

          <Pregunta texto="¿Cuándo lo llamamos?">
            <div className="grid grid-cols-3 gap-2">
              {horarios.map((h) => (
                <Opcion key={h.id} on={d.horario === h.id} onClick={() => set({ horario: d.horario === h.id ? "" : h.id })}>
                  {h.nombre}
                </Opcion>
              ))}
            </div>
          </Pregunta>

          <Pregunta texto="¿Es urgente?" ayuda="Urgente = le llegó una carta, tiene una fecha encima o no puede esperar.">
            <div className="grid grid-cols-2 gap-2">
              <Opcion on={d.urgente === true} onClick={() => set({ urgente: d.urgente === true ? null : true })}>
                Sí, urgente
              </Opcion>
              <Opcion on={d.urgente === false} onClick={() => set({ urgente: d.urgente === false ? null : false })}>
                No
              </Opcion>
            </div>
          </Pregunta>

          <Pregunta texto="¿Algo más? (opcional)">
            <textarea
              value={d.nota}
              onChange={(e) => set({ nota: e.target.value })}
              rows={2}
              maxLength={500}
              placeholder="Ej: quiere hacer un poder para que la hija cobre la jubilación"
              className="w-full min-w-0 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-3 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600"
            />
          </Pregunta>
        </div>
        {error && <p className="text-[14px] font-semibold text-duo-rojo" role="alert">{error}</p>}
      </>
    );
    piePagina = pie(true, guardando ? "Guardando…" : "Guardar consulta", guardar);
  }

  return (
    <div ref={arriba} className="scroll-mt-24">
      <MarcoPasos
        titulo="Consulta rápida"
        paso={d.paso}
        total={3}
        etiqueta={ETIQUETAS[d.paso - 1]}
        derecha={[nombre, boton?.titulo].filter(Boolean).join(" · ")}
        onAtras={atras}
        onCerrar={salir}
        pie={piePagina}
      >
        {contenido}
      </MarcoPasos>
    </div>
  );
}
