// src/components/solicitudes/modalcreate/ImagenesDocsStep.jsx
import { useMemo } from "react";
import { motion } from "framer-motion";
import { HiPhotograph, HiDocumentText, HiX, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import toast from "react-hot-toast";

/**
 * Props esperadas:
 * - MAX_FOTOS: number (opcional)
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
    docs: ["CEDULA_VERDE_FRENTE", "VTV"],
    fotos: ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"],
    title: "Requisitos para A + GRÚA",
    note: "Cédula verde (frente), VTV y 4 lados del vehículo.",
    color: "from-sky-200/80 to-cyan-200/80",
  },
  OTRAS: {
    docs: ["CEDULA_VERDE_FRENTE"], // VTV/OBLEA/TÍTULO pueden aplicar según caso
    fotos: ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"],
    title: "Requisitos para otras coberturas",
    note: "Se recomiendan 4 lados; interiores/auxilio y papeles extra si corresponde.",
    color: "from-amber-200/80 to-yellow-200/80",
  },
};

// Inferencia básica si no viene coverageRuleKey
function inferRuleKey(fotoSlotDefs = [], docSlotDefs = []) {
  // Si no hay slots de fotos: podría ser A o un setup incompleto.
  // Si además el set de docs contiene VTV => asumimos A_GRUA mal configurado (fotos faltan).
  const docKeys = new Set(docSlotDefs.map((d) => d.key));
  if (!fotoSlotDefs.length) {
    if (docKeys.has("VTV")) return "A_GRUA";
    return "A";
  }
  // Si hay 4 lados en fotos, suena a A_GRUA/OTRAS; no sabemos cuál → OTRAS
  const fotoKeys = new Set(fotoSlotDefs.map((f) => f.key));
  const sides = ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"];
  const hasSides = sides.every((k) => fotoKeys.has(k));
  if (hasSides && docKeys.has("VTV")) return "A_GRUA";
  return "OTRAS";
}

function isHttpUrl(u) {
  const s = String(u || "");
  return s.startsWith("http://") || s.startsWith("https://");
}

/* ====== Label helpers (lado → conductor / acompañante, cédula frente/dorso) ====== */
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
    default:
      return fallback || pretty(key);
  }
}

