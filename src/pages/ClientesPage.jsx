// src/pages/ClientesPage.jsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import React from 'react';

import {
  fetchClientes,
  deleteCliente,
  updateCliente,
  setSearch,
  setEstado,
} from '../store/slices/clientesSlice';

import ClientesFilter from '../components/clientes/ClientesFilter';
import ClientesTable from '../components/clientes/ClientesTable';

import ConfirmModal from '../components/comunes/ConfirmModal';
import ClienteEditModal from '../components/clientes/ClienteEditModal';
import ClienteCreateModal from '../components/clientes/ClienteCreateModal';
import { FaPlus } from 'react-icons/fa';

const AnimatedDiv = ({ children, className }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Usa un valor que no supere el max_page_size del backend (recomendado 5000)
const FETCH_ALL_PAGE_SIZE = 5000;

const ClientesPage = () => {
  const dispatch = useDispatch();
  const {
    clientes = [],
    count = 0,
    search = '',
    estado = 'todos',
    status,
  } = useSelector((state) => state.clientes);

  const totalMostrado = Number.isFinite(count) && count > 0 ? count : clientes.length;

  const handleBuscar = (texto) => {
    dispatch(setSearch(texto));
  };

  const handleFiltrarEstado = (nuevoEstado) => {
    dispatch(setEstado(nuevoEstado));
  };

  // Traemos “todo” (page 1 con page_size grande) y dejamos que la tabla pagina en LOCAL
  useEffect(() => {
    dispatch(fetchClientes({ page: 1, page_size: FETCH_ALL_PAGE_SIZE, search, estado }));
  }, [dispatch, search, estado]);

  // Modales locales
  const [clienteAEliminar, setClienteAEliminar] = React.useState(null);
  const [clienteAEditar, setClienteAEditar] = React.useState(null);
  const [modalCrearAbierto, setModalCrearAbierto] = React.useState(false);

  return (
    <AnimatedDiv className="p-8 space-y-6 bg-gray-800 text-white rounded-lg shadow-xl">
      <AnimatedDiv className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          Clientes Registrados ({totalMostrado})
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setModalCrearAbierto(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 shadow-md"
        >
          <FaPlus /> Nuevo Cliente
        </motion.button>
      </AnimatedDiv>

      <ClientesFilter
        onFilterText={handleBuscar}
        onFilterEstado={handleFiltrarEstado}
      />

      {status === 'loading' && <p className="text-blue-400">Cargando clientes...</p>}

      {status === 'failed' && (
        <AnimatedDiv className="text-red-500 flex items-center gap-2">
          <p>Error al cargar clientes.</p>
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() =>
              dispatch(fetchClientes({ page: 1, page_size: FETCH_ALL_PAGE_SIZE, search, estado }))
            }
            className="text-blue-400 underline"
          >
            Reintentar
          </motion.button>
        </AnimatedDiv>
      )}

      {status === 'succeeded' && clientes.length > 0 && (
        <>
          {/* MODO LOCAL: no pasamos page/total/onPageChange, la tabla pagina sola */}
          <ClientesTable
            clientes={clientes}
            showFooter={true}
          />
        </>
      )}

      {status === 'succeeded' && clientes.length === 0 && (
        <p className="text-gray-400">No hay clientes que coincidan con la búsqueda.</p>
      )}

      <ConfirmModal
        isOpen={!!clienteAEliminar}
        onClose={() => setClienteAEliminar(null)}
        nombre={`${clienteAEliminar?.nombre ?? ''} ${clienteAEliminar?.apellido ?? ''}`}
        onConfirm={() =>
          dispatch(deleteCliente(clienteAEliminar.id)).finally(() => setClienteAEliminar(null))
        }
      />

      <ClienteEditModal
        isOpen={!!clienteAEditar}
        onClose={() => setClienteAEditar(null)}
        cliente={clienteAEditar}
        onSave={(clienteEditado) => dispatch(updateCliente(clienteEditado))}
      />

      <ClienteCreateModal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        onSuccess={() =>
          dispatch(fetchClientes({ page: 1, page_size: FETCH_ALL_PAGE_SIZE, search, estado }))
        }
      />
    </AnimatedDiv>
  );
};

export default ClientesPage;
