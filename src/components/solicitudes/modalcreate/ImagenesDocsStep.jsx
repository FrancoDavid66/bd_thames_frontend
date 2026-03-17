// src/components/solicitudes/modalcreate/ImagenesDocsStep.jsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  HiPhotograph,
  HiDocumentText,
  HiX,
  HiCheckCircle,
  HiExclamationCircle,
  HiShieldCheck,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE DE SEGURIDAD
import { useAuth } from "../../../context/AuthContext";

// Definimos variants inline para animaciones profesionales
const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const cardVariants = {
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

/**
 * Props esperadas:
 * - MAX_FOTOS: number 
 * - fotoSlotDefs: Array<{ key, label }>
 * - fotoSlots: Record<key, { url, public_id, mime?, file? }|null>
 * - setFotoSlots: fn
 * - docSlotDefs: Array<{ key, label }>
 * - docSlots: Record<key, { url, public_id, mime?, file? }|null>
 * - setDocSlots: fn
 * - onUploadFotoVehiculo(file, key): fn
 * - onUploadDocVehiculo(file, key): fn
 * - coverageRuleKey: "A" | "A_GRUA" | "OTRAS"
 */

const REQUIRED_BY_RULE = {
  A: {
    docs: ["CEDULA_VERDE_FRENTE"],
    fotos: [],
    title: "Requisitos para cobertura A",
    note: "Solo se solicita cédula verde (frente).",
    color: "from-emerald-400/20 to-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  A_GRUA: {
    docs: ["CEDULA_VERDE_FRENTE"],
    fotos: ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "PATENTE"],
    title: "Requisitos para A + GRÚA",
    note: "Cédula verde (frente) y fotos (frente, laterales, trasera y patente).",
    color: "from-sky-400/20 to-sky-500/20 text-sky-400 border-sky-500/30",
  },
  OTRAS: {
    docs: ["CEDULA_VERDE_FRENTE"],
    fotos: ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "PATENTE"],
    title: "Requisitos para otras coberturas",
    note: "Se recomiendan 4 lados + patente; papeles extra si corresponde.",
    color: "from-amber-400/20 to-amber-500/20 text-amber-400 border-amber-500/30",
  },
};

function inferRuleKey(fotoSlotDefs = []) {
  if (!fotoSlotDefs.length) return "A";
  const fotoKeys = new Set(fotoSlotDefs.map((f) => f.key));
  const must = ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"];
  const hasSides = must.every((k) => fotoKeys.has(k));
  if (hasSides) return "A_GRUA";
  return "OTRAS";
}

/* ====== Label helpers ====== */
function mapFotoLabel(key, fallback) {
  switch (key) {
    case "LATERAL_IZQ": return "Lado conductor";
    case "LATERAL_DER": return "Lado acompañante";
    case "FRENTE": return "Frente";
    case "TRASERA": return "Parte trasera";
    case "PATENTE": return "Patente";
    case "TUBO_GNC":
    case "EQUIPO_GNC": return "Equipo GNC";
    case "OBLEA_GNC": return "Oblea GNC";
    default: return fallback || pretty(key);
  }
}

function mapDocLabel(key, fallback) {
  switch (key) {
    case "CEDULA_VERDE_FRENTE": return "Cédula verde (frente)";
    case "CEDULA_VERDE_DORSO": return "Cédula verde (dorso)";
    case "TITULO": return "Título del vehículo";
    case "OBLEA_GNC": return "Oblea GNC";
    default: return fallback || pretty(key);
  }
}

function fileSig(file) {
  if (!file) return "";
  return `${file.name || ""}__${file.size || 0}__${file.type || ""}`;
}

