// src/hooks/clientes/useClienteEditForm.js
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateCliente } from '../../store/slices/clientesSlice';
import toast from 'react-hot-toast';

export const useClienteEditForm = ({ cliente, onClose, onSave }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false); // 🚀 Estado de carga para el spinner

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    dni_cuit_cuil: '',
    direccion: '',
    localidad: '', 
    fecha_nacimiento: '',
    oficina: '', // 🚀 Agregado para el blindaje multi-tenant
  });

  // 🔄 Sincronizamos el estado cuando el cliente cambia (al abrir el modal)
  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre || '',
        apellido: cliente.apellido || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        dni_cuit_cuil: cliente.dni_cuit_cuil || '',
        direccion: cliente.direccion || '',
        localidad: cliente.localidad || '', 
        fecha_nacimiento: cliente.fecha_nacimiento || '',
        oficina: cliente.oficina || '', // 🚀 Cargamos la ID de la oficina actual
      });
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // 🛡️ Validaciones: nombre, apellido y teléfono son el "corazón" de la ficha
    const camposObligatorios = ['nombre', 'apellido', 'telefono'];
    const faltantes = camposObligatorios.filter((campo) => !formData[campo]?.trim());

    if (faltantes.length > 0) {
      toast.error(`Faltan completar: ${faltantes.join(', ')}`);
      return;
    }

    // Validación básica de email si es que el usuario escribió algo
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      toast.error('El email no tiene un formato válido');
      return;
    }

    setLoading(true); // Arranca el spinner en el botón

    // 🛠️ Preparamos el payload limpiando espacios y manejando nulos
    const dataAEnviar = {
      ...formData,
      id: cliente.id, // Requerido para el endpoint PATCH/PUT
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      telefono: formData.telefono.trim(),
      dni_cuit_cuil: formData.dni_cuit_cuil.trim(),
      direccion: formData.direccion.trim(),
      localidad: formData.localidad.trim(),
      oficina: formData.oficina || null, // 🚀 Enviamos la oficina (ID)
      email: formData.email?.trim() || null,
      fecha_nacimiento: formData.fecha_nacimiento?.trim() === '' ? null : formData.fecha_nacimiento,
    };

    try {
      // 🚀 Despachamos la actualización a Redux
      await dispatch(updateCliente(dataAEnviar)).unwrap();
      
      // 🍞 Éxito: Un solo toast para no saturar la UI
      toast.success('Ficha actualizada correctamente'); 
      
      // Notificamos al componente padre para refrescar y cerrar
      if (onSave) onSave(); 
      if (onClose) onClose();

    } catch (error) {
      console.error("❌ Error actualizando cliente:", error);
      toast.error(typeof error === 'string' ? error : 'Error al actualizar cliente');
    } finally {
      setLoading(false); // Frena el spinner
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
    loading, // 🚀 Devolvemos el loading para que el botón de "Guardar" sepa qué hacer
  };
};