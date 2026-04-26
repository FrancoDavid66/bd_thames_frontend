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
    out.push({ id: it?.id, key, label: toLabel(key), url, public_id: it?.public_id || "", mime: it?.mime || "" });
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

export default function VehiculoDocsPanel({ polizaId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [poliza, setPoliza] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  // Modal Dinámico
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [uploaderMode, setUploaderMode] = useState("FOTO"); // "FOTO" o "DOC"
  const [uploaderTag, setUploaderTag] = useState("");
  const [uploaderFile, setUploaderFile] = useState(null);
  const uploaderFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

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
    } catch(e) { toast.error("Error al subir archivo"); } finally { setUploading(false); }
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

  return (
    <div className="rounded-xl border border-white/10 bg-white/[.05] p-3 text-white">
      {/* Header General */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-white/70">Vehículo & Documentos</div>
          <div className="truncate font-semibold">{title}</div>
          {poliza?.cobertura && (
            <div className="mt-0.5 text-xs text-white/60">
              Cobertura: <b>{String(poliza.cobertura).replace(/_/g, " ")}</b>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openUploader("FOTO")} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/20 px-3 py-2 text-sm hover:bg-emerald-400/30 disabled:opacity-50">
            <HiUpload /> Agregar foto
          </button>
          <button onClick={() => fetchVehiculoDocs()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-50">
            <HiRefresh className={loading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Galería (AHORA 100% DINÁMICA) */}
        <section className="rounded-xl border border-white/10 bg-white/[.04] p-3">
          <header className="mb-2 flex items-center gap-2 text-white/85">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><HiPhotograph className="text-lg" /></span>
            <h3 className="font-medium">Galería del vehículo</h3>
          </header>

          <AnimatePresence initial={false}>
            {loading ? (
              <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-video rounded-lg bg-white/10 animate-pulse" />)}
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {/* Dibuja solo lo que existe */}
                {fotos.map((item) => (
                  <figure key={item.url} className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={item.url} alt={item.label} className="aspect-video w-full object-cover" loading="lazy" />
                    </a>
                    <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 hover:opacity-100 transition">
                      <figcaption className="px-2 py-1 text-xs"><span className="inline-block max-w-[10rem] truncate" title={item.label}>{item.label}</span></figcaption>
                      <div className="p-1 flex items-center gap-1">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-white/10 hover:bg-white/20"><HiExternalLink /></a>
                        {isWebAdmin && <button onClick={() => removePhoto(item)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] bg-rose-500/20 hover:bg-rose-500/30"><HiTrash /></button>}
                      </div>
                    </div>
                  </figure>
                ))}
                
                {/* Botón dinámico al final de la grilla */}
                <button onClick={() => openUploader("FOTO")} className="aspect-video rounded-lg border border-dashed border-white/15 bg-white/[.03] flex flex-col items-center justify-center text-xs text-white/40 hover:border-white/30 hover:text-white/70">
                  <HiPlus className="mb-1 text-lg" /> Agregar Foto
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Documentos Legales */}
        <section className="rounded-xl border border-white/10 bg-white/[.04] p-3">
          <header className="mb-2 flex items-center justify-between text-white/85">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><HiDocumentText className="text-lg" /></span>
              <h3 className="font-medium">Documentos</h3>
            </div>
            <button onClick={() => openUploader("DOC")} className="inline-flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded">
              <HiPlus /> Agregar Documento
            </button>
          </header>

          <AnimatePresence initial={false}>
            {loading ? (
              <motion.ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, i) => <li key={i} className="rounded-lg bg-white/10 h-16 animate-pulse" />)}
              </motion.ul>
            ) : documentos.length ? (
              <motion.div className="space-y-3">
                {docsAgrupados.imgDocs.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-white/60">Imágenes</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {docsAgrupados.imgDocs.map((d) => (
                        <figure key={d.url} className="rounded-lg overflow-hidden border border-white/10 bg-black/20">
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="block"><img src={d.url} alt={d.label} className="aspect-video w-full object-cover transition hover:opacity-95" loading="lazy" /></a>
                          <figcaption className="flex items-center justify-between px-2 py-1 text-xs">
                            <span className="truncate" title={d.label}>{d.label}</span>
                            <div className="flex gap-1">
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] bg-white/10 hover:bg-white/20"><HiExternalLink /></a>
                              {isWebAdmin && <button onClick={() => removePhoto(d)} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] bg-rose-500/20 hover:bg-rose-500/30"><HiTrash /></button>}
                            </div>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                {docsAgrupados.pdfDocs.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-white/60">PDFs</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {docsAgrupados.pdfDocs.map((d) => (
                        <li key={d.url} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                          <span className="truncate text-xs" title={d.label}>{d.label}</span>
                          <div className="flex gap-1">
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] bg-white/10 hover:bg-white/20"><HiExternalLink /></a>
                            {isWebAdmin && <button onClick={() => removePhoto(d)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] bg-rose-500/20 hover:bg-rose-500/30"><HiTrash /></button>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div className="text-sm text-white/60">No hay documentos cargados.</motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Modal Subida Dinámico */}
      <AnimatePresence>
        {uploaderOpen && (
          <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="flex justify-between mb-5">
                <h4 className="text-white font-bold uppercase tracking-tight">Subir {uploaderMode === "FOTO" ? "Foto" : "Documento"}</h4>
                <button onClick={() => setUploaderOpen(false)}><HiX className="text-white/40 text-xl hover:text-white" /></button>
              </div>
              <div className="grid gap-4">
                <label className="block">
                  <span className="block text-[10px] font-black uppercase text-gray-500 mb-1.5 ml-1">Etiqueta / Tipo</span>
                  <input
                    list="tags-sug" value={uploaderTag} onChange={e => setUploaderTag(e.target.value)}
                    placeholder={uploaderMode === "FOTO" ? "Ej: FRENTE, MOTOR..." : "Ej: CONTRATO, VTV..."}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 ring-amber-500/50 uppercase"
                  />
                  <datalist id="tags-sug">
                    {uploaderMode === "FOTO" ? (
                      <><option value="FRENTE" /><option value="TRASERA" /><option value="LATERAL_IZQ" /><option value="LATERAL_DER" /><option value="INTERIOR" /><option value="PATENTE" /></>
                    ) : (
                      <><option value="CEDULA_VERDE" /><option value="TITULO" /><option value="VTV" /><option value="OBLEA_GNC" /></>
                    )}
                  </datalist>
                </label>
                <label className="block group">
                  <span className="block text-[10px] font-black uppercase text-gray-500 mb-1.5 ml-1 group-hover:text-gray-300 transition-colors">Seleccionar Archivo</span>
                  <input
                    ref={uploaderFileRef} type="file" accept={uploaderMode === "FOTO" ? "image/*" : "image/*,.pdf"}
                    onChange={(e) => setUploaderFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-white/40 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
                  />
                </label>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setUploaderOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-white uppercase transition-all">Cancelar</button>
                <button onClick={doUpload} disabled={uploading} className="flex-1 bg-amber-500 text-gray-900 font-black uppercase text-xs rounded-xl shadow-lg shadow-amber-900/40 hover:bg-amber-400 active:scale-95 transition-all disabled:opacity-50">
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