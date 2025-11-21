import { motion, AnimatePresence } from 'framer-motion';
import { useClienteForm } from '../../hooks/clientes/useClienteForm';

const ClienteCreateModal = ({ isOpen, onClose, onSuccess }) => {
  const {
    formData,
    handleChange,
    handleSubmit,
    loading,
  } = useClienteForm({ onClose, onSuccess });

  const camposOrdenados = [
    'nombre',
    'apellido',
    'dni_cuit_cuil',
    'telefono',
    'email',
    'direccion',
    'localidad', // ✅ agregado aquí en orden lógico
    'fecha_nacimiento',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-800 text-white rounded-lg p-6 shadow-xl w-[95%] max-w-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-2xl font-semibold mb-4">Nuevo Cliente</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {camposOrdenados.map((key) => (
                <motion.div key={key} className="mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <label className="block text-sm mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type={key.includes('fecha') ? 'date' : 'text'}
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-green-500"
                    placeholder={`Ingresar ${key.replace(/_/g, ' ')}`}
                  />
                </motion.div>
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
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear cliente'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteCreateModal;
