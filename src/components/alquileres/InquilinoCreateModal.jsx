// src/components/alquileres/InquilinoCreateModal.jsx

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { createInquilino, fetchInquilinos } from '../../store/slices/alquileresSlice'
import ModalWrapper from '../comunes/ModalWrapper'

const InquilinoCreateModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await dispatch(createInquilino(form))
    dispatch(fetchInquilinos())
    onClose()
    setForm({ nombre: '', telefono: '', email: '', direccion: '' })
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Nuevo Inquilino">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full p-2 border rounded" required />
        <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="w-full p-2 border rounded" required />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded" />
        <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" className="w-full p-2 border rounded" />

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Guardar inquilino
        </button>
      </form>
    </ModalWrapper>
  )
}

export default InquilinoCreateModal
