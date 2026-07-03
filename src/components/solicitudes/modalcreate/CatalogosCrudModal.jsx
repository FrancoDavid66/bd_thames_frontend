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
  HiIdentification,
  HiSparkles,
} from "react-icons/hi";
import toast from "react-hot-toast";

// 🚀 IMPORTACIONES DE SEGURIDAD Y SERVICIOS
import { useAuth } from "../../context/AuthContext";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { solicitudesApi } from "../../services/solicitudes.js";
import api from "../../services/api";
import { sendAdminNuevaSolicitud } from "../../services/notifications/email";

import ClienteStep from "./modalcreate/ClienteStep";
import LectorPdfButton from "./modalcreate/LectorPdfButton";
import RevisionRapidaStep from "./modalcreate/RevisionRapidaStep";
import PolizaStep from "./modalcreate/PolizaStep";
import SolicitudStep from "./modalcreate/SolicitudStep";
// 🚀 NUEVO: Gate de verificación previa (búsqueda global de cliente/auto)
import VerificarClienteGate from "./modalcreate/VerificarClienteGate";
// 🆕 Post-alta: cobrar la 1ª cuota + comprobante
import CobrarPrimeraCuotaModal from "./CobrarPrimeraCuotaModal";

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

const MAX_FOTOS_RAW = import.meta.env.VITE_MAX_FOTOS;
const MAX_FOTOS = MAX_FOTOS_RAW === "0" || MAX_FOTOS_RAW === 0 ? 0 : Number(MAX_FOTOS_RAW || 12);
const TIPO_DNI_SLOTS = [
  { key: "DNI_FRENTE", label: "DNI frente" },
  { key: "DNI_DORSO", label: "DNI dorso" },
];

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
  const y = base.getFullYear(),
    m0 = base.getMonth(),
    d = base.getDate();
  const tMon = m0 + months,
    y2 = y + Math.floor(tMon / 12),
    m2 = ((tMon % 12) + 12) % 12;
  const maxDay = lastDayOfMonth(y2, m2),
    day2 = Math.min(d, maxDay);
  return ymdLocal(new Date(y2, m2, day2, 12, 0, 0, 0));
}

const guessMime = (name = "") =>
  name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg";

function normalizaTelefonoAR(raw) {
  if (!raw) return "";
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("15") && d.length >= 10) d = d.slice(2);
  return d;
}

// 🆕 Mapea el "tipo" de vehículo del PDF a una carrocería del catálogo
function tipoACarroceria(tipo) {
  const t = String(tipo || "").toUpperCase();
  if (!t) return "";
  if (t.includes("PICK")) return "Pick-up";
  if (t.includes("SEDAN") || t.includes("SEDÁN")) return "Sedán";
  if (t.includes("FURGON") || t.includes("FURGÓN")) return "Furgón";
  if (t.includes("SUV") || t.includes("JEEP")) return "SUV";
  if (t.includes("COUPE") || t.includes("COUPÉ")) return "Coupé";
  if (t.includes("HATCH")) return "Hatchback";
  if (t.includes("RURAL") || t.includes("FAMILIAR")) return "Familiar / Rural";
  if (t.includes("MOTO")) return "Moto";
  if (t.includes("UTILITARIO")) return "Utilitario";
  if (t.includes("AUTOMOVIL") || t.includes("AUTOMÓVIL") || t === "AUTO") return "Automóvil";
  return "";
}

// 🆕 Regla de negocio: si la póliza es de NRE, la cobertura SIEMPRE es "A"
// (solo operamos A con NRE). Cualquier otra compañía se elige a mano del catálogo.
function coberturaPorDefecto(companiaPdf, catalogo = []) {
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (norm(companiaPdf) !== "nre") return ""; // otras compañías → a mano
  // Buscamos "A" en el catálogo (preferimos la de NRE) para usar el nombre exacto
  const a =
    (catalogo || []).find((c) => norm(c.nombre) === "a" && norm(c.compania_nombre) === "nre") ||
    (catalogo || []).find((c) => norm(c.nombre) === "a");
  return a ? a.nombre : "A";
}

