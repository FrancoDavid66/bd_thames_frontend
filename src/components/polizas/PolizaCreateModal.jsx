// src/components/polizas/PolizaCreateModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import PolizaStep from "../solicitudes/modalcreate/PolizaStep";
import ImagenesDocsStep from "../solicitudes/modalcreate/ImagenesDocsStep";
import { useCatalogos } from "../../hooks/solicitudes/useCatalogos";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";

// ==== Config / helpers ====
const MAX_FOTOS = Number(import.meta.env.VITE_MAX_FOTOS || 0);

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function lastDayOfMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
}
function parseYMDLocal(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function addMonthsLocal(ymd, months) {
  const base = parseYMDLocal(ymd);
  if (!base) return "";
  const y = base.getFullYear();
  const m0 = base.getMonth();
  const d = base.getDate();
  const tMon = m0 + months;
  const y2 = y + Math.floor(tMon / 12);
  const m2 = ((tMon % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(y2, m2);
  const day2 = Math.min(d, maxDay);
  return ymdLocal(new Date(y2, m2, day2, 12, 0, 0, 0));
}

const rmDiacritics = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ✅ Mapeo humano → enum (incluye nuevas etiquetas C+ / C MÁXIMA)
const COBERTURA_MAP = {
  A: "A",
  "A + GRUA": "A_GRUA",
  B: "B",
  B1: "B1",
  C: "C",
  C1: "C1",
  "C1": "C1",
  "C+": "C1",
  "C +": "C1",
  "C TOTAL": "C_TOTAL",
  "C TOTAL ": "C_TOTAL",
  "C MAXIMA": "C_TOTAL",
  "C MÁXIMA": "C_TOTAL",
  "C FRANQUICIA": "C_FRANQUICIA",
  "C FRANQUISCIA": "C_FRANQUICIA",
};

const normalizeCobertura = (v = "") => {
  const k = String(v).trim().toUpperCase();
  if (COBERTURA_MAP[k]) return COBERTURA_MAP[k];
  return k.replace(/\s+/g, "_").replace(/__+/g, "_");
};

const COMPANY_CUOTAS_DEFAULT = {
  agrosalta: 6,
  "federacion patronal": 6,
  "federación patronal": 6,
  atm: 4,
  equidad: 3,
  nre: 3,
  providencia: 3,
};

function firstFieldErrors(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return [];
  const out = [];
  Object.entries(payload).forEach(([k, v]) => {
    if (k === "detail" || k === "message" || k === "error" || k === "detalle")
      return;
    const txt =
      Array.isArray(v) ? v.join(" ")
      : typeof v === "string" ? v
      : JSON.stringify(v);
    out.push(`${k}: ${txt}`);
  });
  return out;
}

// ==== Slots docs/fotos ====

// Papeles del vehículo
const DOC_SLOT_RC = [
  { key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" },
];

const DOC_SLOT_A_GRUA = [
  { key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" },
  { key: "VTV", label: "VTV" },
];

const DOC_SLOT_FULL = [
  { key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" },
  { key: "TITULO", label: "Título del vehículo" },
  { key: "OBLEA_GNC", label: "Oblea GNC" },
  { key: "VTV", label: "VTV" },
  { key: "PERMISO", label: "Permiso" },
];

// Fotos del vehículo
const FOTO_SLOTS_FULL = [
  { key: "FRENTE", label: "Frente" },
  { key: "LATERAL_IZQ", label: "Lateral izq." },
  { key: "LATERAL_DER", label: "Lateral der." },
  { key: "TRASERA", label: "Trasera" },
  { key: "INTERIOR", label: "Interior" },
  { key: "RUEDA_AUXILIO", label: "Rueda de auxilio" },
  { key: "TUBO_GNC", label: "Tubo GNC" },
];

const FOTO_SLOTS_A_GRUA = [
  { key: "FRENTE", label: "Frente" },
  { key: "LATERAL_IZQ", label: "Lateral izq." },
  { key: "LATERAL_DER", label: "Lateral der." },
  { key: "TRASERA", label: "Trasera" },
];

// Claves admitidas para “fotos” (solo fotos reales)
const ALLOWED_FOTO_KEYS_POLIZA = new Set([
  "PATENTE",
  "FRENTE",
  "LATERAL_IZQ",
  "LATERAL_DER",
  "TRASERA",
  "INTERIOR",
  "RUEDA_AUXILIO",
  "TUBO_GNC",
]);

const guessMime = (name = "") =>
  name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg";

function isHttpUrl(u) {
  const s = String(u || "");
  return s.startsWith("http://") || s.startsWith("https://");
}

const PolizaCreateModal = ({ isOpen, onClose, onSuccess, clienteId }) => {
  const closeBtnRef = useRef(null);
  const { companias, coberturas } = useCatalogos();

  // Paso actual: 1 = datos póliza / auto, 2 = fotos y docs
  const [step, setStep] = useState(1);

  const [poliza, setPoliza] = useState({
    compania: "",
    numero_poliza: "",
    cobertura: "",
    oficina: "",
    patente: "",
    marca: "",
    modelo: "",
    anio: "",
    tipo: "Auto",
    precio_cuota: "",
    cantidad_cuotas_override: "",
    primer_vencimiento: "",
    fecha_emision: ymdLocal(new Date()),
    dias_a_vencer: 30,
    generar_cuotas_ahora: true,
  });
  const [sinNumero, setSinNumero] = useState(false); // compat, pero ya no se exige número
  const [tocoCantidadCuotas, setTocoCantidadCuotas] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==== Cobertura → slots de docs/fotos ====
  const coberturaNorm = normalizeCobertura(poliza.cobertura || "");
  const isA = coberturaNorm === "A";
  const isAGrua = coberturaNorm === "A_GRUA";

  const FOTO_SLOTS = isA ? [] : isAGrua ? FOTO_SLOTS_A_GRUA : FOTO_SLOTS_FULL;
  const DOC_SLOTS = isA ? DOC_SLOT_RC : isAGrua ? DOC_SLOT_A_GRUA : DOC_SLOT_FULL;

  const [fotoSlots, setFotoSlots] = useState({});
  const [docSlots, setDocSlots] = useState(() =>
    Object.fromEntries(DOC_SLOTS.map(({ key }) => [key, null]))
  );

  // Sincronizar slots cuando cambia la cobertura (sin perder lo cargado)
  useEffect(() => {
    const nextDocKeys = new Set(DOC_SLOTS.map((d) => d.key));
    setDocSlots((prev) => {
      const out = {};
      for (const k of nextDocKeys) out[k] = prev?.[k] || null;
      return out;
    });
    const nextFotoKeys = new Set(FOTO_SLOTS.map((f) => f.key));
    setFotoSlots((prev) => {
      const out = {};
      for (const k of nextFotoKeys) out[k] = prev?.[k] || null;
      return out;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coberturaNorm]);

  // ==== Fechas / cuotas ====
  useEffect(() => {
    if (!poliza.fecha_emision) return;
    setPoliza((s) => ({
      ...s,
      primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1),
    }));
  }, [poliza.fecha_emision]);

  useEffect(() => {
    const raw = (poliza.compania || "").trim();
    if (!raw || tocoCantidadCuotas) return;
    const key = rmDiacritics(raw).toLowerCase();
    const cant = COMPANY_CUOTAS_DEFAULT[key];
    if (cant)
      setPoliza((s) => ({
        ...s,
        cantidad_cuotas_override: String(cant),
      }));
  }, [poliza.compania, tocoCantidadCuotas]);

  // ==== Validación solo de datos de póliza (para habilitar paso 2) ====
  const baseErrors = useMemo(() => {
    const e = {};
    if (!poliza.compania.trim()) e.compania = "Requerido";
    // ⛔️ YA NO exigimos número de póliza: lo genera el backend
    if (!poliza.cobertura.trim()) e.cobertura = "Requerido";
    if (!poliza.oficina.trim()) e.oficina = "Requerido";
    if (!poliza.patente.trim()) e.patente = "Requerido";
    if (!poliza.marca.trim()) e.marca = "Requerido";
    if (!poliza.modelo.trim()) e.modelo = "Requerido";
    if (!String(poliza.anio).trim()) e.anio = "Requerido";
    if (!poliza.primer_vencimiento) e.primer_vencimiento = "Requerido";
    if (!poliza.fecha_emision) e.fecha_emision = "Requerido";
    // ⛔️ Ya NO exigimos precio_cuota, porque puede ir 0 / default en backend
    return e;
  }, [poliza]);

  const canGoToFotos = useMemo(
    () => Object.keys(baseErrors).length === 0,
    [baseErrors]
  );

  // ==== Validación de docs/fotos según cobertura (solo aviso visual) ====
  const docsFotosError = useMemo(() => {
    let requiredDocs = [];
    let requiredFotos = [];

    if (coberturaNorm === "A") {
      requiredDocs = ["CEDULA_VERDE_FRENTE"];
      requiredFotos = [];
    } else if (coberturaNorm === "A_GRUA") {
      requiredDocs = ["CEDULA_VERDE_FRENTE", "VTV"];
      requiredFotos = ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"];
    } else {
      // Otras coberturas
      requiredDocs = ["CEDULA_VERDE_FRENTE"];
      requiredFotos = ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"];
    }

    const docKeysAvailable = new Set(DOC_SLOTS.map((d) => d.key));
    const fotoKeysAvailable = new Set(FOTO_SLOTS.map((f) => f.key));

    const missingDocs = requiredDocs.filter(
      (k) => docKeysAvailable.has(k) && !docSlots?.[k]?.url
    );
    const missingFotos = requiredFotos.filter(
      (k) => fotoKeysAvailable.has(k) && !fotoSlots?.[k]?.url
    );

    if (!missingDocs.length && !missingFotos.length) return "";

    const parts = [];
    if (missingDocs.length) parts.push(`docs: ${missingDocs.join(", ")}`);
    if (missingFotos.length) parts.push(`fotos: ${missingFotos.join(", ")}`);

    return `Faltan cargar ${parts.join(" y ")}`;
  }, [coberturaNorm, DOC_SLOTS, FOTO_SLOTS, docSlots, fotoSlots]);

  // ==== Validación global para SUBMIT (NO bloquea por fotos/docs) ====
  const canSubmit = useMemo(
    () => !saving && Object.keys(baseErrors).length === 0,
    [baseErrors, saving]
  );

  // ==== Upload helpers (Cloudinary) ====
  async function handleUploadToSlot(file, folder, setter) {
    if (!file) return;
    const _mime = file.type || guessMime(file.name || "");
    try {
      const up = await uploadToCloudinary(file, { folder });
      setter({ file, url: up.secure_url, public_id: up.public_id, mime: _mime });
      toast.success("Subido");
    } catch {
      toast.error("No se pudo subir el archivo");
    }
  }

  const onUploadFotoVehiculo = (file, key) =>
    handleUploadToSlot(file, "de-thames/polizas/fotos", (val) =>
      setFotoSlots((s) => ({ ...s, [key]: val }))
    );

  const onUploadDocVehiculo = (file, key) =>
    handleUploadToSlot(file, "de-thames/polizas/docs", (val) =>
      setDocSlots((s) => ({ ...s, [key]: val }))
    );

  // ==== Lógica central de creación ====
  const createPoliza = async () => {
    if (!clienteId) return toast.error("Falta clienteId para asociar la póliza");

    try {
      setSaving(true);

      const fechaEmision = poliza.fecha_emision || ymdLocal(new Date());
      const fechaVencimientoFinal =
        poliza.primer_vencimiento || addMonthsLocal(fechaEmision, 1);

      const payload = {
        cliente_id: Number(clienteId),
        compania: poliza.compania.trim(),

        // ✅ Si viene número, lo mandamos. Si no, dejamos que el backend lo genere.
        numero_poliza: poliza.numero_poliza.trim() || undefined,

        cobertura: normalizeCobertura(poliza.cobertura),
        oficina: poliza.oficina.trim(),
        patente: poliza.patente.trim().toUpperCase(),
        marca: poliza.marca.trim(),
        modelo: poliza.modelo.trim(),
        anio: Number(poliza.anio),
        tipo: poliza.tipo || "Auto",

        // ⬇️ Si hay precio cargado, lo mandamos; si no, dejamos que el backend lo ponga en 0 / default
        precio_cuota:
          poliza.generar_cuotas_ahora &&
          String(poliza.precio_cuota).trim()
            ? Number(poliza.precio_cuota)
            : undefined,

        cantidad_cuotas_override: poliza.cantidad_cuotas_override
          ? Number(poliza.cantidad_cuotas_override)
          : undefined,
        generar_cuotas_ahora: !!poliza.generar_cuotas_ahora,
        regenerar_cuotas: false,

        fecha_emision: fechaEmision,
        primer_vencimiento: poliza.primer_vencimiento,
        dias_a_vencer: Number(poliza.dias_a_vencer) || 30,

        // compat backend
        primer_pago: fechaEmision,
        fecha_vencimiento: fechaVencimientoFinal,
      };

      // ==== FOTOS (vehículo) ====
      const seenFotoPid = new Set();
      const seenFotoUrl = new Set();
      const fotosPayload = {};

      FOTO_SLOTS.forEach(({ key }) => {
        const s = fotoSlots[key];
        if (!s?.url || !isHttpUrl(s.url)) return;

        const sendKey = key;
        if (!ALLOWED_FOTO_KEYS_POLIZA.has(sendKey)) return;

        const pid = s.public_id || "";
        const url = s.url;
        if ((pid && seenFotoPid.has(pid)) || seenFotoUrl.has(url)) return;

        fotosPayload[sendKey] = { url, public_id: pid };
        if (pid) seenFotoPid.add(pid);
        seenFotoUrl.add(url);
      });

      // ==== DOCUMENTOS (vehículo) ====
      const seenDocPid = new Set();
      const seenDocUrl = new Set();
      const docsPayload = {};

      Object.entries(docSlots || {}).forEach(([key, s]) => {
        if (!s?.url || !isHttpUrl(s.url)) return;
        const pid = s.public_id || "";
        const url = s.url;
        if ((pid && seenDocPid.has(pid)) || seenDocUrl.has(url)) return;

        docsPayload[key] = {
          url,
          public_id: pid,
          mime: s.mime || guessMime(s?.file?.name || ""),
          nombre: key,
        };
        if (pid) seenDocPid.add(pid);
        seenDocUrl.add(url);
      });

      if (Object.keys(fotosPayload).length) {
        payload.fotos = fotosPayload;
      }
      if (Object.keys(docsPayload).length) {
        payload.documentos = docsPayload;
      }

      console.debug("[PolizaCreateModal] POST /api/polizas/ payload:", payload);

      const raw = await PolizasAPI.create(payload);

      const primeraCuotaId =
        raw?.primera_cuota_id ??
        raw?.cuota_id ??
        raw?.cuota?.id ??
        raw?.cuotas?.[0]?.id ??
        raw?.poliza?.cuotas?.[0]?.id ??
        null;

      const polizaIdResp =
        raw?.id ?? raw?.poliza_id ?? raw?.poliza?.id ?? null;
      const clienteIdResp =
        raw?.cliente_id ?? (clienteId ? Number(clienteId) : null);

      toast.success("Póliza creada y asociada al cliente");

      onSuccess?.({
        primera_cuota_id: primeraCuotaId,
        telefono: raw?.cliente?.telefono ?? "",
        precio_cuota: raw?.precio_cuota ?? poliza?.precio_cuota ?? "",
        poliza_id: polizaIdResp,
        cliente_id: clienteIdResp,
        raw,
      });

      onClose?.();
    } catch (e) {
      console.error(
        "[PolizaCreateModal] Error creando póliza:",
        e?.message,
        e?.payload
      );
      const msg = e?.message || "No se pudo crear la póliza";
      const lines = firstFieldErrors(e?.payload);
      if (lines.length) lines.slice(0, 6).forEach((ln) => toast.error(ln));
      else toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ==== Submit (sin ConfirmModal, solo visual) ====
  const onSubmit = async () => {
    if (!canSubmit) {
      if (Object.keys(baseErrors).length) {
        toast.error("Revisá los datos de la póliza");
      } else {
        toast.error("No se puede crear la póliza");
      }
      return;
    }

    // Si querés, podés dejar un toast informativo:
    // if (docsFotosError) toast((t) => docsFotosError, { icon: "⚠️" });

    await createPoliza();
  };

  // Bloquear scroll fondo + reset de paso al abrir
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setStep(1); // siempre empieza en datos
    return () => (document.body.style.overflow = prev);
  }, [isOpen]);

  const coberturasOpts = useMemo(() => {
    const src =
      Array.isArray(coberturas) && coberturas.length
        ? coberturas
        : [
            "A",
            "A + GRUA",
            "B",
            "B1",
            "C",
            "C+",
            "C MÁXIMA",
            "C FRANQUICIA",
          ];
    const asObjects = src.map((op) =>
      typeof op === "string" ? { id: op, nombre: op } : op
    );
    const seen = new Set();
    const out = [];
    for (const op of asObjects) {
      const key = String(op?.id ?? op?.nombre ?? "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ id: key, nombre: op?.nombre ?? key });
    }
    return out;
  }, [coberturas]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-[95%] max-w-5xl overflow-hidden"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Crear póliza"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nueva póliza
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Paso {step} de 2 ·{" "}
                  {step === 1
                    ? "Datos de póliza y vehículo"
                    : "Fotos y documentación"}
                </p>
              </div>
              <button
                ref={closeBtnRef}
                onClick={() => !saving && onClose?.()}
                disabled={saving}
                className="h-10 px-3 rounded-lg bg-black/5 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            {/* Cuerpo */}
            <div className="px-4 py-4 space-y-4">
              {step === 1 && (
                <PolizaStep
                  polizaModo={"nueva"}
                  setPolizaModo={() => {}}
                  polizaId={""}
                  setPolizaId={() => {}}
                  poliza={poliza}
                  setPoliza={setPoliza}
                  sinNumero={sinNumero}
                  setSinNumero={setSinNumero}
                  companias={companias}
                  coberturas={coberturasOpts}
                  setTocoCantidadCuotas={setTocoCantidadCuotas}
                />
              )}

              {step === 2 && (
                <div className="mt-2 rounded-2xl border border-gray-200/10 bg-[#0b0f1e] text-white p-3">
                  {/* Mini resumen arriba para contexto */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
                    <span>
                      Cobertura:{" "}
                      <strong className="font-semibold">
                        {poliza.cobertura || "-"}
                      </strong>
                    </span>
                    <span>
                      Patente:{" "}
                      <strong className="font-semibold">
                        {poliza.patente?.toUpperCase() || "-"}
                      </strong>
                    </span>
                  </div>

                  <ImagenesDocsStep
                    MAX_FOTOS={MAX_FOTOS}
                    fotoSlotDefs={FOTO_SLOTS}
                    fotoSlots={fotoSlots}
                    setFotoSlots={setFotoSlots}
                    docSlotDefs={DOC_SLOTS}
                    docSlots={docSlots}
                    setDocSlots={setDocSlots}
                    onUploadFotoVehiculo={onUploadFotoVehiculo}
                    onUploadDocVehiculo={onUploadDocVehiculo}
                    coverageRuleKey={isA ? "A" : isAGrua ? "A_GRUA" : "OTRAS"}
                  />

                  {docsFotosError && (
                    <p className="mt-2 text-sm text-amber-300">
                      {docsFotosError} (se puede crear igual).
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {step === 1 && !canGoToFotos && (
                  <span>
                    Completá los datos básicos de la póliza para continuar con
                    las fotos.
                  </span>
                )}
                {step === 2 && docsFotosError && (
                  <span>{docsFotosError}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => !saving && onClose?.()}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-60"
                >
                  Cancelar
                </button>

                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-60"
                  >
                    Volver a datos
                  </button>
                )}

                {step === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canGoToFotos) {
                        toast.error(
                          "Completá los datos de la póliza antes de seguir"
                        );
                        return;
                      }
                      setStep(2);
                    }}
                    disabled={!canGoToFotos || saving}
                    className="px-4 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Continuar a fotos
                  </button>
                )}

                {step === 2 && (
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!canSubmit}
                    className="px-4 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? "Creando…" : "Crear póliza"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PolizaCreateModal;
