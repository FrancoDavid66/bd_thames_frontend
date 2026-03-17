// src/components/polizas/DocumentosVehiculoSection.jsx
// Rediseñado: flujo de subida pregunta SIEMPRE el tipo de documento antes de subir.
// ✅ PREVISUALIZACIÓN integrada (imágenes y PDF) sin usar DocPreviewModal externo.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiFolderOpen,
  HiSearch,
  HiRefresh,
  HiUpload,
  HiViewGrid,
  HiTrash,
  HiExternalLink,
  HiPhotograph,
  HiX,
  HiDocumentText,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api"; // Instancia central para evitar 401

import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { TIPOS as TIPOS_BASE, unwrapResults, guessMimeByName } from "./documentos/DocUtils";

/* ========== Helpers ========== */
const DEBUG = false;

const isImageMime = (mime = "") =>
  String(mime).toLowerCase().startsWith("image/") ||
  [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"].some((ext) =>
    String(mime).toLowerCase().includes(ext)
  );

const isPdfMime = (mime = "") =>
  String(mime).toLowerCase().startsWith("application/pdf") ||
  String(mime).toLowerCase().endsWith(".pdf");

// Garantizamos tipos clave aunque DocUtils no los exporte todavía.
function upsertTipo(list, key, label, accept = ".jpg,.jpeg,.png,.pdf") {
  if (list.some((t) => t.key === key)) return list;
  return [...list, { key, label, accept }];
}

// TIPOS visibles en UI (Documentos, no fotos)
const TIPOS_UI = (() => {
  let arr = Array.isArray(TIPOS_BASE) ? [...TIPOS_BASE] : [];
  arr = upsertTipo(arr, "CEDULA_VERDE", "Cédula verde");
  arr = upsertTipo(arr, "CEDULA_AZUL", "Cédula azul");
  arr = upsertTipo(arr, "OBLEA_GNC", "Oblea GNC");
  arr = upsertTipo(arr, "TITULO", "Título del vehículo");
  return arr;
})();

const TIPO_LABEL = TIPOS_UI.reduce((acc, x) => {
  acc[x.key] = x.label || x.key.replace(/_/g, " ");
  return acc;
}, {});

