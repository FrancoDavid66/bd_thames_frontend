// src/components/polizas/PolizaCreateModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOfficeBuilding, HiCheck, HiX } from "react-icons/hi"; 
import toast from "react-hot-toast";

// 🚀 USAMOS LA INSTANCIA DE API SEGURA (Ya maneja los tokens)
import api from "../../services/api"; 

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";

import PolizaStep from "../solicitudes/modalcreate/PolizaStep";
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

// ✅ Mapeo humano → enum
const COBERTURA_MAP = {
  A: "A",
  "A + GRUA": "A_GRUA",
  B: "B",
  B1: "B1",
  C: "C",
  C1: "C1",
  "C+": "C1",
  "C +": "C1",
  "C TOTAL": "C_TOTAL",
  "C MAXIMA": "C_TOTAL",
  "C MÁXIMA": "C_TOTAL",
  "C FRANQUICIA": "C_FRANQUICIA",
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

// Slots docs/fotos
const DOC_SLOT_RC = [{ key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }];
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

const ALLOWED_FOTO_KEYS_POLIZA = new Set([
  "PATENTE", "FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "INTERIOR", "RUEDA_AUXILIO", "TUBO_GNC",
]);

const guessMime = (name = "") => name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg";

const PolizaCreateModal = ({ isOpen, onClose, onSuccess, clienteId }) => {
  const { user } = useAuth();
  
  // 🚀 ESTADOS NUEVOS PARA LOS CATÁLOGOS DINÁMICOS
  const [companiasList, setCompaniasList] = useState([]);
  const [coberturasList, setCoberturasList] = useState([]);
  const [planesPagoList, setPlanesPagoList] = useState([]); // 🚀 NUEVO ESTADO PARA PLANES

  const [step, setStep] = useState(1);
  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);

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
    plan_pago: "", // 🚀 NUEVO: Plan de pago seleccionado
    primer_vencimiento: "",
    fecha_emision: ymdLocal(new Date()),
    dias_a_vencer: 30,
    generar_cuotas_ahora: true,
  });

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  // 🚀 Carga de Catálogos al abrir el modal (Apuntando exactamente a donde guarda el Catálogo)
  useEffect(() => {
    if (isOpen) {
      // 1. Cargar Compañias
      api.get("companias/")
        .then(res => {
          const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
          const objs = arr.filter(c => c.activa).map(c => ({ id: c.nombre, nombre: c.nombre }));
          setCompaniasList(objs);
        })
        .catch((e) => console.warn("No se pudieron cargar las compañías dinámicas.", e));

      // 2. Cargar Coberturas
      api.get("coberturas/")
        .then(res => {
          const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
          const objs = arr.filter(c => c.activa).map(c => ({ id: c.nombre, nombre: c.nombre }));
          setCoberturasList(objs);
        })
        .catch((e) => console.warn("No se pudieron cargar las coberturas dinámicas.", e));

      // 🚀 3. NUEVO: Cargar Planes de Pago
      api.get("planes-pago/")
        .then(res => {
          const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
          setPlanesPagoList(arr.filter(p => p.activa));
        })
        .catch((e) => console.warn("No se pudieron cargar los planes de pago dinámicos.", e));

      // 4. Cargar Oficinas (Si es Admin)
      if (isWebAdmin) {
        setLoadingOficinas(true);
        PolizasAPI.listOficinas()
          .then(res => setOficinas(Array.isArray(res) ? res : res.results || []))
          .catch(() => toast.error("Error al cargar sucursales"))
          .finally(() => setLoadingOficinas(false));

        // 🚀 AUTO-ASIGNAR SUCURSAL DEL CLIENTE SI ESTAMOS ASOCIANDO
        if (clienteId) {
          api.get(`clientes/${clienteId}/`).then(res => {
            const clientOfi = res.data?.oficina || res.data?.oficina_id;
            const ofiId = typeof clientOfi === 'object' ? clientOfi?.id : clientOfi;
            if (ofiId) {
              setPoliza(prev => ({ ...prev, oficina: String(ofiId) }));
            }
          }).catch(err => console.warn("No se pudo autocompletar la sucursal del cliente", err));
        }
      } else if (user?.perfil?.oficina) {
        const ofiId = user.perfil.oficina.id || user.perfil.oficina;
        setPoliza(prev => ({ ...prev, oficina: String(ofiId) }));
      }
    }
  }, [isOpen, user, isWebAdmin, clienteId]);

  const [sinNumero, setSinNumero] = useState(false);
  const [tocoCantidadCuotas, setTocoCantidadCuotas] = useState(false);
  const [saving, setSaving] = useState(false);

  const coberturaNorm = normalizeCobertura(poliza.cobertura || "");
  const isA = coberturaNorm === "A";
  const isAGrua = coberturaNorm === "A_GRUA";

  const FOTO_SLOTS = isA ? [] : isAGrua ? FOTO_SLOTS_A_GRUA : FOTO_SLOTS_FULL;
  const DOC_SLOTS = isA ? DOC_SLOT_RC : isAGrua ? DOC_SLOT_A_GRUA : DOC_SLOT_FULL;

  const [fotoSlots, setFotoSlots] = useState({});
  const [docSlots, setDocSlots] = useState(() => Object.fromEntries(DOC_SLOTS.map(({ key }) => [key, null])));

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
  }, [coberturaNorm]);

  useEffect(() => {
    if (!poliza.fecha_emision) return;
    setPoliza((s) => ({ ...s, primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1) }));
  }, [poliza.fecha_emision]);

  // Si cambia la compañía, limpiamos el plan de pago por defecto para obligarlo a elegir uno válido
  useEffect(() => {
    const raw = (poliza.compania || "").trim();
    setPoliza(s => ({ ...s, plan_pago: "" })); // 🚀 NUEVO: Reset de plan
    if (!raw || tocoCantidadCuotas) return;
    const key = rmDiacritics(raw).toLowerCase();
    const cant = COMPANY_CUOTAS_DEFAULT[key];
    if (cant) setPoliza((s) => ({ ...s, cantidad_cuotas_override: String(cant) }));
  }, [poliza.compania, tocoCantidadCuotas]);

  const baseErrors = useMemo(() => {
    const e = {};
    if (!poliza.compania.trim()) e.compania = "Requerido";
    if (!poliza.cobertura.trim()) e.cobertura = "Requerido";
    if (!poliza.oficina.trim()) e.oficina = "Requerido";
    if (!poliza.patente.trim()) e.patente = "Requerido";
    if (!poliza.marca.trim()) e.marca = "Requerido";
    if (!poliza.modelo.trim()) e.modelo = "Requerido";
    if (!String(poliza.anio).trim()) e.anio = "Requerido";
    if (!poliza.primer_vencimiento) e.primer_vencimiento = "Requerido";
    if (!poliza.fecha_emision) e.fecha_emision = "Requerido";
    return e;
  }, [poliza]);

  const canGoToFotos = useMemo(() => Object.keys(baseErrors).length === 0, [baseErrors]);

  const docsFotosError = useMemo(() => {
    let requiredDocs = ["CEDULA_VERDE_FRENTE"];
    let requiredFotos = (coberturaNorm === "A") ? [] : ["FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA"];
    if (coberturaNorm === "A_GRUA") requiredDocs.push("VTV");

    const docKeysAvailable = new Set(DOC_SLOTS.map((d) => d.key));
    const fotoKeysAvailable = new Set(FOTO_SLOTS.map((f) => f.key));

    const missingDocs = requiredDocs.filter(k => docKeysAvailable.has(k) && !docSlots?.[k]?.url);
    const missingFotos = requiredFotos.filter(k => fotoKeysAvailable.has(k) && !fotoSlots?.[k]?.url);

    if (!missingDocs.length && !missingFotos.length) return "";
    const parts = [];
    if (missingDocs.length) parts.push(`docs: ${missingDocs.join(", ")}`);
    if (missingFotos.length) parts.push(`fotos: ${missingFotos.join(", ")}`);
    return `Faltan cargar ${parts.join(" y ")}`;
  }, [coberturaNorm, DOC_SLOTS, FOTO_SLOTS, docSlots, fotoSlots]);

  const canSubmit = useMemo(() => !saving && Object.keys(baseErrors).length === 0, [baseErrors, saving]);

  async function handleUploadToSlot(file, folder, setter) {
    if (!file) return;
    const _mime = file.type || guessMime(file.name || "");
    try {
      const up = await uploadToCloudinary(file, { folder });
      setter({ file, url: up.secure_url, public_id: up.public_id, mime: _mime });
      toast.success("Subido");
    } catch { toast.error("No se pudo subir el archivo"); }
  }

  const onUploadFotoVehiculo = (file, key) => handleUploadToSlot(file, "de-thames/polizas/fotos", (val) => setFotoSlots((s) => ({ ...s, [key]: val })));
  const onUploadDocVehiculo = (file, key) => handleUploadToSlot(file, "de-thames/polizas/docs", (val) => setDocSlots((s) => ({ ...s, [key]: val })));

  const createPoliza = async () => {
    if (!clienteId) return toast.error("Falta clienteId");
    try {
      setSaving(true);
      const payload = {
        cliente_id: Number(clienteId),
        compania: poliza.compania.trim(),
        numero_poliza: poliza.numero_poliza.trim() || undefined,
        cobertura: normalizeCobertura(poliza.cobertura),
        oficina: poliza.oficina.trim(),
        patente: poliza.patente.trim().toUpperCase(),
        marca: poliza.marca.trim(),
        modelo: poliza.modelo.trim(),
        anio: Number(poliza.anio),
        tipo: poliza.tipo || "Auto",
        precio_cuota: poliza.generar_cuotas_ahora && poliza.precio_cuota ? Number(poliza.precio_cuota) : undefined,
        
        // 🚀 NUEVO: Enviamos el ID del Plan de Pago. Si hay plan, Backend ignora cantidad_cuotas_override
        plan_pago: poliza.plan_pago ? Number(poliza.plan_pago) : undefined, 
        cantidad_cuotas_override: poliza.cantidad_cuotas_override ? Number(poliza.cantidad_cuotas_override) : undefined,
        
        generar_cuotas_ahora: !!poliza.generar_cuotas_ahora,
        fecha_emision: poliza.fecha_emision,
        primer_vencimiento: poliza.primer_vencimiento,
        
        primer_pago: poliza.primer_vencimiento,

        dias_a_vencer: Number(poliza.dias_a_vencer) || 30,

        // 🚀 Datos técnicos del vehículo (cargados en el formulario)
        combustible: (poliza.combustible || "").trim(),
        numero_chasis: (poliza.numero_chasis || "").trim().toUpperCase(),
        numero_motor: (poliza.numero_motor || "").trim().toUpperCase(),
        carroceria: (poliza.carroceria || "").trim(),
        observaciones: (poliza.observaciones || "").trim(),
      };

      // FOTOS
      const fotosPayload = {};
      FOTO_SLOTS.forEach(({ key }) => {
        const s = fotoSlots[key];
        if (s?.url && ALLOWED_FOTO_KEYS_POLIZA.has(key)) fotosPayload[key] = { url: s.url, public_id: s.public_id };
      });
      if (Object.keys(fotosPayload).length) payload.fotos = fotosPayload;

      // DOCS
      const docsPayload = {};
      Object.entries(docSlots).forEach(([key, s]) => {
        if (s?.url) docsPayload[key] = { url: s.url, public_id: s.public_id, mime: s.mime, nombre: key };
      });
      if (Object.keys(docsPayload).length) payload.documentos = docsPayload;

      const raw = await PolizasAPI.create(payload);
      toast.success("Póliza creada exitosamente");
      onSuccess?.(raw);
      onClose?.();
    } catch (e) {
      const lines = firstFieldErrors(e?.payload || e?.response?.data);
      if (lines.length) lines.slice(0, 3).forEach(ln => toast.error(ln));
      else toast.error(e?.message || "Error al crear póliza");
    } finally { setSaving(false); }
  };

  const onSubmit = async () => {
    if (!canSubmit) return toast.error("Revisá los datos obligatorios");
    await createPoliza();
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
  }, [isOpen]);

  // 🚀 LECTURA DIRECTA DE BD
  const coberturasOpts = coberturasList;
  const companiasOpts = companiasList;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/50 px-2 sm:px-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="relative bg-white dark:bg-gray-900 rounded-none sm:rounded-2xl shadow-xl w-full sm:w-[95%] sm:max-w-5xl max-h-[100vh] sm:max-h-[90vh] flex flex-col overflow-hidden" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}>
            
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Nueva póliza</h2>
                <p className="text-[11px] text-gray-500">Paso {step} de 2 · {step === 1 ? "Datos generales" : "Media"}</p>
              </div>
              <button onClick={() => !saving && onClose?.()} className="cursor-pointer h-9 px-3 rounded-lg bg-black/5 dark:bg-white/10 text-xs sm:text-sm">Cerrar</button>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {step === 1 && (
                <>
                  {/* SELECTOR DE SUCURSAL PARA EL ADMIN (🚀 SE OCULTA SI ESTÁ HEREDADA DEL CLIENTE) */}
                  {isWebAdmin && !clienteId && (
                    <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 mb-4">
                      <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <HiOfficeBuilding /> Sucursal de Origen (Solo Admin)
                      </label>
                      <select
                        value={poliza.oficina}
                        onChange={(e) => setPoliza({ ...poliza, oficina: e.target.value })}
                        disabled={loadingOficinas}
                        className="cursor-pointer w-full h-11 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 text-sm dark:text-white font-bold outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">— Seleccionar Sucursal —</option>
                        {oficinas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                      {loadingOficinas && <p className="text-[9px] text-sky-400 mt-1 animate-pulse">Cargando sucursales...</p>}
                    </div>
                  )}

                  <PolizaStep
                    polizaModo="nueva"
                    poliza={poliza}
                    setPoliza={setPoliza}
                    sinNumero={sinNumero}
                    setSinNumero={setSinNumero}
                    companias={companiasOpts} 
                    coberturas={coberturasOpts} 
                    planesPago={planesPagoList} // 🚀 NUEVO: Le pasamos la lista completa de planes a PolizaStep
                    setTocoCantidadCuotas={setTocoCantidadCuotas}
                  />
                </>
              )}

              {step === 2 && (
                <div className="rounded-xl border border-white/5 bg-[#0b0f1e] p-4">
                  <div className="mb-4 flex gap-4 text-[11px] text-gray-400 uppercase font-black">
                    <span>Cobertura: <b className="text-white">{poliza.cobertura}</b></span>
                    <span>Patente: <b className="text-white">{poliza.patente}</b></span>
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
                  {docsFotosError && <p className="mt-4 text-xs text-amber-400 font-bold italic">⚠️ {docsFotosError}</p>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 py-3 border-t border-white/10 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div className="text-[10px] text-gray-500 uppercase font-bold">
                {step === 1 && !canGoToFotos && "Completa los campos obligatorios (*)"}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => !saving && onClose?.()} className="cursor-pointer h-10 px-4 text-xs uppercase font-black text-gray-400">Cancelar</button>
                {step === 2 && <button onClick={() => setStep(1)} className="cursor-pointer h-10 px-4 rounded-lg bg-white/5 text-xs uppercase font-black text-white">Atrás</button>}
                {step === 1 ? (
                  <button onClick={() => canGoToFotos && setStep(2)} disabled={!canGoToFotos} className="cursor-pointer h-10 px-6 rounded-lg bg-emerald-600 text-white text-xs uppercase font-black disabled:opacity-30">Continuar</button>
                ) : (
                  <button onClick={onSubmit} disabled={saving} className="cursor-pointer h-10 px-8 rounded-lg bg-sky-500 text-black text-xs uppercase font-black flex items-center gap-2">
                    {saving ? "Procesando..." : <><HiCheck /> Finalizar</>}
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