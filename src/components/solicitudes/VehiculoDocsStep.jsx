// src/components/solicitudes/CreateSolicitudModal.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiPhotograph, HiChevronRight, HiChevronLeft,
  HiCheckCircle, HiShieldCheck, HiUser, HiDocumentText, HiSparkles,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary.js";
import { solicitudesApi } from "../../api/solicitudes.js";
import { scaleIn } from "../../ux/motion/variants.js";

/* ==== IMPORTS ==== */
import ResponsableManagerModal from "./modalcreate/ResponsableManagerModal";
import ClienteStep from "./modalcreate/ClienteStep";
import PolizaStep from "./modalcreate/PolizaStep";
import VehiculoDocsStep from "./modalcreate/VehiculoDocsStep"; // ⬅️ NUEVO
import SolicitudStep from "./modalcreate/SolicitudStep";

/* === Email (centralizado, sin correo hardcodeado) === */
import { sendAdminNuevaSolicitud } from "../../services/notifications/email.js";

// Definimos variants inline para animaciones profesionales
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.25 } },
};

const headerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
};

const progressBarVariants = {
  initial: { width: "0%" },
  animate: { width: "100%", transition: { duration: 0.4, ease: "easeOut" } },
};

/* =====================  Constantes  ===================== */
const MAX_FOTOS = Number(import.meta.env.VITE_MAX_FOTOS || 0);
const DEFAULT_COBERTURAS = ["A","A + GRUA","B","B1","C","C1","C TOTAL","C FRANQUICIA"];

const COBERTURA_MAP = {
  A: "A", "A + GRUA":"A_GRUA", B:"B", B1:"B1", C:"C", C1:"C1",
  "C TOTAL":"C_TOTAL", "C FRANQUICIA":"C_FRANQUICIA", "C FRANQUISCIA":"C_FRANQUICIA",
};
const normalizeCobertura = (v="")=>{
  const k=String(v).trim().toUpperCase();
  if (COBERTURA_MAP[k]) return COBERTURA_MAP[k];
  return k.replace(/\s+/g,"_").replace(/__+/g,"_");
};
// Reglas UI: A / A_GRUA / OTRAS
const toRuleKey = (human)=>{
  const k = String(human||"").trim().toUpperCase();
  if (k === "A") return "A";
  if (k === "A + GRUA") return "A_GRUA";
  return "OTRAS";
};

// ===== util fechas LOCAL (sin desfase TZ) =====
function ymdLocal(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; }
function parseYMDLocal(s){ const [y,m,d]=String(s||"").split("-").map(Number); if(!y||!m||!d) return null; return new Date(y,m-1,d,12,0,0,0); }
function lastDayOfMonth(y,m0){ return new Date(y,m0+1,0).getDate(); }
function addMonthsLocal(ymd,months){
  const base=parseYMDLocal(ymd); if(!base) return "";
  const y=base.getFullYear(), m0=base.getMonth(), d=base.getDate();
  const tMon=m0+months, y2=y+Math.floor(tMon/12), m2=((tMon%12)+12)%12;
  const maxDay=lastDayOfMonth(y2,m2), day2=Math.min(d,maxDay);
  return ymdLocal(new Date(y2,m2,day2,12,0,0,0));
}

// ===== Slots base =====

// Documentos posibles (catálogo)
const DOC_SLOT_CEDULA_SOLO = [
  { key:"CEDULA_VERDE_FRENTE", label:"Cédula verde (frente)"},
];
const DOC_SLOT_RC   = [
  { key:"CEDULA_VERDE_FRENTE", label:"Cédula verde (frente)"},
  { key:"TITULO",             label:"Título del vehículo"},
  { key:"OBLEA_GNC",          label:"Oblea GNC"},
  { key:"VTV",                label:"VTV"},
  { key:"PERMISO",            label:"Permiso"},
];
const DOC_SLOT_FULL = DOC_SLOT_RC.slice();

