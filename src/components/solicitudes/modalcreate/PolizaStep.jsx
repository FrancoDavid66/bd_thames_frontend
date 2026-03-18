// src/components/solicitudes/modalcreate/PolizaStep.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { HiPlus, HiCheck, HiX } from "react-icons/hi";

// 🚀 IMPORTAMOS AUTH PARA EL BLINDAJE DE SUCURSALES
import { useAuth } from "../../../context/AuthContext";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const sectionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } },
};

const inputVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"].map(
  (x) => ({ id: x, nombre: x })
);

function toRuleKey(human) {
  const k = String(human || "").trim().toUpperCase();
  if (k === "A") return "A";
  if (k.includes("A") && k.includes("GRUA")) return "A_GRUA";
  return "OTRAS";
}

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

export default function PolizaStep({
  poliza = {},
  setPoliza = () => {},
  companias = [],
  coberturas = [],
  oficinas = [],
  variants,
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  const opcionesOficina = useMemo(() => {
    if (isWebAdmin && oficinas.length > 0) return oficinas;

    const userOficinaId = user?.perfil?.oficina?.id || user?.perfil?.oficina;
    if (userOficinaId) {
      return [{
        id: String(userOficinaId),
        nombre: user?.perfil?.oficina_nombre || "Mi Sucursal"
      }];
    }
    return oficinas;
  }, [isWebAdmin, oficinas, user]);

  useEffect(() => {
    if (!isWebAdmin && user?.perfil?.oficina) {
      const userOficinaId = String(user.perfil.oficina.id || user.perfil.oficina);
      if (poliza?.oficina !== userOficinaId) {
        setPoliza((prev = {}) => ({
          ...prev,
          oficina: userOficinaId,
        }));
      }
    }
  }, [isWebAdmin, user, poliza?.oficina, setPoliza]);

  useEffect(() => {
    if (!poliza?.fecha_emision) {
      setPoliza((prev = {}) => ({
        ...prev,
        fecha_emision: ymdLocal(new Date()),
      }));
    }
  }, []);

  useEffect(() => {
    if (!poliza?.fecha_emision) return;
    const next = addMonthsLocal(poliza.fecha_emision, 1);
    setPoliza((prev = {}) => ({ ...prev, primer_vencimiento: next }));
  }, [poliza?.fecha_emision, setPoliza]);

  const coverageRuleKey = toRuleKey(poliza?.cobertura);
  const requisitos = useMemo(() => {
    if (coverageRuleKey === "A") {
      return {
        title: "Requisitos para cobertura A",
        items: ["Cédula verde (frente)"],
        note: "No se solicitan fotos del vehículo en esta cobertura.",
        color: "from-emerald-200/80 to-teal-200/80",
      };
    }
    if (coverageRuleKey === "A_GRUA") {
      return {
        title: "Requisitos para A + GRÚA",
        items: [
          "Cédula verde (frente)",
          "VTV",
          "Fotos del vehículo: Frente, Lateral Izq., Lateral Der., Trasera",
        ],
        note: "Estas imágenes se cargarán en el paso siguiente.",
        color: "from-sky-200/80 to-cyan-200/80",
      };
    }
    return {
      title: "Requisitos para otras coberturas",
      items: [
        "Cédula verde (frente)",
        "VTV (si aplica)",
        "Oblea GNC / Título (si aplica)",
        "Fotos completas del vehículo (incluye interiores/auxilio si corresponde)",
      ],
      note: "En el próximo paso podrás adjuntar documentos y galería de fotos.",
      color: "from-amber-200/80 to-yellow-200/80",
    };
  }, [coverageRuleKey]);

  return (
    <motion.div
      key="poliza-step"
      variants={
        variants || {
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
          exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
        }
      }
      initial="hidden" animate="show" exit="exit"
      className="space-y-3"
    >
      <motion.fieldset
        className="rounded-2xl border border-white/10 bg-white/[.06] p-3 sm:p-4 shadow-inner"
        variants={sectionVariants} initial="initial" animate="animate"
      >
        <legend className="px-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">Información de Póliza</legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          
          <SelectCreatable
            label="Compañía"
            value={poliza?.compania || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, compania: v }))}
            options={companias} 
            isWebAdmin={isWebAdmin}
            endpoint="/companias/"  // 🚀 CAMBIADO: Ruta global sincronizada
          />

          <SelectCreatable
            label="Cobertura"
            value={poliza?.cobertura || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, cobertura: v }))}
            options={coberturas} 
            isWebAdmin={isWebAdmin}
            endpoint="/coberturas/" // 🚀 CAMBIADO: Ruta global sincronizada
          />

          <Select
            label="Oficina"
            value={poliza?.oficina || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, oficina: v }))}
            options={opcionesOficina}
            disabled={true} 
            helper="Sucursal fijada al inicio"
          />
        </div>

        <motion.div
          className="mt-4 rounded-xl border border-white/5 p-3 sm:p-4 bg-black/20"
          variants={inputVariants}
        >
          <div className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-[#0b0f1e] bg-gradient-to-br ${requisitos.color} mb-2 shadow-sm`}>
            {requisitos.title}
          </div>
          <ul className="list-disc pl-5 text-white/80 text-xs sm:text-sm space-y-1">
            {requisitos.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
          {requisitos.note && <p className="mt-2 text-white/40 text-[11px] italic font-medium">{requisitos.note}</p>}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Input
            label="Patente"
            value={poliza?.patente || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, patente: v.toUpperCase() }))}
            autoCapitalize="characters"
            placeholder="ABC 123"
          />
          <Select
            label="Tipo de vehículo"
            value={poliza?.tipo || "Auto"}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, tipo: v }))}
            options={TIPOS_VEHICULO}
          />
          <Input
            label="Marca"
            value={poliza?.marca || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, marca: v }))}
            placeholder="Ej: Ford"
          />
          <Input
            label="Modelo"
            value={poliza?.modelo || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, modelo: v }))}
            placeholder="Ej: Fiesta"
          />
          <Input
            label="Año"
            value={poliza?.anio || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, anio: v.replace(/\D/g, "") }))}
            inputMode="numeric"
            placeholder="2024"
          />
          <Input
            label="Fecha de emisión"
            type="date"
            value={poliza?.fecha_emision || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, fecha_emision: v }))}
          />
          <Input
            label="Primer vencimiento"
            type="date"
            value={poliza?.primer_vencimiento || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, primer_vencimiento: v }))}
          />
          <Input
            label="Días a vencer"
            value={poliza?.dias_a_vencer ?? 30}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, dias_a_vencer: v.replace(/\D/g, "") }))}
            inputMode="numeric"
          />
        </div>
      </motion.fieldset>
    </motion.div>
  );
}

