// src/pages/ClientesPage.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import React from "react";

import {
  fetchClientes,
  deleteCliente,
  updateCliente,
  setSearch,
  setEstado,
} from "../store/slices/clientesSlice";

import ClientesFilter from "../components/clientes/ClientesFilter";
import ClientesTable from "../components/clientes/ClientesTable";

import ConfirmModal from "../components/comunes/ConfirmModal";
import ClienteEditModal from "../components/clientes/ClienteEditModal";
import ClienteCreateModal from "../components/clientes/ClienteCreateModal";
import { FaPlus } from "react-icons/fa";

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
    search = "",
    estado = "todos",
    status,
  } = useSelector((state) => state.clientes);

  const totalMostrado =
    Number.isFinite(count) && count > 0 ? count : clientes.length;

  const handleBuscar = (texto) => {
    dispatch(setSearch(texto));
  };

  const handleFiltrarEstado = (nuevoEstado) => {
    dispatch(setEstado(nuevoEstado));
  };

  // Traemos “todo” (page 1 con page_size grande) y dejamos que la tabla pagina en LOCAL
  useEffect(() => {
    dispatch(
      fetchClientes({
        page: 1,
        page_size: FETCH_ALL_PAGE_SIZE,
        search,
        estado,
      })
    );
  }, [dispatch, search, estado]);

  // Modales locales
  const [clienteAEliminar, setClienteAEliminar] = React.useState(null);
  const [clienteAEditar, setClienteAEditar] = React.useState(null);
  const [modalCrearAbierto, setModalCrearAbierto] = React.useState(false);

  return (
    <AnimatedDiv className="h-full w-full flex flex-col bg-gray-900 text-white rounded-xl sm:rounded-2xl shadow-xl px-4 py-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header + botón (responsive) */}
      <AnimatedDiv className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Clientes Registrados{" "}
          <span className="text-sm sm:text-base font-normal text-gray-400">
            ({totalMostrado})
          </span>
        </h1>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setModalCrearAbierto(true)}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 sm:h-10 px-4 rounded-lg bg-emerald-500 text-sm sm:text-base font-medium text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-md shadow-emerald-500/20"
        >
          <FaPlus className="text-sm" />
          <span>Nuevo Cliente</span>
        </motion.button>
      </AnimatedDiv>

      {/* Filtros arriba, con algo de separación en mobile */}
      <div className="mb-3 sm:mb-4">
        <ClientesFilter
          onFilterText={handleBuscar}
          onFilterEstado={handleFiltrarEstado}
        />
      </div>

      {/* Contenido scrollable tipo “chat” */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 sm:pr-2 pb-4">
        {status === "loading" && (
          <p className="text-blue-400 text-sm sm:text-base">
            Cargando clientes...
          </p>
        )}

        {status === "failed" && (
          <AnimatedDiv className="text-red-400 flex flex-col sm:flex-row sm:items-center gap-2 text-sm sm:text-base">
            <p>Error al cargar clientes.</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                dispatch(
                  fetchClientes({
                    page: 1,
                    page_size: FETCH_ALL_PAGE_SIZE,
                    search,
                    estado,
                  })
                )
              }
              className="self-start sm:self-auto inline-flex items-center text-xs sm:text-sm text-blue-300 hover:text-blue-200 underline underline-offset-2"
            >
              Reintentar
            </motion.button>
          </AnimatedDiv>
        )}

        {status === "succeeded" && clientes.length > 0 && (
          <>
            {/* MODO LOCAL: no pasamos page/total/onPageChange, la tabla pagina sola */}
            <ClientesTable clientes={clientes} showFooter={true} />
          </>
        )}

        {status === "succeeded" && clientes.length === 0 && (
          <p className="text-gray-400 text-sm sm:text-base">
            No hay clientes que coincidan con la búsqueda.
          </p>
        )}
      </div>

      {/* Modales */}
      <ConfirmModal
        isOpen={!!clienteAEliminar}
        onClose={() => setClienteAEliminar(null)}
        nombre={`${clienteAEliminar?.nombre ?? ""} ${
          clienteAEliminar?.apellido ?? ""
        }`}
        onConfirm={() =>
          dispatch(deleteCliente(clienteAEliminar.id)).finally(() =>
            setClienteAEliminar(null)
          )
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
          dispatch(
            fetchClientes({
              page: 1,
              page_size: FETCH_ALL_PAGE_SIZE,
              search,
              estado,
            })
          )
        }
      />
    </AnimatedDiv>
  );
};

export default ClientesPage;
