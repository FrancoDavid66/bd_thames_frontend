import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createPoliza, updatePoliza } from '../../store/slices/polizasSlice';
import toast from 'react-hot-toast';
import { convertirFechaArgAISO } from '../../utils/polizas/dateUtils';

/**
 * usePolizaForm
 * - Ya NO calcula ni envía fecha_vencimiento ni cantidad_cuotas (los define el backend).
 * - La ancla temporal es `fecha_emision` (requerida). Si falta `primer_pago`, lo igualamos a `fecha_emision`.
 * - `numero_poliza` es opcional; si viene vacío => se envía null y `sin_numero=true`.
 * - Soporta dos modos de submit:
 *     a) onSubmit(e) → usa el state interno (formData)
 *     b) onSubmit(payload, e) → usa el payload recibido (útil cuando formUtils formatea antes)
 */
export const usePolizaForm = ({ clienteId, poliza = null, onSuccess, onClose }) => {
  const dispatch = useDispatch();
  const modo = poliza ? 'edit' : 'create';

  const [formData, setFormData] = useState({
    compania: '',
    numero_poliza: '',
    cobertura: '',
    oficina: '',
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    tipo: '',
    // precio_cuota es opcional; cuotas se crean sin monto fijo
    precio_cuota: '',
    // ⬇️ ahora se usa fecha_emision (no primer_pago) como ancla de cuotas
    fecha_emision: '',
    // primer_pago es opcional; si no viene lo igualamos a fecha_emision
    primer_pago: '',
  });

  useEffect(() => {
    if (modo === 'edit' && poliza) {
      setFormData({
        compania: poliza.compania || '',
        numero_poliza: poliza.numero_poliza || '',
        cobertura: poliza.cobertura || '',
        oficina: poliza.oficina || '',
        patente: poliza.patente || '',
        marca: poliza.marca || '',
        modelo: poliza.modelo || '',
        anio: poliza.anio || '',
        tipo: poliza.tipo || '',
        precio_cuota: poliza.precio_cuota || '',
        fecha_emision: poliza.fecha_emision || '',
        primer_pago: poliza.primer_pago || '',
        cliente_id: poliza.cliente?.id || '',
        id: poliza.id,
      });
    }
  }, [modo, poliza]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const _validateAndBuild = (raw) => {
    const data = { ...raw };

    // Campos obligatorios mínimos para crear: (numero_poliza deja de ser obligatorio)
    const obligatorios = [
      'compania', 'cobertura', 'oficina',
      'patente', 'marca', 'modelo', 'anio', 'tipo', 'fecha_emision'
    ];
    const faltantes = obligatorios.filter((campo) => !data[campo]?.toString().trim());
    if (faltantes.length > 0) {
      throw new Error(`Faltan completar: ${faltantes.join(', ')}`);
    }

    // Normalización de fechas a ISO (YYYY-MM-DD)
    const fechaEmisionISO = convertirFechaArgAISO(data.fecha_emision);
    if (!fechaEmisionISO) {
      throw new Error('La fecha de emisión no es válida');
    }

    let primerPagoISO = data.primer_pago ? convertirFechaArgAISO(data.primer_pago) : null;
    if (!primerPagoISO) {
      // Compat: si no viene, lo igualamos a fecha_emision (no afecta cálculo de cuotas)
      primerPagoISO = fechaEmisionISO;
    }

    // numero_poliza opcional
    let numero_poliza = data.numero_poliza;
    if (typeof numero_poliza === 'string' && numero_poliza.trim() === '') {
      numero_poliza = null;
    }

    // Normalizar tipo (capitalizar primera letra)
    const tipoNorm =
      typeof data.tipo === 'string' && data.tipo.length
        ? data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1).toLowerCase()
        : data.tipo;

    // Nunca enviar derivados que define el backend:
    // - fecha_vencimiento (poliza)
    // - cantidad_cuotas (poliza)
    // - tampoco calculamos ni enviamos nada de cuotas aquí
    const payload = {
      compania: data.compania,
      numero_poliza,
      cobertura: data.cobertura,
      oficina: data.oficina,
      patente: data.patente,
      marca: data.marca,
      modelo: data.modelo,
      anio: data.anio,
      tipo: tipoNorm,
      precio_cuota: data.precio_cuota || null,
      fecha_emision: fechaEmisionISO,
      primer_pago: primerPagoISO,
      cliente_id: data.cliente_id || clienteId,
    };

    if (!payload.cliente_id) {
      throw new Error('Falta el ID del cliente');
    }

    // Si no mandamos número de póliza, activamos sin_numero
    if (!payload.numero_poliza) {
      payload.sin_numero = true;
    }

    return payload;
  };

  /**
   * Firma flexible:
   *  - handleSubmit(e)
   *  - handleSubmit(payload, e)
   */
  const handleSubmit = async (arg1, arg2) => {
    // Detectar si vino payload o evento
    let payloadFromCaller = null;
    let evt = null;
    if (arg1 && typeof arg1 === 'object' && typeof arg1.preventDefault === 'function') {
      evt = arg1;
    } else if (arg2 && typeof arg2 === 'object' && typeof arg2.preventDefault === 'function') {
      payloadFromCaller = arg1;
      evt = arg2;
    } else if (arg1 && typeof arg1 === 'object') {
      payloadFromCaller = arg1;
    }
    if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();

    try {
      const payload = _validateAndBuild(payloadFromCaller || formData);

      if (modo === 'edit') {
        await dispatch(updatePoliza(payload)).unwrap();
        toast.success('Póliza actualizada correctamente');
      } else {
        await dispatch(createPoliza(payload)).unwrap();
        toast.success('Póliza creada correctamente');
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('❌ Error al guardar la póliza:', err);
      const msg = err?.message || 'Error inesperado al guardar la póliza';
      // Si vino de backend con shape { campo: ['msg'] }, mostralo prolijo
      const apiErr = err?.response?.data;
      if (apiErr && typeof apiErr === 'object') {
        const firstKey = Object.keys(apiErr)[0];
        const firstVal = Array.isArray(apiErr[firstKey]) ? apiErr[firstKey][0] : apiErr[firstKey];
        toast.error(`${firstKey}: ${firstVal}`);
      } else {
        toast.error(msg);
      }
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    modo,
  };
};
