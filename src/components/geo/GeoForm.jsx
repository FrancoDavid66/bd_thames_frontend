// src/components/geo/GeoForm.jsx
const GeoForm = ({ formData, handleChange, handleSubmit }) => {
    return (
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <select
          name="tipo"
          value={formData.tipo}
          onChange={handleChange}
          required
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        >
          <option value="">Tipo</option>
          <option value="propia">Oficina propia</option>
          <option value="rival">Oficina rival</option>
          <option value="cartel">Espacio publicitario</option>
          <option value="alquiler">Alquiler disponible</option>
          <option value="potencial">Ubicación futura</option>
        </select>
  
        <input
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          placeholder="Nombre"
          required
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
  
        <input
          name="url_maps"
          value={formData.url_maps}
          onChange={handleChange}
          placeholder="Pegar URL de Google Maps"
          className="p-2 border rounded col-span-2 dark:bg-gray-800 dark:text-white"
        />
  
        <input
          name="latitud"
          value={formData.latitud}
          onChange={handleChange}
          placeholder="Latitud"
          required
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
  
        <input
          name="longitud"
          value={formData.longitud}
          onChange={handleChange}
          placeholder="Longitud"
          required
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
  
        <input
          name="contacto"
          value={formData.contacto}
          onChange={handleChange}
          placeholder="Contacto"
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
  
        <input
          name="precio_estimado"
          value={formData.precio_estimado}
          onChange={handleChange}
          placeholder="Precio"
          className="p-2 border rounded dark:bg-gray-800 dark:text-white"
        />
  
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          placeholder="Descripción"
          className="p-2 border rounded col-span-2 dark:bg-gray-800 dark:text-white"
        />
  
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            name="activa"
            checked={formData.activa}
            onChange={handleChange}
          /> Activa
        </label>
  
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Crear punto
        </button>
      </form>
    )
  }
  
  export default GeoForm
  