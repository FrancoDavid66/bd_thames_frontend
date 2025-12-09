// src/components/competencia/CompetenciaFormModal.jsx
import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  HiX,
  HiLocationMarker,
  HiLink,
  HiPlus,
  HiTrash,
} from "react-icons/hi";

function parseCoordsFromGoogleMaps(url) {
  if (!url) return { lat: null, lng: null };
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) return { lat: null, lng: null };
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    };
  } catch (e) {
    return { lat: null, lng: null };
  }
}

const emptyCompetidor = {
  nombre: "",
  redes: "",
  direccion: "",
  ciudad: "",
  url_maps: "",
  latitud: null,
  longitud: null,
};

const emptyOferta = {
  compania: "",
  cobertura: "",
  precio: "",
};

const emptyRed = {
  tipo: "instagram",
  valor: "",
};

const REDES_OPCIONES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "web", label: "Web" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "otro", label: "Otro" },
];

const CompetenciaFormModal = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  saving = false,
}) => {
  const [competidor, setCompetidor] = useState(emptyCompetidor);
  const [ofertas, setOfertas] = useState([emptyOferta]);
  const [redesList, setRedesList] = useState([emptyRed]);
  const [coordStatus, setCoordStatus] = useState(null); // texto corto de ayuda

  // Cargar datos al abrir
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setCompetidor({
        nombre: initialData.nombre || "",
        redes: initialData.redes || "",
        direccion: initialData.direccion || "",
        ciudad: initialData.ciudad || "",
        url_maps: initialData.url_maps || "",
        latitud: initialData.latitud ?? null,
        longitud: initialData.longitud ?? null,
      });

      setOfertas([
        {
          compania: initialData.compania || "",
          cobertura: initialData.cobertura || "",
          precio:
            initialData.precio === null || initialData.precio === undefined
              ? ""
              : String(initialData.precio),
        },
      ]);

      // Intento simple: si ya había un string de redes, lo pongo en una fila "otro"
      if (initialData.redes) {
        setRedesList([
          {
            tipo: "otro",
            valor: initialData.redes,
          },
        ]);
      } else {
        setRedesList([emptyRed]);
      }

      setCoordStatus(null);
    } else {
      setCompetidor(emptyCompetidor);
      setOfertas([emptyOferta]);
      setRedesList([emptyRed]);
      setCoordStatus(null);
    }
  }, [isOpen, initialData]);

  // Handlers competidor (nombre + ubicación + url)
  const handleCompetidorChange = (e) => {
    const { name, value } = e.target;
    setCompetidor((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handlers ofertas (compañía + cobertura + precio)
  const handleOfertaChange = (index, field, value) => {
    setOfertas((prev) =>
      prev.map((of, i) =>
        i === index
          ? {
              ...of,
              [field]:
                field === "precio" ? value.replace(",", ".") : value,
            }
          : of
      )
    );
  };

  const handleAddOferta = () => {
    setOfertas((prev) => [...prev, { ...emptyOferta }]);
  };

  const handleRemoveOferta = (index) => {
    setOfertas((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  // Handlers redes (varias filas)
  const handleRedChange = (index, field, value) => {
    setRedesList((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              [field]: value,
            }
          : r
      )
    );
  };

  const handleAddRed = () => {
    setRedesList((prev) => [...prev, { ...emptyRed }]);
  };

  const handleRemoveRed = (index) => {
    setRedesList((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const handleUrlBlur = () => {
    if (!competidor.url_maps) {
      setCoordStatus(null);
      return;
    }
    const { lat, lng } = parseCoordsFromGoogleMaps(competidor.url_maps);
    if (lat != null && lng != null) {
      setCompetidor((prev) => ({
        ...prev,
        latitud: lat,
        longitud: lng,
      }));
      setCoordStatus("Coordenadas detectadas automáticamente ✅");
    } else {
      setCoordStatus("No se pudieron leer coordenadas de la URL ❌");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!competidor.nombre.trim()) {
      setCoordStatus("El nombre es obligatorio");
      return;
    }

    // Ofertas limpias
    const ofertasLimpias = ofertas
      .map((of) => ({
        compania: (of.compania || "").trim(),
        cobertura: (of.cobertura || "").trim(),
        precio:
          of.precio === "" || of.precio === null || of.precio === undefined
            ? null
            : parseFloat(of.precio),
      }))
      .filter(
        (of) =>
          of.compania ||
          of.cobertura ||
          (of.precio !== null && !isNaN(of.precio))
      );

    if (ofertasLimpias.length === 0) {
      setCoordStatus("Agregá al menos una cobertura/compañía/precio");
      return;
    }

    // Redes limpias → las transformamos en un solo string
    const redesLimpias = redesList
      .map((r) => ({
        tipo: r.tipo || "otro",
        valor: (r.valor || "").trim(),
      }))
      .filter((r) => r.valor);

    const redesStr = redesLimpias
      .map((r) => {
        const tipoLabel =
          REDES_OPCIONES.find((opt) => opt.value === r.tipo)?.label ||
          "Otro";
        return `${tipoLabel}: ${r.valor}`;
      })
      .join(" | ");

    const payload = {
      ...competidor,
      redes: redesStr,
      ofertas: ofertasLimpias,
    };

    onSave(payload);
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={saving ? () => {} : onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel className="w-full max-w-3xl rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-slate-50">
                    {initialData
                      ? "Editar competencia"
                      : "Nuevo registro de competencia"}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Bloque 1: Datos del competidor */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                    <p className="text-xs text-slate-400 mb-1">
                      Datos del competidor (se usan para todas las ofertas).
                    </p>

                    {/* Nombre */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Nombre del competidor *
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        value={competidor.nombre}
                        onChange={handleCompetidorChange}
                        className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        placeholder="Ej: Seguro Online XYZ"
                        required
                      />
                    </div>

                    {/* Redes (múltiples) */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-300">
                          Redes / Canales
                        </span>
                        <button
                          type="button"
                          onClick={handleAddRed}
                          className="inline-flex items-center h-7 px-2.5 rounded-lg bg-slate-800 text-[11px] text-slate-100 hover:bg-slate-700"
                        >
                          <HiPlus className="w-3.5 h-3.5 mr-1" />
                          Agregar red
                        </button>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {redesList.map((r, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[0.9fr_1.6fr_auto] gap-2 items-center"
                          >
                            <select
                              value={r.tipo}
                              onChange={(e) =>
                                handleRedChange(
                                  index,
                                  "tipo",
                                  e.target.value
                                )
                              }
                              className="h-8 px-2 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                            >
                              {REDES_OPCIONES.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={r.valor}
                              onChange={(e) =>
                                handleRedChange(
                                  index,
                                  "valor",
                                  e.target.value
                                )
                              }
                              className="h-8 px-2 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="Usuario, URL, nro, etc."
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveRed(index)}
                              disabled={redesList.length <= 1}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-900/70 text-red-100 hover:bg-red-800 disabled:opacity-40"
                              title="Eliminar red"
                            >
                              <HiTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dirección + Ciudad */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Dirección
                        </label>
                        <input
                          type="text"
                          name="direccion"
                          value={competidor.direccion}
                          onChange={handleCompetidorChange}
                          className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          placeholder="Ej: Av. Siempre Viva 123"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Ciudad
                        </label>
                        <input
                          type="text"
                          name="ciudad"
                          value={competidor.ciudad}
                          onChange={handleCompetidorChange}
                          className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          placeholder="Ej: Merlo, San Justo..."
                        />
                      </div>
                    </div>

                    {/* URL de Maps */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1 flex items-center gap-1">
                        <HiLink className="w-4 h-4" />
                        URL de Google Maps
                      </label>
                      <input
                        type="url"
                        name="url_maps"
                        value={competidor.url_maps}
                        onChange={handleCompetidorChange}
                        onBlur={handleUrlBlur}
                        className="w-full h-11 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        placeholder="Pegá aquí la URL de Google Maps"
                      />
                      {coordStatus && (
                        <p className="mt-1 text-xs text-slate-400">
                          {coordStatus}
                        </p>
                      )}
                      {(competidor.latitud != null ||
                        competidor.longitud != null) && (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-300">
                          <HiLocationMarker className="w-4 h-4" />
                          <span>
                            Lat:{" "}
                            <span className="font-mono">
                              {competidor.latitud}
                            </span>{" "}
                            | Lng:{" "}
                            <span className="font-mono">
                              {competidor.longitud}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloque 2: Ofertas (compañía + cobertura + precio) */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">
                          Ofertas de este competidor
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Cargá una o varias combinaciones de compañía,
                          cobertura y precio (se usa la misma ubicación).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOferta}
                        className="inline-flex items-center h-8 px-3 rounded-lg bg-slate-800 text-xs text-slate-100 hover:bg-slate-700"
                      >
                        <HiPlus className="w-4 h-4 mr-1" />
                        Agregar oferta
                      </button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {ofertas.map((oferta, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-[1.1fr_1.2fr_0.8fr_auto] gap-2 items-center bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2"
                        >
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-0.5">
                              Compañía
                            </label>
                            <input
                              type="text"
                              value={oferta.compania}
                              onChange={(e) =>
                                handleOfertaChange(
                                  index,
                                  "compania",
                                  e.target.value
                                )
                              }
                              className="w-full h-9 px-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="Ej: Sancor, RUS..."
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-0.5">
                              Cobertura
                            </label>
                            <input
                              type="text"
                              value={oferta.cobertura}
                              onChange={(e) =>
                                handleOfertaChange(
                                  index,
                                  "cobertura",
                                  e.target.value
                                )
                              }
                              className="w-full h-9 px-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="Ej: Terceros completo"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-0.5">
                              Precio (mensual)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={oferta.precio}
                              onChange={(e) =>
                                handleOfertaChange(
                                  index,
                                  "precio",
                                  e.target.value
                                )
                              }
                              className="w-full h-9 px-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              placeholder="Ej: 15000"
                            />
                          </div>
                          <div className="flex justify-end items-center pt-4 md:pt-5">
                            <button
                              type="button"
                              onClick={() => handleRemoveOferta(index)}
                              disabled={ofertas.length <= 1}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-900/70 text-red-100 hover:bg-red-800 disabled:opacity-40"
                              title="Eliminar oferta"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="h-10 px-4 rounded-xl border border-slate-600 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-10 px-5 rounded-xl bg-primary-500 text-sm font-medium text-white hover:bg-primary-400 disabled:opacity-50"
                    >
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CompetenciaFormModal;
