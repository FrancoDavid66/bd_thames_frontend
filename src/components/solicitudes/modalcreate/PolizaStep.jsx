// src/components/solicitudes/modalcreate/PolizaStep.jsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { HiPlus, HiCheck, HiX, HiShieldCheck, HiCheckCircle } from "react-icons/hi";

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

// 🚀 Opciones para los datos técnicos del vehículo
const COMBUSTIBLES = ["Nafta", "Diésel", "GNC", "Nafta/GNC", "Eléctrico", "Híbrido"].map(
  (x) => ({ id: x, nombre: x })
);
const CARROCERIAS = [
  "Sedán", "Hatchback", "SUV", "Pick-up", "Familiar / Rural",
  "Coupé", "Furgón", "Utilitario", "Moto", "Otro",
].map((x) => ({ id: x, nombre: x }));

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

// ymd (YYYY-MM-DD) -> DD/MM/YYYY para mostrar lindo el preview de cuotas
function fmtFechaCorta(ymd) {
  if (!ymd) return "\u2014";
  const p = String(ymd).split("-");
  if (p.length !== 3) return String(ymd);
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export default function PolizaStep({
  poliza = {},
  setPoliza = () => {},
  companias = [],
  coberturas = [],
  oficinas = [],
  setTocoCantidadCuotas,
  cuotasPreview = [],
  variants,
  section = "all", // "all" | "compania" | "auto" | "fechas"
}) {
  const { user } = useAuth();
  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';
  const showCompania = section === "all" || section === "compania";
  const showAuto = section === "all" || section === "auto";
  const showFechas = section === "all" || section === "fechas";

  // 🆕 NRE opera SOLO cobertura "A": lo usamos para autocompletarla.
  const esNRE = String(poliza?.compania || "").trim().toUpperCase().includes("NRE");

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

  // 🚀 FILTRO APLICADO AQUÍ
  const coberturasFiltradas = useMemo(() => {
    if (!poliza?.compania) return [];
    const ciaSelected = String(poliza.compania).trim().toLowerCase();
    
    return coberturas.filter(c => 
      String(c.compania).trim().toLowerCase() === ciaSelected || 
      String(c.compania_nombre).trim().toLowerCase() === ciaSelected
    );
  }, [poliza?.compania, coberturas]);

  // 🆕 NRE: cobertura SIEMPRE "A". La auto-seleccionamos de la lista ya filtrada
  //    por compañía (aunque en el catálogo se llame "A - Resp. Civil"). Así el
  //    operador no la elige a mano. La carrocería se deriva del tipo. Editables.
  useEffect(() => {
    if (!esNRE) return;
    const norm = (s) => String(s || "").trim().toLowerCase();

    // Cobertura: de la lista de NRE (ya filtrada). Preferimos la "A".
    if (coberturasFiltradas.length) {
      const nombres = coberturasFiltradas.map((c) => c.nombre);
      const yaValida = poliza?.cobertura && nombres.includes(poliza.cobertura);
      if (!yaValida) {
        const esA = (n) => {
          n = norm(n);
          return n === "a" || n.startsWith("a ") || n.startsWith("a-") || n.startsWith("a (");
        };
        const aCat = coberturasFiltradas.find((c) => esA(c.nombre)) || coberturasFiltradas[0];
        if (aCat && poliza?.cobertura !== aCat.nombre) {
          setPoliza((prev = {}) => ({ ...prev, cobertura: aCat.nombre }));
        }
      }
    }

    // Carrocería (opcional): la derivamos del tipo si está vacía.
    if (!poliza?.carroceria) {
      const mapa = { camioneta: "Pick-up", moto: "Moto" };
      const car = mapa[norm(poliza?.tipo)];
      if (car) setPoliza((prev = {}) => ({ ...prev, carroceria: car }));
    }
  }, [esNRE, coberturasFiltradas, poliza?.tipo]); // eslint-disable-line

  const coberturaObj = useMemo(() => {
    if (!poliza?.cobertura) return null;
    const selectedKey = String(poliza.cobertura).trim().toLowerCase();
    
    const found = coberturasFiltradas.find(c => 
      String(c.id).trim().toLowerCase() === selectedKey || 
      String(c.nombre).trim().toLowerCase() === selectedKey
    );

    if (found) {
       let fotos = found.fotos_requeridas;
       if (typeof fotos === 'string') { try { fotos = JSON.parse(fotos); } catch(e) { fotos = fotos.split(',').map(s=>s.trim()).filter(Boolean); } }
       if (!Array.isArray(fotos)) fotos = [];

       let docs = found.documentos_requeridos || found.documentos_requeridas;
       if (typeof docs === 'string') { try { docs = JSON.parse(docs); } catch(e) { docs = docs.split(',').map(s=>s.trim()).filter(Boolean); } }
       if (!Array.isArray(docs)) docs = [];

       return { ...found, fotos_requeridas: fotos, documentos_requeridos: docs };
    }
    return null;
  }, [poliza?.cobertura, coberturasFiltradas]);

  const requisitos = useMemo(() => {
    if (!coberturaObj) {
      return {
        title: "Seleccione una cobertura",
        items: ["Elija la compañía y cobertura para ver los requisitos."],
        note: "",
        color: "from-slate-500/20 to-slate-400/20 text-slate-400",
      };
    }

    const fotos = coberturaObj.fotos_requeridas || [];
    const docs = coberturaObj.documentos_requeridos || [];
    const hasRequisitos = fotos.length > 0 || docs.length > 0;

    const items = [];
    if (docs.length > 0) items.push(`Papeles: ${docs.join(', ')}`);
    else items.push("Papeles: Sin requerimientos legales");

    if (fotos.length > 0) items.push(`Inspección: ${fotos.length} fotos (${fotos.join(', ')})`);
    else items.push("Inspección: Sin requerimiento fotográfico");

    return {
      title: `Requisitos para: ${coberturaObj.nombre}`,
      items,
      note: hasRequisitos 
        ? "El sistema bloqueará la solicitud si no cargás esto en el próximo paso." 
        : "Podrás avanzar de forma rápida en el paso de imágenes.",
      color: hasRequisitos 
        ? "from-sky-500/20 to-cyan-500/20 text-sky-400" 
        : "from-emerald-500/20 to-teal-500/20 text-emerald-400",
    };
  }, [coberturaObj]);

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
        className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 sm:p-6 shadow-xl"
        variants={sectionVariants} initial="initial" animate="animate"
      >
        <legend className="px-2 text-white/50 text-[10px] uppercase font-bold tracking-widest">
          {showCompania ? "Compañía y cobertura" : showAuto ? "Datos del vehículo" : "Fechas y vencimientos"}
        </legend>

        {showCompania && (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          
          <SelectCreatable
            label="Compañía"
            value={poliza?.compania || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, compania: v, cobertura: "" }))} 
            options={companias} 
            isWebAdmin={isWebAdmin}
            endpoint="/cotizaciones/companias/" 
          />

          {esNRE ? (
            <>
              {/* 🆕 NRE: cobertura FIJA "A" (no se elige a mano). */}
              <div className="flex flex-col gap-1.5 text-xs sm:text-sm">
                <span className="text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">Cobertura</span>
                <div className="w-full rounded-xl border border-emerald-500/25 bg-black/40 px-4 py-2.5 text-white font-medium flex items-center gap-2">
                  <HiCheckCircle className="text-emerald-400 shrink-0" />
                  <span>{poliza?.cobertura || "A"} <span className="text-white/40">· NRE (fija)</span></span>
                </div>
              </div>
              {/* 🆕 En NRE, acá van tipo (define el precio) y carrocería. */}
              <Select
                label="Tipo de vehículo"
                value={poliza?.tipo || "Auto"}
                onChange={(v) => setPoliza((prev = {}) => ({ ...prev, tipo: v }))}
                options={TIPOS_VEHICULO}
              />
              <Select
                label="Carrocería"
                value={poliza?.carroceria || ""}
                onChange={(v) => setPoliza((prev = {}) => ({ ...prev, carroceria: v }))}
                options={CARROCERIAS}
              />
            </>
          ) : (
            <SelectCreatable
              label="Cobertura"
              value={poliza?.cobertura || ""}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, cobertura: v }))}
              options={coberturasFiltradas}
              isWebAdmin={isWebAdmin}
              endpoint="/cotizaciones/coberturas/"
            />
          )}

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
          <div className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-tighter bg-gradient-to-br ${requisitos.color} mb-2 shadow-sm`}>
            <HiShieldCheck className="text-sm" /> {requisitos.title}
          </div>
          <ul className="list-disc pl-5 text-white/80 text-xs sm:text-sm space-y-1">
            {requisitos.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
          {requisitos.note && <p className="mt-2 text-white/40 text-[11px] italic font-medium">{requisitos.note}</p>}
        </motion.div>
        </>
        )}

        {showAuto && (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <Input
            label="Patente"
            value={poliza?.patente || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, patente: v.toUpperCase() }))}
            autoCapitalize="characters"
            placeholder="ABC 123"
          />
          {!esNRE && (
            <Select
              label="Tipo de vehículo"
              value={poliza?.tipo || "Auto"}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, tipo: v }))}
              options={TIPOS_VEHICULO}
            />
          )}
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
        </div>

        {/* 🚀 Datos técnicos del vehículo */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="px-1 text-white/50 text-[10px] uppercase font-bold tracking-widest">
            Datos técnicos del vehículo
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <Input
              label="Número de motor"
              value={poliza?.numero_motor || ""}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, numero_motor: v.toUpperCase() }))}
              autoCapitalize="characters"
              placeholder="Ej: ABC123456"
            />
            <Input
              label="Número de chasis"
              value={poliza?.numero_chasis || ""}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, numero_chasis: v.toUpperCase() }))}
              autoCapitalize="characters"
              placeholder="Ej: 8AP12345..."
            />
            <Select
              label="Combustible"
              value={poliza?.combustible || ""}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, combustible: v }))}
              options={COMBUSTIBLES}
            />
            {!esNRE && (
              <Select
                label="Carrocería"
                value={poliza?.carroceria || ""}
                onChange={(v) => setPoliza((prev = {}) => ({ ...prev, carroceria: v }))}
                options={CARROCERIAS}
              />
            )}
            <Textarea
              className="sm:col-span-2"
              label="Observaciones (opcional)"
              value={poliza?.observaciones || ""}
              onChange={(v) => setPoliza((prev = {}) => ({ ...prev, observaciones: v }))}
              placeholder="Detalles adicionales del vehículo..."
            />
          </div>
        </div>
        </>
        )}

        {showFechas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <Input
            label="Fecha de emisión"
            type="date"
            value={poliza?.fecha_emision || ""}
            onChange={(v) => setPoliza((prev = {}) => ({ ...prev, fecha_emision: v }))}
            helper="Arranca en hoy. Cambiala solo si la póliza empieza otro día."
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

          {Array.isArray(cuotasPreview) && cuotasPreview.length > 0 && (
            <div className="sm:col-span-2 mt-1 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/55 font-bold uppercase text-[10px] tracking-[0.15em]">
                  Cuotas que se van a generar
                </span>
                <span className="text-[10px] text-white/40">{cuotasPreview.length} cuotas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cuotasPreview.map((c) => (
                  <div key={c.nro} className="flex items-center justify-between rounded-xl bg-black/30 border border-white/5 px-3 py-2">
                    <span className="text-xs text-white/70">Cuota {c.nro}</span>
                    <span className="text-xs font-semibold text-sky-300">{fmtFechaCorta(c.fecha)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] italic text-white/40">
                Vencimientos calculados desde el primer vencimiento. Si cambiás la fecha de emisión o la cantidad de cuotas, se recalculan solas.
              </p>
            </div>
          )}
        </div>
        )}
      </motion.fieldset>
    </motion.div>
  );
}

/* ===================== UI bits ===================== */
function Input({ label, value, onChange, type = "text", placeholder = "", helper = "", className = "", inputMode, autoComplete, autoCapitalize, pattern, disabled = false }) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants} initial="initial" animate="animate" whileHover={!disabled ? "hover" : ""} whileTap={!disabled ? "tap" : ""}
    >
      <span className="text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">{label}</span>
      <input
        type={type} value={value} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} autoCapitalize={autoCapitalize} pattern={pattern}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border px-4 py-3.5 text-base outline-none transition-all ${
          disabled
            ? "bg-black/40 border-white/10 text-white/40 cursor-not-allowed opacity-70"
            : "bg-black/30 border-white/10 text-white placeholder:text-white/20 focus:ring-2 ring-sky-500/40 focus:border-sky-500/30"
        }`}
      />
      {helper && <span className={`mt-1 block text-[10px] font-medium italic ${disabled ? "text-emerald-400/60" : "text-white/40"}`}>{helper}</span>}
    </motion.label>
  );
}

