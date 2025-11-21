import { motion } from 'framer-motion';

const ClienteDatosCard = ({ cliente }) => {
  return (
    <motion.div
      className="bg-gray-800 text-white p-6 rounded-lg shadow-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-semibold text-white mb-4">
        Datos personales
      </h2>
      <ul className="text-lg space-y-2">
        <li>
          <strong>DNI/CUIT:</strong> {cliente.dni_cuit_cuil}
        </li>
        <li>
          <strong>Teléfono:</strong> {cliente.telefono}
        </li>
        <li>
          <strong>Email:</strong> {cliente.email || '-'}
        </li>
        <li>
          <strong>Dirección:</strong> {cliente.direccion}
        </li>
        <li>
          <strong>Fecha nacimiento:</strong> {cliente.fecha_nacimiento}
        </li>
        <li>
          <strong>Estado:</strong> {cliente.estado ? 'Activo' : 'Inactivo'}
        </li>
      </ul>
    </motion.div>
  );
};

export default ClienteDatosCard;
