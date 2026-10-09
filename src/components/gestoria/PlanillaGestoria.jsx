// src/components/gestoria/PlanillaGestoria.jsx
//
// 🚗🎨 GESTORÍA en la PLANILLA DE COLORES (09/10, diseño 3 estilo Monday.com).
// Reemplaza al tablero de la oficina/admin y al Inicio/Trámites de la app del gestor.
//
//   Colores:  Sin gestor (gris) · Para presentar (celeste) · En el registro (índigo) ·
//             Le falta algo (naranja) · Listo para retirar (verde) · Terminados.
//   Tocás el color → «Pasar a…» con lo que sigue primero. Ej. en EN_REGISTRO:
//     [ Listo para retirar · LO QUE SIGUE ]  [ Le falta algo → "¿Qué pidió el registro?" ]
//   Con las comisiones prendidas, pasar a LISTO pide el comprobante del cobro / el precio
//   con las mismas ventanitas de siempre (CobroGestora / ModalCobro, PrecioGestora / ModalPrecio).
//   Tocás el nombre → panel con Novedades (anotar), Datos, Papeles (tildar y subir) y
//   «Ficha completa» (/gestoria/tramite/:id).
//
// Las reglas las sigue validando el SERVIDOR (ej: la oficina no pasa a LISTO si falta
// que el gestor cargue su cobro: el mensaje del servidor sale en rojo).
// props: vista / onVista (la app del gestor manda la vista según la pantalla).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiOutlineChatBubbleLeftRight, HiOutlineLink } from "react-icons/hi2";

import useDatosVivos from "../../hooks/useDatosVivos";
import Planilla from "../planilla/Planilla";
import { BotonPanel, Marca, PatenteChica, Persona } from "../planilla/PiezasPlanilla";
import { primerNombre } from "../planilla/planillaUtils";
import { useGestoria } from "./gestoriaContext";
import { useGestora } from "./gestora/gestoraContext";
import {
  anotar,
  asignarGestor,
  avisoWhatsapp,
  borrarDocumento,
  cambiarEstado,
  cargarPrecio,
  editarTramite,
  guardarDocumento,
  listarAbiertos,
  listarCerrados,
  mensajeError,
  pedirResumen,
  pedirTramite,
  registrarCobro,
  subirArchivo,
} from "../../services/gestoria";
import { Archivo, BotonArchivo, Candado } from "./Piezas";
import { ModalCobro, ModalPrecio } from "./ModalesTramite";
import CobroGestora from "./gestora/CobroGestora";
import PrecioGestora from "./gestora/PrecioGestora";
import { esDePersona } from "./gestora/gestoraUtils";
import {
  colorOficina,
  ddmmhhmm,
  diasEnEstado,
  esDemorado,
  fechaCorta,
  linkTel,
  linkWhatsApp,
  linkWhatsAppOElegir,
  plata,
  textoListoGestor,
  tipoCorto,
} from "./gestoriaUtils";

const COLOR = "#5b52e6";
const SIN_APP = {};
const ABIERTOS_STAFF = ["RECIBIDO", "ASIGNADO", "EN_REGISTRO", "OBSERVADO", "LISTO"];
const ABIERTOS_GESTOR = ["ASIGNADO", "EN_REGISTRO", "OBSERVADO", "LISTO"];
const MAX_FALTA = 255;

// Lo que más pide el registro (además de los papeles del trámite).
const PIDE_AUTO = ["Firma del titular", "Certificar una firma", "Verificación policial", "Libre deuda de patentes", "Pagar aranceles", "Corregir un formulario"];
const PIDE_PERSONA = ["Otro turno", "Pagar aranceles", "Corregir un formulario"];

function estadosDe(esGestor) {
  return {
    RECIBIDO: { n: "Sin gestor", c: "#64748b" },
    ASIGNADO: { n: esGestor ? "Para presentar" : "Para presentar", c: "#0284c7" },
    EN_REGISTRO: { n: "En el registro", c: "#4f46e5" },
    OBSERVADO: { n: "Le falta algo", c: "#ea580c" },
    LISTO: { n: "Listo para retirar", c: "#16a34a" },
    ENTREGADO: { n: "Entregado", c: "#475569" },
    CANCELADO: { n: "Cancelado", c: "#7c8799" },
  };
}

