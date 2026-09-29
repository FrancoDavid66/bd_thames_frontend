// src/components/gestoria/FichaTramite.jsx
//
// 📄 Ficha de un trámite: en qué paso está, botones para avanzarlo, datos,
// papeles (fotos/PDF), historial y el link del cliente.
//   👷 El GESTOR ve una ficha más simple, pensada para el celu: FichaGestora.jsx
//      (29/09). Usa de acá DatoVehiculo (por eso se exporta).
//   - Admin: además la caja "Plata 🔒" (29/09): el precio, lo que el cliente ya
//     pagó (cada cobro con su comprobante, «Registrar un cobro») y la COMISIÓN de
//     THAMES (el %, cuánto es y cobrarla): la comisión la ve SOLO el admin.
//     Para pasar a LISTO hacen falta el precio y al menos un comprobante de cobro.
//     🎚️ Con las comisiones apagadas (GESTORIA_COMISIONES = apagadas) no sale:
//     el servidor no manda plata.
//   - Oficina: todo menos la plata (el servidor ni siquiera se la manda).
//   - Oficina y admin: el gestor con su foto y botones para escribirle,
//     llamarlo, mandarle un mail o ir a llevarle papeles.
//   - 🚗 Patente y vehículo: si se cargó sin patente, la agregan la oficina o
//     el gestor del trámite desde "Datos del trámite" (Franco 28/09).
//   - 🔒 "Póliza" solo para la oficina y el admin: el gestor no ve si el cliente
//     tiene póliza (ni el servidor se lo manda, 29/09).
//   - 📲 Aviso al cliente por WhatsApp (whatsapp_modo):
//       · "apagado" (hoy): solo el link del cliente (Copiar / Ver como el cliente).
//       · "manual": "Mandar por WhatsApp" abre el chat con el mensaje escrito (el
//         link, o "ya está LISTO") y queda anotado. Si está LISTO y nadie le
//         avisó, arriba sale el cartel verde para avisarle.
//       · "automatico": sale solo (el cartel, solo si no salió).
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiArrowLeft, HiArrowRight, HiCamera, HiChatAlt2, HiCheck, HiClock, HiExternalLink, HiLink, HiX } from "react-icons/hi";

import useDatosVivos from "../../hooks/useDatosVivos";
import { useGestoria } from "./gestoriaContext";
import {
  anotar,
  asignarGestor,
  avisoWhatsapp,
  borrarDocumento,
  cambiarEstado,
  cargarPrecio,
  cobrarComision,
  deshacerComision,
  editarTramite,
  guardarDocumento,
  mensajeError,
  pedirTramite,
  registrarCobro,
  subirArchivo,
} from "../../services/gestoria";
import {
  Archivo,
  Avatar,
  BotonArchivo,
  BotonesContacto,
  Candado,
  Cargando,
  Demorado,
  EstadoPill,
  Etiqueta,
  Pasos,
  Punto,
  Seccion,
} from "./Piezas";
import { ModalCancelar, ModalCobrar, ModalCobro, ModalMensajes, ModalObservar, ModalPrecio } from "./ModalesTramite";
import {
  ESTADOS,
  colorOficina,
  ddmm,
  ddmmhhmm,
  diasEnEstado,
  esDemorado,
  fechaCorta,
  fmtPct,
  linkWhatsAppOElegir,
  plata,
  textoDias,
} from "./gestoriaUtils";

const btnBase = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white transition-colors disabled:opacity-50";
const BTN = {
  indigo: `${btnBase} bg-indigo-600 hover:bg-indigo-700`,
  naranja: `${btnBase} bg-orange-600 hover:bg-orange-700`,
  verde: `${btnBase} bg-duo-verde hover:bg-duo-verde-sombra`,
};

function Dato({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[12px] font-medium text-suave dark:text-suave-dark">{label}</span>
      <div className="text-[14px] font-semibold text-titulo dark:text-titulo-dark break-words">{children}</div>
    </div>
  );
}

/** Botón verde (o con borde) que abre WhatsApp con el mensaje escrito. */
function BotonWhatsApp({ href, onClick, children, principal = false }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-colors ${
        principal
          ? "bg-duo-verde hover:bg-duo-verde-sombra text-white"
          : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
      }`}
    >
      <HiChatAlt2 className="w-4 h-4 shrink-0" />
      {children}
    </a>
  );
}

/**
 * 🚗 Patente y vehículo, con "Agregar patente" / "Cambiar" para la oficina y el
 * gestor del trámite (ej: se cargó a mano sin patente y se completa después).
 * La usa también la ficha del gestor (FichaGestora.jsx).
 */
export function DatoVehiculo({ t, puede, ocupado, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ patente: "", vehiculo: "" });

  const abrir = () => {
    setF({ patente: t.patente || "", vehiculo: t.vehiculo || "" });
    setEditando(true);
  };
  const guardar = async (e) => {
    e.preventDefault();
    try {
      await onGuardar({ patente: f.patente.replace(/\s/g, ""), vehiculo: f.vehiculo.trim() });
      setEditando(false);
    } catch {
      /* el error ya salió en el cartelito rojo: queda abierto para corregir */
    }
  };

  if (editando) {
    const campo =
      "h-10 w-full rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta";
    return (
      <form onSubmit={guardar} className="sm:col-span-3 flex flex-col gap-2 rounded-lg border border-duo-violeta/40 p-3">
        <span className="text-[12px] font-medium text-suave dark:text-suave-dark">Vehículo</span>
        <div className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)] gap-2">
          <input
            aria-label="Patente"
            value={f.patente}
            maxLength={20}
            onChange={(e) => setF({ ...f, patente: e.target.value.toUpperCase() })}
            placeholder="Patente (ej: AB123CD)"
            className={`${campo} font-mono uppercase`}
            autoFocus
          />
          <input
            aria-label="Vehículo"
            value={f.vehiculo}
            maxLength={120}
            onChange={(e) => setF({ ...f, vehiculo: e.target.value })}
            placeholder="Marca y modelo (opcional)"
            className={campo}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditando(false)} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
            Cancelar
          </button>
          <button type="submit" disabled={ocupado} className="rounded-lg bg-duo-violeta hover:bg-duo-violeta-sombra px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50">
            Guardar
          </button>
        </div>
      </form>
    );
  }

  return (
    <Dato label="Vehículo">
      {t.patente || t.vehiculo ? (
        <span>
          {t.vehiculo} <span className="font-mono tracking-wide">{t.patente || "sin patente"}</span>
        </span>
      ) : (
        <span className="font-normal text-suave dark:text-suave-dark">Sin patente todavía</span>
      )}
      {puede && (
        <button type="button" onClick={abrir} className="block min-h-[36px] text-[13px] font-semibold text-duo-violeta hover:underline">
          {t.patente ? "Cambiar" : "Agregar patente"}
        </button>
      )}
    </Dato>
  );
}

function linkCliente(t) {
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
  const token = String(t?.portal_path || "").split("/mi-tramite/")[1] || "";
  return token ? `${base}/#/mi-tramite/${token}` : "";
}

