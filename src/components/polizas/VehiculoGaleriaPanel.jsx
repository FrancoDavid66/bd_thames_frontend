// src/components/polizas/VehiculoGaleriaPanel.jsx
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";

// Solo TIPOS de FOTO del vehículo (coinciden con backend TipoFotoVehiculo)
// NOTA: removido "VIN" (no existe en backend) y EXCLUIMOS "OBLEA_GNC" para que vaya a Documentos.
// Agregado "EQUIPO_GNC" porque es foto (tubo/equipo dentro del vehículo).
const TIPOS = [
  "PATENTE",
  "FRENTE",
  "LATERAL_IZQ",
  "LATERAL_DER",
  "TRASERA",
  "INTERIOR",
  "EQUIPO_GNC",
  "OTRA",
];

// Orígenes; agregamos SOLICITUD porque ya existe en backend
const ORIGENES = ["ONBOARDING", "OFICINA", "SINIESTRO", "SOLICITUD", "OTRO"];

export default function VehiculoGaleriaPanel({ polizaId }) {
  const [loading, setLoading] = useState(true);
  const [fotos, setFotos] = useState([]);
  const [tipo, setTipo] = useState("PATENTE");
  const [origen, setOrigen] = useState("ONBOARDING");
  const [file, setFile] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const load = async () => {
    if (!polizaId) return;
    try {
      setLoading(true);
      const data = await PolizasAPI.getFotosVehiculo({ poliza: polizaId });
      // Acepta array plano o paginado
      setFotos(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      toast.error(e?.message || "Error cargando fotos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (polizaId) load();
  }, [polizaId]);

  const subir = async () => {
    if (!file || !polizaId) return;
    try {
      setSubiendo(true);
      const { secure_url, public_id } = await uploadToCloudinary(
        file,
        "rc-admin/polizas/vehiculos"
      );
      await PolizasAPI.crearFotoVehiculo({
        poliza: Number(polizaId),
        tipo,
        url: secure_url,
        public_id,
        origen,
      });
      setFile(null);
      await load();
      toast.success("Foto subida");
    } catch (e) {
      toast.error(e?.message || "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = async (id) => {
    try {
      await PolizasAPI.borrarFotoVehiculo(id);
      setFotos((prev) => prev.filter((f) => f.id !== id));
      toast.success("Foto eliminada");
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  const sortedFotos = useMemo(() => {
    if (!Array.isArray(fotos)) return [];
    const order = new Map(TIPOS.map((t, i) => [t, i]));
    return [...fotos].sort((a, b) => {
      const ai = order.has(a.tipo) ? order.get(a.tipo) : 999;
      const bi = order.has(b.tipo) ? order.get(b.tipo) : 999;
      return ai - bi || String(a.tipo).localeCompare(String(b.tipo));
    });
  }, [fotos]);

  if (!polizaId) {
    return (
      <div className="text-sm text-gray-400">
        Seleccioná una póliza para ver la galería de fotos del vehículo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Uploader */}
      <div className="grid md:grid-cols-[1fr_1fr_2fr_auto] gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm"
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={origen}
          onChange={(e) => setOrigen(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm"
        >
          {ORIGENES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm"
        />
        <button
          disabled={!file || subiendo}
          onClick={subir}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {subiendo ? "Subiendo..." : "Subir foto"}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 bg-gray-800 rounded animate-pulse"
            />
          ))}
        </div>
      ) : sortedFotos?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sortedFotos.map((f) => (
            <div
              key={f.id}
              className="rounded-lg overflow-hidden border border-gray-700 bg-gray-800"
            >
              <a href={f.url} target="_blank" rel="noreferrer">
                <img
                  src={f.url}
                  alt={f.tipo}
                  className="w-full h-36 object-cover"
                />
              </a>
              <div className="p-2 text-xs flex items-center justify-between gap-2">
                <span className="text-gray-300 truncate">
                  {f.tipo} · {f.origen}
                </span>
                <button
                  onClick={() => borrar(f.id)}
                  className="text-red-300 hover:text-red-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          No hay fotos cargadas para esta póliza.
        </div>
      )}
    </div>
  );
}
