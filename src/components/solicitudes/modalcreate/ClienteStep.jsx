// src/components/solicitudes/modalcreate/ClienteStep.jsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { HiIdentification, HiTrash, HiUpload } from "react-icons/hi";

// Definimos variants inline para animaciones profesionales
const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const inputVariants = {
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

const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

/* ===================== UI bits locales ===================== */
function Note({ children }) {
  return <p className="mt-1.5 text-xs sm:text-[13px] text-white/70">{children}</p>;
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  helper = "",
  className = "",
  inputMode,
  autoComplete,
  autoCapitalize,
  pattern,
}) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className}`}
      variants={inputVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
    >
      <span className="block text-white/85 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        pattern={pattern}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 sm:py-2.5 md:py-3 outline-none focus:ring-4 ring-sky-200/30 text-white placeholder:text-white/40 transition"
      />
      {helper ? <span className="mt-1 block text-xs text-white/65">{helper}</span> : null}
    </motion.label>
  );
}
function Textarea({ label, value, onChange, className = "" }) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className}`}
      variants={inputVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
    >
      <span className="block text-white/85 mb-1">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 sm:py-2.5 md:py-3 outline-none focus:ring-4 ring-rose-200/30 text-white placeholder:text-white/40 transition resize-none"
      />
    </motion.label>
  );
}
function RadioPill({ checked, onChange, label }) {
  return (
    <motion.button
      type="button"
      onClick={onChange}
      className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm transition ${
        checked
          ? "bg-gradient-to-br from-violet-200 to-indigo-200 text-[#0b0f1e] border-white/40"
          : "bg-white/5 text-white border-white/10 hover:bg-white/10"
      }`}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      {label}
    </motion.button>
  );
}
function FotoSlot({
  label,
  slot,
  onFile,
  onRemove,
  required,
  accept = "image/*",
  capture = false,
}) {
  const has = !!slot?.url;
  const isPdf =
    slot?.mime === "application/pdf" ||
    (slot?.url || "").toLowerCase().endsWith(".pdf");
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      className="rounded-xl border border-white/10 bg-white/5 p-2 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-white/90 text-xs sm:text-sm">
          {label} {required ? <span className="text-rose-300">*</span> : null}
        </span>
        {has && (
          <motion.button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-rose-200/20 text-rose-100 hover:bg-rose-200/30 transition"
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
          >
            <HiTrash /> Quitar
          </motion.button>
        )}
      </div>

      <div className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
        {has ? (
          isPdf ? (
            <a
              href={slot.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline text-white/90"
              title="Abrir PDF"
            >
              Ver PDF
            </a>
          ) : (
            <img src={slot.url} alt={label} className="w-full h-full object-cover" />
          )
        ) : (
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-br from-violet-200 to-indigo-200 text-[#0b0f1e] font-semibold text-xs sm:text-sm border border-white/20 hover:brightness-105">
            <HiUpload /> Cargar / Sacar
            <input
              type="file"
              accept={accept}
              {...(capture ? { capture: "environment" } : {})}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        )}
      </div>
    </motion.div>
  );
}

/* ===================== Helpers opcionales ===================== */
export function normalizaTelefonoAR(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("15") && d.length >= 10) d = d.slice(2);
  return d;
}
const guessMime = (name = "") =>
  name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg";

/* ===================== Componente ===================== */
/**
 * Paso 1: Cliente (nuevo | existente) + fotos opcionales de DNI.
 *
 * Props (alineadas con CreateSolicitudModal):
 * - clienteModo, setClienteModo
 * - clienteId, setClienteId
 * - cliente, setCliente
 * - dniSlots, setDniSlots
 * - TIPO_DNI_SLOTS: array de { key, label }
 * - onUploadDNI: fn(file, key)
 */
export default function ClienteStep({
  clienteModo,
  setClienteModo,
  clienteId,
  setClienteId,
  cliente,
  setCliente,
  dniSlots,
  setDniSlots,
  TIPO_DNI_SLOTS = [
    { key: "DNI_FRENTE", label: "DNI frente" },
    { key: "DNI_DORSO", label: "DNI dorso" },
  ],
  onUploadDNI,
}) {
  const errors = useMemo(() => {
    const e = {};
    if (clienteModo === "existente") {
      if (!String(clienteId).trim()) e.clienteId = "ID requerido";
      return e;
    }
    if (!cliente?.nombre?.trim()) e.nombre = "Requerido";
    if (!cliente?.apellido?.trim()) e.apellido = "Requerido";
    if (!cliente?.telefono?.trim()) e.telefono = "Requerido";
    return e;
  }, [clienteModo, clienteId, cliente]);

  // 👉 función delegada al padre (CreateSolicitudModal) para subir a Cloudinary
  const handleUploadToSlot = async (file, key) => {
    if (!file) return;
    try {
      await onUploadDNI?.(file, key);
      // Nada de blobs locales ni toasts acá:
      // el padre se encarga de setear dniSlots con la URL final.
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.fieldset
      className="rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
    >
      <legend className="px-1 text-white/85 text-xs sm:text-sm">Cliente</legend>

      {/* Toggle modo (responsive) */}
      <div className="flex flex-wrap gap-2 mb-3">
        <RadioPill
          checked={clienteModo === "nuevo"}
          onChange={() => setClienteModo("nuevo")}
          label="Nuevo"
        />
        <RadioPill
          checked={clienteModo === "existente"}
          onChange={() => setClienteModo("existente")}
          label="Existente"
        />
      </div>

      {clienteModo === "existente" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label={`ID de cliente ${errors.clienteId ? "— (requerido)" : ""}`}
            value={clienteId}
            onChange={setClienteId}
            inputMode="numeric"
            placeholder="Ej: 123"
          />
          <div className="md:col-span-2">
            <Note>Ingresá el ID del cliente existente.</Note>
          </div>
        </div>
      ) : (
        <>
          {/* Form responsive: 1 col en mobile, 2 col en sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={`Nombre ${errors.nombre ? "— (requerido)" : ""}`}
              value={cliente.nombre}
              onChange={(v) => setCliente((s) => ({ ...s, nombre: v }))}
              autoCapitalize="words"
              autoComplete="given-name"
            />
            <Input
              label={`Apellido ${errors.apellido ? "— (requerido)" : ""}`}
              value={cliente.apellido}
              onChange={(v) => setCliente((s) => ({ ...s, apellido: v }))}
              autoCapitalize="words"
              autoComplete="family-name"
            />
            <Input
              label={`Teléfono (WhatsApp) ${errors.telefono ? "— (requerido)" : ""}`}
              value={cliente.telefono}
              onChange={(v) => setCliente((s) => ({ ...s, telefono: v }))}
              helper="Sin +54, sin 0 y sin 15. Ej: 1166709006"
              inputMode="tel"
              autoComplete="tel"
            />
            <Input
              label="Email"
              type="email"
              value={cliente.email}
              onChange={(v) => setCliente((s) => ({ ...s, email: v }))}
              autoComplete="email"
            />
            <Input
              label="DNI / CUIT / CUIL"
              value={cliente.dni_cuit_cuil}
              onChange={(v) => setCliente((s) => ({ ...s, dni_cuit_cuil: v }))}
              inputMode="numeric"
            />
            <Input
              label="Localidad"
              value={cliente.localidad}
              onChange={(v) => setCliente((s) => ({ ...s, localidad: v }))}
              autoComplete="address-level2"
            />
            <Textarea
              className="sm:col-span-2"
              label="Dirección"
              value={cliente.direccion}
              onChange={(v) => setCliente((s) => ({ ...s, direccion: v }))}
            />
          </div>

          {/* DNI – grid adaptable con targets grandes táctiles */}
          <div className="mt-3 sm:mt-4 rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4">
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <HiIdentification />
              <span className="text-xs sm:text-sm">Documentación (DNI)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TIPO_DNI_SLOTS.map(({ key, label }) => (
                <FotoSlot
                  key={key}
                  label={label}
                  slot={dniSlots?.[key]}
                  accept="image/*"
                  capture={true}
                  onFile={(file) => handleUploadToSlot(file, key)}
                  onRemove={() =>
                    setDniSlots((s) => ({
                      ...s,
                      [key]: null,
                    }))
                  }
                />
              ))}
            </div>
            <Note>Las fotos del DNI se guardan en el perfil del cliente (opcional).</Note>
          </div>
        </>
      )}
    </motion.fieldset>
  );
}

/* ===================== Validación externa opcional ===================== */
export function clienteStepHasErrors(modo, clienteId, cliente) {
  const e = {};
  if (modo === "existente") {
    if (!String(clienteId).trim()) e.clienteId = "ID requerido";
    return e;
  }
  if (!cliente?.nombre?.trim()) e.nombre = "Requerido";
  if (!cliente?.apellido?.trim()) e.apellido = "Requerido";
  if (!cliente?.telefono?.trim()) e.telefono = "Requerido";
  return e;
}