export default function FichaTramite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const recienCargado = !!location.state?.recienCargado;
  const { esGestor, gestores, catalogo, recargarGestores } = useGestoria();
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [cobroDoc, setCobroDoc] = useState(null); // comprobante del cliente al que se le carga el monto
  // soloAdmin = "que no la vea la oficina" (la ve el gestor); privada = 🔒 solo el admin.
  const [nota, setNota] = useState({ txt: "", vis: false, soloAdmin: false, privada: false });
  const [papelNuevo, setPapelNuevo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const volverA = "/gestoria";
  const volverTxt = esGestor ? "Mis trámites" : "Tablero";

  // ✅ Papeles: se guardan un ratito después del último clic (si tocás 3 casillas
  //    seguidas sale 1 solo pedido) y se ignoran respuestas viejas. Hasta que el
  //    servidor confirma, manda la lista de la pantalla: si en el medio llega una
  //    recarga "en vivo" (o la respuesta de otro botón), no se pierden los tildes.
  const papelesSeq = useRef(0);
  const papelesTimer = useRef(null);
  const papelesPendientes = useRef(null);
  const sinConfirmar = useRef(null);
  const conMisPapeles = useCallback((nuevo) => {
    const lista = sinConfirmar.current;
    if (!nuevo || !lista) return nuevo;
    return { ...nuevo, papeles: lista, papeles_ok: lista.filter((p) => p.ok).length, papeles_total: lista.length };
  }, []);

  const cargar = useCallback(async () => {
    try {
      const nuevo = await pedirTramite(id);
      setT(conMisPapeles(nuevo));
      setError("");
    } catch (e) {
      setError(e?.response?.status === 404 ? "Ese trámite no existe o no está a la vista para tu usuario." : mensajeError(e, "No se pudo abrir el trámite."));
    }
  }, [id, conMisPapeles]);

  useEffect(() => {
    setT(null);
    sinConfirmar.current = null;
    cargar();
  }, [cargar]);

  useDatosVivos(["gestoria"], () => cargar());

  useEffect(
    () => () => {
      // Si salís de la ficha antes de que se guarde, se guarda igual.
      if (papelesTimer.current && papelesPendientes.current) {
        clearTimeout(papelesTimer.current);
        editarTramite(id, { papeles: papelesPendientes.current }).catch(() => {});
      }
    },
    [id]
  );

  const hacer = async (fn, ok) => {
    setOcupado(true);
    try {
      const nuevo = await fn();
      if (nuevo && nuevo.id) setT(conMisPapeles(nuevo));
      if (ok) toast.success(typeof ok === "function" ? ok(nuevo) : ok);
      recargarGestores?.();
      return nuevo;
    } catch (e) {
      toast.error(mensajeError(e));
      throw e;
    } finally {
      setOcupado(false);
    }
  };
  const intentar = (fn, ok) => hacer(fn, ok).catch(() => {});

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
        <p className="text-[14px] text-titulo dark:text-titulo-dark">{error}</p>
        <Link to={volverA} className="text-[14px] font-semibold text-duo-violeta">Volver</Link>
      </div>
    );
  }
  if (!t) {
    return (
      <div className="flex flex-col gap-3">
        <Cargando alto="h-20" />
        <Cargando alto="h-16" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Cargando alto="h-72" />
          <Cargando alto="h-72" />
        </div>
      </div>
    );
  }

  const a = t.acciones || {};
  const staff = !!a.es_staff;
  const cerrado = t.estado === "ENTREGADO" || t.estado === "CANCELADO";
  const d = diasEnEstado(t);
  const dem = esDemorado(t);
  const papeles = Array.isArray(t.papeles) ? t.papeles : [];
  const docsPapel = (t.documentos || []).filter((x) => x.tipo === "PAPEL");
  const docsPlata = (t.documentos || []).filter((x) => x.tipo !== "PAPEL");
  const puede = (e) => (a.estados || []).includes(e);

  // 📲 WhatsApp al cliente: el mensaje lo arma el servidor; el link va con la
  //    dirección de esta misma app (igual que "Copiar"). Apagado = sin WhatsApp.
  const manual = t.whatsapp_modo === "manual";
  const avisoActivo = !!t.whatsapp_modo && t.whatsapp_modo !== "apagado";
  const avisos = t.avisos_whatsapp || [];
  const yaMandoLink = avisos.some((w) => w.motivo === "alta" && w.ok);
  const textoWa = (motivo) => {
    const txt = t.whatsapp_textos?.[motivo] || "";
    return t.portal_link ? txt.split(t.portal_link).join(linkCliente(t)) : txt;
  };
  const linkWa = (motivo) => linkWhatsAppOElegir(t.persona_telefono, textoWa(motivo));
  const registrarAviso = (motivo) => {
    avisoWhatsapp(t.id, motivo)
      .then((nuevo) => {
        if (nuevo && nuevo.id) setT(conMisPapeles(nuevo));
        toast.success(motivo === "listo" ? "Anotado: se le avisó que está LISTO" : "Anotado: se le mandó el link");
      })
      .catch((e) => toast.error(mensajeError(e, "No se pudo anotar el aviso.")));
  };

  // ── acciones ──
  const avanzar = (nuevo) => {
    // 💵 Para LISTO: al menos un cobro con comprobante (y el precio). Se piden en la misma ventanita.
    if (nuevo === "LISTO" && t.ve_plata && !t.cobros_n) {
      setCobroDoc(null);
      setModal("cobroListo");
      return;
    }
    if (nuevo === "LISTO" && t.ve_plata && t.precio_gestoria == null) {
      setModal("precioListo");
      return;
    }
    intentar(() => cambiarEstado(t.id, { estado: nuevo }), `${t.numero} → ${ESTADOS[nuevo].n.toUpperCase()}`);
  };

  const cambiarPapeles = (lista) => {
    sinConfirmar.current = lista;
    setT((x) => ({ ...x, papeles: lista, papeles_ok: lista.filter((p) => p.ok).length, papeles_total: lista.length }));
    const n = ++papelesSeq.current;
    papelesPendientes.current = lista;
    clearTimeout(papelesTimer.current);
    papelesTimer.current = setTimeout(async () => {
      papelesTimer.current = null;
      papelesPendientes.current = null;
      try {
        const nuevo = await editarTramite(t.id, { papeles: lista });
        if (n === papelesSeq.current) {
          sinConfirmar.current = null;
          setT(nuevo);
        }
      } catch (e) {
        toast.error(mensajeError(e));
        if (n === papelesSeq.current) {
          sinConfirmar.current = null;
          cargar();
        }
      }
    }, 450);
  };

  const subir = async (file, tipo) => {
    try {
      const arch = await subirArchivo(file, tipo === "PAPEL" ? "gestoria/papeles" : "gestoria/comprobantes");
      await hacer(() => guardarDocumento(t.id, { ...arch, tipo }), `Subido: ${arch.nombre}`);
    } catch (e) {
      if (!e?.response) toast.error(e?.message || "No se pudo subir el archivo.");
    }
  };

  const borrarArchivo = (doc) => {
    if (!window.confirm(`¿Borrar «${doc.nombre}»? No se puede deshacer.`)) return;
    intentar(() => borrarDocumento(t.id, doc.id), "Archivo borrado");
  };

  const copiarLink = async () => {
    const link = linkCliente(t);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      window.prompt("Copiá este link:", link);
    }
  };

  const gestorOpciones = (() => {
    const lista = gestores.filter((g) => g.activo !== false);
    if (t.gestor && !lista.some((g) => g.id === t.gestor)) lista.push({ id: t.gestor, nombre: t.gestor_nombre, abiertos: null });
    return lista;
  })();

  // ── botones de estado (según lo que el servidor dice que se puede) ──
  const botones = [];
  if (t.estado === "RECIBIDO" && staff) {
    botones.push(<span key="h" className="self-center text-[13px] text-suave dark:text-suave-dark">Elegí un gestor en «Datos» para asignarlo.</span>);
  }
  if (t.estado === "ASIGNADO" && puede("EN_REGISTRO")) {
    botones.push(<button key="r" type="button" disabled={ocupado} className={BTN.indigo} onClick={() => avanzar("EN_REGISTRO")}>{staff ? "Pasar a EN EL REGISTRO" : "Lo presenté en el registro"}</button>);
  }
  if (t.estado === "EN_REGISTRO") {
    if (puede("OBSERVADO")) botones.push(<button key="o" type="button" disabled={ocupado} className={BTN.naranja} onClick={() => setModal("observar")}>Marcar observado</button>);
    if (puede("LISTO")) botones.push(<button key="l" type="button" disabled={ocupado} className={BTN.verde} onClick={() => avanzar("LISTO")}>Pasar a LISTO <HiArrowRight className="w-4 h-4" /></button>);
  }
  if (t.estado === "OBSERVADO" && puede("EN_REGISTRO")) {
    botones.push(<button key="v" type="button" disabled={ocupado} className={BTN.indigo} onClick={() => avanzar("EN_REGISTRO")}>Presentado otra vez → EN EL REGISTRO</button>);
  }
  if (t.estado === "LISTO" && puede("ENTREGADO")) {
    botones.push(<button key="e" type="button" disabled={ocupado} className={BTN.verde} onClick={() => avanzar("ENTREGADO")}>Entregar al cliente</button>);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Migas */}
      <div className="flex items-center gap-2 text-[13px] text-suave dark:text-suave-dark">
        <button type="button" onClick={() => navigate(volverA)} className="inline-flex items-center gap-1 font-semibold text-duo-violeta">
          <HiArrowLeft className="w-4 h-4" /> {volverTxt}
        </button>
        <span>/</span>
        <span className="font-mono">{t.numero}</span>
      </div>

      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-titulo dark:text-titulo-dark">
              {t.tipo_txt}
              {t.con_vehiculo === false ? null : t.patente || t.vehiculo ? (
                <>
                  {" "}· {t.vehiculo} <span className="font-mono tracking-wide">{t.patente}</span>
                </>
              ) : (
                <span className="font-semibold text-suave dark:text-suave-dark"> · sin patente</span>
              )}
            </h2>
            <EstadoPill estado={t.estado} extra={cerrado ? "" : textoDias(d)} />
            {dem && <Demorado />}
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-suave dark:text-suave-dark">
            <span>{t.persona_nombre}</span>
            {t.persona_dni && <span>· DNI {t.persona_dni}</span>}
            {t.persona_telefono && <span>· {t.persona_telefono}</span>}
            <span className="inline-flex items-center gap-1">
              · <Punto color={colorOficina(t.oficina)} /> Oficina {t.oficina_nombre || "—"}
            </span>
          </p>
        </div>
        {botones.length > 0 && <div className="flex flex-wrap gap-2 lg:justify-end">{botones}</div>}
      </div>

      {t.estado === "OBSERVADO" && t.falta && (
        <p className="rounded-lg bg-orange-50 dark:bg-orange-500/10 px-3 py-2 text-[14px] text-orange-700 dark:text-orange-300">
          Falta: <strong>{t.falta}</strong>
        </p>
      )}
      {t.estado === "CANCELADO" && (
        <p className="rounded-lg bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark px-3 py-2 text-[14px] text-suave dark:text-suave-dark">
          Cancelado el {ddmm(t.cancelado_en)}{t.motivo_cancelacion ? `: ${t.motivo_cancelacion}` : ""}.
        </p>
      )}

      {staff && t.aviso_listo_pendiente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-verde/40 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-4 py-3">
          <span className="text-[14px] font-semibold text-duo-verde-sombra dark:text-duo-verde">Está LISTO: avisale al cliente que pase a retirarlo.</span>
          <BotonWhatsApp principal href={linkWa("listo")} onClick={() => registrarAviso("listo")}>
            Avisar por WhatsApp
          </BotonWhatsApp>
        </div>
      )}
      {staff && manual && recienCargado && !yaMandoLink && !cerrado && !t.aviso_listo_pendiente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-3">
          <span className="text-[14px] font-semibold text-duo-azul">Trámite cargado. Mandale al cliente el link para que lo siga.</span>
          <BotonWhatsApp principal href={linkWa("alta")} onClick={() => registrarAviso("alta")}>
            Mandar por WhatsApp
          </BotonWhatsApp>
        </div>
      )}

      <Pasos t={t} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* ── Columna izquierda ── */}
        <div className="flex flex-col gap-4 min-w-0">
          <Seccion titulo="Datos del trámite">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Dato label="Tipo">{t.tipo_txt}</Dato>
              {a.puede_asignar ? (
                <label className="flex flex-col gap-1 text-[12px] font-medium text-suave dark:text-suave-dark">
                  Gestor
                  <select
                    value={t.gestor || ""}
                    disabled={ocupado}
                    onChange={(e) => {
                      const g = e.target.value ? Number(e.target.value) : null;
                      const nombre = gestorOpciones.find((x) => x.id === g)?.nombre;
                      intentar(() => asignarGestor(t.id, g), g ? (t.estado === "RECIBIDO" ? `Derivado a ${nombre}` : `Ahora lo tiene ${nombre}`) : "Quedó sin gestor");
                    }}
                    className="h-10 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-2 text-[14px] text-titulo dark:text-titulo-dark"
                  >
                    <option value="">Sin gestor</option>
                    {gestorOpciones.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}{g.abiertos != null ? ` · ${g.abiertos} abiertos` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <Dato label="Gestor">
                  {t.gestor ? (
                    <span className="inline-flex items-center gap-2">
                      <Avatar id={t.gestor} nombre={t.gestor_nombre} foto={t.gestor_foto} size={24} />
                      {t.gestor_nombre}
                    </span>
                  ) : (
                    "Sin gestor"
                  )}
                </Dato>
              )}
              {/* 🪪 La licencia de conducir es de la persona: sin "Vehículo". */}
              {t.con_vehiculo !== false && (
                <DatoVehiculo
                  t={t}
                  puede={!!a.puede_vehiculo}
                  ocupado={ocupado}
                  onGuardar={(body) => hacer(() => editarTramite(t.id, body), body.patente ? `Patente ${body.patente} guardada` : "Vehículo guardado")}
                />
              )}
              {/* 📅 Fecha estimada: ya no se carga (se sacó del alta el 28/09). Los trámites viejos que la tienen la muestran. */}
              {t.fecha_estimada && <Dato label="Fecha estimada">{fechaCorta(t.fecha_estimada)}</Dato>}
              {/* 🔒 La póliza la ven solo la oficina y el admin: el gestor no sabe si el cliente tiene póliza (29/09). */}
              {staff && <Dato label="Póliza">{t.poliza_label || "Sin póliza en THAMES"}</Dato>}
              <Dato label="Oficina">{t.oficina_nombre || "—"}</Dato>
              <Dato label="Cargado">
                {ddmmhhmm(t.creado_en)}
                {t.creado_por_nombre ? ` · ${t.creado_por_nombre}${t.cargado_por_gestor ? " (gestor)" : ""}` : ""}
              </Dato>
            </div>
          </Seccion>

          {staff && t.gestor_contacto && <ContactoGestor t={t} esAdmin={!!a.es_admin} />}

          <Seccion
            titulo={
              <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">
                Papeles <span className="text-[13px] font-medium text-suave dark:text-suave-dark">· {t.papeles_ok} de {t.papeles_total}</span>
              </h2>
            }
            derecha={a.puede_subir_papel && <BotonArchivo onElegir={(f) => subir(f, "PAPEL")}>Subir foto o PDF</BotonArchivo>}
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {papeles.map((p, i) => (
                <li key={`${p.nombre}-${i}`}>
                  <label
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] ${
                      p.ok
                        ? "border-duo-verde/40 bg-duo-verde-soft/60 dark:bg-[var(--color-duo-verde-soft-dark)] text-titulo dark:text-titulo-dark"
                        : "border-linea dark:border-linea-dark text-suave dark:text-suave-dark"
                    } ${a.puede_papeles ? "cursor-pointer" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!p.ok}
                      disabled={!a.puede_papeles}
                      onChange={(e) => cambiarPapeles(papeles.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)))}
                      className="w-4 h-4 accent-[var(--color-duo-verde)]"
                    />
                    <span className="flex-1">{p.nombre}{p.ok ? "" : " · falta"}</span>
                  </label>
                </li>
              ))}
            </ul>
            {a.puede_papeles && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = papelNuevo.trim();
                  if (!n) return;
                  setPapelNuevo("");
                  cambiarPapeles([...papeles, { nombre: n, ok: false }]);
                }}
              >
                <input
                  value={papelNuevo}
                  onChange={(e) => setPapelNuevo(e.target.value)}
                  placeholder="Agregar otro papel a la lista"
                  className="flex-1 h-9 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[13px] text-titulo dark:text-titulo-dark"
                />
                <button type="submit" className="rounded-lg border border-linea dark:border-linea-dark px-3 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                  Agregar
                </button>
              </form>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">Archivos subidos ({docsPapel.length})</span>
              {docsPapel.length ? (
                docsPapel.map((x) => (
                  <Archivo
                    key={x.id}
                    d={x}
                    etiqueta={x.rol === "CLIENTE" ? <Etiqueta tono="azul">del cliente</Etiqueta> : null}
                    onBorrar={a.puede_borrar_archivos ? () => borrarArchivo(x) : null}
                  />
                ))
              ) : (
                <span className="text-[13px] text-suave dark:text-suave-dark">Todavía no se subió nada.</span>
              )}
            </div>
          </Seccion>

          {/* 🔒 La plata: solo el admin (la oficina no; el gestor la ve en su ficha, FichaGestora). */}
          {t.ve_plata && a.es_admin && (
            <SeccionPlataAdmin
              t={t}
              a={a}
              docs={docsPlata}
              ocupado={ocupado}
              setModal={setModal}
              onCobro={(doc) => {
                setCobroDoc(doc);
                setModal("cobro");
              }}
              onBorrar={borrarArchivo}
              onDeshacer={() => {
                if (!window.confirm("¿Deshacer el cobro de la comisión? Se borra el ingreso de Balances y la comisión vuelve a quedar pendiente.")) return;
                intentar(() => deshacerComision(t.id), "Cobro de la comisión deshecho");
              }}
            />
          )}
        </div>

        {/* ── Columna derecha ── */}
        <div className="flex flex-col gap-4 min-w-0">
          <Seccion titulo="Historial">
            {a.puede_nota && (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const txt = nota.txt.trim();
                  if (!txt) return toast.error("Escribí algo para anotar");
                  const privada = !!(t.ve_plata && a.es_admin && nota.privada);
                  const soloAdmin = !!(t.ve_plata && (nota.soloAdmin || privada));
                  intentar(
                    () => anotar(t.id, { texto: txt, visible_cliente: nota.vis && !soloAdmin, solo_admin: soloAdmin, privada }).then((r) => {
                      setNota({ txt: "", vis: false, soloAdmin: false, privada: false });
                      return r;
                    }),
                    privada
                      ? "Anotado (solo lo ve el admin)"
                      : soloAdmin
                        ? "Anotado (la oficina no lo ve)"
                        : nota.vis
                          ? "Anotado (lo ve el cliente en su link)"
                          : "Anotado en el historial"
                  );
                }}
              >
                <label className="flex flex-col gap-1 text-[12px] font-medium text-suave dark:text-suave-dark">
                  Anotar algo
                  <textarea
                    rows={2}
                    value={nota.txt}
                    onChange={(e) => setNota((n) => ({ ...n, txt: e.target.value }))}
                    placeholder="Ej: el registro da turno para el jueves"
                    className="rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2 text-[14px] text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta"
                  />
                </label>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex flex-col gap-1.5">
                    <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer">
                      <input
                        type="checkbox"
                        checked={nota.vis && !nota.soloAdmin && !nota.privada}
                        disabled={nota.soloAdmin || nota.privada}
                        onChange={(e) => setNota((n) => ({ ...n, vis: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Que lo vea el cliente
                    </label>
                    {t.ve_plata && (
                      <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nota.soloAdmin || nota.privada}
                          disabled={nota.privada}
                          onChange={(e) => setNota((n) => ({ ...n, soloAdmin: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        Que no la vea la oficina <span className="text-suave dark:text-suave-dark">(el gestor sí)</span>
                      </label>
                    )}
                    {t.ve_plata && a.es_admin && (
                      <label className="inline-flex items-center gap-2 text-[13px] text-titulo dark:text-titulo-dark cursor-pointer">
                        <input type="checkbox" checked={nota.privada} onChange={(e) => setNota((n) => ({ ...n, privada: e.target.checked }))} className="w-4 h-4" />
                        Solo yo (admin): tampoco el gestor
                      </label>
                    )}
                  </span>
                  <button type="submit" disabled={ocupado} className="rounded-lg bg-duo-violeta hover:bg-duo-violeta-sombra px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
                    Agregar
                  </button>
                </div>
              </form>
            )}
            <ul className="flex flex-col">
              {(t.movimientos || []).map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 border-t border-linea/70 dark:border-linea-dark/70 py-2.5 first:border-t-0">
                  <span className="text-[12px] text-suave dark:text-suave-dark">
                    {ddmmhhmm(m.fecha)} · {m.autor || "—"}
                    {m.visible_cliente && <span className="font-semibold text-duo-azul"> · lo ve el cliente</span>}
                    {m.solo_admin && <span className="font-semibold text-duo-amarillo-sombra dark:text-duo-amarillo"> · solo admin</span>}
                  </span>
                  <span className="text-[14px] text-titulo dark:text-titulo-dark whitespace-pre-line break-words">{m.texto}</span>
                </li>
              ))}
            </ul>
          </Seccion>

          {staff && (
            <Seccion titulo={avisoActivo ? "Aviso al cliente" : "Link del cliente"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14px] text-titulo dark:text-titulo-dark">
                  Link de seguimiento <strong className="text-duo-verde-sombra dark:text-duo-verde">· activo</strong>
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={copiarLink} className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                    <HiLink className="w-4 h-4" /> Copiar
                  </button>
                  <a href={linkCliente(t)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                    <HiExternalLink className="w-4 h-4" /> Ver como el cliente
                  </a>
                </span>
              </div>
              {!avisoActivo && (
                <span className="text-[12px] text-suave dark:text-suave-dark">
                  Con este link el cliente ve cómo va su trámite y puede mandar fotos o papeles. Si querés, copialo y pasáselo.
                </span>
              )}
              {avisoActivo && t.estado !== "CANCELADO" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap gap-2">
                    {t.estado === "LISTO" && (
                      <BotonWhatsApp principal href={linkWa("listo")} onClick={() => registrarAviso("listo")}>
                        Avisar que está LISTO
                      </BotonWhatsApp>
                    )}
                    <BotonWhatsApp href={linkWa("alta")} onClick={() => registrarAviso("alta")}>
                      Mandar el link por WhatsApp
                    </BotonWhatsApp>
                  </div>
                  <span className="text-[12px] text-suave dark:text-suave-dark">
                    Se abre WhatsApp con el mensaje escrito
                    {t.persona_telefono ? ` para ${t.persona_telefono}` : " (no tiene teléfono cargado: elegí el contacto)"}. Lo mandás vos y queda anotado.
                  </span>
                </div>
              )}
              {avisoActivo && (
                <div className="flex flex-col gap-1.5">
                  {avisos.length ? (
                    avisos.map((w, i) => (
                      <span key={i} className="inline-flex flex-wrap items-center gap-x-1.5 text-[13px] text-titulo dark:text-titulo-dark">
                        {w.ok ? <HiCheck className="w-4 h-4 text-duo-verde" /> : <HiX className="w-4 h-4 text-duo-rojo" />}
                        WhatsApp {w.motivo === "alta" ? (w.manual ? "con el link" : "al cargarlo") : "de LISTO"} · {ddmmhhmm(w.fecha)}
                        {w.manual ? <span className="text-suave dark:text-suave-dark"> (a mano{w.autor ? ` · ${w.autor}` : ""})</span> : null}
                        {w.simulado ? <span className="text-suave dark:text-suave-dark"> (simulado)</span> : null}
                        {!w.ok ? <span className="text-duo-rojo"> · no salió</span> : null}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13px] text-suave dark:text-suave-dark">Todavía no se le avisó por WhatsApp.</span>
                  )}
                  {!manual && t.estado !== "LISTO" && !cerrado && (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-suave dark:text-suave-dark">
                      <HiClock className="w-4 h-4" /> Cuando pase a LISTO le llega solo
                    </span>
                  )}
                </div>
              )}
              {(avisoActivo || a.puede_cancelar) && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {avisoActivo ? (
                    <button type="button" onClick={() => setModal("mensajes")} className="inline-flex items-center gap-1.5 rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
                      <HiChatAlt2 className="w-4 h-4" /> Ver los mensajes
                    </button>
                  ) : (
                    <span />
                  )}
                  {a.puede_cancelar && (
                    <button type="button" onClick={() => setModal("cancelar")} className="text-[13px] font-semibold text-duo-rojo hover:underline">
                      Cancelar este trámite
                    </button>
                  )}
                </div>
              )}
            </Seccion>
          )}
        </div>
      </div>

      <ModalPrecio
        t={t}
        abierto={modal === "precio" || modal === "precioListo"}
        luegoListo={modal === "precioListo"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cargarPrecio(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          recargarGestores?.();
          toast.success(body.pasar_a_listo ? `${nuevo.numero} → LISTO PARA ENTREGAR` : "Precio guardado");
        }}
      />
      <ModalCobro
        t={t}
        abierto={modal === "cobro" || modal === "cobroListo"}
        luegoListo={modal === "cobroListo"}
        documento={cobroDoc}
        onCerrar={() => {
          setModal(null);
          setCobroDoc(null);
        }}
        onGuardar={async (body) => {
          const nuevo = await registrarCobro(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          setCobroDoc(null);
          recargarGestores?.();
          // aviso = se guardó el cobro pero justo no pudo pasar a LISTO (ej: lo marcaron observado).
          if (nuevo.aviso) toast.error(nuevo.aviso, { duration: 7000 });
          else toast.success(body.pasar_a_listo ? `${nuevo.numero} → LISTO PARA ENTREGAR` : `Cobro de ${plata(body.monto)} guardado`);
        }}
      />
      <ModalObservar
        abierto={modal === "observar"}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cambiarEstado(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          toast.success(`${nuevo.numero} → OBSERVADO`);
        }}
      />
      <ModalCancelar
        abierto={modal === "cancelar"}
        conPlata={!!t.ve_plata}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cambiarEstado(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          recargarGestores?.();
          toast.success(`${nuevo.numero} cancelado`);
        }}
      />
      <ModalCobrar
        t={t}
        abierto={modal === "cobrar"}
        formas={catalogo?.formas_pago || []}
        onCerrar={() => setModal(null)}
        onGuardar={async (body) => {
          const nuevo = await cobrarComision(t.id, body);
          setT(conMisPapeles(nuevo));
          setModal(null);
          recargarGestores?.();
          toast.success(`Comisión de ${plata(nuevo.comision)} cobrada · entró a Balances`);
        }}
      />
      <ModalMensajes t={t} abierto={modal === "mensajes"} onCerrar={() => setModal(null)} />
    </div>
  );
}

