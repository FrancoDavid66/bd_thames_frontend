import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const ConfirmModal = ({ isOpen, onClose, nombre, onConfirm }) => {
  const handleDelete = async () => {
    try {
      await onConfirm()
      toast.success(`Cliente ${nombre} eliminado correctamente`)
      onClose()
    } catch (error) {
      console.error('Error al eliminar cliente:', error)
      const errorMsg = error.response?.data?.detail || 'Error al eliminar cliente'
      toast.error(errorMsg)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-card dark:bg-card-dark border border-linea dark:border-linea-dark rounded-xl p-6 shadow-xl w-[95%] max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h2 className="text-xl font-semibold mb-4 text-titulo dark:text-titulo-dark">
              Confirmar Eliminación
            </h2>
            <p className="text-suave dark:text-suave-dark">
              ¿Estás seguro de que deseas eliminar al cliente{' '}
              <span className="font-medium text-duo-rojo">{nombre}</span>? Esta acción no se puede deshacer.
            </p>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-duo-rojo text-white hover:brightness-110 transition-colors"
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
