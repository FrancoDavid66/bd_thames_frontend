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
import { useAuth } from "../../../context/AuthContext";

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
    case "INTERIOR": return "Interior / Tablero";
    default: return fallback || pretty(key);
  }
}

function mapDocLabel(key, fallback) {
  switch (key) {
    case "CEDULA_VERDE_FRENTE": return "Cédula verde (frente)";
    case "CEDULA_VERDE_DORSO": return "Cédula verde (dorso)";
    case "TITULO": return "Título del vehículo";
    case "VTV": return "VTV";
    case "OBLEA_GNC": return "Oblea GNC";
    default: return fallback || pretty(key);
  }
}

function fileSig(file) {
  if (!file) return "";
  return `${file.name || ""}__${file.size || 0}__${file.type || ""}`;
}

function pretty(k) {
  return String(k || "").replace(/_/g, " ").replace(/\bGRUA\b/g, "GRÚA").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function ImagenesDocsStep({
  MAX_FOTOS = 20,
  coberturaSeleccionada = null, 
  fotoSlots = {},
  setFotoSlots = () => {},
  docSlots = {},
  setDocSlots = () => {},
  onUploadFotoVehiculo = () => {},
  onUploadDocVehiculo = () => {},
  variants,
}) {
  const { user } = useAuth();

  // 🚀 LÓGICA DINÁMICA ULTRA SEGURA PARA FOTOS
  const fotosObligatoriasArray = useMemo(() => {
    if (!coberturaSeleccionada || !coberturaSeleccionada.fotos_requeridas) return [];
    let reqs = coberturaSeleccionada.fotos_requeridas;
    if (typeof reqs === 'string') {
        try { reqs = JSON.parse(reqs); } catch(e) { reqs = reqs.split(',').map(s=>s.trim()).filter(Boolean); }
    }
    return Array.isArray(reqs) ? reqs : [];
  }, [coberturaSeleccionada]);

  // 🚀 LÓGICA DINÁMICA ULTRA SEGURA PARA DOCUMENTOS LEGALES
  const docsObligatoriosArray = useMemo(() => {
    if (!coberturaSeleccionada || !coberturaSeleccionada.documentos_requeridas && !coberturaSeleccionada.documentos_requeridos) return [];
    // Soporte preventivo por si llega como requeridas/os
    let reqs = coberturaSeleccionada.documentos_requeridos || coberturaSeleccionada.documentos_requeridas;
    if (typeof reqs === 'string') {
        try { reqs = JSON.parse(reqs); } catch(e) { reqs = reqs.split(',').map(s=>s.trim()).filter(Boolean); }
    }
    return Array.isArray(reqs) ? reqs : [];
  }, [coberturaSeleccionada]);

  const fotoSlotDefs = useMemo(() => {
    return fotosObligatoriasArray.map(key => ({ key: key, label: mapFotoLabel(key) }));
  }, [fotosObligatoriasArray]);

  const docSlotDefs = useMemo(() => {
    return docsObligatoriosArray.map(key => ({ key: key, label: mapDocLabel(key) }));
  }, [docsObligatoriosArray]);

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
    return docsObligatoriosArray.filter((k) => !have.has(k));
  }, [docSlots, docsObligatoriosArray]);

  const missingFotos = useMemo(() => {
    const have = new Set(Object.entries(fotoSlots || {}).filter(([, v]) => v?.url).map(([k]) => k));
    return fotosObligatoriasArray.filter((k) => !have.has(k));
  }, [fotoSlots, fotosObligatoriasArray]);

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
      <motion.div
        className="rounded-2xl border bg-white/[.03] p-4 shadow-xl backdrop-blur-md from-sky-400/20 to-sky-500/20 text-sky-400 border-sky-500/30"
        variants={sectionVariants} initial="initial" animate="animate"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-tighter bg-white/10 text-sky-400">
            <HiShieldCheck className="text-lg" /> 
            Requisitos: {coberturaSeleccionada ? coberturaSeleccionada.nombre : "Generales"}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Sucursal: {user?.perfil?.oficina_nombre || 'Local'}
          </span>
        </div>
        
        <p className="text-white/80 text-sm font-medium leading-relaxed">
          {fotosObligatoriasArray.length > 0 || docsObligatoriosArray.length > 0
            ? `Esta cobertura exige la carga de documentación y/o inspección fotográfica para poder avanzar.` 
            : `Esta cobertura (${coberturaSeleccionada?.nombre || 'Básica'}) no requiere inspección fotográfica ni papeles obligatorios.`}
        </p>

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

      <fieldset className="rounded-2xl border border-white/10 bg-white/[.02] p-4 shadow-inner">
        <legend className="px-2 text-white/40 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
          <HiDocumentText className="text-lg text-sky-400" /> Papeles del Vehículo
        </legend>

        {docSlotDefs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-white/30 text-xs italic font-medium">
              El administrador no ha configurado documentos legales obligatorios para esta cobertura.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docSlotDefs.map(({ key, label }) => {
              const v = docSlots?.[key] || null;
              const required = true; // Si está en la lista dinámica, es obligatorio
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
        )}
      </fieldset>

      <fieldset className="rounded-2xl border border-white/10 bg-white/[.02] p-4 shadow-inner">
        <legend className="px-2 text-white/40 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
          <HiPhotograph className="text-lg text-rose-400" /> Inspección Fotográfica
        </legend>

        {fotoSlotDefs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-white/30 text-xs italic font-medium">
              El administrador no ha configurado fotos obligatorias para esta cobertura.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotoSlotDefs.map(({ key, label }) => {
              const normalizedKey = key === "TUBO_GNC" ? "EQUIPO_GNC" : key;
              const v = fotoSlots?.[normalizedKey] || fotoSlots?.[key] || null;
              const required = true; // Si está en la lista dinámica, es obligatorio
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

        {Number(MAX_FOTOS) > 0 && fotoSlotDefs.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-2">
             <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden mr-4">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(totalFotosCargadas / fotoSlotDefs.length) * 100}%` }}
                />
             </div>
             <span className="text-[10px] font-black uppercase text-white/40">
                {totalFotosCargadas} / {fotoSlotDefs.length} Subidas
             </span>
          </div>
        )}
      </fieldset>
    </motion.div>
  );
}

function DocSlotCard({ label, value, required, onPick, onRemove }) {
  const filled = Boolean(value?.url);
  const isPdf = String(value?.mime || "").includes("pdf") || /\.pdf$/i.test(value?.url || "");
  return (
    <motion.div className={`rounded-xl border p-3 transition-all duration-300 ${filled ? 'bg-sky-500/10 border-sky-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`} variants={cardVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-white/80 text-[10px] font-black uppercase tracking-tight truncate">{label} {required && <span className="text-rose-400">*</span>}</span>
        {filled && <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black uppercase"><HiCheckCircle /> OK</span>}
      </div>
      {filled ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
          {isPdf ? <div className="h-full w-full flex flex-col items-center justify-center text-white/40 gap-2"><HiDocumentText className="text-3xl" /><span className="text-[10px] font-bold uppercase">PDF Adjunto</span></div> : <img src={value.url} alt={label} className="w-full h-full object-cover transition group-hover:scale-105" />}
          <button onClick={onRemove} className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><HiX /></button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
          <div className="aspect-video rounded-lg border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center text-white/30 gap-1 hover:text-white/60"><HiDocumentText className="text-2xl" /><span className="text-[10px] font-black uppercase tracking-widest">Adjuntar Papel</span></div>
        </label>
      )}
    </motion.div>
  );
}

function FotoSlotCard({ label, value, required, onPick, onRemove }) {
  const filled = Boolean(value?.url);
  return (
    <motion.div className={`rounded-xl border p-3 transition-all duration-300 ${filled ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'}`} variants={cardVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-white/80 text-[10px] font-black uppercase tracking-tight truncate">{label} {required && <span className="text-rose-400">*</span>}</span>
        {filled && <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black uppercase"><HiCheckCircle /> OK</span>}
      </div>
      {filled ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/40">
          <img src={value.url} alt={label} className="w-full h-full object-cover transition group-hover:scale-105" />
          <button onClick={onRemove} className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><HiX /></button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          <div className="aspect-video rounded-lg border border-dashed border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center text-white/30 gap-1 hover:text-white/60"><HiPhotograph className="text-2xl" /><span className="text-[10px] font-black uppercase tracking-widest">Tomar Foto</span></div>
        </label>
      )}
    </motion.div>
  );
}