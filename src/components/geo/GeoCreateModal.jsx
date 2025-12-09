// src/components/geo/GeoCreateModal.jsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";

import { createGeoItem } from "../../store/slices/geoSlice";
import { extraerCoordsDesdeUrl } from "../../utils/geoUtils";

const INITIAL_FORM = {
  tipo: "",
  nombre: "",
  direccion: "",
  latitud: "",
  longitud: "",
  nota: "",
  activa: true,
  url_maps: "",
};

function labelFromTipo(tipo) {
  switch (tipo) {
    case "cliente":
      return "Cliente";
    case "prospecto":
      return "Prospecto";

    // Competencia
    case "rival":
    case "oficina_rival":
      return "Competencia";

    // Oficinas propias
    case "propia":
      return "Oficina propia";

    // Alquiler
    case "alquiler":
    case "alquiler_disponible":
      return "Alquiler disponible";

    case "cartel":
      return "Cartel / publicidad";
    case "potencial":
      return "Ubicación potencial";
    default:
      if (!tipo) return "Sin tipo";
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }
}

const GeoCreateModal = ({ isOpen, onClose, tiposDisponibles = [] }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [customTipo, setCustomTipo] = useState("");

  // Opciones de tipo base (nuevas): usamos los valores "canónicos"
  const opcionesTipo = useMemo(() => {
    const base = [
      "cliente",
      "prospecto",
      "propia", // oficinas propias
      "rival", // competencia
      "cartel",
      "alquiler",
      "potencial",
    ];
    const set = new Set([...base, ...(tiposDisponibles || [])]);
    return Array.from(set).filter(Boolean);
  }, [tiposDisponibles]);

  useEffect(() => {
    if (!isOpen) {
      setFormData(INITIAL_FORM);
      setSubmitting(false);
      setCustomTipo("");
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "tipo") {
      setFormData((prev) => ({ ...prev, tipo: value }));
      if (value !== "__custom__") {
        setCustomTipo("");
      }
      return;
    }

    // Cuando escribís / pegás una URL de Maps
    if (name === "url_maps") {
      let lat = null;
      let lng = null;

      try {
        const coords = extraerCoordsDesdeUrl(value);
        if (coords && coords.lat != null && coords.lng != null) {
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch (err) {
        console.warn("Error extrayendo coords de URL:", err);
      }

      setFormData((prev) => ({
        ...prev,
        url_maps: value,
        ...(lat != null && lng != null
          ? {
              latitud: String(lat),
              longitud: String(lng),
            }
          : {}),
      }));

      return;
    }

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    let finalTipo =
      formData.tipo === "__custom__" ? customTipo.trim() : formData.tipo;

    if (!finalTipo) {
      toast.error("Seleccioná un tipo o creá uno nuevo.");
      return;
    }

    if (!formData.nombre) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    if (!formData.latitud || !formData.longitud) {
      toast.error(
        "Completá latitud y longitud o pegá una URL de Google Maps."
      );
      return;
    }

    const lat = parseFloat(formData.latitud);
    const lng = parseFloat(formData.longitud);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitud y longitud no son válidas.");
      return;
    }

    const payload = {
      tipo: finalTipo,
      nombre: formData.nombre,
      direccion: formData.direccion || "",
      lat,
      lng,
      nota: formData.nota || "",
      activo: !!formData.activa,
    };

    try {
      setSubmitting(true);
      await dispatch(createGeoItem(payload)).unwrap();
      toast.success("Ubicación creada correctamente.");
      onClose && onClose();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo crear la ubicación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">
                  Nueva ubicación
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Pegá una URL de Google Maps o cargá las coordenadas
                  manualmente. Si la URL tiene coordenadas, se completan
                  automáticamente los campos de latitud y longitud.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                disabled={submitting}
              >
                Cerrar
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo + nombre */}
              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Seleccioná un tipo</option>
                    {opcionesTipo.map((t) => (
                      <option key={t} value={t}>
                        {labelFromTipo(t)}
                      </option>
                    ))}
                    <option value="__custom__">+ Agregar nuevo tipo…</option>
                  </select>

                  {formData.tipo === "__custom__" && (
                    <div className="mt-2 flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-slate-300">
                        Nuevo tipo
                      </label>
                      <input
                        type="text"
                        value={customTipo}
                        onChange={(e) => setCustomTipo(e.target.value)}
                        placeholder="Ej: Taller amigo, Estación de servicio…"
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <p className="text-[11px] text-slate-500">
                        Este nombre se usará también en los filtros.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Cliente Juan Pérez / Cartel 5 Esquinas"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  placeholder="Ej: Av. Siempre Viva 742, Lomas"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* URL Maps */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">
                  URL de Google Maps (opcional)
                </label>
                <input
                  type="text"
                  name="url_maps"
                  value={formData.url_maps}
                  onChange={handleChange}
                  placeholder="Pegá acá la URL completa de Google Maps"
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-500">
                  Si la URL contiene coordenadas, completamos Latitud y Longitud
                  automáticamente.
                </p>
              </div>

              {/* Coordenadas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    name="latitud"
                    value={formData.latitud}
                    onChange={handleChange}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    name="longitud"
                    value={formData.longitud}
                    onChange={handleChange}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Nota */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nota / detalles (opcional)
                </label>
                <textarea
                  name="nota"
                  value={formData.nota}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Notas sobre la zona, visibilidad, condiciones del local, etc."
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Activa + botones */}
              <div className="flex flex-col gap-3 border-top border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    name="activa"
                    checked={formData.activa}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Mantener esta ubicación activa</span>
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 hover:bg-sky-400 disabled:opacity-60"
                  >
                    {submitting ? "Guardando…" : "Crear ubicación"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GeoCreateModal;
