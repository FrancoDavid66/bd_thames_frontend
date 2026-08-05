// src/components/solicitudes/NuevaSolicitudModal.jsx
//
// 🆕 NUEVA SOLICITUD — flujo guiado, no se traba.
//
//   Paso 1: DNI (verifica si el cliente ya existe).
//   Paso 2: ¿Cómo cargás? → 📄 Con PDF  /  ✍️ A mano.
//
//   ── Camino PDF ──
//     Paso 3: Elegí compañía → botones NRE / AMCA (la compañía queda fijada).
//     Paso 4: Subí el archivo (NRE = MERCOSUR · AMCA = Propuesta). Si sube el
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

const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

// Config de cada compañía "rápida" del camino PDF.
const CIAS_PDF = {
  NRE: {
    nombre: "NRE",
    archivo: "MERCOSUR",
    ayuda: "Subí el certificado MERCOSUR de NRE.",
    // palabras que deberían estar en el PDF correcto
    match: ["mercosur", "mercosul", "nre"],
  },
  AMCA: {
    nombre: "AMCA",
    archivo: "Propuesta completa",
    ayuda: "Subí la Propuesta completa de AMCA (la que trae los cupones).",
    match: ["asociacion mutual", "amca", "rapipago", "cuota nro"],
  },
};

