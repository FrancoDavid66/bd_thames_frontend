import { toast } from "react-hot-toast";

/**
 * Obtiene el balance diario (NO envía WhatsApp).
 * @param {Function} dispatch
 * @param {Function} fetchThunk  - fetchBalanceDiario({fecha})
 * @param {string}   fecha       - opcional "YYYY-MM-DD"
 */
export const obtenerBalanceDiario = async (dispatch, fetchThunk, fecha) => {
  try {
    await dispatch(fetchThunk(fecha ? { fecha } : {})).unwrap();
    toast.success("Balance actualizado");
  } catch (error) {
    toast.error(error || "No se pudo obtener el balance diario");
  }
};