export default function ImagenesDocsStep({
  MAX_FOTOS = 0,
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

  const allUrls = useMemo(() => {
    const s = new Set();
    const add = (v) => {
      const u = v?.url;
      const p = v?.public_id;
      if (u) s.add(`u:${u}`);
      if (p) s.add(`p:${p}`);
    };
    Object.values(fotoSlots || {}).forEach(add);
    Object.values(docSlots || {}).forEach(add);
    return s;
  }, [fotoSlots, docSlots]);

  const isDuplicate = (candidate) => {
    const u = candidate?.url;
    const p = candidate?.public_id;
    if (!u && !p) return false;
    return (u && allUrls.has(`u:${u}`)) || (p && allUrls.has(`p:${p}`));
  };

  const missingDocs = useMemo(() => {
    const have = new Set(
      Object.entries(docSlots || {})
        .filter(([, v]) => v?.url)
        .map(([k]) => k)
    );
    return rule.docs.filter((k) => !have.has(k) && docSlotDefs.some((d) => d.key === k));
  }, [docSlots, docSlotDefs, rule.docs]);

  const missingFotos = useMemo(() => {
    const have = new Set(
      Object.entries(fotoSlots || {})
        .filter(([, v]) => v?.url)
        .map(([k]) => k)
    );
    return rule.fotos.filter((k) => !have.has(k) && fotoSlotDefs.some((f) => f.key === k));
  }, [fotoSlots, fotoSlotDefs, rule.fotos]);

  const ruleRequiresPhotosButHidden =
    rule.fotos.length > 0 && fotoSlotDefs.length === 0;

  const handlePick = async (e, type, key) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    // Límite de fotos (si aplica)
    if (type === "foto" && MAX_FOTOS > 0) {
      const nextCount =
        totalFotosCargadas + (fotoSlots?.[key]?.url ? 0 : 1);
      if (nextCount > MAX_FOTOS) {
        toast.error(`Solo podés adjuntar hasta ${MAX_FOTOS} fotos.`);
        e.target.value = "";
        return;
      }
    }

    // Enviamos al uploader externo (Cloudinary). No sabemos public_id antes.
    const doUpload = type === "foto" ? onUploadFotoVehiculo : onUploadDocVehiculo;
    try {
      await doUpload(file, key);
      // El padre setea (url/public_id) en el slot.
      // Como dedupe depende del post-upload (public_id), validamos con un micro-delay.
      setTimeout(() => {
        const slotMap = type === "foto" ? fotoSlots : docSlots;
        const value = slotMap?.[key];
        if (value && (isDuplicate(value) && !sameSlotOnly(value, key, type, fotoSlots, docSlots))) {
          // Si el duplicado está en otro slot, revertimos el actual.
          if (type === "foto") {
            setFotoSlots((prev) => ({ ...prev, [key]: null }));
          } else {
            setDocSlots((prev) => ({ ...prev, [key]: null }));
          }
          toast.error("Ese archivo ya está cargado en otro campo.");
        }
      }, 50);
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
      <div className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
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
            ⚠ Esta cobertura requiere fotos del vehículo (frente, laterales, trasera), pero no están habilitadas aquí.
            Revisá la configuración de la pantalla o la cobertura seleccionada.
          </div>
        )}
      </div>

      {/* Documentos del vehículo */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
        <legend className="px-1 text-white/85 text-sm flex items-center gap-2">
          <HiDocumentText /> Documentos
        </legend>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docSlotDefs.map(({ key, label }) => {
            const v = docSlots?.[key] || null;
            const required = rule.docs.includes(key);
            return (
              <DocSlotCard
                key={key}
                label={mapDocLabel(key, label)}
                value={v}
                required={required}
                onRemove={() =>
                  setDocSlots((prev) => ({ ...prev, [key]: null }))
                }
                onPick={(e) => handlePick(e, "doc", key)}
              />
            );
          })}
        </div>
      </fieldset>

      {/* Fotos del vehículo */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
        <legend className="px-1 text-white/85 text-sm flex items-center gap-2">
          <HiPhotograph /> Fotos del vehículo
        </legend>

        {fotoSlotDefs.length === 0 ? (
          <p className="text-white/70 text-sm">
            No hay campos de fotos habilitados para esta cobertura.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fotoSlotDefs.map(({ key, label }) => {
              const v = fotoSlots?.[key] || null;
              const required = rule.fotos.includes(key);
              return (
                <FotoSlotCard
                  key={key}
                  label={mapFotoLabel(key, label)}
                  value={v}
                  required={required}
                  onRemove={() =>
                    setFotoSlots((prev) => ({ ...prev, [key]: null }))
                  }
                  onPick={(e) => handlePick(e, "foto", key)}
                />
              );
            })}
          </div>
        )}

        {MAX_FOTOS > 0 && (
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
  const isPdf = String(value?.mime || "").includes("pdf") || /\.pdf$/i.test(value?.url || "");

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
              // eslint-disable-next-line @next/next/no-img-element
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
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onPick}
          />
          <div className="h-28 rounded-lg border border-dashed border-white/15 bg-white/5 hover:bg-white/10 transition grid place-items-center text-white/70 text-sm cursor-pointer">
            Subir archivo
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.url}
              alt={label}
              className="w-full h-32 object-cover"
            />
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
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
          <div className="h-28 rounded-lg border border-dashed border-white/15 bg-white/5 hover:bg-white/10 transition grid place-items-center text-white/70 text-sm cursor-pointer">
            Subir foto
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

// Chequea si el duplicado está en el mismo slot (permitimos re-subir al mismo campo)
function sameSlotOnly(value, key, type, fotoSlots, docSlots) {
  const pack = type === "foto" ? fotoSlots : docSlots;
  const same = pack?.[key];
  if (!same) return false;
  const sameU = same?.url ? `u:${same.url}` : "";
  const sameP = same?.public_id ? `p:${same.public_id}` : "";
  const valU = value?.url ? `u:${value.url}` : "";
  const valP = value?.public_id ? `p:${value.public_id}` : "";
  return (sameU && sameU === valU) || (sameP && sameP === valP);
}
