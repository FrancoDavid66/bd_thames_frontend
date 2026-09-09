import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPencilAlt, HiCheck } from 'react-icons/hi';

const BotonEditarCliente = ({ onClick }) => {
  const [confirmado, setConfirmado] = useState(false);

  const handleClick = () => {
    onClick();
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 1500);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      className="relative overflow-hidden p-3 min-w-[80px] h-16 bg-duo-amarillo text-white rounded-full transition-colors hover:brightness-110 flex items-center justify-center cursor-pointer"
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
            <HiCheck className="text-white text-xl" />
          </motion.div>
        ) : (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.3 }}
          >
            <HiPencilAlt className="text-white text-xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default BotonEditarCliente;
