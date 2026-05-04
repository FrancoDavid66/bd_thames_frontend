// src/pages/SiniestrosPage.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSiniestros, addSiniestro, editSiniestro, removeSiniestro } from '../store/slices/siniestrosSlice';
import SiniestrosList from '../components/siniestros/SiniestrosList';
import SiniestrosForm from '../components/siniestros/SiniestrosForm';
import SiniestrosDetails from '../components/siniestros/SiniestrosDetails';
import SiniestrosDeleteModal from '../components/siniestros/SiniestrosDeleteModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext'; // 🚀 Importamos para saber el rol

const SiniestrosPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

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
      toast.success('Siniestro creado exitosamente', { style: { background: '#10b981', color: '#fff' } });
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
    <div className="p-4 sm:p-6 w-full mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Centro de Siniestros</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isWebAdmin ? "Vista de Administrador: Control total de agencias" : "Gestión de reclamos de tu oficina"}
          </p>
        </div>
        <button 
          onClick={() => { setSelectedSiniestro(null); setIsFormOpen(true); }} 
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
        >
          + Cargar Nuevo Siniestro
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <SiniestrosList
          siniestros={siniestros}
          isWebAdmin={isWebAdmin} // 🚀 Pasamos el prop
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