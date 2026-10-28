// src/components/siniestros/SiniestroPortalEditor.jsx
//
// 🔑 «PORTAL DEL CLIENTE» DEL SINIESTRO (Franco 16/10/2026): lo que ve el cliente al tocar
//    su siniestro en el portal, y que el admin puede cambiar TODO:
//
//    · Avance: cuántos pasos de la barra están hechos (automático o a mano).
//    · Gestión: cada paso (✅ fecha · texto). Las notas «RECLAMO · dd/mm/aaaa · EVENTO · …»
//      de la bitácora entran solas con un texto profesional. Acá se cambia la fecha o el
//      texto, se oculta, se ordena (↑ ↓), se borra o se suma uno a mano.
//    · Próximo paso y etapas siguientes (automáticos o a mano).
//    · ¿A quién le paga la compañía? Al cliente (se le pide el CBU) o a THAMES con un poder
//      (por seguridad): cambia solo el ítem del CBU por el del poder en la documentación.
//    · Documentación pendiente: lo que el cliente ve que le falta mandar.
//
//    Se guarda al tocar (o al salir del casillero). El cliente lo ve en su portal al instante.
//    Lo que se escribe acá lo ve el cliente tal cual: sin montos ni datos del tercero.
//
//    props: isOpen, onClose, siniestro, onVerPortal(siniestro)
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineGlobeAlt,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";

import ModalDuo from "../ui/ModalDuo";
import {
  agregarPaso,
  borrarPaso,
  editarPaso,
  guardarPortal,
  mensajeError,
  ordenarPasos,
  verPortal,
} from "../../api/siniestrosPortal";

const CBU = "Constancia de CBU a su nombre (con membrete del banco)";
const PODER = "Poder firmado para que Thames cobre la indemnización (certificado por escribano)";
const esCbu = (t) => /\bcbu\b|\bcvu\b/i.test(String(t || ""));
const esPoder = (t) => /\bpoder\b/i.test(String(t || ""));

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const caja = "rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 space-y-3";
const input =
  "min-w-0 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-2 text-[14.5px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-rojo";
const botonChico =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-40";
const botonRojo =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-duo-rojo px-4 text-[14px] font-bold text-white hover:brightness-110 disabled:opacity-50";

function Titulo({ children, extra }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h3 className="text-[15px] font-bold text-titulo dark:text-titulo-dark">{children}</h3>
      {extra}
    </div>
  );
}

function Ayuda({ children }) {
  return <p className="text-[13px] leading-snug text-suave dark:text-suave-dark">{children}</p>;
}

