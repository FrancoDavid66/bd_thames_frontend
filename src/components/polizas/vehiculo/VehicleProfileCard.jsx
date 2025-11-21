// src/components/polizas/vehiculo/VehicleProfileCard.jsx
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { HiOutlinePhotograph, HiUpload, HiUserCircle, HiLink, HiEye } from "react-icons/hi";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import { PolizasAPI } from "../../../api/polizas";
import { updatePoliza } from "../../../store/slices/polizasSlice";

const linkStyle =
  "inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ring-sky-400/40";

export default function VehicleProfileCard({ poliza, onPerfilChange }) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const perfilUrl =
    poliza?.foto_perfil_url || poliza?.foto_perfil || poliza?.avatar_vehiculo_url || null;

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (file) => {
    if (!poliza?.id || !file) return;
    setBusy(true);
    try {
      const data = await uploadToCloudinary(file, "de-thames/vehiculos/perfil");
      if (PolizasAPI?.setFotoPerfil) {
        await PolizasAPI.setFotoPerfil(poliza.id, { url: data.secure_url, public_id: data.public_id || "" });
      } else {
        await dispatch(
          updatePoliza({ id: poliza.id, foto_perfil_url: data.secure_url, foto_perfil_public_id: data.public_id || "" })
        ).unwrap();
      }
      toast.success("Foto de perfil actualizada");
      onPerfilChange?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo actualizar la foto de perfil");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = Array.from(e.dataTransfer?.files || []).find((x) => x.type.startsWith("image/"));
    if (f) handleFile(f);
  };

  const copyLink = async () => {
    if (!perfilUrl) return;
    try {
      await navigator.clipboard.writeText(perfilUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className="relative h-56 lg:h-full min-h-[220px] bg-gradient-to-br from-neutral-800 to-neutral-900"
    >
      {/* Imagen / placeholder */}
      {perfilUrl ? (
        <img src={perfilUrl} alt="Foto del vehículo" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          <div className="flex flex-col items-center gap-2">
            <HiOutlinePhotograph className="w-10 h-10" />
            <span className={`${linkStyle}`} onClick={pickFile}>Elegí una imagen</span>
          </div>
        </div>
      )}

      {/* Overlay superior */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs border border-white/10">
          <HiUserCircle className="w-4 h-4 text-sky-300" /> Foto de perfil
        </span>
        {perfilUrl && (
          <div className="flex gap-2">
            <button
              onClick={() => window.open(perfilUrl, "_blank")}
              className="w-8 h-8 grid place-items-center rounded-lg bg-black/50 border border-white/10 text-white hover:bg-black/60 cursor-pointer"
              title="Abrir en pestaña nueva"
            >
              <HiEye />
            </button>
            <button
              onClick={copyLink}
              className="w-8 h-8 grid place-items-center rounded-lg bg-black/50 border border-white/10 text-white hover:bg-black/60 cursor-pointer"
              title="Copiar link"
            >
              <HiLink />
            </button>
          </div>
        )}
      </div>

      {/* Controles inferiores */}
      <div className={`absolute inset-x-0 bottom-0 p-3 transition ${dragOver ? "bg-black/40" : "bg-gradient-to-t from-black/50 to-transparent"}`}>
        <div className="flex items-center gap-2">
          <input ref={inputRef} hidden type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          <button
            onClick={pickFile}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
            title="Cambiar foto"
          >
            <HiUpload className="w-4 h-4" />
            {busy ? "Actualizando…" : "Cambiar"}
          </button>
          {dragOver && <span className="text-white/80 text-xs">Soltá la imagen para subirla…</span>}
        </div>
      </div>
    </div>
  );
}
