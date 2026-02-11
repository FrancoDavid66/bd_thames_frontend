// src/components/gruas/ProveedoresPanel.jsx
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiUserGroup,
  HiTruck,
  HiRefresh,
  HiX,
  HiExternalLink,
  HiUpload,
  HiTrash,
} from "react-icons/hi";

import GruasAPI from "../../api/gruas";
import { uploadToCloudinary } from "../../utils/cloudinary";
import ProveedorProfile from "./ProveedorProfile";

// ✅ modal flota separado (carpeta modal/)
import FlotaModal from "./modal/FlotaModal";

const LAST_FLOTA_KEY = "gruas_last_flota_proveedor_id";

const normalize = (res) => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object") {
    for (const k of ["results", "items", "data", "rows"]) {
      if (Array.isArray(res[k])) return res[k];
    }
  }
  return [];
};

// Fecha a YYYY-MM-DD (acepta DD/MM/YYYY)
function toYMD(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const [_, d, mo, y] = m;
    return `${y}-${mo}-${d}`;
  }
  return s;
}

export default function ProveedoresPanel({ openFlotaToken = 0 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [perfilId, setPerfilId] = useState(null);
  const [q, setQ] = useState("");
  const [flotaProv, setFlotaProv] = useState(null);

  // ✅ hint cuando entran por “Flotas”
  const [hint, setHint] = useState("");

  const searchRef = useRef(null);
  const pendingAutoOpenRef = useRef(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const list = normalize(await GruasAPI.getProveedores?.());
      setItems(list);
      // ✅ si veníamos con auto-open pendiente, intentamos ahora
      if (pendingAutoOpenRef.current) {
        pendingAutoOpenRef.current = false;
        tryAutoOpenFlota(list);
      }
    } catch (e) {
      setError(e?.message || "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = (Array.isArray(items) ? items : []).filter((p) => {
    if (!q) return true;
    const hay = (s) => String(s || "").toLowerCase().includes(q.toLowerCase());
    return hay(p?.nombre) || hay(p?.telefono) || hay(p?.zona);
  });

  function rememberLastFlotaProviderId(id) {
    try {
      if (id != null) localStorage.setItem(LAST_FLOTA_KEY, String(id));
    } catch {}
  }

  function openFlotaForProvider(p) {
    if (!p) return;
    setHint(""); // ✅ si abrió flota, no mostramos hint
    rememberLastFlotaProviderId(p.id);
    setFlotaProv(p);
  }

  function tryAutoOpenFlota(currentItems) {
    const list = Array.isArray(currentItems) ? currentItems : [];
    if (!list.length) {
      setHint("No hay proveedores todavía.");
      return;
    }

    // 1) último proveedor usado
    let lastId = null;
    try {
      lastId = localStorage.getItem(LAST_FLOTA_KEY);
    } catch {}

    if (lastId) {
      const hit = list.find((x) => String(x?.id) === String(lastId));
      if (hit) {
        setHint("");
        openFlotaForProvider(hit);
        return;
      }
    }

    // 2) si hay 1 solo proveedor, abrimos directo
    if (list.length === 1) {
      setHint("");
      openFlotaForProvider(list[0]);
      return;
    }

    // 3) fallback: pedir que elijan
    setHint("Elegí un proveedor y tocá “Flota”. (Tip: queda recordado el último que usaste.)");
    // foco en búsqueda
    setTimeout(() => searchRef.current?.focus?.(), 50);
  }

  // ✅ cuando cambie el token (click en tab “Flotas”), intentamos auto-open
  useEffect(() => {
    if (!openFlotaToken) return;
    if (loading) {
      pendingAutoOpenRef.current = true;
      return;
    }
    if (!items?.length) {
      // si aún no cargó, marcamos pendiente y recargamos por las dudas
      pendingAutoOpenRef.current = true;
      load();
      return;
    }
    tryAutoOpenFlota(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFlotaToken]);

  function nuevo() {
    setEditing({
      nombre: "",
      telefono: "",
      zona: "",
      observaciones: "",
      dni_frente_url: "",
      dni_dorso_url: "",
      vtv_url: "",
      vtv_vencimiento: "",
      cedula_verde_url: "",
      camion_foto_url: "",
      activo: false,
    });
  }

  async function guardar(data, { activar = false } = {}) {
    if (!data?.nombre) {
      alert("Completá el nombre");
      return;
    }
    const nv = (x) => (x === "" ? null : x);
    const payload = {
      id: data?.id,
      nombre: data?.nombre,
      telefono: nv(data?.telefono),
      zona: nv(data?.zona),
      observaciones: nv(data?.observaciones),
      activo: !!activar,
      dni_frente_url: nv(data?.dni_frente_url),
      dni_dorso_url: nv(data?.dni_dorso_url),
      vtv_url: nv(data?.vtv_url),
      vtv_vencimiento: data?.vtv_vencimiento ? toYMD(data.vtv_vencimiento) : null,
      cedula_verde_url: nv(data?.cedula_verde_url),
      camion_foto_url: nv(data?.camion_foto_url),
    };

    try {
      if (payload?.id) await GruasAPI.updateProveedor?.(payload.id, payload);
      else await GruasAPI.createProveedor?.(payload);
      setEditing(null);
      await load();
    } catch (e) {
      const p = e?.payload;
      const msg =
        p?.detail ||
        (p &&
          Object.entries(p)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" · "));
      alert(msg || e?.message || "Error al guardar");
    }
  }

  async function eliminar(id) {
    if (!window.confirm("¿Eliminar proveedor?")) return;
    try {
      await GruasAPI.deleteProveedor?.(id);
      await load();
    } catch (e) {
      alert(e?.message || "Error al eliminar");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <HiUserGroup className="text-xl" /> Proveedores
        </h3>
        <div className="flex items-center gap-2">
          <input
            ref={searchRef}
            className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
            onClick={load}
          >
            <HiRefresh className="inline -mt-0.5" /> Refrescar
          </button>
          <button
            className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
            onClick={nuevo}
          >
            Nuevo
          </button>
        </div>
      </div>

      {/* ✅ hint para el atajo Flotas */}
      {hint && (
        <div className="p-3 rounded bg-blue-900/30 border border-blue-700 text-blue-200 text-sm">
          {hint}
        </div>
      )}

      {error && (
        <div className="p-3 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-gray-300">Cargando…</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 sticky top-0 z-10">
              <tr className="text-left text-gray-300 uppercase text-xs">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filtered) &&
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-800 hover:bg-gray-800/60"
                  >
                    <td className="px-3 py-2">{p.id}</td>
                    <td className="px-3 py-2">{p.nombre || "-"}</td>
                    <td className="px-3 py-2">{p.telefono || "-"}</td>
                    <td className="px-3 py-2">{p.zona || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                          onClick={() => setPerfilId(p.id)}
                        >
                          Perfil
                        </button>
                        <button
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                          onClick={() => setEditing(p)}
                        >
                          Editar
                        </button>
                        <button
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                          onClick={() => openFlotaForProvider(p)}
                        >
                          <HiTruck className="inline -mt-0.5" /> Flota
                        </button>
                        <button
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700"
                          onClick={() => eliminar(p.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {(!Array.isArray(filtered) || filtered.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    Sin datos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: editar */}
      <AnimatePresence>
        {editing && (
          <ProveedorEditModal
            value={editing}
            onCancel={() => setEditing(null)}
            onSave={(form, opts) => guardar(form, opts)}
          />
        )}
      </AnimatePresence>

      {/* Modal: perfil */}
      <AnimatePresence>
        {perfilId && (
          <ProveedorPerfilModal
            id={perfilId}
            onClose={() => setPerfilId(null)}
            onEdit={(prov) => {
              setPerfilId(null);
              setEditing(prov);
            }}
            onFlota={(prov) => {
              setPerfilId(null);
              openFlotaForProvider(prov);
            }}
          />
        )}
      </AnimatePresence>

      {/* ✅ Modal: flota */}
      <AnimatePresence>
        {flotaProv && (
          <FlotaModal
            proveedor={flotaProv}
            onClose={() => setFlotaProv(null)}
            api={GruasAPI}
            variant="social"   // ✅ nuevo: vamos a renderizar estilo “perfil social”
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ===== Modal PERFIL minimal: usa ProveedorProfile ===== */
function ProveedorPerfilModal({ id, onClose, onEdit, onFlota }) {
  return (
    <div className="fixed inset-0 z-[95]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="relative w-full h-[100dvh] md:h-auto md:max-w-3xl md:mx-auto md:my-8 md:rounded-2xl bg-[#111418] border border-white/10 p-3 md:p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Perfil proveedor"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-9 w-9 grid place-content-center rounded-lg bg-white/10 hover:bg-white/20"
        >
          <HiX className="text-white" />
        </button>

        <ProveedorProfile
          proveedorId={id}
          onBack={onClose}
          onEdit={(prov) => onEdit?.(prov)}
          onVerFlota={(prov) => onFlota?.(prov)}
        />
      </motion.div>
    </div>
  );
}

/* ===== Modal EDITAR (minimal) ===== */
function ProveedorEditModal({ value, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    id: value?.id,
    nombre: value?.nombre || "",
    telefono: value?.telefono || "",
    zona: value?.zona || "",
    observaciones: value?.observaciones || "",
    dni_frente_url: value?.dni_frente_url || "",
    dni_dorso_url: value?.dni_dorso_url || "",
    vtv_url: value?.vtv_url || "",
    vtv_vencimiento: value?.vtv_vencimiento || "",
    cedula_verde_url: value?.cedula_verde_url || "",
    camion_foto_url: value?.camion_foto_url || "",
  }));
  const [uploadingKey, setUploadingKey] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  function setUrlField(key, url) {
    setForm((s) => ({ ...s, [`${key}_url`]: url || "" }));
  }

  async function handleUpload(file, key, folder) {
    if (!file) return;
    const MAX_MB = 12;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Máx ${MAX_MB}MB`);
      return;
    }
    const okType = /image\/|pdf$/i.test(file.type);
    if (!okType) {
      alert("Formato no soportado");
      return;
    }
    try {
      setUploadingKey(key);
      const up = await uploadToCloudinary(file, { folder });
      const url = up?.secure_url || up?.url;
      if (!url) throw new Error("Upload sin URL");
      setUrlField(key, url);
    } catch {
      alert("No se pudo subir el archivo");
    } finally {
      setUploadingKey("");
    }
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="relative w-full h-[100dvh] md:h-auto md:max-w-2xl md:mx-auto md:my-8 md:rounded-2xl bg-[#111418] border border-white/10"
        role="dialog"
        aria-modal="true"
        aria-label="Proveedor"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold text-base">
            {form.id ? `Proveedor #${form.id}` : "Nuevo proveedor"}
          </h3>
          <button
            onClick={onCancel}
            className="h-9 w-9 grid place-content-center rounded-lg bg-white/10 hover:bg-white/20"
          >
            <HiX className="text-white" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">
              Nombre
              <input
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 mt-1"
                value={form.nombre}
                onChange={(e) =>
                  setForm((s) => ({ ...s, nombre: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Teléfono
              <input
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 mt-1"
                value={form.telefono}
                onChange={(e) =>
                  setForm((s) => ({ ...s, telefono: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Zona
              <input
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 mt-1"
                value={form.zona}
                onChange={(e) =>
                  setForm((s) => ({ ...s, zona: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              Observaciones
              <textarea
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 mt-1"
                value={form.observaciones}
                onChange={(e) =>
                  setForm((s) => ({ ...s, observaciones: e.target.value }))
                }
              />
            </label>
          </div>

          <UploadRow
            label="DNI frente"
            value={form.dni_frente_url}
            onUpload={(f) =>
              handleUpload(f, "dni_frente", "de-thames/proveedores/dni")
            }
            onURL={(url) => setUrlField("dni_frente", url)}
            uploading={uploadingKey === "dni_frente"}
          />
          <UploadRow
            label="DNI dorso"
            value={form.dni_dorso_url}
            onUpload={(f) =>
              handleUpload(f, "dni_dorso", "de-thames/proveedores/dni")
            }
            onURL={(url) => setUrlField("dni_dorso", url)}
            uploading={uploadingKey === "dni_dorso"}
          />
          <UploadRow
            label="VTV (img o PDF)"
            value={form.vtv_url}
            onUpload={(f) => handleUpload(f, "vtv", "de-thames/proveedores/vtv")}
            onURL={(url) => setUrlField("vtv", url)}
            uploading={uploadingKey === "vtv"}
            accept="image/*,application/pdf"
          />
          <label className="text-sm">
            VTV vence
            <input
              type="date"
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 mt-1"
              value={form.vtv_vencimiento || ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, vtv_vencimiento: e.target.value }))
              }
            />
          </label>
          <UploadRow
            label="Cédula verde (frente)"
            value={form.cedula_verde_url}
            onUpload={(f) =>
              handleUpload(f, "cedula_verde", "de-thames/proveedores/cedula")
            }
            onURL={(url) => setUrlField("cedula_verde", url)}
            uploading={uploadingKey === "cedula_verde"}
          />
          <UploadRow
            label="Foto del camión"
            value={form.camion_foto_url}
            onUpload={(f) =>
              handleUpload(f, "camion_foto", "de-thames/proveedores/camiones")
            }
            onURL={(url) => setUrlField("camion_foto", url)}
            uploading={uploadingKey === "camion_foto"}
          />
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex flex-col md:flex-row gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave?.(form, { activar: false })}
            className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white"
          >
            Guardar (borrador)
          </button>
          <button
            onClick={() => onSave?.(form, { activar: true })}
            className="px-4 py-2 rounded-xl bg-emerald-400 text-[#0b0f1e] font-semibold hover:brightness-105"
          >
            Guardar y activar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ===== Upload minimal (archivo o URL) ===== */
function UploadRow({
  label,
  value,
  onUpload,
  onURL,
  uploading = false,
  accept = "image/*",
}) {
  const inputRef = useRef(null);
  const isPdf = typeof value === "string" && /\.pdf($|\?)/i.test(value || "");

  return (
    <div className="text-sm">
      <div className="mb-1 text-white/90">{label}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10"
          disabled={uploading}
        >
          {uploading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <HiUpload />
          )}
          {uploading ? "Subiendo..." : value ? "Reemplazar" : "Subir archivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload?.(f);
            e.target.value = "";
          }}
        />

        <input
          type="url"
          inputMode="url"
          placeholder="o pegá una URL https://…"
          className="min-w-[220px] flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
          defaultValue={value || ""}
          onBlur={(e) => onURL?.(e.target.value.trim())}
        />

        {value ? (
          <>
            <a
              className="inline-flex items-center gap-1 px-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
              href={value}
              target="_blank"
              rel="noreferrer"
              title="Abrir"
            >
              <HiExternalLink /> Ver
            </a>
            <button
              type="button"
              onClick={() => onURL?.("")}
              className="inline-flex items-center gap-1 px-2 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
              title="Quitar"
            >
              <HiTrash /> Quitar
            </button>
            {!isPdf && (
              <span className="inline-block overflow-hidden rounded-lg ring-1 ring-white/10">
                <img
                  src={value}
                  alt={label}
                  className="h-10 w-10 object-cover"
                />
              </span>
            )}
            {isPdf && <span className="text-[11px] text-white/60">PDF</span>}
          </>
        ) : (
          <span className="text-xs text-white/50">Sin archivo</span>
        )}
      </div>
    </div>
  );
}
