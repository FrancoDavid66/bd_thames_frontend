// src/components/polizas/PolizaEditModal.jsx
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiDocumentText } from "react-icons/hi";
import toast from "react-hot-toast";

import { useDispatch } from "react-redux";
import { updatePoliza } from "../../store/slices/polizasSlice";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";

const modalVariants = {
  initial: { opacity: 0, scale: 0.9, y: -20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: "easeInOut" } },
};

const TIPOS_VEHICULO = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];
const COMBUSTIBLES = ["Nafta", "Diésel", "GNC", "Nafta/GNC", "Eléctrico", "Híbrido"];
// 🚀 Mismas opciones que el modal de solicitud (PolizaStep)
const CARROCERIAS = [
  "Sedán", "Hatchback", "SUV", "Pick-up", "Familiar / Rural",
  "Coupé", "Furgón", "Utilitario", "Moto", "Otro",
];

// Datos generales de la póliza (en orden)
const CAMPOS = [
  "compania",
  "numero_poliza",
  "cobertura",
  "oficina",
  "patente",
  "marca",
  "modelo",
  "anio",
  "tipo",
];

const LABELS = {
  compania: "Compañía",
  numero_poliza: "Número de póliza",
  cobertura: "Cobertura",
  oficina: "Oficina",
  patente: "Patente",
  marca: "Marca",
  modelo: "Modelo",
  anio: "Año",
  tipo: "Tipo",
  combustible: "Combustible",
  numero_chasis: "N° de Chasis",
  numero_motor: "N° de Motor",
  carroceria: "Carrocería",
  observaciones: "Observaciones",
};

const capitalizar = (v) =>
  typeof v === "string" && v.length ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v;

