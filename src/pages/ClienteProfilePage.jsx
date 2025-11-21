// src/pages/ClienteProfilePage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { fetchClientes, updateCliente, deleteCliente } from '../store/slices/clientesSlice';

import ClienteEditModal from '../components/clientes/ClienteEditModal';
import ClienteDatosPersonalesCard from '../components/clientes/ClienteDatosPersonalesCard';
import ClienteDocumentacionCard from '../components/clientes/ClienteDocumentacionCard';
import ClientePolizasCard from '../components/clientes/ClientePolizasCard';

import PolizaCreateModal from '../components/polizas/PolizaCreateModal';
import BotonEditarCliente from '../components/comunes/BotonEditarCliente';
// ❌ Botón de crear póliza removido del header
// import BotonCrearPoliza from '../components/comunes/BotonCrearPoliza';
import BotonBorrarCliente from '../components/comunes/BotonBorrarCliente';
import ConfirmModal from '../components/comunes/ConfirmModal';

const ClienteProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { clientes, status, error } = useSelector((state) => state.clientes);

  const cliente = Array.isArray(clientes)
    ? clientes.find((c) => c.id === Number(id))
    : undefined;

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [modalCrearPolizaAbierto, setModalCrearPolizaAbierto] = useState(false);

  useEffect(() => {
    if (!cliente) dispatch(fetchClientes({ page: 1 }));
  }, [dispatch, cliente]);

  const handleSaveCliente = async (updated) => {
    try {
      await dispatch(updateCliente(updated)).unwrap();
      toast.success('Cliente actualizado');
      setModalEditarAbierto(false);
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const handleBorrarCliente = async () => {
    try {
      await dispatch(deleteCliente(cliente.id)).unwrap();
      toast.success('Cliente eliminado');
      navigate('/clientes');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  // Lógica única para abrir modal de creación de póliza (usada desde la card)
  const abrirCrearPoliza = () => setModalCrearPolizaAbierto(true);

  const handlePolizaCreada = () => {
    dispatch(fetchClientes({ page: 1 }));
    setModalCrearPolizaAbierto(false);
  };

  if (status === 'loading') return <p className="p-6">Cargando…</p>;
  if (status === 'failed') return <p className="p-6">Error: {error}</p>;
  if (!cliente) return <p className="p-6">Cargando cliente…</p>;

  return (
    <motion.div
      className="max-w-6xl mx-auto p-6 md:p-8 bg-[#0f172a] text-white rounded-2xl shadow-xl space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center gap-4 border-b border-white/10 pb-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          <span className="text-white/60">Perfil de</span>{' '}
          <span className="text-white">
            {`${cliente?.nombre ?? ''} ${cliente?.apellido ?? ''}`.trim()}
          </span>
        </h1>
        <div className="flex gap-3">
          <BotonEditarCliente onClick={() => setModalEditarAbierto(true)} />
          {/* Botón “Crear póliza” del header REMOVIDO */}
          <BotonBorrarCliente onClick={() => setModalEliminarAbierto(true)} />
        </div>
      </div>

      {/* Layout de tarjetas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <ClienteDatosPersonalesCard cliente={cliente} />
        </div>
        <div className="xl:col-span-2">
          <ClienteDocumentacionCard cliente={cliente} />
        </div>
      </div>

      {/* Pólizas asociadas del cliente (el “+” está dentro de esta card) */}
      <ClientePolizasCard cliente={cliente} onCrearPoliza={abrirCrearPoliza} />

      {/* Modales */}
      <ClienteEditModal
        isOpen={modalEditarAbierto}
        onClose={() => setModalEditarAbierto(false)}
        onSave={handleSaveCliente}
        cliente={cliente}
      />

      <PolizaCreateModal
        isOpen={modalCrearPolizaAbierto}
        onClose={() => setModalCrearPolizaAbierto(false)}
        onSuccess={handlePolizaCreada}
        clienteId={cliente?.id}
      />

      <ConfirmModal
        isOpen={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        nombre={`${cliente?.nombre ?? ''} ${cliente?.apellido ?? ''}`.trim()}
        onConfirm={handleBorrarCliente}
      />
    </motion.div>
  );
};

export default ClienteProfilePage;
