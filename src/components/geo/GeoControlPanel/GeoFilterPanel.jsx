// src/components/geo/GeoControlPanel/GeoFilterPanel.jsx
const tiposDisponibles = ['propia', 'rival', 'cartel', 'alquiler', 'potencial']

const GeoFilterPanel = ({ filters, onChange }) => {
  const handleToggle = (tipo) => {
    const nuevoSet = filters.includes(tipo)
      ? filters.filter((t) => t !== tipo)
      : [...filters, tipo]
    onChange(nuevoSet)
  }

  return (
    <div>
      <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-2">
        Filtrar por tipo
      </h3>
      <div className="flex flex-wrap gap-2">
        {tiposDisponibles.map((tipo) => (
          <button
            key={tipo}
            onClick={() => handleToggle(tipo)}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${
              filters.includes(tipo)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default GeoFilterPanel
