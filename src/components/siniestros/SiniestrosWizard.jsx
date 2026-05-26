// src/components/siniestros/SiniestrosWizard.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiArrowRight, HiArrowLeft, HiSearch, HiCheck,
  HiTruck, HiShieldExclamation, HiLockClosed, HiFire,
  HiDotsHorizontal, HiCalendar, HiDocumentText, HiUser, HiCheckCircle,
} from "react-icons/hi";
import api from "../../services/api";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

/* ── Tipos de siniestro ── */
const TIPOS = [
  { key: "CHOCO",    Icon: HiTruck,            label: "Chocó",        desc: "El asegurado causó el choque",  bg: "bg-orange-900/50", border: "border-orange-700/60", activeBg: "bg-orange-700/70", activeBorder: "border-orange-400", iconColor: "text-orange-300", textColor: "text-orange-100" },
  { key: "CHOCARON", Icon: HiShieldExclamation, label: "Fue chocado",  desc: "Un tercero lo impactó",         bg: "bg-blue-900/50",   border: "border-blue-700/60",   activeBg: "bg-blue-700/70",   activeBorder: "border-blue-400",   iconColor: "text-blue-300",   textColor: "text-blue-100"   },
  { key: "ROBO",     Icon: HiLockClosed,        label: "Robo / Hurto", desc: "Sustracción total o parcial",   bg: "bg-rose-900/50",   border: "border-rose-700/60",   activeBg: "bg-rose-700/70",   activeBorder: "border-rose-400",   iconColor: "text-rose-300",   textColor: "text-rose-100"   },
  { key: "INCENDIO", Icon: HiFire,              label: "Incendio",     desc: "Daños por fuego o explosión",   bg: "bg-red-900/50",    border: "border-red-700/60",    activeBg: "bg-red-700/70",    activeBorder: "border-red-400",    iconColor: "text-red-300",    textColor: "text-red-100"    },
  { key: "OTRO",     Icon: HiDotsHorizontal,    label: "Otro",         desc: "Granizo, vandalismo, etc.",     bg: "bg-slate-800/60",  border: "border-slate-600/60",  activeBg: "bg-slate-600/70",  activeBorder: "border-slate-400",  iconColor: "text-slate-300",  textColor: "text-slate-100"  },
];

const STEPS = [
  { id: 1, label: "Póliza"  },
  { id: 2, label: "Tipo"    },
  { id: 3, label: "Fecha"   },
  { id: 4, label: "Relato"  },
  { id: 5, label: "Tercero" },
];

const EMPTY = {
  cliente: "", poliza: "", estado: "PENDIENTE", fecha_siniestro: "",
  nro_reclamo_cia: "", responsabilidad: "CHOCO",
  marca_auto: "", modelo_auto: "", ano_auto: "", patente: "",
  descripcion: "", tercero_nombre: "", tercero_telefono: "",
  tercero_patente: "", tercero_compania: "", tercero_poliza: "",
  _clienteNombre: "", _clienteDni: "", _companiaNombre: "", _oficinaNombre: "",
};

/* ─────────────────────────────────────────
   Helpers para leer cliente
   La API puede devolver cliente como:
     - objeto completo { id, nombre, apellido, dni_cuit_cuil, ... }
     - número (ID)
     - null
───────────────────────────────────────── */
function getClienteId(cliField) {
  if (!cliField) return null;
  if (typeof cliField === "number") return cliField;
  if (typeof cliField === "object") return cliField.id ?? null;
  return null;
}

function clienteTieneNombre(cliField) {
  if (!cliField || typeof cliField !== "object") return false;
  return !!(cliField.nombre && cliField.apellido);
}

