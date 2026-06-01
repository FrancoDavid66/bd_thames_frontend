// src/components/polizas/PolizaHeader.jsx
import { HiArrowLeft, HiOfficeBuilding } from "react-icons/hi";
import SetFotoPerfilButton from "./SetFotoPerfilButton";
import { useAuth } from "../../context/AuthContext";

export default function PolizaHeader({ poliza, onBack, onPerfilActualizado }) {
  const { user } = useAuth();

  const avatar = poliza?.foto_perfil_url || "";
  const compania = poliza?.compania_nombre || poliza?.compania || "";
  const cobertura = poliza?.cobertura || "";
  const oficina = poliza?.oficina_nombre || user?.perfil?.oficina_nombre || "Local";

  const numero = poliza?.numero_poliza
    ? `#${poliza.numero_poliza}`
    : poliza?.id
    ? `#${poliza.id}`
    : "#";

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Bloque principal: volver + avatar + datos */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          <HiArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-inner">
            {avatar ? (
              <img src={avatar} alt="perfil" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                Póliza <span className="text-indigo-400">{numero}</span>
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-indigo-300">
                <HiOfficeBuilding className="h-3 w-3" /> {oficina}
              </span>
            </div>

            <div className="mt-1 space-y-0.5 text-xs text-slate-400 sm:text-sm">
              <div className="truncate">
                {poliza?.marca} {poliza?.modelo}
                {poliza?.patente ? (
                  <>
                    {" · "}
                    <span className="font-mono uppercase text-slate-200">{poliza.patente}</span>
                  </>
                ) : null}
              </div>
              {(compania || cobertura) ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                  {compania ? <span className="text-sky-400/90">{compania}</span> : null}
                  {compania && cobertura ? <span className="opacity-30">|</span> : null}
                  {cobertura ? (
                    <span>Cobertura: <b className="text-slate-300">{cobertura}</b></span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {poliza?.id ? (
          <SetFotoPerfilButton polizaId={poliza.id} onChanged={() => onPerfilActualizado?.()} />
        ) : null}
      </div>
    </header>
  );
}