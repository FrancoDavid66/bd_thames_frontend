// src/components/siniestros/PlanillaSiniestros.jsx
//
// 🚨🎨 SINIESTROS en la PLANILLA DE COLORES (09/10, diseño 3 estilo Monday.com).
// Reemplaza a la tabla de SiniestrosPage.
//
//   Colores: Faltan papeles (ámbar) · Denunciado en la compañía (azul) ·
//            Esperando inspección (violeta) · Por cobrar (turquesa) · Terminados (verde).
//   Tocás el color → «Pasar a…» con lo que sigue primero. Si hace falta un dato lo pregunta:
//     Denunciado → "¿Qué N° de reclamo te dio la compañía?" (si no sabés, vacío)
//     Esperando inspección → "¿Cuándo es la inspección?"
//     Terminado → "¿Cómo terminó?" y "¿Cuánto pagaron?"
//   Cada cambio queda anotado solo en la bitácora (Novedades).
//   Tocás el nombre → panel: Novedades (la bitácora), Datos, Papeles (las fotos) y
//   «Editar todo» (el wizard de siempre). El admin también puede eliminarlo desde ahí.
// 🙋 QUIÉN RECLAMA (Franco 14/10): los chicos lo cargan como siempre y queda «Sin decidir».
//   El ADMIN lo revisa y decide: «Lo reclamo yo» (THAMES) o «Derivar a TuveUnChoque»
//   (el estudio de abogados, con su foto de Instagram). Columna «Lo reclama» para todos;
//   decidir/cambiar, solo el admin (en el panel o tocando el color → «También»).
//   Al admin le sale en «Para hoy» hasta que decide. Derivado: «Copiar los datos» para
//   pasárselos a TuveUnChoque y el link a su web. Todo queda anotado en la bitácora.
// 🏢 14/10: cualquier oficina carga siniestros de cualquier oficina. Abajo del nombre
//   dice de qué oficina es la póliza (y en Datos: «Oficina» y «Lo cargó»).
// 🏢 15/10: columna «Oficina» (la de la póliza) y filtro «Oficina» arriba.
//   Ej: filtrás «El Talita» y ves solo los siniestros de esa oficina.
//   En el celu (sin columnas) la oficina va al final de la línea de abajo.
// 👁️ 15/10: botón «Ver portal» arriba, al lado del nombre: abre en otra pestaña el
//   Portal del Asegurado de ESE cliente, para ver cómo le aparece el siniestro
//   (en qué paso está y el N° de reclamo). Si cambiás el color, recargá esa pestaña.
// 🛡️ 15/10: en Datos, el SEGURO DEL TERCERO va arriba (después de «Qué pasó») y con
//   color, para verlo de un vistazo. Si es un choque y no está cargado: «Sin cargar».
//   Se sacó «Lo cargó» de Datos (repetía la oficina).
// 🔗 15/10: en Datos, la PÓLIZA es un link: abre la póliza en otra pestaña.
// ⚖️ 15/10: el NOMBRE de cada siniestro (tabla y panel) es la CARÁTULA que arma el
//   servidor: "Gomez C/ Rivadavia Seguros (daños y lesiones)" (apellido del cliente
//   C/ compañía del tercero + qué se reclama). El cliente pasa a la línea gris de abajo.
//   En Datos: «Qué se reclama» (si es un choque y no lo eligieron: «Sin elegir»).
// 🔑 16/10: botón «Portal del cliente» (solo admin) en el panel: abre SiniestroPortalEditor,
//   donde se cambia TODO lo que ve el cliente al tocar su siniestro: la barra de avance, cada
//   paso de «Gestión de su siniestro», el próximo paso, las etapas, la documentación pendiente
//   y a quién le paga la compañía (al cliente o a THAMES con poder).
// ⚖️💰 17/11: ABOGADO DE RECLAMOS (Maxi, rol ABOGADO). Pestaña «⚖️ Reclamo» en el panel
//   (SiniestroReclamoPanel): quién lo lleva (el admin lo asigna), montos, eventos rápidos,
//   alertas y checklist de papeles. Estado nuevo «Reclamo presentado» (PRESENTADO).
//   · El ADMIN: columna y filtro «Lo lleva», y «Para hoy» con las ofertas / convenios atrasados.
//   · El ABOGADO (esAbogado): ve solo sus casos, con columnas de tablero (contra quién, paso,
//     reclamado / ofrecido), lo atrasado primero y el panel abre en «Reclamo». No carga, no
//     edita todo, no borra y no ve la póliza ni el portal del cliente.
//   · La bitácora dice quién anotó cada cosa (autor).
// props: onEditar(s), onBorrar(s), isWebAdmin, esAbogado, abogados ([{id, nombre}])
//        (el «Nuevo siniestro» está arriba, en la página)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineClipboardDocument,
  HiOutlineEye,
  HiOutlineGlobeAlt,
  HiOutlineShieldCheck,
  HiOutlineTrash,
} from "react-icons/hi2";

import useDatosVivos from "../../hooks/useDatosVivos";
import { invalidarCacheSiniestrosCliente } from "../../hooks/useSiniestrosCliente";
import { addEvento, eventoReclamo, getEventosBySiniestro, getSiniestros, patchSiniestro, pedirSiniestro } from "../../store/slices/siniestrosSlice";
import fotoTuveUnChoque from "../../assets/logos/tuveunchoque.jpg";
import Planilla from "../planilla/Planilla";
import { BotonPanel, Marca, PatenteChica } from "../planilla/PiezasPlanilla";
import { diasDesde, mensajeDe, primerNombre } from "../planilla/planillaUtils";
import { Avatar } from "../gestoria/Piezas";
import { fechaCorta, linkWhatsApp, plata } from "../gestoria/gestoriaUtils";
import SiniestroFotosPanel from "./SiniestroFotosPanel";
import SiniestroPortalEditor from "./SiniestroPortalEditor";
import SiniestroReclamoPanel from "./SiniestroReclamoPanel";
import NotaLegible, { leerNota } from "./NotaLegible";

const COLOR = "#dc2626";

// 🙋 Quién hace el reclamo ("" = Sin decidir). La foto de TuveUnChoque es la de su Instagram.
const RECLAMA = {
  THAMES: { n: "THAMES", largo: "Lo reclama THAMES", color: "#c1121f" },
  TUVEUNCHOQUE: {
    n: "TuveUnChoque",
    largo: "Derivado a TuveUnChoque",
    foto: fotoTuveUnChoque,
    web: "https://tuveunchoque.com.ar",
  },
};
const TUC = RECLAMA.TUVEUNCHOQUE;

