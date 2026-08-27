// src/components/portal/utils.js
//
// Helpers del Portal del Asegurado. Viven acá para que cada componente no
// tenga su propia copia y se desincronicen: si mañana cambia el formato de
// plata o el redondeo del efectivo, se toca en un solo lugar.

import dayjs from "dayjs";

/* ══════════════════════════════════════════════════════════════════════
   💰 AJUSTES POR FORMA DE PAGO
   ══════════════════════════════════════════════════════════════════════
   · EFECTIVO en la oficina → DESCUENTO
   · TRANSFERENCIA a Thames → RECARGO (gastos bancarios)
   · El resto (Mercado Pago, Rapipago, banco) → sin cambios

   ⚠️ Cuando esto se configure desde el Admin, estos valores pasan a venir
      del backend. Por ahora viven acá para que se puedan cambiar en un
      solo lugar.                                                          */
export const DESCUENTO_EFECTIVO = 0.10;   // 10%
export const RECARGO_TRANSFERENCIA = 0.05; // 5%
export const REDONDEO_EFECTIVO = 1000;     // múltiplo

/* 🏢 EXCEPCIONES POR COMPAÑÍA
   ──────────────────────────
   Los valores de arriba son los normales. Acá van las compañías donde el
   número es distinto porque el negocio es distinto.

   ⚠️ ANTES ESTO NO EXISTÍA y el recargo se le aplicaba a TODOS por igual.
      A un cliente de NRE se le cobraba un 5% que la oficina no cobra:
      pagaba de más y el número del portal no coincidía con el del
      mostrador. Y al revés, si en alguna compañía el margen no da para el
      10%, ese descuento sale del bolsillo de la oficina.

   La clave se busca CONTENIDA en el nombre, igual que en FormasPago:
   "nre" matchea "NRE" y "NRE Seguros S.A.".

   Solo se escribe lo que cambia; lo que no está, hereda el valor normal. */
const AJUSTES_POR_COMPANIA = {
  // NRE no tiene recargo por transferencia: la oficina la recibe sin costo.
  // El descuento del 10% por efectivo sí se mantiene.
  nre: { recargo: 0 },
};

