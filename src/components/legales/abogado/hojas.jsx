// src/components/legales/abogado/hojas.jsx
//
// 📝 Las "hojas" de la APP DEL ABOGADO (05/10): las ventanitas que suben desde abajo
// para hacer UNA cosa y volver.
//   HojaAnotar      qué pasó (escrito, notificación…) y, si corre un plazo, lo agenda solo
//   HojaFecha       agendar una fecha (un día, o "5 días hábiles desde…") · cambiarla · «Ya se hizo»
//   HojaMover       pasar el caso a cualquiera de SUS estados (o crear uno nuevo ahí mismo)
//   HojaDatos       carátula, juzgado, instancia, etiquetas y los datos del cliente
//   HojaCasoNuevo   cargar un caso propio (alcanza con el nombre del cliente)
//   HojaPlazos      la calculadora de plazos suelta
//   HojaElegirCaso  "¿En qué caso?" (para Anotar y Agendar desde el inicio)
//   HojaTurno       un turno: atendido · no vino
//   HojaBloquear    "No puedo un día" · HojaPerfil  sus datos de contacto
// Cada una guarda sola y avisa con onListo(caso actualizado) para que la pantalla se refresque.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineArrowsRightLeft,
  HiOutlineCalculator,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineFolderPlus,
  HiOutlineMagnifyingGlass,
  HiOutlineNoSymbol,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import ModalDuo from "../../ui/ModalDuo";
import {
  agregarFecha,
  anotar,
  bloquearDia,
  borrarFecha,
  calcularPlazo,
  crearCasoPropio,
  crearOpcion,
  editarCaso,
  editarFecha,
  mensajeError,
  moverCaso,
} from "../../../services/legales";
import { diaCorto, hoyYmd } from "../legalesUtils";
import { TIPOS_FECHA, caratulaCorta, coincideCaso, estadoDe, foco, inputCls, linkCls, suave } from "./abogadoUtils";
import { Boton, Campo, CartelError, Etiqueta, Pastillas, Tilde } from "./piezasAbogado";

const OPCIONES_TIPO_FECHA = Object.entries(TIPOS_FECHA).map(([id, t]) => ({ id, nombre: t.nombre }));
const soloNumero = (v, max = 365) => {
  const n = String(v || "").replace(/\D/g, "").replace(/^0+/, "").slice(0, 3);
  return n && Number(n) > max ? String(max) : n;
};

