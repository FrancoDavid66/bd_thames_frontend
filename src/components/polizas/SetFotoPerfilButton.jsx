// src/components/polizas/SetFotoPerfilButton.jsx
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { PolizasAPI } from "../../api/polizas";

export default function SetFotoPerfilButton({ polizaId, onPerfilActualizado }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const openPicker = () => inputRef.current?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const { secure_url, public_id } = await uploadToCloudinary(file, "rc-admin/vehiculos/perfil");
      const id = typeof polizaId === 'object' ? (polizaId?.id ?? null) : polizaId;
      if (!id) throw new Error("ID de póliza inválido");
      await PolizasAPI.setFotoPerfil(id, { url: secure_url, public_id });
      toast.success("Foto de perfil actualizada");
      onPerfilActualizado?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Error al actualizar foto de perfil");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={onChange} className="hidden" />
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-60"
        title="Subir y colocar foto de perfil"
      >
        {busy ? "Subiendo..." : "Colocar foto de perfil"}
      </button>
    </>
  );
}