/* ===================== UI bits ===================== */
function Input({ label, value, onChange, type = "text", placeholder = "", helper = "", className = "", inputMode, autoComplete, autoCapitalize, pattern }) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants} initial="initial" animate="animate" whileHover="hover" whileTap="tap"
    >
      <span className="text-white/60 font-bold uppercase text-[10px] tracking-widest ml-1">{label}</span>
      <input
        type={type} value={value} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} autoCapitalize={autoCapitalize} pattern={pattern}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 ring-sky-500/40 text-white placeholder:text-white/20 transition-all font-medium"
      />
      {helper && <span className="mt-1 block text-[10px] text-white/40 font-medium italic">{helper}</span>}
    </motion.label>
  );
}

function Select({ label, value, onChange, options = [], className = "", disabled = false, helper = "" }) {
  const normalized = Array.isArray(options) ? options.map((op) => typeof op === "string" ? { id: op, nombre: op } : op) : [];
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants} initial="initial" animate="animate" whileHover={!disabled ? "hover" : ""} whileTap={!disabled ? "tap" : ""}
    >
      <span className="text-white/60 font-bold uppercase text-[10px] tracking-widest ml-1">{label}</span>
      <div className="relative group">
        <select
          value={value || ""} disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`cursor-pointer w-full rounded-xl border border-white/10 px-4 py-2.5 pr-9 outline-none transition-all font-medium appearance-none ${
            disabled ? 'bg-black/40 text-white/30 cursor-not-allowed opacity-70' : 'bg-white/5 text-white focus:ring-2 ring-violet-500/40'
          }`}
        >
          <option value="">— Seleccionar —</option>
          {normalized.map((op) => (
            <option key={op.id} value={op.id} className="bg-[#0f1324] text-white">
              {op.nombre || op.id}
            </option>
          ))}
        </select>
        {!disabled && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">▾</span>}
      </div>
      {helper && <span className={`mt-1 block text-[10px] font-medium italic ${disabled ? 'text-emerald-400/60' : 'text-white/40'}`}>{helper}</span>}
    </motion.label>
  );
}

