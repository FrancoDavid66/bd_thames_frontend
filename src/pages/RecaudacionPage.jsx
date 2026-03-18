// src/pages/RecaudacionPage.jsx
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { 
  HiCamera, HiUpload, HiOutlineOfficeBuilding, 
  HiClock, HiCalendar, HiFilter, HiX, HiZoomIn, HiCurrencyDollar
} from "react-icons/hi";

// 🚀 IMPORTAMOS CONTEXTO, REDUX Y UTILIDADES
import { useAuth } from "../context/AuthContext";
import { fetchRecaudaciones, uploadRecaudacion } from "../store/slices/recaudacionSlice";
import { uploadToCloudinary } from "../utils/cloudinary";

const RecaudacionPage = () => {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-20">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Caja y Recaudación
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-widest">
                Cierre Diario
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {isWebAdmin 
                ? "Panel de auditoría: Verificá los cierres de caja de todas las sucursales." 
                : "Subí la foto del cierre de caja del día para que el administrador la verifique."}
            </p>
          </div>
        </div>

        {/* RENDERIZADO CONDICIONAL SEGÚN ROL */}
        {isWebAdmin ? <AdminGalleryView /> : <UserUploadView />}

      </div>
    </div>
  );
};

/* =========================================================
   👩‍💻 VISTA USUARIO NORMAL: SUBIR FOTO
========================================================= */
function UserUploadView() {
  const dispatch = useDispatch();
  const { uploading } = useSelector((state) => state.recaudacion);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Tenés que seleccionar o sacar una foto primero.");
    
    try {
      // 1. Subimos a Cloudinary
      const uploadRes = await uploadToCloudinary(file, { folder: "de-thames/recaudacion" });
      
      // 2. Despachamos a Redux para guardar en Django
      const payload = {
        foto_url: uploadRes.secure_url,
        foto_public_id: uploadRes.public_id,
        monto_declarado: montoDeclarado ? Number(montoDeclarado) : null,
      };

      await dispatch(uploadRecaudacion(payload)).unwrap();
      
      toast.success("¡Foto de recaudación enviada con éxito! 💸");
      setFile(null);
      setPreview(null);
      setMontoDeclarado("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al enviar la foto. Intentá de nuevo.");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-4 sm:mt-10">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <h2 className="text-xl font-bold text-white mb-6">Subir Cierre de Caja</h2>

        {!preview ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl bg-slate-950/50 hover:bg-emerald-500/5 transition-all"
          >
            <div className="h-16 w-16 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 flex items-center justify-center mb-4 transition-colors">
              <HiCamera className="text-3xl text-slate-400 group-hover:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-slate-300">Tocar para abrir la cámara</p>
            <p className="text-xs text-slate-500 mt-2 text-center px-8">Asegurate de que se vea bien la fecha y el monto en el papel.</p>
          </div>
        ) : (
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-700 bg-black">
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            <button 
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute top-3 right-3 h-8 w-8 bg-black/60 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer"
            >
              <HiX />
            </button>
          </div>
        )}

        {/* Input Oculto (Acepta imágenes, en celulares abre la cámara directamente) */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <div className="mt-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Monto Declarado (Opcional)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold"><HiCurrencyDollar className="text-lg"/></span>
            <input 
              type="number" 
              placeholder="Ej: 328000"
              value={montoDeclarado}
              onChange={(e) => setMontoDeclarado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white font-bold outline-none focus:border-emerald-500 focus:ring-1 ring-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || uploading}
          className="cursor-pointer w-full mt-8 h-14 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
        >
          {uploading ? (
            <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <><HiUpload className="text-xl" /> Enviar Recaudación</>
          )}
        </button>

      </div>
    </div>
  );
}

/* =========================================================
   🕵️‍♂️ VISTA ADMIN: GALERÍA Y AUDITORÍA
========================================================= */
function AdminGalleryView() {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.recaudacion);
  
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [filtroOficina, setFiltroOficina] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  useEffect(() => {
    dispatch(fetchRecaudaciones({ oficina: filtroOficina, fecha: filtroFecha }));
  }, [dispatch, filtroOficina, filtroFecha]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-xs tracking-widest">
          <HiFilter className="text-lg" /> Filtros
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input 
            type="date" 
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="cursor-pointer bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:border-emerald-500 text-sm"
          />
          <select 
            value={filtroOficina}
            onChange={(e) => setFiltroOficina(e.target.value)}
            className="cursor-pointer bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:border-emerald-500 text-sm"
          >
            <option value="">Todas las sucursales</option>
            <option value="1">5 Esquinas (1)</option>
            <option value="2">Axion (2)</option>
            <option value="3">Km 39 (3)</option>
          </select>
        </div>
      </div>

      {/* Grilla de Fotos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
          <HiCamera className="mx-auto text-5xl text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No hay fotos de recaudación para estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((reg) => (
            <motion.div 
              key={reg.id} 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg group"
            >
              {/* Imagen con hover de zoom */}
              <div 
                className="relative h-48 w-full bg-black cursor-pointer overflow-hidden"
                onClick={() => setFotoAmpliada(reg.foto_url)}
              >
                <img src={reg.foto_url} alt="Caja" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <HiZoomIn className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
              </div>

              {/* Info de la tarjeta */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase bg-slate-800 text-sky-400">
                    <HiOutlineOfficeBuilding /> {reg.oficina_nombre || "Sucursal"}
                  </span>
                  {reg.monto_declarado && (
                    <span className="font-black text-emerald-400 text-sm">
                      ${new Intl.NumberFormat("es-AR").format(reg.monto_declarado)}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <HiCalendar className="text-slate-500" />
                    {dayjs(reg.creado_en).format("DD/MM/YYYY")}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <HiClock className="text-slate-500" />
                    {dayjs(reg.creado_en).format("HH:mm:ss")} hs
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest">
                  Subido por: <span className="font-bold text-slate-300">{reg.usuario_nombre}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL FOTO AMPLIADA */}
      <AnimatePresence>
        {fotoAmpliada && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setFotoAmpliada(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-md cursor-pointer">
              <HiX className="text-3xl" />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={fotoAmpliada} 
              alt="Caja ampliada" 
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// 👇 EXPORT DEFINITIVO (Esto soluciona el error)
export default RecaudacionPage;