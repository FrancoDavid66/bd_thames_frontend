// src/components/gestoria/NuevoTramite.jsx
//
// ➕ Cargar un trámite nuevo: un WIZARD, una pregunta por pantalla y botones
//    grandes (Franco 29/09: "que sea fácil de usar"). Abajo, "Atrás" y "Siguiente".
//   1 · Qué trámite es: botones con ícono. Al tocar uno pasa solo al paso 2
//       ("Otro" pide cuál es).
//   2 · De quién es: se busca por patente, DNI o nombre (una fila por cliente).
//       Si no es cliente, a mano: nombre y apellido, DNI y teléfono.
//       📞 (Franco 17/10) Si el cliente de THAMES no tiene teléfono, se lo pide
//       acá y queda guardado en su ficha.
//   2b · 🚗 ¿Con qué vehículo? (Franco 17/10): uno de los que tiene en THAMES
//       (de sus pólizas) u «Otro vehículo» que no está en THAMES (ej: Gramajo
//       quería dar de baja un auto que vendió hace 10 años y el trámite se llevó
//       la Gilera de su póliza). Del otro se piden patente, marca, modelo y año:
//       con la patente alcanza; si no la sabe, marca y modelo (la patente se
//       agrega después desde el trámite, Franco 28/09). La licencia de conducir
//       es de la persona: no tiene este paso.
//   3 · Qué papeles trajo (se tocan) y las fotos de los papeles (opcional). Las
//       fotos se suben mientras seguís y quedan en el trámite al cargarlo
//       (la miniatura es chiquita, de Cloudinary: no se carga la foto entera).
//   4 · Qué gestor lo hace (arriba, el más rápido)       → no lo ve el gestor
//   5 · Dónde lo retira el cliente: la oficina de THAMES que sigue el trámite
//       (NO es dónde trabaja el gestor)                  → admin y gestor
//   6 · Revisar y cargar: cada fila con «Cambiar». Después, la pantalla
//       «¡Trámite cargado!» (Ver el trámite · Cargar otro · Volver).
// 💻 En la compu: los pasos a la izquierda, el paso en el medio y a la derecha
//    "Lo que vas cargando". 📱 En el celu: un paso por pantalla, y el botón
//    "atrás" del celu vuelve un paso (no se sale del alta perdiendo todo).
// 🚗 El GESTOR (Franco 29/09) carga al cliente a mano (no busca en los clientes
//    de THAMES), no elige gestor (queda con él) y elige la oficina donde lo
//    retira el cliente. A esa oficina le aparece con "Lo cargó el gestor".
// 🎚️ Plata (solo admin) y aviso al cliente por WhatsApp: salen solo si están
//    prendidos en Railway (hoy apagados). 📅 Sin "fecha estimada" (28/09).
// 📲 «¡Trámite cargado!» con gestor (Franco 14/10): 2 botones de WhatsApp, en orden.
//    1) A la GESTORA: "te pasamos un trámite nuevo" (sin póliza ni plata) + el link
//       para abrirlo en su app.  2) Al CLIENTE: "ya le pasamos tu trámite a la
//       gestoría" + el link para seguirlo. Se abre WhatsApp con el mensaje escrito
//       y lo mandás vos (no sale solo). Si lo cargó el gestor, no salen.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiArrowLeft,
  HiArrowRight,
  HiBan,
  HiCamera,
  HiChatAlt2,
  HiCheck,
  HiCreditCard,
  HiDocumentSearch,
  HiDocumentText,
  HiDotsHorizontal,
  HiDuplicate,
  HiExclamation,
  HiIdentification,
  HiInformationCircle,
  HiLocationMarker,
  HiOfficeBuilding,
  HiPlus,
  HiReceiptTax,
  HiSearch,
  HiSwitchHorizontal,
  HiTruck,
  HiUserAdd,
  HiX,
} from "react-icons/hi";

import { useGestoria } from "./gestoriaContext";
import { buscarClientes, crearTramite, guardarDocumento, mensajeError, subirArchivo } from "../../services/gestoria";
import { Avatar, Candado, Cargando } from "./Piezas";
import { calcComision, fmtPct, linkWhatsAppOElegir, plata } from "./gestoriaUtils";

const MAX_FOTOS = 12; // en el alta; el resto se sube desde el trámite

const inputCls =
  "w-full h-[52px] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 text-[17px] sm:text-[16px] text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta focus:ring-2 focus:ring-duo-violeta/20 [color-scheme:light] dark:[color-scheme:dark]";
const labelCls = "flex flex-col gap-1.5 text-[14px] font-semibold text-titulo dark:text-titulo-dark";
const suave = "text-suave dark:text-suave-dark";

// 🎨 Cómo se ve cada tipo en el paso 1: ícono, color y una pista corta.
//    (Si mañana se agrega un tipo en el backend, sale igual, con el ícono de "Otro".)
const TIPO_UI = {
  TRANSFERENCIA: { icono: HiSwitchHorizontal, pista: "Cambio de dueño", tono: "violeta" },
  CEDULA_AZUL: { icono: HiCreditCard, pista: "Para un autorizado", tono: "azul" },
  CEDULA_VERDE: { icono: HiCreditCard, pista: "La del titular", tono: "verde" },
  INFORME: { icono: HiDocumentSearch, pista: "Deudas, prendas, embargos" },
  LIBRE_DEUDA: { icono: HiReceiptTax, pista: "Patentes e infracciones" },
  BAJA: { icono: HiBan, pista: "Dar de baja el auto", tono: "rojo" },
  DUPLICADO: { icono: HiDuplicate, pista: "Título, cédula o placas", titulo: "Duplicado" },
  RADICACION: { icono: HiLocationMarker, pista: "Por mudanza" },
  LICENCIA: { icono: HiIdentification, pista: "Renovar, duplicado", tono: "amarillo" },
  OTRO: { icono: HiDotsHorizontal, pista: "Contás cuál es" },
};
const TONOS = {
  violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta dark:text-[#a5a0ff]",
  azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul dark:text-blue-300",
  verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-green-400",
  rojo: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo dark:text-red-300",
  amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-amber-300",
  neutro: "bg-surface dark:bg-surface-dark text-suave dark:text-slate-300",
};
const ANIO_MAX = new Date().getFullYear() + 1;

/** ¿Es un teléfono de verdad? Al menos 8 números (la misma regla que el servidor). */
const telOk = (t) => String(t || "").replace(/\D/g, "").length >= 8;

/** "Fiat Duna 1995" con lo que cargaron de «Otro vehículo» (vacío si nada). */
const armarVehiculo = (v) => [v.marca.trim(), v.modelo.trim(), v.anio.trim()].filter(Boolean).join(" ");

/**
 * El buscador trae una fila por auto: acá queda UNA por cliente, con todos sus autos
 * en `vehiculos` (si el servidor todavía no los manda, se arman con las filas).
 */
function agruparClientes(filas) {
  const porCliente = new Map();
  (filas || []).forEach((r) => {
    const k = r.cliente || `${r.nombre}-${r.dni}`;
    if (!porCliente.has(k)) {
      porCliente.set(k, { ...r, vehiculos: Array.isArray(r.vehiculos) ? r.vehiculos : [], _armar: !Array.isArray(r.vehiculos) });
    }
    const c = porCliente.get(k);
    if (c._armar && r.poliza && (r.patente || r.vehiculo) && !c.vehiculos.some((a) => a.poliza === r.poliza)) {
      c.vehiculos.push({ poliza: r.poliza, patente: r.patente, vehiculo: r.vehiculo, poliza_label: r.poliza_label, estado_poliza: r.estado_poliza });
    }
  });
  return [...porCliente.values()];
}

/** Los pasos del alta (según quién carga y si el trámite lleva vehículo). */
function armarPasos({ esGestor, eligeOficina, conVehiculo }) {
  const p = [
    { id: "tipo", corto: "Qué trámite" },
    { id: "cliente", corto: "Cliente" },
  ];
  if (conVehiculo) p.push({ id: "vehiculo", corto: "Vehículo" });
  p.push({ id: "papeles", corto: "Papeles" });
  if (!esGestor) p.push({ id: "gestor", corto: "Gestor" });
  if (eligeOficina) p.push({ id: "oficina", corto: "Dónde lo retira" });
  p.push({ id: "revisar", corto: "Revisar y cargar" });
  return p;
}

// Ejemplo para la "Aclaración" (último paso), según el tipo.
const EJEMPLO = {
  TRANSFERENCIA: "Ej: con cédula azul para el hijo",
  CEDULA_AZUL: "Ej: para Juan Pérez",
  DUPLICADO: "Ej: duplicado del título",
  LICENCIA: "Ej: renovación, duplicado, sumar categoría",
};

/** Circulito de "elegido" (violeta con tilde) o vacío. */
function Tilde({ on }) {
  return on ? (
    <span className="w-[26px] h-[26px] rounded-full bg-duo-violeta text-white flex items-center justify-center shrink-0" aria-hidden="true">
      <HiCheck className="w-4 h-4" />
    </span>
  ) : (
    <span className="w-[26px] h-[26px] rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" aria-hidden="true" />
  );
}

/** Fila grande para elegir (gestor, oficina, cliente). */
function Opcion({ on, onClick, children, conTilde = true }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 min-h-[64px] text-left transition-colors ${
        on
          ? "border border-duo-violeta ring-1 ring-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
          : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark"
      }`}
    >
      {children}
      {conTilde && <Tilde on={on} />}
    </button>
  );
}

function BotonGrande({ variant = "violeta", onClick, disabled = false, children, className = "" }) {
  const v = {
    violeta: "bg-duo-violeta hover:bg-duo-violeta-sombra text-white",
    verde: "bg-duo-verde hover:bg-duo-verde-sombra text-white",
    blanco:
      "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl px-5 text-[16px] font-bold transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </button>
  );
}

/** Cartelito de color (azul = dato, amarillo = ojo, rojo = algo salió mal). */
function Aviso({ tono = "azul", icono = HiInformationCircle, children }) {
  const Icono = icono;
  const cls = {
    azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul-sombra dark:text-blue-200",
    amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-amber-200",
    rojo: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo dark:text-red-200",
  }[tono];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[14px] leading-snug ${cls}`}>
      <Icono className="w-5 h-5 shrink-0 mt-px" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** "DNI 30111222 · 11 4000-1111" sin cortar el teléfono a la mitad en el celu. */
function DniTel({ dni, tel, vacio = "" }) {
  const partes = [dni && `DNI ${dni}`, tel].filter(Boolean);
  if (!partes.length) return vacio;
  return partes.map((x, k) => (
    <Fragment key={k}>
      {k ? " · " : ""}
      <span className="whitespace-nowrap">{x}</span>
    </Fragment>
  ));
}

/** Una fila del paso "Revisar": qué se cargó y «Cambiar». */
function FilaResumen({ label, valor, sub = "", onCambiar = null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-t border-linea dark:border-linea-dark first:border-t-0">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className={`text-[12px] font-semibold ${suave}`}>{label}</span>
        <span className="text-[16px] font-bold text-titulo dark:text-titulo-dark break-words">{valor}</span>
        {sub ? <span className={`text-[13px] break-words ${suave}`}>{sub}</span> : null}
      </div>
      {onCambiar && (
        <button
          type="button"
          onClick={onCambiar}
          aria-label={`Cambiar ${label.toLowerCase()}`}
          className="shrink-0 min-h-[40px] rounded-lg px-3 text-[14px] font-bold text-duo-violeta hover:bg-duo-violeta-soft dark:hover:bg-[var(--color-duo-violeta-soft-dark)]"
        >
          Cambiar
        </button>
      )}
    </div>
  );
}

/** Un dato de "Lo que vas cargando" (columna derecha, en la compu). */
function ResumenDato({ label, valor, sub = "" }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className={`text-[12px] ${suave}`}>{label}</span>
      {valor ? (
        <span className="text-[14px] font-bold text-titulo dark:text-titulo-dark break-words">{valor}</span>
      ) : (
        <span className={`text-[14px] italic ${suave}`}>Falta elegir</span>
      )}
      {valor && sub ? <span className={`text-[12px] break-words ${suave}`}>{sub}</span> : null}
    </div>
  );
}

