// Tipos de documentos de la solicitud
export const DOC_TYPES = [
  { key: 'DNI_FRENTE', label: 'DNI (frente)', accept: '.jpg,.jpeg,.png,.pdf' },
  { key: 'DNI_DORSO', label: 'DNI (dorso)', accept: '.jpg,.jpeg,.png,.pdf' },
  { key: 'REGISTRO', label: 'Registro', accept: '.jpg,.jpeg,.png,.pdf' },
  { key: 'CEDULA_VERDE', label: 'Cédula verde', accept: '.jpg,.jpeg,.png,.pdf' },
  { key: 'TITULO', label: 'Título', accept: '.jpg,.jpeg,.png,.pdf' },
  { key: 'VTV', label: 'VTV', accept: '.jpg,.jpeg,.png,.pdf', requiereVencimiento: true },
  { key: 'OBLEA_GNC', label: 'Oblea GNC', accept: '.jpg,.jpeg,.png,.pdf', requiereVencimiento: true },
  { key: 'PATENTE', label: 'Patente', accept: '.jpg,.jpeg,.png,.pdf' },
  { key: 'FRENTE', label: 'Frente vehículo', accept: '.jpg,.jpeg,.png' },
  { key: 'LATERAL_IZQ', label: 'Lateral izq.', accept: '.jpg,.jpeg,.png' },
  { key: 'LATERAL_DER', label: 'Lateral der.', accept: '.jpg,.jpeg,.png' },
  { key: 'TRASERA', label: 'Trasera', accept: '.jpg,.jpeg,.png' },
  { key: 'VIN', label: 'VIN', accept: '.jpg,.jpeg,.png' },
  { key: 'OTRO', label: 'Otro', accept: '.jpg,.jpeg,.png,.pdf' },
];

export const estadoBadgeClass = (estado) => {
  const m = {
    BORRADOR: 'bg-white/10 text-white',
    EN_REVISION: 'bg-blue-500/20 text-blue-100',
    VIGENTE_24H: 'bg-amber-500/20 text-amber-100',
    CONVERTIDA: 'bg-emerald-500/20 text-emerald-100',
    VENCIDA: 'bg-rose-500/20 text-rose-100',
    CANCELADA: 'bg-zinc-500/20 text-zinc-100',
  };
  return m[estado] || 'bg-white/10 text-white';
};
