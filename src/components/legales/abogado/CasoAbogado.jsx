// src/components/legales/abogado/CasoAbogado.jsx
//
// 📂 El caso como lo ve el ABOGADO (05/10, estilo billetera). De arriba a abajo:
//   1. ‹ volver y la carátula;
//   2. «Lo próximo»: lo que vence primero, con su «Ya se hizo»;
//   3. tres botones fijos: Anotar · Agendar · Mover;
//   4. «En qué anda»: el camino del caso con SUS estados (como el seguimiento de un envío);
//   5. Datos (carátula, juzgado, instancia, etiquetas, el cliente con WhatsApp y Llamar);
//   6. Fechas · Turnos · Movimientos · Papeles · Honorarios 🔒 · Notas privadas 🔒 (solo él).
// En sus casos el abogado cambia lo mismo que el admin (datos, fechas, papeles).
// La comisión la sigue cobrando el admin. AppAbogado la monta con key = id.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiOutlineArrowsRightLeft,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChatBubbleOvalLeft,
  HiOutlineCheck,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineLockClosed,
  HiOutlinePencilSquare,
  HiOutlinePhone,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import useDatosVivos from "../../../hooks/useDatosVivos";
import {
  borrarDocumento,
  cambiarEstadoTurno,
  cargarHonorarios,
  darTurno,
  editarCaso,
  editarFecha,
  guardarDocumento,
  mensajeError,
  pedirCaso,
  subirArchivo,
} from "../../../services/legales";
import { Cargando } from "../../gestoria/Piezas";
import ExpedienteDocumentosPanel from "../ExpedienteDocumentosPanel";
import { ModalHonorarios, ModalTurno } from "../ModalesCaso";
import { useLegales } from "../legalesContext";
import { ABIERTOS, ddmm, fmtPct, linkCaso, linkTel, linkWhatsApp, motivoDe, plata, preguntasDe, respuestaTxt, volverOIr } from "../legalesUtils";
import { useAbogado } from "./abogadoContext";
import { TONO_TEXTO, cajaDeTono, caratulaCorta, estadoDe, foco, juntarAgenda, linkCls, suave, tipoFecha, tonoDeFecha, venceTxt } from "./abogadoUtils";
import { BarraVolver, Boton, CabeceraTarjeta, Etiqueta, FilaAgenda, FilaDato, IconoRedondo, Tarjeta } from "./piezasAbogado";
import { HojaAnotar, HojaDatos, HojaFecha, HojaMover, HojaTurno } from "./hojas";

const MOVS_A_LA_VISTA = 6;

