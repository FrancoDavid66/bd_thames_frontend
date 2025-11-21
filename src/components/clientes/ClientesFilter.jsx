import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ClientesFilter = ({ onFilterText, onFilterEstado }) => {
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');

  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterText(busqueda.toLowerCase());
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, onFilterText]);

  useEffect(() => {
    onFilterEstado(estado);
  }, [estado, onFilterEstado]);

  return (
    <motion.div
      className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gray-800 rounded-lg shadow-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <input
        type="text"
        placeholder="Buscar por nombre, apellido o DNI"
        className="w-full md:w-1/2 px-4 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <select
        value={estado}
        onChange={(e) => setEstado(e.target.value)}
        className="px-4 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="todos">Todos</option>
        <option value="activos">Activos</option>
        <option value="inactivos">Inactivos</option>
      </select>
    </motion.div>
  );
};

export default ClientesFilter;
