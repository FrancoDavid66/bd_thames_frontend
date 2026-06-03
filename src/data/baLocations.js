// src/data/baLocations.js
// ────────────────────────────────────────────────────────────────────────
// Datos geográficos para los desplegables de Partido / Localidad.
//
// - PARTIDOS: lista fija (CABA + los 135 partidos de la Provincia de Bs. As.).
// - BARRIOS_CABA: los 48 barrios de la Ciudad (lista fija).
// - fetchLocalidadesPorPartido(): trae las localidades del partido elegido
//   desde la API oficial Georef (datos.gob.ar). Para CABA devuelve los barrios.
//
// Se hace "encadenado": primero se elige Partido y eso define las localidades.
// Las localidades NO se embeben (son miles); se piden a demanda a la fuente
// oficial, así siempre están actualizadas y la app queda liviana.
// ────────────────────────────────────────────────────────────────────────

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api";

// Valor especial para CABA (no es un partido, pero lo tratamos como uno)
export const CABA_VALUE = "CABA";

// 48 barrios de la Ciudad Autónoma de Buenos Aires
export const BARRIOS_CABA = [
  "Agronomía", "Almagro", "Balvanera", "Barracas", "Belgrano", "Boedo",
  "Caballito", "Chacarita", "Coghlan", "Colegiales", "Constitución",
  "Flores", "Floresta", "La Boca", "La Paternal", "Liniers", "Mataderos",
  "Monte Castro", "Montserrat", "Nueva Pompeya", "Núñez", "Palermo",
  "Parque Avellaneda", "Parque Chacabuco", "Parque Chas", "Parque Patricios",
  "Puerto Madero", "Recoleta", "Retiro", "Saavedra", "San Cristóbal",
  "San Nicolás", "San Telmo", "Vélez Sársfield", "Versalles", "Villa Crespo",
  "Villa del Parque", "Villa Devoto", "Villa General Mitre", "Villa Lugano",
  "Villa Luro", "Villa Ortúzar", "Villa Pueyrredón", "Villa Real",
  "Villa Riachuelo", "Villa Santa Rita", "Villa Soldati", "Villa Urquiza",
];

// 135 partidos de la Provincia de Buenos Aires
export const PARTIDOS_PBA = [
  "Adolfo Alsina", "Adolfo Gonzales Chaves", "Alberti", "Almirante Brown",
  "Arrecifes", "Avellaneda", "Ayacucho", "Azul", "Bahía Blanca", "Balcarce",
  "Baradero", "Benito Juárez", "Berazategui", "Berisso", "Bolívar", "Bragado",
  "Brandsen", "Campana", "Cañuelas", "Capitán Sarmiento", "Carlos Casares",
  "Carlos Tejedor", "Carmen de Areco", "Castelli", "Chacabuco", "Chascomús",
  "Chivilcoy", "Colón", "Coronel de Marina Leonardo Rosales", "Coronel Dorrego",
  "Coronel Pringles", "Coronel Suárez", "Daireaux", "Dolores", "Ensenada",
  "Escobar", "Esteban Echeverría", "Exaltación de la Cruz", "Ezeiza",
  "Florencio Varela", "Florentino Ameghino", "General Alvarado", "General Alvear",
  "General Arenales", "General Belgrano", "General Guido", "General Juan Madariaga",
  "General La Madrid", "General Las Heras", "General Lavalle", "General Paz",
  "General Pinto", "General Pueyrredón", "General Rodríguez", "General San Martín",
  "General Viamonte", "General Villegas", "Guaminí", "Hipólito Yrigoyen",
  "Hurlingham", "Ituzaingó", "José C. Paz", "Junín", "La Costa", "La Matanza",
  "La Plata", "Lanús", "Laprida", "Las Flores", "Leandro N. Alem", "Lezama",
  "Lincoln", "Lobería", "Lobos", "Lomas de Zamora", "Luján", "Magdalena",
  "Maipú", "Malvinas Argentinas", "Mar Chiquita", "Marcos Paz", "Mercedes",
  "Merlo", "Monte", "Monte Hermoso", "Moreno", "Morón", "Navarro", "Necochea",
  "Nueve de Julio", "Olavarría", "Patagones", "Pehuajó", "Pellegrini",
  "Pergamino", "Pila", "Pilar", "Pinamar", "Presidente Perón", "Puan",
  "Punta Indio", "Quilmes", "Ramallo", "Rauch", "Rivadavia", "Rojas",
  "Roque Pérez", "Saavedra", "Saladillo", "Salliqueló", "Salto",
  "San Andrés de Giles", "San Antonio de Areco", "San Cayetano", "San Fernando",
  "San Isidro", "San Miguel", "San Nicolás", "San Pedro", "San Vicente",
  "Suipacha", "Tandil", "Tapalqué", "Tigre", "Tordillo", "Tornquist",
  "Trenque Lauquen", "Tres Arroyos", "Tres de Febrero", "Tres Lomas",
  "Veinticinco de Mayo", "Vicente López", "Villa Gesell", "Villarino", "Zárate",
];

// Opciones para el <select> de Partido: CABA primero, luego los partidos PBA.
export const PARTIDOS = [
  { value: CABA_VALUE, label: "CABA (Ciudad de Buenos Aires)" },
  ...PARTIDOS_PBA.map((p) => ({ value: p, label: p })),
];

/**
 * Trae las localidades del partido elegido.
 * - CABA → devuelve los 48 barrios (fijos).
 * - Partido PBA → consulta la API oficial Georef.
 * Devuelve un array de strings (nombres de localidad), ordenado y sin repetidos.
 * Si la consulta falla, devuelve [] (el formulario habilita texto libre).
 */
export async function fetchLocalidadesPorPartido(partido) {
  const p = String(partido || "").trim();
  if (!p) return [];

  if (p === CABA_VALUE) {
    return [...BARRIOS_CABA];
  }

  const url =
    `${GEOREF_BASE}/localidades` +
    `?provincia=06&departamento=${encodeURIComponent(p)}` +
    `&campos=nombre&max=1000&orden=nombre`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const nombres = (data?.localidades || [])
      .map((l) => String(l?.nombre || "").trim())
      .filter(Boolean);
    // Únicos + ordenados alfabéticamente
    return Array.from(new Set(nombres)).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  } catch {
    return [];
  }
}