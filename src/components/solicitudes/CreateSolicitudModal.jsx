// src/components/solicitudes/CreateSolicitudModal.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiPhotograph, HiChevronRight, HiChevronLeft,
  HiCheckCircle, HiShieldCheck, HiUser, HiDocumentText, HiSparkles,
} from "react-icons/hi";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { solicitudesApi } from "../../api/solicitudes.js";
import { scaleIn } from "../../ux/motion/variants";

/* ==== IMPORTS ==== */
import ResponsableManagerModal from "./modalcreate/ResponsableManagerModal";
import ClienteStep from "./modalcreate/ClienteStep";
import PolizaStep from "./modalcreate/PolizaStep";
import ImagenesDocsStep from "./modalcreate/ImagenesDocsStep";
import SolicitudStep from "./modalcreate/SolicitudStep";

/* === Email (centralizado, sin correo hardcodeado) === */
import { sendAdminNuevaSolicitud } from "../../services/notifications/email";

/* =====================  Constantes  ===================== */
const MAX_FOTOS = Number(import.meta.env.VITE_MAX_FOTOS || 0);
const DEFAULT_COBERTURAS = ["A","A + GRUA","B","B1","C","C1","C TOTAL","C FRANQUICIA"];

const COBERTURA_MAP = {
  A: "A",
  "A + GRUA": "A_GRUA",
  B: "B",
  B1: "B1",
  C: "C",
  C1: "C1",
  "C TOTAL": "C_TOTAL",
  "C FRANQUICIA": "C_FRANQUICIA",
  "C FRANQUISCIA": "C_FRANQUICIA",
};
const normalizeCobertura = (v = "") => {
  const k = String(v).trim().toUpperCase();
  if (COBERTURA_MAP[k]) return COBERTURA_MAP[k];
  return k.replace(/\s+/g, "_").replace(/__+/g, "_");
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

// ===== Slots
// Papeles del vehículo (para UI)
// A (RC pura): cédula frente requerida, dorso opcional
const DOC_SLOT_RC = [
  { key:"CEDULA_VERDE_FRENTE", label:"Cédula verde (frente)"},
  { key:"CEDULA_VERDE_DORSO",  label:"Cédula verde (dorso)"},
];

// Para A + GRÚA (cédula frente + VTV; dorso opcional)
const DOC_SLOT_A_GRUA = [
  { key:"CEDULA_VERDE_FRENTE", label:"Cédula verde (frente)"},
  { key:"CEDULA_VERDE_DORSO",  label:"Cédula verde (dorso)"},
  { key:"VTV",                 label:"VTV"},
];

// Full (otras coberturas): lista amplia, con dorso
const DOC_SLOT_FULL = [
  { key:"CEDULA_VERDE_FRENTE", label:"Cédula verde (frente)"},
  { key:"CEDULA_VERDE_DORSO",  label:"Cédula verde (dorso)"},
  { key:"TITULO",              label:"Título del vehículo"},
  { key:"OBLEA_GNC",           label:"Oblea GNC"},
  { key:"VTV",                 label:"VTV"},
  { key:"PERMISO",             label:"Permiso"},
];

// Fotos del vehículo (galería)
// ⚠ Quitamos OBLEA_GNC de fotos para evitar duplicados (va como documento)
const FOTO_SLOTS_FULL = [
  { key:"FRENTE",        label:"Frente" },
  { key:"LATERAL_IZQ",   label:"Lateral izq." },
  { key:"LATERAL_DER",   label:"Lateral der." },
  { key:"TRASERA",       label:"Trasera" },
  { key:"INTERIOR",      label:"Interior" },
  { key:"RUEDA_AUXILIO", label:"Rueda de auxilio" },
  { key:"TUBO_GNC",      label:"Tubo GNC" }, // mapeable a EQUIPO_GNC
];

// Solo 4 lados (para A + GRÚA)
const FOTO_SLOTS_A_GRUA = [
  { key:"FRENTE",        label:"Frente" },
  { key:"LATERAL_IZQ",   label:"Lateral izq." },
  { key:"LATERAL_DER",   label:"Lateral der." },
  { key:"TRASERA",       label:"Trasera" },
];

const TIPO_DNI_SLOTS = [
  { key:"DNI_FRENTE", label:"DNI frente" },
  { key:"DNI_DORSO",  label:"DNI dorso"  },
];

// Claves admitidas por backend en “fotos” (importación a Poliza) — SOLO fotos reales
const ALLOWED_FOTO_KEYS_SOLICITUD = new Set([
  "PATENTE","FRENTE","LATERAL_IZQ","LATERAL_DER","TRASERA","INTERIOR","RUEDA_AUXILIO","TUBO_GNC",
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
    return Array.from(
      {length:count},
      (_,i)=>({ nro:i+1, fecha:addMonthsLocal(first,i), monto:0 }) // 👈 siempre muestra 0
    );
  },[poliza.cantidad_cuotas_override, poliza.primer_vencimiento, poliza.precio_cuota]);

  // Paso 3
  const [solicitud, setSolicitud] = useState({ prioridad:"NORMAL", observaciones:"", tipoSeguro: initialTipoSeguro });

  // Política imgs/docs por cobertura
  const coberturaNorm = normalizeCobertura(poliza.cobertura || "");
  const isA       = coberturaNorm === "A";
  const isAGrua   = coberturaNorm === "A_GRUA";

  const FOTO_SLOTS = isA ? [] : (isAGrua ? FOTO_SLOTS_A_GRUA : FOTO_SLOTS_FULL);
  const DOC_SLOTS  = isA ? DOC_SLOT_RC : (isAGrua ? DOC_SLOT_A_GRUA : DOC_SLOT_FULL);

  const [fotoSlots, setFotoSlots] = useState({});
  const [docSlots,  setDocSlots]  = useState(Object.fromEntries(DOC_SLOTS.map(({key})=>[key,null])));
  const [saving, setSaving]       = useState(false);

  useEffect(()=>{
    // Ajustar keys dinámicas sin perder lo ya cargado
    const nextDocKeys=new Set(DOC_SLOTS.map(d=>d.key));
    setDocSlots(prev=>{ const out={}; for(const k of nextDocKeys) out[k]=prev?.[k]||null; return out; });
    const nextFotoKeys=new Set(FOTO_SLOTS.map(f=>f.key));
    setFotoSlots(prev=>{ const out={}; for(const k of nextFotoKeys) out[k]=prev?.[k]||null; return out; });
    // eslint-disable-next-line
  },[coberturaNorm]);

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
    // ❌ YA NO exigimos número de póliza desde el front; lo genera el backend
    if(!poliza.cobertura.trim()) e.cobertura="Requerido";
    if(!poliza.oficina.trim()) e.oficina="Requerido";
    if(!poliza.patente.trim()) e.patente="Requerido";
    if(!poliza.marca.trim()) e.marca="Requerido";
    if(!poliza.modelo.trim()) e.modelo="Requerido";
    if(!String(poliza.anio).trim()) e.anio="Requerido";
    if(!poliza.primer_vencimiento) e.primer_vencimiento="Requerido";
    // ❌ Ya no obligamos precio_cuota para generar cuotas
    return e;
  },[polizaModo, poliza]); // sinNumero ya no influye en errores

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
        // ⬇️ Ya no generamos número en el front ni lo mandamos:
        // el backend (modelo Poliza) lo genera automáticamente.
        payload.poliza = {
          modo:"nueva",
          compania: poliza.compania.trim(),
          // numero_poliza: se omite → lo genera el backend
          cobertura: normalizeCobertura(poliza.cobertura),
          oficina: poliza.oficina.trim(),
          patente: poliza.patente.trim().toUpperCase(),
          marca: poliza.marca.trim(),
          modelo: poliza.modelo.trim(),
          anio: Number(poliza.anio),
          tipo: poliza.tipo || "Auto",
          precio_cuota: 0, // 👈 siempre mandamos 0 desde el front
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

      // ===== FOTOS DEL VEHÍCULO (solo keys válidas, con dedupe)
      const seenFotoPid = new Set();
      const seenFotoUrl = new Set();
      FOTO_SLOTS.forEach(({key})=>{
        const s=fotoSlots[key];
        if(!s?.url || !isHttpUrl(s.url)) return;

        // ✅ mandamos la clave tal cual (TUBO_GNC viaja como TUBO_GNC)
        const sendKey = key;
        if (!ALLOWED_FOTO_KEYS_SOLICITUD.has(sendKey)) return;

        const pid = s.public_id || "";
        const url = s.url;
        if ((pid && seenFotoPid.has(pid)) || seenFotoUrl.has(url)) return;

        payload.fotos[sendKey] = { url, public_id: pid };
        if (pid) seenFotoPid.add(pid);
        seenFotoUrl.add(url);
      });

      // ===== DOCUMENTOS DEL VEHÍCULO (sin “espejo” a fotos, con dedupe)
      const seenDocPid = new Set();
      const seenDocUrl = new Set();
      Object.entries(docSlots || {}).forEach(([key, s])=>{
        if(!s?.url || !isHttpUrl(s.url)) return;
        const pid = s.public_id || "";
        const url = s.url;
        if ((pid && seenDocPid.has(pid)) || seenDocUrl.has(url)) return;

        payload.documentos[key] = {
          url,
          public_id: pid,
          mime: s.mime || guessMime(s?.file?.name || ""),
          nombre: key,
        };
        if (pid) seenDocPid.add(pid);
        seenDocUrl.add(url);
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
        variants={safeVariants} initial="hidden" animate="show" exit="exit"
        className="relative w-full h-[100dvh] md:h-auto md:max-w-5xl lg:max-w-6xl md:mx-auto md:my-8 md:rounded-2xl md:border md:border-white/10 shadow-[0_20px_80px_rgba(0,0,0,.5)] flex flex-col md:max-h-[90vh] md:overflow-hidden"
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
                <span className="hidden lg:inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg border border-white/15 text:white/90 bg:white/5">
                  <HiUser className="opacity-80" />
                  <b>Responsable:</b> #{responsableId}
                  <button type="button" onClick={()=>setAskResponsable(true)} className="ml-1 text-white/90 underline underline-offset-2 hover:text-white" title="Cambiar responsable">
                    Cambiar
                  </button>
                </span>
              )}
              <button ref={closeBtnRef} onClick={()=> !saving && onClose?.()} disabled={saving} className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg:white/10 hover:bg-white/20 disabled:opacity-50 transition" aria-label="Cerrar">
                <HiX className="text-lg text:white" />
              </button>
            </div>
          </div>

          <div className="px-3 md:px-4 pb-2 md:pb-3">
            <div className="md:hidden -mx-3 px-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
              <div className="min-w-max flex gap-2">
                <StepChip active={step===1} done={step>1} icon={<HiUser/>} label="Cliente" onClick={()=>goToStep(1)} />
                <StepChip active={step===2} done={step>2} icon={<HiShieldCheck/>} label="Póliza"  onClick={()=>goToStep(2)} />
                <StepChip active={step===3} done={step>3} icon={<HiPhotograph/>}  label="Imágenes" onClick={()=>goToStep(3)} />
                <StepChip active={step===4} done={false} icon={<HiDocumentText/>} label="Solicitud" onClick={()=>goToStep(4)} />
              </div>
            </div>
            <div className="hidden md:grid grid-cols-4 gap-2">
              <StepBadge active={step===1} done={step>1} icon={<HiUser/>} label="Cliente" onClick={()=>goToStep(1)} color="from-emerald-200/80 to-teal-200/80" />
              <StepBadge active={step===2} done={step>2} icon={<HiShieldCheck/>} label="Póliza"  onClick={()=>goToStep(2)} color="from-sky-200/80 to-cyan-200/80" />
              <StepBadge active={step===3} done={step>3} icon={<HiPhotograph/>}  label="Imágenes & Docs" onClick={()=>goToStep(3)} color="from-rose-200/80 to-pink-200/80" />
              <StepBadge active={step===4} done={false} icon={<HiDocumentText/>} label="Solicitud" onClick={()=>goToStep(4)} color="from-amber-200/80 to-yellow-200/80" />
            </div>
          </div>
        </div>

        <div className="px-3 md:px-4 pt-2 pb-[104px] md:pb-4 overflow-y-auto h-[calc(100dvh-112px)] md:h-auto md:flex-1">
          <AnimatePresence mode="wait">
            {step===1 && (
              <motion.div key="paso1" variants={sectionVariants} initial="hidden" animate="show" exit="exit">
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
              <motion.div key="paso2" variants={sectionVariants} initial="hidden" animate="show" exit="exit">
                <PolizaStep
                  polizaModo={polizaModo} setPolizaModo={setPolizaModo}
                  polizaId={polizaId} setPolizaId={setPolizaId}
                  poliza={poliza} setPoliza={setPoliza}
                  sinNumero={sinNumero} setSinNumero={setSinNumero}
                  companias={companias} coberturas={coberturasOpts}
                  setTocoCantidadCuotas={setTocoCantidadCuotas}
                  cuotasPreview={cuotasPreview}
                />
              </motion.div>
            )}

            {step===3 && (
              <motion.div key="paso3" variants={sectionVariants} initial="hidden" animate="show" exit="exit">
                <ImagenesDocsStep
                  MAX_FOTOS={MAX_FOTOS}
                  fotoSlotDefs={FOTO_SLOTS}
                  fotoSlots={fotoSlots} setFotoSlots={setFotoSlots}
                  docSlots={docSlots} setDocSlots={setDocSlots}
                  docSlotDefs={DOC_SLOTS}
                  onUploadFotoVehiculo={onUploadFotoVehiculo}
                  onUploadDocVehiculo={onUploadDocVehiculo}
                />
              </motion.div>
            )}

            {step===4 && (
              <motion.div key="paso4" variants={sectionVariants} initial="hidden" animate="show" exit="exit">
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
            <button
              onClick={()=> !saving && onClose?.()}
              disabled={saving}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-sm md:text-base text-white disabled:opacity-60 transition w-[44%] md:w-auto"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2 w-[56%] md:w-auto">
              {step>1 && (
                <button
                  onClick={()=> setStep(s=>Math.max(1,s-1))}
                  disabled={saving}
                  className="flex-1 md:flex-none px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-sm md:text-base text-white inline-flex items-center justify-center gap-2 transition"
                >
                  <HiChevronLeft className="text-lg md:text-xl" /> Atrás
                </button>
              )}

              {step<4 && (
                <motion.button
                  whileTap={{ scale:0.98 }}
                  onClick={()=>{
                    if (askResponsable) return toast.error("Elegí el responsable antes de continuar.");
                    if (step===1 && !canNext1) return toast.error("Completá los datos del cliente");
                    if (step===2 && !canNext2) return toast.error("Revisá los datos de la póliza");
                    setStep(s=>Math.min(4,s+1));
                  }}
                  disabled={saving}
                  className="flex-1 md:flex-none px-4 py-3 rounded-2xl text-[#0b0f1e] font-semibold bg-gradient-to-br from-sky-200 to-cyan-200 shadow-lg hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/40 inline-flex items-center justify-center gap-2 transition text-sm md:text-base"
                >
                  Siguiente <HiChevronRight className="text-lg md:text-xl" />
                </motion.button>
              )}

              {step===4 && (
                <motion.button
                  whileTap={{ scale:0.98 }}
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="flex-1 md:flex-none px-4 py-3 rounded-2xl text-[#0b0f1e] font-semibold bg-gradient-to-br from-emerald-200 to-teal-200 shadow-lg hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/50 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition text-sm md:text-base"
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
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-sm transition min-w-[140px] snap-center ${
        active ? "border-white/20 bg-gradient-to-br from-violet-200/80 to-indigo-200/80 text-[#0b0f1e]"
               : "border-white/10 bg-white/5 text-white/85"
      }`}
      aria-current={active ? "step" : undefined}
    >
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
        active ? "bg-black/10 text-black"
               : done ? "bg-emerald-300/30 text-emerald-200" : "bg-white/10 text-white"
      }`}>
        {done ? <HiCheckCircle className="text-base" /> : icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
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
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
        active ? "bg-black/10 text-black"
               : done ? "bg-emerald-300/30 text-emerald-200" : "bg-white/10 text-white"
      }`}>
        {done ? <HiCheckCircle className="text-base" /> : icon}
      </span>
      <span className="text-sm">{label}</span>
    </motion.button>
  );
}
