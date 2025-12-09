// src/components/geo/GeoControlPanel.jsx
import GeoLocationButton from "./GeoControlPanel/GeoLocationButton";
import GeoNightModeToggle from "./GeoControlPanel/GeoNightModeToggle";

function labelFromTipo(tipo) {
  switch (tipo) {
    case "cliente":
      return "Clientes";
    case "prospecto":
      return "Prospectos";

    // 🟦 Competencia: soportamos ambos valores
    case "rival":
    case "oficina_rival":
      return "Competencia";

    // 🟩 Oficinas propias
    case "propia":
      return "Oficinas propias";

    // 🟧 Alquiler: valor nuevo + viejo
    case "alquiler":
    case "alquiler_disponible":
      return "Alquiler";

    case "cartel":
      return "Carteles";
    case "potencial":
      return "Potenciales";
    default:
      if (!tipo) return "Sin tipo";
      // Capitalizamos por defecto
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }
}

const GeoControlPanel = ({
  geoItems,
  // ubicación
  onUseMyLocation,
  // modo noche
  nightMode = false,
  onNightModeToggle,
  // filtro por tipo
  tipoFilter = "todos",
  onTipoFilterChange,
  // lista dinámica de tipos existentes
  tiposDisponibles = [],
}) => {
  // Normalizar lista para métricas
  const itemsList = (
    Array.isArray(geoItems)
      ? geoItems
      : geoItems
      ? Object.values(geoItems)
      : []
  ).filter((i) => i && i.id != null);

  const total = itemsList.length;
  const activas = itemsList.filter((i) => i.activa).length;

  const handleLocate = (coords) => {
    if (!onUseMyLocation) return;
    if (onUseMyLocation.length >= 1) onUseMyLocation(coords);
    else onUseMyLocation();
  };

  const handleToggleNight = () => {
    const next = !nightMode;
    if (typeof onNightModeToggle === "function") {
      if (onNightModeToggle.length >= 1) onNightModeToggle(next);
      else onNightModeToggle();
    }
  };

  const handleFilterClick = (value) => {
    if (!onTipoFilterChange) return;
    onTipoFilterChange(value);
  };

  // Opciones: "todos" + todos los tipos que existan en la BD
  const opciones = ["todos", ...tiposDisponibles];

  return (
    <div className="space-y-5">
      {/* Header mini tipo KPI */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Panel de control
          </h2>
          <p className="text-[11px] text-slate-400">
            Usá tu ubicación, modo noche y filtrá qué ver en el mapa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-slate-200 border border-slate-700/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            {activas} activas
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-slate-300 border border-slate-700/60">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            {total} mostradas
          </span>
        </div>
      </div>

      {/* Filtro rápido por tipo */}
      <div className="space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Qué querés ver
        </h3>
        <div className="flex flex-wrap gap-2">
          {opciones.map((value) => {
            const active = tipoFilter === value;
            const label = value === "todos" ? "Todos" : labelFromTipo(value);
            return (
              <button
                key={value || "sin-tipo"}
                type="button"
                onClick={() => handleFilterClick(value)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? "bg-sky-500 text-slate-950 border-sky-400 shadow-sm shadow-sky-500/40"
                    : "bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ubicación actual */}
      <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
        <p className="text-xs text-slate-300">
          Centrá el mapa en tu ubicación actual para ver qué puntos tenés cerca.
        </p>
        <GeoLocationButton onLocate={handleLocate} />
      </div>

      {/* Modo noche */}
      <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Apariencia del mapa
        </h3>
        <GeoNightModeToggle enabled={nightMode} onToggle={handleToggleNight} />
      </div>
    </div>
  );
};

export default GeoControlPanel;
