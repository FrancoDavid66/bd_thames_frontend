// src/components/geo/GeoControlPanel.jsx
import GeoDistancePanel from './GeoDistancePanel'
import GeoFilterPanel from './GeoControlPanel/GeoFilterPanel'
import GeoLocationButton from './GeoControlPanel/GeoLocationButton'
import GeoPolygonTools from './GeoControlPanel/GeoPolygonTools'
import GeoNightModeToggle from './GeoControlPanel/GeoNightModeToggle'
import GeoClusterToggle from './GeoControlPanel/GeoClusterToggle'
import GeoDraggableToggle from './GeoControlPanel/GeoDraggableToggle'

const GeoControlPanel = ({
  geoItems,
  onDistanceCalc,
  filters,
  onFiltersChange,
  onUseMyLocation,
  draggableEnabled,
  onToggleDraggable,
  clusterEnabled,
  onToggleCluster,
  nightMode,
  onToggleNightMode,
  radiosSeleccionados,
  onChangeRadios,
  mostrarRadios,
  onToggleRadios,
  onPolygonDraw,
}) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded shadow space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
        Panel de Control Estratégico
      </h2>

      <GeoDistancePanel geoItems={geoItems} onCalculate={onDistanceCalc} />
      <GeoFilterPanel filters={filters} onChange={onFiltersChange} />
      <GeoLocationButton onLocate={onUseMyLocation} />
      <GeoDraggableToggle enabled={draggableEnabled} onToggle={onToggleDraggable} />
      <GeoClusterToggle enabled={clusterEnabled} onToggle={onToggleCluster} />
      <GeoNightModeToggle enabled={nightMode} onToggle={onToggleNightMode} />

      {/* Radios dinámicos */}
      <div>
        <label className="block text-sm text-gray-800 dark:text-gray-200 mb-1">
          Dibujar radios desde el punto seleccionado
        </label>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 5, 10].map((km) => (
            <label
              key={km}
              className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                value={km}
                checked={radiosSeleccionados.includes(km)}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (e.target.checked) {
                    onChangeRadios([...radiosSeleccionados, value])
                  } else {
                    onChangeRadios(radiosSeleccionados.filter((r) => r !== value))
                  }
                }}
              />
              {km} km
            </label>
          ))}
        </div>
      </div>

      {/* Toggle de visibilidad */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-800 dark:text-gray-200">
          Mostrar radios (1 / 5 / 10 km)
        </label>
        <button
          onClick={onToggleRadios}
          className={`px-3 py-1 rounded text-white text-sm ${
            mostrarRadios ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          {mostrarRadios ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <GeoPolygonTools onDraw={onPolygonDraw} />
    </div>
  )
}

export default GeoControlPanel