/**
 * 👁️ Abre el Portal del Asegurado del cliente (lo que ve él) en otra pestaña.
 * La pestaña se abre YA, al tocar, y después se le pone el link: si se abriera
 * recién cuando llega la respuesta, el navegador la puede bloquear como ventana emergente.
 * Mismo pedido que «Ver portal» de la ficha del cliente (GET /api/clientes/<id>/portal-link/).
 */
async function abrirPortalCliente(clienteId) {
  const ventana = window.open("about:blank", "_blank");
  try {
    const API_ROOT = String(import.meta.env.VITE_API_URL || "")
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/api$/i, "");
    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
    const res = await fetch(`${API_ROOT}/api/clientes/${clienteId}/portal-link/`, {
      headers: {
        Accept: "application/json",
        ...(token && token !== "undefined" && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || "No se pudo abrir el portal del cliente.");
    const path = data?.portal_path || (data?.token ? `/#/portal/${data.token}` : "");
    if (!path) throw new Error("Este cliente todavía no tiene portal.");
    const url = `${window.location.origin}${path}`;
    if (ventana) {
      ventana.opener = null;
      ventana.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (e) {
    if (ventana) ventana.close();
    toast.error(e?.message || "No se pudo abrir el portal del cliente.", { duration: 6000 });
  }
}

/**
 * 🛡️ La compañía de seguros del tercero, bien a la vista (con color) en Datos.
 * Ej: [🛡️ Federación Patronal] y abajo «Póliza 12345».
 */
function SeguroTercero({ s }) {
  const cia = String(s?.tercero_compania || "").trim();
  const pol = String(s?.tercero_poliza || "").trim();
  if (!cia && !pol) return null;
  return (
    <span className="inline-flex max-w-full flex-col gap-0.5 rounded-xl border border-sky-500/40 bg-sky-50 px-3 py-2 dark:border-sky-400/40 dark:bg-sky-500/15">
      <span className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-sky-900 dark:text-sky-100">
        <HiOutlineShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="break-words">{cia || "Compañía sin cargar"}</span>
      </span>
      {pol ? <span className="text-[12.5px] font-semibold text-sky-800 dark:text-sky-200">Póliza {pol}</span> : null}
    </span>
  );
}

/** "julian, martinez (axion (2))" → "julian, martinez" (sin la oficina entre paréntesis). */
function clienteCorto(s) {
  return String(s?.cliente_label || "").replace(/\s*\(.*\)\s*$/, "").trim();
}

/** Avatar + nombre de quién reclama (columna «Lo reclama» y Datos). */
function QuienReclama({ s, admin = false, grande = false }) {
  const r = RECLAMA[s?.quien_reclama];
  if (!r) {
    return admin ? (
      <Marca tono="ambar">Sin decidir</Marca>
    ) : (
      <span className="text-[13px] italic text-suave dark:text-suave-dark">Sin decidir</span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2" title={r.largo}>
      <Avatar id={1} nombre={r.n} foto={r.foto || ""} color={r.color || ""} size={grande ? 30 : 24} />
      <span className="truncate text-[13px] font-semibold text-titulo dark:text-titulo-dark">{grande ? r.largo : r.n}</span>
    </span>
  );
}

/** El logo de TuveUnChoque chiquito (para los botones y el menú). */
function LogoTuc({ size = 18 }) {
  return <img src={TUC.foto} alt="" width={size} height={size} className="shrink-0 rounded-full bg-white ring-1 ring-linea dark:ring-linea-dark" />;
}

/**
 * 📋 Los datos del siniestro en texto, para pegárselos a TuveUnChoque.
 * Ej: Siniestro #12 (THAMES Seguros) · Cliente: PEREYRA, Lucas · Qué pasó: Lo chocaron…
 */
function textoParaEstudio(s) {
  const vehiculo = [s.marca_auto, s.modelo_auto, s.ano_auto].filter(Boolean).join(" ");
  const tercero = [s.tercero_nombre, s.tercero_telefono].filter(Boolean).join(" · ");
  const seguroTercero = [s.tercero_compania, s.tercero_poliza && `póliza ${s.tercero_poliza}`].filter(Boolean).join(" · ");
  const lineas = [
    `Siniestro #${s.id} (THAMES Seguros)`,
    s.cliente_label && `Cliente: ${s.cliente_label}`,
    s.poliza_label && `Póliza: ${s.poliza_label}`,
    `Qué pasó: ${s.responsabilidad_label || (TIPO[s.responsabilidad] || {}).n || "—"}`,
    s.fecha_siniestro && `Fecha del siniestro: ${fechaCorta(s.fecha_siniestro)}`,
    (vehiculo || s.patente) && `Vehículo: ${[vehiculo, s.patente].filter(Boolean).join(" · ")}`,
    s.nro_reclamo_cia && `N° de reclamo en la compañía: ${s.nro_reclamo_cia}`,
    s.descripcion && `Lo que contó: ${String(s.descripcion).trim()}`,
    tercero && `Tercero: ${tercero}`,
    s.tercero_patente && `Auto del tercero: ${s.tercero_patente}`,
    seguroTercero && `Seguro del tercero: ${seguroTercero}`,
    s.fotos_count ? `Fotos: ${s.fotos_count} (te las pasamos aparte)` : null,
  ];
  return lineas.filter(Boolean).join("\n");
}

/** Copia al portapapeles (con plan B para celus viejos). */
async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
// 🏛️ 18/11: «En mediación» (pedido de Maxi) va entre la inspección y «Por cobrar».
const CAMINO = ["PENDIENTE", "DENUNCIADO", "PRESENTADO", "INSPECCION", "MEDIACION", "LIQUIDACION", "CERRADO"];
const DIAS_QUIETO = 15;

const ESTADOS = {
  PENDIENTE: { n: "Faltan papeles", c: "#d97706" },
  DENUNCIADO: { n: "Denunciado en la compañía", c: "#2563eb" },
  // ⚖️ 17/11: el reclamo ya se presentó en la compañía del tercero.
  PRESENTADO: { n: "Reclamo presentado", c: "#4f46e5" },
  INSPECCION: { n: "Esperando inspección", c: "#7c3aed" },
  // 🏛️ 18/11: el abogado ya pactó la audiencia de mediación con el cliente.
  MEDIACION: { n: "En mediación", c: "#c026d3" },
  LIQUIDACION: { n: "Por cobrar", c: "#0891b2" },
  CERRADO: { n: "Terminado", c: "#16a34a" },
  fin: { n: "Terminados", c: "#16a34a" },
};

const TIPO = {
  CHOCO: { ic: "🚗", n: "Nuestro asegurado chocó", corto: "Chocó" },
  CHOCARON: { ic: "💥", n: "Lo chocaron", corto: "Lo chocaron" },
  ROBO: { ic: "🚨", n: "Robo / hurto", corto: "Robo" },
  INCENDIO: { ic: "🔥", n: "Incendio", corto: "Incendio" },
  OTRO: { ic: "📄", n: "Otro", corto: "Otro" },
};
const tipoDe = (s) => TIPO[s.responsabilidad] || { ic: "📄", n: s.responsabilidad_label || "—", corto: s.responsabilidad_label || "—" };
const vehiculoDe = (s) => [s.marca_auto, s.modelo_auto, s.ano_auto].filter(Boolean).join(" ");
const dosDig = (n) => String(n).padStart(2, "0");

/** "2026-10-14T10:30" → "14/10 a las 10:30" */
function cuandoTxt(v) {
  if (!v) return "";
  const [d, h] = String(v).split("T");
  const [, m, dia] = d.split("-");
  return `${dia}/${m}${h ? ` a las ${h.slice(0, 5)}` : ""}`;
}

/** 🏛️ La audiencia: "25/11 a las 10:00" (o solo "25/11"). Sin audiencia → "". */
function audienciaTxt(s) {
  if (!s?.fecha_mediacion) return "";
  return cuandoTxt(`${s.fecha_mediacion}${s.hora_mediacion ? `T${String(s.hora_mediacion).slice(0, 5)}` : ""}`);
}

/** Fecha y hora de ahora para la bitácora (como la manda el detalle). */
function ahora() {
  const x = new Date();
  return `${x.getFullYear()}-${dosDig(x.getMonth() + 1)}-${dosDig(x.getDate())}T${x.toISOString().slice(11, 19)}`;
}

/** "Paso 3/6" para la columna del tablero. */
// ⚖️ 18/11: denunciado y con abogado = falta presentar el reclamo → todavía no hay N° de reclamo.
const antesDePresentar = (s) => s.estado === "DENUNCIADO" && !!s.abogado_asignado;

function pasoCorto(s) {
  const p = s?.paso_portal;
  return p ? `${p.hecho}/${p.total}` : "—";
}

/** "Reclamado $ 850.000 · ofrecen $ 700.000 (82 %)" en corto para la columna. */
function MontosCortos({ s }) {
  const rec = s.monto_reclamado;
  const ofr = s.monto_ofrecido;
  if (!rec && !ofr) return <span className="text-[12.5px] text-suave dark:text-suave-dark">—</span>;
  return (
    <span className="flex min-w-0 flex-col text-[12.5px] leading-tight tabular-nums">
      <span className="truncate font-semibold text-titulo dark:text-titulo-dark">{rec ? plata(rec) : "—"}</span>
      <span className="truncate text-suave dark:text-suave-dark">
        {ofr ? `ofrecen ${plata(ofr)}${s.oferta_porcentaje != null ? ` (${s.oferta_porcentaje} %)` : ""}` : "sin oferta"}
      </span>
    </span>
  );
}

export default function PlanillaSiniestros({ onEditar, onBorrar, isWebAdmin = false, esAbogado = false, abogados = [], filtroExterno = null }) {
  const dispatch = useDispatch();
  const { siniestros, error: errorStore } = useSelector((s) => s.siniestros);
  const [cargado, setCargado] = useState(false);
  // 🔑 El siniestro cuyo «Portal del cliente» se está editando (solo admin).
  const [portalDe, setPortalDe] = useState(null);
  // 📣 El aviso de la última asignación de abogado, por siniestro (el panel se rearma al guardar).
  const [avisos, setAvisos] = useState({});

  const recargar = useCallback(() => dispatch(getSiniestros()).finally(() => setCargado(true)), [dispatch]);
  useEffect(() => {
    recargar();
  }, [recargar]);
  // 📡 EN VIVO: un siniestro cargado o actualizado en otra oficina aparece solo.
  useDatosVivos(["siniestros"], () => recargar());

  const filas = useMemo(() => (cargado || (siniestros || []).length ? siniestros || [] : null), [cargado, siniestros]);
  const error = !cargado ? "" : errorStore && !(siniestros || []).length ? "No se pudieron traer los siniestros." : "";

  // 🔄 Para que el panel muestre siempre lo último (aunque la lista todavía no se
  //    haya vuelto a dibujar): la lista más nueva y lo que devolvió el servidor al guardar.
  const listaRef = useRef(siniestros);
  listaRef.current = siniestros;
  const frescos = useRef({});

  // Los thunks devuelven el error del servidor "pelado": se lo arma como el de axios,
  // así el cartel rojo muestra lo que dijo el servidor (ej: "Estado inválido").
  const correr = useCallback(
    (accion) =>
      dispatch(accion)
        .unwrap()
        .catch((data) => {
          throw Object.assign(new Error("No se pudo guardar."), { response: { data } });
        }),
    [dispatch]
  );
  const anotarEnBitacora = useCallback(
    (id, texto) => correr(addEvento({ siniestro_id: Number(id), fecha_evento: ahora(), descripcion_evento: texto })),
    [correr]
  );
  /** PATCH de algunos campos; se guarda lo que devolvió el servidor (para el panel). */
  const guardar = useCallback(
    (id, cambios) =>
      correr(patchSiniestro({ id, cambios })).then((s) => {
        if (s && s.id) frescos.current[s.id] = s;
        return s;
      }),
    [correr]
  );

  /**
   * 🙋 El admin decide quién reclama: "THAMES", "TUVEUNCHOQUE" o "" (sin decidir).
   * Queda anotado en la bitácora. Devuelve el mensajito de «¡Listo!».
   */
  const decidirQuien = useCallback(
    async (s, quien, nota = "") => {
      await guardar(s.id, { quien_reclama: quien });
      const txt =
        quien === "TUVEUNCHOQUE"
          ? "Derivado a TuveUnChoque (estudio de abogados)."
          : quien === "THAMES"
            ? "Lo reclama THAMES."
            : "Volvió a «Sin decidir» quién hace el reclamo.";
      await anotarEnBitacora(s.id, [txt, nota && `Nota: ${nota}`].filter(Boolean).join(" ")).catch(() => {});
      invalidarCacheSiniestrosCliente(s.cliente);
      return quien === "TUVEUNCHOQUE" ? "Derivado a TuveUnChoque" : quien === "THAMES" ? "Listo: lo reclamás vos" : "Quedó sin decidir";
    },
    [guardar, anotarEnBitacora]
  );

  // 🏢 Opciones del filtro «Oficina»: las que aparecen en los siniestros, en orden alfabético.
  const opcionesOficina = useMemo(() => {
    const nombres = [...new Set((siniestros || []).map((s) => s.oficina_nombre).filter(Boolean))].sort((x, y) => x.localeCompare(y, "es"));
    const ops = nombres.map((n) => [n, n]);
    if ((siniestros || []).some((s) => !s.oficina_nombre)) ops.push(["SIN", "Sin oficina"]);
    return ops;
  }, [siniestros]);

  // ⚖️ Montos y eventos rápidos: el admin o el abogado (que solo ve los suyos).
  const puedeReclamar = useCallback(() => isWebAdmin || esAbogado, [isWebAdmin, esAbogado]);

  // ⚖️ Opciones del filtro «Lo lleva»: los abogados (del servidor) + los que aparecen en la lista.
  const opcionesAbogado = useMemo(() => {
    const m = new Map((abogados || []).map((x) => [String(x.id), x.nombre]));
    (siniestros || []).forEach((s) => s.abogado_asignado && !m.has(String(s.abogado_asignado)) && m.set(String(s.abogado_asignado), s.abogado_nombre || `#${s.abogado_asignado}`));
    return [["SIN", "Sin asignar"], ...[...m.entries()].sort((x, y) => x[1].localeCompare(y[1], "es"))];
  }, [abogados, siniestros]);

  const a = useMemo(() => {
    // "PEREYRA, Lucas" → "Lucas" · "Lucas Pereyra (5 Esquinas)" → "Lucas"
    const clienteDe = (s) => {
      const base = String(s.cliente_label || "").split("(")[0];
      const nombre = base.includes(",") ? base.split(",")[1] : base;
      return primerNombre(nombre) || "el cliente";
    };
    const quieto = (s) => s.estado !== "CERRADO" && diasDesde(s.fecha_modificacion || s.fecha_creacion) >= DIAS_QUIETO;
    const askDe = (est, s) => {
      if (est === "DENUNCIADO")
        return [{ k: "reclamo", t: "linea", l: "¿Qué N° de reclamo te dio la compañía?", ayuda: "Si todavía no te lo dieron, dejalo vacío", opcional: true, def: s.nro_reclamo_cia || "" }];
      // ⚖️ Presentado: lo que se reclama (si lo carga el abogado o el admin, queda en los montos).
      if (est === "PRESENTADO" && puedeReclamar(s))
        return [{ k: "monto", t: "plata", l: "¿Cuánto se reclama?", ayuda: "Si todavía no lo sabés, dejalo vacío", opcional: true }];
      if (est === "INSPECCION") return [{ k: "cuando", t: "fechaHora", l: "¿Cuándo es la inspección?", opcional: true }];
      // 🏛️ La audiencia: el abogado / admin la tiene que poner (queda guardada y la ve el cliente).
      if (est === "MEDIACION")
        return [{ k: "cuando", t: "fechaHora", l: "¿Cuándo es la audiencia de mediación?", ayuda: "El día y la hora que pactaste", opcional: !puedeReclamar(s) }];
      if (est === "CERRADO")
        return [
          { k: "final", t: "chips", l: "¿Cómo terminó?", ops: ["La compañía pagó", "Lo arreglaron en el taller", "La compañía lo rechazó", "El cliente no siguió"] },
          { k: "monto", t: "plata", l: "¿Cuánto pagaron?", opcional: true },
        ];
      return null;
    };
    return {
      clave: esAbogado ? "siniestros-abogado" : "siniestros",
      titulo: esAbogado ? "Mis reclamos" : "Siniestros",
      icono: esAbogado ? "⚖️" : "🚨",
      // ⚖️ El abogado abre el panel directo en «Reclamo».
      tabInicial: esAbogado ? "rec" : undefined,
      filtroExterno,
      color: COLOR,
      item: "siniestro",
      items: "siniestros",
      filas,
      error,
      recargar,
      estados: ESTADOS,
      grupos: [...CAMINO.filter((e) => e !== "CERRADO").map((e) => ({ id: e, n: ESTADOS[e].n, c: ESTADOS[e].c })), { id: "fin", n: "Terminados", c: ESTADOS.CERRADO.c, ic: "🏁" }],
      estadoDe: (s) => (s.estado === "CERRADO" ? "fin" : s.estado),
      etiquetaEstado: (s) => ESTADOS[s.estado]?.n || s.estado_label || s.estado,
      colorEstado: (s) => ESTADOS[s.estado]?.c,
      esTerminado: (s) => s.estado === "CERRADO",
      abierto: () => true,
      // ⚖️ La carátula: "Gomez C/ Rivadavia Seguros (daños y lesiones)".
      nombre: (s) => s.caratula || s.cliente_label || "Sin cliente",
      // 🏢 La oficina ya tiene su columna: abajo del nombre queda el auto y el número.
      sub: (s) => [clienteCorto(s), vehiculoDe(s), `#${s.id}`].filter(Boolean).join(" · "),
      // En el celu no hay columnas: quién lo reclama va primero y la oficina al final
      // (ej: "⚖️ TuveUnChoque · Chocó · AE040SN · El Talita").
      subCelu: (s) =>
        esAbogado
          ? [s.tercero_compania && `c/ ${s.tercero_compania}`, `Paso ${pasoCorto(s)}`, s.monto_reclamado && plata(s.monto_reclamado), s.patente].filter(Boolean).join(" · ")
          : [RECLAMA[s.quien_reclama] && `⚖️ ${s.abogado_nombre || RECLAMA[s.quien_reclama].n}`, tipoDe(s).corto, s.patente, s.oficina_nombre].filter(Boolean).join(" · "),
      marcas: (s) =>
        [
          esAbogado && s.nuevo_para_abogado && { txt: "🆕 Nuevo", tono: "azul" },
          s.estado !== "CERRADO" && !s.fotos_count && { txt: "Sin fotos", tono: "ambar" },
          // 18/11: con abogado y todavía sin presentar no hay N° de reclamo: no se marca (era ruido).
          s.estado !== "PENDIENTE" && s.estado !== "CERRADO" && !s.nro_reclamo_cia && !antesDePresentar(s) && { txt: "Sin N° de reclamo", tono: "ambar" },
        ].filter(Boolean),
      columnas: esAbogado
        ? [
            // ⚖️ TABLERO DEL ABOGADO: contra quién, en qué paso y la plata.
            {
              titulo: "Contra",
              ancho: "170px",
              render: (s) =>
                s.tercero_compania ? (
                  <span className="truncate text-[13px] font-semibold text-titulo dark:text-titulo-dark" title={s.tercero_compania}>
                    🛡️ {s.tercero_compania}
                  </span>
                ) : (
                  <Marca tono="ambar">Sin cargar</Marca>
                ),
            },
            {
              titulo: "Paso",
              ancho: "150px",
              render: (s) => (
                <span className="truncate text-[13px] text-titulo dark:text-titulo-dark" title={s.paso_portal?.nombre || ""}>
                  <b className="tabular-nums">{pasoCorto(s)}</b> {s.paso_portal?.nombre || ""}
                </span>
              ),
            },
            { titulo: "Reclamado / ofrecido", ancho: "170px", render: (s) => <MontosCortos s={s} /> },
            { titulo: "Patente", ancho: "110px", render: (s) => <PatenteChica p={s.patente} /> },
          ]
        : [
        {
          titulo: "Qué pasó",
          ancho: "150px",
          render: (s) => (
            <span className="truncate text-[13px] text-titulo dark:text-titulo-dark" title={s.responsabilidad_label || tipoDe(s).n}>
              {tipoDe(s).ic} {tipoDe(s).corto}
            </span>
          ),
        },
        { titulo: "Patente", ancho: "110px", render: (s) => <PatenteChica p={s.patente} /> },
        // 🏢 De qué oficina es (la de la póliza).
        {
          titulo: "Oficina",
          ancho: "130px",
          render: (s) =>
            s.oficina_nombre ? (
              <span className="truncate text-[13px] text-titulo dark:text-titulo-dark" title={s.oficina_nombre}>
                {s.oficina_nombre}
              </span>
            ) : (
              <span className="text-[12.5px] text-suave dark:text-suave-dark">—</span>
            ),
        },
        {
          titulo: "N° de reclamo",
          ancho: "130px",
          render: (s) =>
            s.nro_reclamo_cia ? (
              <span className="truncate font-mono text-[12.5px] font-semibold text-titulo dark:text-titulo-dark">{s.nro_reclamo_cia}</span>
            ) : (
              <span className="text-[12.5px] text-suave dark:text-suave-dark">—</span>
            ),
        },
        // 🙋 Quién hace el reclamo (lo decide el admin).
        { titulo: "Lo reclama", ancho: "172px", render: (s) => <QuienReclama s={s} admin={isWebAdmin && s.estado !== "CERRADO"} /> },
        // ⚖️ 17/11: el abogado que lo lleva.
        {
          titulo: "Lo lleva",
          ancho: "150px",
          render: (s) =>
            s.abogado_nombre ? (
              <span className="truncate text-[13px] font-semibold text-titulo dark:text-titulo-dark" title={s.abogado_nombre}>
                ⚖️ {s.abogado_nombre}
              </span>
            ) : (
              <span className="text-[12.5px] text-suave dark:text-suave-dark">—</span>
            ),
        },
      ],
      // ⚖️ Para el abogado: días sin novedad (desde la última nota de la bitácora).
      dias: (s) => (esAbogado && s.dias_sin_novedad != null ? s.dias_sin_novedad : diasDesde(s.fecha_modificacion || s.fecha_creacion)),
      diasTitulo: esAbogado ? "Sin novedad" : "Último cambio",
      demorado: (s) => (esAbogado ? (s.alertas || []).length > 0 : quieto(s)),
      buscar: (s) =>
        [s.caratula, s.cliente_label, s.cliente_dni, s.poliza_label, s.patente, s.nro_reclamo_cia, s.marca_auto, s.modelo_auto, `#${s.id}`, s.tercero_nombre, s.tercero_patente, s.tercero_compania, RECLAMA[s.quien_reclama]?.n, s.oficina_nombre, s.abogado_nombre].filter(Boolean).join(" "),
      buscarPh: "Buscar cliente, patente o reclamo",
      filtros: [
        { id: "tipo", etiqueta: "Qué pasó", opciones: Object.entries(TIPO).map(([k, v]) => [k, v.n]), pasa: (s, v) => s.responsabilidad === v },
        {
          id: "reclama",
          etiqueta: "Lo reclama",
          opciones: [["SIN", "Sin decidir"], ["THAMES", "THAMES"], ["TUVEUNCHOQUE", "TuveUnChoque"]],
          pasa: (s, v) => (s.quien_reclama || "SIN") === v,
        },
        // 🏢 Las oficinas salen de los siniestros que hay (ej: 5 Esquinas, Axion, El Talita…).
        {
          id: "oficina",
          etiqueta: "Oficina",
          opciones: opcionesOficina,
          pasa: (s, v) => (v === "SIN" ? !s.oficina_nombre : s.oficina_nombre === v),
        },
        // ⚖️ 17/11: quién lo lleva (el admin ve los casos de cada abogado).
        isWebAdmin && {
          id: "lleva",
          etiqueta: "Lo lleva",
          opciones: opcionesAbogado,
          pasa: (s, v) => (v === "SIN" ? !s.abogado_asignado : String(s.abogado_asignado) === v),
        },
      ].filter((f) => f && !(esAbogado && ["reclama", "oficina"].includes(f.id))),

      sigue: (s) => {
        // ⚖️ El abogado: el próximo paso del reclamo (el mismo que ve el cliente).
        if (esAbogado) return s.estado === "CERRADO" ? "Terminado." : s.proximo_paso || "Cargá el próximo movimiento.";
        const tuc = s.quien_reclama === "TUVEUNCHOQUE";
        if (s.estado !== "CERRADO" && isWebAdmin && !s.quien_reclama) return "Decidir si lo reclamás vos o lo derivás a TuveUnChoque.";
        if (s.estado === "PENDIENTE" && tuc) return s.fotos_count ? "Pasarle los datos y las fotos a TuveUnChoque." : "Pedirle al cliente las fotos y los papeles (para TuveUnChoque).";
        if (tuc && s.estado !== "CERRADO") return "Lo lleva TuveUnChoque: pediles novedades y actualizá el estado.";
        if (s.estado === "PENDIENTE") return s.fotos_count ? "Cuando estén los papeles, denunciarlo en la compañía." : "Pedirle al cliente las fotos y los papeles.";
        if (s.estado === "DENUNCIADO")
          return s.abogado_nombre ? `Lo lleva ${s.abogado_nombre}: presentar el reclamo.` : s.nro_reclamo_cia ? "Esperar que la compañía mande a inspeccionar." : "Cargar el N° de reclamo de la compañía.";
        if (s.estado === "PRESENTADO") return "Esperar la respuesta o la inspección de la compañía del tercero.";
        if (s.estado === "INSPECCION") return "Esperar que el perito vea el auto.";
        if (s.estado === "MEDIACION") return s.fecha_mediacion ? `Audiencia de mediación: ${audienciaTxt(s)}.` : "Cargar el día de la audiencia de mediación.";
        if (s.estado === "LIQUIDACION") return "Esperar el pago o el arreglo, y confirmarlo.";
        return "Terminado.";
      },

      tareas: (s) => {
        const T = [];
        if (s.estado === "CERRADO") return T;
        // ⚖️ TABLERO DEL ABOGADO: lo atrasado primero (rojo), después lo que falta.
        if (esAbogado) {
          if (s.nuevo_para_abogado) T.push({ tono: "ambar", txt: "Caso nuevo: te lo asignaron, revisalo" });
          (s.alertas || []).forEach((al) => T.push({ tono: "rojo", txt: al.txt }));
          if (!s.fecha_presentacion && ["PENDIENTE", "DENUNCIADO"].includes(s.estado))
            T.push({ tono: "ambar", txt: `Presentar el reclamo${s.tercero_compania ? ` ante ${s.tercero_compania}` : ""}` });
          const pend = s.pendiente_cliente || [];
          if (pend.length) T.push({ tono: "ambar", txt: `Pendiente del cliente: ${pend.slice(0, 3).join(", ")}${pend.length > 3 ? "…" : ""}` });
          const faltan = (s.checklist || []).filter((i) => i.estado === "falta").map((i) => i.nombre);
          if (faltan.length) T.push({ tono: "azul", txt: `Faltan papeles: ${faltan.slice(0, 4).join(", ")}${faltan.length > 4 ? "…" : ""}` });
          return T;
        }
        // 💰 Oferta sin responder / convenio sin pago (para el admin y la oficina).
        (s.alertas || []).filter((al) => al.tipo !== "SIN_NOVEDAD").forEach((al) => T.push({ tono: "rojo", txt: `${al.txt}${s.abogado_nombre ? ` (lo lleva ${s.abogado_nombre})` : ""}` }));
        const d = diasDesde(s.fecha_modificacion || s.fecha_creacion);
        const tuc = s.quien_reclama === "TUVEUNCHOQUE";
        // 🙋 Al admin: decidir quién lo reclama (rojo si ya pasaron 2 días desde que lo cargaron).
        if (isWebAdmin && !s.quien_reclama) T.push({ tono: diasDesde(s.fecha_creacion) >= 2 ? "rojo" : "ambar", txt: "Decidí quién lo reclama: vos o TuveUnChoque" });
        if (s.estado === "PENDIENTE") {
          const fotos = `${s.fotos_count} foto${s.fotos_count > 1 ? "s" : ""}`;
          T.push({
            tono: d >= 3 ? "rojo" : "ambar",
            txt: !s.fotos_count ? `Pedirle a ${clienteDe(s)} las fotos y los papeles` : tuc ? `Pasale los datos a TuveUnChoque (ya hay ${fotos})` : `Denunciarlo en la compañía (ya hay ${fotos})`,
          });
        }
        if (s.estado === "DENUNCIADO" && !s.nro_reclamo_cia && !antesDePresentar(s)) T.push({ tono: "ambar", txt: "Cargar el N° de reclamo de la compañía" });
        if (quieto(s)) T.push({ tono: "rojo", txt: `Hace ${d} días sin novedades: ${tuc ? "preguntale a TuveUnChoque cómo va" : "llamá a la compañía"}` });
        if (s.estado === "INSPECCION" && d >= 7) T.push({ tono: "azul", txt: "¿Ya fue el perito? Preguntá a la compañía" });
        if (s.estado === "LIQUIDACION") T.push({ tono: "azul", txt: "¿Ya pagaron o lo arreglaron? Confirmalo" });
        return T;
      },

      menu: (s) => {
        const i = CAMINO.indexOf(s.estado);
        const sig = CAMINO[i + 1];
        const opciones = CAMINO.filter((e) => e !== s.estado).map((e) => ({
          id: `estado-${e}`,
          a: e,
          txt:
            e === "CERRADO"
              ? "Se termina el siniestro"
              : s.estado === "CERRADO"
                ? "Se vuelve a abrir"
                : CAMINO.indexOf(e) < i
                  ? "Vuelve para atrás"
                  : e === "DENUNCIADO"
                    ? "Ya lo denunciaste en la compañía"
                    : e === "PRESENTADO"
                      ? "Ya presentaste el reclamo al tercero"
                      : e === "INSPECCION"
                      ? "La compañía mandó a inspeccionar"
                      : e === "MEDIACION"
                      ? "Ya pactaste la audiencia de mediación"
                      : e === "LIQUIDACION"
                        ? "Ya lo inspeccionaron: falta que paguen"
                        : "",
          principal: e === sig,
          ask: askDe(e, s),
          preg: `Pasar a «${ESTADOS[e].n}»`,
          confirmar: "Guardar",
          ok: `Pasó a «${ESTADOS[e].n}»`,
        }));
        opciones.sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
        const extras = [];
        // 🙋 Quién lo reclama: solo el admin (la API también lo frena).
        if (isWebAdmin) {
          if (s.quien_reclama !== "THAMES") extras.push({ id: "quien-THAMES", quien: "THAMES", ic: "🙋", txt: "Lo reclamo yo", sub: "THAMES hace el reclamo en la compañía" });
          if (s.quien_reclama !== "TUVEUNCHOQUE") {
            extras.push({
              id: "quien-TUVEUNCHOQUE",
              quien: "TUVEUNCHOQUE",
              ic: <LogoTuc />,
              txt: "Derivar a TuveUnChoque",
              sub: "El estudio de abogados hace el reclamo",
              ask: [{ k: "nota", t: "linea", l: "¿Algo para anotar?", ayuda: "Ej: se lo pasé por WhatsApp a Martín", opcional: true }],
              preg: "Derivar a TuveUnChoque",
              confirmar: "Derivar",
            });
          }
          if (s.quien_reclama) extras.push({ id: "quien-", quien: "", ic: "↩️", txt: "Volver a «Sin decidir»" });
        }
        // ⚖️ Los movimientos del reclamo (oferta, convenio, cobro…).
        if (puedeReclamar(s)) extras.push({ id: "mov", ic: "⚡", txt: "Cargar un movimiento del reclamo", sub: "Oferta, convenio, cobro…", abrirPanel: "rec" });
        if (s.estado !== "PENDIENTE") {
          extras.push({
            id: "reclamo",
            ic: "🔢",
            txt: s.nro_reclamo_cia ? "Cambiar el N° de reclamo" : "Cargar el N° de reclamo",
            sub: s.nro_reclamo_cia || "El que da la compañía",
            ask: [{ k: "reclamo", t: "linea", l: "¿Qué N° de reclamo te dio la compañía?", def: s.nro_reclamo_cia || "" }],
            preg: "N° de reclamo de la compañía",
            confirmar: "Guardar",
          });
        }
        extras.push({ id: "nota", ic: "📝", txt: "Anotar en la bitácora", abrirPanel: "nov" });
        extras.push({ id: "fotos", ic: "📷", txt: "Ver o subir fotos y PDF", abrirPanel: "pap" });
        if (onEditar) extras.push({ id: "editar", ic: "✏️", txt: "Editar todos los datos", onClick: (x) => onEditar(x) });
        if (isWebAdmin && onBorrar) extras.push({ id: "borrar", ic: "🗑️", txt: "Eliminar el siniestro", peligro: true, onClick: (x) => onBorrar(x) });
        return { opciones, extras };
      },

      ejecutar: async (s, op, vals) => {
        const id = s.id;
        if (op.quien !== undefined) return decidirQuien(s, op.quien, String(vals.nota || "").trim());
        if (op.id === "reclamo") {
          const nro = String(vals.reclamo || "").slice(0, 50);
          await guardar(id, { nro_reclamo_cia: nro });
          await anotarEnBitacora(id, `N° de reclamo de la compañía: ${nro}.`).catch(() => {});
          invalidarCacheSiniestrosCliente(s.cliente);
          return "N° de reclamo guardado";
        }
        if (!op.a) throw new Error("Esa opción todavía no está.");
        // ⚖️ «Reclamo presentado» del abogado / admin: evento rápido (guarda lo reclamado y anota
        //    la nota RECLAMO, así el cliente ve «Presentación del reclamo» en su portal).
        if (op.a === "PRESENTADO" && puedeReclamar(s) && CAMINO.indexOf(s.estado) < CAMINO.indexOf("PRESENTADO")) {
          const r = await correr(eventoReclamo({ id, evento: "PRESENTADO", monto: Number(vals.monto) > 0 ? Number(vals.monto) : null }));
          if (r && r.id) frescos.current[r.id] = r;
          invalidarCacheSiniestrosCliente(s.cliente);
          return op.ok;
        }
        // 🏛️ «En mediación» del abogado / admin: evento rápido (guarda día y hora de la audiencia
        //    y el cliente ve «Mediación prejudicial … audiencia fijada para el …» en su portal).
        if (op.a === "MEDIACION" && puedeReclamar(s) && vals.cuando) {
          const [dia, hora] = String(vals.cuando).split("T");
          const r = await correr(eventoReclamo({ id, evento: "MEDIACION", fecha: dia, hora: hora ? hora.slice(0, 5) : null }));
          if (r && r.id) frescos.current[r.id] = r;
          invalidarCacheSiniestrosCliente(s.cliente);
          return op.ok;
        }
        const cambios = { estado: op.a };
        if (op.a === "DENUNCIADO" && vals.reclamo) cambios.nro_reclamo_cia = String(vals.reclamo).slice(0, 50);
        await guardar(id, cambios);
        // 📒 Queda anotado en la bitácora (para saber quién/cuándo, como un historial).
        const partes = [`Pasó a «${ESTADOS[op.a].n}».`];
        if (cambios.nro_reclamo_cia) partes.push(`N° de reclamo: ${cambios.nro_reclamo_cia}.`);
        if (vals.cuando) partes.push(`${op.a === "MEDIACION" ? "Audiencia de mediación" : "Inspección"}: ${cuandoTxt(vals.cuando)}.`);
        if (vals.final) partes.push(`Terminó: ${vals.final}.`);
        if (Number(vals.monto) > 0) partes.push(`Monto: ${plata(vals.monto)}.`);
        await anotarEnBitacora(id, partes.join(" ")).catch(() => {});
        invalidarCacheSiniestrosCliente(s.cliente);
        return op.ok;
      },

      nuevo: null, // «Nuevo siniestro» ya está arriba de la página
      vistaInicial: "hoy",

      panel: {
        cargar: async (id) => {
          const deLista = (listaRef.current || []).find((x) => String(x.id) === String(id));
          const fresco = frescos.current[id];
          let s = fresco && (!deLista || String(fresco.fecha_modificacion || "") >= String(deLista.fecha_modificacion || "")) ? fresco : deLista;
          // 🔗 18/11: abierto desde un link (o recargando la página) antes de que llegue la lista → lo pido solo.
          if (!s) s = await pedirSiniestro(id);
          if (!s) throw new Error("No encontré ese siniestro (puede que lo hayan borrado).");
          const eventos = await correr(getEventosBySiniestro(s.id));
          return { ...s, eventos: Array.isArray(eventos) ? eventos : [] };
        },
        sub: (s) => [clienteCorto(s), tipoDe(s).n, vehiculoDe(s), s.patente, `#${s.id}`].filter(Boolean).join(" · "),
        // 👁️ Arriba, al lado del nombre: ver el portal del cliente (cómo le aparece el siniestro).
        // (El abogado no entra a Clientes: no ve el portal.)
        cabecera: (s) =>
          s.cliente && !esAbogado ? (
            <BotonPanel onClick={() => abrirPortalCliente(s.cliente)} icono={<HiOutlineEye className="h-4 w-4" />}>
              Ver portal
            </BotonPanel>
          ) : null,
        // ✍️ 17/11: quién anotó cada cosa (las notas viejas dicen «Bitácora»).
        // 📝 18/11: la nota armada para leer rápido (NotaLegible). Las del conector dicen «· vía Claude».
        novedades: (d) =>
          (d.eventos || []).map((ev) => {
            const via = leerNota(ev.descripcion_evento).via;
            const autor = ev.autor_nombre || via || "Bitácora";
            return {
              id: ev.id,
              autor: via ? `${autor} · vía Claude` : autor,
              fecha: ev.fecha_evento,
              texto: ev.descripcion_evento,
              cuerpo: <NotaLegible texto={ev.descripcion_evento} />,
            };
          }),
        puedeAnotar: () => true,
        anotar: (d, texto) => anotarEnBitacora(d.id, texto),
        opcionCliente: null,
        phNovedad: "Escribí una novedad (ej: llamé a la compañía, el perito va el lunes)…",
        datos: (d) => [
          ["Cliente", esAbogado ? d.cliente_nombre || clienteCorto(d) : d.cliente_label],
          // 👤 17/11: DNI y teléfono del cliente (el abogado no entra a Clientes).
          ["DNI / CUIT", d.cliente_dni || null],
          ["Teléfono", d.cliente_telefono || null],
          ["Lo lleva", d.abogado_nombre ? `⚖️ ${d.abogado_nombre}` : null],
          // 🔗 La póliza abre su ficha en otra pestaña.
          [
            "Póliza",
            d.poliza && !esAbogado ? (
              <a
                key="pol"
                href={`/#/polizas/${d.poliza}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir la póliza en otra pestaña"
                className="inline-flex items-center gap-1.5 font-semibold text-sky-700 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-500 dark:text-sky-300"
              >
                {[d.poliza_label, d.compania_nombre].filter(Boolean).join(" · ") || `Póliza #${d.poliza}`}
                <HiOutlineArrowTopRightOnSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              [d.poliza_label, d.compania_nombre].filter(Boolean).join(" · ") || null
            ),
          ],
          ["Oficina", d.oficina_nombre || null],
          ["Lo reclama", esAbogado ? null : <QuienReclama key="q" s={d} admin={isWebAdmin} grande />],
          ["Qué pasó", d.responsabilidad_label || tipoDe(d).n],
          // ⚖️ Qué se reclama (sale en el título). En un choque sin elegir: «Sin elegir».
          [
            "Qué se reclama",
            d.que_reclama_label ||
              (d.responsabilidad === "CHOCO" || d.responsabilidad === "CHOCARON" ? (
                <Marca key="qr" tono="ambar">Sin elegir</Marca>
              ) : null),
          ],
          // 🛡️ Arriba y con color. En un choque, si falta, se marca «Sin cargar».
          [
            "Seguro del tercero",
            d.tercero_compania || d.tercero_poliza ? (
              <SeguroTercero key="st" s={d} />
            ) : d.responsabilidad === "CHOCO" || d.responsabilidad === "CHOCARON" ? (
              <Marca key="st" tono="ambar">Sin cargar</Marca>
            ) : null,
          ],
          ["Fecha del siniestro", d.fecha_siniestro ? fechaCorta(d.fecha_siniestro) : null],
          ["Vehículo", vehiculoDe(d) || null],
          ["Patente", d.patente || null],
          ["N° de reclamo", d.nro_reclamo_cia || <Marca tono="ambar">Sin cargar</Marca>],
          ["Lo que contó", d.descripcion ? <span className="whitespace-pre-line">{d.descripcion}</span> : null],
          ["Tercero", [d.tercero_nombre, d.tercero_telefono].filter(Boolean).join(" · ") || null],
          ["Auto del tercero", d.tercero_patente || null],
          ["Fotos", d.fotos_count ? `${d.fotos_count}` : "Ninguna"],
        ],
        papeles: (d) => <SiniestroFotosPanel siniestroId={d.id} responsabilidad={d.responsabilidad} />,
        // ⚖️💰 17/11: la pestaña «Reclamo» (abogado, montos, eventos rápidos, checklist).
        //    Sale en los choques en que lo chocaron, en los que tienen abogado o montos, y siempre al abogado.
        tabsExtra: (x) =>
          esAbogado || x.responsabilidad === "CHOCARON" || x.abogado_asignado || x.monto_reclamado || x.monto_ofrecido
            ? [
                {
                  k: "rec",
                  txt: "⚖️ Reclamo",
                  primero: esAbogado,
                  render: (det, onRecargar) => (
                    <SiniestroReclamoPanel
                      s={det}
                      esAdmin={isWebAdmin}
                      puedeEditar={puedeReclamar(det)}
                      abogados={abogados}
                      aviso={avisos[det.id] || null}
                      onAviso={(av) => setAvisos((p) => ({ ...p, [det.id]: av }))}
                      onCambio={async (nuevo) => {
                        if (nuevo && nuevo.id) frescos.current[nuevo.id] = nuevo;
                        await Promise.resolve(onRecargar?.()).catch(() => {});
                      }}
                    />
                  ),
                },
              ]
            : [],
        acciones: (d, onRecargar) => {
          const B = [];
          // 🔑 Lo que ve el cliente en su portal (gestión, próximo paso, documentación…).
          if (isWebAdmin) {
            B.push(
              <BotonPanel key="portal" onClick={() => setPortalDe(d)} icono={<HiOutlineGlobeAlt className="h-4 w-4" />}>
                Portal del cliente
              </BotonPanel>
            );
          }
          // 🙋 Admin: decidir quién lo reclama (si todavía no lo decidió).
          if (isWebAdmin && !d.quien_reclama && d.estado !== "CERRADO") {
            const decidir = async (quien) => {
              try {
                toast.success(await decidirQuien(d, quien));
              } catch (e) {
                toast.error(mensajeDe(e), { duration: 6000 });
              }
              await Promise.resolve(onRecargar?.()).catch(() => {});
            };
            B.push(
              <BotonPanel key="yo" onClick={() => decidir("THAMES")} icono={<span aria-hidden="true">🙋</span>}>
                Lo reclamo yo
              </BotonPanel>,
              <BotonPanel key="tuc" tono="acc" onClick={() => decidir("TUVEUNCHOQUE")} icono={<LogoTuc />}>
                Derivar a TuveUnChoque
              </BotonPanel>
            );
          }
          // ⚖️ Derivado: los datos para pegárselos al estudio y su web.
          if (isWebAdmin && d.quien_reclama === "TUVEUNCHOQUE") {
            B.push(
              <BotonPanel
                key="copiar"
                onClick={async () => {
                  if (await copiar(textoParaEstudio(d))) toast.success("Copiado: pegáselo a TuveUnChoque");
                  else toast.error("No se pudo copiar. Probá de nuevo.");
                }}
                icono={<HiOutlineClipboardDocument className="h-4 w-4" />}
              >
                Copiar los datos
              </BotonPanel>,
              <BotonPanel key="web" href={TUC.web} icono={<HiOutlineGlobeAlt className="h-4 w-4" />}>
                Web de TuveUnChoque
              </BotonPanel>
            );
          }
          // 📲 17/11: WhatsApp al cliente (para el abogado, que no entra a Clientes).
          if (esAbogado && linkWhatsApp(d.cliente_telefono)) {
            B.push(
              <BotonPanel key="cli" tono="verde" href={linkWhatsApp(d.cliente_telefono)} icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}>
                WhatsApp al cliente
              </BotonPanel>
            );
          }
          if (linkWhatsApp(d.tercero_telefono)) {
            B.push(
              <BotonPanel key="ter" tono="verde" href={linkWhatsApp(d.tercero_telefono)} icono={<HiOutlineChatBubbleLeftRight className="h-4 w-4" />}>
                WhatsApp al tercero
              </BotonPanel>
            );
          }
          return B.length ? B : null;
        },
        pie: (d, s) =>
          isWebAdmin && onBorrar ? (
            <button
              type="button"
              onClick={() => onBorrar(s)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-duo-rojo/40 px-3 py-2 text-[13.5px] font-semibold text-duo-rojo hover:bg-duo-rojo-soft dark:hover:bg-[var(--color-duo-rojo-soft-dark)]"
            >
              <HiOutlineTrash className="h-4 w-4" /> Eliminar
            </button>
          ) : null,
        ficha: onEditar ? { txt: "Editar todo", onClick: (s) => onEditar(s) } : null,
      },
    };
  }, [filas, error, recargar, correr, anotarEnBitacora, guardar, decidirQuien, onEditar, onBorrar, isWebAdmin, opcionesOficina, esAbogado, abogados, opcionesAbogado, puedeReclamar, filtroExterno, avisos]);

  return (
    <>
      <Planilla a={a} />
      <SiniestroPortalEditor
        isOpen={!!portalDe}
        onClose={() => setPortalDe(null)}
        siniestro={portalDe}
        onVerPortal={(s) => s?.cliente && abrirPortalCliente(s.cliente)}
      />
    </>
  );
}
