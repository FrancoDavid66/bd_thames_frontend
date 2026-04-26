// src/components/polizas/DocumentosVehiculoSection.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiFolderOpen, HiSearch, HiRefresh, HiUpload, HiViewGrid, HiTrash,
  HiExternalLink, HiX, HiDocumentText,
} from "react-icons/hi";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { unwrapResults, guessMimeByName, isImageMime, isPdfMime } from "./documentos/DocUtils";

const formatLabel = (key) => String(key || "OTRO").replace(/_/g, " ").toUpperCase();

/* ===== Modal de PREVIEW integrado ===== */
function PreviewModal({ doc, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc) return null;
  const title = doc?.nombre || doc?.url?.split("/")?.pop() || formatLabel(doc?.tipo);
  const mime = (doc?.mime || guessMimeByName(doc?.nombre || doc?.url || "") || "").toLowerCase();
  const isImg = isImageMime(mime || doc?.url || "");
  const isPdf = isPdfMime(mime || doc?.url || "");

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur p-3 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div initial={{ opacity: 0, scale: 0.98, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }} className="w-full h-[85vh] max-w-5xl rounded-2xl border border-white/10 bg-[#0b0f1e] shadow-2xl overflow-hidden flex flex-col">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">{title}</h3>
              <p className="text-xs text-white/60 truncate">{formatLabel(doc?.tipo)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 text-neutral-900 hover:bg-white text-sm"><HiExternalLink /> Abrir</a>
              <button onClick={onClose} className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20"><HiX className="text-white" /></button>
            </div>
          </header>

          <div className="flex-1 bg-black/30">
            {isImg && <div className="w-full h-full grid place-items-center p-3"><img src={doc.url} alt={title} className="max-h-full max-w-full object-contain rounded-lg" /></div>}
            {isPdf && <iframe title={title} src={`${doc.url}#view=FitH&toolbar=1`} className="w-full h-full" allow="autoplay" />}
            {!isImg && !isPdf && (
              <div className="h-full w-full grid place-items-center px-4">
                <div className="text-center text-white/80 max-w-sm">
                  <HiDocumentText className="text-4xl mx-auto mb-2" />
                  <p className="mb-3 text-sm">Este tipo de archivo no se puede previsualizar aquí.</p>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 text-neutral-900 hover:bg-white text-sm"><HiExternalLink /> Abrir en nueva pestaña</a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function DocumentosVehiculoSection({ polizaId }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [soloConArchivos, setSoloConArchivos] = useState(false);
  const [activeTypes, setActiveTypes] = useState(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Modal de subida
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [uploaderTipo, setUploaderTipo] = useState("");
  const [uploaderFile, setUploaderFile] = useState(null);
  const uploaderFileRef = useRef(null);
  const [uploaderBusy, setUploaderBusy] = useState(false);

  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  // Extraemos tipos dinámicos de los documentos ya subidos
  const tiposDinamicos = useMemo(() => Array.from(new Set(docs.map(d => d.tipo || "OTRO"))), [docs]);

  async function cargarLista() {
    if (!polizaId) return;
    setLoading(true);
    try {
      const data = await PolizasAPI.getDocumentos(polizaId);
      setDocs(unwrapResults(data));
    } catch (e) {
      try {
        const r = await api.get(`/polizas/documentos/`, { params: { poliza: polizaId } });
        setDocs(r.data?.results || r.data || []);
      } catch (e2) { toast.error("No se pudieron cargar los documentos"); }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (polizaId) cargarLista(); }, [polizaId]);

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

  const vis = useMemo(() => {
    const q = query.trim().toLowerCase();
    const typeFilterActive = activeTypes.size > 0;
    return docs.filter((d) => {
      if (q && !(d?.nombre || "").toLowerCase().includes(q) && !(d?.url || "").toLowerCase().includes(q)) return false;
      if (typeFilterActive && !activeTypes.has(String(d?.tipo || ""))) return false;
      return true;
    });
  }, [docs, query, activeTypes]);

  const doUploadWithTipo = async (file, tipoKey) => {
    if (!file) return;
    if (!tipoKey.trim()) return toast.error("Escribí un tipo de documento.");
    
    setUploaderBusy(true);
    const finalTipo = tipoKey.trim().toUpperCase().replace(/ /g, "_");
    try {
      const { secure_url, public_id, mime } = await uploadToCloudinary(file, "rc-admin/polizas/documentos");
      await api.post(`/polizas/documentos/`, {
        poliza: Number(polizaId),
        tipo: finalTipo,
        url: secure_url,
        public_id,
        nombre: file.name || "documento",
        mime: file.type || mime || guessMimeByName(file.name),
      });
      toast.success("Documento subido");
      await cargarLista();
      setUploaderOpen(false);
    } catch (e) { toast.error("No se pudo subir el documento"); } finally { setUploaderBusy(false); }
  };

  const openUploader = () => {
    setUploaderTipo("CEDULA_VERDE");
    setUploaderFile(null);
    if (uploaderFileRef.current) uploaderFileRef.current.value = "";
    setUploaderOpen(true);
  };

  const onDelete = async (docId) => {
    if (!isWebAdmin) return toast.error("Solo los administradores pueden eliminar documentos.");
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      await PolizasAPI.deleteDocumento(docId);
      toast.success("Documento eliminado");
      await cargarLista();
    } catch (e) { toast.error("No se pudo eliminar"); }
  };

  return (
    <section className="w-full rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:p-6 shadow-xl shadow-black/25">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-white/10 border border-white/10"><HiFolderOpen className="w-5 h-5 text-amber-300" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">Documentos Legales</h2>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{user?.perfil?.oficina_nombre || 'Local'}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <button onClick={cargarLista} className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center"><HiRefresh className="text-white" /></button>
          <button onClick={openUploader} className="px-4 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-900 text-sm font-semibold transition-all flex items-center gap-2"><HiUpload /> Subir documento</button>
        </div>
      </header>

      {/* CHIPS DINÁMICOS */}
      {tiposDinamicos.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tiposDinamicos.map(t => {
            const act = activeTypes.has(t);
            return (
              <button key={t} onClick={() => {
                const next = new Set(activeTypes);
                act ? next.delete(t) : next.add(t);
                setActiveTypes(next);
              }} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${act ? "bg-amber-400/25 border-amber-300 text-amber-200" : "bg-white/5 border-white/10 text-white/80"}`}>
                {formatLabel(t)}
              </button>
            )
          })}
          {activeTypes.size > 0 && <button className="text-xs underline text-white/70 ml-1" onClick={() => setActiveTypes(new Set())}>Limpiar filtros</button>}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4"><div className="h-40 bg-white/5 animate-pulse rounded-xl"/><div className="h-40 bg-white/5 animate-pulse rounded-xl"/></div>
      ) : vis.length === 0 ? (
        <div className="text-sm text-white/70 py-8 text-center border border-dashed border-white/10 rounded-2xl">No hay documentos cargados.</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {vis.map((d) => (
              <motion.div key={d.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="group relative rounded-xl border border-white/10 bg-white/5 overflow-hidden shadow-lg">
                <div onClick={() => setPreviewDoc(d)} className="cursor-pointer h-40 grid place-items-center bg-black/40">
                  {isImageMime(d?.mime || d?.url) ? <img src={d.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" /> : <div className="text-center text-sky-400"><HiDocumentText className="text-4xl mx-auto" /><span className="text-[10px] font-black uppercase">Archivo</span></div>}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <a href={d.url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-white/90 text-neutral-900 grid place-items-center"><HiExternalLink /></a>
                  {isWebAdmin && <button onClick={() => onDelete(d.id)} className="w-8 h-8 rounded-lg bg-rose-500/90 text-white grid place-items-center"><HiTrash /></button>}
                </div>
                <div className="px-3 py-2 border-t border-white/10 bg-[#0f1220]/80">
                  <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase truncate max-w-full">{formatLabel(d.tipo)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* MODAL SUBIDA CON INPUT LIBRE (DATALIST) */}
      <AnimatePresence>
        {uploaderOpen && (
          <motion.div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 backdrop-blur-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h4 className="text-white font-bold uppercase tracking-tight">Subir Documento</h4><button onClick={() => setUploaderOpen(false)}><HiX className="text-white/40 text-xl" /></button></div>
              <div className="grid gap-4">
                <label className="block">
                  <span className="block text-[10px] font-black uppercase text-gray-500 mb-1.5 ml-1">Escribir o Seleccionar Tipo</span>
                  <input 
                    list="doc-sug" value={uploaderTipo} onChange={e => setUploaderTipo(e.target.value)} placeholder="Ej: CONTRATO, VTV, CEDULA..."
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-500/50 uppercase" 
                  />
                  <datalist id="doc-sug">
                    <option value="CEDULA_VERDE"/><option value="TITULO"/><option value="VTV"/><option value="OBLEA_GNC"/>
                  </datalist>
                </label>
                <input ref={uploaderFileRef} type="file" accept="image/*,.pdf" onChange={(e) => setUploaderFile(e.target.files?.[0] || null)} className="w-full text-xs text-white/40 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-white/10 file:text-white cursor-pointer"/>
              </div>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setUploaderOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-xs font-bold text-white uppercase">Cancelar</button>
                <button onClick={() => doUploadWithTipo(uploaderFile, uploaderTipo)} disabled={uploaderBusy} className="flex-1 bg-amber-500 text-gray-900 font-black uppercase text-xs rounded-xl">{uploaderBusy ? "Subiendo..." : "Subir"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}