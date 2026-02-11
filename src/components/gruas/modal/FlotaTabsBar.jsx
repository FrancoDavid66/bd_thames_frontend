// src/components/gruas/modal/FlotaTabsBar.jsx
import React from "react";

function TabBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap px-2.5 sm:px-3 py-2 border-b-2 text-xs sm:text-sm transition-colors",
        active
          ? "border-emerald-400 text-emerald-300"
          : "border-transparent text-white/60 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-white/10 border border-white/10 text-white/80",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/**
 * Barra superior tipo "perfil" (como PolizaDetails):
 * - Selector de mes
 * - Tabs (scroll horizontal en mobile)
 * - Estado de carga (derecha)
 */
export default function FlotaTabsBar({
  mes,
  onMesChange,
  tab,
  onTabChange,
  loadingVeh = false,
  loadingViajes = false,
  modoCompat = false,
  variant = "social",
}) {
  return (
    <div className="mt-1">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-white/80">
            Mes
            <input
              type="month"
              className="ml-2 px-3 py-2 bg-gray-900 text-white rounded-xl border border-gray-800"
              value={mes}
              onChange={(e) => onMesChange?.(e.target.value)}
            />
          </label>

          {/* Tabs con scroll horizontal en mobile */}
          <div className="border-b border-white/10">
            <div className="overflow-x-auto">
              <nav className="-mb-px flex min-w-max flex-row gap-2 px-1">
                <TabBtn active={tab === "vehiculos"} onClick={() => onTabChange?.("vehiculos")}>
                  Vehículos
                </TabBtn>
                <TabBtn active={tab === "viajes"} onClick={() => onTabChange?.("viajes")}>
                  Viajes del mes
                </TabBtn>

                {/* (ya lo dejamos preparado para crecer) */}
                {/* <TabBtn active={tab === "perfil"} onClick={() => onTabChange?.("perfil")}>
                  Perfil del camión
                </TabBtn> */}
                {/* <TabBtn active={tab === "fotos"} onClick={() => onTabChange?.("fotos")}>
                  Fotos
                </TabBtn> */}
              </nav>
            </div>
          </div>

          {/* Guiños/estados */}
          {variant === "social" && tab === "vehiculos" && !modoCompat ? (
            <Badge className="ml-1">UI social</Badge>
          ) : null}
          {modoCompat ? <Badge className="ml-1">MODO COMPAT</Badge> : null}
        </div>

        <div className="text-xs text-white/50">
          {loadingVeh ? "Cargando vehículos…" : "Vehículos listos"}
          {loadingViajes ? " · Cargando viajes…" : " · Viajes listos"}
        </div>
      </div>
    </div>
  );
}
