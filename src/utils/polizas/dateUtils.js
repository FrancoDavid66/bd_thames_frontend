export const convertirFechaArgAISO = (fecha) => {
  if (!fecha) return null;

  const fechaStr = typeof fecha === 'string' ? fecha : fecha.toString();

  // Ya está en formato ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;

  // Si viene en formato DD/MM/YYYY o DD-MM-YYYY
  const match = fechaStr.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (match) {
    const [_, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Si es un objeto Date o algo parseable
  const date = new Date(fecha);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
};


// Alias opcional para compatibilidad
export const formatearFechaParaBackend = convertirFechaArgAISO;
