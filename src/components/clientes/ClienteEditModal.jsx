import { motion, AnimatePresence } from 'framer-motion';
import { useClienteEditForm } from '../../hooks/clientes/useClienteEditForm';

const ClienteEditModal = ({ isOpen, onClose, onSave, cliente }) => {
  const {
    formData,
    handleChange,
    handleSubmit,
  } = useClienteEditForm({ cliente, onClose, onSave });

  const camposOrdenados = [
    'nombre',
    'apellido',
    'dni_cuit_cuil',
    'telefono',
    'email',
    'direccion',
    'localidad', // ✅ agregado
    'fecha_nacimiento',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-800 text-white rounded-xl p-6 shadow-2xl w-[90%] max-w-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-xl font-bold mb-4">Editar Cliente</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {camposOrdenados.map((key) => (
                <div key={key} className="mb-3">
                  <label className="block text-sm font-medium mb-1">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type={key.includes('fecha') ? 'date' : 'text'}
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-gray-700 text-white"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Guardar
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteEditModal;
