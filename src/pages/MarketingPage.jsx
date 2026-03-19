import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaBullhorn, FaSyncAlt, FaTimes, FaHistory, 
  FaChevronDown, FaSpinner, FaWhatsapp, FaImage, 
  FaUpload, FaTrash, FaEye, FaEyeSlash, FaCheckCircle
} from "react-icons/fa";

import MarketingFilters from "../components/marketing/MarketingFilters";

import {
  fetchAudienciaResumen, fetchHistorialMarketing, fetchMarketingFilterOptions,
  sendMensajeMarketingThunk, fetchLogsHistorial,
  selectMarketingAudiencia, selectMarketingAudienciaStatus, selectMarketingFilterOptions,
  selectMarketingHistorial, selectMarketingHistorialStatus, selectMarketingSendStatus,
  selectMarketingLogsById
} from "../store/slices/marketingSlice";

const VARS = ["nombre", "apellido", "marca", "modelo", "anio", "compania", "patente", "oficina"];

function insertAtCursor(textareaEl, valueToInsert, currentValue, setValue) {
  if (!textareaEl) return setValue(`${currentValue || ""}${valueToInsert}`);
  const start = textareaEl.selectionStart ?? currentValue.length;
  const end = textareaEl.selectionEnd ?? currentValue.length;
  setValue(`${currentValue.slice(0, start)}${valueToInsert}${currentValue.slice(end)}`);
}

