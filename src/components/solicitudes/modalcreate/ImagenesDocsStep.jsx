// src/components/solicitudes/modalcreate/ImagenesDocsStep.jsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  HiPhotograph,
  HiDocumentText,
  HiX,
  HiCheckCircle,
  HiExclamationCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";

/**
 * Props esperadas:
 * - MAX_FOTOS: number (opcional) -> si 0/undefined => sin límite
 * - fotoSlotDefs: Array<{ key, label }>
 * - fotoSlots: Record<key, { url, public_id, mime?, file? }|null>
 * - setFotoSlots: fn
 * - docSlotDefs: Array<{ key, label }>
 * - docSlots: Record<key, { url, public_id, mime?, file? }|null>
 * - setDocSlots: fn
 * - onUploadFotoVehiculo(file, key): fn
 * - onUploadDocVehiculo(file, key): fn
 * - coverageRuleKey: "A" | "A_GRUA" | "OTRAS" (opcional; si no viene, infiere)
 */

const REQUIRED_BY_RULE = {
  A: {
    docs: ["CEDULA_VERDE_FRENTE"],
    fotos: [],
    title: "Requisitos para cobertura A",
    note: "Solo se solicita cédula verde (frente).",
    color: "from-emerald-200/80 to-teal-200/80",
  },
  A_GRUA: {
    // ⚠ Backend no tiene VTV como tipo doc => NO exigirlo acá
    docs: ["CEDULA_VERDE_FRENTE"],
    fotos: ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "PATENTE"],
    title: "Requisitos para A + GRÚA",
    note: "Cédula verde (frente) y fotos (frente, laterales, trasera y patente).",
    color: "from-sky-200/80 to-cyan-200/80",
  },
  OTRAS: {
    docs: ["CEDULA_VERDE_FRENTE"],
    fotos: ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "PATENTE"],
    title: "Requisitos para otras coberturas",
    note: "Se recomiendan 4 lados + patente; papeles extra si corresponde.",
    color: "from-amber-200/80 to-yellow-200/80",
  },
};

// Inferencia básica si no viene coverageRuleKey
function inferRuleKey(fotoSlotDefs = []) {
  // Si no hay fotos → suele ser A
  if (!fotoSlotDefs.length) return "A";

  // Si hay fotos de 4 lados + patente → suele ser A_GRUA o OTRAS
  const fotoKeys = new Set(fotoSlotDefs.map((f) => f.key));
  const must = ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"];
  const hasSides = must.every((k) => fotoKeys.has(k));
  if (hasSides) return "A_GRUA";
  return "OTRAS";
}

/* ====== Label helpers ====== */
function mapFotoLabel(key, fallback) {
  switch (key) {
    case "LATERAL_IZQ":
      return "Lado conductor";
    case "LATERAL_DER":
      return "Lado acompañante";
    case "FRENTE":
      return "Frente";
    case "TRASERA":
      return "Parte trasera";
    case "PATENTE":
      return "Patente";
    case "TUBO_GNC":
      return "Equipo GNC";
    case "EQUIPO_GNC":
      return "Equipo GNC";
    case "OBLEA_GNC":
      return "Oblea GNC";
    default:
      return fallback || pretty(key);
  }
}

function mapDocLabel(key, fallback) {
  switch (key) {
    case "CEDULA_VERDE_FRENTE":
      return "Cédula verde (frente)";
    case "CEDULA_VERDE_DORSO":
      return "Cédula verde (dorso)";
    case "TITULO":
      return "Título del vehículo";
    case "OBLEA_GNC":
      return "Oblea GNC";
    default:
      return fallback || pretty(key);
  }
}

// firma simple para dedupe pre-upload
function fileSig(file) {
  if (!file) return "";
  return `${file.name || ""}__${file.size || 0}__${file.type || ""}`;
}

