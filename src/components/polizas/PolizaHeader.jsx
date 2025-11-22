// src/components/polizas/PolizaHeader.jsx
import Button from "../ui/Button";
import SetFotoPerfilButton from "./SetFotoPerfilButton";

export default function PolizaHeader({
  poliza,
  onBack,
  onPerfilActualizado,
  onRenovarClick,
}) {
  const isActiva = (poliza?.estado || "").toLowerCase() === "activa";
  const avatar = poliza?.foto_perfil_url || "";
  const compania = poliza?.compania_nombre || poliza?.compania || "";
  const cobertura = poliza?.cobertura || "";

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Bloque principal: back + avatar + datos */}
      <div className="flex items-start gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Volver
        </Button>

        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 shrink-0"
            aria-hidden
          >
            {avatar ? (
              <img
                src={avatar}
                alt="perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold text-neutral-50 truncate">
              Póliza
              {poliza?.numero_poliza
                ? ` # ${poliza.numero_poliza}`
                : poliza?.id
                ? ` # ${poliza.id}`
                : " #"}
            </h1>
            <div className="mt-0.5 text-xs sm:text-sm text-neutral-400 space-y-0.5">
              <div className="truncate">
                {poliza?.marca} {poliza?.modelo} •{" "}
                <span className="uppercase">{poliza?.patente}</span>
              </div>
              {(compania || cobertura) && (
                <div className="text-[11px] sm:text-xs text-neutral-500 truncate">
                  {compania && <span>{compania}</span>}
                  {compania && cobertura && <span> · </span>}
                  {cobertura && <span>Cobertura: {cobertura}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones / estado */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
            isActiva
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40"
              : "bg-red-500/10 text-red-300 ring-red-500/40"
          }`}
          title="Estado de póliza"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {String(poliza?.estado || "").toUpperCase() || "—"}
        </span>

        {poliza?.id && (
          <SetFotoPerfilButton
            polizaId={poliza.id}
            onChanged={() => onPerfilActualizado?.()}
          />
        )}

        {poliza?.id && (
          <button
            onClick={onRenovarClick}
            className="px-3 py-1.5 rounded-full bg-primary-400 text-black text-xs sm:text-sm font-semibold hover:opacity-90 transition"
            title="Renovar póliza (crea nueva versión con cuotas nuevas)"
          >
            Renovar póliza
          </button>
        )}
      </div>
    </header>
  );
}
