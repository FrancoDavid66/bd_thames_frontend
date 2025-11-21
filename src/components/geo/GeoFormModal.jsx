// src/components/geo/GeoFormModal.jsx
import { motion, AnimatePresence } from 'framer-motion'
import GeoForm from './GeoForm'

const GeoFormModal = ({ isOpen, onClose, formData, handleChange, handleSubmit }) => {
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
            className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Crear nuevo punto</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-red-500 text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <GeoForm
              formData={formData}
              handleChange={handleChange}
              handleSubmit={(e) => {
                handleSubmit(e)
                onClose()
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default GeoFormModal
