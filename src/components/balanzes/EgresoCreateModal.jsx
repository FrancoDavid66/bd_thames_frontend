import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createEgreso } from '../../store/slices/egresosSlice';
import ModalWrapper from '../comunes/ModalWrapper';

const EgresoCreateModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    descripcion: '',
    monto: '',
    categoria: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createEgreso(form));
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Nuevo Egreso">
      <form onSubmit={handleSubmit} className="space-y-4 text-zinc-800 dark:text-white">
        <input
          name="descripcion"
          onChange={handleChange}
          value={form.descripcion}
          required
          placeholder="Descripción"
          className="w-full p-2 border rounded bg-white dark:bg-zinc-800"
        />
        <input
          name="monto"
          type="number"
          step="0.01"
          onChange={handleChange}
          value={form.monto}
          required
          placeholder="Monto"
          className="w-full p-2 border rounded bg-white dark:bg-zinc-800"
        />
        <input
          name="categoria"
          onChange={handleChange}
          value={form.categoria}
          required
          placeholder="Categoría"
          className="w-full p-2 border rounded bg-white dark:bg-zinc-800"
        />
        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Guardar
        </button>
      </form>
    </ModalWrapper>
  );
};

export default EgresoCreateModal;
