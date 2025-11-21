// src/pages/GeoPage.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchGeoItems, createGeoItem } from '../store/slices/geoSlice'
import GeoMapViewer from '../components/geo/GeoMapViewer'
import GeoTable from '../components/geo/GeoTable'
import GeoFormModal from '../components/geo/GeoFormModal'
import GeoControlPanel from '../components/geo/GeoControlPanel'
import { extraerCoordsDesdeUrl } from '../utils/geoUtils'
import PanelToggle from '../components/comunes/PanelToggle'

const GeoPage = () => {
  const dispatch = useDispatch()
  const { list: geoItems } = useSelector((state) => state.geo)

  const [selectedItem, setSelectedItem] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [distanceResult, setDistanceResult] = useState(null)
  const [filters, setFilters] = useState(['propia', 'rival', 'cartel', 'alquiler', 'potencial'])

  const [draggableEnabled, setDraggableEnabled] = useState(false)
  const [clusterEnabled, setClusterEnabled] = useState(true)
  const [nightMode, setNightMode] = useState(false)
  const [center, setCenter] = useState({ lat: -34.7611, lng: -58.5861 })

  const [mostrarRadios, setMostrarRadios] = useState(false)           // ✅ NUEVO
  const [radiosSeleccionados, setRadiosSeleccionados] = useState([]) // ✅ NUEVO

  const [formData, setFormData] = useState({
    tipo: '',
    nombre: '',
    descripcion: '',
    latitud: '',
    longitud: '',
    contacto: '',
    precio_estimado: '',
    activa: true,
    url_maps: '',
  })

  useEffect(() => {
    dispatch(fetchGeoItems())
  }, [dispatch])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'url_maps') {
      const coords = extraerCoordsDesdeUrl(value)
      if (coords) {
        setFormData((prev) => ({
          ...prev,
          url_maps: value,
          latitud: coords.latitud,
          longitud: coords.longitud,
        }))
        toast.success('Coordenadas extraídas correctamente')
      } else {
        setFormData((prev) => ({ ...prev, url_maps: value }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        latitud: parseFloat(formData.latitud),
        longitud: parseFloat(formData.longitud),
        precio_estimado: formData.precio_estimado
          ? parseFloat(formData.precio_estimado)
          : null,
      }
      await dispatch(createGeoItem(payload)).unwrap()
      toast.success('Item creado')
      setFormData({
        tipo: '',
        nombre: '',
        descripcion: '',
        latitud: '',
        longitud: '',
        contacto: '',
        precio_estimado: '',
        activa: true,
        url_maps: '',
      })
    } catch (err) {
      toast.error('Error al crear item')
    }
  }

  const handleDistanceCalc = (p1, p2) => {
    if (window.google?.maps?.geometry?.spherical) {
      const latLng1 = new window.google.maps.LatLng(p1.latitud, p1.longitud)
      const latLng2 = new window.google.maps.LatLng(p2.latitud, p2.longitud)
      const meters = window.google.maps.geometry.spherical.computeDistanceBetween(latLng1, latLng2)
      setDistanceResult({ points: [p1, p2], meters })
    } else {
      toast.error('Google Maps Geometry API no disponible')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Mapa Estratégico
        </h1>
        <button
          onClick={() => setFormOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          + Nuevo punto
        </button>
      </div>

      {/* Panel de control plegable */}
      <PanelToggle title="🎛️ Panel de Control Estratégico">
        <GeoControlPanel
          geoItems={geoItems}
          onDistanceCalc={handleDistanceCalc}
          filters={filters}
          onFiltersChange={setFilters}
          onUseMyLocation={setCenter}
          draggableEnabled={draggableEnabled}
          onToggleDraggable={() => setDraggableEnabled((prev) => !prev)}
          clusterEnabled={clusterEnabled}
          onToggleCluster={() => setClusterEnabled((prev) => !prev)}
          nightMode={nightMode}
          onToggleNightMode={() => setNightMode((prev) => !prev)}
          onPolygonDraw={() => toast('Funcionalidad de polígono en desarrollo')}
          mostrarRadios={mostrarRadios}
          onToggleRadios={() => setMostrarRadios(prev => !prev)}
          radiosSeleccionados={radiosSeleccionados}
          onChangeRadios={setRadiosSeleccionados}
        />
      </PanelToggle>

      <GeoMapViewer
        geoItems={geoItems}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        distanceResult={distanceResult}
        filters={filters}
        draggable={draggableEnabled}
        clusterEnabled={clusterEnabled}
        nightMode={nightMode}
        center={center}
        mostrarRadios={mostrarRadios}
        radiosSeleccionados={radiosSeleccionados}
      />

      <GeoFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />

      <GeoTable
        geoItems={geoItems}
        onEdit={(item) => toast(`Editar ${item.nombre}`)}
        onDelete={(item) => toast(`Eliminar ${item.nombre}`)}
      />
    </div>
  )
}

export default GeoPage
