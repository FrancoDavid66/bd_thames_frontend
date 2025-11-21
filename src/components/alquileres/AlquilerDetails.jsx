import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const AlquilerDetails = () => {
  const { id } = useParams()
  const [alquiler, setAlquiler] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlquiler = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/alquileres/${id}/`)
        setAlquiler(res.data)
      } catch (error) {
        console.error('Error cargando alquiler:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlquiler()
  }, [id])

  if (loading) return <p>Cargando datos del alquiler...</p>
  if (!alquiler) return <p>No se encontró el alquiler.</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Detalle del alquiler</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 rounded shadow">
        <div><strong>Dirección:</strong> {alquiler.direccion}</div>
        <div><strong>Localidad:</strong> {alquiler.localidad}</div>
        <div><strong>Partido:</strong> {alquiler.partido}</div>
        <div><strong>Precio actual:</strong> ${alquiler.precio_alquiler}</div>
        <div><strong>Inicio:</strong> {alquiler.fecha_inicio}</div>
        <div><strong>Fin:</strong> {alquiler.fecha_fin}</div>
        <div className="sm:col-span-2"><strong>Requisitos:</strong> {alquiler.requisitos}</div>
      </div>

      <h2 className="text-xl font-semibold mt-6">Cuotas generadas</h2>
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white dark:bg-gray-800 text-sm text-left">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
            <tr>
              <th className="px-4 py-2">N°</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2">Pagado</th>
            </tr>
          </thead>
          <tbody>
            {alquiler.cuotas?.map((cuota) => (
              <tr
                key={cuota.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-2">{cuota.nro_cuota}</td>
                <td className="px-4 py-2">${cuota.monto}</td>
                <td className="px-4 py-2">{cuota.fecha_vencimiento}</td>
                <td className="px-4 py-2">
                  {cuota.pagado ? (
                    <span className="text-green-500 font-semibold">Sí</span>
                  ) : (
                    <span className="text-red-500 font-semibold">No</span>
                  )}
                </td>
              </tr>
            ))}
            {alquiler.cuotas?.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-500">
                  No hay cuotas generadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NUEVA SECCIÓN GARANTES */}
      {alquiler.inquilinos?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Garantes de los inquilinos</h2>
          {alquiler.inquilinos.map((inq) => (
            <div key={inq.id} className="mb-4">
              <p className="font-bold text-sm mb-1">{inq.nombre}</p>
              {inq.garantes?.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
                  {inq.garantes.map((g) => (
                    <li key={g.id}>
                      {g.nombre} – {g.telefono}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Sin garantes asignados.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AlquilerDetails
