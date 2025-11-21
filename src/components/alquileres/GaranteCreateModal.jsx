import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { createGarante, fetchGarantes } from '../../store/slices/alquileresSlice'
import ModalWrapper from '../comunes/ModalWrapper'

const GaranteCreateModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    lugar_trabajo: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await dispatch(createGarante(form))
    dispatch(fetchGarantes())
    onClose()
    setForm({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      lugar_trabajo: '',
    })
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Nuevo Garante">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm max-w-xl mx-auto">
        <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} className="w-full p-2 border rounded" />
        <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} className="w-full p-2 border rounded" />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full p-2 border rounded" />
        <input name="direccion" placeholder="Dirección" value={form.direccion} onChange={handleChange} className="w-full p-2 border rounded" />
        <input name="lugar_trabajo" placeholder="Lugar de trabajo" value={form.lugar_trabajo} onChange={handleChange} className="w-full p-2 border rounded" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Crear garante
        </button>
      </form>
    </ModalWrapper>
  )
}

export default GaranteCreateModal
