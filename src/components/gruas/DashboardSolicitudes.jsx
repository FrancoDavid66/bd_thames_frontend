// src/components/gruas/DashboardSolicitudes.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiClock, HiCheckCircle, HiExclamation, HiTruck, HiLightningBolt, HiCog, HiUserGroup,
} from "react-icons/hi";
import GruasAPI from "../../api/gruas";

const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object")
    for (const k of ["results", "items", "data", "rows"]) if (Array.isArray(res[k])) return res[k];
  return [];
};

const num = (obj, key, altKey) => Number((obj && (obj[key] ?? obj[altKey])) ?? 0);

const Card = ({ icon: Icon, label, value, tone = "default" }) => (
  <motion.div
    className="bg-gray-800 rounded-lg p-4 shadow"
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex items-center gap-3">
      <div
        className={`p-2 rounded ${
          tone === "warn"
            ? "bg-yellow-500/10 text-yellow-400"
            : tone === "danger"
            ? "bg-rose-500/10 text-rose-400"
            : "bg-gray-700 text-gray-200"
        }`}
      >
        <Icon className="text-xl" />
      </div>
      <div>
        <div className="text-sm text-gray-300">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  </motion.div>
);

export default function DashboardSolicitudes({
  onNuevaSolicitud,       // () => void
  onActivarAdhesion,      // () => void
  onIrAPlanes,            // () => void
  onIrAAdhesiones,        // () => void
}) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [adhesiones, setAdhesiones] = useState([]);
  const [kpi, setKpi] = useState({
    planes_activos: 0,
    en_carencia: 0,
    polizas_suspendidas: 0,
    gruas_disponibles: 0,
    gruas_ocupadas: 0,
    gruas_fuera_servicio: 0,
    servicios_hoy: 0,
    servicios_mes: 0,
  });

  useEffect(() => {
    (async () => {
      try { setSolicitudes(normalize(await GruasAPI.getSolicitudes?.({}))); }
      catch { setSolicitudes([]); }
      try { setAdhesiones(normalize(await GruasAPI.getAdhesiones?.({}))); }
      catch { setAdhesiones([]); }
      try {
        const res = await GruasAPI.kpis?.();
        if (res) {
          setKpi({
            planes_activos: num(res, "planes_activos"),
            en_carencia: num(res, "adhesiones_en_carencia", "en_carencia"),
            polizas_suspendidas: num(res, "polizas_suspendidas"),
            gruas_disponibles: num(res, "gruas_disponibles"),
            gruas_ocupadas: num(res, "gruas_ocupadas"),
            gruas_fuera_servicio: num(res, "gruas_fuera_servicio"),
            servicios_hoy: num(res, "servicios_hoy"),
            servicios_mes: num(res, "servicios_mes"),
          });
        }
      } catch {
        // si falla kpis, mantenemos los defaults
      }
    })();
  }, []);

  const kpisSolicitudes = useMemo(() => {
    const total = solicitudes.length;
    const pend = solicitudes.filter(s => s.estado === "PEND_VALID").length;
    const curso = solicitudes.filter(s => ["EN_CURSO","ASIGNADA"].includes(s.estado)).length;
    const cerr = solicitudes.filter(s => s.estado === "CERRADA").length;
    const adhi = adhesiones.filter(a => a.estado === "ACTIVA").length;
    return { total, pend, curso, cerr, adhi };
  }, [solicitudes, adhesiones]);

  return (
    <div className="space-y-4">
      {/* Acciones rápidas (opcionales) */}
      {(onNuevaSolicitud || onActivarAdhesion || onIrAPlanes || onIrAAdhesiones) && (
        <motion.div
          className="bg-gray-800 rounded-lg p-3 shadow flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        >
          {onNuevaSolicitud && (
            <button
              onClick={onNuevaSolicitud}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold transition"
              aria-label="Nueva solicitud"
            >
              Nueva solicitud
            </button>
          )}
          {onActivarAdhesion && (
            <button
              onClick={onActivarAdhesion}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold transition"
              aria-label="Activar adhesión"
            >
              Activar adhesión
            </button>
          )}
          {onIrAPlanes && (
            <button
              onClick={onIrAPlanes}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-semibold transition"
              aria-label="Ir a Planes"
            >
              Ir a Planes
            </button>
          )}
          {onIrAAdhesiones && (
            <button
              onClick={onIrAAdhesiones}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm font-semibold transition ring-1 ring-gray-700"
              aria-label="Ver adheridas"
            >
              Ver adheridas
            </button>
          )}
        </motion.div>
      )}

      {/* KPIs de operación (contrato/recursos) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card icon={HiCog} label="Planes activos" value={kpi.planes_activos} />
        <Card icon={HiClock} label="En carencia" value={kpi.en_carencia} tone="warn" />
        <Card icon={HiExclamation} label="Pólizas suspendidas" value={kpi.polizas_suspendidas} tone="danger" />
        <Card icon={HiTruck} label="Grúas disponibles" value={kpi.gruas_disponibles} />
        <Card icon={HiUserGroup} label="Grúas ocupadas" value={kpi.gruas_ocupadas} />
        <Card icon={HiExclamation} label="Fuera de servicio" value={kpi.gruas_fuera_servicio} tone="warn" />
      </div>

      {/* KPIs de solicitudes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card icon={HiExclamation} label="Pendientes" value={kpisSolicitudes.pend} tone="warn" />
        <Card icon={HiClock} label="En curso / Asignadas" value={kpisSolicitudes.curso} />
        <Card icon={HiCheckCircle} label="Cerradas" value={kpisSolicitudes.cerr} />
        <Card icon={HiTruck} label="Adhesiones activas" value={kpisSolicitudes.adhi} />
        <Card icon={HiLightningBolt} label="Total solicitudes" value={kpisSolicitudes.total} />
      </div>

      {/* Servicios (si la API los trae) */}
      {(kpi.servicios_hoy || kpi.servicios_mes) ? (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card icon={HiLightningBolt} label="Servicios hoy" value={kpi.servicios_hoy} />
          <Card icon={HiLightningBolt} label="Servicios este mes" value={kpi.servicios_mes} />
        </div>
      ) : null}
    </div>
  );
}
