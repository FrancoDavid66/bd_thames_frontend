import { useState } from "react";
import { HiMenu, HiX, HiBell, HiClipboardList, HiPaperAirplane } from "react-icons/hi";
import ThemeToggle from "./ThemeToggle";

/**
 * Navbar fijo arriba, con hamburguesa para abrir/cerrar el sidebar en mobile.
 * En desktop agrega padding-left cuando el sidebar está abierto para que no se solape.
 * Ahora incluye campanita con badge y dropdown de "Solicitudes" con dos colas:
 * - Pendiente alta en compañía
 * - Pendiente envío de póliza al cliente
 */
export default function Navbar({
  sidebarOpen,
  toggleSidebar,
  solPendienteAlta = 0,
  solPendienteEnvio = 0,
}) {
  const [openNotif, setOpenNotif] = useState(false);
  const solTotal = (solPendienteAlta || 0) + (solPendienteEnvio || 0);

  return (
    <header
      role="banner"
      className={`fixed top-0 inset-x-0 z-40 bg-blue-800/95 dark:bg-gray-900/95 border-b border-blue-700 dark:border-gray-800 backdrop-blur
                  text-white h-14 flex items-center
                  ${sidebarOpen ? "lg:pl-64" : ""}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="w-full flex items-center justify-between gap-3 px-3 sm:px-4">
        {/* Botón hamburguesa (siempre visible) */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-blue-700/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {sidebarOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
        </button>

        {/* Título o branding */}
        <div className="flex-1 text-center select-none">
          <h1 className="text-sm sm:text-base font-semibold tracking-wide">ESTUDIO THAMES APP 1.0</h1>
        </div>

        {/* Acciones a la derecha */}
        <div className="relative flex items-center gap-2">
          {/* Campanita de notificaciones */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notificaciones"
              onClick={() => setOpenNotif((v) => !v)}
              className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-blue-700/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <HiBell className="text-xl" />
              {solTotal > 0 && (
                <span
                  aria-label={`${solTotal} notificaciones en Solicitudes`}
                  className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 inline-flex items-center justify-center rounded-full bg-yellow-400 text-gray-900 text-xs font-bold ring-1 ring-yellow-200"
                >
                  {solTotal}
                </span>
              )}
            </button>

            {/* Dropdown de notificaciones */}
            {openNotif && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] origin-top-right rounded-xl border border-blue-700/40 dark:border-gray-800 bg-blue-900/95 dark:bg-gray-900/95 shadow-xl backdrop-blur p-2"
              >
                <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-blue-200/80 dark:text-gray-400">
                  Notificaciones
                </div>

                {/* Sección: Solicitudes */}
                <div className="mx-1 my-1 rounded-lg bg-blue-800/40 dark:bg-gray-800/40 ring-1 ring-blue-700/30 dark:ring-gray-700/40">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-semibold">Solicitudes</span>
                    {solTotal > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/90 text-gray-900 font-bold">
                        {solTotal} pendientes
                      </span>
                    ) : (
                      <span className="text-xs text-blue-200/70">Sin pendientes</span>
                    )}
                  </div>

                  <div className="divide-y divide-blue-700/40 dark:divide-gray-700/50">
                    {/* Pendiente alta en compañía */}
                    <a
                      href={`/solicitudes?tab=pendiente_alta`}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-blue-700/40 dark:hover:bg-gray-800/60 rounded-b-lg"
                    >
                      <div className="h-8 w-8 rounded-md bg-blue-700/60 dark:bg-gray-800/80 flex items-center justify-center ring-1 ring-blue-600/50">
                        <HiClipboardList className="text-base" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Pendiente alta en compañía</div>
                        <div className="text-xs text-blue-200/80">Falta registrar alta</div>
                      </div>
                      <span className="text-sm font-semibold bg-blue-600/70 rounded-full px-2 py-0.5">
                        {solPendienteAlta}
                      </span>
                    </a>

                    {/* Pendiente envío de póliza al cliente */}
                    <a
                      href={`/solicitudes?tab=pendiente_envio`}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-blue-700/40 dark:hover:bg-gray-800/60"
                    >
                      <div className="h-8 w-8 rounded-md bg-blue-700/60 dark:bg-gray-800/80 flex items-center justify-center ring-1 ring-blue-600/50">
                        <HiPaperAirplane className="text-base rotate-45" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Pendiente envío de póliza</div>
                        <div className="text-xs text-blue-200/80">No se envió la póliza al cliente</div>
                      </div>
                      <span className="text-sm font-semibold bg-blue-600/70 rounded-full px-2 py-0.5">
                        {solPendienteEnvio}
                      </span>
                    </a>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-2 py-1.5 text-right">
                  <a
                    href="/solicitudes"
                    className="text-xs font-medium text-yellow-300 hover:underline"
                  >
                    Ver todas las solicitudes
                  </a>
                </div>
              </div>
            )}
          </div>

          <ThemeToggle small />
        </div>
      </div>
    </header>
  );
}
