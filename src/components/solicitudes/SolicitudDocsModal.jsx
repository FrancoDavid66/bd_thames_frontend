// src/components/solicitudes/SolicitudDocsModal.jsx
// Wizard: Imágenes & Docs de Solicitud
// Política vigente:
// - Fotos del vehículo: igual que antes (PATENTE y ENTORNO obligatorias).
// - Documentos del vehículo: SOLO Registro de conducir (con vencimiento) y Cédula (verde).
// - Eliminado todo rastro de VTV / OBLEA GNC / Título / Seguro anterior.
// - Subida: un archivo por vez (cada slot te lo pide explícitamente).

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiUpload, HiCalendar, HiLockClosed, HiShieldCheck } from "react-icons/hi";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";

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

const slotVariants = {
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

// Helpers mínimos
const cn = (...s) => s.filter(Boolean).join(" ");
const fmtDMY = (d) => {
  if (!d) return "";
  const [y, m, day] = String(d).split("-"); // YYYY-MM-DD
  if (!y || !m || !day) return "";
  return `${day}/${m}/${y}`;
};
const toISO = (dmy) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy || "");
  if (!m) return "";
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime()) ? "" : iso;
};

// Un slot “pide” UN archivo
function FileSlot({
  label,
  help,
  value,
  onChange,
  accept = "image/*",
  required = false,
  disabled = false,
  id,
}) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4",
        required && "ring-1 ring-amber-300/20"
      )}
      variants={slotVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm sm:text-base font-medium">{label}</span>
        {required && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-200 border border-amber-400/30 uppercase font-bold tracking-tighter">
            Obligatoria
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <label
          htmlFor={id}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm sm:text-base cursor-pointer transition-colors",
            disabled ? "opacity-60 pointer-events-none" : "hover:bg-white/20"
          )}
          title={`Elegir archivo para ${label}`}
        >
          <HiUpload />
          {value ? "Cambiar archivo" : "Elegir archivo"}
        </label>

        <button
          type="button"
          className={cn(
            "text-xs sm:text-sm rounded-md border border-white/10 px-2 py-1 transition-colors",
            !value ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"
          )}
          disabled={!value}
          onClick={() => onChange(null)}
          title="Quitar archivo"
        >
          Quitar
        </button>

        {value && (
          <span className="text-xs sm:text-sm opacity-80 truncate max-w-[200px] sm:max-w-[260px]">
            {value.name}
          </span>
        )}
      </div>

      {help && <p className="mt-2 text-xs sm:text-sm opacity-70 italic">{help}</p>}
    </motion.div>
  );
}

