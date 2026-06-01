// src/components/polizas/PolizaDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaEdit, FaTrash } from "react-icons/fa";
import {
  HiClipboardCheck, HiClipboardList, HiPhotograph,
  HiCash, HiShieldCheck, HiClock, HiPencilAlt,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD Y ACCIONES
import { useAuth } from "../../context/AuthContext";
import { fetchPolizaPorId, deletePoliza } from "../../store/slices/polizasSlice";
import { renovarPoliza } from "../../store/slices/renovacionesSlice";
import { PolizasAPI } from "../../api/polizas";

import PolizaHeader from "./PolizaHeader";
import PolizaResumenSection from "./PolizaResumenSection";
import CuotasPanel from "./CuotasPanel";
import PolizaHistoriaPanel from "./PolizaHistoriaPanel";
import VehiculoDocsPanel from "./VehiculoDocsPanel";
import CuponesRoboPanel from "./CuponesRoboPanel";

import PolizaEditModal from "./PolizaEditModal";
import ConfirmModal from "./ConfirmModal";
import RenovacionModal from "../renovaciones/RenovacionModal";

/* ===================== Config de pestañas ===================== */
const TABS = [
  { key: "resumen",    label: "Resumen",            Icon: HiClipboardList },
  { key: "cuotas",     label: "Cuotas",             Icon: HiCash },
  { key: "vehiculo",   label: "Vehículo / papeles", Icon: HiPhotograph },
  { key: "cuponeras",  label: "Cuponeras",          Icon: HiShieldCheck },
  { key: "historial",  label: "Historial",          Icon: HiClock },
  { key: "notas",      label: "Notas",              Icon: HiPencilAlt },
];

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

  // Modales
  const [openEdit, setOpenEdit] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openRenovar, setOpenRenovar] = useState(false);
  const [submittingRenovacion, setSubmittingRenovacion] = useState(false);

  const normalizeTabKey = (t) => {
    if (t === "documentos" || t === "vehiculo_docs") return "vehiculo";
    if (t === "gruas") return "resumen"; // grúas discontinuado
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

  const avatar = useMemo(() => poliza?.foto_perfil_url || "", [poliza?.foto_perfil_url]);

  // Badge de cuotas impagas para la pestaña "Cuotas"
  const impagasCount = useMemo(() => {
    const fromBackend = Number(poliza?.impagas_count ?? poliza?.impagasCount);
    if (Number.isFinite(fromBackend)) return fromBackend;
    const cuotas = Array.isArray(poliza?.cuotas) ? poliza.cuotas : [];
    return cuotas.filter((c) => !c?.pagado).length;
  }, [poliza]);

  const changeTab = (t) => {
    const normalized = normalizeTabKey(t);
    setTab(normalized);
    const sp = new URLSearchParams(location.search);
    sp.set("tab", normalized);
    navigate({ search: `?${sp.toString()}` }, { replace: true });
  };

  const onBack = () => navigate(-1);
  const onPerfilActualizado = () => dispatch(fetchPolizaPorId({ id: polizaId, force: true }));

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
      if (nuevaId) navigate(`/polizas/${nuevaId}`);
      else dispatch(fetchPolizaPorId({ id: polizaId, force: true }));
    } catch (e) {
      toast.error(e?.message || "No se pudo renovar la póliza");
    } finally {
      setSubmittingRenovacion(false);
    }
  };

  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  /* ===================== Loading ===================== */
  if (loadStatus === "loading" || (!poliza && loadStatus !== "failed")) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-2/3 rounded bg-slate-800 sm:w-1/2" />
          <div className="h-7 w-1/2 rounded bg-slate-800 sm:w-1/3" />
          <div className="h-56 w-full rounded-2xl bg-slate-900" />
        </div>
      </div>
    );
  }

  /* ===================== Error ===================== */
  if (loadStatus === "failed") {
    return (
      <div className="mx-auto max-w-6xl px-3 py-8 text-center sm:px-4">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Acceso denegado / Error</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          {String(loadError || "No tenés permisos para ver esta póliza o no pertenece a tu sucursal.")}
        </p>
        <button
          onClick={() => navigate("/polizas")}
          className="mt-6 cursor-pointer rounded-xl bg-slate-800 px-6 py-2 font-semibold text-white transition-all hover:bg-slate-700"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  /* ===================== Render ===================== */
  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
      <PolizaHeader poliza={poliza} onBack={onBack} onPerfilActualizado={onPerfilActualizado} />

      {/* Barra de navegación + acciones */}
      <div className="mt-5 flex flex-col gap-4 border-b border-slate-800 pb-4 sm:mt-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs (scroll horizontal en mobile) */}
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex min-w-max items-center gap-1.5">
            {TABS.map(({ key, label, Icon }) => {
              const active = tab === key;
              const showBadge = key === "cuotas" && impagasCount > 0;
              return (
                <button
                  key={key}
                  onClick={() => changeTab(key)}
                  className={`group inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                  {label}
                  {showBadge ? (
                    <span className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-black ${active ? "bg-white/25 text-white" : "bg-rose-500/20 text-rose-300"}`}>
                      {impagasCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          {isWebAdmin ? (
            <button
              onClick={() => setOpenRenovar(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-indigo-300 transition-all hover:bg-indigo-500/20"
            >
              <HiClipboardCheck className="text-sm" /> Renovar
            </button>
          ) : null}

          <button
            onClick={() => setOpenEdit(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 transition-all hover:bg-amber-500/20"
          >
            <FaEdit className="text-sm" /> Editar
          </button>

          {isWebAdmin ? (
            <button
              onClick={() => setOpenConfirm(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-300 transition-all hover:bg-rose-500/20"
            >
              <FaTrash className="text-sm" /> Eliminar
            </button>
          ) : null}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="mt-5 sm:mt-6">
        {tab === "resumen" && (
          <PolizaResumenSection
            poliza={poliza}
            polizaId={polizaId}
            avatar={avatar}
            onOpenVehiculoGaleria={() => changeTab("vehiculo")}
            onEditVehiculo={() => changeTab("vehiculo")}
            onOpenCuotas={() => changeTab("cuotas")}
          />
        )}

        {tab === "cuotas" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 shadow-xl sm:p-4">
            <CuotasPanel poliza={poliza} polizaId={polizaId} />
          </div>
        )}

        {tab === "vehiculo" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 shadow-xl sm:p-4">
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

        {tab === "cuponeras" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 shadow-xl sm:p-4">
            <CuponesRoboPanel polizaId={polizaId} cupones={poliza?.cupones_robo || []} />
          </div>
        )}

        {tab === "historial" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 shadow-xl sm:p-4">
            <PolizaHistoriaPanel polizaId={polizaId} />
          </div>
        )}

        {tab === "notas" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm italic text-slate-500 shadow-xl">
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
        message={`¿Confirmás la eliminación total de la póliza ${poliza?.numero_poliza || "S/N"}? Esta acción no se puede deshacer.`}
      />

      <RenovacionModal
        open={openRenovar}
        item={poliza}
        onClose={() => { if (!submittingRenovacion) setOpenRenovar(false); }}
        onSubmit={handleRenovar}
        submitting={submittingRenovacion}
      />
    </div>
  );
}