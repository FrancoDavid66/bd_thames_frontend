// src/components/polizas/DocumentosVehiculoSection.jsx
// Rediseñado: flujo de subida pregunta SIEMPRE el tipo de documento antes de subir.
// - Botón “Subir documento” abre un modal con <select de tipo> + <picker de archivo>.
// - Drag & Drop: si soltás un archivo, se abre el mismo modal pidiéndote el tipo.
// - Vista tipo galería con cards, preview, abrir en pestaña y eliminar.
// - Búsqueda por nombre/URL y chips para filtrar por tipo.
// - Auto-refresh cuando llegan docs desde la solicitud.
// - ✅ PREVISUALIZACIÓN integrada (imágenes y PDF) sin usar DocPreviewModal externo.

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
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [soloConArchivos, setSoloConArchivos] = useState(false);

  // Filtro por tipo (chips)
  const [activeTypes, setActiveTypes] = useState(new Set());

  // Drag & Drop sobre toda la sección → ahora abre el modal para elegir tipo
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // ===== Modal de subida: seleccionás tipo y archivo, y luego sube =====
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [uploaderTipo, setUploaderTipo] = useState(TIPOS_UI[0]?.key || "");
  const [uploaderFile, setUploaderFile] = useState(null);
  const uploaderFileRef = useRef(null);
  const uploaderAccept =
    TIPOS_UI.find((t) => t.key === uploaderTipo)?.accept || ".jpg,.jpeg,.png,.pdf";
  const [uploaderBusy, setUploaderBusy] = useState(false);

  /* ====== Carga de lista ====== */
  async function cargarLista() {
    if (!polizaId) return;
    setLoading(true);
    try {
      const data = await PolizasAPI.getDocumentos(polizaId);
      const arr = unwrapResults(data);
      setDocs(arr);
    } catch (e) {
      if (DEBUG) console.error("[Documentos] wrapper API error → fallback", e);
      try {
        const r = await fetch(
          `/api/polizas/documentos/?poliza=${encodeURIComponent(polizaId)}`,
          {
            credentials: "include",
          }
        );
        const text = await r.text();
        if (!r.ok) throw new Error(`GET documentos ${r.status}: ${text}`);
        const json = text ? JSON.parse(text) : [];
        const arr = Array.isArray(json)
          ? json
          : json?.results?.length
          ? json.results
          : json?.data?.length
          ? json.data
          : [];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ====== Subida (siempre con tipo seleccionado en modal) ====== */
  async function crearDocumento(body) {
    try {
      return await PolizasAPI.crearDocumento(body);
    } catch (e) {
      const r = await fetch(`/api/polizas/documentos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const text = await r.text();
      if (!r.ok) {
        const err = new Error(`POST /api/polizas/documentos/ ${r.status}`);
        err.responseText = text;
        throw err;
      }
      return text ? JSON.parse(text) : {};
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
      // limpiar modal
      setUploaderFile(null);
      if (uploaderFileRef.current) uploaderFileRef.current.value = "";
      setUploaderOpen(false);
    } catch (e) {
      const msg = e?.payload?.detail || e?.responseText || e?.message;
      toast.error(msg || "No se pudo subir el documento");
    } finally {
      setUploaderBusy(false);
    }
  };

  // Abrir modal (click en botón)
  const openUploader = () => {
    setUploaderTipo(TIPOS_UI[0]?.key || "");
    setUploaderFile(null);
    if (uploaderFileRef.current) uploaderFileRef.current.value = "";
    setUploaderOpen(true);
  };

  // Drag & Drop → abrimos modal con el archivo precargado y pedimos tipo
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
    // eslint-disable-next-line no-restricted-globals
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
      <h2 className="text-base font-semibold text-white">{children}</h2>
    </div>
  );

  /* ====== Render ====== */
  return (
    <section
      ref={dropRef}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
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
              aria-label="Filtrar por tipos con archivos"
            >
              <HiViewGrid
                className={soloConArchivos ? "text-amber-300" : "text-white/80"}
              />
            </motion.button>

            <motion.button
              whileTap={{ rotate: 25, scale: 0.95 }}
              onClick={cargarLista}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition"
              title="Actualizar"
              aria-label="Actualizar"
            >
              <HiRefresh className="w-5 h-5 text-white/90" />
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={openUploader}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 text-neutral-900 text-sm font-semibold w-full sm:w-auto"
          >
            <HiUpload className="text-base" />
            Subir documento
          </motion.button>
        </div>
      </header>

      {/* Chips de tipo (filtro) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TIPOS_UI.map((t) => {
          const act = activeTypes.has(t.key);
          return (
            <Chip
              key={t.key}
              active={act}
              onClick={() => {
                const next = new Set(activeTypes);
                if (act) next.delete(t.key);
                else next.add(t.key);
                setActiveTypes(next);
              }}
            >
              {t.label}
            </Chip>
          );
        })}
        {activeTypes.size > 0 && (
          <button
            className="text-xs underline underline-offset-2 text-white/70 ml-1"
            onClick={() => setActiveTypes(new Set())}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Galería */}
      {loading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-white/5 border border_white/10 animate-pulse"
            />
          ))}
        </div>
      ) : vis.length === 0 ? (
        <div className="text-sm text-white/70">
          No hay documentos para mostrar. Usá <b>Subir documento</b> o arrastrá
          un archivo sobre esta sección.
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
                  key={d.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group relative rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    title={title}
                    className="block"
                  >
                    {img ? (
                      <img
                        src={d.url}
                        alt={title}
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-40 grid place-items-center bg-gradient-to-br from-neutral-900 to-neutral-800">
                        <div className="flex flex-col items-center text-white/80">
                          <HiPhotograph className="text-3xl mb-1" />
                          <span className="text-[11px] opacity-80">Documento</span>
                        </div>
                      </div>
                    )}
                  </a>

                  <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/25 transition">
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition pointer-events-auto">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 text-neutral-900 hover:bg-white"
                        title="Abrir en nueva pestaña"
                      >
                        <HiExternalLink />
                      </a>
                      <button
                        onClick={() => setPreviewDoc(d)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 text-neutral-900 hover:bg-white"
                        title="Previsualizar"
                      >
                        <HiPhotograph />
                      </button>
                      <button
                        onClick={() => onDelete(d.id)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-rose-400/90 text-neutral-900 hover:bg-rose-400"
                        title="Eliminar"
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </div>

                  <div className="px-3 py-2 border-t border-white/10 bg-[#0f1220]/70 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-white/80">
                        {label}
                      </span>
                      <span className="truncate text-[11px] text-white/60">
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

      {/* ✅ Preview modal integrado */}
      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* ===== Modal: Elegir tipo + archivo ===== */}
      <AnimatePresence>
        {uploaderOpen && (
          <motion.div
            className="fixed inset-0 z-[95] grid place-items-center bg-black/60 backdrop-blur p-4"
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
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0c28] p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">Subir documento</h4>
                <button
                  onClick={() => !uploaderBusy && setUploaderOpen(false)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20"
                  title="Cerrar"
                >
                  <HiX className="text-white" />
                </button>
              </div>

              <div className="grid gap-3">
                <label className="text-sm">
                  <span className="block text-white/85 mb-1">
                    Tipo de documento
                  </span>
                  <select
                    value={uploaderTipo}
                    onChange={(e) => setUploaderTipo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 px-3 py-3 outline-none focus:ring-4 ring-amber-300/30 text-white"
                    style={{ backgroundColor: "#141827" }}
                  >
                    {TIPOS_UI.map((t) => (
                      <option
                        key={t.key}
                        value={t.key}
                        className="bg-[#0f1324] text-white"
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="block text-white/85 mb-1">
                    Archivo (1 por vez)
                  </span>
                  <input
                    ref={uploaderFileRef}
                    type="file"
                    accept={uploaderAccept}
                    onChange={(e) => setUploaderFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-3 outline-none focus:ring-4 ring-amber-300/20 text-white placeholder:text-white/40 transition"
                  />
                  <span className="block mt-1 text-[11px] text-white/60">
                    Formatos admitidos: imágenes o PDF.
                  </span>
                </label>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  onClick={() => setUploaderOpen(false)}
                  disabled={uploaderBusy}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm text-white disabled:opacity-60 w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => doUploadWithTipo(uploaderFile, uploaderTipo)}
                  disabled={uploaderBusy || !uploaderFile || !uploaderTipo}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-br from-amber-200 to-yellow-200 text-[#0b0f1e] font-semibold shadow hover:brightness-105 disabled:opacity-60 w-full sm:w-auto"
                >
                  {uploaderBusy ? "Subiendo…" : "Subir"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
