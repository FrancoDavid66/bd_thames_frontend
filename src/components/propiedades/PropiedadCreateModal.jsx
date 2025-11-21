import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createPropiedad, fetchPropiedades } from '../../store/slices/propiedadesSlice';

const PropiedadCreateModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    direccion: '',
    localidad: '',
    partido: '',
    tipo: 'departamento',
    estado: 'disponible',
    precio: '',
    descripcion: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createPropiedad(formData));
      dispatch(fetchPropiedades());
      onClose();
    } catch (err) {
      console.error("Error al crear propiedad:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4">Nueva Propiedad</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm">Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Localidad</label>
              <input
                type="text"
                name="localidad"
                value={formData.localidad}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm">Partido</label>
              <input
                type="text"
                name="partido"
                value={formData.partido}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Tipo</label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              >
                <option value="departamento">Departamento</option>
                <option value="casa">Casa</option>
                <option value="local">Local</option>
                <option value="terreno">Terreno</option>
              </select>
            </div>

            <div>
              <label className="block text-sm">Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800"
              >
                <option value="disponible">Disponible</option>
                <option value="vendida">Vendida</option>
                <option value="alquilada">Alquilada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm">Precio</label>
            <input
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm">Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="w-full p-2 border rounded bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropiedadCreateModal;
