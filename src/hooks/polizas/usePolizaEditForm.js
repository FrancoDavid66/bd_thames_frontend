import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updatePoliza } from '../../store/slices/polizasSlice';
import toast from 'react-hot-toast';
import { formatearFechaParaBackend } from '../../utils/polizas/dateUtils';

export const usePolizaEditForm = ({ poliza, onClose }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (poliza) {
      setFormData({ ...poliza, estado: poliza.estado || 'activa' });
    }
  }, [poliza]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Clon y saneo: NO mandamos derivados que el backend calcula.
      const payload = { ...formData };

      // Normalización fechas
      payload.primer_pago = formatearFechaParaBackend(payload.primer_pago);
      payload.fecha_emision = formatearFechaParaBackend(payload.fecha_emision);

      // 🔒 Estos campos son derivados/definidos por backend → no enviarlos
      delete payload.fecha_vencimiento;
      delete payload.cantidad_cuotas;

      // Normalizar número de póliza vacío → null y, si corresponde, activar sin_numero
      if (typeof payload.numero_poliza === 'string' && payload.numero_poliza.trim() === '') {
        payload.numero_poliza = null;
        if (payload.sin_numero === undefined) payload.sin_numero = true;
      }

      // Cliente
      payload.cliente_id = payload.cliente_id || poliza?.cliente?.id;
      if (!payload.cliente_id) {
        toast.error('Falta el ID del cliente');
        return;
      }

      await dispatch(updatePoliza(payload)).unwrap();
      toast.success('Póliza actualizada correctamente');
      onClose();
    } catch (err) {
      console.error('❌ Error al actualizar póliza:', err);
      if (err?.response?.data) {
        toast.error('Error: ' + JSON.stringify(err.response.data));
      } else {
        toast.error('Error inesperado al actualizar póliza');
      }
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
  };
};