// Fotos posibles (catálogo)
const FOTO_SLOTS_4LADOS = [
  { key:"FRENTE",         label:"Frente" },
  { key:"LATERAL_IZQ",    label:"Lateral izq." },
  { key:"LATERAL_DER",    label:"Lateral der." },
  { key:"TRASERA",        label:"Trasera" },
];
const FOTO_SLOTS_FULL = [
  ...FOTO_SLOTS_4LADOS,
  { key:"INTERIOR",       label:"Interior" },
  { key:"RUEDA_AUXILIO",  label:"Rueda de auxilio" },
  { key:"OBLEA_GNC",      label:"Oblea GNC" }, // se importa como documento en backend
  { key:"TUBO_GNC",       label:"Tubo GNC" },  // alias a EQUIPO_GNC
];

const TIPO_DNI_SLOTS = [
  { key:"DNI_FRENTE", label:"DNI frente" },
  { key:"DNI_DORSO",  label:"DNI dorso"  },
];

// Claves admitidas por backend en “fotos” (importación a Poliza)
const ALLOWED_FOTO_KEYS_SOLICITUD = new Set([
  "PATENTE","FRENTE","LATERAL_IZQ","LATERAL_DER","TRASERA","INTERIOR","RUEDA_AUXILIO","OBLEA_GNC","TUBO_GNC",
]);