/** Miniatura liviana de una foto subida a Cloudinary (los PDF no tienen). */
function miniatura(url, lado = 168) {
  const u = String(url || "");
  if (!u.includes("/upload/") || /\.pdf($|\?)/i.test(u)) return "";
  return u.replace("/upload/", `/upload/c_fill,w_${lado},h_${lado},q_auto,f_auto/`);
}

/** Miniatura de una foto (o PDF) del paso 3, con la X para sacarla. */
function MiniFoto({ f, onSacar }) {
  const [rota, setRota] = useState(false);
  const src = f.estado === "ok" && !f.esPdf ? miniatura(f.arch?.url) : "";
  const Icono = f.esPdf ? HiDocumentText : HiCamera;
  return (
    <li className="relative w-[84px] shrink-0">
      <div className="relative w-[84px] h-[84px] rounded-xl overflow-hidden border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark flex items-center justify-center">
        {src && !rota ? (
          <img src={src} alt="" className="w-full h-full object-cover" onError={() => setRota(true)} />
        ) : (
          <Icono className={`w-8 h-8 ${suave}`} aria-hidden="true" />
        )}
        {f.estado === "subiendo" && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-[12px] font-bold text-white">Subiendo…</span>
        )}
      </div>
      <span className={`block mt-1 text-[11px] truncate ${suave}`} title={f.nombre}>
        {f.nombre}
      </span>
      <button
        type="button"
        onClick={onSacar}
        aria-label={`Sacar ${f.nombre}`}
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center shadow"
      >
        <HiX className="w-4 h-4" />
      </button>
    </li>
  );
}

// ───────────── 📲 Los 2 WhatsApp de «¡Trámite cargado!» (14/10) ─────────────

/** Dirección de ESTA app + una ruta (la app usa "#/"). Ej: …/#/gestoria/tramite/12 */
function linkApp(ruta) {
  const base = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
  return `${base}/#${ruta}`;
}

/** Link «Mi trámite» del cliente (el mismo que «Copiar» en la ficha). */
function linkSeguimiento(t) {
  const token = String(t?.portal_path || "").split("/mi-tramite/")[1] || "";
  return token ? linkApp(`/mi-tramite/${token}`) : "";
}

function primerNombre(nombre) {
  const p = String(nombre || "").trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
}

/** "VW Gol AB123CD" (vacío si no es de un auto o todavía no tiene patente). */
function autoDe(t) {
  if (t?.con_vehiculo === false) return "";
  return `${t?.vehiculo || ""} ${t?.patente || ""}`.trim();
}

/** "Transferencia con cédula azul…" ("Otro": lo que escribieron). */
function queTramite(t) {
  return t?.tipo === "OTRO" && t?.detalle ? t.detalle : t?.tipo_txt || "trámite";
}

/** Para el cliente, corto: "Transferencia", "Duplicado"… ("Otro": lo que escribieron). */
function queTramiteCorto(t) {
  return t?.tipo === "OTRO" && t?.detalle ? t.detalle : t?.tipo_corto || queTramite(t);
}

/** Los papeles que no trajo (para que la gestora y el cliente lo sepan). */
function papelesQueFaltan(t) {
  return (Array.isArray(t?.papeles) ? t.papeles : []).filter((p) => p && !p.ok && p.nombre).map((p) => p.nombre);
}

/**
 * 1) A la gestora. 🔒 Sin póliza ni plata (Franco 29/09: el gestor no ve si es cliente de THAMES).
 * Ej: ¡Hola Laura Gómez! Te escribo de THAMES: te pasamos un trámite nuevo (G-0012).
 *     • Transferencia · • Cliente: Juan Pérez · • Auto: VW Gol AB123CD · • Falta: firma del titular
 *     • Lo retira en: THAMES 5 Esquinas · Lo ves en tu app: …/#/gestoria/tramite/12
 */
function textoGestora(t) {
  const nombre = String(t?.gestor_contacto?.nombre || t?.gestor_nombre || "").trim();
  const auto = autoDe(t);
  const faltan = papelesQueFaltan(t);
  const papeles = Array.isArray(t?.papeles) ? t.papeles : [];
  const lineas = [
    `¡Hola${nombre ? ` ${nombre}` : ""}! Te escribo de THAMES: te pasamos un trámite nuevo (${t.numero}).`,
    "",
    `• Trámite: ${queTramite(t)}`,
    t.persona_nombre ? `• Cliente: ${t.persona_nombre}` : null,
    auto ? `• Auto: ${auto}` : null,
    faltan.length ? `• Falta: ${faltan.join(", ")}` : papeles.length ? "• Trajo todos los papeles" : null,
    t.oficina_nombre ? `• Lo retira en: THAMES ${t.oficina_nombre}` : null,
    "",
    `Lo ves en tu app: ${linkApp(`/gestoria/tramite/${t.id}`)}`,
  ];
  return lineas.filter((x) => x !== null).join("\n");
}

/**
 * 2) Al cliente: que ya le avisamos a la gestoría.
 * Ej: ¡Hola Juan! Te escribimos de THAMES. Ya le pasamos tu trámite de transferencia
 *     del VW Gol AB123CD a la gestoría (Laura Gómez), que se encarga de hacerlo. …
 */
function textoCliente(t) {
  const nombre = primerNombre(t?.persona_nombre);
  const gestora = String(t?.gestor_contacto?.nombre || t?.gestor_nombre || "").trim();
  const auto = autoDe(t);
  const faltan = papelesQueFaltan(t);
  const link = linkSeguimiento(t);
  const lineas = [
    `¡Hola${nombre ? ` ${nombre}` : ""}! Te escribimos de THAMES. Ya le pasamos tu trámite de ${queTramiteCorto(t).toLowerCase()}${
      auto ? ` del ${auto}` : ""
    } a la gestoría${gestora ? ` (${gestora})` : ""}, que se encarga de hacerlo. El pago del trámite se lo hacés directo a la gestoría.`,
    faltan.length ? `Para avanzar falta: ${faltan.join(", ").toLowerCase()}.` : null,
    "Te avisamos cuando haya novedades.",
    link ? `Lo podés seguir acá: ${link}` : null,
  ];
  return lineas.filter((x) => x !== null).join("\n");
}

/**
 * 📲 Los 2 botones, en orden: 1) a la gestora, 2) al cliente. Cada uno abre WhatsApp
 * con el mensaje escrito (lo mandás vos). Sin teléfono, WhatsApp te deja elegir el chat.
 * El botón verde es el que toca ahora; al tocarlo queda con ✓.
 */