/* ─────────────────────────────────────────
   Componente: buscador de póliza
───────────────────────────────────────── */
function SearchPoliza({ value, displayValue, onSelect, oficinaSel = "" }) {
  const [q,       setQ]       = useState(displayValue || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timer = useRef(null);
  const ref   = useRef(null);

  useEffect(() => { setQ(displayValue || ""); }, [displayValue]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (text) => {
    if (!text.trim() || text.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      // 1. Buscar pólizas
      const { data: polData } = await api.get(
        `polizas/?search=${encodeURIComponent(text)}&page_size=8${oficinaSel ? `&oficina=${oficinaSel}` : ""}`
      );

      const polizas = polData.results || polData || [];

      if (polizas.length > 0) {
      }

      // 2. Para cada póliza, obtener el cliente completo si no viene hidratado
      const hydrated = await Promise.all(
        polizas.map(async (p) => {
          const cliTieneNombre = clienteTieneNombre(p.cliente);

          if (cliTieneNombre) return p;

          const cliId = getClienteId(p.cliente);
          if (!cliId) return p;

          try {
            const { data: cliData } = await api.get(`clientes/${cliId}/`);
            return { ...p, cliente: cliData };
          } catch (err) {
            return p;
          }
        })
      );

      setResults(hydrated);
      setOpen(hydrated.length > 0);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [oficinaSel]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 350);
  };

  const handleSelect = (p) => {
    onSelect(p);
    setQ(
      [p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null]
        .filter(Boolean)
        .join(" · ")
    );
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          value={q}
          onChange={handleChange}
          autoFocus
          placeholder="Buscá por patente, nombre o N° de póliza..."
          autoComplete="off"
          className="w-full h-14 pl-12 pr-12 rounded-2xl bg-slate-800 border border-slate-600 text-slate-100 text-base placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && value && (
          <HiCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
        )}
      </div>

      {/* Dropdown resultados */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 top-full mt-2 w-full bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden max-h-60 overflow-y-auto"
          >
            {results.map((p) => {
              const cli = p.cliente && typeof p.cliente === "object" ? p.cliente : null;

              // Nombre del cliente
              const apellido      = cli?.apellido      || "";
              const nombre        = cli?.nombre        || "";
              const nombreCliente = [apellido, nombre].filter(Boolean).join(", ") || "Sin nombre";

              // DNI
              const dni = cli?.dni_cuit_cuil || cli?.dni || "";

              // Vehículo
              const vehiculo = [p.marca, p.modelo].filter(Boolean).join(" ");

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                >
                  {/* Línea 1: patente · N° póliza · compañía */}
                  <p className="font-bold text-slate-100 text-sm">
                    {[p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null, p.compania_nombre]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  {/* Línea 2: apellido, nombre · DNI */}
                  <p className="text-xs text-indigo-400 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                    <span>{nombreCliente}</span>
                    {dni && (
                      <span className="text-slate-500 font-normal">· DNI {dni}</span>
                    )}
                  </p>

                  {/* Línea 3: marca modelo */}
                  {vehiculo && (
                    <p className="text-xs text-slate-500 mt-0.5">{vehiculo}</p>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   Componente principal: SiniestrosWizard
───────────────────────────────────────── */
export default function SiniestrosWizard({ isOpen, onClose, onSubmit, initialData, isAdmin: isAdminProp }) {
  // 🚀 SEGURIDAD MULTI-TENANT
  // Si el padre no pasa isAdmin, lo derivamos del perfil del usuario logueado.
  const { user } = useAuth();
  const isAdmin = typeof isAdminProp === "boolean"
    ? isAdminProp
    : (user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser);

  // Oficina del usuario empleado (su perfil). Para Admin esto se ignora.
  const oficinaPropiaId =
    user?.perfil?.oficina?.id ??
    user?.perfil?.oficina_id ??
    (typeof user?.perfil?.oficina === "number" ? user.perfil.oficina : null);

  const oficinaPropiaNombre =
    user?.perfil?.oficina?.nombre ??
    user?.perfil?.oficina_nombre ??
    "";

  const [step,        setStep]        = useState(1);
  const [direction,   setDirection]   = useState(1);
  const [form,        setForm]        = useState(EMPTY);
  const [polizaDisplay, setPolizaDisplay] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [skipTercero, setSkipTercero] = useState(false);
  const [oficinas,    setOficinas]    = useState([]);
  const [oficinaSel,  setOficinaSel]  = useState("");   // solo admin

  // Cargar oficinas para el admin
  useEffect(() => {
    if (!isAdmin) return;
    api.get('usuarios/oficinas/')
      .then(({ data }) => setOficinas(Array.isArray(data) ? data : (data.results || [])))
      .catch(() => setOficinas([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        ...EMPTY,
        ...initialData,
        fecha_siniestro: initialData.fecha_siniestro?.substring(0, 10) || "",
        _clienteNombre: initialData.cliente_label || "",
        _clienteDni: "",
      });
      setPolizaDisplay(initialData.poliza_label || "");
    } else {
      setForm(EMPTY);
      setPolizaDisplay("");
    }
    setStep(1);
    setSkipTercero(false);
    // 🚀 SEGURIDAD: solo el admin elige oficina libre. El empleado siempre
    // queda atado a su oficina (forzada vía oficinaPropiaId en la query).
    setOficinaSel("");
  }, [isOpen, initialData]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const goNext = () => { setDirection(1);  setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); };

  const canNext = () => {
    if (step === 1) return !!form.poliza;
    if (step === 2) return !!form.responsabilidad;
    if (step === 3) return !!form.fecha_siniestro;
    if (step === 4) return form.descripcion.trim().length >= 10;
    return true;
  };

  /* Cuando el usuario selecciona una póliza del buscador */
  const onPolizaSelect = async (p) => {
    const cli = p.cliente && typeof p.cliente === "object" ? p.cliente : null;
    const cliId = cli?.id || (typeof p.cliente === "number" ? p.cliente : null);

    set("poliza",      p.id);
    set("marca_auto",  p.marca    || "");
    set("modelo_auto", p.modelo   || "");
    set("patente",     p.patente  || "");
    // 🐛 FIX: el modelo Django requiere ano_auto (PositiveIntegerField, sin null).
    // Lo derivamos del campo "anio" de la póliza. Si no hay, queda "" y handleSubmit lo manda como null/0.
    set("ano_auto",    p.anio != null ? Number(p.anio) : "");
    set("_companiaNombre", p.compania_nombre || p.compania || "");
    set("_oficinaNombre",  p.oficina_nombre  || "");

    // Si el cliente ya vino completo con nombre usarlo
    if (cli?.nombre && cli?.apellido) {
      set("cliente",        cli.id);
      set("_clienteNombre", [cli.apellido, cli.nombre].filter(Boolean).join(", "));
      set("_clienteDni",    cli.dni_cuit_cuil || cli.dni || "");
    } else if (cliId) {
      // Fetch directo al endpoint de clientes
      set("cliente", cliId);
      try {
        const { data: cliData } = await api.get(`clientes/${cliId}/`);
        set("_clienteNombre", [cliData.apellido, cliData.nombre].filter(Boolean).join(", "));
        set("_clienteDni",    cliData.dni_cuit_cuil || cliData.dni || "");
        set("cliente",        cliData.id);
      } catch (e) {
        console.error("Error fetching cliente:", e);
      }
    }

    setPolizaDisplay(
      [p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null]
        .filter(Boolean)
        .join(" · ")
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 🐛 FIX DEFINITIVO: en vez de spread + delete, construimos el payload
      // CAMPO POR CAMPO con whitelist. Así garantizamos que nada que sea
      // string vacío, NaN o tipo raro llegue al backend.
      const payload = {};

      // ─── Campos obligatorios ───
      if (form.cliente) payload.cliente = Number(form.cliente);
      if (form.poliza)  payload.poliza  = Number(form.poliza);
      payload.estado          = form.estado || "PENDIENTE";
      payload.responsabilidad = form.responsabilidad || "CHOCO";
      payload.descripcion     = String(form.descripcion || "").trim();

      // ─── Campos del vehículo (TODOS opcionales).
      //     Si el campo está vacío, NO lo incluimos en el payload.
      //     El backend lo autocompleta desde la póliza en el save() del modelo. ───
      const anoNum = Number(form.ano_auto);
      if (Number.isFinite(anoNum) && anoNum > 1900 && anoNum < 2100) {
        payload.ano_auto = anoNum;
      }
      const marca = String(form.marca_auto || "").trim();
      if (marca) payload.marca_auto = marca;

      const modelo = String(form.modelo_auto || "").trim();
      if (modelo) payload.modelo_auto = modelo;

      const patente = String(form.patente || "").toUpperCase().replace(/\s+/g, "");
      if (patente) payload.patente = patente;

      // ─── Fecha y nro de reclamo ───
      if (form.fecha_siniestro) {
        payload.fecha_siniestro = form.fecha_siniestro;
      }
      const nroReclamo = String(form.nro_reclamo_cia || "").trim();
      if (nroReclamo) payload.nro_reclamo_cia = nroReclamo;

      // ─── Tercero (siempre todos los 5 campos, vacíos si no aplica) ───
      if (skipTercero) {
        payload.tercero_nombre    = "";
        payload.tercero_telefono  = "";
        payload.tercero_patente   = "";
        payload.tercero_compania  = "";
        payload.tercero_poliza    = "";
      } else {
        payload.tercero_nombre    = String(form.tercero_nombre   || "").trim();
        payload.tercero_telefono  = String(form.tercero_telefono || "").trim();
        payload.tercero_patente   = String(form.tercero_patente  || "").toUpperCase().replace(/\s+/g, "");
        payload.tercero_compania  = String(form.tercero_compania || "").trim();
        payload.tercero_poliza    = String(form.tercero_poliza   || "").trim();
      }

      // ─── 🚀 SEGURIDAD MULTI-TENANT ───
      // Admin: solo manda oficina si eligió una específica con los chips.
      // Empleado: SIEMPRE manda su propia oficina (el backend igual lo valida).
      if (isAdmin) {
        if (oficinaSel) payload.oficina = Number(oficinaSel);
      } else if (oficinaPropiaId) {
        payload.oficina = Number(oficinaPropiaId);
      }

      // 🐛 DEBUG: log del payload final antes de mandarlo
      console.group("🧪 [SiniestrosWizard] handleSubmit — payload final");
      console.log("👤 isAdmin:", isAdmin);
      console.log("🏢 oficinaPropiaId:", oficinaPropiaId);
      console.log("🏢 oficinaSel (admin):", oficinaSel);
      console.log("📋 form (state completo):", form);
      console.log("📦 payload a enviar:", payload);
      console.log("📦 payload JSON:", JSON.stringify(payload, null, 2));
      console.groupEnd();

      await onSubmit(payload);
      onClose();
    } catch (err) {
      // 🐛 FIX: el error puede venir en distintos formatos:
      //   - AxiosError directo: err.response.data
      //   - rejectWithValue del thunk: err es directamente el objeto del backend
      //   - Excepción JS común: err.message
      const detalle =
        err?.response?.data ||
        (err && typeof err === "object" && !err.message ? err : null) ||
        err?.payload ||
        err?.message;

      console.error("[SiniestrosWizard] Error al guardar:", detalle);

      if (detalle && typeof detalle === "object") {
        // Backend devolvió {campo: [mensaje]} → mostramos el primer campo con error
        const entries = Object.entries(detalle).filter(([k]) => k !== "detail");
        if (entries.length > 0) {
          const [campo, msg] = entries[0];
          const txt = Array.isArray(msg) ? msg[0] : String(msg);
          toast.error(`${campo}: ${txt}`);
        } else if (detalle.detail) {
          toast.error(String(detalle.detail));
        } else {
          toast.error("Error al guardar el siniestro");
        }
      } else if (typeof detalle === "string") {
        toast.error(detalle);
      } else {
        toast.error("Error al guardar el siniestro");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const slideVariants = {
    enter:  (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  if (!isOpen) return null;

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl my-auto"
      >
        {/* ── Header: barra de progreso ── */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-400">
              Nuevo siniestro — paso {step} de {STEPS.length}
            </p>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          {/* Barra */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          {/* Dots */}
          <div className="flex items-center justify-between mt-3">
            {STEPS.map(({ id, label }) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  id < step    ? "bg-indigo-400" :
                  id === step  ? "bg-indigo-500 ring-2 ring-indigo-400/40" :
                  "bg-slate-700"
                }`} />
                <span className={`text-[10px] font-bold ${id === step ? "text-indigo-400" : "text-slate-600"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contenido animado ── */}
        <div className="relative" style={{ minHeight: 340 }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="p-6 flex flex-col gap-5"
            >

              {/* ══ PASO 1: Póliza ══ */}
              {step === 1 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                      <HiUser className="w-7 h-7 text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-100">¿De qué póliza es el siniestro?</h2>
                    <p className="text-sm text-slate-500 mt-1">Buscá por patente, cliente o número de póliza</p>
                  </div>

                  {/* 🚀 SEGURIDAD MULTI-TENANT
                      Selector de oficina:
                      - Admin: ve los chips (Todas + lista de oficinas) y puede filtrar.
                      - Empleado/Vendedor: NO ve chips. Ve un badge con su oficina
                        y el backend filtra automáticamente las pólizas. */}
                  {isAdmin && oficinas.length > 0 ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Oficina
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => { setOficinaSel(""); setPolizaDisplay(""); set("poliza", ""); }}
                          className={`h-9 px-4 rounded-xl border text-xs font-bold transition-colors ${
                            !oficinaSel
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          Todas
                        </button>
                        {oficinas.map(o => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => { setOficinaSel(String(o.id)); setPolizaDisplay(""); set("poliza", ""); }}
                            className={`h-9 px-4 rounded-xl border text-xs font-bold transition-colors ${
                              oficinaSel === String(o.id)
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}
                          >
                            {o.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Empleado / Vendedor: badge informativo, sin posibilidad de cambiar.
                    oficinaPropiaNombre && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-900/30 border border-indigo-700/40">
                        <span className="text-[10px] uppercase tracking-wider font-black text-indigo-400">
                          Tu oficina
                        </span>
                        <span className="text-sm font-bold text-indigo-200">
                          🏢 {oficinaPropiaNombre}
                        </span>
                        <span className="ml-auto text-[10px] text-indigo-400/60 italic">
                          Solo verás pólizas de acá
                        </span>
                      </div>
                    )
                  )}

                  <SearchPoliza
                    value={form.poliza}
                    displayValue={polizaDisplay}
                    onSelect={onPolizaSelect}
                    oficinaSel={oficinaSel}
                  />

                  {/* Card de confirmación */}
                  {form.poliza && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-emerald-700/50 bg-emerald-950/40 overflow-hidden"
                    >
                      {/* Header verde */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-900/40">
                        <HiCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <p className="text-sm font-bold text-emerald-300">Póliza seleccionada</p>
                      </div>
                      {/* Datos */}
                      <div className="px-4 py-4 space-y-3">
                        {/* Asegurado — dato más importante, grande */}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Asegurado</p>
                          <p className="text-base font-black text-slate-100">
                            {form._clienteNombre || "Sin nombre"}
                          </p>
                          {form._clienteDni && (
                            <p className="text-xs text-slate-400 mt-0.5">DNI / CUIT: {form._clienteDni}</p>
                          )}
                        </div>
                        {/* Póliza y compañía */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Póliza</p>
                            <p className="text-sm font-bold text-indigo-400 font-mono">{polizaDisplay}</p>
                          </div>
                          {form._companiaNombre && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Compañía</p>
                              <p className="text-sm font-bold text-slate-200">{form._companiaNombre}</p>
                            </div>
                          )}
                        </div>
                        {/* Oficina — solo visible para admin */}
                        {isAdmin && form._oficinaNombre && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-900/30 border border-indigo-700/40 rounded-xl">
                            <span className="text-[10px] uppercase tracking-wider font-black text-indigo-400">Oficina</span>
                            <span className="text-sm font-bold text-indigo-300">{form._oficinaNombre}</span>
                          </div>
                        )}
                        {/* Vehículo */}
                        {(form.marca_auto || form.modelo_auto || form.patente) && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5">Vehículo</p>
                            <p className="text-sm font-bold text-slate-200">
                              {[form.marca_auto, form.modelo_auto].filter(Boolean).join(" ")}
                              {form.patente && (
                                <span className="ml-2 font-mono text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                                  {form.patente}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {/* ══ PASO 2: Tipo ══ */}
              {step === 2 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                      <HiTruck className="w-7 h-7 text-rose-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-100">¿Qué tipo de siniestro es?</h2>
                    <p className="text-sm text-slate-500 mt-1">Elegí la opción que mejor describe lo que pasó</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {TIPOS.map(({ key, Icon, label, desc, bg, border, activeBg, activeBorder, iconColor, textColor }) => {
                      const active = form.responsabilidad === key;
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          onClick={() => set("responsabilidad", key)}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            active
                              ? `${activeBg} ${activeBorder}`
                              : `${bg} ${border} hover:border-slate-500`
                          }`}
                        >
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                            active ? "bg-white/15" : "bg-slate-900/50"
                          }`}>
                            <Icon className={`w-5 h-5 ${active ? textColor : iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-black text-sm ${active ? textColor : "text-slate-300"}`}>{label}</p>
                            <p className={`text-xs mt-0.5 ${active ? "text-white/60" : "text-slate-500"}`}>{desc}</p>
                          </div>
                          {active && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0"
                            >
                              <HiCheck className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ══ PASO 3: Fecha ══ */}
              {step === 3 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                      <HiCalendar className="w-7 h-7 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-100">¿Cuándo ocurrió?</h2>
                    <p className="text-sm text-slate-500 mt-1">Fecha del accidente o del hecho</p>
                  </div>

                  <input
                    type="date"
                    autoFocus
                    value={form.fecha_siniestro}
                    max={dayjs().format("YYYY-MM-DD")}
                    onChange={(e) => set("fecha_siniestro", e.target.value)}
                    className="w-full h-14 px-5 rounded-2xl bg-slate-800 border border-slate-600 text-slate-100 text-base focus:outline-none focus:border-amber-400 transition-colors [color-scheme:dark]"
                  />

                  {/* Botones rápidos */}
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((d) => {
                      const fecha = dayjs().subtract(d, "day");
                      const fechaStr = fecha.format("YYYY-MM-DD");
                      const label = d === 0 ? "Hoy" : d === 1 ? "Ayer" : "Anteayer";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => set("fecha_siniestro", fechaStr)}
                          className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
                            form.fecha_siniestro === fechaStr
                              ? "bg-amber-700/60 border-amber-500 text-amber-200"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      N° Reclamo Cía (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.nro_reclamo_cia}
                      placeholder="Ej: 456789"
                      onChange={(e) => set("nro_reclamo_cia", e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* ══ PASO 4: Relato ══ */}
              {step === 4 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                      <HiDocumentText className="w-7 h-7 text-sky-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-100">¿Cómo ocurrió?</h2>
                    <p className="text-sm text-slate-500 mt-1">Describí brevemente los hechos</p>
                  </div>

                  <textarea
                    autoFocus
                    rows={5}
                    value={form.descripcion}
                    onChange={(e) => set("descripcion", e.target.value)}
                    placeholder="Ej: El asegurado circulaba por Av. San Martín cuando impactó contra un vehículo que no respetó el semáforo en rojo..."
                    className="w-full px-5 py-4 rounded-2xl bg-slate-800 border border-slate-600 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-sky-400 resize-none transition-colors"
                  />
                  <p className={`text-xs text-right ${form.descripcion.length < 10 ? "text-slate-600" : "text-emerald-500"}`}>
                    {form.descripcion.length} caracteres {form.descripcion.length < 10 ? "(mínimo 10)" : "✓"}
                  </p>
                </>
              )}

              {/* ══ PASO 5: Tercero ══ */}
              {step === 5 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                      <HiUser className="w-7 h-7 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-100">¿Hay un tercero involucrado?</h2>
                    <p className="text-sm text-slate-500 mt-1">Esta sección es opcional — podés saltearla</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSkipTercero(false)}
                      className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-colors ${
                        !skipTercero
                          ? "bg-purple-700/60 border-purple-500 text-purple-200"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      Sí, cargar datos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkipTercero(true)}
                      className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-colors ${
                        skipTercero
                          ? "bg-emerald-700/60 border-emerald-500 text-emerald-200"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      No hay tercero
                    </button>
                  </div>

                  {!skipTercero && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {[
                        { k: "tercero_nombre",   label: "Nombre del tercero",   ph: "Ej: Juan Pérez",      upper: false },
                        { k: "tercero_telefono", label: "Teléfono",             ph: "Ej: 11 1234-5678",    upper: false },
                        { k: "tercero_patente",  label: "Patente del vehículo", ph: "Ej: ABC123",          upper: true  },
                        { k: "tercero_compania", label: "Compañía de seguro",   ph: "Ej: Sancor Seguros",  upper: false },
                      ].map(({ k, label, ph, upper }) => (
                        <div key={k}>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {label}
                          </label>
                          <input
                            type="text"
                            value={form[k]}
                            placeholder={ph}
                            onChange={(e) => set(k, upper ? e.target.value.toUpperCase() : e.target.value)}
                            className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer: botones ── */}
        <div className="px-6 pb-6 pt-4 flex gap-3 border-t border-slate-800">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="h-12 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-2 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext()}
              className={`flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                canNext()
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30"
                  : "bg-slate-800 text-slate-600 cursor-not-allowed"
              }`}
            >
              Siguiente <HiArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                submitting
                  ? "bg-emerald-800 text-emerald-400 cursor-wait"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <HiCheckCircle className="w-4 h-4" />
                  Guardar siniestro
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}