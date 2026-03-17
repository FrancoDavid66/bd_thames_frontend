// src/components/solicitudes/FichaEmisionModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HiX, 
  HiClipboardCopy, 
  HiExternalLink, 
  HiCheck, 
  HiOfficeBuilding,
  HiPhotograph,
  HiUser
} from "react-icons/hi";
import toast from "react-hot-toast";
import { Link } from "react-router-dom"; // 🚀 IMPORTAMOS LINK

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// Definimos variants inline para animaciones profesionales
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const fieldVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

const imageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
};

/* ---------- helpers ---------- */
function isImage(doc) {
  return String(doc?.mime || "").startsWith("image");
}
function format(k, v) {
  return `${k}: ${v ?? "—"}`;
}
const estadoLabel = (estado) => {
  switch (estado) {
    case "VIGENTE_24H": return "VIGENTE 24 h";
    case "EN_REVISION": return "EN REVISIÓN";
    case "BORRADOR": return "BORRADOR";
    case "VENCIDA": return "VENCIDA";
    case "CANCELADA": return "CANCELADA";
    case "CONVERTIDA": return "CONVERTIDA";
    default: return estado || "—";
  }
};

function buildResumen(s) {
  const datos = [
    format("Cliente", s?.cliente_nombre),
    format("DNI", s?.cliente_dni),
    format("Teléfono", s?.telefono),
    format("Vehículo", `${s?.vehiculo_marca || "—"} ${s?.vehiculo_modelo || ""}`.trim()),
    format("Año", s?.vehiculo_anio),
    format("Patente", s?.vehiculo_patente),
    format("Cobertura", s?.cobertura_solicitada),
    format("Compañía pref.", s?.compania_preferida),
    format("Observaciones", s?.observaciones || "—"),
    format("Código", s?.codigo || s?.id),
    format("Estado", estadoLabel(s?.estado)),
  ];
  return datos.join("\n");
}

