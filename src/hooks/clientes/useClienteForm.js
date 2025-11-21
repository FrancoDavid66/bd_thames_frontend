// src/utils/clientes/useClienteForm.js
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createCliente } from '../../store/slices/clientesSlice';
import toast from 'react-hot-toast';

export const useClienteForm = ({ onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    dni_cuit_cuil: '',
    direccion: '',
    localidad: '', // ✅ nuevo campo
    fecha_nacimiento: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const camposObligatorios = ['nombre', 'apellido', 'telefono', 'dni_cuit_cuil'];
    const faltantes = camposObligatorios.filter((campo) => !formData[campo]?.trim());

    if (faltantes.length > 0) {
      toast.error(`Faltan completar: ${faltantes.join(', ')}`);
      return;
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      toast.error('El email no tiene un formato válido');
      return;
    }

    const dataAEnviar = {
      ...formData,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      telefono: formData.telefono.trim(),
      dni_cuit_cuil: formData.dni_cuit_cuil.trim(),
      direccion: formData.direccion.trim(),
      localidad: formData.localidad.trim(), // ✅ nuevo campo
      email: formData.email?.trim() || null,
      fecha_nacimiento: formData.fecha_nacimiento.trim() === '' ? null : formData.fecha_nacimiento,
    };

    try {
      setLoading(true);
      await dispatch(createCliente(dataAEnviar)).unwrap();
      toast.success('Cliente creado correctamente');
      onClose();
      onSuccess();
    } catch (err) {
      toast.error('Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    loading,
  };
};
