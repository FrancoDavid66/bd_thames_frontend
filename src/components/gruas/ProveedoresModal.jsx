// src/components/gruas/ProveedoresModal.jsx
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uploadToCloudinary } from "../../utils/cloudinary";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export default function ProveedoresModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "", // ✅ NUEVO
    patente_camion: "",
    modelo_camion: "",
    anio_camion: "",
  });

  const [files, setFiles] = useState({
    foto1: null,
    foto2: null,
    licencia: null,
    vtv: null,
  });

  const [phase, setPhase] = useState("idle"); // idle | uploading | saving
  const [err, setErr] = useState("");

  const saving = phase !== "idle";

  const canSubmit = useMemo(() => {
    const anio = toInt(form.anio_camion);
    return (
      form.nombre.trim().length >= 2 &&
      // ✅ teléfono opcional (si querés hacerlo obligatorio: agregar && form.telefono.trim().length >= 6)
      form.patente_camion.trim().length >= 5 &&
      form.modelo_camion.trim().length >= 2 &&
      anio >= 1950 &&
      anio <= new Date().getFullYear() + 1 &&
      !!files.foto1 &&
      !!files.foto2 &&
      !!files.licencia &&
      !!files.vtv
    );
  }, [form, files]);

  function resetAll() {
    setForm({ nombre: "", telefono: "", patente_camion: "", modelo_camion: "", anio_camion: "" });
    setFiles({ foto1: null, foto2: null, licencia: null, vtv: null });
    setPhase("idle");
    setErr("");
  }

  function close() {
    if (saving) return;
    resetAll();
    onClose?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!canSubmit) {
      setErr("Completá todos los campos y subí los 4 archivos.");
      return;
    }

    try {
      setPhase("uploading");

      // ✅ Subidas Cloudinary (front)
      const [upFoto1, upFoto2, upLic, upVtv] = await Promise.all([
        uploadToCloudinary(files.foto1, { folder: "gruas/proveedores/camion" }),
        uploadToCloudinary(files.foto2, { folder: "gruas/proveedores/camion" }),
        uploadToCloudinary(files.licencia, { folder: "gruas/proveedores/licencia" }),
        uploadToCloudinary(files.vtv, { folder: "gruas/proveedores/vtv" }),
      ]);

      // ✅ Payload DIRECTO backend
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(), // ✅ NUEVO
        patente_camion: form.patente_camion.trim().toUpperCase(),
        modelo_camion: form.modelo_camion.trim(),
        anio_camion: toInt(form.anio_camion),

        foto_camion_1_url: upFoto1.secure_url,
        foto_camion_1_public_id: upFoto1.public_id,
        foto_camion_2_url: upFoto2.secure_url,
        foto_camion_2_public_id: upFoto2.public_id,

        licencia_url: upLic.secure_url,
        licencia_public_id: upLic.public_id,

        vtv_url: upVtv.secure_url,
        vtv_public_id: upVtv.public_id,

        activo: true,
      };

      setPhase("saving");

      // ✅ esperar backend
      await Promise.resolve(onCreated?.(payload));

      // ✅ si salió bien, cerramos y reseteamos
      resetAll();
      onClose?.();
    } catch (e2) {
      // si falla backend, dejamos todo para reintentar
      setErr(String(e2?.message || e2 || "Error creando proveedor"));
    } finally {
      setPhase("idle");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* overlay */}
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          {/* modal */}
          <motion.div
            className={classNames(
              "relative w-full max-w-xl rounded-2xl border border-slate-800",
              "bg-slate-950 shadow-xl"
            )}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">Nuevo proveedor</div>
                <div className="text-xs text-slate-500">Cloudinary → backend (URL + public_id).</div>
              </div>

              <button
                onClick={close}
                disabled={saving}
                className={classNames(
                  "px-3 py-2 rounded-xl text-xs border border-slate-800",
                  saving
                    ? "bg-slate-900 text-slate-500 cursor-not-allowed"
                    : "bg-slate-900 text-slate-100 hover:bg-slate-800"
                )}
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nombre */}
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400">Nombre del proveedor/chofer</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className={classNames(
                    "mt-1 w-full px-3 py-2 rounded-xl text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  placeholder="Ej: Juan Pérez"
                  disabled={saving}
                />
              </div>

              {/* ✅ Teléfono */}
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400">Teléfono (WhatsApp)</label>
                <input
                  value={form.telefono}
                  onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                  className={classNames(
                    "mt-1 w-full px-3 py-2 rounded-xl text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  placeholder="Ej: 351 555-1234"
                  disabled={saving}
                />
                <div className="mt-1 text-[11px] text-slate-500">Opcional. Se guarda tal cual.</div>
              </div>

              {/* Patente */}
              <div>
                <label className="text-xs text-slate-400">Patente del camión</label>
                <input
                  value={form.patente_camion}
                  onChange={(e) => setForm((p) => ({ ...p, patente_camion: e.target.value }))}
                  className={classNames(
                    "mt-1 w-full px-3 py-2 rounded-xl text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  placeholder="AAA123 / AB123CD"
                  disabled={saving}
                />
              </div>

              {/* Año */}
              <div>
                <label className="text-xs text-slate-400">Año del camión</label>
                <input
                  value={form.anio_camion}
                  onChange={(e) => setForm((p) => ({ ...p, anio_camion: e.target.value }))}
                  className={classNames(
                    "mt-1 w-full px-3 py-2 rounded-xl text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  placeholder="2020"
                  disabled={saving}
                />
              </div>

              {/* Modelo */}
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400">Modelo del camión</label>
                <input
                  value={form.modelo_camion}
                  onChange={(e) => setForm((p) => ({ ...p, modelo_camion: e.target.value }))}
                  className={classNames(
                    "mt-1 w-full px-3 py-2 rounded-xl text-sm",
                    "bg-slate-900 border border-slate-800 text-slate-100",
                    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  )}
                  placeholder="Ej: Iveco Daily / Ford Cargo ..."
                  disabled={saving}
                />
              </div>

              {/* Uploads */}
              <div className="sm:col-span-2 mt-1">
                <div className="text-xs font-semibold text-slate-200">Archivos (Cloudinary)</div>
                <div className="text-[11px] text-slate-500">
                  Requeridos: 2 fotos del camión + licencia + VTV
                </div>
              </div>

              <FileField
                label="Foto camión 1"
                file={files.foto1}
                onChange={(f) => setFiles((p) => ({ ...p, foto1: f }))}
                disabled={saving}
              />
              <FileField
                label="Foto camión 2"
                file={files.foto2}
                onChange={(f) => setFiles((p) => ({ ...p, foto2: f }))}
                disabled={saving}
              />
              <FileField
                label="Licencia de conducir"
                file={files.licencia}
                onChange={(f) => setFiles((p) => ({ ...p, licencia: f }))}
                disabled={saving}
              />
              <FileField
                label="VTV"
                file={files.vtv}
                onChange={(f) => setFiles((p) => ({ ...p, vtv: f }))}
                disabled={saving}
              />

              {err && (
                <div className="sm:col-span-2 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
                  {err}
                </div>
              )}

              <div className="sm:col-span-2 flex items-center justify-between gap-2 mt-2">
                <div className="text-[11px] text-slate-500">
                  {phase === "uploading"
                    ? "Subiendo a Cloudinary…"
                    : phase === "saving"
                    ? "Guardando en backend…"
                    : ""}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className={classNames(
                      "px-3 py-2 rounded-xl text-xs border border-slate-800",
                      saving
                        ? "bg-slate-900 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 text-slate-100 hover:bg-slate-800"
                    )}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={classNames(
                      "px-3 py-2 rounded-xl text-xs border",
                      canSubmit && !saving
                        ? "bg-slate-100 text-slate-900 border-slate-100 hover:opacity-90"
                        : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed"
                    )}
                    disabled={!canSubmit || saving}
                  >
                    {phase === "uploading"
                      ? "Subiendo…"
                      : phase === "saving"
                      ? "Guardando…"
                      : "Crear proveedor"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FileField({ label, file, onChange, disabled }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.files?.[0] || null)}
          className={classNames(
            "w-full text-xs",
            "file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border-0",
            "file:bg-slate-100 file:text-slate-900 hover:file:opacity-90",
            "text-slate-200"
          )}
        />
      </div>
      {file?.name && <div className="mt-1 text-[11px] text-slate-500">{file.name}</div>}
    </div>
  );
}
