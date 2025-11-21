import React from 'react';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const SiniestrosList = ({ siniestros, onView, onEdit, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
      <table className="w-full text-left border-collapse bg-white dark:bg-gray-900 text-black dark:text-white">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="p-3 border-b">ID</th>
            <th className="p-3 border-b">Cliente</th>
            <th className="p-3 border-b">Póliza</th>
            <th className="p-3 border-b">Marca</th>
            <th className="p-3 border-b">Modelo</th>
            <th className="p-3 border-b">Año</th>
            <th className="p-3 border-b">Responsabilidad</th>
            <th className="p-3 border-b">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {siniestros.length === 0 ? (
            <tr>
              <td colSpan="8" className="p-4 text-center text-gray-500">
                No hay siniestros registrados.
              </td>
            </tr>
          ) : (
            siniestros.map((siniestro) => (
              <tr key={siniestro.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <td className="p-3 border-b">{siniestro.id}</td>
                <td className="p-3 border-b">{siniestro.cliente}</td>
                <td className="p-3 border-b">{siniestro.poliza}</td>
                <td className="p-3 border-b">{siniestro.marca_auto}</td>
                <td className="p-3 border-b">{siniestro.modelo_auto}</td>
                <td className="p-3 border-b">{siniestro.ano_auto}</td>
                <td className="p-3 border-b">{siniestro.responsabilidad}</td>
                <td className="p-3 border-b text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => onView(siniestro)} className="text-blue-500 hover:text-blue-700">
                      <FaEye />
                    </button>
                    <button onClick={() => onEdit(siniestro)} className="text-yellow-500 hover:text-yellow-700">
                      <FaEdit />
                    </button>
                    <button onClick={() => onDelete(siniestro)} className="text-red-500 hover:text-red-700">
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SiniestrosList;