/**
 * 👤 El gestor del trámite: foto, horario, dirección y botones para
 * escribirle, llamarlo, mandarle un mail o ir a llevarle papeles.
 * Lo ven la oficina y el admin (el cliente no: su contacto es la oficina).
 */
function ContactoGestor({ t, esAdmin }) {
  const c = t.gestor_contacto || {};
  const hayDatos = !!(c.telefono || c.email || c.direccion);
  return (
    <Seccion titulo="Gestor">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar id={t.gestor} nombre={c.nombre || t.gestor_nombre} foto={c.foto_url || t.gestor_foto} size={48} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <strong className="text-[15px] text-titulo dark:text-titulo-dark truncate">{c.nombre || t.gestor_nombre}</strong>
          {c.horario && (
            <span className="inline-flex items-center gap-1 text-[13px] text-suave dark:text-suave-dark">
              <HiClock className="w-3.5 h-3.5 shrink-0" /> {c.horario}
            </span>
          )}
          {c.direccion && <span className="text-[13px] text-suave dark:text-suave-dark break-words">{c.direccion}</span>}
          {c.email && <span className="text-[13px] text-suave dark:text-suave-dark break-all">{c.email}</span>}
        </div>
      </div>
      {hayDatos ? (
        <BotonesContacto
          c={c}
          nombre={c.nombre || t.gestor_nombre}
          texto={`¡Hola! Te escribo de THAMES por el trámite ${t.numero}${t.patente ? ` (${t.patente})` : ""}.`}
        />
      ) : (
        <span className="text-[13px] text-suave dark:text-suave-dark">
          Todavía no tiene datos de contacto. {esAdmin ? "Cargalos en Gestoría → Gestores (lápiz ✏️)." : "Pedile al admin que los cargue."}
        </span>
      )}
    </Seccion>
  );
}

