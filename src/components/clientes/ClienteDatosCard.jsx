// src/components/clientes/ClienteDatosCard.jsx
import { motion } from "framer-motion";
import { HiIdentification, HiPhone, HiMail, HiLocationMarker, HiCalendar } from "react-icons/hi";

const ClienteDatosCard = ({ cliente }) => {
  if (!cliente) return null;

  const estadoActivo = cliente.estado === true || cliente.estado === "activo";

  const estadoTone = estadoActivo
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border border-rose-500/20";

  const estadoLabel = estadoActivo ? "Activo" : "Inactivo";

  return (
    <motion.section
      className="rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden"
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
              Información Básica del Cliente
            </p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${estadoTone}`}>
          {estadoLabel}
        </span>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-5">
        
        {/* Identificadores Principales (DNI, Alias, ID) adaptados a celular */}
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

        {/* Grid de datos (Cajas individuales para mejorar lectura en móvil) */}
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
                <span className="text-sm font-bold text-white/20">—</span>
              )}
            </div>
          </div>

          {/* Dirección (Ocupa todo el ancho en celular y tablet) */}
          <div className="flex gap-3 items-start bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <HiLocationMarker className="text-sky-400 text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Dirección y Localidad</span>
              <span className="text-sm font-bold text-white leading-snug">
                {cliente.direccion || "—"}
                {cliente.localidad && (
                  <span className="text-white/40 font-normal ml-1">· {cliente.localidad}</span>
                )}
              </span>
            </div>
          </div>

          {/* Fecha de Nacimiento (Ocupa todo el ancho) */}
          <div className="flex gap-3 items-start bg-black/40 border border-white/5 p-3 sm:p-4 rounded-2xl sm:col-span-2">
            <HiCalendar className="text-sky-400 text-lg shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">Fecha de Nacimiento</span>
              <span className="text-sm font-bold text-white">
                {cliente.fecha_nacimiento || "No registrada"}
              </span>
            </div>
          </div>

        </div>
      </div>
    </motion.section>
  );
};

export default ClienteDatosCard;