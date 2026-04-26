// src/components/polizas/vehiculo/VehicleGallery.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  HiOutlinePhotograph, HiUpload, HiTrash, HiStar, HiX, HiArrowLeft, HiArrowRight, HiDownload, HiEye, HiRefresh, HiClipboardCopy,
} from "react-icons/hi";
import { uploadToCloudinary } from "../../../utils/cloudinary";
import { PolizasAPI } from "../../../api/polizas";
import { updatePoliza } from "../../../store/slices/polizasSlice";

const shell = "rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-xl shadow-black/20";
const linkStyle = "inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 transition-colors cursor-pointer focus-visible:outline-none";

function SegBtn({ active, children, onClick }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${active ? "bg-sky-600 text-white border-sky-600" : "bg-white/10 text-white border-white/10"}`}>
      {children}
    </button>
  );
}

const byNewest = (a, b) => {
  const ta = a?.subido_en ? new Date(a.subido_en).getTime() : 0;
  const tb = b?.subido_en ? new Date(b.subido_en).getTime() : 0;
  return tb !== ta ? tb - ta : Number(b?.id || 0) - Number(a?.id || 0);
};

const mapTipoLabel = (t) => String(t || "OTRA").replace(/_/g, " ").toUpperCase();

export default function VehicleGallery({ polizaId, currentPerfilUrl, onChanged }) {
  const dispatch = useDispatch();
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");
  const [tipoFoto, setTipoFoto] = useState("FRENTE");
  const [subiendo, setSubiendo] = useState(false);
  const [uploadCount, setUploadCount] = useState({ done: 0, total: 0 });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const fileRef = useRef(null);

  // 🚀 Extraemos los tipos de fotos subidas dinámicamente
  const tiposDinamicos = useMemo(() => Array.from(new Set(fotos.map(f => f.tipo || "OTRA"))), [fotos]);

  useEffect(() => {
    let alive = true;
    if (!polizaId) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/polizas/fotos/?poliza=${encodeURIComponent(polizaId)}`, { credentials: "include" });
        const d = await r.json();
        const list = Array.isArray(d) ? d : d?.results || [];
        if (alive) setFotos([...list].sort(byNewest));
      } catch (e) {} finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [polizaId]);

  const counts = useMemo(() => {
    const map = { TODOS: fotos.length };
    tiposDinamicos.forEach(t => map[t] = 0);
    fotos.forEach(f => map[f.tipo || "OTRA"] += 1);
    return map;
  }, [fotos, tiposDinamicos]);

  const fotosFiltradas = useMemo(() => (filtro === "TODOS" ? fotos : fotos.filter((f) => f.tipo === filtro)), [fotos, filtro]);
  const esPerfil = useCallback((f) => !!currentPerfilUrl && f.url === currentPerfilUrl, [currentPerfilUrl]);

  const subirVarios = async (files) => {
    if (!polizaId || !files?.length) return;
    if (!tipoFoto.trim()) return toast.error("Escribí un tipo de foto");

    setSubiendo(true);
    setUploadCount({ done: 0, total: files.length });
    const finalTipo = tipoFoto.trim().toUpperCase().replace(/ /g, "_");

    try {
      const nuevos = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await uploadToCloudinary(file, "de-thames/vehiculos");
        const r = await fetch(`/api/polizas/fotos/`, {
          method: "POST", headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
          body: JSON.stringify({ poliza: polizaId, url: data.secure_url, public_id: data.public_id || "", tipo: finalTipo })
        });
        const created = await r.json();
        nuevos.push(created);
        setUploadCount((s) => ({ ...s, done: s.done + 1 }));
      }
      setFotos((arr) => [...nuevos, ...arr].sort(byNewest));
      toast.success(`Se agregaron ${nuevos.length} foto(s)`);
      onChanged?.();
    } catch (e) { toast.error("Error al subir"); } finally {
      setSubiendo(false); setUploadCount({ done: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const eliminarFoto = async (id) => {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    try {
      await fetch(`/api/polizas/fotos/${id}/`, { method: "DELETE", headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
      setFotos((arr) => arr.filter((f) => f.id !== id));
      toast.success("Foto eliminada");
      onChanged?.();
    } catch (e) {}
  };

  const setDesdeGaleria = async (foto) => {
    try {
      await dispatch(updatePoliza({ id: polizaId, foto_perfil_url: foto.url, foto_perfil_public_id: foto.public_id || "" })).unwrap();
      toast.success("Foto perfil actualizada");
      onChanged?.();
    } catch (e) {}
  };

  const openViewerAt = (idx) => { setViewerIndex(idx); setViewerOpen(true); };
  const closeViewer = () => setViewerOpen(false);
  const prev = () => setViewerIndex((i) => (i - 1 + fotosFiltradas.length) % fotosFiltradas.length);
  const next = () => setViewerIndex((i) => (i + 1) % fotosFiltradas.length);
  const current = fotosFiltradas[viewerIndex];

  return (
    <div className={shell}>
      {/* Barra superior con filtros dinámicos */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><HiOutlinePhotograph className="text-sky-300" /> Galería fotográfica</div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 flex-wrap">
            <SegBtn active={filtro === "TODOS"} onClick={() => setFiltro("TODOS")}>Todos · {counts.TODOS}</SegBtn>
            {tiposDinamicos.map((t) => (
              <SegBtn key={t} active={filtro === t} onClick={() => setFiltro(t)}>{mapTipoLabel(t)} · {counts[t] || 0}</SegBtn>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          
          {/* Tarjeta Agregar Dinámica */}
          <div className="rounded-xl border border-dashed border-sky-400/60 bg-sky-400/10 p-4 flex flex-col justify-between min-h-[12rem]">
            <div className="space-y-2 mb-3">
              <div className="text-sm font-semibold text-white">Subir Foto</div>
              <label className="text-[10px] text-white/80 uppercase font-black tracking-widest block">Escribir o Seleccionar Tipo:</label>
              <input 
                list="foto-sug" value={tipoFoto} onChange={(e) => setTipoFoto(e.target.value)} placeholder="Ej: FRENTE, MOTOR..."
                className="w-full rounded-lg bg-black/40 border border-sky-500/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-400 uppercase font-bold"
              />
              <datalist id="foto-sug">
                <option value="FRENTE"/><option value="TRASERA"/><option value="PATENTE"/><option value="LATERAL_IZQ"/><option value="INTERIOR"/>
              </datalist>
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => subirVarios(Array.from(e.target.files || []))} />
              <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-2.5 uppercase transition-colors">
                {subiendo ? `Subiendo ${uploadCount.done}/${uploadCount.total}` : "Seleccionar Imagenes"}
              </button>
            </div>
          </div>

          {/* Galería */}
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />) :
            fotosFiltradas.map((f, idx) => (
              <div key={f.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col">
                <div className="relative">
                  {esPerfil(f) && <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black uppercase">Perfil</div>}
                  <img onClick={() => openViewerAt(idx)} src={f.url} className="w-full aspect-[16/10] bg-black/30 object-cover cursor-pointer hover:opacity-80 transition" />
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span onClick={() => !esPerfil(f) && setDesdeGaleria(f)} className={`${linkStyle} text-[10px] uppercase font-bold ${esPerfil(f) ? "text-white/40" : "text-amber-400"}`}><HiStar /> Perfil</span>
                    <button onClick={() => eliminarFoto(f.id)} className="ml-auto text-rose-400 hover:text-rose-300"><HiTrash /></button>
                  </div>
                  <div className="text-[10px] font-black text-sky-400 uppercase truncate">{mapTipoLabel(f.tipo)}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {viewerOpen && current && (
        <div className="fixed inset-0 z-[100] bg-black/90 p-4 grid place-items-center">
           <img src={current.url} className="max-h-[85vh] max-w-full rounded-xl border border-white/10 shadow-2xl" />
           <button onClick={closeViewer} className="absolute top-4 right-4 text-white text-3xl"><HiX/></button>
           <button onClick={prev} className="absolute left-4 text-white text-3xl bg-black/50 p-2 rounded-full"><HiArrowLeft/></button>
           <button onClick={next} className="absolute right-4 text-white text-3xl bg-black/50 p-2 rounded-full"><HiArrowRight/></button>
           <div className="absolute bottom-6 bg-black/80 px-6 py-2 rounded-full text-white font-bold uppercase tracking-widest text-sm">{mapTipoLabel(current.tipo)}</div>
        </div>
      )}
    </div>
  );
}