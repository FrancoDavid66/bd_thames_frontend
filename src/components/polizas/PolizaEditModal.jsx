// src/components/polizas/PolizaEditModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { usePolizaForm } from "../../hooks/polizas/usePolizaForm";
import { formatearYEnviarPoliza } from "../../utils/polizas/formUtils";

const PolizaEditModal = ({ isOpen, onClose, onSuccess, poliza }) => {
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
  const oficinas = ["Oficina 1 (5 esquinas)"];
  const coberturas = ["A", "B", "B1", "C", "C1", "C Full", "R.C Premium"];
  const tiposVehiculo = ["Auto", "Camioneta", "Camion", "Moto", "Trailer"];

  const handleSubmitModificado = (e) => {
    formatearYEnviarPoliza(formData, handleSubmitOriginal, e);
  };

  if (!isOpen || !poliza) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2 sm:px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/10">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Editar póliza
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>

          {/* Body con scroll */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <form
              onSubmit={handleSubmitModificado}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
              ].map((key) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {key.replace("_", " ")}
                  </label>

                  {["compania", "oficina", "cobertura", "tipo"].includes(
                    key
                  ) ? (
                    <select
                      name={key}
                      value={formData[key]}
                      onChange={handleChange}
                      className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/70"
                    >
                      <option value="">
                        {`Seleccionar ${key.replace("_", " ")}`}
                      </option>
                      {(
                        key === "compania"
                          ? companias
                          : key === "oficina"
                          ? oficinas
                          : key === "cobertura"
                          ? coberturas
                          : tiposVehiculo
                      ).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : key === "primer_pago" && modo === "edit" ? (
                    <input
                      type="date"
                      name="primer_pago"
                      value={formData.primer_pago}
                      disabled
                      className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-60"
                    />
                  ) : (
                    <input
                      type={key.includes("fecha") ? "date" : "text"}
                      name={key}
                      value={formData[key]}
                      onChange={handleChange}
                      className="w-full h-10 px-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500/70"
                      placeholder={
                        key.includes("fecha")
                          ? "DD-MM-YYYY o DD/MM/YYYY"
                          : ""
                      }
                    />
                  )}
                </div>
              ))}

              {/* Footer dentro del form */}
              <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-xl bg-black/5 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-black/10 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Guardar cambios
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
