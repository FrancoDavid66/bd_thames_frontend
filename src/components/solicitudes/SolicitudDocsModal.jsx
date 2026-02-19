// src/components/solicitudes/SolicitudDocsModal.jsx
// Wizard: Imágenes & Docs de Solicitud
// Política vigente:
// - Fotos del vehículo: igual que antes (PATENTE y ENTORNO obligatorias).
// - Documentos del vehículo: SOLO Registro de conducir (con vencimiento) y Cédula (verde).
// - Eliminado todo rastro de VTV / OBLEA GNC / Título / Seguro anterior.
// - Subida: un archivo por vez (cada slot te lo pide explícitamente).

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiUpload, HiCalendar, HiLockClosed } from "react-icons/hi";

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
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-200 border border-amber-400/30">
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
          <span className="text-xs sm:text-sm opacity-80 truncate max-w-[200px] sm:max-w-[260px]">{value.name}</span>
        )}
      </div>

      {help && <p className="mt-2 text-xs sm:text-sm opacity-70">{help}</p>}
    </motion.div>
  );
}

export default function SolicitudDocsModal({
  open,
  onClose,
  onConfirm,
  initial = {},
}) {
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

    // Acepto tanto ISO como dd/mm/aaaa
    const vtoIso = initial.REGISTRO_vencimiento || "";
    setREGISTRO_VTO_DMY(
      vtoIso && /^\d{4}-\d{2}-\d{2}$/.test(vtoIso) ? fmtDMY(vtoIso) : (initial.REGISTRO_vto_dmy || "")
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const puedeConfirmar = useMemo(() => {
    // Fotos obligatorias
    if (!PATENTE || !ENTORNO) return false;
    // Si cargaron REGISTRO, debemos tener vencimiento
    if (REGISTRO && !toISO(REGISTRO_VTO_DMY)) return false;
    return true;
  }, [PATENTE, ENTORNO, REGISTRO, REGISTRO_VTO_DMY]);

  const handleConfirm = () => {
    // Construimos el payload que espera el endpoint crear-completo (serializer)
    const fotos = {};
    const put = (key, file, extras = {}) => {
      if (!file) return;
      fotos[key] = { file, ...extras }; // el padre se encarga de subir (Cloudinary) y mapear a url/public_id
    };

    // FOTOS vehículo
    put("PATENTE", PATENTE);
    put("ENTORNO", ENTORNO);
    put("FRENTE", FRENTE);
    put("LATERAL_IZQ", LATERAL_IZQ);
    put("LATERAL_DER", LATERAL_DER);
    put("TRASERA", TRASERA);
    put("VIN", VIN);

    // DOCUMENTOS vigentes
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
          className="absolute inset-0 bg-black/60"
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
          className="relative w-full max-w-md sm:max-w-4xl mx-auto rounded-2xl border border-white/10 bg-[#1b1630] p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-semibold">Nueva solicitud (wizard)</span>
              <span className="text-xs sm:text-sm opacity-80">· Imágenes &amp; Docs</span>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 rounded-lg border border-white/10 transition-colors hover:bg-white/10"
              title="Cerrar"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <HiX className="w-5 h-5" />
            </motion.button>
          </div>

          {/* FOTOS del vehículo */}
          <motion.section className="mb-5 sm:mb-6" variants={sectionVariants} initial="initial" animate="animate">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <HiLockClosed className="text-amber-300" />
              <h3 className="text-sm sm:text-base font-semibold">Fotos del vehículo (partes)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <FileSlot
                id="slot-patente"
                label="Patente (obligatoria) *"
                required
                value={PATENTE}
                onChange={setPATENTE}
              />
              <FileSlot
                id="slot-entorno"
                label="Entorno (obligatoria) *"
                required
                value={ENTORNO}
                onChange={setENTORNO}
              />
              <FileSlot id="slot-frente" label="Frente" value={FRENTE} onChange={setFRENTE} />
              <FileSlot id="slot-lizq" label="Lateral izq." value={LATERAL_IZQ} onChange={setLATERAL_IZQ} />
              <FileSlot id="slot-lder" label="Lateral der." value={LATERAL_DER} onChange={setLATERAL_DER} />
              <FileSlot id="slot-trasera" label="Trasera" value={TRASERA} onChange={setTRASERA} />
              <FileSlot id="slot-vin" label="VIN / chasis" value={VIN} onChange={setVIN} />
            </div>

            <p className="mt-2 text-xs sm:text-sm opacity-70">
              Las fotos obligatorias son <b>Patente</b> y <b>Entorno</b>.
            </p>
          </motion.section>

          {/* DOCUMENTOS del vehículo (vigentes) */}
          <motion.section className="mb-5 sm:mb-6" variants={sectionVariants} initial="initial" animate="animate">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <HiLockClosed className="text-amber-300" />
              <h3 className="text-sm sm:text-base font-semibold">Documentos del vehículo</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FileSlot
                  id="slot-registro"
                  label="Registro de conducir"
                  value={REGISTRO}
                  onChange={setREGISTRO}
                  accept=".jpg,.jpeg,.png,.pdf"
                  help="Adjuntá una foto o PDF del registro. Si lo cargás, es obligatorio indicar su vencimiento."
                />
                <FileSlot
                  id="slot-cedula-verde"
                  label="Cédula verde"
                  value={CEDULA_VERDE}
                  onChange={setCEDULA_VERDE}
                  accept=".jpg,.jpeg,.png,.pdf"
                />
              </div>

              {/* Vencimiento SOLO para REGISTRO */}
              <motion.div
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4"
                variants={slotVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
              >
                <label className="text-sm sm:text-base font-medium flex items-center gap-2 mb-2">
                  <HiCalendar className="opacity-80" />
                  Vencimiento Registro de conducir
                </label>
                <div className="flex items-center gap-2">
                  <input
                    placeholder="dd/mm/aaaa"
                    value={REGISTRO_VTO_DMY}
                    onChange={(e) => {
                      // máscara simple dd/mm/aaaa solo dígitos
                      const raw = (e.target.value || "").replace(/\D/g, "").slice(0, 8);
                      const dd = raw.slice(0, 2);
                      const mm = raw.slice(2, 4);
                      const yyyy = raw.slice(4, 8);
                      const out = [dd, mm, yyyy].filter(Boolean).join("/");
                      setREGISTRO_VTO_DMY(out);
                    }}
                    className="w-full bg-transparent text-sm sm:text-base border border-white/10 rounded-lg px-3 py-2"
                  />
                </div>
                <p className="mt-2 text-xs sm:text-sm opacity-70">
                  Solo requerido si adjuntás el Registro.
                </p>
              </motion.div>
            </div>
          </motion.section>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <motion.button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 sm:py-3 rounded-xl border border-white/10 transition-colors hover:bg-white/10"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Cancelar
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              disabled={!puedeConfirmar}
              className={cn(
                "w-full sm:w-auto px-4 py-2 sm:py-3 rounded-xl font-semibold transition",
                puedeConfirmar
                  ? "bg-amber-500/90 hover:bg-amber-500 text-neutral-900"
                  : "bg-white/10 opacity-60 cursor-not-allowed"
              )}
              title={!puedeConfirmar ? "Completá lo obligatorio" : "Siguiente"}
              variants={buttonVariants}
              whileHover={puedeConfirmar ? "hover" : "initial"}
              whileTap={puedeConfirmar ? "tap" : "initial"}
            >
              Siguiente
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}