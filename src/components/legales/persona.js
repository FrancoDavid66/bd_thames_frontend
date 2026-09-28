// src/components/legales/persona.js
//
// 👤 Ayudas de "¿Quién es el cliente?" (las usa BuscarPersona, Cargar una
// denuncia y Pedir turno).
//   valor = { q, buscado, cliente: {...} | null, nombre, apellido, dni, telefono,
//             telOk: true | false | null, casosSinCliente: [] }

export const PERSONA_VACIA = { q: "", buscado: false, cliente: null, nombre: "", apellido: "", dni: "", telefono: "", telOk: null, casosSinCliente: [] };

/** ¿Ya se puede seguir? (cliente con el WhatsApp revisado, o nombre cargado a mano). */
export function personaLista(p) {
  if (!p) return false;
  if (p.cliente) return p.telOk === true || (p.telOk === false && p.telefono.trim().length >= 6);
  return p.buscado && p.nombre.trim().length > 0;
}

/** El nombre para mostrar arriba: "Marcos Giménez". */
export function nombrePersona(p) {
  if (!p) return "";
  if (p.cliente) return `${p.cliente.nombre} ${p.cliente.apellido}`.trim();
  return `${p.nombre} ${p.apellido}`.trim();
}

/** El WhatsApp que va a quedar en el caso. */
export function telefonoPersona(p) {
  if (!p) return "";
  if (p.cliente && p.telOk !== false) return p.cliente.telefono || "";
  return p.telefono.trim();
}
