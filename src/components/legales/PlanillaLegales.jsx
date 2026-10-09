// src/components/legales/PlanillaLegales.jsx
//
// ⚖️🎨 LEGALES en la PLANILLA DE COLORES (09/10, diseño 3 estilo Monday.com).
// Reemplaza al tablero de la oficina/admin y al Inicio/Casos de la app del abogado.
//
//   Colores (etapas): Consulta · Lo tomó un abogado · El abogado lo trabaja ·
//   Demanda presentada · En el juzgado · Salió la sentencia · Cobrado · Terminados.
//   Tocás el color →
//     - ADMIN:    «Pasar a…» las etapas (lo que sigue primero).
//     - ABOGADO:  «Pasar a…» SUS estados (los de «Estados y listas», con sus colores).
//     - OFICINA:  el estado lo cambia el abogado; ella puede dar turno, elegir abogado,
//                 agendar una fecha, anotar o subir papeles.
//     - Todos (menos la oficina): «Ya se hizo» la fecha vencida.
//   Tocás el nombre → panel con Novedades (anotar), Datos, Papeles y «Ficha completa».
// Las reglas las sigue validando el SERVIDOR (ej: sin abogado no pasa de «Consulta»).
// props: vista / onVista (la app del abogado manda la vista según la pantalla).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { HiOutlineChatBubbleLeftRight, HiOutlineLink } from "react-icons/hi2";

import useDatosVivos from "../../hooks/useDatosVivos";
import Planilla from "../planilla/Planilla";
import { Avatar } from "../gestoria/Piezas";
import { BotonPanel, Persona } from "../planilla/PiezasPlanilla";
import { nombreAvatar, primerNombre } from "../planilla/planillaUtils";
import { useLegales } from "./legalesContext";
import { useAbogado } from "./abogado/abogadoContext";
import {
  agregarFecha,
  anotar,
  asignarAbogado,
  avisoWhatsapp,
  borrarDocumento,
  cambiarEstado,
  cargarHonorarios,
  editarCaso,
  editarFecha,
  guardarDocumento,
  listarAbiertos,
  listarCerrados,
  mensajeError,
  moverCaso,
  pedirCaso,
  subirArchivo,
} from "../../services/legales";
import ExpedienteDocumentosPanel from "./ExpedienteDocumentosPanel";
import { caratulaCorta, venceTxt } from "./abogado/abogadoUtils";
import {
  ABIERTOS,
  colorOficina,
  diaCorto,
  diasHasta,
  diasSinNovedad,
  esDemorado,
  fechaCorta,
  hhmm,
  hoyYmd,
  linkCaso,
  linkTel,
  linkWhatsApp,
  linkWhatsAppOElegir,
  plata,
  textoConLink,
} from "./legalesUtils";

const COLOR = "#0369a1";
const SIN_APP = {};
const CAMINO = ["CONSULTA", "ASIGNADO", "EN_TRAMITE", "DEMANDA_PRESENTADA", "EN_JUZGADO", "SENTENCIA", "COBRADO", "CERRADO"];

const ESTADOS = {
  CONSULTA: { n: "Consulta", c: "#64748b", que: "Que la vea un abogado." },
  ASIGNADO: { n: "Lo tomó un abogado", c: "#0284c7", que: "El abogado tiene que empezar a trabajarlo." },
  EN_TRAMITE: { n: "El abogado lo trabaja", c: "#0891b2", que: "El abogado junta pruebas o negocia." },
  DEMANDA_PRESENTADA: { n: "Demanda presentada", c: "#7c3aed", que: "Esperar que la tome el juzgado." },
  EN_JUZGADO: { n: "En el juzgado", c: "#4f46e5", que: "Está en juicio: atentos a audiencias y plazos." },
  SENTENCIA: { n: "Salió la sentencia", c: "#b45309", que: "Falta que paguen." },
  COBRADO: { n: "Cobrado", c: "#16a34a", que: "Cerrar el caso." },
  CERRADO: { n: "Cerrado", c: "#475569", que: "Terminado." },
  DESISTIDO: { n: "El cliente desistió", c: "#7c8799", que: "El cliente no quiso seguir." },
};

