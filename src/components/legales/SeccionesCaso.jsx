// src/components/legales/SeccionesCaso.jsx
//
// 🧱 Las partes de la ficha del caso (se arman distinto en la compu y en el
// celu, ver LegalesDetailPage):
//   ComoVa · Datos · Fechas importantes · Abogado (y turnos) · Tu cliente
//   (para el abogado) · Aviso al cliente (WhatsApp manual) · Bitácora · Plata.
import { useState } from "react";
import {
  HiCalendar,
  HiCheck,
  HiExclamation,
  HiExternalLink,
  HiLockClosed,
  HiPencil,
  HiPlus,
  HiTrash,
} from "react-icons/hi";

import { BotonesContacto, Candado, Seccion } from "../gestoria/Piezas";
import { AvatarAbogado, BotonWa, CajaFecha, Chip, Glosario } from "./PiezasLegales";
import { inputCls } from "./ModalesCaso";
import {
  ESTADOS,
  aArticulo,
  conArticulo,
  ddmm,
  ddmmhhmm,
  diaCorto,
  diasHasta,
  fmtPct,
  hoyYmd,
  linkCaso,
  linkWhatsAppOElegir,
  nombreCorto,
  plata,
  primerNombre,
  respuestaTxt,
  temasTxt,
  textoConLink,
  textoFalta,
} from "./legalesUtils";

function Dato({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[12px] font-medium text-suave dark:text-suave-dark">{label}</span>
      <div className="text-[14px] font-semibold text-titulo dark:text-titulo-dark break-words">{children}</div>
    </div>
  );
}

// ── Cómo va (arriba en el celu) ──────────────────────────────────────────
export function ComoVa({ e, staff }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-card dark:bg-card-dark p-4">
      <span className="text-[12px] font-bold tracking-wide text-indigo-700 dark:text-indigo-300">CÓMO VA</span>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-[21px] leading-tight text-indigo-800 dark:text-indigo-200">{ESTADOS[e.estado]?.n || e.estado_nombre}</strong>
        {e.estado_desde && <span className="text-[13px] text-indigo-700 dark:text-indigo-300">desde el {ddmm(e.estado_desde)}</span>}
      </div>
      {e.significa && (
        <p className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2.5 text-[14px] text-titulo dark:text-titulo-dark">
          <b className="block text-[13px] text-indigo-800 dark:text-indigo-300">¿Qué significa?</b>
          {e.significa}
        </p>
      )}
      {staff && e.vos && (
        <p className="rounded-xl bg-green-50 dark:bg-green-500/10 px-3 py-2.5 text-[14px] text-titulo dark:text-titulo-dark">
          <b className="block text-[13px] text-green-800 dark:text-green-300">¿Qué tenés que hacer vos?</b>
          {e.vos}
        </p>
      )}
    </section>
  );
}

