// src/components/gruas/ProveedorProfileModal.jsx
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { uploadToCloudinary } from "../../utils/cloudinary";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safe(v) {
  return (v ?? "").toString().trim();
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/* =========================
   Tel helpers (WhatsApp / Llamar)
========================= */
function digitsOnly(s) {
  return String(s || "").replace(/\D+/g, "");
}
function waUrl(rawTel, msg = "") {
  const d = digitsOnly(rawTel);
  if (!d) return "";
  const phone = d.startsWith("54") ? d : `54${d}`;
  const text = String(msg || "").trim();
  const qs = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${phone}${qs}`;
}
function telUrl(rawTel) {
  const d = digitsOnly(rawTel);
  if (!d) return "";
  return `tel:+${d.startsWith("+") ? d.slice(1) : d}`;
}

function ImgCard({ label, url, hint }) {
  const u = safe(url);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{label}</div>
          {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
        </div>
        {u ? (
          <a
            href={u}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            Abrir
          </a>
        ) : (
          <span className="text-[11px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-500">
            Sin
          </span>
        )}
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-black/20">
        {u ? (
          <img src={u} alt={label} className="h-40 w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-40 w-full flex items-center justify-center text-xs text-slate-500">
            Sin imagen
          </div>
        )}
      </div>

      {u ? <div className="mt-2 text-[11px] text-slate-500 truncate">{u}</div> : null}
    </div>
  );
}

function FileReplace({ label, disabled, onPick, loading, fileHint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400">{label}</div>
          {fileHint ? <div className="text-[11px] text-slate-500">{fileHint}</div> : null}
        </div>

        <label
          className={classNames(
            "text-[11px] px-2 py-1 rounded-lg border",
            disabled || loading
              ? "border-slate-800 bg-slate-900 text-slate-500 cursor-not-allowed"
              : "border-slate-200 bg-slate-100 text-slate-900 hover:opacity-90 cursor-pointer"
          )}
        >
          {loading ? "Subiendo..." : "Reemplazar"}
          <input
            type="file"
            accept="image/*"
            disabled={disabled || loading}
            onChange={(e) => onPick?.(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

export default function ProveedorProfileModal({
  open,
  onClose,
  proveedor,
  onUpdate, // (id, data) => Promise<updatedProveedor>
  onDelete, // (proveedor) => Promise | void
}) {
  const p = proveedor || null;

  const [edit, setEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [uploading, setUploading] = useState({
    foto1: false,
    foto2: false,
    licencia: false,
    vtv: false,
  });

  const [draft, setDraft] = useState({
    nombre: "",
    telefono: "", // ✅ NUEVO
    patente_camion: "",
    modelo_camion: "",
    anio_camion: "",
    activo: true,

    foto_camion_1_url: "",
    foto_camion_1_public_id: "",
    foto_camion_2_url: "",
    foto_camion_2_public_id: "",
    licencia_url: "",
    licencia_public_id: "",
    vtv_url: "",
    vtv_public_id: "",
  });

  useEffect(() => {
    if (!open) return;
    setErr("");
    setConfirmDelete(false);
    setEdit(false);

    setDraft({
      nombre: safe(p?.nombre),
      telefono: safe(p?.telefono), // ✅ NUEVO
      patente_camion: safe(p?.patente_camion).toUpperCase(),
      modelo_camion: safe(p?.modelo_camion),
      anio_camion: p?.anio_camion ? String(p.anio_camion) : "",
      activo: p?.activo !== false,

      foto_camion_1_url: safe(p?.foto_camion_1_url),
      foto_camion_1_public_id: safe(p?.foto_camion_1_public_id),
      foto_camion_2_url: safe(p?.foto_camion_2_url),
      foto_camion_2_public_id: safe(p?.foto_camion_2_public_id),
      licencia_url: safe(p?.licencia_url),
      licencia_public_id: safe(p?.licencia_public_id),
      vtv_url: safe(p?.vtv_url),
      vtv_public_id: safe(p?.vtv_public_id),
    });

    setUploading({ foto1: false, foto2: false, licencia: false, vtv: false });
  }, [open, p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = useMemo(() => {
    if (!p) return "Proveedor";
    return safe(p?.nombre) || `Proveedor #${p?.id}`;
  }, [p]);

  function close() {
    if (saving) return;
    setErr("");
    setConfirmDelete(false);
    setEdit(false);
    onClose?.();
  }

  async function saveFields() {
    setErr("");
    if (!p?.id) return;

    const nombre = safe(draft.nombre);
    const telefono = safe(draft.telefono); // ✅ NUEVO
    const patente = safe(draft.patente_camion).toUpperCase();
    const modelo = safe(draft.modelo_camion);
    const anio = toInt(draft.anio_camion);

    if (nombre.length < 2) return setErr("Nombre inválido.");
    if (patente.length < 5) return setErr("Patente inválida.");
    if (modelo.length < 2) return setErr("Modelo inválido.");
    const y = new Date().getFullYear() + 1;
    if (anio < 1950 || anio > y) return setErr("Año inválido.");

    const data = {
      nombre,
      telefono, // ✅ NUEVO
      patente_camion: patente,
      modelo_camion: modelo,
      anio_camion: anio,
      activo: !!draft.activo,
    };

    try {
      setSaving(true);
      await onUpdate?.(p.id, data);
      setEdit(false);
    } catch (e) {
      setErr(String(e?.detail || e?.message || "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function replaceFile(kind, file) {
    if (!file || !p?.id) return;
    if (typeof onUpdate !== "function") return;

    setErr("");
    const map = {
      foto1: {
        folder: "gruas/proveedores/camion",
        urlKey: "foto_camion_1_url",
        pidKey: "foto_camion_1_public_id",
      },
      foto2: {
        folder: "gruas/proveedores/camion",
        urlKey: "foto_camion_2_url",
        pidKey: "foto_camion_2_public_id",
      },
      licencia: {
        folder: "gruas/proveedores/licencia",
        urlKey: "licencia_url",
        pidKey: "licencia_public_id",
      },
      vtv: {
        folder: "gruas/proveedores/vtv",
        urlKey: "vtv_url",
        pidKey: "vtv_public_id",
      },
    };

    const meta = map[kind];
    if (!meta) return;

    try {
      setUploading((prev) => ({ ...prev, [kind]: true }));
      const up = await uploadToCloudinary(file, { folder: meta.folder });

      const patch = {
        [meta.urlKey]: up.secure_url,
        [meta.pidKey]: up.public_id,
      };

      const updated = await onUpdate(p.id, patch);

      setDraft((prev) => ({
        ...prev,
        [meta.urlKey]: safe(updated?.[meta.urlKey] ?? patch[meta.urlKey]),
        [meta.pidKey]: safe(updated?.[meta.pidKey] ?? patch[meta.pidKey]),
      }));
    } catch (e) {
      setErr(String(e?.detail || e?.message || "Error subiendo/reemplazando"));
    } finally {
      setUploading((prev) => ({ ...prev, [kind]: false }));
    }
  }

  const patente = edit ? safe(draft.patente_camion).toUpperCase() : safe(p?.patente_camion).toUpperCase();
  const modelo = edit ? safe(draft.modelo_camion) : safe(p?.modelo_camion);
  const anio = edit ? safe(draft.anio_camion) : (p?.anio_camion ? String(p.anio_camion) : "");
  const activo = edit ? !!draft.activo : p?.activo !== false;

  const tel = edit ? safe(draft.telefono) : safe(p?.telefono); // ✅ NUEVO
  const wa = tel ? waUrl(tel) : "";
  const call = tel ? telUrl(tel) : "";

  const foto1Url = edit ? draft.foto_camion_1_url : safe(p?.foto_camion_1_url);
  const foto2Url = edit ? draft.foto_camion_2_url : safe(p?.foto_camion_2_url);
  const licUrl = edit ? draft.licencia_url : safe(p?.licencia_url);
  const vtvUrl = edit ? draft.vtv_url : safe(p?.vtv_url);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center px-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          <motion.div
            className={classNames(
              "relative w-full max-w-4xl rounded-2xl border border-slate-800",
              "bg-slate-950 shadow-xl"
            )}
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
          >
            <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-100 truncate">{title}</div>
                  <span
                    className={classNames(
                      "text-[11px] px-2 py-1 rounded-lg border",
                      activo
                        ? "border-emerald-800 bg-emerald-950 text-emerald-200"
                        : "border-slate-800 bg-slate-900 text-slate-300"
                    )}
                  >
                    {activo ? "ACTIVO" : "INACTIVO"}
                  </span>
                  {edit && (
                    <span className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-200">
                      EDITANDO
                    </span>
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Camión: <span className="text-slate-200">{patente || "—"}</span>{" "}
                  <span className="text-slate-500">·</span>{" "}
                  <span className="text-slate-200">{modelo || "—"}</span>{" "}
                  <span className="text-slate-500">·</span>{" "}
                  <span className="text-slate-200">{anio || "—"}</span>
                </div>

                {/* ✅ NUEVO: teléfono + acciones */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500">Tel</span>
                  <span className="text-sm font-semibold text-slate-100">{tel || "—"}</span>
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] px-2 py-1 rounded-lg border border-emerald-800 bg-emerald-950/40 text-emerald-200 hover:opacity-90"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {call ? (
                    <a
                      href={call}
                      className="text-[11px] px-2 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                    >
                      Llamar
                    </a>
                  ) : null}
                </div>

                <div className="mt-1 text-[11px] text-slate-500">ID: {p?.id ?? "—"}</div>
              </div>

              <div className="flex items-center gap-2">
                {!edit ? (
                  <>
                    <button
                      onClick={() => {
                        setErr("");
                        setConfirmDelete(false);
                        setEdit(true);
                      }}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-100 text-slate-900 hover:opacity-90"
                      disabled={saving}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-2 rounded-xl text-xs border border-red-900 bg-red-950/40 text-red-200 hover:bg-red-950/60"
                      disabled={saving}
                    >
                      Eliminar
                    </button>

                    <button
                      onClick={close}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                      disabled={saving}
                    >
                      Cerrar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setErr("");
                        setEdit(false);
                      }}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                      disabled={saving}
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={saveFields}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-100 text-slate-900 hover:opacity-90"
                      disabled={saving}
                    >
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4">
              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Nombre</div>
                  {!edit ? (
                    <div className="mt-1 text-sm text-slate-100">{safe(p?.nombre) || "—"}</div>
                  ) : (
                    <input
                      value={draft.nombre}
                      onChange={(e) => setDraft((prev) => ({ ...prev, nombre: e.target.value }))}
                      className={classNames(
                        "mt-2 w-full px-3 py-2 rounded-xl text-sm",
                        "bg-slate-900 border border-slate-800 text-slate-100",
                        "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                      )}
                      placeholder="Nombre"
                      disabled={saving}
                    />
                  )}
                </div>

                {/* ✅ NUEVO: Teléfono editable */}
                <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Teléfono</div>
                  {!edit ? (
                    <div className="mt-1 text-sm text-slate-100">{safe(p?.telefono) || "—"}</div>
                  ) : (
                    <input
                      value={draft.telefono}
                      onChange={(e) => setDraft((prev) => ({ ...prev, telefono: e.target.value }))}
                      className={classNames(
                        "mt-2 w-full px-3 py-2 rounded-xl text-sm",
                        "bg-slate-900 border border-slate-800 text-slate-100",
                        "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                      )}
                      placeholder="Ej: 351 555-1234"
                      disabled={saving}
                    />
                  )}
                  <div className="mt-1 text-[11px] text-slate-500">Se usa para WhatsApp/Llamadas.</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Patente</div>
                  {!edit ? (
                    <div className="mt-1 text-sm text-slate-100">{patente || "—"}</div>
                  ) : (
                    <input
                      value={draft.patente_camion}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, patente_camion: e.target.value.toUpperCase() }))
                      }
                      className={classNames(
                        "mt-2 w-full px-3 py-2 rounded-xl text-sm",
                        "bg-slate-900 border border-slate-800 text-slate-100",
                        "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                      )}
                      placeholder="AAA123 / AB123CD"
                      disabled={saving}
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Activo</div>
                  {!edit ? (
                    <div className="mt-1 text-sm text-slate-100">{activo ? "Sí" : "No"}</div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, activo: true }))}
                        className={classNames(
                          "px-3 py-2 rounded-xl text-xs border",
                          draft.activo
                            ? "border-emerald-800 bg-emerald-950 text-emerald-200"
                            : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                        )}
                        disabled={saving}
                      >
                        Activo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, activo: false }))}
                        className={classNames(
                          "px-3 py-2 rounded-xl text-xs border",
                          !draft.activo
                            ? "border-slate-200 bg-slate-100 text-slate-900"
                            : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                        )}
                        disabled={saving}
                      >
                        Inactivo
                      </button>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Modelo</div>
                  {!edit ? (
                    <div className="mt-1 text-sm text-slate-100">{modelo || "—"}</div>
                  ) : (
                    <input
                      value={draft.modelo_camion}
                      onChange={(e) => setDraft((prev) => ({ ...prev, modelo_camion: e.target.value }))}
                      className={classNames(
                        "mt-2 w-full px-3 py-2 rounded-xl text-sm",
                        "bg-slate-900 border border-slate-800 text-slate-100",
                        "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                      )}
                      placeholder="Modelo"
                      disabled={saving}
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs text-slate-400">Año</div>
                  {!edit ? (
                    <div className="mt-1 text-sm text-slate-100">{anio || "—"}</div>
                  ) : (
                    <input
                      value={draft.anio_camion}
                      onChange={(e) => setDraft((prev) => ({ ...prev, anio_camion: e.target.value }))}
                      className={classNames(
                        "mt-2 w-full px-3 py-2 rounded-xl text-sm",
                        "bg-slate-900 border border-slate-800 text-slate-100",
                        "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700"
                      )}
                      placeholder="2020"
                      disabled={saving}
                    />
                  )}
                </div>
              </div>

              {/* Imágenes */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-slate-200">Imágenes / Documentos</div>
                <div className="text-[11px] text-slate-500">Reemplazar = Cloudinary → PATCH → preview</div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ImgCard label="Foto camión 1" url={foto1Url} />
                  <ImgCard label="Foto camión 2" url={foto2Url} />
                  <ImgCard label="Licencia" url={licUrl} />
                  <ImgCard label="VTV" url={vtvUrl} />
                </div>

                {edit && typeof onUpdate === "function" && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FileReplace
                      label="Reemplazar Foto camión 1"
                      disabled={saving}
                      loading={uploading.foto1}
                      onPick={(f) => replaceFile("foto1", f)}
                    />
                    <FileReplace
                      label="Reemplazar Foto camión 2"
                      disabled={saving}
                      loading={uploading.foto2}
                      onPick={(f) => replaceFile("foto2", f)}
                    />
                    <FileReplace
                      label="Reemplazar Licencia"
                      disabled={saving}
                      loading={uploading.licencia}
                      onPick={(f) => replaceFile("licencia", f)}
                    />
                    <FileReplace
                      label="Reemplazar VTV"
                      disabled={saving}
                      loading={uploading.vtv}
                      onPick={(f) => replaceFile("vtv", f)}
                    />
                  </div>
                )}
              </div>

              {/* Errores */}
              {err && (
                <div className="mt-4 text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-2">
                  {err}
                </div>
              )}

              {/* Confirm delete */}
              {!edit && confirmDelete && (
                <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/30 p-3">
                  <div className="text-sm text-red-200 font-semibold">¿Eliminar proveedor?</div>
                  <div className="mt-1 text-xs text-red-200/80">(No borra Cloudinary automáticamente.)</div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800"
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => onDelete?.(p)}
                      className="px-3 py-2 rounded-xl text-xs border border-red-900 bg-red-950 text-red-200 hover:bg-red-950/80"
                      disabled={saving}
                    >
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
