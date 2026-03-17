// src/components/solicitudes/SolicitudCard.jsx
import {
  HiDocumentText,
  HiClock,
  HiDocumentDownload,
  HiTrash,
  HiChatAlt2,
  HiPhone,
  HiClipboardList,
  HiPrinter,
  HiUserAdd,
  HiRefresh,
  HiUserCircle,
  HiChevronDown,
  HiLink,
  HiBadgeCheck,
  HiBan,
  HiOfficeBuilding,
} from "react-icons/hi";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom"; // 🚀 IMPORTAMOS LINK PARA LA NAVEGACIÓN

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { generateSolicitudPDF } from "../../utils/solicitudPdf";
import { solicitudesApi } from "../../services/solicitudes";

/* ===================== Variants ===================== */
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  hover: { scale: 1.01, transition: { duration: 0.2 } },
};

const expandVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: "auto", opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
};

/* --------- Helpers de Estilo ---------- */
const cardClassesByStatus = ({ asignada, terminada }) => {
  if (terminada) return "bg-emerald-500/5 border-emerald-500/20";
  if (asignada) return "bg-sky-500/5 border-sky-500/20";
  return "bg-white/[0.03] border-white/10";
};

const badgeFor = ({ asignada, terminada }) => {
  if (terminada) return { label: "TERMINADA", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  if (asignada) return { label: "EN GESTIÓN", cls: "bg-sky-500/20 text-sky-300 border-sky-500/30" };
  return null;
};

// 🚀 MODIFICADO: Acepta las props `as` y `href` para funcionar como Link
function SmallBadge({ tone = "neutral", children, title, as, to }) {
  const tones = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20",
    info: "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20",
    neutral: "bg-white/5 text-white/50 border-white/10 hover:bg-white/10",
  };
  
  const baseClasses = `text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded border inline-flex items-center gap-1 transition-colors ${tones[tone]}`;

  if (as === "Link" && to) {
    return (
      <Link to={to} target="_blank" rel="noopener noreferrer" className={baseClasses} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <span className={baseClasses} title={title}>
      {children}
    </span>
  );
}

/* --------- WhatsApp Logic ---------- */
function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/[^\d]/g, "");
  if (digits.startsWith("54")) return digits;
  return `54${digits.replace(/^0+/, "")}`;
}
function buildPublicLink(s) {
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, "");
  return s?.id ? `${base}/public/solicitudes/${s.id}/verificar/` : base;
}
function buildWhatsAppUrl(s) {
  const num = normalizePhone(s?.telefono);
  if (!num) return "";
  const link = buildPublicLink(s);
  const texto = `Hola ${s?.cliente_nombre || ""}, te envío tu solicitud #${s?.codigo || s?.id}. Verificá acá: ${link}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/* -------- Dropdown Responsables ---------- */
function ResponsableSelect({ empleados, value, onChange, disabled, placeholder = "Elegir responsable…", loading = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const items = Array.isArray(empleados) ? empleados : [];
  const selected = items.find((e) => String(e.id) === String(value));

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <motion.button
        type="button" disabled={disabled || loading} onClick={() => setOpen(!open)}
        className="w-full h-10 text-left flex items-center justify-between gap-2 px-3 rounded-xl border bg-black/40 border-white/10 text-white text-xs font-bold transition-all disabled:opacity-30"
        variants={buttonVariants} whileHover="hover" whileTap="tap"
      >
        <span className="truncate">{loading ? "Cargando..." : selected?.nombre || placeholder}</span>
        <HiChevronDown className={`transition ${open ? "rotate-180" : ""}`} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div className="absolute z-50 mt-2 w-full max-h-48 overflow-auto rounded-xl border border-white/10 bg-[#0f1324] shadow-2xl divide-y divide-white/5" variants={dropdownVariants} initial="hidden" animate="visible" exit="hidden">
            {items.map((emp) => (
              <button key={emp.id} onClick={() => { onChange(String(emp.id)); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:bg-white/5 hover:text-white transition-colors uppercase font-bold">
                {emp.nombre}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- SolicitudCard Principal ---------------- */
export default function SolicitudCard({
  s,
  onEmitir,
  onComprobante,
  onDocs,
  onFicha,
  onEliminar,
  onImprimir,
  onRefrescar,
  onAsociar,
  onTerminar,
}) {
  const { user } = useAuth(); // 🚀 Obtenemos el perfil y rol
  const [expanded, setExpanded] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSel, setEmpSel] = useState("");

  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  useEffect(() => {
    (async () => {
      setEmpLoading(true);
      try {
        const res = await api.get('/usuarios/empleados_activos/');
        setEmpleados(res.data?.results || res.data || []);
      } catch (e) { console.error("Error cargando empleados"); }
      finally { setEmpLoading(false); }
    })();
  }, []);

  const canEmitir = s?.estado === "EN_REVISION" || s?.estado === "BORRADOR";
  const canComprobante = s?.estado === "VIGENTE_24H";
  // 🛡️ Solo admin borra o cancela
  const canEliminar = isWebAdmin && ["BORRADOR", "TERMINADA", "CANCELADA"].includes(s.estado);

  const empleadoActualNombre = s?.responsable || s?.responsable_empleado_nombre || "";
  const isAsignada = Boolean(empleadoActualNombre);
  const isTerminada = s?.estado === "TERMINADA";
  
  const handleTomar = async () => {
    if (!empSel) return toast.error("Seleccioná un responsable");
    try {
      await api.post(`/solicitudes/${s.id}/tomar/`, { empleado_id: Number(empSel) });
      toast.success("Solicitud asignada");
      onRefrescar?.();
    } catch (e) { toast.error("Error al asignar"); }
  };

  const handleReasignar = async () => {
    if (!isWebAdmin) return toast.error("Solo administradores reasignan");
    if (!empSel) return toast.error("Seleccioná nuevo responsable");
    try {
      await api.post(`/solicitudes/${s.id}/reasignar/`, { empleado_id: Number(empSel) });
      toast.success("Solicitud reasignada");
      onRefrescar?.();
    } catch (e) { toast.error("Error al reasignar"); }
  };

  const cambiarEstado = async (nuevo) => {
    try {
      if (nuevo === "TERMINADA") {
        await (onTerminar ? onTerminar(s) : api.post(`/solicitudes/${s.id}/terminar/`));
      } else {
        await api.patch(`/solicitudes/${s.id}/`, { estado: nuevo });
      }
      toast.success("Estado actualizado");
      onRefrescar?.();
    } catch (e) { toast.error("Error al actualizar estado"); }
  };

  return (
    <motion.div
      className={`rounded-2xl border p-4 transition-all duration-300 ${cardClassesByStatus({ asignada: isAsignada, terminada: isTerminada })}`}
      variants={cardVariants} initial="initial" animate="animate"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/* 🚀 CLIENTE LINK */}
            {s?.cliente_id ? (
              <Link 
                to={`/clientes/${s.cliente_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white font-black text-sm sm:text-base truncate uppercase tracking-tight hover:text-sky-400 hover:underline decoration-sky-400/30 underline-offset-4 transition-all"
                title="Ver perfil del cliente"
              >
                {s?.cliente_nombre || "Sin Nombre"}
              </Link>
            ) : (
              <span className="text-white font-black text-sm sm:text-base truncate uppercase tracking-tight">
                {s?.cliente_nombre || "Sin Nombre"}
              </span>
            )}
            <span className="text-[9px] font-black bg-white/10 px-1.5 py-0.5 rounded text-white/40 uppercase">#{s?.codigo || s?.id}</span>
          </div>
          
          <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span>{s?.vehiculo_marca} {s?.vehiculo_modelo}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-white/60 font-mono">{s?.vehiculo_patente}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* 🚀 BADGES LINK (Hacia cliente y póliza) */}
            {s?.cliente_id ? (
              <SmallBadge as="Link" to={`/clientes/${s.cliente_id}`} tone={s?.cliente_estado === "COMPLETO" ? "success" : "warning"}>
                Cliente: {s?.cliente_estado || "Borrador"}
              </SmallBadge>
            ) : (
              <SmallBadge tone={s?.cliente_estado === "COMPLETO" ? "success" : "warning"}>
                Cliente: {s?.cliente_estado || "Borrador"}
              </SmallBadge>
            )}

            {s?.poliza_id ? (
              <SmallBadge as="Link" to={`/polizas/${s.poliza_id}`} tone="success">
                Póliza: Definitiva
              </SmallBadge>
            ) : (
              <SmallBadge tone="info">
                Póliza: Preliminar
              </SmallBadge>
            )}
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-2">
          {badgeFor({ asignada: isAsignada, terminada: isTerminada }) && (
            <span className={`text-[9px] font-black px-2 py-1 rounded border ${badgeFor({ asignada: isAsignada, terminada: isTerminada }).cls}`}>
              {badgeFor({ asignada: isAsignada, terminada: isTerminada }).label}
            </span>
          )}
          <span className="text-[10px] font-bold text-white/30 flex items-center gap-1 uppercase">
            <HiUserCircle /> {empleadoActualNombre || "Sin asignar"}
          </span>
        </div>

        <motion.button onClick={() => setExpanded(!expanded)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white" variants={buttonVariants} whileHover="hover" whileTap="tap">
          <HiChevronDown className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </motion.button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div variants={expandVariants} initial="collapsed" animate="expanded" exit="collapsed" className="overflow-hidden">
            <div className="mt-4 pt-4 border-t border-white/5">
              
              {/* Info Mobile */}
              <div className="flex sm:hidden justify-between items-center mb-4">
                 <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><HiPhone /> {s?.telefono || 'N/A'}</div>
                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{empleadoActualNombre || "SIN ASIGNAR"}</span>
              </div>

              {/* Grid de Acciones */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <Btn onClick={() => onDocs?.(s)} icon={HiDocumentText}>Documentos</Btn>
                <Btn onClick={() => generateSolicitudPDF(s)} icon={HiPrinter}>Imprimir</Btn>
                <Btn onClick={() => onEmitir?.(s)} disabled={!canEmitir} icon={HiClock}>Emitir 12h</Btn>
                <Btn onClick={() => onComprobante?.(s)} disabled={!canComprobante} icon={HiDocumentDownload}>Comprobante</Btn>
                <Btn onClick={() => onFicha?.(s)} icon={HiClipboardList}>Ver Ficha</Btn>
                <Btn as="a" href={buildWhatsAppUrl(s)} disabled={!s?.telefono} icon={HiChatAlt2} tone="info">WhatsApp</Btn>
                <Btn onClick={() => onAsociar?.(s)} icon={HiLink}>Vincular</Btn>
                
                {/* 🛡️ ELIMINAR Y CANCELAR: Solo Admins */}
                {isWebAdmin && (
                  <>
                    <Btn onClick={() => cambiarEstado("CANCELADA")} tone="danger" icon={HiBan} disabled={isTerminada}>Cancelar</Btn>
                    <Btn onClick={() => onEliminar?.(s)} tone="danger" icon={HiTrash} disabled={!canEliminar}>Eliminar</Btn>
                  </>
                )}
              </div>

              {/* Gestión de Responsable */}
              <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-center gap-3">
                 <div className="flex-1 w-full">
                    <ResponsableSelect empleados={empleados} value={empSel} onChange={setEmpSel} loading={empLoading} />
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                    {!isAsignada ? (
                      <button onClick={handleTomar} disabled={!empSel} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-30">Asignar</button>
                    ) : (
                      isWebAdmin && <button onClick={handleReasignar} disabled={!empSel} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-sky-600 text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-30">Reasignar</button>
                    )}
                 </div>
              </div>

              {/* Footer de Tarjeta */}
              <div className="mt-4 flex items-center justify-between px-1">
                 <div className="flex items-center gap-1.5 text-[9px] font-black text-white/20 uppercase tracking-widest">
                    <HiOfficeBuilding /> Sucursal: {s?.oficina_nombre || 'Local'}
                 </div>
                 <button onClick={() => cambiarEstado("TERMINADA")} disabled={isTerminada} className="flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 disabled:opacity-30">
                    <HiBadgeCheck className="text-lg" /> {isTerminada ? 'Gestión Finalizada' : 'Finalizar Gestión'}
                 </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Btn({ children, onClick, disabled, tone = "default", icon: Icon, as, href, className = "" }) {
  const tones = {
    default: "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
    danger: "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20",
    info: "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20",
  };
  
  const baseCls = `inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-20 disabled:cursor-not-allowed ${tones[tone]} ${className}`;

  if (as === "a") {
    return (
      <a href={disabled ? undefined : href} target="_blank" rel="noreferrer" className={baseCls}>
        {Icon && <Icon className="text-sm" />} {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={baseCls}>
      {Icon && <Icon className="text-sm" />} {children}
    </button>
  );
}