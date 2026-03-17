// src/hooks/clientes/useClienteForm.js
import { useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { createCliente } from "../../store/slices/clientesSlice";

export const useClienteForm = ({ onClose, onSuccess }) => {
  const dispatch = useDispatch();
  
  // 🚀 Estado inicial con el campo 'oficina' incluido para el blindaje multi-tenant
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni_cuit_cuil: "",
    telefono: "",
    email: "",
    direccion: "",
    localidad: "",
    fecha_nacimiento: "",
    oficina: "", 
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validaciones básicas de campos obligatorios
    if (!formData.nombre || !formData.apellido || !formData.dni_cuit_cuil || !formData.telefono) {
      toast.error("Por favor, completa los campos obligatorios (*)");
      return;
    }

    setLoading(true);

    try {
      // 🛡️ Limpiamos campos vacíos antes de enviar.
      // Si 'oficina' es "", no se envía el campo, permitiendo que el Backend 
      // asigne la oficina del operador por defecto.
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== "" && v !== null)
      );

      // Despachamos la acción de Redux
      await dispatch(createCliente(payload)).unwrap();
      
      // Único Toast de éxito centralizado para evitar spam de notificaciones
      toast.success("Cliente registrado con éxito");
      
      // Reset del formulario a su estado original
      setFormData({
        nombre: "", 
        apellido: "", 
        dni_cuit_cuil: "", 
        telefono: "", 
        email: "", 
        direccion: "", 
        localidad: "", 
        fecha_nacimiento: "", 
        oficina: ""
      });

      // Ejecutamos callbacks de cierre y refresco
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (error) {
      // Manejo de errores dinámico según lo que devuelva el servidor
      console.error("❌ Error en useClienteForm:", error);
      toast.error(typeof error === "string" ? error : "Error al crear el cliente");
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, handleSubmit, loading };
};