// src/components/polizas/PolizaDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaEdit, FaTrash } from "react-icons/fa";
import { HiClipboardCheck } from "react-icons/hi"; // 🚀 Icono para Renovar
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD Y ACCIONES
import { useAuth } from "../../context/AuthContext";
import { fetchPolizaPorId, deletePoliza } from "../../store/slices/polizasSlice";
import { renovarPoliza } from "../../store/slices/renovacionesSlice"; // 🚀 Thunk para renovar
import { PolizasAPI } from "../../api/polizas"; 

import PolizaHeader from "./PolizaHeader";
import PolizaResumenSection from "./PolizaResumenSection";
import GruasPanel from "./GruasPanel";
import CuotasPanel from "./CuotasPanel";
import PolizaHistoriaPanel from "./PolizaHistoriaPanel";
import VehiculoDocsPanel from "./VehiculoDocsPanel";
import CuponesRoboPanel from "./CuponesRoboPanel";

import PolizaEditModal from "./PolizaEditModal";
import ConfirmModal from "./ConfirmModal";
import RenovacionModal from "../renovaciones/RenovacionModal"; // 🚀 Importamos el Modal de Renovación

export default function PolizaDetails() {
  const { id } = useParams();
  const polizaId = Number(id);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const poliza = useSelector(
    (s) => s.polizas?.byId?.[polizaId] || s.polizas?.poliza || null
  );
  const loadStatus = useSelector((s) => s.polizas?.detailStatus || s.polizas?.status || "idle");
  const loadError = useSelector((s) => s.polizas?.detailError || s.polizas?.error || null);

  const [refreshTick, setRefreshTick] = useState(0);

  // 🚀 Estados para los modales
  const [openEdit, setOpenEdit] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openRenovar, setOpenRenovar] = useState(false); // 🚀 Estado para el modal de renovar
  const [submittingRenovacion, setSubmittingRenovacion] = useState(false); // 🚀 Estado de carga para renovación

  const normalizeTabKey = (t) => {
    if (t === "documentos" || t === "vehiculo_docs") return "vehiculo";
    return t || "resumen";
  };

  const [tab, setTab] = useState(() => {
    const urlTab = new URLSearchParams(location.search).get("tab");
    return normalizeTabKey(urlTab);
  });

  useEffect(() => {
    if (polizaId && Number.isFinite(polizaId)) {
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
    }
  }, [polizaId, dispatch]);

  useEffect(() => {
    const refreshAll = async (targetId, focusTab) => {
      try {
        await PolizasAPI.refreshPack(targetId);
      } catch (e) {
        console.warn("[DBG] refreshPack ERROR", e);
      } finally {
        dispatch(fetchPolizaPorId({ id: targetId, force: true }));
        setRefreshTick((x) => x + 1);
        if (focusTab) changeTab(focusTab);
      }
    };

    const onAsociada = (ev) => {
      const d = ev?.detail || {};
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };

    const onMediaImportada = (ev) => {
      const d = ev?.detail || {};
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };

    const onRefrescar = () => {
      dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
      setRefreshTick((x) => x + 1);
    };

    window.addEventListener("solicitud:asociada", onAsociada);
    window.addEventListener("poliza:media_importada", onMediaImportada);
    window.addEventListener("poliza:refrescar", onRefrescar);

    return () => {
      window.removeEventListener("solicitud:asociada", onAsociada);
      window.removeEventListener("poliza:media_importada", onMediaImportada);
      window.removeEventListener("poliza:refrescar", onRefrescar);
    };
  }, [polizaId, dispatch]);

  const avatar = useMemo(
    () => poliza?.foto_perfil_url || "",
    [poliza?.foto_perfil_url]
  );

  const changeTab = (t) => {
    const normalized = normalizeTabKey(t);
    setTab(normalized);
    const sp = new URLSearchParams(location.search);
    sp.set("tab", normalized);
    navigate({ search: `?${sp.toString()}` }, { replace: true });
  };

  const onBack = () => navigate(-1);

  const onPerfilActualizado = () =>
    dispatch(fetchPolizaPorId({ id: polizaId, force: true }));

  const handleConfirmDelete = async () => {
    try {
      await dispatch(deletePoliza(polizaId)).unwrap();
      toast.success("Póliza eliminada con éxito");
      navigate("/polizas", { replace: true });
    } catch (e) {
      toast.error(e?.message || "Error al eliminar");
    } finally {
      setOpenConfirm(false);
    }
  };

  // 🚀 Manejador de Renovación
  const handleRenovar = async (payload) => {
    if (!poliza?.id) return;
    setSubmittingRenovacion(true);

    const finalPayload = {
      ...(payload || {}),
      transferir_grua: payload?.transferir_grua ?? payload?.transferirGrua ?? payload?.grua ?? 1,
    };

    try {
      const res = await dispatch(renovarPoliza({ id: poliza.id, payload: finalPayload })).unwrap();
      const nuevaId = res?.data?.id;

      toast.success("Póliza renovada correctamente");
      setOpenRenovar(false);

      // Si nos devuelve el ID de la nueva póliza, navegamos a ella
      if (nuevaId) {
        navigate(`/polizas/${nuevaId}`);
      } else {
        // Si no, recargamos la actual (que ahora debería estar como 'Finalizada')
        dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
      }
    } catch (e) {
      toast.error(e?.message || "No se pudo renovar la póliza");
    } finally {
      setSubmittingRenovacion(false);
    }
  };

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  if (loadStatus === "loading" || (!poliza && loadStatus !== "failed")) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 sm:h-10 w-2/3 sm:w-1/2 bg-gray-800 rounded" />
          <div className="h-6 sm:h-8 w-1/2 sm:w-1/3 bg-gray-800 rounded" />
          <div className="h-52 sm:h-64 w-full bg-gray-900 rounded" />
        </div>
      </div>
    );
  }

  if (loadStatus === "failed") {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-8 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Acceso Denegado / Error</h2>
        <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">
          {String(loadError || "No tienes permisos para ver esta póliza o no pertenece a tu sucursal.")}
        </p>
        <button
          onClick={() => navigate('/polizas')}
          className="mt-6 px-6 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-all cursor-pointer"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 animate-in fade-in duration-500">
      <PolizaHeader
        poliza={poliza}
        onBack={onBack}
        onPerfilActualizado={onPerfilActualizado}
      />

      <div className="mt-5 sm:mt-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 sm:pb-0">
        <div className="overflow-x-auto no-scrollbar w-full sm:w-auto">
          <nav className="-mb-px flex min-w-max flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
            {[
              ["resumen", "Resumen"],
              ["vehiculo", "Vehículo / papeles"],
              ["gruas", "Grúas"],
              ["cuotas", "Cuotas"],
              ["cuponeras", "Cuponeras robo"],
              ["historial", "Historial"],
              ["notas", "Notas"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeTab(key)}
                className={`cursor-pointer whitespace-nowrap px-3 py-2.5 border-b-2 text-xs sm:text-sm font-medium transition-all ${
                  tab === key
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-0">
          {/* 🚀 BOTÓN DE RENOVAR (Solo para Admin) */}
          {isWebAdmin && (
            <button 
              onClick={() => setOpenRenovar(true)} 
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase tracking-wider border border-emerald-500/20"
            >
              <HiClipboardCheck className="text-sm" /> Renovar
            </button>
          )}

          <button 
            onClick={() => setOpenEdit(true)} 
            className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 text-amber-400 hover:bg-amber-400 hover:text-black transition-all text-xs font-bold uppercase tracking-wider border border-amber-500/20"
          >
            <FaEdit className="text-sm" /> Editar
          </button>
          
          {isWebAdmin && (
            <button 
              onClick={() => setOpenConfirm(true)} 
              className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold uppercase tracking-wider border border-rose-500/20"
            >
              <FaTrash className="text-sm" /> Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 sm:mt-6 space-y-4 sm:space-y-6">
        {tab === "resumen" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4 shadow-xl">
            <PolizaResumenSection
              poliza={poliza}
              polizaId={polizaId}
              avatar={avatar}
              onOpenVehiculoGaleria={() => changeTab("vehiculo")}
              onEditVehiculo={() => changeTab("vehiculo")}
              onOpenCuotas={() => changeTab("cuotas")}
            />
          </div>
        )}

        {tab === "vehiculo" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4 shadow-xl">
            <VehiculoDocsPanel
              key={`veh-${refreshTick}`}
              poliza={poliza}
              polizaId={polizaId}
              focus="fotos"
              onPerfilChange={onPerfilActualizado}
              onRefrescar={() => {
                dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
                setRefreshTick((x) => x + 1);
              }}
            />
          </div>
        )}

        {tab === "gruas" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4 shadow-xl">
            <GruasPanel polizaId={polizaId} />
          </div>
        )}

        {tab === "cuotas" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4 shadow-xl">
            <CuotasPanel poliza={poliza} polizaId={polizaId} />
          </div>
        )}

        {tab === "cuponeras" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4 shadow-xl">
            <CuponesRoboPanel
              polizaId={polizaId}
              cupones={poliza?.cupones_robo || []}
            />
          </div>
        )}

        {tab === "historial" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3 sm:p-4 shadow-xl">
            <PolizaHistoriaPanel polizaId={polizaId} />
          </div>
        )}

        {tab === "notas" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500 italic text-sm">
            Sección de notas internas próximamente disponible.
          </div>
        )}
      </div>

      <PolizaEditModal 
        isOpen={openEdit} 
        poliza={poliza} 
        onClose={() => setOpenEdit(false)} 
        onSuccess={() => {
          setOpenEdit(false);
          dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
        }}
      />

      <ConfirmModal 
        isOpen={openConfirm} 
        onClose={() => setOpenConfirm(false)} 
        onConfirm={handleConfirmDelete} 
        message={`¿Confirmas la eliminación total de la póliza ${poliza?.numero_poliza || "S/N"}? Esta acción no se puede deshacer.`} 
      />

      {/* 🚀 MODAL DE RENOVACIÓN INTEGRADO */}
      <RenovacionModal
        open={openRenovar}
        item={poliza}
        onClose={() => {
          if (!submittingRenovacion) setOpenRenovar(false);
        }}
        onSubmit={handleRenovar}
        submitting={submittingRenovacion}
      />
    </div>
  );
}