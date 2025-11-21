const AlquilerTable = ({ alquileres, onEdit, onDelete }) => {
    return (
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white dark:bg-gray-900 text-sm text-left">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase">
            <tr>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Localidad</th>
              <th className="px-4 py-3">Partido</th>
              <th className="px-4 py-3">Inquilinos</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Fin</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {alquileres.map((a) => (
              <tr
                key={a.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-4 py-3">{a.direccion}</td>
                <td className="px-4 py-3">{a.localidad}</td>
                <td className="px-4 py-3">{a.partido}</td>
                <td className="px-4 py-3">
                  {a.inquilinos?.length > 0
                    ? a.inquilinos.map((id) => `#${id}`).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-3">${a.precio_alquiler}</td>
                <td className="px-4 py-3">{a.fecha_inicio}</td>
                <td className="px-4 py-3">{a.fecha_fin}</td>
                <td className="px-4 py-3 text-center space-x-2">
                  <button
                    onClick={() => onEdit(a)}
                    className="text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {alquileres.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center p-4 text-gray-400">
                  No hay alquileres registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }
  
  export default AlquilerTable
  