function Textarea({ label, value, onChange, placeholder = "", className = "" }) {
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants} initial="initial" animate="animate"
    >
      <span className="text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">{label}</span>
      <textarea
        rows={2}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3.5 text-base outline-none focus:ring-2 ring-sky-500/40 focus:border-sky-500/30 text-white placeholder:text-white/20 transition-all resize-none"
      />
    </motion.label>
  );
}

function Select({ label, value, onChange, options = [], className = "", disabled = false, helper = "" }) {
  const normalized = (Array.isArray(options) ? options : []).filter(Boolean).map((op) => typeof op === "string" ? { id: op, nombre: op } : op);
  return (
    <motion.label
      className={`text-xs sm:text-sm ${className} flex flex-col gap-1.5`}
      variants={inputVariants} initial="initial" animate="animate" whileHover={!disabled ? "hover" : ""} whileTap={!disabled ? "tap" : ""}
    >
      <span className="text-white/55 font-bold uppercase text-[10px] tracking-[0.15em] ml-1">{label}</span>
      <div className="relative group">
        <select
          value={value || ""} disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`cursor-pointer w-full rounded-2xl border border-white/10 px-4 py-3.5 pr-10 text-base outline-none transition-all appearance-none ${
            disabled ? 'bg-black/40 text-white/30 cursor-not-allowed opacity-70' : 'bg-black/30 text-white focus:ring-2 ring-violet-500/40 focus:border-violet-500/30'
          }`}
        >
          <option value="">— Seleccionar —</option>
          {normalized.map((op) => (
            <option key={op?.id} value={op?.id} className="bg-[#0f1324] text-white">
              {op?.nombre || op?.id}
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
    const normalized = (Array.isArray(combined) ? combined : []).filter(Boolean).map((op) => typeof op === "string" ? { id: op, nombre: op } : op);
    const seen = new Set();
    return normalized.filter(op => {
      const key = String(op?.nombre || "").trim().toUpperCase();
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
              <option key={op?.id} value={op?.nombre || op?.id} className="bg-[#0f1324] text-white">
                {op?.nombre || op?.id}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">▾</span>
        </div>
      )}
    </motion.div>
  );
}