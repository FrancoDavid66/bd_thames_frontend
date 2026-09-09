// src/pages/PropiedadesPage.jsx
//
// 🆕 Esta página usaba botones azules/genéricos sueltos, sin los tokens
// de la app (ni siquiera modo oscuro). Se llevó al mismo sistema que el
// resto de Thames.
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiPlus, HiOfficeBuilding } from 'react-icons/hi';
import { fetchPropiedades, deletePropiedad } from '../store/slices/propiedadesSlice';

import PropiedadTable from '../components/propiedades/PropiedadTable';
import PropiedadCreateModal from '../components/propiedades/PropiedadCreateModal';
import PropiedadEditModal from '../components/propiedades/PropiedadEditModal';
import ConfirmModal from '../components/comunes/ConfirmModal';
import Boton3D from '../components/ui/Boton3D';

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
    <div className="p-4 sm:p-6 bg-surface dark:bg-surface-dark min-h-[100dvh] text-titulo dark:text-titulo-dark">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center shrink-0">
            <HiOfficeBuilding className="text-duo-violeta text-lg" />
          </div>
          <h1 className="text-xl font-semibold">Propiedades registradas</h1>
        </div>
        <Boton3D variant="violeta" size="sm" onClick={() => setModalCrearAbierto(true)}>
          <HiPlus /> Nueva propiedad
        </Boton3D>
      </div>

      {status === 'loading' && <p className="text-[13px] text-suave dark:text-suave-dark">Cargando propiedades...</p>}
      {status === 'failed' && (
        <div className="rounded-lg border border-duo-rojo/30 bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3 text-[13px] font-medium text-duo-rojo">
          {error}
        </div>
      )}
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
