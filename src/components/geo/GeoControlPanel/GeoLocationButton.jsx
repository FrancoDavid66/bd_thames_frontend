// src/components/geo/GeoControlPanel/GeoLocationButton.jsx
const GeoLocationButton = ({ onLocate }) => {
    const handleClick = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }
            onLocate(coords)
          },
          () => {
            alert('No se pudo obtener tu ubicación')
          }
        )
      } else {
        alert('Geolocalización no soportada')
      }
    }
  
    return (
      <button
        onClick={handleClick}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold"
      >
        📍 Ir a mi ubicación actual
      </button>
    )
  }
  
  export default GeoLocationButton
  