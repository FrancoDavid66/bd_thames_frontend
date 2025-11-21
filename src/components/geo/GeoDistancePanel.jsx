// src/components/geo/GeoDistancePanel.jsx
import { useState } from 'react'

const GeoDistancePanel = ({ geoItems, onCalculate }) => {
  const [pointA, setPointA] = useState('')
  const [pointB, setPointB] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const itemA = geoItems.find(i => i.id.toString() === pointA)
    const itemB = geoItems.find(i => i.id.toString() === pointB)
    if (itemA && itemB) {
      onCalculate(itemA, itemB)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow space-y-4">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white">Calcular distancia entre puntos</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={pointA}
          onChange={(e) => setPointA(e.target.value)}
          className="p-2 rounded dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Seleccionar Punto A</option>
          {geoItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} ({item.tipo})
            </option>
          ))}
        </select>

        <select
          value={pointB}
          onChange={(e) => setPointB(e.target.value)}
          className="p-2 rounded dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Seleccionar Punto B</option>
          {geoItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} ({item.tipo})
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Calcular distancia
      </button>
    </form>
  )
}

export default GeoDistancePanel
