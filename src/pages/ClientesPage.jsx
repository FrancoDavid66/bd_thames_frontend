// src/pages/ClientesPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { HiShieldCheck, HiRefresh, HiUserGroup, HiTrash, HiX, HiUserAdd } from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD Y COMPONENTES GLOBALES
import { useAuth } from "../context/AuthContext";
import ClienteCreateModal from "../components/clientes/ClienteCreateModal";
import ClienteEditModal from "../components/clientes/ClienteEditModal"; // ✅ Usamos el modal global corregido
import ClientesFilter from "../components/clientes/ClientesFilter";
import ClientesTable from "../components/clientes/ClientesTable";

import {
  fetchClientes,
  deleteCliente,
  setSearch,
  setEstado,
  setPage,
  setPageSize,
  setOrdering,
} from "../store/slices/clientesSlice";

const AnimatedDiv = ({ children, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// 📱 MODAL MOBILE-FIRST (Diseño consistente para toda la App)
const ModalShell = ({ open, title, children, onClose, icon }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                    {icon}
                  </div>
                )}
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tighter">
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <HiX className="text-xl" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto scrollbar-hide">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ConfirmModal = ({ open, nombre, onClose, onConfirm, loading }) => (
  <ModalShell open={open} title="Eliminar Registro" onClose={onClose} icon={<HiTrash className="text-rose-400" />}>
    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
       <div>
         <p className="text-sm text-rose-100 font-medium">
           ¿Confirmás la eliminación de <span className="font-bold text-white">"{nombre}"</span>?
         </p>
         <p className="text-[10px] text-rose-400/80 uppercase font-black tracking-widest mt-2">Esta acción no se puede deshacer.</p>
       </div>
    </div>

    <div className="mt-8 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/5 pt-4">
      <button
        onClick={onClose}
        className="w-full sm:w-auto h-12 sm:h-10 px-6 rounded-xl bg-white/5 text-white/60 font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
        disabled={loading}
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        className="w-full sm:w-auto h-12 sm:h-10 px-8 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-900/40 hover:bg-rose-500 disabled:opacity-50 transition-all"
        disabled={loading}
      >
        {loading ? "Borrando..." : "Eliminar Cliente"}
      </button>
    </div>
  </ModalShell>
);

const ClientesPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  // 🛡️ Filtro de permisos Admin
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

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
  const [clienteCrearAbierto, setClienteCrearAbierto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const promise = dispatch(fetchClientes({ page, page_size: pageSize, search, estado, ordering }));
    return () => { if (promise?.abort) promise.abort(); };
  }, [dispatch, page, pageSize, search, estado, ordering]);

  const handleBuscar = useCallback((texto) => { dispatch(setSearch(texto || "")); }, [dispatch]);
  const handleEstado = useCallback((nuevoEstado) => { dispatch(setEstado(nuevoEstado || "todos")); }, [dispatch]);
  const handlePageChange = useCallback((p) => { dispatch(setPage(p)); }, [dispatch]);
  const handlePageSizeChange = useCallback((ps) => { dispatch(setPageSize(ps)); }, [dispatch]);
  const handleRefresh = useCallback(() => { dispatch(fetchClientes({ page, page_size: pageSize, search, estado, ordering })); }, [dispatch, page, pageSize, search, estado, ordering]);

  const headerSubtitle = useMemo(() => {
    if (status === "loading") return "Sincronizando...";
    const val = total > 0 ? total : clientes.length;
    return `${val} cliente${val === 1 ? "" : "s"} registrado${val === 1 ? "" : "s"}`;
  }, [status, total, clientes.length]);

  const onConfirmDelete = async () => {
    if (!isWebAdmin) return toast.error("Permiso denegado");
    if (!clienteAEliminar?.id) return;
    try {
      setSaving(true);
      await dispatch(deleteCliente(clienteAEliminar.id)).unwrap();
      toast.success("Cliente eliminado");
      setClienteAEliminar(null);
      const maxPage = Math.max(1, Math.ceil((total - 1) / pageSize));
      if (page > maxPage) dispatch(setPage(maxPage));
    } catch (e) { toast.error("Error al borrar"); } finally { setSaving(false); }
  };

  // ✅ CORRECCIÓN: El modal de edición maneja su propio guardado.
  // Solo refrescamos la lista al terminar.
  const onSaveEdit = () => {
    setClienteAEditar(null);
    handleRefresh();
  };

  // ✅ CORRECCIÓN: Quitamos el toast duplicado de aquí (ya está en el hook)
  const onClienteCreado = () => {
    setClienteCrearAbierto(false);
    handleRefresh(); 
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b0f19] text-white px-4 sm:px-6 py-6 pb-24 overflow-x-hidden">
      <AnimatedDiv className="max-w-7xl mx-auto flex flex-col h-full min-h-[calc(100vh-100px)]">
        
        {/* Cabecera Adaptable */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
             <div className="h-12 w-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
               <HiUserGroup className="text-2xl" />
             </div>
             <div className="min-w-0 flex-1">
               <h1 className="text-xl sm:text-2xl font-black tracking-tighter uppercase truncate">Directorio General</h1>
               <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                 <div className="flex items-center gap-1.5 text-emerald-400">
                   <HiShieldCheck className="text-sm shrink-0" />
                   <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                      Sucursal: {user?.perfil?.oficina_nombre || 'Soporte'}
                   </span>
                 </div>
                 <span className="hidden sm:inline text-white/20">•</span>
                 <span className="text-[10px] text-white/30 uppercase tracking-widest whitespace-nowrap">
                    {headerSubtitle}
                 </span>
               </div>
             </div>
          </div>

          {/* Botones de Control (Grid en móvil) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <button
              onClick={() => setClienteCrearAbierto(true)}
              className="col-span-2 sm:col-span-1 h-12 sm:h-10 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/40 cursor-pointer"
            >
              <HiUserAdd className="text-sm" /> Nuevo Cliente
            </button>
            
            <button
              onClick={() => dispatch(setOrdering("-id"))}
              className={`h-11 sm:h-10 px-2 sm:px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                ordering === "-id" ? "bg-white text-black shadow-lg" : "bg-white/5 border border-white/10 text-white/40 hover:text-white"
              }`}
            >
              Nuevos
            </button>
            <button
              onClick={() => dispatch(setOrdering("apellido"))}
              className={`h-11 sm:h-10 px-2 sm:px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                ordering === "apellido" ? "bg-white text-black shadow-lg" : "bg-white/5 border border-white/10 text-white/40 hover:text-white"
              }`}
            >
              A-Z
            </button>
            <button
              onClick={handleRefresh}
              className="col-span-2 sm:col-span-1 h-11 sm:h-10 px-2 sm:px-4 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Refrescar"
            >
              <HiRefresh className={status === "loading" ? "animate-spin text-lg" : "text-lg"} />
              <span className="sm:hidden text-[10px] font-black uppercase tracking-widest">Actualizar</span>
            </button>
          </div>
        </div>

        <ClientesFilter onFilterText={handleBuscar} onFilterEstado={handleEstado} />

        {/* Tabla Principal */}
        <div className="mt-4 flex-1 min-h-[400px] flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
          
          {status === "loading" && clientes.length === 0 && (
            <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-3" />
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Sincronizando Sucursal...</p>
            </div>
          )}

          {status === "failed" && (
            <div className="m-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <HiShieldCheck className="text-rose-400 text-2xl shrink-0" />
                 <div>
                   <p className="text-rose-100 font-bold text-sm uppercase tracking-tight">Acceso Interrumpido</p>
                   <p className="text-rose-400/80 text-[10px] uppercase font-black tracking-widest mt-0.5 leading-snug">{error || "Error de servidor."}</p>
                 </div>
              </div>
              <button onClick={handleRefresh} className="h-10 px-6 rounded-xl bg-rose-500 text-white font-black uppercase text-[10px] w-full sm:w-auto">Reintentar</button>
            </div>
          )}

          {clientes.length > 0 && (
            <div className="flex-1 overflow-x-hidden flex flex-col h-full">
              {/* ✅ IMPORTANTE: ClientesTable debe recibir onEdit y onDelete si quieres botones por fila */}
              <ClientesTable 
                clientes={clientes} 
                page={page} 
                pageSize={pageSize} 
                total={total} 
                onPageChange={handlePageChange} 
                onPageSizeChange={handlePageSizeChange} 
                showFooter={true} 
              />
              <div className="p-3 border-t border-white/5 bg-black/20 text-center mt-auto">
                 <span className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest px-2">
                   {isWebAdmin ? "Modo Administrador: Control total de registros." : "Modo Operador: Base de datos protegida."}
                 </span>
              </div>
            </div>
          )}
        </div>
      </AnimatedDiv>

      {/* 🚀 MODAL DE ALTA (Admin ve selector de oficina) */}
      <ClienteCreateModal 
        isOpen={clienteCrearAbierto} 
        onClose={() => setClienteCrearAbierto(false)} 
        onSuccess={onClienteCreado} 
      />

      {/* 🚀 MODAL DE EDICIÓN GLOBAL */}
      <ClienteEditModal 
        isOpen={!!clienteAEditar} 
        cliente={clienteAEditar} 
        onClose={() => setClienteAEditar(null)} 
        onSave={onSaveEdit} 
      />

      {/* MODAL ELIMINAR */}
      <ConfirmModal 
        open={!!clienteAEliminar} 
        nombre={`${clienteAEliminar?.nombre ?? ""} ${clienteAEliminar?.apellido ?? ""}`.trim()} 
        onClose={() => setClienteAEliminar(null)} 
        onConfirm={onConfirmDelete} 
        loading={saving} 
      />
    </div>
  );
};

export default ClientesPage;