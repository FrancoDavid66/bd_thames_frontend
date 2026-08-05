// src/components/siniestros/SiniestrosWizard.jsx  (responsive)
//
// 🧙 Wizard paso a paso para cargar un siniestro (diseño Duo claro/oscuro).
// Guía al usuario: Póliza → Tipo → Fecha → Relato → Fotos → Tercero.
// Las fotos se cargan en modo BORRADOR (memoria) y se suben al crear
// el siniestro: onSubmit(payload, draftFotos).
//
// 📱 RESPONSIVE:
//   - La hoja se limita a max-h-[92vh] y es columna flex: header (progreso) y
//     footer (botones) FIJOS, el contenido del paso SCROLLEA en el medio. Así
//     nada se corta ni desborda en celulares bajitos.
//   - Header de pasos: en mobile muestra solo los 6 puntitos + la etiqueta del
//     PASO ACTIVO (las 6 etiquetas de texto se ven recién desde sm:, donde entran).
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiX, HiArrowRight, HiArrowLeft, HiSearch, HiCheck,
  HiTruck, HiShieldExclamation, HiLockClosed, HiFire,
  HiDotsHorizontal, HiCalendar, HiDocumentText, HiUser,
  HiCheckCircle, HiPhotograph,
} from "react-icons/hi";
import api from "../../services/api";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import SiniestroFotosPanel from "./SiniestroFotosPanel";

/* ── Tipos de siniestro (tono Duo por tipo) ── */
const TIPOS = [
  { key: "CHOCO",    Icon: HiTruck,             label: "Chocó",        desc: "El asegurado causó el choque", tono: "amarillo" },
  { key: "CHOCARON", Icon: HiShieldExclamation, label: "Fue chocado",  desc: "Un tercero lo impactó",        tono: "azul"     },
  { key: "ROBO",     Icon: HiLockClosed,        label: "Robo / Hurto", desc: "Sustracción total o parcial",  tono: "rojo"     },
  { key: "INCENDIO", Icon: HiFire,              label: "Incendio",     desc: "Daños por fuego o explosión",  tono: "rojo"     },
  { key: "OTRO",     Icon: HiDotsHorizontal,    label: "Otro",         desc: "Granizo, vandalismo, etc.",    tono: "violeta"  },
];

// tono → clases Duo (activo / inactivo)
const TIPO_CLASES = {
  amarillo: { on: "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo", icon: "text-duo-amarillo-sombra dark:text-duo-amarillo" },
  azul:     { on: "bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] border-duo-azul",             icon: "text-duo-azul" },
  rojo:     { on: "bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] border-duo-rojo",             icon: "text-duo-rojo" },
  violeta:  { on: "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] border-duo-violeta",    icon: "text-duo-violeta" },
};

const STEPS = [
  { id: 1, label: "Póliza"  },
  { id: 2, label: "Tipo"    },
  { id: 3, label: "Fecha"   },
  { id: 4, label: "Relato"  },
  { id: 5, label: "Fotos"   },
  { id: 6, label: "Tercero" },
];

const EMPTY = {
  cliente: "", poliza: "", estado: "PENDIENTE", fecha_siniestro: "",
  nro_reclamo_cia: "", responsabilidad: "CHOCO",
  marca_auto: "", modelo_auto: "", ano_auto: "", patente: "",
  descripcion: "", tercero_nombre: "", tercero_telefono: "",
  tercero_patente: "", tercero_compania: "", tercero_poliza: "",
  _clienteNombre: "", _clienteDni: "", _companiaNombre: "", _oficinaNombre: "",
};

/* Helpers para leer cliente (puede venir como objeto, número o null) */
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
   Buscador de póliza (autocomplete)