export default function ImagenesDocsStep({
  MAX_FOTOS, // 0/undefined => sin límite
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
  const ruleKey = coverageRuleKey || inferRuleKey(fotoSlotDefs, docSlotDefs);
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
    const have = new Set(
      Object.entries(docSlots || {})
        .filter(([, v]) => v?.url)
        .map(([k]) => k)
    );
    return rule.docs.filter(
      (k) => !have.has(k) && docSlotDefs.some((d) => d.key === k)
    );
  }, [docSlots, docSlotDefs, rule.docs]);

  const missingFotos = useMemo(() => {
    const have = new Set(
      Object.entries(fotoSlots || {})
        .filter(([, v]) => v?.url)
        .map(([k]) => k)
    );
    return rule.fotos.filter(
      (k) => !have.has(k) && fotoSlotDefs.some((f) => f.key === k)
    );
  }, [fotoSlots, fotoSlotDefs, rule.fotos]);

  const ruleRequiresPhotosButHidden =
    rule.fotos.length > 0 && fotoSlotDefs.length === 0;

  const handlePick = async (e, type, key) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    // Límite de fotos (si aplica)
    if (type === "foto" && Number(MAX_FOTOS) > 0) {
      const nextCount = totalFotosCargadas + (fotoSlots?.[key]?.url ? 0 : 1);
      if (nextCount > Number(MAX_FOTOS)) {
        toast.error(`Solo podés adjuntar hasta ${MAX_FOTOS} fotos.`);
        e.target.value = "";
        return;
      }
    }

    // dedupe pre-upload (por firma)
    const sig = fileSig(file);
    if (sig && allIds.has(`f:${sig}`)) {
      toast.error("Ese archivo ya está cargado en otro campo.");
      e.target.value = "";
      return;
    }

    // ✅ mapeo: TUBO_GNC -> EQUIPO_GNC (backend)
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
      variants={
        variants || {
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
          exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
        }
      }
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-3"
    >
      {/* Banner de requisitos */}
      <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3 md:p-4">
        <div
          className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-[#0b0f1e] bg-gradient-to-br ${rule.color} mb-2`}
        >
          {rule.title}
        </div>
        <p className="text-white/80 text-sm">{rule.note}</p>

        {(missingDocs.length > 0 || missingFotos.length > 0) && (
          <div className="mt-2 text-xs text-white/80 flex items-center gap-2">
            <HiExclamationCircle className="opacity-80" />
            <span>
              Faltan cargar:{" "}
              {[
                ...missingDocs.map((k) => `Doc: ${mapDocLabel(k)}`),
                ...missingFotos.map((k) => `Foto: ${mapFotoLabel(k)}`),
              ].join(", ")}
            </span>
          </div>
        )}

        {ruleRequiresPhotosButHidden && (
          <div className="mt-2 text-xs text-amber-200/90">
            ⚠ Esta cobertura requiere fotos del vehículo, pero no están habilitadas aquí.
          </div>
        )}
      </div>

      {/* Documentos del vehículo */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.06] p-3 md:p-4">
        <legend className="px-1 text-white/85 text-sm flex items-center gap-2">
          <HiDocumentText /> Documentos
        </legend>

        <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* Fotos del vehículo */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.06] p-3 md:p-4">
        <legend className="px-1 text-white/85 text-sm flex items-center gap-2">
          <HiPhotograph /> Fotos del vehículo
        </legend>

        {fotoSlotDefs.length === 0 ? (
          <p className="mt-2 text-white/70 text-sm">
            No hay campos de fotos habilitados para esta cobertura.
          </p>
        ) : (
          <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fotoSlotDefs.map(({ key, label }) => {
              const normalizedKey = key === "TUBO_GNC" ? "EQUIPO_GNC" : key;
              const v = fotoSlots?.[normalizedKey] || fotoSlots?.[key] || null; // tolerante
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
          <p className="mt-2 text-xs text-white/60">
            {totalFotosCargadas}/{MAX_FOTOS} fotos adjuntas.
          </p>
        )}
      </fieldset>
    </motion.div>
  );
}

/* ===================== Cards ===================== */
function DocSlotCard({ label, value, required, onPick, onRemove }) {
  const filled = Boolean(value?.url);
  const isPdf =
    String(value?.mime || "").includes("pdf") || /\.pdf$/i.test(value?.url || "");

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-white/90 text-sm">
          {label} {required && <span className="ml-1 text-rose-200">*</span>}
        </span>
        {filled ? (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-300/20 text-emerald-200 border border-emerald-300/30">
            <HiCheckCircle /> listo
          </span>
        ) : null}
      </div>

      {filled ? (
        <div className="relative group">
          <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0f1324] p-2">
            {isPdf ? (
              <div className="aspect-video w-full grid place-items-center text-white/80 text-xs">
                PDF adjunto
              </div>
            ) : (
              <img
                src={value.url}
                alt={label}
                className="w-full h-32 object-cover rounded-md"
              />
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 transition"
            title="Quitar"
          >
            <HiX className="text-white" />
          </button>
        </div>
      ) : (
        <label className="block">
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
          <div className="h-28 rounded-lg border border-dashed border-white/15 bg-white/5 hover:bg-white/10 transition grid place-items-center text-white/70 text-xs sm:text-sm cursor-pointer px-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <HiDocumentText className="text-base opacity-80" />
              <span>Subir archivo</span>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}

function FotoSlotCard({ label, value, required, onPick, onRemove }) {
  const filled = Boolean(value?.url);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-white/90 text-sm">
          {label} {required && <span className="ml-1 text-rose-200">*</span>}
        </span>
        {filled ? (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-300/20 text-emerald-200 border border-emerald-300/30">
            <HiCheckCircle /> listo
          </span>
        ) : null}
      </div>

      {filled ? (
        <div className="relative group">
          <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0f1324]">
            <img src={value.url} alt={label} className="w-full h-32 object-cover" />
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 transition"
            title="Quitar"
          >
            <HiX className="text-white" />
          </button>
        </div>
      ) : (
        <label className="block">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          <div className="h-28 rounded-lg border border-dashed border-white/15 bg-white/5 hover:bg-white/10 transition grid place-items-center text-white/70 text-xs sm:text-sm cursor-pointer px-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <HiPhotograph className="text-base opacity-80" />
              <span>Subir foto</span>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}

/* ===================== Utils ===================== */
function pretty(k) {
  return String(k || "")
    .replace(/_/g, " ")
    .replace(/\bGRUA\b/g, "GRÚA")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
