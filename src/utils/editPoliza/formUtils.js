import { formatearFechaParaBackend } from './dateUtils';

/**
 * Transforma las fechas del formData antes de enviar la edición de póliza.
 * 
 * @param {Object} formData - Datos del formulario de edición
 * @returns {Object} - Nuevo objeto con fechas en formato YYYY-MM-DD
 */
export function formatearYEnviarEdicionPoliza(formData) {
  return {
    ...formData,
    primer_pago: formatearFechaParaBackend(formData.primer_pago),
    fecha_emision: formatearFechaParaBackend(formData.fecha_emision),
    fecha_vencimiento: formatearFechaParaBackend(formData.fecha_vencimiento),
  };
}