/** Link «Mi trámite» con la dirección de ESTA app (igual que la ficha). */
function linkCliente(t) {
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
  const token = String(t?.portal_path || "").split("/mi-tramite/")[1] || "";
  return token ? `${base}/#/mi-tramite/${token}` : "";
}

/** 📎 Papeles: la lista para tildar + los archivos (y subir uno nuevo). */
function PapelesTramite({ t, onCambio }) {
  const ac = t.acciones || {};
  const [lista, setLista] = useState(() => t.papeles || []);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (!guardando) setLista(t.papeles || []);
  }, [t, guardando]);
  const docs = (t.documentos || []).filter((d) => d.tipo === "PAPEL");

  const tildar = async (i) => {
    if (!ac.puede_papeles || guardando) return;
    const nueva = lista.map((p, j) => (j === i ? { ...p, ok: !p.ok } : p));
    setLista(nueva);
    setGuardando(true);
    try {
      await editarTramite(t.id, { papeles: nueva });
      await onCambio();
    } catch (e) {
      toast.error(mensajeError(e));
      setLista(t.papeles || []);
    } finally {
      setGuardando(false);
    }
  };
  const subir = async (file) => {
    try {
      const arch = await subirArchivo(file, "gestoria/papeles");
      await guardarDocumento(t.id, { ...arch, tipo: "PAPEL" });
      toast.success(`Subido: ${arch.nombre}`);
      await onCambio();
    } catch (e) {
      toast.error(mensajeError(e, e?.message || "No se pudo subir el archivo."));
    }
  };
  const borrar = async (d) => {
    if (!window.confirm(`¿Borrar «${d.nombre}»? No se puede deshacer.`)) return;
    try {
      await borrarDocumento(t.id, d.id);
      toast.success("Archivo borrado");
      await onCambio();
    } catch (e) {
      toast.error(mensajeError(e));
    }
  };
  const ok = lista.filter((p) => p.ok).length;

  return (
    <div className="flex flex-col gap-4">
      {lista.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13.5px] font-bold text-titulo dark:text-titulo-dark">
            Lo que hay que juntar <span className="font-semibold text-suave dark:text-suave-dark">· {ok} de {lista.length}</span>
          </h3>
          <ul className="flex flex-col gap-1.5">
            {lista.map((p, i) => (
              <li key={`${p.nombre}-${i}`}>
                <button
                  type="button"
                  onClick={() => tildar(i)}
                  disabled={!ac.puede_papeles || guardando}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 py-2.5 text-left text-[14px] disabled:cursor-default"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[12px] font-black ${p.ok ? "border-green-600 bg-green-600 text-white" : "border-linea dark:border-linea-dark"}`}>
                    {p.ok ? "✓" : ""}
                  </span>
                  <span className={p.ok ? "text-suave line-through dark:text-suave-dark" : "text-titulo dark:text-titulo-dark"}>{p.nombre}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-bold text-titulo dark:text-titulo-dark">Archivos y fotos ({docs.length})</h3>
          {ac.puede_subir_papel && (
            <BotonArchivo onElegir={subir} variant="violeta">
              Subir foto o PDF
            </BotonArchivo>
          )}
        </div>
        {docs.length === 0 ? (
          <p className="rounded-lg bg-surface dark:bg-surface-dark px-3 py-3 text-[13px] text-suave dark:text-suave-dark">Todavía no hay archivos.</p>
        ) : (
          docs.map((d) => (
            <Archivo
              key={d.id}
              d={d}
              etiqueta={d.rol === "CLIENTE" ? <Marca tono="azul">Lo mandó el cliente</Marca> : null}
              onBorrar={ac.puede_borrar_archivos ? () => borrar(d) : null}
            />
          ))
        )}
      </section>
    </div>
  );
}

export default function PlanillaGestoria({ vista, onVista }) {
  const { esAdmin, esGestor, esStaff, catalogo, gestores = [], recargarGestores } = useGestoria();
  const ctxApp = useGestora(); // 📱 en la app del gestor la lista ya la trae AppGestora
  const app = ctxApp.cargar ? ctxApp : SIN_APP;
  const enApp = esGestor && !!app.cargar;
  const navigate = useNavigate();

  // ── Datos (oficina y admin: se piden acá; gestor: los de su app) ──
  const [propia, setPropia] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [errorPropio, setErrorPropio] = useState("");
  const cargarPropia = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([listarAbiertos(), pedirResumen()]);
      setPropia(Array.isArray(l) ? l : l?.results || []);
      setResumen(r);
      setErrorPropio("");
    } catch (e) {
      setErrorPropio(mensajeError(e, "No se pudieron traer los trámites."));
    }
  }, []);
  useEffect(() => {
    if (!enApp) cargarPropia();
  }, [enApp, cargarPropia]);
  useDatosVivos(["gestoria"], () => cargarPropia(), { activo: !enApp });

  const filas = enApp ? app.lista : propia;
  const error = enApp ? app.error : errorPropio;
  const recargar = useCallback(async () => {
    if (enApp) await app.cargar();
    else await cargarPropia();
    recargarGestores?.();
  }, [enApp, app, cargarPropia, recargarGestores]);

  // ── Ventanitas de plata (para pasar a LISTO con las comisiones prendidas) ──
  const [modal, setModal] = useState(null); // {tipo: "cobro"|"precio", t, luegoListo}
  const cerrarModal = () => setModal(null);
  const despuesDePlata = async (nuevo, body, txtOk) => {
    cerrarModal();
    await recargar();
    if (nuevo?.aviso) toast.error(nuevo.aviso, { duration: 7000 });
    else if (body.pasar_a_listo && nuevo?.estado === "LISTO") toast.success(esGestor ? textoListoGestor(catalogo) : "¡Listo para retirar!");
    else toast.success(txtOk);
  };

  const conPlata = catalogo?.comisiones === true;

  const a = useMemo(() => {
    const ESTADOS = estadosDe(esGestor);
    const activos = gestores.filter((g) => g.activo !== false);
    const opsGestor = (sin = null) =>
      activos
        .filter((g) => String(g.id) !== String(sin))
        .map((g) => ({
          v: g.id,
          n: g.nombre,
          foto: g.foto_url,
          sub: `${g.abiertos || 0} en curso${g.promedio_dias ? ` · tarda ${Math.round(Number(g.promedio_dias))} días` : ""}`,
        }));
    const gestorDe = (t) => primerNombre(t.gestor_nombre) || "el gestor";
    const clienteDe = (t) => primerNombre(t.persona_nombre) || "el cliente";
    const pideDe = (t) => {
      const vistos = new Set();
      return [...(t.papeles_faltan || []), ...(esDePersona(t) ? PIDE_PERSONA : PIDE_AUTO)].filter((x) => {
        const k = String(x).toLowerCase();
        if (!x || vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
    };
    const askObservar = (t) => [
      { k: "falta", t: "chips", l: esDePersona(t) ? "¿Qué te pidieron?" : "¿Qué pidió el registro?", ops: pideDe(t).slice(0, 10), ph: "Otra cosa (escribila)" },
      { k: "visible", t: "si", txt: "Que el cliente lo vea en su link", def: true },
    ];

    return {
      clave: esGestor ? "gestoria-gestor" : "gestoria",
      titulo: "Mis trámites",
      icono: "🚗",
      color: COLOR,
      mostrarTitulo: enApp,
      item: "trámite",
      items: "trámites",
      filas,
      error,
      recargar,
      estados: ESTADOS,
      grupos: (esGestor ? ABIERTOS_GESTOR : ABIERTOS_STAFF).map((e) => ({ id: e, n: ESTADOS[e].n, c: ESTADOS[e].c })),
      estadoDe: (t) => t.estado,
      etiquetaEstado: (t) => (t.estado === "EN_REGISTRO" && esDePersona(t) ? "Presentado" : ESTADOS[t.estado]?.n || t.estado_nombre),
      abierto: (t) => (esGestor ? ["ASIGNADO", "EN_REGISTRO", "OBSERVADO"].includes(t.estado) : ABIERTOS_STAFF.includes(t.estado)),
      terminados: {
        n: "Entregados y cancelados",
        c: "#64748b",
        cargar: async (page) => {
          const r = await listarCerrados(page);
          return { results: r.results || [], next: r.next ? page + 1 : null, count: r.count };
        },
      },
      nombre: (t) => t.persona_nombre || "Sin nombre",
      sub: (t) => `${tipoCorto(t) || "Trámite"} · ${t.numero}`,
      subCelu: (t) => `${tipoCorto(t) || "Trámite"}${t.con_vehiculo !== false && t.patente ? ` · ${t.patente}` : ""}`,
      marcas: (t) =>
        [
          t.aviso_listo_pendiente && { txt: "Avisar al cliente", tono: "verde" },
          t.cliente_subio_papeles && { txt: "Cliente mandó papeles", tono: "azul" },
          t.sin_precio && { txt: "Sin precio", tono: "ambar" },
          esStaff && t.cargado_por_gestor && { txt: "Lo cargó el gestor", tono: "violeta" },
        ].filter(Boolean),
      columnas: [
        ...(esGestor
          ? []
          : [{ titulo: "Gestor", ancho: "150px", render: (t) => <Persona id={t.gestor} nombre={t.gestor_nombre} foto={t.gestor_foto} vacio="Sin gestor" /> }]),
        {
          titulo: "Patente",
          ancho: "120px",
          render: (t) => (t.con_vehiculo === false ? <span className="text-[12.5px] text-suave dark:text-suave-dark">De la persona</span> : <PatenteChica p={t.patente} vacio="Sin patente" />),
        },
        ...(esAdmin || esGestor
          ? [
              {
                titulo: "Oficina",
                ancho: "130px",
                render: (t) => (
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-titulo dark:text-titulo-dark">
                    <i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: colorOficina(t.oficina) }} />
                    <span className="truncate">{t.oficina_nombre || "—"}</span>
                  </span>
                ),
              },
            ]
          : []),
      ],
      dias: (t) => diasEnEstado(t),
      diasTitulo: "En el estado",
      demorado: (t) => esDemorado(t) && !(esGestor && t.estado === "LISTO"),
      buscar: (t) =>
        [t.persona_nombre, t.persona_dni, t.patente, t.numero, t.tipo_txt, t.tipo_corto, t.tipo_nombre, t.detalle, t.gestor_nombre, t.oficina_nombre, t.vehiculo].filter(Boolean).join(" "),
      buscarPh: "Buscar patente, DNI o cliente",
      filtros: esGestor
        ? []
        : [
            {
              id: "gestor",
              etiqueta: "Gestor",
              opciones: [...activos.map((g) => [String(g.id), g.nombre]), ["sin", "Sin gestor"]],
              pasa: (t, v) => (v === "sin" ? !t.gestor : String(t.gestor) === v),
            },
            ...(esAdmin
              ? [
                  {
                    id: "oficina",
                    etiqueta: "Oficina",
                    opciones: (catalogo?.oficinas || []).map((o) => [String(o.id), o.nombre]),
                    pasa: (t, v) => String(t.oficina) === v,
                  },
                ]
              : []),
            {
              id: "tipo",
              etiqueta: "Tipo",
              opciones: (catalogo?.tipos || []).map((tp) => [String(tp.id), tp.corto || tp.nombre]),
              pasa: (t, v) => String(t.tipo) === v,
            },
          ],

      // 👉 En una frase, qué hay que hacer.
      sigue: (t) => {
        const e = t.estado;
        if (e === "ENTREGADO") return "Terminado: el cliente ya lo retiró.";
        if (e === "CANCELADO") return "Se canceló.";
        if (esGestor) {
          if (e === "ASIGNADO") return esDePersona(t) ? "Presentalo y marcá «Lo presenté»." : "Llevalo al registro y marcá «Lo presenté».";
          if (e === "EN_REGISTRO") return "Cuando salga, tocá el color y elegí «Listo para retirar».";
          if (e === "OBSERVADO") return `Conseguir: ${t.falta || "lo que pidieron"}.`;
          if (e === "LISTO") return "La oficina se lo entrega al cliente.";
          return "";
        }
        if (e === "RECIBIDO") return "Elegí qué gestor lo hace.";
        if (e === "ASIGNADO") return `${gestorDe(t)} lo tiene que llevar al registro.`;
        if (e === "EN_REGISTRO") return `Esperar. ${gestorDe(t)} avisa cuando sale.`;
        if (e === "OBSERVADO") return `${gestorDe(t)} tiene que conseguir: ${t.falta || "lo que pidió el registro"}.`;
        if (e === "LISTO") return t.aviso_listo_pendiente ? `Avisarle a ${clienteDe(t)} que lo venga a buscar.` : "Cuando lo retire, marcá «Entregado».";
        return "";
      },

      // 🔥 Lo de hoy: rojo = urgente · ámbar = hoy · azul = revisar.
      tareas: (t) => {
        const e = t.estado;
        const d = diasEnEstado(t);
        const T = [];
        if (esGestor) {
          if (e === "OBSERVADO") T.push({ tono: "rojo", txt: `Le falta: ${t.falta || "lo que pidió el registro"}` });
          if (e === "ASIGNADO") T.push({ tono: d >= 7 ? "rojo" : "ambar", txt: `Presentarlo en el registro (${d === 0 ? "te llegó hoy" : d === 1 ? "te llegó ayer" : `hace ${d} días que lo tenés`})` });
          if (e === "EN_REGISTRO" && d >= 5) T.push({ tono: "azul", txt: `Pasá a ver si salió (${d} días en el registro)` });
          if (conPlata && t.ve_plata && !t.cobros_n && ["ASIGNADO", "EN_REGISTRO", "OBSERVADO"].includes(e)) T.push({ tono: "azul", txt: "Falta el comprobante de lo que te pagó" });
          if (t.cliente_subio_papeles) T.push({ tono: "azul", txt: `${clienteDe(t)} mandó papeles desde su celu: revisalos` });
          return T;
        }
        if (e === "RECIBIDO") T.push({ tono: "rojo", txt: "Elegir qué gestor lo hace" });
        if (e === "OBSERVADO") T.push({ tono: "rojo", txt: `Le falta: ${t.falta || "lo que pidió el registro"}` });
        if (e === "LISTO" && t.aviso_listo_pendiente) T.push({ tono: "ambar", txt: `Avisarle a ${clienteDe(t)} que ya está listo` });
        if (esDemorado(t) && e !== "RECIBIDO" && e !== "OBSERVADO")
          T.push({ tono: "ambar", txt: e === "LISTO" ? `Hace ${d} días que está listo y no lo retiró` : `Hace ${d} días que no se mueve: preguntale a ${gestorDe(t)}` });
        if (t.cliente_subio_papeles) T.push({ tono: "azul", txt: `${clienteDe(t)} mandó papeles desde su celu: revisalos` });
        if (esAdmin && t.sin_precio) T.push({ tono: "azul", txt: `Falta que ${gestorDe(t)} cargue el precio` });
        return T;
      },

      // 🎨 El menú del color.
      menu: (t) => {
        const e = t.estado;
        const persona = esDePersona(t);
        const opciones = [];
        const extras = [];
        if (esGestor) {
          if (e === "ASIGNADO") opciones.push({ id: "presentar", a: "EN_REGISTRO", etiqueta: persona ? "Presentado" : "En el registro", txt: persona ? "Lo presenté" : "Lo presenté en el registro", principal: true, ok: "Anotado: lo presentaste" });
          if (e === "EN_REGISTRO") {
            const pidePlata = conPlata && t.ve_plata && !t.cobros_n;
            opciones.push({ id: "listo", a: "LISTO", txt: pidePlata ? "¡Ya salió! (te pide el comprobante del cobro)" : "¡Ya salió!", principal: true });
            opciones.push({ id: "observar", a: "OBSERVADO", txt: persona ? "Me pidieron algo más" : "El registro pidió algo más", ask: askObservar(t), preg: persona ? "¿Qué te pidieron?" : "¿Qué pidió el registro?", confirmar: "Marcar «Le falta algo»", ok: "Marcado: le falta algo" });
          }
          if (e === "OBSERVADO") opciones.push({ id: "represento", a: "EN_REGISTRO", etiqueta: persona ? "Presentado" : "En el registro", txt: "Ya lo conseguí y lo presenté otra vez", principal: true, ok: "Anotado: lo presentaste otra vez" });
          extras.push({ id: "nota", ic: "📝", txt: "Anotar algo", abrirPanel: "nov" });
          extras.push({ id: "papel", ic: "📎", txt: "Tildar o subir papeles", abrirPanel: "pap" });
          if (conPlata && t.ve_plata) extras.push({ id: "cobro", ic: "💵", txt: "Recibí plata", sub: "Cargás lo que te pagó y el comprobante" });
          return { aviso: e === "LISTO" ? "Ya está listo: la oficina se lo entrega al cliente." : null, opciones, extras };
        }
        // 🏢 Oficina y admin
        const sinGestor = !t.gestor;
        if (e === "RECIBIDO") {
          opciones.push({ id: "asignar", a: "ASIGNADO", txt: "Elegís qué gestor lo lleva", principal: true, ask: [{ k: "gestor", t: "elegir", l: "¿Qué gestor lo hace?", ops: opsGestor() }], preg: "¿Qué gestor lo hace?", confirmar: "Pasárselo" });
        }
        if (e === "ASIGNADO") opciones.push({ id: "presentar", a: "EN_REGISTRO", txt: `${gestorDe(t)} ya lo presentó en el registro`, principal: true });
        if (e === "EN_REGISTRO") {
          opciones.push({ id: "listo", a: "LISTO", txt: "Ya salió del registro", principal: true });
          opciones.push({ id: "observar", a: "OBSERVADO", txt: "El registro pidió algo más", ask: askObservar(t), preg: "¿Qué pidió el registro?", confirmar: "Marcar «Le falta algo»", ok: "Marcado: le falta algo" });
        }
        if (e === "OBSERVADO") opciones.push({ id: "represento", a: "EN_REGISTRO", txt: `${gestorDe(t)} ya lo presentó otra vez`, principal: true });
        if (e === "LISTO") {
          if (t.aviso_listo_pendiente) extras.push({ id: "avisar", ic: "💬", txt: `Avisarle a ${clienteDe(t)} por WhatsApp`, sub: "Se abre el panel con el botón de WhatsApp", abrirPanel: "nov" });
          opciones.push({ id: "entregar", a: "ENTREGADO", txt: "El cliente lo retiró: se termina", principal: true, ok: "¡Entregado! Trámite terminado" });
        }
        if (["ASIGNADO", "EN_REGISTRO", "OBSERVADO"].includes(e) && !sinGestor) {
          extras.push({ id: "gestor", ic: "🔄", txt: "Cambiar de gestor", sub: `Ahora lo tiene ${gestorDe(t)}`, ask: [{ k: "gestor", t: "elegir", l: "¿A qué gestor se lo pasás?", ops: opsGestor(t.gestor) }], preg: "¿A qué gestor se lo pasás?", confirmar: "Pasárselo" });
        }
        extras.push({ id: "nota", ic: "📝", txt: "Anotar algo", abrirPanel: "nov" });
        extras.push({ id: "papel", ic: "📎", txt: "Tildar o subir papeles", abrirPanel: "pap" });
        if (e !== "LISTO" || esAdmin) {
          extras.push({
            id: "cancelar",
            ic: "✖️",
            txt: "Cancelar el trámite",
            peligro: true,
            ask: [{ k: "motivo", t: "texto", l: "¿Por qué se cancela?", opcional: true, ph: "Ej: el cliente se arrepintió" }],
            preg: "¿Cancelar el trámite?",
            confirmar: "Sí, cancelarlo",
            ok: "Trámite cancelado",
          });
        }
        return {
          aviso: sinGestor && e !== "RECIBIDO" ? "Primero elegí un gestor." : null,
          opciones,
          extras,
        };
      },

      ejecutar: async (t, op, vals, det) => {
        const id = t.id;
        if (op.id === "asignar" || op.id === "gestor") {
          await asignarGestor(id, vals.gestor);
          const g = gestores.find((x) => String(x.id) === String(vals.gestor));
          return `Listo: se lo pasaste a ${primerNombre(g?.nombre) || "el gestor"}`;
        }
        if (op.id === "presentar" || op.id === "represento") {
          await cambiarEstado(id, { estado: "EN_REGISTRO" });
          return op.ok || "Anotado: está en el registro";
        }
        if (op.id === "observar") {
          const falta = String(vals.falta || "").slice(0, MAX_FALTA);
          await cambiarEstado(id, { estado: "OBSERVADO", falta, visible_cliente: !!vals.visible });
          return op.ok;
        }
        if (op.id === "listo") {
          // 💵 Comisiones prendidas: sin comprobante (o sin precio) se piden en su ventanita.
          if (t.ve_plata && (!t.cobros_n || t.precio_gestoria == null)) {
            const full = det || (await pedirTramite(id));
            setModal({ tipo: !t.cobros_n ? "cobro" : "precio", t: full, luegoListo: true });
            return false;
          }
          await cambiarEstado(id, { estado: "LISTO" });
          return esGestor ? textoListoGestor(catalogo) : "¡Listo para retirar!";
        }
        if (op.id === "entregar") {
          await cambiarEstado(id, { estado: "ENTREGADO" });
          return op.ok;
        }
        if (op.id === "cancelar") {
          await cambiarEstado(id, { estado: "CANCELADO", motivo: String(vals.motivo || "").slice(0, 255) });
          return op.ok;
        }
        if (op.id === "cobro") {
          const full = det || (await pedirTramite(id));
          setModal({ tipo: "cobro", t: full, luegoListo: false });
          return false;
        }
        throw new Error("Esa opción todavía no está.");
      },

      nuevo: null, // «Nuevo trámite» ya está arriba (oficina) y en la barra de abajo (gestor)
      vista,
      onVista,
      vistaInicial: "hoy",
      arriba:
        esAdmin && conPlata && (resumen?.avisos_pago || []).length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-duo-azul/40 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] px-4 py-3 text-[13px] text-duo-azul">
            <span className="inline-flex flex-wrap items-center gap-2">
              <span>
                <strong>{[...new Set(resumen.avisos_pago.map((x) => x.gestor_nombre))].join(" y ")}</strong> mandó comprobantes de pago de comisiones (
                {plata(resumen.avisos_pago.reduce((s, x) => s + Number(x.monto || 0), 0))}).
              </span>
              <Candado />
            </span>
            <button type="button" onClick={() => navigate("/gestoria/gestores")} className="rounded-lg border border-duo-azul/40 bg-card dark:bg-card-dark px-3 py-1.5 font-semibold">
              Revisar en Gestores
            </button>
          </div>
        ) : null,

      // 🗂️ El panel del costado.
      panel: {
        cargar: (id) => pedirTramite(id),
        sub: (t) => `${tipoCorto(t) || "Trámite"} · ${t.numero}${t.con_vehiculo !== false && t.patente ? ` · ${t.patente}` : ""}`,
        novedades: (d) =>
          (d.movimientos || []).map((m) => ({
            id: m.id,
            autor: m.autor,
            fecha: m.fecha,
            texto: m.texto,
            chips: [m.visible_cliente && "👁 Lo ve el cliente", m.solo_admin && "🔒 Solo admin", m.con_plata && "💵 Plata"].filter(Boolean),
          })),
        puedeAnotar: (d) => !!d.acciones?.puede_nota,
        anotar: (d, texto, { cliente }) => anotar(d.id, { texto, visible_cliente: !!cliente, solo_admin: false, privada: false }),
        opcionCliente: "Que lo vea el cliente en su link",
        phNovedad: "Escribí una novedad (ej: llamé al registro, sale el jueves)…",
        datos: (d) => [
          ["Cliente", [d.persona_nombre, d.persona_dni && `DNI ${d.persona_dni}`].filter(Boolean).join(" · ")],
          [
            "Teléfono",
            d.persona_telefono ? (
              <a href={linkTel(d.persona_telefono) || undefined} className="font-semibold text-[var(--acc)] hover:underline">
                {d.persona_telefono}
              </a>
            ) : null,
          ],
          ["Trámite", [d.tipo_nombre || d.tipo_txt || tipoCorto(d), d.detalle].filter(Boolean).join(" · ")],
          ["Número", d.numero],
          ["Vehículo", d.con_vehiculo === false ? "Trámite de la persona" : [d.patente, d.vehiculo].filter(Boolean).join(" · ") || "Sin patente"],
          ["Gestor", d.gestor_nombre || "Sin gestor"],
          ["Oficina", d.oficina_nombre],
          ["Póliza", d.poliza_label || null],
          ["Le falta", d.estado === "OBSERVADO" ? d.falta : null],
          ["Papeles", d.papeles_total ? `${d.papeles_ok} de ${d.papeles_total}` : null],
          ["Fecha estimada", d.fecha_estimada ? fechaCorta(d.fecha_estimada) : null],
          ["Precio", d.ve_plata ? (d.precio_gestoria != null ? plata(d.precio_gestoria) : "Sin cargar") : null],
          ["Cobrado", d.ve_plata && d.cobros_n ? plata(d.cobrado) : null],
          ["Cargado", d.creado_en ? `${ddmmhhmm(d.creado_en)}${d.creado_por_nombre ? ` · ${d.creado_por_nombre}` : ""}` : null],
          ["Motivo de la cancelación", d.motivo_cancelacion || null],
        ],
        papeles: (d, recargarPanel) => <PapelesTramite t={d} onCambio={recargarPanel} />,
        acciones: (d, recargarPanel) => {
          if (!esStaff) return null;
          const modo = d.whatsapp_modo;
          const textoWa = (motivo) => {
            const txt = d.whatsapp_textos?.[motivo] || "";
            return d.portal_link ? txt.split(d.portal_link).join(linkCliente(d)) : txt;
          };
          const B = [];
          if (d.estado === "LISTO" && modo && modo !== "apagado" && (d.aviso_listo_pendiente || modo === "manual")) {
            B.push(
              <BotonPanel
                key="listo"
                tono="verde"
                href={linkWhatsAppOElegir(d.persona_telefono, textoWa("listo"))}
                icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}
                onClick={() =>
                  avisoWhatsapp(d.id, "listo")
                    .then(() => {
                      toast.success("Anotado: se le avisó que está listo");
                      return recargarPanel();
                    })
                    .catch((e) => toast.error(mensajeError(e, "No se pudo anotar el aviso.")))
                }
              >
                Avisarle que está listo
              </BotonPanel>
            );
          } else if (linkWhatsApp(d.persona_telefono)) {
            B.push(
              <BotonPanel key="wa" tono="verde" href={linkWhatsApp(d.persona_telefono)} icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}>
                WhatsApp al cliente
              </BotonPanel>
            );
          }
          const link = linkCliente(d);
          if (link) {
            B.push(
              <BotonPanel
                key="link"
                icono={<HiOutlineLink className="h-4 w-4" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    toast.success("Link copiado: pegáselo al cliente");
                  } catch {
                    window.prompt("Copiá este link:", link);
                  }
                }}
              >
                Copiar link del cliente
              </BotonPanel>
            );
          }
          return B;
        },
        ficha: {
          txt: "Ficha completa",
          onClick: (t) => navigate(`/gestoria/tramite/${t.id}`, esGestor ? { state: { desde: vista === "todos" ? "tramites" : "inicio" } } : undefined),
        },
      },
    };
  }, [esAdmin, esGestor, esStaff, enApp, catalogo, gestores, filas, error, recargar, navigate, vista, onVista, resumen, conPlata]);

  return (
    <>
      <Planilla a={a} />

      {/* 💵 Las ventanitas de plata (las mismas de la ficha) */}
      {modal?.tipo === "cobro" &&
        (esGestor ? (
          <CobroGestora
            t={modal.t}
            abierto
            luegoListo={modal.luegoListo}
            onCerrar={cerrarModal}
            onGuardar={async (body) => despuesDePlata(await registrarCobro(modal.t.id, body), body, "Listo: quedó el comprobante del cobro")}
          />
        ) : (
          <ModalCobro
            t={modal.t}
            abierto
            luegoListo={modal.luegoListo}
            onCerrar={cerrarModal}
            onGuardar={async (body) => despuesDePlata(await registrarCobro(modal.t.id, body), body, "Listo: quedó el comprobante del cobro")}
          />
        ))}
      {modal?.tipo === "precio" &&
        (esGestor ? (
          <PrecioGestora
            t={modal.t}
            abierto
            luegoListo={modal.luegoListo}
            onCerrar={cerrarModal}
            onGuardar={async (body) => despuesDePlata(await cargarPrecio(modal.t.id, body), body, "Precio guardado")}
          />
        ) : (
          <ModalPrecio
            t={modal.t}
            abierto
            luegoListo={modal.luegoListo}
            onCerrar={cerrarModal}
            onGuardar={async (body) => despuesDePlata(await cargarPrecio(modal.t.id, body), body, "Precio guardado")}
          />
        ))}
    </>
  );
}
