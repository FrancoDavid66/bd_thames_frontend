// src/pages/ClienteProfilePage.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiShieldCheck, HiExclamationCircle, HiExternalLink, HiPencil, HiTrash } from 'react-icons/hi';

import { useAuth } from '../context/AuthContext';
import { fetchClienteById, deleteCliente } from '../store/slices/clientesSlice';

import Boton3D from '../components/ui/Boton3D';
import CardDuo from '../components/ui/CardDuo';
import ClienteFormModal from '../components/clientes/ClienteFormModal';
import ClienteDatosPersonalesCard from '../components/clientes/ClienteDatosPersonalesCard';
import ClienteDocumentacionCard from '../components/clientes/ClienteDocumentacionCard';
import ClientePolizasCard from '../components/clientes/ClientePolizasCard';
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
  const [eliminando, setEliminando] = useState(false);
  const [cargandoPortal, setCargandoPortal] = useState(false);

  // 🚀 Abrir el Portal del Asegurado de este cliente (lo que ve el cliente) en otra pestaña.
  //    Pide el token al backend (lo crea si no existe) y abre el link.
  const handleVerPortal = useCallback(async () => {
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
  }, [id, cargandoPortal]);

  useEffect(() => {
    if (!id) return;
    // 🚀 Guardamos la promesa para poder CANCELAR el fetch si el usuario
    //    sale de la ficha antes de que termine (evita warning de componente
    //    desmontado y ahorra una request innecesaria).
    const promesa = dispatch(fetchClienteById(id));
    return () => { if (promesa?.abort) promesa.abort(); };
  }, [dispatch, id]);

  // El modal unificado (vía useClienteForm) ya hace el updateCliente + toast.
  // Acá solo cerramos y refrescamos la ficha para traer los datos nuevos.
  const handleSaveCliente = useCallback(() => {
    setModalEditarAbierto(false);
    if (id) dispatch(fetchClienteById(id));
  }, [dispatch, id]);

  const handleBorrarCliente = useCallback(async () => {
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
  }, [isWebAdmin, cliente, eliminando, dispatch, navigate]);

  // 🎨 Iniciales para el avatar del header (nombre + apellido)
  const iniciales = useMemo(() => {
    const n = String(cliente?.nombre || '').trim();
    const a = String(cliente?.apellido || '').trim();
    return (`${n.charAt(0)}${a.charAt(0)}`.toUpperCase().trim()) || '?';
  }, [cliente]);

  if (detailStatus === 'loading' || (status === 'loading' && !cliente)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center bg-surface dark:bg-surface-dark">
        <div className="h-12 w-12 border-4 border-duo-azul/25 border-t-duo-azul rounded-full animate-spin mb-4" />
        <p className="text-[11px] font-black uppercase tracking-widest text-duo-azul">Cargando Ficha...</p>
      </div>
    );
  }

  if (detailStatus === 'failed' || (status === 'failed' && !cliente)) {
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-surface dark:bg-surface-dark">
        <CardDuo className="max-w-md w-full p-8 flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] flex items-center justify-center mb-4">
            <HiExclamationCircle className="text-duo-rojo text-4xl" />
          </div>
          <p className="text-lg font-black text-duo-rojo uppercase tracking-wide">{titulo}</p>
          <p className="text-sm font-bold text-suave dark:text-suave-dark mt-2">{mensaje}</p>
          {httpStatus && (
            <p className="text-[10px] text-suave dark:text-suave-dark mt-2 font-mono">HTTP {httpStatus}</p>
          )}
          <div className="mt-6 w-full">
            <Boton3D variant="blanco" size="sm" full onClick={() => navigate('/clientes')}>
              Volver al Directorio
            </Boton3D>
          </div>
        </CardDuo>
      </div>
    );
  }

  if (!cliente) return null;

  return (
    <motion.div
      className="min-h-[100dvh] bg-surface dark:bg-surface-dark text-titulo dark:text-titulo-dark p-4 sm:p-6 lg:p-8 pb-24"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* Header estilo Duolingo: banner con degradé azul */}
        <div className="bg-gradient-to-br from-duo-azul to-[#0d9de0] rounded-3xl shadow-[0_4px_0_var(--color-duo-azul-sombra)] p-6 sm:p-7 flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="h-20 w-20 sm:h-22 sm:w-22 rounded-full bg-white text-duo-azul flex items-center justify-center text-3xl font-black shrink-0 border-4 border-white/50">
              {iniciales}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight truncate">
                {`${cliente?.nombre ?? ''} ${cliente?.apellido ?? ''}`.trim() || 'Cliente'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[13px] font-extrabold text-white/90">
                <span>Ficha #{cliente.id}</span>
                <span className="opacity-60">•</span>
                <span className="inline-flex items-center gap-1">
                  <HiShieldCheck className="text-base shrink-0" />
                  {user?.perfil?.oficina_nombre || 'Local'}
                </span>
                <span className="opacity-60">•</span>
                <span>Estado: {cliente?.estado || 'Activo'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Boton3D
              variant="amarillo"
              size="sm"
              onClick={handleVerPortal}
              disabled={cargandoPortal}
              title="Abrir el portal que ve el cliente (otra pestaña)"
            >
              <HiExternalLink className="text-base" />
              {cargandoPortal ? "Abriendo..." : "Ver portal"}
            </Boton3D>

            <div onClick={() => setModalEditarAbierto(true)}>
              <Boton3D variant="blanco" size="sm">
                <HiPencil className="text-base" />
                Editar
              </Boton3D>
            </div>

            {isWebAdmin && (
              <div onClick={() => setModalEliminarAbierto(true)}>
                <Boton3D variant="rojo" size="sm">
                  <HiTrash className="text-base" />
                  Borrar
                </Boton3D>
              </div>
            )}
          </div>
        </div>

        {/* Datos personales a todo el ancho + documentación compacta debajo */}
        <ClienteDatosPersonalesCard cliente={cliente} />

        <ClienteDocumentacionCard cliente={cliente} />

        <div className="pt-2">
          {/* Tarjeta de pólizas: solo VER. El alta de pólizas va por Solicitudes. */}
          <ClientePolizasCard cliente={cliente} />
        </div>

        <ClienteFormModal isOpen={modalEditarAbierto} onClose={() => setModalEditarAbierto(false)} onSave={handleSaveCliente} cliente={cliente} />
        <ConfirmModal isOpen={modalEliminarAbierto} onClose={() => setModalEliminarAbierto(false)} nombre={`${cliente?.nombre ?? ''} ${cliente?.apellido ?? ''}`.trim()} onConfirm={handleBorrarCliente} confirmDisabled={eliminando} />
      </div>
    </motion.div>
  );
};

export default ClienteProfilePage;