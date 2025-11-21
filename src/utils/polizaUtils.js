import { createPoliza } from '../store/slices/polizasSlice';
import toast from 'react-hot-toast';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Verifica si ya existe una póliza con el mismo número.
 * @param {string} numeroPoliza
 * @returns {Promise<boolean>}
 */
export const existeNumeroPoliza = async (numeroPoliza) => {
  try {
    const res = await axios.get(`${BASE_URL}polizas/`, {
      params: { search: numeroPoliza }
    });

    // Revisa si hay alguna coincidencia exacta
    return res.data.results.some((p) => p.numero_poliza === numeroPoliza);
  } catch (err) {
    console.error('❌ Error verificando número de póliza:', err);
    // Si falla, no bloqueamos la creación, solo informamos por consola
    return false;
  }
};

/**
 * Crea una póliza con el payload dado y muestra toast según el resultado.
 * @param {function} dispatch - Redux dispatch
 * @param {object} payload - Datos de la póliza
 * @param {function} onSuccess - Callback si la creación fue exitosa
 * @param {function} onClose - Callback para cerrar el modal
 */
export const crearPolizaConToast = async (dispatch, payload, onSuccess, onClose) => {
  const result = await dispatch(createPoliza(payload));

  if (createPoliza.fulfilled.match(result)) {
    toast.success('✅ Póliza creada correctamente');
    onClose?.();
    onSuccess?.();
  } else {
    const err = result.payload;
    if (err?.numero_poliza?.[0]?.includes('already exists')) {
      toast.error('❌ Ya existe una póliza con ese número');
    } else if (err?.primer_pago?.[0]?.includes('wrong format')) {
      toast.error('❌ Formato de fecha inválido. Usá DD-MM-YYYY');
    } else {
      toast.error('❌ Error al crear póliza');
    }
  }
};
