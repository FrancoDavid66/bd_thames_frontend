// src/components/clientes/ClienteDatosPersonalesCard.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { 
  HiIdentification, 
  HiPhone, 
  HiMail, 
  HiLocationMarker, 
  HiCalendar, 
  HiPhotograph,
  HiX 
} from "react-icons/hi";

const fmt = (d) => (d ? dayjs(d).format("DD-MM-YYYY") : "-");

export default function ClienteDatosPersonalesCard({ cliente }) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState(null);

  if (!cliente) return null;

  const frente = cliente?.archivo_dni_frente || cliente?.archivo_dni || null;
  const dorso = cliente?.archivo_dni_dorso || null;

  const estadoActivo = cliente.estado === true || cliente.estado === "activo";
  const estadoTone = estadoActivo
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border border-rose-500/20";
  const estadoLabel = estadoActivo ? "Activo" : "Inactivo";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setShow(false);
    if (show) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const open = (u) => {
    setUrl(u);
    setShow(true);
  };

  const faltaBadge = "inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 ml-2";

  return (
    <motion.section
      className="rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <HiIdentification className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-widest truncate">
              Datos Personales
            </h2>
            <p className="text-[9px] sm:text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5 truncate">
              Contacto y Documentación
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${estadoTone}`}>
          {estadoLabel}
        </span>
      </div>

      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-5 overflow-y-auto scrollbar-hide">
        
        {/* Identificadores Principales */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 pb-4 border-b border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">DNI / CUIT</span>
            <span className="text-white font-mono font-bold text-sm sm:text-base">{cliente.dni_cuit_cuil || "—"}</span>
          </div>
          
          {cliente.alias && (
            <div className="flex flex-col gap-1 border-l border-white/10 pl-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Alias</span>
              <span className="text-sky-400 font-bold text-sm truncate max-w-[120px] sm:max-w-[200px]">{cliente.alias}</span>
            </div>
          )}
          
          {cliente.id && (
            <div className="flex flex-col gap-1 ml-auto text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">ID Sist.</span>
              <span className="text-white/60 font-mono font-bold text-sm">#{cliente.id}</span>
            </div>
          )}
        </div>

        {/* Grid de datos en cajas (Mobile friendly) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Teléfono */}
          <div className="flex gap-3 items-start bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl">
            <HiPhone className="text-sky-400 text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Teléfono / WhatsApp</span>
              {cliente.telefono ? (
                <a href={`tel:${cliente.telefono}`} className="text-sm font-bold text-white hover:text-sky-400 transition-colors truncate">
                  {cliente.telefono}
                </a>
              ) : (
                <span className="text-sm font-bold text-white/20">—</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex gap-3 items-start bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl">
            <HiMail className="text-sky-400 text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Correo Electrónico</span>
              {cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="text-sm font-bold text-white hover:text-sky-400 transition-colors block truncate w-full" title={cliente.email}>
                  {cliente.email}
                </a>
              ) : (
                <span className={faltaBadge}>Falta</span>
              )}
            </div>
          </div>

          {/* Dirección */}
          <div className="flex gap-3 items-start bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <HiLocationMarker className="text-sky-400 text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0 w-full">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Dirección y Localidad</span>
              <span className="text-sm font-bold text-white leading-snug">
                {cliente.direccion || "—"}
                {cliente.localidad && (
                  <span className="text-white/40 font-normal ml-1">· {cliente.localidad}</span>
                )}
                {!cliente.localidad && !cliente.direccion && <span className={faltaBadge}>Falta</span>}
              </span>
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div className="flex gap-3 items-start bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <HiCalendar className="text-sky-400 text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Fecha de Nacimiento</span>
              <span className="text-sm font-bold text-white">
                {fmt(cliente.fecha_nacimiento)}
              </span>
            </div>
          </div>

        </div>

        {/* Galería DNI */}
        <div className="pt-4 mt-auto border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
             <HiPhotograph className="text-sky-400 text-sm" />
             <span className="text-[10px] uppercase font-black tracking-widest text-white/60">
               Archivos del Documento
             </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Frente */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Frente</span>
              {frente ? (
                <button
                  onClick={() => open(frente)}
                  className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-white/10 hover:border-sky-500/50 hover:ring-2 ring-sky-500/30 transition-all focus:outline-none"
                  title="Ampliar Frente"
                  type="button"
                >
                  <img src={frente} alt="Frente DNI" className="object-cover w-full h-full opacity-80 hover:opacity-100 transition-opacity" onError={(e) => e.currentTarget.style.display = "none"} />
                </button>
              ) : (
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center">
                   <span className="text-[8px] font-black uppercase text-white/20">Vacío</span>
                </div>
              )}
            </div>

            {/* Dorso */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Dorso</span>
              {dorso ? (
                <button
                  onClick={() => open(dorso)}
                  className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-white/10 hover:border-sky-500/50 hover:ring-2 ring-sky-500/30 transition-all focus:outline-none"
                  title="Ampliar Dorso"
                  type="button"
                >
                  <img src={dorso} alt="Dorso DNI" className="object-cover w-full h-full opacity-80 hover:opacity-100 transition-opacity" onError={(e) => e.currentTarget.style.display = "none"} />
                </button>
              ) : (
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center">
                   <span className="text-[8px] font-black uppercase text-white/20">Vacío</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox inmersivo */}
      <AnimatePresence>
        {show && url && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow(false)}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-3 rounded-2xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-lg"
            >
              <HiX className="text-xl" />
            </button>
            
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full flex items-center justify-center"
            >
              <div className="rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl shadow-black">
                <img
                  src={url}
                  alt="Documento ampliado"
                  className="max-w-full max-h-[80vh] object-contain select-none"
                  draggable={false}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}