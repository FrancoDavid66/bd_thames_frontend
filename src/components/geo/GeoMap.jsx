import { useEffect, useState } from 'react'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'
import { useDispatch, useSelector } from 'react-redux'
import { fetchGeoItems } from '../../store/slices/geoSlice'
import GeoCreateModal from './GeoCreateModal'

const containerStyle = {
  width: '100%',
  height: '600px',
}

const center = {
  lat: -34.7896, // González Catán
  lng: -58.6251,
}

const GeoMap = () => {
  const dispatch = useDispatch()
  const geoItems = useSelector((state) => state.geo.items)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState({
    lat: center.lat,
    lng: center.lng,
  })

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  })

  useEffect(() => {
    dispatch(fetchGeoItems())
  }, [dispatch])

  if (loadError) return <p>Error al cargar el mapa</p>
  if (!isLoaded) return <p>Cargando mapa...</p>

  return (
    <div className="relative space-y-4">
      {/* Botón para crear nuevo ítem */}
      <div className="flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
        >
          + Nuevo ítem
        </button>
      </div>

      {/* Mapa */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
      >
        {geoItems.map((item) => (
          <Marker
            key={item.id}
            position={{ lat: parseFloat(item.lat), lng: parseFloat(item.lng) }}
            title={item.tipo}
          />
        ))}
      </GoogleMap>

      {/* Modal para nuevo ítem */}
      <GeoCreateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        coords={selectedCoords}
      />
    </div>
  )
}

export default GeoMap