/* ===== Modal de PREVIEW integrado ===== */
function PreviewModal({ doc, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc) return null;

  const title =
    doc?.nombre || doc?.url?.split("/")?.pop() || TIPO_LABEL[doc?.tipo] || "Documento";

  const mime = (doc?.mime || guessMimeByName(doc?.nombre || doc?.url || "") || "").toLowerCase();
  const isImg = isImageMime(mime || doc?.url || "");
  const isPdf = isPdfMime(mime || doc?.url || "");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          className="w-full h-[85vh] max-w-5xl rounded-2xl border border-white/10 bg-[#0b0f1e] shadow-2xl overflow-hidden flex flex-col"
        >
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">{title}</h3>
              <p className="text-xs text-white/60 truncate">
                {TIPO_LABEL[doc?.tipo] || String(doc?.tipo || "")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 text-neutral-900 hover:bg-white text-sm"
                title="Abrir en nueva pestaña"
              >
                <HiExternalLink /> Abrir
              </a>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20"
                title="Cerrar"
              >
                <HiX className="text-white" />
              </button>
            </div>
          </header>

          <div className="flex-1 bg-black/30">
            {isImg && (
              <div className="w-full h-full grid place-items-center p-3">
                <img
                  src={doc.url}
                  alt={title}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            )}

            {isPdf && (
              <iframe
                title={title}
                src={`${doc.url}#view=FitH&toolbar=1`}
                className="w-full h-full"
                allow="autoplay"
              />
            )}

            {!isImg && !isPdf && (
              <div className="h-full w-full grid place-items-center px-4">
                <div className="text-center text-white/80 max-w-sm">
                  <HiDocumentText className="text-4xl mx-auto mb-2" />
                  <p className="mb-3 text-sm">
                    Este tipo de archivo no se puede previsualizar aquí.
                  </p>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 text-neutral-900 hover:bg-white text-sm"
                  >
                    <HiExternalLink /> Abrir en nueva pestaña
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ========== Componente principal ========== */
export default function DocumentosVehiculoSection({ polizaId }) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [soloConArchivos, setSoloConArchivos] = useState(false);

  // Filtro por tipo (chips)
  const [activeTypes, setActiveTypes] = useState(new Set());

  // Drag & Drop
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Modal de subida
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [uploaderTipo, setUploaderTipo] = useState(TIPOS_UI[0]?.key || "");
  const [uploaderFile, setUploaderFile] = useState(null);
  const uploaderFileRef = useRef(null);
  const uploaderAccept =
    TIPOS_UI.find((t) => t.key === uploaderTipo)?.accept || ".jpg,.jpeg,.png,.pdf";
  const [uploaderBusy, setUploaderBusy] = useState(false);

  // 🛡️ Lógica de permisos
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  /* ====== Carga de lista ====== */
  async function cargarLista() {
    if (!polizaId) return;
    setLoading(true);
    try {
      // PolizasAPI ya usa la instancia 'api' segura corregida en pasos anteriores
      const data = await PolizasAPI.getDocumentos(polizaId);
      const arr = unwrapResults(data);
      setDocs(arr);
    } catch (e) {
      if (DEBUG) console.error("[Documentos] wrapper API error → fallback", e);
      try {
        // 🚀 FALLBACK: Usamos 'api' de Axios para asegurar que el Token JWT esté presente
        const r = await api.get(`/polizas/documentos/`, {
           params: { poliza: polizaId }
        });
        const arr = r.data?.results || r.data || [];
        setDocs(arr);
      } catch (e2) {
        toast.error("No se pudieron cargar los documentos");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (polizaId) cargarLista();
  }, [polizaId]);

  // Auto-refresh por eventos globales
  useEffect(() => {
    const handler = (ev) => {
      const targetId = Number(ev?.detail?.poliza_id);
      if (!polizaId || Number(polizaId) !== targetId) return;
      cargarLista();
    };
    window.addEventListener("poliza:media_importada", handler);
    window.addEventListener("solicitud:asociada", handler);
    return () => {
      window.removeEventListener("poliza:media_importada", handler);
      window.removeEventListener("solicitud:asociada", handler);
    };
  }, [polizaId]);

  /* ====== Indexación / Filtros ====== */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const typeFilterActive = activeTypes.size > 0;

    return (docs || []).filter((d) => {
      if (q) {
        const name = (d?.nombre || "").toLowerCase();
        const url = (d?.url || "").toLowerCase();
        const match = name.includes(q) || url.includes(q);
        if (!match) return false;
      }
      if (typeFilterActive && !activeTypes.has(String(d?.tipo || ""))) {
        return false;
      }
      return true;
    });
  }, [docs, query, activeTypes]);

  const vis = useMemo(() => {
    if (!soloConArchivos) return filtered;
    return filtered.filter(Boolean);
  }, [filtered, soloConArchivos]);

  /* ====== Subida ====== */
  async function crearDocumento(body) {
    try {
      // Intentamos con la API blindada
      return await PolizasAPI.crearDocumento(body);
    } catch (e) {
      // 🚀 FALLBACK: Usamos 'api' de Axios con Token automático
      const r = await api.post(`/polizas/documentos/`, body);
      return r.data;
    } finally {
      try {
        window.dispatchEvent(
          new CustomEvent("poliza:media_importada", {
            detail: { poliza_id: polizaId, focusTab: "documentos" },
          })
        );
      } catch {}
    }
  }

  const doUploadWithTipo = async (file, tipoKey) => {
    if (!file) return;
    if (!tipoKey) {
      toast.error("Elegí un tipo de documento.");
      return;
    }
    setUploaderBusy(true);
    try {
      const { secure_url, public_id, mime } = await uploadToCloudinary(
        file,
        "rc-admin/polizas/documentos"
      );
      const body = {
        poliza: Number(polizaId),
        tipo: tipoKey,
        url: secure_url,
        public_id,
        nombre: file.name || public_id?.split("/")?.pop() || "documento",
        mime: file.type || mime || guessMimeByName(file.name),
      };
      await crearDocumento(body);
      toast.success("Documento subido");
      await cargarLista();
      setUploaderFile(null);
      if (uploaderFileRef.current) uploaderFileRef.current.value = "";
      setUploaderOpen(false);
    } catch (e) {
      toast.error("No se pudo subir el documento");
    } finally {
      setUploaderBusy(false);
    }
  };

  const openUploader = () => {
    setUploaderTipo(TIPOS_UI[0]?.key || "");
    setUploaderFile(null);
    if (uploaderFileRef.current) uploaderFileRef.current.value = "";
    setUploaderOpen(true);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []).filter(Boolean);
    if (!files.length) return;
    if (files.length > 1) {
      toast.error("Subí un solo archivo por vez.");
      return;
    }
    setUploaderTipo(TIPOS_UI[0]?.key || "");
    setUploaderFile(files[0]);
    setUploaderOpen(true);
  };

  const onDelete = async (docId) => {
    if (!isWebAdmin) {
       toast.error("Solo los administradores pueden eliminar documentos.");
       return;
    }
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await PolizasAPI.deleteDocumento(docId);
      toast.success("Documento eliminado");
      await cargarLista();
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar");
    }
  };

  /* ====== UI Bits ====== */
  const Chip = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition ${
        active
          ? "bg-amber-400/25 border-amber-300 text-amber-200"
          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );

  const Title = ({ children, icon }) => (
    <div className="flex items-center gap-3">
      <span className="p-2 rounded-xl bg-white/10 border border-white/10">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white truncate">{children}</h2>
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
           {user?.perfil?.oficina_nombre || 'Local'}
        </p>
      </div>
    </div>
  );

  return (
    <section
      ref={dropRef}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`w-full rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:p-6 shadow-xl shadow-black/25 transition-colors ${
        dragOver ? "ring-2 ring-amber-300/40 bg-amber-300/5" : ""
      }`}
    >
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <Title icon={<HiFolderOpen className="w-5 h-5 text-amber-300" />}>
          Documentos del vehículo
        </Title>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o URL…"
              className="pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm outline-none focus:ring-2 ring-amber-300/30 w-full text-white"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSoloConArchivos((s) => !s)}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition ${
                soloConArchivos
                  ? "bg-amber-400/20 border-amber-300"
                  : "bg-white/10 border-white/10 hover:bg-white/20"
              }`}
              title={soloConArchivos ? "Mostrar todos" : "Solo con archivos"}
            >
              <HiViewGrid className={soloConArchivos ? "text-amber-300" : "text-white/80"} />
            </motion.button>

            <motion.button
              whileTap={{ rotate: 25, scale: 0.95 }}
              onClick={cargarLista}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition"
              title="Actualizar"
            >
              <HiRefresh className="w-5 h-5 text-white/90" />
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={openUploader}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-neutral-900 text-sm font-semibold w-full sm:w-auto transition-all"
          >
            <HiUpload className="text-base" />
            Subir documento
          </motion.button>
        </div>
      </header>

      {/* Chips de tipo */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TIPOS_UI.map((t) => {
          const act = activeTypes.has(t.key);
          return (
            <Chip key={t.key} active={act} onClick={() => {
              const next = new Set(activeTypes);
              if (act) next.delete(t.key); else next.add(t.key);
              setActiveTypes(next);
            }}>
              {t.label}
            </Chip>
          );
        })}
        {activeTypes.size > 0 && (
          <button className="text-xs underline underline-offset-2 text-white/70 ml-1" onClick={() => setActiveTypes(new Set())}>
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Galería */}
      {loading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : vis.length === 0 ? (
        <div className="text-sm text-white/70 py-8 text-center border border-dashed border-white/10 rounded-2xl">
          No hay documentos para mostrar.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {vis.map((d) => {
              const img = isImageMime(d?.mime || d?.nombre || d?.url);
              const label = TIPO_LABEL[d?.tipo] || String(d?.tipo || "");
              const title = d?.nombre || d?.url?.split("/")?.pop() || label;

              return (
                <motion.div
                  key={d.id} layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group relative rounded-xl border border-white/10 bg-white/5 overflow-hidden shadow-lg"
                >
                  <div onClick={() => setPreviewDoc(d)} className="cursor-pointer">
                    {img ? (
                      <img src={d.url} alt={title} className="w-full h-40 object-cover transition-opacity group-hover:opacity-75" loading="lazy" />
                    ) : (
                      <div className="w-full h-40 grid place-items-center bg-gradient-to-br from-neutral-900 to-neutral-800">
                        <div className="flex flex-col items-center text-white/80">
                          <HiDocumentText className="text-4xl mb-1 text-sky-400" />
                          <span className="text-[11px] font-bold uppercase tracking-tighter opacity-80">{isPdfMime(d.mime || d.url) ? 'PDF' : 'Archivo'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <a href={d.url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-white/90 text-neutral-900 grid place-items-center hover:bg-white shadow-xl" title="Expandir">
                      <HiExternalLink />
                    </a>
                    {/* 🛡️ Solo Admin borra */}
                    {isWebAdmin && (
                      <button onClick={() => onDelete(d.id)} className="w-8 h-8 rounded-lg bg-rose-500/90 text-white grid place-items-center hover:bg-rose-600 shadow-xl" title="Eliminar">
                        <HiTrash />
                      </button>
                    )}
                  </div>

                  <div className="px-3 py-2 border-t border-white/10 bg-[#0f1220]/80 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase tracking-tighter">
                        {label}
                      </span>
                      <span className="truncate text-[10px] text-white/50 font-medium">
                        {title}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Preview modal */}
      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Modal Subida */}
      <AnimatePresence>
        {uploaderOpen && (
          <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-white font-bold uppercase tracking-tight">Subir Documentación</h4>
                <button onClick={() => !uploaderBusy && setUploaderOpen(false)} className="text-white/40 hover:text-white"><HiX className="text-xl" /></button>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="block text-[10px] font-black uppercase text-gray-500 mb-1.5 ml-1">Tipo de Documento</span>
                  <select
                    value={uploaderTipo}
                    onChange={(e) => setUploaderTipo(e.target.value)}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 ring-amber-500/50 appearance-none"
                  >
                    {TIPOS_UI.map((t) => (
                      <option key={t.key} value={t.key} className="bg-gray-900">{t.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block group">
                  <span className="block text-[10px] font-black uppercase text-gray-500 mb-1.5 ml-1 group-hover:text-gray-300 transition-colors">Seleccionar Archivo</span>
                  <input
                    ref={uploaderFileRef}
                    type="file"
                    accept={uploaderAccept}
                    onChange={(e) => setUploaderFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-white/40 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
                  />
                </label>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setUploaderOpen(false)} disabled={uploaderBusy} className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-bold uppercase text-xs text-white transition-all">Cancelar</button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => doUploadWithTipo(uploaderFile, uploaderTipo)}
                  disabled={uploaderBusy || !uploaderFile || !uploaderTipo}
                  className="flex-1 bg-amber-500 text-gray-900 font-black uppercase text-xs rounded-xl shadow-lg shadow-amber-900/40 disabled:opacity-50 active:scale-95 transition-all h-11"
                >
                  {uploaderBusy ? "Subiendo…" : "Subir Documento"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}