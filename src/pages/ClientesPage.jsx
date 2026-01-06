// src/pages/ClientesPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";

import ClientesFilter from "../components/clientes/ClientesFilter";
import ClientesTable from "../components/clientes/ClientesTable";

import {
  fetchClientes,
  deleteCliente,
  updateCliente,
  setSearch,
  setEstado,
  setPage,
  setPageSize,
  setOrdering,
} from "../store/slices/clientesSlice";

const AnimatedDiv = ({ children, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
  >
    {children}
  </motion.div>
);

const ModalShell = ({ open, title, children, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-neutral-950 ring-1 ring-neutral-800 shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-100">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="text-neutral-400 hover:text-neutral-200"
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div className="p-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ConfirmModal = ({ open, nombre, onClose, onConfirm, loading }) => (
  <ModalShell open={open} title="Confirmar" onClose={onClose}>
    <p className="text-sm text-neutral-300">
      ¿Seguro que querés eliminar a{" "}
      <span className="font-semibold text-neutral-100">{nombre}</span>?
    </p>

    <div className="mt-5 flex items-center justify-end gap-2">
      <button
        onClick={onClose}
        className="h-10 px-4 rounded-xl bg-neutral-900 text-neutral-200 ring-1 ring-neutral-700 hover:bg-neutral-800"
        disabled={loading}
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        className="h-10 px-4 rounded-xl bg-rose-600/90 text-white hover:bg-rose-600 ring-1 ring-rose-500/40 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Eliminando..." : "Eliminar"}
      </button>
    </div>
  </ModalShell>
);

const EditClienteModal = ({ open, cliente, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    dni_cuit_cuil: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: cliente?.nombre ?? "",
      apellido: cliente?.apellido ?? "",
      telefono: cliente?.telefono ?? "",
      email: cliente?.email ?? "",
      dni_cuit_cuil: cliente?.dni_cuit_cuil ?? "",
    });
  }, [open, cliente]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <ModalShell open={open} title="Editar cliente" onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-neutral-300">
          Nombre
          <input
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            className="mt-1 w-full h-11 rounded-xl bg-neutral-900 text-neutral-100 ring-1 ring-neutral-700 px-3 outline-none focus:ring-2 focus:ring-primary-400"
          />
        </label>

        <label className="text-sm text-neutral-300">
          Apellido
          <input
            value={form.apellido}
            onChange={(e) => set("apellido", e.target.value)}
            className="mt-1 w-full h-11 rounded-xl bg-neutral-900 text-neutral-100 ring-1 ring-neutral-700 px-3 outline-none focus:ring-2 focus:ring-primary-400"
          />
        </label>

        <label className="text-sm text-neutral-300">
          Teléfono
          <input
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            className="mt-1 w-full h-11 rounded-xl bg-neutral-900 text-neutral-100 ring-1 ring-neutral-700 px-3 outline-none focus:ring-2 focus:ring-primary-400"
          />
        </label>

        <label className="text-sm text-neutral-300">
          DNI/CUIT/CUIL
          <input
            value={form.dni_cuit_cuil}
            onChange={(e) => set("dni_cuit_cuil", e.target.value)}
            className="mt-1 w-full h-11 rounded-xl bg-neutral-900 text-neutral-100 ring-1 ring-neutral-700 px-3 outline-none focus:ring-2 focus:ring-primary-400"
          />
        </label>

        <label className="text-sm text-neutral-300 sm:col-span-2">
          Email
          <input
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="mt-1 w-full h-11 rounded-xl bg-neutral-900 text-neutral-100 ring-1 ring-neutral-700 px-3 outline-none focus:ring-2 focus:ring-primary-400"
          />
        </label>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="h-10 px-4 rounded-xl bg-neutral-900 text-neutral-200 ring-1 ring-neutral-700 hover:bg-neutral-800"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          className="h-10 px-4 rounded-xl bg-primary-400 text-black hover:bg-primary-300 ring-1 ring-primary-400/40 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </ModalShell>
  );
};

