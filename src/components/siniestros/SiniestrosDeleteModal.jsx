import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SiniestrosDeleteModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg w-[95%] max-w-sm"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-xl font-bold mb-4">Eliminar Siniestro</h2>
          <p className="mb-4">¿Estás seguro de que deseas eliminar este siniestro? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded">Cancelar</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SiniestrosDeleteModal;
