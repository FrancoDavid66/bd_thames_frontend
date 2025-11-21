import { motion, AnimatePresence } from 'framer-motion';
import { usePolizaForm } from '../../hooks/polizas/usePolizaForm';
import { formatearYEnviarPoliza } from '../../utils/polizas/formUtils';

const PolizaEditModal = ({ isOpen, onClose, onSuccess, poliza }) => {
  const { formData, handleChange, handleSubmit: handleSubmitOriginal, modo } = usePolizaForm({
    poliza,
    onSuccess,
    onClose,
  });

  const companias = ['Agrosalta', 'ATM', 'Digna', 'Equidad', 'Federacion Patronal', 'Providencia'];
  const oficinas = ['Oficina 1 (5 esquinas)'];
  const coberturas = ['A', 'B', 'B1', 'C', 'C1', 'C Full', 'R.C Premium'];
  const tiposVehiculo = ['Auto', 'Camioneta', 'Camion', 'Moto', 'Trailer'];

  const handleSubmitModificado = (e) => {
    formatearYEnviarPoliza(formData, handleSubmitOriginal, e);
  };

  if (!isOpen || !poliza) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-[95%] max-w-4xl overflow-y-auto max-h-[90vh]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Editar Póliza</h2>

          <form onSubmit={handleSubmitModificado} className="grid md:grid-cols-2 gap-4">
            {[
              'compania',
              'numero_poliza',
              'cobertura',
              'oficina',
              'patente',
              'marca',
              'modelo',
              'anio',
              'tipo',
              'precio_cuota',
              'primer_pago'
            ].map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                  {key.replace('_', ' ')}
                </label>
                {['compania', 'oficina', 'cobertura', 'tipo'].includes(key) ? (
                  <select
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Seleccionar {key}</option>
                    {(key === 'compania' ? companias :
                      key === 'oficina' ? oficinas :
                      key === 'cobertura' ? coberturas :
                      tiposVehiculo
                    ).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : key === 'primer_pago' && modo === 'edit' ? (
                  <input
                    type="date"
                    name="primer_pago"
                    value={formData.primer_pago}
                    disabled
                    className="w-full p-2 border rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-60"
                  />
                ) : (
                  <input
                    type={key.includes('fecha') ? 'date' : 'text'}
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder={key.includes('fecha') ? 'DD-MM-YYYY o DD/MM/YYYY' : ''}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PolizaEditModal;