function _normCia(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Los ajustes que le tocan a esta compañía. */
export function ajustesDe(compania) {
  const base = {
    descuento: DESCUENTO_EFECTIVO,
    recargo: RECARGO_TRANSFERENCIA,
    redondeo: REDONDEO_EFECTIVO,
  };
  const c = _normCia(compania);
  if (!c) return base;
  for (const [clave, cambios] of Object.entries(AJUSTES_POR_COMPANIA)) {
    if (c.includes(clave)) return { ...base, ...cambios };
  }
  return base;
}

/**
 * 💵 Cuánto paga el cliente en efectivo, ya redondeado.
 *
 * Sin redondear quedaría "$148.484" y nadie tiene $484 en cambio.
 * Redondeado da $148.000: se arma con 14 billetes de $10.000 y 4 de $2.000,
 * sin buscar monedas ni dar vuelto.
 *
 * Va PARA ABAJO a propósito: el cliente paga un poco menos de lo que le
 * tocaba y lo siente como un plus, no como que le cobraron de más.
 *
 * ⚠️ Se calcula CUPÓN POR CUPÓN, nunca sobre el total. Así el número que ve
 *    en el portal es el mismo que paga en el mostrador, venga con un cupón
 *    o con los cuatro.
 */
export function montoEfectivo(monto, compania) {
  const { descuento, redondeo } = ajustesDe(compania);
  const n = Number(monto || 0);
  return Math.floor((n * (1 - descuento)) / redondeo) * redondeo;
}

/** Recargo en pesos por transferir. 0 en las compañías que no lo cobran. */
export function recargoTransferencia(monto, compania) {
  const { recargo } = ajustesDe(compania);
  return Math.round(Number(monto || 0) * recargo);
}

/* 🙈 COBERTURAS QUE NO MUESTRAN EL PRECIO EN EL PORTAL
   ────────────────────────────────────────────────────
   En algunas coberturas el importe que el cliente paga NO es el que dice el
   papel de la compañía: lo pone la oficina y se mueve seguido.

   NRE con cobertura A (responsabilidad civil) es el caso. Su frente de
   póliza trae un plan de pago —"20/08/2026  64.000,00"— pero ese es el
   precio de NRE, no el de Thames. Mostrarlo sería publicar un número que
   no coincide con el del mostrador.

   NRE con B1 (con robo) sí lo muestra: ahí el precio es el que se cobra.

   ⚠️ NO ES OCULTAR LA DEUDA. La cuota sigue apareciendo con su fecha y su
      estado — "vence el 20 de septiembre", "pagada". Lo único que no se
      muestra es el número, y en su lugar se invita a consultarlo.

      Un precio viejo en pantalla genera una discusión en el mostrador. Un
      "consultanos" genera un WhatsApp, que es lo que se quiere.

   Estructura: { clave_compania: [coberturas...] }. La clave y la cobertura
   se comparan en minúscula y sin acentos. */
const SIN_PRECIO_PUBLICO = {
  nre: ["a"],
};

/** ¿Se puede mostrar el importe de esta póliza en el portal? */
export function muestraPrecio(poliza) {
  const cia = _normCia(poliza?.compania);
  const cob = _normCia(poliza?.cobertura).trim();
  if (!cia || !cob) return true;
  for (const [clave, coberturas] of Object.entries(SIN_PRECIO_PUBLICO)) {
    if (cia.includes(clave) && coberturas.includes(cob)) return false;
  }
  return true;
}


/* ══════════════════════════ FORMATOS ══════════════════════════ */

/** $164.982 */
export function money(n) {
  return "$" + Math.round(Number(n || 0)).toLocaleString("es-AR");
}

/** 164.982 (sin el signo, para cuando el $ va aparte y más chico) */
export function num(n) {
  return Math.round(Number(n || 0)).toLocaleString("es-AR");
}

/** $21,5 millones — para la suma asegurada, que no entra en una caja chica */
export function corto(n) {
  const v = Number(n || 0);
  if (v >= 1000000) {
    return "$" + (v / 1000000).toFixed(1).replace(".", ",").replace(",0", "") + " millones";
  }
  return money(v);
}

/** 07/05/2026 */
export function fmt(d) {
  return d ? dayjs(d).format("DD/MM/YYYY") : "—";
}

/** "7 de mayo" — más natural que 07/05 para el cliente */
export function fmtLargo(d) {
  if (!d) return "—";
  const MESES = ["enero","febrero","marzo","abril","mayo","junio",
                 "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const f = dayjs(d);
  return `${f.date()} de ${MESES[f.month()]}`;
}

/* ══════════════════════════ ESTADOS ══════════════════════════ */

/**
 * Estado de un cupón: pagado / vencido / a pagar.
 * De acá salen el color del puntito y el texto del chip.
 */
export function estadoCupon(c) {
  if (c?.pagado || c?.estado === "PAGADA") return "pagado";
  // El cliente ya mandó el comprobante y la oficina todavía no lo confirmó.
  // Es importante mostrarlo distinto de "vencido": el cliente ya cumplió su
  // parte y si sigue viendo rojo cree que no llegó nada.
  if (c?.estado === "REPORTADO") return "revisando";
  if (c?.fecha_vencimiento && dayjs(c.fecha_vencimiento).isBefore(dayjs(), "day")) return "vencido";
  return "a_pagar";
}

/**
 * 💳 Situación de pago de una póliza.
 *
 * Devuelve lo más urgente y en qué estado está. De acá sale el color de la
 * tarjeta, el monto grande del header y el globito del menú.
 *
 *   vencido → ya pasó la fecha y no está pagado
 *   proximo → todavía no vence
 *   al_dia  → no queda nada por pagar
 */
export function situacionPago(p) {
  const cupones = p?.cupones_robo || [];
  const items = cupones.length
    ? cupones.map((c) => ({
        fecha: c.fecha_vencimiento,
        monto: c.monto || p?.precio_actual || 0,
        estado: estadoCupon(c),
      }))
    : (p?.cuotas || []).map((c) => ({
        fecha: c.fecha_vencimiento,
        monto: c.monto || 0,
        estado: c.pagado
          ? "pagado"
          : c.fecha_vencimiento && dayjs(c.fecha_vencimiento).isBefore(dayjs(), "day")
          ? "vencido"
          : "a_pagar",
      }));

  // Los que están en revisión NO cuentan como deuda: el cliente ya pagó y
  // mandó el comprobante. Si siguieran sumando, vería el mismo total de
  // antes y pensaría que no sirvió de nada.
  const impagos = items.filter(
    (i) => i.estado !== "pagado" && i.estado !== "revisando" && i.fecha
  );
  // 🙈 ¿Esta póliza muestra el importe? (ver muestraPrecio arriba)
  //    Se decide UNA vez acá y viaja con el resultado, así ningún render
  //    tiene que volver a preguntárselo — ni olvidarse de hacerlo.
  const sinPrecio = !muestraPrecio(p);
  if (!impagos.length) {
    return { estado: "al_dia", monto: 0, fecha: null, vencidos: 0, total: 0, sinPrecio };
  }

  impagos.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const vencidos = impagos.filter((i) => i.estado === "vencido");
  const foco = vencidos.length ? vencidos[0] : impagos[0];

  return {
    estado: vencidos.length ? "vencido" : "proximo",
    monto: Number(foco.monto || 0),
    fecha: foco.fecha,
    vencidos: vencidos.length,
    // Todo lo vencido junto, no solo el primero.
    total: vencidos.reduce((acc, i) => acc + Number(i.monto || 0), 0),
    sinPrecio,
  };
}

/** Cuántos pagos vencidos tiene en total (para el globito del menú). */
export function contarVencidos(polizas = []) {
  return polizas.reduce((acc, p) => acc + situacionPago(p).vencidos, 0);
}

/** Lo que debe en total (el número grande del header).
 *
 *  ⚠️ Las pólizas sin precio publicado NO suman. Su cuota vale lo que diga
 *     la oficina, y meter un número que no es el real haría que el total del
 *     header no cierre con la suma de las tarjetas de abajo.
 *
 *     Para saber si quedaron afuera, ver `hayDeudaSinPrecio`.
 */
export function deudaTotal(polizas = []) {
  return polizas.reduce((acc, p) => {
    const s = situacionPago(p);
    if (s.sinPrecio) return acc;
    return acc + (s.estado === "vencido" ? s.total : 0);
  }, 0);
}

/** ¿Hay algo por pagar cuyo importe no se puede mostrar?
 *
 *  Sirve para que el header no diga "no tenés pagos pendientes" cuando en
 *  realidad hay uno, solo que sin número. Callar el monto es una cosa;
 *  callar la deuda sería otra.
 */
export function hayDeudaSinPrecio(polizas = []) {
  return polizas.some((p) => {
    const s = situacionPago(p);
    return s.sinPrecio && s.estado !== "al_dia";
  });
}

/** El próximo pago que vence, cuando no hay nada vencido. */
export function proximoPago(polizas = []) {
  let mejor = null;
  polizas.forEach((p) => {
    const s = situacionPago(p);
    if (s.estado !== "proximo") return;
    if (!mejor || s.fecha < mejor.sit.fecha) mejor = { poliza: p, sit: s };
  });
  return mejor;
}

/* ══════════════════════════ TEXTOS ══════════════════════════ */

/** "Tu seguro" / "Tus seguros" — detalle chico, pero suena a persona. */
export function tituloSeguros(n) {
  return n === 1 ? "Tu seguro" : "Tus seguros";
}

/** Nombre legible del bien asegurado. */
export function nombreBien(p) {
  const t = `${p?.marca || ""} ${p?.modelo || ""}`.trim();
  return t || p?.cobertura || "Tu seguro";
}

/** Iniciales para el avatar. */
export function iniciales(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return partes.map((w) => w[0]).join("").toUpperCase() || "?";
}

/**
 * 🎨 Qué ícono le toca según el tipo de seguro.
 *
 * Hoy son todos autos, pero ya está listo para cuando sumes celulares, vida,
 * bicicletas o viajes: el mismo componente de tarjeta sirve para todos.
 */
export function tipoIcono(p) {
  const blob = `${p?.tipo || ""} ${p?.marca || ""} ${p?.modelo || ""} ${p?.cobertura || ""}`.toLowerCase();
  if (/moto|scooter|ciclomotor/.test(blob)) return "moto";
  if (/celular|telefono|teléfono|iphone|samsung|smartphone/.test(blob)) return "celular";
  if (/vida|sepelio|accidente personal/.test(blob)) return "vida";
  if (/bici/.test(blob)) return "bici";
  if (/hogar|casa|vivienda/.test(blob)) return "hogar";
  if (/viaje|asistencia al viajero/.test(blob)) return "viaje";
  if (/camion|camión/.test(blob)) return "camion";
  return "auto";
}

/** Link de WhatsApp con el mensaje ya escrito. */
export function waLink(numero, texto) {
  if (!numero) return null;
  const limpio = String(numero).replace(/\D/g, "");
  return `https://wa.me/${limpio}?text=${encodeURIComponent(texto || "")}`;
}

/* ══════════════════════════════════════════════════════════════════════
   💬 FORMATO DE WHATSAPP
   ══════════════════════════════════════════════════════════════════════
   WhatsApp entiende marcas en el texto:

     *negrita*        → resalta
     _cursiva_
     ~tachado~
     > cita           → bloque gris con una barra al costado

   La CITA es la más útil acá: mete los números en un bloque aparte que se
   lee de un vistazo, separado del resto del mensaje. Es lo que se ve en los
   mensajes de las casas de cambio cuando pasan una cotización.

   ⚠️ No abusar: si todo está en negrita, nada resalta.                   */

/** Marca una línea como cita (bloque gris con barra al costado). */
export function waCita(texto) {
  return String(texto || "").split("\n").map((l) => `> ${l}`).join("\n");
}

/** Pone en negrita. */
export function waFuerte(texto) {
  return `*${String(texto || "").trim()}*`;
}

/**
 * "JORGE RICARDO ROJAS" → "Jorge Ricardo Rojas"
 *
 * En la base los nombres se cargan en mayúsculas (es cómodo para el operador),
 * pero en el portal quedan gritando. Acá se normalizan solo para mostrar.
 */
export function capitalizar(txt) {
  return String(txt || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 2 && /^(de|la|el|y|del)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Solo el primer nombre: "Jorge Ricardo Rojas" → "Jorge" */
export function primerNombre(txt) {
  const c = capitalizar(txt);
  return c.split(" ")[0] || c;
}

/* ══════════════════════════════════════════════════════════════════════
   🔢 CONTADOR ANIMADO
   ══════════════════════════════════════════════════════════════════════
   El monto no arranca en cero: **arranca en el 99% y sube el último tramo**.

   Por qué así y no desde 0: contar desde cero hace que el cliente vea
   números que NO son los suyos durante casi un segundo. En un portal donde
   lo que se muestra es plata que debe, eso confunde. Arrancando en 90% lee
   el número correcto de una, y el movimiento es solo un remate.

   · Curva `easeOutCubic`: sale con impulso y frena suave sobre el final.
   · Salta directo al valor si el usuario pidió reducir movimiento.
   · Se corta solo si el componente se desmonta a mitad de camino.        */

import { useEffect, useRef, useState } from "react";

export function useContador(valor, duracion = 1300, desdePct = 0.99) {
  const objetivo = Number(valor || 0);
  const [n, setN] = useState(objetivo * desdePct);
  const previo = useRef(null);

  useEffect(() => {
    const quieto =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (quieto || !objetivo) {
      setN(objetivo);
      previo.current = objetivo;
      return;
    }

    // La primera vez arranca en el 90%. Si el monto CAMBIA después (el
    // cliente pagó, se filtró la lista), arranca desde el valor anterior:
    // así se ve de dónde salió y hacia dónde va.
    const arranca = previo.current === null ? objetivo * desdePct : previo.current;

    const inicio = performance.now();
    const delta = objetivo - arranca;
    let frame;

    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      // easeOutSine: la más pareja de todas. Sube casi a ritmo constante y
      // se acomoda al final sin frenadas bruscas. Con un recorrido tan corto
      // (1% del monto), cualquier curva más agresiva se ve como un salto.
      const e = Math.sin((t * Math.PI) / 2);
      setN(arranca + delta * e);
      if (t < 1) frame = requestAnimationFrame(paso);
      else previo.current = objetivo;
    };

    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [objetivo, duracion, desdePct]);

  return n;
}