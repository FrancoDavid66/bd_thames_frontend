// src/components/solicitudes/NuevaSolicitudModal.jsx
//
// 🆕 NUEVA SOLICITUD — flujo guiado, no se traba.
//
//   Paso 1: DNI (verifica si el cliente ya existe).
//   Paso 2: ¿Cómo cargás? → 📄 Con PDF  /  ✍️ A mano.
//
//   ── Camino PDF ──
//     Paso 3: Elegí compañía → botones NRE / AMCA / EQUIDAD (queda fijada).
//     Paso 4: Subí el archivo (NRE = MERCOSUR · AMCA = Propuesta ·
//             EQUIDAD = Póliza completa, un solo PDF con todo). Si sube el
//             equivocado, se lo avisa. Después, formulario + crear.
//
//   ── Camino Manual (wizard) ──
//     Paso 3a: Datos del cliente.
//     Paso 3b: Datos del vehículo + compañía (en botones).
//     Paso 3c: Confirmar y crear.
//
//   · Casi TODO es opcional (se rectifica después). Solo la compañía es obligatoria.
//   · Si el cliente ya existe, el PDF solo trae el vehículo.
//   · Con cuponera (cupones del PDF) NO se ofrece cobrar la 1ª cuota.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiArrowLeft,
  HiUpload,
  HiCheckCircle,
  HiExclamationCircle,
  HiUser,
  HiIdentification,
  HiPhone,
  HiTruck,
  HiSparkles,
  HiCash,
  HiSearch,
  HiExternalLink,
  HiDocumentText,
  HiPencilAlt,
} from "react-icons/hi";
import toast from "react-hot-toast";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { solicitudesApi } from "../../services/solicitudes.js";
import { uploadToCloudinary } from "../../utils/cloudinary.js";

import Boton3D from "../ui/Boton3D";
import CardDuo from "../ui/CardDuo";
import InputDuo from "../ui/InputDuo";
import SelectDuo from "../ui/SelectDuo";

import ResponsablesModal from "./ResponsablesModal";
import CobrarPrimeraCuotaModal from "./CobrarPrimeraCuotaModal";

/* ═══════════════ helpers ═══════════════ */

const soloDigitos = (v) => String(v || "").replace(/\D/g, "");

function partirMarcaModelo(texto) {
  const t = String(texto || "").trim().replace(/\s+/g, " ");
  if (!t) return { marca: "", modelo: "" };
  const partes = t.split(" ");
  const marca = partes.shift() || "";
  return { marca, modelo: partes.join(" ") };
}

// Normaliza para comparar compañías (sin mayúsculas, puntos, tildes).
const _normCia = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

// Busca en la lista del front la compañía que matchea la detectada. Devuelve el
// nombre EXACTO de la lista (para que el select lo enganche) o la detectada.
function matchCompania(detectada, companias) {
  const det = _normCia(detectada);
  if (!det) return "";
  const lista = (companias || []).map((c) => (c?.nombre ?? c));
  let hit = lista.find((n) => _normCia(n) === det);
  if (!hit) hit = lista.find((n) => _normCia(n).includes(det) || det.includes(_normCia(n)));
  return hit || detectada;
}

// 🚗 TIPO DE VEHÍCULO — texto libre, NO un select de 5 opciones.
//
// Los PDFs de las compañías no usan las palabras del sistema. AMCA dice
// 'H - PICK-UP/JEEP "A" PARTICULAR'. Como no estaba en la lista, el select no
// lo podía mostrar y caía en "Auto" (la primera opción): se perdía el dato real.
//
// Ahora se guarda TAL CUAL lo dice el PDF. El backend lo traduce al vuelo
// cuando necesita la categoría (precio NRE, reporte) — ver precios_nre.py →
// resolver_tipo(), que además corrige por modelo.
//
// Estos son ATAJOS para la carga manual, no una lista cerrada.
const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

// Traduce el texto libre a la categoría, SOLO para mostrar el chip en pantalla.
function categoriaVehiculo(txt) {
  const t = String(txt || "")
    .toLowerCase()
    .replace(/[áà]/g, "a").replace(/[éè]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óò]/g, "o").replace(/[úù]/g, "u");
  if (!t.trim()) return "";
  if (/moto|ciclomotor|scooter/.test(t)) return "Moto";
  if (/camioneta|pick|furg|utilitar|jeep|suv|4x4|van/.test(t)) return "Camioneta";
  if (/camion/.test(t)) return "Camion";
  if (/acoplad|trailer|remolque|batan|casilla/.test(t)) return "Trailer";
  if (/auto/.test(t)) return "Auto";
  return "";
}

// Config de cada compañía "rápida" del camino PDF.
/* 🪪 ¿ESTOS DOS DOCUMENTOS SON DE LA MISMA PERSONA?
   ────────────────────────────────────────────────
   No alcanza con comparar los números tal cual: el CUIT ES el DNI con un
   prefijo y un verificador pegados.

       DNI      94841586
       CUIT   20 94841586 7

   Si el operador cargó el CUIT y el PDF trae el DNI (o al revés), es el
   MISMO cliente. Avisar de un conflicto ahí sería enseñarle a ignorar los
   avisos — y el día que haya uno de verdad, lo va a saltear igual.

   Devuelve true también cuando falta alguno: sin dos números no hay nada
   que comparar, y una alerta sin motivo es peor que ninguna. */
function mismoDocumento(a, b) {
  const x = soloDigitos(a);
  const y = soloDigitos(b);
  if (!x || !y) return true;
  if (x === y) return true;
  const nucleo = (d) => (d.length === 11 ? d.slice(2, 10) : d);
  return nucleo(x) === nucleo(y);
}


const CIAS_PDF = {
  NRE: {
    nombre: "NRE",
    archivo: "MERCOSUR",
    ayuda: "Subí el certificado MERCOSUR de NRE.",
    // palabras que deberían estar en el PDF correcto
    match: ["mercosur", "mercosul", "nre"],
    // ¿El PDF de esta compañía tiene que traer cuponera sí o sí?
    // NRE no: las cuotas son regulares y las calcula el sistema.
    esperaCupones: false,
  },
  AMCA: {
    nombre: "AMCA",
    archivo: "Propuesta completa",
    ayuda: "Subí la Propuesta completa de AMCA (la que trae los cupones).",
    match: ["asociacion mutual", "amca", "rapipago", "cuota nro"],
    esperaCupones: true,
  },
  // 🆕 LA EQUIDAD — manda UN solo PDF con TODO adentro (~19 hojas):
  //    frente de póliza + liquidación de premio (las cuotas) + los cupones
  //    + el MERCOSUR. No hay que subir nada más.
  EQUIDAD: {
    nombre: "Equidad",
    archivo: "Póliza completa",
    ayuda: "Subí la Póliza completa de La Equidad (el PDF largo, con los cupones).",
    match: ["equidad", "recibimos de", "pagos link"],
    esperaCupones: true,
  },
};

function formVacio() {
  return {
    cli_nombre: "",
    cli_apellido: "",
    cli_dni: "",
    cli_telefono: "",
    cli_localidad: "",
    cli_provincia: "",
    cli_direccion: "",
    patente: "",
    marca: "",
    modelo: "",
    anio: "",
    tipo: "Auto",
    compania: "",
    cobertura: "",
    numero_poliza: "",
    numero_motor: "",
    numero_chasis: "",
    observaciones: "",
  };
}

/* Los 4 pasos del camino por PDF. El manual usa los 3 por defecto. */
const PASOS_PDF = ["Archivo", "Cliente", "Vehículo", "Confirmar"];

/* ═══════════════ componente ═══════════════ */

