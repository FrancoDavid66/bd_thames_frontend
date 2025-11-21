import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTrash, FaCheck } from 'react-icons/fa';

const BotonBorrarCliente = ({ onClick }) => {
  const [confirmado, setConfirmado] = useState(false);

  const handleClick = () => {
    onClick();
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 1500);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{
        scale: 1.1,
        boxShadow: '0 0 12px rgba(239, 68, 68, 0.8)',
      }}
      className="relative overflow-hidden p-3 min-w-[80px] h-16 bg-red-600 text-white rounded-full shadow-md transition-all flex items-center justify-center cursor-pointer"
      title="Eliminar cliente"
    >
      <AnimatePresence mode="wait">
        {confirmado ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3 }}
          >
            <FaCheck className="text-white text-xl" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3 }}
          >
            <FaTrash className="text-white text-xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default BotonBorrarCliente;