// ── Datos del caso ───────────────────────────────────────────────────────
export function SeccionDatos({ e, catalogo, abogados = [], onAsignar, onEditar }) {
  const motivo = (catalogo?.motivos || []).find((m) => m.id === e.motivo);
  const preguntas = (motivo?.preguntas || []).filter((p) => e.respuestas?.[p.key]);
  const opciones = abogados.filter((a) => a.activo !== false || a.id === e.abogado);
  if (e.abogado && !opciones.some((a) => a.id === e.abogado)) opciones.push({ id: e.abogado, nombre: e.abogado_nombre });
  const puedeEditar = e.puede?.editar_datos || e.puede?.editar_juzgado;
  // Cambiar un abogado que ya estaba NO es un toque más: se cancelan sus turnos
  // (que el cliente ya tiene por WhatsApp) y, si había, se borran los honorarios.
  const cambiarAbogado = (nuevoId) => {
    if (e.abogado && nuevoId !== e.abogado) {
      const nuevo = opciones.find((a) => a.id === nuevoId);
      const ojo = [];
      const turnos = (e.turnos || []).filter((t) => t.activo && t.abogado === e.abogado).length;
      if (turnos) ojo.push(`se cancela${turnos > 1 ? `n sus ${turnos} turnos` : " su turno"} con ${conArticulo(e.abogado_nombre)} (avisale al cliente)`);
      if (e.plata?.honorarios) ojo.push("se borran los honorarios cargados");
      const pregunta = nuevo
        ? `¿Pasarle el caso ${aArticulo(nuevo.nombre)}?`
        : `¿Dejar el caso sin abogado? (hoy lo lleva ${conArticulo(e.abogado_nombre)})`;
      if (!window.confirm(ojo.length ? `${pregunta}\n\nOjo: ${ojo.join(" y ")}.` : pregunta)) return;
    }
    onAsignar?.(nuevoId);
  };
  return (
    <Seccion
      titulo="Datos del caso"
      derecha={
        puedeEditar ? (
          <button type="button" onClick={onEditar} className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
            <HiPencil className="w-4 h-4" /> Corregir
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
        <Dato label="Tema">{e.tema_nombre}</Dato>
        <Dato label="Abogado">
          {e.puede?.asignar ? (
            <select
              value={e.abogado || ""}
              onChange={(ev) => cambiarAbogado(ev.target.value ? Number(ev.target.value) : null)}
              className={`${inputCls} h-9 text-[14px]`}
              aria-label="Abogado del caso"
            >
              <option value="">Sin abogado</option>
              {opciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                  {typeof a.abiertos === "number" ? ` · ${a.abiertos} abiertos` : ""}
                </option>
              ))}
            </select>
          ) : (
            e.abogado_nombre || "Sin abogado"
          )}
        </Dato>
        <Dato label="Fecha del hecho">{e.fecha_hecho ? diaCorto(e.fecha_hecho) : "—"}</Dato>
        <Dato label="Juzgado">{e.juzgado || "—"}</Dato>
        <Dato label="Expediente judicial">{e.expediente_judicial || "—"}</Dato>
        <Dato label="Cargado">
          {ddmmhhmm(e.creado_en)}
          {e.oficina_nombre ? ` · Oficina ${e.oficina_nombre}` : ""}
          {e.creado_por_nombre ? ` (${e.creado_por_nombre})` : ""}
        </Dato>
      </div>
      {motivo && (
        <Dato label="Qué le pasó">
          <span className="font-medium">{motivo.titulo}</span>
        </Dato>
      )}
      {preguntas.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-titulo dark:text-titulo-dark">
          {preguntas.map((p) => (
            <li key={p.key}>
              <span className="text-suave dark:text-suave-dark">{p.texto.replace(/[¿?]/g, "")}:</span> <b>{respuestaTxt(p, e.respuestas[p.key])}</b>
            </li>
          ))}
        </ul>
      )}
      <Dato label="Qué pasó (lo que contó el cliente)">
        <p className="whitespace-pre-line font-normal leading-relaxed">{e.relato || "—"}</p>
      </Dato>
    </Seccion>
  );
}