export default function NuevaSolicitudModal({
  onClose,
  onCreated,
  companias = [],
  coberturas = [],
  oficinas = [],
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  // Pasos del wizard. Los dos caminos comparten el arranque y después se
  // abren:
  //   común  : "dni" → "telefono" → "modo"
  //   PDF    : "pdf_cia" → "pdf_archivo" → "pdf_cliente" → "pdf_vehiculo" → "pdf_confirmar"
  //   a mano : "man_cliente" → "man_vehiculo" → "man_confirmar"
  //
  // 🐛 El camino de PDF era UN SOLO paso ("pdf_form") con todo adentro: subir
  //    el archivo, los avisos, el responsable, el cliente, el vehículo, la
  //    compañía, la cobertura y la sucursal. Un scroll interminable donde no
  //    se sabía dónde estabas ni qué faltaba, y con el botón "Crear" activo
  //    desde el primer segundo.
  const [paso, setPaso] = useState("dni");

  const [form, setForm] = useState(formVacio());
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  // PDF
  const [pdfTrajo, setPdfTrajo] = useState({});
  const [cuponesPdf, setCuponesPdf] = useState([]);
  // 📦 Caja con lo que el lector saca del PDF y no tiene campo en el formulario:
  //    clave de pago (PMC / Link), nº de certificado, qué cubre, CUIT, GNC.
  //    Viaja tal cual al backend y se guarda en Poliza.datos_extra.
  const [datosExtraPdf, setDatosExtraPdf] = useState({});
  const [datosDetectados, setDatosDetectados] = useState([]);
  const [companiaDetectada, setCompaniaDetectada] = useState("");
  const [ciaElegida, setCiaElegida] = useState(null); // "NRE" | "AMCA" | "EQUIDAD" (camino PDF)
  const pdfInputRef = useRef(null);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [pdfSubido, setPdfSubido] = useState(null);
  const [avisoArchivo, setAvisoArchivo] = useState(""); // "subiste el archivo equivocado"
  // 📞 El teléfono se pregunta en su propio paso, justo después del DNI.
  //    Arranca con el que ya tiene el cliente en la base, si existe.
  const [telInput, setTelInput] = useState("");
  // Lo que el lector encontró raro o no pudo leer. Queda a la vista hasta
  // que se sube otro PDF: son las cosas a revisar antes de crear el alta.
  const [avisosPdf, setAvisosPdf] = useState([]);
  // 🪪 El DNI que trajo el PDF, cuando NO coincide con el que se cargó.
  //    Vacío mientras todo cierre.
  const [dniConflicto, setDniConflicto] = useState("");

  // Responsable (opcional)
  const [responsable, setResponsable] = useState(null);
  const [empleados, setEmpleados] = useState([]);
  const [abrirResponsables, setAbrirResponsables] = useState(false);

  // Oficina
  const oficinaEmpleado = user?.perfil?.oficina?.id || user?.perfil?.oficina || null;
  const [oficinaId, setOficinaId] = useState(isWebAdmin ? "" : String(oficinaEmpleado || ""));

  // DNI
  const [dniInput, setDniInput] = useState("");
  const [verificandoDni, setVerificandoDni] = useState(false);
  const [clienteExistente, setClienteExistente] = useState(null);

  // Guardado
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(null);
  const [abrirCobro, setAbrirCobro] = useState(false);

  // 🎟️ Cuotas cargadas A MANO (modo manual + AMCA): [{vencimiento, importe}]
  const [cuotasManual, setCuotasManual] = useState([]);

  /* ---------- empleados activos ---------- */
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = await solicitudesApi.empleadosActivos();
        if (vivo) setEmpleados(Array.isArray(lista) ? lista : []);
      } catch {}
    })();
    return () => {
      vivo = false;
    };
  }, []);

  /* ═══════════ PASO 1: verificar DNI ═══════════ */
  async function verificarDni() {
    const dni = soloDigitos(dniInput);
    if (!dni) {
      toast.error("Escribí un DNI para verificar.");
      return;
    }
    setVerificandoDni(true);
    try {
      const res = await api.get(`/clientes/`, { params: { search: dni } });
      const arr = res?.data?.results || res?.data || [];
      const match = (Array.isArray(arr) ? arr : []).find(
        (c) => soloDigitos(c.dni_cuit_cuil || c.dni) === dni
      );
      if (match) {
        setClienteExistente(match);
        setForm((f) => ({
          ...f,
          cli_dni: dni,
          cli_nombre: match.nombre || "",
          cli_apellido: match.apellido || "",
          cli_telefono: match.telefono || "",
          cli_localidad: match.localidad || "",
          cli_direccion: match.direccion || "",
        }));
        // 📞 El teléfono que YA tenemos, listo para confirmar o corregir.
        //    No hay que volver a preguntárselo al cliente si ya está.
        setTelInput(match.telefono || "");
        toast.success(`Cliente encontrado: ${match.nombre || ""} ${match.apellido || ""}`.trim());
      } else {
        setClienteExistente(null);
        setForm((f) => ({ ...f, cli_dni: dni }));
        setTelInput("");
        toast("DNI nuevo — vas a crear un cliente nuevo.", { icon: "🆕" });
      }
      setPaso("telefono");
    } catch (err) {
      console.error("[NuevaSolicitud] DNI:", err);
      setClienteExistente(null);
      setForm((f) => ({ ...f, cli_dni: dni }));
      toast("No se pudo verificar, pero podés seguir.", { icon: "⚠️" });
      setPaso("telefono");
    } finally {
      setVerificandoDni(false);
    }
  }

  function saltearDni() {
    setClienteExistente(null);
    setForm((f) => ({ ...f, cli_dni: "" }));
    setPaso("telefono");
  }

  /* ---------- 📞 teléfono ---------- */
  //
  // 📞 POR QUÉ EL TELÉFONO TIENE SU PROPIO PASO.
  //
  //    Es el dato del que dependen el link del portal y TODOS los avisos por
  //    WhatsApp: recordatorios de cuota, bienvenida, aviso de vencimiento.
  //    Sin él la póliza se crea igual y nadie se entera — hasta que el
  //    cliente no paga porque nunca le llegó el recordatorio.
  //
  //    Perdido entre quince campos del formulario, se saltea. Solo, en su
  //    propia pantalla, se completa.
  //
  //    Si el cliente ya está en la base, aparece el que tiene registrado y
  //    solo hay que confirmarlo. Si lo edita, se actualiza en el cliente.
  function confirmarTelefono() {
    const tel = soloDigitos(telInput);
    if (tel && tel.length < 8) {
      toast.error("El teléfono parece corto. Revisalo o seguí sin número.");
      return;
    }
    setForm((f) => ({ ...f, cli_telefono: tel }));
    setPaso("modo");
  }

  function saltearTelefono() {
    setPaso("modo");
  }

  /* ---------- elegir compañía (camino PDF) ---------- */
  function elegirCia(key) {
    setCiaElegida(key);
    // La compañía queda FIJADA (matcheada contra la lista del front).
    const nombre = matchCompania(CIAS_PDF[key].nombre, companias);
    setForm((f) => ({ ...f, compania: nombre }));
    setCompaniaDetectada("");
    setAvisoArchivo("");
    setAvisosPdf([]);
    setDniConflicto("");
    setPaso("pdf_archivo");
  }

  /* ---------- 🪪 resolver el conflicto de DNI ---------- */
  //
  // Si el operador decide que el DNI bueno es el del PDF, se vuelve al paso 1
  // con ese número cargado. No se pisa el campo y listo: hay que rehacer la
  // búsqueda del cliente, y de ahí sale todo lo demás — si existe, sus datos;
  // si no, un cliente nuevo; y su teléfono.
  //
  // Cambiar solo el número dejaría el formulario mostrando al cliente
  // equivocado con el DNI correcto. Peor que el problema original.
  function usarDniDelPdf() {
    setDniInput(dniConflicto);
    setDniConflicto("");
    setClienteExistente(null);
    setPaso("dni");
    toast("Verificá el DNI del PDF y seguí desde ahí.", { icon: "🪪" });
  }

  /* ---------- aplicar datos del PDF ---------- */
  function aplicarDatosPdf(datos, textoPlano = "") {
    const cli = datos?.cliente || {};
    const veh = datos?.vehiculo || {};
    const pol = datos?.poliza || {};
    const cupones = Array.isArray(datos?.cupones) ? datos.cupones : [];

    const { marca, modelo } = veh.marca_modelo
      ? partirMarcaModelo(veh.marca_modelo)
      : { marca: veh.marca || "", modelo: veh.modelo || "" };

    const trajo = {};
    const clienteYaRegistrado = !!clienteExistente;

    // 🐛 LOS CHIPS SE ARMAN ACÁ AFUERA, NO ADENTRO DEL setForm.
    //
    //    Antes se hacía `chips.push(...)` dentro del updater `setForm(prev => …)`.
    //    React puede ejecutar ese updater MÁS DE UNA VEZ (lo hace siempre en
    //    modo desarrollo con StrictMode), así que los chips se duplicaban:
    //    "Compañía: Equidad" aparecía tres veces en pantalla.
    //
    //    Regla: el updater de setForm solo calcula el estado nuevo. Nada de
    //    empujar arrays ni llamar a otros setState desde adentro.
    const ciaDetectada =
      pol.compania && String(pol.compania).trim()
        ? matchCompania(pol.compania, companias)
        : "";

    const chips = [];
    if (veh.patente) chips.push(`Patente: ${veh.patente}`);
    if (marca || modelo) chips.push(`${marca} ${modelo}`.trim());
    if (ciaDetectada) chips.push(`Compañía: ${ciaDetectada}`);
    if (pol.cobertura) chips.push(`Cobertura: ${pol.cobertura}`);
    if (cupones.length) {
      chips.push(`${cupones.length} ${cupones.length === 1 ? "cupón" : "cupones"}`);
    }

    setForm((prev) => {
      const next = { ...prev };
      const poner = (campo, valor) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
          next[campo] = String(valor).trim();
          trajo[campo] = true;
        }
      };

      if (!clienteYaRegistrado) {
        if (!prev.cli_nombre) poner("cli_nombre", cli.nombre);
        poner("cli_apellido", cli.apellido); // 🆕 apellido separado del PDF
        poner("cli_direccion", cli.direccion);
        poner("cli_localidad", cli.localidad);
        poner("cli_provincia", cli.provincia); // 🆕 provincia del PDF
      }
      // 📞 El teléfono se preguntó en su propio paso, ANTES de subir el PDF.
      //    Lo que haya ahí manda: lo dijo el cliente hoy, el papel puede
      //    tener uno viejo. Solo se completa si quedó vacío (se salteó el
      //    paso) y el PDF trae alguno — así no se pierde un dato que está.
      if (!prev.cli_telefono) poner("cli_telefono", cli.telefono);

      poner("patente", veh.patente);
      poner("marca", marca);
      poner("modelo", modelo);
      poner("anio", veh.anio);
      poner("numero_motor", veh.motor);
      poner("numero_chasis", veh.chasis);
      if (veh.tipo) poner("tipo", veh.tipo);
      poner("numero_poliza", pol.numero);
      // Compañía: si el PDF la trae, la matcheamos. Si no, queda la fijada por el botón.
      if (ciaDetectada) {
        next.compania = ciaDetectada;
        trajo.compania = true;
      }
      poner("cobertura", pol.cobertura);
      return next;
    });

    if (ciaDetectada) setCompaniaDetectada(ciaDetectada);
    setPdfTrajo(trajo);

    // 🪪 ¿EL PDF ES DE OTRA PERSONA?
    //
    //    El DNI del paso 1 manda: lo tipeó alguien mirando el documento.
    //    Por eso `aplicarDatosPdf` nunca lo pisa.
    //
    //    Pero antes tampoco lo MIRABA. Si el operador tipeaba un dígito de
    //    más, o arrastraba el PDF del cliente anterior, la póliza quedaba
    //    con el DNI de uno y el auto de otro. Sin un solo aviso.
    //
    //    Es el error más caro de todos: se descubre cuando hay un siniestro
    //    y la compañía dice que ese auto no es de esa persona.
    //
    //    No se corrige solo. Se muestra el conflicto y decide el operador:
    //    puede ser un PDF equivocado o un DNI mal tipeado, y desde acá no
    //    hay forma de saber cuál.
    const dniPdf = soloDigitos(cli.dni || cli.cuit || "");
    setDniConflicto(
      dniPdf && !mismoDocumento(dniPdf, form.cli_dni) ? dniPdf : ""
    );
    setCuponesPdf(cupones);
    if (datos?.datos_extra && typeof datos.datos_extra === "object") {
      setDatosExtraPdf(datos.datos_extra);
    }
    setDatosDetectados(chips);

    // ── Chequeo: ¿el PDF coincide con la compañía elegida? ──
    if (ciaElegida) {
      const cfg = CIAS_PDF[ciaElegida];
      const t = (textoPlano || "").toLowerCase();
      const coincide = cfg.match.some((kw) => t.includes(kw));
      // Si la compañía tiene que traer cuponera y no vino ninguna, casi
      // seguro subieron el archivo equivocado (AMCA: el certificado en vez
      // de la propuesta · La Equidad: el carnet en vez de la póliza larga).
      const faltanCupones = !!cfg.esperaCupones && cupones.length === 0;
      if (!coincide || faltanCupones) {
        setAvisoArchivo(
          `Parece que este NO es el ${cfg.archivo} de ${cfg.nombre}. Revisá que hayas subido el archivo correcto.`
        );
      } else {
        setAvisoArchivo("");
      }
    }
  }

  /* ---------- subir + leer PDF ---------- */
  async function handlePdf(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setLeyendoPdf(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("archivos", f));
      const res = await api.post("/polizas/lector-pdf/", fd);
      const data = res?.data;
      if (!data?.ok) throw new Error("No se pudo leer el PDF.");

      // Texto plano para chequear si es el archivo correcto (si el backend lo manda)
      const textoPlano = data.texto || data.texto_plano || "";
      aplicarDatosPdf(data.datos || {}, textoPlano);

      const avisos = data.avisos || [];
      // 📌 LOS AVISOS SE GUARDAN, NO SOLO SE ANUNCIAN.
      //
      //    Antes iban únicamente como toast: 4,5 segundos y se evaporaban.
      //    Con los lectores nuevos pueden salir tres o cuatro juntos ("la
      //    cuota 1 ya fue abonada", "confirmá el tipo del vehículo", "falta
      //    el frente de póliza"), y si el operador estaba mirando el teclado
      //    se los perdía todos.
      //
      //    Son justo los que hay que leer ANTES de apretar Crear, así que
      //    quedan fijos en pantalla hasta que se sube otro PDF.
      setAvisosPdf(avisos);
      if (avisos.length) avisos.forEach((a) => toast(a, { icon: "⚠️", duration: 4500 }));
      else toast.success("PDF leído. Revisá los datos.");

      // 📎 Guardar el PDF en Cloudinary para poder adjuntarlo a la póliza.
      //
      // ⚠️ ANTES ESTO ERA UN `catch {}` VACÍO: si Cloudinary fallaba, el PDF
      //    quedaba sin subir y NADIE se enteraba. La póliza se creaba igual,
      //    pero sin el documento adjunto — y eso frena el WhatsApp de
      //    bienvenida, que pide tener la propuesta guardada.
      //
      //    Ahora avisa. Los datos ya se leyeron, así que el alta puede seguir:
      //    solo falta el archivo, que se puede subir después desde la póliza.
      try {
        console.log("[PDF] subiendo a Cloudinary…", files[0].name);
        const up = await uploadToCloudinary(files[0], "solicitudes/pdf");
        console.log("[PDF] ✅ subió:", up.secure_url);
        setPdfSubido({
          url: up.secure_url,
          public_id: up.public_id,
          mime: up.mime || "application/pdf",
          nombre: files[0].name,
        });
      } catch (errUp) {
        console.error("[NuevaSolicitud] No se pudo guardar el PDF:", errUp);
        toast(
          "Leímos los datos, pero no se pudo guardar el archivo PDF. Podés subirlo después desde la póliza.",
          { icon: "📎", duration: 6000 }
        );
      }
    } catch (err) {
      console.error("[NuevaSolicitud] PDF:", err);
      toast.error("No se pudo leer el PDF. Probá de nuevo.");
    } finally {
      setLeyendoPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  }

  /* ---------- validación ---------- */
  const faltaCompania = !form.compania.trim();
  // La cobertura es obligatoria SOLO en el modo manual (en PDF la trae el lector).
  const faltaCobertura = !form.cobertura.trim();

  const opcionesCompania = useMemo(() => {
    const base = (companias || []).map((c) => ({ value: c.nombre || c, label: c.nombre || c }));
    const val = (form.compania || "").trim();
    if (val && !base.some((o) => _normCia(o.value) === _normCia(val))) {
      base.unshift({ value: val, label: `${val} (del PDF)` });
    }
    return base;
  }, [companias, form.compania]);

  const faltaCampo = (k) => paso.startsWith("pdf_") && ciaElegida && !pdfTrajo[k];

  // ¿La compañía elegida es "regular" (NRE) o "irregular" (AMCA y afines)?
  //   NRE → cuotas automáticas (no se cargan fechas).
  //   AMCA / La Equidad → fechas irregulares, se cargan a mano.
  const esNRE = _normCia(form.compania).includes("nre");
  const esAMCA =
    _normCia(form.compania).includes("amca") || _normCia(form.compania).includes("equidad");

  // Helpers para la lista de cuotas manuales
  const agregarCuotaManual = () =>
    setCuotasManual((arr) => [...arr, { vencimiento: "", importe: "" }]);
  const quitarCuotaManual = (i) =>
    setCuotasManual((arr) => arr.filter((_, idx) => idx !== i));
  const editarCuotaManual = (i, campo, valor) =>
    setCuotasManual((arr) => arr.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));

  /* ---------- crear ---------- */
  async function crear() {
    if (faltaCompania) {
      toast.error("Falta la compañía (de ahí salen las cuotas).");
      return;
    }
    setGuardando(true);
    try {
      const ofiFinal = isWebAdmin ? Number(oficinaId) || null : Number(oficinaEmpleado) || null;

      // 🎟️ Cupones: los del PDF (subida rápida) o los cargados a mano (AMCA manual).
      //    Solo mandamos las cuotas manuales que tengan fecha.
      const cuponesManualValidos = cuotasManual
        .filter((c) => c.vencimiento)
        .map((c, i) => ({
          numero: i,
          vencimiento: c.vencimiento,
          importe: c.importe ? Number(soloDigitos(String(c.importe))) : null,
        }));
      // ⚠️ Este map tiene que arrastrar TODO lo que trae el cupón del PDF.
      //    Antes solo pasaba numero/vencimiento/importe y descartaba la
      //    imagen recortada y el código de barras: el backend los generaba
      //    y se perdían acá, en el camino de vuelta.
      const cuponesFinal = cuponesPdf.length
        ? cuponesPdf.map((c) => ({
            numero: c.numero,
            vencimiento: c.vencimiento,
            importe: c.importe,
            imagen_url: c.imagen_url || "",      // el recorte de ESTE cupón
            codigo_barras: c.codigo_barras || "", // los dígitos, para dictarlos
          }))
        : cuponesManualValidos;


      const documentos = {};
      console.log("[PDF] al guardar, pdfSubido =", pdfSubido);
      if (pdfSubido) {
        documentos.POLIZA_PDF = {
          url: pdfSubido.url,
          public_id: pdfSubido.public_id,
          mime: pdfSubido.mime,
          nombre: pdfSubido.nombre,
        };
      }

      const payload = {
        cliente: clienteExistente
          ? { modo: "existente", id: clienteExistente.id }
          : {
              modo: "nuevo",
              nombre: form.cli_nombre.trim(),
              apellido: form.cli_apellido.trim(),
              telefono: form.cli_telefono.trim(),
              dni_cuit_cuil: soloDigitos(form.cli_dni),
              direccion: form.cli_direccion.trim(),
              localidad: form.cli_localidad.trim(),
              provincia: form.cli_provincia.trim(), // 🆕 provincia
            },
        poliza: {
          modo: "nueva",
          numero_poliza: form.numero_poliza.trim(),
          compania: form.compania.trim(),
          cobertura: form.cobertura.trim(),
          oficina: ofiFinal,
          patente: form.patente.trim().toUpperCase(),
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          anio: form.anio ? Number(soloDigitos(form.anio)) : null,
          tipo: form.tipo || "Auto",
          numero_motor: form.numero_motor.trim(),
          numero_chasis: form.numero_chasis.trim(),
          observaciones: form.observaciones.trim(),
          generar_cuotas_ahora: true,
          cupones: cuponesFinal,
          datos_extra: datosExtraPdf,
        },
        solicitud: {
          responsable_empleado: responsable?.id ? Number(responsable.id) : null,
          responsable: responsable?.nombre || "",
          motivo: "ALTA_POLIZA",
          cobertura_solicitada: form.cobertura.trim(),
          compania_preferida: form.compania.trim(),
          observaciones: form.observaciones.trim(),
        },
        fotos: {},
        documentos,
        cliente_fotos: {},
        oficina: ofiFinal,
      };

      const resp = await solicitudesApi.crearCompleto(payload);
      const info = {
        cliente_id: resp?.cliente_id,
        poliza_id: resp?.poliza_id,
        solicitud_id: resp?.solicitud_id,
      };
      setCreado(info);
      toast.success("¡Alta creada!");
      onCreated?.(info);
    } catch (err) {
      console.error("[NuevaSolicitud] crear:", err);
      toast.error(err?.message || "No se pudo crear la solicitud.");
    } finally {
      setGuardando(false);
    }
  }

  /* ═══════════════ RENDER ═══════════════ */

  const nombreOficina =
    oficinas.find((o) => String(o.id) === String(isWebAdmin ? oficinaId : oficinaEmpleado))?.nombre ||
    user?.perfil?.oficina_nombre ||
    "Sucursal";

  // ¿En qué pasos se muestra el botón "Crear" en el footer?
  // El botón "Crear" solo en el último paso de cada camino. Antes, en el
  // camino de PDF, estaba disponible desde que se abría la pantalla.
  const mostrarCrear = (paso === "pdf_confirmar" || paso === "man_confirmar") && !creado;

  const tituloHeader = creado
    ? "Alta creada"
    : paso === "dni"
    ? "Nueva Alta"
    : paso === "telefono"
    ? "Teléfono del cliente"
    : paso === "modo"
    ? "¿Cómo la cargás?"
    : paso === "pdf_cia"
    ? "¿De qué compañía?"
    : paso === "pdf_archivo"
    ? `${ciaElegida || "PDF"} · Archivo`
    : paso === "pdf_cliente"
    ? `${ciaElegida || "PDF"} · Cliente`
    : paso === "pdf_vehiculo"
    ? `${ciaElegida || "PDF"} · Vehículo`
    : paso === "pdf_confirmar"
    ? `${ciaElegida || "PDF"} · Confirmar`
    : paso === "man_cliente"
    ? "A mano · Cliente"
    : paso === "man_vehiculo"
    ? "A mano · Vehículo"
    : "A mano · Confirmar";

  const iconoHeader = creado ? "🎉" : paso === "dni" ? "🪪" : paso === "telefono" ? "📞" : paso.startsWith("man_") ? "✍️" : paso.startsWith("pdf_") ? "📄" : "✨";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-surface dark:bg-surface-dark border-2 border-linea dark:border-linea-dark shadow-2xl overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh]"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)]">
                {iconoHeader}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-titulo dark:text-titulo-dark tracking-tight leading-none truncate">
                  {tituloHeader}
                </h2>
                <p className="text-[11px] text-suave dark:text-suave-dark uppercase tracking-wide font-extrabold mt-1 truncate">
                  📍 {nombreOficina}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark hover:text-titulo dark:hover:text-titulo-dark transition-all active:scale-90 shrink-0 text-2xl font-black"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-4">
            {/* ══════ ÉXITO ══════ */}
            {creado ? (
              <PantallaExito
                creado={creado}
                tieneCuponera={cuponesPdf.length > 0 || cuotasManual.filter((c) => c.vencimiento).length > 0}
                onCobrar={() => setAbrirCobro(true)}
                onCerrar={onClose}
              />
            ) : paso === "dni" ? (
              /* ══════ PASO 1: DNI ══════ */
              <PantallaDni
                dniInput={dniInput}
                setDniInput={setDniInput}
                verificando={verificandoDni}
                onVerificar={verificarDni}
                onSaltear={saltearDni}
              />
            ) : paso === "telefono" ? (
              /* ══════ PASO 2: TELÉFONO ══════ */
              <PantallaTelefono
                telInput={telInput}
                setTelInput={setTelInput}
                clienteExistente={clienteExistente}
                dni={form.cli_dni}
                onSeguir={confirmarTelefono}
                onSaltear={saltearTelefono}
                onVolver={() => setPaso("dni")}
              />
            ) : paso === "modo" ? (
              /* ══════ PASO 3: PDF o Manual ══════ */
              <>
                <AvisoCliente clienteExistente={clienteExistente} dni={form.cli_dni} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                  <BotonModo
                    emoji="📄"
                    titulo="Con PDF"
                    desc="MERCOSUR de NRE, Propuesta de AMCA o Póliza de Equidad. Leemos casi todo solo."
                    badge="⚡ Más rápido"
                    tono="azul"
                    onClick={() => setPaso("pdf_cia")}
                  />
                  <BotonModo
                    emoji="✍️"
                    titulo="A mano"
                    desc="Cargá los datos paso a paso. Ideal si no tenés PDF."
                    badge="✓ Siempre disponible"
                    tono="verde"
                    onClick={() => setPaso("man_cliente")}
                  />
                </div>
                <BtnVolver onClick={() => setPaso("telefono")}>Volver al teléfono</BtnVolver>
              </>
            ) : paso === "pdf_cia" ? (
              /* ══════ PASO 3 (PDF): elegir compañía ══════ */
              <>
                <p className="text-center text-[14px] font-bold text-titulo dark:text-titulo-dark mb-2">
                  ¿De qué compañía es el PDF?
                </p>
                {/* 3 tarjetas: en el celular van una debajo de otra, en
                    pantalla grande las tres en fila. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-1">
                  <BotonCia
                    nombre="NRE"
                    archivo="Subí el MERCOSUR"
                    tono="azul"
                    onClick={() => elegirCia("NRE")}
                  />
                  <BotonCia
                    nombre="AMCA"
                    archivo="Subí la Propuesta"
                    tono="violeta"
                    onClick={() => elegirCia("AMCA")}
                  />
                  <BotonCia
                    nombre="EQUIDAD"
                    archivo="Subí la Póliza"
                    tono="verde"
                    onClick={() => elegirCia("EQUIDAD")}
                  />
                </div>
                <BtnVolver onClick={() => setPaso("modo")}>Volver</BtnVolver>
              </>
            ) : paso === "pdf_archivo" ? (
              /* ══════ PDF — Paso 1: el archivo ══════
                 Solo el PDF y lo que salió de él. Nada de campos todavía:
                 si el archivo está mal, todo lo demás sobra. */
              <>
                <PasosWizard actual={1} labels={PASOS_PDF} />
                <BtnVolver onClick={() => setPaso("pdf_cia")}>Cambiar compañía</BtnVolver>

                <BloquePdf
                  cfg={CIAS_PDF[ciaElegida]}
                  inputRef={pdfInputRef}
                  leyendo={leyendoPdf}
                  onPick={() => pdfInputRef.current?.click()}
                  onFile={handlePdf}
                  chips={datosDetectados}
                  avisoArchivo={avisoArchivo}
                />

                <BannerCompania compania={form.compania.trim()} detectada={!!companiaDetectada} />

                {/* 🪪 El PDF es de otro documento. Va PRIMERO, antes que
                    cualquier otro aviso: si esto está mal, todo lo demás
                    también. */}
                <PanelDniConflicto
                  dniPdf={dniConflicto}
                  dniCargado={form.cli_dni}
                  clienteExistente={clienteExistente}
                  onUsarPdf={usarDniDelPdf}
                  onIgnorar={() => setDniConflicto("")}
                />

                {/* ⚠️ Lo que el lector no pudo leer o encontró raro.
                    Va acá, en el paso del archivo, porque es de acá que sale:
                    se lee ANTES de avanzar, no cuando ya cargaste todo. */}
                <PanelAvisosPdf avisos={avisosPdf} />
              </>
            ) : paso === "pdf_cliente" ? (
              /* ══════ PDF — Paso 2: cliente ══════ */
              <>
                <PasosWizard actual={2} labels={PASOS_PDF} />
                <BtnVolver onClick={() => setPaso("pdf_archivo")}>Volver al archivo</BtnVolver>

                <SeccionResponsable
                  empleados={empleados}
                  responsable={responsable}
                  setResponsable={setResponsable}
                  onGestionar={() => setAbrirResponsables(true)}
                />

                {clienteExistente ? (
                  <TarjetaClienteExistente cliente={clienteExistente} dniFallback={form.cli_dni} form={form} set={set} />
                ) : (
                  <SeccionClienteCampos form={form} set={set} faltaCampo={faltaCampo} />
                )}
              </>
            ) : paso === "pdf_vehiculo" ? (
              /* ══════ PDF — Paso 3: vehículo y póliza ══════ */
              <>
                <PasosWizard actual={3} labels={PASOS_PDF} />
                <BtnVolver onClick={() => setPaso("pdf_cliente")}>Volver al cliente</BtnVolver>

                <SeccionVehiculo
                  form={form}
                  set={set}
                  companias={companias}
                  coberturas={coberturas}
                  opcionesCompania={opcionesCompania}
                  faltaCompania={faltaCompania}
                  faltaCampo={faltaCampo}
                  isWebAdmin={isWebAdmin}
                  oficinas={oficinas}
                  oficinaId={oficinaId}
                  setOficinaId={setOficinaId}
                />
              </>
            ) : paso === "pdf_confirmar" ? (
              /* ══════ PDF — Paso 4: confirmar ══════
                 Recién acá aparece el botón Crear. Antes estaba disponible
                 desde el minuto uno, con medio formulario vacío. */
              <>
                <PasosWizard actual={4} labels={PASOS_PDF} />
                <BtnVolver onClick={() => setPaso("pdf_vehiculo")}>Volver al vehículo</BtnVolver>
                <ResumenConfirmar form={form} clienteExistente={clienteExistente} responsable={responsable} />
                <ResumenCuotasPdf cupones={cuponesPdf} />
                <PanelAvisosPdf avisos={avisosPdf} />
              </>
            ) : paso === "man_cliente" ? (
              /* ══════ WIZARD MANUAL — Paso 1: Cliente ══════ */
              <>
                <PasosWizard actual={1} />
                <BtnVolver onClick={() => setPaso("modo")}>Volver</BtnVolver>
                {clienteExistente ? (
                  <TarjetaClienteExistente cliente={clienteExistente} dniFallback={form.cli_dni} form={form} set={set} />
                ) : (
                  <SeccionClienteManual form={form} set={set} />
                )}
                <SeccionResponsable
                  empleados={empleados}
                  responsable={responsable}
                  setResponsable={setResponsable}
                  onGestionar={() => setAbrirResponsables(true)}
                />
              </>
            ) : paso === "man_vehiculo" ? (
              /* ══════ WIZARD MANUAL — Paso 2: Vehículo + compañía en botones ══════ */
              <>
                <PasosWizard actual={2} />
                <BtnVolver onClick={() => setPaso("man_cliente")}>Volver al cliente</BtnVolver>

                {/* Compañía en BOTONES */}
                <CardDuo className="p-4">
                  <div className="text-[13px] font-black text-titulo dark:text-titulo-dark mb-2">
                    Compañía <span className="text-duo-rojo">*</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(companias.length
                      ? companias.map((c) => c.nombre || c)
                      : ["NRE", "AMCA"]
                    ).map((nom) => {
                      const on = _normCia(form.compania) === _normCia(nom);
                      return (
                        <button
                          key={nom}
                          onClick={() => setForm((f) => ({ ...f, compania: nom }))}
                          className={`px-4 py-2.5 rounded-2xl border-2 font-extrabold text-[13px] transition-all ${
                            on
                              ? "bg-duo-azul text-white border-duo-azul-sombra shadow-[0_3px_0_var(--color-duo-azul-sombra)]"
                              : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark hover:-translate-y-0.5"
                          }`}
                        >
                          {on ? "✓ " : ""}
                          {nom}
                        </button>
                      );
                    })}
                  </div>
                  {faltaCompania && (
                    <Aviso tono="warn">
                      <b>Elegí la compañía.</b> De ahí salen los cupones y las cuotas.
                    </Aviso>
                  )}

                  {/* 🎟️ Fechas de cuotas según la compañía */}
                  {esNRE && (
                    <Aviso tono="ok">
                      <b>NRE es trimestral automático.</b> Se generan 3 cuotas. La 1ª se cobra hoy y vence
                      dentro de un mes; las otras dos siguen mes a mes. No tenés que cargar fechas.
                    </Aviso>
                  )}
                </CardDuo>

                {/* Lista de cuotas a mano (AMCA / La Equidad) */}
                {esAMCA && (
                  <CuotasManual
                    cuotas={cuotasManual}
                    onAgregar={agregarCuotaManual}
                    onQuitar={quitarCuotaManual}
                    onEditar={editarCuotaManual}
                  />
                )}

                <SeccionVehiculoManual form={form} set={set} coberturas={coberturas} faltaCobertura={faltaCobertura} />

                {isWebAdmin && oficinas.length > 0 && (
                  <CardDuo className="p-4">
                    <SelectDuo
                      label="Sucursal"
                      value={oficinaId}
                      onChange={(e) => setOficinaId(e.target.value)}
                      placeholder="— Elegir sucursal —"
                      options={oficinas.map((o) => ({ value: o.id, label: o.nombre }))}
                    />
                  </CardDuo>
                )}
              </>
            ) : (
              /* ══════ WIZARD MANUAL — Paso 3: Confirmar ══════ */
              <>
                <PasosWizard actual={3} />
                <BtnVolver onClick={() => setPaso("man_vehiculo")}>Volver al vehículo</BtnVolver>
                <ResumenConfirmar form={form} clienteExistente={clienteExistente} responsable={responsable} />
              </>
            )}
          </div>

          {/* Footer con botones de navegación / crear */}
          <FooterNav
            paso={paso}
            creado={creado}
            guardando={guardando}
            faltaCompania={faltaCompania}
            faltaCobertura={faltaCobertura}
            mostrarCrear={mostrarCrear}
            onCrear={crear}
            leyendoPdf={leyendoPdf}
            onSiguiente={() =>
              setPaso(
                paso === "pdf_archivo" ? "pdf_cliente"
                : paso === "pdf_cliente" ? "pdf_vehiculo"
                : "pdf_confirmar"
              )
            }
            onSiguienteCliente={() => setPaso("man_vehiculo")}
            onSiguienteVehiculo={() => setPaso("man_confirmar")}
          />
        </motion.div>
      </motion.div>

      {abrirResponsables && (
        <ResponsablesModal
          selectMode
          selectedId={responsable?.id}
          onSelect={(emp) => emp && setResponsable(emp)}
          onChanged={async () => {
            try {
              const lista = await solicitudesApi.empleadosActivos();
              setEmpleados(Array.isArray(lista) ? lista : []);
            } catch {}
          }}
          onClose={() => setAbrirResponsables(false)}
        />
      )}

      {abrirCobro && creado?.poliza_id && (
        <CobrarPrimeraCuotaModal
          open={abrirCobro}
          polizaId={creado.poliza_id}
          onClose={() => {
            setAbrirCobro(false);
            onClose?.();
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ═══════════════ sub-componentes ═══════════════ */

function FooterNav({
  paso, creado, guardando, faltaCompania, faltaCobertura, mostrarCrear,
  onCrear, onSiguienteCliente, onSiguienteVehiculo, onSiguiente, leyendoPdf,
}) {
  if (creado) return null;

  const Barra = ({ children }) => (
    <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
      {children}
    </div>
  );

  /* ── Camino PDF ──
     Cada paso valida lo suyo antes de dejar avanzar. Antes estaba todo en una
     pantalla y los faltantes recién se veían al final, al apretar Crear. */

  // Paso 1: no se puede avanzar mientras el lector trabaja. Si se avanzara,
  // el resultado del PDF pisaría campos que el operador ya estaría tocando.
  if (paso === "pdf_archivo") {
    return (
      <Barra>
        <Boton3D variant="azul" full size="lg" onClick={onSiguiente} disabled={leyendoPdf}>
          {leyendoPdf ? "Leyendo el archivo…" : "Siguiente: Cliente →"}
        </Boton3D>
      </Barra>
    );
  }

  if (paso === "pdf_cliente") {
    return (
      <Barra>
        <Boton3D variant="azul" full size="lg" onClick={onSiguiente}>
          Siguiente: Vehículo →
        </Boton3D>
      </Barra>
    );
  }

  // Paso 3: la compañía es obligatoria — de ahí salen las cuotas y los cupones.
  if (paso === "pdf_vehiculo") {
    return (
      <Barra>
        <Boton3D variant="azul" full size="lg" onClick={onSiguiente} disabled={faltaCompania}>
          {faltaCompania ? "Elegí la compañía" : "Siguiente: Confirmar →"}
        </Boton3D>
      </Barra>
    );
  }

  /* ── Camino manual ── */
  if (paso === "man_cliente") {
    return (
      <Barra>
        <Boton3D variant="azul" full size="lg" onClick={onSiguienteCliente}>
          Siguiente: Vehículo →
        </Boton3D>
      </Barra>
    );
  }
  // Wizard manual: paso vehículo → siguiente (requiere compañía Y cobertura)
  if (paso === "man_vehiculo") {
    const bloquea = faltaCompania || faltaCobertura;
    const texto = faltaCompania ? "Elegí la compañía" : faltaCobertura ? "Elegí la cobertura" : "Siguiente: Confirmar →";
    return (
      <Barra>
        <Boton3D variant="azul" full size="lg" onClick={onSiguienteVehiculo} disabled={bloquea}>
          {texto}
        </Boton3D>
      </Barra>
    );
  }
  // Crear. En manual (man_confirmar) también exige cobertura; en PDF solo compañía.
  if (mostrarCrear) {
    const esManual = paso === "man_confirmar";
    const bloquea = guardando || faltaCompania || (esManual && faltaCobertura);
    const texto = guardando
      ? "Creando…"
      : faltaCompania
      ? "Falta la compañía"
      : esManual && faltaCobertura
      ? "Falta la cobertura"
      : "Crear Alta";
    return (
      <Barra>
        <Boton3D variant="verde" full size="lg" onClick={onCrear} disabled={bloquea}>
          <HiSparkles /> {texto}
        </Boton3D>
      </Barra>
    );
  }
  return null;
}

function PantallaDni({ dniInput, setDniInput, verificando, onVerificar, onSaltear }) {
  return (
    <div className="py-2">
      <div className="text-center mb-5">
        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] flex items-center justify-center text-3xl">
          🪪
        </div>
        <h3 className="text-lg font-black text-titulo dark:text-titulo-dark">Empezá por el DNI</h3>
        <p className="text-[13px] font-bold text-suave dark:text-suave-dark mt-1">
          Verificamos si el cliente ya está en la base para no duplicarlo.
        </p>
      </div>
      <div className="max-w-sm mx-auto">
        <div className="relative">
          <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg pointer-events-none" />
          <input
            value={dniInput}
            onChange={(e) => setDniInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onVerificar()}
            placeholder="DNI o CUIT (sin puntos)"
            inputMode="numeric"
            autoFocus
            className="w-full h-14 pl-12 pr-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[16px] font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark placeholder:font-normal outline-none focus:border-duo-azul transition-colors text-center"
          />
        </div>
        <div className="mt-4">
          <Boton3D variant="azul" full size="lg" onClick={onVerificar} disabled={verificando}>
            {verificando ? "Verificando…" : "Verificar y seguir"}
          </Boton3D>
        </div>
        <button
          onClick={onSaltear}
          className="mt-3 w-full text-center text-[12px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark hover:text-duo-azul"
        >
          No tengo el DNI ahora → seguir igual
        </button>
      </div>
    </div>
  );
}

/* ── 📞 PASO 2: TELÉFONO ────────────────────────────────────────────────
   Va solo, en su propia pantalla, y no perdido entre quince campos del
   formulario. De este número dependen el link del portal y TODOS los
   avisos por WhatsApp: recordatorio de cuota, bienvenida, vencimiento.

   Sin él la póliza se crea igual y nadie se entera — hasta que el cliente
   no paga porque nunca le llegó el aviso.

   Si ya está en la base, aparece el que tenemos y solo hay que confirmarlo.
   Es la diferencia entre "cargá el teléfono" y "¿sigue siendo este?". */
function PantallaTelefono({
  telInput, setTelInput, clienteExistente, dni, onSeguir, onSaltear, onVolver,
}) {
  const yaTenia = (clienteExistente?.telefono || "").trim();
  const limpio = String(telInput || "").replace(/\D/g, "");
  const cambio = yaTenia && limpio && limpio !== yaTenia.replace(/\D/g, "");
  // El cliente está en la base pero nunca cargó teléfono. Es el caso que más
  // importa: hoy no le llega ni el link del portal ni un recordatorio.
  const sinNumero = !!clienteExistente && !yaTenia;
  const vacio = !limpio;

  return (
    <div className="py-2">
      <div className="text-center mb-5">
        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] flex items-center justify-center text-3xl">
          📞
        </div>
        <h3 className="text-lg font-black text-titulo dark:text-titulo-dark">
          {yaTenia
            ? "¿Sigue siendo este el teléfono?"
            : sinNumero
            ? "Este cliente no tiene teléfono cargado"
            : "¿Cuál es el teléfono?"}
        </h3>
        <p className="text-[13px] font-bold text-suave dark:text-suave-dark mt-1">
          Con este número le llega el link de su portal y los recordatorios de pago.
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        {clienteExistente ? (
          <div className="mb-3 rounded-2xl border-2 border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] p-3 text-center">
            <div className="text-[11px] font-black uppercase tracking-widest text-duo-verde-sombra dark:text-duo-verde">
              Cliente en la base
            </div>
            <div className="text-[14px] font-black text-titulo dark:text-titulo-dark mt-0.5">
              {clienteExistente.nombre} {clienteExistente.apellido || ""}
            </div>
          </div>
        ) : dni ? (
          <div className="mb-3 text-center text-[12px] font-bold text-suave dark:text-suave-dark">
            Cliente nuevo · DNI {dni}
          </div>
        ) : null}

        <div className="relative">
          <HiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-suave dark:text-suave-dark text-lg pointer-events-none" />
          <input
            value={telInput}
            onChange={(e) => setTelInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSeguir()}
            placeholder="11 2345 6789"
            inputMode="tel"
            autoFocus
            className="w-full h-14 pl-12 pr-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark text-[16px] font-black text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark placeholder:font-normal outline-none focus:border-duo-verde transition-colors text-center"
          />
        </div>

        {/* Que quede claro que se está PISANDO el número guardado. Sin este
            aviso, corregir un dígito por error cambia el teléfono del cliente
            en toda la base y nadie lo nota. */}
        {cambio ? (
          <p className="mt-2 text-center text-[12px] font-bold text-duo-amarillo-sombra dark:text-duo-amarillo">
            Vas a reemplazar el que tenía guardado ({yaTenia}). Se actualiza en su ficha.
          </p>
        ) : sinNumero && limpio ? (
          <p className="mt-2 text-center text-[12px] font-bold text-duo-verde-sombra dark:text-duo-verde">
            Se guarda en su ficha. Recién ahora va a poder recibir avisos.
          </p>
        ) : null}

        <div className="mt-4">
          <Boton3D variant="verde" full size="lg" onClick={onSeguir} disabled={vacio}>
            {yaTenia && !cambio ? "Sí, es correcto" : "Guardar y seguir"}
          </Boton3D>
        </div>

        <button
          onClick={onSaltear}
          className="mt-3 w-full text-center text-[12px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark hover:text-duo-azul"
        >
          {yaTenia ? "Dejar el que está → seguir igual" : "No lo tengo ahora → seguir igual"}
        </button>

        <button
          onClick={onVolver}
          className="mt-2 w-full text-center text-[12px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark hover:text-duo-azul"
        >
          ← Volver al DNI
        </button>
      </div>
    </div>
  );
}


function AvisoCliente({ clienteExistente, dni }) {
  if (clienteExistente) {
    return (
      <Aviso tono="ok">
        <b>Cliente encontrado:</b> {clienteExistente.nombre} {clienteExistente.apellido || ""} · DNI{" "}
        {clienteExistente.dni_cuit_cuil || dni}. Vas a usar sus datos.
      </Aviso>
    );
  }
  if (dni) {
    return (
      <Aviso tono="warn">
        <b>DNI {dni} nuevo.</b> Se creará un cliente nuevo con lo que cargues.
      </Aviso>
    );
  }
  return <Aviso tono="neutro">Sin DNI. Podés cargarlo después desde el cliente.</Aviso>;
}

function BotonModo({ emoji, titulo, desc, badge, tono, onClick }) {
  const hover = tono === "azul" ? "hover:border-duo-azul" : "hover:border-duo-verde";
  const badgeCls =
    tono === "azul"
      ? "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul"
      : "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde";
  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border-[3px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-7 text-center transition-all hover:-translate-y-1 ${hover} shadow-[0_3px_0_var(--color-duo-linea)] dark:shadow-[0_3px_0_var(--color-linea-dark)]`}
    >
      <div className="text-5xl mb-3">{emoji}</div>
      <div className="text-lg font-black text-titulo dark:text-titulo-dark mb-1.5">{titulo}</div>
      <div className="text-[13px] font-bold text-suave dark:text-suave-dark leading-snug">{desc}</div>
      <span className={`inline-block mt-3 text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full ${badgeCls}`}>
        {badge}
      </span>
    </button>
  );
}

function BotonCia({ nombre, archivo, tono, onClick }) {
  const map = {
    azul: "hover:border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
    violeta: "hover:border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
    // 🆕 Verde para La Equidad.
    verde: "hover:border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde",
  };
  const chip = map[tono] || map.azul;
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-3xl border-[3px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-5 sm:p-6 text-center transition-all hover:-translate-y-1 ${chip.split(" ")[0]} shadow-[0_3px_0_var(--color-duo-linea)] dark:shadow-[0_3px_0_var(--color-linea-dark)]`}
    >
      <div className={`mx-auto mb-3 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center text-2xl font-black ${chip.split(" ").slice(1).join(" ")}`}>
        {nombre.charAt(0)}
      </div>
      <div className="text-xl sm:text-2xl font-black text-titulo dark:text-titulo-dark mb-1 truncate">{nombre}</div>
      <div className="text-[12px] sm:text-[13px] font-bold text-suave dark:text-suave-dark flex items-center justify-center gap-1.5">
        <HiDocumentText className="shrink-0" /> {archivo}
      </div>
    </button>
  );
}

function BloquePdf({ cfg, inputRef, leyendo, onPick, onFile, chips, avisoArchivo }) {
  return (
    <CardDuo className="p-4">
      <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={onFile} />

      {/* ⏳ LEYENDO — PANTALLA PROPIA, NO UN TEXTO CHIQUITO.
          Antes lo único que cambiaba era la etiqueta del botón ("Leyendo
          PDF…"). Con un PDF de La Equidad el lector tarda varios segundos
          —extrae el texto, busca la cuponera, recorta cada cupón y los sube
          a Cloudinary— y en ese rato la pantalla parecía colgada. El
          operador volvía a tocar el botón y subía el archivo dos veces.

          Ahora ocupa el bloque entero, con la rueda girando y diciendo qué
          está haciendo. Es la diferencia entre un cartel de "en obra" y una
          calle cortada sin explicación. */}
      {leyendo ? (
        <div className="rounded-2xl border-[3px] border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-6 text-center">
          <div className="mx-auto mb-3 h-11 w-11 rounded-full border-4 border-duo-azul/25 border-t-duo-azul animate-spin" />
          <div className="font-black text-duo-azul text-[15px]">Leyendo el archivo…</div>
          <div className="text-[12px] font-bold text-suave dark:text-suave-dark mt-1.5 leading-relaxed">
            Sacando los datos y recortando los cupones.
            <br />
            Puede tardar unos segundos. No cierres la ventana.
          </div>
        </div>
      ) : chips.length === 0 ? (
        <button
          onClick={onPick}
          className="w-full rounded-2xl border-[3px] border-dashed border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-6 text-center transition-all hover:brightness-105"
        >
          <div className="text-4xl mb-1">📄</div>
          <div className="font-black text-duo-azul text-[15px] flex items-center justify-center gap-2">
            <HiUpload /> Subir {cfg?.archivo}
          </div>
          <div className="text-[12px] font-bold text-suave dark:text-suave-dark mt-1">{cfg?.ayuda}</div>
        </button>
      ) : (
        <>
          <div className="rounded-2xl border-2 border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] p-3">
            <div className="text-[11px] font-black uppercase tracking-wide text-duo-verde-sombra dark:text-duo-verde mb-1.5 flex items-center gap-1.5">
              <HiCheckCircle /> Datos leídos del PDF
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c, i) => (
                <span key={i} className="inline-block bg-card dark:bg-card-dark border border-duo-verde rounded-lg px-2 py-0.5 text-[12px] font-bold text-titulo dark:text-titulo-dark">
                  {c}
                </span>
              ))}
            </div>
          </div>
          {avisoArchivo && <Aviso tono="warn"><b>⚠️ {avisoArchivo}</b></Aviso>}
          <button onClick={onPick} className="mt-2 text-[12px] font-extrabold uppercase tracking-wide text-duo-azul hover:opacity-80">
            ↻ Subir otro PDF
          </button>
        </>
      )}
    </CardDuo>
  );
}

