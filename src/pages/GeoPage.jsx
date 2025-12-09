// src/pages/GeoPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import { fetchGeoItems } from "../store/slices/geoSlice";
import GeoMapViewer from "../components/geo/GeoMapViewer";
import GeoTable from "../components/geo/GeoTable";
import GeoControlPanel from "../components/geo/GeoControlPanel";
import GeoCreateModal from "../components/geo/GeoCreateModal";
import PanelToggle from "../components/comunes/PanelToggle";

const DEFAULT_CENTER = { lat: -34.7611, lng: -58.5861 };

const GeoPage = () => {
  const dispatch = useDispatch();
  const { list: geoItems = [], status = "idle", error = null } =
    useSelector((state) => state.geo || {});

  const [selectedItem, setSelectedItem] = useState(null);
  const [nightMode, setNightMode] = useState(true);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const [mostrarPanel, setMostrarPanel] = useState(true);
  const [mostrarTabla, setMostrarTabla] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 🔹 filtro por tipo
  const [tipoFilter, setTipoFilter] = useState("todos");

  useEffect(() => {
    dispatch(fetchGeoItems());
  }, [dispatch]);

  // Normalizamos siempre a array y creamos alias para compatibilidad:
  // - latitud / longitud -> lat / lng (backend nuevo)
  // - activa -> activo
  // - fecha_creacion -> creado_en
  const normalizedItems = useMemo(() => {
    const base = Array.isArray(geoItems)
      ? geoItems
      : geoItems
      ? Object.values(geoItems)
      : [];

    const mapped = base.map((item) => {
      if (!item) return item;

      const latitud =
        item.latitud != null
          ? item.latitud
          : item.lat != null
          ? item.lat
          : null;

      const longitud =
        item.longitud != null
          ? item.longitud
          : item.lng != null
          ? item.lng
          : null;

      const activa =
        item.activa != null
          ? item.activa
          : item.activo != null
          ? item.activo
          : true;

      const fecha_creacion =
        item.fecha_creacion != null
          ? item.fecha_creacion
          : item.creado_en != null
          ? item.creado_en
          : null;

      return {
        ...item,
        latitud,
        longitud,
        activa,
        fecha_creacion,
      };
    });

    return mapped.filter(
      (item) =>
        item &&
        item.id != null &&
        item.latitud != null &&
        item.longitud != null
    );
  }, [geoItems]);

  // 🔹 tipos disponibles (para filtros y modal)
  const tiposDisponibles = useMemo(() => {
    const set = new Set();
    normalizedItems.forEach((item) => {
      if (item?.tipo) set.add(item.tipo);
    });
    return Array.from(set);
  }, [normalizedItems]);

  // 🔹 aplicamos el filtro por tipo
  const filteredItems = useMemo(() => {
    if (tipoFilter === "todos") return normalizedItems;
    return normalizedItems.filter((item) => item.tipo === tipoFilter);
  }, [normalizedItems, tipoFilter]);

  // Puede recibir coords (desde GeoLocationButton) o nada (botón del header)
  const handleUseMyLocation = (coordsFromChild) => {
    if (coordsFromChild && coordsFromChild.lat && coordsFromChild.lng) {
      setCenter(coordsFromChild);
      toast.success("Centramos el mapa en tu ubicación.");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Tu navegador no permite geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(coords);
        toast.success("Centramos el mapa en tu ubicación.");
      },
      () => {
        toast.error("No pudimos obtener tu ubicación.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleNightModeToggle = (next) => setNightMode(next);

  const handlePanelToggle = (open) => setMostrarPanel(open);
  const handleTablaToggle = (open) => setMostrarTabla(open);

  const isLoading = status === "loading";

  return (
    <div className="space-y-6">
      {/* Header tipo dashboard */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-50">
            Mapa de ubicaciones
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-xl">
            Cargá clientes, oficinas rivales, carteles o puntos potenciales y
            visualizalos en un mapa interactivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleUseMyLocation()}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Mi ubicación
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 hover:bg-sky-400"
          >
            <span className="text-lg leading-none">＋</span>
            Nueva ubicación
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          Cargando ubicaciones…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-600/60 bg-rose-950/40 p-4 text-sm text-rose-100">
          Ocurrió un error al cargar las ubicaciones.
        </div>
      )}

      {/* Panel lateral + mapa */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* Panel lateral */}
        <aside className="space-y-4">
          <PanelToggle
            label="Panel de control"
            initiallyOpen
            onToggle={handlePanelToggle}
          />

          {mostrarPanel && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_0_28px_rgba(15,23,42,0.85)]">
              <GeoControlPanel
                geoItems={filteredItems}
                onUseMyLocation={handleUseMyLocation}
                nightMode={nightMode}
                onNightModeToggle={handleNightModeToggle}
                tipoFilter={tipoFilter}
                onTipoFilterChange={setTipoFilter}
                tiposDisponibles={tiposDisponibles}
              />
            </div>
          )}
        </aside>

        {/* Mapa */}
        <section>
          <GeoMapViewer
            geoItems={filteredItems}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            center={center}
            nightMode={nightMode}
            draggable={false}
          />
        </section>
      </div>

      {/* Listado de ubicaciones (full width) */}
      <section className="space-y-3">
        <PanelToggle
          label="Listado de ubicaciones"
          initiallyOpen
          onToggle={handleTablaToggle}
        />

        {mostrarTabla && (
          <GeoTable
            geoItems={filteredItems}
            onEdit={(item) => toast(`Editar ${item.nombre}`, { icon: "✏️" })}
            onDelete={(item) =>
              toast(`Eliminar ${item.nombre}`, { icon: "🗑️" })
            }
          />
        )}
      </section>

      {/* Modal de alta */}
      <GeoCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        tiposDisponibles={tiposDisponibles}
      />
    </div>
  );
};

export default GeoPage;
