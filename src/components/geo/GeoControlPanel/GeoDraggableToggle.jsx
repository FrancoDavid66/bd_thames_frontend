// src/components/geo/GeoControlPanel/GeoDraggableToggle.jsx
const GeoDraggableToggle = ({ enabled, onToggle }) => {
    return (
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Modo arrastrar puntos
        </label>
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded text-sm font-semibold ${
            enabled ? 'bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          {enabled ? 'Activo' : 'Inactivo'}
        </button>
      </div>
    )
  }
  
  export default GeoDraggableToggle
  