/** El camino del caso: ✓ hechos, ● el de ahora, ○ los que faltan (con la fecha en que entró a cada uno). */
function Camino({ pasos }) {
  return (
    <ol className="flex flex-col px-3.5 pb-3 pt-1.5" aria-label="En qué anda el caso">
      {pasos.map((p, i) => (
        <li key={p.id} className="relative flex min-h-[34px] items-center gap-3" aria-current={p.actual ? "step" : undefined}>
          {i > 0 ? <span className={`absolute left-[9px] top-[-50%] h-full w-0.5 ${p.hecho || p.actual ? "bg-duo-verde" : "bg-slate-200 dark:bg-slate-700"}`} aria-hidden="true" /> : null}
          <span
            className={`relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              p.hecho
                ? "border-duo-verde bg-duo-verde text-white"
                : p.actual
                  ? "border-duo-violeta bg-card dark:bg-card-dark ring-4 ring-duo-violeta/20"
                  : "border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark"
            }`}
            aria-hidden="true"
          >
            {p.hecho ? <HiOutlineCheck className="h-3 w-3" strokeWidth={4} /> : null}
          </span>
          <span className={`min-w-0 flex-1 truncate text-[14.5px] ${p.actual ? "font-extrabold text-titulo dark:text-titulo-dark" : p.hecho ? "font-semibold text-titulo dark:text-titulo-dark" : suave}`}>
            {p.nombre}
            <span className="sr-only">{p.hecho ? " (hecho)" : p.actual ? " (ahora)" : " (falta)"}</span>
          </span>
          <span className={`shrink-0 text-[12.5px] tabular-nums ${p.actual ? "font-bold text-duo-violeta-sombra dark:text-[#a5a0ff]" : suave}`}>
            {p.fecha ? (p.actual ? `desde el ${ddmm(p.fecha)}` : ddmm(p.fecha)) : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function CasoAbogado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { catalogo, listas, setListas, cargar } = useAbogado();
  const { abogados } = useLegales();
  const [e, setE] = useState(null);
  const [error, setError] = useState("");
  // {tipo: "anotar"} · {tipo: "fecha", fecha?} · {tipo: "mover"} · {tipo: "datos"} · {tipo: "honorarios"} · {tipo: "turno", t} · {tipo: "dar-turno"}
  const [hoja, setHoja] = useState(null);
  const [verTodo, setVerTodo] = useState(false);
  const [notas, setNotas] = useState("");
  const [notasGuardadas, setNotasGuardadas] = useState(true);
  const tocoNotas = useRef(false);
  const notasRef = useRef("");
  notasRef.current = notas;

  const traer = useCallback(async () => {
    try {
      const d = await pedirCaso(id);
      setE(d);
      setError("");
      if (!tocoNotas.current) setNotas(d.notas_abogado || "");
    } catch (err) {
      setError(err?.response?.status === 404 ? "Ese caso no existe o no es tuyo." : mensajeError(err, "No se pudo abrir el caso."));
    }
  }, [id]);

  useEffect(() => {
    traer();
  }, [traer]);
  useDatosVivos(["legales"], () => traer());

  const volver = () => volverOIr(navigate, "/legales/casos");
  const cerrar = () => setHoja(null);
  /** Después de cada cosa que se guarda: el caso ya actualizado, el cartelito y refrescar lo demás. */
  const alListo = (nuevo, mensaje) => {
    if (nuevo?.id) setE(nuevo);
    else traer();
    setHoja(null);
    if (mensaje) toast.success(mensaje);
    cargar?.();
  };
  const intentar = async (fn, mensaje) => {
    try {
      const nuevo = await fn();
      alListo(nuevo, mensaje);
      return true;
    } catch (err) {
      toast.error(mensajeError(err));
      return false;
    }
  };

  if (error && !e) {
    return (
      <>
        <BarraVolver titulo="Caso" onVolver={volver} />
        <p className="m-4 rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-4 text-[14.5px] font-semibold text-duo-rojo dark:text-red-300">{error}</p>
      </>
    );
  }
  if (!e) {
    return (
      <>
        <BarraVolver titulo="Caso" onVolver={volver} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
          <Cargando alto="h-24" />
          <Cargando alto="h-14" />
          <Cargando alto="h-64" />
        </div>
      </>
    );
  }

  const abierto = ABIERTOS.includes(e.estado);
  const puede = e.puede || {};
  const estado = estadoDe(e);
  const fechas = e.vencimientos || [];
  const pendientes = fechas.filter((f) => !f.cumplido);
  const proxima = pendientes[0] || null;
  const hechas = fechas.filter((f) => f.cumplido);
  const turnos = (e.turnos || []).filter((t) => t.activo);
  const movs = e.movimientos || [];
  const tonoProx = proxima ? tonoDeFecha(proxima) : "neutro";
  const motivo = motivoDe(catalogo, e.motivo);
  const respuestas = motivo ? preguntasDe(motivo, e.respuestas || {}).filter((p) => (e.respuestas || {})[p.key]) : [];
  const link = linkCaso(e);
  const wa = linkWhatsApp(e.persona_telefono, "");
  const tel = linkTel(e.persona_telefono);
  const p = e.plata || null;

  const marcarHecha = (f) => intentar(() => editarFecha(e.id, f.id, { cumplido: true }), "Hecho ✔");
  const subirPapel = async (file, papel) => {
    try {
      const arch = await subirArchivo(file, "legales/papeles");
      await intentar(() => guardarDocumento(e.id, { ...arch, tipo: "PAPEL", papel: papel || "" }), `Subido: ${arch.nombre}`);
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo subir el archivo."));
    }
  };
  const borrarArchivo = (d) => {
    if (!window.confirm(`¿Borrar «${d.nombre}»? No se puede deshacer.`)) return;
    intentar(() => borrarDocumento(e.id, d.id), "Archivo borrado");
  };
  // Las notas se guardan solas al salir del cuadro. OJO: no pasa por alListo, que
  // cierra la hoja abierta (si tocó «Anotar» justo después de escribir, se le cerraba).
  const guardarNotas = async () => {
    if (notasGuardadas) return;
    const mandado = notas;
    try {
      const nuevo = await editarCaso(e.id, { notas_abogado: mandado });
      if (nuevo?.id) setE(nuevo);
      // Si siguió escribiendo mientras se guardaba, lo nuevo queda pendiente.
      if (notasRef.current === mandado) {
        setNotasGuardadas(true);
        tocoNotas.current = false;
      }
    } catch (err) {
      toast.error(mensajeError(err, "No se pudieron guardar las notas."));
    }
  };
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast("Copialo a mano: mantené apretado el link.");
    }
  };
  const marcarTurno = async (t, est) => {
    try {
      await cambiarEstadoTurno(t.id, est);
    } catch (err) {
      throw new Error(mensajeError(err));
    }
    toast.success(est === "ATENDIDO" ? "Turno atendido" : est === "CANCELADO" ? "Turno cancelado" : "Anotado: no vino");
    setHoja(null);
    traer();
    cargar?.();
  };

  return (
    <div className="pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <BarraVolver
        titulo={caratulaCorta(e)}
        sub={[e.motivo_titulo || e.tema_nombre, e.expediente_judicial || e.numero].filter(Boolean).join(" · ")}
        onVolver={volver}
        derecha={
          puede.editar_todo ? (
            <button type="button" onClick={() => setHoja({ tipo: "datos" })} aria-label="Editar los datos del caso" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark ${foco}`}>
              <HiOutlinePencilSquare className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null
        }
      />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 px-4 pt-3.5">
        {/* En qué estado está */}
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta o={estado} punto />
          {e.instancia ? <Etiqueta o={e.instancia} /> : null}
          {(e.etiquetas || []).map((q) => (
            <Etiqueta key={q.id} o={q} />
          ))}
          {e.propio ? <span className={`text-[13px] font-semibold ${suave}`}>Caso propio</span> : e.oficina_nombre ? <span className={`text-[13px] font-semibold ${suave}`}>Te lo pasó {e.oficina_nombre}</span> : null}
        </div>

        {/* Lo próximo */}
        {abierto ? (
          proxima ? (
            <div className={`flex items-center gap-3 rounded-2xl p-3.5 ${tonoProx === "neutro" ? "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark" : cajaDeTono(tonoProx)}`}>
              <IconoRedondo icono={tonoProx === "rojo" ? HiOutlineExclamationTriangle : HiOutlineClock} tono={tonoProx === "neutro" ? tipoFecha(proxima.tipo).tono : "neutro"} />
              <button type="button" onClick={() => setHoja({ tipo: "fecha", fecha: proxima })} className={`flex min-w-0 flex-1 flex-col rounded-lg text-left ${foco}`}>
                <span className={`text-[12px] font-bold ${suave}`}>Lo próximo</span>
                <span className="break-words text-[15.5px] font-extrabold leading-snug text-titulo dark:text-titulo-dark">{proxima.titulo}</span>
                <span className={`text-[13px] font-bold ${tonoProx === "neutro" ? suave : TONO_TEXTO[tonoProx]}`}>
                  {venceTxt(proxima)}
                  {proxima.plazo ? ` · plazo de ${proxima.plazo.split(" desde")[0]}` : ""}
                </span>
              </button>
              {puede.marcar_fechas ? (
                <button type="button" onClick={() => marcarHecha(proxima)} aria-label={`Ya se hizo: ${proxima.titulo}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-current bg-card dark:bg-card-dark text-duo-verde-sombra dark:text-green-400 ${foco}`}>
                  <HiOutlineCheck className="h-5 w-5" strokeWidth={2.8} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-linea dark:border-linea-dark p-3.5">
              <IconoRedondo icono={HiOutlineCalendarDays} tono="neutro" />
              <span className={`flex-1 text-[14.5px] ${suave}`}>Este caso no tiene nada agendado.</span>
            </div>
          )
        ) : (
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-700/50 p-3.5 text-[14.5px] font-semibold text-titulo dark:text-titulo-dark">Este caso está {e.estado === "DESISTIDO" ? "desistido" : "cerrado"}.</div>
        )}

        {/* Los tres botones */}
        <div className="grid grid-cols-[1.15fr_1fr_1fr] gap-2">
          <Boton chico icono={HiOutlinePencilSquare} onClick={() => setHoja({ tipo: "anotar" })} className="!gap-1.5 !px-2 !text-[15px]">
            Anotar
          </Boton>
          <Boton chico tono="blanco" icono={HiOutlineCalendarDays} onClick={() => setHoja({ tipo: "fecha" })} disabled={!puede.fechas} className="!gap-1.5 !px-2 !text-[15px]">
            Agendar
          </Boton>
          <Boton chico tono="blanco" icono={HiOutlineArrowsRightLeft} onClick={() => setHoja({ tipo: "mover" })} disabled={!puede.cambiar_estado} className="!gap-1.5 !px-2 !text-[15px]">
            Mover
          </Boton>
        </div>

        {/* En qué anda */}
        <Tarjeta>
          <CabeceraTarjeta titulo="En qué anda">
            {puede.listas ? (
              <button type="button" onClick={() => navigate("/legales/listas")} className={linkCls}>
                Editar estados
              </button>
            ) : null}
          </CabeceraTarjeta>
          {(e.pasos_propios || []).length ? <Camino pasos={e.pasos_propios} /> : <p className={`px-3.5 pb-3.5 pt-2 text-[14.5px] ${suave}`}>Todavía no armaste tus estados.</p>}
          <p className={`border-t border-slate-100 dark:border-slate-700/70 px-3.5 py-2.5 text-[13px] ${suave}`}>
            La oficina lo ve como <b className="font-bold text-titulo dark:text-titulo-dark">{e.estado_nombre}</b>.
          </p>
        </Tarjeta>

        {/* Datos */}
        <Tarjeta>
          <CabeceraTarjeta titulo="Datos">
            {puede.editar_todo ? (
              <button type="button" onClick={() => setHoja({ tipo: "datos" })} className={linkCls}>
                Editar
              </button>
            ) : null}
          </CabeceraTarjeta>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 px-3.5 pb-2 pt-1">
            <FilaDato label="Carátula">{e.caratula}</FilaDato>
            <FilaDato label="Cliente">
              {e.persona_nombre}
              {e.persona_dni ? <span className={`font-normal ${suave}`}> · DNI {e.persona_dni}</span> : null}
            </FilaDato>
            <FilaDato label="Contraparte">{e.contraparte}</FilaDato>
            <FilaDato label="Juzgado">{e.juzgado}</FilaDato>
            <FilaDato label="N° de expte.">{e.expediente_judicial}</FilaDato>
            <FilaDato label="Tema">{[e.tema_nombre, e.motivo_titulo].filter(Boolean).join(" · ")}</FilaDato>
            <FilaDato label="N° en THAMES">{e.numero}</FilaDato>
          </div>
          {e.persona_telefono ? (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-700/70 p-3">
              <a href={wa} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-green-700 hover:bg-green-800 text-[15px] font-extrabold text-white ${foco}`}>
                <HiOutlineChatBubbleOvalLeft className="h-5 w-5" aria-hidden="true" /> WhatsApp
              </a>
              <a href={tel} className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 text-[15px] font-extrabold text-titulo dark:text-titulo-dark ${foco}`}>
                <HiOutlinePhone className="h-5 w-5" aria-hidden="true" /> {e.persona_telefono}
              </a>
            </div>
          ) : null}
          {e.relato || respuestas.length ? (
            <details className="border-t border-slate-100 dark:border-slate-700/70 px-3.5 py-2.5">
              <summary className={`cursor-pointer text-[14px] font-extrabold text-duo-violeta-sombra dark:text-[#a5a0ff] ${foco} rounded`}>{e.propio ? "De qué se trata" : "Lo que contó el cliente"}</summary>
              {e.relato ? <p className="whitespace-pre-wrap break-words pt-2 text-[14.5px] text-titulo dark:text-titulo-dark">{e.relato}</p> : null}
              {respuestas.length ? (
                <dl className="flex flex-col gap-1 pt-2">
                  {respuestas.map((q) => (
                    <div key={q.key} className="flex flex-wrap gap-x-2 text-[14px]">
                      <dt className={suave}>{q.texto}</dt>
                      <dd className="font-semibold text-titulo dark:text-titulo-dark">{respuestaTxt(q, e.respuestas[q.key])}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </details>
          ) : null}
        </Tarjeta>

        {/* Fechas */}
        <Tarjeta>
          <CabeceraTarjeta titulo="Fechas" n={pendientes.length || null}>
            {puede.fechas ? (
              <button type="button" onClick={() => setHoja({ tipo: "fecha" })} className={linkCls}>
                <HiOutlinePlus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" /> Agendar
              </button>
            ) : null}
          </CabeceraTarjeta>
          {fechas.length ? (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 pt-1">
              {[...pendientes, ...hechas.slice(0, verTodo ? 50 : 2)].map((f) => (
                <FilaAgenda key={f.id} item={{ clase: "fecha", f }} conCaso={false} onTocar={() => setHoja({ tipo: "fecha", fecha: f })} />
              ))}
            </div>
          ) : (
            <p className={`px-3.5 pb-3.5 pt-2 text-[14.5px] ${suave}`}>Sin fechas. Agendá una audiencia o contá un plazo.</p>
          )}
        </Tarjeta>

        {/* Turnos con el cliente */}
        {turnos.length || (abierto && puede.turno) ? (
          <Tarjeta>
            <CabeceraTarjeta titulo="Turnos con el cliente" n={turnos.length || null}>
              {abierto && puede.turno ? (
                <button type="button" onClick={() => setHoja({ tipo: "dar-turno" })} className={linkCls}>
                  <HiOutlinePlus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" /> Dar turno
                </button>
              ) : null}
            </CabeceraTarjeta>
            {turnos.length ? (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 pt-1">
                {juntarAgenda([], turnos.map((t) => ({ ...t, persona: e.persona_nombre }))).map((x) => (
                  <FilaAgenda key={x.id} item={x} onTocar={() => setHoja({ tipo: "turno", t: x.t })} />
                ))}
              </div>
            ) : (
              <p className={`px-3.5 pb-3.5 pt-2 text-[14.5px] ${suave}`}>Sin turnos. Dale uno en un horario libre de tu agenda.</p>
            )}
          </Tarjeta>
        ) : null}

        {/* Movimientos */}
        <Tarjeta>
          <CabeceraTarjeta titulo="Movimientos" n={movs.length || null}>
            <button type="button" onClick={() => setHoja({ tipo: "anotar" })} className={linkCls}>
              <HiOutlinePlus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" /> Anotar
            </button>
          </CabeceraTarjeta>
          {movs.length ? (
            <ol className="flex flex-col px-3.5 pb-1 pt-2">
              {movs.slice(0, verTodo ? 300 : MOVS_A_LA_VISTA).map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="flex w-2.5 shrink-0 flex-col items-center" aria-hidden="true">
                    <span className={`mt-[7px] h-2.5 w-2.5 rounded-full ${m.estado_despues ? "bg-duo-violeta" : m.tipo ? "bg-duo-amarillo" : "bg-slate-300 dark:bg-slate-600"}`} />
                    <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-3.5">
                    <span className={`flex flex-wrap items-center gap-x-2 text-[12.5px] ${suave}`}>
                      <span className="tabular-nums">{ddmm(m.fecha)}</span>
                      {m.tipo ? <span className="rounded bg-slate-100 dark:bg-slate-700/60 px-1.5 text-[11.5px] font-bold text-slate-700 dark:text-slate-200">{m.tipo}</span> : null}
                      <span className="truncate">{m.autor}</span>
                      {m.visible_cliente ? <HiOutlineEye className="h-3.5 w-3.5" aria-label="Lo ve el cliente" /> : null}
                      {m.con_plata ? <HiOutlineLockClosed className="h-3.5 w-3.5" aria-label="Solo vos y el admin" /> : null}
                    </span>
                    <p className="whitespace-pre-wrap break-words text-[14.5px] text-titulo dark:text-titulo-dark">{m.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={`px-3.5 pb-3.5 pt-2 text-[14.5px] ${suave}`}>Todavía no hay nada anotado.</p>
          )}
          {movs.length > MOVS_A_LA_VISTA || hechas.length > 2 ? (
            <button type="button" onClick={() => setVerTodo((x) => !x)} className={`${linkCls} mx-2 mb-2 self-start`}>
              {verTodo ? "Ver menos" : `Ver todo (${movs.length} movimientos${hechas.length > 2 ? ` y ${hechas.length} fechas hechas` : ""})`}
            </button>
          ) : null}
        </Tarjeta>

        {/* Papeles */}
        <Tarjeta>
          <CabeceraTarjeta titulo="Papeles" n={(e.documentos || []).filter((d) => d.tipo === "PAPEL").length || null} />
          <div className="p-3.5 pt-2.5">
            <ExpedienteDocumentosPanel e={e} onSubir={subirPapel} onBorrar={borrarArchivo} onPapeles={(lista) => intentar(() => editarCaso(e.id, { papeles: lista }), "Papeles actualizados")} celu />
          </div>
        </Tarjeta>

        {/* Honorarios (solo él y el admin) */}
        {p ? (
          <Tarjeta>
            <CabeceraTarjeta
              titulo={
                <>
                  Honorarios <HiOutlineLockClosed className={`h-4 w-4 ${suave}`} aria-label="Lo ves vos y el admin" />
                </>
              }
            >
              {p.puede_cargar ? (
                <button type="button" onClick={() => setHoja({ tipo: "honorarios" })} className={linkCls}>
                  {p.honorarios ? "Cambiar" : "Cargar"}
                </button>
              ) : null}
            </CabeceraTarjeta>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 px-3.5 pb-2 pt-1">
              <FilaDato label="Pactado">{p.honorarios_pactados}</FilaDato>
              <FilaDato label="Cobraste" vacio="Todavía no cargaste nada">
                {p.honorarios ? plata(p.honorarios) : ""}
              </FilaDato>
              <FilaDato label="Para THAMES" vacio={e.propio ? "Nada: es un caso tuyo" : "—"}>
                {!e.propio && Number(p.comision_pct) > 0 ? `${fmtPct(p.comision_pct)}${p.comision ? ` · ${plata(p.comision)}${p.comision_cobrada ? " (ya pagado)" : ""}` : ""}` : ""}
              </FilaDato>
            </div>
          </Tarjeta>
        ) : null}

        {/* Notas privadas */}
        {e.notas_abogado !== undefined ? (
          <Tarjeta>
            <CabeceraTarjeta
              titulo={
                <>
                  Tus notas <HiOutlineLockClosed className={`h-4 w-4 ${suave}`} aria-label="Privadas" />
                </>
              }
            >
              <span className={`text-[12.5px] ${suave}`} aria-live="polite">
                {notasGuardadas ? "" : "Sin guardar"}
              </span>
            </CabeceraTarjeta>
            <div className="flex flex-col gap-2 p-3.5 pt-2">
              <label htmlFor="notas-priv" className="sr-only">
                Notas privadas del caso
              </label>
              <textarea
                id="notas-priv"
                rows={4}
                value={notas}
                maxLength={20000}
                onChange={(ev) => {
                  tocoNotas.current = true;
                  setNotas(ev.target.value);
                  setNotasGuardadas(false);
                }}
                onBlur={guardarNotas}
                placeholder="Estrategia, testigos, qué falta pedirle al cliente… Solo las ves vos."
                className="w-full resize-y rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 bg-card dark:bg-card-dark px-3 py-2.5 text-[15.5px] text-titulo dark:text-titulo-dark outline-none placeholder:text-suave dark:placeholder:text-suave-dark focus:border-duo-violeta"
              />
              {!notasGuardadas ? (
                <button type="button" onClick={guardarNotas} className={`min-h-[44px] self-end rounded-xl bg-duo-violeta px-4 text-[15px] font-extrabold text-white ${foco}`}>
                  Guardar las notas
                </button>
              ) : null}
            </div>
          </Tarjeta>
        ) : null}

        {/* El link del cliente */}
        {link ? (
          <Tarjeta>
            <CabeceraTarjeta titulo="El link del cliente" />
            <div className="flex flex-col gap-2 p-3.5 pt-2">
              <p className={`text-[13.5px] ${suave}`}>En «Mi caso» ve en qué etapa está, las fechas y las anotaciones que dejás a la vista. Nunca ve la plata ni tus notas.</p>
              <span className="select-all break-all rounded-lg bg-surface dark:bg-surface-dark px-2.5 py-2 text-[13px] text-titulo dark:text-titulo-dark">{link}</span>
              <button type="button" onClick={copiarLink} className={`inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl border-[1.5px] border-slate-300 dark:border-slate-600 px-3.5 text-[14.5px] font-extrabold text-titulo dark:text-titulo-dark ${foco}`}>
                <HiOutlineClipboardDocument className="h-5 w-5" aria-hidden="true" /> Copiar el link
              </button>
            </div>
          </Tarjeta>
        ) : null}

        <p className={`flex items-center gap-1.5 px-1 text-[12.5px] ${suave}`}>
          <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden="true" /> Los movimientos no se borran: quedan como historial del caso.
        </p>
      </main>

      <HojaAnotar abierto={hoja?.tipo === "anotar"} e={e} tipos={catalogo?.tipos_movimiento || []} onCerrar={cerrar} onListo={alListo} />
      <HojaFecha abierto={hoja?.tipo === "fecha"} caso={e} fecha={hoja?.tipo === "fecha" ? hoja.fecha || null : null} onCerrar={cerrar} onListo={alListo} puedeBorrar={!!puede.borrar} />
      <HojaMover
        abierto={hoja?.tipo === "mover"}
        e={e}
        listas={listas}
        etapas={catalogo?.estados || []}
        onCerrar={cerrar}
        onListas={(r) => setListas?.((l) => ({ ...(l || {}), ESTADO: r.ESTADO, INSTANCIA: r.INSTANCIA, ETIQUETA: r.ETIQUETA }))}
        onListo={(nuevo, mensaje) => {
          alListo(nuevo, mensaje);
          // Recién cobrado y sin honorarios: se le pide cuánto cobró (como antes).
          if (nuevo?.estado === "COBRADO" && nuevo.plata?.puede_cargar && !nuevo.plata?.honorarios && Number(nuevo.plata?.comision_pct) > 0) setHoja({ tipo: "honorarios" });
        }}
      />
      <HojaDatos abierto={hoja?.tipo === "datos"} e={e} listas={listas} temas={catalogo?.temas || []} onCerrar={cerrar} onListo={alListo} />
      <ModalHonorarios
        e={hoja?.tipo === "honorarios" ? e : null}
        abierto={hoja?.tipo === "honorarios"}
        onCerrar={cerrar}
        onGuardar={async (body, pactado) => {
          let nuevo = await cargarHonorarios(e.id, body);
          if (pactado !== null && pactado !== undefined) nuevo = await editarCaso(e.id, { honorarios_pactados: pactado });
          alListo(nuevo, "Honorarios guardados");
        }}
      />
      <HojaTurno abierto={hoja?.tipo === "turno"} t={hoja?.tipo === "turno" ? hoja.t : null} onCerrar={cerrar} onEstado={marcarTurno} />
      <ModalTurno
        e={hoja?.tipo === "dar-turno" ? e : null}
        abogados={abogados || []}
        temas={catalogo?.temas || []}
        abierto={hoja?.tipo === "dar-turno"}
        onCerrar={cerrar}
        onDar={async (body) => {
          const r = await darTurno({ expediente: e.id, ...body });
          setE(r.expediente);
          cargar?.();
          return r.expediente;
        }}
      />
    </div>
  );
}
