import { motion } from 'framer-motion';

const ClienteSiniestrosCard = ({ siniestros }) => {
  if (!siniestros || siniestros.length === 0) {
    return (
      <motion.div
        className="bg-gray-800 text-white p-6 rounded-lg shadow-xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-semibold mb-4">Siniestros</h2>
        <p className="text-gray-400">No hay siniestros registrados.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800 text-white p-6 rounded-lg shadow-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-semibold mb-4">Siniestros</h2>
      <ul className="space-y-4">
        {siniestros.map((siniestro) => (
          <motion.li
            key={siniestro.id}
            className="p-4 bg-gray-700 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p><strong>Fecha de denuncia:</strong> {siniestro.fecha_denuncia || 'No registrada'}</p>
            <p><strong>Lugar:</strong> {siniestro.lugar} - {siniestro.localidad}</p>
            <p><strong>Heridos:</strong> {siniestro.hubo_heridos ? 'Sí' : 'No'}</p>
            <p><strong>Resolución:</strong> {siniestro.resolucion_final || 'Pendiente'}</p>
            {siniestro.monto_pagado > 0 && (
              <p><strong>Monto pagado:</strong> ${siniestro.monto_pagado}</p>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

export default ClienteSiniestrosCard;
