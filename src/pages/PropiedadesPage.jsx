import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaPlus } from 'react-icons/fa';
import { fetchPropiedades, deletePropiedad } from '../store/slices/propiedadesSlice';

import PropiedadTable from '../components/propiedades/PropiedadTable';
import PropiedadCreateModal from '../components/propiedades/PropiedadCreateModal';
import PropiedadEditModal from '../components/propiedades/PropiedadEditModal';
import ConfirmModal from '../components/comunes/ConfirmModal';

const PropiedadesPage = () => {
  const dispatch = useDispatch();
  const { list: propiedades = [], status, error } = useSelector((state) => state.propiedades);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [propiedadAEditar, setPropiedadAEditar] = useState(null);
  const [propiedadAEliminar, setPropiedadAEliminar] = useState(null);

  useEffect(() => {
    dispatch(fetchPropiedades());
  }, [dispatch]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Propiedades registradas</h1>
        <button
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <FaPlus /> Nueva propiedad
        </button>
      </div>

      {status === 'loading' && <p>Cargando propiedades...</p>}
      {status === 'failed' && <p className="text-red-500">Error: {error}</p>}
      {status === 'succeeded' && (
        <PropiedadTable
          propiedades={propiedades}
          onEdit={setPropiedadAEditar}
          onDelete={setPropiedadAEliminar}
        />
      )}

      <PropiedadCreateModal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
      />

      <PropiedadEditModal
        isOpen={!!propiedadAEditar}
        propiedad={propiedadAEditar}
        onClose={() => setPropiedadAEditar(null)}
      />

      <ConfirmModal
        isOpen={!!propiedadAEliminar}
        onClose={() => setPropiedadAEliminar(null)}
        message={`¿Estás seguro de eliminar la propiedad en ${propiedadAEliminar?.direccion}?`}
        onConfirm={() => {
          dispatch(deletePropiedad(propiedadAEliminar.id));
          setPropiedadAEliminar(null);
        }}
      />
    </div>
  );
};

export default PropiedadesPage;
