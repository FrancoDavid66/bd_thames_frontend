// src/components/polizas/VehiculoGaleriaPanel.jsx
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";
// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE DE ROLES
import { useAuth } from "../../context/AuthContext";

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
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  const [loading, setLoading] = useState(true);
  const [fotos, setFotos] = useState([]);
  const [tipo, setTipo] = useState("PATENTE");
  const [origen, setOrigen] = useState("ONBOARDING");
  const [file, setFile] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // 🛡️ Lógica de permisos
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  const load = async () => {
    if (!polizaId) return;
    try {
      setLoading(true);
      // PolizasAPI ya usa la instancia central segura corregida previamente
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
      // Carpeta destino en Cloudinary
      const { secure_url, public_id } = await uploadToCloudinary(
        file,
        "rc-admin/polizas/vehiculos"
      );
      
      // Creamos el registro en el backend
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
      console.error("[VehiculoGaleria] Error al subir:", e);
      toast.error(e?.message || "No se pudo subir la foto");
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = async (id) => {
    // 🛡️ Solo el Admin puede borrar fotos de la galería
    if (!isWebAdmin) {
      toast.error("Solo los administradores pueden eliminar fotos.");
      return;
    }

    if (!confirm("¿Eliminar esta foto de la galería?")) return;

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
      {/* Uploader Section */}
      <div className="rounded-xl border border-white/5 bg-white/5 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_2fr_auto] gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Tipo de Foto</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:ring-2 ring-blue-500/40 outline-none"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Origen</label>
            <select
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:ring-2 ring-blue-500/40 outline-none"
            >
              {ORIGENES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Archivo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
            />
          </div>

          <div className="flex items-end">
            <button
              disabled={!file || subiendo}
              onClick={subir}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {subiendo ? "Subiendo..." : "Subir foto"}
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Fotos */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-gray-800/50 rounded-xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : sortedFotos?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedFotos.map((f) => (
            <div
              key={f.id}
              className="group relative rounded-xl overflow-hidden border border-white/10 bg-gray-900 shadow-xl transition-all hover:border-blue-500/50"
            >
              <a href={f.url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={f.url}
                  alt={f.tipo}
                  className="w-full h-36 sm:h-40 object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-75"
                />
              </a>
              
              <div className="p-2 border-t border-white/5 bg-gray-950/50 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-tight truncate">
                      {f.tipo}
                    </div>
                    <div className="text-[9px] text-gray-500 font-bold uppercase truncate">
                      {f.origen}
                    </div>
                  </div>
                  
                  {/* 🛡️ SOLO ADMIN PUEDE ELIMINAR */}
                  {isWebAdmin && (
                    <button
                      onClick={() => borrar(f.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      title="Eliminar foto"
                    >
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Botón flotante para expandir */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={f.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10"
                >
                  <HiExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
           <HiPhotograph className="text-4xl text-gray-700 mb-2" />
           <div className="text-sm text-gray-500 font-medium">
             No hay fotos cargadas para esta póliza.
           </div>
        </div>
      )}
    </div>
  );
}