function AvisosWhatsApp({ t }) {
  const [hecho, setHecho] = useState({ gestora: false, cliente: false });
  const c = t.gestor_contacto || {};
  const telGestora = String(c.telefono || "").trim();
  const telCliente = String(t.persona_telefono || "").trim();
  // Si algún día prenden el WhatsApp automático, al cliente ya le llegó el link solo.
  const autoCliente = (t.avisos_whatsapp || []).some((w) => w && w.motivo === "alta" && w.ok && !w.manual);

  const filas = [
    {
      id: "gestora",
      n: 1,
      titulo: `A la gestoría: ${c.nombre || t.gestor_nombre}`,
      sub: "Que tiene un trámite nuevo para hacer.",
      tel: telGestora,
      href: linkWhatsAppOElegir(telGestora, textoGestora(t)),
      boton: "Avisar a la gestoría",
    },
    {
      id: "cliente",
      n: 2,
      titulo: `Al cliente: ${t.persona_nombre || "sin nombre"}`,
      sub: autoCliente ? "Ya le llegó el WhatsApp automático con el link." : "Que ya le pasamos el trámite a la gestoría.",
      tel: telCliente,
      href: linkWhatsAppOElegir(telCliente, textoCliente(t)),
      boton: "Avisar al cliente",
      ya: autoCliente,
    },
  ];
  const toca = filas.find((f) => !hecho[f.id] && !f.ya)?.id || "";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark p-4">
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-2 text-[16px] font-bold text-titulo dark:text-titulo-dark">
          <HiChatAlt2 className="w-5 h-5 text-duo-verde" aria-hidden="true" /> Avisar por WhatsApp
        </span>
        <span className={`text-[13px] ${suave}`}>Tocá en orden: se abre WhatsApp con el mensaje escrito y lo mandás vos.</span>
      </div>
      <ol className="flex flex-col gap-2.5">
        {filas.map((f) => {
          const listo = hecho[f.id] || f.ya;
          const principal = toca === f.id;
          return (
            <li
              key={f.id}
              className={`flex flex-col gap-3 rounded-xl border px-3.5 py-3 ${
                principal
                  ? "border-duo-verde/50 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
                  : "border-linea dark:border-linea-dark bg-card dark:bg-card-dark"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[14px] font-bold ${
                    listo ? "bg-duo-verde text-white" : principal ? "bg-duo-violeta text-white" : "border-2 border-slate-300 dark:border-slate-600 text-suave dark:text-suave-dark"
                  }`}
                  aria-hidden="true"
                >
                  {listo ? <HiCheck className="w-4 h-4" /> : f.n}
                </span>
                <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <strong className="text-[15px] leading-snug text-titulo dark:text-titulo-dark break-words">{f.titulo}</strong>
                  <span className={`text-[13px] leading-snug ${suave}`}>
                    {hecho[f.id] ? "Listo: se abrió WhatsApp con el mensaje." : f.sub}
                  </span>
                  <span className={`text-[12px] ${suave}`}>
                    {f.tel ? `WhatsApp: ${f.tel}` : "Sin teléfono cargado: en WhatsApp elegís el chat."}
                  </span>
                </span>
              </div>
              {!f.ya && (
                <a
                  href={f.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setHecho((h) => ({ ...h, [f.id]: true }))}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold transition-colors active:scale-[0.99] ${
                    principal
                      ? "bg-duo-verde hover:bg-duo-verde-sombra text-white"
                      : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
                  }`}
                >
                  <HiChatAlt2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {hecho[f.id] ? "Mandar de nuevo" : f.boton}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function NuevoTramite() {
  const navigate = useNavigate();
  const { esAdmin, esGestor, catalogo, gestores, recargarGestores, setTabGestor } = useGestoria();
  const waAuto = !!catalogo?.whatsapp_auto; // false = el WhatsApp se manda a mano desde el trámite
  const avisoCliente = !!catalogo?.aviso_cliente; // 🎚️ false = aviso al cliente apagado (hoy)
  const conPlata = esAdmin && !!catalogo?.comisiones; // 🎚️ false = comisiones apagadas (hoy)
  const eligeOficina = esAdmin || esGestor; // la oficina común carga en la suya
  const tipos = useMemo(() => catalogo?.tipos || [], [catalogo]);
  const oficinas = useMemo(() => catalogo?.oficinas || [], [catalogo]);

  const activos = useMemo(() => (gestores || []).filter((g) => g.activo !== false), [gestores]);
  const masRapido = useMemo(() => {
    let mejor = null;
    activos.forEach((g) => {
      if (g.promedio_dias != null && (!mejor || Number(g.promedio_dias) < Number(mejor.promedio_dias))) mejor = g;
    });
    return mejor ? mejor.id : activos[0]?.id || "";
  }, [activos]);
  const gestoresOrden = useMemo(() => {
    const dias = (g) => (g.promedio_dias == null ? 9999 : Number(g.promedio_dias));
    return [...activos].sort((a, b) => dias(a) - dias(b));
  }, [activos]);

  const [i, setI] = useState(0); // en qué paso está
  const [desdeRevisar, setDesdeRevisar] = useState(false); // vino con «Cambiar» desde "Revisar"
  const [tipo, setTipo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [sel, setSel] = useState(null);
  const [manual, setManual] = useState(false);
  const [m, setM] = useState({ nombre: "", dni: "", tel: "" });
  const [telNuevo, setTelNuevo] = useState(""); // 📞 el cliente de THAMES no tenía teléfono
  const [vehSel, setVehSel] = useState(null); // 🚗 uno de los autos que tiene en THAMES
  const [otroAuto, setOtroAuto] = useState(false); // 🚗 «Otro vehículo» (no está en THAMES)
  const [v, setV] = useState({ patente: "", marca: "", modelo: "", anio: "" });
  const [papeles, setPapeles] = useState([]);
  const [papelNuevo, setPapelNuevo] = useState("");
  const [fotos, setFotos] = useState([]); // {id, nombre, esPdf, estado: "subiendo"|"ok", arch}
  const [gestorId, setGestorId] = useState(null); // null = el sugerido (el más rápido); "" = sin gestor
  const [oficina, setOficina] = useState("");
  const [precio, setPrecio] = useState("");
  const [wa, setWa] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(null); // {t, fallidas} → pantalla "¡Trámite cargado!"
  const pedido = useRef(0);
  const vivo = useRef(true);
  const arriba = useRef(null);
  const quitadas = useRef(new Set()); // fotos que sacaste mientras subían
  const guarda = useRef(false); // hay una "marca" en el historial para el botón atrás
  const iRef = useRef(0);
  const creadoRef = useRef(null);
  const guardandoRef = useRef(false);
  const tituloListo = useRef(null);
  iRef.current = i;
  creadoRef.current = creado;
  guardandoRef.current = guardando;

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  // 📱 El botón "atrás" del celu (o del navegador) vuelve UN paso, en vez de
  //    salir del alta y perder lo cargado. Mientras estás del paso 2 en adelante
  //    queda una "marca" en el historial; al tocar atrás se usa esa marca.
  useEffect(() => {
    const alVolver = () => {
      if (!guarda.current) return; // no era nuestra marca: se sale normal
      guarda.current = false;
      if (guardandoRef.current) {
        // Se está cargando: no se mueve (vuelve a poner la marca).
        window.history.pushState(window.history.state, "");
        guarda.current = true;
        return;
      }
      if (creadoRef.current || iRef.current === 0) {
        window.history.back(); // no hay paso anterior: sale de verdad
        return;
      }
      setError("");
      setDesdeRevisar(false);
      setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);
  useEffect(() => {
    if (i > 0 && !creado && !guarda.current) {
      window.history.pushState(window.history.state, "");
      guarda.current = true;
    }
  }, [i, creado]);
  // Al terminar, el lector de pantalla arranca por "¡Trámite cargado!".
  useEffect(() => {
    if (creado) tituloListo.current?.focus();
  }, [creado]);

  // Buscador de clientes (espera a que dejes de escribir).
  useEffect(() => {
    const texto = q.trim();
    if (texto.replace(/\s/g, "").length < 2) {
      pedido.current += 1; // lo que estaba buscando ya no sirve
      setResultados([]);
      setBuscando(false);
      return undefined;
    }
    const n = ++pedido.current;
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const r = await buscarClientes(texto);
        if (n === pedido.current) setResultados(Array.isArray(r) ? r : []);
      } catch {
        if (n === pedido.current) setResultados([]);
      } finally {
        if (n === pedido.current) setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Al cambiar de paso, si quedó scrolleado para abajo, vuelve arriba del paso.
  useEffect(() => {
    const el = arriba.current;
    if (el && el.getBoundingClientRect().top < 72) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [i, creado]);

  // ── Los pasos (según quién carga y si lleva vehículo) ──
  const tipoInfo = tipos.find((x) => x.id === tipo) || null;
  const conVehiculo = tipoInfo ? tipoInfo.vehiculo !== false : true; // la licencia es de la persona
  const pasos = useMemo(() => armarPasos({ esGestor, eligeOficina, conVehiculo }), [esGestor, eligeOficina, conVehiculo]);
  const paso = pasos[i]?.id || "tipo";
  const total = pasos.length;

  // ── Lo que se va cargando ──
  const tipoNombre = tipo === "OTRO" ? (detalle.trim() ? `Otro: ${detalle.trim()}` : "Otro") : tipoInfo?.nombre || "";
  const manualEf = esGestor || manual; // el gestor siempre carga al cliente a mano
  const cliNombre = manualEf ? m.nombre.trim() : sel?.nombre || "";
  // 📞 Cliente de THAMES sin teléfono: se pide (y se guarda en su ficha al cargar).
  const pideTel = !manualEf && !!sel && !telOk(sel.telefono);
  const tel = manualEf ? m.tel.trim() : pideTel ? telNuevo.trim() : sel?.telefono || "";
  const cliDni = manualEf ? m.dni.trim() : sel?.dni || "";
  const cliSub = [cliDni && `DNI ${cliDni}`, tel].filter(Boolean).join(" · ");
  // 🚗 Los autos del cliente en THAMES, o «Otro vehículo» (a mano siempre es «otro»).
  const autosThames = !manualEf && sel ? sel.vehiculos || [] : [];
  const otroEf = otroAuto || !autosThames.length;
  const vehOtro = { vehiculo: armarVehiculo(v), patente: v.patente.replace(/\s/g, "").toUpperCase() };
  const anioTxt = v.anio.trim();
  const anioOk = !anioTxt || (/^\d{4}$/.test(anioTxt) && Number(anioTxt) >= 1900 && Number(anioTxt) <= ANIO_MAX);
  const datosAutoOk = !!vehOtro.patente || (!!v.marca.trim() && !!v.modelo.trim());
  const auto = !conVehiculo
    ? null
    : !otroEf
      ? vehSel
        ? { vehiculo: vehSel.vehiculo, patente: vehSel.patente }
        : null
      : vehOtro.vehiculo || vehOtro.patente
        ? vehOtro
        : null;
  const autoTxt = auto ? `${auto.vehiculo || ""} ${auto.patente || ""}`.trim() : "";
  const autoSub = !auto ? "" : !otroEf ? `En THAMES${vehSel?.poliza_label ? ` · póliza ${vehSel.poliza_label}` : ""}` : autosThames.length ? "Otro vehículo (no está en THAMES)" : "";
  const subiendoN = fotos.filter((f) => f.estado === "subiendo").length;
  const fotosOk = fotos.filter((f) => f.estado === "ok");
  const papelesOk = papeles.filter((p) => p.ok).length;
  const faltan = papeles.filter((p) => !p.ok).map((p) => p.nombre);
  const papelesTxt = papeles.length
    ? `${papelesOk} de ${papeles.length}${fotosOk.length ? ` · ${fotosOk.length} foto${fotosOk.length > 1 ? "s" : ""}` : ""}`
    : "";
  const gestorElegido = gestorId === null ? masRapido || "" : gestorId;
  const gSel = activos.find((g) => String(g.id) === String(gestorElegido)) || null;
  const oficinaSel = oficina || (esAdmin && catalogo?.mi_oficina ? String(catalogo.mi_oficina) : "");
  const nombreOficina = (id) => oficinas.find((o) => String(o.id) === String(id))?.nombre || "";
  const retiraEn = eligeOficina ? nombreOficina(oficinaSel) : nombreOficina(catalogo?.mi_oficina) || "tu oficina";

  // Plata (solo admin con las comisiones prendidas).
  const pctSel = gSel ? Number(gSel.comision_pct) : null;
  const precioNum = Number(precio);
  let calc;
  if (precio.trim() === "" || !(precioNum > 0)) calc = "Si lo dejás vacío, queda «Falta el precio» hasta que lo cargue el gestor.";
  else if (!gSel) calc = "La comisión se calcula cuando lo tome un gestor.";
  else if (!(pctSel > 0)) calc = `${gSel.nombre} no paga comisión.`;
  else calc = `Comisión para THAMES (${fmtPct(pctSel)}): ${plata(calcComision(precioNum, pctSel))}`;

  // Una fila por cliente (el auto se elige en el paso que sigue).
  const resultadosVista = useMemo(() => agruparClientes(resultados), [resultados]);

  // ── ¿Está completo cada paso? (y qué decir si no) ──
  const listo = {
    tipo: !!tipo && (tipo !== "OTRO" || !!detalle.trim()),
    cliente: manualEf ? !!m.nombre.trim() : !!sel && (!pideTel || telOk(telNuevo)),
    vehiculo: otroEf ? datosAutoOk && anioOk : !!vehSel,
    papeles: true, // las fotos siguen subiendo mientras avanzás (se espera al cargar)
    gestor: true,
    oficina: !!oficinaSel,
    revisar: true,
  };
  const falta = {
    tipo: !tipo ? "Elegí qué trámite es." : "Escribí qué trámite es (ej: «Informe de multas»).",
    cliente: manualEf
      ? "Falta el nombre y apellido del cliente."
      : !sel
        ? "Elegí al cliente de la lista, o tocá «Es alguien nuevo»."
        : "Falta el teléfono del cliente: poné la característica y el número (ej: 11 5555-0000).",
    vehiculo:
      !otroEf && !vehSel
        ? "Elegí el vehículo, o tocá «Otro vehículo»."
        : !anioOk
          ? `El año tiene que tener 4 números (ej: 2015), hasta ${ANIO_MAX}.`
          : "Poné la patente, o la marca y el modelo del vehículo.",
    papeles: "Esperá que terminen de subir las fotos.",
    oficina: "Elegí la oficina de THAMES donde lo retira el cliente.",
  };
  const puedeIr = (n) => n <= i || pasos.slice(0, n).every((p) => listo[p.id]);

  // ── Moverse entre pasos ──
  const irA = (dest) => {
    if (guardando) return;
    const n = typeof dest === "number" ? dest : pasos.findIndex((p) => p.id === dest);
    if (n < 0 || n >= pasos.length) return;
    // Al salir del paso "Gestor" queda fijo el sugerido (la lista se actualiza sola
    // cada tanto y el "más rápido" podría cambiar sin que lo veas).
    if (paso === "gestor" && gestorId === null) setGestorId(masRapido || "");
    setError("");
    if (pasos[n].id === "revisar") setDesdeRevisar(false);
    setI(n);
  };
  const cambiar = (id) => {
    setDesdeRevisar(true);
    irA(id);
  };
  const hayDatos = !!tipo || !!sel || !!m.nombre.trim() || fotos.length > 0;
  // Sale al tablero (o al Inicio de la app del gestor). Si hay marca de "atrás" en el historial, la reemplaza.
  const irAlInicio = () => {
    const reemplazar = guarda.current;
    guarda.current = false;
    navigate("/gestoria", { replace: reemplazar });
  };
  const salir = () => {
    if (guardando) return;
    if (hayDatos && !window.confirm("¿Salir sin cargar el trámite? Se pierde lo que cargaste.")) return;
    irAlInicio();
  };
  const atras = () => (i > 0 ? irA(i - 1) : salir());

  const elegirTipo = (id) => {
    setError("");
    if (id !== tipo) {
      // Los papeles del tipo nuevo (los que ya estaban tildados siguen tildados)
      // más los que agregaste vos.
      const tildados = new Set(papeles.filter((p) => p.ok).map((p) => p.nombre));
      const base = (tipos.find((x) => x.id === id)?.papeles || []).map((n) => ({ nombre: n, ok: tildados.has(n) }));
      const propios = papeles.filter((p) => p.propio && !base.some((b) => b.nombre === p.nombre));
      setPapeles([...base, ...propios]);
      if ((tipo === "OTRO") !== (id === "OTRO")) setDetalle("");
      setTipo(id);
    }
    if (id !== "OTRO") {
      // Pasa solo al paso que sigue (o vuelve a "Revisar" si vino de ahí). Ojo: con
      // otro tipo pueden cambiar los pasos (la licencia no tiene «Vehículo»); si
      // ahora lleva vehículo y todavía no está, pasa primero por ese paso.
      const conVehNuevo = tipos.find((x) => x.id === id)?.vehiculo !== false;
      const nuevos = armarPasos({ esGestor, eligeOficina, conVehiculo: conVehNuevo });
      const revisarN = nuevos.length - 1;
      const destino = !desdeRevisar ? 1 : conVehNuevo && !listo.vehiculo ? nuevos.findIndex((p) => p.id === "vehiculo") : revisarN;
      setTimeout(() => {
        if (!vivo.current) return;
        if (destino === revisarN) setDesdeRevisar(false);
        setI(destino);
      }, 220);
    }
  };

  const elegirCliente = (r) => {
    setSel(r);
    setTelNuevo("");
    setVehSel(null);
    setOtroAuto(false);
    setV({ patente: "", marca: "", modelo: "", anio: "" });
    setError("");
    // El admin: sale sola la oficina del cliente, si está activa (la puede cambiar).
    if (esAdmin && r.oficina && oficinas.some((o) => String(o.id) === String(r.oficina))) setOficina(String(r.oficina));
  };

  // ── Papeles ──
  const tocarPapel = (idx) => setPapeles((ps) => ps.map((p, j) => (j === idx ? { ...p, ok: !p.ok } : p)));
  const sacarPapel = (idx) => setPapeles((ps) => ps.filter((_, j) => j !== idx));
  const agregarPapel = (e) => {
    e.preventDefault();
    const n = papelNuevo.trim();
    if (!n) return;
    if (papeles.some((p) => p.nombre.toLowerCase() === n.toLowerCase())) {
      toast.error("Ese papel ya está en la lista.");
      return;
    }
    if (papeles.length >= 40) {
      toast.error("Ya hay demasiados papeles en la lista.");
      return;
    }
    setPapeles((ps) => [...ps, { nombre: n, ok: true, propio: true }]);
    setPapelNuevo("");
  };

  // ── Fotos (se suben al elegirlas; se guardan en el trámite al cargarlo) ──
  const elegirFotos = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    const lugar = MAX_FOTOS - fotos.length;
    if (archivos.length > lugar) toast.error(`Acá van hasta ${MAX_FOTOS}. Las demás, desde el trámite.`);
    const lote = archivos.slice(0, Math.max(0, lugar)).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      nombre: file.name || "archivo",
      esPdf: file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""),
      estado: "subiendo",
    }));
    if (!lote.length) return;
    setFotos((fs) => [...fs, ...lote]);
    for (const f of lote) {
      try {
        const arch = await subirArchivo(f.file, "gestoria/papeles");
        if (!vivo.current) return;
        setFotos((fs) => fs.map((x) => (x.id === f.id ? { ...x, estado: "ok", arch, file: null } : x)));
      } catch (err) {
        if (!vivo.current) return;
        if (!quitadas.current.has(f.id)) toast.error(`No se pudo subir «${f.nombre}»: ${err?.message || "probá de nuevo"}`);
        setFotos((fs) => fs.filter((x) => x.id !== f.id));
      }
    }
  };
  const sacarFoto = (f) => {
    quitadas.current.add(f.id);
    setFotos((fs) => fs.filter((x) => x.id !== f.id));
  };

  // ── Cargar ──
  const cargar = async () => {
    if (guardando) return;
    if (subiendoN) return setError(falta.papeles);
    const mal = pasos.find((p) => p.id !== "revisar" && !listo[p.id]);
    if (mal) {
      irA(mal.id);
      setError(falta[mal.id]);
      return;
    }
    if (conPlata && precio.trim() !== "" && !(precioNum > 0)) {
      return setError("El precio tiene que ser un número mayor a cero (o dejalo vacío y lo carga el gestor).");
    }
    setError("");
    // 🚗 «Otro vehículo»: patente, marca, modelo y año (el servidor arma "Fiat Duna 1995").
    const datosAuto = {
      patente: vehOtro.patente,
      marca: v.marca.trim(),
      modelo: v.modelo.trim(),
      anio: anioTxt ? Number(anioTxt) : null,
    };
    let cliente;
    if (manualEf) {
      cliente = { persona_nombre: m.nombre.trim(), persona_dni: m.dni.trim(), persona_telefono: m.tel.trim(), ...(conVehiculo ? datosAuto : {}) };
    } else {
      const quien = sel.cliente
        ? { cliente: sel.cliente }
        : { persona_nombre: sel.nombre || "", persona_dni: sel.dni || "", persona_telefono: sel.telefono || "" };
      if (!conVehiculo) cliente = sel.cliente ? quien : { poliza: sel.poliza }; // licencia: la persona, sin auto
      else if (!otroEf && vehSel) cliente = { ...quien, poliza: vehSel.poliza }; // un auto suyo de THAMES
      else cliente = { ...quien, ...datosAuto }; // otro vehículo: sin póliza
      if (pideTel) cliente.cliente_telefono = telNuevo.trim(); // 📞 queda en su ficha
    }
    const body = {
      tipo,
      detalle: detalle.trim(),
      papeles: papeles.map((p) => ({ nombre: p.nombre, ok: !!p.ok })),
      // El gestor no elige gestor: el trámite queda con él (lo pone el servidor).
      ...(esGestor ? {} : { gestor: gSel ? Number(gSel.id) : null, avisar_whatsapp: avisoCliente && waAuto && wa }),
      ...cliente,
      ...(eligeOficina ? { oficina: Number(oficinaSel) } : {}),
      ...(conPlata ? { precio_gestoria: precio.trim() ? Math.round(precioNum) : null } : {}),
    };
    setGuardando(true);
    try {
      const t = await crearTramite(body);
      let fallidas = 0;
      for (const f of fotosOk) {
        try {
          await guardarDocumento(t.id, { ...f.arch, tipo: "PAPEL" });
        } catch {
          fallidas += 1;
        }
      }
      recargarGestores?.();
      if (esGestor) setTabGestor?.("hacer"); // en «Trámites» lo ve en «Para hacer» (Para presentar)
      if (vivo.current) setCreado({ t, fallidas });
    } catch (e) {
      if (vivo.current) setError(mensajeError(e));
    } finally {
      if (vivo.current) setGuardando(false);
    }
  };

  // El botón de abajo a la derecha (y Enter en los campos).
  const principal = () => {
    if (paso === "revisar") return cargar();
    if (!listo[paso]) return setError(falta[paso] || "Falta completar este paso.");
    return desdeRevisar ? irA("revisar") : irA(i + 1);
  };
  const enterSigue = (e) => {
    if (e.key === "Enter" && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      principal();
    }
  };

  const reiniciar = () => {
    quitadas.current.clear();
    setI(0);
    setDesdeRevisar(false);
    setTipo("");
    setDetalle("");
    setQ("");
    setResultados([]);
    setSel(null);
    setManual(false);
    setM({ nombre: "", dni: "", tel: "" });
    setTelNuevo("");
    setVehSel(null);
    setOtroAuto(false);
    setV({ patente: "", marca: "", modelo: "", anio: "" });
    setPapeles([]);
    setPapelNuevo("");
    setFotos([]);
    setGestorId(null);
    setPrecio("");
    setWa(true);
    setError("");
    setCreado(null);
    // La oficina queda (casi siempre es la misma).
  };

  // ───────────────────────────── pantallas ─────────────────────────────
  if (!catalogo) {
    return (
      <div className="mx-auto w-full max-w-lg lg:max-w-6xl flex flex-col gap-3">
        <Cargando alto="h-16" />
        <Cargando alto="h-96" />
      </div>
    );
  }

  if (esGestor && !catalogo.gestor) {
    return (
      <div className="mx-auto w-full max-w-lg flex flex-col gap-4 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5">
        <Aviso tono="amarillo" icono={HiExclamation}>
          Tu usuario todavía no está vinculado a una gestoría, así que no puede cargar trámites. Avisale a THAMES.
        </Aviso>
        <BotonGrande variant="blanco" onClick={() => navigate("/gestoria")}>
          Volver
        </BotonGrande>
      </div>
    );
  }

  // ✅ ¡Trámite cargado!
  if (creado) {
    const t = creado.t;
    const faltanN = Math.max(0, (t.papeles_total || 0) - (t.papeles_ok || 0));
    return (
      <div ref={arriba} className="scroll-mt-24 mx-auto w-full max-w-lg">
        <div className="flex flex-col gap-4 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 sm:p-6">
          <div className="flex flex-col items-center gap-3.5 text-center pt-4">
            <span className="w-[88px] h-[88px] rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde flex items-center justify-center">
              <HiCheck className="w-12 h-12" aria-hidden="true" />
            </span>
            <h2 ref={tituloListo} tabIndex={-1} className="text-[28px] font-extrabold tracking-tight text-titulo dark:text-titulo-dark outline-none">
              ¡Trámite cargado!
            </h2>
            <span className="rounded-full border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3.5 py-1.5 font-mono text-[15px] font-bold tracking-wide text-titulo dark:text-titulo-dark">
              {t.numero}
            </span>
            <p className={`max-w-[340px] text-[16px] leading-relaxed ${suave}`}>
              {t.tipo_txt}
              {t.persona_nombre ? ` de ${t.persona_nombre}` : ""}.{" "}
              {esGestor ? (
                <>
                  Quedó en tus trámites, en <strong className="text-titulo dark:text-titulo-dark">«Para presentar»</strong>
                  {t.oficina_nombre ? `. Lo retira en THAMES ${t.oficina_nombre}.` : "."}
                </>
              ) : t.gestor_nombre ? (
                <>
                  Se lo pasamos a <strong className="text-titulo dark:text-titulo-dark">{t.gestor_nombre}</strong>: ya lo ve en su celu.
                </>
              ) : (
                <>
                  Queda en <strong className="text-titulo dark:text-titulo-dark">«Recibido»</strong> hasta que le asignes un gestor.
                </>
              )}
            </p>
          </div>
          {faltanN > 0 && (
            <Aviso tono="amarillo" icono={HiExclamation}>
              {faltanN === 1 ? "Falta 1 papel" : `Faltan ${faltanN} papeles`}. Cuando los traiga, los tildás o les sacás foto desde el trámite.
            </Aviso>
          )}
          {creado.fallidas > 0 && (
            <Aviso tono="rojo" icono={HiExclamation}>
              {creado.fallidas === 1 ? "Una foto no se pudo guardar. Subila" : `${creado.fallidas} fotos no se pudieron guardar. Subilas`} de nuevo desde el trámite.
            </Aviso>
          )}
          {/* 📲 1) a la gestoría · 2) al cliente (solo si lo cargó la oficina/admin y tiene gestor) */}
          {!esGestor && t.gestor ? <AvisosWhatsApp key={t.id} t={t} /> : null}
          <div className="flex flex-col gap-2.5 pt-3">
            <BotonGrande
              onClick={() => {
                guarda.current = false;
                navigate(`/gestoria/tramite/${t.id}`, { replace: true, state: { recienCargado: true } });
              }}
            >
              Ver el trámite
            </BotonGrande>
            <BotonGrande variant="blanco" onClick={reiniciar}>
              <HiPlus className="w-5 h-5" aria-hidden="true" /> Cargar otro
            </BotonGrande>
            <button
              type="button"
              onClick={irAlInicio}
              className="self-center min-h-[44px] px-3 text-[15px] font-bold text-duo-violeta hover:underline"
            >
              {esGestor ? "Volver al inicio" : "Volver al tablero"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Título y bajada de cada paso.
  const TITULOS = {
    tipo: ["¿Qué trámite es?", "Tocá uno."],
    cliente: manualEf
      ? [esGestor ? "¿De quién es el trámite?" : "Cliente nuevo", "Solo 3 datos. El nombre es lo único obligatorio."]
      : ["¿De quién es el trámite?", "Buscalo por patente, DNI o nombre."],
    vehiculo: autosThames.length
      ? ["¿Con qué vehículo es el trámite?", `¿Es uno de los que ${primerNombre(cliNombre) || "el cliente"} tiene en THAMES, o es otro?`]
      : ["¿Qué vehículo es?", "Con la patente alcanza. Si no la sabe, poné la marca y el modelo."],
    papeles: ["¿Qué papeles trajo?", "Tocá los que tiene. Los que faltan quedan marcados en el trámite."],
    gestor: ["¿Qué gestor lo hace?", activos.length > 1 ? "Arriba, el que más rápido viene." : "Elegí quién lo hace."],
    oficina: [
      "¿Dónde lo retira el cliente?",
      esGestor
        ? "Elegí la oficina de THAMES. Ahí le aparece el trámite y ahí el cliente pasa a buscar los papeles."
        : "La oficina de THAMES que sigue el trámite: ahí lo ven y ahí el cliente lo retira. No es donde trabaja el gestor.",
    ],
    revisar: ["Revisá y cargá", "Si algo está mal, tocá «Cambiar»."],
  };
  const [titulo, bajada] = TITULOS[paso];
  const resumenPaso = {
    tipo: tipoNombre,
    cliente: cliNombre,
    vehiculo: autoTxt,
    papeles: papelesTxt,
    gestor: gSel ? gSel.nombre : "Sin gestor",
    oficina: retiraEn,
  };
  const qLargo = q.trim().replace(/\s/g, "").length >= 2;

  return (
    <div ref={arriba} className="scroll-mt-24 mx-auto w-full max-w-lg lg:max-w-6xl">
      {/* 💻 Título arriba (en el celu va dentro de la tarjeta) */}
      <div className="hidden lg:flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-titulo dark:text-titulo-dark">Nuevo trámite</h1>
        <button
          type="button"
          onClick={salir}
          disabled={guardando}
          className={`min-h-[40px] rounded-lg px-3 text-[14px] font-semibold hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-50 ${suave}`}
        >
          Cancelar
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)_260px] lg:gap-5 lg:items-start">
        {/* 💻 Los pasos (izquierda) */}
        <nav aria-label="Pasos del trámite" className="hidden lg:flex flex-col gap-1">
          {pasos.map((p, n) => {
            const actual = n === i;
            const hecho = n < i && listo[p.id];
            const detalleTxt = hecho ? resumenPaso[p.id] : "";
            return (
              <button
                key={p.id}
                type="button"
                disabled={!puedeIr(n) || actual || guardando}
                onClick={() => irA(n)}
                aria-current={actual ? "step" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 min-h-[52px] text-left transition-colors ${
                  actual
                    ? "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                    : "hover:bg-card dark:hover:bg-card-dark disabled:hover:bg-transparent"
                } disabled:cursor-default`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                    hecho
                      ? "bg-duo-verde text-white"
                      : actual
                        ? "bg-duo-violeta text-white"
                        : "border-2 border-slate-300 dark:border-slate-600 text-suave dark:text-suave-dark"
                  }`}
                >
                  {hecho ? <HiCheck className="w-4 h-4" aria-hidden="true" /> : n + 1}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className={`text-[14px] font-semibold ${actual || hecho ? "text-titulo dark:text-titulo-dark" : suave}`}>{p.corto}</span>
                  {detalleTxt ? <span className={`text-[12px] truncate ${suave}`}>{detalleTxt}</span> : null}
                </span>
              </button>
            );
          })}
        </nav>

        {/* El paso */}
        <section className="flex flex-col rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark shadow-sm min-w-0">
          {/* 📱 Barra de arriba */}
          <div className="flex items-center justify-between px-1.5 pt-1.5 lg:hidden">
            {i > 0 ? (
              <button
                type="button"
                onClick={atras}
                disabled={guardando}
                aria-label="Atrás"
                className="w-11 h-11 rounded-full flex items-center justify-center text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
              >
                <HiArrowLeft className="w-6 h-6" />
              </button>
            ) : (
              <span className="w-11 h-11" aria-hidden="true" />
            )}
            <h1 className="text-[16px] font-semibold text-titulo dark:text-titulo-dark">Nuevo trámite</h1>
            <button
              type="button"
              onClick={salir}
              disabled={guardando}
              aria-label="Cerrar"
              className="w-11 h-11 rounded-full flex items-center justify-center text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-5 px-4 sm:px-5 pt-2 lg:pt-5 pb-5">
            {/* Paso N de M */}
            <div className="flex flex-col gap-2">
              <div className={`flex items-center justify-between gap-2 text-[13px] ${suave}`}>
                <span>
                  <strong className="text-duo-violeta dark:text-[#a5a0ff]">
                    Paso {i + 1} de {total}
                  </strong>{" "}
                  · {pasos[i].corto}
                </span>
                {tipoNombre && paso !== "tipo" && <span className="truncate text-right lg:hidden">{tipoNombre}</span>}
              </div>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
                role="progressbar"
                aria-label={`Paso ${i + 1} de ${total}`}
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={i + 1}
              >
                {pasos.map((p, n) => (
                  <span key={p.id} className={`h-1.5 rounded-full ${n <= i ? "bg-duo-violeta" : "bg-linea dark:bg-linea-dark"}`} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Para el lector de pantalla: avisa en qué paso quedó */}
              <p className="sr-only" aria-live="polite">{`Paso ${i + 1} de ${total}: ${titulo}`}</p>
              <h2 className="text-[24px] leading-tight font-extrabold tracking-tight text-titulo dark:text-titulo-dark">{titulo}</h2>
              <p className={`text-[15px] leading-snug ${suave}`}>{bajada}</p>
            </div>

            {/* ── 1 · Qué trámite ── */}
            {paso === "tipo" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="group" aria-label="Tipo de trámite">
                  {tipos.map((tp) => {
                    const ui = TIPO_UI[tp.id] || TIPO_UI.OTRO;
                    const Icono = ui.icono;
                    const on = tipo === tp.id;
                    return (
                      <button
                        key={tp.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => elegirTipo(tp.id)}
                        className={`relative flex flex-col items-start gap-2.5 rounded-2xl p-3.5 min-h-[112px] text-left transition-colors ${
                          on
                            ? "border border-duo-violeta ring-1 ring-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)]"
                            : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark"
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${on ? "bg-duo-violeta text-white" : TONOS[ui.tono || "neutro"]}`}>
                          <Icono className="w-[22px] h-[22px]" aria-hidden="true" />
                        </span>
                        <span className="flex flex-col gap-0.5 min-w-0">
                          <strong className="text-[15px] leading-tight text-titulo dark:text-titulo-dark">{ui.titulo || tp.nombre}</strong>
                          <span className={`text-[13px] leading-snug ${suave}`}>{ui.pista || ""}</span>
                        </span>
                        {on && (
                          <span className="absolute top-2.5 right-2.5">
                            <Tilde on />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {tipo === "OTRO" && (
                  <label className={labelCls}>
                    ¿Qué trámite es?
                    <input
                      value={detalle}
                      maxLength={120}
                      onChange={(e) => {
                        setDetalle(e.target.value);
                        setError("");
                      }}
                      onKeyDown={enterSigue}
                      placeholder="Ej: informe de multas de CABA"
                      className={inputCls}
                      autoFocus
                    />
                  </label>
                )}
              </div>
            )}

            {/* ── 2 · Cliente ── */}
            {paso === "cliente" && !manualEf && (
              <div className="flex flex-col gap-3">
                {sel ? (
                  <>
                    <div className="flex items-center gap-3 rounded-2xl border border-duo-violeta ring-1 ring-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] px-3.5 py-3">
                      <Tilde on />
                      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <strong className="text-[16px] text-titulo dark:text-titulo-dark">{sel.nombre || "Sin nombre"}</strong>
                        <span className={`text-[13px] ${suave}`}>
                          <DniTel dni={sel.dni} tel={pideTel ? "" : sel.telefono} vacio={pideTel ? "" : "Sin DNI ni teléfono"} />
                          {pideTel ? <span className="whitespace-nowrap">{sel.dni ? " · " : ""}Sin teléfono</span> : null}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSel(null);
                          setQ("");
                        }}
                        className="shrink-0 min-h-[40px] rounded-lg border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-3 text-[14px] font-bold text-titulo dark:text-titulo-dark"
                      >
                        Cambiar
                      </button>
                    </div>
                    {/* 📞 No tiene teléfono: se lo pedís y queda en su ficha */}
                    {pideTel && (
                      <div className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark p-3.5">
                        <Aviso tono="amarillo" icono={HiExclamation}>
                          No tiene teléfono cargado. Pedíselo: queda guardado en su ficha de cliente.
                        </Aviso>
                        <label className={labelCls}>
                          Teléfono (celular)
                          <input
                            type="tel"
                            inputMode="tel"
                            value={telNuevo}
                            maxLength={20}
                            onChange={(e) => {
                              setTelNuevo(e.target.value);
                              setError("");
                            }}
                            onKeyDown={enterSigue}
                            placeholder="Ej: 11 5555-0000"
                            autoComplete="off"
                            className={inputCls}
                            autoFocus
                          />
                        </label>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <label className="relative block">
                      <span className="sr-only">Buscar cliente</span>
                      <HiSearch className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${suave}`} aria-hidden="true" />
                      <input
                        type="search"
                        value={q}
                        onChange={(e) => {
                          setQ(e.target.value);
                          setError("");
                        }}
                        placeholder="Patente, DNI o nombre"
                        enterKeyHint="search"
                        autoComplete="off"
                        className={`${inputCls} pl-12`}
                        autoFocus
                      />
                    </label>
                    {qLargo &&
                      (buscando && !resultadosVista.length ? (
                        <p className={`text-[14px] ${suave}`}>Buscando…</p>
                      ) : resultadosVista.length ? (
                        <div className="flex flex-col gap-2">
                          <span className={`text-[13px] font-semibold ${suave}`}>
                            {resultadosVista.length} encontrado{resultadosVista.length > 1 ? "s" : ""}
                          </span>
                          {resultadosVista.map((r) => {
                            const n = r.vehiculos.length;
                            const uno = n === 1 ? r.vehiculos[0] : null;
                            return (
                              <Opcion key={r.cliente || `${r.nombre}-${r.dni}`} on={false} conTilde={false} onClick={() => elegirCliente(r)}>
                                <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                                  <strong className="text-[16px] text-titulo dark:text-titulo-dark">{r.nombre || "Sin nombre"}</strong>
                                  <span className={`text-[13px] ${suave}`}>
                                    <DniTel dni={r.dni} tel={telOk(r.telefono) ? r.telefono : ""} />
                                  </span>
                                </span>
                                {conVehiculo &&
                                  (uno ? (
                                    <span className="flex flex-col items-end gap-0.5 shrink-0 max-w-[45%] text-right">
                                      <span className={`text-[13px] truncate max-w-full ${suave}`}>{uno.vehiculo}</span>
                                      <strong className="font-mono text-[14px] tracking-wide text-titulo dark:text-titulo-dark">{uno.patente}</strong>
                                    </span>
                                  ) : (
                                    <span className={`shrink-0 max-w-[45%] text-right text-[13px] ${suave}`}>
                                      {n ? `${n} vehículos` : "Sin vehículos en THAMES"}
                                    </span>
                                  ))}
                              </Opcion>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={`text-[14px] ${suave}`}>No encontré a nadie con «{q.trim()}».</p>
                      ))}
                    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-linea dark:border-linea-dark p-3.5">
                      <span className={`text-[14px] ${suave}`}>¿No lo encontrás?</span>
                      <BotonGrande
                        variant="blanco"
                        onClick={() => {
                          setManual(true);
                          setError("");
                        }}
                      >
                        <HiUserAdd className="w-5 h-5" aria-hidden="true" /> Es alguien nuevo
                      </BotonGrande>
                    </div>
                  </>
                )}
              </div>
            )}
            {paso === "cliente" && manualEf && (
              <div className="flex flex-col gap-4">
                <label className={labelCls}>
                  Nombre y apellido
                  <input
                    value={m.nombre}
                    maxLength={150}
                    onChange={(e) => {
                      setM({ ...m, nombre: e.target.value });
                      setError("");
                    }}
                    onKeyDown={enterSigue}
                    autoComplete="off"
                    autoCapitalize="words"
                    className={inputCls}
                    autoFocus
                  />
                </label>
                <label className={labelCls}>
                  <span>
                    DNI <span className={`font-normal ${suave}`}>(opcional)</span>
                  </span>
                  <input
                    inputMode="numeric"
                    value={m.dni}
                    maxLength={20}
                    onChange={(e) => setM({ ...m, dni: e.target.value })}
                    onKeyDown={enterSigue}
                    autoComplete="off"
                    className={inputCls}
                  />
                </label>
                <label className={labelCls}>
                  <span>
                    Teléfono (celular) <span className={`font-normal ${suave}`}>(opcional)</span>
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={m.tel}
                    maxLength={32}
                    onChange={(e) => setM({ ...m, tel: e.target.value })}
                    onKeyDown={enterSigue}
                    autoComplete="off"
                    className={inputCls}
                  />
                </label>
                <Aviso>
                  {conVehiculo ? "El vehículo lo cargás en el paso que sigue." : "La licencia es de la persona: no hace falta patente."}
                </Aviso>
                {!esGestor && (
                  <button
                    type="button"
                    onClick={() => {
                      setManual(false);
                      setError("");
                    }}
                    className="self-start min-h-[44px] text-[15px] font-bold text-duo-violeta hover:underline"
                  >
                    ← Buscar entre los clientes
                  </button>
                )}
              </div>
            )}

            {/* ── 2b · 🚗 Vehículo: uno de THAMES u «Otro vehículo» ── */}
            {paso === "vehiculo" && (
              <div className="flex flex-col gap-2.5">
                {autosThames.map((a) => {
                  const on = !otroAuto && vehSel?.poliza === a.poliza;
                  return (
                    <Opcion
                      key={a.poliza}
                      on={on}
                      onClick={() => {
                        setVehSel(a);
                        setOtroAuto(false);
                        setError("");
                      }}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? "bg-duo-violeta text-white" : TONOS.neutro}`}>
                        <HiTruck className="w-[22px] h-[22px]" aria-hidden="true" />
                      </span>
                      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <strong className="text-[16px] text-titulo dark:text-titulo-dark break-words">
                          {a.vehiculo || "Vehículo"}
                          {a.anio ? ` ${a.anio}` : ""}
                        </strong>
                        <span className={`text-[13px] ${suave}`}>
                          <strong className="font-mono tracking-wide text-titulo dark:text-titulo-dark">{a.patente || "Sin patente"}</strong>
                          {a.poliza_label ? ` · Póliza ${a.poliza_label}` : ""}
                        </span>
                      </span>
                    </Opcion>
                  );
                })}
                {autosThames.length > 0 && (
                  <Opcion
                    on={otroAuto}
                    onClick={() => {
                      setOtroAuto(true);
                      setError("");
                    }}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${otroAuto ? "bg-duo-violeta text-white" : TONOS.neutro}`}>
                      <HiPlus className="w-[22px] h-[22px]" aria-hidden="true" />
                    </span>
                    <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <strong className="text-[16px] text-titulo dark:text-titulo-dark">Otro vehículo</strong>
                      <span className={`text-[13px] ${suave}`}>No está en THAMES (ej: uno que ya vendió)</span>
                    </span>
                  </Opcion>
                )}
                {otroEf && (
                  <div
                    className={`grid grid-cols-2 gap-3 ${
                      autosThames.length ? "mt-1 rounded-2xl border border-linea dark:border-linea-dark p-3.5" : ""
                    }`}
                  >
                    <label className={labelCls}>
                      Patente
                      <input
                        value={v.patente}
                        maxLength={10}
                        onChange={(e) => {
                          setV({ ...v, patente: e.target.value.toUpperCase() });
                          setError("");
                        }}
                        onKeyDown={enterSigue}
                        placeholder="AB123CD"
                        autoComplete="off"
                        autoCapitalize="characters"
                        className={`${inputCls} font-mono tracking-wide`}
                        autoFocus
                      />
                    </label>
                    <label className={labelCls}>
                      Año
                      <input
                        inputMode="numeric"
                        value={v.anio}
                        maxLength={4}
                        onChange={(e) => {
                          setV({ ...v, anio: e.target.value.replace(/\D/g, "") });
                          setError("");
                        }}
                        onKeyDown={enterSigue}
                        placeholder="Ej: 2015"
                        autoComplete="off"
                        className={inputCls}
                      />
                    </label>
                    <label className={labelCls}>
                      Marca
                      <input
                        value={v.marca}
                        maxLength={50}
                        onChange={(e) => {
                          setV({ ...v, marca: e.target.value });
                          setError("");
                        }}
                        onKeyDown={enterSigue}
                        placeholder="Ej: Fiat"
                        autoComplete="off"
                        autoCapitalize="words"
                        className={inputCls}
                      />
                    </label>
                    <label className={labelCls}>
                      Modelo
                      <input
                        value={v.modelo}
                        maxLength={60}
                        onChange={(e) => {
                          setV({ ...v, modelo: e.target.value });
                          setError("");
                        }}
                        onKeyDown={enterSigue}
                        placeholder="Ej: Duna"
                        autoComplete="off"
                        autoCapitalize="words"
                        className={inputCls}
                      />
                    </label>
                    <p className={`col-span-2 text-[13px] leading-snug ${suave}`}>
                      Con la patente alcanza. Si no la sabe, poné la marca y el modelo: la patente se agrega después, desde el trámite.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── 3 · Papeles y fotos ── */}
            {paso === "papeles" && (
              <div className="flex flex-col gap-4">
                {papeles.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[14px] font-semibold ${suave}`}>{cliNombre}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold ${
                        papelesOk === papeles.length ? TONOS.verde : TONOS.neutro
                      }`}
                    >
                      {papelesOk} de {papeles.length}
                    </span>
                  </div>
                )}
                <ul className="flex flex-col gap-2">
                  {papeles.map((p, idx) => (
                    <li key={`${p.nombre}-${idx}`} className="flex gap-2">
                      <button
                        type="button"
                        aria-pressed={p.ok}
                        onClick={() => tocarPapel(idx)}
                        className={`flex-1 min-w-0 flex items-center gap-3 rounded-xl px-3.5 min-h-[52px] text-left text-[15px] text-titulo dark:text-titulo-dark transition-colors ${
                          p.ok
                            ? "border border-duo-verde/50 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]"
                            : "border border-linea dark:border-linea-dark bg-card dark:bg-card-dark hover:bg-surface dark:hover:bg-surface-dark"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            p.ok ? "bg-duo-verde text-white" : "border-2 border-slate-300 dark:border-slate-600"
                          }`}
                          aria-hidden="true"
                        >
                          {p.ok && <HiCheck className="w-3.5 h-3.5" />}
                        </span>
                        <span className="flex-1 min-w-0 break-words">{p.nombre}</span>
                        {!p.ok && <span className={`shrink-0 text-[12px] ${suave}`}>falta</span>}
                      </button>
                      {p.propio && (
                        <button
                          type="button"
                          onClick={() => sacarPapel(idx)}
                          aria-label={`Sacar «${p.nombre}» de la lista`}
                          className={`w-[52px] shrink-0 rounded-xl border border-linea dark:border-linea-dark flex items-center justify-center hover:text-duo-rojo ${suave}`}
                        >
                          <HiX className="w-5 h-5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <form onSubmit={agregarPapel} className="flex gap-2">
                  <input
                    value={papelNuevo}
                    maxLength={120}
                    onChange={(e) => setPapelNuevo(e.target.value)}
                    placeholder="Agregar otro papel"
                    aria-label="Agregar otro papel"
                    className={`${inputCls} flex-1 min-w-0`}
                  />
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center gap-1.5 min-h-[52px] rounded-xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 text-[15px] font-bold text-titulo dark:text-titulo-dark hover:bg-surface dark:hover:bg-surface-dark"
                  >
                    <HiPlus className="w-5 h-5" aria-hidden="true" /> Agregar
                  </button>
                </form>

                <div className="flex flex-col gap-3 border-t border-linea dark:border-linea-dark pt-4">
                  <span className="text-[16px] font-bold text-titulo dark:text-titulo-dark">
                    Fotos de los papeles <span className={`text-[14px] font-normal ${suave}`}>(opcional)</span>
                  </span>
                  {fotos.length > 0 && (
                    <ul className="flex flex-wrap gap-3 pt-2">
                      {fotos.map((f) => (
                        <MiniFoto key={f.id} f={f} onSacar={() => sacarFoto(f)} />
                      ))}
                    </ul>
                  )}
                  {fotos.length < MAX_FOTOS && (
                    <label className="flex items-center justify-center gap-2 min-h-[54px] rounded-xl border-2 border-dashed border-duo-violeta/50 px-4 text-[16px] font-bold text-duo-violeta dark:text-[#a5a0ff] cursor-pointer hover:bg-duo-violeta-soft dark:hover:bg-[var(--color-duo-violeta-soft-dark)] focus-within:ring-2 focus-within:ring-duo-violeta/40">
                      <HiCamera className="w-6 h-6" aria-hidden="true" />
                      {fotos.length ? "Sumar otra foto" : "Sacar foto o subir archivo"}
                      <input type="file" accept="image/*,application/pdf" multiple className="sr-only" onChange={elegirFotos} />
                    </label>
                  )}
                  <span className={`text-[13px] ${suave}`}>
                    {subiendoN ? `Subiendo ${subiendoN} archivo${subiendoN > 1 ? "s" : ""}…` : "Quedan guardadas en el trámite. También se pueden subir después."}
                  </span>
                </div>
              </div>
            )}

            {/* ── 4 · Gestor ── */}
            {paso === "gestor" && (
              <div className="flex flex-col gap-2.5">
                {gestoresOrden.map((g) => {
                  const on = String(gestorElegido) === String(g.id);
                  return (
                    <Opcion
                      key={g.id}
                      on={on}
                      onClick={() => {
                        setGestorId(g.id);
                        setError("");
                      }}
                    >
                      <Avatar id={g.id} nombre={g.nombre} size={44} foto={g.foto_url} />
                      <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <strong className="text-[16px] text-titulo dark:text-titulo-dark">{g.nombre}</strong>
                          {g.id === masRapido && g.promedio_dias != null && activos.length > 1 && (
                            <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${TONOS.verde}`}>El más rápido</span>
                          )}
                        </span>
                        <span className={`text-[13px] ${suave}`}>
                          {g.abiertos ?? 0} abierto{g.abiertos === 1 ? "" : "s"}
                          {g.demorados ? (
                            <>
                              {" · "}
                              <strong className="whitespace-nowrap text-duo-rojo">
                                {g.demorados} demorado{g.demorados > 1 ? "s" : ""}
                              </strong>
                            </>
                          ) : null}
                          {g.promedio_dias != null ? (
                            <>
                              {" · "}
                              <span className="whitespace-nowrap">tarda {String(g.promedio_dias).replace(".", ",")} días</span>
                            </>
                          ) : null}
                        </span>
                      </span>
                    </Opcion>
                  );
                })}
                {!activos.length && <Aviso>Todavía no hay gestores cargados.</Aviso>}
                <Opcion on={!gestorElegido} onClick={() => setGestorId("")}>
                  <Avatar id={null} size={44} />
                  <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <strong className="text-[16px] text-titulo dark:text-titulo-dark">Todavía sin gestor</strong>
                    <span className={`text-[13px] ${suave}`}>Queda en «Recibido» y lo asignás después</span>
                  </span>
                </Opcion>
              </div>
            )}

            {/* ── 5 · Dónde lo retira ── */}
            {paso === "oficina" && (
              <div className="flex flex-col gap-2.5">
                {oficinas.map((o) => {
                  const on = String(oficinaSel) === String(o.id);
                  const suya = esAdmin && String(catalogo.mi_oficina) === String(o.id);
                  return (
                    <Opcion
                      key={o.id}
                      on={on}
                      onClick={() => {
                        setOficina(String(o.id));
                        setError("");
                      }}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? "bg-duo-violeta text-white" : TONOS.neutro}`}>
                        <HiOfficeBuilding className="w-[22px] h-[22px]" aria-hidden="true" />
                      </span>
                      <span className="flex flex-col flex-1 min-w-0">
                        <strong className="text-[17px] text-titulo dark:text-titulo-dark">{o.nombre}</strong>
                        {suya && <span className={`text-[13px] ${suave}`}>Tu oficina</span>}
                      </span>
                    </Opcion>
                  );
                })}
                {!oficinas.length && <Aviso tono="amarillo">No hay oficinas cargadas. Avisale a THAMES.</Aviso>}
              </div>
            )}

            {/* ── 6 · Revisar y cargar ── */}
            {paso === "revisar" && (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-linea dark:border-linea-dark px-4">
                  <FilaResumen label="Trámite" valor={tipoNombre} onCambiar={() => cambiar("tipo")} />
                  <FilaResumen
                    label="Cliente"
                    valor={cliNombre}
                    sub={
                      <>
                        <DniTel dni={cliDni} tel={tel} vacio="Sin DNI ni teléfono" />
                        {pideTel ? " · se guarda en su ficha" : ""}
                      </>
                    }
                    onCambiar={() => cambiar("cliente")}
                  />
                  {conVehiculo && (
                    <FilaResumen
                      label="Vehículo"
                      valor={
                        auto ? (
                          <>
                            {auto.vehiculo} <span className="font-mono tracking-wide">{auto.patente}</span>
                          </>
                        ) : (
                          "Falta elegir"
                        )
                      }
                      sub={[autoSub, auto && !auto.patente ? "Sin patente: se agrega después, desde el trámite." : ""].filter(Boolean).join(" · ")}
                      onCambiar={() => cambiar("vehiculo")}
                    />
                  )}
                  <FilaResumen
                    label="Papeles"
                    valor={papelesTxt || "Sin papeles en la lista"}
                    sub={faltan.length ? `Faltan: ${faltan.join(", ")}.` : papeles.length ? "Trajo todo." : ""}
                    onCambiar={() => cambiar("papeles")}
                  />
                  {!esGestor && (
                    <FilaResumen
                      label="Gestor"
                      valor={gSel ? gSel.nombre : "Todavía sin gestor"}
                      sub={gSel ? "" : "Queda en «Recibido»."}
                      onCambiar={() => cambiar("gestor")}
                    />
                  )}
                  <FilaResumen
                    label="Lo retira en"
                    valor={retiraEn ? `THAMES ${retiraEn}` : "—"}
                    sub={eligeOficina ? "" : "Tu oficina."}
                    onCambiar={eligeOficina ? () => cambiar("oficina") : null}
                  />
                </div>

                {tipo !== "OTRO" && (
                  <label className={labelCls}>
                    <span>
                      Aclaración <span className={`font-normal ${suave}`}>(opcional)</span>
                    </span>
                    <input
                      value={detalle}
                      maxLength={120}
                      onChange={(e) => setDetalle(e.target.value)}
                      placeholder={EJEMPLO[tipo] || "Ej: lo necesita para el viernes"}
                      className={inputCls}
                    />
                  </label>
                )}

                {/* Plata (solo admin y con las comisiones prendidas) */}
                {conPlata && (
                  <div className="flex flex-col gap-3 rounded-2xl border border-linea dark:border-linea-dark p-4">
                    <span className="inline-flex flex-wrap items-center gap-2 text-[16px] font-bold text-titulo dark:text-titulo-dark">
                      Plata <span className={`text-[13px] font-normal ${suave}`}>(la cobra la gestoría)</span> <Candado />
                    </span>
                    <p className={`text-[14px] ${suave}`}>
                      El cliente le paga directo a la gestoría. El precio lo carga el gestor y tu comisión se calcula sola con el % de esa gestoría.
                    </p>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface dark:bg-surface-dark px-3.5 py-3 text-[14px] text-titulo dark:text-titulo-dark">
                      <span>{gSel ? `Comisión de ${gSel.nombre}` : "Comisión"}</span>
                      <strong className="whitespace-nowrap">{gSel ? (pctSel > 0 ? `${fmtPct(pctSel)} del precio` : "No paga") : "Se ve al elegir gestor"}</strong>
                    </div>
                    <label className={labelCls}>
                      ¿Ya sabés el precio? (opcional)
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        inputMode="numeric"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        placeholder="Si no, lo carga el gestor"
                        className={inputCls}
                      />
                    </label>
                    <span className={`text-[13px] ${suave}`}>{calc}</span>
                  </div>
                )}

                {/* Aviso al cliente (solo si está prendido) */}
                {avisoCliente && !esGestor && (
                  <div className="flex flex-col gap-2 rounded-2xl border border-linea dark:border-linea-dark p-4">
                    <span className="text-[16px] font-bold text-titulo dark:text-titulo-dark">Aviso al cliente</span>
                    {waAuto ? (
                      <>
                        <label className="inline-flex items-center gap-3 min-h-[44px] text-[15px] text-titulo dark:text-titulo-dark cursor-pointer">
                          <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} className="w-5 h-5" />
                          Mandarle WhatsApp con el link para seguir el trámite
                        </label>
                        <span className={`text-[13px] ${suave}`}>{tel ? `A: ${tel}` : "No tiene teléfono cargado."}</span>
                      </>
                    ) : (
                      <span className="text-[14px] text-titulo dark:text-titulo-dark">
                        Al cargarlo, en el trámite te aparece <strong>«Mandar por WhatsApp»</strong>: se abre el chat del cliente con el link ya escrito y lo mandás vos.
                        {tel ? ` Va a: ${tel}.` : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-duo-rojo/40 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] px-3.5 py-3 text-[14px] font-semibold text-duo-rojo dark:text-red-200"
              >
                {error}
              </p>
            )}

            {/* Atrás · Siguiente */}
            <div className="flex gap-3 border-t border-linea dark:border-linea-dark pt-4">
              <BotonGrande variant="blanco" onClick={atras} disabled={guardando} className="px-4 sm:px-5">
                {i > 0 ? "Atrás" : "Cancelar"}
              </BotonGrande>
              {paso === "revisar" ? (
                <BotonGrande variant="verde" onClick={cargar} disabled={guardando || subiendoN > 0} className="flex-1">
                  {guardando ? "Cargando…" : subiendoN ? "Subiendo fotos…" : "Cargar trámite"}
                  {!guardando && !subiendoN && <HiCheck className="w-5 h-5" aria-hidden="true" />}
                </BotonGrande>
              ) : (
                <BotonGrande onClick={principal} className="flex-1">
                  {desdeRevisar ? "Volver a revisar" : "Siguiente"}
                  <HiArrowRight className="w-5 h-5" aria-hidden="true" />
                </BotonGrande>
              )}
            </div>
          </div>
        </section>

        {/* 💻 Lo que vas cargando (derecha) */}
        <aside className="hidden lg:flex flex-col gap-3.5 rounded-2xl border border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-4 shadow-sm">
          <span className={`text-[12px] font-bold tracking-wide ${suave}`}>LO QUE VAS CARGANDO</span>
          <ResumenDato label="Trámite" valor={tipoNombre} />
          <ResumenDato label="Cliente" valor={cliNombre} sub={cliSub} />
          {conVehiculo && <ResumenDato label="Vehículo" valor={autoTxt} sub={autoSub} />}
          <ResumenDato label="Papeles" valor={papelesTxt} />
          {!esGestor && <ResumenDato label="Gestor" valor={gSel ? gSel.nombre : "Todavía sin gestor"} />}
          <ResumenDato label="Lo retira en" valor={retiraEn ? `THAMES ${retiraEn}` : ""} />
        </aside>
      </div>
    </div>
  );
}
