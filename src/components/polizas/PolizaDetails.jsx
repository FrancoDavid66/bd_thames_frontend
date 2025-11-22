// src/components/polizas/PolizaDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import { fetchPolizaPorId } from "../../store/slices/polizasSlice";
import { PolizasAPI } from "../../api/polizas"; // <- para refreshPack luego de asociación
import PolizaHeader from "./PolizaHeader";
import PolizaResumenSection from "./PolizaResumenSection";
import GruasPanel from "./GruasPanel";
import CuotasPanel from "./CuotasPanel";
import PolizaHistoriaPanel from "./PolizaHistoriaPanel";
import RenovarPolizaModal from "./RenovarPolizaModal";

// ✅ Unificado Vehículo + Documentos
import VehiculoDocsPanel from "./VehiculoDocsPanel";

// 🆕 Panel de cuponeras de robo
import CuponesRoboPanel from "./CuponesRoboPanel";

export default function PolizaDetails() {
  const { id } = useParams();
  const polizaId = Number(id);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const poliza = useSelector((s) => s.polizas?.poliza || null);
  const loadStatus = useSelector((s) => s.polizas?.status || "idle");
  const loadError = useSelector((s) => s.polizas?.error || null);

  // 🔁 fuerza remount del panel unificado tras importación de medios
  const [refreshTick, setRefreshTick] = useState(0);

  // Normaliza claves de tabs: cualquier "documentos" ahora va a "vehiculo"
  const normalizeTabKey = (t) => {
    if (t === "documentos" || t === "vehiculo_docs") return "vehiculo";
    return t || "resumen";
  };

  const [tab, setTab] = useState(() => {
    const urlTab = new URLSearchParams(location.search).get("tab");
    return normalizeTabKey(urlTab);
  });

  const [openRenovar, setOpenRenovar] = useState(false);

  useEffect(() => {
    if (polizaId) {
      console.log("[DBG] PolizaDetails: fetchPolizaPorId", { polizaId });
      dispatch(fetchPolizaPorId(polizaId));
    }
  }, [polizaId, dispatch]);

  // 🔔 Navegar a la nueva póliza cuando se renueva
  useEffect(() => {
    const handler = (ev) => {
      const nueva = ev?.detail?.nuevaPoliza;
      if (nueva?.id) navigate(`/polizas/${nueva.id}`);
    };
    window.addEventListener("poliza:renovada", handler);
    return () => window.removeEventListener("poliza:renovada", handler);
  }, [navigate]);

  // 🔔 Refresco automático cuando una solicitud se asocia y el backend copia medios
  useEffect(() => {
    const refreshAll = async (targetId, focusTab) => {
      console.groupCollapsed("[DBG] PolizaDetails.refreshAll");
      console.log("targetId", targetId, "focusTab", focusTab);
      try {
        await PolizasAPI.refreshPack(targetId); // pack completo (póliza+docs+fotos)
        console.log("[DBG] refreshPack OK");
      } catch (e) {
        console.warn("[DBG] refreshPack ERROR", e);
      } finally {
        dispatch(fetchPolizaPorId(targetId));
        setRefreshTick((x) => x + 1);
        console.log("[DBG] fetchPolizaPorId + refreshTick++", { targetId });
        if (focusTab) changeTab(focusTab);
        console.groupEnd();
      }
    };

    const onAsociada = (ev) => {
      const d = ev?.detail || {};
      console.groupCollapsed("[DBG] event: solicitud:asociada");
      console.log(d);
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      console.log("target", target, "current polizaId", polizaId);
      console.groupEnd();
      if (!target || target !== polizaId) return;
      // Si vienen con focusTab="documentos", igual cae al tab unificado vehículo/papeles
      refreshAll(target, d.focusTab || "vehiculo");
    };

    const onMediaImportada = (ev) => {
      const d = ev?.detail || {};
      console.groupCollapsed("[DBG] event: poliza:media_importada");
      console.log(d);
      const target = Number(d.poliza_id || d.polizaId || polizaId);
      console.log("target", target, "current polizaId", polizaId);
      console.groupEnd();
      if (!target || target !== polizaId) return;
      refreshAll(target, d.focusTab || "vehiculo");
    };

    const onRefrescar = () => {
      console.log("[DBG] event: poliza:refrescar -> fetchPolizaPorId");
      dispatch(fetchPolizaPorId(polizaId));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const onPerfilActualizado = () => dispatch(fetchPolizaPorId(polizaId));

  // 🧪 LOG: cada vez que abrís el tab Vehículo/Papeles o cambia la data en store
  useEffect(() => {
    if (tab === "vehiculo") {
      const count = Array.isArray(poliza?.documentos)
        ? poliza.documentos.length
        : 0;
      console.groupCollapsed(
        "[DBG] PolizaDetails → TAB Vehículo/Papeles (unificado)"
      );
      console.log("polizaId", polizaId, "documentos en store", count);
      if (count) {
        console.table(
          poliza.documentos.map((d) => ({
            id: d.id,
            tipo: d.tipo,
            url: d.url || d.secure_url,
            vto: d.vencimiento || null,
            lado: d.lado || "",
          }))
        );
      } else {
        console.log(
          "No hay documentos en store; la UI del tab podría estar filtrando o no los trajo el API pack."
        );
      }
      console.groupEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, polizaId, poliza?.documentos?.length]);

  if (loadStatus === "loading" || !poliza) {
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
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 text-red-400">
        <div className="text-base sm:text-lg font-semibold mb-2">
          No se pudo cargar la póliza
        </div>
        <div className="text-xs sm:text-sm opacity-80">
          {String(loadError || "Error desconocido")}
        </div>
        <button
          onClick={() => dispatch(fetchPolizaPorId(polizaId))}
          className="mt-4 px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-100 text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <PolizaHeader
        poliza={poliza}
        onBack={onBack}
        onPerfilActualizado={onPerfilActualizado}
        onRenovarClick={() => setOpenRenovar(true)}
      />

      {/* Tabs: scroll horizontal en mobile */}
      <div className="mt-5 sm:mt-6 border-b border-gray-800">
        <div className="overflow-x-auto">
          <nav className="-mb-px flex min-w-max flex-row gap-2 sm:gap-4 text-xs sm:text-sm px-1 sm:px-0">
            {[
              ["resumen", "Resumen"],
              ["vehiculo", "Vehículo / papeles"],
              ["gruas", "Grúas"],
              ["cuotas", "Cuotas"],
              // 🆕 nuevo tab
              ["cuponeras", "Cuponeras robo"],
              ["historial", "Historial"],
              ["notas", "Notas"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => changeTab(key)}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-2 border-b-2 text-xs sm:text-sm transition-colors ${
                  tab === key
                    ? "border-primary-400 text-primary-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido de tabs */}
      <div className="mt-5 sm:mt-6 space-y-4 sm:space-y-6">
        {tab === "resumen" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
            <PolizaResumenSection
              poliza={poliza}
              polizaId={polizaId}
              avatar={avatar}
              onOpenVehiculoGaleria={() => changeTab("vehiculo")}
              onEditVehiculo={() => changeTab("vehiculo")}
              onOpenCuotas={() => changeTab("cuotas")}
              onRenovarPoliza={() => setOpenRenovar(true)}
            />
          </div>
        )}

        {/* ✅ Unificado: Vehículo + Papeles (fotos + documentos) */}
        {tab === "vehiculo" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
            <VehiculoDocsPanel
              key={`veh-${refreshTick}`}
              poliza={poliza}
              polizaId={polizaId}
              focus="fotos" // el panel internamente maneja fotos+docs
              onPerfilChange={onPerfilActualizado}
              onRefrescar={() => {
                dispatch(fetchPolizaPorId(polizaId));
                setRefreshTick((x) => x + 1);
              }}
            />
          </div>
        )}

        {tab === "gruas" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
            <GruasPanel poliza={poliza} />
          </div>
        )}

        {tab === "cuotas" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
            <CuotasPanel poliza={poliza} polizaId={polizaId} />
          </div>
        )}

        {/* 🆕 Tab Cuponeras robo */}
        {tab === "cuponeras" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
            <CuponesRoboPanel
              poliza={poliza}
              polizaId={polizaId}
              cupones={poliza?.cupones_robo || []}
            />
          </div>
        )}

        {tab === "historial" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
            <PolizaHistoriaPanel polizaId={poliza.id} />
          </div>
        )}

        {tab === "notas" && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6 text-xs sm:text-sm text-gray-300">
            Próximamente: notas internas por póliza.
          </div>
        )}
      </div>

      <RenovarPolizaModal
        open={openRenovar}
        onClose={() => setOpenRenovar(false)}
        poliza={poliza}
      />
    </div>
  );
}