// ── Fechas importantes ───────────────────────────────────────────────────
export function SeccionFechas({ e, glosario = {}, staff, onAgregar, onMarcar, onCambiar, onBorrar, onAvisado }) {
  const [f, setF] = useState({ titulo: "", fecha: "", hora: "", visible: true, detalle: "" });
  const [guardando, setGuardando] = useState(false);
  const vencs = e.vencimientos || [];
  const pendientes = vencs.filter((v) => !v.cumplido);
  const hechas = vencs.filter((v) => v.cumplido);
  const agregar = async () => {
    if (!f.titulo.trim() || !f.fecha) return;
    setGuardando(true);
    try {
      await onAgregar?.({
        titulo: f.titulo.trim(),
        fecha: f.fecha,
        hora: f.hora || null,
        visible_cliente: f.visible,
        detalle: f.detalle.trim(),
      });
      setF({ titulo: "", fecha: "", hora: "", visible: true, detalle: "" });
    } catch {
      /* el error ya se mostró */
    } finally {
      setGuardando(false);
    }
  };
  const fila = (v) => {
    const d = diasHasta(v.fecha);
    const cerca = !v.cumplido && d >= 0 && d <= 7;
    const tono = v.cumplido ? "gris" : v.vencida ? "rojo" : cerca ? "ambar" : "neutro";
    const textoWa = textoConLink(e.whatsapp_textos?.fechas?.[String(v.id)] || "", e);
    return (
      <li
        key={v.id}
        className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 ${
          v.cumplido
            ? "border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark"
            : v.vencida
              ? "border-duo-rojo/40 bg-duo-rojo-soft/60 dark:bg-[var(--color-duo-rojo-soft-dark)]"
              : cerca
                ? "border-duo-amarillo/50 bg-duo-amarillo-soft/60 dark:bg-[var(--color-duo-amarillo-soft-dark)]"
                : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <CajaFecha ymd={v.fecha} tono={tono} />
          <span className="flex-1 min-w-0">
            <strong className={`block text-[14px] ${v.cumplido ? "line-through text-suave dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"}`}>
              {v.titulo}
              {v.hora ? ` · ${v.hora}` : ""}
            </strong>
            <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-suave dark:text-suave-dark">
              {v.cumplido ? (
                <span className="inline-flex items-center gap-1 text-duo-verde-sombra dark:text-duo-verde">
                  <HiCheck className="w-3.5 h-3.5" /> Hecho {v.cumplido_en ? ddmm(v.cumplido_en) : ""}
                </span>
              ) : v.vencida ? (
                <b className="text-duo-rojo">Venció {textoFalta(d)} · nadie la marcó como hecha</b>
              ) : (
                <span className={cerca ? "font-semibold text-amber-800 dark:text-amber-300" : ""}>{textoFalta(d)}</span>
              )}
              {v.visible_cliente ? <Chip tono="azul">La ve el cliente</Chip> : <Chip>Interna</Chip>}
              {v.avisado_cliente_en && <Chip tono="verde">Avisado {ddmm(v.avisado_cliente_en)}</Chip>}
            </span>
            {v.detalle && <span className="block text-[12px] text-titulo dark:text-titulo-dark">{v.detalle}</span>}
          </span>
          <Glosario palabra={v.titulo} glosario={glosario} />
        </div>
        {!v.cumplido && (
          <div className="flex flex-wrap gap-2 pl-14">
            {e.puede?.marcar_fechas && (
              <>
                <button type="button" onClick={() => onMarcar?.(v, true)} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                  Ya se hizo
                </button>
                <button type="button" onClick={() => onCambiar?.(v)} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                  Cambiar la fecha
                </button>
              </>
            )}
            {staff && v.visible_cliente && textoWa && (
              <BotonWa href={linkWhatsAppOElegir(e.persona_telefono, textoWa)} onEnviado={() => onAvisado?.(v)} size="sm" variante="borde">
                Avisarle por WhatsApp
              </BotonWa>
            )}
            {e.puede?.borrar && (
              <button type="button" onClick={() => onBorrar?.(v)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-duo-rojo" title="Borrar (solo admin)">
                <HiTrash className="w-4 h-4" /> Borrar
              </button>
            )}
          </div>
        )}
        {v.cumplido && e.puede?.marcar_fechas && (
          <button type="button" onClick={() => onMarcar?.(v, false)} className="self-start pl-14 text-[12px] font-semibold text-suave dark:text-suave-dark underline">
            Volver a dejarla pendiente
          </button>
        )}
      </li>
    );
  };
  return (
    <Seccion
      titulo="Fechas importantes"
      derecha={<span className="text-[12px] text-suave dark:text-suave-dark">A vos te llega un aviso 2 días antes</span>}
    >
      {vencs.length ? (
        <ul className="flex flex-col gap-2">
          {pendientes.map(fila)}
          {hechas.slice(0, 5).map(fila)}
        </ul>
      ) : (
        <p className="text-[13px] text-suave dark:text-suave-dark">Sin fechas por ahora (audiencias, pericias, plazos…).</p>
      )}
      {e.puede?.fechas && (
        <div className="flex flex-col gap-2 border-t border-linea dark:border-linea-dark pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_150px_110px] gap-2">
            <label className="col-span-2 sm:col-span-1 flex flex-col gap-1 text-[12px] font-semibold text-suave dark:text-suave-dark">
              Qué es
              <input value={f.titulo} onChange={(ev) => setF((x) => ({ ...x, titulo: ev.target.value }))} maxLength={150} placeholder="Ej: audiencia testimonial" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-suave dark:text-suave-dark">
              Día
              <input type="date" min={hoyYmd()} value={f.fecha} onChange={(ev) => setF((x) => ({ ...x, fecha: ev.target.value }))} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-suave dark:text-suave-dark">
              Hora (si tiene)
              <input type="time" value={f.hora} onChange={(ev) => setF((x) => ({ ...x, hora: ev.target.value }))} className={inputCls} />
            </label>
          </div>
          {f.visible && (
            <input
              value={f.detalle}
              onChange={(ev) => setF((x) => ({ ...x, detalle: ev.target.value }))}
              maxLength={200}
              placeholder="Aclaración para el cliente (opcional). Ej: traé el DNI."
              className={inputCls}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark">
              <input type="checkbox" checked={f.visible} onChange={(ev) => setF((x) => ({ ...x, visible: ev.target.checked }))} className="w-4 h-4" />
              Que la vea el cliente en su link
            </label>
            <button
              type="button"
              onClick={agregar}
              disabled={guardando || !f.titulo.trim() || !f.fecha}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              <HiPlus className="w-4 h-4" /> {guardando ? "Agregando…" : "Agregar fecha"}
            </button>
          </div>
        </div>
      )}
    </Seccion>
  );
}

// ── Abogado y turnos ─────────────────────────────────────────────────────
function textoTurnoCorto(t, miOficina) {
  const hoy = t.fecha === hoyYmd();
  const cuando = `${hoy ? "hoy" : diaCorto(t.fecha)} ${t.hora}`;
  if (t.modalidad === "TELEFONO") return `${cuando} · por teléfono`;
  const aca = t.oficina && miOficina && Number(t.oficina) === Number(miOficina);
  return `${cuando} · ${aca ? "acá" : `en ${t.oficina_nombre || "la oficina"}`}`;
}

export function SeccionAbogado({ e, catalogo, esAbogado, miOficina, onDarTurno, onTurnoEstado }) {
  const c = e.abogado_contacto;
  const temas = catalogo?.temas || [];
  const prox = e.proximo_turno;
  const otros = (e.turnos || []).filter((t) => !prox || t.id !== prox.id).slice(0, 4);
  const staff = !esAbogado;
  return (
    <Seccion titulo={esAbogado ? "Turnos con el cliente" : "Abogado"}>
      {!esAbogado &&
        (e.abogado ? (
          <div className="flex items-center gap-3">
            <AvatarAbogado id={e.abogado} nombre={e.abogado_nombre} foto={e.abogado_foto} size={48} />
            <span className="min-w-0">
              <strong className="block text-[15px] text-titulo dark:text-titulo-dark">{e.abogado_nombre}</strong>
              {c?.especialidades?.length ? <span className="block text-[12px] text-suave dark:text-suave-dark">{temasTxt(c.especialidades, temas)}</span> : null}
              {c?.agenda_txt ? <span className="block text-[12px] text-suave dark:text-suave-dark">Turnos: {c.agenda_txt}</span> : null}
            </span>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-800 dark:text-amber-300">
            <HiExclamation className="w-4 h-4" /> Sin abogado todavía: elegilo en «Datos del caso» o dale un turno.
          </p>
        ))}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface dark:bg-surface-dark px-3 py-2.5">
        <span className="text-[13px] text-titulo dark:text-titulo-dark">
          {prox ? (
            <>
              <HiCalendar className="inline w-4 h-4 mr-1 text-sky-700 dark:text-sky-400" />
              Turno: <b>{textoTurnoCorto(prox, miOficina)}</b>
              {prox.estado === "LLEGO" ? <Chip tono="verde" className="ml-1.5">Llegó</Chip> : null}
            </>
          ) : (
            <>
              Turno con el cliente: <b>no tiene</b>
            </>
          )}
        </span>
        {e.puede?.turno && !prox && (
          <button type="button" onClick={onDarTurno} className="rounded-lg border border-sky-700/50 bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-sky-800 dark:text-sky-300">
            Darle turno
          </button>
        )}
      </div>
      {prox && (
        <div className="flex flex-wrap gap-2">
          {staff && prox.estado === "PENDIENTE" && prox.modalidad === "OFICINA" && (
            <button type="button" onClick={() => onTurnoEstado?.(prox, "LLEGO")} className="rounded-lg border border-green-700/50 px-3 py-1.5 text-[13px] font-semibold text-green-800 dark:text-green-400">
              Llegó
            </button>
          )}
          {(esAbogado || e.puede?.marcar_fechas || staff) && (
            <button type="button" onClick={() => onTurnoEstado?.(prox, "ATENDIDO")} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              Atendido
            </button>
          )}
          {prox.estado === "PENDIENTE" && (
            <button type="button" onClick={() => onTurnoEstado?.(prox, "NO_VINO")} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              No vino
            </button>
          )}
          <button type="button" onClick={() => onTurnoEstado?.(prox, "CANCELADO")} className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-duo-rojo">
            Cancelar turno
          </button>
          {e.puede?.turno && (
            <button type="button" onClick={onDarTurno} className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-sky-700 dark:text-sky-400">
              Otro turno
            </button>
          )}
        </div>
      )}
      {otros.length > 0 && (
        <ul className="flex flex-col gap-1 text-[12px] text-suave dark:text-suave-dark">
          {otros.map((t) => (
            <li key={t.id}>
              {diaCorto(t.fecha)} {t.hora} · {t.modalidad === "TELEFONO" ? "por teléfono" : t.oficina_nombre || "oficina"} ·{" "}
              <b>{catalogo?.estados_turno?.[t.estado] || t.estado}</b>
            </li>
          ))}
        </ul>
      )}
      {!esAbogado && c && (
        <BotonesContacto
          c={c}
          nombre={e.abogado_nombre}
          texto={`¡Hola ${nombreCorto(e.abogado_nombre)}! Te escribimos de THAMES por el caso de ${e.persona_nombre} (${e.numero}).`}
        />
      )}
    </Seccion>
  );
}

/** Para el abogado: el contacto de su cliente. */
export function SeccionCliente({ e }) {
  return (
    <Seccion titulo="Tu cliente">
      <div className="flex flex-col gap-0.5">
        <strong className="text-[15px] text-titulo dark:text-titulo-dark">{e.persona_nombre}</strong>
        <span className="text-[13px] text-suave dark:text-suave-dark">
          {e.persona_dni ? `DNI ${e.persona_dni} · ` : ""}
          {e.persona_telefono ? `WhatsApp ${e.persona_telefono}` : "Sin WhatsApp cargado"}
        </span>
        {(e.cliente_polizas || []).length > 0 && (
          <span className="text-[12px] text-suave dark:text-suave-dark">Cliente de THAMES · {e.cliente_polizas.join(" · ")}</span>
        )}
      </div>
      <BotonesContacto c={{ telefono: e.persona_telefono }} nombre={e.persona_nombre} texto={`¡Hola ${primerNombre(e.persona_nombre)}!`} />
      <p className="text-[12px] text-suave dark:text-suave-dark">Las novedades que marcás «que lo vea el cliente» le llegan a su link; la oficina le avisa por WhatsApp.</p>
    </Seccion>
  );
}

// ── Aviso al cliente (WhatsApp manual) ───────────────────────────────────
export function SeccionAvisoCliente({ e, onAvisado, onCopiar }) {
  const tel = e.persona_telefono;
  const t = e.whatsapp_textos || {};
  const avisos = [...(e.avisos_whatsapp || [])].reverse().slice(0, 5);
  const MOTIVO = { link: "Link de su caso", novedad: "Novedad", turno: "Turno", fecha: "Fecha" };
  return (
    <Seccion titulo="Aviso al cliente">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="text-titulo dark:text-titulo-dark">
          Link «Mi caso» · <b className="text-duo-verde-sombra dark:text-duo-verde">activo</b>
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={onCopiar} className="font-semibold text-sky-700 dark:text-sky-400 underline">
            Copiar
          </button>
          <a href={linkCaso(e)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400 underline">
            Ver como el cliente <HiExternalLink className="w-3.5 h-3.5" />
          </a>
        </span>
      </div>
      {!tel && <p className="text-[12px] text-amber-800 dark:text-amber-300">No tiene WhatsApp cargado: al tocar, elegís el contacto en WhatsApp.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <BotonWa href={linkWhatsAppOElegir(tel, textoConLink(t.link, e))} onEnviado={() => onAvisado?.("link")} variante="borde" size="sm">
          Mandar el link por WhatsApp
        </BotonWa>
        <BotonWa
          href={linkWhatsAppOElegir(tel, textoConLink(t.novedad, e))}
          onEnviado={() => onAvisado?.("novedad")}
          variante={e.aviso_novedad_pendiente ? "lleno" : "borde"}
          size="sm"
        >
          Avisar la última novedad
        </BotonWa>
        {t.turno && e.proximo_turno && (
          <BotonWa
            href={linkWhatsAppOElegir(tel, textoConLink(t.turno, e))}
            onEnviado={() => onAvisado?.("turno", { turno: e.proximo_turno.id })}
            variante={e.proximo_turno.avisado_en ? "borde" : "lleno"}
            size="sm"
            className="sm:col-span-2"
          >
            {e.proximo_turno.avisado_en ? "Mandarle el turno otra vez" : "Mandarle el turno"}
          </BotonWa>
        )}
      </div>
      {e.aviso_novedad_pendiente && (
        <p className="text-[12px] font-semibold text-green-800 dark:text-green-400">Hay una novedad que el cliente todavía no sabe: avisale.</p>
      )}
      {avisos.length > 0 && (
        <ul className="flex flex-col gap-1 text-[12px] text-suave dark:text-suave-dark">
          {avisos.map((a, i) => (
            <li key={`${a.fecha}-${i}`} className="flex items-start gap-1.5">
              <HiCheck className="w-3.5 h-3.5 mt-px text-duo-verde shrink-0" />
              <span>
                {MOTIVO[a.motivo] || a.motivo} · {ddmmhhmm(a.fecha)} (a mano · {a.autor})
              </span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

// ── Bitácora ─────────────────────────────────────────────────────────────
export function SeccionBitacora({ e, onAnotar, compacta = false }) {
  const [txt, setTxt] = useState("");
  const [vis, setVis] = useState(false);
  const [soloAdmin, setSoloAdmin] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verTodo, setVerTodo] = useState(false);
  const movs = e.movimientos || [];
  const lista = compacta && !verTodo ? movs.slice(0, 6) : movs;
  const agregar = async () => {
    if (!txt.trim()) return;
    setGuardando(true);
    try {
      await onAnotar?.({ texto: txt.trim(), visible: vis && !soloAdmin, solo_admin: soloAdmin });
      setTxt("");
      setVis(false);
      setSoloAdmin(false);
    } catch {
      /* el error ya se mostró */
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Seccion titulo={compacta ? "Novedades" : "Bitácora"}>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-suave dark:text-suave-dark">
          Anotar algo
          <textarea
            value={txt}
            onChange={(ev) => setTxt(ev.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ej: el perito pidió los estudios de la guardia"
            className={`${inputCls} h-auto py-2`}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-col gap-1">
            <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark">
              <input type="checkbox" checked={vis && !soloAdmin} disabled={soloAdmin} onChange={(ev) => setVis(ev.target.checked)} className="w-4 h-4" />
              Que lo vea el cliente
            </label>
            {e.ve_plata && (
              <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark">
                <input type="checkbox" checked={soloAdmin} onChange={(ev) => setSoloAdmin(ev.target.checked)} className="w-4 h-4" />
                <HiLockClosed className="w-3.5 h-3.5" /> Tiene montos (no lo ve la oficina)
              </label>
            )}
          </span>
          <button
            type="button"
            onClick={agregar}
            disabled={guardando || !txt.trim()}
            className="rounded-lg bg-sky-700 hover:bg-sky-800 px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>
      <ol className="flex flex-col divide-y divide-linea dark:divide-linea-dark">
        {lista.map((m) => (
          <li key={m.id} className="py-2.5 flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-suave dark:text-suave-dark">
              {ddmmhhmm(m.fecha)} · {m.autor || "—"}
              {m.visible_cliente && <b className="text-sky-700 dark:text-sky-400">· lo ve el cliente</b>}
              {m.con_plata && <Candado texto={false} />}
            </span>
            <span className="text-[13px] text-titulo dark:text-titulo-dark whitespace-pre-line [overflow-wrap:anywhere]">{m.texto}</span>
          </li>
        ))}
      </ol>
      {compacta && movs.length > lista.length && (
        <button type="button" onClick={() => setVerTodo(true)} className="self-start text-[13px] font-semibold text-sky-700 dark:text-sky-400 underline">
          Ver todo ({movs.length})
        </button>
      )}
    </Seccion>
  );
}

// ── Plata (admin y el abogado del caso) ──────────────────────────────────
export function SeccionPlata({ e, onHonorarios, onCobrar, onDeshacer, onSubirComprobante, onBorrarDoc }) {
  const p = e.plata;
  if (!p) return null;
  const docs = (e.documentos || []).filter((d) => d.tipo === "COMISION");
  const esAdmin = !!p.es_admin;
  const pctTxt = p.comision_pct != null ? fmtPct(p.comision_pct) : "—";
  return (
    <Seccion
      titulo={
        <span className="inline-flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">Plata</h2>
          {esAdmin ? <Candado /> : <Chip tono="ambar"><HiLockClosed className="w-3 h-3" /> Solo vos y THAMES</Chip>}
        </span>
      }
      derecha={
        p.puede_cargar ? (
          <button type="button" onClick={onHonorarios} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
            {p.honorarios ? (esAdmin ? "Cambiar honorarios o el %" : "Cambiar honorarios") : "Cargar honorarios"}
          </button>
        ) : null
      }
    >
      {esAdmin && (
        <p className="rounded-lg bg-green-50 dark:bg-green-500/10 px-3 py-2 text-[13px] text-green-900 dark:text-green-200">
          El cliente le paga los honorarios al abogado. A la caja de THAMES entra solo la comisión, sin oficina: ninguna oficina la ve.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3.5">
          <span className="text-[11px] font-bold tracking-wide text-suave dark:text-suave-dark">HONORARIOS DEL ABOGADO</span>
          <strong className="text-[20px] text-titulo dark:text-titulo-dark">{p.honorarios ? plata(p.honorarios) : p.honorarios_pactados || "Sin cargar"}</strong>
          <span className="text-[12px] text-suave dark:text-suave-dark">
            {p.honorarios
              ? `Cobrados · los cargó ${p.honorarios_cargados_por || "—"} el ${ddmm(p.honorarios_cargados_en)}${p.honorarios_pactados ? ` · pactado: ${p.honorarios_pactados}` : ""}`
              : p.honorarios_pactados
                ? "Lo pactado con el cliente. El monto se carga cuando se cobre el caso."
                : "Se cargan cuando se cobra el caso (los carga el abogado)."}
          </span>
        </div>
        <div
          className={`flex flex-col gap-1 rounded-xl border p-3.5 ${
            p.comision_cobrada ? "border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]" : "border-duo-verde/30 bg-green-50/60 dark:bg-green-500/5"
          }`}
        >
          <span className="text-[11px] font-bold tracking-wide text-green-800 dark:text-green-300">COMISIÓN PARA THAMES · {pctTxt}</span>
          <strong className="text-[20px] text-titulo dark:text-titulo-dark">{p.comision ? plata(p.comision) : "Se calcula sola"}</strong>
          <span className="text-[12px] text-suave dark:text-suave-dark">
            {p.comision_cobrada
              ? `Cobrada el ${ddmm(p.comision_cobrada_en)} (${p.comision_forma}) · entró a Balances`
              : p.comision
                ? esAdmin
                  ? `${e.abogado_nombre || "El abogado"} la debe`
                  : "Se la debés a THAMES (avisá con «Ya pagué» en tu inicio)"
                : "honorarios × % del abogado"}
          </span>
          {esAdmin && (
            <span className="mt-1.5 flex flex-wrap gap-2">
              {p.puede_cobrar && (
                <button type="button" onClick={onCobrar} className="rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-3 py-1.5 text-[13px] font-semibold text-white">
                  Marcar cobrada
                </button>
              )}
              {p.comision_cobrada && (
                <button type="button" onClick={onDeshacer} className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                  Deshacer el cobro
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      {(docs.length > 0 || esAdmin) && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-suave dark:text-suave-dark">Comprobantes de pago</span>
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-linea dark:border-linea-dark px-3 py-2 text-[13px]">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate font-semibold text-sky-700 dark:text-sky-400 hover:underline">
                {d.nombre}
              </a>
              <span className="text-[11px] text-suave dark:text-suave-dark">{ddmm(d.fecha)} · {d.autor}</span>
              {esAdmin && (
                <button type="button" onClick={() => onBorrarDoc?.(d)} className="text-suave hover:text-duo-rojo" aria-label={`Borrar ${d.nombre}`}>
                  <HiTrash className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {esAdmin && (
            <label className="self-start inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
              <HiPlus className="w-4 h-4" /> Subir comprobante
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(ev) => {
                  const file = ev.target.files?.[0];
                  ev.target.value = "";
                  if (file) onSubirComprobante?.(file);
                }}
              />
            </label>
          )}
        </div>
      )}
    </Seccion>
  );
}

