// src/components/polizas/PolizaHeader.jsx
import Button from "../ui/Button";
import SetFotoPerfilButton from "./SetFotoPerfilButton";
// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE Y DATOS DE OFICINA
import { useAuth } from "../../context/AuthContext";

export default function PolizaHeader({
  poliza,
  onBack,
  onPerfilActualizado,
  // 🗑️ onRenovarClick eliminado de aquí
}) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  
  const avatar = poliza?.foto_perfil_url || "";
  const compania = poliza?.compania_nombre || poliza?.compania || "";
  const cobertura = poliza?.cobertura || "";

  // 🛡️ Lógica de permisos
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
      {/* Bloque principal: back + avatar + datos */}
      <div className="flex items-start gap-3">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          ← Volver
        </Button>

        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 shrink-0 shadow-inner"
            aria-hidden
          >
            {avatar ? (
              <img
                src={avatar}
                alt="perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-semibold text-neutral-50 truncate">
                Póliza
                {poliza?.numero_poliza
                  ? ` # ${poliza.numero_poliza}`
                  : poliza?.id
                  ? ` # ${poliza.id}`
                  : " #"}
              </h1>
              {/* 🚀 ETIQUETA DE SUCURSAL: Muestra a qué oficina pertenece la póliza */}
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-tight border border-emerald-500/20">
                {poliza?.oficina_nombre || user?.perfil?.oficina_nombre || 'Local'}
              </span>
            </div>
            
            <div className="mt-0.5 text-xs sm:text-sm text-neutral-400 space-y-0.5">
              <div className="truncate">
                {poliza?.marca} {poliza?.modelo} •{" "}
                <span className="uppercase font-mono text-neutral-200">{poliza?.patente}</span>
              </div>
              {(compania || cobertura) && (
                <div className="text-[11px] sm:text-xs text-neutral-500 truncate flex items-center gap-1.5">
                  {compania && <span className="text-sky-400/80">{compania}</span>}
                  {compania && cobertura && <span className="opacity-30">|</span>}
                  {cobertura && <span>Cobertura: <b className="text-neutral-300">{cobertura}</b></span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {poliza?.id && (
          <SetFotoPerfilButton
            polizaId={poliza.id}
            onChanged={() => onPerfilActualizado?.()}
          />
        )}

        {/* 🗑️ Botón de Renovar Póliza eliminado de aquí */}

        {/* 🛡️ BOTÓN DE ELIMINACIÓN: Solo si fueras a agregarlo, aquí iría el blindaje */}
        {/* {isWebAdmin && <button className="...">Eliminar</button>} */}
      </div>
    </header>
  );
}