// src/components/polizas/PolizaHeader.jsx
import Button from "../ui/Button";
import SetFotoPerfilButton from "./SetFotoPerfilButton";

export default function PolizaHeader({ poliza, onBack, onPerfilActualizado, onRenovarClick }) {
  const isActiva = (poliza?.estado || "").toLowerCase() === "activa";
  const avatar = poliza?.foto_perfil_url || "";

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>← Volver</Button>

        <div className="h-9 w-9 rounded-lg overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0" aria-hidden>
          {avatar ? (
            <img src={avatar} alt="perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" />
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-neutral-100">
            Póliza{poliza?.numero_poliza ? ` # ${poliza.numero_poliza}` : " #"}
          </h1>
          <div className="text-sm text-neutral-400">
            {poliza?.marca} {poliza?.modelo} • {poliza?.patente}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${
            isActiva
              ? "bg-green-500/10 text-green-400 ring-green-500/30"
              : "bg-red-500/10 text-red-400 ring-red-500/30"
          }`}
          title="Estado de póliza"
        >
          {String(poliza?.estado || "").toUpperCase() || "—"}
        </span>

        {poliza?.id && (
          <SetFotoPerfilButton
            polizaId={poliza.id}
            onChanged={() => onPerfilActualizado?.()}
          />
        )}

        {/* Botón de Renovación */}
        {poliza?.id && (
          <button
            onClick={onRenovarClick}
            className="px-3 py-2 rounded bg-primary-400 text-black font-semibold hover:opacity-90"
            title="Renovar póliza (crea nueva versión con cuotas nuevas)"
          >
            Renovar póliza
          </button>
        )}
      </div>
    </header>
  );
}