/** Interruptor visible / oculto. */
function Interruptor({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={on ? "Lo ve el cliente" : "Oculto"} onClick={onClick} className="inline-flex min-h-[36px] shrink-0 items-center px-1">
      <span className={`relative inline-block h-[22px] w-[38px] rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[19px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}

/** Un paso de la gestión: fecha, texto y botones. Guarda al salir del casillero. */
function FilaPaso({ p, primero, ultimo, ocupado, onCambiar, onSubir, onBajar, onBorrar }) {
  const [texto, setTexto] = useState(p.texto);
  const [fecha, setFecha] = useState(p.fecha || "");
  useEffect(() => setTexto(p.texto), [p.texto]);
  useEffect(() => setFecha(p.fecha || ""), [p.fecha]);

  return (
    <li className={`rounded-lg border border-linea dark:border-linea-dark p-2 ${p.visible ? "" : "bg-surface dark:bg-surface-dark opacity-75"}`}>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <Interruptor on={p.visible} label={`Visible para el cliente: ${p.texto}`} onClick={() => onCambiar({ visible: !p.visible })} />
        <input
          type="date"
          aria-label="Fecha"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          onBlur={() => fecha !== (p.fecha || "") && onCambiar({ fecha })}
          className={`${input} w-[150px] shrink-0`}
        />
        <input
          type="text"
          aria-label="Texto del paso"
          value={texto}
          maxLength={300}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const t = texto.trim();
            if (!t) setTexto(p.texto);
            else if (t !== p.texto) onCambiar({ texto: t });
          }}
          className={`${input} flex-1 basis-[220px]`}
        />
        <div className="flex gap-1">
          <button type="button" className={botonChico} onClick={onSubir} disabled={primero || ocupado} aria-label={`Subir: ${p.texto}`}>
            <HiOutlineArrowUp className="h-4 w-4" />
          </button>
          <button type="button" className={botonChico} onClick={onBajar} disabled={ultimo || ocupado} aria-label={`Bajar: ${p.texto}`}>
            <HiOutlineArrowDown className="h-4 w-4" />
          </button>
          <button type="button" className={`${botonChico} text-duo-rojo`} onClick={onBorrar} disabled={ocupado} aria-label={`Borrar: ${p.texto}`}>
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 pl-1 text-[12px] text-suave dark:text-suave-dark">
        {p.de_nota ? `De la nota ${p.origen} (el detalle interno no se muestra)` : "Agregado a mano"}
        {p.visible ? "" : " · Oculto: el cliente no lo ve"}
      </p>
    </li>
  );
}

export default function SiniestroPortalEditor({ isOpen, onClose, siniestro, onVerPortal }) {
  const sid = siniestro?.id;
  const [d, setD] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [proximo, setProximo] = useState("");
  const [nuevoPaso, setNuevoPaso] = useState({ fecha: hoyISO(), texto: "" });
  const [nuevaEtapa, setNuevaEtapa] = useState("");
  const [nuevoDoc, setNuevoDoc] = useState("");

  const tomar = useCallback((data) => {
    setD(data);
    setProximo(data?.proximo || "");
  }, []);

  useEffect(() => {
    if (!isOpen || !sid) return;
    let vivo = true;
    setCargando(true);
    verPortal(sid)
      .then((data) => vivo && tomar(data))
      .catch((e) => vivo && toast.error(mensajeError(e), { duration: 6000 }))
      .finally(() => vivo && setCargando(false));
    setNuevoPaso({ fecha: hoyISO(), texto: "" });
    setNuevaEtapa("");
    setNuevoDoc("");
    return () => {
      vivo = false;
    };
  }, [isOpen, sid, tomar]);

  /** Corre un cambio y se queda con lo que devolvió el servidor. */
  const correr = useCallback(
    async (fn, ok) => {
      setOcupado(true);
      try {
        tomar(await fn());
        if (ok) toast.success(ok);
        return true;
      } catch (e) {
        toast.error(mensajeError(e), { duration: 6000 });
        return false;
      } finally {
        setOcupado(false);
      }
    },
    [tomar]
  );

  const guardar = (cambios, ok) => correr(() => guardarPortal(sid, cambios), ok);

  if (!siniestro) return null;

  const pasos = d?.pasos_gestion || [];
  const nombres = d?.pasos_nombres || [];
  const docs = d?.documentacion || [];
  const etapasPropias = Array.isArray(d?.siguientes);
  const etapas = etapasPropias ? d.siguientes : d?.siguientes_sugeridos || [];
  const visibles = pasos.filter((p) => p.visible).length;

  const mover = (i, delta) => {
    const ids = pasos.map((p) => p.id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    correr(() => ordenarPasos(sid, ids));
  };

  const cambiarCobro = (conPoder) => {
    if (!!d?.cobro_con_poder === conPoder) return;
    const resto = docs.filter((t) => !(esCbu(t) || esPoder(t)));
    guardar(
      { cobro_con_poder: conPoder, documentacion: [...resto, conPoder ? PODER : CBU] },
      conPoder ? "Cobra THAMES con poder: se pide el poder en vez del CBU" : "Cobra el cliente: se pide el CBU"
    );
  };

  return (
    <ModalDuo
      isOpen={isOpen}
      onClose={onClose}
      title="Portal del cliente"
      subtitle={siniestro.caratula || `Siniestro #${sid}`}
      icon={<HiOutlineGlobeAlt className="h-5 w-5" />}
      iconTono="rojo"
      size="lg"
    >
      {cargando && !d ? (
        <div className="flex justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-duo-rojo/25 border-t-duo-rojo" />
        </div>
      ) : !d ? (
        <p className="py-6 text-center text-[14px] text-suave dark:text-suave-dark">No se pudo cargar. Cerrá y volvé a abrir.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13.5px] text-suave dark:text-suave-dark">
              Lo que escribas acá el cliente lo ve tal cual: <b className="text-titulo dark:text-titulo-dark">sin montos ni datos del tercero</b>.
            </p>
            {onVerPortal ? (
              <button
                type="button"
                onClick={() => onVerPortal(siniestro)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-bold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
              >
                <HiOutlineEye className="h-4 w-4" /> Ver como el cliente
              </button>
            ) : null}
          </div>

          {/* ── Avance ── */}
          <section className={caja}>
            <Titulo
              extra={
                <label className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-titulo dark:text-titulo-dark">Pasos hechos</span>
                  <select
                    value={d.paso == null ? "auto" : String(d.paso)}
                    disabled={ocupado}
                    onChange={(e) => guardar({ paso: e.target.value === "auto" ? null : Number(e.target.value) })}
                    className={`${input} w-auto`}
                  >
                    <option value="auto">Automático ({d.paso_auto})</option>
                    <option value="0">0 · Ninguno todavía</option>
                    {nombres.map((n, i) => (
                      <option key={n} value={String(i + 1)}>
                        {i + 1} · {n}
                      </option>
                    ))}
                  </select>
                </label>
              }
            >
              Avance
            </Titulo>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${nombres.length || 1}, minmax(0, 1fr))` }}>
              {nombres.map((n, i) => (
                <div key={n} className="flex min-w-0 flex-col gap-1" title={n}>
                  <span className={`h-1.5 rounded ${i < d.paso_efectivo ? "bg-duo-rojo" : i === d.paso_efectivo ? "bg-duo-rojo/30" : "bg-linea dark:bg-linea-dark"}`} />
                  {/* En el celu no entran los nombres abajo de cada rayita: están en el selector. */}
                  <span className={`hidden text-[11.5px] leading-tight sm:block ${i < d.paso_efectivo ? "font-semibold text-titulo dark:text-titulo-dark" : "text-suave dark:text-suave-dark"}`}>{n}</span>
                </div>
              ))}
            </div>
            <Ayuda>El cliente ve: «{d.vista_cliente?.estado_cliente}» · paso {d.paso_efectivo} de {nombres.length}.</Ayuda>
          </section>

          {/* ── Gestión ── */}
          <section className={caja}>
            <Titulo
              extra={
                <span className="rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-0.5 text-[12.5px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {visibles} de {pasos.length} visibles
                </span>
              }
            >
              Gestión que ve el cliente
            </Titulo>
            <Ayuda>
              Las notas de la bitácora con formato «RECLAMO · dd/mm/aaaa · EVENTO · detalle» entran solas. Una NOTA solo aparece si termina en «CLIENTE: texto».
            </Ayuda>

            {pasos.length ? (
              <ol className="space-y-2">
                {pasos.map((p, i) => (
                  <FilaPaso
                    key={p.id}
                    p={p}
                    primero={i === 0}
                    ultimo={i === pasos.length - 1}
                    ocupado={ocupado}
                    onCambiar={(c) => correr(() => editarPaso(sid, p.id, c))}
                    onSubir={() => mover(i, -1)}
                    onBajar={() => mover(i, 1)}
                    onBorrar={() => correr(() => borrarPaso(sid, p.id), "Paso borrado")}
                  />
                ))}
              </ol>
            ) : (
              <p className="rounded-lg border-2 border-dashed border-linea dark:border-linea-dark p-3 text-center text-[13.5px] text-suave dark:text-suave-dark">
                Todavía no hay pasos. El cliente ve: «Recibimos su siniestro…».
              </p>
            )}

            <form
              className="flex flex-wrap gap-2 rounded-lg border border-dashed border-linea dark:border-linea-dark p-2 sm:flex-nowrap"
              onSubmit={(e) => {
                e.preventDefault();
                const texto = nuevoPaso.texto.trim();
                if (!texto) return;
                correr(() => agregarPaso(sid, { texto, fecha: nuevoPaso.fecha || hoyISO(), visible: true }), "Paso agregado").then((ok) =>
                  ok && setNuevoPaso({ fecha: hoyISO(), texto: "" })
                );
              }}
            >
              <input
                type="date"
                aria-label="Fecha del paso nuevo"
                value={nuevoPaso.fecha}
                onChange={(e) => setNuevoPaso((x) => ({ ...x, fecha: e.target.value }))}
                className={`${input} w-[150px] shrink-0`}
              />
              <input
                type="text"
                aria-label="Paso nuevo"
                maxLength={300}
                value={nuevoPaso.texto}
                onChange={(e) => setNuevoPaso((x) => ({ ...x, texto: e.target.value }))}
                placeholder="Agregar un paso hecho: ej. Firma del poder para el cobro"
                className={`${input} flex-1`}
              />
              <button type="submit" className={botonRojo} disabled={ocupado || !nuevoPaso.texto.trim()}>
                Agregar
              </button>
            </form>

            {/* Próximo paso */}
            <div className="space-y-1.5 pt-1">
              <span className="block text-[12px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Próximo paso</span>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <input
                  type="text"
                  aria-label="Próximo paso"
                  maxLength={300}
                  value={proximo}
                  placeholder={d.proximo_sugerido ? `Automático: ${d.proximo_sugerido}` : "Sin próximo paso"}
                  onChange={(e) => setProximo(e.target.value)}
                  onBlur={() => proximo.trim() !== (d.proximo || "") && guardar({ proximo: proximo.trim() })}
                  className={`${input} flex-1 border-amber-300 dark:border-amber-500/40`}
                />
                {d.proximo ? (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      setProximo("");
                      guardar({ proximo: "" });
                    }}
                    className="inline-flex min-h-[40px] items-center rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
                  >
                    Usar el automático
                  </button>
                ) : null}
              </div>
              <Ayuda>{d.proximo ? "Lo escribiste vos." : "Vacío = el automático, según el paso en que esté."}</Ayuda>
            </div>

            {/* Etapas siguientes */}
            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-suave dark:text-suave-dark">Etapas siguientes</span>
                {etapasPropias ? (
                  <button type="button" disabled={ocupado} onClick={() => guardar({ siguientes: null })} className="text-[12.5px] font-semibold text-duo-rojo hover:underline">
                    Volver a las automáticas
                  </button>
                ) : (
                  <span className="text-[12px] text-suave dark:text-suave-dark">Automáticas</span>
                )}
              </div>
              <ul className="flex flex-wrap gap-2">
                {etapas.map((t, i) => (
                  <li key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-full border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark py-0.5 pl-3 pr-1">
                    <span className="text-[13.5px] text-titulo dark:text-titulo-dark">{t}</span>
                    <button
                      type="button"
                      disabled={ocupado}
                      aria-label={`Quitar etapa: ${t}`}
                      onClick={() => guardar({ siguientes: etapas.filter((_, k) => k !== i) })}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-suave hover:bg-card dark:hover:bg-card-dark"
                    >
                      <HiOutlineXMark className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {!etapas.length ? <li className="text-[13px] text-suave dark:text-suave-dark">Ninguna</li> : null}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = nuevaEtapa.trim();
                  if (!t) return;
                  guardar({ siguientes: [...etapas, t] }).then((ok) => ok && setNuevaEtapa(""));
                }}
              >
                <input
                  type="text"
                  aria-label="Agregar etapa siguiente"
                  maxLength={120}
                  value={nuevaEtapa}
                  onChange={(e) => setNuevaEtapa(e.target.value)}
                  placeholder="Agregar etapa: ej. Mediación"
                  className={`${input} flex-1`}
                />
                <button type="submit" disabled={ocupado || !nuevaEtapa.trim()} className="inline-flex min-h-[40px] items-center rounded-lg border border-duo-rojo/40 px-4 text-[14px] font-bold text-duo-rojo hover:bg-duo-rojo-soft disabled:opacity-50">
                  Agregar
                </button>
              </form>
            </div>
          </section>

          {/* ── Cobro y documentación pendiente ── */}
          <section className={caja}>
            <Titulo>Documentación pendiente</Titulo>
            <Ayuda>Lo que el cliente ve que le falta mandar. Cuando llega, tocá «Recibido».</Ayuda>

            <fieldset className="flex flex-wrap items-center gap-2 rounded-lg border border-linea dark:border-linea-dark p-2.5">
              <legend className="px-1 text-[12.5px] font-bold text-titulo dark:text-titulo-dark">¿A quién le paga la compañía?</legend>
              {[
                [false, "Al cliente (pedimos CBU)"],
                [true, "A THAMES con poder (pedimos el poder)"],
              ].map(([conPoder, txt]) => {
                const on = !!d.cobro_con_poder === conPoder;
                return (
                  <button
                    key={txt}
                    type="button"
                    aria-pressed={on}
                    disabled={ocupado}
                    onClick={() => cambiarCobro(conPoder)}
                    className={`min-h-[38px] rounded-full border px-3.5 text-[13.5px] font-bold transition-colors ${
                      on ? "border-duo-rojo bg-duo-rojo text-white" : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
                    }`}
                  >
                    {txt}
                  </button>
                );
              })}
            </fieldset>

            <ul className="space-y-2">
              {docs.map((t, i) => (
                <li key={`${t}-${i}`} className="flex items-center gap-2 rounded-lg border border-linea dark:border-linea-dark py-1.5 pl-3 pr-1.5">
                  <span className="flex-1 text-[14.5px] text-titulo dark:text-titulo-dark">{t}</span>
                  <button
                    type="button"
                    disabled={ocupado}
                    aria-label={`Marcar como recibido: ${t}`}
                    onClick={() => guardar({ documentacion: docs.filter((_, k) => k !== i) }, "Listo: ya no le aparece al cliente")}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 text-[13px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
                  >
                    <HiOutlineCheck className="h-4 w-4" /> Recibido
                  </button>
                </li>
              ))}
            </ul>
            {!docs.length ? <p className="text-[13.5px] font-semibold text-emerald-700 dark:text-emerald-300">No falta nada: el cliente ve «Documentación completa».</p> : null}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = nuevoDoc.trim();
                if (!t) return;
                guardar({ documentacion: [...docs, t] }).then((ok) => ok && setNuevoDoc(""));
              }}
            >
              <input
                type="text"
                aria-label="Agregar documento pendiente"
                maxLength={200}
                value={nuevoDoc}
                onChange={(e) => setNuevoDoc(e.target.value)}
                placeholder="Agregar: ej. Fotos de las lesiones"
                className={`${input} flex-1`}
              />
              <button type="submit" disabled={ocupado || !nuevoDoc.trim()} className={botonRojo}>
                Agregar
              </button>
            </form>
          </section>
        </div>
      )}
    </ModalDuo>
  );
}
