// src/components/legales/LegalesWizard.jsx
//
// 📝 CARGAR UNA DENUNCIA — 7 pasos guiados, pensados para el celu y para
// alguien que NO sabe de derecho:
//   1. ¿Quién es? (DNI → si es cliente, los datos salen solos)
//   2. ¿Qué le pasó? (botones grandes: choque, trabajo, familia…)
//   3. Preguntas fáciles (Sí / No / No sabe)
//   4. Contá qué pasó (como lo cuenta el cliente)
//   5. Fotos de los papeles (la lista sale de lo que contó)
//   6. Turno con el abogado (sugerido + horarios libres)
//   7. Revisar y guardar → "¡Listo!" con el WhatsApp del turno ya escrito.
//
// 💾 Se guarda solo en este celu/compu: si se corta o se cierra, al volver
//    sigue donde quedó (las fotos ya están subidas).
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiArrowRight,
  HiBriefcase,
  HiCamera,
  HiCheck,
  HiClock,
  HiHome,
  HiInformationCircle,
  HiMicrophone,
  HiPlus,
  HiPlusCircle,
  HiQuestionMarkCircle,
  HiShieldExclamation,
  HiTruck,
  HiUserGroup,
  HiX,
} from "react-icons/hi";

import { useLegales } from "./legalesContext";
import { avisoWhatsapp, crearCaso, esOcupado, mensajeError, subirArchivo } from "../../services/legales";
import MarcoPasos, { BotonGrande } from "./MarcoPasos";
import BuscarPersona from "./BuscarPersona";
import { PERSONA_VACIA, nombrePersona, personaLista, telefonoPersona } from "./persona";
import ElegirAbogado from "./ElegirAbogado";
import ElegirHorario from "./ElegirHorario";
import { Aviso, BotonWa } from "./PiezasLegales";
import {
  MOTIVO_CORTO,
  abogadoSugerido,
  conArticulo,
  diaLargo,
  diasHasta,
  esPdf,
  fechaLocal,
  hoyYmd,
  linkWhatsAppOElegir,
  mayuscula,
  miniatura,
  motivoDe,
  nombreCorto,
  papelesDe,
  preguntasDe,
  primerNombre,
  respuestaTxt,
  respuestasVisibles,
  textoConLink,
  textoTurnoElegido,
} from "./legalesUtils";

const ETIQUETAS = ["Quién es", "Qué le pasó", "Preguntas", "Qué pasó", "Papeles", "Turno", "Revisar"];
const ICONOS = {
  auto: HiTruck,
  salud: HiPlusCircle,
  trabajo: HiBriefcase,
  familia: HiUserGroup,
  escudo: HiShieldExclamation,
  casa: HiHome,
  pregunta: HiQuestionMarkCircle,
};
const SOBRE = {
  CHOQUE: "el choque",
  TRABAJO_ACCIDENTE: "el accidente",
  TRABAJO: "el trabajo",
  FAMILIA: "el tema de familia",
  ROBO: "lo que pasó",
  CASA: "la casa o el terreno",
};

const VACIO = {
  paso: 1,
  persona: PERSONA_VACIA,
  oficina: null,
  motivo: "",
  respuestas: {},
  relato: "",
  papeles: {}, // { dni: { estado: "OK" | "DESPUES" | "FALTA", archivos: [...] } }
  extras: [], // archivos sueltos ("Otro papel")
  abogado: null,
  turno: null,
  avisoSiniestro: true,
};

const claveBorrador = (uid) => `legales:denuncia:${uid || "x"}`;
function leerBorrador(uid) {
  try {
    const s = localStorage.getItem(claveBorrador(uid));
    const d = s ? JSON.parse(s) : null;
    return d && typeof d === "object" ? { ...VACIO, ...d, persona: { ...PERSONA_VACIA, ...(d.persona || {}) } } : null;
  } catch {
    return null;
  }
}
function guardarBorrador(uid, d) {
  try {
    localStorage.setItem(claveBorrador(uid), JSON.stringify(d));
  } catch {
    /* sin lugar o modo privado: sigue igual, solo que no se guarda */
  }
}
function borrarBorrador(uid) {
  try {
    localStorage.removeItem(claveBorrador(uid));
  } catch {
    /* nada */
  }
}

const inputCls =
  "w-full min-w-0 h-12 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600 [color-scheme:light] dark:[color-scheme:dark]";

/** La lista de papeles a la vista: los que pide el catálogo + los que ya tienen fotos. */
function listaPapeles(motivo, d) {
  const pedidos = papelesDe(motivo, d.respuestas);
  const vista = pedidos.map((p) => ({ ...p, estado: "FALTA", archivos: [], ...(d.papeles[p.key] || {}) }));
  Object.entries(d.papeles || {}).forEach(([key, v]) => {
    if (!vista.some((p) => p.key === key) && (v.archivos || []).length) {
      vista.push({ key, nombre: v.nombre || key, ayuda: "", ...v });
    }
  });
  return vista.map((p) => ({ ...p, estado: (p.archivos || []).length ? "OK" : p.estado === "DESPUES" ? "DESPUES" : "FALTA" }));
}

