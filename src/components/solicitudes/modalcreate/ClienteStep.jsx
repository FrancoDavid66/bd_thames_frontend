// src/components/solicitudes/modalcreate/ClienteStep.jsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { HiIdentification, HiTrash, HiUpload, HiLocationMarker, HiUser } from "react-icons/hi";
import { useAuth } from "../../../context/AuthContext";

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

/* ===================== UI bits locales ===================== */
function Note({ children }) {
  return <p className="mt-1.5 text-xs sm:text-[13px] text-white/50 italic font-medium">{children}</p>;
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
  required = false
}) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
    >
      <span className="block text-white/80 font-bold uppercase text-[10px] tracking-widest ml-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        pattern={pattern}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 sm:py-3 outline-none focus:ring-2 ring-sky-500/40 text-white placeholder:text-white/20 transition-all shadow-inner"
      />
      {helper ? <span className="mt-1 block text-[10px] text-white/40 font-medium">{helper}</span> : null}
    </motion.label>
  );
}

function Textarea({ label, value, onChange, placeholder = "", className = "" }) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants}
      initial="initial"
      animate="animate"
    >
      <span className="block text-white/80 font-bold uppercase text-[10px] tracking-widest ml-1">
        {label}
      </span>
      <textarea
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 ring-sky-500/40 text-white placeholder:text-white/20 transition-all resize-none shadow-inner"
      />
    </motion.label>
  );
}

function RadioPill({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        checked
          ? "bg-violet-500 text-white shadow-lg shadow-violet-900/40"
          : "text-white/50 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function FotoSlot({ label, slot, accept, capture, onFile, onRemove }) {
  const isPdf = slot?.mime === "application/pdf" || String(slot?.url || "").toLowerCase().endsWith(".pdf");
  return (
    <motion.div
      variants={inputVariants}
      initial="initial"
      animate="animate"
      className="group relative rounded-xl bg-black/30 border border-white/10 overflow-hidden h-32 flex items-center justify-center hover:border-violet-400/40 transition-all"
    >
      <span className="absolute top-1.5 left-2 z-10 text-[9px] uppercase font-black tracking-widest text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
        {label}
      </span>
      {slot?.url && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 z-10 p-1 rounded-lg bg-rose-500/80 hover:bg-rose-400 text-white opacity-0 group-hover:opacity-100 transition-all"
        >
          <HiTrash className="text-xs" />
        </button>
      )}
      {slot?.url ? (
        isPdf ? (
          <a
            href={slot.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-sky-400 underline decoration-sky-400/30 underline-offset-4"
            title="Abrir PDF"
          >
            Ver Documento PDF
          </a>
        ) : (
          <img src={slot.url} alt={label} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
        )
      ) : (
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/80 font-bold text-xs border border-white/10 hover:bg-white/10 hover:border-violet-400/50 transition-all active:scale-95">
          <HiUpload className="text-violet-400" /> Adjuntar
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
    </motion.div>
  );
}

/* ===================== Helpers ===================== */
export function normalizaTelefonoAR(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("15") && d.length >= 10) d = d.slice(2);
  return d;
}

/* ===================== Componente Principal ===================== */
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
  const { user } = useAuth();

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

  const handleUploadToSlot = async (file, key) => {
    if (!file) return;
    try {
      await onUploadDNI?.(file, key);
    } catch (e) {
      console.error("[ClienteStep] Error uploading:", e);
    }
  };

  return (
    <motion.fieldset
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-2xl backdrop-blur-sm"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
               <HiUser className="text-xl" />
            </div>
            <div>
              <legend className="text-white font-bold text-lg leading-none">Perfil del Asegurado</legend>
              <div className="flex items-center gap-1.5 mt-1">
                 <HiLocationMarker className="text-emerald-400 text-xs" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                    Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
                 </span>
              </div>
            </div>
        </div>

        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 self-start sm:self-center">
          <RadioPill
            checked={clienteModo === "nuevo"}
            onChange={() => setClienteModo("nuevo")}
            label="Nuevo Registro"
          />
          <RadioPill
            checked={clienteModo === "existente"}
            onChange={() => setClienteModo("existente")}
            label="Buscar Existente"
          />
        </div>
      </div>

      {clienteModo === "existente" ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start animate-in fade-in duration-300">
          <div className="md:col-span-4">
             <Input
                label="ID de Cliente"
                value={clienteId}
                onChange={setClienteId}
                inputMode="numeric"
                placeholder="ID del sistema..."
                required
                helper={errors.clienteId ? "Debes ingresar un ID válido" : ""}
              />
          </div>
          <div className="md:col-span-8 pt-6">
            <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 flex items-start gap-3">
               <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 mt-0.5"><HiIdentification /></div>
               <div>
                  <p className="text-xs text-sky-200 font-bold uppercase tracking-tight">Recordatorio Operativo</p>
                  <Note>Al usar un ID existente, el sistema vinculará esta nueva póliza a los datos de contacto ya registrados en la base de datos central.</Note>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombres"
              value={cliente.nombre}
              onChange={(v) => setCliente((s) => ({ ...s, nombre: v }))}
              autoCapitalize="words"
              autoComplete="given-name"
              required
              placeholder="Ej: Juan Pedro"
            />
            <Input
              label="Apellidos"
              value={cliente.apellido}
              onChange={(v) => setCliente((s) => ({ ...s, apellido: v }))}
              autoCapitalize="words"
              autoComplete="family-name"
              required
              placeholder="Ej: Pérez"
            />
            <Input
              label="Teléfono WhatsApp"
              value={cliente.telefono}
              onChange={(v) => setCliente((s) => ({ ...s, telefono: v }))}
              helper="Sin prefijos. Ej: 1166709006"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="1166709006"
            />
            <Input
              label="Correo Electrónico"
              type="email"
              value={cliente.email}
              onChange={(v) => setCliente((s) => ({ ...s, email: v }))}
              autoComplete="email"
              placeholder="ejemplo@correo.com"
            />
            <Input
              label="DNI / CUIT / CUIL"
              value={cliente.dni_cuit_cuil}
              onChange={(v) => setCliente((s) => ({ ...s, dni_cuit_cuil: v }))}
              inputMode="numeric"
              placeholder="Sin puntos ni guiones"
            />
            <Input
              label="Localidad / Ciudad"
              value={cliente.localidad}
              onChange={(v) => setCliente((s) => ({ ...s, localidad: v }))}
              autoComplete="address-level2"
              placeholder="Ej: Ramos Mejía"
            />
            <Textarea
              className="sm:col-span-2"
              label="Dirección de Domicilio"
              value={cliente.direccion}
              onChange={(v) => setCliente((s) => ({ ...s, direccion: v }))}
              placeholder="Calle, número, departamento..."
            />
          </div>

          <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] shadow-inner">
            <div className="flex items-center gap-2 text-white/40 mb-4 ml-1">
              <HiIdentification className="text-lg" />
              <span className="text-[10px] font-black uppercase tracking-widest">Verificación de Identidad (Opcional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
               <span className="text-[10px] text-emerald-400 font-medium italic">
                  * Estas imágenes se almacenarán en la ficha permanente del asegurado para futuras gestiones.
               </span>
            </div>
          </div>
        </div>
      )}
    </motion.fieldset>
  );
}

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