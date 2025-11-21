// src/components/geo/GeoPolygonTools.jsx

const GeoPolygonTools = ({ onDraw }) => {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
        <h4 className="font-semibold text-gray-700 dark:text-white mb-2">Herramientas de Polígono</h4>
        <button
          onClick={onDraw}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Dibujar Polígono (próximamente)
        </button>
      </div>
    )
  }
  
  export default GeoPolygonTools
  