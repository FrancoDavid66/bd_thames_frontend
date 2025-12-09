// src/components/geo/GeoMapViewer.jsx
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { getEmojiForTipo } from "../../utils/geoUtils";
import darkMapStyle from "../../utils/darkMapStyle";

const containerStyle = {
  width: "100%",
  height: "80vh",
};

const GeoMapViewer = ({
  geoItems,
  selectedItem,
  setSelectedItem,
  center = { lat: -34.7611, lng: -58.5861 },
  nightMode = false,
  draggable = false,
}) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  if (!isLoaded)
    return (
      <p className="text-center text-sm text-slate-300">Cargando mapa...</p>
    );

  // Normalizar geoItems SIEMPRE a array y filtrar elementos válidos
  const rawItems = Array.isArray(geoItems)
    ? geoItems
    : geoItems
    ? Object.values(geoItems)
    : [];

  const puntos = rawItems.filter(
    (item) =>
      item &&
      item.id != null &&
      item.latitud != null &&
      item.longitud != null
  );

  const handleDragEnd = (e, item) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    // Por ahora solo logueamos; si más adelante querés, guardamos en backend
    console.log(`Nuevo punto: ${item.nombre} →`, newLat, newLng);
  };

  return (
    <div className="mt-6 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
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
        {puntos.map((item) => (
          <Marker
            key={item.id}
            position={{
              lat: parseFloat(item.latitud),
              lng: parseFloat(item.longitud),
            }}
            label={{ text: getEmojiForTipo(item.tipo), fontSize: "24px" }}
            onClick={() => setSelectedItem && setSelectedItem(item)}
            draggable={draggable}
            onDragEnd={(e) => handleDragEnd(e, item)}
          />
        ))}

        {selectedItem && (
          <InfoWindow
            position={{
              lat: parseFloat(selectedItem.latitud),
              lng: parseFloat(selectedItem.longitud),
            }}
            onCloseClick={() => setSelectedItem && setSelectedItem(null)}
          >
            <div className="text-sm text-gray-800">
              <h3 className="font-semibold text-gray-900 mb-1">
                {getEmojiForTipo(selectedItem.tipo)} {selectedItem.nombre}
              </h3>

              {(selectedItem.direccion || selectedItem.descripcion) && (
                <p className="text-xs text-gray-700 mb-1">
                  {selectedItem.direccion || selectedItem.descripcion}
                </p>
              )}

              {(selectedItem.nota || selectedItem.contacto) && (
                <p className="text-xs text-gray-700 mb-1">
                  {selectedItem.nota || selectedItem.contacto}
                </p>
              )}

              <p className="text-xs text-gray-600">
                Lat: {selectedItem.latitud} | Lng: {selectedItem.longitud}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default GeoMapViewer;
