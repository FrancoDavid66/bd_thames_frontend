// src/components/clientes/ClienteEditModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useClienteEditForm } from "../../hooks/clientes/useClienteEditForm";

const ClienteEditModal = ({ isOpen, onClose, onSave, cliente }) => {
  const { formData, handleChange, handleSubmit } = useClienteEditForm({
    cliente,
    onClose,
    onSave,
  });

  const camposOrdenados = [
    "nombre",
    "apellido",
    "dni_cuit_cuil",
    "telefono",
    "email",
    "direccion",
    "localidad", // ✅ agregado
    "fecha_nacimiento",
  ];

  const getLabel = (key) => {
    switch (key) {
      case "dni_cuit_cuil":
        return "DNI / CUIT / CUIL";
      case "fecha_nacimiento":
        return "Fecha de nacimiento";
      default:
        return key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  // 👇 DNI/CUIT YA NO ES OBLIGATORIO
  const isRequired = (key) =>
    ["nombre", "apellido", "telefono"].includes(key);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg mx-2 sm:mx-0 rounded-t-3xl sm:rounded-2xl bg-gradient-to-br from-gray-800/80 via-gray-950 to-black p-[1px] shadow-2xl shadow-black/50"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <div className="rounded-t-3xl sm:rounded-2xl bg-gray-950/95 text-white max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-900/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Editar cliente
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Actualizá los datos del cliente seleccionado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Form scrolleable */}
              <form
                onSubmit={handleSubmit}
                className="px-5 pb-4 pt-3 space-y-4 overflow-y-auto"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {camposOrdenados.map((key) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-1"
                    >
                      <label className="text-xs font-medium text-gray-300 flex items-center justify-between">
                        <span>
                          {getLabel(key)}
                          {isRequired(key) && (
                            <span className="text-rose-400 ml-0.5">*</span>
                          )}
                        </span>
                      </label>
                      <input
                        type={key.includes("fecha") ? "date" : "text"}
                        name={key}
                        value={formData[key] ?? ""}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg bg-gray-900/80 border border-gray-800 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Ingresar ${getLabel(key).toLowerCase()}`}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Footer botones */}
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-900/80 mt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                    className="px-4 h-10 rounded-lg bg-gray-800 text-sm text-gray-200 hover:bg-gray-700"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-4 h-10 rounded-lg bg-blue-500 text-sm font-medium text-white hover:bg-blue-600"
                  >
                    Guardar cambios
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteEditModal;
