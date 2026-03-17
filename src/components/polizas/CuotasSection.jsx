// src/components/polizas/CuotasSection.jsx
import { HiChevronRight } from "react-icons/hi";
// 🚀 IMPORTAMOS AUTH PARA CONSISTENCIA DE INTERFAZ
import { useAuth } from "../../context/AuthContext";

export default function CuotasSection({
  resumen,
  onOpenDetalle,
  // 🗑️ onOpenRenovar eliminado de aquí
  onOpen,
}) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  
  // Back-compat: si te quedaron llamados con onOpen, lo uso como "ver detalle"
  const openDetalle = onOpenDetalle || onOpen;

  const r = resumen || { total: 0, pagadas: 0, pendientes: 0, vencidas: 0 };
  const progreso = r.total ? Math.round((r.pagadas / r.total) * 100) : 0;

  const Card = ({ label, value, className = "" }) => (
    <div
      className={`rounded-xl bg-gray-900/80 border border-gray-800 p-4 shadow-lg shadow-black/10 ${className}`}
    >
      <div className="text-xs sm:text-sm text-gray-400">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
        {value}
      </div>
    </div>
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-xl shadow-black/20 p-4 sm:p-5">
      {/* Header + acciones */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-white/70 uppercase tracking-wide">
              Sección Cobranzas
            </div>
            {/* 🚀 ETIQUETA DE SUCURSAL */}
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase border border-emerald-500/20">
              {user?.perfil?.oficina_nombre || 'Local'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">
            Cuotas
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
          {/* 🗑️ Botón de Renovar póliza eliminado de aquí */}

          {/* Botón secundario: Ver detalle de cuotas */}
          {openDetalle && (
            <button
              type="button"
              onClick={openDetalle}
              className="inline-flex justify-center items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm border border-white/10 transition-colors cursor-pointer w-full sm:w-auto"
              title="Ver detalle de cuotas"
            >
              Ver detalle
              <HiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4">
        <Card label="Cuotas" value={r.total} />
        <Card
          label="Pagadas"
          value={r.pagadas}
          className="ring-1 ring-emerald-500/20"
        />
        <Card
          label="Pendientes"
          value={r.pendientes}
          className="ring-1 ring-amber-500/20"
        />
        <Card
          label="Vencidas"
          value={r.vencidas}
          className="ring-1 ring-rose-500/20"
        />

        {/* Progreso */}
        <div className="col-span-2 md:col-span-4">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-white/70 mb-1">
            <span>Progreso de pago</span>
            <span>{progreso}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 transition-all"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}