export default function ImagenesDocsStep({
  MAX_FOTOS,
  fotoSlotDefs = [],
  fotoSlots = {},
  setFotoSlots = () => {},
  docSlotDefs = [],
  docSlots = {},
  setDocSlots = () => {},
  onUploadFotoVehiculo = () => {},
  onUploadDocVehiculo = () => {},
  coverageRuleKey,
  variants,
}) {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  const ruleKey = coverageRuleKey || inferRuleKey(fotoSlotDefs);
  const rule = REQUIRED_BY_RULE[ruleKey] || REQUIRED_BY_RULE.OTRAS;

  const totalFotosCargadas = useMemo(
    () => Object.values(fotoSlots || {}).filter((v) => v?.url).length,
    [fotoSlots]
  );

  const allIds = useMemo(() => {
    const out = new Set();
    const add = (v) => {
      if (!v) return;
      if (v.url) out.add(`u:${v.url}`);
      if (v.public_id) out.add(`p:${v.public_id}`);
      if (v.file) out.add(`f:${fileSig(v.file)}`);
    };
    Object.values(fotoSlots || {}).forEach(add);
    Object.values(docSlots || {}).forEach(add);
    return out;
  }, [fotoSlots, docSlots]);

  const missingDocs = useMemo(() => {
    const have = new Set(Object.entries(docSlots || {}).filter(([, v]) => v?.url).map(([k]) => k));
    return rule.docs.filter((k) => !have.has(k) && docSlotDefs.some((d) => d.key === k));
  }, [docSlots, docSlotDefs, rule.docs]);

  const missingFotos = useMemo(() => {
    const have = new Set(Object.entries(fotoSlots || {}).filter(([, v]) => v?.url).map(([k]) => k));
    return rule.fotos.filter((k) => !have.has(k) && fotoSlotDefs.some((f) => f.key === k));
  }, [fotoSlots, fotoSlotDefs, rule.fotos]);

  const handlePick = async (e, type, key) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    if (type === "foto" && Number(MAX_FOTOS) > 0) {
      const nextCount = totalFotosCargadas + (fotoSlots?.[key]?.url ? 0 : 1);
      if (nextCount > Number(MAX_FOTOS)) {
        toast.error(`Solo podés adjuntar hasta ${MAX_FOTOS} fotos.`);
        e.target.value = "";
        return;
      }
    }

    const sig = fileSig(file);
    if (sig && allIds.has(`f:${sig}`)) {
      toast.error("Ese archivo ya está cargado en otro campo.");
      e.target.value = "";
      return;
    }

    // 🚀 Mapeo crítico para Backend: TUBO_GNC -> EQUIPO_GNC
    const normalizedKey = type === "foto" && key === "TUBO_GNC" ? "EQUIPO_GNC" : key;
    const doUpload = type === "foto" ? onUploadFotoVehiculo : onUploadDocVehiculo;

    try {
      await doUpload(file, normalizedKey);
    } catch {
      toast.error("No se pudo subir el archivo.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <motion.div
      variants={variants || {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
        exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
      }}
      initial="hidden" animate="show" exit="exit"
      className="space-y-4"
    >
      {/* Banner de requisitos blindado */}
      <motion.div
        className={`rounded-2xl border bg-white/[.03] p-4 shadow-xl backdrop-blur-md ${rule.color.split(' ').pop()}`}
        variants={sectionVariants} initial="initial" animate="animate"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-tighter bg-white/10 ${rule.color.split(' ')[2]}`}>
            <HiShieldCheck className="text-lg" /> {rule.title}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
          </span>
        </div>
        
        <p className="text-white/80 text-sm font-medium leading-relaxed">{rule.note}</p>

        {(missingDocs.length > 0 || missingFotos.length > 0) && (
          <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/5 flex items-start gap-3">
            <HiExclamationCircle className="text-amber-400 text-lg shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs text-white/60 font-medium">
              <span className="block text-white/80 font-bold uppercase mb-1">Pendientes de carga:</span>
              {[
                ...missingDocs.map((k) => `Documento: ${mapDocLabel(k)}`),
                ...missingFotos.map((k) => `Foto: ${mapFotoLabel(k)}`),
              ].join(" • ")}
            </div>
          </div>
        )}
      </motion.div>

      {/* Galería de Documentos */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.02] p-4 shadow-inner">
        <legend className="px-2 text-white/40 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
          <HiDocumentText className="text-lg text-sky-400" /> Papeles del Vehículo
        </legend>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docSlotDefs.map(({ key, label }) => {
            const v = docSlots?.[key] || null;
            const required = rule.docs.includes(key);
            return (
              <DocSlotCard
                key={key}
                label={mapDocLabel(key, label)}
                value={v}
                required={required}
                onRemove={() => setDocSlots((prev) => ({ ...prev, [key]: null }))}
                onPick={(e) => handlePick(e, "doc", key)}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Galería de Fotos */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.02] p-4 shadow-inner">
        <legend className="px-2 text-white/40 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
          <HiPhotograph className="text-lg text-rose-400" /> Inspección Fotográfica
        </legend>

        {fotoSlotDefs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-white/30 text-xs italic font-medium">
              Esta cobertura no requiere fotos de inspección.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotoSlotDefs.map(({ key, label }) => {
              const normalizedKey = key === "TUBO_GNC" ? "EQUIPO_GNC" : key;
              const v = fotoSlots?.[normalizedKey] || fotoSlots?.[key] || null;
              const required = rule.fotos.includes(key) || rule.fotos.includes(normalizedKey);
              return (
                <FotoSlotCard
                  key={key}
                  label={mapFotoLabel(key, label)}
                  value={v}
                  required={required}
                  onRemove={() =>
                    setFotoSlots((prev) => ({ ...prev, [normalizedKey]: null, [key]: null }))
                  }
                  onPick={(e) => handlePick(e, "foto", key)}
                />
              );
            })}
          </div>
        )}

        {Number(MAX_FOTOS) > 0 && (
          <div className="mt-4 flex items-center justify-between px-2">
             <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden mr-4">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(totalFotosCargadas / MAX_FOTOS) * 100}%` }}
                />
             </div>
             <span className="text-[10px] font-black uppercase text-white/40">
                {totalFotosCargadas} / {MAX_FOTOS} Slots
             </span>
          </div>
        )}
      </fieldset>
    </motion.div>
  );
}

