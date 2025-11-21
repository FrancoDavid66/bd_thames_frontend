import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateCliente } from '../../store/slices/clientesSlice';
import toast from 'react-hot-toast';

export const useClienteEditForm = ({ cliente, onClose, onSave }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    dni_cuit_cuil: '',
    direccion: '',
    localidad: '', // ✅ agregado
    fecha_nacimiento: '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || '',
        apellido: cliente.apellido || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        dni_cuit_cuil: cliente.dni_cuit_cuil || '',
        direccion: cliente.direccion || '',
        localidad: cliente.localidad || '', // ✅ agregado
        fecha_nacimiento: cliente.fecha_nacimiento || '',
      });
    }
  }, [cliente]);

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
      id: cliente.id,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      telefono: formData.telefono.trim(),
      dni_cuit_cuil: formData.dni_cuit_cuil.trim(),
      direccion: formData.direccion.trim(),
      localidad: formData.localidad.trim(), // ✅ agregado
      email: formData.email?.trim() || null,
      fecha_nacimiento: formData.fecha_nacimiento.trim() === '' ? null : formData.fecha_nacimiento,
    };

    try {
      await dispatch(updateCliente(dataAEnviar)).unwrap();
      toast.success('Cliente actualizado correctamente');
      onSave();
      onClose();
    } catch (error) {
      toast.error('Error al actualizar cliente');
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
  };
};
