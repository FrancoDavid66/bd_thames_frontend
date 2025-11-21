import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSiniestros, addSiniestro, editSiniestro, removeSiniestro } from '../store/slices/siniestrosSlice';
import SiniestrosList from '../components/siniestros/SiniestrosList';
import SiniestrosForm from '../components/siniestros/SiniestrosForm';
import SiniestrosDetails from '../components/siniestros/SiniestrosDetails';
import SiniestrosDeleteModal from '../components/siniestros/SiniestrosDeleteModal';
import { toast } from 'react-hot-toast';

const SiniestrosPage = () => {
  const dispatch = useDispatch();
  const { siniestros, loading } = useSelector((state) => state.siniestros);
  const [selectedSiniestro, setSelectedSiniestro] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    dispatch(getSiniestros());
  }, [dispatch]);

  const handleAdd = async (data) => {
    try {
      await dispatch(addSiniestro(data)).unwrap();
      toast.success('Siniestro creado exitosamente');
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Error al crear el siniestro');
    }
  };

  const handleEdit = async (data) => {
    try {
      await dispatch(editSiniestro({ id: selectedSiniestro.id, siniestro: data })).unwrap();
      toast.success('Siniestro actualizado');
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Error al actualizar el siniestro');
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(removeSiniestro(selectedSiniestro.id)).unwrap();
      toast.success('Siniestro eliminado');
      setIsDeleteOpen(false);
    } catch (err) {
      toast.error('Error al eliminar el siniestro');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gestión de Siniestros</h1>
      <button onClick={() => setIsFormOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded mb-4">Nuevo Siniestro</button>
      {loading ? (
        <p>Cargando siniestros...</p>
      ) : (
        <SiniestrosList
          siniestros={siniestros}
          onView={(siniestro) => { setSelectedSiniestro(siniestro); setIsDetailOpen(true); }}
          onEdit={(siniestro) => { setSelectedSiniestro(siniestro); setIsFormOpen(true); }}
          onDelete={(siniestro) => { setSelectedSiniestro(siniestro); setIsDeleteOpen(true); }}
        />
      )}
      <SiniestrosForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={selectedSiniestro ? handleEdit : handleAdd}
        initialData={selectedSiniestro}
      />
      <SiniestrosDetails
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        siniestro={selectedSiniestro}
      />
      <SiniestrosDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default SiniestrosPage;