/* ===================== Sub-Componentes (Cards) ===================== */

function DocSlotCard({ label, value, required, onPick, onRemove }) {
  const filled = Boolean(value?.url);
  const isPdf = String(value?.mime || "").includes("pdf") || /\.pdf$/i.test(value?.url || "");

  return (
    <motion.div
      className={`rounded-xl border p-3 transition-all duration-300 ${
        filled ? 'bg-sky-500/10 border-sky-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
      variants={cardVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-white/80 text-[10px] font-black uppercase tracking-tight truncate">
          {label} {required && <span className="text-rose-400">*</span>}
        </span>
        {filled && (
          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black uppercase">
            <HiCheckCircle /> OK
          </span>
        )}
      </div>

      {filled ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
          {isPdf ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-white/40 gap-2">
              <HiDocumentText className="text-3xl" />
              <span className="text-[10px] font-bold uppercase">PDF Adjunto</span>
            </div>
          ) : (
            <img src={value.url} alt={label} className="w-full h-full object-cover transition group-hover:scale-105" />
          )}
          <button onClick={onRemove} className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <HiX />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
          <div className="aspect-video rounded-lg border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center text-white/30 gap-1 hover:text-white/60">
            <HiDocumentText className="text-2xl" />
            <span className="text-[10px] font-black uppercase tracking-widest">Adjuntar Papel</span>
          </div>
        </label>
      )}
    </motion.div>
  );
}

function FotoSlotCard({ label, value, required, onPick, onRemove }) {
  const filled = Boolean(value?.url);
  return (
    <motion.div
      className={`rounded-xl border p-3 transition-all duration-300 ${
        filled ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'
      }`}
      variants={cardVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-white/80 text-[10px] font-black uppercase tracking-tight truncate">
          {label} {required && <span className="text-rose-400">*</span>}
        </span>
        {filled && (
          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black uppercase">
            <HiCheckCircle /> OK
          </span>
        )}
      </div>

      {filled ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
          <img src={value.url} alt={label} className="w-full h-full object-cover transition group-hover:scale-105" />
          <button onClick={onRemove} className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <HiX />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          <div className="aspect-video rounded-lg border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center text-white/30 gap-1 hover:text-white/60">
            <HiPhotograph className="text-2xl" />
            <span className="text-[10px] font-black uppercase tracking-widest">Tomar Foto</span>
          </div>
        </label>
      )}
    </motion.div>
  );
}

/* ===================== Utils ===================== */
function pretty(k) {
  return String(k || "").replace(/_/g, " ").replace(/\bGRUA\b/g, "GRÚA").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}