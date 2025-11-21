import { useState } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'

const GeoTable = ({ geoItems, onEdit, onDelete }) => {
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [busquedaNombre, setBusquedaNombre] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  const tiposUnicos = ['todos', ...new Set(geoItems.map((item) => item.tipo))]

  const itemsFiltrados = geoItems.filter((item) => {
    const coincideTipo = tipoFiltro === 'todos' || item.tipo === tipoFiltro
    const coincideNombre =
      item.nombre.toLowerCase().includes(busquedaNombre.toLowerCase())
    const coincideEstado =
      estadoFiltro === 'todos' ||
      (estadoFiltro === 'activos' && item.activa) ||
      (estadoFiltro === 'inactivos' && !item.activa)

    return coincideTipo && coincideNombre && coincideEstado
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-grey">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Filtrar por tipo:</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="p-2 border border-gray-700 rounded bg-gray-900 text-white"
          >
            {tiposUnicos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo === 'todos' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Buscar por nombre:</label>
          <input
            type="text"
            value={busquedaNombre}
            onChange={(e) => setBusquedaNombre(e.target.value)}
            placeholder="Ej: Axion"
            className="p-2 border border-gray-700 rounded bg-gray-900 text-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Filtrar por estado:</label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="p-2 border border-gray-700 rounded bg-gray-900 text-white"
          >
            <option value="todos">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border border-gray-700 bg-gray-900 text-white">
          <thead className="bg-gray-800 text-gray-200">
            <tr>
              <th className="p-2">Tipo</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Ubicación</th>
              <th className="p-2">Activa</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {itemsFiltrados.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800">
                <td className="p-2 capitalize">{item.tipo}</td>
                <td className="p-2">{item.nombre}</td>
                <td className="p-2">{item.descripcion}</td>
                <td className="p-2 text-xs text-gray-400">
                  {item.latitud}, {item.longitud}
                </td>
                <td className="p-2">
                  {item.activa ? (
                    <span className="text-green-400 font-medium">Sí</span>
                  ) : (
                    <span className="text-red-400 font-medium">No</span>
                  )}
                </td>
                <td className="p-2 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default GeoTable
