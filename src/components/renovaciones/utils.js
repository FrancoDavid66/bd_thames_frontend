// src/components/renovaciones/utils.js
//
// Helpers COMPARTIDOS de la bandeja de renovaciones.
// Antes estaban copiados en varios componentes (page, tabla, card…). Ahora viven
// acá una sola vez y cada componente los importa. Si hay que cambiar algo (ej.
// el formato de fecha), se cambia en UN solo lugar.

import dayjs from "dayjs";

/* ---------- Clases CSS ---------- */
// Junta clases ignorando las vacías/falsas. Ej: cx("a", cond && "b") -> "a b"
export const cx = (...a) => a.filter(Boolean).join(" ");

/* ---------- Fechas ---------- */

// Fecha de vencimiento de referencia de una póliza (cae en cascada por los
// distintos campos que puede tener según cómo vino del backend).
export function getVencimiento(p) {
  return (
    p?.ultima_cuota_vencimiento ||
    p?.vto_referencia ||
    p?.fecha_vencimiento ||
    p?.proxima_vencimiento_impaga ||
    null
  );
}

// Formato corto DD/MM/YY (para la tabla).
export function formatVto(v) {
  if (!v) return "—";
  try {
    return dayjs(v).format("DD/MM/YY");
  } catch {
    return String(v);
  }
}

// Formato largo DD/MM/YYYY (para tarjetas / detalle).
export function fmtDate(d) {
  if (!d) return "—";
  try {
    return dayjs(d).format("DD/MM/YYYY");
  } catch {
    return String(d);
  }
}

// "hace X min / ayer / hace N d / DD/MM" — texto relativo amable.
export function fmtRelative(d) {
  if (!d) return "—";
  try {
    const now = dayjs();
    const then = dayjs(d);
    const days = now.diff(then, "day");
    if (days === 0) {
      const hours = now.diff(then, "hour");
      if (hours <= 0) {
        const mins = Math.max(1, now.diff(then, "minute"));
        return `hace ${mins} min`;
      }
      return `hace ${hours} h`;
    }
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} d`;
    return then.format("DD/MM");
  } catch {
    return String(d);
  }
}

/* ---------- Cliente / póliza ---------- */

// "Apellido, Nombre" a partir del objeto cliente.
export function getNombreCompleto(cliente) {
  if (!cliente) return "—";
  const ap = cliente.apellido || "";
  const no = cliente.nombre || "";
  if (ap && no) return `${ap}, ${no}`;
  return ap || no || "—";
}

// Nombre de la compañía (soporta el modelo nuevo compania_nombre y el viejo).
export function getCompania(p) {
  return p?.compania_nombre || p?.compania || "—";
}

/* ---------- Situación de la póliza (etiqueta informativa) ---------- */

// 🏷️ Devuelve una etiqueta corta con la SITUACIÓN de la póliza, o null si es
// una póliza común y corriente. Se usa en el MODO BÚSQUEDA de Renovaciones:
// ahí no se oculta NINGUNA póliza, así que este chip avisa qué estás por tocar
// (ej: "Ya renovada", "Finalizada", "No renueva").
//
// Ejemplo fácil: es como el cartel de una góndola. No te esconde el producto,
// te avisa "última unidad" o "vencido" y vos decidís.
export function situacionPoliza(p) {
  if (!p) return null;

  const descartada = !!(
    p.renovacion_descartada ||
    p.no_renueva_manual ||
    p.motivo_no_renueva ||
    p.no_renueva
  );
  if (descartada) return { label: "No renueva", tono: "rojo" };

  if (p.tiene_renovacion) return { label: "Ya renovada", tono: "violeta" };

  const estado = String(p.estado || "").toLowerCase();
  if (estado === "finalizada") return { label: "Finalizada", tono: "neutro" };
  if (estado === "cancelada") return { label: "Cancelada", tono: "rojo" };
  if (estado === "vencida") return { label: "Vencida", tono: "rojo" };

  // Nació de una renovación y no tiene hija → es la vigente del cliente.
  const esHija = !!(p.es_renovacion || p.poliza_origen || p.poliza_origen_id);
  if (esHija) return { label: "Vigente", tono: "verde" };

  return null;
}

/* ---------- Dinero ---------- */

// Formatea a pesos argentinos. Devuelve null si no hay un número > 0
// (así el componente decide si muestra "—" o nada).
export function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  try {
    return num.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });
  } catch {
    return `$ ${num.toFixed(0)}`;
  }
}

/* ---------- Teléfono / WhatsApp ---------- */

// Deja solo dígitos y '+'.
export function cleanPhone(raw) {
  return String(raw || "").replace(/[^\d+]/g, "");
}

// Arma el link de WhatsApp (asume Argentina si no viene prefijo).
export function waUrl(phone, msg) {
  const p = cleanPhone(phone);
  if (!p) return null;
  const num = p.startsWith("+")
    ? p.slice(1)
    : p.startsWith("54")
    ? p
    : `54${p.replace(/^0/, "")}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg || "")}`;
}