import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  updateInquilino,
  fetchGarantes,
  createGarante,
  fetchInquilinos,
} from '../../store/slices/alquileresSlice'
import ModalWrapper from '../comunes/ModalWrapper'

const InquilinoEditModal = ({ isOpen, onClose, inquilino }) => {
  const dispatch = useDispatch()
  const { garantes } = useSelector((state) => state.alquileres)

  const [form, setForm] = useState(null)
  const [newGarante, setNewGarante] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    lugar_trabajo: '',
  })

  useEffect(() => {
    if (isOpen) dispatch(fetchGarantes())
    if (inquilino) {
      setForm({
        id: inquilino.id,
        nombre: inquilino.nombre,
        telefono: inquilino.telefono,
        email: inquilino.email || '',
        direccion: inquilino.direccion || '',
        garantes: inquilino.garantes || [],
      })
    }
  }, [inquilino, isOpen, dispatch])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleMultiSelectChange = (e) => {
    const values = Array.from(e.target.selectedOptions, (opt) => parseInt(opt.value))
    setForm((prev) => ({ ...prev, garantes: values }))
  }

  const handleNewGaranteChange = (e) => {
    const { name, value } = e.target
    setNewGarante((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddGarante = async () => {
    const res = await dispatch(createGarante(newGarante))
    if (res.payload?.id) {
      setForm((prev) => ({
        ...prev,
        garantes: [...prev.garantes, res.payload.id],
      }))
      setNewGarante({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        lugar_trabajo: '',
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await dispatch(updateInquilino(form))
    dispatch(fetchInquilinos())
    onClose()
  }

  if (!form) return null

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Editar Inquilino">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm max-w-2xl mx-auto">

        <div>
          <label className="block mb-1">Nombre</label>
          <input name="nombre" value={form.nombre} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Teléfono</label>
          <input name="telefono" value={form.telefono} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Email</label>
          <input name="email" value={form.email} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Dirección</label>
          <input name="direccion" value={form.direccion} onChange={handleChange} className="w-full p-2 rounded border" />
        </div>

        <div>
          <label className="block mb-1">Garantes</label>
          <select multiple value={form.garantes} onChange={handleMultiSelectChange} className="w-full p-2 rounded border">
            {garantes.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} - {g.telefono}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2 text-sm">Agregar garante nuevo</h3>
          <div className="grid grid-cols-2 gap-2">
            <input name="nombre" placeholder="Nombre" value={newGarante.nombre} onChange={handleNewGaranteChange} className="p-2 rounded border" />
            <input name="telefono" placeholder="Teléfono" value={newGarante.telefono} onChange={handleNewGaranteChange} className="p-2 rounded border" />
            <input name="email" placeholder="Email" value={newGarante.email} onChange={handleNewGaranteChange} className="p-2 rounded border" />
            <input name="direccion" placeholder="Dirección" value={newGarante.direccion} onChange={handleNewGaranteChange} className="p-2 rounded border" />
            <input name="lugar_trabajo" placeholder="Lugar de trabajo" value={newGarante.lugar_trabajo} onChange={handleNewGaranteChange} className="p-2 rounded border col-span-2" />
          </div>
          <button
            type="button"
            onClick={handleAddGarante}
            className="mt-2 text-sm bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
          >
            Agregar garante
          </button>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Guardar cambios
        </button>
      </form>
    </ModalWrapper>
  )
}

export default InquilinoEditModal
