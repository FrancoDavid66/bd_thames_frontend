// src/components/polizas/VehiculoDocsPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiPhotograph,
  HiDocumentText,
  HiExternalLink,
  HiRefresh,
  HiTrash,
  HiPlus,
  HiUpload,
  HiX,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";

const FOTO_ORDER = [
  "FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "INTERIOR",
  "RUEDA_AUXILIO", "OBLEA_GNC", "TUBO_GNC", "PATENTE",
];

const LABELS = {
  FRENTE: "Frente", LATERAL_IZQ: "Lateral izq.", LATERAL_DER: "Lateral der.", TRASERA: "Trasera",
  INTERIOR: "Interior", RUEDA_AUXILIO: "Rueda de auxilio", OBLEA_GNC: "Oblea GNC", TUBO_GNC: "Equipo/Tubo GNC",
  EQUIPO_GNC: "Equipo/Tubo GNC", PATENTE: "Patente", CEDULA_VERDE: "Cédula verde", TITULO: "Título", VTV: "VTV", OTRA: "Otra",
};

const stripAccents = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const KEY_SYNONYMS = {
  RUEDA: "RUEDA_AUXILIO", RUEDA_DE_AUXILIO: "RUEDA_AUXILIO", RUEDA_AUX: "RUEDA_AUXILIO",
  LATERAL_IZQUIERDO: "LATERAL_IZQ", IZQUIERDO: "LATERAL_IZQ", LAT_IZQ: "LATERAL_IZQ",
  LATERAL_DERECHO: "LATERAL_DER", DERECHO: "LATERAL_DER", LAT_DER: "LATERAL_DER",
  DOMINIO: "PATENTE", MATRICULA: "PATENTE", REGISTRO: "LICENCIA", RTO: "VTV",
  EQUIPO: "TUBO_GNC", EQUIPO_GNC: "TUBO_GNC", CILINDRO_GNC: "TUBO_GNC", CEDULA: "CEDULA_VERDE",
};

const DOCUMENT_KEYS = new Set(["CEDULA_VERDE", "CEDULA_AZUL", "LICENCIA", "TITULO", "VTV", "PERMISO"]);
const FORCE_AS_PHOTO_KEYS = new Set(["TUBO_GNC", "RUEDA_AUXILIO"]);

const canonicalKey = (k = "") => {
  let x = stripAccents(k.toUpperCase()).replace(/\s+/g, "_").replace(/__+/g, "_").replace(/\bDE_/g, "_");
  return KEY_SYNONYMS[x] || x;
};

const toLabel = (k = "") => LABELS[k] || k.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const isImage = (mime = "", url = "") => {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  const u = String(url || "").toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|bmp|heic|avif)$/.test(u);
};

const isPdf = (mime = "", url = "") => {
  const m = String(mime || "").toLowerCase();
  if (m === "application/pdf") return true;
  const u = String(url || "").toLowerCase();
  return /\.pdf(\?.*)?$/.test(u);
};

const toKey = (item = {}) => canonicalKey(String(item.key ?? item.tipo ?? item.nombre ?? "").trim());

