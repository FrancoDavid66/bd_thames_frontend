import { motion } from 'framer-motion'
import { HiX } from 'react-icons/hi'

const ModalWrapper = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border border-linea dark:border-linea-dark w-full max-w-lg p-6 rounded-xl shadow-xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-suave dark:text-suave-dark hover:text-duo-rojo transition-colors"
        >
          <HiX className="text-xl" />
        </button>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </motion.div>
    </div>
  )
}

export default ModalWrapper
