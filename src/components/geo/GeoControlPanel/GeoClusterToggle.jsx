// src/components/geo/GeoControlPanel/GeoClusterToggle.jsx
const GeoClusterToggle = ({ enabled, onToggle }) => {
    return (
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Agrupar marcadores cercanos
        </label>
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded text-sm font-semibold ${
            enabled ? 'bg-indigo-600 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          {enabled ? 'Activado' : 'Desactivado'}
        </button>
      </div>
    )
  }
  
  export default GeoClusterToggle
  