// 🆕 Miniatura de la 1ra página de un PDF de Cloudinary (image/upload).
//    Inserta la transformación pg_1 + tamaño y cambia .pdf → .jpg.
//    Devuelve "" si la URL no es transformable (ahí usamos el ícono de respaldo).
const thumbPdf = (url = "") => {
  if (!url || !/\/image\/upload\//.test(url)) return "";
  let u = url.replace("/image/upload/", "/image/upload/pg_1,w_180,h_240,c_fit,q_auto,f_jpg/");
  u = u.replace(/\.pdf($|\?)/i, ".jpg$1");
  return u;
};

// 🆕 Nombre legible del archivo: usa el nombre guardado; si no, lo deriva de la URL.
const nombreArchivo = (d = {}) => {
  const n = String(d?.nombre || "").trim();
  if (n) return n;
  try {
    const last = decodeURIComponent(String(d?.url || "").split("/").pop().split("?")[0]);
    return last || "documento.pdf";
  } catch {
    return "documento.pdf";
  }
};

function normalizeFotos(arr = []) {
  const out = [];
  for (const it of arr) {
    const key = toKey(it) || "OTRA";
    if (DOCUMENT_KEYS.has(key)) continue;
    const url = it?.url || it?.secure_url || "";
    if (!url) continue;
    out.push({ id: it?.id, key, label: toLabel(key), url, public_id: it?.public_id || "" });
  }
  const priority = new Map(FOTO_ORDER.map((k, i) => [k, i]));
  out.sort((a, b) => {
    const ai = priority.has(a.key) ? priority.get(a.key) : 999;
    const bi = priority.has(b.key) ? priority.get(b.key) : 999;
    return ai - bi || a.label.localeCompare(b.label);
  });
  return out.filter((x, i, self) => i === self.findIndex((t) => t.url === x.url));
}

function normalizeDocs(arr = []) {
  const out = [];
  for (const it of arr) {
    const key = toKey(it) || "DOCUMENTO";
    const url = it?.url || it?.secure_url || "";
    if (!url) continue;
    out.push({ id: it?.id, key, label: toLabel(key), url, public_id: it?.public_id || "", mime: it?.mime || "", nombre: it?.nombre || "" });
  }
  return out.filter((x, i, self) => i === self.findIndex((t) => t.url === x.url));
}

function consolidate(rawFotos = [], rawDocs = []) {
  const fN = normalizeFotos(rawFotos);
  const dN = normalizeDocs(rawDocs);

  const extraFotos = [];
  const dFiltered = [];
  for (const d of dN) {
    if (FORCE_AS_PHOTO_KEYS.has(d.key)) extraFotos.push({ ...d }); else dFiltered.push(d);
  }

  const allFotos = [...fN, ...extraFotos];
  const dByUrl = new Map(dFiltered.map((x) => [x.url, x]));

  const fotos = [];
  const documentos = [];

  for (const f of allFotos) {
    const d = dByUrl.get(f.url);
    if (!d) { fotos.push(f); continue; }
    if (new Set(FOTO_ORDER).has(f.key) || isImage(d.mime, d.url)) fotos.push(f);
    else documentos.push(d);
    dByUrl.delete(f.url);
  }
  for (const d of dByUrl.values()) documentos.push(d);

  const dedup = (arr) => arr.filter((x, i, self) => i === self.findIndex((t) => t.url === x.url));
  return { fotos: dedup(fotos), documentos: dedup(documentos) };
}

// 🆕 Miniatura de PDF con ícono de respaldo si la imagen no carga.
function PdfThumb({ url, alt }) {
  const [err, setErr] = useState(false);
  const src = thumbPdf(url);
  if (err || !src) {
    return (
      <span className="grid h-14 w-11 shrink-0 place-items-center rounded bg-rose-500/10">
        <HiDocumentText className="text-lg text-rose-300" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "PDF"}
      loading="lazy"
      onError={() => setErr(true)}
      className="h-14 w-11 shrink-0 rounded border border-slate-700 bg-white object-cover"
    />
  );
}

export default function VehiculoDocsPanel({ polizaId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [poliza, setPoliza] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null); // 🆕 PDF a previsualizar

  // Modal Dinámico
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [uploaderMode, setUploaderMode] = useState("FOTO"); // "FOTO" o "DOC"
  const [uploaderTag, setUploaderTag] = useState("");
  const [uploaderFile, setUploaderFile] = useState(null);
  const uploaderFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const isWebAdmin = user?.perfil?.rol === "ADMIN";

  const title = useMemo(() => {
    if (!poliza) return `Póliza #${polizaId}`;
    const cli = poliza?.cliente;
    const nombre = `${cli?.apellido || ""} ${cli?.nombre || ""}`.trim();
    return [nombre || null, poliza?.patente || null, poliza?.numero_poliza ? `#${poliza.numero_poliza}` : null].filter(Boolean).join(" · ");
  }, [poliza, polizaId]);

  async function fetchVehiculoDocs() {
    if (!polizaId) return;
    setLoading(true);
    try {
      try {
        const { poliza, documentos, fotos } = await PolizasAPI.refreshPack(polizaId);
        const { fotos: f, documentos: d } = consolidate(fotos || [], documentos || []);
        setPoliza(poliza || null); setFotos(f); setDocumentos(d);
        return;
      } catch (e) { console.warn("refreshPack falló, usando fallbacks"); }

      const [pRes, docsRes, fotosRes] = await Promise.all([
        api.get(`/polizas/${polizaId}/`).catch(() => ({ data: null })),
        api.get(`/polizas/documentos/`, { params: { poliza: polizaId } }).catch(() => ({ data: [] })),
        api.get(`/polizas/fotos/`, { params: { poliza: polizaId } }).catch(() => ({ data: [] })),
      ]);

      const docsArr = Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.results || [];
      const fotosArr = Array.isArray(fotosRes.data) ? fotosRes.data : fotosRes.data?.results || [];
      const { fotos: f, documentos: d } = consolidate(fotosArr, docsArr);

      setPoliza(pRes.data || null); setFotos(f); setDocumentos(d);
    } catch (err) { toast.error("Error al cargar archivos"); } finally { setLoading(false); }
  }

  useEffect(() => { fetchVehiculoDocs(); }, [polizaId]);

  const docsAgrupados = useMemo(() => {
    const imgDocs = []; const pdfDocs = []; const otros = [];
    for (const d of documentos) {
      if (isPdf(d.mime, d.url)) pdfDocs.push(d);
      else if (isImage(d.mime, d.url)) imgDocs.push(d);
      else otros.push(d);
    }
    return { imgDocs, pdfDocs, otros };
  }, [documentos]);

  const openUploader = (mode) => {
    setUploaderMode(mode); setUploaderTag(""); setUploaderFile(null);
    if (uploaderFileRef.current) uploaderFileRef.current.value = "";
    setUploaderOpen(true);
  };

  const doUpload = async () => {
    if (!uploaderFile) return toast.error("Elegí un archivo");
    if (!uploaderTag.trim()) return toast.error("Escribí una etiqueta");

    setUploading(true);
    try {
      const finalTag = uploaderTag.trim().toUpperCase().replace(/ /g, "_");
      const folder = uploaderMode === "FOTO" ? "rc-admin/polizas/fotos" : "rc-admin/polizas/documentos";
      const up = await uploadToCloudinary(uploaderFile, folder);

      const payload = {
        poliza: Number(polizaId), url: up.secure_url || up.url, public_id: up.public_id || "", tipo: finalTag,
        nombre: uploaderFile.name || finalTag, mime: uploaderFile.type || "application/octet-stream",
      };

      if (uploaderMode === "FOTO") await PolizasAPI.crearFotoVehiculo(payload);
      else await PolizasAPI.crearDocumento(payload);

      toast.success("Archivo subido con éxito");
      setUploaderOpen(false);
      fetchVehiculoDocs();
    } catch (e) { toast.error("Error al subir archivo"); } finally { setUploading(false); }
  };

  const removePhoto = async (item) => {
    if (!isWebAdmin) return toast.error("Solo los administradores pueden eliminar archivos.");
    if (!confirm("¿Eliminar este archivo?")) return;
    try {
      if (item.mime) await PolizasAPI.deleteDocumento(item.id);
      else await PolizasAPI.borrarFotoVehiculo(item.id);
      toast.success("Archivo eliminado");
      fetchVehiculoDocs();
    } catch (err) { toast.error("Error al eliminar."); }
  };

  // 🔄 Reemplazar el archivo de un documento/foto (solo admin), manteniendo su tipo.
  //    Ej: subir la propuesta correcta de AMCA o el Mercosur de NRE y pisar el viejo.
  const replaceFileRef = useRef(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replacing, setReplacing] = useState(false);

  const pickReplace = (item) => {
    if (!isWebAdmin) return toast.error("Solo los administradores pueden reemplazar archivos.");
    setReplaceTarget(item);
    if (replaceFileRef.current) {
      replaceFileRef.current.value = "";
      replaceFileRef.current.click();
    }
  };

  const onReplaceFile = async (file) => {
    if (!file || !replaceTarget) return;
    const item = replaceTarget;
    setReplacing(true);
    try {
      const folder = item.mime ? "rc-admin/polizas/documentos" : "rc-admin/polizas/fotos";
      const up = await uploadToCloudinary(file, folder);
      const url = up.secure_url || up.url;
      const public_id = up.public_id || "";

      if (item.mime) {
        // Documento (PDF u otro): se mantiene el TIPO, solo cambia el archivo.
        await api.patch(`/polizas/documentos/${item.id}/`, {
          url, public_id,
          nombre: file.name || item.nombre || "",
          mime: file.type || item.mime || "application/octet-stream",
        });
      } else {
        // Foto del vehículo
        await api.patch(`/polizas/fotos/${item.id}/`, {
          url, public_id, nombre: file.name || item.nombre || "",
        });
      }
      toast.success("Archivo reemplazado ✅");
      setReplaceTarget(null);
      fetchVehiculoDocs();
    } catch (e) {
      toast.error("Error al reemplazar el archivo.");
    } finally {
      setReplacing(false);
    }
  };

  /* ===================== Render ===================== */
  return (
    <div className="text-slate-100">
      {/* Input oculto para reemplazar un archivo (solo admin) */}
      <input
        ref={replaceFileRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplaceFile(f); }}
      />
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Vehículo & documentos</div>
          <div className="truncate text-base font-semibold text-white">{title}</div>
          {poliza?.cobertura ? (
            <div className="mt-0.5 text-xs text-slate-400">
              Cobertura: <b className="text-slate-200">{String(poliza.cobertura).replace(/_/g, " ")}</b>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openUploader("FOTO")}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            <HiUpload /> Agregar foto
          </button>
          <button
            onClick={() => fetchVehiculoDocs()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <HiRefresh className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ===== Galería ===== */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#121829] p-3">
          <header className="mb-3 flex items-center gap-2 text-slate-200">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
              <HiPhotograph className="text-lg" />
            </span>
            <h3 className="text-sm font-semibold">Fotos</h3>
          </header>

          <AnimatePresence initial={false}>
            {loading ? (
              <motion.div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="aspect-video animate-pulse rounded-lg bg-slate-800" />
                ))}
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {fotos.map((item) => (
                  <figure key={item.url} className="group relative overflow-hidden rounded-lg border border-white/[0.06] bg-slate-900">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={item.url} alt={item.label} className="aspect-video w-full object-cover" loading="lazy" />
                    </a>
                    <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition group-hover:opacity-100">
                      <figcaption className="px-2 py-1 text-xs text-white">
                        <span className="inline-block max-w-[10rem] truncate" title={item.label}>{item.label}</span>
                      </figcaption>
                      <div className="flex items-center gap-1 p-1">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-[11px] hover:bg-white/20"><HiExternalLink /></a>
                        {isWebAdmin ? (
                          <button onClick={() => removePhoto(item)} className="inline-flex items-center rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/30"><HiTrash /></button>
                        ) : null}
                      </div>
                    </div>
                  </figure>
                ))}

                <button
                  onClick={() => openUploader("FOTO")}
                  className="flex aspect-video flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 text-xs text-slate-500 transition hover:border-indigo-500/50 hover:text-indigo-300"
                >
                  <HiPlus className="mb-1 text-lg" /> Agregar foto
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ===== Documentos ===== */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#121829] p-3">
          <header className="mb-3 flex items-center justify-between text-slate-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                <HiDocumentText className="text-lg" />
              </span>
              <h3 className="text-sm font-semibold">Documentos</h3>
            </div>
            <button onClick={() => openUploader("DOC")} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700">
              <HiPlus /> Agregar
            </button>
          </header>

          <AnimatePresence initial={false}>
            {loading ? (
              <motion.ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => <li key={i} className="h-16 animate-pulse rounded-lg bg-slate-800" />)}
              </motion.ul>
            ) : documentos.length ? (
              <motion.div className="space-y-3">
                {docsAgrupados.imgDocs.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Imágenes</div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {docsAgrupados.imgDocs.map((d) => (
                        <figure key={d.url} className="overflow-hidden rounded-lg border border-white/[0.06] bg-slate-900">
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={d.url} alt={d.label} className="aspect-video w-full object-cover transition hover:opacity-90" loading="lazy" />
                          </a>
                          <figcaption className="flex items-center justify-between px-2 py-1 text-xs text-slate-300">
                            <span className="truncate" title={d.label}>{d.label}</span>
                            <div className="flex gap-1">
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-[11px] hover:bg-white/20"><HiExternalLink /></a>
                              {isWebAdmin ? <button onClick={() => removePhoto(d)} className="inline-flex items-center rounded bg-rose-500/20 px-1.5 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/30"><HiTrash /></button> : null}
                            </div>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                {docsAgrupados.pdfDocs.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">PDFs</div>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {docsAgrupados.pdfDocs.map((d) => (
                        <li key={d.url} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-[#121829] px-3 py-2">
                          <button type="button" onClick={() => setPreviewDoc(d)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" title="Previsualizar">
                            <PdfThumb url={d.url} alt={d.label} />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-slate-100" title={d.label}>{d.label}</span>
                              <span className="block truncate text-[11px] text-slate-400" title={nombreArchivo(d)}>{nombreArchivo(d)}</span>
                            </span>
                          </button>
                          <div className="flex shrink-0 gap-1">
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20" title="Abrir en pestaña nueva"><HiExternalLink /></a>
                            {isWebAdmin ? <button onClick={() => pickReplace(d)} disabled={replacing} className="inline-flex items-center gap-1 rounded bg-sky-500/20 px-2 py-1 text-[11px] text-sky-300 hover:bg-sky-500/30 disabled:opacity-50" title="Reemplazar archivo"><HiRefresh className={replacing && replaceTarget?.id === d.id ? "animate-spin" : ""} /></button> : null}
                            {isWebAdmin ? <button onClick={() => removePhoto(d)} className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/30" title="Eliminar"><HiTrash /></button> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div className="rounded-lg border border-dashed border-white/[0.06] py-8 text-center text-sm text-slate-500">
                No hay documentos cargados.
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* ===== Modal de previsualización de PDF ===== */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            className="fixed inset-0 z-[130] flex flex-col bg-black/85 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewDoc(null)}
          >
            <div className="flex items-center justify-between gap-2 p-3 text-white" onClick={(e) => e.stopPropagation()}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{previewDoc.label}</p>
                <p className="truncate text-[11px] text-white/60">{nombreArchivo(previewDoc)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"><HiExternalLink /> Abrir</a>
                <button onClick={() => setPreviewDoc(null)} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><HiX /></button>
              </div>
            </div>
            <div className="flex-1 bg-black/40" onClick={(e) => e.stopPropagation()}>
              <iframe title={nombreArchivo(previewDoc)} src={`${previewDoc.url}#view=FitH&toolbar=1`} className="h-full w-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Modal de subida ===== */}
      <AnimatePresence>
        {uploaderOpen && (
          <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#121829] p-6 shadow-2xl" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="mb-5 flex justify-between">
                <h4 className="font-bold uppercase tracking-tight text-white">
                  Subir {uploaderMode === "FOTO" ? "foto" : "documento"}
                </h4>
                <button onClick={() => setUploaderOpen(false)}><HiX className="text-xl text-slate-500 hover:text-white" /></button>
              </div>
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-1.5 ml-1 block text-[10px] font-bold uppercase text-slate-500">Etiqueta / Tipo</span>
                  <input
                    list="tags-sug"
                    value={uploaderTag}
                    onChange={(e) => setUploaderTag(e.target.value)}
                    placeholder={uploaderMode === "FOTO" ? "Ej: FRENTE, MOTOR..." : "Ej: CONTRATO, VTV..."}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-bold uppercase text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <datalist id="tags-sug">
                    {uploaderMode === "FOTO" ? (
                      <><option value="FRENTE" /><option value="TRASERA" /><option value="LATERAL_IZQ" /><option value="LATERAL_DER" /><option value="INTERIOR" /><option value="PATENTE" /></>
                    ) : (
                      <><option value="CEDULA_VERDE" /><option value="TITULO" /><option value="VTV" /><option value="OBLEA_GNC" /></>
                    )}
                  </datalist>
                </label>
                <label className="group block">
                  <span className="mb-1.5 ml-1 block text-[10px] font-bold uppercase text-slate-500 transition-colors group-hover:text-slate-300">Seleccionar archivo</span>
                  <input
                    ref={uploaderFileRef}
                    type="file"
                    accept={uploaderMode === "FOTO" ? "image/*" : "image/*,.pdf"}
                    onChange={(e) => setUploaderFile(e.target.files?.[0] || null)}
                    className="w-full cursor-pointer text-xs text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-[10px] file:font-black file:uppercase file:text-white hover:file:bg-slate-700"
                  />
                </label>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setUploaderOpen(false)} className="flex-1 rounded-xl border border-slate-700 py-3 text-xs font-bold uppercase text-slate-300 transition hover:bg-slate-800">Cancelar</button>
                <button onClick={doUpload} disabled={uploading} className="flex-1 rounded-xl bg-indigo-500 py-3 text-xs font-black uppercase text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-400 active:scale-95 disabled:opacity-50">
                  {uploading ? "Subiendo..." : "Subir"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}