const ClientesPage = () => {
  const dispatch = useDispatch();

  const {
    clientes = [],
    count = 0,
    status,
    error,
    search = "",
    estado = "todos",
    page = 1,
    pageSize = 25,
    ordering = "-id",
  } = useSelector((s) => s.clientes);

  const total = Number.isFinite(count) ? count : 0;

  const [clienteAEliminar, setClienteAEliminar] = useState(null);
  const [clienteAEditar, setClienteAEditar] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch server-side (✅ NO pedimos 5000)
  useEffect(() => {
    const promise = dispatch(
      fetchClientes({
        page,
        page_size: pageSize,
        search,
        estado,
        ordering,
      })
    );

    // ✅ abort si cambia filtro/página rápido
    return () => {
      if (promise?.abort) promise.abort();
    };
  }, [dispatch, page, pageSize, search, estado, ordering]);

  const handleBuscar = useCallback(
    (texto) => {
      dispatch(setSearch(texto || ""));
    },
    [dispatch]
  );

  const handleEstado = useCallback(
    (nuevoEstado) => {
      dispatch(setEstado(nuevoEstado || "todos"));
    },
    [dispatch]
  );

  const handlePageChange = useCallback(
    (p) => {
      dispatch(setPage(p));
    },
    [dispatch]
  );

  const handlePageSizeChange = useCallback(
    (ps) => {
      dispatch(setPageSize(ps));
    },
    [dispatch]
  );

  const handleRefresh = useCallback(() => {
    dispatch(
      fetchClientes({
        page,
        page_size: pageSize,
        search,
        estado,
        ordering,
      })
    );
  }, [dispatch, page, pageSize, search, estado, ordering]);

  const headerSubtitle = useMemo(() => {
    if (status === "loading") return "Cargando...";
    if (total > 0) return `${total} cliente${total === 1 ? "" : "s"}`;
    return `${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`;
  }, [status, total, clientes.length]);

  const onConfirmDelete = async () => {
    if (!clienteAEliminar?.id) return;
    try {
      setSaving(true);
      await dispatch(deleteCliente(clienteAEliminar.id)).unwrap();
      setClienteAEliminar(null);

      // Si quedó una página vacía, volvemos a la anterior
      const maxPage = Math.max(1, Math.ceil((total - 1) / pageSize));
      if (page > maxPage) dispatch(setPage(maxPage));
    } finally {
      setSaving(false);
    }
  };

  const onSaveEdit = async (patch) => {
    if (!clienteAEditar?.id) return;
    try {
      setSaving(true);
      await dispatch(updateCliente({ id: clienteAEditar.id, ...patch })).unwrap();
      setClienteAEditar(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 sm:px-6 py-6">
      <AnimatedDiv className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Clientes
            </h1>
            <p className="text-sm text-neutral-400 mt-1">{headerSubtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(setOrdering("-id"))}
              className={`h-10 px-3 rounded-xl ring-1 ${
                ordering === "-id"
                  ? "bg-neutral-800 ring-neutral-600 text-neutral-100"
                  : "bg-neutral-900 ring-neutral-800 text-neutral-300 hover:bg-neutral-800"
              }`}
              title="Orden: más nuevos"
            >
              Nuevos
            </button>

            <button
              onClick={() => dispatch(setOrdering("apellido"))}
              className={`h-10 px-3 rounded-xl ring-1 ${
                ordering === "apellido"
                  ? "bg-neutral-800 ring-neutral-600 text-neutral-100"
                  : "bg-neutral-900 ring-neutral-800 text-neutral-300 hover:bg-neutral-800"
              }`}
              title="Orden: apellido"
            >
              Apellido
            </button>

            <button
              onClick={handleRefresh}
              className="h-10 px-4 rounded-xl bg-neutral-900 text-neutral-200 ring-1 ring-neutral-800 hover:bg-neutral-800"
              title="Refrescar"
            >
              Refrescar
            </button>
          </div>
        </div>

        <ClientesFilter onFilterText={handleBuscar} onFilterEstado={handleEstado} />

        <div className="mt-4">
          {status === "loading" && (
            <div className="rounded-2xl bg-neutral-900/30 ring-1 ring-neutral-800 p-4">
              <p className="text-neutral-300 text-sm">Cargando clientes...</p>
            </div>
          )}

          {status === "failed" && (
            <div className="rounded-2xl bg-rose-950/20 ring-1 ring-rose-900/40 p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-rose-200 font-semibold">Error</p>
                <p className="text-rose-200/80 text-sm mt-1">
                  {typeof error === "string"
                    ? error
                    : "No se pudo cargar el listado."}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                className="h-10 px-4 rounded-xl bg-neutral-900 text-neutral-200 ring-1 ring-neutral-800 hover:bg-neutral-800"
              >
                Reintentar
              </button>
            </div>
          )}

          {status === "succeeded" && clientes.length === 0 && (
            <div className="rounded-2xl bg-neutral-900/20 ring-1 ring-neutral-800 p-4">
              <p className="text-neutral-300 text-sm">
                No hay clientes que coincidan con la búsqueda.
              </p>
            </div>
          )}

          {clientes.length > 0 && (
            <div className="mt-3">
              <ClientesTable
                clientes={clientes}
                // ✅ Modo servidor (la tabla ya lo soporta)
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showFooter={true}
              />

              {/* Acciones rápidas (opcionales) */}
              <div className="mt-3 text-xs text-neutral-500">
                Tip: para editar/eliminar, avisame y te dejo botones por fila en
                la tabla con los modales conectados (queda prolijo y rápido).
              </div>

              {/* Demo: si querés disparar modales desde afuera */}
              {/* setClienteAEditar(clientes[0]); setClienteAEliminar(clientes[0]); */}
            </div>
          )}
        </div>
      </AnimatedDiv>

      {/* Modales (listos para conectar cuando agreguemos acciones en la tabla) */}
      <ConfirmModal
        open={!!clienteAEliminar}
        nombre={`${clienteAEliminar?.nombre ?? ""} ${clienteAEliminar?.apellido ?? ""}`.trim()}
        onClose={() => setClienteAEliminar(null)}
        onConfirm={onConfirmDelete}
        loading={saving}
      />

      <EditClienteModal
        open={!!clienteAEditar}
        cliente={clienteAEditar}
        onClose={() => setClienteAEditar(null)}
        onSave={onSaveEdit}
        loading={saving}
      />
    </div>
  );
};

export default ClientesPage;