function SelectCreatable({ label, value, onChange, options = [], isWebAdmin, endpoint }) {
  const [localOptions, setLocalOptions] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);

  const mergedOptions = useMemo(() => {
    const combined = [...options, ...localOptions];
    const normalized = combined.map((op) => typeof op === "string" ? { id: op, nombre: op } : op);
    const seen = new Set();
    return normalized.filter(op => {
      const key = String(op.nombre).trim().toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [options, localOptions]);

  const handleSaveNew = async () => {
    const trimmed = newVal.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt");
      const res = await axios.post(
        `${API_BASE}${endpoint}`,
        { nombre: trimmed, activa: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const createdName = res.data.nombre || trimmed;
      toast.success(`${createdName} agregada correctamente`);
      
      setLocalOptions((prev) => [...prev, { id: createdName, nombre: createdName }]);
      onChange(createdName);
      
      setNewVal("");
      setIsCreating(false);
    } catch (e) {
      toast.error(e?.response?.data?.nombre?.[0] || "Error al guardar. Puede que ya exista.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="flex flex-col gap-1.5 text-xs sm:text-sm" variants={inputVariants} initial="initial" animate="animate">
      <div className="flex items-center justify-between ml-1">
        <span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">{label}</span>
        {isWebAdmin && !isCreating && (
          <button 
            type="button" 
            onClick={() => setIsCreating(true)}
            className="cursor-pointer text-[9px] font-black uppercase text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
          >
            <HiPlus /> Nuevo
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            placeholder={`Ej: Nuevo ${label.toLowerCase()}`}
            autoFocus
            className="flex-1 rounded-xl bg-white/5 border border-sky-500/50 px-3 py-2.5 outline-none focus:ring-2 ring-sky-500/40 text-white placeholder:text-white/20 transition-all font-medium"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveNew();
              }
              if (e.key === "Escape") setIsCreating(false);
            }}
          />
          <button 
            type="button" 
            onClick={handleSaveNew} 
            disabled={saving}
            className="cursor-pointer h-10 w-10 shrink-0 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors shadow-lg disabled:opacity-50"
          >
            {saving ? <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" /> : <HiCheck className="text-lg" />}
          </button>
          <button 
            type="button" 
            onClick={() => setIsCreating(false)} 
            disabled={saving}
            className="cursor-pointer h-10 w-10 shrink-0 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-xl transition-colors"
          >
            <HiX className="text-lg" />
          </button>
        </div>
      ) : (
        <div className="relative group">
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="cursor-pointer w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pr-9 outline-none focus:ring-2 ring-violet-500/40 text-white font-medium appearance-none transition-all"
          >
            <option value="">— Seleccionar —</option>
            {mergedOptions.map((op) => (
              <option key={op.id} value={op.id} className="bg-[#0f1324] text-white">
                {op.nombre || op.id}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">▾</span>
        </div>
      )}
    </motion.div>
  );
}