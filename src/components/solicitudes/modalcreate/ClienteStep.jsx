// src/components/solicitudes/modalcreate/ClienteStep.jsx
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiIdentification, HiTrash, HiUpload, HiLocationMarker, HiUser } from "react-icons/hi";
import { useAuth } from "../../../context/AuthContext";
import { PARTIDOS, fetchLocalidadesPorPartido } from "../../../data/baLocations";

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
      <span className="block text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">
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
        className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3.5 text-base outline-none focus:ring-2 ring-sky-500/40 focus:border-sky-500/30 text-white placeholder:text-white/20 transition-all"
      />
      {helper ? <span className="mt-1 block text-[10px] text-white/40 font-medium ml-1">{helper}</span> : null}
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
      <span className="block text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">
        {label}
      </span>
      <textarea
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3.5 text-base outline-none focus:ring-2 ring-sky-500/40 focus:border-sky-500/30 text-white placeholder:text-white/20 transition-all resize-none"
      />
    </motion.label>
  );
}

function Select({ label, value, onChange, options = [], required = false, helper = "", disabled = false, placeholder = "— Seleccionar —", className = "" }) {
  const normalized = options.map((op) => (typeof op === "string" ? { value: op, label: op } : op));
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants} initial="initial" animate="animate"
    >
      <span className="block text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <div className="relative">
        <select
          value={value || ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`cursor-pointer w-full rounded-2xl border border-white/10 px-4 py-3.5 pr-10 text-base outline-none transition-all appearance-none ${
            disabled ? "bg-black/40 text-white/30 cursor-not-allowed" : "bg-black/30 text-white focus:ring-2 ring-sky-500/40 focus:border-sky-500/30"
          }`}
        >
          <option value="">{placeholder}</option>
          {normalized.map((op) => (
            <option key={op.value} value={op.value} className="bg-[#0f1324] text-white">
              {op.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">▾</span>
      </div>
      {helper ? <span className="mt-1 block text-[10px] text-white/40 font-medium">{helper}</span> : null}
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
  cliente = {},
  setCliente = () => {},
  dniSlots,
  setDniSlots,
  TIPO_DNI_SLOTS = [
    { key: "DNI_FRENTE", label: "DNI frente" },
    { key: "DNI_DORSO", label: "DNI dorso" },
  ],
  onUploadDNI,
  section = "all", // "all" | "datos" | "fotos"
}) {
  const { user } = useAuth();
  const showDatos = section === "all" || section === "datos";
  const showFotos = section === "all" || section === "fotos";

  const errors = useMemo(() => {
    const e = {};
    if (clienteModo === "existente") {
      if (!String(clienteId).trim()) e.clienteId = "ID requerido";
      return e;
    }
    if (!cliente?.nombre?.trim()) e.nombre = "Requerido";
    if (!cliente?.apellido?.trim()) e.apellido = "Requerido";
    if (!cliente?.telefono?.trim()) e.telefono = "Requerido";
    if (!cliente?.dni_cuit_cuil?.trim()) e.dni_cuit_cuil = "Requerido";
    if (!cliente?.localidad?.trim()) e.localidad = "Requerido";
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

  // 🌍 Localidades encadenadas al Partido elegido (se traen de la fuente oficial)
  const [locOptions, setLocOptions] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(false);

  useEffect(() => {
    const partido = cliente?.partido || "";
    if (!partido) { setLocOptions([]); setLocError(false); return; }
    let alive = true;
    setLocLoading(true);
    setLocError(false);
    fetchLocalidadesPorPartido(partido)
      .then((arr) => {
        if (!alive) return;
        setLocOptions(arr);
        // Sin resultados → habilitamos texto libre para no trabar la carga
        setLocError(arr.length === 0);
      })
      .catch(() => { if (alive) { setLocOptions([]); setLocError(true); } })
      .finally(() => { if (alive) setLocLoading(false); });
    return () => { alive = false; };
  }, [cliente?.partido]);

  // Al cambiar de partido reseteamos la localidad elegida
  const onChangePartido = (v) => setCliente((s) => ({ ...s, partido: v, localidad: "" }));

  return (
    <motion.fieldset
      className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 sm:p-6 shadow-xl"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
    >
      {showDatos && (
      <>
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
              value={cliente?.nombre || ""}
              onChange={(v) => setCliente((s) => ({ ...s, nombre: v }))}
              autoCapitalize="words"
              autoComplete="given-name"
              required
              placeholder="Ej: Juan Pedro"
            />
            <Input
              label="Apellidos"
              value={cliente?.apellido || ""}
              onChange={(v) => setCliente((s) => ({ ...s, apellido: v }))}
              autoCapitalize="words"
              autoComplete="family-name"
              required
              placeholder="Ej: Pérez"
            />
            <Input
              label="Teléfono WhatsApp"
              value={cliente?.telefono || ""}
              onChange={(v) => setCliente((s) => ({ ...s, telefono: v }))}
              helper="Sin prefijos. Ej: 1166709006"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="1166709006"
            />
            <Input
              label="DNI / CUIT / CUIL"
              value={cliente?.dni_cuit_cuil || ""}
              onChange={(v) => setCliente((s) => ({ ...s, dni_cuit_cuil: v }))}
              inputMode="numeric"
              required
              helper={errors.dni_cuit_cuil ? "Campo obligatorio" : ""}
              placeholder="Sin puntos ni guiones"
            />
            <Input
              label="Localidad / Ciudad"
              value={cliente?.localidad || ""}
              onChange={(v) => setCliente((s) => ({ ...s, localidad: v }))}
              required
              helper={errors.localidad ? "Campo obligatorio" : ""}
              placeholder="Ej: Ramos Mejía"
            />
            <Input
              className="sm:col-span-2"
              label="Dirección de Domicilio"
              value={cliente?.direccion || ""}
              onChange={(v) => setCliente((s) => ({ ...s, direccion: v }))}
              autoComplete="street-address"
              placeholder="Calle, número, departamento..."
            />
          </div>
        </div>
      )}
      </>
      )}

      {showFotos && clienteModo === "nuevo" && (
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] shadow-inner">
          <div className="flex items-center gap-2 text-white/40 mb-4 ml-1">
            <HiIdentification className="text-lg" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Fotos del asegurado (DNI) <span className="text-rose-400">*</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIPO_DNI_SLOTS.map(({ key, label }) => {
              const cargada = Boolean(dniSlots?.[key]?.url);
              return (
                <FotoSlot
                  key={key}
                  label={`${label}${cargada ? "" : " *"}`}
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
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <span className="text-[10px] text-amber-400 font-medium italic">
              * Las fotos del DNI (frente y dorso) son obligatorias para crear la solicitud.
            </span>
          </div>
        </div>
      )}

      {showFotos && clienteModo === "existente" && (
        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
          <HiIdentification className="text-3xl text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/60 font-medium">
            Cliente existente: usa la documentación ya registrada en su ficha.
          </p>
          <p className="text-[11px] text-white/30 mt-1">No hace falta subir fotos en este paso.</p>
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
  if (!cliente?.dni_cuit_cuil?.trim()) e.dni_cuit_cuil = "Requerido";
  if (!cliente?.localidad?.trim()) e.localidad = "Requerido";
  return e;
}