export default function LegalesWizard() {
  const { user, catalogo, abogados, esAdmin, recargarAbogados } = useLegales();
  const navigate = useNavigate();
  const uid = user?.id;
  const [inicial] = useState(() => leerBorrador(uid));
  const [d, setD] = useState(() => inicial || VACIO);
  const [restaurado, setRestaurado] = useState(() => !!(inicial && (inicial.persona?.buscado || inicial.motivo)));
  const [guardando, setGuardando] = useState(false);
  // Fotos que todavía se están subiendo: mientras tanto no se sigue (si no,
  // el caso se guardaba sin esas fotos).
  const [subiendoN, setSubiendoN] = useState(0);
  const subiendoFotos = subiendoN > 0;
  const [creado, setCreado] = useState(null);
  const [error, setError] = useState("");
  const arriba = useRef(null);

  useEffect(() => {
    if (!creado) guardarBorrador(uid, d);
  }, [uid, d, creado]);

  useEffect(() => {
    arriba.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [d.paso, creado]);

  const set = (cambios) => setD((x) => ({ ...x, ...cambios }));
  const motivo = motivoDe(catalogo, d.motivo);
  const sinPreguntas = motivo && !(motivo.preguntas || []).length;
  const nombre = nombrePersona(d.persona);
  const miOficina = esAdmin ? d.oficina || d.persona.cliente?.oficina || null : catalogo?.mi_oficina || null;
  const abogado = (abogados || []).find((a) => a.id === d.abogado) || null;
  const papeles = useMemo(() => listaPapeles(motivo, d), [motivo, d]);

  const irA = (paso) => {
    setError("");
    setRestaurado(false);
    set({ paso });
  };
  const siguiente = () => {
    if (d.paso === 2 && sinPreguntas) return irA(4);
    if (d.paso === 5 && !d.abogado) {
      const sug = abogadoSugerido(abogados || [], motivo?.tema || "");
      set({ paso: 6, abogado: sug ? sug.id : null });
      return undefined;
    }
    return irA(Math.min(7, d.paso + 1));
  };
  const atras = () => {
    if (d.paso === 1) return salir();
    if (d.paso === 4 && sinPreguntas) return irA(2);
    return irA(d.paso - 1);
  };
  const salir = () => {
    if (d.persona.buscado || d.motivo) toast("Quedó guardado: seguís cuando quieras.", { icon: "💾" });
    navigate("/legales");
  };
  const empezarDeCero = () => {
    borrarBorrador(uid);
    setD(VACIO);
    setRestaurado(false);
  };

  const guardar = async () => {
    const p = d.persona;
    const c = p.cliente;
    const body = {
      cliente: c ? c.cliente : null,
      persona_nombre: c ? "" : p.nombre.trim(),
      persona_apellido: c ? "" : p.apellido.trim(),
      persona_dni: c ? "" : String(p.dni || "").trim(),
      persona_telefono: c && p.telOk !== false ? "" : telefonoPersona(p),
      motivo: d.motivo,
      respuestas: respuestasVisibles(motivo, d.respuestas),
      relato: d.relato.trim(),
      abogado: d.abogado || null,
      papeles: papeles.map((x) => ({ key: x.key, nombre: x.nombre, estado: x.estado })),
      documentos: [
        ...papeles.flatMap((x) => (x.archivos || []).map((a) => ({ ...a, papel: x.key }))),
        ...(d.extras || []).map((a) => ({ ...a, papel: "" })),
      ],
      turno: d.turno && d.abogado ? { inicio: d.turno.inicio, modalidad: d.turno.modalidad } : null,
    };
    if (esAdmin) body.oficina = d.oficina || c?.oficina || null;
    setGuardando(true);
    setError("");
    try {
      const nuevo = await crearCaso(body);
      borrarBorrador(uid);
      setCreado(nuevo);
      recargarAbogados?.();
    } catch (e) {
      if (esOcupado(e)) {
        toast.error("Ese horario se acaba de ocupar. Elegí otro.");
        set({ paso: 6, turno: null });
      } else {
        setError(mensajeError(e, "No se pudo guardar. Probá de nuevo."));
      }
    } finally {
      setGuardando(false);
    }
  };

  if (creado) {
    return (
      <div ref={arriba} className="scroll-mt-24">
        <DenunciaLista
          caso={creado}
          d={d}
          miOficina={miOficina}
          onVer={() => navigate(`/legales/${creado.id}`)}
          onOtra={() => {
            setCreado(null);
            setD(VACIO);
            setRestaurado(false);
          }}
          onInicio={() => navigate("/legales")}
        />
      </div>
    );
  }

  const derecha = d.paso === 1 ? "Se guarda solo" : [nombre, MOTIVO_CORTO[d.motivo]].filter(Boolean).join(" · ");
  const pie = (listo, texto = "Siguiente", accion = siguiente) => (
    <>
      {d.paso > 1 && (
        <BotonGrande tono="blanco" onClick={atras} className="px-4">
          Atrás
        </BotonGrande>
      )}
      <BotonGrande onClick={accion} disabled={!listo} className="flex-1">
        {texto} <HiArrowRight className="w-5 h-5" />
      </BotonGrande>
    </>
  );

  let contenido = null;
  let piePagina = null;

  if (d.paso === 1) {
    const faltaOficina = esAdmin && !(d.oficina || d.persona.cliente?.oficina);
    contenido = (
      <>
        <Titulo t="¿Quién es el cliente?" s="Pedile el DNI y buscalo. Si ya es cliente de THAMES, los datos se completan solos." />
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
                <option key={o.id} value={o.id}>{o.nombre}</option>
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
        <Titulo t="¿Qué le pasó?" s="Elegí lo que más se parece. Si no sabés, tocá «Otra cosa»: el abogado lo acomoda." />
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Qué le pasó">
          {(catalogo?.motivos || []).map((m) => {
            const Icono = ICONOS[m.icono] || HiQuestionMarkCircle;
            const on = d.motivo === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set(on ? {} : { motivo: m.id, respuestas: d.motivo === m.id ? d.respuestas : {} })}
                className={`flex items-center gap-3.5 rounded-2xl p-3.5 text-left transition-colors ${
                  on
                    ? "border-2 border-sky-700 bg-sky-50 dark:bg-sky-500/10"
                    : m.id === "OTRO"
                      ? "border border-dashed border-slate-400 dark:border-slate-500 bg-card dark:bg-card-dark"
                      : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:border-sky-600"
                }`}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${on ? "bg-sky-700 text-white" : "bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark"}`}>
                  <Icono className="w-6 h-6" />
                </span>
                <span className="flex-1 min-w-0">
                  <strong className="block text-[16px] leading-tight text-titulo dark:text-titulo-dark">{m.titulo}</strong>
                  <span className="block text-[13px] text-suave dark:text-suave-dark">{m.ejemplo}</span>
                </span>
                {on && <HiCheck className="w-6 h-6 text-sky-700 dark:text-sky-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </>
    );
    piePagina = pie(!!d.motivo);
  } else if (d.paso === 3) {
    contenido = (
      <>
        <Titulo t={`Unas preguntas sobre ${SOBRE[d.motivo] || "lo que pasó"}`} s="Tocá la respuesta. Si el cliente no sabe, elegí «No sabe»." />
        <Preguntas motivo={motivo} respuestas={d.respuestas} seguros={catalogo?.seguros || []} onChange={(respuestas) => set({ respuestas })} />
        {d.motivo === "CHOQUE" && d.avisoSiniestro && (d.persona.cliente?.polizas || []).length > 0 && (
          <AvisoSiniestro d={d} onOk={() => set({ avisoSiniestro: false })} />
        )}
      </>
    );
    piePagina = pie(true);
  } else if (d.paso === 4) {
    const largo = d.relato.trim().length;
    contenido = (
      <>
        <Titulo t="Contá qué pasó" s="Escribilo como te lo cuenta el cliente. No hace falta usar palabras de abogado." />
        <Aviso tono="azul" className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card dark:bg-card-dark text-sky-700 dark:text-sky-300">
            <HiMicrophone className="w-5 h-5" />
          </span>
          <span>
            ¿Te cansa escribir? Tocá el <b>micrófono del teclado</b> y dictalo.
          </span>
        </Aviso>
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
          Lo que cuenta el cliente
          <textarea
            value={d.relato}
            onChange={(e) => set({ relato: e.target.value })}
            rows={7}
            maxLength={5000}
            placeholder="Ej: iba por Ruta 3 y un auto lo chocó de costado…"
            className="w-full rounded-xl border-2 border-sky-600/60 bg-card dark:bg-card-dark px-3.5 py-3 text-[16px] font-medium leading-relaxed text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600"
          />
        </label>
        {largo >= 60 ? (
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-green-700 dark:text-green-400">
            <HiCheck className="w-4 h-4" /> Bien: con 2 o 3 líneas alcanza.
          </p>
        ) : (
          <p className="text-[13px] text-suave dark:text-suave-dark">Con 2 o 3 líneas alcanza.</p>
        )}
        {(motivo?.ideas || []).length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">¿No sabés qué preguntarle? Probá con:</span>
            <div className="flex flex-wrap gap-2">
              {motivo.ideas.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => set({ relato: `${d.relato.trim()}${d.relato.trim() ? "\n" : ""}${idea} ` })}
                  className="rounded-full border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3.5 py-2 text-[13px] font-semibold text-titulo dark:text-titulo-dark"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
    piePagina = pie(largo >= 10);
  } else if (d.paso === 5) {
    contenido = (
      <>
        <Titulo t="Sacale foto a los papeles" s="La lista sale de lo que te contó. Lo que no tenga, lo sube después desde su link." />
        <PapelesPaso papeles={papeles} d={d} setD={setD} onSubiendo={(n) => setSubiendoN((x) => Math.max(0, x + n))} />
      </>
    );
    piePagina = pie(!subiendoFotos, subiendoFotos ? "Subiendo fotos…" : "Siguiente");
  } else if (d.paso === 6) {
    contenido = (
      <>
        <Titulo t="Turno con el abogado" s="Te sugerimos al abogado que lleva estos casos. Elegí un horario libre y listo." />
        <ElegirAbogado
          abogados={abogados || []}
          temas={catalogo?.temas || []}
          tema={motivo?.tema || ""}
          value={d.abogado}
          onChange={(id) => set({ abogado: id, turno: null })}
          permitirNinguno
        />
        {abogado && (
          <>
            <span className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">¿Cómo quiere hablar?</span>
            <ElegirHorario abogado={abogado} value={d.turno} onChange={(turno) => set({ turno })} miOficina={miOficina} />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            set({ turno: null, paso: 7 });
          }}
          className="self-center py-2 text-[14px] font-semibold text-suave dark:text-suave-dark underline"
        >
          Ahora no, le doy turno después
        </button>
      </>
    );
    piePagina = pie(true);
  } else {
    const resp = respuestasVisibles(motivo, d.respuestas);
    const detalle = preguntasDe(motivo, d.respuestas)
      .filter((p) => p.tipo !== "cuando" && resp[p.key])
      .map((p) => `${p.texto.replace(/[¿?]/g, "")}: ${respuestaTxt(p, resp[p.key])}`)
      .slice(0, 4)
      .join(" · ");
    const cuando = preguntasDe(motivo, d.respuestas).find((p) => p.tipo === "cuando" && resp[p.key]);
    const ok = papeles.filter((p) => p.estado === "OK");
    const despues = papeles.filter((p) => p.estado === "DESPUES");
    const faltan = papeles.filter((p) => p.estado === "FALTA");
    const nArch = papeles.reduce((a, p) => a + (p.archivos || []).length, 0) + (d.extras || []).length;
    contenido = (
      <>
        <Titulo t="Revisá y guardá" s="Si algo está mal, tocá «Cambiar»." />
        <div className="flex flex-col rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark divide-y divide-linea dark:divide-linea-dark">
          <Fila titulo="CLIENTE" onCambiar={() => irA(1)}>
            <b>{nombre || "—"}</b>
            <span>
              {d.persona.cliente ? `DNI ${d.persona.cliente.dni || "—"}` : d.persona.dni ? `DNI ${d.persona.dni}` : "Sin DNI"}
              {telefonoPersona(d.persona) ? ` · WhatsApp ${telefonoPersona(d.persona)}` : " · sin WhatsApp"}
            </span>
          </Fila>
          <Fila titulo="QUÉ LE PASÓ" onCambiar={() => irA(2)}>
            <b>
              {motivo?.titulo || "—"}
              {cuando ? ` · ${respuestaTxt(cuando, resp[cuando.key])}` : ""}
            </b>
            {detalle && <span>{detalle}</span>}
          </Fila>
          <Fila titulo="LO QUE CONTÓ" onCambiar={() => irA(4)}>
            <span className="text-titulo dark:text-titulo-dark">
              «{d.relato.trim().length > 140 ? `${d.relato.trim().slice(0, 140)}…` : d.relato.trim()}»
            </span>
          </Fila>
          <Fila titulo="PAPELES" onCambiar={() => irA(5)}>
            <b>
              {ok.length} cargado{ok.length === 1 ? "" : "s"}
              {nArch ? ` (${nArch} archivo${nArch === 1 ? "" : "s"})` : ""}
            </b>
            {(despues.length > 0 || faltan.length > 0) && (
              <span className="text-amber-800 dark:text-amber-300">
                {despues.length ? `Lo trae después: ${despues.map((x) => x.nombre.toLowerCase()).join(", ")}` : ""}
                {despues.length && faltan.length ? " · " : ""}
                {faltan.length ? `Falta: ${faltan.map((x) => x.nombre.toLowerCase()).join(", ")}` : ""}
              </span>
            )}
          </Fila>
          <Fila titulo="ABOGADO Y TURNO" onCambiar={() => irA(6)}>
            <b>{abogado?.nombre || "Sin abogado todavía"}</b>
            <span>{d.turno ? textoTurnoElegido(d.turno, "", miOficina) : "Sin turno (dáselo después desde el caso)"}</span>
          </Fila>
        </div>
        <Aviso tono="azul" className="flex items-start gap-2">
          <HiInformationCircle className="w-5 h-5 shrink-0 mt-px" />
          <span>
            Al guardar, el caso queda en Legales
            {abogado ? `, ${conArticulo(nombreCorto(abogado.nombre))} lo ve en su celu` : ""}
            {d.turno ? " y vos le mandás el turno por WhatsApp." : " y vos le mandás el link por WhatsApp."}
          </span>
        </Aviso>
        {error && (
          <p role="alert" className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3.5 py-3 text-[14px] font-semibold text-duo-rojo">
            {error}
          </p>
        )}
      </>
    );
    piePagina = (
      <>
        <BotonGrande tono="blanco" onClick={atras} className="px-4">
          Atrás
        </BotonGrande>
        <BotonGrande tono="verde" onClick={guardar} disabled={guardando || subiendoFotos} className="flex-1">
          <HiCheck className="w-5 h-5" /> {guardando ? "Guardando…" : "Guardar la denuncia"}
        </BotonGrande>
      </>
    );
  }

  return (
    <div ref={arriba} className="scroll-mt-24">
      <MarcoPasos
        titulo="Cargar una denuncia"
        paso={d.paso}
        total={7}
        etiqueta={ETIQUETAS[d.paso - 1]}
        derecha={derecha}
        onAtras={atras}
        onCerrar={salir}
        pie={piePagina}
      >
        {restaurado && d.paso >= 1 && (
          <Aviso tono="ambar" className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Seguís con la denuncia que habías empezado{nombre ? ` (${nombre})` : ""}.
            </span>
            <button type="button" onClick={empezarDeCero} className="font-bold underline">
              Empezar de cero
            </button>
          </Aviso>
        )}
        {contenido}
      </MarcoPasos>
    </div>
  );
}

function Titulo({ t, s }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-[24px] font-bold leading-tight text-titulo dark:text-titulo-dark">{t}</h2>
      {s && <p className="text-[15px] leading-snug text-suave dark:text-suave-dark">{s}</p>}
    </div>
  );
}

function Fila({ titulo, onCambiar, children }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-[14px] text-suave dark:text-suave-dark [&_b]:text-[16px] [&_b]:text-titulo dark:[&_b]:text-titulo-dark">
        <span className="text-[12px] font-bold tracking-wide text-suave dark:text-suave-dark">{titulo}</span>
        {children}
      </div>
      <button type="button" onClick={onCambiar} className="shrink-0 py-1 text-[15px] font-bold text-sky-700 dark:text-sky-400">
        Cambiar
      </button>
    </div>
  );
}

// ── Paso 3: las preguntas ────────────────────────────────────────────────
function BotonOpcion({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-[48px] rounded-xl border px-2 text-[15px] font-bold transition-colors ${
        on ? "bg-sky-700 border-sky-700 text-white" : "bg-card dark:bg-card-dark border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark hover:border-sky-600"
      }`}
    >
      {children}
    </button>
  );
}

function ayerYmd() {
  const x = fechaLocal(hoyYmd());
  x.setDate(x.getDate() - 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function Preguntas({ motivo, respuestas, seguros, onChange }) {
  const visibles = preguntasDe(motivo, respuestas);
  const set = (key, v) => onChange({ ...respuestas, [key]: v });
  const [otroDia, setOtroDia] = useState({});
  const lista = [];
  for (let i = 0; i < visibles.length; i += 1) {
    const p = visibles[i];
    // patente + seguro del otro van juntos en una fila
    if (p.tipo === "patente" && visibles[i + 1]?.tipo === "seguro") {
      lista.push({ fila: [p, visibles[i + 1]] });
      i += 1;
    } else lista.push({ p });
  }

  const pregunta = (p) => {
    const v = respuestas[p.key] || "";
    let control = null;
    if (p.tipo === "cuando") {
      const hoy = hoyYmd();
      const ayer = ayerYmd();
      const esOtro = otroDia[p.key] || (v && v !== hoy && v !== ayer);
      control = (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <BotonOpcion on={v === hoy && !otroDia[p.key]} onClick={() => { setOtroDia((x) => ({ ...x, [p.key]: false })); set(p.key, hoy); }}>Hoy</BotonOpcion>
            <BotonOpcion on={v === ayer && !otroDia[p.key]} onClick={() => { setOtroDia((x) => ({ ...x, [p.key]: false })); set(p.key, ayer); }}>Ayer</BotonOpcion>
            <BotonOpcion on={!!esOtro} onClick={() => { setOtroDia((x) => ({ ...x, [p.key]: true })); if (v === hoy || v === ayer) set(p.key, ""); }}>Otro día</BotonOpcion>
          </div>
          {esOtro && (
            <input type="date" max={hoy} value={v} onChange={(e) => set(p.key, e.target.value)} className={inputCls} aria-label="Fecha" />
          )}
          {esOtro && v && <span className="text-[13px] text-suave dark:text-suave-dark">{diaLargo(v)}</span>}
        </div>
      );
    } else if (p.tipo === "fecha") {
      control = <input type="date" value={v} onChange={(e) => set(p.key, e.target.value)} className={inputCls} aria-label={p.texto} />;
    } else if (p.tipo === "si_no" || p.tipo === "si_no_ns") {
      const ops = [["SI", "Sí"], ["NO", "No"], ...(p.tipo === "si_no_ns" ? [["NS", "No sabe"]] : [])];
      control = (
        <div className={`grid gap-2 ${ops.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {ops.map(([id, txt]) => (
            <BotonOpcion key={id} on={v === id} onClick={() => set(p.key, v === id ? "" : id)}>{txt}</BotonOpcion>
          ))}
        </div>
      );
    } else if (p.tipo === "opciones") {
      control = (
        <div className="grid grid-cols-2 gap-2">
          {(p.opciones || []).map((o) => (
            <BotonOpcion key={o.id} on={v === o.id} onClick={() => set(p.key, v === o.id ? "" : o.id)}>{o.nombre}</BotonOpcion>
          ))}
        </div>
      );
    } else if (p.tipo === "seguro") {
      control = (
        <select value={v} onChange={(e) => set(p.key, e.target.value)} className={inputCls} aria-label={p.texto}>
          <option value="">Elegí…</option>
          {seguros.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      );
    } else {
      control = (
        <input
          value={v}
          onChange={(e) => set(p.key, p.tipo === "patente" ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={p.placeholder || (p.tipo === "patente" ? "Ej: AE789JK" : "")}
          className={`${inputCls} ${p.tipo === "patente" ? "font-bold tracking-wider" : ""}`}
          aria-label={p.texto}
          maxLength={120}
        />
      );
    }
    return (
      <div className="flex flex-col gap-2 min-w-0">
        <span className="text-[15px] font-bold text-titulo dark:text-titulo-dark">{p.texto}</span>
        {control}
        {p.ayuda && <span className="text-[13px] text-suave dark:text-suave-dark">{p.ayuda}</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {lista.map((item) =>
        item.fila ? (
          <div key={item.fila[0].key} className="grid grid-cols-2 gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 border-l-4 border-l-sky-300 dark:border-l-sky-600">
            {item.fila.map((p) => (
              <div key={p.key}>{pregunta(p)}</div>
            ))}
          </div>
        ) : (
          <div
            key={item.p.key}
            className={`rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 ${item.p.si ? "border-l-4 border-l-sky-300 dark:border-l-sky-600" : ""}`}
          >
            {pregunta(item.p)}
          </div>
        )
      )}
    </div>
  );
}

function AvisoSiniestro({ d, onOk }) {
  const c = d.persona.cliente;
  const fecha = d.respuestas?.cuando;
  const dias = fecha ? -diasHasta(fecha) : null;
  return (
    <Aviso tono="azul" className="flex flex-col gap-3">
      <span className="flex items-start gap-2">
        <HiInformationCircle className="w-5 h-5 shrink-0 mt-px" />
        <span>
          {primerNombre(c?.nombre)} tiene {c?.polizas?.[0] ? `el ${c.polizas[0]}` : "un auto"} asegurado con THAMES.{" "}
          <b>Cargá también el siniestro para el seguro</b>
          {dias !== null && dias >= 0 ? `: ${dias === 0 ? "fue hoy" : `pasaron ${dias} día${dias === 1 ? "" : "s"} desde el choque`}.` : "."}
        </span>
      </span>
      <button type="button" onClick={onOk} className="self-start rounded-xl border border-sky-700/50 bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-bold text-sky-800 dark:text-sky-300">
        Cargar el siniestro después
      </button>
    </Aviso>
  );
}

// ── Paso 5: los papeles ──────────────────────────────────────────────────
function PapelesPaso({ papeles, d, setD, onSubiendo }) {
  const [subiendo, setSubiendo] = useState("");
  const listos = papeles.filter((p) => p.estado === "OK").length;
  const despues = papeles.filter((p) => p.estado === "DESPUES").length;
  const faltan = papeles.filter((p) => p.estado === "FALTA").length;
  const primeroQueFalta = papeles.find((p) => p.estado === "FALTA")?.key;

  const setPapel = (p, cambios) =>
    setD((x) => {
      const actual = x.papeles[p.key] || { estado: "FALTA", archivos: [], nombre: p.nombre };
      return { ...x, papeles: { ...x.papeles, [p.key]: { ...actual, nombre: p.nombre, ...cambios } } };
    });

  const subir = async (p, files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return;
    setSubiendo(p ? p.key : "extra");
    onSubiendo?.(1);
    for (const f of lista) {
      try {
        const a = await subirArchivo(f, "legales/papeles");
        if (p) {
          setD((x) => {
            const actual = x.papeles[p.key] || { estado: "FALTA", archivos: [] };
            return {
              ...x,
              papeles: { ...x.papeles, [p.key]: { ...actual, nombre: p.nombre, estado: "OK", archivos: [...(actual.archivos || []), a] } },
            };
          });
        } else {
          setD((x) => ({ ...x, extras: [...(x.extras || []), a] }));
        }
      } catch (e) {
        toast.error(e?.message || "No se pudo subir el archivo.");
      }
    }
    setSubiendo("");
    onSubiendo?.(-1);
  };

  const quitar = (p, idx) => {
    if (!window.confirm("¿Sacar esta foto?")) return;
    if (p) {
      setD((x) => {
        const actual = x.papeles[p.key] || { archivos: [] };
        const archivos = (actual.archivos || []).filter((_, i) => i !== idx);
        return { ...x, papeles: { ...x.papeles, [p.key]: { ...actual, archivos, estado: archivos.length ? "OK" : "FALTA" } } };
      });
    } else {
      setD((x) => ({ ...x, extras: (x.extras || []).filter((_, i) => i !== idx) }));
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-1 text-[13px] font-bold text-duo-verde-sombra dark:text-duo-verde">
          {listos} listo{listos === 1 ? "" : "s"}
        </span>
        {despues > 0 && (
          <span className="rounded-full bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] px-3 py-1 text-[13px] font-bold text-amber-800 dark:text-amber-300">
            {despues} lo trae después
          </span>
        )}
        {faltan > 0 && (
          <span className="rounded-full bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark px-3 py-1 text-[13px] font-bold text-suave dark:text-suave-dark">
            {faltan} falta{faltan === 1 ? "" : "n"}
          </span>
        )}
      </div>

      {papeles.map((p, i) => {
        if (p.estado === "OK") {
          return (
            <div key={p.key} className="flex items-center gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <HiCheck className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <strong className="block text-[15px] leading-tight text-titulo dark:text-titulo-dark">{p.nombre}</strong>
                <span className="block text-[12px] text-suave dark:text-suave-dark">
                  {p.archivos.length} archivo{p.archivos.length === 1 ? "" : "s"}
                </span>
              </span>
              <Miniaturas archivos={p.archivos} onQuitar={(idx) => quitar(p, idx)} />
              <ElegirArchivo onElegir={(files) => subir(p, files)} ocupado={subiendo === p.key} chico etiqueta="Agregar otra foto" />
            </div>
          );
        }
        if (p.estado === "DESPUES") {
          return (
            <div key={p.key} className="flex items-center gap-3 rounded-2xl border border-duo-amarillo/50 bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <HiClock className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <strong className="block text-[15px] leading-tight text-titulo dark:text-titulo-dark">{p.nombre}</strong>
                <span className="block text-[12px] text-amber-800 dark:text-amber-300">Lo trae después (o lo sube desde su link)</span>
              </span>
              <button type="button" onClick={() => setPapel(p, { estado: "FALTA" })} className="shrink-0 px-2 py-2 text-[14px] font-bold text-sky-700 dark:text-sky-400">
                Deshacer
              </button>
            </div>
          );
        }
        const destacado = p.key === primeroQueFalta;
        return (
          <div
            key={p.key}
            className={`flex flex-col gap-3 rounded-2xl bg-card dark:bg-card-dark p-3.5 ${destacado ? "border-2 border-sky-700" : "border border-linea dark:border-linea-dark"}`}
          >
            <span className="flex items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[14px] font-bold ${destacado ? "border-sky-700 text-sky-700 dark:text-sky-300" : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark"}`}>
                {i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <strong className="block text-[15px] leading-tight text-titulo dark:text-titulo-dark">{p.nombre}</strong>
                {p.ayuda && <span className="block text-[12px] text-suave dark:text-suave-dark">{p.ayuda}</span>}
              </span>
            </span>
            <span className="grid grid-cols-2 gap-2">
              <ElegirArchivo onElegir={(files) => subir(p, files)} ocupado={subiendo === p.key} etiqueta="Sacar fotos" principal={destacado} />
              <button
                type="button"
                onClick={() => setPapel(p, { estado: "DESPUES" })}
                className="min-h-[48px] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 text-[15px] font-bold text-titulo dark:text-titulo-dark"
              >
                No lo tiene
              </button>
            </span>
          </div>
        );
      })}

      {(d.extras || []).length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
            <HiCheck className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <strong className="block text-[15px] leading-tight text-titulo dark:text-titulo-dark">Otros papeles</strong>
            <span className="block text-[12px] text-suave dark:text-suave-dark">{d.extras.length} archivo{d.extras.length === 1 ? "" : "s"}</span>
          </span>
          <Miniaturas archivos={d.extras} onQuitar={(idx) => quitar(null, idx)} />
        </div>
      )}
      <ElegirArchivo onElegir={(files) => subir(null, files)} ocupado={subiendo === "extra"} etiqueta="Otro papel (foto o PDF)" punteado />
    </div>
  );
}

function Miniaturas({ archivos = [], onQuitar }) {
  const muestra = archivos.slice(0, 2);
  return (
    <span className="hidden min-[360px]:flex gap-1.5 shrink-0">
      {muestra.map((a, idx) => (
        <button
          key={`${a.url}-${idx}`}
          type="button"
          onClick={() => onQuitar?.(idx)}
          className="relative h-10 w-10 overflow-hidden rounded-lg bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark"
          title={`${a.nombre} (tocá para sacarla)`}
          aria-label={`Sacar ${a.nombre}`}
        >
          {esPdf(a) ? (
            <span className="flex h-full w-full items-center justify-center bg-red-50 dark:bg-red-500/10 text-[10px] font-bold text-red-700 dark:text-red-300">PDF</span>
          ) : (
            <img src={miniatura(a.url, 80)} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          <HiX className="absolute right-0 top-0 w-3.5 h-3.5 rounded-bl bg-black/50 text-white" />
        </button>
      ))}
      {archivos.length > 2 && <span className="self-center text-[12px] font-bold text-suave dark:text-suave-dark">+{archivos.length - 2}</span>}
    </span>
  );
}

function ElegirArchivo({ onElegir, ocupado = false, etiqueta, principal = false, chico = false, punteado = false }) {
  const cls = chico
    ? "h-10 w-10 shrink-0 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark"
    : punteado
      ? "min-h-[52px] w-full rounded-2xl border border-dashed border-slate-400 dark:border-slate-500 bg-card dark:bg-card-dark text-[15px] font-bold text-titulo dark:text-titulo-dark"
      : principal
        ? "min-h-[48px] rounded-xl bg-sky-700 hover:bg-sky-800 text-[15px] font-bold text-white"
        : "min-h-[48px] rounded-xl border border-sky-700/50 bg-card dark:bg-card-dark text-[15px] font-bold text-sky-800 dark:text-sky-300";
  return (
    <label className={`inline-flex items-center justify-center gap-2 px-2 cursor-pointer select-none ${cls} ${ocupado ? "opacity-60 pointer-events-none" : ""}`} aria-label={etiqueta}>
      {chico ? <HiPlus className="w-5 h-5" /> : punteado ? <HiPlus className="w-5 h-5" /> : <HiCamera className="w-5 h-5" />}
      {!chico && <span>{ocupado ? "Subiendo…" : etiqueta}</span>}
      {chico && ocupado && <span className="sr-only">Subiendo…</span>}
      <input
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="sr-only"
        disabled={ocupado}
        onChange={(e) => {
          const files = e.target.files;
          onElegir(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

// ── ¡Listo! ──────────────────────────────────────────────────────────────
function DenunciaLista({ caso, d, miOficina, onVer, onOtra, onInicio }) {
  const t = caso.proximo_turno;
  const textos = caso.whatsapp_textos || {};
  const motivo = t ? "turno" : "link";
  const mensaje = textoConLink(t ? textos.turno : textos.link, caso);
  const [avisado, setAvisado] = useState(false);
  const anotar = () => {
    avisoWhatsapp(caso.id, motivo, t ? { turno: t.id } : {})
      .then(() => setAvisado(true))
      .catch((e) => toast.error(mensajeError(e, "No se pudo anotar el aviso.")));
  };
  const nombre = primerNombre(caso.persona_nombre);
  const ab = mayuscula(conArticulo(nombreCorto(caso.abogado_nombre || "")));
  const cliente = d.persona.cliente;
  const choqueAsegurado = d.motivo === "CHOQUE" && (cliente?.polizas || []).length > 0;
  let limite = null;
  if (choqueAsegurado && d.respuestas?.cuando) {
    const f = fechaLocal(d.respuestas.cuando);
    f.setDate(f.getDate() + 3);
    limite = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  }
  const turnoTxt = t ? textoTurnoElegido({ ...t, fecha: t.fecha, hora: t.hora }, "", miOficina) : "";

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-4 py-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-600 text-white ring-8 ring-green-600/15">
          <HiCheck className="w-10 h-10" />
        </span>
        <h2 className="text-[26px] font-bold text-titulo dark:text-titulo-dark">¡Listo! Caso cargado</h2>
        <p className="text-[14px] text-suave dark:text-suave-dark">
          {caso.numero} · {caso.persona_nombre} · {MOTIVO_CORTO[caso.motivo] || caso.tema_nombre}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border-2 border-green-700/70 bg-card dark:bg-card-dark p-4">
        <strong className="text-[17px] text-titulo dark:text-titulo-dark">{t ? "Mandale el turno por WhatsApp" : "Mandale el link por WhatsApp"}</strong>
        <p className="whitespace-pre-line [overflow-wrap:anywhere] rounded-xl bg-green-50 dark:bg-green-500/10 px-3.5 py-3 text-[14px] leading-relaxed text-titulo dark:text-titulo-dark">
          {mensaje}
        </p>
        <BotonWa href={linkWhatsAppOElegir(caso.persona_telefono, mensaje)} onEnviado={anotar} size="lg" full>
          {avisado ? "Mandado ✓ (mandar de nuevo)" : "Mandar por WhatsApp"}
        </BotonWa>
        <p className="text-center text-[12px] text-suave dark:text-suave-dark">
          {caso.persona_telefono ? "Se abre con el mensaje escrito. Queda anotado en el caso." : "No tiene WhatsApp cargado: elegís el contacto en WhatsApp."}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4">
        <strong className="text-[16px] text-titulo dark:text-titulo-dark">¿Y ahora qué pasa?</strong>
        <ol className="flex flex-col gap-2.5">
          {[
            caso.abogado ? `${ab} ya ve el caso en su celu.` : "El admin le asigna un abogado.",
            t ? `${turnoTxt.replace(/\.$/, "")}.` : "Todavía no tiene turno: dáselo desde el caso.",
            `Lo nuevo lo ves en el caso. ${nombre || "El cliente"} lo ve en su link.`,
          ].map((txt, i) => (
            <li key={txt} className="flex items-start gap-3 text-[14px] text-titulo dark:text-titulo-dark">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-500/10 text-[12px] font-bold text-sky-800 dark:text-sky-300">
                {i + 1}
              </span>
              {txt}
            </li>
          ))}
        </ol>
      </div>

      {choqueAsegurado && (
        <Aviso tono="ambar" className="flex flex-col items-start gap-3">
          <span>
            <b>No te olvides:</b> cargar el siniestro {cliente.polizas[0] ? `del ${cliente.polizas[0].split(" (")[0]}` : ""} para el seguro.
            {limite && diasHasta(limite) >= 0 ? (
              <>
                {" "}Hay tiempo hasta el <b>{diaLargo(limite)}</b>.
              </>
            ) : (
              " Cargalo cuanto antes."
            )}
          </span>
          <Link to="/siniestros" className="rounded-xl border border-amber-600/60 bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-bold text-amber-800 dark:text-amber-300">
            Cargar el siniestro
          </Link>
        </Aviso>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BotonGrande tono="blanco" onClick={onVer}>
          Ver el caso
        </BotonGrande>
        <BotonGrande tono="blanco" onClick={onOtra}>
          Cargar otra
        </BotonGrande>
      </div>
      <button type="button" onClick={onInicio} className="self-center py-2 text-[15px] font-bold text-sky-700 dark:text-sky-400">
        Volver al inicio
      </button>
    </div>
  );
}