// Los 10 colores de las listas del abogado (los de «Estados y listas»), en fuerte.
const HEX = {
  gris: "#64748b",
  arena: "#8a817c",
  naranja: "#ea580c",
  ambar: "#d97706",
  verde: "#16a34a",
  turquesa: "#0d9488",
  azul: "#0284c7",
  violeta: "#5b52e6",
  rosa: "#db2777",
  rojo: "#dc2626",
};

const TIPOS_FECHA = [
  { v: "AUDIENCIA", n: "Audiencia", avatar: false },
  { v: "PLAZO", n: "Plazo para presentar algo", avatar: false },
  { v: "PERICIA", n: "Pericia", avatar: false },
  { v: "REUNION", n: "Reunión con el cliente", avatar: false },
];

function textoTurno(t) {
  if (!t) return "";
  const hoy = t.fecha === hoyYmd();
  return `${t.modalidad === "TELEFONO" ? "Llamada" : "Turno"} ${hoy ? "hoy" : diaCorto(t.fecha)} ${t.hora || hhmm(t.inicio)}`;
}

export default function PlanillaLegales({ vista, onVista }) {
  const { rol, esAdmin, esAbogado, esStaff, catalogo, abogados = [], recargarAbogados } = useLegales();
  const ctxApp = useAbogado(); // 📱 en la app del abogado los casos ya los trae AppAbogado
  const app = ctxApp.cargar ? ctxApp : SIN_APP;
  const enApp = esAbogado && !!app.cargar;
  const navigate = useNavigate();
  const puedeMover = rol === "ADMIN" || rol === "ABOGADO";

  const [propia, setPropia] = useState(null);
  const [errorPropio, setErrorPropio] = useState("");
  const cargarPropia = useCallback(async () => {
    try {
      const l = await listarAbiertos();
      setPropia(Array.isArray(l) ? l : l?.results || []);
      setErrorPropio("");
    } catch (e) {
      setErrorPropio(mensajeError(e, "No se pudieron traer los casos."));
    }
  }, []);
  useEffect(() => {
    if (!enApp) cargarPropia();
  }, [enApp, cargarPropia]);
  useDatosVivos(["legales"], () => cargarPropia(), { activo: !enApp });

  const filas = enApp ? app.casos : propia;
  const error = enApp ? app.error : errorPropio;
  const listas = enApp ? app.listas : null;
  const recargar = useCallback(async () => {
    if (enApp) await app.cargar();
    else await cargarPropia();
    if (esStaff) recargarAbogados?.();
  }, [enApp, app, cargarPropia, esStaff, recargarAbogados]);

  const a = useMemo(() => {
    const estadosAbogado = (listas?.ESTADO || []).filter(Boolean);
    const yo = app.yo || catalogo?.abogado || null;
    const clienteDe = (e) => primerNombre(e.persona_nombre) || "el cliente";
    const opsAbogado = (sin = null) =>
      abogados
        .filter((x) => x.activo !== false && String(x.id) !== String(sin))
        .map((x) => ({ v: x.id, n: x.nombre, foto: x.foto_url, sub: `${x.abiertos || 0} casos abiertos` }));
    const askFecha = [
      { k: "tipo", t: "elegir", l: "¿Qué es?", ops: TIPOS_FECHA },
      { k: "titulo", t: "linea", l: "Contalo en pocas palabras", ph: "Ej: Audiencia preliminar", opcional: true },
      { k: "cuando", t: "fechaHora", l: "¿Qué día y a qué hora?" },
      { k: "cliente", t: "si", txt: "Que el cliente lo vea en «Mi caso»", def: false },
    ];
    const askHonorarios = (e) =>
      e.ve_plata && !Number(e.honorarios) ? [{ k: "honorarios", t: "plata", l: "¿Cuánto son los honorarios?", ayuda: "Si todavía no sabés, dejalo vacío y lo cargás después", opcional: true }] : null;

    return {
      clave: esAbogado ? "legales-abogado" : "legales",
      titulo: "Mis casos",
      icono: "⚖️",
      color: COLOR,
      mostrarTitulo: enApp,
      item: "caso",
      items: "casos",
      filas,
      error,
      recargar,
      estados: ESTADOS,
      grupos: ABIERTOS.map((e) => ({ id: e, n: ESTADOS[e].n, c: ESTADOS[e].c })),
      estadoDe: (e) => e.estado,
      // El abogado ve SU estado (el de sus listas) con su color; la oficina y el admin, la etapa.
      etiquetaEstado: (e) => (esAbogado && e.estado_propio?.nombre ? e.estado_propio.nombre : ESTADOS[e.estado]?.n || e.estado_nombre),
      colorEstado: (e) => (esAbogado && e.estado_propio?.color ? HEX[e.estado_propio.color] || ESTADOS[e.estado]?.c : ESTADOS[e.estado]?.c),
      abierto: (e) => (puedeMover ? true : ABIERTOS.includes(e.estado)),
      terminados: {
        n: "Cerrados y desistidos",
        c: "#64748b",
        cargar: async (page) => {
          const r = await listarCerrados(page);
          return { results: r.results || [], next: r.next ? page + 1 : null, count: r.count };
        },
      },
      nombre: (e) => (esAbogado ? caratulaCorta(e) : e.persona_nombre || "Sin nombre"),
      sub: (e) => [e.motivo_titulo || e.tema_nombre, e.numero].filter(Boolean).join(" · "),
      marcas: (e) =>
        [
          e.proxima_fecha?.vencida && { txt: "Fecha vencida", tono: "rojo" },
          e.falta_turno && { txt: "Falta turno", tono: "ambar" },
          e.cliente_subio_papeles && { txt: "Cliente mandó papeles", tono: "azul" },
          e.sin_honorarios && { txt: "Faltan honorarios", tono: "ambar" },
          e.propio && { txt: "Caso propio", tono: "neutro" },
        ].filter(Boolean),
      columnas: [
        ...(esAbogado ? [] : [{ titulo: "Abogado", ancho: "150px", render: (e) => <Persona id={e.abogado} nombre={e.abogado_nombre} foto={e.abogado_foto} vacio="Sin abogado" /> }]),
        {
          titulo: "Tema",
          ancho: "130px",
          render: (e) => <span className="truncate text-[13px] text-titulo dark:text-titulo-dark">{e.tema_nombre || "—"}</span>,
        },
        ...(esAdmin
          ? [
              {
                titulo: "Oficina",
                ancho: "130px",
                render: (e) => (
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-titulo dark:text-titulo-dark">
                    <i className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: colorOficina(e.oficina) }} />
                    <span className="truncate">{e.oficina_nombre || "—"}</span>
                  </span>
                ),
              },
            ]
          : []),
        ...(esAbogado
          ? [{ titulo: "Instancia", ancho: "130px", render: (e) => <span className="truncate text-[13px] text-titulo dark:text-titulo-dark">{e.instancia?.nombre || "—"}</span> }]
          : []),
      ],
      dias: (e) => diasSinNovedad(e),
      diasTitulo: "Última novedad",
      demorado: (e) => esDemorado(e),
      buscar: (e) =>
        [e.persona_nombre, e.persona_dni, e.numero, e.caratula, e.contraparte, e.tema_nombre, e.motivo_titulo, e.abogado_nombre, e.juzgado, e.expediente_judicial, e.oficina_nombre]
          .filter(Boolean)
          .join(" "),
      buscarPh: esAbogado ? "Buscar carátula, cliente, DNI o expediente" : "Buscar cliente, DNI o N° de caso",
      filtros: esAbogado
        ? [
            ...(estadosAbogado.length
              ? [{ id: "propio", etiqueta: "Estado", opciones: estadosAbogado.map((o) => [String(o.id), o.nombre]), pasa: (e, v) => String(e.estado_propio?.id || "") === v }]
              : []),
          ]
        : [
            {
              id: "abogado",
              etiqueta: "Abogado",
              opciones: [...abogados.filter((x) => x.activo !== false).map((x) => [String(x.id), x.nombre]), ["sin", "Sin abogado"]],
              pasa: (e, v) => (v === "sin" ? !e.abogado : String(e.abogado) === v),
            },
            {
              id: "tema",
              etiqueta: "Tema",
              opciones: (catalogo?.temas || []).map((t) => [String(t.id), t.nombre]),
              pasa: (e, v) => String(e.tema) === v,
            },
            ...(esAdmin
              ? [{ id: "oficina", etiqueta: "Oficina", opciones: (catalogo?.oficinas || []).map((o) => [String(o.id), o.nombre]), pasa: (e, v) => String(e.oficina) === v }]
              : []),
          ],

      sigue: (e) => {
        const f = e.proxima_fecha;
        const t = e.proximo_turno;
        if (!ABIERTOS.includes(e.estado)) return ESTADOS[e.estado]?.que || "";
        if (f?.vencida) return `¡Venció! ${f.titulo} (${diaCorto(f.fecha)}).`;
        if (e.estado === "CONSULTA") return t ? `${textoTurno(t)}.` : e.falta_turno ? "Darle turno con un abogado." : ESTADOS.CONSULTA.que;
        if (t && t.fecha === hoyYmd()) return `${textoTurno(t)} con ${clienteDe(e)}.`;
        if (f) return `${f.titulo}: ${venceTxt(f).toLowerCase()}.`;
        if (!puedeMover) return "Lo mueve el abogado. Vos podés contarle al cliente cómo va.";
        return ESTADOS[e.estado]?.que || "";
      },

      tareas: (e) => {
        const T = [];
        if (!ABIERTOS.includes(e.estado)) return T;
        const f = e.proxima_fecha;
        const t = e.proximo_turno;
        if (f?.vencida) T.push({ tono: "rojo", txt: `Venció: ${f.titulo} (${diaCorto(f.fecha)})${puedeMover ? " · marcalo si ya se hizo" : ""}` });
        if (e.falta_turno && !esAbogado) T.push({ tono: "rojo", txt: `Darle turno a ${e.persona_nombre || "el cliente"}` });
        if (e.estado === "CONSULTA" && esAbogado) T.push({ tono: "ambar", txt: `Consulta nueva de ${e.persona_nombre || "un cliente"}` });
        if (t && t.fecha === hoyYmd()) T.push({ tono: "ambar", txt: `${textoTurno(t)} con ${e.persona_nombre || "el cliente"}` });
        if (f && !f.vencida && diasHasta(f.fecha) <= 2) T.push({ tono: "ambar", txt: `${f.titulo}: ${venceTxt(f).toLowerCase()}` });
        if (esDemorado(e)) T.push({ tono: "ambar", txt: `Hace ${diasSinNovedad(e)} días sin novedades` });
        if (e.cliente_subio_papeles) T.push({ tono: "azul", txt: `${clienteDe(e)} mandó papeles desde «Mi caso»: revisalos` });
        if (e.sin_honorarios && puedeMover) T.push({ tono: "azul", txt: "Cargar los honorarios" });
        return T;
      },

      // 🎨 El menú del color.
      menu: (e) => {
        const abierto = ABIERTOS.includes(e.estado);
        const f = e.proxima_fecha;
        const opciones = [];
        const extras = [];
        let aviso = null;
        if (puedeMover) {
          const sinAbogado = !e.abogado;
          // ABOGADO con sus listas: sus estados (moverCaso). ADMIN (o sin listas): las etapas.
          if (esAbogado && estadosAbogado.length) {
            const idx = estadosAbogado.findIndex((o) => String(o.id) === String(e.estado_propio?.id));
            const sig = estadosAbogado.slice(idx + 1).find((o) => !o.terminado);
            estadosAbogado.forEach((o) => {
              if (String(o.id) === String(e.estado_propio?.id)) return;
              opciones.push({
                id: `mover-${o.id}`,
                mover: o.id,
                etapa: o.etapa,
                etiqueta: o.nombre,
                color: HEX[o.color] || ESTADOS[o.etapa]?.c,
                txt: o.terminado ? "Se termina el caso" : o.etapa_nombre || ESTADOS[o.etapa]?.n || "",
                principal: !!sig && sig.id === o.id,
                ask: o.etapa === "COBRADO" && e.estado !== "COBRADO" ? askHonorarios(e) : null,
                preg: `Pasar a «${o.nombre}»`,
                confirmar: "Guardar",
                ok: `Pasó a «${o.nombre}»`,
              });
            });
            // Lo que sigue primero.
            opciones.sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
          } else {
            const i = CAMINO.indexOf(e.estado);
            const sig = abierto ? CAMINO[i + 1] : null;
            [...CAMINO, "DESISTIDO"].forEach((est) => {
              if (est === e.estado) return;
              const necesitaAbogado = sinAbogado && !["CONSULTA", "CERRADO", "DESISTIDO"].includes(est);
              opciones.push({
                id: `estado-${est}`,
                a: est,
                txt: est === "CERRADO" ? "Se termina el caso" : est === "DESISTIDO" ? "El cliente no quiere seguir" : abierto ? "" : "Se vuelve a abrir",
                deshabilitado: necesitaAbogado ? "Primero elegí el abogado (en «También»)" : null,
                principal: est === sig && !necesitaAbogado,
                ask: est === "COBRADO" ? askHonorarios(e) : null,
                preg: `Pasar a «${ESTADOS[est].n}»`,
                confirmar: "Guardar",
                ok: `Pasó a «${ESTADOS[est].n}»`,
              });
            });
            opciones.sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
          }
          if (f && abierto && (f.vencida || diasHasta(f.fecha) <= 0)) {
            extras.push({ id: "hecha", ic: "☑️", txt: `Ya se hizo: ${f.titulo}`, sub: venceTxt(f), fecha: f.id, ok: "Hecho ✔" });
          }
        } else {
          aviso = abierto ? "El estado lo cambia el abogado del caso. Vos podés:" : "El caso está cerrado.";
        }
        if (abierto) {
          if (!esAbogado && (e.falta_turno || (e.estado === "CONSULTA" && !e.proximo_turno))) {
            extras.unshift({ id: "turno", ic: "📅", txt: "Darle turno con un abogado", sub: "Elegís abogado, día y hora", onClick: (x) => navigate(`/legales/${x.id}?turno=1`) });
          }
          if (esStaff && !e.propio && (esAdmin || ["CONSULTA", "ASIGNADO"].includes(e.estado))) {
            extras.push({
              id: "abogado",
              ic: e.abogado ? "🔄" : "👤",
              txt: e.abogado ? "Cambiar de abogado" : "Elegir el abogado",
              sub: e.abogado ? `Ahora lo tiene ${primerNombre(String(e.abogado_nombre || "").replace(/^dra?\.?\s+/i, ""))}` : null,
              ask: [{ k: "abogado", t: "elegir", l: e.abogado ? "¿A qué abogado se lo pasás?" : "¿Qué abogado lo toma?", ops: opsAbogado(e.abogado) }],
              preg: e.abogado ? "¿A qué abogado se lo pasás?" : "¿Qué abogado lo toma?",
              confirmar: "Pasárselo",
            });
          }
          extras.push({ id: "fecha", ic: "🗓️", txt: "Agendar audiencia o plazo", sub: "Queda en la agenda", ask: askFecha, preg: "Agendar una fecha", confirmar: "Agendar" });
        }
        extras.push({ id: "nota", ic: "📝", txt: "Anotar una novedad", abrirPanel: "nov" });
        extras.push({ id: "papel", ic: "📎", txt: "Ver o subir papeles", abrirPanel: "pap" });
        return { aviso, opciones, extras };
      },

      ejecutar: async (e, op, vals) => {
        const id = e.id;
        let r = null;
        if (op.mover) {
          r = await moverCaso(id, { estado: op.mover, nota: "", visible: op.etapa !== e.estado });
        } else if (op.a) {
          r = await cambiarEstado(id, { estado: op.a, nota: "", visible: true });
        } else if (op.id === "hecha") {
          await editarFecha(id, op.fecha, { cumplido: true });
          return op.ok;
        } else if (op.id === "abogado") {
          await asignarAbogado(id, vals.abogado);
          const ab = abogados.find((x) => String(x.id) === String(vals.abogado));
          return `Listo: se lo pasaste a ${ab?.nombre || "el abogado"}`;
        } else if (op.id === "fecha") {
          const [dia, hora] = String(vals.cuando || "").split("T");
          const tipo = TIPOS_FECHA.find((x) => x.v === vals.tipo);
          await agregarFecha(id, {
            titulo: vals.titulo || tipo?.n || "Fecha",
            tipo: vals.tipo || "",
            fecha: dia,
            hora: hora ? hora.slice(0, 5) : null,
            detalle: "",
            visible_cliente: !!vals.cliente,
          });
          return `Agendado para el ${diaCorto(dia)}${hora ? ` a las ${hora.slice(0, 5)}` : ""}`;
        } else {
          throw new Error("Esa opción todavía no está.");
        }
        // 💵 Pasó a COBRADO: si escribió los honorarios, se guardan.
        if (Number(vals.honorarios) > 0) {
          try {
            await cargarHonorarios(id, { honorarios: Number(vals.honorarios) });
          } catch (err) {
            toast.error(`Pasó de estado, pero los honorarios no se guardaron: ${mensajeError(err)}`, { duration: 7000 });
          }
        }
        return op.ok || `Pasó a «${r?.estado_propio?.nombre || ESTADOS[r?.estado]?.n || "otro estado"}»`;
      },

      nuevo: null, // «Cargar una denuncia» ya está arriba (oficina) y «Nuevo» en la barra de abajo (abogado)
      // 👤 En la app del abogado: su perfil (de ahí: datos, «Estados y listas», modo oscuro y salir).
      derechaTitulo: enApp ? (
        <Link
          to="/legales/perfil"
          aria-label="Mi perfil"
          className="flex items-center gap-2 rounded-full border border-linea dark:border-linea-dark bg-card dark:bg-card-dark py-1 pl-1 pr-1 text-[13px] font-semibold text-titulo hover:bg-surface dark:text-titulo-dark dark:hover:bg-surface-dark sm:pr-3"
        >
          <Avatar id={yo?.id} nombre={nombreAvatar(yo?.nombre || "Yo")} foto={yo?.foto_url} size={30} />
          <span className="hidden sm:inline">Mi perfil</span>
        </Link>
      ) : null,
      vista,
      onVista,
      vistaInicial: "hoy",

      // 🗂️ El panel del costado.
      panel: {
        cargar: (id) => pedirCaso(id),
        sub: (e) => [esAbogado ? e.persona_nombre : e.caratula && caratulaCorta(e) !== e.persona_nombre ? caratulaCorta(e) : null, e.motivo_titulo || e.tema_nombre, e.numero].filter(Boolean).join(" · "),
        novedades: (d) =>
          (d.movimientos || []).map((m) => ({
            id: m.id,
            autor: m.autor,
            fecha: m.fecha,
            texto: m.texto,
            chips: [m.tipo, m.visible_cliente && "👁 Lo ve el cliente", m.con_plata && "💵 Plata"].filter(Boolean),
          })),
        puedeAnotar: (d) => d.puede?.anotar !== false,
        anotar: (d, texto, { cliente }) => anotar(d.id, { texto, visible: !!cliente }),
        opcionCliente: "Que lo vea el cliente en «Mi caso»",
        phNovedad: "Escribí una novedad (ej: hablé con la aseguradora)…",
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
          ["Tema", [d.tema_nombre, d.motivo_titulo].filter(Boolean).join(" · ")],
          ["Carátula", d.caratula || null],
          ["Contraparte", d.contraparte || null],
          ["Número", d.numero],
          ["Abogado", d.abogado_nombre || "Sin abogado"],
          ["Oficina", d.oficina_nombre],
          ["Estado", d.estado_propio?.nombre && d.estado_propio.nombre !== d.estado_nombre ? `${d.estado_propio.nombre} (${d.estado_nombre})` : d.estado_nombre],
          ["Instancia", d.instancia?.nombre || null],
          ["Juzgado", d.juzgado || null],
          ["Expediente", d.expediente_judicial || null],
          ["Próxima fecha", d.proxima_fecha ? `${d.proxima_fecha.titulo} · ${venceTxt(d.proxima_fecha)}` : null],
          ["Próximo turno", d.proximo_turno ? textoTurno(d.proximo_turno) : null],
          ["Fecha del hecho", d.fecha_hecho ? fechaCorta(d.fecha_hecho) : null],
          ["Honorarios", d.ve_plata ? (Number(d.honorarios) ? plata(d.honorarios) : "Sin cargar") : null],
          ["Lo que contó", d.relato ? <span className="line-clamp-6 whitespace-pre-line">{d.relato}</span> : null],
        ],
        papeles: (d, recargarPanel) => (
          <ExpedienteDocumentosPanel
            e={d}
            celu={false}
            onSubir={async (file, papel) => {
              try {
                const arch = await subirArchivo(file, "legales/papeles");
                await guardarDocumento(d.id, { ...arch, tipo: "PAPEL", papel: papel || "" });
                toast.success(`Subido: ${arch.nombre}`);
                await recargarPanel();
              } catch (err) {
                toast.error(mensajeError(err, err?.message || "No se pudo subir el archivo."));
              }
            }}
            onBorrar={async (doc) => {
              if (!window.confirm(`¿Borrar «${doc.nombre}»? No se puede deshacer.`)) return;
              try {
                await borrarDocumento(d.id, doc.id);
                toast.success("Archivo borrado");
                await recargarPanel();
              } catch (err) {
                toast.error(mensajeError(err));
              }
            }}
            onPapeles={async (lista) => {
              try {
                await editarCaso(d.id, { papeles: lista });
                toast.success("Papeles actualizados");
                await recargarPanel();
              } catch (err) {
                toast.error(mensajeError(err));
              }
            }}
          />
        ),
        acciones: (d, recargarPanel) => {
          const B = [];
          if (d.puede?.whatsapp && d.whatsapp_textos?.novedad) {
            B.push(
              <BotonPanel
                key="nov"
                tono="verde"
                href={linkWhatsAppOElegir(d.persona_telefono, textoConLink(d.whatsapp_textos.novedad, d))}
                icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}
                onClick={() =>
                  avisoWhatsapp(d.id, "novedad")
                    .then(() => recargarPanel())
                    .catch(() => {})
                }
              >
                Contarle cómo va
              </BotonPanel>
            );
          } else if (linkWhatsApp(d.persona_telefono)) {
            B.push(
              <BotonPanel key="wa" tono="verde" href={linkWhatsApp(d.persona_telefono)} icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}>
                WhatsApp al cliente
              </BotonPanel>
            );
          }
          const link = esStaff ? linkCaso(d) : "";
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
                Copiar link «Mi caso»
              </BotonPanel>
            );
          }
          return B;
        },
        ficha: { txt: esAbogado ? "Abrir el caso" : "Ficha completa", onClick: (e) => navigate(`/legales/${e.id}`) },
      },
    };
  }, [esAdmin, esAbogado, esStaff, enApp, app, catalogo, abogados, filas, error, listas, recargar, navigate, vista, onVista, puedeMover]);

  return <Planilla a={a} />;
}
