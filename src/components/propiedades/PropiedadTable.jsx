const PropiedadTable = ({ propiedades, onEdit, onDelete }) => {
    if (!propiedades || propiedades.length === 0) {
      return <p className="text-gray-400">No hay propiedades registradas.</p>;
    }
  
    return (
      <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr className="text-left">
              <th className="p-2">Dirección</th>
              <th className="p-2">Localidad</th>
              <th className="p-2">Partido</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Precio</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {propiedades.map((propiedad) => (
              <tr key={propiedad.id} className="border-t dark:border-gray-700">
                <td className="p-2">{propiedad.direccion}</td>
                <td className="p-2">{propiedad.localidad}</td>
                <td className="p-2">{propiedad.partido}</td>
                <td className="p-2 capitalize">{propiedad.tipo}</td>
                <td className="p-2 capitalize">{propiedad.estado}</td>
                <td className="p-2">${parseFloat(propiedad.precio).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => onEdit(propiedad)}
                  >
                    Editar
                  </button>
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => onDelete(propiedad)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  export default PropiedadTable;
  