export default function CreateSolicitudModal({
  onClose,
  companias = [],
  coberturas = [],
  oficinas = [],
  initialClienteId = "",
  initialPatente = "",
  initialCompania = "",
  onCreated,
  skipResponsableGate = false,
  initialResponsableId = "",
  initialTipoSeguro = "ROBO",
  // 🚀 Prop opcional: si querés saltear el gate (ej. cuando ya viene cliente precargado)
  skipVerificarGate = false,
  initialDatosPdf = null,
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  // 🚀 Estado del gate de verificación previa
  // Arranca abierto si NO viene cliente precargado y no se pidió saltearlo
  const [verifyOpen, setVerifyOpen] = useState(!initialClienteId && !skipVerificarGate);

  // El wizard arranca en paso 1 (Asignación). Si ya viene responsable, salta a Cliente (paso 2).
  // 🆕 Fase 1: alta exprés desde PDF (revisión → fotos DNI → fotos auto → resumen)
  const modoRapido = !!initialDatosPdf;
  const SECUENCIA_RAPIDA = [0];
  const [step, setStep] = useState(
    initialDatosPdf ? 0 : (skipResponsableGate && initialResponsableId ? 2 : 1)
  );
  const [responsableId, setResponsableId] = useState(initialResponsableId ? String(initialResponsableId) : "");

  // Listas para el paso de Asignación
  const [oficinasList, setOficinasList] = useState(Array.isArray(oficinas) ? oficinas : []);
  const [empleados, setEmpleados] = useState([]);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);

  // Trae oficinas si es admin y no llegaron por props
  useEffect(() => {
    if (!isWebAdmin) return;
    if (Array.isArray(oficinas) && oficinas.length) { setOficinasList(oficinas); return; }
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/usuarios/oficinas/");
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        if (alive) setOficinasList(arr);
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [isWebAdmin, oficinas]);

  // Trae responsables (empleados activos)
  useEffect(() => {
    let alive = true;
    setEmpleadosLoading(true);
    (async () => {
      try {
        const emps = await solicitudesApi.empleadosActivos();
        let arr = Array.isArray(emps) ? emps : emps?.results || [];
        arr = arr.filter((e) => e?.activo !== false);
        if (alive) setEmpleados(arr);
      } catch { if (alive) setEmpleados([]); }
      finally { if (alive) setEmpleadosLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const [clienteModo, setClienteModo] = useState(initialClienteId ? "existente" : "nuevo");
  const [clienteId, setClienteId] = useState(initialClienteId ? String(initialClienteId) : "");
  const [cliente, setCliente] = useState(() => {
    const c = initialDatosPdf?.cliente || {};
    return {
      nombre: c.nombre || "",
      apellido: c.apellido || "",
      telefono: "", // 🆕 siempre a mano (el del PDF suele estar desactualizado)
      dni_cuit_cuil: c.dni || "",
      direccion: c.direccion || "",
      localidad: c.localidad || "",
    };
  });
  // 🆕 Cliente EXISTENTE (viene del perfil): traemos sus datos reales (teléfono, etc.)
  //    y esperamos a tenerlos antes de mostrar la revisión, para no volver a pedirlos.
  const [cargandoCliente, setCargandoCliente] = useState(!!initialClienteId);
  useEffect(() => {
    if (!initialClienteId) { setCargandoCliente(false); return; }
    let vivo = true;
    (async () => {
      try {
        const res = await api.get(`clientes/${initialClienteId}/`);
        const c = res?.data || {};
        if (!vivo) return;
        setCliente((prev) => ({
          ...prev,
          nombre: prev.nombre || c.nombre || "",
          apellido: prev.apellido || c.apellido || "",
          telefono: c.telefono || prev.telefono || "",
          dni_cuit_cuil: prev.dni_cuit_cuil || c.dni_cuit_cuil || c.dni || "",
          direccion: prev.direccion || c.direccion || "",
          localidad: prev.localidad || c.localidad || "",
        }));
      } catch (e) {
        /* si falla, seguimos con lo que haya */
      } finally {
        if (vivo) setCargandoCliente(false);
      }
    })();
    return () => { vivo = false; };
  }, [initialClienteId]);
  const [dniSlots, setDniSlots] = useState({ DNI_FRENTE: null, DNI_DORSO: null });

  const [polizaModo, setPolizaModo] = useState("nueva");
  const [polizaId, setPolizaId] = useState("");
  const [poliza, setPoliza] = useState(() => {
    const v = initialDatosPdf?.vehiculo || {};
    const pol = initialDatosPdf?.poliza || {};
    const cupones = initialDatosPdf?.cupones || [];
    const partes = String(v.marca_modelo || "").trim().split(/\s+/).filter(Boolean);
    return {
      compania: pol.compania || initialCompania || "",
      numero_poliza: pol.numero || "",
      cobertura: pol.cobertura || coberturaPorDefecto(pol.compania, coberturas), // 🆕 usa la del PDF si vino; si no, default (NRE → "A")
      oficina: "",
      patente: v.patente || initialPatente || "",
      marca: partes[0] || "",
      modelo: partes.slice(1).join(" ") || "",
      anio: v.anio ? String(v.anio) : "",
      numero_motor: v.motor || "",
      numero_chasis: v.chasis || "",
      carroceria: tipoACarroceria(v.tipo) || "",
      tipo: "Auto",
      precio_cuota: cupones[0]?.importe != null ? String(cupones[0].importe) : "",
      cantidad_cuotas_override: cupones.length ? String(cupones.length) : "",
      primer_vencimiento: "",
      fecha_emision: ymdLocal(new Date()),
      dias_a_vencer: 30,
      generar_cuotas_ahora: true,
    };
  });

  const [sinNumero, setSinNumero] = useState(false);
  const [tocoCantidadCuotas, setTocoCantidadCuotas] = useState(false);
  // 🎟️ Cupones leídos de la cuponera del PDF (AMCA, La Equidad…). Se mandan al
  //    crear para que las cuotas tomen las fechas EXACTAS (no 6 mensuales).
  const [cuponesPdf, setCuponesPdf] = useState(() => initialDatosPdf?.cupones || []);

  useEffect(() => {
    // 🆕 Auto-asignar la oficina del usuario SIEMPRE (admin o no). Lo único manual es el responsable.
    if (user?.perfil?.oficina) {
      setPoliza((prev) => ({ ...prev, oficina: prev.oficina || String(user.perfil.oficina) }));
    }
  }, [isWebAdmin, user]);

  useEffect(() => {
    if (!poliza.fecha_emision) return;
    setPoliza((s) => ({ ...s, primer_vencimiento: addMonthsLocal(poliza.fecha_emision, 1) }));
  }, [poliza.fecha_emision]);

  // 🆕 Si las coberturas llegan después (async) y es NRE, preseleccionamos "A"
  useEffect(() => {
    if (!modoRapido || poliza.cobertura) return;
    const m = coberturaPorDefecto(poliza.compania, coberturas);
    if (m) setPoliza((s) => ({ ...s, cobertura: m }));
  }, [coberturas]);

  const coberturaObj = useMemo(() => {
    if (!poliza.cobertura) return null;
    const selectedKey = String(poliza.cobertura).trim().toLowerCase();
    const found = coberturas.find((c) => {
      return (
        String(c.id).trim().toLowerCase() === selectedKey ||
        String(c.nombre).trim().toLowerCase() === selectedKey
      );
    });
    if (found) {
      let fotos = found.fotos_requeridas;
      if (typeof fotos === "string") {
        try {
          fotos = JSON.parse(fotos);
        } catch (e) {
          fotos = fotos.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(fotos)) fotos = [];

      let docs = found.documentos_requeridos || found.documentos_requeridas;
      if (typeof docs === "string") {
        try {
          docs = JSON.parse(docs);
        } catch (e) {
          docs = docs.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(docs)) docs = [];

      return { ...found, fotos_requeridas: fotos, documentos_requeridos: docs };
    }
    return null;
  }, [poliza.cobertura, coberturas]);

  useEffect(() => {
    if (tocoCantidadCuotas) return;
    // 🆕 Si el PDF trajo cuponera, MANDA la cuponera (su cantidad de cupones).
    const cuponesPdfDetectados = initialDatosPdf?.cupones || [];
    if (cuponesPdfDetectados.length) {
      setPoliza((s) => ({ ...s, cantidad_cuotas_override: String(cuponesPdfDetectados.length) }));
    } else if (coberturaObj && coberturaObj.cuotas_a_generar) {
      setPoliza((s) => ({ ...s, cantidad_cuotas_override: String(coberturaObj.cuotas_a_generar) }));
    } else {
      setPoliza((s) => ({ ...s, cantidad_cuotas_override: "6" }));
    }
  }, [coberturaObj, tocoCantidadCuotas]);

  const cuotasPreview = useMemo(() => {
    const count = Number(poliza.cantidad_cuotas_override || 6);
    const first = poliza.primer_vencimiento;
    if (!first || !count || count < 1) return [];
    return Array.from({ length: count }, (_, i) => ({
      nro: i + 1,
      fecha: addMonthsLocal(first, i),
      monto: 0,
    }));
  }, [poliza.cantidad_cuotas_override, poliza.primer_vencimiento]);

  const [solicitud, setSolicitud] = useState({
    prioridad: "NORMAL",
    observaciones: "",
    tipoSeguro: initialTipoSeguro,
  });

  const [fotoSlots, setFotoSlots] = useState({});
  const [docSlots, setDocSlots] = useState({});
  const [saving, setSaving] = useState(false);

  // 🆕 Post-alta: flujo de cobro de la 1ª cuota
  const [cobroPolizaId, setCobroPolizaId] = useState(null);
  const [createdRaw, setCreatedRaw] = useState(null);

  useEffect(() => {
    if (
      !coberturaObj ||
      !Array.isArray(coberturaObj.fotos_requeridas) ||
      coberturaObj.fotos_requeridas.length === 0
    ) {
      setFotoSlots({});
    } else {
      const nextFotoKeys = new Set(coberturaObj.fotos_requeridas);
      setFotoSlots((prev) => {
        const out = {};
        for (const k of nextFotoKeys) out[k] = prev?.[k] || null;
        return out;
      });
    }

    if (
      !coberturaObj ||
      !Array.isArray(coberturaObj.documentos_requeridos) ||
      coberturaObj.documentos_requeridos.length === 0
    ) {
      setDocSlots({});
    } else {
      const nextDocKeys = new Set(coberturaObj.documentos_requeridos);
      setDocSlots((prev) => {
        const out = {};
        for (const k of nextDocKeys) out[k] = prev?.[k] || null;
        return out;
      });
    }
  }, [coberturaObj]);

  const paso1Errors = useMemo(() => {
    const e = {};
    if (clienteModo === "existente") {
      if (!String(clienteId).trim()) e.clienteId = "ID de cliente";
      return e;
    }
    if (!cliente.nombre.trim()) e.nombre = "Nombre";
    if (!cliente.apellido.trim()) e.apellido = "Apellido";
    if (!cliente.telefono.trim()) e.telefono = "Teléfono";
    if (!(cliente.dni_cuit_cuil || "").trim()) e.dni_cuit_cuil = "DNI / CUIT";
    if (!(cliente.localidad || "").trim()) e.localidad = "Localidad";
    return e;
  }, [clienteModo, cliente, clienteId]);

  // Fotos del asegurado: obligatorias solo cuando el cliente es NUEVO
  const fotosClienteErrors = useMemo(() => {
    const e = {};
    if (clienteModo === "existente") return e;
    if (!dniSlots?.DNI_FRENTE?.url) e.dni_frente = "Foto DNI (frente)";
    if (!dniSlots?.DNI_DORSO?.url) e.dni_dorso = "Foto DNI (dorso)";
    return e;
  }, [clienteModo, dniSlots]);

  const companiaErrors = useMemo(() => {
    const e = {};
    if (polizaModo === "existente") {
      if (!String(polizaId).trim()) e.polizaId = "ID de póliza";
      return e;
    }
    if (!(poliza.compania || "").trim()) e.compania = "Compañía";
    if (!(poliza.cobertura || "").trim()) e.cobertura = "Cobertura";
    if (!(poliza.oficina || "").trim()) e.oficina = "Sucursal";
    return e;
  }, [polizaModo, poliza, polizaId]);

  const autoErrors = useMemo(() => {
    const e = {};
    if (polizaModo === "existente") return e;
    if (!(poliza.patente || "").trim()) e.patente = "Patente";
    if (!(poliza.marca || "").trim()) e.marca = "Marca";
    if (!(poliza.modelo || "").trim()) e.modelo = "Modelo";
    if (!String(poliza.anio || "").trim()) e.anio = "Año";
    return e;
  }, [polizaModo, poliza]);

  const fechasErrors = useMemo(() => {
    const e = {};
    if (polizaModo === "existente") return e;
    if (!poliza.primer_vencimiento) e.primer_vencimiento = "Primer vencimiento";
    return e;
  }, [polizaModo, poliza]);

  // Arma el mensaje "Falta: A, B y C" a partir de los errores
  const listaFaltantes = (errs) => {
    const labels = Object.values(errs);
    if (labels.length === 0) return "";
    if (labels.length === 1) return `Falta: ${labels[0]}`;
    const last = labels[labels.length - 1];
    return `Faltan: ${labels.slice(0, -1).join(", ")} y ${last}`;
  };

  const responsableOk = Boolean(String(responsableId).trim());
  const oficinaOk = isWebAdmin ? Boolean(String(poliza.oficina || "").trim()) : true;
  const canStepAsignacion = responsableOk && oficinaOk;          // paso 1
  const datosClienteOk = Object.keys(paso1Errors).length === 0;  // paso 2
  const fotosClienteOk = Object.keys(fotosClienteErrors).length === 0; // paso 3
  const companiaOk = Object.keys(companiaErrors).length === 0;   // paso 4
  const autoOk = Object.keys(autoErrors).length === 0;           // paso 5
  const fechasOk = Object.keys(fechasErrors).length === 0;       // paso 6
  const polizaOk = companiaOk && autoOk && fechasOk;
  // 🆕 En carga rápida (PDF) también exigimos el DNI: es lo único que permite
  //    reconocer si el cliente YA está en el sistema (por otro auto, por ejemplo).
  //    Sin esto, un cliente existente se podía duplicar si el PDF no traía DNI.
  const dniOk = clienteModo === "existente" || !paso1Errors.dni_cuit_cuil;
  const canSubmit = modoRapido
    ? (responsableOk && oficinaOk && dniOk && !saving)
    : (responsableOk && oficinaOk && datosClienteOk && polizaOk && !saving);

  // Responsables visibles: admin → TODOS (sin importar la oficina); empleado → los suyos
  const empleadosVisibles = useMemo(() => {
    // El admin puede asignar cualquier responsable de cualquier sucursal.
    // El empleado ve los que le devuelve el backend (los de su oficina).
    return empleados;
  }, [empleados]);

  // Admin elige sucursal en el paso 1 (al cambiarla, resetea el responsable)
  const elegirOficina = (oficinaId) => {
    const id = String(oficinaId || "").trim();
    if (!id) return;
    setPoliza((p) => ({ ...p, oficina: id }));
    setResponsableId("");
  };

  const goToStep = (target) => {
    if (target === step) return;
    if (target >= 2 && !canStepAsignacion) return toast.error(isWebAdmin ? "Elegí sucursal y responsable" : "Elegí el responsable");
    if (target >= 3 && !datosClienteOk) return toast.error(listaFaltantes(paso1Errors));
    if (target >= 4 && !companiaOk) return toast.error(listaFaltantes(companiaErrors));
    if (target >= 5 && !autoOk) return toast.error(listaFaltantes(autoErrors));
    if (target >= 6 && !fechasOk) return toast.error(listaFaltantes(fechasErrors));
    setStep(target);
  };

  // 🆕 Navegación del modo rápido (salta los datos ya cargados del PDF)
  const stepSiguiente = () => {
    if (modoRapido) {
      const i = SECUENCIA_RAPIDA.indexOf(step);
      const next = SECUENCIA_RAPIDA[i + 1];
      if (next != null) setStep(next);
    } else {
      goToStep(step + 1);
    }
  };
  const stepAtras = () => {
    if (modoRapido) {
      const i = SECUENCIA_RAPIDA.indexOf(step);
      const prev = SECUENCIA_RAPIDA[i - 1];
      if (prev != null) setStep(prev);
    } else {
      setStep((sx) => sx - 1);
    }
  };
  const esPrimerStep = modoRapido ? step === SECUENCIA_RAPIDA[0] : step <= 1;
  const esUltimoStep = step === 6;

  // 🚀 Handlers del gate de verificación previa
  // 🆕 Autocompletar el formulario con lo que extrae el lector de PDF
  const handlePdfExtraido = (datos) => {
    const c = datos?.cliente || {};
    const v = datos?.vehiculo || {};
    const pol = datos?.poliza || {};
    const cupones = datos?.cupones || [];
    setCuponesPdf(cupones);

    setCliente((prev) => ({
      ...prev,
      nombre: c.nombre || prev.nombre,
      dni_cuit_cuil: c.dni || prev.dni_cuit_cuil,
    }));

    const partes = String(v.marca_modelo || "").trim().split(/\s+/);
    const marca = partes.length ? partes[0] : "";
    const modelo = partes.length > 1 ? partes.slice(1).join(" ") : "";

    setPoliza((prev) => ({
      ...prev,
      numero_poliza: pol.numero || prev.numero_poliza,
      compania: pol.compania || prev.compania,
      patente: v.patente || prev.patente,
      marca: marca || prev.marca,
      modelo: modelo || prev.modelo,
      anio: v.anio ? String(v.anio) : prev.anio,
      numero_motor: v.motor || prev.numero_motor,
      numero_chasis: v.chasis || prev.numero_chasis,
      carroceria: tipoACarroceria(v.tipo) || prev.carroceria,
      primer_vencimiento: prev.primer_vencimiento,
      precio_cuota: cupones[0]?.importe != null ? String(cupones[0].importe) : prev.precio_cuota,
      cantidad_cuotas_override: cupones.length ? String(cupones.length) : prev.cantidad_cuotas_override,
    }));
  };

  const handleVerifyConfirmedNuevo = ({ cliente_id, dni } = {}) => {
    setVerifyOpen(false);
    // Si nos pasaron un cliente_id (CLIENTE_OTRO_AUTO o PATENTE_BAJA),
    // autocompletamos el step 1 en modo "existente" para no duplicar el cliente.
    if (cliente_id) {
      setClienteModo("existente");
      setClienteId(String(cliente_id));
      toast.success("Cliente vinculado. Solo falta cargar los datos del auto.");
    } else if (dni) {
      // 🆕 El DNI que se tipeó/confirmó en la verificación previa se lleva
      //    directo al formulario del cliente: no hay que escribirlo 2 veces.
      setCliente((c) => (c.dni_cuit_cuil ? c : { ...c, dni_cuit_cuil: dni }));
    }
  };

  const handleVerifyCancel = () => {
    setVerifyOpen(false);
    onClose?.();
  };

  async function handleUploadToSlot(file, folder, setter) {
    if (!file) return;
    const _mime =
      file.type || (file.name?.toLowerCase?.().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    try {
      const up = await uploadToCloudinary(file, { folder });
      setter({ file, url: up.secure_url, public_id: up.public_id, mime: _mime });
      toast.success("Subido");
    } catch {
      toast.error("No se pudo subir el archivo");
    }
  }

  const onUploadDNI = (file, key) =>
    handleUploadToSlot(file, "de-thames/clientes/dni", (val) =>
      setDniSlots((s) => ({ ...s, [key]: val }))
    );
  const onUploadFotoVehiculo = (file, key) =>
    handleUploadToSlot(file, "de-thames/solicitudes/fotos", (val) =>
      setFotoSlots((s) => ({ ...s, [key]: val }))
    );
  const onUploadDocVehiculo = (file, key) =>
    handleUploadToSlot(file, "de-thames/solicitudes/docs", (val) =>
      setDocSlots((s) => ({ ...s, [key]: val }))
    );

  const onSubmit = async () => {
    console.log("%c[ALTA] onSubmit ▶", "color:#0ea5e9;font-weight:bold", {
      canSubmit, modoRapido, responsableId, oficina: poliza.oficina,
      compania: poliza.compania, cobertura: poliza.cobertura,
      telefono: cliente.telefono,
    });
    if (!canSubmit) {
      console.warn("[ALTA] ⛔ canSubmit=false → no se crea.");
      // 🆕 Mensaje dinámico: antes siempre decía "revisá responsable", aunque
      //    el problema fuera otro (ej: DNI faltante en carga rápida) y confundía.
      const faltan = {};
      if (!responsableOk) faltan.responsable = "Responsable";
      if (!oficinaOk) faltan.oficina = "Sucursal";
      if (modoRapido && !dniOk) faltan.dni = "DNI del cliente";
      if (!modoRapido && !datosClienteOk) faltan.datos = "datos del cliente";
      if (!modoRapido && !polizaOk) faltan.poliza = "datos de la póliza";
      toast.error(listaFaltantes(faltan) || "Faltan datos para crear la solicitud.");
      return;
    }
    setSaving(true);
    try {
      const ciaObj = companias.find(
        (c) =>
          String(c.id) === String(poliza.compania) || String(c.nombre) === String(poliza.compania)
      );
      const finalCompania = ciaObj ? ciaObj.nombre : poliza.compania;

      const cobObj = coberturas.find(
        (c) =>
          String(c.id) === String(poliza.cobertura) ||
          String(c.nombre) === String(poliza.cobertura)
      );
      const finalCobertura = cobObj ? cobObj.nombre : poliza.cobertura;

      const payload = {
        cliente: {},
        poliza: {},
        solicitud: {},
        fotos: {},
        documentos: {},
        cliente_fotos: {},
        oficina: poliza.oficina ? Number(poliza.oficina) : null,
      };

      const dniFrUrl = dniSlots.DNI_FRENTE?.url || null;
      const dniFrPid = dniSlots.DNI_FRENTE?.public_id || "";
      const dniDoUrl = dniSlots.DNI_DORSO?.url || null;
      const dniDoPid = dniSlots.DNI_DORSO?.public_id || "";

      if (clienteModo === "existente") {
        payload.cliente = { modo: "existente", id: Number(clienteId) };
      } else {
        payload.cliente = {
          modo: "nuevo",
          nombre: cliente.nombre.trim(),
          apellido: cliente.apellido.trim(),
          telefono: normalizaTelefonoAR(cliente.telefono),
          dni_cuit_cuil: (cliente.dni_cuit_cuil || "").trim(),
          direccion: (cliente.direccion || "").trim(),
          localidad: (cliente.localidad || "").trim(),
        };
      }

      if (dniFrUrl) payload.cliente_fotos.DNI_FRENTE = { url: dniFrUrl, public_id: dniFrPid };
      if (dniDoUrl) payload.cliente_fotos.DNI_DORSO = { url: dniDoUrl, public_id: dniDoPid };

      if (polizaModo === "existente") {
        payload.poliza = { modo: "existente", id: Number(polizaId) };
      } else {
        payload.poliza = {
          modo: "nueva",
          // 🆕 número detectado del PDF (o cargado a mano). Si marcan "sin número", va vacío y el backend genera uno.
          numero_poliza: sinNumero ? "" : (poliza.numero_poliza || "").trim(),
          compania: finalCompania.trim(),
          cobertura: finalCobertura.trim(),
          oficina: poliza.oficina ? Number(poliza.oficina) : null,
          patente: poliza.patente.trim().toUpperCase(),
          marca: poliza.marca.trim(),
          modelo: poliza.modelo.trim(),
          anio: Number(poliza.anio),
          tipo: poliza.tipo || "Auto",
          numero_motor: (poliza.numero_motor || "").trim(),
          numero_chasis: (poliza.numero_chasis || "").trim(),
          combustible: (poliza.combustible || "").trim(),
          carroceria: (poliza.carroceria || "").trim(),
          observaciones: (poliza.observaciones || "").trim(),
          precio_cuota: 0,
          cantidad_cuotas_override: poliza.cantidad_cuotas_override
            ? Number(poliza.cantidad_cuotas_override)
            : undefined,
          primer_vencimiento: poliza.primer_vencimiento,
          fecha_emision: poliza.fecha_emision || ymdLocal(new Date()),
          dias_a_vencer: Number(poliza.dias_a_vencer) || 30,
          generar_cuotas_ahora: !!poliza.generar_cuotas_ahora,
          regenerar_cuotas: false,
          // 🎟️ Cuponera del PDF: si vino, el backend usa estas fechas exactas
          //    (cantidad + vencimientos reales) en vez de 6 cuotas mensuales.
          cupones: (cuponesPdf || []).map((c) => ({
            numero: c.numero,
            vencimiento: c.vencimiento,
            importe: c.importe,
          })),
        };
      }

      payload.solicitud = {
        responsable_empleado: Number(responsableId),
        responsable: "",
        prioridad: solicitud.prioridad || "NORMAL",
        observaciones: (solicitud.observaciones || "").trim(),
        motivo: "ALTA_POLIZA",
        tipoSeguro: solicitud.tipoSeguro || "ROBO",
        cobertura_solicitada: finalCobertura.trim(),
        compania_preferida: finalCompania.trim(),
      };

      Object.entries(docSlots || {}).forEach(([key, s]) => {
        if (!s?.url) return;
        payload.documentos[key] = {
          url: s.url,
          public_id: s.public_id,
          mime: s.mime || guessMime(s?.file?.name || ""),
          nombre: key,
        };
      });

      Object.entries(fotoSlots || {}).forEach(([key, s]) => {
        if (!s?.url) return;
        const sendKey = key === "TUBO_GNC" ? "EQUIPO_GNC" : key;
        payload.documentos[sendKey] = {
          url: s.url,
          public_id: s.public_id,
          mime: guessMime(),
          nombre: sendKey,
        };
      });

      // 🆕 documentos del PDF subido en la carga rápida (póliza / cupones / certificado)
      (initialDatosPdf?.documentos || []).forEach((d, i) => {
        if (!d?.url) return;
        const key = `${d.tipo || "POLIZA_PDF"}${i ? "_" + i : ""}`;
        payload.documentos[key] = {
          url: d.url,
          public_id: d.public_id || "",
          mime: d.mime || "application/pdf",
          nombre: d.nombre || "documento.pdf",
        };
      });

      console.log("%c[ALTA] payload ▶", "color:#a855f7;font-weight:bold", payload);
      const raw = await solicitudesApi.crearCompleto(payload);
      console.log("%c[ALTA] ✅ creada OK", "color:#10b981;font-weight:bold", raw);
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
          poliza_cobertura: finalCobertura.trim(),
          poliza_compania: finalCompania.trim(),
        });
      } catch (err) {
        console.warn("Email alert falló", err);
      }

      // 🆕 En vez de cerrar, ofrecemos cobrar la 1ª cuota.
      //    onCreated + onClose se ejecutan al terminar ese flujo (o si no hay póliza).
      //    AMCA cobra por Rapipago/Pago Fácil (fuera de Thames): no se ofrece "cobrar ahora".
      const nuevaPolizaId = raw?.poliza_id;
      const esAmca = String(finalCompania || "").trim().toUpperCase() === "AMCA";
      if (nuevaPolizaId && !esAmca) {
        setCreatedRaw(raw);
        setCobroPolizaId(nuevaPolizaId);
      } else {
        if (onCreated) onCreated(raw);
        onClose();
      }
    } catch (e) {
      console.error("%c[ALTA] ❌ ERROR al crear", "color:#ef4444;font-weight:bold", e);
      console.error("[ALTA] detalle del backend:", e?.response?.status, e?.response?.data);
      const det = e?.response?.data;
      const msg = (det && (det.detail || JSON.stringify(det))) || e?.message || "Error al crear la solicitud";
      toast.error(String(msg).slice(0, 200));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  const selectedOficinaObj = oficinas.find((o) => String(o.id) === String(poliza.oficina));
  const headerOficinaName = isWebAdmin
    ? selectedOficinaObj
      ? selectedOficinaObj.nombre
      : "SELECCIONANDO SUCURSAL..."
    : user?.perfil?.oficina_nombre || "Local";

  // 🚀 Si el gate de verificación está abierto, mostramos SOLO el gate
  if (verifyOpen) {
    return (
      <VerificarClienteGate
        open={verifyOpen}
        initialDni={modoRapido ? (initialDatosPdf?.cliente?.dni || "") : ""}
        initialPatente={modoRapido ? (initialDatosPdf?.vehiculo?.patente || "") : ""}
        autoVerificar={modoRapido}
        onConfirmNuevo={handleVerifyConfirmedNuevo}
        onCancel={handleVerifyCancel}
      />
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-[90] flex items-stretch sm:items-center justify-center overscroll-contain touch-pan-y">
      <div
        className={`absolute inset-0 ${
          saving ? "cursor-wait" : "cursor-pointer"
        } bg-black/70 backdrop-blur-sm`}
        onClick={() => !saving && onClose?.()}
      />

      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative w-full sm:max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:mx-auto sm:rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden bg-[#0b0f1e]"
      >
        <div className="shrink-0 border-b border-white/10 bg-[#0f0c28]/80 backdrop-blur px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2 text-lg">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <HiSparkles />
            </span>
            Crear Solicitud
            <span className="text-[10px] uppercase bg-white/10 px-2 py-0.5 rounded ml-2 text-white/50">
              {headerOficinaName}
            </span>

            {isWebAdmin && poliza.oficina && (
              <button
                onClick={() => setStep(1)}
                className="text-[9px] uppercase font-black bg-sky-500/20 text-sky-400 px-2 py-1 rounded ml-1 hover:bg-sky-500/40 transition-colors"
              >
                Cambiar Sucursal
              </button>
            )}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
          >
            <HiX />
          </button>
        </div>

        {!modoRapido && (
        <div className="shrink-0 px-4 py-3 bg-white/5 border-b border-white/10 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            <StepBadge
              active={step === 1}
              done={step > 1}
              icon={<HiUser />}
              label="Asignación"
              onClick={() => goToStep(1)}
              color="from-violet-400/20 to-indigo-500/20"
            />
            <StepBadge
              active={step === 2}
              done={step > 2}
              icon={<HiUser />}
              label="Datos asegurado"
              onClick={() => goToStep(2)}
              color="from-emerald-400/20 to-emerald-500/20"
            />
            <StepBadge
              active={step === 3}
              done={step > 3}
              icon={<HiShieldCheck />}
              label="Compañía"
              onClick={() => goToStep(3)}
              color="from-sky-400/20 to-sky-500/20"
            />
            <StepBadge
              active={step === 4}
              done={step > 4}
              icon={<HiShieldCheck />}
              label="Datos del auto"
              onClick={() => goToStep(4)}
              color="from-cyan-400/20 to-cyan-500/20"
            />
            <StepBadge
              active={step === 5}
              done={step > 5}
              icon={<HiShieldCheck />}
              label="Fechas"
              onClick={() => goToStep(5)}
              color="from-indigo-400/20 to-indigo-500/20"
            />
            <StepBadge
              active={step === 6}
              done={false}
              icon={<HiDocumentText />}
              label="Resumen"
              onClick={() => goToStep(6)}
              color="from-amber-400/20 to-amber-500/20"
            />
          </div>
        </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 0 && cargandoCliente && (
              <div className="flex flex-col items-center justify-center py-16 text-white/60 text-sm">
                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-sky-400 animate-spin mb-3" />
                Cargando datos del cliente…
              </div>
            )}
            {step === 0 && !cargandoCliente && (
              <motion.div key="rev" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                <RevisionRapidaStep
                  clienteModo={clienteModo}
                  cliente={cliente}
                  setCliente={setCliente}
                  poliza={poliza}
                  setPoliza={setPoliza}
                  coberturas={coberturas}
                  companias={companias}
                  empleados={empleadosVisibles}
                  empleadosLoading={empleadosLoading}
                  responsableId={responsableId}
                  onElegirResponsable={(id) => setResponsableId(String(id))}
                  onTerminar={onSubmit}
                />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="s0"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <AsignacionStep
                  isWebAdmin={isWebAdmin}
                  oficinasList={oficinasList}
                  oficinaSel={poliza.oficina}
                  onElegirOficina={elegirOficina}
                  userOficinaNombre={user?.perfil?.oficina_nombre || "Mi sucursal"}
                  empleados={empleadosVisibles}
                  empleadosLoading={empleadosLoading}
                  responsableId={responsableId}
                  onElegirResponsable={(id) => setResponsableId(String(id))}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="s1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <LectorPdfButton onExtraido={handlePdfExtraido} />
                <ClienteStep
                  section="datos"
                  clienteModo={clienteModo}
                  setClienteModo={setClienteModo}
                  clienteId={clienteId}
                  setClienteId={setClienteId}
                  cliente={cliente}
                  setCliente={setCliente}
                  dniSlots={dniSlots}
                  setDniSlots={setDniSlots}
                  TIPO_DNI_SLOTS={TIPO_DNI_SLOTS}
                  onUploadDNI={onUploadDNI}
                />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="s2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PolizaStep
                  section="compania"
                  polizaModo={polizaModo}
                  setPolizaModo={setPolizaModo}
                  polizaId={polizaId}
                  setPolizaId={setPolizaId}
                  poliza={poliza}
                  setPoliza={setPoliza}
                  sinNumero={sinNumero}
                  setSinNumero={setSinNumero}
                  companias={companias}
                  coberturas={coberturas}
                  oficinas={oficinas}
                  setTocoCantidadCuotas={setTocoCantidadCuotas}
                  cuotasPreview={cuotasPreview}
                  isWebAdmin={isWebAdmin}
                />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div
                key="s2b"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PolizaStep
                  section="auto"
                  polizaModo={polizaModo}
                  setPolizaModo={setPolizaModo}
                  polizaId={polizaId}
                  setPolizaId={setPolizaId}
                  poliza={poliza}
                  setPoliza={setPoliza}
                  sinNumero={sinNumero}
                  setSinNumero={setSinNumero}
                  companias={companias}
                  coberturas={coberturas}
                  oficinas={oficinas}
                  setTocoCantidadCuotas={setTocoCantidadCuotas}
                  cuotasPreview={cuotasPreview}
                  isWebAdmin={isWebAdmin}
                />
              </motion.div>
            )}
            {step === 5 && (
              <motion.div
                key="s2c"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <PolizaStep
                  section="fechas"
                  polizaModo={polizaModo}
                  setPolizaModo={setPolizaModo}
                  polizaId={polizaId}
                  setPolizaId={setPolizaId}
                  poliza={poliza}
                  setPoliza={setPoliza}
                  sinNumero={sinNumero}
                  setSinNumero={setSinNumero}
                  companias={companias}
                  coberturas={coberturas}
                  oficinas={oficinas}
                  setTocoCantidadCuotas={setTocoCantidadCuotas}
                  cuotasPreview={cuotasPreview}
                  isWebAdmin={isWebAdmin}
                />
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="s4"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <SolicitudStep
                  responsableNombre={responsableId ? `#${responsableId}` : ""}
                  onCambiarResponsable={() => setStep(1)}
                  solicitud={solicitud}
                  setSolicitud={setSolicitud}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!(modoRapido && step === 0) && (
        <div className="shrink-0 border-t border-white/10 bg-[#0f0c28]/95 backdrop-blur p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
          <button
            onClick={onClose}
            disabled={saving}
            className="hidden sm:inline-flex px-6 py-2.5 rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 font-bold uppercase text-xs transition-all"
          >
            Cancelar
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            {!esPrimerStep && (
              <button
                onClick={stepAtras}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 rounded-2xl bg-white/10 text-white font-bold uppercase text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <HiChevronLeft /> Atrás
              </button>
            )}
            {!esUltimoStep ? (
              <button
                onClick={stepSiguiente}
                className="flex-1 sm:flex-none px-8 py-3 sm:py-2.5 rounded-2xl bg-sky-600 text-white font-bold uppercase text-xs shadow-lg shadow-sky-900/40 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Siguiente <HiChevronRight />
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className="flex-1 sm:flex-none px-8 sm:px-10 py-3 sm:py-2.5 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs shadow-lg shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? "Procesando..." : "Finalizar"}
              </button>
            )}
          </div>
        </div>
        )}
      </motion.div>
    </div>

    {/* 🆕 Post-alta: cobrar la 1ª cuota + comprobante */}
    <CobrarPrimeraCuotaModal
      open={!!cobroPolizaId}
      polizaId={cobroPolizaId}
      onClose={() => {
        setCobroPolizaId(null);
        if (onCreated) onCreated(createdRaw);
        onClose?.();
      }}
    />
    </>
  );
}

function AsignacionStep({
  isWebAdmin, oficinasList, oficinaSel, onElegirOficina, userOficinaNombre,
  empleados, empleadosLoading, responsableId, onElegirResponsable,
}) {
  const [cambiarOfi, setCambiarOfi] = useState(false);
  const ofiNombre = isWebAdmin
    ? (oficinasList.find((o) => String(o.id) === String(oficinaSel))?.nombre || "Elegí una sucursal")
    : userOficinaNombre;
  const mostrarSelectorOfi = isWebAdmin && (cambiarOfi || !oficinaSel);
  return (
    <div className="space-y-5">
      {/* Sucursal — auto-asignada; admin puede cambiarla */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl">
        <legend className="px-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">Sucursal</legend>
        {mostrarSelectorOfi ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {oficinasList.length === 0 ? (
              <p className="text-white/40 text-xs italic">Cargando sucursales...</p>
            ) : oficinasList.map((o) => {
              const sel = String(oficinaSel) === String(o.id);
              return (
                <button key={o.id} type="button" onClick={() => { onElegirOficina(o.id); setCambiarOfi(false); }}
                  className={`text-left px-4 py-3 rounded-xl border font-bold text-sm transition-all ${sel ? "bg-sky-500/20 border-sky-500/50 text-white" : "bg-white/5 border-white/10 text-white/70 hover:border-sky-500/30"}`}>
                  {o.nombre || `Oficina ${o.id}`}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
              <HiShieldCheck /> {ofiNombre}
            </div>
            {isWebAdmin && (
              <button type="button" onClick={() => setCambiarOfi(true)}
                className="text-[11px] text-sky-300 hover:text-sky-200 underline underline-offset-2">
                Cambiar
              </button>
            )}
          </div>
        )}
      </fieldset>

      {/* Responsable */}
      <fieldset className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 shadow-xl">
        <legend className="px-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">Responsable</legend>
        {isWebAdmin && !oficinaSel ? (
          <p className="text-white/40 text-xs italic mt-2">Elegí primero la sucursal para ver sus responsables.</p>
        ) : empleadosLoading ? (
          <p className="text-white/40 text-xs italic mt-2 animate-pulse">Cargando responsables...</p>
        ) : empleados.length === 0 ? (
          <p className="text-white/40 text-xs italic mt-2">No hay responsables activos en esta sucursal.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {empleados.map((e) => {
              const sel = String(responsableId) === String(e.id);
              return (
                <button key={e.id} type="button" onClick={() => onElegirResponsable(e.id)}
                  className={`flex items-center gap-2 text-left px-4 py-3 rounded-xl border font-bold text-sm transition-all ${sel ? "bg-violet-500/25 border-violet-500/50 text-white" : "bg-white/5 border-white/10 text-white/80 hover:border-violet-500/40"}`}>
                  {sel ? <HiCheckCircle className="text-violet-300 shrink-0" /> : <HiUser className="text-white/40 shrink-0" />}
                  <span className="truncate">{e.nombre}</span>
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}

function StepBadge({ active, done, icon, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-3 sm:px-4 py-2.5 border transition-all duration-300 ${
        active
          ? `border-white/25 bg-gradient-to-br ${color} text-white shadow-lg`
          : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10"
      }`}
      title={label}
    >
      <span
        className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${
          active ? "bg-white/20" : "bg-white/5"
        }`}
      >
        {done ? <HiCheckCircle className="text-emerald-400" /> : icon}
      </span>
      {/* En celular solo se ve la etiqueta del paso activo; en desktop todas */}
      <span className={`text-[11px] font-bold uppercase tracking-tight whitespace-nowrap ${active ? "inline" : "hidden sm:inline"}`}>
        {label}
      </span>
    </button>
  );
}