// src/components/polizas/ServicioGruaCard.jsx
import { Link } from "react-router-dom";
import { HiTruck, HiExternalLink, HiInformationCircle } from "react-icons/hi";

function Pill({ children, tone = "neutral", icon: Icon }) {
  const tones = {
    info: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20",
    neutral: "bg-gray-500/20 text-gray-300 ring-1 ring-gray-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tones[tone]}`}>
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </span>
  );
}

export default function ServicioGruaCard({ polizaId }) {
  const manageUrl = polizaId ? `/polizas/${polizaId}#gruas` : "/gruas";

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-gray-800 p-2 ring-1 ring-gray-700">
            <HiTruck className="h-5 w-5 text-yellow-400" />
          </span>
          <h3 className="text-sm font-semibold text-gray-100">Servicio de Grúa</h3>
        </div>

        <Pill tone="neutral" icon={HiInformationCircle}>
          No configurado
        </Pill>
      </div>

      <div className="text-sm text-gray-300">
        Este módulo fue desactivado temporalmente.
      </div>
      <div className="mt-1 text-xs text-gray-400">
        Se volverá a habilitar cuando armemos Grúas desde cero.
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {polizaId ? (
          <Link
            to={`/polizas/${polizaId}`}
            className="inline-flex items-center justify-center rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-100 hover:bg-gray-700"
          >
            Ver póliza
            <HiExternalLink className="ml-1 -mr-0.5 h-4 w-4" />
          </Link>
        ) : null}

        <Link
          to={manageUrl}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Ir a Grúas
          <HiExternalLink className="ml-1 -mr-0.5 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