const rmDiacritics = (s="")=> s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const guessMime = (name="") => (name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
function isHttpUrl(u){ const s=String(u||""); return s.startsWith("http://") || s.startsWith("https://"); }
function normalizaTelefonoAR(raw){
  if(!raw) return "";
  let d=String(raw).replace(/\D/g,"");
  if(d.startsWith("549")) d=d.slice(3); else if(d.startsWith("54")) d=d.slice(2);
  if(d.startsWith("0")) d=d.slice(1);
  if(d.startsWith("15") && d.length>=10) d=d.slice(2);
  return d;
}
function genSNNumber(patente=""){
  const base=String(patente||"SN").replace(/[^A-Z0-9]/gi,"").slice(0,8).toUpperCase();
  const ts=new Date();
  const stamp=ts.getFullYear().toString()+String(ts.getMonth()+1).padStart(2,"0")+String(ts.getDate()).padStart(2,"0")+String(ts.getHours()).padStart(2,"0")+String(ts.getMinutes()).padStart(2,"0");
  return `SN-${base||"TEMP"}-${stamp}`;
}

/* =====================  Componente  ===================== */
export default function CreateSolicitudModal({
  onClose,
  companias = [],
  coberturas = [],
  onCreated,
  skipResponsableGate = false,
  initialResponsableId = "",
  initialTipoSeguro = "ROBO",
}) {
  const [step, setStep] = useState(1);

  // ======= Gate Responsable =======
  const [askResponsable, setAskResponsable] = useState(true);
  const [responsableId, setResponsableId] = useState("");

  useEffect(()=>{
    if (skipResponsableGate && initialResponsableId){
      setResponsableId(String(initialResponsableId));
      setAskResponsable(false);
    } else {
      setAskResponsable(true);
    }
  },[skipResponsableGate, initialResponsableId]);

  // Paso 1: Cliente
  const [clienteModo, setClienteModo] = useState("nuevo");
  const [clienteId, setClienteId] = useState("");
  const [cliente, setCliente] = useState({
    nombre:"", apellido:"", telefono:"", email:"",
    dni_cuit_cuil:"", direccion:"", localidad:"",
  });
  const [dniSlots, setDniSlots] = useState({ DNI_FRENTE:null, DNI_DORSO:null });

  // Paso 2: Póliza
  const [polizaModo, setPolizaModo] = useState("nueva");
  const [polizaId, setPolizaId]   = useState("");
  const [poliza, setPoliza] = useState({
    compania:"", numero_poliza:"", cobertura:"", oficina:"",
    patente:"", marca:"", modelo:"", anio:"",
    tipo:"Auto", precio_cuota:"", cantidad_cuotas_override:"",
    primer_vencimiento:"", fecha_emision: ymdLocal(new Date()),
    dias_a_vencer:30, generar_cuotas_ahora:true,
  });
  const [sinNumero, setSinNumero] = useState(false);
  const [tocoCantidadCuotas, setTocoCantidadCuotas] = useState(false);

  useEffect(()=>{
    if(!poliza.fecha_emision) return;
    setPoliza(s=>({ ...s, primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1) }));
  },[poliza.fecha_emision]);

  useEffect(()=>{
    const COMPANY_CUOTAS={ agrosalta:6, "federacion patronal":6, "federación patronal":6, atm:4, equidad:3, nre:3, providencia:3 };
    const raw=(poliza.compania||"").trim(); if(!raw||tocoCantidadCuotas) return;
    const key=rmDiacritics(raw).toLowerCase(); const cant=COMPANY_CUOTAS[key];
    if(cant) setPoliza(s=>({ ...s, cantidad_cuotas_override:String(cant) }));
  },[poliza.compania, tocoCantidadCuotas]);

  const cuotasPreview = useMemo(()=>{
    const count=Number(poliza.cantidad_cuotas_override||12);
    const first=poliza.primer_vencimiento; if(!first||!count||count<1) return [];
    return Array.from({length:count},(_,i)=>({ nro:i+1, fecha:addMonthsLocal(first,i), monto:poliza.precio_cuota||"" }));
  },[poliza.cantidad_cuotas_override, poliza.primer_vencimiento, poliza.precio_cuota]);

  // Paso 3
  const [solicitud, setSolicitud] = useState({ prioridad:"NORMAL", observaciones:"", tipoSeguro: initialTipoSeguro });

  // === Política de slots según cobertura (A / A+GRÚA / OTRAS)
  const coberturaHuman = String(poliza.cobertura||"").trim();
  const coverageRuleKey = toRuleKey(coberturaHuman);

  let FOTO_SLOTS = [];
  let DOC_SLOTS  = [];

  if (coverageRuleKey === "A") {
    FOTO_SLOTS = [];                       // sin fotos
    DOC_SLOTS  = [ ...DOC_SLOT_CEDULA_SOLO ];
  } else if (coverageRuleKey === "A_GRUA") {
    FOTO_SLOTS = [ ...FOTO_SLOTS_4LADOS ]; // 4 lados
    DOC_SLOTS  = [                         // cédula frente + VTV (los demás docs no aparecen acá)
      { key:"CEDULA_VERDE_FRENTE", label:"Cédula verde (frente)"},
      { key:"VTV",                 label:"VTV" },
    ];
  } else { // OTRAS
    FOTO_SLOTS = [ ...FOTO_SLOTS_FULL ];
    DOC_SLOTS  = [ ...DOC_SLOT_FULL ];
  }

  const [fotoSlots, setFotoSlots] = useState({});
  const [docSlots,  setDocSlots]  = useState(Object.fromEntries(DOC_SLOTS.map(({key})=>[key,null])));
  const [saving, setSaving]       = useState(false);

  useEffect(()=>{
    const nextDocKeys=new Set(DOC_SLOTS.map(d=>d.key));
    setDocSlots(prev=>{ const out={}; for(const k of nextDocKeys) out[k]=prev?.[k]||null; return out; });
    const nextFotoKeys=new Set(FOTO_SLOTS.map(f=>f.key));
    setFotoSlots(prev=>{ const out={}; for(const k of nextFotoKeys) out[k]=prev?.[k]||null; return out; });
  // eslint-disable-next-line
  },[coverageRuleKey]);

  const paso1Errors = useMemo(()=>{
    const e={};
    if (clienteModo==="existente"){ if(!String(clienteId).trim()) e.clienteId="ID requerido"; return e; }
    if(!cliente.nombre.trim()) e.nombre="Requerido";
    if(!cliente.apellido.trim()) e.apellido="Requerido";
    if(!cliente.telefono.trim()) e.telefono="Requerido";
    return e;
  },[clienteModo, cliente, clienteId]);

  const paso2Errors = useMemo(()=>{
    const e={};
    if (polizaModo==="existente"){ if(!String(polizaId).trim()) e.polizaId="ID requerido"; return e; }
    if(!poliza.compania.trim()) e.compania="Requerido";
    if(!sinNumero && !poliza.numero_poliza.trim()) e.numero_poliza="Requerido";
    if(!poliza.cobertura.trim()) e.cobertura="Requerido";
    if(!poliza.oficina.trim()) e.oficina="Requerido";
    if(!poliza.patente.trim()) e.patente="Requerido";
    if(!poliza.marca.trim()) e.marca="Requerido";
    if(!poliza.modelo.trim()) e.modelo="Requerido";
    if(!String(poliza.anio).trim()) e.anio="Requerido";
    if(!poliza.primer_vencimiento) e.primer_vencimiento="Requerido";
    if(poliza.generar_cuotas_ahora && !String(poliza.precio_cuota).trim()) e.precio_cuota="Requerido para generar cuotas";
    return e;
  },[polizaModo, poliza, sinNumero]);

  const responsableOk = Boolean(String(responsableId).trim());
  const canNext1 = Object.keys(paso1Errors).length===0;
  const canNext2 = Object.keys(paso2Errors).length===0;
  const canSubmit = responsableOk && !saving;

  const coberturasOpts = useMemo(()=>{
    const src=Array.isArray(coberturas)&&coberturas.length?coberturas:DEFAULT_COBERTURAS;
    const asObjects=src.map(op=>typeof op==="string"?{id:op, nombre:op}:op);
    const seen=new Set(); const out=[];
    for(const op of asObjects){
      const key=String(op?.id ?? op?.nombre ?? "").trim();
      if(!key||seen.has(key)) continue; seen.add(key); out.push({id:key, nombre:op?.nombre ?? key});
    }
    return out;
  },[coberturas]);

  const goToStep = (target)=>{
    if(target===step) return;
    if(askResponsable) return toast.error("Elegí el responsable antes de continuar.");
    if(target>=2 && !canNext1) return toast.error("Completá los datos del cliente");
    if(target>=3 && !canNext2) return toast.error("Revisá los datos de la póliza");
    setStep(target);
  };

  /* =====================  Upload helpers  ===================== */
  async function handleUploadToSlot(file, folder, setter){
    if(!file) return;
    const _mime = file.type || (file.name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    try {
      const up = await uploadToCloudinary(file, { folder });
      setter({ file, url: up.secure_url, public_id: up.public_id, mime: _mime });
      toast.success("Subido");
    } catch {
      toast.error("No se pudo subir el archivo");
    }
  }
  const onUploadDNI  =(file,key)=>handleUploadToSlot(file,"de-thames/clientes/dni", val=>setDniSlots(s=>({...s,[key]:val})));
  const onUploadFotoVehiculo=(file,key)=>handleUploadToSlot(file,"de-thames/solicitudes/fotos", val=>setFotoSlots(s=>({...s,[key]:val})));
  const onUploadDocVehiculo =(file,key)=>handleUploadToSlot(file,"de-thames/solicitudes/docs",  val=>setDocSlots(s=>({...s,[key]:val})));

  /* =====================  Submit  ===================== */
  const onSubmit = async ()=>{
    if(!canSubmit) return;
    setSaving(true);
    try {
      const payload = { cliente:{}, poliza:{}, solicitud:{}, fotos:{}, documentos:{}, cliente_fotos:{} };

      const dniFrUrl = dniSlots.DNI_FRENTE?.url && isHttpUrl(dniSlots.DNI_FRENTE.url) ? dniSlots.DNI_FRENTE.url : null;
      const dniFrPid = dniSlots.DNI_FRENTE?.public_id || "";
      const dniDoUrl = dniSlots.DNI_DORSO?.url && isHttpUrl(dniSlots.DNI_DORSO.url) ? dniSlots.DNI_DORSO.url : null;
      const dniDoPid = dniSlots.DNI_DORSO?.public_id || "";

      if (clienteModo==="existente"){
        payload.cliente = { modo:"existente", id:Number(clienteId) };
      } else {
        payload.cliente = {
          modo:"nuevo",
          nombre: cliente.nombre.trim(),
          apellido: cliente.apellido.trim(),
          telefono: normalizaTelefonoAR(cliente.telefono),
          email: cliente.email || null,
          dni_cuit_cuil: (cliente.dni_cuit_cuil||"").trim(),
          direccion: (cliente.direccion||"").trim(),
          localidad: (cliente.localidad||"").trim(),
        };
      }

      if (dniFrUrl) payload.cliente.archivo_dni_frente = dniFrUrl;
      if (dniDoUrl) payload.cliente.archivo_dni_dorso  = dniDoUrl;
      if (dniFrUrl) payload.cliente_fotos.DNI_FRENTE = { url:dniFrUrl, public_id:dniFrPid };
      if (dniDoUrl) payload.cliente_fotos.DNI_DORSO  = { url:dniDoUrl, public_id:dniDoPid };

      if (polizaModo==="existente"){
        payload.poliza = { modo:"existente", id:Number(polizaId) };
      } else {
        let numero = poliza.numero_poliza.trim();
        if (sinNumero && !numero) numero = genSNNumber(poliza.patente);
        payload.poliza = {
          modo:"nueva",
          compania: poliza.compania.trim(),
          numero_poliza: numero,
          cobertura: normalizeCobertura(poliza.cobertura),
          oficina: poliza.oficina.trim(),
          patente: poliza.patente.trim().toUpperCase(),
          marca: poliza.marca.trim(),
          modelo: poliza.modelo.trim(),
          anio: Number(poliza.anio),
          tipo: poliza.tipo || "Auto",
          precio_cuota: poliza.generar_cuotas_ahora ? Number(poliza.precio_cuota) : undefined,
          cantidad_cuotas_override: poliza.cantidad_cuotas_override ? Number(poliza.cantidad_cuotas_override) : undefined,
          primer_vencimiento: poliza.primer_vencimiento,
          fecha_emision: poliza.fecha_emision || ymdLocal(new Date()),
          dias_a_vencer: Number(poliza.dias_a_vencer) || 30,
          generar_cuotas_ahora: !!poliza.generar_cuotas_ahora,
          regenerar_cuotas: false,
        };
      }

      payload.solicitud = {
        responsable_empleado: Number(responsableId),
        responsable: "",
        prioridad: solicitud.prioridad || "NORMAL",
        observaciones: (solicitud.observaciones||"").trim(),
        motivo: "ALTA_POLIZA",
        tipoSeguro: solicitud.tipoSeguro || "ROBO",
      };

      // ===== FOTOS DEL VEHÍCULO (solo keys válidas)
      const _FOTO_SLOTS = FOTO_SLOTS; // ya filtrados por regla
      _FOTO_SLOTS.forEach(({key})=>{
        const s=fotoSlots[key];
        if(!s?.url || !isHttpUrl(s.url)) return;
        const sendKey = key === "TUBO_GNC" ? "EQUIPO_GNC" : key; // compat
        if (ALLOWED_FOTO_KEYS_SOLICITUD.has(key) || sendKey === "EQUIPO_GNC"){
          payload.fotos[sendKey] = { url:s.url, public_id:s.public_id||"" };
        }
      });

      // ===== DOCUMENTOS DEL VEHÍCULO → bloque “documentos”
      Object.entries(docSlots || {}).forEach(([key, s])=>{
        if(!s?.url || !isHttpUrl(s.url)) return;
        payload.documentos[key] = {
          url: s.url,
          public_id: s.public_id || "",
          mime: s.mime || guessMime(s?.file?.name || ""),
          nombre: key,
        };
      });

      // ===== Espejo para creación de PolizaDocumento en backend
      const DOC_KEYS_TO_IMPORT = new Set([
        "CEDULA_VERDE", "CEDULA_VERDE_FRENTE", "CEDULA_VERDE_DORSO",
        "CEDULA_AZUL",  "CEDULA_AZUL_FRENTE", "CEDULA_AZUL_DORSO",
        "TITULO", "OBLEA_GNC", "VTV", "PERMISO"
      ]);
      Object.entries(docSlots || {}).forEach(([key, s])=>{
        if(!s?.url || !isHttpUrl(s.url)) return;
        if (DOC_KEYS_TO_IMPORT.has(key)) {
          payload.fotos[key] = { url: s.url, public_id: s.public_id || "" };
        }
      });

      console.debug("[CREAR_COMPLETO][payload]", JSON.stringify(payload,null,2));

      const raw = await solicitudesApi.crearCompleto(payload);

      const polizaIdResp  = raw?.poliza_id ?? raw?.poliza?.id ?? (polizaModo==="existente" ? Number(polizaId) : null);
      const clienteIdResp = raw?.cliente_id ?? raw?.cliente?.id ?? (clienteModo==="existente" ? Number(clienteId) : null);

      toast.success("Solicitud + Póliza + Cliente creados");

      /* ===== Email al admin (SOLO claves del template) ===== */
      try {
        const nombre   = (raw?.cliente?.nombre  || cliente.nombre  || "").trim();
        const apellido = (raw?.cliente?.apellido|| cliente.apellido|| "").trim();
        const dni      = (raw?.cliente?.dni_cuit_cuil || cliente.dni_cuit_cuil || "").trim();

        const marca    = (raw?.poliza?.marca  || poliza.marca  || "").trim();
        const modelo   = (raw?.poliza?.modelo || poliza.modelo || "").trim();
        const anio     = String(raw?.poliza?.anio ?? poliza.anio ?? "").trim();
        const coberturaHuman = (poliza.cobertura || raw?.poliza?.cobertura || "").toString().trim();
        const compania = (raw?.poliza?.compania || poliza.compania || "").trim();

        await sendAdminNuevaSolicitud({
          aviso: "Nueva solicitud creada",
          fecha_hora: new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }),
          cliente_nombre_apellido: `${nombre} ${apellido}`.trim(),
          cliente_dni: dni,
          auto_marca: marca,
          auto_modelo: modelo,
          auto_anio: anio,
          poliza_cobertura: coberturaHuman,
          poliza_compania: compania,
        });
        toast.success("Notificación enviada al admin");
      } catch (err) {
        console.error("[EmailJS] Error enviando correo al admin:", err);
        toast.error("No se pudo notificar al admin por email");
      }
      /* ===================================================== */

      if (typeof onCreated === "function"){
        onCreated({
          primera_cuota_id:
            raw?.primera_cuota_id ??
            raw?.cuota_id ??
            raw?.cuota?.id ??
            raw?.cuotas?.[0]?.id ??
            raw?.poliza?.cuotas?.[0]?.id ?? null,
          telefono:
            raw?.telefono ??
            raw?.cliente?.telefono ??
            raw?.poliza?.cliente?.telefono ?? "",
          precio_cuota:
            raw?.precio_cuota ??
            raw?.poliza?.precio_cuota ?? "",
          poliza_id: polizaIdResp,
          cliente_id: clienteIdResp,
          raw,
        });
        return;
      }

      onClose?.();
    } catch (e) {
      console.error(e);
      const msg = e?.message || (typeof e==="string" ? e : "") || "No se pudo crear la solicitud completa";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* =====================  UI  ===================== */
  const safeVariants = scaleIn ?? {};
  const sectionVariants = {
    hidden:{ opacity:0, y:10 },
    show:{ opacity:1, y:0, transition:{ duration:0.18 } },
    exit:{ opacity:0, y:-8, transition:{ duration:0.12 } },
  };

  useEffect(()=>{
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=> (document.body.style.overflow=prev);
  },[]);

  const closeBtnRef = useRef(null);

  return (
    <div className="fixed inset-0 z-[90] overscroll-contain touch-pan-y">
      <div
        className={`absolute inset-0 ${saving?"cursor-wait":"cursor-pointer"} bg-[radial-gradient(1200px_700px_at_20%_-10%,rgba(245,182,218,.25),transparent),radial-gradient(900px_600px_at_80%_110%,rgba(165,243,252,.2),transparent),#0b0f1e]`}
        onClick={()=> !saving && onClose?.()}
        aria-hidden="true"
      />
      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative w-full max-w-md sm:max-w-5xl md:max-w-6xl h-[90vh] sm:h-auto mx-auto rounded-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,.5)] overflow-hidden"
        style={{ background:"linear-gradient(180deg, rgba(17,20,35,.96) 0%, rgba(12,15,28,.98) 100%)" }}
        role="dialog" aria-modal="true" aria-label="Crear nueva solicitud"
      >
        <div className="md:hidden sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0f0c28]/80 backdrop-blur" style={{ paddingTop:"calc(env(safe-area-inset-top) + 2px)" }}>
          <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3">
            <h3 className="text-white font-semibold flex items-center gap-2 text-base md:text-lg">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-200/80 to-violet-200/80 text-[#0b0f1e] shadow"><HiSparkles/></span>
              Nueva solicitud
            </h3>
            <div className="flex items-center gap-2">
              {Boolean(String(responsableId).trim()) && (
                <span className="hidden lg:inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg border border-white/15 text-white/90 bg-white/5">
                  <HiUser className="opacity-80" />
                  <b>Responsable:</b> #{responsableId}
                  <button type="button" onClick={()=>setAskResponsable(true)} className="ml-1 text-white/90 underline underline-offset-2 hover:text-white" title="Cambiar responsable">
                    Cambiar
                  </button>
                </span>
              )}
              <motion.button
                ref={closeBtnRef}
                onClick={()=> !saving && onClose?.()}
                disabled={saving}
                className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition"
                aria-label="Cerrar"
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <HiX className="text-lg text-white" />
              </motion.button>
            </div>
          </div>

          <div className="px-3 md:px-4 pb-2 md:pb-3">
            {/* Barra de progreso visual (opcional pero profesional) */}
            <div className="hidden md:block mb-2">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-400 to-cyan-400"
                  initial={{ width: "25%" }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  variants={progressBarVariants}
                />
              </div>
            </div>

            <div className="md:hidden -mx-3 px-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
              <div className="min-w-max flex gap-2">
                <StepChip active={step===1} done={step>1} icon={<HiUser/>} label="Cliente" onClick={()=>goToStep(1)} />
                <StepChip active={step===2} done={step>2} icon={<HiShieldCheck/>} label="Póliza"  onClick={()=>goToStep(2)} />
                <StepChip active={step===3} done={step>3} icon={<HiPhotograph/>}  label="Vehículo/Docs" onClick={()=>goToStep(3)} />
                <StepChip active={step===4} done={false} icon={<HiDocumentText/>} label="Solicitud" onClick={()=>goToStep(4)} />
              </div>
            </div>
            <div className="hidden md:grid grid-cols-4 gap-2">
              <StepBadge active={step===1} done={step>1} icon={<HiUser/>} label="Cliente" onClick={()=>goToStep(1)} color="from-emerald-200/80 to-teal-200/80" />
              <StepBadge active={step===2} done={step>2} icon={<HiShieldCheck/>} label="Póliza"  onClick={()=>goToStep(2)} color="from-sky-200/80 to-cyan-200/80" />
              <StepBadge active={step===3} done={step>3} icon={<HiPhotograph/>}  label="Vehículo / Documentos" onClick={()=>goToStep(3)} color="from-rose-200/80 to-pink-200/80" />
              <StepBadge active={step===4} done={false} icon={<HiDocumentText/>} label="Solicitud" onClick={()=>goToStep(4)} color="from-amber-200/80 to-yellow-200/80" />
            </div>
          </div>
        </div>

        <div className="px-3 md:px-4 pt-2 pb-[104px] md:pb-4 overflow-y-auto h-[calc(100dvh-112px)] md:h-auto md:flex-1">
          <AnimatePresence mode="wait">
            {step===1 && (
              <motion.div
                key="paso1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <ClienteStep
                  clienteModo={clienteModo} setClienteModo={setClienteModo}
                  clienteId={clienteId} setClienteId={setClienteId}
                  cliente={cliente} setCliente={setCliente}
                  dniSlots={dniSlots} setDniSlots={setDniSlots}
                  TIPO_DNI_SLOTS={TIPO_DNI_SLOTS}
                  onUploadDNI={onUploadDNI}
                />
              </motion.div>
            )}

            {step===2 && (
              <motion.div
                key="paso2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PolizaStep
                  polizaModo={polizaModo} setPolizaModo={setPolizaModo}
                  polizaId={polizaId} setPolizaId={setPolizaId}
                  poliza={poliza} setPoliza={setPoliza}
                  sinNumero={sinNumero} setSinNumero={setSinNumero}
                  companias={companias} coberturas={coberturasOpts}
                  setTocoCantidadCuotas={setTocoCantidadCuotas}
                />
              </motion.div>
            )}

            {step===3 && (
              <motion.div
                key="paso3"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <VehiculoDocsStep
                  MAX_FOTOS={MAX_FOTOS}
                  fotoSlotDefs={FOTO_SLOTS}
                  fotoSlots={fotoSlots} setFotoSlots={setFotoSlots}
                  docSlots={docSlots} setDocSlots={setDocSlots}
                  docSlotDefs={DOC_SLOTS}
                  onUploadFotoVehiculo={onUploadFotoVehiculo}
                  onUploadDocVehiculo={onUploadDocVehiculo}
                  coverageRuleKey={coverageRuleKey}
                />
              </motion.div>
            )}

            {step===4 && (
              <motion.div
                key="paso4"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SolicitudStep
                  responsableNombre={responsableId ? `#${responsableId}` : ""}
                  onCambiarResponsable={()=>setAskResponsable(true)}
                  solicitud={solicitud} setSolicitud={setSolicitud}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[#0f0c28]/80 backdrop-blur" style={{ paddingBottom:"env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-3">
            <motion.button
              onClick={()=> !saving && onClose?.()}
              disabled={saving}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-sm md:text-base text-white disabled:opacity-60 transition w-[44%] md:w-auto"
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
            >
              Cancelar
            </motion.button>

            <div className="flex items-center gap-2 w-[56%] md:w-auto">
              {step>1 && (
                <motion.button
                  onClick={()=> setStep(s=>Math.max(1,s-1))}
                  disabled={saving}
                  className="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-sm md:text-base text-white inline-flex items-center justify-center gap-2 transition"
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <HiChevronLeft className="text-lg md:text-xl" /> Atrás
                </motion.button>
              )}

              {step<4 && (
                <motion.button
                  onClick={()=>{
                    if (askResponsable) return toast.error("Elegí el responsable antes de continuar.");
                    if (step===1 && !canNext1) return toast.error("Completá los datos del cliente");
                    if (step===2 && !canNext2) return toast.error("Revisá los datos de la póliza");
                    setStep(s=>Math.min(4,s+1));
                  }}
                  disabled={saving}
                  className="flex-1 md:flex-none px-4 py-3 rounded-2xl text-[#0b0f1e] font-semibold bg-gradient-to-br from-sky-200 to-cyan-200 shadow-lg hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/40 inline-flex items-center justify-center gap-2 transition text-sm md:text-base"
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  Siguiente <HiChevronRight className="text-lg md:text-xl" />
                </motion.button>
              )}

              {step===4 && (
                <motion.button
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="flex-1 md:flex-none px-4 py-3 rounded-2xl text-[#0b0f1e] font-semibold bg-gradient-to-br from-emerald-200 to-teal-200 shadow-lg hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition text-sm md:text-base"
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  {saving && <span className="inline-block w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
                  {saving ? "Creando…" : "Crear (todo en 1 paso)"}
                </motion.button>
              )}
            </div>
          </div>
        </div>

        <ResponsableManagerModal
          open={askResponsable}
          onCancel={onClose}
          onSelected={({ responsableId: selId })=>{
            setResponsableId(String(selId));
            setAskResponsable(false);
            toast.success("Responsable asignado");
          }}
        />
      </motion.div>
    </div>
  );
}

/* =====================  UI bits  ===================== */
function StepChip({ active, done, icon, label, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-xs sm:text-sm transition min-w-[120px] sm:min-w-[140px] snap-center ${
        active ? "border-white/20 bg-gradient-to-br from-violet-200/80 to-indigo-200/80 text-[#0b0f1e]"
               : "border-white/10 bg-white/5 text-white/85"
      }`}
      aria-current={active ? "step" : undefined}
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
    >
      <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md ${
        active ? "bg-black/10 text-black"
               : done ? "bg-emerald-300/30 text-emerald-200" : "bg-white/10 text-white"
      }`}>
        {done ? <HiCheckCircle className="text-base" /> : icon}
      </span>
      <span className="truncate">{label}</span>
    </motion.button>
  );
}

function StepBadge({ active, done, icon, label, onClick, color="from-emerald-200/80 to-teal-200/80" }) {
  return (
    <motion.button
      whileHover={{ scale:1.01 }} whileTap={{ scale:0.99 }}
      type="button" onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 border w-full text-left transition ${
        active ? "border-white/20 bg-gradient-to-br "+color+" text-[#0b0f1e]"
               : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
      }`}
    >
      <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md ${
        active ? "bg-black/10 text-black"
               : done ? "bg-emerald-300/30 text-emerald-200" : "bg-white/10 text-white"
      }`}>
        {done ? <HiCheckCircle className="text-base" /> : icon}
      </span>
      <span className="text-xs sm:text-sm">{label}</span>
    </motion.button>
  );
}