/** Corre `fn`, con el "Guardando…" y el cartel de error. */
function useGuardar() {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const correr = async (fn) => {
    if (guardando) return;
    setGuardando(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };
  return { guardando, error, setError, correr };
}

function Pie({ onCerrar, onGuardar, guardando, texto = "Guardar", tono = "violeta", deshabilitado = false }) {
  return (
    <>
      <Boton tono="blanco" chico onClick={onCerrar} className="sm:w-auto">
        Volver
      </Boton>
      <Boton tono={tono} chico onClick={onGuardar} disabled={guardando || deshabilitado} className="sm:w-auto">
        {guardando ? "Guardando…" : texto}
      </Boton>
    </>
  );
}

/**
 * ⏳ El plazo lo cuenta el SERVIDOR (con los feriados): acá se le pregunta cada vez
 * que cambia algo y se muestra "Vence el martes 13/10".
 */
function usePlazo(activo, desde, dias, habiles) {
  const [r, setR] = useState({ clave: "", datos: null, error: "" });
  const clave = activo && Number(dias) > 0 ? `${desde}|${dias}|${habiles ? 1 : 0}` : "";
  useEffect(() => {
    if (!clave) return undefined;
    let vivo = true;
    const t = setTimeout(() => {
      calcularPlazo({ desde, dias: Number(dias), habiles: habiles ? 1 : 0 })
        .then((d) => vivo && setR({ clave, datos: d, error: "" }))
        .catch((e) => vivo && setR({ clave, datos: null, error: mensajeError(e, "No se pudo calcular el plazo.") }));
    }, 200);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [clave, desde, dias, habiles]);
  if (!clave) return { datos: null, error: "", calculando: false };
  const vigente = r.clave === clave;
  return { datos: vigente ? r.datos : null, error: vigente ? r.error : "", calculando: !vigente };
}

/** "[ 5 ] [días hábiles ▾] desde el [05/10/2026]  →  Vence el martes 13/10" */
function BloquePlazo({ id, dias, setDias, habiles, setHabiles, desde, setDesde, etiquetaDesde = "Desde el día siguiente a", plazo }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-n`} className="sr-only">
          Cantidad de días
        </label>
        <input
          id={`${id}-n`}
          inputMode="numeric"
          value={dias}
          onChange={(e) => setDias(soloNumero(e.target.value))}
          className={`${inputCls} !w-[76px] text-center font-bold tabular-nums`}
        />
        <label htmlFor={`${id}-h`} className="sr-only">
          Tipo de días
        </label>
        <select id={`${id}-h`} value={habiles ? "1" : "0"} onChange={(e) => setHabiles(e.target.value === "1")} className={`${inputCls} flex-1`}>
          <option value="1">días hábiles</option>
          <option value="0">días corridos</option>
        </select>
      </div>
      <label htmlFor={`${id}-d`} className="flex flex-col gap-1 text-[13px] font-bold text-titulo dark:text-titulo-dark">
        {etiquetaDesde}
        <input id={`${id}-d`} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
      </label>
      <p className="min-h-[22px] text-[15px] text-titulo dark:text-titulo-dark" aria-live="polite">
        {plazo.error ? (
          <span className="font-semibold text-duo-rojo dark:text-red-300">{plazo.error}</span>
        ) : plazo.datos ? (
          <>
            {plazo.datos.ya_paso ? "Venció el " : "Vence el "}
            <strong className={plazo.datos.ya_paso ? "text-duo-rojo dark:text-red-300" : "text-duo-amarillo-sombra dark:text-amber-300"}>{plazo.datos.texto}</strong>
          </>
        ) : Number(dias) > 0 && desde ? (
          <span className={suave}>Calculando…</span>
        ) : (
          <span className={suave}>Poné cuántos días son.</span>
        )}
      </p>
      <p className="text-[12.5px] text-slate-600 dark:text-slate-300">
        {habiles ? "No cuenta sábados, domingos ni feriados." : "Si cae sábado, domingo o feriado, pasa al día hábil que sigue."} La feria judicial no se descuenta.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaAnotar({ e, tipos = [], abierto, onCerrar, onListo }) {
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  const [visible, setVisible] = useState(false);
  const [soloAdmin, setSoloAdmin] = useState(false);
  const [conPlazo, setConPlazo] = useState(false);
  const [dias, setDias] = useState("5");
  const [habiles, setHabiles] = useState(true);
  const [desde, setDesde] = useState(hoyYmd());
  const [que, setQue] = useState("");
  const hecho = useRef({});
  const { guardando, error, setError, correr } = useGuardar();
  const plazo = usePlazo(abierto && conPlazo, desde, dias, habiles);

  useEffect(() => {
    if (!abierto) return;
    setTipo("");
    setTexto("");
    setVisible(false);
    setSoloAdmin(false);
    setConPlazo(false);
    setDias("5");
    setHabiles(true);
    setDesde(hoyYmd());
    setQue("");
    setError("");
    hecho.current = {};
  }, [abierto, e?.id, setError]);

  if (!e) return null;
  const guardar = () => {
    const t = texto.trim();
    if (!t) return setError("Escribí qué pasó.");
    if (conPlazo && !(Number(dias) > 0)) return setError("Poné de cuántos días es el plazo.");
    if (conPlazo && !desde) return setError("Elegí desde qué día corre el plazo.");
    return correr(async () => {
      let nuevo = null;
      // Primero la fecha: si el plazo está mal (ej: ya venció), todavía no se guardó nada.
      if (conPlazo && !hecho.current.fecha) {
        nuevo = await agregarFecha(e.id, { titulo: que.trim() || "Vence el plazo", tipo: "PLAZO", plazo_dias: Number(dias), plazo_habiles: habiles, plazo_desde: desde });
        hecho.current.fecha = true;
      }
      if (!hecho.current.nota) {
        nuevo = await anotar(e.id, { texto: t, tipo, visible: visible && !soloAdmin, solo_admin: soloAdmin });
        hecho.current.nota = true;
      }
      onListo(nuevo, conPlazo && plazo.datos ? `Anotado. El plazo vence el ${plazo.datos.texto}.` : "Anotado");
    });
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlinePencilSquare />}
      iconTono="violeta"
      title="Anotar"
      subtitle={caratulaCorta(e)}
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} texto="Anotar" />}
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <Campo label="¿Qué fue?" opcional>
          <Pastillas opciones={tipos.map((x) => ({ id: x, nombre: x }))} valor={tipo} onCambiar={setTipo} etiqueta="Tipo de anotación" />
        </Campo>
        <Campo label="Contalo en una línea" htmlFor="an-texto">
          <textarea
            id="an-texto"
            rows={3}
            maxLength={2000}
            value={texto}
            onChange={(ev) => {
              setError("");
              setTexto(ev.target.value);
            }}
            placeholder="Ej: Nos notificaron la pericia médica. Traslado por 5 días."
            className={`${inputCls} resize-none py-2.5`}
          />
        </Campo>
        <Tilde id="an-plazo" checked={conPlazo} onChange={setConPlazo}>
          Corre un plazo
        </Tilde>
        {conPlazo ? (
          <>
            <BloquePlazo id="an" dias={dias} setDias={setDias} habiles={habiles} setHabiles={setHabiles} desde={desde} setDesde={setDesde} etiquetaDesde="Desde el día siguiente a la notificación" plazo={plazo} />
            <Campo label="¿Qué hay que hacer antes de esa fecha?" htmlFor="an-que" ayuda="Queda en tu agenda con ese nombre.">
              <input id="an-que" value={que} maxLength={150} onChange={(ev) => setQue(ev.target.value)} placeholder="Ej: Contestar el traslado" className={inputCls} />
            </Campo>
          </>
        ) : null}
        <Tilde id="an-vis" checked={visible && !soloAdmin} onChange={setVisible} disabled={soloAdmin}>
          Que el cliente lo vea en su link «Mi caso»
        </Tilde>
        {/* Un caso derivado por una oficina: lo que tiene montos, la oficina no lo lee. */}
        {e.ve_plata && !e.propio ? (
          <Tilde id="an-adm" checked={soloAdmin} onChange={setSoloAdmin}>
            Tiene montos: que no lo vea la oficina (solo vos y la administración)
          </Tilde>
        ) : null}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Agendar una fecha nueva, o abrir una que ya está (cambiarla, «Ya se hizo», borrarla).
 *   caso     { id, caratula } (el caso al que pertenece)
 *   fecha    la fecha a editar (o null si es nueva)
 *   inicial  { fecha?, plazo?: {dias, habiles, desde} } para arrancar ya cargada
 */
export function HojaFecha({ caso, fecha = null, inicial = null, abierto, onCerrar, onListo, onVerCaso = null, puedeBorrar = true }) {
  const editar = !!fecha;
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("PLAZO");
  const [modo, setModo] = useState("dia"); // dia | plazo
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [dias, setDias] = useState("5");
  const [habiles, setHabiles] = useState(true);
  const [desde, setDesde] = useState(hoyYmd());
  const [detalle, setDetalle] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirmaBorrar, setConfirmaBorrar] = useState(false);
  const { guardando, error, setError, correr } = useGuardar();
  const plazo = usePlazo(abierto && !editar && modo === "plazo", desde, dias, habiles);

  useEffect(() => {
    if (!abierto) return;
    setError("");
    setConfirmaBorrar(false);
    if (fecha) {
      setTitulo(fecha.titulo || "");
      setTipo(fecha.tipo || "");
      setModo("dia");
      setDia(fecha.fecha || "");
      setHora(fecha.hora || "");
      setDetalle(fecha.detalle || "");
      setVisible(!!fecha.visible_cliente);
    } else {
      setTitulo("");
      setTipo("PLAZO");
      setModo(inicial?.plazo ? "plazo" : "dia");
      setDia(inicial?.fecha || "");
      setHora("");
      setDias(String(inicial?.plazo?.dias || "5"));
      setHabiles(inicial?.plazo?.habiles !== false);
      setDesde(inicial?.plazo?.desde || hoyYmd());
      setDetalle("");
      setVisible(false);
    }
  }, [abierto, fecha, inicial, setError]);

  if (!caso) return null;

  const guardar = () => {
    const t = titulo.trim();
    if (!t) return setError("Escribí qué hay que hacer.");
    if (modo === "dia" && !dia) return setError("Elegí el día.");
    if (modo === "plazo" && !(Number(dias) > 0)) return setError("Poné de cuántos días es el plazo.");
    return correr(async () => {
      let nuevo;
      if (editar) {
        const body = { titulo: t, tipo, hora: hora || null, detalle: detalle.trim(), visible_cliente: visible };
        if (dia !== fecha.fecha) body.fecha = dia;
        nuevo = await editarFecha(caso.id, fecha.id, body);
        onListo(nuevo, "Fecha guardada");
      } else {
        const body = { titulo: t, tipo, hora: modo === "dia" ? hora || null : null, detalle: detalle.trim(), visible_cliente: visible };
        if (modo === "plazo") Object.assign(body, { plazo_dias: Number(dias), plazo_habiles: habiles, plazo_desde: desde || hoyYmd() });
        else body.fecha = dia;
        nuevo = await agregarFecha(caso.id, body);
        const cuando = modo === "plazo" ? plazo.datos?.texto : diaCorto(dia);
        onListo(nuevo, cuando ? `Agendado para el ${cuando}` : "Agendado");
      }
    });
  };
  const marcar = (cumplido) =>
    correr(async () => {
      const nuevo = await editarFecha(caso.id, fecha.id, { cumplido });
      onListo(nuevo, cumplido ? "Hecho ✔" : "Vuelve a estar pendiente");
    });
  const borrar = () =>
    correr(async () => {
      const nuevo = await borrarFecha(caso.id, fecha.id);
      onListo(nuevo, "Fecha borrada");
    });

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineCalendarDays />}
      iconTono="amarillo"
      title={editar ? "Fecha del caso" : "Agendar"}
      subtitle={caratulaCorta(caso)}
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} texto={editar ? "Guardar" : "Agendar"} />}
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        {editar ? (
          <div className="flex flex-col gap-2">
            {fecha.cumplido ? (
              <Boton tono="blanco" chico icono={HiOutlineArrowsRightLeft} onClick={() => marcar(false)} disabled={guardando}>
                Volver a dejarla pendiente
              </Boton>
            ) : (
              <Boton tono="verde" chico icono={HiOutlineCheck} onClick={() => marcar(true)} disabled={guardando}>
                Ya se hizo
              </Boton>
            )}
            {fecha.plazo ? <p className={`text-[13.5px] ${suave}`}>Se contó así: {fecha.plazo}.</p> : null}
          </div>
        ) : null}
        <Campo label="¿Qué hay que hacer?" htmlFor="fe-titulo">
          <input
            id="fe-titulo"
            value={titulo}
            maxLength={150}
            onChange={(ev) => {
              setError("");
              setTitulo(ev.target.value);
            }}
            placeholder="Ej: Contestar el traslado"
            className={inputCls}
          />
        </Campo>
        <Campo label="¿Qué es?">
          <Pastillas opciones={OPCIONES_TIPO_FECHA} valor={tipo} onCambiar={setTipo} etiqueta="Tipo de fecha" />
        </Campo>
        {!editar ? (
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-1" role="tablist" aria-label="Cómo se pone la fecha">
            {[
              ["dia", "Elegir el día"],
              ["plazo", "Contar un plazo"],
            ].map(([k, txt]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={modo === k}
                onClick={() => setModo(k)}
                className={`min-h-[42px] rounded-lg text-[14.5px] font-extrabold ${modo === k ? "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark shadow-sm" : suave} ${foco}`}
              >
                {txt}
              </button>
            ))}
          </div>
        ) : null}
        {modo === "plazo" && !editar ? (
          <BloquePlazo id="fe" dias={dias} setDias={setDias} habiles={habiles} setHabiles={setHabiles} desde={desde} setDesde={setDesde} plazo={plazo} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Día" htmlFor="fe-dia">
              <input id="fe-dia" type="date" min={editar ? undefined : hoyYmd()} value={dia} onChange={(ev) => setDia(ev.target.value)} className={inputCls} />
            </Campo>
            <Campo label="Hora" opcional htmlFor="fe-hora">
              <input id="fe-hora" type="time" value={hora} onChange={(ev) => setHora(ev.target.value)} className={inputCls} />
            </Campo>
          </div>
        )}
        <Campo label="Lugar o aclaración" opcional htmlFor="fe-det">
          <input id="fe-det" value={detalle} maxLength={200} onChange={(ev) => setDetalle(ev.target.value)} placeholder="Ej: Juzgado del Trabajo N° 3 · llevar el DNI" className={inputCls} />
        </Campo>
        <Tilde id="fe-vis" checked={visible} onChange={setVisible}>
          Que el cliente la vea en su link «Mi caso»
        </Tilde>
        {editar ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linea dark:border-linea-dark pt-3">
            {onVerCaso ? (
              <button type="button" onClick={onVerCaso} className={linkCls}>
                Ver el caso
              </button>
            ) : (
              <span />
            )}
            {puedeBorrar ? (
              confirmaBorrar ? (
                <span className="flex items-center gap-2 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
                  ¿Borrarla?
                  <button type="button" onClick={borrar} disabled={guardando} className={`min-h-[40px] rounded-lg bg-duo-rojo px-3 text-[14px] font-extrabold text-white ${foco}`}>
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmaBorrar(false)} className={linkCls}>
                    No
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmaBorrar(true)} className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-[14px] font-extrabold text-duo-rojo dark:text-red-400 ${foco}`}>
                  <HiOutlineTrash className="h-[18px] w-[18px]" aria-hidden="true" /> Borrar
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
/** "Mover a…": cualquier estado del estudio, en el orden que quiera. Y crear uno nuevo ahí mismo. */
export function HojaMover({ e, listas, etapas = [], abierto, onCerrar, onListo, onListas }) {
  const [elegido, setElegido] = useState(null);
  const [nota, setNota] = useState("");
  const [visible, setVisible] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [etapa, setEtapa] = useState("EN_TRAMITE");
  const { guardando, error, setError, correr } = useGuardar();
  const actual = e?.estado_propio?.id || null;

  useEffect(() => {
    if (!abierto) return;
    setElegido(null);
    setNota("");
    setVisible(true);
    setCreando(false);
    setNombre("");
    setEtapa(e?.estado && !["CERRADO", "DESISTIDO"].includes(e.estado) ? e.estado : "EN_TRAMITE");
    setError("");
  }, [abierto, e?.id, e?.estado, setError]);

  const estados = listas?.ESTADO || [];
  const enCurso = estados.filter((o) => !o.terminado);
  const finales = estados.filter((o) => o.terminado);
  const destino = estados.find((o) => o.id === elegido) || null;
  if (!e) return null;

  const mover = () => {
    if (!elegido) return setError("Tocá a qué estado lo pasás.");
    return correr(async () => {
      const nuevo = await moverCaso(e.id, { estado: elegido, nota: nota.trim(), visible });
      const o = estados.find((x) => x.id === elegido);
      onListo(nuevo, `Pasó a «${o?.nombre || "otro estado"}»`);
    });
  };
  const crear = () => {
    const n = nombre.trim();
    if (!n) return setError("Ponele un nombre al estado nuevo.");
    return correr(async () => {
      const r = await crearOpcion({ tipo: "ESTADO", nombre: n, etapa });
      onListas?.(r);
      setElegido(r.opcion.id);
      setCreando(false);
      setNombre("");
    });
  };
  const fila = (o) => {
    const esActual = o.id === actual;
    const on = o.id === elegido;
    return (
      <button
        key={o.id}
        type="button"
        role="radio"
        aria-checked={on}
        disabled={esActual}
        onClick={() => {
          setError("");
          setElegido(o.id);
          // Si no cambia de etapa, el cliente leería el NOMBRE de tu estado: por las dudas, arranca destildado.
          setVisible(o.etapa !== e.estado);
        }}
        className={`flex min-h-[48px] w-full items-center gap-2.5 rounded-xl border-[1.5px] px-3 text-left transition-colors ${
          on ? "border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]" : "border-transparent hover:bg-surface dark:hover:bg-surface-dark"
        } ${esActual ? "opacity-60" : ""} ${foco}`}
      >
        <Etiqueta o={o} punto />
        <span className={`ml-auto shrink-0 text-[12.5px] ${suave}`}>{esActual ? "está acá" : o.etapa_nombre}</span>
        {on ? <HiOutlineCheck className="h-5 w-5 shrink-0 text-duo-violeta-sombra dark:text-[#a5a0ff]" strokeWidth={2.6} aria-hidden="true" /> : null}
      </button>
    );
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineArrowsRightLeft />}
      iconTono="violeta"
      title="Mover a…"
      subtitle={`${caratulaCorta(e)} · hoy: ${estadoDe(e).nombre}`}
      footer={<Pie onCerrar={onCerrar} onGuardar={mover} guardando={guardando} texto="Mover" deshabilitado={creando} />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Estados">
          {enCurso.map(fila)}
        </div>
        {creando ? (
          <div className="flex flex-col gap-2.5 rounded-xl bg-surface dark:bg-surface-dark p-3">
            <Campo label="Nombre del estado nuevo" htmlFor="mv-nombre">
              <input id="mv-nombre" value={nombre} maxLength={60} autoFocus onChange={(ev) => setNombre(ev.target.value)} placeholder="Ej: Esperando al perito" className={inputCls} />
            </Campo>
            <Campo label="¿De qué etapa es?" htmlFor="mv-etapa" ayuda="La etapa es lo que lee el cliente. La oficina ve la etapa y también el nombre de tu estado.">
              <select id="mv-etapa" value={etapa} onChange={(ev) => setEtapa(ev.target.value)} className={inputCls}>
                {etapas.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-2">
              <Boton tono="blanco" chico onClick={() => setCreando(false)}>
                Cancelar
              </Boton>
              <Boton chico onClick={crear} disabled={guardando}>
                Crear
              </Boton>
            </div>
          </div>
        ) : listas?.puede_editar !== false ? (
          <button type="button" onClick={() => setCreando(true)} className={`${linkCls} self-start`}>
            <HiOutlinePlus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" /> Crear un estado nuevo
          </button>
        ) : null}
        {finales.length ? (
          <>
            <p className={`pt-1 text-[12.5px] font-extrabold uppercase tracking-wide ${suave}`}>Terminar el caso</p>
            <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Estados de cierre">
              {finales.map(fila)}
            </div>
          </>
        ) : null}
        <Campo label="Una nota" opcional htmlFor="mv-nota">
          <input id="mv-nota" value={nota} maxLength={500} onChange={(ev) => setNota(ev.target.value)} placeholder="Ej: Se abrió a prueba por 40 días" className={inputCls} />
        </Campo>
        <Tilde id="mv-vis" checked={visible} onChange={setVisible}>
          Que el cliente lo vea en su link «Mi caso»
        </Tilde>
        {visible && destino ? (
          <p className={`-mt-2 pl-1 text-[13px] ${suave}`}>
            {destino.etapa !== e.estado ? `Va a leer la etapa: «${destino.etapa_nombre}».` : `Va a leer: «Tu caso pasó a ${destino.nombre}».`}
          </p>
        ) : null}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaDatos({ e, listas, temas = [], abierto, onCerrar, onListo }) {
  const [f, setF] = useState({});
  const { guardando, error, setError, correr } = useGuardar();
  const inicial = useMemo(
    () =>
      e
        ? {
            caratula: e.caratula_escrita || "",
            contraparte: e.contraparte || "",
            juzgado: e.juzgado || "",
            expediente_judicial: e.expediente_judicial || "",
            instancia: e.instancia?.id || "",
            etiquetas: (e.etiquetas || []).map((x) => x.id),
            persona_nombre: e.persona_nombre_solo || "",
            persona_apellido: e.persona_apellido || "",
            persona_dni: e.persona_dni || "",
            persona_telefono: e.persona_telefono || "",
            tema: e.tema || "OTRO",
            // 🔒 Lo pactado con el cliente: solo si ve la plata de este caso.
            ...(e.plata ? { honorarios_pactados: e.plata.honorarios_pactados || "" } : {}),
          }
        : {},
    [e]
  );
  useEffect(() => {
    if (abierto) {
      setF(inicial);
      setError("");
    }
  }, [abierto, inicial, setError]);
  if (!e) return null;
  const set = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value }));

  const guardar = () => {
    if (!String(f.persona_nombre || "").trim() && !String(f.persona_apellido || "").trim()) return setError("Poné el nombre del cliente.");
    const body = {};
    Object.keys(inicial).forEach((k) => {
      const antes = inicial[k];
      const ahora = typeof f[k] === "string" ? f[k].trim() : f[k];
      if (k === "etiquetas") {
        if ([...antes].sort().join() !== [...(ahora || [])].sort().join()) body.etiquetas = ahora || [];
      } else if (k === "instancia") {
        if ((antes || "") !== (ahora || "")) body.instancia = ahora || null;
      } else if (antes !== ahora) body[k] = ahora;
    });
    if (!Object.keys(body).length) return onCerrar();
    return correr(async () => {
      const nuevo = await editarCaso(e.id, body);
      onListo(nuevo, "Datos guardados");
    });
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlinePencilSquare />}
      iconTono="violeta"
      title="Datos del caso"
      subtitle={e.numero}
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} />}
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <Campo label="Carátula" opcional htmlFor="da-car" ayuda="Si la dejás vacía se arma sola con el nombre del cliente.">
          <input id="da-car" value={f.caratula || ""} maxLength={250} onChange={set("caratula")} placeholder="Ej: GÓMEZ, María c/ PROVINCIA ART s/ Accidente" className={inputCls} />
        </Campo>
        <Campo label="Contraparte" opcional htmlFor="da-con">
          <input id="da-con" value={f.contraparte || ""} maxLength={150} onChange={set("contraparte")} placeholder="Ej: Provincia ART S.A." className={inputCls} />
        </Campo>
        <Campo label="Juzgado" opcional htmlFor="da-juz">
          <input id="da-juz" value={f.juzgado || ""} maxLength={150} onChange={set("juzgado")} placeholder="Ej: Juzgado del Trabajo N° 3 · La Plata" className={inputCls} />
        </Campo>
        <Campo label="N° de expediente" opcional htmlFor="da-exp">
          <input id="da-exp" value={f.expediente_judicial || ""} maxLength={60} onChange={set("expediente_judicial")} placeholder="Ej: LP-12345-2026" className={inputCls} />
        </Campo>
        <Campo label="Instancia">
          {(listas?.INSTANCIA || []).length ? (
            <Pastillas opciones={listas.INSTANCIA} valor={f.instancia || ""} onCambiar={(v) => setF((x) => ({ ...x, instancia: v }))} conColor etiqueta="Instancia" />
          ) : (
            <span className={`text-[14px] ${suave}`}>Todavía no hay instancias: crealas en «Estados y listas».</span>
          )}
        </Campo>
        <Campo label="Etiquetas">
          {(listas?.ETIQUETA || []).length ? (
            <Pastillas opciones={listas.ETIQUETA} valor={f.etiquetas || []} onCambiar={(v) => setF((x) => ({ ...x, etiquetas: v }))} varias conColor etiqueta="Etiquetas" />
          ) : (
            <span className={`text-[14px] ${suave}`}>Todavía no hay etiquetas: crealas en «Estados y listas».</span>
          )}
        </Campo>
        <p className={`border-t border-linea dark:border-linea-dark pt-3 text-[12.5px] font-extrabold uppercase tracking-wide ${suave}`}>El cliente</p>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Nombre" htmlFor="da-nom">
            <input id="da-nom" value={f.persona_nombre || ""} maxLength={100} onChange={set("persona_nombre")} className={inputCls} />
          </Campo>
          <Campo label="Apellido" htmlFor="da-ape">
            <input id="da-ape" value={f.persona_apellido || ""} maxLength={100} onChange={set("persona_apellido")} className={inputCls} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="DNI" opcional htmlFor="da-dni">
            <input id="da-dni" inputMode="numeric" value={f.persona_dni || ""} maxLength={20} onChange={set("persona_dni")} className={inputCls} />
          </Campo>
          <Campo label="Teléfono" opcional htmlFor="da-tel">
            <input id="da-tel" inputMode="tel" value={f.persona_telefono || ""} maxLength={32} onChange={set("persona_telefono")} className={inputCls} />
          </Campo>
        </div>
        <Campo label="Tema" htmlFor="da-tema">
          <select id="da-tema" value={f.tema || "OTRO"} onChange={set("tema")} className={inputCls}>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
        {e.plata ? (
          <Campo label="Honorarios pactados" opcional htmlFor="da-pac" ayuda="Lo ves vos y el admin. La oficina y el cliente, no.">
            <input id="da-pac" value={f.honorarios_pactados || ""} maxLength={120} onChange={set("honorarios_pactados")} placeholder="Ej: cuota litis 20 %" className={inputCls} />
          </Campo>
        ) : null}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaCasoNuevo({ listas, temas = [], abierto, onCerrar, onCreado }) {
  const vacio = { persona_nombre: "", persona_apellido: "", persona_telefono: "", tema: "LABORAL", contraparte: "", relato: "", estado: "" };
  const [f, setF] = useState(vacio);
  const { guardando, error, setError, correr } = useGuardar();
  useEffect(() => {
    if (abierto) {
      setF({ persona_nombre: "", persona_apellido: "", persona_telefono: "", tema: "LABORAL", contraparte: "", relato: "", estado: "" });
      setError("");
    }
  }, [abierto, setError]);
  const set = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value }));
  const estados = (listas?.ESTADO || []).filter((o) => !o.terminado);

  const guardar = () => {
    if (!f.persona_nombre.trim() && !f.persona_apellido.trim()) return setError("Poné el nombre del cliente.");
    return correr(async () => {
      // Se manda SIEMPRE el estado que se ve elegido (el primero de la lista, si no tocó nada).
      const body = { ...f, estado: f.estado ? Number(f.estado) : estados[0]?.id || null };
      Object.keys(body).forEach((k) => {
        if (typeof body[k] === "string") body[k] = body[k].trim();
      });
      onCreado(await crearCasoPropio(body));
    });
  };

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineFolderPlus />}
      iconTono="violeta"
      title="Caso nuevo"
      subtitle="Un caso tuyo: no pasa por una oficina ni paga comisión a THAMES."
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} texto="Crear el caso" />}
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Nombre" htmlFor="cn-nom">
            <input id="cn-nom" value={f.persona_nombre} maxLength={100} onChange={set("persona_nombre")} className={inputCls} />
          </Campo>
          <Campo label="Apellido" htmlFor="cn-ape">
            <input id="cn-ape" value={f.persona_apellido} maxLength={100} onChange={set("persona_apellido")} className={inputCls} />
          </Campo>
        </div>
        <Campo label="Teléfono" opcional htmlFor="cn-tel">
          <input id="cn-tel" inputMode="tel" value={f.persona_telefono} maxLength={32} onChange={set("persona_telefono")} placeholder="Ej: 11 4000-1234" className={inputCls} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tema" htmlFor="cn-tema">
            <select id="cn-tema" value={f.tema} onChange={set("tema")} className={inputCls}>
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Arranca en" htmlFor="cn-est">
            <select id="cn-est" value={f.estado || estados[0]?.id || ""} onChange={set("estado")} className={inputCls}>
              {estados.length ? null : <option value="">Consulta</option>}
              {estados.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo label="Contraparte" opcional htmlFor="cn-con">
          <input id="cn-con" value={f.contraparte} maxLength={150} onChange={set("contraparte")} placeholder="Ej: Transportes del Sur S.A." className={inputCls} />
        </Campo>
        <Campo label="¿De qué se trata?" opcional htmlFor="cn-rel">
          <textarea id="cn-rel" rows={2} value={f.relato} maxLength={5000} onChange={set("relato")} placeholder="Ej: Despido sin causa, 6 años de antigüedad." className={`${inputCls} resize-none py-2.5`} />
        </Campo>
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
/** La calculadora suelta: "¿cuándo vence?". Con «Agendarlo en un caso» pasa a HojaFecha ya cargada. */
export function HojaPlazos({ abierto, onCerrar, onAgendar }) {
  const [dias, setDias] = useState("5");
  const [habiles, setHabiles] = useState(true);
  const [desde, setDesde] = useState(hoyYmd());
  const plazo = usePlazo(abierto, desde, dias, habiles);
  useEffect(() => {
    if (abierto) {
      setDias("5");
      setHabiles(true);
      setDesde(hoyYmd());
    }
  }, [abierto]);
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineCalculator />}
      iconTono="amarillo"
      title="Calcular un plazo"
      subtitle="Se cuenta desde el día siguiente a la notificación."
      footer={
        <>
          <Boton tono="blanco" chico onClick={onCerrar} className="sm:w-auto">
            Cerrar
          </Boton>
          <Boton chico onClick={() => onAgendar({ dias: Number(dias), habiles, desde })} disabled={!plazo.datos || plazo.datos.ya_paso} className="sm:w-auto">
            Agendarlo en un caso
          </Boton>
        </>
      }
    >
      <BloquePlazo id="pl" dias={dias} setDias={setDias} habiles={habiles} setHabiles={setHabiles} desde={desde} setDesde={setDesde} etiquetaDesde="Te notificaron el" plazo={plazo} />
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaElegirCaso({ abierto, casos = [], titulo = "¿En qué caso?", onCerrar, onElegir }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (abierto) setQ("");
  }, [abierto]);
  const lista = casos.filter((e) => coincideCaso(e, q)).slice(0, 40);
  return (
    <ModalDuo isOpen={abierto} onClose={onCerrar} size="sm" icon={<HiOutlineMagnifyingGlass />} iconTono="violeta" title={titulo}>
      <div className="flex flex-col gap-3">
        <label htmlFor="ec-q" className="sr-only">
          Buscar un caso
        </label>
        <input id="ec-q" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Buscar por carátula o cliente" className={inputCls} />
        {lista.length ? (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/70 rounded-xl border border-linea dark:border-linea-dark">
            {lista.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onElegir(e)} className={`flex min-h-[54px] w-full flex-col justify-center px-3 py-2 text-left hover:bg-surface dark:hover:bg-surface-dark ${foco} focus-visible:ring-inset focus-visible:ring-offset-0`}>
                  <span className="truncate text-[15px] font-bold text-titulo dark:text-titulo-dark">{caratulaCorta(e)}</span>
                  <span className={`truncate text-[13px] ${suave}`}>{[estadoDe(e).nombre, e.tema_nombre].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`py-4 text-center text-[14.5px] ${suave}`}>{casos.length ? "No hay casos con ese nombre." : "Todavía no tenés casos abiertos."}</p>
        )}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaTurno({ t, abierto, onCerrar, onEstado, onVerCaso }) {
  const { guardando, error, setError, correr } = useGuardar();
  const [confirmaCancelar, setConfirmaCancelar] = useState(false);
  useEffect(() => {
    if (!abierto) return;
    setError("");
    setConfirmaCancelar(false);
  }, [abierto, setError]);
  if (!t) return null;
  const marcar = (estado) => correr(() => onEstado(t, estado));
  const activo = t.estado === "PENDIENTE" || t.estado === "LLEGO";
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineUserGroup />}
      iconTono="azul"
      title={`Turno · ${diaCorto(t.fecha)} ${t.hora}`}
      subtitle={[t.persona, t.titulo].filter(Boolean).join(" · ")}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <p className="text-[15px] text-titulo dark:text-titulo-dark">
          {t.modalidad === "TELEFONO" ? "Lo llamás por teléfono." : `En ${t.oficina_nombre || "la oficina"}.`}
          {t.expediente_oficina_nombre ? ` Lo cargó ${t.expediente_oficina_nombre}.` : ""}
          {t.estado === "LLEGO" ? " El cliente ya llegó." : ""}
        </p>
        {activo ? (
          <div className="grid grid-cols-2 gap-2">
            <Boton tono="verde" chico icono={HiOutlineCheck} onClick={() => marcar("ATENDIDO")} disabled={guardando}>
              Atendido
            </Boton>
            {t.estado === "PENDIENTE" ? (
              <Boton tono="blanco" chico icono={HiOutlineNoSymbol} onClick={() => marcar("NO_VINO")} disabled={guardando}>
                No vino
              </Boton>
            ) : (
              <span />
            )}
          </div>
        ) : null}
        {activo ? (
          confirmaCancelar ? (
            <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-titulo dark:text-titulo-dark">
              ¿Cancelás el turno?
              <button type="button" onClick={() => marcar("CANCELADO")} disabled={guardando} className={`min-h-[40px] rounded-lg bg-duo-rojo px-3 text-[14px] font-extrabold text-white ${foco}`}>
                Sí, cancelar
              </button>
              <button type="button" onClick={() => setConfirmaCancelar(false)} className={linkCls}>
                No
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmaCancelar(true)} className={`inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-lg px-1 text-[14px] font-extrabold text-duo-rojo dark:text-red-400 ${foco}`}>
              <HiOutlineNoSymbol className="h-[18px] w-[18px]" aria-hidden="true" /> Cancelar el turno
            </button>
          )
        ) : null}
        {onVerCaso && t.puede_abrir !== false ? (
          <Boton tono="blanco" chico onClick={onVerCaso}>
            Ver el caso
          </Boton>
        ) : null}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaBloquear({ abierto, onCerrar, onListo }) {
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const { guardando, error, setError, correr } = useGuardar();
  useEffect(() => {
    if (abierto) {
      setFecha("");
      setMotivo("");
      setError("");
    }
  }, [abierto, setError]);
  const guardar = () => {
    if (!fecha) return setError("Elegí el día.");
    return correr(async () => {
      await bloquearDia({ fecha, motivo: motivo.trim() });
      onListo();
    });
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineNoSymbol />}
      iconTono="amarillo"
      title="No puedo un día"
      subtitle="Ese día la oficina no te va a dar turnos."
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} texto="Bloquear el día" />}
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <Campo label="Día" htmlFor="bl-dia">
          <input id="bl-dia" type="date" min={hoyYmd()} value={fecha} onChange={(ev) => setFecha(ev.target.value)} className={inputCls} />
        </Campo>
        <Campo label="Motivo" opcional htmlFor="bl-mot" ayuda="Si ya tenés turnos ese día, primero cancelalos (tocá el turno en tu agenda) o pedile a la oficina que los cambie.">
          <input id="bl-mot" value={motivo} maxLength={120} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Ej: audiencia en La Plata" className={inputCls} />
        </Campo>
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function HojaPerfil({ perfil, abierto, onCerrar, onGuardar }) {
  const [f, setF] = useState({ telefono: "", email: "", direccion: "", horario: "" });
  const { guardando, error, setError, correr } = useGuardar();
  useEffect(() => {
    if (abierto && perfil) {
      setF({ telefono: perfil.telefono || "", email: perfil.email || "", direccion: perfil.direccion || "", horario: perfil.horario || "" });
      setError("");
    }
  }, [abierto, perfil, setError]);
  const set = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value }));
  const guardar = () => correr(() => onGuardar({ telefono: f.telefono.trim(), email: f.email.trim(), direccion: f.direccion.trim(), horario: f.horario.trim() }));
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiOutlineUserCircle />}
      iconTono="violeta"
      title="Mis datos"
      subtitle="Así te ve la oficina (el cliente ve solo tu nombre y tu foto)."
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} />}
    >
      <div className="flex flex-col gap-4">
        <CartelError texto={error} />
        <Campo label="WhatsApp" htmlFor="pf-tel">
          <input id="pf-tel" inputMode="tel" value={f.telefono} maxLength={32} onChange={set("telefono")} className={inputCls} />
        </Campo>
        <Campo label="Email" htmlFor="pf-mail">
          <input id="pf-mail" type="email" value={f.email} maxLength={254} onChange={set("email")} className={inputCls} />
        </Campo>
        <Campo label="Dirección de tu estudio" opcional htmlFor="pf-dir">
          <input id="pf-dir" value={f.direccion} maxLength={200} onChange={set("direccion")} className={inputCls} />
        </Campo>
        <Campo label="Horario de tu estudio" opcional htmlFor="pf-hor">
          <input id="pf-hor" value={f.horario} maxLength={120} onChange={set("horario")} placeholder="Ej: lunes a viernes de 9 a 13" className={inputCls} />
        </Campo>
      </div>
    </ModalDuo>
  );
}
