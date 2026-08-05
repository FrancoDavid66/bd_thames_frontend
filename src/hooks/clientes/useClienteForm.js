// src/hooks/clientes/useClienteForm.js
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { createCliente, updateCliente } from "../../store/slices/clientesSlice";

// Estado vacío del formulario (una sola fuente de verdad)
const VACIO = {
  nombre: "",
  apellido: "",
  dni_cuit_cuil: "",
  telefono: "",
  email: "",
  direccion: "",
  localidad: "",
  fecha_nacimiento: "",
  oficina: "", // 🚀 blindaje multi-tenant
};

/**
 * Hook UNIFICADO de alta y edición de cliente.
 *
 * - Si recibe `cliente` (con id)  -> MODO EDITAR  (PATCH vía updateCliente)
 * - Si NO recibe `cliente`        -> MODO CREAR   (POST  vía createCliente)
 *
 * Ejemplo fácil:
 *   useClienteForm({ onSuccess })            -> crea un cliente nuevo
 *   useClienteForm({ cliente, onSave })      -> edita el cliente que le pasás
 */
export const useClienteForm = ({ cliente = null, onClose, onSuccess, onSave } = {}) => {
  const dispatch = useDispatch();

  const modoEditar = Boolean(cliente?.id);

  const [formData, setFormData] = useState(VACIO);
  const [loading, setLoading] = useState(false);

  // 🔄 Al abrir en modo editar, precargamos los datos del cliente.
  //    En modo crear, dejamos el formulario vacío.
  useEffect(() => {
    if (cliente?.id) {
      setFormData({
        nombre: cliente.nombre || "",
        apellido: cliente.apellido || "",
        dni_cuit_cuil: cliente.dni_cuit_cuil || "",
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        direccion: cliente.direccion || "",
        localidad: cliente.localidad || "",
        fecha_nacimiento: cliente.fecha_nacimiento || "",
        oficina: cliente.oficina || "",
      });
    } else {
      setFormData(VACIO);
    }
  }, [cliente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // 🛡️ Obligatorios: nombre, apellido y teléfono (DNI es OPCIONAL).
    const camposObligatorios = ["nombre", "apellido", "telefono"];
    const faltantes = camposObligatorios.filter((c) => !formData[c]?.trim());
    if (faltantes.length > 0) {
      toast.error(`Faltan completar: ${faltantes.join(", ")}`);
      return;
    }

    // Validación básica de email solo si el usuario escribió algo
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      toast.error("El email no tiene un formato válido");
      return;
    }

    setLoading(true);

    try {
      if (modoEditar) {
        // ---- EDITAR (PATCH) ----
        const dataAEnviar = {
          ...formData,
          id: cliente.id,
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          telefono: formData.telefono.trim(),
          dni_cuit_cuil: formData.dni_cuit_cuil.trim(),
          direccion: formData.direccion.trim(),
          localidad: formData.localidad.trim(),
          oficina: formData.oficina || null,
          email: formData.email?.trim() || null,
          fecha_nacimiento:
            formData.fecha_nacimiento?.trim() === "" ? null : formData.fecha_nacimiento,
        };

        await dispatch(updateCliente(dataAEnviar)).unwrap();
        toast.success("Ficha actualizada correctamente");

        if (onSave) onSave();
        if (onClose) onClose();
      } else {
        // ---- CREAR (POST) ----
        // Limpiamos campos vacíos: si 'oficina' va "", el backend asigna la
        // oficina del operador por defecto.
        const payload = Object.fromEntries(
          Object.entries(formData).filter(([, v]) => v !== "" && v !== null)
        );

        await dispatch(createCliente(payload)).unwrap();
        toast.success("Cliente registrado con éxito");

        setFormData(VACIO); // reset solo al crear

        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      const msg =
        typeof error === "string"
          ? error
          : modoEditar
          ? "Error al actualizar cliente"
          : "Error al crear el cliente";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { formData, handleChange, handleSubmit, loading, modoEditar };
};