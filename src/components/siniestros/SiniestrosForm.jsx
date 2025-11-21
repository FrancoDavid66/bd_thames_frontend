import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SiniestrosForm = ({ isOpen, onClose, onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    cliente: '',
    poliza: '',
    marca_auto: '',
    modelo_auto: '',
    ano_auto: '',
    descripcion: '',
    responsabilidad: 'CHOCO',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-[95%] max-w-3xl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.25 }}>
          <h2 className="text-xl font-bold mb-4">{initialData ? 'Editar Siniestro' : 'Nuevo Siniestro'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {['cliente', 'poliza', 'marca_auto', 'modelo_auto', 'ano_auto', 'descripcion'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">{field.replace('_', ' ')}</label>
                <input
                  type="text"
                  name={field}
                  value={formData[field] || ''}
                  onChange={handleChange}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium mb-1">Responsabilidad</label>
              <select
                name="responsabilidad"
                value={formData.responsabilidad}
                onChange={handleChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="CHOCO">Nuestro asegurado chocó</option>
                <option value="CHOCARON">Nuestro asegurado fue chocado</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Guardar</button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestrosForm;