const PolizaEditModal = ({ isOpen, onClose, onSuccess, poliza }) => {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const isWebAdmin = user?.perfil?.rol === "ADMIN" || user?.rol === "ADMIN";

  const [companias, setCompanias] = useState([]);
  const [coberturas, setCoberturas] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [saving, setSaving] = useState(false);

  // 🚀 Estado propio del formulario (sin hooks externos que se pisen)
  const [formData, setFormData] = useState({});

  // Cargar formulario cuando llega la póliza
  useEffect(() => {
    if (poliza) {
      setFormData({
        compania: poliza.compania || "",
        numero_poliza: poliza.numero_poliza || "",
        cobertura: poliza.cobertura || "",
        oficina: poliza.oficina ?? "",
        patente: poliza.patente || "",
        marca: poliza.marca || "",
        modelo: poliza.modelo || "",
        anio: poliza.anio ?? "",
        tipo: poliza.tipo || "Auto",
        // 🚀 Datos técnicos del vehículo
        combustible: poliza.combustible || "",
        numero_chasis: poliza.numero_chasis || "",
        numero_motor: poliza.numero_motor || "",
        carroceria: poliza.carroceria || "",
        observaciones: poliza.observaciones || "",
      });
    }
  }, [poliza]);

  // Cargar catálogos al abrir
  useEffect(() => {
    if (!isOpen) return;

    api
      .get("companias/")
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCompanias(arr.filter((c) => c.activa).map((c) => c.nombre));
      })
      .catch(console.warn);

    api
      .get("coberturas/")
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCoberturas(arr.filter((c) => c.activa).map((c) => c.nombre));
      })
      .catch(console.warn);

    if (isWebAdmin) {
      PolizasAPI.listOficinas()
        .then((res) => setOficinas(Array.isArray(res) ? res : res.results || []))
        .catch(console.warn);
    }
  }, [isOpen, isWebAdmin]);

  // 🛡️ Inyectamos SIEMPRE el valor actual como opción, aunque el catálogo venga vacío.
  const opcionesCompania = useMemo(() => {
    const set = new Set([poliza?.compania, ...companias].filter(Boolean));
    return Array.from(set);
  }, [companias, poliza?.compania]);

  const opcionesCobertura = useMemo(() => {
    const set = new Set([poliza?.cobertura, ...coberturas].filter(Boolean));
    return Array.from(set);
  }, [coberturas, poliza?.cobertura]);

  const opcionesCombustible = useMemo(() => {
    const set = new Set([poliza?.combustible, ...COMBUSTIBLES].filter(Boolean));
    return Array.from(set);
  }, [poliza?.combustible]);

  const opcionesCarroceria = useMemo(() => {
    const set = new Set([poliza?.carroceria, ...CARROCERIAS].filter(Boolean));
    return Array.from(set);
  }, [poliza?.carroceria]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!poliza?.id) return;

    // Validación mínima (los datos técnicos son opcionales)
    const requeridos = ["compania", "cobertura", "patente", "marca", "modelo", "anio"];
    const faltan = requeridos.filter((k) => !String(formData[k] ?? "").trim());
    if (faltan.length) {
      toast.error(`Faltan completar: ${faltan.map((k) => LABELS[k] || k).join(", ")}`);
      return;
    }

    const numero = String(formData.numero_poliza || "").trim();
    const payload = {
      id: poliza.id,
      compania: formData.compania,
      cobertura: formData.cobertura,
      patente: String(formData.patente || "").toUpperCase().trim(),
      marca: String(formData.marca || "").trim(),
      modelo: String(formData.modelo || "").trim(),
      anio: formData.anio ? Number(formData.anio) : null,
      tipo: capitalizar(formData.tipo) || "Auto",
      numero_poliza: numero || null,
      // 🚀 Datos técnicos del vehículo (opcionales)
      combustible: String(formData.combustible || "").trim(),
      numero_chasis: String(formData.numero_chasis || "").trim().toUpperCase(),
      numero_motor: String(formData.numero_motor || "").trim().toUpperCase(),
      carroceria: String(formData.carroceria || "").trim(),
      observaciones: String(formData.observaciones || "").trim(),
    };

    if (!numero) payload.sin_numero = true;

    if (isWebAdmin && formData.oficina && String(formData.oficina) !== String(poliza.oficina ?? "")) {
      payload.oficina = formData.oficina;
    }

    setSaving(true);
    try {
      await dispatch(updatePoliza(payload)).unwrap();
      toast.success("Póliza actualizada correctamente");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const apiErr = err?.response?.data || err;
      if (apiErr && typeof apiErr === "object" && !Array.isArray(apiErr)) {
        const firstKey = Object.keys(apiErr)[0];
        const firstVal = Array.isArray(apiErr[firstKey]) ? apiErr[firstKey][0] : apiErr[firstKey];
        toast.error(firstKey ? `${firstKey}: ${firstVal}` : "Error al editar la póliza");
      } else {
        toast.error(typeof apiErr === "string" ? apiErr : "Error al editar la póliza");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !poliza) return null;

  // Render de un campo de "Datos generales"
  const renderCampoGeneral = (key) => {
    const isOficinaField = key === "oficina";
    const isDisabled = isOficinaField && !isWebAdmin;
    const esSelect = ["compania", "oficina", "cobertura", "tipo"].includes(key);

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
          {LABELS[key] || key.replace("_", " ")}
          {isOficinaField && !isWebAdmin && <span className="ml-2 text-amber-500">(Solo Admin)</span>}
        </label>

        {esSelect ? (
          <div className="relative group">
            <select
              name={key}
              value={formData[key] ?? ""}
              onChange={handleChange}
              disabled={isDisabled}
              className={`cursor-pointer w-full rounded-xl border border-white/10 px-4 py-3 pr-9 outline-none transition-all font-medium appearance-none ${
                isDisabled
                  ? "bg-black/40 text-white/30 cursor-not-allowed opacity-70"
                  : "bg-black/40 text-white focus:ring-2 ring-emerald-500/40 hover:bg-white/5"
              }`}
            >
              <option value="" className="bg-[#0f1324]">
                — Seleccionar —
              </option>

              {key === "oficina" ? (
                oficinas.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-[#0f1324]">
                    {opt.nombre}
                  </option>
                ))
              ) : (
                (key === "compania"
                  ? opcionesCompania
                  : key === "cobertura"
                  ? opcionesCobertura
                  : TIPOS_VEHICULO
                ).map((opt) => (
                  <option key={opt} value={opt} className="bg-[#0f1324]">
                    {opt}
                  </option>
                ))
              )}
            </select>
            {!isDisabled && (
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">
                ▾
              </span>
            )}
          </div>
        ) : (
          <input
            type="text"
            inputMode={key === "anio" ? "numeric" : undefined}
            name={key}
            value={formData[key] ?? ""}
            onChange={handleChange}
            className="cursor-text w-full rounded-xl border border-white/10 px-4 py-3 outline-none transition-all font-medium bg-black/40 text-white placeholder:text-white/20 focus:ring-2 ring-emerald-500/40 hover:bg-white/5"
            placeholder={key === "patente" ? "ABC 123" : key === "anio" ? "2024" : ""}
          />
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/70 px-2 sm:px-0 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative bg-[#030712] rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.7)] w-full sm:w-[95%] sm:max-w-4xl max-h-[100vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-white/5"
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#010409]/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 shadow-inner">
                <HiDocumentText className="text-xl" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-widest leading-none mb-1.5">
                  Editar Póliza
                </h2>
                <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                  ID Sistema: {poliza.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer group h-10 w-10 flex items-center justify-center rounded-full bg-black/30 text-white/50 hover:bg-white/5 hover:text-amber-400 transition-all border border-white/5 hover:border-amber-400/20 shadow-inner"
            >
              <HiX className="text-xl group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 bg-black/10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ── Bloque 1: Datos de la póliza ── */}
              <div>
                <h3 className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-4 ml-1">
                  Datos de la Póliza
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  {CAMPOS.map((key) => renderCampoGeneral(key))}
                </div>
              </div>

              {/* ── Bloque 2: Datos técnicos del vehículo ── */}
              <div>
                <h3 className="text-[10px] font-black text-sky-400/80 uppercase tracking-widest mb-4 ml-1">
                  Datos Técnicos del Vehículo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  {/* Combustible (select con valor actual inyectado) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                      {LABELS.combustible}
                    </label>
                    <div className="relative group">
                      <select
                        name="combustible"
                        value={formData.combustible ?? ""}
                        onChange={handleChange}
                        className="cursor-pointer w-full rounded-xl border border-white/10 px-4 py-3 pr-9 outline-none transition-all font-medium appearance-none bg-black/40 text-white focus:ring-2 ring-sky-500/40 hover:bg-white/5"
                      >
                        <option value="" className="bg-[#0f1324]">
                          — Seleccionar —
                        </option>
                        {opcionesCombustible.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#0f1324]">
                            {opt}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">
                        ▾
                      </span>
                    </div>
                  </div>

                  {/* Carrocería */}
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                      {LABELS.carroceria}
                    </label>
                    <div className="relative group">
                      <select
                        name="carroceria"
                        value={formData.carroceria ?? ""}
                        onChange={handleChange}
                        className="cursor-pointer w-full rounded-xl border border-white/10 px-4 py-3 pr-9 outline-none transition-all font-medium appearance-none bg-black/40 text-white focus:ring-2 ring-sky-500/40 hover:bg-white/5"
                      >
                        <option value="" className="bg-[#0f1324]">
                          — Seleccionar —
                        </option>
                        {opcionesCarroceria.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#0f1324]">
                            {opt}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">
                        ▾
                      </span>
                    </div>
                  </div>

                  {/* N° de Chasis */}
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                      {LABELS.numero_chasis}
                    </label>
                    <input
                      type="text"
                      name="numero_chasis"
                      value={formData.numero_chasis ?? ""}
                      onChange={handleChange}
                      className="cursor-text w-full rounded-xl border border-white/10 px-4 py-3 outline-none transition-all font-mono uppercase bg-black/40 text-white placeholder:text-white/20 focus:ring-2 ring-sky-500/40 hover:bg-white/5"
                      placeholder="8AP…"
                    />
                  </div>

                  {/* N° de Motor */}
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                      {LABELS.numero_motor}
                    </label>
                    <input
                      type="text"
                      name="numero_motor"
                      value={formData.numero_motor ?? ""}
                      onChange={handleChange}
                      className="cursor-text w-full rounded-xl border border-white/10 px-4 py-3 outline-none transition-all font-mono uppercase bg-black/40 text-white placeholder:text-white/20 focus:ring-2 ring-sky-500/40 hover:bg-white/5"
                      placeholder="Ej: HFX…"
                    />
                  </div>

                  {/* Observaciones (ocupa las 2 columnas) */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                      {LABELS.observaciones}
                    </label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones ?? ""}
                      onChange={handleChange}
                      rows={3}
                      className="cursor-text w-full rounded-xl border border-white/10 px-4 py-3 outline-none transition-all font-medium resize-none bg-black/40 text-white placeholder:text-white/20 focus:ring-2 ring-sky-500/40 hover:bg-white/5"
                      placeholder="Notas adicionales del vehículo…"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="cursor-pointer h-11 px-6 text-xs uppercase font-black text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all tracking-widest disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer h-11 px-8 rounded-xl bg-emerald-600 text-white text-xs uppercase font-black hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Guardar Cambios"
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PolizaEditModal;