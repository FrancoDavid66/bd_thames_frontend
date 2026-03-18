// src/components/polizas/PolizaEditModal.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiDocumentText } from "react-icons/hi";
import toast from "react-hot-toast";

import { usePolizaForm } from "../../hooks/polizas/usePolizaForm";
import { formatearYEnviarPoliza } from "../../utils/polizas/formUtils";

// 🚀 IMPORTAMOS REDUX DIRECTAMENTE PARA HACER EL BYPASS
import { useDispatch } from "react-redux";
import { updatePoliza } from "../../store/slices/polizasSlice";

// 🚀 IMPORTACIONES DE SEGURIDAD Y API
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { PolizasAPI } from "../../api/polizas";

const modalVariants = {
  initial: { opacity: 0, scale: 0.9, y: -20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2, ease: "easeInOut" } }
};

const PolizaEditModal = ({ isOpen, onClose, onSuccess, poliza }) => {
  const { user } = useAuth();
  const dispatch = useDispatch(); // 🚀 Iniciamos el dispatch de Redux
  
  const {
    formData,
    handleChange,
    modo,
  } = usePolizaForm({
    poliza,
    onSuccess,
    onClose,
  });

  const [companias, setCompanias] = useState([]);
  const [coberturas, setCoberturas] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [saving, setSaving] = useState(false); // Estado de carga local

  const isWebAdmin = user?.perfil?.rol === 'ADMIN' || user?.rol === 'ADMIN';

  useEffect(() => {
    if (isOpen) {
      // 🚀 FIX: Peticiones a las rutas correctas del catálogo
      api.get("polizas/companias/").then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setCompanias(arr.filter(c => c.activa).map(c => c.nombre));
      }).catch(console.warn);
      
      api.get("polizas/coberturas/").then(res => {
        const arr = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setCoberturas(arr.filter(c => c.activa).map(c => c.nombre));
      }).catch(console.warn);

      if (isWebAdmin) {
        PolizasAPI.listOficinas().then(res => {
            setOficinas(Array.isArray(res) ? res : res.results || []);
        }).catch(console.warn);
      }
    }
  }, [isOpen, isWebAdmin]);

  const tiposVehiculo = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

  // 🚀 EL BYPASS DEFINITIVO
  const handleSubmitModificado = async (e) => {
    e.preventDefault();

    // 1. Creamos una función interceptora. 
    // formUtils va a formatear los datos y nos los va a pasar por acá.
    const submitReal = async (datosFormateados) => {
      setSaving(true);
      // 2. Le inyectamos el ID a la fuerza al payload formateado
      const payload = { ...datosFormateados, id: poliza.id };
      
      try {
        // 3. Despachamos la actualización directamente a Redux
        await dispatch(updatePoliza(payload)).unwrap();
        toast.success("Póliza actualizada exitosamente");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } catch (error) {
        toast.error(error?.message || "Error al editar la póliza");
      } finally {
        setSaving(false);
      }
    };

    // Le decimos a formUtils: "Formateá los datos y mandáselos a mi 'submitReal' en vez de al hook original"
    formatearYEnviarPoliza(formData, submitReal, e);
  };

  if (!isOpen || !poliza) return null;

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
            <form
              onSubmit={handleSubmitModificado}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5"
            >
              {[
                "compania",
                "numero_poliza",
                "cobertura",
                "oficina",
                "patente",
                "marca",
                "modelo",
                "anio",
                "tipo",
                "primer_pago", // 🚀 Eliminado precio_cuota
              ].map((key) => {
                const isOficinaField = key === "oficina";
                const isPrimerPago = key === "primer_pago";
                const isDisabled = (isOficinaField && !isWebAdmin) || (isPrimerPago && modo === "edit");

                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                      {key.replace("_", " ")}
                      {isOficinaField && !isWebAdmin && <span className="ml-2 text-amber-500">(Solo Admin)</span>}
                    </label>

                    {["compania", "oficina", "cobertura", "tipo"].includes(key) ? (
                      <div className="relative group">
                          <select
                            name={key}
                            value={formData[key] || ""}
                            onChange={handleChange}
                            disabled={isDisabled}
                            className={`cursor-pointer w-full rounded-xl border border-white/10 px-4 py-3 pr-9 outline-none transition-all font-medium appearance-none ${
                              isDisabled ? 'bg-black/40 text-white/30 cursor-not-allowed opacity-70' : 'bg-black/40 text-white focus:ring-2 ring-emerald-500/40 hover:bg-white/5'
                            }`}
                          >
                            <option value="" className="bg-[#0f1324]">— Seleccionar —</option>
                            {key === "oficina" ? (
                              oficinas.map((opt) => (
                                <option key={opt.id} value={opt.id} className="bg-[#0f1324]">{opt.nombre}</option>
                              ))
                            ) : (
                              (key === "compania" ? companias : key === "cobertura" ? coberturas : tiposVehiculo).map((opt) => (
                                <option key={opt} value={opt} className="bg-[#0f1324]">{opt}</option>
                              ))
                            )}
                          </select>
                          {!isDisabled && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white transition-colors">▾</span>}
                      </div>
                    ) : (
                      <input
                        type={key.includes("fecha") || key === "primer_pago" ? "date" : "text"}
                        name={key}
                        value={formData[key] || ""}
                        onChange={handleChange}
                        disabled={isDisabled}
                        className={`cursor-pointer w-full rounded-xl border border-white/10 px-4 py-3 outline-none transition-all font-medium ${
                          isDisabled ? 'bg-black/40 text-white/30 cursor-not-allowed opacity-70' : 'bg-black/40 text-white placeholder:text-white/20 focus:ring-2 ring-emerald-500/40 hover:bg-white/5'
                        }`}
                        placeholder={key.includes("fecha") ? "DD-MM-YYYY" : ""}
                      />
                    )}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-white/5">
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
                  {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Guardar Cambios"}
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