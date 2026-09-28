// src/components/legales/ModalesCaso.jsx
//
// 🪟 Ventanitas de la ficha del caso:
//   - ModalEstado:     pasar a otro estado (con una nota y si la ve el cliente).
//   - ModalNovedad:    el abogado anota una novedad (y si cambió el estado o hay fecha nueva).
//   - ModalHonorarios: el abogado carga cuánto cobró (el admin, además, el %).
//   - ModalCobrar:     el admin marca cobrada la comisión (+ comprobante).
//   - ModalTurno:      darle turno (elegir horario libre) y mandarle el WhatsApp.
//   - ModalDatos:      corregir los datos del cliente / del juzgado.
//   - ModalCambiarFecha: mover una fecha (audiencia, pericia…).
import { useEffect, useMemo, useRef, useState } from "react";
import { HiCalendar, HiCash, HiPencil, HiPlus, HiSwitchHorizontal } from "react-icons/hi";

import ModalDuo from "../ui/ModalDuo";
import Boton3D from "../ui/Boton3D";
import { mensajeError, subirArchivo } from "../../services/legales";
import ElegirAbogado from "./ElegirAbogado";
import ElegirHorario from "./ElegirHorario";
import { BotonWa } from "./PiezasLegales";
import { ESTADOS, fmtPct, hoyYmd, linkWhatsAppOElegir, plata, textoConLink, textoTurnoElegido } from "./legalesUtils";

export const inputCls =
  "w-full min-w-0 h-11 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[15px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-sky-600 [color-scheme:light] dark:[color-scheme:dark]";
const labelCls = "flex flex-col gap-1.5 text-[13px] font-semibold text-suave dark:text-suave-dark min-w-0";

export function CartelError({ texto }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-lg border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3 py-2 text-[13px] font-semibold text-duo-rojo">
      {texto}
    </p>
  );
}

function Pie({ onCerrar, onGuardar, guardando, texto = "Guardar", tono = "azul", deshabilitado = false }) {
  return (
    <>
      <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">
        Volver
      </Boton3D>
      <Boton3D variant={tono} onClick={onGuardar} disabled={guardando || deshabilitado} className="w-full sm:w-auto">
        {guardando ? "Guardando…" : texto}
      </Boton3D>
    </>
  );
}

/** Corre la acción, muestra el error del servidor si falla. */
function useGuardar(onGuardar) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const correr = async (...args) => {
    setGuardando(true);
    setError("");
    try {
      await onGuardar(...args);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };
  return { guardando, error, setError, correr };
}

