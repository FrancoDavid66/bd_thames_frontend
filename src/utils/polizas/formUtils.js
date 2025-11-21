import { formatearFechaParaBackend } from './dateUtils';

/**
 * Formatea fechas y limpia campos derivados ANTES de enviar al backend.
 *
 * - Convierte `fecha_emision` y `primer_pago` al formato esperado por el backend.
 * - Si no hay `primer_pago`, lo iguala a `fecha_emision` (compatibilidad).
 * - NO envía `fecha_vencimiento` ni `cantidad_cuotas` (los calcula el backend).
 * - Llama a `onSubmit(payload, e)` para integrarse con usePolizaForm.
 *
 * @param {Object} formData  Datos originales del formulario.
 * @param {Function} onSubmit Función de submit (por ejemplo, handleSubmit del hook).
 * @param {Event} e          Evento del formulario (si existe).
 */
export function formatearYEnviarPoliza(formData, onSubmit, e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const fechaEmision = formatearFechaParaBackend(formData.fecha_emision);
  let primerPago = formatearFechaParaBackend(formData.primer_pago);

  // Compat: si no hay primer_pago, lo igualamos a fecha_emision
  if (!primerPago) primerPago = fechaEmision;

  const formateado = {
    ...formData,
    fecha_emision: fechaEmision,
    primer_pago: primerPago,
  };

  // Nunca enviar derivados que define el backend
  delete formateado.fecha_vencimiento;
  delete formateado.cantidad_cuotas;

  // Delegamos el resto de validaciones/formateos al hook
  onSubmit(formateado, e);
}
