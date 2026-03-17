// src/components/polizas/PolizaEditModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { usePolizaForm } from "../../hooks/polizas/usePolizaForm";
import { formatearYEnviarPoliza } from "../../utils/polizas/formUtils";
// 🚀 IMPORTACIONES DE SEGURIDAD
import { useAuth } from "../../context/AuthContext";

const PolizaEditModal = ({ isOpen, onClose, onSuccess, poliza }) => {
  const { user } = useAuth(); // 🚀 Obtenemos el usuario logueado
  
  const {
    formData,
    handleChange,
    handleSubmit: handleSubmitOriginal,
    modo,
  } = usePolizaForm({
    poliza,
    onSuccess,
    onClose,
  });

  const companias = [
    "Agrosalta",
    "ATM",
    "Digna",
    "Equidad",
    "Federacion Patronal",
    "Providencia",
  ];

  // 🚀 OFICINAS DINÁMICAS (Podrías traerlas de un selector global, aquí mantenemos tu lista)
  const oficinas = [
    { id: "1", nombre: "Oficina 1 (5 esquinas)" },
    { id: "2", nombre: "Oficina 2 (Axion)" },
    { id: "3", nombre: "Oficina 3 (39)" }
  ];

  const coberturas = ["A", "B", "B1", "C", "C1", "C Full", "R.C Premium"];
  const tiposVehiculo = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

  const handleSubmitModificado = (e) => {
    formatearYEnviarPoliza(formData, handleSubmitOriginal, e);
  };

  // 🛡️ Lógica de permisos
  const isWebAdmin = user?.perfil?.rol === 'ADMIN';

  if (!isOpen || !poliza) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-2 sm:px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-black/5 dark:border-white/10"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-black/5 dark:border-white/10 bg-gray-50 dark:bg-gray-850/50">
            <div>
               <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Editar Póliza
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                ID Sistema: {poliza.id}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body con scroll */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
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
                "precio_cuota",
                "primer_pago",
              ].map((key) => {
                // 🛡️ Determinamos si el campo debe estar bloqueado
                const isOficinaField = key === "oficina";
                const isPrimerPago = key === "primer_pago";
                const isDisabled = (isOficinaField && !isWebAdmin) || (isPrimerPago && modo === "edit");

                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                      {key.replace("_", " ")}
                      {isOficinaField && !isWebAdmin && <span className="ml-2 text-[9px] text-amber-500">(Solo Admin)</span>}
                    </label>

                    {["compania", "oficina", "cobertura", "tipo"].includes(key) ? (
                      <select
                        name={key}
                        value={formData[key]}
                        onChange={handleChange}
                        disabled={isDisabled}
                        className={`w-full h-11 px-3 text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                          isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-850' : ''
                        }`}
                      >
                        <option value="">
                          {`Seleccionar ${key.replace("_", " ")}`}
                        </option>
                        {key === "oficina" ? (
                          oficinas.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.nombre}
                            </option>
                          ))
                        ) : (
                          (key === "compania"
                            ? companias
                            : key === "cobertura"
                            ? coberturas
                            : tiposVehiculo
                          ).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <input
                        type={key.includes("fecha") || key === "primer_pago" ? "date" : "text"}
                        name={key}
                        value={formData[key]}
                        onChange={handleChange}
                        disabled={isDisabled}
                        className={`w-full h-11 px-3 text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${
                          isDisabled ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-850' : ''
                        }`}
                        placeholder={
                          key.includes("fecha")
                            ? "DD-MM-YYYY"
                            : ""
                        }
                      />
                    )}
                  </div>
                );
              })}

              {/* Footer dentro del form */}
              <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                >
                  Guardar Cambios
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