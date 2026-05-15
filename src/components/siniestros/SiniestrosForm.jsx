// src/components/siniestros/SiniestrosForm.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiSearch, HiCheck } from "react-icons/hi";
import {
  HiTruck, HiShieldExclamation, HiLockClosed,
  HiFire, HiDotsHorizontal,
} from "react-icons/hi";
import api from "../../services/api";
import dayjs from "dayjs";

const INPUT  = "w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors";
const LABEL  = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider";
const SECTION= "bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5";

/* ── Tipos de siniestro con icono, color y descripción corta ── */
const TIPOS = [
  {
    key: "CHOCO",
    icon: HiTruck,
    label: "Chocó",
    desc: "Nuestro asegurado causó el choque",
    bg:     "bg-orange-900/40 hover:bg-orange-800/50",
    border: "border-orange-700/50",
    activeBg:     "bg-orange-700/60",
    activeBorder: "border-orange-500",
    iconColor: "text-orange-300",
    textColor: "text-orange-200",
  },
  {
    key: "CHOCARON",
    icon: HiShieldExclamation,
    label: "Fue chocado",
    desc: "Un tercero impactó al asegurado",
    bg:     "bg-blue-900/40 hover:bg-blue-800/50",
    border: "border-blue-700/50",
    activeBg:     "bg-blue-700/60",
    activeBorder: "border-blue-500",
    iconColor: "text-blue-300",
    textColor: "text-blue-200",
  },
  {
    key: "ROBO",
    icon: HiLockClosed,
    label: "Robo / Hurto",
    desc: "Sustracción total o parcial",
    bg:     "bg-rose-900/40 hover:bg-rose-800/50",
    border: "border-rose-700/50",
    activeBg:     "bg-rose-700/60",
    activeBorder: "border-rose-500",
    iconColor: "text-rose-300",
    textColor: "text-rose-200",
  },
  {
    key: "INCENDIO",
    icon: HiFire,
    label: "Incendio",
    desc: "Daños por fuego o explosión",
    bg:     "bg-red-900/40 hover:bg-red-800/50",
    border: "border-red-700/50",
    activeBg:     "bg-red-700/60",
    activeBorder: "border-red-500",
    iconColor: "text-red-300",
    textColor: "text-red-200",
  },
  {
    key: "OTRO",
    icon: HiDotsHorizontal,
    label: "Otro",
    desc: "Granizo, vandalismo, etc.",
    bg:     "bg-slate-800/60 hover:bg-slate-700/60",
    border: "border-slate-600/50",
    activeBg:     "bg-slate-600/60",
    activeBorder: "border-slate-400",
    iconColor: "text-slate-300",
    textColor: "text-slate-200",
  },
];

/* ── Estados con pills ── */
const ESTADOS = [
  { key: "PENDIENTE",   label: "Falta doc.",  color: "amber" },
  { key: "DENUNCIADO",  label: "Denunciado",  color: "blue" },
  { key: "INSPECCION",  label: "Inspección",  color: "purple" },
  { key: "LIQUIDACION", label: "Liquidación", color: "indigo" },
  { key: "CERRADO",     label: "Cerrado",     color: "emerald" },
];

const ESTADO_ACTIVE = {
  amber:   "bg-amber-700/60 border-amber-500 text-amber-200",
  blue:    "bg-blue-700/60 border-blue-500 text-blue-200",
  purple:  "bg-purple-700/60 border-purple-500 text-purple-200",
  indigo:  "bg-indigo-700/60 border-indigo-500 text-indigo-200",
  emerald: "bg-emerald-700/60 border-emerald-500 text-emerald-200",
};

const ESTADO_IDLE = "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300";

const EMPTY = {
  cliente: "", poliza: "", estado: "PENDIENTE", fecha_siniestro: "",
  nro_reclamo_cia: "", responsabilidad: "CHOCO",
  marca_auto: "", modelo_auto: "", ano_auto: "", patente: "",
  descripcion: "", tercero_nombre: "", tercero_telefono: "",
  tercero_patente: "", tercero_compania: "", tercero_poliza: "",
};

