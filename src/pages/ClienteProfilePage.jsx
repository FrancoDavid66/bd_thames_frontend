// src/pages/ClienteProfilePage.jsx
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiUser, HiShieldCheck, HiExclamationCircle, HiExternalLink } from 'react-icons/hi';

import { useAuth } from '../context/AuthContext';
import { fetchClienteById, fetchClientes, updateCliente, deleteCliente } from '../store/slices/clientesSlice';

import ClienteEditModal from '../components/clientes/ClienteEditModal';
import ClienteDatosPersonalesCard from '../components/clientes/ClienteDatosPersonalesCard';
import ClienteDocumentacionCard from '../components/clientes/ClienteDocumentacionCard';
import ClientePolizasCard from '../components/clientes/ClientePolizasCard';
import PolizaCreateModal from '../components/polizas/PolizaCreateModal';
import BotonEditarCliente from '../components/comunes/BotonEditarCliente';
import BotonBorrarCliente from '../components/comunes/BotonBorrarCliente';
import ConfirmModal from '../components/comunes/ConfirmModal';

const ClienteProfilePage = () => {
  const { id } = useParams();
  const idKey = String(id ?? '');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const { clientes, status, error, byId, byIdStatus, byIdError } = useSelector((state) => state.clientes);

  const cliente = useMemo(() => {
    const cached = byId?.[idKey];
    if (cached) return cached;
    if (Array.isArray(clientes)) return clientes.find((c) => String(c?.id) === idKey);
    return undefined;
  }, [byId, idKey, clientes]);

  const detailStatus = byIdStatus?.[idKey] || 'idle';
  const detailError = byIdError?.[idKey] || null;

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [modalCrearPolizaAbierto, setModalCrearPolizaAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [cargandoPortal, setCargandoPortal] = useState(false);

  // 🚀 Abrir el Portal del Asegurado de este cliente (lo que ve el cliente) en otra pestaña.
  //    Pide el token al backend (lo crea si no existe) y abre el link.
  const handleVerPortal = async () => {
    if (!id || cargandoPortal) return;
    try {
      setCargandoPortal(true);

      // Base de la API (misma lógica que el resto del front)
      const API_ROOT = String(import.meta.env.VITE_API_URL || "")
        .trim().replace(/\/+$/, "").replace(/\/api$/i, "");
      const url = `${API_ROOT}/api/clientes/${id}/portal-link/`;

      const token = localStorage.getItem('access_token')
        || localStorage.getItem('token')
        || localStorage.getItem('jwt');

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token && token !== "undefined" && token !== "null"
            ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const path = data?.portal_path || (data?.token ? `/#/portal/${data.token}` : "");
      if (!path) throw new Error("Sin token");

      const full = `${window.location.origin}${path}`;
      window.open(full, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("No se pudo abrir el portal del cliente.");
    } finally {
      setCargandoPortal(false);
    }
  };

  // 🚀 MAGIA: Estado para inyectar la póliza al instante
  const [polizasNuevas, setPolizasNuevas] = useState([]);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchClienteById(id));
  }, [dispatch, id]);

  const handleSaveCliente = async (updated) => {
    try {
      await dispatch(updateCliente(updated)).unwrap();
      toast.success('Ficha actualizada correctamente');
      setModalEditarAbierto(false);
      if (id) dispatch(fetchClienteById(id));
    } catch { toast.error('No se pudo actualizar'); }
  };

  const handleBorrarCliente = async () => {
    if (!isWebAdmin) {
      toast.error('Acceso Denegado: Solo admins pueden borrar clientes.');
      setModalEliminarAbierto(false);
      return;
    }
    if (!cliente || eliminando) return;
    try {
      setEliminando(true);
      await dispatch(deleteCliente(cliente.id)).unwrap();
      toast.success('Cliente eliminado definitivamente');
      navigate('/clientes');
    } catch { toast.error('No se pudo eliminar'); } finally { setEliminando(false); }
  };

  const abrirCrearPoliza = () => setModalCrearPolizaAbierto(true);

  // 🚀 FIX: Atrapamos la póliza nueva e inyectamos al instante sin recargar la página
  const handlePolizaCreada = (nuevaPoliza) => {
    setModalCrearPolizaAbierto(false);
    
    // La agregamos localmente para que se vea YA MISMO en la tarjeta
    if (nuevaPoliza && nuevaPoliza.id) {
      setPolizasNuevas((prev) => [nuevaPoliza, ...prev]);
    }

    // Refrescamos Redux en segundo plano (con un mini delay para dar tiempo a la DB a asentar los datos)
    setTimeout(() => {
      if (id) dispatch(fetchClienteById(id));
      dispatch(fetchClientes({ page: 1 }));
    }, 600);
  };

  // 🚀 Fusionamos el cliente de Redux con las pólizas inyectadas en tiempo real
  const clienteParaMostrar = useMemo(() => {
    if (!cliente) return null;
    
    const polizasActuales = cliente.polizas || [];
    const idsActuales = new Set(polizasActuales.map(p => p.id));
    
    // Evitamos duplicados por si Redux ya se actualizó y trajo la póliza nueva
    const agregadas = polizasNuevas.filter(p => !idsActuales.has(p.id));
    
    return {
      ...cliente,
      polizas: [...agregadas, ...polizasActuales]
    };
  }, [cliente, polizasNuevas]);

  if (detailStatus === 'loading' || (status === 'loading' && !clienteParaMostrar)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="h-10 w-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-400/80">Cargando Ficha...</p>
      </div>
    );
  }

  if (detailStatus === 'failed' || (status === 'failed' && !clienteParaMostrar)) {
    // 🚨 Distinguimos el tipo de error para mostrar un mensaje útil
    const httpStatus = detailError?.status || null;
    let titulo, mensaje, icono;

    if (httpStatus === 404) {
      titulo = "Cliente no disponible";
      mensaje = "Este cliente pertenece a otra oficina o ya no existe. No tenés permisos para acceder a su ficha.";
    } else if (httpStatus === 403) {
      titulo = "Acceso denegado";
      mensaje = "Tu usuario no tiene permisos para ver este cliente.";
    } else if (httpStatus === 401) {
      titulo = "Sesión expirada";
      mensaje = "Volvé a iniciar sesión para continuar.";
    } else if (httpStatus >= 500) {
      titulo = "Error del servidor";
      mensaje = "El servidor tuvo un problema. Probá de nuevo en unos minutos.";
    } else {
      titulo = "Error de Conexión";
      mensaje = "No se pudo cargar la ficha del cliente.";
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <HiExclamationCircle className="text-rose-500/50 text-6xl mb-4" />
        <p className="text-sm font-bold text-rose-400 uppercase tracking-widest">{titulo}</p>
        <p className="text-sm text-slate-400 mt-2 max-w-md">{mensaje}</p>
        {httpStatus && (
          <p className="text-[10px] text-slate-600 mt-2 font-mono">HTTP {httpStatus}</p>
        )}
        <button onClick={() => navigate('/clientes')} className="mt-6 px-6 py-3 rounded-xl bg-white/5 text-white/60 font-bold uppercase text-[10px] hover:bg-white/10 transition-colors">
          Volver al Directorio
        </button>
      </div>
    );
  }

  if (!clienteParaMostrar) return null;

  return (
    <motion.div
      className="min-h-[100dvh] bg-[#0b0f19] text-white p-4 sm:p-6 lg:p-8 pb-24"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header Mobile-Friendly */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4 min-w-0">
             <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-lg">
               <HiUser className="text-4xl" />
             </div>
             <div className="min-w-0">
               <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                 Ficha #{clienteParaMostrar.id}
               </h2>
               <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter truncate text-white">
                 {`${clienteParaMostrar?.nombre ?? ''} ${clienteParaMostrar?.apellido ?? ''}`.trim()}
               </h1>
               <div className="flex items-center gap-2 mt-1">
                 <HiShieldCheck className="text-emerald-400 text-sm shrink-0" />
                 <span className="text-[9px] sm:text-[10px] text-emerald-400/80 font-black uppercase tracking-widest truncate">
                    Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
                 </span>
               </div>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleVerPortal}
              disabled={cargandoPortal}
              title="Abrir el portal que ve el cliente (otra pestaña)"
              className="w-full sm:w-auto h-12 sm:h-10 inline-flex justify-center items-center gap-2 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <HiExternalLink className="text-base" />
              {cargandoPortal ? "Abriendo..." : "Ver portal"}
            </button>
            <div className="w-full sm:w-auto" onClick={() => setModalEditarAbierto(true)}>
               <BotonEditarCliente className="w-full h-12 sm:h-10 flex justify-center" />
            </div>
            {isWebAdmin && (
              <div className="w-full sm:w-auto" onClick={() => setModalEliminarAbierto(true)}>
                 <BotonBorrarCliente className="w-full h-12 sm:h-10 flex justify-center" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1"><ClienteDatosPersonalesCard cliente={clienteParaMostrar} /></div>
          <div className="xl:col-span-2"><ClienteDocumentacionCard cliente={clienteParaMostrar} /></div>
        </div>

        <div className="pt-2">
          {/* 🚀 Pasamos el cliente fusionado a la tarjeta de Pólizas */}
          <ClientePolizasCard cliente={clienteParaMostrar} onCrearPoliza={abrirCrearPoliza} />
        </div>

        <ClienteEditModal isOpen={modalEditarAbierto} onClose={() => setModalEditarAbierto(false)} onSave={handleSaveCliente} cliente={clienteParaMostrar} />
        <PolizaCreateModal isOpen={modalCrearPolizaAbierto} onClose={() => setModalCrearPolizaAbierto(false)} onSuccess={handlePolizaCreada} clienteId={clienteParaMostrar?.id} />
        <ConfirmModal isOpen={modalEliminarAbierto} onClose={() => setModalEliminarAbierto(false)} nombre={`${clienteParaMostrar?.nombre ?? ''} ${clienteParaMostrar?.apellido ?? ''}`.trim()} onConfirm={handleBorrarCliente} confirmDisabled={eliminando} />
      </div>
    </motion.div>
  );
};

export default ClienteProfilePage;