function formVacio() {
  return {
    cli_nombre: "",
    cli_apellido: "",
    cli_dni: "",
    cli_telefono: "",
    cli_localidad: "",
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

  // Pasos: "dni" | "modo" | "pdf_cia" | "pdf_form" | "man_cliente" | "man_vehiculo" | "man_confirmar"
  const [paso, setPaso] = useState("dni");

  const [form, setForm] = useState(formVacio());
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  // PDF
  const [pdfTrajo, setPdfTrajo] = useState({});
  const [cuponesPdf, setCuponesPdf] = useState([]);
  const [datosDetectados, setDatosDetectados] = useState([]);
  const [companiaDetectada, setCompaniaDetectada] = useState("");
  const [ciaElegida, setCiaElegida] = useState(null); // "NRE" | "AMCA" (camino PDF)
  const pdfInputRef = useRef(null);
  const [leyendoPdf, setLeyendoPdf] = useState(false);
  const [pdfSubido, setPdfSubido] = useState(null);
  const [avisoArchivo, setAvisoArchivo] = useState(""); // "subiste el archivo equivocado"

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
        toast.success(`Cliente encontrado: ${match.nombre || ""} ${match.apellido || ""}`.trim());
      } else {
        setClienteExistente(null);
        setForm((f) => ({ ...f, cli_dni: dni }));
        toast("DNI nuevo — vas a crear un cliente nuevo.", { icon: "🆕" });
      }
      setPaso("modo");
    } catch (err) {
      console.error("[NuevaSolicitud] DNI:", err);
      setClienteExistente(null);
      setForm((f) => ({ ...f, cli_dni: dni }));
      toast("No se pudo verificar, pero podés seguir.", { icon: "⚠️" });
      setPaso("modo");
    } finally {
      setVerificandoDni(false);
    }
  }

  function saltearDni() {
    setClienteExistente(null);
    setForm((f) => ({ ...f, cli_dni: "" }));
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
    setPaso("pdf_form");
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
    const chips = [];
    const clienteYaRegistrado = !!clienteExistente;

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
        poner("cli_direccion", cli.direccion);
        poner("cli_localidad", cli.localidad);
      }
      poner("patente", veh.patente);
      if (veh.patente) chips.push(`Patente: ${veh.patente}`);
      poner("marca", marca);
      poner("modelo", modelo);
      if (marca || modelo) chips.push(`${marca} ${modelo}`.trim());
      poner("anio", veh.anio);
      poner("numero_motor", veh.motor);
      poner("numero_chasis", veh.chasis);
      if (veh.tipo) poner("tipo", veh.tipo);
      poner("numero_poliza", pol.numero);
      // Compañía: si el PDF la trae, la matcheamos. Si no, queda la fijada por el botón.
      if (pol.compania && String(pol.compania).trim()) {
        const ciaFinal = matchCompania(pol.compania, companias);
        next.compania = ciaFinal;
        trajo.compania = true;
        chips.push(`Compañía: ${ciaFinal}`);
        setCompaniaDetectada(ciaFinal);
      }
      poner("cobertura", pol.cobertura);
      return next;
    });

    if (cupones.length) chips.push(`${cupones.length} cupones`);
    setPdfTrajo(trajo);
    setCuponesPdf(cupones);
    setDatosDetectados(chips);

    // ── Chequeo: ¿el PDF coincide con la compañía elegida? ──
    if (ciaElegida) {
      const cfg = CIAS_PDF[ciaElegida];
      const t = (textoPlano || "").toLowerCase();
      const coincide = cfg.match.some((kw) => t.includes(kw));
      // AMCA sin cupones = probablemente el archivo equivocado
      const amcaSinCupones = ciaElegida === "AMCA" && cupones.length === 0;
      if (!coincide || amcaSinCupones) {
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
      if (avisos.length) avisos.forEach((a) => toast(a, { icon: "⚠️", duration: 4500 }));
      else toast.success("PDF leído. Revisá los datos.");

      try {
        const up = await uploadToCloudinary(files[0], "solicitudes/pdf");
        setPdfSubido({
          url: up.secure_url,
          public_id: up.public_id,
          mime: up.mime || "application/pdf",
          nombre: files[0].name,
        });
      } catch {}
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

  const faltaCampo = (k) => paso === "pdf_form" && ciaElegida && !pdfTrajo[k];

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
      const cuponesFinal = cuponesPdf.length
        ? cuponesPdf.map((c) => ({ numero: c.numero, vencimiento: c.vencimiento, importe: c.importe }))
        : cuponesManualValidos;

      const documentos = {};
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
  const mostrarCrear = (paso === "pdf_form" || paso === "man_confirmar") && !creado;

  const tituloHeader = creado
    ? "Alta creada"
    : paso === "dni"
    ? "Nueva Alta"
    : paso === "modo"
    ? "¿Cómo la cargás?"
    : paso === "pdf_cia"
    ? "¿De qué compañía?"
    : paso === "pdf_form"
    ? `Desde PDF · ${ciaElegida || ""}`
    : paso === "man_cliente"
    ? "A mano · Cliente"
    : paso === "man_vehiculo"
    ? "A mano · Vehículo"
    : "A mano · Confirmar";

  const iconoHeader = creado ? "🎉" : paso === "dni" ? "🪪" : paso.startsWith("man_") ? "✍️" : paso.startsWith("pdf_") ? "📄" : "✨";

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
            ) : paso === "modo" ? (
              /* ══════ PASO 2: PDF o Manual ══════ */
              <>
                <AvisoCliente clienteExistente={clienteExistente} dni={form.cli_dni} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                  <BotonModo
                    emoji="📄"
                    titulo="Con PDF"
                    desc="Subí el MERCOSUR (NRE) o la Propuesta (AMCA). Leemos casi todo solo."
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
                <BtnVolver onClick={() => setPaso("dni")}>Volver al DNI</BtnVolver>
              </>
            ) : paso === "pdf_cia" ? (
              /* ══════ PASO 3 (PDF): elegir compañía ══════ */
              <>
                <p className="text-center text-[14px] font-bold text-titulo dark:text-titulo-dark mb-2">
                  ¿De qué compañía es el PDF?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
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
                </div>
                <BtnVolver onClick={() => setPaso("modo")}>Volver</BtnVolver>
              </>
            ) : paso === "pdf_form" ? (
              /* ══════ PASO 4 (PDF): subir archivo + formulario ══════ */
              <>
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

                <SeccionResponsable
                  empleados={empleados}
                  responsable={responsable}
                  setResponsable={setResponsable}
                  onGestionar={() => setAbrirResponsables(true)}
                />

                {clienteExistente ? (
                  <TarjetaClienteExistente cliente={clienteExistente} dniFallback={form.cli_dni} />
                ) : (
                  <SeccionClienteCampos form={form} set={set} faltaCampo={faltaCampo} />
                )}

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
            ) : paso === "man_cliente" ? (
              /* ══════ WIZARD MANUAL — Paso 1: Cliente ══════ */
              <>
                <PasosWizard actual={1} />
                <BtnVolver onClick={() => setPaso("modo")}>Volver</BtnVolver>
                {clienteExistente ? (
                  <TarjetaClienteExistente cliente={clienteExistente} dniFallback={form.cli_dni} />
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
                      <b>NRE es trimestral automático.</b> Se generan 3 cuotas venciendo el mismo día de cada mes
                      desde hoy. No tenés que cargar fechas.
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

function FooterNav({ paso, creado, guardando, faltaCompania, faltaCobertura, mostrarCrear, onCrear, onSiguienteCliente, onSiguienteVehiculo }) {
  if (creado) return null;

  // Wizard manual: paso cliente → siguiente
  if (paso === "man_cliente") {
    return (
      <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
        <Boton3D variant="azul" full size="lg" onClick={onSiguienteCliente}>
          Siguiente: Vehículo →
        </Boton3D>
      </div>
    );
  }
  // Wizard manual: paso vehículo → siguiente (requiere compañía Y cobertura)
  if (paso === "man_vehiculo") {
    const bloquea = faltaCompania || faltaCobertura;
    const texto = faltaCompania ? "Elegí la compañía" : faltaCobertura ? "Elegí la cobertura" : "Siguiente: Confirmar →";
    return (
      <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
        <Boton3D variant="azul" full size="lg" onClick={onSiguienteVehiculo} disabled={bloquea}>
          {texto}
        </Boton3D>
      </div>
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
      <div className="px-5 py-4 border-t-2 border-linea dark:border-linea-dark bg-card dark:bg-card-dark">
        <Boton3D variant="verde" full size="lg" onClick={onCrear} disabled={bloquea}>
          <HiSparkles /> {texto}
        </Boton3D>
      </div>
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
  };
  const chip = map[tono] || map.azul;
  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border-[3px] border-linea dark:border-linea-dark bg-card dark:bg-card-dark p-7 text-center transition-all hover:-translate-y-1 ${chip.split(" ")[0]} shadow-[0_3px_0_var(--color-duo-linea)] dark:shadow-[0_3px_0_var(--color-linea-dark)]`}
    >
      <div className={`mx-auto mb-3 h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black ${chip.split(" ").slice(1).join(" ")}`}>
        {nombre.charAt(0)}
      </div>
      <div className="text-2xl font-black text-titulo dark:text-titulo-dark mb-1">{nombre}</div>
      <div className="text-[13px] font-bold text-suave dark:text-suave-dark flex items-center justify-center gap-1.5">
        <HiDocumentText /> {archivo}
      </div>
    </button>
  );
}

function BloquePdf({ cfg, inputRef, leyendo, onPick, onFile, chips, avisoArchivo }) {
  return (
    <CardDuo className="p-4">
      <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={onFile} />
      {chips.length === 0 ? (
        <button
          onClick={onPick}
          disabled={leyendo}
          className="w-full rounded-2xl border-[3px] border-dashed border-duo-azul bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] p-6 text-center transition-all hover:brightness-105 disabled:opacity-60"
        >
          <div className="text-4xl mb-1">📄</div>
          <div className="font-black text-duo-azul text-[15px] flex items-center justify-center gap-2">
            {leyendo ? "Leyendo PDF…" : (<><HiUpload /> Subir {cfg?.archivo}</>)}
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
          <button onClick={onPick} disabled={leyendo} className="mt-2 text-[12px] font-extrabold uppercase tracking-wide text-duo-azul hover:opacity-80">
            {leyendo ? "Leyendo…" : "↻ Subir otro PDF"}
          </button>
        </>
      )}
    </CardDuo>
  );
}

function PasosWizard({ actual }) {
  const pasos = [
    { n: 1, label: "Cliente" },
    { n: 2, label: "Vehículo" },
    { n: 3, label: "Confirmar" },
  ];
  return (
    <div className="flex items-center gap-2">
      {pasos.map((p, i) => (
        <div key={p.n} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide ${
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
  return (
    <SeccionCard icon={<HiIdentification />} tono="azul" titulo="Cliente" sub="Todo opcional — se completa después">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <InputDuo label="Nombre" value={form.cli_nombre} onChange={set("cli_nombre")} placeholder="Ej: Juan" />
        <InputDuo label="Apellido" value={form.cli_apellido} onChange={set("cli_apellido")} placeholder="Ej: Pérez" />
        <InputDuo label="DNI / CUIT" value={form.cli_dni} onChange={set("cli_dni")} placeholder="Sin puntos" inputMode="numeric" />
        <InputDuo
          label={<>Teléfono {faltaCampo("cli_telefono") && <TagFalta />}</>}
          value={form.cli_telefono}
          onChange={set("cli_telefono")}
          placeholder="11..."
          inputMode="tel"
          className={faltaCampo("cli_telefono") ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft" : ""}
        />
        <InputDuo label="Localidad" value={form.cli_localidad} onChange={set("cli_localidad")} placeholder="Ej: Ramos Mejía" />
        <InputDuo label="Dirección" value={form.cli_direccion} onChange={set("cli_direccion")} placeholder="Opcional" />
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
            className={`sm:col-span-2 ${faltaCobertura ? "[&_select]:border-duo-amarillo [&_select]:bg-duo-amarillo-soft" : ""}`}
          />
        ) : (
          <InputDuo
            label={<>Cobertura <span className="text-duo-rojo">*</span></>}
            value={form.cobertura}
            onChange={set("cobertura")}
            placeholder="A / B / C9…"
            className={`sm:col-span-2 ${faltaCobertura ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft" : ""}`}
          />
        )}
      </div>

      {/* Tipo de auto EN BOTONES */}
      <div className="mt-3">
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-suave dark:text-suave-dark mb-2 ml-1">
          Tipo de auto
        </div>
        <div className="flex flex-wrap gap-2">
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
          className={faltaCampo("patente") ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft" : ""}
        />
        <InputDuo label="Marca" value={form.marca} onChange={set("marca")} placeholder="Ford" />
        <InputDuo label="Modelo" value={form.modelo} onChange={set("modelo")} placeholder="Fiesta" />
        <InputDuo label="Año" value={form.anio} onChange={set("anio")} placeholder="2024" inputMode="numeric" />
        <SelectDuo label="Tipo de auto" value={form.tipo} onChange={set("tipo")} options={TIPOS_VEHICULO.map((t) => ({ value: t, label: t }))} />
        {companias.length ? (
          <SelectDuo
            label={<>Compañía <span className="text-duo-rojo">*</span></>}
            value={form.compania}
            onChange={set("compania")}
            placeholder="— Elegir —"
            options={opcionesCompania}
            className={faltaCompania ? "[&_select]:border-duo-amarillo [&_select]:bg-duo-amarillo-soft" : ""}
          />
        ) : (
          <InputDuo
            label={<>Compañía <span className="text-duo-rojo">*</span></>}
            value={form.compania}
            onChange={set("compania")}
            placeholder="NRE / AMCA…"
            className={faltaCompania ? "[&_input]:border-duo-amarillo [&_input]:bg-duo-amarillo-soft" : ""}
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
        <SelectDuo label="Tipo de auto" value={form.tipo} onChange={set("tipo")} options={TIPOS_VEHICULO.map((t) => ({ value: t, label: t }))} />
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

function TarjetaClienteExistente({ cliente, dniFallback }) {
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