function splitNombreApellido(fullName) {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return { nombre: "", apellido: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { nombre: parts[0], apellido: "" };
  const apellido = parts.pop();
  return { nombre: parts.join(" "), apellido };
}

/* ================== COMPONENTE ================== */
export default function FichaEmisionModal({ solicitud, onClose }) {
  const { user } = useAuth(); // 🚀 Identificamos sucursal del usuario
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const imagenes = useMemo(() => (docs || []).filter(isImage), [docs]);
  const otros = useMemo(() => (docs || []).filter((d) => !isImage(d)), [docs]);

  const { nombre: nombreSolo, apellido: apellidoSolo } = useMemo(
    () => splitNombreApellido(solicitud?.cliente_nombre),
    [solicitud?.cliente_nombre]
  );

  // 🚀 CARGA SEGURA: Usamos 'api' para inyectar JWT y evitar 401
  const cargar = async () => {
    if (!solicitud?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/solicitudes/${solicitud.id}/documentos/`);
      setDocs(res.data?.results || res.data || []);
    } catch (e) {
      console.error("[FichaEmision] Error:", e);
      toast.error("Error al sincronizar documentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [solicitud?.id]);

  const copiarResumen = async () => {
    try {
      await navigator.clipboard.writeText(buildResumen(solicitud));
      toast.success("Resumen copiado para emitir");
    } catch {
      toast.error("Error al copiar portapapeles");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[180] flex items-center justify-center p-4 sm:p-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          variants={modalVariants} initial="initial" animate="animate" exit="exit"
          className="relative w-full max-w-6xl h-[95vh] sm:h-auto mx-auto rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col bg-[#0b0f1e]"
        >
          {/* Header Blindado */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0c28]/90 backdrop-blur">
            <div className="flex flex-col gap-1">
               <h3 className="text-white font-black text-lg uppercase tracking-tighter">
                Ficha Técnica de Emisión
              </h3>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    ID: #{solicitud?.codigo || solicitud?.id}
                 </span>
                 <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/20">
                    Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
                 </span>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
              variants={buttonVariants} whileHover="hover" whileTap="tap"
            >
              <HiX className="text-xl" />
            </motion.button>
          </div>

          {/* Área de Datos */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={sectionVariants} initial="initial" animate="animate">
              {/* Bloque Asegurado */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                   <HiUser className="text-emerald-400" />
                   <h4 className="text-white font-bold text-xs uppercase tracking-widest">Datos del Asegurado</h4>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 🚀 CLIENTE CON ENLACE */}
                  <DataBox 
                    label="Nombre" 
                    value={nombreSolo} 
                    linkTo={solicitud?.cliente_id ? `/clientes/${solicitud.cliente_id}` : null} 
                  />
                  <DataBox 
                    label="Apellido" 
                    value={apellidoSolo} 
                    linkTo={solicitud?.cliente_id ? `/clientes/${solicitud.cliente_id}` : null} 
                  />
                  <DataBox label="DNI/CUIT" value={solicitud?.cliente_dni} />
                  <DataBox label="Teléfono" value={solicitud?.telefono} />
                </dl>
              </section>

              {/* Bloque Vehículo */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                   <HiOfficeBuilding className="text-sky-400" />
                   <h4 className="text-white font-bold text-xs uppercase tracking-widest">Datos de la Unidad</h4>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DataBox label="Marca" value={solicitud?.vehiculo_marca} />
                  <DataBox label="Modelo" value={solicitud?.vehiculo_modelo} />
                  <DataBox label="Año" value={solicitud?.vehiculo_anio} />
                  <DataBox label="Dominio / Patente" value={solicitud?.vehiculo_patente} className="font-mono" />
                </dl>
              </section>
            </motion.div>

            {/* Configuración de Póliza */}
            <motion.section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" variants={sectionVariants}>
              <h4 className="text-white/40 font-black text-[10px] uppercase tracking-widest mb-4">Configuración de Solicitud</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <FieldBox label="Cobertura Solicitada" value={solicitud?.cobertura_solicitada} />
                <FieldBox label="Compañía Preferida" value={solicitud?.compania_preferida} />
                <FieldBox label="Estado Operativo" value={estadoLabel(solicitud?.estado)} />
                <FieldBox label="Referencia Código" value={solicitud?.codigo || solicitud?.id} />
                
                {/* 🚀 PÓLIZA CON ENLACE (SI ESTÁ VINCULADA) */}
                <FieldBox 
                  label="Póliza Vinculada" 
                  value={solicitud?.poliza_id ? `#${solicitud.poliza_id}` : "Ninguna"} 
                  linkTo={solicitud?.poliza_id ? `/polizas/${solicitud.poliza_id}` : null}
                />
              </div>

              {solicitud?.observaciones && (
                <div className="mt-6 p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2">Observaciones Internas</div>
                  <CopyValue text={solicitud.observaciones} />
                </div>
              )}
            </motion.section>

            {/* Inspección Fotográfica */}
            <motion.section className="space-y-4" variants={sectionVariants}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <HiPhotograph className="text-rose-400" />
                  <h4 className="text-white font-bold text-xs uppercase tracking-widest">Evidencia Fotográfica ({imagenes.length})</h4>
                </div>
                {otros.length > 0 && <span className="text-[10px] font-bold text-white/30 uppercase">{otros.length} Docs Adicionales</span>}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagenes.map((d) => (
                    <motion.a
                      key={d.id} href={d.url} target="_blank" rel="noreferrer"
                      className="group relative block aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-lg"
                      variants={fieldVariants} whileHover="hover"
                    >
                      <motion.img src={d.url} alt="" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" variants={imageVariants} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                         <span className="text-[10px] font-black text-white uppercase truncate">{d.nombre || d.tipo}</span>
                      </div>
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-black/60 flex items-center justify-center text-white/60 group-hover:text-white"><HiExternalLink /></div>
                    </motion.a>
                  ))}
                </div>
              )}
            </motion.section>
          </div>

          {/* Footer de Acciones */}
          <div className="p-6 border-t border-white/5 bg-[#0f0c28]/95 flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-center sm:text-left">
                Verificá que toda la documentación sea legible antes de proceder a la emisión definitiva.
             </p>
             <div className="flex gap-3 w-full sm:w-auto">
                <motion.button
                  onClick={copiarResumen}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-black uppercase text-xs shadow-xl transition-all active:scale-95"
                  variants={buttonVariants} whileHover="hover" whileTap="tap"
                >
                  <HiClipboardCopy className="text-lg" /> Copiar Resumen
                </motion.button>
                <button onClick={onClose} className="flex-1 sm:flex-none px-8 py-3 rounded-xl bg-white/5 text-white font-bold uppercase text-xs hover:bg-white/10 transition-all">
                  Cerrar
                </button>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ----------------- Sub-Componentes UI ----------------- */

// 🚀 AHORA ACEPTAN "linkTo" PARA HACERLOS CLICKEABLES
function DataBox({ label, value, className = "", linkTo }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</span>
      <div className={`p-2.5 rounded-xl bg-black/40 border border-white/5 shadow-inner ${className}`}>
         <CopyValue text={value} linkTo={linkTo} />
      </div>
    </div>
  );
}

function FieldBox({ label, value, linkTo }) {
  return (
    <motion.div variants={fieldVariants} className="flex flex-col gap-1">
      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{label}</div>
      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
        <CopyValue text={value} linkTo={linkTo} />
      </div>
    </motion.div>
  );
}

function CopyValue({ text, linkTo }) {
  const [ok, setOk] = useState(false);
  const display = text ?? "—";

  const onCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setOk(true);
      setTimeout(() => setOk(false), 1200);
      toast.success("Copiado");
    } catch { toast.error("Error al copiar"); }
  };

  return (
    <div className="flex items-center justify-between gap-2 group/copy">
      {linkTo ? (
        // 🚀 SI HAY UN LINK, RENDERIZAMOS LA ETIQUETA 'Link' CELESTE
        <Link 
          to={linkTo} 
          target="_blank" 
          rel="noopener noreferrer"
          className="truncate text-xs sm:text-sm font-bold text-sky-400 hover:text-sky-300 hover:underline decoration-sky-400/30 underline-offset-4 transition-all"
        >
          {String(display)}
        </Link>
      ) : (
        <span className="truncate text-xs sm:text-sm font-bold text-white/90">{String(display)}</span>
      )}

      <button
        onClick={onCopy} title="Copiar al portapapeles"
        className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
          ok ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/20 group-hover/copy:bg-white/10 group-hover/copy:text-white/60'
        }`}
      >
        {ok ? <HiCheck className="text-sm" /> : <HiClipboardCopy className="text-sm" />}
      </button>
    </div>
  );
}