/**
 * 💵 "Plata 🔒" (solo el admin, 29/09): el precio que cobra la gestoría, lo que el
 * cliente ya pagó (cada cobro con su comprobante) y la COMISIÓN de THAMES.
 * Ej: Precio $ 150.000 · Ya pagó $ 50.000 (falta $ 100.000) · Comisión 10 % = $ 15.000.
 */
function SeccionPlataAdmin({ t, a, docs, ocupado, setModal, onCobro, onBorrar, onDeshacer }) {
  const pct = t.comision_pct != null ? Number(t.comision_pct) : null;
  const precio = t.precio_gestoria != null ? Number(t.precio_gestoria) : null;
  const cobrado = Number(t.cobrado || 0);
  const falta = precio != null ? precio - cobrado : null;
  const antesDeListo = ["RECIBIDO", "ASIGNADO", "EN_REGISTRO", "OBSERVADO"].includes(t.estado);
  const quien = t.gestor ? t.gestor_nombre : "el gestor";
  const comprobantes = docs.filter((x) => x.tipo === "COMPROBANTE");
  const cobros = comprobantes.filter((x) => !x.anterior && x.monto != null);
  const sinMonto = comprobantes.filter((x) => !x.anterior && x.monto == null);
  const anteriores = comprobantes.filter((x) => x.anterior); // de antes del cambio de gestor: no suman
  const deComision = docs.filter((x) => x.tipo === "COMISION");
  const borrar = (x) => (a.puede_borrar_archivos ? () => onBorrar(x) : null);
  const titulo = "text-[11px] font-bold tracking-wide text-suave dark:text-suave-dark";
  const caja = "flex flex-col gap-1.5 rounded-xl border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark p-3.5";
  const nota = "text-[13px] text-suave dark:text-suave-dark";

  let comision;
  if (t.comision_cobrada) {
    comision = (
      <>
        <strong className="text-[22px] text-titulo dark:text-titulo-dark">{plata(t.comision)}</strong>
        <span className="inline-flex items-center gap-1 text-[13px] text-duo-verde-sombra dark:text-duo-verde">
          <HiCheck className="w-4 h-4 shrink-0" /> Cobrada el {ddmm(t.comision_cobrada_en)} ({t.comision_forma_nombre}). Está en Balances como «Comisión gestoría», sin oficina (la oficina no la ve).
        </span>
        {a.puede_deshacer_cobro && (
          <button type="button" onClick={onDeshacer} className="self-start text-[12px] font-semibold text-duo-rojo hover:underline">
            Deshacer el cobro
          </button>
        )}
      </>
    );
  } else if (!t.gestor) {
    comision = (
      <>
        <strong className="text-[22px]">—</strong>
        <span className={nota}>Se calcula cuando lo tome un gestor (con su %).</span>
      </>
    );
  } else if (!(pct > 0)) {
    comision = (
      <>
        <strong className="text-[22px] text-titulo dark:text-titulo-dark">Sin comisión</strong>
        <span className={nota}>{t.gestor_nombre} no paga comisión.</span>
      </>
    );
  } else if (t.comision == null) {
    comision = (
      <>
        <strong className="text-[22px]">—</strong>
        <span className={nota}>Se calcula sola: {fmtPct(pct)} del precio, cuando lo cargue {t.gestor_nombre}.</span>
      </>
    );
  } else {
    comision = (
      <>
        <strong className="text-[22px] text-titulo dark:text-titulo-dark">{plata(t.comision)}</strong>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-linea dark:border-linea-dark pt-2">
          <span className="text-[13px] font-bold text-duo-amarillo-sombra dark:text-duo-amarillo">Pendiente · {t.gestor_nombre} nos la debe</span>
          {a.puede_cobrar && (
            <button type="button" disabled={ocupado} onClick={() => setModal("cobrar")} className="rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50">
              Marcar cobrada
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <Seccion
      titulo={
        <h2 className="text-[15px] font-semibold text-titulo dark:text-titulo-dark">
          Plata <span className="text-[13px] font-medium text-suave dark:text-suave-dark">· la oficina no la ve</span>
        </h2>
      }
      derecha={
        a.puede_precio && (
          <button type="button" onClick={() => setModal("precio")} className="rounded-lg border border-linea dark:border-linea-dark px-3 py-1.5 text-[13px] font-semibold text-titulo dark:text-titulo-dark">
            {precio == null ? "Cargar precio" : a.puede_pct ? "Cambiar precio o %" : "Cambiar precio"}
          </button>
        )
      }
    >
      <p className="rounded-lg border border-duo-verde/30 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-3 py-2 text-[13px] text-duo-verde-sombra dark:text-duo-verde">
        El cliente le paga directo a la gestoría: el gestor carga el precio y sube el comprobante de cada cobro. La comisión se calcula sola, la ves solo vos (el admin) y es lo único que entra a la caja.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={caja}>
          <span className={titulo}>PRECIO QUE COBRA LA GESTORÍA</span>
          {precio == null ? (
            <>
              <strong className="text-[22px] text-duo-amarillo-sombra dark:text-duo-amarillo">Falta</strong>
              <span className={nota}>
                {t.gestor ? `Lo carga ${t.gestor_nombre}.` : "Lo carga el gestor cuando lo tome."}
                {antesDeListo ? " Sin precio no pasa a LISTO." : ""}
              </span>
            </>
          ) : (
            <>
              <strong className="text-[22px] text-titulo dark:text-titulo-dark">{plata(precio)}</strong>
              <span className={nota}>
                Lo cargó {t.precio_cargado_por_nombre || "—"}{t.precio_cargado_en ? ` el ${ddmm(t.precio_cargado_en)}` : ""}. No entra a la caja.
              </span>
            </>
          )}
        </div>
        <div className={caja}>
          <span className={titulo}>EL CLIENTE YA PAGÓ</span>
          {cobros.length ? (
            <>
              <strong className="text-[22px] text-titulo dark:text-titulo-dark">{plata(cobrado)}</strong>
              <span className={nota}>
                {cobros.length === 1 ? "1 comprobante" : `${cobros.length} comprobantes`}
                {falta == null ? "" : falta > 0 ? ` · falta ${plata(falta)}` : falta === 0 ? " · pagó todo" : ""}
              </span>
              {falta != null && falta < 0 && (
                <span className="text-[13px] font-semibold text-duo-amarillo-sombra dark:text-duo-amarillo">
                  Suma {plata(-falta)} más que el precio: fijate que esté bien.
                </span>
              )}
            </>
          ) : (
            <>
              <strong className="text-[22px] text-duo-amarillo-sombra dark:text-duo-amarillo">$ 0</strong>
              <span className={nota}>
                Todavía no hay comprobantes. Los sube {quien} cada vez que el cliente le paga.
                {antesDeListo ? " Sin al menos uno no pasa a LISTO." : ""}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl border border-duo-verde/40 bg-duo-verde-soft/50 dark:bg-[var(--color-duo-verde-soft-dark)] p-3.5">
        <span className="inline-flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wide text-duo-verde-sombra dark:text-duo-verde">
          COMISIÓN PARA THAMES{pct != null && !t.comision_cobrada ? ` · ${fmtPct(pct)}` : ""}
          <Candado />
        </span>
        {comision}
      </div>

      {/* 🧾 Los comprobantes: cada cobro al cliente (con su monto) y el pago de la comisión */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">Cobros al cliente ({cobros.length})</span>
          {a.puede_cobro && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => onCobro(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-duo-verde hover:bg-duo-verde-sombra px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              <HiCamera className="w-4 h-4" aria-hidden="true" /> Registrar un cobro
            </button>
          )}
        </div>
        {cobros.map((x) => (
          <div key={x.id} className="flex items-center gap-2">
            <span className="shrink-0 min-w-[5.5rem] text-center rounded-lg bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] px-2 py-1 text-[13px] font-bold text-duo-verde-sombra dark:text-duo-verde">
              {plata(x.monto)}
            </span>
            <div className="flex-1 min-w-0">
              <Archivo d={x} etiqueta={x.rol === "CLIENTE" ? <Etiqueta tono="azul">lo mandó el cliente</Etiqueta> : null} onBorrar={borrar(x)} />
            </div>
          </div>
        ))}
        {sinMonto.map((x) => (
          <div key={x.id} className="flex flex-col gap-2 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-3">
            <span className="text-[13px] font-semibold text-duo-azul dark:text-blue-200">
              {x.rol === "CLIENTE" ? "El cliente mandó un comprobante desde su link: falta cargar cuánto pagó." : "Comprobante sin monto: falta cargar cuánto pagó."}
            </span>
            <Archivo d={x} onBorrar={borrar(x)} />
            {a.puede_cobro && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => onCobro(x)}
                className="self-start rounded-lg bg-duo-azul hover:bg-duo-azul-sombra px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                Cargar cuánto pagó
              </button>
            )}
          </div>
        ))}
        {anteriores.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">De antes del cambio de gestor (no suman)</span>
            {anteriores.map((x) => (
              <div key={x.id} className="flex items-center gap-2 opacity-75">
                {x.monto != null && (
                  <span className="shrink-0 min-w-[5.5rem] text-center rounded-lg border border-linea dark:border-linea-dark px-2 py-1 text-[13px] font-semibold text-suave dark:text-suave-dark">
                    {plata(x.monto)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <Archivo d={x} onBorrar={borrar(x)} />
                </div>
              </div>
            ))}
          </div>
        )}
        {deComision.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-suave dark:text-suave-dark">Pago de la comisión ({deComision.length})</span>
            {deComision.map((x) => (
              <Archivo key={x.id} d={x} onBorrar={borrar(x)} />
            ))}
          </div>
        )}
      </div>
    </Seccion>
  );
}