───────────────────────────────────────── */
function SearchPoliza({ value, displayValue, onSelect, oficinaSel = "" }) {
  const [q, setQ] = useState(displayValue || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const ref = useRef(null);

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
      const { data: polData } = await api.get(
        `polizas/?search=${encodeURIComponent(text)}&page_size=8${oficinaSel ? `&oficina=${oficinaSel}` : ""}`
      );
      const polizas = polData.results || polData || [];

      // Hidratar cliente si no viene con nombre
      const hydrated = await Promise.all(
        polizas.map(async (p) => {
          if (clienteTieneNombre(p.cliente)) return p;
          const cliId = getClienteId(p.cliente);
          if (!cliId) return p;
          try {
            const { data: cliData } = await api.get(`clientes/${cliId}/`);
            return { ...p, cliente: cliData };
          } catch {
            return p;
          }
        })
      );

      setResults(hydrated);
      setOpen(hydrated.length > 0);
    } catch {
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
    setQ([p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null].filter(Boolean).join(" · "));
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-suave dark:text-suave-dark" />
        <input
          value={q}
          onChange={handleChange}
          autoFocus
          placeholder="Buscá por patente, nombre o N° de póliza..."
          autoComplete="off"
          className="w-full h-14 pl-12 pr-12 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[15px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-azul transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-duo-azul border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && value && (
          <HiCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-duo-verde" />
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 top-full mt-2 w-full bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
          >
            {results.map((p) => {
              const cli = p.cliente && typeof p.cliente === "object" ? p.cliente : null;
              const nombreCliente = [cli?.apellido || "", cli?.nombre || ""].filter(Boolean).join(", ") || "Sin nombre";
              const dni = cli?.dni_cuit_cuil || cli?.dni || "";
              const vehiculo = [p.marca, p.modelo].filter(Boolean).join(" ");
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-5 py-4 hover:bg-surface dark:hover:bg-surface-dark transition-colors border-b border-linea dark:border-linea-dark last:border-0"
                >
                  <p className="font-black text-titulo dark:text-titulo-dark text-sm">
                    {[p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null, p.compania_nombre].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-duo-azul font-bold mt-1 flex items-center gap-2 flex-wrap">
                    <span>{nombreCliente}</span>
                    {dni && <span className="text-suave dark:text-suave-dark font-medium">· DNI {dni}</span>}
                  </p>
                  {vehiculo && <p className="text-xs text-suave dark:text-suave-dark mt-0.5">{vehiculo}</p>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Etiqueta chiquita reutilizable */
function MiniLabel({ children }) {
  return (
    <label className="block text-[11px] font-black uppercase tracking-wide text-suave dark:text-suave-dark mb-1.5">
      {children}
    </label>
  );
}

/* ─────────────────────────────────────────
   Componente principal: SiniestrosWizard
───────────────────────────────────────── */
export default function SiniestrosWizard({ isOpen, onClose, onSubmit, initialData, isAdmin: isAdminProp }) {
  // 🚀 SEGURIDAD MULTI-TENANT: si el padre no pasa isAdmin, lo derivamos del perfil.
  const { user } = useAuth();
  const isAdmin = typeof isAdminProp === "boolean"
    ? isAdminProp
    : (user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN" || !!user?.is_superuser);

  const oficinaPropiaId =
    user?.perfil?.oficina?.id ??
    user?.perfil?.oficina_id ??
    (typeof user?.perfil?.oficina === "number" ? user.perfil.oficina : null);

  const oficinaPropiaNombre =
    user?.perfil?.oficina?.nombre ??
    user?.perfil?.oficina_nombre ?? "";

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [polizaDisplay, setPolizaDisplay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [skipTercero, setSkipTercero] = useState(false);
  const [oficinas, setOficinas] = useState([]);
  const [oficinaSel, setOficinaSel] = useState("");   // solo admin
  const [draftFotos, setDraftFotos] = useState([]);   // 📸 fotos en memoria

  // Cargar oficinas para el admin
  useEffect(() => {
    if (!isAdmin) return;
    api.get("usuarios/oficinas/")
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
    setOficinaSel("");
    setDraftFotos([]);
  }, [isOpen, initialData]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const goNext = () => { setDirection(1);  setStep((s) => s + 1); };
  const goBack = () => { setDirection(-1); setStep((s) => s - 1); };

  const canNext = () => {
    if (step === 1) return !!form.poliza;
    if (step === 2) return !!form.responsabilidad;
    if (step === 3) return !!form.fecha_siniestro;
    if (step === 4) return form.descripcion.trim().length >= 10;
    return true; // paso 5 (fotos) y 6 (tercero) son opcionales
  };

  /* Cuando el usuario selecciona una póliza del buscador */
  const onPolizaSelect = async (p) => {
    const cli = p.cliente && typeof p.cliente === "object" ? p.cliente : null;
    const cliId = cli?.id || (typeof p.cliente === "number" ? p.cliente : null);

    set("poliza", p.id);
    set("marca_auto", p.marca || "");
    set("modelo_auto", p.modelo || "");
    set("patente", p.patente || "");
    set("ano_auto", p.anio != null ? Number(p.anio) : "");
    set("_companiaNombre", p.compania_nombre || p.compania || "");
    set("_oficinaNombre", p.oficina_nombre || "");

    if (cli?.nombre && cli?.apellido) {
      set("cliente", cli.id);
      set("_clienteNombre", [cli.apellido, cli.nombre].filter(Boolean).join(", "));
      set("_clienteDni", cli.dni_cuit_cuil || cli.dni || "");
    } else if (cliId) {
      set("cliente", cliId);
      try {
        const { data: cliData } = await api.get(`clientes/${cliId}/`);
        set("_clienteNombre", [cliData.apellido, cliData.nombre].filter(Boolean).join(", "));
        set("_clienteDni", cliData.dni_cuit_cuil || cliData.dni || "");
        set("cliente", cliData.id);
      } catch (e) {
        console.error("Error fetching cliente:", e);
      }
    }

    setPolizaDisplay([p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null].filter(Boolean).join(" · "));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 🛡️ Payload con whitelist campo por campo (nada vacío/NaN llega al back).
      const payload = {};

      if (form.cliente) payload.cliente = Number(form.cliente);
      if (form.poliza)  payload.poliza  = Number(form.poliza);
      payload.estado          = form.estado || "PENDIENTE";
      payload.responsabilidad = form.responsabilidad || "CHOCO";
      payload.descripcion     = String(form.descripcion || "").trim();

      const anoNum = Number(form.ano_auto);
      if (Number.isFinite(anoNum) && anoNum > 1900 && anoNum < 2100) payload.ano_auto = anoNum;

      const marca = String(form.marca_auto || "").trim();
      if (marca) payload.marca_auto = marca;
      const modelo = String(form.modelo_auto || "").trim();
      if (modelo) payload.modelo_auto = modelo;
      const patente = String(form.patente || "").toUpperCase().replace(/\s+/g, "");
      if (patente) payload.patente = patente;

      if (form.fecha_siniestro) payload.fecha_siniestro = form.fecha_siniestro;
      const nroReclamo = String(form.nro_reclamo_cia || "").trim();
      if (nroReclamo) payload.nro_reclamo_cia = nroReclamo;

      if (skipTercero) {
        payload.tercero_nombre = ""; payload.tercero_telefono = ""; payload.tercero_patente = "";
        payload.tercero_compania = ""; payload.tercero_poliza = "";
      } else {
        payload.tercero_nombre   = String(form.tercero_nombre   || "").trim();
        payload.tercero_telefono = String(form.tercero_telefono || "").trim();
        payload.tercero_patente  = String(form.tercero_patente  || "").toUpperCase().replace(/\s+/g, "");
        payload.tercero_compania = String(form.tercero_compania || "").trim();
        payload.tercero_poliza   = String(form.tercero_poliza   || "").trim();
      }

      // 🚀 Multi-tenant: admin manda oficina solo si eligió una; empleado manda la suya.
      if (isAdmin) {
        if (oficinaSel) payload.oficina = Number(oficinaSel);
      } else if (oficinaPropiaId) {
        payload.oficina = Number(oficinaPropiaId);
      }

      // 📸 Las fotos borrador se suben en el padre después de crear el siniestro.
      await onSubmit(payload, draftFotos);
      onClose();
    } catch (err) {
      const detalle =
        err?.response?.data ||
        (err && typeof err === "object" && !err.message ? err : null) ||
        err?.payload ||
        err?.message;

      if (detalle && typeof detalle === "object") {
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

  const esUltimo = step === STEPS.length;
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 20 }}
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-card dark:bg-card-dark border-2 border-linea dark:border-linea-dark rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        {/* ── Header: progreso (fijo) ── */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b-2 border-linea dark:border-linea-dark">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black text-suave dark:text-suave-dark">
              {initialData ? "Editar siniestro" : "Nuevo siniestro"} — paso {step} de {STEPS.length}
            </p>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-xl bg-surface dark:bg-surface-dark hover:brightness-95 text-suave dark:text-suave-dark transition-colors"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>

          <div className="h-2 bg-surface dark:bg-surface-dark rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-duo-azul rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          {/* 📱 En mobile: solo puntitos + etiqueta del paso activo. En sm+: las 6 etiquetas. */}
          <div className="flex items-center justify-center sm:justify-between gap-1.5 sm:gap-0 mt-3">
            {STEPS.map(({ id, label }) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <div className={`h-2 w-2 rounded-full transition-colors ${
                  id < step ? "bg-duo-azul" :
                  id === step ? "bg-duo-azul ring-2 ring-duo-azul/40" :
                  "bg-linea dark:bg-linea-dark"
                }`} />
                <span className={`hidden sm:block text-[10px] font-black ${id === step ? "text-duo-azul" : "text-suave dark:text-suave-dark"}`}>
                  {label}
                </span>
              </div>
            ))}
            {/* Etiqueta del paso activo (solo mobile) */}
            <span className="sm:hidden ml-2 text-xs font-black text-duo-azul">
              {STEPS[step - 1]?.label}
            </span>
          </div>
        </div>

        {/* ── Contenido animado (scrollea) ── */}
        <div className="relative min-h-0 flex-1 overflow-y-auto">
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
                    <div className="h-14 w-14 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] flex items-center justify-center mx-auto mb-3">
                      <HiUser className="w-7 h-7 text-duo-azul" />
                    </div>
                    <h2 className="text-xl font-black text-titulo dark:text-titulo-dark">¿De qué póliza es el siniestro?</h2>
                    <p className="text-sm text-suave dark:text-suave-dark mt-1 font-bold">Buscá por patente, cliente o número de póliza</p>
                  </div>

                  {/* 🚀 Multi-tenant: admin ve chips de oficina; empleado ve badge fijo */}
                  {isAdmin && oficinas.length > 0 ? (
                    <div>
                      <MiniLabel>Oficina</MiniLabel>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => { setOficinaSel(""); setPolizaDisplay(""); set("poliza", ""); }}
                          className={`h-9 px-4 rounded-xl border-2 text-xs font-black transition-colors ${
                            !oficinaSel
                              ? "bg-duo-azul border-duo-azul text-white"
                              : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-azul"
                          }`}
                        >
                          Todas
                        </button>
                        {oficinas.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => { setOficinaSel(String(o.id)); setPolizaDisplay(""); set("poliza", ""); }}
                            className={`h-9 px-4 rounded-xl border-2 text-xs font-black transition-colors ${
                              oficinaSel === String(o.id)
                                ? "bg-duo-azul border-duo-azul text-white"
                                : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-azul"
                            }`}
                          >
                            {o.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    oficinaPropiaNombre && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)]">
                        <span className="text-[10px] uppercase tracking-wide font-black text-duo-azul">Tu oficina</span>
                        <span className="text-sm font-black text-duo-azul">🏢 {oficinaPropiaNombre}</span>
                      </div>
                    )
                  )}

                  <SearchPoliza value={form.poliza} displayValue={polizaDisplay} onSelect={onPolizaSelect} oficinaSel={oficinaSel} />

                  {/* Card de confirmación */}
                  {form.poliza && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border-2 border-duo-verde/50 bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-duo-verde/30">
                        <HiCheckCircle className="w-5 h-5 text-duo-verde shrink-0" />
                        <p className="text-sm font-black text-duo-verde-sombra dark:text-duo-verde">Póliza seleccionada</p>
                      </div>
                      <div className="px-4 py-4 space-y-3">
                        <div>
                          <MiniLabel>Asegurado</MiniLabel>
                          <p className="text-base font-black text-titulo dark:text-titulo-dark">{form._clienteNombre || "Sin nombre"}</p>
                          {form._clienteDni && <p className="text-xs text-suave dark:text-suave-dark mt-0.5 font-bold">DNI / CUIT: {form._clienteDni}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <MiniLabel>Póliza</MiniLabel>
                            <p className="text-sm font-black text-duo-azul font-mono">{polizaDisplay}</p>
                          </div>
                          {form._companiaNombre && (
                            <div>
                              <MiniLabel>Compañía</MiniLabel>
                              <p className="text-sm font-black text-titulo dark:text-titulo-dark">{form._companiaNombre}</p>
                            </div>
                          )}
                        </div>
                        {isAdmin && form._oficinaNombre && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] rounded-xl">
                            <span className="text-[10px] uppercase tracking-wide font-black text-duo-azul">Oficina</span>
                            <span className="text-sm font-black text-duo-azul">{form._oficinaNombre}</span>
                          </div>
                        )}
                        {(form.marca_auto || form.modelo_auto || form.patente) && (
                          <div>
                            <MiniLabel>Vehículo</MiniLabel>
                            <p className="text-sm font-black text-titulo dark:text-titulo-dark">
                              {[form.marca_auto, form.modelo_auto].filter(Boolean).join(" ")}
                              {form.patente && (
                                <span className="ml-2 font-mono text-xs bg-surface dark:bg-surface-dark border border-linea dark:border-linea-dark px-2 py-0.5 rounded-md uppercase">
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
                    <div className="h-14 w-14 rounded-2xl bg-duo-rojo-soft dark:bg-[var(--color-duo-rojo-soft-dark)] flex items-center justify-center mx-auto mb-3">
                      <HiTruck className="w-7 h-7 text-duo-rojo" />
                    </div>
                    <h2 className="text-xl font-black text-titulo dark:text-titulo-dark">¿Qué tipo de siniestro es?</h2>
                    <p className="text-sm text-suave dark:text-suave-dark mt-1 font-bold">Elegí la opción que mejor describe lo que pasó</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {TIPOS.map(({ key, Icon, label, desc, tono }) => {
                      const active = form.responsabilidad === key;
                      const cl = TIPO_CLASES[tono] || TIPO_CLASES.azul;
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          onClick={() => set("responsabilidad", key)}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            active ? cl.on : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark hover:border-duo-azul"
                          }`}
                        >
                          <div className="h-11 w-11 rounded-xl bg-card dark:bg-card-dark flex items-center justify-center shrink-0">
                            <Icon className={`w-5 h-5 ${cl.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-titulo dark:text-titulo-dark">{label}</p>
                            <p className="text-xs mt-0.5 text-suave dark:text-suave-dark font-bold">{desc}</p>
                          </div>
                          {active && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-6 w-6 rounded-full bg-duo-verde flex items-center justify-center shrink-0">
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
                    <div className="h-14 w-14 rounded-2xl bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] flex items-center justify-center mx-auto mb-3">
                      <HiCalendar className="w-7 h-7 text-duo-amarillo-sombra dark:text-duo-amarillo" />
                    </div>
                    <h2 className="text-xl font-black text-titulo dark:text-titulo-dark">¿Cuándo ocurrió?</h2>
                    <p className="text-sm text-suave dark:text-suave-dark mt-1 font-bold">Fecha del accidente o del hecho</p>
                  </div>

                  <input
                    type="date"
                    autoFocus
                    value={form.fecha_siniestro}
                    max={dayjs().format("YYYY-MM-DD")}
                    onChange={(e) => set("fecha_siniestro", e.target.value)}
                    className="w-full h-14 px-5 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[15px] font-bold text-titulo dark:text-titulo-dark outline-none focus:border-duo-azul transition-colors dark:[color-scheme:dark]"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((d) => {
                      const fechaStr = dayjs().subtract(d, "day").format("YYYY-MM-DD");
                      const label = d === 0 ? "Hoy" : d === 1 ? "Ayer" : "Anteayer";
                      const active = form.fecha_siniestro === fechaStr;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => set("fecha_siniestro", fechaStr)}
                          className={`h-11 rounded-xl border-2 text-sm font-black transition-colors ${
                            active
                              ? "bg-duo-amarillo-soft dark:bg-[var(--color-duo-amarillo-soft-dark)] border-duo-amarillo text-duo-amarillo-sombra dark:text-duo-amarillo"
                              : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-azul"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <MiniLabel>N° Reclamo Cía (opcional)</MiniLabel>
                    <input
                      type="text"
                      value={form.nro_reclamo_cia}
                      placeholder="Ej: 456789"
                      onChange={(e) => set("nro_reclamo_cia", e.target.value)}
                      className="w-full h-12 px-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[15px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-azul transition-colors"
                    />
                  </div>
                </>
              )}

              {/* ══ PASO 4: Relato ══ */}
              {step === 4 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-duo-azul-soft dark:bg-[var(--color-duo-azul-soft-dark)] flex items-center justify-center mx-auto mb-3">
                      <HiDocumentText className="w-7 h-7 text-duo-azul" />
                    </div>
                    <h2 className="text-xl font-black text-titulo dark:text-titulo-dark">¿Cómo ocurrió?</h2>
                    <p className="text-sm text-suave dark:text-suave-dark mt-1 font-bold">Describí brevemente los hechos</p>
                  </div>

                  <textarea
                    autoFocus
                    rows={5}
                    value={form.descripcion}
                    onChange={(e) => set("descripcion", e.target.value)}
                    placeholder="Ej: El asegurado circulaba por Av. San Martín cuando impactó contra un vehículo que no respetó el semáforo en rojo..."
                    className="w-full px-5 py-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[15px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark resize-none outline-none focus:border-duo-azul transition-colors"
                  />
                  <p className={`text-xs text-right font-bold ${form.descripcion.length < 10 ? "text-suave dark:text-suave-dark" : "text-duo-verde"}`}>
                    {form.descripcion.length} caracteres {form.descripcion.length < 10 ? "(mínimo 10)" : "✓"}
                  </p>
                </>
              )}

              {/* ══ PASO 5: Fotos ══ */}
              {step === 5 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center mx-auto mb-3">
                      <HiPhotograph className="w-7 h-7 text-duo-violeta" />
                    </div>
                    <h2 className="text-xl font-black text-titulo dark:text-titulo-dark">Agregá fotos (opcional)</h2>
                    <p className="text-sm text-suave dark:text-suave-dark mt-1 font-bold">Sacá una foto del daño o elegí de la galería</p>
                  </div>

                  {/* Panel en modo BORRADOR: las fotos quedan en memoria hasta guardar */}
                  <SiniestroFotosPanel
                    compact
                    draftFotos={draftFotos}
                    onDraftChange={setDraftFotos}
                  />
                </>
              )}

              {/* ══ PASO 6: Tercero ══ */}
              {step === 6 && (
                <>
                  <div className="text-center mb-2">
                    <div className="h-14 w-14 rounded-2xl bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] flex items-center justify-center mx-auto mb-3">
                      <HiUser className="w-7 h-7 text-duo-violeta" />
                    </div>
                    <h2 className="text-xl font-black text-titulo dark:text-titulo-dark">¿Hay un tercero involucrado?</h2>
                    <p className="text-sm text-suave dark:text-suave-dark mt-1 font-bold">Esta sección es opcional — podés saltearla</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSkipTercero(false)}
                      className={`flex-1 h-11 rounded-xl border-2 text-sm font-black transition-colors ${
                        !skipTercero
                          ? "bg-duo-violeta-soft dark:bg-[var(--color-duo-violeta-soft-dark)] border-duo-violeta text-duo-violeta"
                          : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-violeta"
                      }`}
                    >
                      Sí, cargar datos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkipTercero(true)}
                      className={`flex-1 h-11 rounded-xl border-2 text-sm font-black transition-colors ${
                        skipTercero
                          ? "bg-duo-verde-soft dark:bg-[var(--color-duo-verde-soft-dark)] border-duo-verde text-duo-verde-sombra dark:text-duo-verde"
                          : "bg-surface dark:bg-surface-dark border-linea dark:border-linea-dark text-suave dark:text-suave-dark hover:border-duo-verde"
                      }`}
                    >
                      No hay tercero
                    </button>
                  </div>

                  {!skipTercero && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      {[
                        { k: "tercero_nombre",   label: "Nombre del tercero",   ph: "Ej: Juan Pérez",     upper: false },
                        { k: "tercero_telefono", label: "Teléfono",             ph: "Ej: 11 1234-5678",   upper: false },
                        { k: "tercero_patente",  label: "Patente del vehículo", ph: "Ej: ABC123",         upper: true  },
                        { k: "tercero_compania", label: "Compañía de seguro",   ph: "Ej: Sancor Seguros", upper: false },
                      ].map(({ k, label, ph, upper }) => (
                        <div key={k}>
                          <MiniLabel>{label}</MiniLabel>
                          <input
                            type="text"
                            value={form[k]}
                            placeholder={ph}
                            onChange={(e) => set(k, upper ? e.target.value.toUpperCase() : e.target.value)}
                            className="w-full h-12 px-4 rounded-2xl border-[3px] border-linea dark:border-linea-dark bg-surface dark:bg-surface-dark text-[15px] font-bold text-titulo dark:text-titulo-dark placeholder:text-suave dark:placeholder:text-suave-dark outline-none focus:border-duo-violeta transition-colors"
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

        {/* ── Footer: botones (fijo) ── */}
        <div className="shrink-0 px-5 sm:px-6 pb-6 pt-4 flex gap-3 border-t-2 border-linea dark:border-linea-dark">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="h-12 px-4 sm:px-5 rounded-2xl bg-surface dark:bg-surface-dark hover:brightness-95 text-titulo dark:text-titulo-dark font-black flex items-center justify-center gap-2 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {!esUltimo ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext()}
              className={`flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                canNext()
                  ? "bg-duo-azul text-white shadow-[0_5px_0_var(--color-duo-azul-sombra)] active:shadow-[0_0_0_var(--color-duo-azul-sombra)]"
                  : "bg-surface dark:bg-surface-dark text-suave dark:text-suave-dark cursor-not-allowed"
              }`}
            >
              Siguiente <HiArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                submitting
                  ? "bg-duo-verde/70 text-white cursor-wait"
                  : "bg-duo-verde text-white shadow-[0_5px_0_var(--color-duo-verde-sombra)] active:shadow-[0_0_0_var(--color-duo-verde-sombra)]"
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
