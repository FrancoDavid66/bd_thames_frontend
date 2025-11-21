// src/components/geo/GeoMapViewer.jsx
import {
    GoogleMap,
    Marker,
    InfoWindow,
    Polyline,
    Circle,
    MarkerClusterer,
    useJsApiLoader,
  } from '@react-google-maps/api'
  import { getEmojiForTipo } from '../../utils/geoUtils'
  import darkMapStyle from '../../utils/darkMapStyle'
  
  const containerStyle = {
    width: '100%',
    height: '80vh',
  }
  
  const GeoMapViewer = ({
    geoItems,
    selectedItem,
    setSelectedItem,
    distanceResult,
    filters = [],
    draggable = false,
    clusterEnabled = false,
    nightMode = false,
    center = { lat: -34.7611, lng: -58.5861 },
    radiosSeleccionados = [],
  }) => {
    const { isLoaded } = useJsApiLoader({
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      libraries: ['geometry'],
    })
  
    if (!isLoaded) return <p className="text-center">Cargando mapa...</p>
  
    const puntosFiltrados = filters.length
      ? geoItems.filter((item) => filters.includes(item.tipo))
      : geoItems
  
    const { points, meters } = distanceResult || {}
  
    const handleDragEnd = (e, item) => {
      const newLat = e.latLng.lat()
      const newLng = e.latLng.lng()
      console.log(`Nuevo punto: ${item.nombre} →`, newLat, newLng)
    }
  
    const renderMarkers = (items) =>
      items.map((item) => (
        <Marker
          key={item.id}
          position={{
            lat: parseFloat(item.latitud),
            lng: parseFloat(item.longitud),
          }}
          label={{ text: getEmojiForTipo(item.tipo), fontSize: '24px' }}
          onClick={() => setSelectedItem(item)}
          draggable={draggable}
          onDragEnd={(e) => handleDragEnd(e, item)}
        />
      ))
  
    return (
      <div className="relative">
        {meters && (
          <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white p-2 rounded shadow z-10">
            Distancia: {(meters / 1000).toFixed(2)} km
          </div>
        )}
  
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          options={{
            styles: nightMode ? darkMapStyle : [],
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {clusterEnabled ? (
            <MarkerClusterer>{(clusterer) => renderMarkers(puntosFiltrados)}</MarkerClusterer>
          ) : (
            renderMarkers(puntosFiltrados)
          )}
  
          {selectedItem && (
            <>
              <InfoWindow
                position={{
                  lat: parseFloat(selectedItem.latitud),
                  lng: parseFloat(selectedItem.longitud),
                }}
                onCloseClick={() => setSelectedItem(null)}
              >
                <div className="text-sm">
                  <h2 className="font-bold text-lg mb-1">{selectedItem.nombre}</h2>
                  <p><strong>Tipo:</strong> {selectedItem.tipo}</p>
                  <p><strong>Descripción:</strong> {selectedItem.descripcion || 'Sin descripción'}</p>
                  <p><strong>Contacto:</strong> {selectedItem.contacto || '-'}</p>
                  {selectedItem.precio_estimado && (
                    <p><strong>Precio estimado:</strong> ${selectedItem.precio_estimado}</p>
                  )}
                  {selectedItem.url_maps && (
                    <a
                      href={selectedItem.url_maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline mt-2 inline-block"
                    >
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              </InfoWindow>
  
              {radiosSeleccionados.map((km) => (
                <Circle
                  key={km}
                  center={{
                    lat: parseFloat(selectedItem.latitud),
                    lng: parseFloat(selectedItem.longitud),
                  }}
                  radius={km * 1000}
                  options={{
                    strokeColor: '#3b82f6',
                    strokeOpacity: 0.5,
                    strokeWeight: 1,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                  }}
                />
              ))}
            </>
          )}
  
          {points?.length === 2 && (
            <Polyline
              path={[
                {
                  lat: parseFloat(points[0].latitud),
                  lng: parseFloat(points[0].longitud),
                },
                {
                  lat: parseFloat(points[1].latitud),
                  lng: parseFloat(points[1].longitud),
                },
              ]}
              options={{
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
      </div>
    )
  }
  
  export default GeoMapViewer
   