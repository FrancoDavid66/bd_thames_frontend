// src/components/clientes/ClienteEditModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { HiPencilAlt, HiX } from "react-icons/hi";
import { useClienteEditForm } from "../../hooks/clientes/useClienteEditForm";

const ClienteEditModal = ({ isOpen, onClose, onSave, cliente }) => {
  const { formData, handleChange, handleSubmit, loading } = useClienteEditForm({
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
    "localidad", 
    "fecha_nacimiento",
  ];

  const getLabel = (key) => {
    switch (key) {
      case "dni_cuit_cuil":
        return "DNI / CUIT / CUIL";
      case "fecha_nacimiento":
        return "Fecha de Nacimiento";
      default:
        return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  // DNI/CUIT YA NO ES OBLIGATORIO SEGÚN TU LÓGICA
  const isRequired = (key) => ["nombre", "apellido", "telefono"].includes(key);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-2xl rounded-3xl bg-[#0b0f1e] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20 shrink-0">
                    <HiPencilAlt className="text-xl" />
                 </div>
                 <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter leading-none">
                      Editar Cliente
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-1">
                      Actualizá los datos de la ficha
                    </p>
                 </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <HiX className="text-xl" />
              </button>
            </div>

            {/* 🚀 FIX: Le agregamos el ID al formulario para conectarlo con el botón de afuera */}
            <form
              id="form-editar-cliente"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {camposOrdenados.map((key) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1.5"
                  >
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center justify-between ml-1">
                      <span>
                        {getLabel(key)}
                        {isRequired(key) && (
                          <span className="text-rose-400 ml-1">*</span>
                        )}
                      </span>
                    </label>
                    <input
                      type={key.includes("fecha") ? "date" : "text"}
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleChange}
                      className="h-12 w-full rounded-xl bg-black/40 border border-white/10 px-4 text-sm font-bold text-white placeholder:text-white/20 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all shadow-inner"
                      placeholder={`Ingresar ${getLabel(key).toLowerCase()}...`}
                    />
                  </motion.div>
                ))}
              </div>
            </form>

            {/* Footer botones */}
            <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              {/* 🚀 FIX: Conectamos el botón al formulario usando form="form-editar-cliente" */}
              <button
                type="submit"
                form="form-editar-cliente"
                disabled={loading}
                className="px-8 py-2.5 rounded-xl bg-sky-500 text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-sky-900/40 hover:bg-sky-400 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClienteEditModal;