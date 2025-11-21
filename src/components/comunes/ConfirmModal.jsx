import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const ConfirmModal = ({ isOpen, onClose, nombre, onConfirm }) => {
  const handleDelete = async () => {
    try {
      await onConfirm()
      toast.success(`Cliente ${nombre} eliminado correctamente ✅`)
      onClose()
    } catch (error) {
      console.error('❌ Error al eliminar cliente:', error)
      const errorMsg = error.response?.data?.detail || 'Error al eliminar cliente'
      toast.error(errorMsg)
    }
  }

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
            className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-[95%] max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Confirmar Eliminación
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              ¿Estás seguro de que deseas eliminar al cliente{' '}
              <span className="font-semibold text-red-500">{nombre}</span>? Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmModal
