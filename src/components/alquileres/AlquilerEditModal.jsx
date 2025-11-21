import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { updateAlquiler, fetchAlquileres } from '../../store/slices/alquileresSlice'
import ModalWrapper from '../comunes/ModalWrapper'
import axios from 'axios'

const AlquilerEditModal = ({ isOpen, onClose, alquiler }) => {
  const dispatch = useDispatch()
  const [form, setForm] = useState(null)
  const [propietariosDisponibles, setPropietariosDisponibles] = useState([])
  const [inquilinosDisponibles, setInquilinosDisponibles] = useState([])

  useEffect(() => {
    const fetchDatos = async () => {
      const prop = await axios.get('http://127.0.0.1:8000/api/alquileres/propietarios/')
      const inq = await axios.get('http://127.0.0.1:8000/api/alquileres/inquilinos/')
      setPropietariosDisponibles(prop.data)
      setInquilinosDisponibles(inq.data)
    }

    if (isOpen && alquiler) {
      fetchDatos()
      setForm({
        ...alquiler,
        propietarios: alquiler.propietarios || [],
        inquilinos: alquiler.inquilinos || [],
      })
    }
  }, [isOpen, alquiler])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleMultiSelectChange = (e, field) => {
    const values = Array.from(e.target.selectedOptions, (option) => parseInt(option.value))
    setForm((prev) => ({ ...prev, [field]: values }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, id: alquiler.id }
    await dispatch(updateAlquiler(payload))
    dispatch(fetchAlquileres())
    onClose()
  }

  if (!form) return null

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Editar Alquiler">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

        <div className="col-span-2">
          <label className="block mb-1">Dirección</label>
          <input name="direccion" value={form.direccion} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Partido</label>
          <input name="partido" value={form.partido} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Localidad</label>
          <input name="localidad" value={form.localidad} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div className="col-span-2">
          <label className="block mb-1">Requisitos</label>
          <textarea name="requisitos" value={form.requisitos} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Propietarios</label>
          <select
            multiple
            value={form.propietarios}
            onChange={(e) => handleMultiSelectChange(e, 'propietarios')}
            className="w-full p-2 rounded border h-[100px]"
          >
            {propietariosDisponibles.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Inquilinos</label>
          <select
            multiple
            value={form.inquilinos}
            onChange={(e) => handleMultiSelectChange(e, 'inquilinos')}
            className="w-full p-2 rounded border h-[100px]"
          >
            {inquilinosDisponibles.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Fecha de inicio</label>
          <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Fecha de fin</label>
          <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Precio de alquiler</label>
          <input type="number" name="precio_alquiler" value={form.precio_alquiler} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Aumento cada (meses)</label>
          <input type="number" name="aumento_cada_meses" value={form.aumento_cada_meses} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div className="col-span-2">
          <label className="block mb-1">Porcentaje de aumento (%)</label>
          <input type="number" step="0.01" name="porcentaje_aumento" value={form.porcentaje_aumento} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div className="col-span-2">
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Guardar cambios
          </button>
        </div>
      </form>
    </ModalWrapper>
  )
}

export default AlquilerEditModal