/* La barra de pasos. Sirve para los DOS caminos: el manual tiene 3 y el de
   PDF tiene 4 (le suma "Archivo" al principio). Antes estaba clavada en 3 y
   por eso el camino de PDF no la podía usar — y terminó siendo una sola
   pantalla larguísima sin ninguna referencia de dónde estabas parado. */
function PasosWizard({ actual, labels = ["Cliente", "Vehículo", "Confirmar"] }) {
  const pasos = labels.map((label, i) => ({ n: i + 1, label }));
  return (
    <div className="flex items-center gap-2">
      {pasos.map((p, i) => (
        <div key={p.n} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide whitespace-nowrap ${
              p.n === actual
                ? "bg-duo-azul text-white"
                : p.n < actual
                ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde"
                : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark"
            }`}
          >
            {p.n < actual ? "✓" : p.n} {p.label}
          </div>
          {i < pasos.length - 1 && <div className="flex-1 h-0.5 bg-linea dark:bg-[var(--color-linea-dark)]" />}
        </div>
      ))}
    </div>
  );
}

function SeccionResponsable({ empleados, responsable, setResponsable, onGestionar }) {
  return (
    <SeccionCard icon={<HiUser />} tono="violeta" titulo="¿Quién carga?" sub="Opcional — se puede asignar después">
      <div className="flex flex-wrap gap-2">
        {empleados.slice(0, 8).map((emp) => {
          const on = String(responsable?.id) === String(emp.id);
          return (
            <button
              key={emp.id}
              onClick={() => setResponsable(on ? null : emp)}
              className={`px-4 py-2.5 rounded-2xl border-2 font-extrabold text-[13px] transition-all ${
                on
                  ? "bg-duo-violeta text-white border-duo-violeta-sombra shadow-[0_3px_0_var(--color-duo-violeta-sombra)]"
                  : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark hover:-translate-y-0.5"
              }`}
            >
              {on ? "✓ " : ""}
              {emp.nombre}
            </button>
          );
        })}
        <button
          onClick={onGestionar}
          className="px-4 py-2.5 rounded-2xl border-2 border-dashed border-linea dark:border-linea-dark text-suave dark:text-suave-dark font-extrabold text-[13px] hover:border-duo-violeta hover:text-duo-violeta transition-all"
        >
          + Gestionar
        </button>
      </div>
    </SeccionCard>
  );
}

function SeccionClienteCampos({ form, set, faltaCampo }) {
  // 📞 El teléfono va aparte, abajo de todo.
  //
  //    No es un campo más: de él dependen el link del portal y todos los avisos
  //    de vencimiento. Si queda vacío, el cliente nunca se entera de nada.
  //    Antes estaba perdido entre "DNI" y "Localidad" y era fácil saltearlo.
  return (
    <SeccionCard icon={<HiIdentification />} tono="azul" titulo="Cliente" sub="Todo opcional — se completa después">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <InputDuo label="Nombre" value={form.cli_nombre} onChange={set("cli_nombre")} placeholder="Ej: Juan" />
        <InputDuo label="Apellido" value={form.cli_apellido} onChange={set("cli_apellido")} placeholder="Ej: Pérez" />
        <InputDuo label="DNI / CUIT" value={form.cli_dni} onChange={set("cli_dni")} placeholder="Sin puntos" inputMode="numeric" />
        <InputDuo label="Localidad" value={form.cli_localidad} onChange={set("cli_localidad")} placeholder="Ej: Ramos Mejía" />
        <InputDuo label="Provincia" value={form.cli_provincia} onChange={set("cli_provincia")} placeholder="Ej: Buenos Aires" />
        <InputDuo label="Dirección" value={form.cli_direccion} onChange={set("cli_direccion")} placeholder="Opcional" />
      </div>

      <div className="mt-3 pt-3 border-t-2 border-linea dark:border-linea-dark">
        <div className="flex items-center gap-1.5 mb-2 ml-1">
          <HiPhone className="text-duo-azul shrink-0" />
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">
            Teléfono {faltaCampo("cli_telefono") && <TagFalta />}
          </span>
        </div>
        <InputDuo
          value={form.cli_telefono}
          onChange={set("cli_telefono")}
          placeholder="11..."
          inputMode="tel"
          className={faltaCampo("cli_telefono") ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft [&_input]:!text-[#5a4600] [&_input]:placeholder:!text-[#5a4600]/50" : ""}
        />
      </div>
    </SeccionCard>
  );
}

/* 🏃 Cliente para el WIZARD MANUAL: solo lo esencial (Nombre, Apellido, Teléfono).
   Localidad/dirección/etc. se cargan después. El DNI ya se puso en el paso 0. */
function SeccionClienteManual({ form, set }) {
  return (
    <SeccionCard icon={<HiIdentification />} tono="azul" titulo="Cliente" sub="Lo esencial — el resto se completa después">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <InputDuo label="Nombre" value={form.cli_nombre} onChange={set("cli_nombre")} placeholder="Ej: Juan" />
        <InputDuo label="Apellido" value={form.cli_apellido} onChange={set("cli_apellido")} placeholder="Ej: Pérez" />
        <InputDuo label="Teléfono" value={form.cli_telefono} onChange={set("cli_telefono")} placeholder="11..." inputMode="tel" className="sm:col-span-2" />
      </div>
      {form.cli_dni && (
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark mt-2 ml-1">
          🪪 DNI: {form.cli_dni}
        </p>
      )}
    </SeccionCard>
  );
}

/* 🏃 Vehículo para el WIZARD MANUAL: Patente, Marca, Modelo, Año + Tipo en BOTONES.
   Los técnicos (motor, chasis, N° póliza, cobertura) se cargan después (tareas). */
function SeccionVehiculoManual({ form, set, coberturas, faltaCobertura }) {
  return (
    <SeccionCard icon={<HiTruck />} tono="amarillo" titulo="Datos del vehículo" sub="Lo importante del auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputDuo label="Patente" value={form.patente} onChange={set("patente")} placeholder="ABC123" style={{ textTransform: "uppercase" }} />
        <InputDuo label="Año" value={form.anio} onChange={set("anio")} placeholder="2024" inputMode="numeric" />
        <InputDuo label="Marca" value={form.marca} onChange={set("marca")} placeholder="Ford" />
        <InputDuo label="Modelo" value={form.modelo} onChange={set("modelo")} placeholder="Fiesta" />
        {/* Cobertura OBLIGATORIA (visible, no escondida) */}
        {coberturas.length ? (
          <SelectDuo
            label={<>Cobertura <span className="text-duo-rojo">*</span></>}
            value={form.cobertura}
            onChange={set("cobertura")}
            placeholder="— Elegir —"
            options={coberturas.map((c) => ({ value: c.nombre || c, label: c.nombre || c }))}
            className={`sm:col-span-2 ${faltaCobertura ? "[&_select]:border-duo-amarillo [&_select]:bg-duo-amarillo-soft [&_select]:!text-[#5a4600]" : ""}`}
          />
        ) : (
          <InputDuo
            label={<>Cobertura <span className="text-duo-rojo">*</span></>}
            value={form.cobertura}
            onChange={set("cobertura")}
            placeholder="A / B / C9…"
            className={`sm:col-span-2 ${faltaCobertura ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft [&_input]:!text-[#5a4600] [&_input]:placeholder:!text-[#5a4600]/50" : ""}`}
          />
        )}
      </div>

      {/* Tipo de vehículo: texto libre + botones de atajo */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2 ml-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">
            Tipo de vehículo
          </span>
          {/* Categoría con la que se calcula el precio / reporte NRE */}
          {categoriaVehiculo(form.tipo) && categoriaVehiculo(form.tipo) !== form.tipo ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-duo-azul-soft text-duo-azul-sombra">
              {categoriaVehiculo(form.tipo)}
            </span>
          ) : null}
        </div>

        {/* 📝 Acá cae el texto TAL CUAL del PDF. No se pisa con la categoría. */}
        <input
          value={form.tipo || ""}
          onChange={(e) => set("tipo")(e.target.value)}
          placeholder="Auto, Camioneta… o lo que diga el PDF"
          className="w-full rounded-2xl border-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark px-4 py-2.5 text-[14px] font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          {TIPOS_VEHICULO.map((t) => {
            const on = form.tipo === t;
            return (
              <button
                key={t}
                onClick={() => set("tipo")(t)}
                className={`px-4 py-2.5 rounded-2xl border-2 font-extrabold text-[13px] transition-all ${
                  on
                    ? "bg-duo-amarillo text-duo-amarillo-sombra border-duo-amarillo-sombra shadow-[0_3px_0_var(--color-duo-amarillo-sombra)]"
                    : "bg-card dark:bg-card-dark text-titulo dark:text-titulo-dark border-linea dark:border-linea-dark hover:-translate-y-0.5"
                }`}
              >
                {on ? "✓ " : ""}
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </SeccionCard>
  );
}

/* 🎟️ Lista de cuotas cargadas a mano (AMCA / La Equidad manual).
   Cada fila: fecha de vencimiento + importe opcional. */
function CuotasManual({ cuotas, onAgregar, onQuitar, onEditar }) {
  return (
    <SeccionCard icon={<span>🎟️</span>} tono="violeta" titulo="Fechas de las cuotas" sub={`${cuotas.length} cargada${cuotas.length === 1 ? "" : "s"}`}>
      <Aviso tono="warn">
        <b>Las fechas de AMCA son distintas cada mes.</b> Miralas en el portal de AMCA (vencimientos de este
        cliente) o volvé atrás y subí la Propuesta completa.
      </Aviso>

      {cuotas.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-[36px_1fr_1fr_40px] gap-2 px-1 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">#</span>
            <span className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">Vencimiento</span>
            <span className="text-[10px] font-black uppercase tracking-wide text-suave dark:text-suave-dark">Importe (opc.)</span>
            <span></span>
          </div>
          {cuotas.map((c, i) => (
            <div key={i} className="grid grid-cols-[36px_1fr_1fr_40px] gap-2 items-center mb-2">
              <div className="h-10 w-9 rounded-xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta flex items-center justify-center font-black text-[13px]">
                {i + 1}
              </div>
              <input
                type="date"
                value={c.vencimiento}
                onChange={(e) => onEditar(i, "vencimiento", e.target.value)}
                className="h-10 px-2 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[13px] font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-violeta [color-scheme:light] dark:[color-scheme:dark]"
              />
              <input
                inputMode="numeric"
                placeholder="$ opcional"
                value={c.importe}
                onChange={(e) => onEditar(i, "importe", e.target.value)}
                className="h-10 px-3 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[13px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta"
              />
              <button
                onClick={() => onQuitar(i)}
                className="h-10 w-9 rounded-xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] text-duo-rojo flex items-center justify-center hover:brightness-105 active:scale-90 transition"
                title="Quitar"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAgregar}
        className="mt-1 w-full py-3 rounded-2xl border-2 border-dashed border-duo-violeta bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta font-black uppercase text-[12px] tracking-wide hover:brightness-105 transition"
      >
        + Agregar cuota
      </button>
    </SeccionCard>
  );
}

// Vehículo para el camino PDF (incluye compañía select + banner ya afuera)
function SeccionVehiculo({ form, set, companias, coberturas, opcionesCompania, faltaCompania, faltaCampo, isWebAdmin, oficinas, oficinaId, setOficinaId }) {
  return (
    <SeccionCard icon={<HiTruck />} tono="amarillo" titulo="Vehículo y Póliza" sub="Patente, modelo y tipo son lo importante">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InputDuo
          label="Patente"
          value={form.patente}
          onChange={set("patente")}
          placeholder="ABC123"
          style={{ textTransform: "uppercase" }}
          className={faltaCampo("patente") ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft [&_input]:!text-[#5a4600] [&_input]:placeholder:!text-[#5a4600]/50" : ""}
        />
        <InputDuo label="Marca" value={form.marca} onChange={set("marca")} placeholder="Ford" />
        <InputDuo label="Modelo" value={form.modelo} onChange={set("modelo")} placeholder="Fiesta" />
        <InputDuo label="Año" value={form.anio} onChange={set("anio")} placeholder="2024" inputMode="numeric" />
        {/* 📝 Texto libre: guarda lo que dice el PDF, sin recortarlo a 5 opciones. */}
        <InputDuo label="Tipo de vehículo" value={form.tipo} onChange={set("tipo")} placeholder="Auto, Camioneta…" />
        {companias.length ? (
          <SelectDuo
            label={<>Compañía <span className="text-duo-rojo">*</span></>}
            value={form.compania}
            onChange={set("compania")}
            placeholder="— Elegir —"
            options={opcionesCompania}
            className={faltaCompania ? "[&_select]:border-duo-amarillo [&_select]:bg-duo-amarillo-soft [&_select]:!text-[#5a4600]" : ""}
          />
        ) : (
          <InputDuo
            label={<>Compañía <span className="text-duo-rojo">*</span></>}
            value={form.compania}
            onChange={set("compania")}
            placeholder="NRE / AMCA…"
            className={faltaCompania ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft [&_input]:!text-[#5a4600] [&_input]:placeholder:!text-[#5a4600]/50" : ""}
          />
        )}
      </div>
      <DetallesTecnicos form={form} set={set} coberturas={coberturas} />
      {isWebAdmin && oficinas.length > 0 && (
        <div className="mt-3">
          <SelectDuo
            label="Sucursal"
            value={oficinaId}
            onChange={(e) => setOficinaId(e.target.value)}
            placeholder="— Elegir sucursal —"
            options={oficinas.map((o) => ({ value: o.id, label: o.nombre }))}
          />
        </div>
      )}
    </SeccionCard>
  );
}

// Vehículo para el wizard manual (sin compañía; esa va en botones aparte)
function SeccionVehiculoCampos({ form, set, coberturas }) {
  return (
    <SeccionCard icon={<HiTruck />} tono="amarillo" titulo="Datos del vehículo" sub="Patente, marca, modelo…">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InputDuo label="Patente" value={form.patente} onChange={set("patente")} placeholder="ABC123" style={{ textTransform: "uppercase" }} />
        <InputDuo label="Marca" value={form.marca} onChange={set("marca")} placeholder="Ford" />
        <InputDuo label="Modelo" value={form.modelo} onChange={set("modelo")} placeholder="Fiesta" />
        <InputDuo label="Año" value={form.anio} onChange={set("anio")} placeholder="2024" inputMode="numeric" />
        {/* 📝 Texto libre: guarda lo que dice el PDF, sin recortarlo a 5 opciones. */}
        <InputDuo label="Tipo de vehículo" value={form.tipo} onChange={set("tipo")} placeholder="Auto, Camioneta…" />
      </div>
      <DetallesTecnicos form={form} set={set} coberturas={coberturas} />
    </SeccionCard>
  );
}

function DetallesTecnicos({ form, set, coberturas }) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer text-[12px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark hover:text-duo-azul list-none">
        ▸ Cobertura y datos técnicos (opcional)
      </summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {coberturas.length ? (
          <SelectDuo
            label="Cobertura"
            value={form.cobertura}
            onChange={set("cobertura")}
            placeholder="— Elegir —"
            options={coberturas.map((c) => ({ value: c.nombre || c, label: c.nombre || c }))}
          />
        ) : (
          <InputDuo label="Cobertura" value={form.cobertura} onChange={set("cobertura")} placeholder="A / B / C…" />
        )}
        <InputDuo label="N° Póliza" value={form.numero_poliza} onChange={set("numero_poliza")} placeholder="Opcional" />
        <InputDuo label="N° Motor" value={form.numero_motor} onChange={set("numero_motor")} placeholder="Opcional" />
        <InputDuo label="N° Chasis" value={form.numero_chasis} onChange={set("numero_chasis")} placeholder="Opcional" />
      </div>
    </details>
  );
}

/* 🎟️ Las cuotas que salieron del PDF, en el paso de confirmar.
   Antes no se veían en ningún lado antes de crear: el operador apretaba
   Crear y recién en la póliza descubría si eran 2 o 3, o si las fechas
   estaban corridas. Verlas acá es el último control barato. */
function ResumenCuotasPdf({ cupones = [] }) {
  if (!cupones.length) return null;
  const fmt = (f) => {
    const [a, m, d] = String(f || "").split("-");
    return d && m ? `${d}/${m}/${a}` : (f || "—");
  };
  return (
    <SeccionCard
      icon={<HiCheckCircle />}
      tono="verde"
      titulo={`${cupones.length} cuota${cupones.length > 1 ? "s" : ""} leída${cupones.length > 1 ? "s" : ""}`}
      sub="Del PDF. Si algo no cuadra, volvé al archivo."
    >
      <div className="flex flex-wrap gap-2">
        {cupones.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark px-3 py-1.5 text-[12px] font-bold text-titulo dark:text-titulo-dark"
          >
            <span className="text-suave dark:text-suave-dark">#{c.numero ?? i + 1}</span>
            {fmt(c.vencimiento)}
          </span>
        ))}
      </div>
    </SeccionCard>
  );
}

function ResumenConfirmar({ form, clienteExistente, responsable }) {
  const cliente = clienteExistente
    ? `${clienteExistente.nombre || ""} ${clienteExistente.apellido || ""}`.trim()
    : `${form.cli_nombre} ${form.cli_apellido}`.trim() || "Sin nombre";
  const fila = (label, valor) => (
    <div className="flex justify-between gap-3 py-1.5 border-b border-linea dark:border-linea-dark last:border-0">
      <span className="text-[12px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">{label}</span>
      <span className="text-[13px] font-black text-titulo dark:text-titulo-dark text-right truncate">{valor || "—"}</span>
    </div>
  );
  return (
    <>
      <div className="text-center py-2">
        <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] flex items-center justify-center text-2xl">
          ✓
        </div>
        <h3 className="text-[15px] font-black text-titulo dark:text-titulo-dark">Revisá antes de crear</h3>
      </div>
      <CardDuo className="p-4">
        {fila("Cliente", cliente)}
        {fila("DNI", form.cli_dni)}
        {fila("Teléfono", form.cli_telefono)}
        {fila("Patente", form.patente.toUpperCase())}
        {fila("Vehículo", `${form.marca} ${form.modelo}`.trim())}
        {fila("Compañía", form.compania)}
        {fila("Responsable", responsable?.nombre || "Sin asignar")}
      </CardDuo>
    </>
  );
}

function BtnVolver({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-duo-azul hover:opacity-80"
    >
      <HiArrowLeft /> {children}
    </button>
  );
}

function SeccionCard({ icon, tono = "azul", titulo, sub, children }) {
  const tonos = {
    azul: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul",
    verde: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde",
    amarillo: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo",
    violeta: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] text-duo-violeta",
  };
  return (
    <CardDuo className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${tonos[tono] || tonos.azul}`}>{icon}</div>
        <div>
          <div className="text-[15px] font-black text-titulo dark:text-titulo-dark leading-none">{titulo}</div>
          {sub && <div className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark mt-1">{sub}</div>}
        </div>
      </div>
      {children}
    </CardDuo>
  );
}

function TagFalta() {
  return (
    <span className="inline-block align-middle bg-duo-amarillo text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md ml-1" style={{ color: "#5a4600" }}>
      Faltó en PDF
    </span>
  );
}

/* ── ⚠️ AVISOS DEL LECTOR ──────────────────────────────────────────────
   Lo que el PDF no trajo, o trajo raro. Cada lector decide qué avisar:
   "la cuota 1 ya fue abonada al emitir", "confirmá el tipo del vehículo",
   "los códigos de barras de AMCA son imágenes y no se pueden leer".

   Antes esto vivía solo en toasts de 4,5 segundos. Un aviso que hay que
   leer ANTES de apretar Crear no puede evaporarse mientras el operador
   tipea. Acá queda fijo hasta que se sube otro PDF.

   Ámbar y no rojo: nada de esto frena el alta. Son cosas para mirar, no
   errores. Si fuera rojo, a la tercera póliza dejaría de leerse. */
/* ── 🪪 EL PDF ES DE OTRO DOCUMENTO ─────────────────────────────────────
   Dos causas posibles y desde acá no se puede distinguir cuál:
     · se tipeó mal el DNI en el paso 1
     · se arrastró el PDF del cliente anterior

   Por eso no se corrige solo. Se muestran los dos números y decide el
   operador, que tiene el documento en la mano.

   Rojo y no ámbar: esto no es "revisá esto". Es "algo está mal". Una
   póliza con el DNI de uno y el auto de otro se descubre el día del
   siniestro, cuando la compañía dice que ese auto no es de esa persona. */
function PanelDniConflicto({ dniPdf, dniCargado, clienteExistente, onUsarPdf, onIgnorar }) {
  if (!dniPdf) return null;
  return (
    <div className="rounded-2xl border-2 border-duo-rojo bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <HiExclamationCircle className="text-duo-rojo text-lg shrink-0" />
        <span className="text-[11px] font-black uppercase tracking-widest text-duo-rojo">
          El PDF es de otro documento
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-card dark:bg-card-dark p-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">
            Cargaste
          </div>
          <div className="text-[15px] font-black text-titulo dark:text-titulo-dark font-mono mt-0.5">
            {dniCargado || "—"}
          </div>
          {clienteExistente ? (
            <div className="text-[11px] font-bold text-suave dark:text-suave-dark truncate mt-0.5">
              {clienteExistente.nombre} {clienteExistente.apellido || ""}
            </div>
          ) : null}
        </div>
        <div className="rounded-xl bg-card dark:bg-card-dark p-2.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-suave dark:text-suave-dark">
            Dice el PDF
          </div>
          <div className="text-[15px] font-black text-duo-rojo font-mono mt-0.5">{dniPdf}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onUsarPdf}
          className="flex-1 h-10 rounded-xl bg-duo-rojo text-white text-[12px] font-black uppercase tracking-wide"
        >
          Usar el del PDF
        </button>
        <button
          onClick={onIgnorar}
          className="flex-1 h-10 rounded-xl bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark text-titulo dark:text-titulo-dark text-[12px] font-black uppercase tracking-wide"
        >
          Dejar el que cargué
        </button>
      </div>

      <p className="text-[11.5px] font-bold text-suave dark:text-suave-dark mt-2 leading-snug">
        Mirá el documento del cliente. Puede ser un DNI mal tipeado o el PDF de otra persona.
      </p>
    </div>
  );
}


function PanelAvisosPdf({ avisos = [] }) {
  if (!avisos.length) return null;
  return (
    <div className="rounded-2xl border-2 border-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <HiExclamationCircle className="text-duo-amarillo-sombra dark:text-duo-amarillo text-lg shrink-0" />
        <span className="text-[11px] font-black uppercase tracking-widest text-duo-amarillo-sombra dark:text-duo-amarillo">
          Revisá antes de crear ({avisos.length})
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {avisos.map((a, i) => (
          <li
            key={i}
            className="flex gap-2 text-[12.5px] font-bold text-titulo dark:text-titulo-dark leading-snug"
          >
            <span className="text-duo-amarillo-sombra dark:text-duo-amarillo shrink-0">·</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


function BannerCompania({ compania, detectada }) {
  if (compania) {
    const inicial = String(compania).trim().charAt(0).toUpperCase() || "?";
    return (
      <div className="rounded-3xl border-[3px] border-duo-verde bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] p-4 flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-duo-verde text-white flex items-center justify-center text-3xl font-black shrink-0 shadow-[0_4px_0_var(--color-duo-verde-sombra)]">
          {inicial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-duo-verde-sombra dark:text-duo-verde">
            <HiCheckCircle /> {detectada ? "Compañía detectada" : "Compañía"}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-titulo dark:text-titulo-dark leading-none mt-1 truncate">{compania}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border-[3px] border-duo-amarillo bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] p-4 flex items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-duo-amarillo flex items-center justify-center text-3xl shrink-0" style={{ color: "#5a4600" }}>
        <HiExclamationCircle />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-widest text-duo-amarillo-sombra dark:text-duo-amarillo">Falta la compañía</div>
        <div className="text-xl sm:text-2xl font-black text-titulo dark:text-titulo-dark leading-tight mt-1">Cargala abajo 👇</div>
      </div>
    </div>
  );
}

function TarjetaClienteExistente({ cliente, dniFallback, form, set }) {
  const nombre = `${cliente?.nombre || ""} ${cliente?.apellido || ""}`.trim() || "Cliente";
  const dni = cliente?.dni_cuit_cuil || cliente?.dni || dniFallback || "—";
  const iniciales =
    nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <CardDuo className="p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde flex items-center justify-center font-black text-base shrink-0">
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <HiCheckCircle className="text-duo-verde-sombra dark:text-duo-verde shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wide text-duo-verde-sombra dark:text-duo-verde">Cliente ya registrado</span>
          </div>
          <p className="text-[16px] font-black text-titulo dark:text-titulo-dark truncate mt-0.5">{nombre}</p>
          <p className="text-[12px] font-bold text-suave dark:text-suave-dark">DNI {dni}</p>
        </div>
        {cliente?.id && (
          <Link
            to={`/clientes/${cliente.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] text-duo-azul text-[11px] font-black uppercase tracking-wide hover:brightness-105 transition shrink-0"
          >
            Ver perfil <HiExternalLink />
          </Link>
        )}
      </div>

      {/* 📞 CONFIRMAR EL TELÉFONO
          Antes la tarjeta no lo mostraba: el operador tenía al cliente enfrente
          y no podía chequear si el número guardado seguía siendo el bueno.
          Y de ese número dependen el link del portal y los recordatorios de
          pago — si está viejo, el cliente no se entera de nada. */}
      {form && set ? (
        <div className="mt-3 pt-3 border-t-2 border-linea dark:border-linea-dark">
          <div className="flex items-center gap-1.5 mb-2 ml-1">
            <HiPhone className="text-duo-azul shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark">
              ¿Este es su teléfono?
            </span>
          </div>
          <InputDuo
            value={form.cli_telefono}
            onChange={set("cli_telefono")}
            placeholder="11..."
            inputMode="tel"
          />
        </div>
      ) : null}
    </CardDuo>
  );
}

function Aviso({ tono = "ok", children }) {
  const estilos = {
    ok: "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] text-duo-verde-sombra dark:text-duo-verde border-duo-verde",
    warn: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] text-duo-amarillo-sombra dark:text-duo-amarillo border-duo-amarillo",
    neutro: "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark border-linea dark:border-linea-dark",
  };
  return (
    <div className={`mt-3 rounded-2xl border-2 px-4 py-2.5 text-[13px] font-bold flex items-start gap-2 ${estilos[tono] || estilos.ok}`}>
      <span className="text-base shrink-0 mt-0.5">
        {tono === "warn" ? <HiExclamationCircle /> : tono === "ok" ? <HiCheckCircle /> : "ℹ️"}
      </span>
      <div>{children}</div>
    </div>
  );
}

function PantallaExito({ creado, tieneCuponera, onCobrar, onCerrar }) {
  return (
    <div className="text-center py-4">
      <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-2 border-duo-verde flex items-center justify-center">
        <HiCheckCircle className="text-duo-verde-sombra dark:text-duo-verde text-5xl" />
      </div>
      <h3 className="text-xl font-black text-titulo dark:text-titulo-dark mb-1">¡Alta creada! 🎉</h3>
      {tieneCuponera ? (
        <p className="text-[13px] font-bold text-suave dark:text-suave-dark mb-6">
          Ya quedó cargada con su <b className="text-titulo dark:text-titulo-dark">cuponera</b>. El cliente paga los
          cupones y ustedes le recuerdan los vencimientos. No hay que cobrar acá.
        </p>
      ) : (
        <p className="text-[13px] font-bold text-suave dark:text-suave-dark mb-6">
          Ya quedó cargada. Lo que falte lo completás después desde el perfil. ¿Cobrás la primera cuota ahora?
        </p>
      )}
      <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
        {!tieneCuponera && creado?.poliza_id && (
          <Boton3D variant="verde" full onClick={onCobrar}>
            <HiCash /> Cobrar 1ª cuota
          </Boton3D>
        )}
        <Boton3D variant={tieneCuponera ? "verde" : "blanco"} full onClick={onCerrar}>
          {tieneCuponera ? "Listo, cerrar" : "Ahora no, cerrar"}
        </Boton3D>
      </div>
    </div>
  );
}