export default function MarketingPage() {
  const dispatch = useDispatch();
  
  const audiencia = useSelector(selectMarketingAudiencia);
  const audienciaStatus = useSelector(selectMarketingAudienciaStatus);
  const filterOptions = useSelector(selectMarketingFilterOptions);
  const historial = useSelector(selectMarketingHistorial);
  const historialStatus = useSelector(selectMarketingHistorialStatus);
  const sendStatus = useSelector(selectMarketingSendStatus);

  // 🚀 FIX: Agregamos dias_condicion y dias_cantidad al estado inicial
  const [form, setForm] = useState({ 
    oficina: "", // Ahora por defecto arranca en "Todas las oficinas"
    anio: [], 
    marca: [], 
    modelo: [], 
    compania: [],
    estado: "activa", // 🚀 Agregado para que arranque en activas por defecto
    dias_condicion: "", // 🚀 Agregado para el filtro de días
    dias_cantidad: ""   // 🚀 Agregado para el filtro de días
  });
  
  const [mensaje, setMensaje] = useState("Hola {nombre} 😊, te escribimos de Thames por tu {marca} {modelo}...");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // ESTADOS PARA PAGINACIÓN Y OCULTAMIENTO
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [visibleItemsCount, setVisibleItemsCount] = useState(5);

  const [showSuccess, setShowSuccess] = useState(false);

  const loadingAud = audienciaStatus === "loading";
  const sendingNow = sendStatus === "loading";

  useEffect(() => {
    dispatch(fetchMarketingFilterOptions({ oficina: form.oficina }));
    dispatch(fetchHistorialMarketing({ oficina: form.oficina }));
  }, [dispatch, form.oficina]);

  useEffect(() => {
    if (!isComposeOpen) return;
    const timer = setTimeout(() => dispatch(fetchAudienciaResumen({ ...form, mensaje })), 450);
    return () => clearTimeout(timer);
  }, [dispatch, isComposeOpen, form, mensaje]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const onEnviar = async () => {
    const msgTrimmed = mensaje.trim();
    if (!msgTrimmed) {
        alert("Por favor, escribe un mensaje.");
        return;
    }

    const formData = new FormData();
    formData.append("mensaje", msgTrimmed);
    formData.append("oficina", form.oficina);
    formData.append("filtros", JSON.stringify(form));
    
    if (selectedFile) {
      formData.append("archivo_imagen", selectedFile);
    }

    const res = await dispatch(sendMensajeMarketingThunk(formData));
    
    if (!res.error) {
      dispatch(fetchHistorialMarketing({ oficina: form.oficina }));
      setIsComposeOpen(false);
      removeFile();
      // Volvemos a mostrar los primeros 5 elementos al enviar uno nuevo
      setVisibleItemsCount(5);
      setIsHistoryVisible(true);

      // MOSTRAMOS EL CARTEL DE ÉXITO POR 3 SEGUNDOS
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
    } else {
        alert("Error al enviar campaña: " + res.payload);
    }
  };

  const toggleLogs = (id) => {
    if (expandedId === id) setExpandedId(null);
    else {
      setExpandedId(id);
      dispatch(fetchLogsHistorial({ id }));
    }
  };

  // Solo tomamos el primer elemento para mostrar como ejemplo
  const sampleData = audiencia?.sample && audiencia.sample.length > 0 ? [audiencia.sample[0]] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-50 relative pb-10">
      
      {/* OVERLAY DE ENVÍO */}
      <AnimatePresence>
        {sendingNow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
              <FaWhatsapp className="text-6xl text-emerald-400" />
            </motion.div>
            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Lanzando Campaña...</h3>
            <p className="text-slate-400 mt-2">Estamos procesando {audiencia?.total_mensajes || "..."} mensajes. No cierres la pestaña.</p>
            <FaSpinner className="animate-spin text-3xl text-yellow-400 mt-8" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAY DE ÉXITO (Misión Cumplida) */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, duration: 0.6 }} className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
              <FaCheckCircle className="text-6xl text-emerald-400" />
            </motion.div>
            <motion.h3 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-4xl font-black italic uppercase tracking-tighter text-white">
              ¡Campaña Enviada!
            </motion.h3>
            <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-slate-400 mt-3 text-lg">
              Los mensajes fueron procesados correctamente.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-yellow-400/20 flex items-center justify-center text-yellow-300"><FaBullhorn /></div>
        <div className="flex-1">
           <h2 className="text-2xl font-black italic uppercase tracking-tighter">Marketing</h2>
           <p className="text-sm text-slate-400">Automatización masiva (1 mensaje por póliza).</p>
        </div>
        <button onClick={() => dispatch(fetchHistorialMarketing({ oficina: form.oficina }))} className="bg-white/10 p-3 rounded-xl hover:bg-white/20">
           <FaSyncAlt className={historialStatus === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      <motion.button 
        whileHover={{ scale: 1.005 }} 
        onClick={() => setIsComposeOpen(true)} 
        className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 cursor-pointer p-8 rounded-[30px] text-gray-950 font-black text-3xl italic uppercase shadow-xl hover:shadow-yellow-500/20 transition-all"
      >
        Lanzar nueva campaña
      </motion.button>

      {/* SECCIÓN DE HISTORIAL CON PAGINACIÓN Y OCULTAMIENTO */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 shadow-2xl transition-all">
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3 font-black text-xl italic uppercase text-white">
              <FaHistory className="text-yellow-400" /> Historial de Envíos
           </div>
           
           <button 
              onClick={() => setIsHistoryVisible(!isHistoryVisible)} 
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-xl"
           >
              {isHistoryVisible ? <><FaEyeSlash /> Ocultar</> : <><FaEye /> Mostrar</>}
           </button>
        </div>

        <AnimatePresence>
          {isHistoryVisible && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }} 
               animate={{ opacity: 1, height: "auto" }} 
               exit={{ opacity: 0, height: 0 }}
               className="space-y-4 overflow-hidden"
            >
              {historial.slice(0, visibleItemsCount).map(h => (
                <div key={h.id} className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-white/10">
                  <div className="p-5 flex items-center justify-between cursor-pointer text-white" onClick={() => toggleLogs(h.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center gap-2">
                         <span>Campaña #{h.id}</span>
                         <span className="text-slate-500 text-[10px] font-normal">{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-slate-400 text-sm italic truncate mt-1">"{h.mensaje}"</div>
                    </div>
                    <div className="flex gap-6 text-center mx-6">
                      <div className="text-emerald-400 font-black"><div className="text-[9px] uppercase opacity-50">Éxito</div>{h.total_enviados}</div>
                      <div className="text-rose-400 font-black"><div className="text-[9px] uppercase opacity-50">Error</div>{h.total_errores}</div>
                    </div>
                    <FaChevronDown className={`text-slate-500 transition-transform ${expandedId === h.id ? "rotate-180" : ""}`} />
                  </div>
                  <AnimatePresence>{expandedId === h.id && <LogList id={h.id} />}</AnimatePresence>
                </div>
              ))}

              {historial.length > 0 && (
                 <div className="pt-4 flex items-center justify-center gap-4">
                    {visibleItemsCount < historial.length && (
                       <button 
                         onClick={() => setVisibleItemsCount(prev => prev + 5)} 
                         className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                       >
                         Ver más antiguas
                       </button>
                    )}
                    {visibleItemsCount > 5 && (
                       <button 
                         onClick={() => setVisibleItemsCount(5)} 
                         className="px-6 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                       >
                         Mostrar menos
                       </button>
                    )}
                 </div>
              )}
              
              {historial.length === 0 && (
                 <div className="text-center py-10 text-slate-500 italic text-sm">
                    No hay campañas registradas todavía.
                 </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* EDITOR (Modal de Composición) */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-[#0b1220] rounded-[40px] border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
              <div className="p-6 border-b border-white/10 flex justify-between items-center text-white font-black italic uppercase tracking-widest">
                <span className="text-yellow-400">Editor de WhatsApp</span>
                <button onClick={() => setIsComposeOpen(false)} className="hover:text-rose-400 transition-colors"><FaTimes /></button>
              </div>
              <div className="p-8 overflow-y-auto grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Cuerpo del Mensaje</label>
                    <textarea id="msg-area" className="w-full h-36 bg-slate-900 rounded-3xl p-5 text-white border border-white/10 outline-none focus:ring-2 focus:ring-yellow-400 text-sm" value={mensaje} onChange={e => setMensaje(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-2 flex items-center gap-1"><FaImage className="text-yellow-400" /> Imagen del Ordenador (Opcional)</label>
                    <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <label htmlFor="file-upload" className="flex items-center justify-center gap-3 w-full h-14 bg-white/5 border border-dashed border-white/20 rounded-2xl cursor-pointer hover:bg-white/10 transition-all">
                      <FaUpload className="text-yellow-400" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{selectedFile ? selectedFile.name : "Seleccionar Archivo"}</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {VARS.map(v => (
                      <button key={v} onClick={() => insertAtCursor(document.getElementById("msg-area"), `{${v}}`, mensaje, setMensaje)} className="px-3 py-1.5 bg-white/5 rounded-xl text-[10px] font-black border border-white/5 hover:bg-yellow-400 hover:text-black transition-all uppercase">{`{${v}}`}</button>
                    ))}
                  </div>
                  <MarketingFilters values={form} onChange={(k,v) => setForm(p => ({...p, [k]:v}))} options={filterOptions} loading={loadingAud} />
                  <button onClick={onEnviar} disabled={sendingNow} className="w-full h-16 bg-yellow-400 rounded-3xl font-black text-gray-950 text-lg uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-[0.98] transition-all">LANZAR AHORA</button>
                </div>
                <div className="bg-white/5 rounded-[32px] p-6 border border-white/10 text-white flex flex-col h-full">
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="text-center bg-slate-900/50 p-5 rounded-3xl border border-white/5"><div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Match</div><div className="text-3xl font-black italic">{loadingAud ? "..." : audiencia?.count_polizas_match || 0}</div></div>
                      <div className="text-center bg-slate-900/50 p-5 rounded-3xl border border-white/5"><div className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Envíos</div><div className="text-3xl font-black italic text-emerald-400">{loadingAud ? "..." : `${audiencia?.total_mensajes || 0}`}</div></div>
                   </div>
                   {previewUrl && (
                     <div className="mb-6 relative group">
                        <div className="text-[10px] font-black uppercase text-yellow-400 mb-2 ml-2">Vista Previa</div>
                        <div className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40"><img src={previewUrl} className="w-full h-full object-cover" alt="Preview" /></div>
                        <button onClick={removeFile} className="absolute top-8 right-2 bg-rose-500 p-2 rounded-full shadow-xl hover:scale-110 transition-transform"><FaTrash size={12} /></button>
                     </div>
                   )}
                   
                   {/* MUESTRA REAL RENDERIZADA: SOLO 1 MENSAJE */}
                   <div className="flex items-center justify-between mb-4 ml-2">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Muestra Real Renderizada</span>
                     <span className="text-[9px] text-slate-400 italic">
                        {audiencia?.total_mensajes > 0 ? `(Mostrando 1 de ${audiencia.total_mensajes})` : ""}
                     </span>
                   </div>
                   <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
                      {sampleData.map((s, i) => (
                        <div key={i} className="bg-black/40 p-5 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-xs text-yellow-400 font-black italic uppercase">{s.cliente_nombre}</span>
                             <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded-full">{s.numero}</span>
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">"{s.mensaje_renderizado}"</p>
                        </div>
                      ))}
                      {sampleData.length === 0 && !loadingAud && (
                        <div className="text-center text-xs text-slate-500 italic py-4">No hay muestra disponible</div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LogList({ id }) {
  const logs = useSelector(state => selectMarketingLogsById(state, id));
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 bg-black/20 p-4 text-white">
      <div className="max-h-60 overflow-auto space-y-2 pr-2 custom-scrollbar">
        {logs.items?.length === 0 ? <div className="text-center text-xs text-slate-500 italic py-4">Cargando...</div> : logs.items?.map(l => (
          <div key={l.id} className="flex items-center justify-between text-[11px] p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="font-bold w-24 tabular-nums">{l.numero}</span>
            <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[8px] ${l.estado === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{l.estado}</span>
            <span className="text-slate-400 truncate ml-4 flex-1 italic">"{l.mensaje}"</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}