export default function SolicitudDocsModal({
  open,
  onClose,
  onConfirm,
  initial = {},
}) {
  const { user } = useAuth(); // 🚀 Obtenemos usuario
  
  // ----- Estado de cada slot (un archivo por vez) -----
  const [PATENTE, setPATENTE] = useState(null);
  const [ENTORNO, setENTORNO] = useState(null);
  const [FRENTE, setFRENTE] = useState(null);
  const [LATERAL_IZQ, setLATERAL_IZQ] = useState(null);
  const [LATERAL_DER, setLATERAL_DER] = useState(null);
  const [TRASERA, setTRASERA] = useState(null);
  const [VIN, setVIN] = useState(null);

  // Documentos vigentes
  const [REGISTRO, setREGISTRO] = useState(null);
  const [REGISTRO_VTO_DMY, setREGISTRO_VTO_DMY] = useState("");
  const [CEDULA_VERDE, setCEDULA_VERDE] = useState(null);

  // Prefill (si abren para editar)
  useEffect(() => {
    if (!open) return;
    setPATENTE(initial.PATENTE || null);
    setENTORNO(initial.ENTORNO || null);
    setFRENTE(initial.FRENTE || null);
    setLATERAL_IZQ(initial.LATERAL_IZQ || null);
    setLATERAL_DER(initial.LATERAL_DER || null);
    setTRASERA(initial.TRASERA || null);
    setVIN(initial.VIN || null);
    setREGISTRO(initial.REGISTRO || null);
    setCEDULA_VERDE(initial.CEDULA_VERDE || null);

    const vtoIso = initial.REGISTRO_vencimiento || "";
    setREGISTRO_VTO_DMY(
      vtoIso && /^\d{4}-\d{2}-\d{2}$/.test(vtoIso) ? fmtDMY(vtoIso) : (initial.REGISTRO_vto_dmy || "")
    );
  }, [open, initial]);

  const puedeConfirmar = useMemo(() => {
    if (!PATENTE || !ENTORNO) return false;
    if (REGISTRO && !toISO(REGISTRO_VTO_DMY)) return false;
    return true;
  }, [PATENTE, ENTORNO, REGISTRO, REGISTRO_VTO_DMY]);

  const handleConfirm = () => {
    const fotos = {};
    const put = (key, file, extras = {}) => {
      if (!file) return;
      fotos[key] = { file, ...extras };
    };

    put("PATENTE", PATENTE);
    put("ENTORNO", ENTORNO);
    put("FRENTE", FRENTE);
    put("LATERAL_IZQ", LATERAL_IZQ);
    put("LATERAL_DER", LATERAL_DER);
    put("TRASERA", TRASERA);
    put("VIN", VIN);

    put("REGISTRO", REGISTRO, { vencimiento: toISO(REGISTRO_VTO_DMY) || null });
    put("CEDULA_VERDE", CEDULA_VERDE);

    onConfirm?.(fotos);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal */}
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full max-w-md sm:max-w-4xl mx-auto rounded-3xl border border-white/10 bg-[#0b0f1e] p-4 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
        >
          {/* Header Blindado */}
          <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-white/5 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter">Wizard de Onboarding</span>
                <HiShieldCheck className="text-emerald-400 text-xl" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">Imágenes &amp; Documentación</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/20">
                  Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
                </span>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 transition-all hover:bg-white/10 text-white/50 hover:text-white"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <HiX className="w-6 h-6" />
            </motion.button>
          </div>

          {/* FOTOS del vehículo */}
          <motion.section className="mb-8" variants={sectionVariants} initial="initial" animate="animate">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <HiLockClosed className="text-amber-300 text-lg" />
              </div>
              <h3 className="text-sm sm:text-lg font-bold text-white uppercase tracking-tight">Inspección Fotográfica (Vehículo)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FileSlot id="slot-patente" label="Patente" required value={PATENTE} onChange={setPATENTE} />
              <FileSlot id="slot-entorno" label="Entorno General" required value={ENTORNO} onChange={setENTORNO} />
              <FileSlot id="slot-frente" label="Vista de Frente" value={FRENTE} onChange={setFRENTE} />
              <FileSlot id="slot-lizq" label="Lateral Izquierdo" value={LATERAL_IZQ} onChange={setLATERAL_IZQ} />
              <FileSlot id="slot-lder" label="Lateral Derecho" value={LATERAL_DER} onChange={setLATERAL_DER} />
              <FileSlot id="slot-trasera" label="Vista Trasera" value={TRASERA} onChange={setTRASERA} />
              <FileSlot id="slot-vin" label="VIN / Chasis" value={VIN} onChange={setVIN} />
            </div>

            <p className="mt-3 text-[10px] text-white/30 uppercase tracking-widest font-black ml-1">
              * Los archivos de patente y entorno son requisitos críticos para la aprobación.
            </p>
          </motion.section>

          {/* DOCUMENTOS del vehículo */}
          <motion.section className="mb-8" variants={sectionVariants} initial="initial" animate="animate">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-xl bg-sky-400/10 border border-sky-400/20">
                <HiShieldCheck className="text-sky-300 text-lg" />
              </div>
              <h3 className="text-sm sm:text-lg font-bold text-white uppercase tracking-tight">Documentación de Respaldo</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FileSlot
                  id="slot-registro"
                  label="Licencia de Conducir"
                  value={REGISTRO}
                  onChange={setREGISTRO}
                  accept=".jpg,.jpeg,.png,.pdf"
                  help="Obligatorio si se adjunta la licencia."
                />
                <FileSlot
                  id="slot-cedula-verde"
                  label="Cédula Verde"
                  value={CEDULA_VERDE}
                  onChange={setCEDULA_VERDE}
                  accept=".jpg,.jpeg,.png,.pdf"
                />
              </div>

              {/* Vencimiento Registro */}
              <motion.div
                className="rounded-xl border border-white/10 bg-black/40 p-4 shadow-inner"
                variants={slotVariants}
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 mb-3">
                  <HiCalendar className="text-sky-400 text-lg" />
                  Vencimiento de Licencia
                </label>
                <div className="relative">
                  <input
                    placeholder="dd/mm/aaaa"
                    value={REGISTRO_VTO_DMY}
                    onChange={(e) => {
                      const raw = (e.target.value || "").replace(/\D/g, "").slice(0, 8);
                      const dd = raw.slice(0, 2);
                      const mm = raw.slice(2, 4);
                      const yyyy = raw.slice(4, 8);
                      setREGISTRO_VTO_DMY([dd, mm, yyyy].filter(Boolean).join("/"));
                    }}
                    className="w-full bg-white/5 text-white font-bold text-sm border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-sky-500/50 transition-all"
                  />
                </div>
                <p className="mt-3 text-[9px] text-white/30 italic">
                  Requerido para el cálculo de vigencia.
                </p>
              </motion.div>
            </div>
          </motion.section>

          {/* Footer de Acciones */}
          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <motion.button
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl border border-white/10 text-white/60 font-bold uppercase text-xs transition-all hover:bg-white/5 hover:text-white"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Cancelar Proceso
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              disabled={!puedeConfirmar}
              className={cn(
                "w-full sm:w-auto px-12 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl",
                puedeConfirmar
                  ? "bg-emerald-500 text-neutral-900 shadow-emerald-500/20 hover:scale-105 active:scale-95"
                  : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
              )}
              variants={buttonVariants}
              whileHover={puedeConfirmar ? "hover" : "initial"}
              whileTap={puedeConfirmar ? "tap" : "initial"}
            >
              Confirmar &amp; Siguiente
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}