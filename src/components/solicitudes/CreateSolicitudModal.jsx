// src/components/solicitudes/CreateSolicitudModal.jsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX,
  HiPhotograph,
  HiChevronRight,
  HiChevronLeft,
  HiCheckCircle,
  HiShieldCheck,
  HiUser,
  HiDocumentText,
  HiSparkles,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { solicitudesApi } from "../../services/solicitudes.js";

import ResponsableManagerModal from "./modalcreate/ResponsableManagerModal";
import ClienteStep from "./modalcreate/ClienteStep";
import PolizaStep from "./modalcreate/PolizaStep";
import ImagenesDocsStep from "./modalcreate/ImagenesDocsStep";
import SolicitudStep from "./modalcreate/SolicitudStep";

import { sendAdminNuevaSolicitud } from "../../services/notifications/email";

// Variants para animaciones
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
};

/* =====================   Constantes   ===================== */
const MAX_FOTOS_RAW = import.meta.env.VITE_MAX_FOTOS;
const MAX_FOTOS = MAX_FOTOS_RAW === "0" || MAX_FOTOS_RAW === 0 ? 0 : Number(MAX_FOTOS_RAW || 12);

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
  const y = base.getFullYear(), m0 = base.getMonth(), d = base.getDate();
  const tMon = m0 + months, y2 = y + Math.floor(tMon / 12), m2 = ((tMon % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(y2, m2), day2 = Math.min(d, maxDay);
  return ymdLocal(new Date(y2, m2, day2, 12, 0, 0, 0));
}

const DOC_SLOT_RC = [ { key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }, { key: "CEDULA_VERDE_DORSO", label: "Cédula verde (dorso)" } ];
const DOC_SLOT_A_GRUA = [ { key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }, { key: "CEDULA_VERDE_DORSO", label: "Cédula verde (dorso)" } ];
const DOC_SLOT_FULL = [ { key: "CEDULA_VERDE_FRENTE", label: "Cédula verde (frente)" }, { key: "CEDULA_VERDE_DORSO", label: "Cédula verde (dorso)" }, { key: "TITULO", label: "Título del vehículo" }, { key: "OBLEA_GNC", label: "Oblea GNC" } ];
const FOTO_SLOTS_FULL = [ { key: "FRENTE", label: "Frente" }, { key: "LATERAL_IZQ", label: "Lateral izq." }, { key: "LATERAL_DER", label: "Lateral der." }, { key: "TRASERA", label: "Trasera" }, { key: "PATENTE", label: "Patente" }, { key: "TUBO_GNC", label: "Equipo GNC" } ];
const FOTO_SLOTS_A_GRUA = [ { key: "FRENTE", label: "Frente" }, { key: "LATERAL_IZQ", label: "Lateral izq." }, { key: "LATERAL_DER", label: "Lateral der." }, { key: "TRASERA", label: "Trasera" }, { key: "PATENTE", label: "Patente" } ];
const TIPO_DNI_SLOTS = [ { key: "DNI_FRENTE", label: "DNI frente" }, { key: "DNI_DORSO", label: "DNI dorso" } ];

const ALLOWED_FOTO_KEYS_SOLICITUD = new Set(["PATENTE", "FRENTE", "LATERAL_IZQ", "LATERAL_DER", "TRASERA", "EQUIPO_GNC", "OBLEA_GNC"]);

const rmDiacritics = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const guessMime = (name = "") => (name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
function normalizaTelefonoAR(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("15") && d.length >= 10) d = d.slice(2);
  return d;
}

/* =====================   Componente   ===================== */
export default function CreateSolicitudModal({
  onClose,
  companias = [],
  coberturas = [],
  oficinas = [], // 🚀 AHORA RECIBE LAS OFICINAS DEL PADRE
  onCreated,
  skipResponsableGate = false,
  initialResponsableId = "",
  initialTipoSeguro = "ROBO",
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const [step, setStep] = useState(1);
  const [askResponsable, setAskResponsable] = useState(true);
  const [responsableId, setResponsableId] = useState("");

  useEffect(() => {
    if (skipResponsableGate && initialResponsableId) {
      setResponsableId(String(initialResponsableId));
      setAskResponsable(false);
    } else {
      setAskResponsable(true);
    }
  }, [skipResponsableGate, initialResponsableId]);

  const [clienteModo, setClienteModo] = useState("nuevo");
  const [clienteId, setClienteId] = useState("");
  const [cliente, setCliente] = useState({ nombre: "", apellido: "", telefono: "", email: "", dni_cuit_cuil: "", direccion: "", localidad: "" });
  const [dniSlots, setDniSlots] = useState({ DNI_FRENTE: null, DNI_DORSO: null });

  const [polizaModo, setPolizaModo] = useState("nueva");
  const [polizaId, setPolizaId] = useState("");
  const [poliza, setPoliza] = useState({ compania: "", numero_poliza: "", cobertura: "", oficina: "", patente: "", marca: "", modelo: "", anio: "", tipo: "Auto", precio_cuota: "", cantidad_cuotas_override: "", primer_vencimiento: "", fecha_emision: ymdLocal(new Date()), dias_a_vencer: 30, generar_cuotas_ahora: true });

  useEffect(() => {
    if (!isWebAdmin && user?.perfil?.oficina) {
      setPoliza(prev => ({ ...prev, oficina: String(user.perfil.oficina) }));
    }
  }, [isWebAdmin, user]);

  const [sinNumero, setSinNumero] = useState(false);
  const [tocoCantidadCuotas, setTocoCantidadCuotas] = useState(false);

  useEffect(() => {
    if (!poliza.fecha_emision) return;
    setPoliza((s) => ({ ...s, primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1) }));
  }, [poliza.fecha_emision]);

  useEffect(() => {
    const COMPANY_CUOTAS = { agrosalta: 6, "federacion patronal": 6, "federación patronal": 6, atm: 4, equidad: 3, nre: 3, providencia: 3 };
    const raw = (poliza.compania || "").trim();
    if (!raw || tocoCantidadCuotas) return;
    const key = rmDiacritics(raw).toLowerCase();
    const cant = COMPANY_CUOTAS[key];
    if (cant) setPoliza((s) => ({ ...s, cantidad_cuotas_override: String(cant) }));
  }, [poliza.compania, tocoCantidadCuotas]);

  const cuotasPreview = useMemo(() => {
    const count = Number(poliza.cantidad_cuotas_override || 12);
    const first = poliza.primer_vencimiento;
    if (!first || !count || count < 1) return [];
    return Array.from({ length: count }, (_, i) => ({ nro: i + 1, fecha: addMonthsLocal(first, i), monto: 0 }));
  }, [poliza.cantidad_cuotas_override, poliza.primer_vencimiento]);

  const [solicitud, setSolicitud] = useState({ prioridad: "NORMAL", observaciones: "", tipoSeguro: initialTipoSeguro });

  const coberturaNorm = String(poliza.cobertura || "").trim().toUpperCase();
  const isA = coberturaNorm === "A";
  const isAGrua = coberturaNorm.includes("A") && coberturaNorm.includes("GRUA");

  const FOTO_SLOTS = isA ? [] : isAGrua ? FOTO_SLOTS_A_GRUA : FOTO_SLOTS_FULL;
  const DOC_SLOTS = isA ? DOC_SLOT_RC : isAGrua ? DOC_SLOT_A_GRUA : DOC_SLOT_FULL;

  const [fotoSlots, setFotoSlots] = useState({});
  const [docSlots, setDocSlots] = useState(Object.fromEntries(DOC_SLOTS.map(({ key }) => [key, null])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextDocKeys = new Set(DOC_SLOTS.map((d) => d.key));
    setDocSlots((prev) => { const out = {}; for (const k of nextDocKeys) out[k] = prev?.[k] || null; return out; });
    const nextFotoKeys = new Set(FOTO_SLOTS.map((f) => f.key));
    setFotoSlots((prev) => { const out = {}; for (const k of nextFotoKeys) out[k] = prev?.[k] || null; return out; });
  }, [coberturaNorm]);

  const paso1Errors = useMemo(() => {
    const e = {};
    if (clienteModo === "existente") { if (!String(clienteId).trim()) e.clienteId = "ID requerido"; return e; }
    if (!cliente.nombre.trim()) e.nombre = "Requerido";
    if (!cliente.apellido.trim()) e.apellido = "Requerido";
    if (!cliente.telefono.trim()) e.telefono = "Requerido";
    return e;
  }, [clienteModo, cliente, clienteId]);

  const paso2Errors = useMemo(() => {
    const e = {};
    if (polizaModo === "existente") { if (!String(polizaId).trim()) e.polizaId = "ID requerido"; return e; }
    if (!poliza.compania.trim()) e.compania = "Requerido";
    if (!poliza.cobertura.trim()) e.cobertura = "Requerido";
    if (!poliza.oficina.trim()) e.oficina = "Requerido";
    if (!poliza.patente.trim()) e.patente = "Requerido";
    if (!poliza.marca.trim()) e.marca = "Requerido";
    if (!poliza.modelo.trim()) e.modelo = "Requerido";
    if (!String(poliza.anio).trim()) e.anio = "Requerido";
    if (!poliza.primer_vencimiento) e.primer_vencimiento = "Requerido";
    return e;
  }, [polizaModo, poliza, polizaId]);

  const responsableOk = Boolean(String(responsableId).trim());
  const canNext1 = Object.keys(paso1Errors).length === 0;
  const canNext2 = Object.keys(paso2Errors).length === 0;
  const canSubmit = responsableOk && canNext1 && canNext2 && !saving;

  const goToStep = (target) => {
    if (target === step) return;
    if (askResponsable) return toast.error("Elegí el responsable antes de continuar.");
    if (target >= 2 && !canNext1) return toast.error("Completá los datos del cliente");
    if (target >= 3 && !canNext2) return toast.error("Revisá los datos de la póliza");
    setStep(target);
  };

  async function handleUploadToSlot(file, folder, setter) {
    if (!file) return;
    const _mime = file.type || (file.name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    try {
      const up = await uploadToCloudinary(file, { folder });
      setter({ file, url: up.secure_url, public_id: up.public_id, mime: _mime });
      toast.success("Subido");
    } catch { toast.error("No se pudo subir el archivo"); }
  }
  const onUploadDNI = (file, key) => handleUploadToSlot(file, "de-thames/clientes/dni", (val) => setDniSlots((s) => ({ ...s, [key]: val })));
  const onUploadFotoVehiculo = (file, key) => handleUploadToSlot(file, "de-thames/solicitudes/fotos", (val) => setFotoSlots((s) => ({ ...s, [key]: val })));
  const onUploadDocVehiculo = (file, key) => handleUploadToSlot(file, "de-thames/solicitudes/docs", (val) => setDocSlots((s) => ({ ...s, [key]: val })));

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = { 
        cliente: {}, poliza: {}, solicitud: {}, fotos: {}, documentos: {}, cliente_fotos: {},
        oficina: poliza.oficina ? Number(poliza.oficina) : null
      };
      
      const dniFrUrl = dniSlots.DNI_FRENTE?.url || null;
      const dniFrPid = dniSlots.DNI_FRENTE?.public_id || "";
      const dniDoUrl = dniSlots.DNI_DORSO?.url || null;
      const dniDoPid = dniSlots.DNI_DORSO?.public_id || "";

      if (clienteModo === "existente") {
        payload.cliente = { modo: "existente", id: Number(clienteId) };
      } else {
        payload.cliente = {
          modo: "nuevo", nombre: cliente.nombre.trim(), apellido: cliente.apellido.trim(), telefono: normalizaTelefonoAR(cliente.telefono), email: cliente.email || null, dni_cuit_cuil: (cliente.dni_cuit_cuil || "").trim(), direccion: (cliente.direccion || "").trim(), localidad: (cliente.localidad || "").trim(),
        };
      }

      if (dniFrUrl) payload.cliente_fotos.DNI_FRENTE = { url: dniFrUrl, public_id: dniFrPid };
      if (dniDoUrl) payload.cliente_fotos.DNI_DORSO = { url: dniDoUrl, public_id: dniDoPid };

      if (polizaModo === "existente") {
        payload.poliza = { modo: "existente", id: Number(polizaId) };
      } else {
        payload.poliza = {
          modo: "nueva", compania: poliza.compania.trim(), cobertura: poliza.cobertura.trim(), 
          oficina: poliza.oficina ? Number(poliza.oficina) : null,
          patente: poliza.patente.trim().toUpperCase(), marca: poliza.marca.trim(), modelo: poliza.modelo.trim(), 
          anio: Number(poliza.anio), tipo: poliza.tipo || "Auto", precio_cuota: 0, 
          cantidad_cuotas_override: poliza.cantidad_cuotas_override ? Number(poliza.cantidad_cuotas_override) : undefined, 
          primer_vencimiento: poliza.primer_vencimiento, fecha_emision: poliza.fecha_emision || ymdLocal(new Date()), 
          dias_a_vencer: Number(poliza.dias_a_vencer) || 30, generar_cuotas_ahora: !!poliza.generar_cuotas_ahora, regenerar_cuotas: false,
        };
      }

      payload.solicitud = { responsable_empleado: Number(responsableId), responsable: "", prioridad: solicitud.prioridad || "NORMAL", observaciones: (solicitud.observaciones || "").trim(), motivo: "ALTA_POLIZA", tipoSeguro: solicitud.tipoSeguro || "ROBO" };

      FOTO_SLOTS.forEach(({ key }) => {
        const s = fotoSlots[key];
        if (!s?.url) return;
        const sendKey = key === "TUBO_GNC" ? "EQUIPO_GNC" : key;
        if (ALLOWED_FOTO_KEYS_SOLICITUD.has(sendKey)) payload.fotos[sendKey] = { url: s.url, public_id: s.public_id };
      });

      Object.entries(docSlots || {}).forEach(([key, s]) => {
        if (!s?.url) return;
        payload.documentos[key] = { url: s.url, public_id: s.public_id, mime: s.mime || guessMime(s?.file?.name || ""), nombre: key };
      });

      const raw = await solicitudesApi.crearCompleto(payload);
      toast.success("Solicitud creada con éxito");

      try {
        await sendAdminNuevaSolicitud({
          aviso: "Nueva solicitud creada",
          fecha_hora: new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
          cliente_nombre_apellido: `${cliente.nombre} ${cliente.apellido}`.trim(),
          cliente_dni: cliente.dni_cuit_cuil,
          auto_marca: poliza.marca,
          auto_modelo: poliza.modelo,
          auto_anio: poliza.anio,
          poliza_cobertura: poliza.cobertura,
          poliza_compania: poliza.compania,
        });
      } catch (err) { console.warn("Email alert falló", err); }

      if (onCreated) onCreated(raw);
      onClose();
    } catch (e) {
      toast.error(e?.message || "Error al crear la solicitud");
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  // 🚀 AHORA EL HEADER BUSCA EL NOMBRE DE LA LISTA DINÁMICA DE OFICINAS
  const selectedOficinaObj = oficinas.find((o) => String(o.id) === String(poliza.oficina));
  const headerOficinaName = isWebAdmin 
    ? (selectedOficinaObj ? selectedOficinaObj.nombre : "SELECCIONANDO SUCURSAL...") 
    : (user?.perfil?.oficina_nombre || "Local");

  return (
    <div className="fixed inset-0 z-[90] overscroll-contain touch-pan-y">
      <div className={`absolute inset-0 ${saving ? "cursor-wait" : "cursor-pointer"} bg-black/70 backdrop-blur-sm`} onClick={() => !saving && onClose?.()} />

      {isWebAdmin && askResponsable && !poliza.oficina && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0f19]/90 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} 
            className="bg-[#0f0c28] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                <HiShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Modo Administrador</h3>
                <p className="text-xs text-white/50">¿Para qué sucursal es esta solicitud?</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {oficinas.map(o => (
                <button 
                  key={o.id}
                  onClick={() => setPoliza(p => ({...p, oficina: String(o.id)}))}
                  className="px-4 py-3.5 rounded-xl bg-white/5 hover:bg-sky-500/20 hover:border-sky-500/30 border border-transparent text-white font-semibold text-sm transition-all flex items-center justify-between group"
                >
                  {o.nombre}
                  <HiChevronRight className="text-white/20 group-hover:text-sky-400 transition-colors" />
                </button>
              ))}
              {oficinas.length === 0 && (
                <p className="text-xs text-center text-white/40 italic py-4">No hay sucursales cargadas en el sistema.</p>
              )}
            </div>
            <button onClick={onClose} className="mt-6 w-full px-4 py-3 rounded-xl bg-white/5 text-white/50 hover:text-white/90 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all">
              Cancelar creación
            </button>
          </motion.div>
        </div>
      )}

      <motion.div
        variants={modalVariants} initial="initial" animate="animate" exit="exit"
        className="relative w-full max-w-5xl h-[95vh] sm:h-auto mx-auto mt-[2.5vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-[#0b0f1e]"
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0f0c28]/80 backdrop-blur px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2 text-lg">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"><HiSparkles /></span>
            Crear Solicitud 
            <span className="text-[10px] uppercase bg-white/10 px-2 py-0.5 rounded ml-2 text-white/50">
              {headerOficinaName}
            </span>
            
            {isWebAdmin && poliza.oficina && (
              <button 
                onClick={() => {
                  setPoliza(p => ({...p, oficina: ""}));
                  setResponsableId("");
                  setAskResponsable(true);
                }} 
                className="text-[9px] uppercase font-black bg-sky-500/20 text-sky-400 px-2 py-1 rounded ml-1 hover:bg-sky-500/40 transition-colors"
              >
                Cambiar Sucursal
              </button>
            )}
          </h3>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"><HiX /></button>
        </div>

        <div className="px-4 py-3 bg-white/5 border-b border-white/10 overflow-x-auto no-scrollbar">
           <div className="flex gap-2 min-w-max">
              <StepBadge active={step === 1} done={step > 1} icon={<HiUser />} label="Cliente" onClick={() => goToStep(1)} color="from-emerald-400/20 to-emerald-500/20" />
              <StepBadge active={step === 2} done={step > 2} icon={<HiShieldCheck />} label="Póliza" onClick={() => goToStep(2)} color="from-sky-400/20 to-sky-500/20" />
              <StepBadge active={step === 3} done={step > 3} icon={<HiPhotograph />} label="Imágenes" onClick={() => goToStep(3)} color="from-rose-400/20 to-rose-500/20" />
              <StepBadge active={step === 4} done={false} icon={<HiDocumentText />} label="Resumen" onClick={() => goToStep(4)} color="from-amber-400/20 to-amber-500/20" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 1 && <motion.div key="s1" variants={stepVariants} initial="hidden" animate="visible" exit="exit"><ClienteStep clienteModo={clienteModo} setClienteModo={setClienteModo} clienteId={clienteId} setClienteId={setClienteId} cliente={cliente} setCliente={setCliente} dniSlots={dniSlots} setDniSlots={setDniSlots} TIPO_DNI_SLOTS={TIPO_DNI_SLOTS} onUploadDNI={onUploadDNI} /></motion.div>}
            {step === 2 && <motion.div key="s2" variants={stepVariants} initial="hidden" animate="visible" exit="exit"><PolizaStep polizaModo={polizaModo} setPolizaModo={setPolizaModo} polizaId={polizaId} setPolizaId={setPolizaId} poliza={poliza} setPoliza={setPoliza} sinNumero={sinNumero} setSinNumero={setSinNumero} companias={companias} coberturas={coberturas} oficinas={oficinas} setTocoCantidadCuotas={setTocoCantidadCuotas} cuotasPreview={cuotasPreview} isWebAdmin={isWebAdmin} /></motion.div>}
            {step === 3 && <motion.div key="s3" variants={stepVariants} initial="hidden" animate="visible" exit="exit"><ImagenesDocsStep MAX_FOTOS={MAX_FOTOS} fotoSlotDefs={FOTO_SLOTS} fotoSlots={fotoSlots} setFotoSlots={setFotoSlots} docSlots={docSlots} setDocSlots={setDocSlots} docSlotDefs={DOC_SLOTS} onUploadFotoVehiculo={onUploadFotoVehiculo} onUploadDocVehiculo={onUploadDocVehiculo} /></motion.div>}
            {step === 4 && <motion.div key="s4" variants={stepVariants} initial="hidden" animate="visible" exit="exit"><SolicitudStep responsableNombre={responsableId ? `#${responsableId}` : ""} onCambiarResponsable={() => setAskResponsable(true)} solicitud={solicitud} setSolicitud={setSolicitud} /></motion.div>}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[#0f0c28]/95 backdrop-blur p-4 flex justify-between gap-3">
            <button onClick={onClose} disabled={saving} className="px-6 py-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 font-bold uppercase text-xs transition-all">Cancelar</button>
            <div className="flex gap-2">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold uppercase text-xs transition-all flex items-center gap-2"><HiChevronLeft /> Atrás</button>}
              {step < 4 ? (
                <button onClick={() => goToStep(step + 1)} className="px-8 py-2.5 rounded-xl bg-sky-600 text-white font-bold uppercase text-xs shadow-lg shadow-sky-900/40 transition-all flex items-center gap-2">Siguiente <HiChevronRight /></button>
              ) : (
                <button onClick={onSubmit} disabled={!canSubmit} className="px-10 py-2.5 rounded-xl bg-emerald-600 text-white font-black uppercase text-xs shadow-lg shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50">
                  {saving ? "Procesando..." : "Finalizar Solicitud"}
                </button>
              )}
            </div>
        </div>

        {(!isWebAdmin || poliza.oficina) && (
          <ResponsableManagerModal
            open={askResponsable}
            oficinaId={poliza.oficina} 
            onCancel={() => setAskResponsable(false)}
            onSelected={({ responsableId: selId }) => {
              setResponsableId(String(selId));
              setAskResponsable(false);
              toast.success("Responsable asignado");
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

function StepBadge({ active, done, icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 border transition-all duration-300 min-w-[150px] ${
        active ? `border-white/30 bg-gradient-to-br ${color} text-white shadow-lg` : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10"
      }`}
    >
      <span className={`h-6 w-6 rounded-lg flex items-center justify-center ${active ? 'bg-white/20' : 'bg-white/5'}`}>
        {done ? <HiCheckCircle className="text-emerald-400" /> : icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}