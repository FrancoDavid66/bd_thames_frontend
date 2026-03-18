// src/components/polizas/PolizaCreateModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOfficeBuilding, HiCheck, HiX, HiDocumentText, HiPhotograph, HiCheckCircle } from "react-icons/hi"; 
import toast from "react-hot-toast";

// 🚀 USAMOS LA INSTANCIA DE API SEGURA
import api from "../../services/api"; 
import { useAuth } from "../../context/AuthContext";
import PolizaStep from "../solicitudes/modalcreate/PolizaStep";
import ImagenesDocsStep from "../solicitudes/modalcreate/ImagenesDocsStep";
import { PolizasAPI } from "../../api/polizas";
import { uploadToCloudinary } from "../../utils/cloudinary";

const MAX_FOTOS = Number(import.meta.env.VITE_MAX_FOTOS || 0);

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYMDLocal(s) {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function lastDayOfMonth(y, m0) {
  return new Date(y, m0 + 1, 0).getDate();
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

const rmDiacritics = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const COBERTURA_MAP = {
  A: "A", "A + GRUA": "A_GRUA", B: "B", B1: "B1", C: "C", C1: "C1",
  "C+": "C1", "C +": "C1", "C TOTAL": "C_TOTAL", "C MAXIMA": "C_TOTAL",
  "C MÁXIMA": "C_TOTAL", "C FRANQUICIA": "C_FRANQUICIA",
};

const normalizeCobertura = (v = "") => {
  const k = String(v).trim().toUpperCase();
  if (COBERTURA_MAP[k]) return COBERTURA_MAP[k];
  return k.replace(/\s+/g, "_").replace(/__+/g, "_");
};

const COMPANY_CUOTAS_DEFAULT = { agrosalta: 6, "federacion patronal": 6, "federación patronal": 6, atm: 4, equidad: 3, nre: 3, providencia: 3 };

function firstFieldErrors(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const out = [];
  Object.entries(payload).forEach(([k, v]) => {
    if (k === "detail" || k === "message" || k === "error" || k === "detalle") return;
    const txt = Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : JSON.stringify(v);
    out.push(`${k}: ${txt}`);
  });
  return out;
}

const DOC_SLOT_RC = [{ key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }];
const DOC_SLOT_A_GRUA = [{ key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }, { key: "VTV", label: "VTV" }];
const DOC_SLOT_FULL = [{ key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }, { key: "TITULO", label: "Título del vehículo" }, { key: "OBLEA_GNC", label: "Oblea GNC" }, { key: "VTV", label: "VTV" }, { key: "PERMISO", label: "Permiso" }];
const FOTO_SLOTS_FULL = [{ key: "FRENTE", label: "Frente" }, { key: "LATERAL_IZQ", label: "Lateral izq." }, { key: "LATERAL_DER", label: "Lateral der." }, { key: "TRASERA", label: "Trasera" }, { key: "INTERIOR", label: "Interior" }, { key: "RUEDA_AUXILIO", label: "Rueda de auxilio" }, { key: "TUBO_GNC", label: "Tubo GNC" }];
const FOTO_SLOTS_A_GRUA = [{ key: "FRENTE", label: "Frente" }, { key: "LATERAL_IZQ", label: "Lateral izq." }, { key: "LATERAL_DER", label: "Lateral der." }, { key: "TRASERA", label: "Trasera" }];
const ALLOWED_FOTO_KEYS_POLIZA = new Set(["PATENTE", "FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "INTERIOR", "RUEDA_AUXILIO", "TUBO_GNC"]);

const guessMime = (name = "") => name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg";

const modalVariants = {
  initial: { opacity: 0, scale: 0.9, y: -20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: "easeInOut" } }
};

const PolizaCreateModal = ({ isOpen, onClose, onSuccess, clienteId }) => {
  const { user } = useAuth();
  
  const [companiasList, setCompaniasList] = useState([]);
  const [coberturasList, setCoberturasList] = useState([]);
  const [step, setStep] = useState(1);
  const [oficinas, setOficinas] = useState([]);
  const [loadingOficinas, setLoadingOficinas] = useState(false);

  const [poliza, setPoliza] = useState({
    compania: "", numero_poliza: "", cobertura: "", oficina: "", patente: "", marca: "", modelo: "",
    anio: "", tipo: "Auto", precio_cuota: "", cantidad_cuotas_override: "", primer_vencimiento: "",
    fecha_emision: ymdLocal(new Date()), dias_a_vencer: 30, generar_cuotas_ahora: true,
  });

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  useEffect(() => {
    if (isOpen) {
      // 🚀 LEEMOS DE LA RUTA GLOBAL MAESTRA
      api.get("companias/").then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setCompaniasList(arr.filter(c => c.activa).map(c => ({ id: c.nombre, nombre: c.nombre })));
      }).catch(() => console.warn("No se cargaron compañías."));

      api.get("coberturas/").then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setCoberturasList(arr.filter(c => c.activa).map(c => ({ id: c.nombre, nombre: c.nombre })));
      }).catch(() => console.warn("No se cargaron coberturas."));

      if (isWebAdmin) {
        setLoadingOficinas(true);
        PolizasAPI.listOficinas().then(res => setOficinas(Array.isArray(res) ? res : res.results || []))
          .catch(() => toast.error("Error al cargar sucursales")).finally(() => setLoadingOficinas(false));
      } else if (user?.perfil?.oficina) {
        const ofiId = user.perfil.oficina.id || user.perfil.oficina;
        setPoliza(prev => ({ ...prev, oficina: String(ofiId) }));
      }
    }
  }, [isOpen, user, isWebAdmin]);

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
    setDocSlots((prev) => { const out = {}; for (const k of nextDocKeys) out[k] = prev?.[k] || null; return out; });
    const nextFotoKeys = new Set(FOTO_SLOTS.map((f) => f.key));
    setFotoSlots((prev) => { const out = {}; for (const k of nextFotoKeys) out[k] = prev?.[k] || null; return out; });
  }, [coberturaNorm]);

  useEffect(() => {
    if (!poliza.fecha_emision) return;
    setPoliza((s) => ({ ...s, primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1) }));
  }, [poliza.fecha_emision]);

  useEffect(() => {
    const raw = (poliza.compania || "").trim();
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
        cliente_id: Number(clienteId), compania: poliza.compania.trim(), numero_poliza: poliza.numero_poliza.trim() || undefined,
        cobertura: normalizeCobertura(poliza.cobertura), oficina: poliza.oficina.trim(), patente: poliza.patente.trim().toUpperCase(),
        marca: poliza.marca.trim(), modelo: poliza.modelo.trim(), anio: Number(poliza.anio), tipo: poliza.tipo || "Auto",
        precio_cuota: poliza.generar_cuotas_ahora && poliza.precio_cuota ? Number(poliza.precio_cuota) : undefined,
        cantidad_cuotas_override: poliza.cantidad_cuotas_override ? Number(poliza.cantidad_cuotas_override) : undefined,
        generar_cuotas_ahora: !!poliza.generar_cuotas_ahora, fecha_emision: poliza.fecha_emision, primer_vencimiento: poliza.primer_vencimiento,
        primer_pago: poliza.primer_vencimiento, dias_a_vencer: Number(poliza.dias_a_vencer) || 30,
      };

      const fotosPayload = {};
      FOTO_SLOTS.forEach(({ key }) => {
        const s = fotoSlots[key];
        if (s?.url && ALLOWED_FOTO_KEYS_POLIZA.has(key)) fotosPayload[key] = { url: s.url, public_id: s.public_id };
      });
      if (Object.keys(fotosPayload).length) payload.fotos = fotosPayload;

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 px-2 sm:px-0 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="relative bg-[#030712] rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.7)] w-full sm:w-[95%] sm:max-w-5xl max-h-[100vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-white/5" variants={modalVariants} initial="initial" animate="animate" exit="exit">
            
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#010409]/80 backdrop-blur">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0 shadow-inner">
                    <HiDocumentText className="text-xl" />
                 </div>
                 <div>
                    <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-widest leading-none mb-1.5">Nueva póliza</h2>
                    <p className="text-[10px] font-bold text-sky-400/80 uppercase tracking-wider">Seguro Asociado al Perfil del Cliente</p>
                 </div>
              </div>
              <button onClick={() => !saving && onClose?.()} className="cursor-pointer group h-10 w-10 flex items-center justify-center rounded-full bg-black/30 text-white/50 hover:bg-white/5 hover:text-cyan-400 transition-all border border-white/5 hover:border-cyan-400/20 shadow-inner">
                 <HiX className="text-xl group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-black/10">
              <div className="grid grid-cols-2 gap-4">
                 {[
                    { id: 1, label: "Datos Generales", desc: "Póliza y Vehículo", icon: <HiClipboardList className="text-3xl" />, color: "from-sky-500/20 via-sky-900/10 to-transparent", text: "text-sky-300", border: "border-sky-500/30" },
                    { id: 2, label: "Archivos & Media", desc: "Fotos y Documentos", icon: <HiPhotograph className="text-3xl" />, color: "from-teal-500/20 via-teal-900/10 to-transparent", text: "text-teal-300", border: "border-teal-500/30" }
                 ].map(t => {
                    const isActive = step === t.id;
                    const isDone = step > t.id;
                    return (
                        <div key={t.id} className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-300 ${isActive ? `bg-gradient-to-br ${t.color} ${t.border} scale-[1.01] shadow-2xl` : 'bg-slate-900/40 border-white/5 opacity-60'}`}>
                           <div className="flex items-center gap-4 relative z-10">
                              <div className={`p-3 rounded-2xl ${isActive ? `${t.text} bg-black/30 border ${t.border}` : 'bg-black/10 text-white/30 border border-white/5'}`}>
                                 {isDone ? <HiCheckCircle className="text-3xl text-emerald-400" /> : t.icon}
                              </div>
                              <div>
                                 <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 ${isActive ? t.text : 'text-white/40'}`}>PASO {t.id}</div>
                                 <div className={`text-lg font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-white/60'}`}>{t.label}</div>
                                 <div className={`text-xs ${isActive ? 'text-white/70' : 'text-white/30'}`}>{t.desc}</div>
                              </div>
                           </div>
                           {isActive && <div className="absolute -bottom-2 -right-2 p-4 bg-white/5 rounded-full blur-2xl opacity-50" />}
                        </div>
                    )
                 })}
              </div>

              {step === 1 && (
                <>
                  {isWebAdmin && (
                    <div className="p-5 rounded-3xl bg-sky-500/5 border border-sky-500/10 shadow-inner">
                      <label className="text-[10px] font-black text-sky-400 uppercase tracking-[0.25em] flex items-center gap-2 mb-3">
                        <HiOfficeBuilding /> Sucursal de Origen (Solo Admin)
                      </label>
                      <select
                        value={poliza.oficina}
                        onChange={(e) => setPoliza({ ...poliza, oficina: e.target.value })}
                        disabled={loadingOficinas}
                        className="cursor-pointer w-full h-12 bg-black/40 border border-white/5 rounded-xl px-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-sky-500 transition-all focus:border-sky-500/50"
                      >
                        <option value="" className="bg-slate-900">— Seleccionar Sucursal —</option>
                        {oficinas.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.nombre}</option>)}
                      </select>
                      {loadingOficinas && <p className="text-[9px] text-sky-400 mt-1.5 animate-pulse font-bold">Cargando sucursales...</p>}
                    </div>
                  )}

                  <PolizaStep
                    polizaModo="nueva"
                    poliza={poliza}
                    setPoliza={setPoliza}
                    sinNumero={sinNumero}
                    setSinNumero={setSinNumero}
                    companias={companiasList} 
                    coberturas={coberturasList} 
                    setTocoCantidadCuotas={setTocoCantidadCuotas}
                  />
                </>
              )}

              {step === 2 && (
                <div className="rounded-3xl border border-white/5 bg-black/20 p-5 shadow-inner">
                  <div className="mb-5 flex gap-5 text-[10px] text-white/40 uppercase font-black tracking-widest bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                    <span>Cobertura: <b className="text-white">{poliza.cobertura}</b></span>
                    <span>Patente: <b className="text-cyan-400 font-mono text-xs">{poliza.patente}</b></span>
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
                  {docsFotosError && <p className="mt-5 text-[11px] text-amber-400 font-bold italic bg-amber-950/40 p-3 rounded-xl border border-amber-500/30">⚠️ ATENCIÓN: {docsFotosError}</p>}
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-white/5 flex justify-between items-center bg-[#010409]/80 backdrop-blur">
              <div className="text-[10px] text-rose-400/80 uppercase font-black tracking-wider bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-500/20">
                {step === 1 && !canGoToFotos && "(*) Campos obligatorios"}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => !saving && onClose?.()} className="cursor-pointer h-11 px-5 text-xs uppercase font-black text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all tracking-widest">Cancelar</button>
                {step === 2 && <button onClick={() => setStep(1)} className="cursor-pointer h-11 px-5 rounded-xl bg-white/5 text-xs uppercase font-black text-white hover:bg-white/10 transition-all border border-white/10 tracking-widest">Atrás</button>}
                {step === 1 ? (
                  <button onClick={() => canGoToFotos && setStep(2)} disabled={!canGoToFotos} className="cursor-pointer h-11 px-6 rounded-xl bg-teal-600 text-white text-xs uppercase font-black disabled:opacity-30 tracking-widest hover:bg-teal-500 transition-all shadow-lg shadow-teal-900/30">Continuar Paso 2</button>
                ) : (
                  <button onClick={onSubmit} disabled={saving} className="cursor-pointer h-11 px-8 rounded-xl bg-sky-500 text-black text-xs uppercase font-black flex items-center gap-2.5 transition-all shadow-lg shadow-sky-900/30 tracking-widest hover:bg-sky-400">
                    {saving ? "Procesando..." : <><HiCheck className="text-lg" /> Finalizar</>}
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