/* ── Buscador genérico con debounce ── */
function SearchInput({ label, placeholder, value, displayValue, onSelect, fetchFn, renderOption, required }) {
  const [q, setQ]           = useState(displayValue || "");
  const [results, setResults]= useState([]);
  const [loading, setLoading]= useState(false);
  const [open, setOpen]      = useState(false);
  const timer = useRef(null);
  const ref   = useRef(null);

  useEffect(() => { setQ(displayValue || ""); }, [displayValue]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (text) => {
    if (!text.trim() || text.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await fetchFn(text);
      setResults(data || []);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [fetchFn]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQ(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (item) => {
    onSelect(item);
    setQ(renderOption(item, "label"));
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} className="relative">
      <label className={LABEL}>{label}{required && " *"}</label>
      <div className="relative">
        <input
          value={q} onChange={handleChange} placeholder={placeholder}
          className={`${INPUT} pr-10`}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {loading ? (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : value ? (
            <HiCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <HiSearch className="w-4 h-4" />
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto"
          >
            {results.map((item) => (
              <button key={item.id} type="button" onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-slate-700 text-sm transition-colors border-b border-slate-700/50 last:border-0">
                {renderOption(item, "full")}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Fetch helpers ── */
const fetchClientes = async (q) => {
  const { data } = await api.get(`clientes/?search=${encodeURIComponent(q)}&page_size=8`);
  return data.results || data;
};

const fetchPolizas = async (q) => {
  const { data } = await api.get(`polizas/?search=${encodeURIComponent(q)}&page_size=8&estado=activa`);
  return data.results || data;
};

const clienteLabel = (c, mode) => {
  const nombre = [c.apellido, c.nombre].filter(Boolean).join(", ") || c.nombre || "Sin nombre";
  if (mode === "label") return nombre;
  return (
    <div>
      <p className="font-semibold text-slate-200">{nombre}</p>
      <p className="text-xs text-slate-500">{c.dni_cuit_cuil || ""}</p>
    </div>
  );
};

const polizaLabel = (p, mode) => {
  const titulo = [p.patente, p.numero_poliza ? `N°${p.numero_poliza}` : null, p.compania_nombre || p.compania].filter(Boolean).join(" · ");
  if (mode === "label") return titulo;
  return (
    <div>
      <p className="font-semibold text-slate-200">{titulo}</p>
      <p className="text-xs text-slate-500">{[p.marca, p.modelo, p.ano].filter(Boolean).join(" ")} · {(p.cliente_nombre || "")}</p>
    </div>
  );
};

/* ── Form principal ── */
export default function SiniestrosForm({ isOpen, onClose, onSubmit, initialData }) {
  const [form, setForm]   = useState(EMPTY);
  const [clienteDisplay, setClienteDisplay] = useState("");
  const [polizaDisplay,  setPolizaDisplay]  = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          ...EMPTY, ...initialData,
          fecha_siniestro: initialData.fecha_siniestro
            ? initialData.fecha_siniestro.substring(0, 10) : "",
        });
        setClienteDisplay(initialData.cliente_label || String(initialData.cliente || ""));
        setPolizaDisplay(initialData.poliza_label || String(initialData.poliza || ""));
      } else {
        setForm(EMPTY);
        setClienteDisplay("");
        setPolizaDisplay("");
      }
    }
  }, [initialData, isOpen]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const onClienteSelect = (c) => {
    set("cliente", c.id);
    setClienteDisplay(clienteLabel(c, "label"));
  };

  const onPolizaSelect = (p) => {
    set("poliza", p.id);
    setPolizaDisplay(polizaLabel(p, "label"));
    // Auto-rellenar datos del vehículo
    if (p.marca)    set("marca_auto",  p.marca);
    if (p.modelo)   set("modelo_auto", p.modelo);
    if (p.ano)      set("ano_auto",    p.ano);
    if (p.patente)  set("patente",     p.patente);
    // Auto-rellenar cliente si no está
    if (!form.cliente && p.cliente) set("cliente", p.cliente);
    if (!form.cliente && p.cliente_nombre) setClienteDisplay(p.cliente_nombre);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar"
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}>

          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-slate-900 border-b border-slate-800 rounded-t-3xl">
            <div>
              <h2 className="text-xl font-black text-slate-100">
                {initialData ? "Editar Siniestro" : "Nuevo Siniestro"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {initialData ? `Siniestro #${initialData.id}` : "Completá los datos del reclamo"}
              </p>
            </div>
            <button onClick={onClose}
              className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors">
              <HiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* 1. Datos del trámite */}
            <div className={SECTION}>
              <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-5">1. Datos del trámite</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchInput
                  label="Cliente" required placeholder="Buscar por nombre o DNI..."
                  value={form.cliente} displayValue={clienteDisplay}
                  fetchFn={fetchClientes}
                  renderOption={clienteLabel}
                  onSelect={onClienteSelect}
                />
                <SearchInput
                  label="Póliza" required placeholder="Buscar por patente o N° de póliza..."
                  value={form.poliza} displayValue={polizaDisplay}
                  fetchFn={fetchPolizas}
                  renderOption={polizaLabel}
                  onSelect={onPolizaSelect}
                />
                <div>
                  <label className={LABEL}>Fecha del accidente *</label>
                  <input type="date" value={form.fecha_siniestro} required
                    max={dayjs().format("YYYY-MM-DD")}
                    onChange={e => set("fecha_siniestro", e.target.value)}
                    className={`${INPUT} [color-scheme:dark]`} />
                </div>
                <div>
                  <label className={LABEL}>N° Reclamo (Cía)</label>
                  <input type="text" value={form.nro_reclamo_cia} placeholder="Ej: 456789"
                    onChange={e => set("nro_reclamo_cia", e.target.value)} className={INPUT} />
                </div>
              </div>

              {/* Estado — pills */}
              <div className="mt-4">
                <label className={LABEL}>Estado del trámite</label>
                <div className="flex gap-2 flex-wrap">
                  {ESTADOS.map(({ key, label, color }) => (
                    <button key={key} type="button"
                      onClick={() => set("estado", key)}
                      className={`h-9 px-4 rounded-xl border text-sm font-bold transition-all ${
                        form.estado === key
                          ? ESTADO_ACTIVE[color]
                          : ESTADO_IDLE
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tipo de siniestro — cards visuales */}
            <div className={SECTION}>
              <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest mb-5">
                2. Tipo de siniestro *
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {TIPOS.map(({ key, icon: Icon, label, desc, bg, border, activeBg, activeBorder, iconColor, textColor }) => {
                  const isActive = form.responsabilidad === key;
                  return (
                    <motion.button
                      key={key} type="button"
                      onClick={() => set("responsabilidad", key)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`
                        relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2
                        transition-all text-center cursor-pointer
                        ${isActive ? `${activeBg} ${activeBorder}` : `${bg} ${border}`}
                      `}>
                      {/* Check cuando está seleccionado */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute top-2 right-2 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center">
                          <HiCheck className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                        isActive ? "bg-white/15" : "bg-slate-900/40"
                      }`}>
                        <Icon className={`w-6 h-6 ${isActive ? textColor : iconColor}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-black leading-tight ${isActive ? textColor : "text-slate-300"}`}>
                          {label}
                        </p>
                        <p className={`text-[11px] mt-1 leading-tight ${isActive ? "text-white/60" : "text-slate-500"}`}>
                          {desc}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* 3. Vehículo asegurado */}
            <div className={SECTION}>
              <h3 className="text-sm font-black text-sky-400 uppercase tracking-widest mb-5">3. Vehículo asegurado</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { k: "marca_auto",  label: "Marca *",   req: true },
                  { k: "modelo_auto", label: "Modelo *",  req: true },
                  { k: "ano_auto",    label: "Año *",     req: true, type: "number" },
                  { k: "patente",     label: "Patente",   upper: true },
                ].map(({ k, label, req, type, upper }) => (
                  <div key={k}>
                    <label className={LABEL}>{label}</label>
                    <input
                      type={type || "text"} value={form[k]} required={req}
                      onChange={e => set(k, upper ? e.target.value.toUpperCase() : e.target.value)}
                      className={INPUT}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Descripción */}
            <div>
              <label className={LABEL}>Relato de los hechos *</label>
              <textarea value={form.descripcion} required rows={4}
                placeholder="¿Cómo ocurrió el accidente? Describí con detalle..."
                onChange={e => set("descripcion", e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* 4. Descripción */}
            <div className="bg-rose-950/20 border border-rose-800/30 rounded-2xl p-5">
              <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest mb-5">5. Datos del tercero (opcional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { k: "tercero_nombre",    label: "Nombre completo" },
                  { k: "tercero_telefono",  label: "Teléfono" },
                  { k: "tercero_patente",   label: "Patente", upper: true },
                  { k: "tercero_compania",  label: "Compañía de seguro" },
                  { k: "tercero_poliza",    label: "N° Póliza del tercero" },
                ].map(({ k, label, upper }) => (
                  <div key={k}>
                    <label className={LABEL}>{label}</label>
                    <input type="text" value={form[k]}
                      onChange={e => set(k, upper ? e.target.value.toUpperCase() : e.target.value)}
                      className={INPUT} />
                  </div>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="h-11 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors">
                Cancelar
              </button>
              <button type="submit"
                className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/30 transition-colors">
                {initialData ? "Guardar cambios" : "Crear siniestro"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}