// ─────────────────────────────────────────────────────────────────────────
export function ModalEstado({ e, catalogo, abierto, inicial = "", onCerrar, onGuardar }) {
  const [estado, setEstado] = useState("");
  const [nota, setNota] = useState("");
  const [visible, setVisible] = useState(true);
  const { guardando, error, setError, correr } = useGuardar(onGuardar);

  useEffect(() => {
    if (!abierto) return;
    setEstado(inicial || e?.estados?.siguiente || "");
    setNota("");
    setVisible(true);
    setError("");
  }, [abierto, inicial, e, setError]);

  if (!e) return null;
  const opciones = [...new Set([e.estados?.siguiente, ...(e.estados?.otros || [])].filter(Boolean))];
  const info = (catalogo?.estados || []).find((x) => x.id === estado);
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiSwitchHorizontal />}
      title="Cambiar el estado"
      subtitle={`Ahora: ${ESTADOS[e.estado]?.n || e.estado}`}
      footer={<Pie onCerrar={onCerrar} onGuardar={() => correr({ estado, nota: nota.trim(), visible })} guardando={guardando} deshabilitado={!estado} texto="Cambiar" />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <label className={labelCls}>
          Pasa a
          <select value={estado} onChange={(ev) => setEstado(ev.target.value)} className={inputCls}>
            <option value="">Elegí…</option>
            {opciones.map((id) => (
              <option key={id} value={id}>
                {ESTADOS[id]?.n || id}
                {id === e.estados?.siguiente ? " (el que sigue)" : ""}
              </option>
            ))}
          </select>
        </label>
        {info && (
          <p className="rounded-lg bg-surface dark:bg-surface-dark px-3 py-2 text-[13px] text-titulo dark:text-titulo-dark">
            <b>Qué significa:</b> {info.significa}
            <br />
            <b>El cliente ve:</b> «{info.cliente_texto}»
          </p>
        )}
        <label className={labelCls}>
          ¿Querés agregar algo? (opcional)
          <textarea
            value={nota}
            onChange={(ev) => setNota(ev.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Ej: presentamos la demanda en el juzgado civil 3."
            className={`${inputCls} h-auto py-2`}
          />
        </label>
        <label className="inline-flex items-center gap-2 text-[14px] text-titulo dark:text-titulo-dark">
          <input type="checkbox" checked={visible} onChange={(ev) => setVisible(ev.target.checked)} className="w-4 h-4" />
          Que lo vea el cliente en su link
        </label>
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
/** El abogado anota una novedad; si cambió el estado o hay una fecha nueva, lo carga todo junto. */
export function ModalNovedad({ e, abierto, onCerrar, onGuardar, conFechaInicial = false }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("");
  const [visible, setVisible] = useState(true);
  const [conFecha, setConFecha] = useState(false);
  const [fecha, setFecha] = useState({ titulo: "", fecha: "", hora: "" });
  const { guardando, error, setError, correr } = useGuardar(onGuardar);
  // Qué partes ya se guardaron (ej: la fecha sí, la nota no por un corte):
  // al tocar "Guardar" de nuevo no se repiten.
  const hecho = useRef({});

  useEffect(() => {
    if (!abierto) return;
    hecho.current = {};
    setTexto("");
    setEstado("");
    setVisible(true);
    setConFecha(conFechaInicial);
    setFecha({ titulo: "", fecha: "", hora: "" });
    setError("");
  }, [abierto, conFechaInicial, setError]);

  if (!e) return null;
  const opciones = [...new Set([e.estados?.siguiente, ...(e.estados?.otros || [])].filter(Boolean))];
  const guardar = () => {
    if (!texto.trim() && !estado && !conFecha) return setError("Contá qué pasó (o elegí el estado nuevo).");
    if (conFecha && (!fecha.titulo.trim() || !fecha.fecha)) return setError("Completá qué es y el día de la fecha.");
    if (conFecha && !hecho.current.fecha && fecha.fecha < hoyYmd()) return setError("Esa fecha ya pasó.");
    return correr(
      {
        texto: texto.trim(),
        estado,
        visible,
        fecha: conFecha ? { titulo: fecha.titulo.trim(), fecha: fecha.fecha, hora: fecha.hora || null, visible_cliente: visible } : null,
      },
      hecho.current,
    );
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiPencil />}
      title={`Novedad · ${e.persona_nombre}`}
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <label className={labelCls}>
          ¿Qué pasó?
          <textarea
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            rows={4}
            maxLength={2000}
            autoFocus
            placeholder="Ej: el juzgado fijó la pericia médica para el 15/10 a las 9:30."
            className={`${inputCls} h-auto py-2`}
          />
        </label>
        {e.puede?.cambiar_estado && (
          <label className={labelCls}>
            ¿Cambió el estado?
            <select value={estado} onChange={(ev) => setEstado(ev.target.value)} className={inputCls}>
              <option value="">No, sigue {ESTADOS[e.estado]?.n || e.estado}</option>
              {opciones.map((id) => (
                <option key={id} value={id}>
                  Pasa a {ESTADOS[id]?.n || id}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="inline-flex items-center gap-2 text-[14px] text-titulo dark:text-titulo-dark">
          <input type="checkbox" checked={visible} onChange={(ev) => setVisible(ev.target.checked)} className="w-4 h-4" />
          Que lo vea el cliente
        </label>
        {!conFecha ? (
          <button
            type="button"
            onClick={() => setConFecha(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-600/60 px-3 py-2.5 text-[14px] font-semibold text-sky-700 dark:text-sky-300"
          >
            <HiPlus className="w-4 h-4" /> Agregar una fecha (audiencia, pericia…)
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-linea dark:border-linea-dark p-3">
            <label className={`${labelCls} col-span-2`}>
              Qué es
              <input value={fecha.titulo} onChange={(ev) => setFecha((f) => ({ ...f, titulo: ev.target.value }))} placeholder="Ej: pericia médica" className={inputCls} />
            </label>
            <label className={labelCls}>
              Día
              <input type="date" value={fecha.fecha} min={hoyYmd()} onChange={(ev) => setFecha((f) => ({ ...f, fecha: ev.target.value }))} className={inputCls} />
            </label>
            <label className={labelCls}>
              Hora (si tiene)
              <input type="time" value={fecha.hora} onChange={(ev) => setFecha((f) => ({ ...f, hora: ev.target.value }))} className={inputCls} />
            </label>
          </div>
        )}
        <p className="text-[12px] text-suave dark:text-suave-dark">La oficina le avisa al cliente por WhatsApp.</p>
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function ModalHonorarios({ e, abierto, onCerrar, onGuardar }) {
  const esAdmin = !!e?.plata?.es_admin;
  const [monto, setMonto] = useState("");
  const [pct, setPct] = useState("");
  const [pactado, setPactado] = useState("");
  const { guardando, error, setError, correr } = useGuardar(onGuardar);

  useEffect(() => {
    if (!abierto || !e) return;
    setMonto(e.plata?.honorarios != null ? String(Math.round(Number(e.plata.honorarios))) : "");
    setPct(e.plata?.comision_pct != null ? String(Number(e.plata.comision_pct)) : "");
    setPactado(e.plata?.honorarios_pactados || "");
    setError("");
  }, [abierto, e, setError]);

  if (!e) return null;
  const m = Number(monto);
  const c = esAdmin && pct !== "" ? Number(pct) : Number(e.plata?.comision_pct || 0);
  const calc = m > 0 && c >= 0 ? Math.round((m * c) / 100) : null;
  const guardar = () => {
    if (!(m > 0)) return setError("Poné los honorarios en pesos (mayor a cero).");
    if (esAdmin && pct !== "" && !(c >= 0 && c <= 100)) return setError("El % tiene que ir de 0 a 100.");
    const body = { honorarios: Math.round(m) };
    if (esAdmin && pct !== "") body.comision_pct = c;
    return correr(body, pactado.trim() !== (e.plata?.honorarios_pactados || "") ? pactado.trim() : null);
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCash />}
      iconTono="amarillo"
      title={esAdmin ? "Honorarios y comisión" : "¿Cuánto cobraste de honorarios?"}
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <p className="text-[13px] text-suave dark:text-suave-dark">
          Lo que cobró {esAdmin ? "el abogado" : "vos"} por este caso. El cliente y la oficina no ven este número.
        </p>
        <div className={`grid gap-3 ${esAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
          <label className={labelCls}>
            Honorarios
            <input type="number" min="0" step="1000" inputMode="numeric" value={monto} onChange={(ev) => setMonto(ev.target.value)} placeholder="Ej: 900000" className={inputCls} autoFocus />
          </label>
          {esAdmin && (
            <label className={labelCls}>
              % para THAMES
              <input type="number" min="0" max="100" step="0.5" value={pct} onChange={(ev) => setPct(ev.target.value)} className={inputCls} />
            </label>
          )}
        </div>
        <label className={labelCls}>
          Lo pactado con el cliente (opcional)
          <input value={pactado} onChange={(ev) => setPactado(ev.target.value)} maxLength={120} placeholder="Ej: cuota litis 20%" className={inputCls} />
        </label>
        <p className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">
          Comisión para THAMES ({fmtPct(c)}): {calc !== null ? plata(calc) : "se calcula con los honorarios"}
        </p>
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function ModalCobrar({ e, formas = [], abierto, onCerrar, onGuardar }) {
  const [forma, setForma] = useState("TRANSFERENCIA");
  const [comprobante, setComprobante] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const { guardando, error, setError, correr } = useGuardar(onGuardar);

  useEffect(() => {
    if (!abierto) return;
    setForma("TRANSFERENCIA");
    setComprobante(null);
    setError("");
  }, [abierto, setError]);

  if (!e) return null;
  const subir = async (file) => {
    if (!file) return;
    setSubiendo(true);
    try {
      setComprobante(await subirArchivo(file, "legales/comprobantes"));
    } catch (err) {
      setError(err?.message || "No se pudo subir el comprobante.");
    } finally {
      setSubiendo(false);
    }
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCash />}
      iconTono="verde"
      title={`Cobrar ${plata(e.plata?.comision)}`}
      subtitle={`Comisión de ${e.abogado_nombre || "el abogado"} · ${e.numero}`}
      footer={<Pie onCerrar={onCerrar} onGuardar={() => correr({ forma_pago: forma, comprobante })} guardando={guardando || subiendo} texto="Marcar cobrada" tono="verde" />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <label className={labelCls}>
          ¿Cómo te pagó?
          <select value={forma} onChange={(ev) => setForma(ev.target.value)} className={inputCls}>
            {(formas.length ? formas : [{ id: "TRANSFERENCIA", nombre: "Transferencia" }]).map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Comprobante (opcional)
          <input type="file" accept="image/*,application/pdf" onChange={(ev) => subir(ev.target.files?.[0])} className="text-[13px]" />
          {subiendo && <span className="text-[12px]">Subiendo…</span>}
          {comprobante && <span className="text-[12px] text-duo-verde-sombra dark:text-duo-verde">Listo: {comprobante.nombre}</span>}
        </label>
        <p className="text-[13px] text-suave dark:text-suave-dark">
          Entra a Balances como «Comisión legales», <b>sin oficina</b> (ninguna oficina lo ve en su caja).
        </p>
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Darle turno: se elige el abogado (si el caso no tiene) y un horario libre.
 * Después muestra el WhatsApp del turno listo para mandar.
 */
export function ModalTurno({ e, abogados = [], temas = [], miOficina = null, abierto, onCerrar, onDar, onAvisado }) {
  const [abogadoId, setAbogadoId] = useState(null);
  const [turno, setTurno] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [hecho, setHecho] = useState(null); // el caso actualizado, para el WhatsApp
  const { guardando, error, setError, correr } = useGuardar(async () => {
    const nuevo = await onDar({ abogado: abogadoId, inicio: turno.inicio, modalidad: turno.modalidad }).catch((err) => {
      if (err?.response?.data?.codigo === "ocupado") {
        setTurno(null);
        setRecarga((x) => x + 1);
      }
      throw err;
    });
    setHecho(nuevo);
  });

  // Se limpia SOLO al abrir (o si cambia de caso). Ojo: al dar el turno el
  // servidor le asigna el abogado al caso (e.abogado pasa de null a un id); si
  // eso limpiara el modal, se perdía el "¡Turno dado!" y se podía dar otro.
  useEffect(() => {
    if (!abierto || !e) return;
    setAbogadoId(e.abogado || null);
    setTurno(null);
    setHecho(null);
    setError("");
  }, [abierto, e?.id, setError]); // eslint-disable-line react-hooks/exhaustive-deps

  const abogado = useMemo(() => abogados.find((a) => a.id === abogadoId) || null, [abogados, abogadoId]);
  if (!e) return null;
  const mensaje = hecho ? textoConLink(hecho.whatsapp_textos?.turno || "", hecho) : "";

  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCalendar />}
      title={hecho ? "¡Turno dado!" : "Darle turno"}
      subtitle={e.persona_nombre}
      footer={
        hecho ? (
          <Boton3D variant="blanco" onClick={onCerrar} className="w-full sm:w-auto">
            Listo
          </Boton3D>
        ) : (
          <Pie onCerrar={onCerrar} onGuardar={() => correr()} guardando={guardando} deshabilitado={!abogadoId || !turno} texto="Dar el turno" tono="verde" />
        )
      }
    >
      {hecho && hecho.puede?.whatsapp ? (
        <div className="flex flex-col gap-3">
          <p className="whitespace-pre-line [overflow-wrap:anywhere] rounded-xl bg-green-50 dark:bg-green-500/10 px-3.5 py-3 text-[14px] leading-relaxed text-titulo dark:text-titulo-dark">{mensaje}</p>
          <BotonWa
            href={linkWhatsAppOElegir(hecho.persona_telefono, mensaje)}
            onEnviado={() => onAvisado?.(hecho.proximo_turno?.id)}
            size="lg"
            full
          >
            Mandar por WhatsApp
          </BotonWa>
          <p className="text-center text-[12px] text-suave dark:text-suave-dark">Se abre con el mensaje escrito. Queda anotado en el caso.</p>
        </div>
      ) : hecho ? (
        // El abogado no manda WhatsApp: el aviso al cliente lo hace la oficina.
        <div className="flex flex-col gap-2 rounded-xl bg-green-50 dark:bg-green-500/10 px-3.5 py-3 text-[14px] text-titulo dark:text-titulo-dark">
          {hecho.proximo_turno ? <b>{textoTurnoElegido(hecho.proximo_turno)}</b> : null}
          <span className="text-suave dark:text-suave-dark">La oficina le avisa al cliente por WhatsApp.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <CartelError texto={error} />
          {e.abogado ? null : (
            <>
              <span className="text-[14px] font-semibold text-titulo dark:text-titulo-dark">¿Con quién?</span>
              <ElegirAbogado abogados={abogados} temas={temas} tema={e.tema} value={abogadoId} onChange={(id) => { setAbogadoId(id); setTurno(null); }} />
            </>
          )}
          {abogado ? (
            <ElegirHorario key={`${abogado.id}-${recarga}`} abogado={abogado} value={turno} onChange={setTurno} miOficina={miOficina} />
          ) : e.abogado ? (
            <p className="text-[13px] text-suave dark:text-suave-dark">El abogado de este caso no está activo. Pedile al admin que asigne otro.</p>
          ) : null}
        </div>
      )}
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
/** Corregir datos. La oficina: cliente, tema y relato. El abogado: juzgado y expediente. */
export function ModalDatos({ e, temas = [], abierto, onCerrar, onGuardar }) {
  const staff = !!e?.puede?.editar_datos;
  const juzgado = !!e?.puede?.editar_juzgado;
  const [f, setF] = useState({});
  const { guardando, error, setError, correr } = useGuardar(onGuardar);

  useEffect(() => {
    if (!abierto || !e) return;
    setF({
      persona_nombre: e.persona_nombre_solo || "",
      persona_apellido: e.persona_apellido || "",
      persona_dni: e.persona_dni || "",
      persona_telefono: e.persona_telefono || "",
      tema: e.tema,
      relato: e.relato || "",
      fecha_hecho: e.fecha_hecho || "",
      juzgado: e.juzgado || "",
      expediente_judicial: e.expediente_judicial || "",
    });
    setError("");
  }, [abierto, e, setError]);

  if (!e) return null;
  const set = (k) => (ev) => setF((x) => ({ ...x, [k]: ev.target.value }));
  const guardar = () => {
    const body = {};
    if (staff) {
      ["persona_nombre", "persona_apellido", "persona_dni", "persona_telefono", "tema", "relato"].forEach((k) => {
        body[k] = String(f[k] || "").trim();
      });
      body.fecha_hecho = f.fecha_hecho || null;
    }
    if (juzgado) {
      body.juzgado = String(f.juzgado || "").trim();
      body.expediente_judicial = String(f.expediente_judicial || "").trim();
    }
    return correr(body);
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiPencil />}
      title="Corregir datos"
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        {staff && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={labelCls}>
                Nombre
                <input value={f.persona_nombre || ""} onChange={set("persona_nombre")} className={inputCls} />
              </label>
              <label className={labelCls}>
                Apellido
                <input value={f.persona_apellido || ""} onChange={set("persona_apellido")} className={inputCls} />
              </label>
              <label className={labelCls}>
                DNI
                <input value={f.persona_dni || ""} onChange={set("persona_dni")} inputMode="numeric" className={inputCls} />
              </label>
              <label className={labelCls}>
                WhatsApp
                <input value={f.persona_telefono || ""} onChange={set("persona_telefono")} inputMode="tel" className={inputCls} />
              </label>
              <label className={labelCls}>
                Tema
                <select value={f.tema || ""} onChange={set("tema")} className={inputCls}>
                  {temas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </label>
              <label className={labelCls}>
                Fecha del hecho
                <input type="date" value={f.fecha_hecho || ""} onChange={set("fecha_hecho")} className={inputCls} />
              </label>
            </div>
            <label className={labelCls}>
              Qué pasó
              <textarea value={f.relato || ""} onChange={set("relato")} rows={4} maxLength={5000} className={`${inputCls} h-auto py-2`} />
            </label>
          </>
        )}
        {juzgado && (
          <div className="grid grid-cols-2 gap-2.5">
            <label className={labelCls}>
              Juzgado
              <input value={f.juzgado || ""} onChange={set("juzgado")} placeholder="Ej: Civil y Comercial N° 5" className={inputCls} />
            </label>
            <label className={labelCls}>
              Expediente judicial
              <input value={f.expediente_judicial || ""} onChange={set("expediente_judicial")} placeholder="Ej: 4512/2026" className={inputCls} />
            </label>
          </div>
        )}
      </div>
    </ModalDuo>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export function ModalCambiarFecha({ v, abierto, onCerrar, onGuardar }) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const { guardando, error, setError, correr } = useGuardar(onGuardar);
  useEffect(() => {
    if (!abierto || !v) return;
    setFecha(v.fecha || "");
    setHora(v.hora || "");
    setError("");
  }, [abierto, v, setError]);
  if (!v) return null;
  // La hora va SOLO si la tocó (si no, el servidor la dejaría en blanco).
  const guardar = () => {
    if (fecha < hoyYmd()) return setError("Esa fecha ya pasó.");
    const body = { fecha };
    if ((hora || "") !== (v.hora || "")) body.hora = hora || null;
    return correr(body);
  };
  return (
    <ModalDuo
      isOpen={abierto}
      onClose={onCerrar}
      size="sm"
      icon={<HiCalendar />}
      title="Cambiar la fecha"
      subtitle={v.titulo}
      footer={<Pie onCerrar={onCerrar} onGuardar={guardar} guardando={guardando} deshabilitado={!fecha} />}
    >
      <div className="flex flex-col gap-3">
        <CartelError texto={error} />
        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls}>
            Día
            <input type="date" value={fecha} min={hoyYmd()} onChange={(ev) => setFecha(ev.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            Hora (si tiene)
            <input type="time" value={hora} onChange={(ev) => setHora(ev.target.value)} className={inputCls} />
          </label>
        </div>
        <p className="text-[12px] text-suave dark:text-suave-dark">Con la fecha nueva, el recordatorio vuelve a salir.</p>
      </div>
    </ModalDuo>
  );
}
