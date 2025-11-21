// Importa logos desde src/assets/logos con los nombres que pasaste
// y expone un helper para resolver el logo por nombre de compañía.

import agrosaltaLogo from '../assets/logos/agrosalta_logo.jpeg';
import atmLogo from '../assets/logos/atm_logo.png';
import dignaLogo from '../assets/logos/digna_logo.png';
import equidadLogo from '../assets/logos/equidad_logo.jpg';
import federacionPatronalLogo from '../assets/logos/federacion_patronal_logo.png';
import nreLogo from '../assets/logos/nre_logo.png';
import providenciaLogo from '../assets/logos/providencia_logo.png';

// Normaliza: minúsculas, sin acentos, trim
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Mapa de claves normalizadas -> asset importado
const LOGOS = {
  'agrosalta': agrosaltaLogo,
  'atm': atmLogo,
  'digna': dignaLogo,
  'equidad': equidadLogo,
  'federacion patronal': federacionPatronalLogo, // sin acento
  'federación patronal': federacionPatronalLogo, // por si viene con acento
  'providencia': providenciaLogo,
  'nre': nreLogo,
};

/**
 * Devuelve la URL del logo según el nombre visible de la compañía.
 * Si no encuentra coincidencia, retorna null (tu caller puede mostrar placeholder).
 *
 * @param {string} nombre - p.ej. "Federacion Patronal" / "Federación Patronal"
 * @returns {string|null} - URL resuelta por Vite del asset importado
 */
export function getLogoUrlByCompany(nombre) {
  const key = norm(nombre);
  return LOGOS[key] || null;
}
